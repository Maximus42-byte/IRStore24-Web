from decimal import Decimal, localcontext

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.store_settings import StoreSettings
from app.models.cart import Cart, CartCS2Item, CartTF2Key
from app.models.cs2_item import CS2Item
from app.models.tf2_key import TF2Key
from app.models.user import User
from app.schemas.orders import CartView, CS2CartLine, TF2CartLine
from app.services.auth import utc_now
from app.services.pricing import cs2_view, tf2_view
from app.services.settings import payment_instructions_configured


MAX_CART_QUANTITY = 1_000_000


def user_cart(db: Session, user_id: int) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.user_id == user_id).with_for_update())
    if cart is not None:
        return cart
    # Legacy accounts may predate registration-time cart creation. Lock the
    # owner before checking again so two requests cannot create two carts.
    owner_id = db.scalar(select(User.id).where(User.id == user_id).with_for_update())
    if owner_id is None:
        raise HTTPException(403, "Account unavailable")
    cart = db.scalar(select(Cart).where(Cart.user_id == user_id).with_for_update())
    if cart is None:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.flush()
    return cart


def product_for_cart(db: Session, product_type: str, product_id: int):
    model = CS2Item if product_type == "cs2" else TF2Key
    product = db.scalar(
        select(model).where(model.id == product_id).with_for_update()
    )
    if product is None:
        raise HTTPException(404, "Product not found")
    if (
        not product.is_active
        or (product_type == "cs2" and product.deleted_at is not None)
        or product.stock_quantity == 0
    ):
        raise HTTPException(409, "Product is unavailable")
    return product


def change_cart_line(
    db: Session, user_id: int, product_type: str, product_id: int,
    quantity: int, *, add: bool,
) -> None:
    cart = user_cart(db, user_id)
    product = product_for_cart(db, product_type, product_id)
    line_type = CartCS2Item if product_type == "cs2" else CartTF2Key
    field = line_type.cs2_item_id if product_type == "cs2" else line_type.tf2_key_id
    line = db.scalar(
        select(line_type).where(line_type.cart_id == cart.id, field == product_id)
    )
    if line is None and not add:
        raise HTTPException(404, "Cart line not found")
    new_quantity = quantity + (line.quantity if add and line is not None else 0)
    if new_quantity > MAX_CART_QUANTITY or new_quantity > product.stock_quantity:
        raise HTTPException(409, "Requested quantity exceeds available stock")
    if line is None:
        field_name = "cs2_item_id" if product_type == "cs2" else "tf2_key_id"
        db.add(line_type(cart_id=cart.id, **{field_name: product_id}, quantity=new_quantity))
    else:
        line.quantity = new_quantity
    cart.updated_at = utc_now()
    db.commit()


def remove_cart_line(
    db: Session, user_id: int, product_type: str, product_id: int,
) -> None:
    cart = user_cart(db, user_id)
    line_type = CartCS2Item if product_type == "cs2" else CartTF2Key
    field = line_type.cs2_item_id if product_type == "cs2" else line_type.tf2_key_id
    line = db.scalar(
        select(line_type).where(line_type.cart_id == cart.id, field == product_id)
    )
    if line is not None:
        db.delete(line)
        cart.updated_at = utc_now()
    db.commit()


def cart_view(db: Session, cart: Cart) -> CartView:
    settings = db.get(StoreSettings, 1)
    rate = settings.usdt_toman_rate if settings is not None else None
    cs2_lines = []
    tf2_lines = []
    toman_total = Decimal(0)
    usdt_total = Decimal(0)
    with localcontext() as context:
        context.prec = 64
        for line in db.scalars(
            select(CartCS2Item).where(CartCS2Item.cart_id == cart.id)
            .order_by(CartCS2Item.cs2_item_id)
        ):
            product = db.get(CS2Item, line.cs2_item_id)
            view = cs2_view(product, rate)
            cs2_lines.append(CS2CartLine(
                quantity=line.quantity,
                purchasable=view.available and line.quantity <= product.stock_quantity,
                product=view,
            ))
            if rate is not None:
                toman_total += view.sell_price.toman * line.quantity
                usdt_total += view.sell_price.usdt * line.quantity
        for line in db.scalars(
            select(CartTF2Key).where(CartTF2Key.cart_id == cart.id)
            .order_by(CartTF2Key.tf2_key_id)
        ):
            product = db.get(TF2Key, line.tf2_key_id)
            view = tf2_view(product, rate)
            tf2_lines.append(TF2CartLine(
                quantity=line.quantity,
                purchasable=view.available and line.quantity <= product.stock_quantity,
                product=view,
            ))
            if rate is not None:
                toman_total += view.sell_price.toman * line.quantity
                usdt_total += view.sell_price.usdt * line.quantity
    return CartView(
        cs2_items=cs2_lines, tf2_keys=tf2_lines,
        total_price_toman=toman_total if rate is not None else None,
        total_price_usdt=usdt_total if rate is not None else None,
        exchange_rate_configured=rate is not None,
        payment_instructions_configured=payment_instructions_configured(settings),
    )
