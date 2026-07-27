"""대상군 축에 all 을 더한다.

`all` 행의 분모는 대상군으로 제한하지 않은 모집단 전체다. 화면과 해석 이후 단계가
이 행을 기준선으로 쓴다. 정의는 docs/metric-spec.md 2.7 이다.

대상군별 행은 그대로 계산한다. 표본이 쌓이면 대상군별 표시로 되돌릴 수 있다.

Revision ID: 0012_all_segment
Revises: 0011_job_role_catalog
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0012_all_segment"
down_revision = "0011_job_role_catalog"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0012_all_segment.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        DELETE FROM statistics_facts WHERE entry_segment = 'all';
        DELETE FROM capability_depth_profiles WHERE entry_segment = 'all';

        ALTER TABLE statistics_facts
          DROP CONSTRAINT IF EXISTS statistics_facts_entry_segment_check;
        ALTER TABLE statistics_facts
          ADD CONSTRAINT statistics_facts_entry_segment_check
          CHECK (entry_segment IN ('entry_junior', 'experienced', 'unspecified'));

        ALTER TABLE capability_depth_profiles
          DROP CONSTRAINT IF EXISTS capability_depth_profiles_entry_segment_check;
        ALTER TABLE capability_depth_profiles
          ADD CONSTRAINT capability_depth_profiles_entry_segment_check
          CHECK (entry_segment IN ('entry_junior', 'experienced', 'unspecified'));
        """
    )
