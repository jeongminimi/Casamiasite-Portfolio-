"""add product embeddings

Revision ID: d41a90c9e1bf
Revises: 55efcd670621
Create Date: 2026-10-21
"""

from typing import Sequence, Union

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa


revision: str = "d41a90c9e1bf"
down_revision: Union[str, Sequence[str], None] = "55efcd670621"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "product_embeddings",
        sa.Column("product_id", sa.String(length=100), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("embedding_model", sa.String(length=100), nullable=False),
        sa.Column("embedding", Vector(1536), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["product_id"], ["products.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("product_id"),
    )
    op.create_index(
        "ix_product_embeddings_embedding_hnsw",
        "product_embeddings",
        ["embedding"],
        unique=False,
        postgresql_using="hnsw",
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index(
        "ix_product_embeddings_embedding_hnsw",
        table_name="product_embeddings",
        postgresql_using="hnsw",
    )
    op.drop_table("product_embeddings")
