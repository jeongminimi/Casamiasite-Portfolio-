"""Export commonly used API schemas from one import location."""

from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse
from app.schemas.product import (
    ProductCreate,
    ProductDeleteResponse,
    ProductResponse,
    ProductUpdate,
)
from app.schemas.user import UserResponse


__all__ = [
    "LoginRequest",
    "ProductCreate",
    "ProductDeleteResponse",
    "ProductResponse",
    "ProductUpdate",
    "RegisterRequest",
    "TokenResponse",
    "UserResponse",
]
