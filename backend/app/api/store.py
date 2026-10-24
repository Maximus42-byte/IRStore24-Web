from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.cs2_item import CS2Item
from app.models.store_settings import StoreSettings
from app.models.tf2_key import TF2Key
from app.schemas.store import (
    CS2Page, CS2Public, Currency, Exterior, PublicSettings, TF2Page,
)
from app.services.pricing import convert, cs2_view, tf2_view


router = APIRouter(tags=["Store"])


def current_rate(db: Session) -> Decimal | None:
    return db.scalar(select(StoreSettings.usdt_toman_rate).where(StoreSettings.id == 1))


@router.get("/api/cs2-items", response_model=CS2Page)
def list_cs2(
    search: str | None = Query(default=None, min_length=1, max_length=100),
    weapon: str | None = Query(default=None, min_length=1, max_length=100),
    exterior: Exterior | None = None,
    min_float: Decimal | None = Query(default=None, ge=0, le=1, decimal_places=8),
    max_float: Decimal | None = Query(default=None, ge=0, le=1, decimal_places=8),
    min_price: Decimal | None = Query(default=None, ge=0, max_digits=20, decimal_places=8),
    max_price: Decimal | None = Query(default=None, ge=0, max_digits=20, decimal_places=8),
    price_currency: Currency = "TOMAN",
    available: bool | None = None,
    sort: Literal[
        "newest", "oldest", "name_asc", "name_desc",
        "price_asc", "price_desc", "stock_desc",
    ] = "newest",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> CS2Page:
    if min_float is not None and max_float is not None and min_float > max_float:
        raise HTTPException(422, "min_float must not exceed max_float")
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(422, "min_price must not exceed max_price")
    rate = current_rate(db)
    if rate is None and (
        min_price is not None or max_price is not None or sort.startswith("price_")
    ):
        raise HTTPException(503, "Exchange rate is not configured")

    query = select(CS2Item).where(
        CS2Item.is_active.is_(True), CS2Item.deleted_at.is_(None)
    )
    if search is not None:
        query = query.where(or_(
            CS2Item.name.icontains(search, autoescape=True),
            CS2Item.weapon.icontains(search, autoescape=True),
        ))
    if weapon is not None:
        query = query.where(CS2Item.weapon == weapon)
    if exterior is not None:
        query = query.where(CS2Item.exterior == exterior)
    if min_float is not None:
        query = query.where(CS2Item.float_value >= min_float)
    if max_float is not None:
        query = query.where(CS2Item.float_value <= max_float)
    if available is True:
        query = query.where(CS2Item.stock_quantity > 0)
    elif available is False:
        query = query.where(CS2Item.stock_quantity == 0)

    items = list(db.scalars(query))
    if min_price is not None or max_price is not None:
        def in_price_range(item: CS2Item) -> bool:
            amount = convert(
                item.sell_price_amount, item.sell_price_currency, price_currency, rate
            )
            return (
                (min_price is None or amount >= min_price)
                and (max_price is None or amount <= max_price)
            )
        items = [item for item in items if in_price_range(item)]

    if sort.startswith("price_"):
        items.sort(
            key=lambda item: (
                convert(item.sell_price_amount, item.sell_price_currency, price_currency, rate),
                item.id,
            ),
            reverse=sort == "price_desc",
        )
    elif sort == "name_asc":
        items.sort(key=lambda item: (item.name.casefold(), item.id))
    elif sort == "name_desc":
        items.sort(key=lambda item: (item.name.casefold(), item.id), reverse=True)
    elif sort == "stock_desc":
        items.sort(key=lambda item: (-item.stock_quantity, item.id))
    elif sort == "oldest":
        items.sort(key=lambda item: (item.created_at, item.id))
    else:
        items.sort(key=lambda item: (item.created_at, item.id), reverse=True)
    total = len(items)
    start = (page - 1) * page_size
    return CS2Page(
        items=[cs2_view(item, rate) for item in items[start:start + page_size]],
        total=total, page=page, page_size=page_size,
    )


@router.get("/api/cs2-items/{slug}", response_model=CS2Public)
def get_cs2(slug: str, db: Session = Depends(get_db)) -> CS2Public:
    item = db.scalar(
        select(CS2Item).where(
            CS2Item.slug == slug,
            CS2Item.is_active.is_(True),
            CS2Item.deleted_at.is_(None),
        )
    )
    if item is None:
        raise HTTPException(404, "CS2 item not found")
    return cs2_view(item, current_rate(db))


@router.get("/api/tf2-keys", response_model=TF2Page)
def list_tf2(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> TF2Page:
    items = list(db.scalars(
        select(TF2Key).where(TF2Key.is_active.is_(True))
        .order_by(TF2Key.id)
    ))
    total = len(items)
    start = (page - 1) * page_size
    rate = current_rate(db)
    return TF2Page(
        items=[tf2_view(item, rate) for item in items[start:start + page_size]],
        total=total, page=page, page_size=page_size,
    )


@router.get("/api/store/settings/public", response_model=PublicSettings)
def public_settings(db: Session = Depends(get_db)) -> PublicSettings:
    settings = db.get(StoreSettings, 1)
    return PublicSettings(
        usdt_toman_rate=settings.usdt_toman_rate if settings else None,
        telegram_username=settings.telegram_username if settings else None,
        telegram_url=settings.telegram_url if settings else None,
        instagram_url=settings.instagram_url if settings else None,
    )
