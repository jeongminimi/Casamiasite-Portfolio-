import json
from collections.abc import Mapping, Sequence
from typing import Any

from app.models import Product


ATTRIBUTE_LABELS = {
    "seatCount": "좌석 수",
    "color": "색상",
    "material": "소재",
    "widthCm": "너비(cm)",
    "depthCm": "깊이(cm)",
    "heightCm": "높이(cm)",
    "style": "스타일",
    "room": "추천 공간",
    "bedSize": "침대 크기",
    "mattressIncluded": "매트리스 포함",
}


def _has_value(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, (Mapping, Sequence)) and not isinstance(value, str):
        return bool(value)
    return True


def _format_value(value: Any) -> str:
    if isinstance(value, bool):
        return "예" if value else "아니요"
    if isinstance(value, Mapping):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    if isinstance(value, Sequence) and not isinstance(value, str):
        return ", ".join(_format_value(item) for item in value if _has_value(item))
    return str(value).strip()


def build_product_document(product: Product) -> str:
    """Create the single canonical retrieval document for a product."""
    fields: list[tuple[str, Any]] = [
        ("상품 ID", product.id),
        ("상품명", product.name),
        ("브랜드", product.brand),
        ("카테고리", product.category),
        ("가격", f"{product.price_krw:,}원"),
    ]

    for key in sorted((product.attributes or {}).keys()):
        value = product.attributes[key]
        if _has_value(value):
            fields.append((ATTRIBUTE_LABELS.get(key, key), value))

    if _has_value(product.description):
        fields.append(("설명", product.description))

    return "\n".join(
        f"{label}: {_format_value(value)}"
        for label, value in fields
        if _has_value(value)
    )
