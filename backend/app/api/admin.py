from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import require_admin
from app.models import User


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/check")
def check_admin(
    current_user: Annotated[User, Depends(require_admin)],
) -> dict[str, str]:
    return {"status": "ok", "role": current_user.role.value}
