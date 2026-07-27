"""구성요소별 읽기·쓰기 권한.

정의는 docs/permission-matrix.md 3장과 4장을 따른다.

Revision ID: 0004_component_grants
Revises: 0003_component_roles
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0004_component_grants"
down_revision = "0003_component_roles"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"

ROLES = [
    "cs_orchestrator", "cs_agent_collect", "cs_agent_knowledge", "cs_agent_stats",
    "cs_agent_interpret", "cs_agent_strategy", "cs_agent_roadmap",
    "cs_pipe_ingest", "cs_pipe_index", "cs_pipe_aggregate", "cs_pipe_lineage",
    "cs_pipe_verify", "cs_serving",
]


def upgrade() -> None:
    op.execute((SQL_DIR / "0004_component_grants.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    for role in ROLES:
        op.execute(
            f"""
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
                EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {role}';
              END IF;
            END $$;
            """
        )
