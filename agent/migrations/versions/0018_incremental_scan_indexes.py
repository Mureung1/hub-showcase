"""증분 재실행 조회가 쓰는 인덱스를 더한다.

정의는 docs/erd.md 6.1·7.8 이다.

추출·발견·할당의 대상 조회가 이미 처리한 행을 `NOT EXISTS` 로 걸러 낸 뒤에
`LIMIT` 을 적용한다. 두 인덱스가 그 판정의 조회 경로다.

Revision ID: 0018_incremental_scan_indexes
Revises: 0017_candidate_judgment_context
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0018_incremental_scan_indexes"
down_revision = "0017_candidate_judgment_context"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0018_incremental_scan_indexes.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX IF EXISTS idx_mentions_chunk_dataset;
        DROP INDEX IF EXISTS idx_candidate_mentions_mention;
        """
    )
