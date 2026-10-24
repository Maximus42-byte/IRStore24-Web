from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StoreSettings(Base):
    __tablename__ = "store_settings"

    __table_args__ = (
        CheckConstraint("id = 1", name="ck_store_settings_singleton"),
        CheckConstraint(
            "usdt_toman_rate > 0", name="ck_store_settings_usdt_toman_rate"
        ),
        CheckConstraint(
            "order_reservation_minutes > 0",
            name="ck_store_settings_order_reservation_minutes",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger, primary_key=True, server_default="1"
    )
    usdt_toman_rate: Mapped[Decimal] = mapped_column(
        Numeric(20, 8), nullable=False
    )
    card_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    card_holder_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    telegram_username: Mapped[str | None] = mapped_column(
        String(64), nullable=True
    )
    telegram_url: Mapped[str | None] = mapped_column(
        String(2048), nullable=True
    )
    instagram_url: Mapped[str | None] = mapped_column(
        String(2048), nullable=True
    )
    order_reservation_minutes: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="120"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    updated_by: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
