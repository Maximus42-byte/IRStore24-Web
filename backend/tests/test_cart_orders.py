from collections.abc import Iterator
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine, event, select
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.database import Base, get_db
from app.core.security import SESSION_COOKIE_NAME, hash_password
from app.main import app
from app.models.cart import Cart, CartCS2Item, CartTF2Key
from app.models.cs2_item import CS2Item
from app.models.order import Order
from app.models.store_settings import StoreSettings
from app.models.tf2_key import TF2Key
from app.models.user import User
from app.services.auth import utc_now
from app.services.orders import expire_due_orders


ORIGIN = {"Origin": "https://irstore24.ir"}
PASSWORD = "test-only-cart-password"


@compiles(BigInteger, "sqlite")
def sqlite_bigint(type_, compiler, **kwargs) -> str:
    return "INTEGER"


@dataclass
class Harness:
    user: TestClient
    admin: TestClient
    other: TestClient
    engine: object
    user_id: int
    admin_id: int
    cs2_id: int
    tf2_id: int


@pytest.fixture
def harness() -> Iterator[Harness]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False}, poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _) -> None:
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine) as db:
        users = []
        for email, role in (
            ("user@example.com", "user"),
            ("admin@example.com", "admin"),
            ("other@example.com", "user"),
        ):
            account = User(
                email=email, role=role, password_hash=hash_password(PASSWORD),
                is_active=True, is_banned=False,
            )
            db.add(account)
            db.flush()
            db.add(Cart(user_id=account.id))
            users.append(account)
        cs2 = CS2Item(
            slug="test-skin", name="Test Skin", weapon="AWP",
            exterior="Field-Tested", float_value=Decimal("0.25000000"),
            stock_quantity=3, sell_price_amount=Decimal("2.00500000"),
            sell_price_currency="USDT", buy_price_amount=Decimal("1"),
            buy_price_currency="USDT", is_active=True,
        )
        tf2 = TF2Key(
            stock_quantity=5, sell_price_amount=Decimal("100001"),
            sell_price_currency="TOMAN", buy_price_amount=Decimal("90000"),
            buy_price_currency="TOMAN", is_active=True,
        )
        db.add_all([cs2, tf2])
        db.commit()
        ids = (users[0].id, users[1].id, cs2.id, tf2.id)

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with (
        TestClient(app, base_url="https://irstore24.ir") as user,
        TestClient(app, base_url="https://irstore24.ir") as admin,
        TestClient(app, base_url="https://irstore24.ir") as other,
    ):
        for client, email in (
            (user, "user@example.com"),
            (admin, "admin@example.com"),
            (other, "other@example.com"),
        ):
            response = client.post(
                "/api/auth/login",
                json={"email": email, "password": PASSWORD}, headers=ORIGIN,
            )
            assert response.status_code == 200
        yield Harness(user, admin, other, engine, *ids)
    app.dependency_overrides.clear()
    engine.dispose()


def configure(harness: Harness, *, rate: str = "100000.00000000") -> None:
    response = harness.admin.patch(
        "/api/admin/settings",
        json={
            "usdt_toman_rate": rate,
            "card_number": "0000000000000000",
            "card_holder_name": "Test Store",
            "telegram_username": "test_store",
        },
        headers=ORIGIN,
    )
    assert response.status_code == 200, response.text
    assert harness.user.get("/api/cart").json()["payment_instructions_configured"] is True


def add_cs2(harness: Harness, quantity: int = 1):
    return harness.user.post(
        "/api/cart/cs2-items",
        json={"cs2_item_id": harness.cs2_id, "quantity": quantity},
        headers=ORIGIN,
    )


def add_tf2(harness: Harness, quantity: int = 1):
    return harness.user.post(
        "/api/cart/tf2-keys",
        json={"tf2_key_id": harness.tf2_id, "quantity": quantity},
        headers=ORIGIN,
    )


def finalize(harness: Harness):
    return harness.user.post("/api/orders/finalize", headers=ORIGIN)


def test_mixed_cart_add_update_remove_and_no_inventory_reservation(
    harness: Harness,
) -> None:
    assert add_cs2(harness).status_code == 200
    assert add_cs2(harness).json()["cs2_items"][0]["quantity"] == 2
    assert add_tf2(harness, 2).status_code == 200
    view = harness.user.get("/api/cart").json()
    assert len(view["cs2_items"]) == len(view["tf2_keys"]) == 1
    assert view["total_price_toman"] is None
    assert view["exchange_rate_configured"] is False
    assert view["payment_instructions_configured"] is False
    with Session(harness.engine) as db:
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 3
        assert db.get(TF2Key, harness.tf2_id).stock_quantity == 5
        assert len(db.scalars(select(CartCS2Item)).all()) == 1
    patched = harness.user.patch(
        f"/api/cart/cs2-items/{harness.cs2_id}",
        json={"quantity": 3}, headers=ORIGIN,
    )
    assert patched.status_code == 200
    assert patched.json()["cs2_items"][0]["quantity"] == 3
    assert harness.other.get("/api/cart").json()["cs2_items"] == []
    assert harness.user.delete(
        f"/api/cart/cs2-items/{harness.cs2_id}", headers=ORIGIN
    ).status_code == 204
    assert harness.user.delete(
        f"/api/cart/tf2-keys/{harness.tf2_id}", headers=ORIGIN
    ).status_code == 204
    assert harness.user.get("/api/cart").json()["cs2_items"] == []


def test_cart_rejects_invalid_unavailable_and_unowned_changes(
    harness: Harness,
) -> None:
    user = harness.user
    assert user.post(
        "/api/cart/cs2-items",
        json={"cs2_item_id": harness.cs2_id, "quantity": 0}, headers=ORIGIN,
    ).status_code == 422
    assert user.post(
        "/api/cart/cs2-items",
        json={"cs2_item_id": harness.cs2_id, "quantity": 4}, headers=ORIGIN,
    ).status_code == 409
    assert user.post(
        "/api/cart/cs2-items",
        json={"cs2_item_id": 999, "quantity": 1}, headers=ORIGIN,
    ).status_code == 404
    assert user.post(
        "/api/cart/cs2-items",
        json={"cs2_item_id": harness.cs2_id, "quantity": 1, "user_id": 2},
        headers=ORIGIN,
    ).status_code == 422
    assert user.patch(
        f"/api/cart/cs2-items/{harness.cs2_id}",
        json={"quantity": 1}, headers=ORIGIN,
    ).status_code == 404
    with Session(harness.engine) as db:
        cs2 = db.get(CS2Item, harness.cs2_id)
        cs2.is_active = False
        tf2 = db.get(TF2Key, harness.tf2_id)
        tf2.stock_quantity = 0
        db.commit()
    assert add_cs2(harness).status_code == 409
    assert add_tf2(harness).status_code == 409
    with Session(harness.engine) as db:
        cs2 = db.get(CS2Item, harness.cs2_id)
        cs2.is_active = True
        cs2.deleted_at = utc_now()
        db.commit()
    assert add_cs2(harness).status_code == 409
    assert user.post(
        "/api/cart/cs2-items",
        json={"cs2_item_id": harness.cs2_id, "quantity": 1},
    ).status_code == 403
    assert harness.other.get("/api/cart").json()["tf2_keys"] == []


def test_cart_live_prices_and_missing_rate(harness: Harness) -> None:
    add_cs2(harness)
    add_tf2(harness, 2)
    assert harness.user.get("/api/cart").json()["total_price_usdt"] is None
    assert finalize(harness).status_code == 503
    configure(harness)
    view = harness.user.get("/api/cart").json()
    assert view["total_price_toman"] == "400502.00000000"
    assert view["total_price_usdt"] == "4.00500000"
    with Session(harness.engine) as db:
        db.get(CS2Item, harness.cs2_id).sell_price_amount = Decimal("3.00500000")
        db.get(StoreSettings, 1).usdt_toman_rate = Decimal("200000")
        db.commit()
    changed = harness.user.get("/api/cart").json()
    assert changed["cs2_items"][0]["product"]["sell_price"]["amount"] == "3.00500000"
    assert changed["total_price_toman"] == "801002.00000000"
    assert changed["total_price_usdt"] == "4.00500000"


def test_finalization_snapshots_prices_rate_inventory_and_payment(
    harness: Harness,
) -> None:
    configure(harness)
    add_cs2(harness)
    add_tf2(harness, 2)
    response = finalize(harness)
    assert response.status_code == 201, response.text
    order = response.json()
    assert order["status"] == "pending"
    assert order["order_number"].startswith("IR-")
    assert order["locked_usdt_toman_rate"] == "100000.00000000"
    assert order["total_price_toman"] == "400502.00000000"
    assert order["total_price_usdt"] == "4.00500000"
    assert order["cs2_items"][0]["name"] == "Test Skin"
    assert order["cs2_items"][0]["float_value"] == "0.25000000"
    assert order["tf2_keys"][0]["quantity"] == 2
    assert order["payment"]["card_number"] == "0000000000000000"
    assert order["payment"]["telegram_username"] == "test_store"
    assert harness.user.get("/api/cart").json()["cs2_items"] == []
    with Session(harness.engine) as db:
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 2
        assert db.get(TF2Key, harness.tf2_id).stock_quantity == 3
        db.get(CS2Item, harness.cs2_id).name = "Changed"
        db.get(CS2Item, harness.cs2_id).deleted_at = utc_now()
        db.get(StoreSettings, 1).usdt_toman_rate = Decimal("200000")
        db.commit()
    detail = harness.user.get(f"/api/account/orders/{order['order_number']}").json()
    assert detail["cs2_items"][0]["name"] == "Test Skin"
    assert detail["total_price_toman"] == "400502.00000000"
    assert detail["locked_usdt_toman_rate"] == "100000.00000000"
    assert "card_number" not in harness.user.get(
        "/api/account/orders"
    ).text


def test_finalization_requires_payment_setup_and_rejects_forged_values(
    harness: Harness,
) -> None:
    assert finalize(harness).status_code == 409
    add_cs2(harness)
    assert finalize(harness).status_code == 503
    response = harness.admin.patch(
        "/api/admin/settings", json={"usdt_toman_rate": "100000"},
        headers=ORIGIN,
    )
    assert response.status_code == 200
    cart = harness.user.get("/api/cart").json()
    assert cart["exchange_rate_configured"] is True
    assert cart["payment_instructions_configured"] is False
    missing = finalize(harness)
    assert missing.status_code == 503
    assert missing.json()["detail"] == "Payment instructions are not configured"
    assert harness.user.post(
        "/api/orders/finalize",
        json={"total_price_toman": "1"}, headers=ORIGIN,
    ).status_code == 422
    assert harness.user.post("/api/orders/finalize").status_code == 403
    with Session(harness.engine) as db:
        assert db.scalars(select(Order)).all() == []
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 3


def test_failed_stock_validation_rolls_back_all_changes(harness: Harness) -> None:
    configure(harness)
    add_cs2(harness, 2)
    add_tf2(harness, 2)
    with Session(harness.engine) as db:
        db.get(TF2Key, harness.tf2_id).stock_quantity = 1
        db.commit()
    assert finalize(harness).status_code == 409
    with Session(harness.engine) as db:
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 3
        assert db.get(TF2Key, harness.tf2_id).stock_quantity == 1
        assert db.scalars(select(Order)).all() == []
        assert len(db.scalars(select(CartCS2Item)).all()) == 1
        assert len(db.scalars(select(CartTF2Key)).all()) == 1


def test_owner_cancellation_restores_once_and_blocks_idor(harness: Harness) -> None:
    configure(harness)
    add_cs2(harness)
    number = finalize(harness).json()["order_number"]
    assert harness.other.get(f"/api/account/orders/{number}").status_code == 404
    assert harness.other.post(
        f"/api/account/orders/{number}/cancel", headers=ORIGIN
    ).status_code == 404
    cancelled = harness.user.post(
        f"/api/account/orders/{number}/cancel", headers=ORIGIN
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert cancelled.json()["payment"] is None
    assert harness.user.post(
        f"/api/account/orders/{number}/cancel", headers=ORIGIN
    ).status_code == 409
    with Session(harness.engine) as db:
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 3
        assert db.scalar(select(Order)).cancelled_by == harness.user_id


def test_admin_confirm_and_cancel_status_rules(harness: Harness) -> None:
    configure(harness)
    add_cs2(harness)
    number = finalize(harness).json()["order_number"]
    assert harness.user.post(
        f"/api/admin/orders/{number}/confirm", headers=ORIGIN
    ).status_code == 403
    confirmed = harness.admin.post(
        f"/api/admin/orders/{number}/confirm", headers=ORIGIN
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"
    assert confirmed.json()["confirmed_by"] == harness.admin_id
    assert harness.admin.post(
        f"/api/admin/orders/{number}/cancel", headers=ORIGIN
    ).status_code == 409
    assert harness.admin.post(
        f"/api/admin/orders/{number}/confirm", headers=ORIGIN
    ).status_code == 409
    with Session(harness.engine) as db:
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 2
    add_tf2(harness, 2)
    second = finalize(harness).json()["order_number"]
    cancelled = harness.admin.post(
        f"/api/admin/orders/{second}/cancel", headers=ORIGIN
    )
    assert cancelled.status_code == 200
    assert cancelled.json()["cancelled_by"] == harness.admin_id
    with Session(harness.engine) as db:
        assert db.get(TF2Key, harness.tf2_id).stock_quantity == 5


def test_expiration_worker_and_overdue_confirmation(harness: Harness) -> None:
    configure(harness)
    add_cs2(harness)
    number = finalize(harness).json()["order_number"]
    with Session(harness.engine) as db:
        db.scalar(select(Order).where(Order.order_number == number)).expires_at = (
            utc_now() - timedelta(minutes=1)
        )
        db.commit()
    rejected = harness.admin.post(
        f"/api/admin/orders/{number}/confirm", headers=ORIGIN
    )
    assert rejected.status_code == 409
    assert harness.user.get(f"/api/account/orders/{number}").json()["status"] == "expired"
    with Session(harness.engine) as db:
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 3
        assert expire_due_orders(db) == 0
    add_cs2(harness)
    second = finalize(harness).json()["order_number"]
    with Session(harness.engine) as db:
        db.scalar(select(Order).where(Order.order_number == second)).expires_at = (
            utc_now() - timedelta(seconds=1)
        )
        db.commit()
        assert expire_due_orders(db) == 1
        assert expire_due_orders(db) == 0
        assert db.get(CS2Item, harness.cs2_id).stock_quantity == 3


def test_admin_order_listing_filters_and_private_details(harness: Harness) -> None:
    configure(harness)
    add_cs2(harness)
    number = finalize(harness).json()["order_number"]
    assert harness.user.get("/api/account/orders?status=pending").json()["total"] == 1
    assert harness.other.get("/api/account/orders").json()["total"] == 0
    filtered = harness.admin.get(
        f"/api/admin/orders?status=pending&user_id={harness.user_id}&order_number={number}"
    ).json()
    assert filtered["total"] == 1
    assert filtered["items"][0]["user_email"] == "user@example.com"
    detail = harness.admin.get(f"/api/admin/orders/{number}").json()
    assert detail["user_email"] == "user@example.com"
    assert detail["payment"]["card_number"] == "0000000000000000"
    assert harness.user.get(
        "/api/admin/orders?status=pending"
    ).status_code == 403
    assert harness.admin.get("/api/admin/orders?status=invalid").status_code == 422
    assert harness.admin.get("/api/admin/orders?page=0").status_code == 422
    assert harness.admin.get("/api/admin/orders?created_from=2020-01-01T00:00:00").status_code == 422


def test_banned_inactive_and_unauthenticated_cart_order_access(
    harness: Harness,
) -> None:
    token = harness.user.cookies[SESSION_COOKIE_NAME]
    harness.user.cookies.clear()
    assert harness.user.get("/api/cart").status_code == 401
    assert finalize(harness).status_code == 401
    harness.user.cookies.set(SESSION_COOKIE_NAME, token)
    with Session(harness.engine) as db:
        user = db.get(User, harness.user_id)
        user.is_banned = True
        user.ban_type = "permanent"
        db.commit()
    assert harness.user.get("/api/cart").status_code == 403
    assert finalize(harness).status_code == 401
    with Session(harness.engine) as db:
        user = db.get(User, harness.user_id)
        user.is_banned = False
        user.ban_type = None
        user.is_active = False
        db.commit()
    assert harness.user.get("/api/cart").status_code == 401
