"""차원 후보에 판정 맥락 두 컬럼을 더한다.

정의는 docs/erd.md 7.7 을 따르고 근거는
docs/adr/0011-candidate-judgment-context.md 에 있다.

관계 판정은 특정 분류체계 버전의 활성 어휘에 상대적이며, 판정 근거 문장은 승격
심사와 사람 검토가 읽는다. 두 값이 저장되지 않으면 후보 행만 보고 판정을 다시 쓸 수
없다.

Revision ID: 0017_candidate_judgment_context
Revises: 0016_evaluation_runner_role
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0017_candidate_judgment_context"
down_revision = "0016_evaluation_runner_role"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0017_candidate_judgment_context.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """컬럼을 지우면 그 컬럼의 인덱스도 함께 사라진다."""
    op.execute(
        """
        DROP INDEX IF EXISTS idx_candidates_judged_against;

        ALTER TABLE requirement_candidates
          DROP COLUMN IF EXISTS judged_against_taxonomy_version_id,
          DROP COLUMN IF EXISTS judgment_rationale;
        """
    )
