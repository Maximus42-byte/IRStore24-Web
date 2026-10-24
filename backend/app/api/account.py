from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.auth import clear_session_cookie
from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest, UserPublic
from app.services.auth import revoke_user_sessions, utc_now


router = APIRouter(prefix="/api/account", tags=["Account"])


@router.get("", response_model=UserPublic)
def account(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/change-password", status_code=204)
def change_password(
    payload: ChangePasswordRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    user = db.scalar(
        select(User).where(User.id == current_user.id).with_for_update()
    )
    if user is None or not verify_password(
        user.password_hash, payload.current_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid current password",
        )
    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must differ from current password",
        )

    user.password_hash = hash_password(payload.new_password)
    revoke_user_sessions(db, user.id, utc_now())
    db.commit()
    clear_session_cookie(response)
