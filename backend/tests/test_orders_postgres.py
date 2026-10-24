from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from datetime import timedelta
from threading import Barrier
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.config import settings
from app.core.database import Base
from app.models.cart import Cart, CartCS2Item, CartTF2Key
from app.models.cs2_item import CS2Item
from app.models.order import Order
from app.models.store_settings import StoreSettings
from app.models.tf2_key import TF2Key
from app.models.user import User
from app.services.auth import utc_now
from app.services.cart import change_cart_line
from app.services.orders import expire_due_orders, finalize_cart, transition_order


@pytest.fixture
def postgres_orders() -> Iterator[tuple]:
    test_name = f"irstore24_orders_test_{uuid4().hex[:12]}"
    assert test_name != settings.postgres_db
    maintenance = create_engine(
        settings.database_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    engine = None
    try:
        with maintenance.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{test_name}"'))
    except (OperationalError, ProgrammingError) as error:
        maintenance.dispose()
        pytest.skip(f"Isolated PostgreSQL unavailable: {type(error).__name__}")
    try:
        engine = create_engine(settings.database_url.set(database=test_name))
        Base.metadata.create_all(engine)
        with Session(engine) as db:
            users = []
            for email, role in (
                ("buyer1@example.com", "user"),
                ("buyer2@example.com", "user"),
                ("admin@example.com", "admin"),
            ):
                user = User(
                    email=email, password_hash="test-only-hash",
                    role=role, is_active=True, is_banned=False,
                )
                db.add(user)
                db.flush()
                db.add(Cart(user_id=user.id))
                users.append(user)
            cs2 = CS2Item(
                slug="last-item", name="Last Item", weapon="AWP",
                exterior="Field-Tested", float_value=Decimal("0.25000000"),
                stock_quantity=1, sell_price_amount=Decimal("2.00500000"),
                sell_price_currency="USDT", buy_price_amount=Decimal("1"),
                buy_price_currency="USDT", is_active=True,
            )
            tf2 = TF2Key(
                stock_quantity=5, sell_price_amount=Decimal("100001"),
                sell_price_currency="TOMAN", buy_price_amount=Decimal("90000"),
                buy_price_currency="TOMAN", is_active=True,
            )
            db.add_all([cs2, tf2])
            db.add(StoreSettings(
                id=1, usdt_toman_rate=Decimal("100000"),
                card_number="0000000000000000", card_holder_name="Test Store",
                telegram_username="test_store", order_reservation_minutes=120,
            ))
            db.commit()
            ids = (users[0].id, users[1].id, users[2].id, cs2.id, tf2.id)
        yield (engine, *ids)
    finally:
        if engine is not None:
            engine.dispose()
        with maintenance.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{test_name}"'))
        maintenance.dispose()


def add_line(engine, user_id: int, product_type: str, product_id: int) -> None:
    with Session(engine) as db:
        cart_id = db.scalar(select(Cart.id).where(Cart.user_id == user_id))
        if product_type == "cs2":
            db.add(CartCS2Item(cart_id=cart_id, cs2_item_id=product_id, quantity=1))
        else:
            db.add(CartTF2Key(cart_id=cart_id, tf2_key_id=product_id, quantity=1))
        db.commit()


def attempt_finalize(engine, user_id: int, barrier: Barrier):
    barrier.wait()
    with Session(engine) as db:
        db.execute(text("SET LOCAL lock_timeout = '5s'"))
        try:
            return ("created", finalize_cart(db, user_id).order_number)
        except HTTPException as error:
            return ("rejected", error.status_code)


def assert_stock_and_orders(engine, cs2_id: int, stock: int, count: int) -> None:
    with Session(engine) as db:
        assert db.get(CS2Item, cs2_id).stock_quantity == stock
        assert db.scalar(select(func.count()).select_from(Order)) == count


def test_two_buyers_race_for_last_item(postgres_orders) -> None:
    engine, first, second, _, cs2_id, _ = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    add_line(engine, second, "cs2", cs2_id)
    barrier = Barrier(2)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(attempt_finalize, engine, uid, barrier)
            for uid in (first, second)
        ]
        results = [future.result(timeout=15) for future in futures]
    assert sorted(result[0] for result in results) == ["created", "rejected"]
    assert ("rejected", 409) in results
    assert_stock_and_orders(engine, cs2_id, 0, 1)


def test_two_finalize_requests_for_one_cart_create_one_order(postgres_orders) -> None:
    engine, first, _, _, cs2_id, _ = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    barrier = Barrier(2)
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [
            pool.submit(attempt_finalize, engine, first, barrier)
            for _ in range(2)
        ]
        results = [future.result(timeout=15) for future in futures]
    assert sorted(result[0] for result in results) == ["created", "rejected"]
    assert ("rejected", 409) in results
    assert_stock_and_orders(engine, cs2_id, 0, 1)
    with Session(engine) as db:
        cart_id = db.scalar(select(Cart.id).where(Cart.user_id == first))
        assert db.scalars(select(CartCS2Item).where(CartCS2Item.cart_id == cart_id)).all() == []


def test_concurrent_cart_adds_serialize_without_duplicate_lines(postgres_orders) -> None:
    engine, first, _, _, _, tf2_id = postgres_orders
    barrier = Barrier(2)

    def add():
        barrier.wait()
        with Session(engine) as db:
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            change_cart_line(db, first, "tf2", tf2_id, 1, add=True)

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(add) for _ in range(2)]
        for future in futures:
            future.result(timeout=15)
    with Session(engine) as db:
        lines = db.scalars(select(CartTF2Key)).all()
        assert len(lines) == 1
        assert lines[0].quantity == 2
        assert db.get(TF2Key, tf2_id).stock_quantity == 5


def test_cancel_and_expiration_race_restores_once(postgres_orders) -> None:
    engine, first, _, _, cs2_id, _ = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    with Session(engine) as db:
        number = finalize_cart(db, first).order_number
    with Session(engine) as db:
        db.scalar(select(Order).where(Order.order_number == number)).expires_at = (
            utc_now() - timedelta(seconds=1)
        )
        db.commit()
    barrier = Barrier(2)

    def cancel():
        barrier.wait()
        with Session(engine) as db:
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            try:
                transition_order(db, number, "cancel", first, user_id=first)
                return 200
            except HTTPException as error:
                return error.status_code

    def expire():
        barrier.wait()
        with Session(engine) as db:
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            return expire_due_orders(db)

    with ThreadPoolExecutor(max_workers=2) as pool:
        cancel_future = pool.submit(cancel)
        expire_future = pool.submit(expire)
        assert cancel_future.result(timeout=15) in (200, 409)
        assert expire_future.result(timeout=15) in (0, 1)
    assert_stock_and_orders(engine, cs2_id, 1, 1)
    with Session(engine) as db:
        assert db.scalar(select(Order.status)) == "expired"
        assert expire_due_orders(db) == 0


def test_confirmation_racing_expiration_cannot_confirm_overdue_order(
    postgres_orders,
) -> None:
    engine, first, _, admin_id, cs2_id, _ = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    with Session(engine) as db:
        number = finalize_cart(db, first).order_number
    with Session(engine) as db:
        db.scalar(select(Order).where(Order.order_number == number)).expires_at = (
            utc_now() - timedelta(seconds=1)
        )
        db.commit()
    barrier = Barrier(2)

    def confirm():
        barrier.wait()
        with Session(engine) as db:
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            try:
                transition_order(db, number, "confirm", admin_id)
            except HTTPException as error:
                return error.status_code
            return 200

    def expire():
        barrier.wait()
        with Session(engine) as db:
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            return expire_due_orders(db)

    with ThreadPoolExecutor(max_workers=2) as pool:
        confirmed = pool.submit(confirm)
        expired = pool.submit(expire)
        assert confirmed.result(timeout=15) == 409
        assert expired.result(timeout=15) in (0, 1)
    assert_stock_and_orders(engine, cs2_id, 1, 1)
    with Session(engine) as db:
        assert db.scalar(select(Order.status)) == "expired"


def test_retries_do_not_restore_inventory_twice(postgres_orders) -> None:
    engine, first, _, _, cs2_id, _ = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    with Session(engine) as db:
        number = finalize_cart(db, first).order_number
    with Session(engine) as db:
        order, _ = transition_order(db, number, "cancel", first, user_id=first)
        assert order.status == "cancelled"
    with Session(engine) as db:
        with pytest.raises(HTTPException) as error:
            transition_order(db, number, "cancel", first, user_id=first)
        assert error.value.status_code == 409
        assert expire_due_orders(db) == 0
    assert_stock_and_orders(engine, cs2_id, 1, 1)


def test_two_expiration_workers_restore_once(postgres_orders) -> None:
    engine, first, _, _, cs2_id, _ = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    with Session(engine) as db:
        number = finalize_cart(db, first).order_number
    with Session(engine) as db:
        db.scalar(select(Order).where(Order.order_number == number)).expires_at = (
            utc_now() - timedelta(seconds=1)
        )
        db.commit()
    barrier = Barrier(2)

    def run_worker():
        barrier.wait()
        with Session(engine) as db:
            db.execute(text("SET LOCAL lock_timeout = '5s'"))
            return expire_due_orders(db)

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(run_worker) for _ in range(2)]
        assert sorted(future.result(timeout=15) for future in futures) == [0, 1]
    assert_stock_and_orders(engine, cs2_id, 1, 1)
    with Session(engine) as db:
        assert db.scalar(select(Order.status)) == "expired"


def test_failed_commit_rolls_back_inventory_cart_and_order(
    postgres_orders, monkeypatch,
) -> None:
    engine, first, second, _, cs2_id, tf2_id = postgres_orders
    add_line(engine, first, "cs2", cs2_id)
    with Session(engine) as db:
        existing_number = finalize_cart(db, first).order_number
    add_line(engine, second, "tf2", tf2_id)
    monkeypatch.setattr(
        "app.services.orders.uuid4",
        lambda: SimpleNamespace(hex=existing_number.removeprefix("IR-").lower()),
    )
    with Session(engine) as db:
        with pytest.raises(IntegrityError):
            finalize_cart(db, second)
    with Session(engine) as db:
        assert db.get(TF2Key, tf2_id).stock_quantity == 5
        assert db.scalar(select(func.count()).select_from(Order)) == 1
        cart_id = db.scalar(select(Cart.id).where(Cart.user_id == second))
        assert db.scalar(
            select(CartTF2Key).where(CartTF2Key.cart_id == cart_id)
        ).quantity == 1
