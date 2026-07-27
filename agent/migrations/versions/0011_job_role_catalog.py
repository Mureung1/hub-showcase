"""목표 직무 아홉 종을 기준 데이터로 넣는다.

직무 판정 규칙은 docs/metric-spec.md 2.8이다. 판정이 아홉 중 하나를 고르는 문제이므로
후보 전량이 `job_roles` 에 있어야 한다.

분석 대상은 `backend` 하나이며 나머지는 `is_active` 가 거짓이다. 활성화는 Phase 28이다.

Revision ID: 0011_job_role_catalog
Revises: 0010_calendar_year_periods
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0011_job_role_catalog"
down_revision = "0010_calendar_year_periods"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0011_job_role_catalog.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM job_roles WHERE job_role_id IN (
          'frontend', 'ai_engineer', 'data_engineer', 'fullstack',
          'devops', 'mobile', 'security', 'game_client'
        );
        """
    )
