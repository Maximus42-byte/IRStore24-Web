from datetime import timedelta
from decimal import Decimal, localcontext
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.cart import CartCS2Item, CartTF2Key
from app.models.cs2_item import CS2Item
from app.models.order import Order, OrderCS2Item, OrderTF2Key
from app.models.store_settings import StoreSettings
from app.models.tf2_key import TF2Key
from app.models.user import User
from app.schemas.orders import (
    AdminOrderDetail, CS2OrderLine, OrderDetail, OrderSummary,
    PaymentInstructions, TF2OrderLine,
)
from app.services.auth import as_utc, is_currently_banned, utc_now
from app.services.cart import user_cart
from app.services.pricing import price_view
from app.services.settings import payment_instructions_configured


MAX_NUMERIC_20_8 = Decimal("999999999999.99999999")


def fitting_amount(value: Decimal) -> Decimal:
    if value < 0 or value > MAX_NUMERIC_20_8 or value.as_tuple().exponent < -8:
        raise HTTPException(409, "Order amount exceeds supported range")
    return value


def finalize_cart(db: Session, user_id: int) -> Order:
    # Lock order: user, cart, settings, CS2 products by ID, TF2 products by ID.
    # The user lock serializes finalization with ban/deactivation changes.
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if user is None or not user.is_active or is_currently_banned(user):
        raise HTTPException(403, "Account unavailable")
    cart = user_cart(db, user_id)
    cs2_lines = list(db.scalars(
        select(CartCS2Item).where(CartCS2Item.cart_id == cart.id)
        .order_by(CartCS2Item.cs2_item_id)
    ))
    tf2_lines = list(db.scalars(
        select(CartTF2Key).where(CartTF2Key.cart_id == cart.id)
        .order_by(CartTF2Key.tf2_key_id)
    ))
    if not cs2_lines and not tf2_lines:
        raise HTTPException(409, "Cart is empty")

    settings = db.scalar(
        select(StoreSettings).where(StoreSettings.id == 1).with_for_update(read=True)
    )
    if settings is None:
        raise HTTPException(503, "Exchange rate is not configured")
    if not payment_instructions_configured(settings):
        raise HTTPException(503, "Payment instructions are not configured")
    rate = settings.usdt_toman_rate
    if rate <= 0:
        raise HTTPException(503, "Exchange rate is invalid")

    cs2_products = {}
    tf2_products = {}
    for line in cs2_lines:
        product = db.scalar(
            select(CS2Item).where(CS2Item.id == line.cs2_item_id).with_for_update()
        )
        if product is None or not product.available or product.stock_quantity < line.quantity:
            raise HTTPException(409, "A CS2 item is unavailable or has insufficient stock")
        cs2_products[line.cs2_item_id] = product
    for line in tf2_lines:
        product = db.scalar(
            select(TF2Key).where(TF2Key.id == line.tf2_key_id).with_for_update()
        )
        if (
            product is None or not product.is_active or product.stock_quantity < line.quantity
        ):
            raise HTTPException(409, "A TF2 key is unavailable or has insufficient stock")
        tf2_products[line.tf2_key_id] = product

    now = utc_now()
    order = Order(
        order_number="IR-" + uuid4().hex.upper(),
        user_id=user_id, status="pending",
        locked_usdt_toman_rate=rate,
        total_price_toman=Decimal(0), total_price_usdt=Decimal(0),
        created_at=now,
        expires_at=now + timedelta(minutes=settings.order_reservation_minutes),
    )
    with localcontext() as context:
        context.prec = 64
        total_toman = Decimal(0)
        total_usdt = Decimal(0)
        for line in cs2_lines:
            product = cs2_products[line.cs2_item_id]
            price = price_view(product.sell_price_amount, product.sell_price_currency, rate)
            unit_toman = fitting_amount(price.toman)
            unit_usdt = fitting_amount(price.usdt)
            total_toman += unit_toman * line.quantity
            total_usdt += unit_usdt * line.quantity
            order.cs2_items.append(OrderCS2Item(
                cs2_item_id=product.id, name=product.name, weapon=product.weapon,
                exterior=product.exterior, float_value=product.float_value,
                quantity=line.quantity, unit_price_toman=unit_toman,
                unit_price_usdt=unit_usdt,
            ))
        for line in tf2_lines:
            product = tf2_products[line.tf2_key_id]
            price = price_view(product.sell_price_amount, product.sell_price_currency, rate)
            unit_toman = fitting_amount(price.toman)
            unit_usdt = fitting_amount(price.usdt)
            total_toman += unit_toman * line.quantity
            total_usdt += unit_usdt * line.quantity
            order.tf2_keys.append(OrderTF2Key(
                tf2_key_id=product.id, quantity=line.quantity,
                unit_price_toman=unit_toman, unit_price_usdt=unit_usdt,
            ))
        order.total_price_toman = fitting_amount(total_toman)
        order.total_price_usdt = fitting_amount(total_usdt)

    for line in cs2_lines:
        cs2_products[line.cs2_item_id].stock_quantity -= line.quantity
        db.delete(line)
    for line in tf2_lines:
        tf2_products[line.tf2_key_id].stock_quantity -= line.quantity
        db.delete(line)
    cart.updated_at = now
    db.add(order)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order


def order_summary(order: Order) -> OrderSummary:
    return OrderSummary(
        order_number=order.order_number, status=order.status,
        locked_usdt_toman_rate=order.locked_usdt_toman_rate,
        total_price_toman=order.total_price_toman,
        total_price_usdt=order.total_price_usdt,
        created_at=order.created_at, expires_at=order.expires_at,
        confirmed_at=order.confirmed_at, cancelled_at=order.cancelled_at,
        expired_at=order.expired_at,
    )


def order_detail(db: Session, order: Order, *, admin: bool = False):
    data = order_summary(order).model_dump()
    data["cs2_items"] = [
        CS2OrderLine(
            cs2_item_id=line.cs2_item_id, name=line.name, weapon=line.weapon,
            exterior=line.exterior, float_value=line.float_value,
            quantity=line.quantity, unit_price_toman=line.unit_price_toman,
            unit_price_usdt=line.unit_price_usdt,
        )
        for line in db.scalars(
            select(OrderCS2Item).where(OrderCS2Item.order_id == order.id)
            .order_by(OrderCS2Item.id)
        )
    ]
    data["tf2_keys"] = [
        TF2OrderLine(
            tf2_key_id=line.tf2_key_id, quantity=line.quantity,
            unit_price_toman=line.unit_price_toman,
            unit_price_usdt=line.unit_price_usdt,
        )
        for line in db.scalars(
            select(OrderTF2Key).where(OrderTF2Key.order_id == order.id)
            .order_by(OrderTF2Key.id)
        )
    ]
    data["payment"] = None
    if order.status == "pending" and as_utc(order.expires_at) > utc_now():
        settings = db.get(StoreSettings, 1)
        if settings is not None:
            data["payment"] = PaymentInstructions(
                card_number=settings.card_number,
                card_holder_name=settings.card_holder_name,
                telegram_username=settings.telegram_username,
                telegram_url=settings.telegram_url,
            )
    if admin:
        data.update(
            user_id=order.user_id,
            user_email=db.scalar(select(User.email).where(User.id == order.user_id)),
            confirmed_by=order.confirmed_by, cancelled_by=order.cancelled_by,
        )
    return (AdminOrderDetail if admin else OrderDetail)(**data)


def order_for_user(db: Session, order_number: str, user_id: int) -> Order:
    order = db.scalar(select(Order).where(
        Order.order_number == order_number, Order.user_id == user_id
    ))
    if order is None:
        raise HTTPException(404, "Order not found")
    return order


def locked_order(
    db: Session, order_number: str, *, user_id: int | None = None,
) -> Order:
    query = select(Order).where(Order.order_number == order_number)
    if user_id is not None:
        query = query.where(Order.user_id == user_id)
    order = db.scalar(query.with_for_update())
    if order is None:
        raise HTTPException(404, "Order not found")
    return order


def restore_inventory(db: Session, order: Order) -> None:
    # All status transitions lock the order first; inventory rows use the
    # same CS2-then-TF2, ascending-ID order as finalization.
    cs2_lines = list(db.scalars(
        select(OrderCS2Item).where(OrderCS2Item.order_id == order.id)
        .order_by(OrderCS2Item.cs2_item_id)
    ))
    tf2_lines = list(db.scalars(
        select(OrderTF2Key).where(OrderTF2Key.order_id == order.id)
        .order_by(OrderTF2Key.tf2_key_id)
    ))
    for line in cs2_lines:
        product = db.scalar(
            select(CS2Item).where(CS2Item.id == line.cs2_item_id).with_for_update()
        )
        if product is None:
            raise RuntimeError("Reserved CS2 product is missing")
        product.stock_quantity += line.quantity
    for line in tf2_lines:
        product = db.scalar(
            select(TF2Key).where(TF2Key.id == line.tf2_key_id).with_for_update()
        )
        if product is None:
            raise RuntimeError("Reserved TF2 product is missing")
        product.stock_quantity += line.quantity


def transition_locked(
    db: Session, order: Order, action: str, actor_id: int | None,
) -> bool:
    if order.status != "pending":
        raise HTTPException(409, "Only pending orders can change status")
    now = utc_now()
    expired_instead = action != "expire" and as_utc(order.expires_at) <= now
    if action == "expire" or expired_instead:
        restore_inventory(db, order)
        order.status = "expired"
        order.expired_at = now
    elif action == "cancel":
        restore_inventory(db, order)
        order.status = "cancelled"
        order.cancelled_at = now
        order.cancelled_by = actor_id
    elif action == "confirm":
        order.status = "confirmed"
        order.confirmed_at = now
        order.confirmed_by = actor_id
    else:
        raise ValueError("Unsupported order transition")
    return expired_instead


def transition_order(
    db: Session, order_number: str, action: str, actor_id: int,
    *, user_id: int | None = None,
) -> tuple[Order, bool]:
    order = locked_order(db, order_number, user_id=user_id)
    expired_instead = transition_locked(db, order, action, actor_id)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(order)
    return order, expired_instead


def expire_due_orders(db: Session, limit: int = 100) -> int:
    expired = 0
    for _ in range(limit):
        order = db.scalar(
            select(Order)
            .where(Order.status == "pending", Order.expires_at <= func.now())
            .order_by(Order.expires_at, Order.id)
            .limit(1)
            .with_for_update(skip_locked=True)
        )
        if order is None:
            db.rollback()
            break
        transition_locked(db, order, "expire", None)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise
        expired += 1
    return expired
