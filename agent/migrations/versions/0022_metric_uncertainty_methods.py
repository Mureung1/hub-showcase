"""지표 정책 v1 의 불확실성 방법을 수식과 맞춘다.

`mp_v1_contrast` 는 `none`, `mp_v1_cooccurrence` 는 `wilson_95` 다. 근거는
docs/metric-spec.md 3.4 와 3.5 이며 자세한 설명은 SQL 파일에 있다.

Revision ID: 0022_metric_uncertainty_methods
Revises: 0021_chunk_extractions
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0022_metric_uncertainty_methods"
down_revision = "0021_chunk_extractions"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0022_metric_uncertainty_methods.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """시드가 넣은 값으로 되돌린다.

    되돌리면 `cluster_contrast` 가 쓰지 않는 방법을 다시 선언하고 `cooccurrence` 의
    세 비율 measure 가 구간을 잃는다. 두 행 모두 `metric_policy_version` 으로 특정하며
    다른 정책 행은 건드리지 않는다.
    """
    op.execute(
        "UPDATE metric_policy_versions SET uncertainty_method = 'wilson_95' "
        "WHERE metric_policy_version = 'mp_v1_contrast'"
    )
    op.execute(
        "UPDATE metric_policy_versions SET uncertainty_method = 'none' "
        "WHERE metric_policy_version = 'mp_v1_cooccurrence'"
    )
