"""구성요소별 데이터베이스 role 생성.

정의는 docs/permission-matrix.md 2장을 따른다.
권한 부여는 0004, 행 수준 정책은 0005, 계측 트리거는 0006 에서 다룬다.

Revision ID: 0003_component_roles
Revises: 0002_seed_reference
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0003_component_roles"
down_revision = "0002_seed_reference"
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
    op.execute((SQL_DIR / "0003_component_roles.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    for role in ROLES:
        op.execute(
            f"""
            DO $$
            BEGIN
              IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{role}') THEN
                EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {role}';
                EXECUTE 'REVOKE ALL ON SCHEMA public FROM {role}';
                EXECUTE 'DROP ROLE {role}';
              END IF;
            END $$;
            """
        )
