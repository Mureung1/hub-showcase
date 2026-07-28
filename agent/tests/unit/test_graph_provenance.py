"""계보 층 구축 검증.

규칙은 docs/ontology-v1.md 3장과 docs/adr/0008-lineage-write-path.md 에서 온다.
저장소를 대역으로 대체하고 층 경계, 원천이 빈 유형의 처리, 증분 재실행만
검사한다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.graph.identifiers import node_identifier
from careersignal.graph.ontology import (
    REASON_ENDPOINT_NOT_FOUND,
    GraphBuildOutcome,
)
from careersignal.graph.provenance import (
    NO_FACT_INPUTS,
    NO_ITEM_CLAIMS,
    NO_MENTIONS,
    ProvenanceGraphBuilder,
)
from careersignal.graph.semantic import ONTOLOGY_VERSION
from careersignal.repositories.lineage import LineageGraphRepository

TAXONOMY_VERSION_ID = "tx_backend_v1"
ANALYSIS_VERSION = "an_graph_test"
DATASET_VERSION = "ds_test"

NODE_TYPES = [
    "SourceSnapshot",
    "Chunk",
    "RequirementMention",
    "Assignment",
    "StatisticFact",
    "AnalysisClaim",
    "ChecklistItem",
    "RoadmapItem",
    "AnalysisOutput",
    "AgentRun",
]

CONNECTIONS: dict[str, dict[str, Any]] = {
    "PART_OF": {"src": ["Chunk"], "dst": ["SourceSnapshot"], "taxonomy_version": False},
    "EVIDENCED_BY": {
        "src": ["RequirementMention"],
        "dst": ["Chunk"],
        "taxonomy_version": False,
    },
    "ASSIGNED_TO": {
        "src": ["RequirementMention"],
        "dst": ["RequirementDimension", "Technology"],
        "taxonomy_version": True,
    },
    "COMPUTED_FROM": {
        "src": ["StatisticFact"],
        "dst": ["Assignment"],
        "taxonomy_version": False,
    },
    "SUPPORTED_BY": {
        "src": ["AnalysisClaim"],
        "dst": ["Chunk", "StatisticFact"],
        "taxonomy_version": False,
    },
    "CONTRADICTED_BY": {
        "src": ["AnalysisClaim"],
        "dst": ["Chunk"],
        "taxonomy_version": False,
    },
    "DERIVED_FROM": {
        "src": ["ChecklistItem"],
        "dst": ["AnalysisClaim"],
        "taxonomy_version": False,
    },
    "FILLS": {
        "src": ["RoadmapItem"],
        "dst": ["ChecklistItem"],
        "taxonomy_version": False,
    },
    "PRODUCED_BY": {
        "src": ["AnalysisOutput"],
        "dst": ["AgentRun"],
        "taxonomy_version": False,
    },
}
"""`0002_seed_reference.sql` 의 provenance 층 허용 연결이다."""

EVIDENCE = {
    "EVIDENCED_BY": "requirement_mention",
    "ASSIGNED_TO": "assignment",
    "COMPUTED_FROM": "statistic_fact",
    "SUPPORTED_BY": "analysis_claim_evidence",
    "CONTRADICTED_BY": "analysis_claim_evidence",
    "DERIVED_FROM": "checklist_item",
    "FILLS": "roadmap_item_fill",
    "PRODUCED_BY": "agent_run",
}

ROWS = [
    {
        "ontology_version": ONTOLOGY_VERSION,
        "graph_layer": "provenance",
        "node_types": NODE_TYPES,
        "edge_types": list(CONNECTIONS),
        "allowed_connections": CONNECTIONS,
        "required_evidence_by_edge_type": EVIDENCE,
    }
]


def _semantic_node(
    node_type: str = "Technology", ref_id: str = "dim_kafka"
) -> dict[str, Any]:
    """지식 구축 에이전트가 먼저 만든 semantic 노드 한 행."""
    return {
        "node_id": node_identifier(
            "semantic", node_type, "requirement_dimensions", ref_id, ONTOLOGY_VERSION
        ),
        "node_type": node_type,
        "ref_id": ref_id,
    }


class FakeLineage:
    """계보 층 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(self, **sources: Any) -> None:
        self._sources = sources
        self.nodes: list[dict[str, Any]] = []
        self.edges: list[dict[str, Any]] = []

    def _rows(self, name: str) -> list[dict[str, Any]]:
        return list(self._sources.get(name, []))

    # -------------------------------------------------------- 조회
    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]:
        return list(self._sources.get("ontology", ROWS))

    def semantic_nodes(self, ontology_version: str) -> list[dict[str, Any]]:
        return self._rows("semantic_nodes")

    def snapshots(self, dataset_version: str) -> list[dict[str, Any]]:
        return self._rows("snapshots")

    def chunks(self, dataset_version: str) -> list[dict[str, Any]]:
        return self._rows("chunks")

    def mentions(self, dataset_version: str) -> list[dict[str, Any]]:
        return self._rows("mentions")

    def assignments(
        self, taxonomy_version_id: str, dataset_version: str
    ) -> list[dict[str, Any]]:
        return self._rows("assignments")

    def statistic_facts(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("facts")

    def analysis_claims(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("claims")

    def claim_evidence(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("claim_evidence")

    def checklist_items(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("checklist_items")

    def roadmap_items(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("roadmap_items")

    def roadmap_fills(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("roadmap_fills")

    def analysis_outputs(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("outputs")

    def agent_runs(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("runs")

    def output_runs(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("output_runs")

    def fact_inputs(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("fact_inputs")

    def item_claims(self, analysis_version: str) -> list[dict[str, Any]]:
        return self._rows("item_claims")

    # -------------------------------------------------------- 저장
    def node_ids(self, ontology_version: str, graph_layer: str) -> set[str]:
        return {n["node_id"] for n in self.nodes if n["graph_layer"] == graph_layer}

    def edge_ids(self, ontology_version: str, graph_layer: str) -> set[str]:
        return {e["edge_id"] for e in self.edges if e["graph_layer"] == graph_layer}

    def add_node(self, values: dict[str, Any]) -> None:
        self.nodes.append(values)

    def add_edge(self, values: dict[str, Any]) -> None:
        self.edges.append(values)

    # -------------------------------------------------------- 검사 보조
    def edges_of(self, edge_type: str) -> list[dict[str, Any]]:
        return [e for e in self.edges if e["edge_type"] == edge_type]

    def node_of(self, node_type: str, ref_id: str) -> dict[str, Any] | None:
        for node in self.nodes:
            if node["node_type"] == node_type and node["ref_id"] == ref_id:
                return node
        return None


def _context() -> RunContext:
    return RunContext(
        agent_run_id="run_lineage_test",
        analysis_version=ANALYSIS_VERSION,
        dataset_version=DATASET_VERSION,
        taxonomy_version_id=TAXONOMY_VERSION_ID,
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
    )


def _run(repository: FakeLineage) -> GraphBuildOutcome:
    return ProvenanceGraphBuilder(repository).run(_context())


CHECKLIST_ROW = {
    "item_id": "item_1",
    "concept_id": "concept_1",
    "scope_level": "overall",
    "scope_id": "backend",
    "title": "메시지 큐 프로젝트",
}

ASSIGNMENT_ROW = {
    "assignment_id": "assign_1",
    "mention_id": "mention_1",
    "dimension_id": "dim_kafka",
    "normalized_label": "Kafka",
    "dimension_kind": "technology",
}


def _collected(**extra: Any) -> FakeLineage:
    """지금 원천이 있는 것만 담은 저장소. D0~D2 와 실행 기록이다.

    `extra` 로 뒤 계층의 원천을 더한다.
    """
    return FakeLineage(
        snapshots=[{"snapshot_id": "snap_1", "label": "https://example.test/1"}],
        chunks=[
            {
                "chunk_id": "chunk_1",
                "snapshot_id": "snap_1",
                "ordinal": 0,
                "section": "자격요건",
            }
        ],
        mentions=[
            {
                "mention_id": "mention_1",
                "chunk_id": "chunk_1",
                "raw_expression": "Kafka 운영 경험",
            }
        ],
        runs=[
            {"agent_run_id": "run_1", "agent_name": "statistics", "iteration": 1}
        ],
        **extra,
    )


# ============================================================ 냉시작
def test_an_empty_dataset_writes_nothing() -> None:
    repository = FakeLineage()

    outcome = _run(repository)

    assert repository.nodes == []
    assert repository.edges == []
    assert outcome.errors == ()
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED


def test_an_empty_dataset_records_every_skipped_type() -> None:
    outcome = _run(FakeLineage())
    skipped = {name for name, _ in outcome.skipped_types}

    assert skipped == set(NODE_TYPES) | set(CONNECTIONS)
    assert ("RequirementMention", NO_MENTIONS) in outcome.skipped_types


def test_a_missing_ontology_version_is_an_explicit_failure() -> None:
    outcome = _run(FakeLineage(ontology=[]))

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors != ()


# ============================================================ D0~D2
def test_a_chunk_points_at_its_snapshot() -> None:
    repository = _collected()

    _run(repository)
    edge = repository.edges_of("PART_OF")[0]

    assert edge["src_node_id"] == repository.node_of("Chunk", "chunk_1")["node_id"]
    assert (
        edge["dst_node_id"]
        == repository.node_of("SourceSnapshot", "snap_1")["node_id"]
    )
    assert edge["evidence_id"] is None


def test_a_mention_points_at_the_chunk_it_was_read_from() -> None:
    repository = _collected()

    _run(repository)
    edge = repository.edges_of("EVIDENCED_BY")[0]

    assert edge["evidence_id"] == "mention_1"
    assert edge["dst_node_id"] == repository.node_of("Chunk", "chunk_1")["node_id"]


# ============================================================ 층 경계
def test_assigned_to_ends_on_the_semantic_dimension_node() -> None:
    """원문 표현에서 정규화된 차원으로 이어지는 계보가 두 층을 잇는다."""
    repository = _collected(
        semantic_nodes=[_semantic_node()], assignments=[ASSIGNMENT_ROW]
    )

    _run(repository)
    edge = repository.edges_of("ASSIGNED_TO")[0]

    assert edge["dst_node_id"] == _semantic_node()["node_id"]
    assert edge["taxonomy_version_id"] == TAXONOMY_VERSION_ID
    assert edge["graph_layer"] == "provenance"


def test_assigned_to_is_discarded_when_the_dimension_node_is_absent() -> None:
    """계보 기록은 semantic 노드를 만들지 않는다. 없으면 엣지를 만들지 않는다."""
    repository = _collected(assignments=[ASSIGNMENT_ROW])

    outcome = _run(repository)

    assert repository.edges_of("ASSIGNED_TO") == []
    assert [d.reason_code for d in outcome.discarded] == [REASON_ENDPOINT_NOT_FOUND]
    assert repository.node_of("Assignment", "assign_1") is not None


def test_only_assigned_to_ends_outside_the_provenance_layer() -> None:
    """semantic 노드를 도착점으로 갖는 provenance 엣지가 `ASSIGNED_TO` 뿐이다."""
    repository = _collected(
        semantic_nodes=[_semantic_node()], assignments=[ASSIGNMENT_ROW]
    )

    _run(repository)
    inside = {n["node_id"] for n in repository.nodes}
    crossing = {
        e["edge_type"] for e in repository.edges if e["dst_node_id"] not in inside
    }

    assert crossing == {"ASSIGNED_TO"}
    assert all(e["graph_layer"] == "provenance" for e in repository.edges)


# ============================================================ 뒤 계층
def test_a_claim_points_at_the_evidence_that_supports_it() -> None:
    repository = _collected(
        claims=[
            {
                "claim_id": "claim_1",
                "claim_type": "statistic",
                "claim_text": "Kafka 요구가 절반을 넘는다",
            }
        ],
        claim_evidence=[
            {
                "claim_id": "claim_1",
                "support_type": "chunk",
                "support_id": "chunk_1",
                "relation": "supports",
            },
            {
                "claim_id": "claim_1",
                "support_type": "chunk",
                "support_id": "chunk_1",
                "relation": "contradicts",
            },
        ],
    )

    _run(repository)

    assert len(repository.edges_of("SUPPORTED_BY")) == 1
    assert len(repository.edges_of("CONTRADICTED_BY")) == 1
    assert repository.edges_of("SUPPORTED_BY")[0]["evidence_id"] == (
        "claim_1|chunk|chunk_1|supports"
    )


def test_a_roadmap_item_points_at_the_checklist_item_it_fills() -> None:
    repository = _collected(
        checklist_items=[CHECKLIST_ROW],
        roadmap_items=[
            {
                "roadmap_item_id": "road_1",
                "scope_level": "overall",
                "scope_id": "backend",
                "step_order": 1,
                "title": "브로커 구축",
            }
        ],
        roadmap_fills=[
            {
                "roadmap_item_id": "road_1",
                "concept_id": "concept_1",
                "item_id": "item_1",
            }
        ],
    )

    _run(repository)
    edge = repository.edges_of("FILLS")[0]

    assert edge["evidence_id"] == "road_1|concept_1"
    item = repository.node_of("ChecklistItem", "item_1")
    assert edge["dst_node_id"] == item["node_id"]


def test_an_output_points_at_the_run_that_produced_it() -> None:
    repository = _collected(
        outputs=[
            {
                "output_id": "out_1",
                "output_type": "statistics",
                "produced_by_agent": "aggregation",
                "scope_level": "overall",
                "scope_id": "backend",
            }
        ],
        output_runs=[{"output_id": "out_1", "agent_run_id": "run_1"}],
    )

    _run(repository)
    edge = repository.edges_of("PRODUCED_BY")[0]

    assert edge["evidence_id"] == "run_1"
    assert edge["dst_node_id"] == repository.node_of("AgentRun", "run_1")["node_id"]


def test_edges_without_a_source_table_are_skipped_with_a_reason() -> None:
    """지표와 할당, 체크리스트 항목과 주장을 잇는 표가 아직 없다."""
    repository = _collected(
        facts=[
            {
                "fact_id": "fact_1",
                "metric_family": "posting_prevalence",
                "measure": "ratio",
                "dimension_id": "dim_kafka",
            }
        ],
        checklist_items=[CHECKLIST_ROW],
    )

    outcome = _run(repository)

    assert ("COMPUTED_FROM", NO_FACT_INPUTS) in outcome.skipped_types
    assert ("DERIVED_FROM", NO_ITEM_CLAIMS) in outcome.skipped_types
    assert repository.edges_of("COMPUTED_FROM") == []
    assert repository.edges_of("DERIVED_FROM") == []


# ============================================================ 재실행
def test_rerunning_creates_no_duplicate() -> None:
    repository = _collected()

    first = _run(repository)
    nodes, edges = len(repository.nodes), len(repository.edges)
    second = _run(repository)

    assert first.node_count > 0 and first.edge_count > 0
    assert (len(repository.nodes), len(repository.edges)) == (nodes, edges)
    assert second.node_count == 0 and second.edge_count == 0
    assert second.stop_reason is StopReason.NO_NEW_EVIDENCE


# ============================================================ 저장 범위
def test_no_edge_is_written_with_a_weight() -> None:
    repository = _collected()

    _run(repository)

    assert all("weight" not in edge for edge in repository.edges)


def test_every_written_edge_type_is_registered_in_the_layer() -> None:
    repository = _collected()

    _run(repository)

    assert {e["edge_type"] for e in repository.edges} <= set(CONNECTIONS)


def test_the_repository_belongs_to_the_lineage_pipeline() -> None:
    """계보 기록은 판단이 개입하지 않는 A0 파이프라인이다."""
    assert LineageGraphRepository.component is Component.PIPE_LINEAGE
    assert can_write(Component.PIPE_LINEAGE, "knowledge_nodes")
    assert can_write(Component.PIPE_LINEAGE, "knowledge_edges")
    assert not can_write(Component.PIPE_LINEAGE, "requirement_mentions")
