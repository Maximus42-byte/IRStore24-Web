from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Cart(Base):
    __tablename__ = "carts"

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
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

    user: Mapped["User"] = relationship(back_populates="cart")
    cs2_items: Mapped[list["CartCS2Item"]] = relationship(
        back_populates="cart", cascade="all, delete-orphan"
    )
    tf2_keys: Mapped[list["CartTF2Key"]] = relationship(
        back_populates="cart", cascade="all, delete-orphan"
    )


class CartCS2Item(Base):
    __tablename__ = "cart_cs2_items"

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_cart_cs2_items_quantity"),
        UniqueConstraint(
            "cart_id", "cs2_item_id", name="uq_cart_cs2_items_cart_product"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    cart_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("carts.id", ondelete="CASCADE"), nullable=False
    )
    cs2_item_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("cs2_items.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    cart: Mapped["Cart"] = relationship(back_populates="cs2_items")
    cs2_item: Mapped["CS2Item"] = relationship(back_populates="cart_items")


class CartTF2Key(Base):
    __tablename__ = "cart_tf2_keys"

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_cart_tf2_keys_quantity"),
        UniqueConstraint(
            "cart_id", "tf2_key_id", name="uq_cart_tf2_keys_cart_product"
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    cart_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("carts.id", ondelete="CASCADE"), nullable=False
    )
    tf2_key_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tf2_keys.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    cart: Mapped["Cart"] = relationship(back_populates="tf2_keys")
    tf2_key: Mapped["TF2Key"] = relationship(back_populates="cart_items")
