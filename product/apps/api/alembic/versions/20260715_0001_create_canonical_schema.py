"""Create the canonical product schema.

Revision ID: 20260715_0001
Revises:
Create Date: 2026-07-15
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260715_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "data_sources",
        sa.Column("snapshot_id", sa.String(), nullable=False),
        sa.Column("provider", sa.String(), nullable=False),
        sa.Column("dataset", sa.String(), nullable=False),
        sa.Column("source_type", sa.String(), nullable=False),
        sa.Column("source_url", sa.String(), nullable=False),
        sa.Column("collected_at", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=True),
        sa.Column("row_count", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(), nullable=False),
        sa.Column("raw_path", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("snapshot_id"),
        sa.UniqueConstraint("provider", "dataset", "collected_at"),
    )
    op.create_table(
        "markets",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("market_name", sa.String(), nullable=False),
        sa.Column("market_type_code", sa.String(), nullable=True),
        sa.Column("market_type_name", sa.String(), nullable=True),
        sa.Column("district_code", sa.String(), nullable=True),
        sa.Column("district_name", sa.String(), nullable=True),
        sa.Column("admin_dong_code", sa.String(), nullable=True),
        sa.Column("admin_dong_name", sa.String(), nullable=True),
        sa.Column("source_x", sa.Float(), nullable=True),
        sa.Column("source_y", sa.Float(), nullable=True),
        sa.Column("coordinate_system", sa.String(), nullable=False),
        sa.Column("area_sqm", sa.Float(), nullable=True),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("market_code"),
    )
    op.create_table(
        "store_metrics",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("category_code", sa.String(), nullable=False),
        sa.Column("category_name", sa.String(), nullable=False),
        sa.Column("similar_store_count", sa.Integer(), nullable=True),
        sa.Column("store_count", sa.Integer(), nullable=True),
        sa.Column("franchise_store_count", sa.Integer(), nullable=True),
        sa.Column("opening_rate", sa.Float(), nullable=True),
        sa.Column("opening_count", sa.Integer(), nullable=True),
        sa.Column("closure_rate", sa.Float(), nullable=True),
        sa.Column("closure_count", sa.Integer(), nullable=True),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["market_code"], ["markets.market_code"]),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("market_code", "period", "category_code"),
    )
    op.create_table(
        "sales_metrics",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("category_code", sa.String(), nullable=False),
        sa.Column("category_name", sa.String(), nullable=False),
        sa.Column("monthly_sales_amount", sa.Float(), nullable=True),
        sa.Column("monthly_sales_count", sa.Float(), nullable=True),
        sa.Column("weekday_sales_amount", sa.Float(), nullable=True),
        sa.Column("weekend_sales_amount", sa.Float(), nullable=True),
        sa.Column("sales_00_06", sa.Float(), nullable=True),
        sa.Column("sales_06_11", sa.Float(), nullable=True),
        sa.Column("sales_11_14", sa.Float(), nullable=True),
        sa.Column("sales_14_17", sa.Float(), nullable=True),
        sa.Column("sales_17_21", sa.Float(), nullable=True),
        sa.Column("sales_21_24", sa.Float(), nullable=True),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["market_code"], ["markets.market_code"]),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("market_code", "period", "category_code"),
    )
    op.create_table(
        "flow_metrics",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("total_flow", sa.Float(), nullable=True),
        sa.Column("flow_00_06", sa.Float(), nullable=True),
        sa.Column("flow_06_11", sa.Float(), nullable=True),
        sa.Column("flow_11_14", sa.Float(), nullable=True),
        sa.Column("flow_14_17", sa.Float(), nullable=True),
        sa.Column("flow_17_21", sa.Float(), nullable=True),
        sa.Column("flow_21_24", sa.Float(), nullable=True),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["market_code"], ["markets.market_code"]),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("market_code", "period"),
    )
    op.create_table(
        "store_points",
        sa.Column("store_id", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("branch_name", sa.String(), nullable=True),
        sa.Column("category_large_code", sa.String(), nullable=True),
        sa.Column("category_large_name", sa.String(), nullable=True),
        sa.Column("category_middle_code", sa.String(), nullable=True),
        sa.Column("category_middle_name", sa.String(), nullable=True),
        sa.Column("category_small_code", sa.String(), nullable=True),
        sa.Column("category_small_name", sa.String(), nullable=True),
        sa.Column("road_address", sa.String(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("coordinate_system", sa.String(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("store_id"),
    )
    op.create_table(
        "permit_businesses",
        sa.Column("dataset", sa.String(), nullable=False),
        sa.Column("management_no", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("status_code", sa.String(), nullable=True),
        sa.Column("status_name", sa.String(), nullable=True),
        sa.Column("license_date", sa.String(), nullable=True),
        sa.Column("closure_date", sa.String(), nullable=True),
        sa.Column("road_address", sa.String(), nullable=True),
        sa.Column("source_x", sa.Float(), nullable=True),
        sa.Column("source_y", sa.Float(), nullable=True),
        sa.Column("coordinate_system", sa.String(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("dataset", "management_no"),
    )


def downgrade() -> None:
    op.drop_table("permit_businesses")
    op.drop_table("store_points")
    op.drop_table("flow_metrics")
    op.drop_table("sales_metrics")
    op.drop_table("store_metrics")
    op.drop_table("markets")
    op.drop_table("data_sources")
