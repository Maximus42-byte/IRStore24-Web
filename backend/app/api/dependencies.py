from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import SESSION_COOKIE_NAME, hash_session_token
from app.models.user import User, UserSession
from app.services.auth import as_utc, is_currently_banned, revoke_user_sessions, utc_now


def unauthenticated() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Session"},
    )


def get_current_user(
    request: Request, db: Session = Depends(get_db)
) -> User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token or len(token) > 256 or not token.isascii():
        raise unauthenticated()

    token_hash = hash_session_token(token)
    record = db.scalar(
        select(UserSession)
        .options(joinedload(UserSession.user))
        .where(UserSession.session_token_hash == token_hash)
    )
    now = utc_now()
    if (
        record is None
        or record.revoked_at is not None
        or as_utc(record.expires_at) <= now
        or record.user is None
    ):
        raise unauthenticated()

    user = record.user
    if not user.is_active or is_currently_banned(user, now):
        revoke_user_sessions(db, user.id, now)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account unavailable",
        )

    record.last_used_at = now
    db.commit()
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required",
        )
    return current_user
