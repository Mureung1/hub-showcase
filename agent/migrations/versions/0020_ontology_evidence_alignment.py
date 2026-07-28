"""엣지별 필수 근거를 온톨로지 문서와 일치시킨다.

정의는 docs/ontology-v1.md 4장이고 근거는
docs/adr/0012-ontology-evidence-source-of-truth.md 에 있다.

시드가 적은 `required_evidence_by_edge_type` 이 문서와 네 곳에서 어긋난다. 검사기는
문서가 아니라 이 컬럼을 읽어 판정하므로 어긋난 값이 실행의 규칙이 되어 있다.
`ontology_versions` 는 `OPERATOR_ONLY_TABLES` 이므로 migration 이 유일한 갱신 경로다.

온톨로지 버전은 v1 그대로 둔다. 바뀌는 것은 정의가 아니라 정의를 옮겨 적은 값이다.

Revision ID: 0020_ontology_evidence_alignment
Revises: 0019_candidate_dimension_kind
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0020_ontology_evidence_alignment"
down_revision = "0019_candidate_dimension_kind"
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"


def upgrade() -> None:
    op.execute(
        (SQL_DIR / "0020_ontology_evidence_alignment.sql").read_text(encoding="utf-8")
    )


def downgrade() -> None:
    """`0002_seed_reference.sql` 이 적었던 값으로 되돌린다.

    되돌린 상태는 문서와 어긋난 상태다. 같은 컬럼만 되돌리므로 다른 컬럼은
    어느 방향으로도 바뀌지 않는다.
    """
    op.execute(
        """
        UPDATE ontology_versions
        SET required_evidence_by_edge_type = '{
          "REQUIRES": "assignment",
          "REQUIRES_CAPABILITY": "capability_dimension_link",
          "MAPS_TO_STANDARD": "dimension_version_mapping",
          "PREREQUISITE_OF": "wiki_prerequisites",
          "PROVEN_BY": "checklist_item",
          "USED_IN_CHANNEL": "checklist_item",
          "TEACHES": "study_track"
        }'::jsonb
        WHERE ontology_version = 'v1' AND graph_layer = 'semantic';

        UPDATE ontology_versions
        SET required_evidence_by_edge_type = '{
          "EVIDENCED_BY": "requirement_mention",
          "ASSIGNED_TO": "assignment",
          "COMPUTED_FROM": "statistic_fact",
          "SUPPORTED_BY": "analysis_claim_evidence",
          "CONTRADICTED_BY": "analysis_claim_evidence",
          "DERIVED_FROM": "checklist_item",
          "FILLS": "roadmap_item_fill",
          "PRODUCED_BY": "agent_run"
        }'::jsonb
        WHERE ontology_version = 'v1' AND graph_layer = 'provenance';
        """
    )
