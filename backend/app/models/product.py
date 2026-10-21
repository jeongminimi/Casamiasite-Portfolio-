from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Integer,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_attributes_gin", "attributes", postgresql_using="gin"),
        CheckConstraint("price_krw >= 0", name="ck_products_price_krw_nonnegative"),
        CheckConstraint(
            "original_price_krw IS NULL OR original_price_krw >= 0",
            name="ck_products_original_price_krw_nonnegative",
        ),
        CheckConstraint(
            "discount_rate IS NULL OR discount_rate BETWEEN 0 AND 100",
            name="ck_products_discount_rate_range",
        ),
        CheckConstraint(
            "rating IS NULL OR rating BETWEEN 0 AND 5",
            name="ck_products_rating_range",
        ),
        CheckConstraint(
            "review_count IS NULL OR review_count >= 0",
            name="ck_products_review_count_nonnegative",
        ),
        CheckConstraint(
            "qna_count IS NULL OR qna_count >= 0",
            name="ck_products_qna_count_nonnegative",
        ),
    )

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    brand: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    price_krw: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    original_price_krw: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    discount_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    image: Mapped[str] = mapped_column(String(1000), nullable=False)
    product_url: Mapped[str] = mapped_column(
        String(1000), nullable=False, unique=True
    )
    official_product_code: Mapped[str | None] = mapped_column(
        String(50), nullable=True, unique=True
    )
    official_checked_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    official_product_url: Mapped[str | None] = mapped_column(
        String(1000), nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rag_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true"), index=True
    )
    rating: Mapped[Decimal | None] = mapped_column(Numeric(2, 1), nullable=True)
    review_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qna_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attributes: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    gallery_images: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    official_benefits: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    official_addons: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    missing_fields: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'::jsonb")
    )
    source: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
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
