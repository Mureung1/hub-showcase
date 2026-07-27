"""기간 축을 달력 연도로 바꾼다.

정의는 docs/erd.md 3.5를 따른다.

기간 정의는 수정하지 않고 새 `period_id` 를 추가해 확장한다. `statistics_facts.period_id`
가 `periods` 를 참조하므로, 기존 행의 `starts_on` 과 `ends_on` 을 바꾸면 이미 저장된
지표가 다른 기간을 가리킨다.

Revision ID: 0010_calendar_year_periods
Revises: 0009_entry_segment_axis
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0010_calendar_year_periods"
down_revision = "0009_entry_segment_axis"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0010_calendar_year_periods.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        INSERT INTO periods (period_id, label, starts_on, ends_on, is_baseline) VALUES
          ('recent_12m', '최근 1년', '2025-07-27', '2026-07-27', true),
          ('prior_12m',  '이전 1년', '2024-07-27', '2025-07-26', false);

        DELETE FROM periods WHERE period_id IN ('y2026', 'y2024_2025');
        """
    )
