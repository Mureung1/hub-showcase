"""Add official admin-area business and worker background metrics."""

import sqlalchemy as sa

from alembic import op

revision = "20260716_0006"
down_revision = "20260716_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_area_business_metrics",
        sa.Column("admin_area_code", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("industry_code", sa.String(), nullable=False),
        sa.Column("admin_area_name", sa.String(), nullable=False),
        sa.Column("source_admin_area_code", sa.String(), nullable=False),
        sa.Column("industry_name", sa.String(), nullable=False),
        sa.Column("business_count", sa.Integer(), nullable=True),
        sa.Column("worker_count", sa.Integer(), nullable=True),
        sa.Column("male_worker_count", sa.Integer(), nullable=True),
        sa.Column("female_worker_count", sa.Integer(), nullable=True),
        sa.Column("is_suppressed", sa.Boolean(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["source_snapshot_id"],
            ["data_sources.snapshot_id"],
            name=op.f("fk_admin_area_business_metrics_source_snapshot_id_data_sources"),
        ),
        sa.PrimaryKeyConstraint(
            "admin_area_code",
            "period",
            "industry_code",
            name=op.f("pk_admin_area_business_metrics"),
        ),
    )


def downgrade() -> None:
    op.drop_table("admin_area_business_metrics")
