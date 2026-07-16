"""Add KOSIS admin-area population and market reference crosswalk."""

import sqlalchemy as sa

from alembic import op

revision = "20260716_0005"
down_revision = "20260716_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admin_area_population",
        sa.Column("admin_area_code", sa.String(), nullable=False),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("age_group_code", sa.String(), nullable=False),
        sa.Column("admin_area_name", sa.String(), nullable=False),
        sa.Column("age_group_name", sa.String(), nullable=False),
        sa.Column("total_population", sa.Integer(), nullable=False),
        sa.Column("male_population", sa.Integer(), nullable=False),
        sa.Column("female_population", sa.Integer(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.CheckConstraint(
            "total_population >= 0",
            name=op.f("ck_admin_area_population_total_population_nonnegative"),
        ),
        sa.CheckConstraint(
            "male_population >= 0",
            name=op.f("ck_admin_area_population_male_population_nonnegative"),
        ),
        sa.CheckConstraint(
            "female_population >= 0",
            name=op.f("ck_admin_area_population_female_population_nonnegative"),
        ),
        sa.ForeignKeyConstraint(
            ["source_snapshot_id"],
            ["data_sources.snapshot_id"],
            name=op.f("fk_admin_area_population_source_snapshot_id_data_sources"),
        ),
        sa.PrimaryKeyConstraint(
            "admin_area_code",
            "period",
            "age_group_code",
            name=op.f("pk_admin_area_population"),
        ),
    )
    op.create_table(
        "market_admin_area_crosswalk",
        sa.Column("market_code", sa.String(), nullable=False),
        sa.Column("admin_area_code", sa.String(), nullable=False),
        sa.Column("admin_area_name", sa.String(), nullable=False),
        sa.Column("mapping_method", sa.String(), nullable=False),
        sa.Column("mapping_version", sa.String(), nullable=False),
        sa.Column("boundary_note", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(
            ["market_code"],
            ["markets.market_code"],
            name=op.f("fk_market_admin_area_crosswalk_market_code_markets"),
        ),
        sa.PrimaryKeyConstraint(
            "market_code",
            "admin_area_code",
            name=op.f("pk_market_admin_area_crosswalk"),
        ),
    )


def downgrade() -> None:
    op.drop_table("market_admin_area_crosswalk")
    op.drop_table("admin_area_population")
