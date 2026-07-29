"""직무 아홉 종을 전부 `is_active = true` 로 만든다.

0011 이 backend 외 여덟 종을 비활성으로 넣었다. 데모 시드가 아홉 직무 전량의
분석 산출물을 채우므로(CONTRACT 2장) 화면 선택지도 아홉이 된다.

Revision ID: 0023_activate_all_job_roles
Revises: 0022_metric_uncertainty_methods
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0023_activate_all_job_roles"
down_revision = "0022_metric_uncertainty_methods"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0023_activate_all_job_roles.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    """0011 직후 상태로 되돌린다. backend 만 활성이다.

    되돌리면 여덟 직무의 산출물이 남아 있어도 화면 선택지에 나타나지 않는다.
    아홉 id 만 지정하므로 이 migration 밖에서 들어온 직무의 상태는 건드리지 않는다.
    """
    op.execute(
        "UPDATE job_roles SET is_active = false "
        "WHERE job_role_id IN ("
        "'frontend','ai_engineer','data_engineer','fullstack','devops',"
        "'mobile','security','game_client')"
    )
    op.execute("UPDATE job_roles SET is_active = true WHERE job_role_id = 'backend'")
