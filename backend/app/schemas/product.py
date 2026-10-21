from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ProductBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    brand: str = Field(min_length=1, max_length=100)
    category: str = Field(min_length=1, max_length=100)
    price_krw: int = Field(ge=0)
    original_price_krw: int | None = Field(default=None, ge=0)
    discount_rate: int | None = Field(default=None, ge=0, le=100)
    image: str = Field(min_length=1, max_length=1000)
    product_url: str = Field(min_length=1, max_length=1000)
    official_product_code: str | None = Field(default=None, max_length=50)
    official_checked_at: date | None = None
    official_product_url: str | None = Field(default=None, max_length=1000)
    description: str | None = None
    rag_enabled: bool = True
    rating: Decimal | None = Field(default=None, ge=0, le=5)
    review_count: int | None = Field(default=None, ge=0)
    qna_count: int | None = Field(default=None, ge=0)
    attributes: dict[str, Any] = Field(default_factory=dict)
    gallery_images: list[dict[str, Any]] = Field(default_factory=list)
    official_benefits: list[str] = Field(default_factory=list)
    official_addons: list[dict[str, Any]] = Field(default_factory=list)
    missing_fields: list[str] = Field(default_factory=list)
    source: dict[str, Any] = Field(default_factory=dict)

    @field_validator("name", "brand", "category", "image", "product_url")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank")
        return value


class ProductCreate(ProductBase):
    id: str = Field(min_length=1, max_length=100)

    @field_validator("id")
    @classmethod
    def strip_id(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Product id must not be blank")
        return value


class ProductUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    brand: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    price_krw: int | None = Field(default=None, ge=0)
    original_price_krw: int | None = Field(default=None, ge=0)
    discount_rate: int | None = Field(default=None, ge=0, le=100)
    image: str | None = Field(default=None, min_length=1, max_length=1000)
    product_url: str | None = Field(default=None, min_length=1, max_length=1000)
    official_product_code: str | None = Field(default=None, max_length=50)
    official_checked_at: date | None = None
    official_product_url: str | None = Field(default=None, max_length=1000)
    description: str | None = None
    rag_enabled: bool | None = None
    rating: Decimal | None = Field(default=None, ge=0, le=5)
    review_count: int | None = Field(default=None, ge=0)
    qna_count: int | None = Field(default=None, ge=0)
    attributes: dict[str, Any] | None = None
    gallery_images: list[dict[str, Any]] | None = None
    official_benefits: list[str] | None = None
    official_addons: list[dict[str, Any]] | None = None
    missing_fields: list[str] | None = None
    source: dict[str, Any] | None = None

    @field_validator("name", "brand", "category", "image", "product_url")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Value must not be blank")
        return value

    @model_validator(mode="after")
    def reject_null_for_required_columns(self):
        required_columns = {
            "name",
            "brand",
            "category",
            "price_krw",
            "image",
            "product_url",
            "rag_enabled",
            "attributes",
            "gallery_images",
            "official_benefits",
            "official_addons",
            "missing_fields",
            "source",
        }
        null_fields = [
            field
            for field in required_columns.intersection(self.model_fields_set)
            if getattr(self, field) is None
        ]
        if null_fields:
            raise ValueError(
                "These fields cannot be null: " + ", ".join(sorted(null_fields))
            )
        return self


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class ProductDeleteResponse(BaseModel):
    status: str
    deleted_id: str
