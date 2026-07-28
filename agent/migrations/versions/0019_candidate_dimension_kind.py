"""차원 후보에 제안 차원 종류 컬럼을 더한다.

정의는 docs/erd.md 7.7 을 따르고 값 집합은 docs/erd.md 7.3 과 같다.

후보 행이 종류를 담지 않아 승격이 모든 차원을 `practice` 로 만들었다. 그 결과
`dimension_kind = 'technology'` 인 차원이 없고 `Technology` 그래프 노드가 하나도
만들어지지 않는다(docs/ontology-v1.md 2.1). 명명·관계 판정이 종류를 함께 내며 이
컬럼이 그 값의 자리다.

Revision ID: 0019_candidate_dimension_kind
Revises: 0018_incremental_scan_indexes
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0019_candidate_dimension_kind"
down_revision = "0018_incremental_scan_indexes"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0019_candidate_dimension_kind.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """컬럼을 지우면 그 컬럼의 CHECK 도 함께 사라진다."""
    op.execute(
        """
        ALTER TABLE requirement_candidates
          DROP COLUMN IF EXISTS proposed_dimension_kind;
        """
    )
