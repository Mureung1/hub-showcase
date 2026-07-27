"""role 전환 권한 보정.

PostgreSQL 16 부터 role 멤버십이 ADMIN·INHERIT·SET 세 옵션으로 나뉜다.
SET ROLE 로 전환하려면 SET 옵션이 필요하다.

Revision ID: 0007_grant_set_option
Revises: 0006_telemetry_triggers
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0007_grant_set_option"
down_revision = "0006_telemetry_triggers"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0007_grant_set_option.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DO $$
        DECLARE r text; me text := current_user;
        BEGIN
          FOREACH r IN ARRAY ARRAY[
            'cs_orchestrator','cs_agent_collect','cs_agent_knowledge','cs_agent_stats',
            'cs_agent_interpret','cs_agent_strategy','cs_agent_roadmap',
            'cs_pipe_ingest','cs_pipe_index','cs_pipe_aggregate','cs_pipe_lineage',
            'cs_pipe_verify','cs_serving'
          ] LOOP
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
              EXECUTE format('GRANT %I TO %I WITH SET FALSE', r, me);
            END IF;
          END LOOP;
        END $$;
        """
    )
