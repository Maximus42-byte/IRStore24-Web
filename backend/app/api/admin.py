from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.api.store import current_rate
from app.core.database import get_db
from app.models.cs2_item import CS2Item
from app.models.store_settings import StoreSettings
from app.models.tf2_key import TF2Key
from app.models.user import User
from app.schemas.admin_users import (
    AdminUser, AdminUserPage, BanRequest, UserStatusPatch,
)
from app.schemas.store import (
    AdminSettings, CS2Admin, CS2AdminPage, CS2Patch, CS2Write,
    SettingsPatch, TF2Admin, TF2AdminPage, TF2Patch, TF2Write,
)
from app.services.auth import (
    ban_user, is_currently_banned, set_user_active, unban_user, utc_now,
)
from app.services.pricing import cs2_view, tf2_view


router = APIRouter(
    prefix="/api/admin", tags=["Administration"], dependencies=[Depends(require_admin)]
)


def cs2_or_404(db: Session, item_id: int, *, lock: bool = False) -> CS2Item:
    query = select(CS2Item).where(CS2Item.id == item_id)
    item = db.scalar(query.with_for_update() if lock else query)
    if item is None:
        raise HTTPException(404, "CS2 item not found")
    return item


def tf2_or_404(db: Session, item_id: int, *, lock: bool = False) -> TF2Key:
    query = select(TF2Key).where(TF2Key.id == item_id)
    item = db.scalar(query.with_for_update() if lock else query)
    if item is None:
        raise HTTPException(404, "TF2 key not found")
    return item


def is_duplicate_slug(error: IntegrityError) -> bool:
    original = error.orig
    if getattr(original, "sqlstate", None) == "23505":
        return getattr(getattr(original, "diag", None), "constraint_name", None) == "cs2_items_slug_key"
    return "UNIQUE constraint failed: cs2_items.slug" in str(original)


@router.get("/cs2-items", response_model=CS2AdminPage)
def list_admin_cs2(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    deleted: bool | None = None,
    db: Session = Depends(get_db),
) -> CS2AdminPage:
    query = select(CS2Item)
    if deleted is not None:
        query = query.where(
            CS2Item.deleted_at.is_not(None) if deleted else CS2Item.deleted_at.is_(None)
        )
    items = list(db.scalars(query.order_by(CS2Item.id.desc())))
    start = (page - 1) * page_size
    rate = current_rate(db)
    return CS2AdminPage(
        items=[cs2_view(item, rate, admin=True) for item in items[start:start + page_size]],
        total=len(items), page=page, page_size=page_size,
    )


@router.get("/cs2-items/{item_id}", response_model=CS2Admin)
def get_admin_cs2(item_id: int, db: Session = Depends(get_db)) -> CS2Admin:
    return cs2_view(cs2_or_404(db, item_id), current_rate(db), admin=True)


@router.post("/cs2-items", response_model=CS2Admin, status_code=201)
def create_cs2(payload: CS2Write, db: Session = Depends(get_db)) -> CS2Admin:
    item = CS2Item(**payload.model_dump())
    db.add(item)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if is_duplicate_slug(error):
            raise HTTPException(409, "CS2 slug already exists") from None
        raise
    db.refresh(item)
    return cs2_view(item, current_rate(db), admin=True)


@router.patch("/cs2-items/{item_id}", response_model=CS2Admin)
def update_cs2(
    item_id: int, payload: CS2Patch, db: Session = Depends(get_db)
) -> CS2Admin:
    item = cs2_or_404(db, item_id, lock=True)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if is_duplicate_slug(error):
            raise HTTPException(409, "CS2 slug already exists") from None
        raise
    db.refresh(item)
    return cs2_view(item, current_rate(db), admin=True)


@router.delete("/cs2-items/{item_id}", response_model=CS2Admin)
def delete_cs2(item_id: int, db: Session = Depends(get_db)) -> CS2Admin:
    item = cs2_or_404(db, item_id, lock=True)
    if item.deleted_at is None:
        item.deleted_at = utc_now()
        db.commit()
        db.refresh(item)
    return cs2_view(item, current_rate(db), admin=True)


@router.post("/cs2-items/{item_id}/restore", response_model=CS2Admin)
def restore_cs2(item_id: int, db: Session = Depends(get_db)) -> CS2Admin:
    item = cs2_or_404(db, item_id, lock=True)
    if item.deleted_at is not None:
        item.deleted_at = None
        db.commit()
        db.refresh(item)
    return cs2_view(item, current_rate(db), admin=True)


@router.get("/tf2-keys", response_model=TF2AdminPage)
def list_admin_tf2(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> TF2AdminPage:
    items = list(db.scalars(select(TF2Key).order_by(TF2Key.id.desc())))
    start = (page - 1) * page_size
    rate = current_rate(db)
    return TF2AdminPage(
        items=[tf2_view(item, rate, admin=True) for item in items[start:start + page_size]],
        total=len(items), page=page, page_size=page_size,
    )


@router.get("/tf2-keys/{item_id}", response_model=TF2Admin)
def get_admin_tf2(item_id: int, db: Session = Depends(get_db)) -> TF2Admin:
    return tf2_view(tf2_or_404(db, item_id), current_rate(db), admin=True)


@router.post("/tf2-keys", response_model=TF2Admin, status_code=201)
def create_tf2(payload: TF2Write, db: Session = Depends(get_db)) -> TF2Admin:
    item = TF2Key(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return tf2_view(item, current_rate(db), admin=True)


@router.patch("/tf2-keys/{item_id}", response_model=TF2Admin)
def update_tf2(
    item_id: int, payload: TF2Patch, db: Session = Depends(get_db)
) -> TF2Admin:
    item = tf2_or_404(db, item_id, lock=True)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return tf2_view(item, current_rate(db), admin=True)


@router.get("/settings", response_model=AdminSettings)
def get_admin_settings(db: Session = Depends(get_db)) -> StoreSettings:
    settings = db.get(StoreSettings, 1)
    if settings is None:
        raise HTTPException(404, "Store settings are not initialized")
    return settings


@router.patch("/settings", response_model=AdminSettings)
def patch_admin_settings(
    payload: SettingsPatch,
    actor: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> StoreSettings:
    settings = db.scalar(
        select(StoreSettings).where(StoreSettings.id == 1).with_for_update()
    )
    values = payload.model_dump(exclude_unset=True)
    if settings is None:
        if "usdt_toman_rate" not in values:
            raise HTTPException(422, "usdt_toman_rate is required to initialize settings")
        settings = StoreSettings(id=1, **values, updated_by=actor.id, updated_at=utc_now())
        db.add(settings)
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            original = error.orig
            if getattr(original, "sqlstate", None) == "23505" or "UNIQUE constraint failed: store_settings.id" in str(original):
                raise HTTPException(409, "Store settings were initialized concurrently; retry") from None
            raise
    else:
        for key, value in values.items():
            setattr(settings, key, value)
        settings.updated_by = actor.id
        settings.updated_at = utc_now()
        db.commit()
    db.refresh(settings)
    return settings


def user_view(user: User) -> AdminUser:
    ban_status = "not_banned"
    if is_currently_banned(user):
        ban_status = user.ban_type or "permanent"
    return AdminUser(
        id=user.id, email=user.email, role=user.role,
        is_active=user.is_active, ban_status=ban_status,
        banned_until=user.banned_until if ban_status != "not_banned" else None,
        ban_reason=user.ban_reason if ban_status != "not_banned" else None,
        banned_at=user.banned_at if ban_status != "not_banned" else None,
        banned_by=user.banned_by if ban_status != "not_banned" else None,
        created_at=user.created_at,
    )


@router.get("/users", response_model=AdminUserPage)
def list_admin_users(
    search: str | None = Query(default=None, min_length=1, max_length=100),
    role: Literal["user", "admin"] | None = None,
    status_filter: Literal["active", "inactive"] | None = Query(default=None, alias="status"),
    ban_status: Literal["not_banned", "temporary", "permanent"] | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> AdminUserPage:
    query = select(User)
    if search is not None:
        query = query.where(User.email.icontains(search, autoescape=True))
    if role is not None:
        query = query.where(User.role == role)
    if status_filter is not None:
        query = query.where(User.is_active.is_(status_filter == "active"))
    users = [user_view(user) for user in db.scalars(query.order_by(User.id.desc()))]
    if ban_status is not None:
        users = [user for user in users if user.ban_status == ban_status]
    start = (page - 1) * page_size
    return AdminUserPage(
        items=users[start:start + page_size],
        total=len(users), page=page, page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=AdminUser)
def get_admin_user(user_id: int, db: Session = Depends(get_db)) -> AdminUser:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    return user_view(user)


def apply_user_change(operation, db: Session) -> AdminUser:
    try:
        user = operation()
    except LookupError:
        raise HTTPException(404, "User not found") from None
    except PermissionError:
        raise HTTPException(403, "Administrator access required") from None
    except ValueError as error:
        raise HTTPException(422, str(error)) from None
    db.commit()
    db.refresh(user)
    return user_view(user)


@router.patch("/users/{user_id}/status", response_model=AdminUser)
def patch_user_status(
    user_id: int, payload: UserStatusPatch,
    actor: User = Depends(require_admin), db: Session = Depends(get_db),
) -> AdminUser:
    return apply_user_change(
        lambda: set_user_active(db, actor, user_id, payload.is_active), db
    )


@router.post("/users/{user_id}/ban", response_model=AdminUser)
def post_user_ban(
    user_id: int, payload: BanRequest,
    actor: User = Depends(require_admin), db: Session = Depends(get_db),
) -> AdminUser:
    banned_until = (
        utc_now() + timedelta(minutes=payload.duration_minutes)
        if payload.duration_minutes is not None else None
    )
    return apply_user_change(
        lambda: ban_user(
            db, actor, user_id, ban_type=payload.type,
            banned_until=banned_until, reason=payload.reason,
        ), db,
    )


@router.post("/users/{user_id}/unban", response_model=AdminUser)
def post_user_unban(
    user_id: int, actor: User = Depends(require_admin), db: Session = Depends(get_db),
) -> AdminUser:
    return apply_user_change(lambda: unban_user(db, actor, user_id), db)
