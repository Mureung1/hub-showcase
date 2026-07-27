"""계측 기록의 불변성 트리거.

정의는 docs/permission-matrix.md 6.2를 따른다.

Revision ID: 0006_telemetry_triggers
Revises: 0005_graph_policies
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0006_telemetry_triggers"
down_revision = "0005_graph_policies"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"

APPEND_ONLY = [
    "retrieval_runs", "retrieval_queries", "retrieval_candidates",
    "evidence_sets", "evidence_set_members", "evidence_usages", "tool_calls",
]


def upgrade() -> None:
    op.execute((SQL_DIR / "0006_telemetry_triggers.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    for table in APPEND_ONLY:
        op.execute(f"DROP TRIGGER IF EXISTS trg_{table}_append_only ON {table}")
    op.execute("DROP TRIGGER IF EXISTS trg_agent_runs_completion_only ON agent_runs")
    op.execute(
        "DROP TRIGGER IF EXISTS trg_agent_run_steps_completion_only ON agent_run_steps"
    )
    op.execute("DROP FUNCTION IF EXISTS block_run_record_rewrite() CASCADE")
    op.execute("DROP FUNCTION IF EXISTS block_step_record_rewrite() CASCADE")
