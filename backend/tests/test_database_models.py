from collections.abc import Iterator
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import Numeric, create_engine, event
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.database import Base
from app.models import (
    CS2Item,
    Cart,
    CartCS2Item,
    CartTF2Key,
    Order,
    OrderCS2Item,
    OrderTF2Key,
    StoreSettings,
    TF2Key,
    User,
)


@pytest.fixture
def db_session() -> Iterator[Session]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(dbapi_connection: object, _: object) -> None:
        dbapi_connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    engine.dispose()


def add_user(session: Session, user_id: int = 1) -> User:
    user = User(
        id=user_id,
        email=f"user{user_id}@example.test",
        password_hash="test-hash",
    )
    session.add(user)
    session.flush()
    return user


def add_cs2_item(session: Session) -> CS2Item:
    item = CS2Item(
        id=1,
        slug="ak47-redline",
        name="AK-47 | Redline",
        weapon="AK-47",
        exterior="Field-Tested",
        float_value=Decimal("0.23128412"),
        stock_quantity=5,
        sell_price_amount=Decimal("85.00000000"),
        sell_price_currency="USDT",
        buy_price_amount=Decimal("7400000.00000000"),
        buy_price_currency="TOMAN",
    )
    session.add(item)
    session.flush()
    return item


def add_tf2_key(session: Session) -> TF2Key:
    key = TF2Key(
        id=1,
        stock_quantity=10,
        sell_price_amount=Decimal("2.25000000"),
        sell_price_currency="USDT",
        buy_price_amount=Decimal("200000.00000000"),
        buy_price_currency="TOMAN",
    )
    session.add(key)
    session.flush()
    return key


def add_cart(session: Session, user: User) -> Cart:
    cart = Cart(id=1, user=user)
    session.add(cart)
    session.flush()
    return cart


def make_order(
    order_id: int = 1,
    *,
    user_id: int = 1,
    order_number: str | None = None,
    status: str = "pending",
) -> Order:
    return Order(
        id=order_id,
        order_number=order_number or f"IR-{order_id}",
        user_id=user_id,
        status=status,
        locked_usdt_toman_rate=Decimal("98500.12345678"),
        total_price_toman=Decimal("9850000.12345678"),
        total_price_usdt=Decimal("100.00000000"),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
    )


def make_cs2_order_item(quantity: int = 1, cs2_item_id: int | None = 1) -> OrderCS2Item:
    return OrderCS2Item(
        id=1,
        order_id=1,
        cs2_item_id=cs2_item_id,
        name="AK-47 | Redline",
        weapon="AK-47",
        exterior="Field-Tested",
        float_value=Decimal("0.23128412"),
        quantity=quantity,
        unit_price_toman=Decimal("8372500.00000000"),
        unit_price_usdt=Decimal("85.00000000"),
    )


def make_tf2_order_item(quantity: int = 1, tf2_key_id: int | None = 1) -> OrderTF2Key:
    return OrderTF2Key(
        id=1,
        order_id=1,
        tf2_key_id=tf2_key_id,
        quantity=quantity,
        unit_price_toman=Decimal("221625.00000000"),
        unit_price_usdt=Decimal("2.25000000"),
    )


def test_one_cart_per_user(db_session: Session) -> None:
    user = add_user(db_session)
    first = add_cart(db_session, user)
    assert user.cart is first

    db_session.add(Cart(id=2, user_id=user.id))
    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize("product_type", ["cs2", "tf2"])
def test_cart_product_is_unique_per_cart(
    db_session: Session, product_type: str
) -> None:
    cart = add_cart(db_session, add_user(db_session))
    if product_type == "cs2":
        add_cs2_item(db_session)
        first = CartCS2Item(id=1, cart_id=cart.id, cs2_item_id=1, quantity=1)
        duplicate = CartCS2Item(id=2, cart_id=cart.id, cs2_item_id=1, quantity=2)
    else:
        add_tf2_key(db_session)
        first = CartTF2Key(id=1, cart_id=cart.id, tf2_key_id=1, quantity=1)
        duplicate = CartTF2Key(id=2, cart_id=cart.id, tf2_key_id=1, quantity=2)
    db_session.add(first)
    db_session.flush()
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize("product_type", ["cs2", "tf2"])
def test_cart_requires_existing_product(
    db_session: Session, product_type: str
) -> None:
    cart = add_cart(db_session, add_user(db_session))
    if product_type == "cs2":
        line = CartCS2Item(id=1, cart_id=cart.id, cs2_item_id=999, quantity=1)
    else:
        line = CartTF2Key(id=1, cart_id=cart.id, tf2_key_id=999, quantity=1)
    db_session.add(line)
    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize("quantity", [0, -1])
@pytest.mark.parametrize(
    "line_type", ["cart_cs2", "cart_tf2", "order_cs2", "order_tf2"]
)
def test_line_quantities_must_be_positive(
    db_session: Session, line_type: str, quantity: int
) -> None:
    user = add_user(db_session)
    if line_type.startswith("cart"):
        cart = add_cart(db_session, user)
        if line_type == "cart_cs2":
            add_cs2_item(db_session)
            line = CartCS2Item(
                id=1, cart_id=cart.id, cs2_item_id=1, quantity=quantity
            )
        else:
            add_tf2_key(db_session)
            line = CartTF2Key(
                id=1, cart_id=cart.id, tf2_key_id=1, quantity=quantity
            )
    else:
        db_session.add(make_order())
        db_session.flush()
        if line_type == "order_cs2":
            add_cs2_item(db_session)
            line = make_cs2_order_item(quantity)
        else:
            add_tf2_key(db_session)
            line = make_tf2_order_item(quantity)
    db_session.add(line)
    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize("product_type", ["cs2", "tf2"])
def test_order_lines_require_existing_referenced_product(
    db_session: Session, product_type: str
) -> None:
    add_user(db_session)
    db_session.add(make_order())
    db_session.flush()
    line = (
        make_cs2_order_item(cs2_item_id=999)
        if product_type == "cs2"
        else make_tf2_order_item(tf2_key_id=999)
    )
    db_session.add(line)
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_order_numbers_are_unique(db_session: Session) -> None:
    add_user(db_session)
    db_session.add(make_order(order_number="IR-42"))
    db_session.flush()
    db_session.add(make_order(2, order_number="IR-42"))
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_order_status_values(db_session: Session) -> None:
    add_user(db_session)
    for order_id, status in enumerate(
        ("pending", "confirmed", "cancelled", "expired"), start=1
    ):
        db_session.add(make_order(order_id, status=status))
    db_session.flush()
    assert {order.status for order in db_session.query(Order)} == {
        "pending", "confirmed", "cancelled", "expired"
    }

    db_session.add(make_order(5, status="refunded"))
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_decimal_columns_and_relationships(db_session: Session) -> None:
    user = add_user(db_session)
    cs2_item = add_cs2_item(db_session)
    tf2_key = add_tf2_key(db_session)
    cart = add_cart(db_session, user)
    cart.cs2_items.append(
        CartCS2Item(id=1, cs2_item=cs2_item, quantity=2)
    )
    cart.tf2_keys.append(
        CartTF2Key(id=1, tf2_key=tf2_key, quantity=3)
    )
    order = make_order()
    order.cs2_items.append(make_cs2_order_item())
    order.tf2_keys.append(make_tf2_order_item())
    db_session.add(order)
    db_session.flush()
    db_session.expire_all()

    assert user.cart.cs2_items[0].cs2_item is cs2_item
    assert user.cart.tf2_keys[0].tf2_key is tf2_key
    assert user.orders[0].cs2_items[0].order is order
    assert user.orders[0].tf2_keys[0].order is order
    assert db_session.get(Order, 1).locked_usdt_toman_rate == Decimal(
        "98500.12345678"
    )
    for column in (
        Order.locked_usdt_toman_rate,
        Order.total_price_toman,
        Order.total_price_usdt,
        OrderCS2Item.unit_price_toman,
        OrderCS2Item.unit_price_usdt,
        OrderTF2Key.unit_price_toman,
        OrderTF2Key.unit_price_usdt,
        StoreSettings.usdt_toman_rate,
    ):
        assert isinstance(column.type, Numeric)
        assert (column.type.precision, column.type.scale) == (20, 8)
        assert column.type.asdecimal


def test_order_snapshots_survive_catalog_changes(
    db_session: Session,
) -> None:
    add_user(db_session)
    cs2_item = add_cs2_item(db_session)
    tf2_key = add_tf2_key(db_session)
    db_session.add(make_order())
    db_session.flush()
    db_session.add_all([make_cs2_order_item(), make_tf2_order_item()])
    db_session.flush()

    cs2_item.name = "Renamed item"
    cs2_item.sell_price_amount = Decimal("120.00000000")
    cs2_item.deleted_at = datetime.now(timezone.utc)
    tf2_key.sell_price_amount = Decimal("3.00000000")
    db_session.flush()
    assert db_session.get(OrderCS2Item, 1).name == "AK-47 | Redline"
    assert db_session.get(OrderCS2Item, 1).unit_price_usdt == Decimal("85")
    assert db_session.get(OrderTF2Key, 1).unit_price_usdt == Decimal("2.25")

    db_session.delete(cs2_item)
    db_session.delete(tf2_key)
    db_session.flush()
    db_session.expire_all()
    cs2_line = db_session.get(OrderCS2Item, 1)
    tf2_line = db_session.get(OrderTF2Key, 1)
    assert cs2_line.cs2_item_id is None
    assert tf2_line.tf2_key_id is None
    assert cs2_line.name == "AK-47 | Redline"
    assert cs2_line.unit_price_usdt == Decimal("85")
    assert tf2_line.unit_price_usdt == Decimal("2.25")


def test_store_settings_singleton_and_defaults(db_session: Session) -> None:
    db_session.add(
        StoreSettings(id=1, usdt_toman_rate=Decimal("98500.12345678"))
    )
    db_session.flush()
    settings = db_session.get(StoreSettings, 1)
    assert settings.order_reservation_minutes == 120
    assert settings.updated_at is not None

    db_session.add(
        StoreSettings(id=2, usdt_toman_rate=Decimal("98500.12345678"))
    )
    with pytest.raises(IntegrityError):
        db_session.flush()


@pytest.mark.parametrize(
    ("rate", "minutes"),
    [
        (Decimal("0"), 120),
        (Decimal("1"), 0),
    ],
)
def test_store_settings_positive_values(
    db_session: Session, rate: Decimal, minutes: int
) -> None:
    db_session.add(
        StoreSettings(
            id=1,
            usdt_toman_rate=rate,
            order_reservation_minutes=minutes,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
