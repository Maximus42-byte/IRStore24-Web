from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.orders import CS2CartAdd, TF2CartAdd, CartQuantity, CartView
from app.services.cart import (
    cart_view, change_cart_line, remove_cart_line, user_cart,
)


router = APIRouter(prefix="/api/cart", tags=["Cart"])


@router.get("", response_model=CartView)
def get_cart(
    user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CartView:
    cart = user_cart(db, user.id)
    db.commit()
    return cart_view(db, cart)


@router.post("/cs2-items", response_model=CartView)
def add_cs2(
    payload: CS2CartAdd,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> CartView:
    change_cart_line(db, user.id, "cs2", payload.cs2_item_id, payload.quantity, add=True)
    return cart_view(db, user_cart(db, user.id))


@router.patch("/cs2-items/{cs2_item_id}", response_model=CartView)
def set_cs2_quantity(
    cs2_item_id: int, payload: CartQuantity,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> CartView:
    change_cart_line(db, user.id, "cs2", cs2_item_id, payload.quantity, add=False)
    return cart_view(db, user_cart(db, user.id))


@router.delete("/cs2-items/{cs2_item_id}", status_code=204)
def delete_cs2(
    cs2_item_id: int, user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    remove_cart_line(db, user.id, "cs2", cs2_item_id)


@router.post("/tf2-keys", response_model=CartView)
def add_tf2(
    payload: TF2CartAdd,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> CartView:
    change_cart_line(db, user.id, "tf2", payload.tf2_key_id, payload.quantity, add=True)
    return cart_view(db, user_cart(db, user.id))


@router.patch("/tf2-keys/{tf2_key_id}", response_model=CartView)
def set_tf2_quantity(
    tf2_key_id: int, payload: CartQuantity,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
) -> CartView:
    change_cart_line(db, user.id, "tf2", tf2_key_id, payload.quantity, add=False)
    return cart_view(db, user_cart(db, user.id))


@router.delete("/tf2-keys/{tf2_key_id}", status_code=204)
def delete_tf2(
    tf2_key_id: int, user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    remove_cart_line(db, user.id, "tf2", tf2_key_id)
