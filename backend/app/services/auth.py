from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.user import User, UserSession


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)


def is_currently_banned(user: User, now: datetime | None = None) -> bool:
    if not user.is_banned:
        return False
    if user.ban_type == "temporary" and user.banned_until is not None:
        return as_utc(user.banned_until) > (now or utc_now())
    return True


def revoke_user_sessions(
    db: Session, user_id: int, now: datetime | None = None
) -> None:
    db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.revoked_at.is_(None))
        .values(revoked_at=now or utc_now())
    )


def _admin_target(db: Session, actor: User, target_id: int) -> User:
    if actor.role != "admin" or not actor.is_active or is_currently_banned(actor):
        raise PermissionError("Administrator access required")
    target = db.scalar(select(User).where(User.id == target_id).with_for_update())
    if target is None:
        raise LookupError("User not found")
    return target


def set_user_active(
    db: Session, actor: User, target_id: int, active: bool
) -> User:
    target = _admin_target(db, actor, target_id)
    if not active and actor.id == target.id:
        raise ValueError("Administrators cannot deactivate themselves")
    target.is_active = active
    if not active:
        revoke_user_sessions(db, target.id)
    return target


def ban_user(
    db: Session,
    actor: User,
    target_id: int,
    *,
    ban_type: str,
    banned_until: datetime | None,
    reason: str | None = None,
) -> User:
    target = _admin_target(db, actor, target_id)
    if actor.id == target.id:
        raise ValueError("Administrators cannot ban themselves")
    now = utc_now()
    if ban_type == "temporary":
        if banned_until is None or as_utc(banned_until) <= now:
            raise ValueError("Temporary bans require a future expiration")
    elif ban_type == "permanent":
        if banned_until is not None:
            raise ValueError("Permanent bans cannot have an expiration")
    else:
        raise ValueError("Unsupported ban type")
    target.is_banned = True
    target.ban_type = ban_type
    target.banned_until = banned_until
    target.ban_reason = reason
    target.banned_at = now
    target.banned_by = actor.id
    revoke_user_sessions(db, target.id, now)
    return target


def unban_user(db: Session, actor: User, target_id: int) -> User:
    target = _admin_target(db, actor, target_id)
    target.is_banned = False
    target.ban_type = None
    target.banned_until = None
    target.ban_reason = None
    target.banned_at = None
    target.banned_by = None
    return target
