"""추출을 마친 청크를 기록하는 `chunk_extractions` 를 만든다.

정의는 docs/erd.md 6.2 다.

"이 청크를 처리했다" 의 유일한 자국이 `requirement_mentions` 의 행이었다. 회사
소개·복리후생·전형 절차 청크는 요구 표현이 하나도 없는 것이 정상이라 행이 남지
않고, 그 청크는 매 실행마다 다시 호출된다. 처리 사실 자체를 담는 표를 따로 둔다.
`mention_count = 0` 이 정상값이다.

이미 표현이 나온 청크는 `requirement_mentions` 에서 이관한다. 표현이 0개였던
청크는 자국이 없어 이관할 수 없으므로 다음 실행에서 한 번 더 호출된 뒤 영구히
대상에서 빠진다.

Revision ID: 0021_chunk_extractions
Revises: 0020_ontology_evidence_alignment
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0021_chunk_extractions"
down_revision = "0020_ontology_evidence_alignment"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0021_chunk_extractions.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    """표를 지운다. 권한도 표와 함께 사라진다.

    되돌리면 표현이 0개인 청크가 다시 매 실행마다 호출되는 상태로 돌아간다.
    이 표를 가리키는 외래키가 없으므로 삭제가 다른 표를 건드리지 않는다.
    """
    op.execute("DROP TABLE IF EXISTS chunk_extractions")
