"""백엔드 데이터셋이 참조하는 회사와 기업군 소속을 기준 데이터로 넣는다.

`sources.company_id` 는 `companies` 를 참조한다. 수집 매니페스트가 가리키는 회사가
없으면 출처를 등록할 수 없다.

`companies` 와 `company_cluster_memberships` 는 운영자가 마이그레이션으로 관리한다.
근거는 docs/permission-matrix.md 4장이다.

Revision ID: 0013_backend_company_catalog
Revises: 0012_all_segment
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0013_backend_company_catalog"
down_revision = "0012_all_segment"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"

COMPANIES = (
    "co_autoever", "co_bucketplace", "co_channelcorp", "co_daangn",
    "co_daangnpay", "co_estgames", "co_estsecurity", "co_gowid",
    "co_kakaomobility", "co_kakaopay", "co_kurly", "co_lgcns",
    "co_linepayplus", "co_mintrocket", "co_miridih", "co_neople",
    "co_nexonkorea", "co_nudgehealthcare", "co_qmit", "co_supercent",
    "co_travelwallet", "co_woowahan", "co_zimssa",
)


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0013_backend_company_catalog.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """출처가 회사를 참조하고 있으면 이 삭제가 실패한다.

    `ON DELETE RESTRICT` 가 적재한 자료를 남긴 채 기준 데이터만 지우는 것을 막는다.
    """
    names = ", ".join(f"'{c}'" for c in COMPANIES)
    op.execute(
        f"DELETE FROM company_cluster_memberships WHERE company_id IN ({names})"
    )
    op.execute(f"DELETE FROM companies WHERE company_id IN ({names})")
