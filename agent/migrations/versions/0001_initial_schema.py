"""초기 스키마.

정의는 docs/erd.md 를 따르며 DDL 은 migrations/sql/0001_initial_schema.sql 에 있다.
SQL 을 별도 파일에 두어 ERD 문서와 나란히 읽을 수 있게 한다.

Revision ID: 0001_initial_schema
Revises:
"""

from __future__ import annotations

from pathlib import Path

from alembic import op

revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None

SQL_DIR = Path(__file__).resolve().parents[1] / "sql"

DROP_ORDER = [
    "evaluation_failures", "evaluation_metrics", "evaluation_runs",
    "evaluation_expected_items", "evaluation_cases", "evaluation_sets",
    "repair_orders", "research_requests", "evidence_usages",
    "evidence_set_members", "evidence_sets", "retrieval_candidates",
    "retrieval_queries", "retrieval_runs",
    "study_tracks", "roadmap_item_fills", "roadmap_items",
    "checklist_item_mappings", "checklist_items", "checklist_concepts",
    "coverage_assertions", "analysis_claim_evidence", "analysis_claims",
    "analysis_outputs", "saturation_observations", "capability_depth_profiles",
    "statistics_facts", "dimension_metric_applicability",
    "wiki_evidence", "wiki_revisions", "wiki_pages",
    "graph_paths", "knowledge_edges", "knowledge_nodes", "ontology_versions",
    "posting_requirement_assignments", "capability_dimension_links", "capabilities",
    "requirement_candidate_decisions", "requirement_candidate_mentions",
    "requirement_candidates", "requirement_dimension_relations",
    "requirement_aliases", "requirement_dimension_versions",
    "requirement_dimensions", "standards",
    "requirement_mentions", "chunk_embeddings", "source_chunks",
    "posting_versions", "postings", "source_assessments",
    "source_observations", "source_snapshots", "sources",
    "verification_results", "tool_calls", "agent_run_steps", "agent_runs",
    "active_analysis_versions", "analysis_versions",
    "metric_policy_versions", "metric_template_parameters", "metric_templates",
    "knowledge_versions", "requirement_taxonomy_versions", "requirement_taxonomies",
    "dataset_versions", "periods", "company_cluster_memberships",
    "company_clusters", "companies", "job_roles",
]


def upgrade() -> None:
    op.execute((SQL_DIR / "0001_initial_schema.sql").read_text(encoding="utf-8"))


def downgrade() -> None:
    for table in DROP_ORDER:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
    op.execute("DROP FUNCTION IF EXISTS block_append_only_mutation() CASCADE")
