from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.store import CS2Public, TF2Public


OrderStatus = Literal["pending", "confirmed", "cancelled", "expired"]


class CS2CartAdd(BaseModel):
    model_config = ConfigDict(extra="forbid")
    cs2_item_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=1_000_000)


class TF2CartAdd(BaseModel):
    model_config = ConfigDict(extra="forbid")
    tf2_key_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=1_000_000)


class CartQuantity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    quantity: int = Field(ge=1, le=1_000_000)


class CS2CartLine(BaseModel):
    quantity: int
    purchasable: bool
    product: CS2Public


class TF2CartLine(BaseModel):
    quantity: int
    purchasable: bool
    product: TF2Public


class CartView(BaseModel):
    cs2_items: list[CS2CartLine]
    tf2_keys: list[TF2CartLine]
    total_price_toman: Decimal | None
    total_price_usdt: Decimal | None
    exchange_rate_configured: bool
    payment_instructions_configured: bool


class FinalizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CS2OrderLine(BaseModel):
    cs2_item_id: int | None
    name: str
    weapon: str
    exterior: str
    float_value: Decimal
    quantity: int
    unit_price_toman: Decimal
    unit_price_usdt: Decimal


class TF2OrderLine(BaseModel):
    tf2_key_id: int | None
    quantity: int
    unit_price_toman: Decimal
    unit_price_usdt: Decimal


class OrderSummary(BaseModel):
    order_number: str
    status: OrderStatus
    locked_usdt_toman_rate: Decimal
    total_price_toman: Decimal
    total_price_usdt: Decimal
    created_at: datetime
    expires_at: datetime
    confirmed_at: datetime | None
    cancelled_at: datetime | None
    expired_at: datetime | None


class PaymentInstructions(BaseModel):
    card_number: str | None
    card_holder_name: str | None
    telegram_username: str | None
    telegram_url: str | None


class OrderDetail(OrderSummary):
    cs2_items: list[CS2OrderLine]
    tf2_keys: list[TF2OrderLine]
    payment: PaymentInstructions | None


class AdminOrderDetail(OrderDetail):
    user_id: int
    user_email: str
    confirmed_by: int | None
    cancelled_by: int | None


class OrderPage(BaseModel):
    items: list[OrderSummary]
    total: int
    page: int
    page_size: int


class AdminOrderSummary(OrderSummary):
    user_id: int
    user_email: str


class AdminOrderPage(OrderPage):
    items: list[AdminOrderSummary]
