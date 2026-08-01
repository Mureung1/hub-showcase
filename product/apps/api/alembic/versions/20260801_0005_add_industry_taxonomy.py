"""Add versioned raw industry taxonomy and published store assignments.

Revision ID: 20260801_0005
Revises: 20260716_0004
Create Date: 2026-08-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260801_0005"
down_revision: str | None = "20260716_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "industry_taxonomy_versions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.Column("version_name", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("source_fingerprint", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_fingerprint"),
    )
    op.create_table(
        "industry_taxonomy_nodes",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("taxonomy_version_id", sa.String(), nullable=False),
        sa.Column("level", sa.Integer(), nullable=False),
        sa.Column("source_code", sa.String(), nullable=False),
        sa.Column("source_name", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("parent_path_key", sa.String(), nullable=True),
        sa.Column("path_key", sa.String(), nullable=False),
        sa.Column("is_leaf", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["taxonomy_version_id"], ["industry_taxonomy_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("taxonomy_version_id", "path_key"),
    )
    op.create_index("ix_industry_taxonomy_nodes_version_parent", "industry_taxonomy_nodes", ["taxonomy_version_id", "parent_path_key"])
    op.create_table(
        "store_taxonomy_assignment_runs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("source_snapshot_id", sa.String(), nullable=False),
        sa.Column("taxonomy_version_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("input_fingerprint", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["source_snapshot_id"], ["data_sources.snapshot_id"]),
        sa.ForeignKeyConstraint(["taxonomy_version_id"], ["industry_taxonomy_versions.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("input_fingerprint"),
    )
    op.create_table(
        "store_taxonomy_assignments",
        sa.Column("assignment_run_id", sa.String(), nullable=False),
        sa.Column("store_id", sa.String(), nullable=False),
        sa.Column("leaf_node_id", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_run_id"], ["store_taxonomy_assignment_runs.id"]),
        sa.ForeignKeyConstraint(["store_id"], ["store_points.store_id"]),
        sa.ForeignKeyConstraint(["leaf_node_id"], ["industry_taxonomy_nodes.id"]),
        sa.PrimaryKeyConstraint("assignment_run_id", "store_id"),
    )
    op.create_index("ix_store_taxonomy_assignments_run_leaf_store", "store_taxonomy_assignments", ["assignment_run_id", "leaf_node_id", "store_id"])
    op.create_table(
        "store_catalog_publications",
        sa.Column("publication_key", sa.String(), nullable=False),
        sa.Column("assignment_run_id", sa.String(), nullable=False),
        sa.Column("published_at", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["assignment_run_id"], ["store_taxonomy_assignment_runs.id"]),
        sa.PrimaryKeyConstraint("publication_key"),
    )


def downgrade() -> None:
    op.drop_table("store_catalog_publications")
    op.drop_index("ix_store_taxonomy_assignments_run_leaf_store", table_name="store_taxonomy_assignments")
    op.drop_table("store_taxonomy_assignments")
    op.drop_table("store_taxonomy_assignment_runs")
    op.drop_index("ix_industry_taxonomy_nodes_version_parent", table_name="industry_taxonomy_nodes")
    op.drop_table("industry_taxonomy_nodes")
    op.drop_table("industry_taxonomy_versions")
