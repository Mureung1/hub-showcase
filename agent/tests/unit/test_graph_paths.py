"""경로 캐시 실행 검증.

규칙은 docs/erd.md 8.4와 docs/knowledge-schema.md 7.5에서 온다. 저장소를 대역으로
대체하고 캐시 판정, 저장 행의 모양, 무효화만 검사한다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.graph.paths import (
    NO_GRAPH,
    NO_ONTOLOGY,
    CacheKey,
    GraphPathRunner,
    path_identifier,
)
from careersignal.graph.policy import (
    CAPABILITY_PREREQUISITE_CHAIN,
    GRAPH_POLICY_V1,
    POSTING_REQUIREMENT_CAPABILITY,
)
from careersignal.repositories.graph_paths import GraphPathRepository
from tests.unit.test_graph_traversal import (
    PROVENANCE_CONNECTIONS,
    PROVENANCE_NODES,
    SEMANTIC_CONNECTIONS,
    SEMANTIC_NODES,
)

ONTOLOGY_VERSION = "v1"
STAMP = datetime(2026, 7, 28, 9, 0, 0)


def _rows() -> list[dict[str, Any]]:
    return [
        {
            "ontology_version": ONTOLOGY_VERSION,
            "graph_layer": "semantic",
            "node_types": SEMANTIC_NODES,
            "edge_types": list(SEMANTIC_CONNECTIONS),
            "allowed_connections": SEMANTIC_CONNECTIONS,
            "required_evidence_by_edge_type": {},
        },
        {
            "ontology_version": ONTOLOGY_VERSION,
            "graph_layer": "provenance",
            "node_types": PROVENANCE_NODES,
            "edge_types": list(PROVENANCE_CONNECTIONS),
            "allowed_connections": PROVENANCE_CONNECTIONS,
            "required_evidence_by_edge_type": {},
        },
    ]


def _nodes() -> list[dict[str, Any]]:
    return [
        {"node_id": "node_post", "node_type": "Posting", "graph_layer": "semantic"},
        {"node_id": "node_dim", "node_type": "Technology", "graph_layer": "semantic"},
        {"node_id": "node_cap", "node_type": "Capability", "graph_layer": "semantic"},
    ]


def _edges() -> list[dict[str, Any]]:
    return [
        {
            "edge_id": "edge_req",
            "edge_type": "REQUIRES",
            "graph_layer": "semantic",
            "src_node_id": "node_post",
            "dst_node_id": "node_dim",
            "weight": None,
        },
        {
            "edge_id": "edge_cap",
            "edge_type": "REQUIRES_CAPABILITY",
            "graph_layer": "semantic",
            "src_node_id": "node_dim",
            "dst_node_id": "node_cap",
            "weight": None,
        },
    ]


def _context(
    taxonomy_version_id: str | None = "tx_backend_v1",
    knowledge_version: str | None = "kn_v1",
    analysis_version: str = "an_v1",
) -> RunContext:
    return RunContext(
        agent_run_id="run_paths",
        analysis_version=analysis_version,
        dataset_version="ds_v1",
        taxonomy_version_id=taxonomy_version_id,
        knowledge_version=knowledge_version,
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
    )


class FakePaths:
    """경로 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(
        self,
        rows: list[dict[str, Any]] | None = None,
        nodes: list[dict[str, Any]] | None = None,
        edges: list[dict[str, Any]] | None = None,
    ) -> None:
        self._rows = _rows() if rows is None else rows
        self._nodes = _nodes() if nodes is None else nodes
        self._edges = _edges() if edges is None else edges
        self.stored: list[dict[str, Any]] = []
        self.lookups: list[dict[str, Any]] = []
        self.deleted: list[dict[str, Any]] = []

    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]:
        return list(self._rows)

    def traversal_nodes(self, ontology_version: str) -> list[dict[str, Any]]:
        return list(self._nodes)

    def traversal_edges(self, ontology_version: str) -> list[dict[str, Any]]:
        return list(self._edges)

    def cached_paths(self, key: dict[str, Any]) -> list[dict[str, Any]]:
        self.lookups.append(dict(key))
        return [row for row in self.stored if self._matches(row, key)]

    def add_path(self, values: dict[str, Any]) -> None:
        self.stored.append(dict(values))

    def delete_stale_paths(self, key: dict[str, Any]) -> int:
        self.deleted.append(dict(key))
        stale = [
            row
            for row in self.stored
            if row["path_type"] == key["path_type"] and not self._matches(row, key)
        ]
        self.stored = [row for row in self.stored if row not in stale]
        return len(stale)

    @staticmethod
    def _matches(row: dict[str, Any], key: dict[str, Any]) -> bool:
        return all(row.get(column) == value for column, value in key.items())


# ============================================================ 빈 그래프
def test_그래프가_비면_모든_유형을_건너뛴다():
    repository = FakePaths(nodes=[], edges=[])

    outcome = GraphPathRunner(repository).run(_context(), computed_at=STAMP)

    assert repository.stored == []
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert {reason for _, reason in outcome.skipped_types} == {NO_GRAPH}


def test_온톨로지가_없으면_실패로_끝난다():
    outcome = GraphPathRunner(FakePaths(rows=[])).run(_context(), computed_at=STAMP)

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors == (("v1", NO_ONTOLOGY),)


# ============================================================ 저장
def test_계산한_경로를_캐시에_담는다():
    repository = FakePaths()

    outcome = GraphPathRunner(repository).run(_context(), computed_at=STAMP)

    assert outcome.misses[POSTING_REQUIREMENT_CAPABILITY] == 1
    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    stored = repository.stored[0]
    assert stored["node_sequence"] == ["node_post", "node_dim", "node_cap"]
    assert stored["edge_sequence"] == ["edge_req", "edge_cap"]
    assert stored["computed_at"] == STAMP


def test_저장한_행이_길이_관계를_지킨다():
    repository = FakePaths()

    GraphPathRunner(repository).run(_context(), computed_at=STAMP)

    for row in repository.stored:
        assert len(row["edge_sequence"]) == len(row["node_sequence"]) - 1


def test_원천이_없는_유형은_건너뛴_사실을_남긴다():
    repository = FakePaths()

    outcome = GraphPathRunner(repository).run(_context(), computed_at=STAMP)

    skipped = dict(outcome.skipped_types)
    assert CAPABILITY_PREREQUISITE_CHAIN in skipped


def test_같은_입력에_같은_출력을_낸다():
    first = FakePaths()
    second = FakePaths(
        nodes=list(reversed(_nodes())), edges=list(reversed(_edges()))
    )

    GraphPathRunner(first).run(_context(), computed_at=STAMP)
    GraphPathRunner(second).run(_context(), computed_at=STAMP)

    assert first.stored == second.stored


# ============================================================ 캐시 키
def test_두_번째_실행은_캐시_적중이다():
    repository = FakePaths()
    runner = GraphPathRunner(repository)

    runner.run(_context(), computed_at=STAMP)
    again = runner.run(_context(), computed_at=STAMP)

    assert again.misses == {}
    assert again.hits[POSTING_REQUIREMENT_CAPABILITY] == 1
    assert again.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert len(repository.stored) == 1


def test_분류체계_버전이_바뀌면_캐시_미스다():
    repository = FakePaths()
    runner = GraphPathRunner(repository)

    runner.run(_context(), computed_at=STAMP)
    changed = runner.run(_context(taxonomy_version_id="tx_backend_v2"), computed_at=STAMP)

    assert changed.miss_count == 1
    assert len(repository.stored) == 2


def test_지식_버전이_바뀌면_캐시_미스다():
    repository = FakePaths()
    runner = GraphPathRunner(repository)

    runner.run(_context(), computed_at=STAMP)
    changed = runner.run(_context(knowledge_version="kn_v2"), computed_at=STAMP)

    assert changed.miss_count == 1


def test_분석_버전이_바뀌면_캐시_미스다():
    repository = FakePaths()
    runner = GraphPathRunner(repository)

    runner.run(_context(), computed_at=STAMP)
    changed = runner.run(_context(analysis_version="an_v2"), computed_at=STAMP)

    assert changed.miss_count == 1


def test_정책_버전이_바뀌면_캐시_미스다():
    repository = FakePaths()
    runner = GraphPathRunner(repository)

    runner.run(_context(), computed_at=STAMP)
    other = GRAPH_POLICY_V1.model_copy(update={"graph_policy_version": "gp_v2"})
    from careersignal.graph import policy as policy_module

    policy_module.POLICIES[other.graph_policy_version] = other
    try:
        changed = runner.run(
            _context(), graph_policy_version="gp_v2", computed_at=STAMP
        )
    finally:
        del policy_module.POLICIES[other.graph_policy_version]

    assert changed.miss_count == 1
    assert len(repository.stored) == 2


def test_경로_식별자가_버전마다_다르다():
    first = path_identifier(
        POSTING_REQUIREMENT_CAPABILITY,
        ("node_a", "node_b"),
        ("edge_a",),
        "tx_v1",
        "kn_v1",
        "an_v1",
        "gp_v1",
    )
    second = path_identifier(
        POSTING_REQUIREMENT_CAPABILITY,
        ("node_a", "node_b"),
        ("edge_a",),
        "tx_v2",
        "kn_v1",
        "an_v1",
        "gp_v1",
    )

    assert first != second
    assert first.startswith("path_")


def test_캐시_키가_네_버전을_담는다():
    key = CacheKey.of(POSTING_REQUIREMENT_CAPABILITY, _context(), "gp_v1")

    assert set(key.as_filter()) == {
        "path_type",
        "taxonomy_version_id",
        "knowledge_version",
        "analysis_version",
        "graph_policy_version",
    }


# ============================================================ 무효화
def test_무효화가_어긋난_키의_행만_지운다():
    repository = FakePaths()
    runner = GraphPathRunner(repository)
    runner.run(_context(), computed_at=STAMP)
    runner.run(_context(taxonomy_version_id="tx_backend_v2"), computed_at=STAMP)

    removed = runner.invalidate(
        _context(taxonomy_version_id="tx_backend_v2"),
        (POSTING_REQUIREMENT_CAPABILITY,),
    )

    assert removed == 1
    assert len(repository.stored) == 1
    assert repository.stored[0]["taxonomy_version_id"] == "tx_backend_v2"


def test_실행은_무효화를_부르지_않는다():
    """활성 분석 버전의 경로를 화면이 조회하므로 계산이 옛 행을 지우지 않는다."""
    repository = FakePaths()

    GraphPathRunner(repository).run(_context(), computed_at=STAMP)

    assert repository.deleted == []


# ============================================================ 권한
def test_경로_저장소가_계보_기록_구성요소다():
    assert GraphPathRepository.component is Component.PIPE_LINEAGE
    assert can_write(Component.PIPE_LINEAGE, "graph_paths")


def test_다른_구성요소는_경로_캐시에_쓰지_못한다():
    assert not can_write(Component.AGENT_KNOWLEDGE, "graph_paths")
    assert not can_write(Component.AGENT_INTERPRET, "graph_paths")
