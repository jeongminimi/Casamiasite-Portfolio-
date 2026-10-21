import os
import sys
from pathlib import Path

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import select


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402
from app.models import User, UserRole  # noqa: E402


def create_admin() -> tuple[User, bool]:
    if settings.app_env.lower() != "development":
        raise RuntimeError("create_admin.py is available only in development")

    raw_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    name = os.getenv("ADMIN_NAME", "Development Admin").strip()

    if not raw_email or not password or not name:
        raise RuntimeError("ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME are required")
    email = str(TypeAdapter(EmailStr).validate_python(raw_email)).lower()
    if len(password) < 8 or len(password) > 128:
        raise RuntimeError("ADMIN_PASSWORD must be between 8 and 128 characters")

    with SessionLocal() as session:
        existing_user = session.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            if existing_user.role != UserRole.ADMIN:
                raise RuntimeError("The email already belongs to a non-admin user")
            return existing_user, False

        admin = User(
            email=email,
            hashed_password=hash_password(password),
            name=name,
            role=UserRole.ADMIN,
        )
        session.add(admin)
        session.commit()
        session.refresh(admin)
        return admin, True


if __name__ == "__main__":
    admin, created = create_admin()
    print(f"created={int(created)}")
    print(f"admin_id={admin.id}")
    print(f"email={admin.email}")
