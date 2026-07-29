"""회사 카탈로그에 18개 법인과 기업군 소속 18행을 더한다.

목록은 CONTRACT 부록 A 다. 기존 24개(0013·0014)는 그대로 둔다. 아홉 직무의
데이터셋이 참조할 법인이 모자라 `postings.company_id` 외래키가 성립하지 않았다.

Revision ID: 0024_company_catalog_expansion
Revises: 0023_activate_all_job_roles
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0024_company_catalog_expansion"
down_revision = "0023_activate_all_job_roles"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0024_company_catalog_expansion.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """이 migration 이 넣은 18개 법인과 그 소속만 지운다.

    소속을 먼저 지운다. `company_cluster_memberships.company_id` 가
    `ON DELETE RESTRICT` 라 순서가 뒤바뀌면 삭제가 막힌다.

    `sources` 나 `postings` 가 이 법인을 이미 참조하고 있으면 삭제가 실패한다.
    데이터를 지우는 것은 이 migration 의 몫이 아니므로 그 경우 먼저 데이터셋
    버전을 걷어낸 뒤 되돌린다.
    """
    company_ids = (
        "'co_naver','co_kakao','co_coupang','co_lineplus','co_musinsa',"
        "'co_viva','co_kakaobank','co_kbank',"
        "'co_ncsoft','co_krafton','co_smilegate',"
        "'co_samsungsds','co_skcnc','co_poscodx',"
        "'co_navercloud','co_sendbird','co_upstage','co_wantedlab'"
    )
    op.execute(
        f"DELETE FROM company_cluster_memberships WHERE company_id IN ({company_ids})"
    )
    op.execute(f"DELETE FROM companies WHERE company_id IN ({company_ids})")
