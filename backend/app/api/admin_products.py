from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.session import get_db
from app.models import Product
from app.schemas.product import (
    ProductCreate,
    ProductDeleteResponse,
    ProductResponse,
    ProductUpdate,
)


router = APIRouter(
    prefix="/admin/products",
    tags=["admin-products"],
    dependencies=[Depends(require_admin)],
)


def _conflict_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Product id, product URL, or official product code already exists",
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    request: ProductCreate,
    db: Annotated[Session, Depends(get_db)],
) -> Product:
    if db.get(Product, request.id) is not None:
        raise _conflict_exception()

    product = Product(**request.model_dump())
    db.add(product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _conflict_exception() from None
    db.refresh(product)
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    request: ProductUpdate,
    db: Annotated[Session, Depends(get_db)],
) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    for field, value in request.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _conflict_exception() from None
    db.refresh(product)
    return product


@router.delete("/{product_id}", response_model=ProductDeleteResponse)
def delete_product(
    product_id: str,
    db: Annotated[Session, Depends(get_db)],
) -> ProductDeleteResponse:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    db.delete(product)
    db.commit()
    return ProductDeleteResponse(status="ok", deleted_id=product_id)
