"""평가 실행기 role 과 평가 표 권한.

정의는 docs/permission-matrix.md 2장과 3장을 따른다.

0003 이 만든 role 열세 개는 분석 실행 경로의 구성요소다. 평가 실행기는 그 경로
밖에서 `evaluation_*` 여섯 표를 쓰므로 role 을 따로 둔다. 컬럼과 제약은
docs/erd.md 13장이다.

Revision ID: 0016_evaluation_runner_role
Revises: 0015_job_standards
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0016_evaluation_runner_role"
down_revision = "0015_job_standards"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"

ROLES = ["cs_eval_runner"]


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0016_evaluation_runner_role.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """role 을 지우면 그 role 에 준 권한과 멤버십도 함께 사라진다."""
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
