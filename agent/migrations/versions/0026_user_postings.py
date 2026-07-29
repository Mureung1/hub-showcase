"""사용자 직접 입력 공고를 담는 `user_postings`·`user_posting_analyses` 를 만든다.

정의는 CONTRACT 6.1, 흐름은 docs/architecture.md 11장이다. 통계 테이블과
외래키로 잇지 않아 사용자 입력이 직무 기준선의 모집단에 섞이지 않는다.

Revision ID: 0026_user_postings
Revises: 0025_legacy_posting_samples
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0026_user_postings"
down_revision = "0025_legacy_posting_samples"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0026_user_postings.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    """두 표를 지운다. 권한과 인덱스도 표와 함께 사라진다.

    `user_posting_analyses` 를 먼저 지운다. `user_posting_id` 가
    `ON DELETE RESTRICT` 로 `user_postings` 를 가리킨다.
    이 두 표를 가리키는 다른 표가 없으므로 삭제가 분석 경로를 건드리지 않는다.
    되돌리면 사용자 입력 공고의 분석 캐시가 사라진다.
    """
    op.execute("DROP TABLE IF EXISTS user_posting_analyses")
    op.execute("DROP TABLE IF EXISTS user_postings")
