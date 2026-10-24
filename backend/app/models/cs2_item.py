from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    Identity,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CS2Item(Base):
    __tablename__ = "cs2_items"

    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="ck_cs2_items_stock_quantity"),
        CheckConstraint(
            "sell_price_amount > 0", name="ck_cs2_items_sell_price_amount"
        ),
        CheckConstraint(
            "buy_price_amount > 0", name="ck_cs2_items_buy_price_amount"
        ),
        CheckConstraint(
            "sell_price_currency IN ('USDT', 'TOMAN')",
            name="ck_cs2_items_sell_price_currency",
        ),
        CheckConstraint(
            "buy_price_currency IN ('USDT', 'TOMAN')",
            name="ck_cs2_items_buy_price_currency",
        ),
        CheckConstraint(
            "exterior IN ('Factory New', 'Minimal Wear', 'Field-Tested', "
            "'Well-Worn', 'Battle-Scarred')",
            name="ck_cs2_items_exterior",
        ),
        CheckConstraint(
            "float_value >= 0 AND float_value <= 1",
            name="ck_cs2_items_float_value",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    weapon: Mapped[str] = mapped_column(String(100), nullable=False)
    exterior: Mapped[str] = mapped_column(String(20), nullable=False)
    float_value: Mapped[Decimal] = mapped_column(Numeric(9, 8), nullable=False)
    stock_quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sell_price_amount: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    sell_price_currency: Mapped[str] = mapped_column(String(5), nullable=False)
    buy_price_amount: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    buy_price_currency: Mapped[str] = mapped_column(String(5), nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    @property
    def available(self) -> bool:
        return self.is_active and self.deleted_at is None and self.stock_quantity > 0
