"""엔키화이트햇을 회사 카탈로그에 더한다.

기업군 b2b_saas 의 `experienced` 표본이 네 건에 머물러 지표 정책 v1 의
`minimum_n` 5 를 넘기지 못한다. 이 회사의 백엔드 공고가 그 칸을 채운다.

Revision ID: 0014_enki_company
Revises: 0013_backend_company_catalog
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0014_enki_company"
down_revision = "0013_backend_company_catalog"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0014_enki_company.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DELETE FROM company_cluster_memberships WHERE company_id = 'co_enkiwhitehat'")
    op.execute("DELETE FROM companies WHERE company_id = 'co_enkiwhitehat'")
