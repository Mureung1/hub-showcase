"""외부 직무 표준을 기준 데이터로 넣는다.

`standards` 는 운영자가 마이그레이션으로 관리한다. 근거는 docs/permission-matrix.md 4장이다.

담는 것은 NCS 세분류 20010202 응용SW엔지니어링과 그 능력단위 27종, 그리고
O*NET-SOC 15-1252.00 Software Developers 다. 차원과 표준을 잇는 일은 Phase 10과 11이다.

Revision ID: 0015_job_standards
Revises: 0014_enki_company
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0015_job_standards"
down_revision = "0014_enki_company"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0015_job_standards.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    """차원이 표준을 참조하고 있으면 이 삭제가 실패한다."""
    op.execute(
        "DELETE FROM standards WHERE standard_body IN ("
        "'한국산업인력공단',"
        " 'U.S. Department of Labor, Employment and Training Administration')"
    )
