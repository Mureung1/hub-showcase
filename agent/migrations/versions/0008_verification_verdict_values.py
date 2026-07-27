"""검증 판정값과 수리 동작 목록 정합.

정의는 docs/erd.md 12장과 docs/agent-design.md 9.2·10장을 따른다.

Revision ID: 0008_verification_verdict_values
Revises: 0007_grant_set_option
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0008_verification_verdict_values"
down_revision = "0007_grant_set_option"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0008_verification_verdict_values.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE verification_results ALTER COLUMN verdict DROP NOT NULL;
        ALTER TABLE verification_results ALTER COLUMN severity DROP NOT NULL;
        ALTER TABLE verification_results ALTER COLUMN autonomy_level DROP NOT NULL;

        ALTER TABLE verification_results
          DROP CONSTRAINT IF EXISTS verification_results_verdict_check;
        ALTER TABLE verification_results
          ADD CONSTRAINT verification_results_verdict_check
          CHECK (verdict IN ('pass', 'fail', 'warn'));

        ALTER TABLE repair_orders
          DROP CONSTRAINT IF EXISTS repair_orders_action_check;
        ALTER TABLE repair_orders
          ADD CONSTRAINT repair_orders_action_check
          CHECK (action IN (
            'requery', 'add_counterevidence', 'swap_evidence', 'drop_claim',
            'narrow_scope', 'lower_confidence', 'recompute_stat', 'fix_identifier'
          ));
        """
    )
