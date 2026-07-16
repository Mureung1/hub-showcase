"""Add the reverse coordinate index for large bounding-box queries."""

from alembic import op

revision = "20260716_0004"
down_revision = "20260716_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_store_points_latitude_longitude",
        "store_points",
        ["latitude", "longitude"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_store_points_latitude_longitude", table_name="store_points")
