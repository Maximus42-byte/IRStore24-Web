from decimal import Decimal, ROUND_HALF_UP, localcontext

from app.models.cs2_item import CS2Item
from app.models.tf2_key import TF2Key
from app.schemas.store import CS2Admin, CS2Public, PriceView, TF2Admin, TF2Public


TOMAN_UNIT = Decimal("1")
USDT_UNIT = Decimal("0.01")


def convert(amount: Decimal, currency: str, target: str, rate: Decimal) -> Decimal:
    if rate <= 0:
        raise ValueError("Exchange rate must be positive")
    if currency == target:
        return amount
    with localcontext() as context:
        # Two NUMERIC(20,8) operands can exceed Python's default 28 digits
        # during multiplication or division.
        context.prec = 64
        if currency == "USDT" and target == "TOMAN":
            return amount * rate
        if currency == "TOMAN" and target == "USDT":
            return amount / rate
    raise ValueError("Unsupported currency")


def price_view(amount: Decimal, currency: str, rate: Decimal | None) -> PriceView:
    # Base amounts remain exact. Display equivalents round half-up to a whole
    # toman or two USDT decimal places; no converted value is persisted.
    toman = (
        amount if currency == "TOMAN" else
        convert(amount, currency, "TOMAN", rate).quantize(TOMAN_UNIT, rounding=ROUND_HALF_UP)
        if rate is not None else None
    )
    usdt = (
        amount if currency == "USDT" else
        convert(amount, currency, "USDT", rate).quantize(USDT_UNIT, rounding=ROUND_HALF_UP)
        if rate is not None else None
    )
    return PriceView(amount=amount, currency=currency, toman=toman, usdt=usdt)


def cs2_view(item: CS2Item, rate: Decimal | None, *, admin: bool = False):
    data = {
        "id": item.id, "slug": item.slug, "name": item.name,
        "description": item.description, "weapon": item.weapon,
        "exterior": item.exterior, "float_value": item.float_value,
        "stock_quantity": item.stock_quantity, "image_path": item.image_path,
        "available": item.available,
        "sell_price": price_view(item.sell_price_amount, item.sell_price_currency, rate),
        "buy_price": price_view(item.buy_price_amount, item.buy_price_currency, rate),
    }
    if admin:
        data.update(
            is_active=item.is_active, deleted_at=item.deleted_at,
            created_at=item.created_at, updated_at=item.updated_at
        )
    return (CS2Admin if admin else CS2Public)(**data)


def tf2_view(item: TF2Key, rate: Decimal | None, *, admin: bool = False):
    data = {
        "id": item.id, "stock_quantity": item.stock_quantity,
        "available": item.is_active and item.stock_quantity > 0,
        "sell_price": price_view(item.sell_price_amount, item.sell_price_currency, rate),
        "buy_price": price_view(item.buy_price_amount, item.buy_price_currency, rate),
    }
    if admin:
        data.update(
            is_active=item.is_active, created_at=item.created_at,
            updated_at=item.updated_at
        )
    return (TF2Admin if admin else TF2Public)(**data)
