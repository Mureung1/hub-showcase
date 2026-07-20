"""Add official Seoul market resident and worker population metrics."""

import sqlalchemy as sa

from alembic import op

revision = "20260716_0007"
down_revision = "20260716_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "market_population_metrics",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("market_name", sa.String(), nullable=False),
        sa.Column("resident_population", sa.Integer(), nullable=False),
        sa.Column("worker_population", sa.Integer(), nullable=False),
        sa.Column("household_count", sa.Integer(), nullable=True),
        sa.Column("resident_source_snapshot_id", sa.String(), nullable=False),
        sa.Column("worker_source_snapshot_id", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(
            ["market_code"],
            ["markets.market_code"],
            name=op.f("fk_market_population_metrics_market_code_markets"),
        ),
        sa.ForeignKeyConstraint(
            ["resident_source_snapshot_id"],
            ["data_sources.snapshot_id"],
            name=op.f("fk_market_population_metrics_resident_source_snapshot_id_data_sources"),
        ),
        sa.ForeignKeyConstraint(
            ["worker_source_snapshot_id"],
            ["data_sources.snapshot_id"],
            name=op.f("fk_market_population_metrics_worker_source_snapshot_id_data_sources"),
        ),
        sa.PrimaryKeyConstraint("market_code", "period", name=op.f("pk_market_population_metrics")),
    )


def downgrade() -> None:
    op.drop_table("market_population_metrics")
