"""구성요소별 쓰기 범위.

정의는 docs/permission-matrix.md 3장을 따른다.
이 모듈은 정책만 담는다. 강제는 repositories 와 데이터베이스 role 이 수행한다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

from enum import StrEnum


class Component(StrEnum):
    ORCHESTRATOR = "orchestrator"
    AGENT_COLLECT = "agent_collect"
    AGENT_KNOWLEDGE = "agent_knowledge"
    AGENT_STATS = "agent_stats"
    AGENT_INTERPRET = "agent_interpret"
    AGENT_STRATEGY = "agent_strategy"
    AGENT_ROADMAP = "agent_roadmap"
    PIPE_INGEST = "pipe_ingest"
    PIPE_INDEX = "pipe_index"
    PIPE_AGGREGATE = "pipe_aggregate"
    PIPE_LINEAGE = "pipe_lineage"
    PIPE_VERIFY = "pipe_verify"
    SERVING = "serving"


DB_ROLE: dict[Component, str] = {
    Component.ORCHESTRATOR: "cs_orchestrator",
    Component.AGENT_COLLECT: "cs_agent_collect",
    Component.AGENT_KNOWLEDGE: "cs_agent_knowledge",
    Component.AGENT_STATS: "cs_agent_stats",
    Component.AGENT_INTERPRET: "cs_agent_interpret",
    Component.AGENT_STRATEGY: "cs_agent_strategy",
    Component.AGENT_ROADMAP: "cs_agent_roadmap",
    Component.PIPE_INGEST: "cs_pipe_ingest",
    Component.PIPE_INDEX: "cs_pipe_index",
    Component.PIPE_AGGREGATE: "cs_pipe_aggregate",
    Component.PIPE_LINEAGE: "cs_pipe_lineage",
    Component.PIPE_VERIFY: "cs_pipe_verify",
    Component.SERVING: "cs_serving",
}

TELEMETRY_TABLES: frozenset[str] = frozenset(
    {
        "retrieval_runs",
        "retrieval_queries",
        "retrieval_candidates",
        "evidence_sets",
        "evidence_set_members",
        "evidence_usages",
        "agent_runs",
        "agent_run_steps",
        "tool_calls",
    }
)
"""전 실행 구성요소가 INSERT 한다. UPDATE 와 DELETE 는 트리거가 막는다."""

APPEND_ONLY_TABLES: frozenset[str] = frozenset(
    {"source_snapshots", "source_observations"} | TELEMETRY_TABLES
)

OPERATOR_ONLY_TABLES: frozenset[str] = frozenset(
    {
        "job_roles",
        "companies",
        "company_clusters",
        "company_cluster_memberships",
        "periods",
        "standards",
        "metric_templates",
        "metric_template_parameters",
        "metric_policy_versions",
        "ontology_versions",
        "dimension_metric_applicability",
    }
)
"""마이그레이션과 시드로만 관리한다. 어떤 구성요소도 쓰지 않는다."""

_WRITE_SCOPE: dict[Component, frozenset[str]] = {
    Component.ORCHESTRATOR: frozenset(
        {
            "analysis_versions",
            "active_analysis_versions",
            "dataset_versions",
            "knowledge_versions",
            "research_requests",
        }
    ),
    Component.AGENT_COLLECT: frozenset(
        {"sources", "source_snapshots", "source_observations", "source_assessments"}
    ),
    Component.AGENT_KNOWLEDGE: frozenset(
        {
            "knowledge_nodes",
            "knowledge_edges",
            "capabilities",
            "capability_dimension_links",
            "wiki_pages",
            "wiki_revisions",
            "wiki_evidence",
        }
    ),
    Component.AGENT_STATS: frozenset(
        {
            "requirement_mentions",
            "requirement_candidates",
            "requirement_candidate_mentions",
            "requirement_candidate_decisions",
            "requirement_dimensions",
            "requirement_dimension_versions",
            "requirement_aliases",
            "requirement_dimension_relations",
            "requirement_taxonomy_versions",
            "posting_requirement_assignments",
            "saturation_observations",
            "research_requests",
        }
    ),
    Component.AGENT_INTERPRET: frozenset(
        {
            "analysis_claims",
            "analysis_claim_evidence",
            "coverage_assertions",
            "analysis_outputs",
            "research_requests",
        }
    ),
    Component.AGENT_STRATEGY: frozenset(
        {
            "checklist_concepts",
            "checklist_items",
            "checklist_item_mappings",
            "analysis_outputs",
            "research_requests",
        }
    ),
    Component.AGENT_ROADMAP: frozenset(
        {
            "roadmap_items",
            "roadmap_item_fills",
            "study_tracks",
            "analysis_outputs",
            "research_requests",
        }
    ),
    Component.PIPE_INGEST: frozenset(
        {"postings", "posting_versions", "source_snapshots", "source_observations"}
    ),
    Component.PIPE_INDEX: frozenset({"source_chunks", "chunk_embeddings"}),
    Component.PIPE_AGGREGATE: frozenset(
        {"statistics_facts", "capability_depth_profiles", "knowledge_edges"}
    ),
    Component.PIPE_LINEAGE: frozenset(
        {"knowledge_nodes", "knowledge_edges", "graph_paths"}
    ),
    Component.PIPE_VERIFY: frozenset(
        {"verification_results", "repair_orders", "research_requests"}
    ),
    Component.SERVING: frozenset(),
}

PRODUCED_BY_AGENT: dict[Component, str] = {
    Component.AGENT_INTERPRET: "interpretation",
    Component.AGENT_STRATEGY: "strategy",
    Component.AGENT_ROADMAP: "roadmap",
    Component.PIPE_AGGREGATE: "aggregation",
}
"""`analysis_outputs.produced_by_agent` 에 넣을 값. CHECK 제약이 불일치를 막는다."""

PRE_SEMANTIC_EDGE_TYPES: frozenset[str] = frozenset(
    {
        "POSTED_BY",
        "BELONGS_TO_CLUSTER",
        "REQUIRES",
        "REQUIRES_CAPABILITY",
        "MAPS_TO_STANDARD",
        "PREREQUISITE_OF",
    }
)
"""지식 구축 에이전트가 만드는 semantic 엣지."""

POST_SEMANTIC_EDGE_TYPES: frozenset[str] = frozenset(
    {"PROVEN_BY", "USED_IN_CHANNEL", "TEACHES"}
)
"""분석 산출물이 생긴 뒤 계보 기록 파이프라인이 만드는 semantic 엣지."""


def write_scope(component: Component) -> frozenset[str]:
    """계측 테이블은 전 구성요소가 쓸 수 있다."""
    if component is Component.SERVING:
        return frozenset()
    return _WRITE_SCOPE[component] | TELEMETRY_TABLES


def can_write(component: Component, table: str) -> bool:
    return table in write_scope(component)


def require_write(component: Component, table: str) -> None:
    if not can_write(component, table):
        raise PermissionError(
            f"{component} 는 {table} 에 쓸 수 없다. docs/permission-matrix.md 3장 참조"
        )


def is_append_only(table: str) -> bool:
    return table in APPEND_ONLY_TABLES
