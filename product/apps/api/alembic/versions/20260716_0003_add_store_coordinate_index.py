"""Add the coordinate index used by bounded nearby store queries."""

from alembic import op

revision = "20260716_0003"
down_revision = "20260716_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_store_points_longitude_latitude",
        "store_points",
        ["longitude", "latitude"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_store_points_longitude_latitude", table_name="store_points")
