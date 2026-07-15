"""Add market geometry and point-in-polygon link tables.

Revision ID: 20260716_0002
Revises: 20260715_0001
Create Date: 2026-07-16
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260716_0002"
down_revision: str | None = "20260715_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "market_geometries",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("geometry_geojson", sa.Text(), nullable=False),
        sa.Column("center_longitude", sa.Float(), nullable=False),
        sa.Column("center_latitude", sa.Float(), nullable=False),
        sa.Column("source_crs", sa.String(), nullable=False),
        sa.Column("target_crs", sa.String(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["market_code"], ["markets.market_code"]),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("market_code"),
    )
    op.create_table(
        "store_market_links",
        sa.Column("store_id", sa.String(), nullable=False),
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("link_method", sa.String(), nullable=False),
        sa.Column("is_boundary", sa.Boolean(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["market_code"], ["markets.market_code"]),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.ForeignKeyConstraint(["store_id"], ["store_points.store_id"]),
        sa.PrimaryKeyConstraint("store_id"),
    )
    op.create_index(
        "ix_store_market_links_market_code",
        "store_market_links",
        ["market_code"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_store_market_links_market_code", table_name="store_market_links")
    op.drop_table("store_market_links")
    op.drop_table("market_geometries")
