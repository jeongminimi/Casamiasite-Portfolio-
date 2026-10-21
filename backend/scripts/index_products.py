import sys
from pathlib import Path

from sqlalchemy import func, select


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal  # noqa: E402
from app.models import ProductEmbedding  # noqa: E402
from app.services.rag import RagIndexService  # noqa: E402


def index_products() -> tuple[int, int, int, int]:
    with SessionLocal() as session:
        try:
            result = RagIndexService().index_all(session)
            session.commit()
            total = (
                session.scalar(select(func.count()).select_from(ProductEmbedding)) or 0
            )
        except Exception:
            session.rollback()
            raise
    return result.indexed, result.skipped, result.removed, total


if __name__ == "__main__":
    indexed, skipped, removed, total = index_products()
    print(f"indexed={indexed}")
    print(f"skipped={skipped}")
    print(f"removed={removed}")
    print(f"index_total={total}")
