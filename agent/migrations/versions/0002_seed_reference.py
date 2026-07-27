"""기준 데이터 적재.

직무, 기업군 6종, 기간 2종, 지표 템플릿 7종과 정책 v1, 온톨로지 v1,
백엔드 분류체계 v1 을 넣는다. 실자료는 P5 에서 적재한다.

Revision ID: 0002_seed_reference
Revises: 0001_initial_schema
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0002_seed_reference"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute((SQL_DIR / "0002_seed_reference.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    op.execute("DELETE FROM requirement_taxonomy_versions WHERE taxonomy_version_id = 'tx_backend_v1'")
    op.execute("DELETE FROM requirement_taxonomies WHERE taxonomy_id = 'tax_backend'")
    op.execute("DELETE FROM ontology_versions WHERE ontology_version = 'v1'")
    op.execute("DELETE FROM metric_policy_versions WHERE metric_policy_version LIKE 'mp_v1_%'")
    op.execute("DELETE FROM metric_template_parameters WHERE formula_version = 'v1'")
    op.execute("DELETE FROM metric_templates WHERE formula_version = 'v1'")
    op.execute("DELETE FROM periods WHERE period_id IN ('recent_12m','prior_12m')")
    op.execute("DELETE FROM company_clusters")
    op.execute("DELETE FROM job_roles WHERE job_role_id = 'backend'")
