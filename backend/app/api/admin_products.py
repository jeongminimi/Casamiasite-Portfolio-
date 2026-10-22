from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.core.config import settings
from app.db.session import get_db
from app.models import Product, ProductEmbedding
from app.schemas.product import (
    ProductCreate,
    ProductDeleteResponse,
    ProductResponse,
    ProductUpdate,
)
from app.services.rag import (
    RagConfigurationError,
    RagIndexService,
    RagProviderError,
)


router = APIRouter(
    prefix="/admin/products",
    tags=["admin-products"],
    dependencies=[Depends(require_admin)],
)
_rag_index_service = RagIndexService()


def _rag_storage_exists(db: Session) -> bool:
    return inspect(db.get_bind()).has_table(ProductEmbedding.__tablename__)


def _sync_product_rag_if_ready(db: Session, product: Product) -> None:
    if not _rag_storage_exists(db):
        return
    if product.rag_enabled and not settings.rag_api_key_configured:
        return
    _rag_index_service.sync_product(db, product)


def _delete_product_rag_if_ready(db: Session, product_id: str) -> None:
    if _rag_storage_exists(db):
        _rag_index_service.delete_product(db, product_id)


def _conflict_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="Product id, product URL, or official product code already exists",
    )


def _rag_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, RagConfigurationError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail="Product was not saved because RAG indexing failed",
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
        db.flush()
        _sync_product_rag_if_ready(db, product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _conflict_exception() from None
    except (RagConfigurationError, RagProviderError) as exc:
        db.rollback()
        raise _rag_exception(exc) from None
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
        db.flush()
        _sync_product_rag_if_ready(db, product)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise _conflict_exception() from None
    except (RagConfigurationError, RagProviderError) as exc:
        db.rollback()
        raise _rag_exception(exc) from None
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

    try:
        _delete_product_rag_if_ready(db, product_id)
        db.delete(product)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return ProductDeleteResponse(status="ok", deleted_id=product_id)
