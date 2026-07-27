"""대상군을 지표의 그룹 축으로 추가한다.

정의는 docs/metric-spec.md 2.6과 docs/statistics-model.md 5장을 따른다.

Revision ID: 0009_entry_segment_axis
Revises: 0008_verification_verdict_values
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0009_entry_segment_axis"
down_revision = "0008_verification_verdict_values"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0009_entry_segment_axis.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE statistics_facts
          DROP CONSTRAINT IF EXISTS entry_signal_rate_segment;

        ALTER TABLE capability_depth_profiles
          DROP CONSTRAINT IF EXISTS capability_depth_profiles_scope_unique;
        ALTER TABLE capability_depth_profiles
          ADD CONSTRAINT capability_depth_profiles_analysis_version_capability_id_sc_key
          UNIQUE (analysis_version, capability_id, scope_level, scope_id, period_id);

        DROP INDEX IF EXISTS idx_statistics_facts_unique;
        DROP INDEX IF EXISTS idx_statistics_facts_lookup;

        ALTER TABLE statistics_facts DROP COLUMN IF EXISTS entry_segment;
        ALTER TABLE capability_depth_profiles DROP COLUMN IF EXISTS entry_segment;

        CREATE UNIQUE INDEX idx_statistics_facts_unique ON statistics_facts (
          analysis_version, metric_family, measure, scope_level, scope_id, period_id,
          COALESCE(dimension_id, ''), COALESCE(secondary_dimension_id, '')
        );
        CREATE INDEX idx_statistics_facts_lookup ON statistics_facts
          (analysis_version, scope_level, scope_id, period_id, metric_family);
        """
    )
