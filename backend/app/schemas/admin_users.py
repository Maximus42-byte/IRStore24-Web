from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class UserStatusPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    is_active: bool


class BanRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["temporary", "permanent"]
    duration_minutes: int | None = Field(default=None, ge=1, le=5_256_000)
    reason: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def validate_duration(self):
        if self.type == "temporary" and self.duration_minutes is None:
            raise ValueError("Temporary bans require duration_minutes")
        if self.type == "permanent" and self.duration_minutes is not None:
            raise ValueError("Permanent bans cannot have a duration")
        return self


class AdminUser(BaseModel):
    id: int
    email: str
    role: Literal["user", "admin"]
    is_active: bool
    ban_status: Literal["not_banned", "temporary", "permanent"]
    banned_until: datetime | None
    ban_reason: str | None
    banned_at: datetime | None
    banned_by: int | None
    created_at: datetime


class AdminUserPage(BaseModel):
    items: list[AdminUser]
    total: int
    page: int
    page_size: int
