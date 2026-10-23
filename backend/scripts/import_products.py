"""Import the rag_products.json seed into PostgreSQL idempotently."""

import json
import sys
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Any

from sqlalchemy import func, select


BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = Path(__file__).resolve().parents[2]
PRODUCTS_JSON_PATH = PROJECT_ROOT / "json" / "rag_products.json"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal  # noqa: E402
from app.models import Product  # noqa: E402


REQUIRED_FIELDS = (
    "id",
    "name",
    "brand",
    "category",
    "priceKrw",
    "image",
    "productUrl",
)


def _optional_date(value: str | None) -> date | None:
    return date.fromisoformat(value) if value else None


def _optional_decimal(value: int | float | None) -> Decimal | None:
    return Decimal(str(value)) if value is not None else None


def _validate_product(raw: dict[str, Any], index: int) -> None:
    missing = [field for field in REQUIRED_FIELDS if raw.get(field) in (None, "")]
    if missing:
        product_id = raw.get("id", f"index:{index}")
        raise ValueError(
            f"Product {product_id!r} is missing required fields: {', '.join(missing)}"
        )


def _to_product(raw: dict[str, Any]) -> Product:
    return Product(
        id=raw["id"],
        name=raw["name"],
        brand=raw["brand"],
        category=raw["category"],
        price_krw=raw["priceKrw"],
        original_price_krw=raw.get("originalPriceKrw"),
        discount_rate=raw.get("discountRate"),
        image=raw["image"],
        product_url=raw["productUrl"],
        official_product_code=raw.get("officialProductCode"),
        official_checked_at=_optional_date(raw.get("officialCheckedAt")),
        official_product_url=raw.get("officialProductUrl"),
        description=raw.get("description"),
        rag_enabled=raw.get("ragEnabled", False),
        rating=_optional_decimal(raw.get("rating")),
        review_count=raw.get("reviewCount"),
        qna_count=raw.get("qnaCount"),
        attributes=raw.get("attributes") or {},
        gallery_images=raw.get("galleryImages") or [],
        official_benefits=raw.get("officialBenefits") or [],
        official_addons=raw.get("officialAddons") or [],
        missing_fields=raw.get("missingFields") or [],
        source=raw.get("source") or {},
    )


def load_products() -> list[dict[str, Any]]:
    payload = json.loads(PRODUCTS_JSON_PATH.read_text(encoding="utf-8-sig"))
    products = payload.get("products")
    if not isinstance(products, list):
        raise ValueError("rag_products.json must contain a 'products' list")
    return products


def import_products() -> tuple[int, int, int]:
    products = load_products()
    created = 0
    skipped = 0

    with SessionLocal() as session:
        try:
            for index, raw in enumerate(products):
                product_id = raw.get("id", f"index:{index}")
                try:
                    _validate_product(raw, index)
                    if session.get(Product, raw["id"]) is not None:
                        skipped += 1
                        continue
                    session.add(_to_product(raw))
                    session.flush()
                    created += 1
                except Exception as exc:
                    raise RuntimeError(
                        f"Product import failed for id={product_id!r}, index={index}"
                    ) from exc
            session.commit()
            total = session.scalar(select(func.count()).select_from(Product)) or 0
        except Exception:
            session.rollback()
            raise

    return created, skipped, total


if __name__ == "__main__":
    created, skipped, total = import_products()
    print(f"created={created}")
    print(f"skipped={skipped}")
    print(f"database_total={total}")
