from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


Currency = Literal["USDT", "TOMAN"]
Exterior = Literal[
    "Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"
]
Money = Decimal


class ExactDecimalInput(BaseModel):
    @field_validator(
        "sell_price_amount", "buy_price_amount", "usdt_toman_rate",
        "float_value", check_fields=False, mode="before"
    )
    @classmethod
    def require_exact_decimal(cls, value):
        if not isinstance(value, str):
            raise ValueError("Decimal values must be sent as strings")
        return value


class PriceView(BaseModel):
    amount: Decimal
    currency: Currency
    toman: Decimal | None
    usdt: Decimal | None


class CS2Public(BaseModel):
    id: int
    slug: str
    name: str
    description: str | None
    weapon: str
    exterior: Exterior
    float_value: Decimal
    stock_quantity: int
    image_path: str | None
    available: bool
    sell_price: PriceView
    buy_price: PriceView


class TF2Public(BaseModel):
    id: int
    stock_quantity: int
    available: bool
    sell_price: PriceView
    buy_price: PriceView


class Page(BaseModel):
    items: list
    total: int
    page: int
    page_size: int


class CS2Page(Page):
    items: list[CS2Public]


class TF2Page(Page):
    items: list[TF2Public]


class PublicSettings(BaseModel):
    usdt_toman_rate: Decimal | None
    telegram_username: str | None
    telegram_url: str | None
    instagram_url: str | None


class CS2Write(ExactDecimalInput):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    weapon: str = Field(min_length=1, max_length=100)
    exterior: Exterior
    float_value: Decimal = Field(ge=0, le=1, max_digits=9, decimal_places=8)
    stock_quantity: int = Field(ge=0)
    sell_price_amount: Money = Field(gt=0, max_digits=20, decimal_places=8)
    sell_price_currency: Currency
    buy_price_amount: Money = Field(gt=0, max_digits=20, decimal_places=8)
    buy_price_currency: Currency
    image_path: str | None = Field(default=None, max_length=1024)
    is_active: bool = True

    @field_validator("image_path")
    @classmethod
    def safe_image_path(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parts = value.split("/")
        if (
            not value.startswith("/media/")
            or len(parts) < 3
            or any(part in ("", ".", "..") for part in parts[2:])
            or any(char in value for char in ("\\", "?", "#", "%", ":"))
            or any(not all(c.isalnum() or c in "-_." for c in part) for part in parts[2:])
        ):
            raise ValueError("image_path must be a safe /media/ relative path")
        return value


class CS2Patch(CS2Write):
    slug: str | None = Field(default=None, min_length=1, max_length=255, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str | None = Field(default=None, min_length=1, max_length=255)
    weapon: str | None = Field(default=None, min_length=1, max_length=100)
    exterior: Exterior | None = None
    float_value: Decimal | None = Field(default=None, ge=0, le=1, max_digits=9, decimal_places=8)
    stock_quantity: int | None = Field(default=None, ge=0)
    sell_price_amount: Money | None = Field(default=None, gt=0, max_digits=20, decimal_places=8)
    sell_price_currency: Currency | None = None
    buy_price_amount: Money | None = Field(default=None, gt=0, max_digits=20, decimal_places=8)
    buy_price_currency: Currency | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        nullable = {"description", "image_path"}
        for field in self.model_fields_set:
            if field not in nullable and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class CS2Admin(CS2Public):
    is_active: bool
    deleted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TF2Write(ExactDecimalInput):
    model_config = ConfigDict(extra="forbid")

    stock_quantity: int = Field(ge=0)
    sell_price_amount: Money = Field(gt=0, max_digits=20, decimal_places=8)
    sell_price_currency: Currency
    buy_price_amount: Money = Field(gt=0, max_digits=20, decimal_places=8)
    buy_price_currency: Currency
    is_active: bool = True


class TF2Patch(TF2Write):
    stock_quantity: int | None = Field(default=None, ge=0)
    sell_price_amount: Money | None = Field(default=None, gt=0, max_digits=20, decimal_places=8)
    sell_price_currency: Currency | None = None
    buy_price_amount: Money | None = Field(default=None, gt=0, max_digits=20, decimal_places=8)
    buy_price_currency: Currency | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in self.model_fields_set:
            if getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class TF2Admin(TF2Public):
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CS2AdminPage(Page):
    items: list[CS2Admin]


class TF2AdminPage(Page):
    items: list[TF2Admin]


class SettingsPatch(ExactDecimalInput):
    model_config = ConfigDict(extra="forbid")

    usdt_toman_rate: Decimal | None = Field(
        default=None, gt=0, max_digits=20, decimal_places=8
    )
    card_number: str | None = Field(default=None, max_length=32)
    card_holder_name: str | None = Field(default=None, max_length=255)
    telegram_username: str | None = Field(default=None, max_length=64)
    telegram_url: str | None = Field(default=None, max_length=2048)
    instagram_url: str | None = Field(default=None, max_length=2048)
    order_reservation_minutes: int | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in ("usdt_toman_rate", "order_reservation_minutes"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class AdminSettings(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usdt_toman_rate: Decimal
    card_number: str | None
    card_holder_name: str | None
    telegram_username: str | None
    telegram_url: str | None
    instagram_url: str | None
    order_reservation_minutes: int
    updated_at: datetime
    updated_by: int | None
