from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_admin
from app.core.database import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.orders import (
    AdminOrderDetail, AdminOrderPage, AdminOrderSummary, FinalizeRequest,
    OrderDetail, OrderPage,
)
from app.services.orders import (
    finalize_cart, order_detail, order_for_user, order_summary,
    transition_order,
)


purchase_router = APIRouter(prefix="/api/orders", tags=["Orders"])
account_router = APIRouter(prefix="/api/account/orders", tags=["Orders"])
admin_router = APIRouter(
    prefix="/api/admin/orders", tags=["Administration"],
    dependencies=[Depends(require_admin)],
)
Status = Literal["pending", "confirmed", "cancelled", "expired"]


@purchase_router.post("/finalize", response_model=OrderDetail, status_code=201)
def finalize(
    payload: FinalizeRequest | None = Body(default=None),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> OrderDetail:
    order = finalize_cart(db, user.id)
    return order_detail(db, order)


@account_router.get("", response_model=OrderPage)
def account_orders(
    status: Status | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> OrderPage:
    filters = [Order.user_id == user.id]
    if status is not None:
        filters.append(Order.status == status)
    total = db.scalar(select(func.count()).select_from(Order).where(*filters))
    orders = db.scalars(
        select(Order).where(*filters).order_by(Order.created_at.desc(), Order.id.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    return OrderPage(
        items=[order_summary(order) for order in orders],
        total=total, page=page, page_size=page_size,
    )


@account_router.get("/{order_number}", response_model=OrderDetail)
def account_order(
    order_number: str, user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderDetail:
    return order_detail(db, order_for_user(db, order_number, user.id))


@account_router.post("/{order_number}/cancel", response_model=OrderDetail)
def cancel_account_order(
    order_number: str, user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderDetail:
    order, _ = transition_order(
        db, order_number, "cancel", user.id, user_id=user.id
    )
    return order_detail(db, order)


@admin_router.get("", response_model=AdminOrderPage)
def admin_orders(
    status: Status | None = None,
    user_id: int | None = Query(default=None, gt=0),
    order_number: str | None = Query(default=None, min_length=1, max_length=50),
    created_from: datetime | None = None,
    created_to: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AdminOrderPage:
    if (
        (created_from is not None and created_from.tzinfo is None)
        or (created_to is not None and created_to.tzinfo is None)
        or (
            created_from is not None and created_to is not None
            and created_from > created_to
        )
    ):
        raise HTTPException(422, "Invalid date range")
    filters = []
    if status is not None:
        filters.append(Order.status == status)
    if user_id is not None:
        filters.append(Order.user_id == user_id)
    if order_number is not None:
        filters.append(Order.order_number.icontains(order_number, autoescape=True))
    if created_from is not None:
        filters.append(Order.created_at >= created_from)
    if created_to is not None:
        filters.append(Order.created_at <= created_to)
    total = db.scalar(select(func.count()).select_from(Order).where(*filters))
    orders = db.scalars(
        select(Order).where(*filters).order_by(Order.created_at.desc(), Order.id.desc())
        .offset((page - 1) * page_size).limit(page_size)
    )
    items = [
        AdminOrderSummary(
            **order_summary(order).model_dump(),
            user_id=order.user_id,
            user_email=db.scalar(select(User.email).where(User.id == order.user_id)),
        )
        for order in orders
    ]
    return AdminOrderPage(
        items=items,
        total=total, page=page, page_size=page_size,
    )


def admin_order_or_404(db: Session, order_number: str) -> Order:
    order = db.scalar(select(Order).where(Order.order_number == order_number))
    if order is None:
        raise HTTPException(404, "Order not found")
    return order


@admin_router.get("/{order_number}", response_model=AdminOrderDetail)
def admin_order(
    order_number: str, db: Session = Depends(get_db),
) -> AdminOrderDetail:
    return order_detail(db, admin_order_or_404(db, order_number), admin=True)


@admin_router.post("/{order_number}/confirm", response_model=AdminOrderDetail)
def confirm_order(
    order_number: str, actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminOrderDetail:
    order, expired_instead = transition_order(db, order_number, "confirm", actor.id)
    if expired_instead:
        raise HTTPException(409, "Reservation has expired")
    return order_detail(db, order, admin=True)


@admin_router.post("/{order_number}/cancel", response_model=AdminOrderDetail)
def cancel_admin_order(
    order_number: str, actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminOrderDetail:
    order, _ = transition_order(db, order_number, "cancel", actor.id)
    return order_detail(db, order, admin=True)
