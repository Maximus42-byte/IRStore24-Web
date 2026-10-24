from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    DUMMY_PASSWORD_HASH,
    SESSION_COOKIE_NAME,
    generate_session_token,
    hash_password,
    hash_session_token,
    login_attempt_limiter,
    normalize_email,
    verify_password,
)
from app.models.cart import Cart
from app.models.user import User, UserSession
from app.schemas.auth import LoginRequest, RegisterRequest, UserPublic
from app.services.auth import is_currently_banned, utc_now


router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def is_duplicate_email(error: IntegrityError) -> bool:
    original = error.orig
    diagnostic = getattr(original, "diag", None)
    if getattr(original, "sqlstate", None) == "23505":
        return getattr(diagnostic, "constraint_name", None) == "users_email_key"
    return "UNIQUE constraint failed: users.email" in str(original)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.auth_session_ttl_hours * 3600,
        path="/",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite="lax",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite="lax",
    )


@router.post("/register", response_model=UserPublic, status_code=201)
def register(
    payload: RegisterRequest, db: Session = Depends(get_db)
) -> User:
    user = User(
        email=normalize_email(str(payload.email)),
        password_hash=hash_password(payload.password),
        role="user",
        is_active=True,
        is_banned=False,
    )
    db.add(user)
    db.add(Cart(user=user))
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        if not is_duplicate_email(error):
            raise
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Registration unavailable for this email",
        ) from None
    db.refresh(user)
    return user


@router.post("/login", response_model=UserPublic)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    email = normalize_email(str(payload.email))
    client_ip = request.client.host if request.client else "unknown"
    if not login_attempt_limiter.allow(client_ip, email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts",
        )

    user = db.scalar(select(User).where(User.email == email).with_for_update())
    password_hash = user.password_hash if user else DUMMY_PASSWORD_HASH
    password_valid = verify_password(password_hash, payload.password)
    if (
        not password_valid
        or user is None
        or not user.is_active
        or is_currently_banned(user)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = generate_session_token()
    db.add(
        UserSession(
            user_id=user.id,
            session_token_hash=hash_session_token(token),
            expires_at=utc_now()
            + timedelta(hours=settings.auth_session_ttl_hours),
        )
    )
    db.commit()
    db.refresh(user)
    login_attempt_limiter.clear(client_ip, email)
    set_session_cookie(response, token)
    return user


@router.post("/logout", status_code=204)
def logout(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> None:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token and len(token) <= 256 and token.isascii():
        db.execute(
            update(UserSession)
            .where(
                UserSession.session_token_hash == hash_session_token(token),
                UserSession.revoked_at.is_(None),
            )
            .values(revoked_at=utc_now())
        )
        db.commit()
    clear_session_cookie(response)


@router.get("/me", response_model=UserPublic)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
