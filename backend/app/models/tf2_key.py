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
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TF2Key(Base):
    __tablename__ = "tf2_keys"

    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="ck_tf2_keys_stock_quantity"),
        CheckConstraint(
            "sell_price_amount > 0", name="ck_tf2_keys_sell_price_amount"
        ),
        CheckConstraint(
            "buy_price_amount > 0", name="ck_tf2_keys_buy_price_amount"
        ),
        CheckConstraint(
            "sell_price_currency IN ('USDT', 'TOMAN')",
            name="ck_tf2_keys_sell_price_currency",
        ),
        CheckConstraint(
            "buy_price_currency IN ('USDT', 'TOMAN')",
            name="ck_tf2_keys_buy_price_currency",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    stock_quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sell_price_amount: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    sell_price_currency: Mapped[str] = mapped_column(String(5), nullable=False)
    buy_price_amount: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    buy_price_currency: Mapped[str] = mapped_column(String(5), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
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

    cart_items: Mapped[list["CartTF2Key"]] = relationship(
        back_populates="tf2_key"
    )
    order_items: Mapped[list["OrderTF2Key"]] = relationship(
        back_populates="tf2_key"
    )
