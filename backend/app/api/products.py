"""Expose public product listing, filtered search, and detail APIs."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import Product
from app.schemas.product import ProductResponse


router = APIRouter(prefix="/products", tags=["products"])


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Annotated[Session, Depends(get_db)],
) -> list[Product]:
    return list(db.scalars(select(Product).order_by(Product.id)))


@router.get("/search", response_model=list[ProductResponse])
def search_products(
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str | None, Query(max_length=200)] = None,
    category: Annotated[str | None, Query(max_length=100)] = None,
    min_price: Annotated[int | None, Query(ge=0)] = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
) -> list[Product]:
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="min_price must be less than or equal to max_price",
        )

    statement = select(Product)
    if q and (term := q.strip()):
        statement = statement.where(
            Product.name.ilike(f"%{_escape_like(term)}%", escape="\\")
        )
    if category and (category_value := category.strip()):
        statement = statement.where(
            func.lower(Product.category) == category_value.lower()
        )
    if min_price is not None:
        statement = statement.where(Product.price_krw >= min_price)
    if max_price is not None:
        statement = statement.where(Product.price_krw <= max_price)

    return list(db.scalars(statement.order_by(Product.id)))


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return product
