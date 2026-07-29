"""Express 의 평면 공고 표를 `legacy_posting_samples` 로 옮긴다.

`server/sql/001-postings.sql` 의 평면 표 이름이 0001 의 정규화 `postings` 와
겹쳤다(CONTRACT 4장). 이름을 갈라 두 표가 한 데이터베이스에 공존한다.
평면 표가 이미 있으면 rename 으로 데이터를 지키고, 없으면 새로 만든다.

Revision ID: 0025_legacy_posting_samples
Revises: 0024_company_catalog_expansion
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0025_legacy_posting_samples"
down_revision = "0024_company_catalog_expansion"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0025_legacy_posting_samples.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """직무 축과 새 인덱스만 걷는다. 표를 지우지 않는다.

    upgrade 가 rename 이었는지 create 였는지는 되돌리는 시점에 가릴 수 없고,
    이름을 `postings` 로 되돌리면 정규화 표와 다시 충돌한다. 표에 담긴 샘플
    공고는 이 migration 이 만든 것이 아니므로 삭제하지 않는다.
    """
    op.execute("DROP INDEX IF EXISTS legacy_posting_samples_cluster_idx")
    op.execute("DROP INDEX IF EXISTS legacy_posting_samples_role_snapshot_idx")
    op.execute("ALTER TABLE legacy_posting_samples DROP COLUMN IF EXISTS job_role_id")
