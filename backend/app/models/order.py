from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'cancelled', 'expired')",
            name="ck_orders_status",
        ),
        CheckConstraint(
            "locked_usdt_toman_rate > 0", name="ck_orders_locked_rate"
        ),
        CheckConstraint(
            "total_price_toman >= 0", name="ck_orders_total_price_toman"
        ),
        CheckConstraint(
            "total_price_usdt >= 0", name="ck_orders_total_price_usdt"
        ),
        Index("ix_orders_status_expires_at", "status", "expires_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    order_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="pending"
    )
    locked_usdt_toman_rate: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    total_price_toman: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    total_price_usdt: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_by: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    expired_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship(
        back_populates="orders", foreign_keys=[user_id]
    )
    cs2_items: Mapped[list["OrderCS2Item"]] = relationship(
        back_populates="order"
    )
    tf2_keys: Mapped[list["OrderTF2Key"]] = relationship(
        back_populates="order"
    )


class OrderCS2Item(Base):
    __tablename__ = "order_cs2_items"

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_cs2_items_quantity"),
        CheckConstraint(
            "float_value >= 0 AND float_value <= 1",
            name="ck_order_cs2_items_float_value",
        ),
        CheckConstraint(
            "exterior IN ('Factory New', 'Minimal Wear', 'Field-Tested', "
            "'Well-Worn', 'Battle-Scarred')",
            name="ck_order_cs2_items_exterior",
        ),
        CheckConstraint(
            "unit_price_toman >= 0", name="ck_order_cs2_items_price_toman"
        ),
        CheckConstraint(
            "unit_price_usdt >= 0", name="ck_order_cs2_items_price_usdt"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    cs2_item_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("cs2_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    weapon: Mapped[str] = mapped_column(String(100), nullable=False)
    exterior: Mapped[str] = mapped_column(String(20), nullable=False)
    float_value: Mapped[Decimal] = mapped_column(Numeric(9, 8), nullable=False)
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unit_price_toman: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    unit_price_usdt: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )

    order: Mapped["Order"] = relationship(back_populates="cs2_items")
    cs2_item: Mapped["CS2Item | None"] = relationship(
        back_populates="order_items"
    )


class OrderTF2Key(Base):
    __tablename__ = "order_tf2_keys"

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_tf2_keys_quantity"),
        CheckConstraint(
            "unit_price_toman >= 0", name="ck_order_tf2_keys_price_toman"
        ),
        CheckConstraint(
            "unit_price_usdt >= 0", name="ck_order_tf2_keys_price_usdt"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    tf2_key_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("tf2_keys.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unit_price_toman: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    unit_price_usdt: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )

    order: Mapped["Order"] = relationship(back_populates="tf2_keys")
    tf2_key: Mapped["TF2Key | None"] = relationship(
        back_populates="order_items"
    )
