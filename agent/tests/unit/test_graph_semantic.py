"""의미 층 구축 검증.

규칙은 docs/ontology-v1.md 2·5·6장과 docs/erd.md 8.2·8.3에서 온다. 저장소를
대역으로 대체하고 유형 분기, 파생 엣지의 근거, 폐기 기록, 증분 재실행만 검사한다.
데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import (
    PRE_SEMANTIC_EDGE_TYPES,
    Component,
    can_write,
)
from careersignal.domain.scope import ScopeLevel
from careersignal.graph.identifiers import node_identifier
from careersignal.graph.ontology import (
    REASON_CONNECTION_NOT_ALLOWED,
    REASON_NODE_TYPE_NOT_REGISTERED,
    GraphBuildOutcome,
)
from careersignal.graph.semantic import (
    NO_PREREQUISITE_EVIDENCE,
    ONTOLOGY_VERSION,
    SemanticGraphBuilder,
    dimension_node_type,
)
from careersignal.repositories.assignment import AssignmentRepository
from careersignal.repositories.base import Repository
from careersignal.repositories.knowledge_graph import SemanticGraphRepository
from careersignal.repositories.promotion import PromotionRepository
from careersignal.repositories.statistics import StatisticsRepository

TAXONOMY_VERSION_ID = "tx_backend_v1"
JOB_ROLE_ID = "backend"

NODE_TYPES = [
    "JobRole",
    "Posting",
    "Company",
    "CompanyCluster",
    "RequirementDimension",
    "Capability",
    "Technology",
    "Standard",
]

CONNECTIONS: dict[str, dict[str, Any]] = {
    "POSTED_BY": {"src": ["Posting"], "dst": ["Company"], "taxonomy_version": False},
    "BELONGS_TO_CLUSTER": {
        "src": ["Company"],
        "dst": ["CompanyCluster"],
        "taxonomy_version": False,
    },
    "REQUIRES": {
        "src": ["Posting"],
        "dst": ["RequirementDimension", "Technology"],
        "taxonomy_version": True,
    },
    "REQUIRES_CAPABILITY": {
        "src": ["RequirementDimension", "Technology"],
        "dst": ["Capability"],
        "taxonomy_version": True,
    },
    "MAPS_TO_STANDARD": {
        "src": ["Capability"],
        "dst": ["Standard"],
        "taxonomy_version": False,
    },
    "PREREQUISITE_OF": {
        "src": ["Capability"],
        "dst": ["Capability"],
        "taxonomy_version": False,
    },
}
"""`0002_seed_reference.sql` 의 semantic 층 허용 연결 가운데 D3a 여섯 종이다."""

EVIDENCE = {
    "REQUIRES": "assignment",
    "REQUIRES_CAPABILITY": "capability_dimension_link",
    "MAPS_TO_STANDARD": "dimension_version_mapping",
    "PREREQUISITE_OF": "wiki_prerequisites",
}


def _rows(
    node_types: list[str] | None = None,
    connections: dict[str, dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """온톨로지 등록 목록 한 층. 유형을 빼서 미등록 상황을 만든다."""
    return [
        {
            "ontology_version": ONTOLOGY_VERSION,
            "graph_layer": "semantic",
            "node_types": node_types if node_types is not None else NODE_TYPES,
            "edge_types": list(
                connections if connections is not None else CONNECTIONS
            ),
            "allowed_connections": connections
            if connections is not None
            else CONNECTIONS,
            "required_evidence_by_edge_type": EVIDENCE,
        }
    ]


def _posting(
    posting_id: str = "post_1", company_id: str = "co_1"
) -> dict[str, Any]:
    return {
        "posting_id": posting_id,
        "company_id": company_id,
        "company_label": "주식회사 대역",
        "posting_label": "백엔드 개발자",
    }


def _dimension(
    dimension_id: str = "dim_kafka", kind: str = "technology"
) -> dict[str, Any]:
    return {"dimension_id": dimension_id, "dimension_kind": kind, "label": "Kafka"}


def _assignment(
    assignment_id: str, posting_id: str = "post_1", dimension_id: str = "dim_kafka"
) -> dict[str, Any]:
    return {
        "assignment_id": assignment_id,
        "posting_id": posting_id,
        "dimension_id": dimension_id,
    }


class FakeSemantic:
    """의미 층 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(
        self,
        rows: list[dict[str, Any]] | None = None,
        role: dict[str, Any] | None = None,
        postings: list[dict[str, Any]] | None = None,
        memberships: list[dict[str, Any]] | None = None,
        dimensions: list[dict[str, Any]] | None = None,
        capabilities: list[dict[str, Any]] | None = None,
        links: list[dict[str, Any]] | None = None,
        standards: list[dict[str, Any]] | None = None,
        assignments: list[dict[str, Any]] | None = None,
        prerequisites: list[dict[str, Any]] | None = None,
    ) -> None:
        self._rows = rows if rows is not None else _rows()
        self._role = (
            role
            if role is not None
            else {"job_role_id": JOB_ROLE_ID, "display_name": "백엔드 개발자"}
        )
        self._postings = postings or []
        self._memberships = memberships or []
        self._dimensions = dimensions or []
        self._capabilities = capabilities or []
        self._links = links or []
        self._standards = standards or []
        self._assignments = assignments or []
        self._prerequisites = prerequisites or []

        self.nodes: list[dict[str, Any]] = []
        self.edges: list[dict[str, Any]] = []

    # -------------------------------------------------------- 조회
    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]:
        return list(self._rows)

    def job_role(self, job_role_id: str) -> dict[str, Any] | None:
        return dict(self._role) if self._role else None

    def postings(
        self, job_role_id: str, dataset_version: str
    ) -> list[dict[str, Any]]:
        return list(self._postings)

    def cluster_memberships(
        self, job_role_id: str, as_of_date: Any
    ) -> list[dict[str, Any]]:
        return list(self._memberships)

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._dimensions)

    def active_capabilities(self, job_role_id: str) -> list[dict[str, Any]]:
        return list(self._capabilities)

    def capability_links(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._links)

    def capability_standards(
        self, taxonomy_version_id: str
    ) -> list[dict[str, Any]]:
        return list(self._standards)

    def assignments(
        self, taxonomy_version_id: str, dataset_version: str, job_role_id: str
    ) -> list[dict[str, Any]]:
        return list(self._assignments)

    def capability_prerequisites(
        self, job_role_id: str, knowledge_version: str | None
    ) -> list[dict[str, Any]]:
        return list(self._prerequisites)

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
    def node_types(self) -> list[str]:
        return [n["node_type"] for n in self.nodes]

    def edge_types(self) -> list[str]:
        return [e["edge_type"] for e in self.edges]

    def edges_of(self, edge_type: str) -> list[dict[str, Any]]:
        return [e for e in self.edges if e["edge_type"] == edge_type]

    def node_of(self, node_type: str, ref_id: str) -> dict[str, Any] | None:
        for node in self.nodes:
            if node["node_type"] == node_type and node["ref_id"] == ref_id:
                return node
        return None


def _context(taxonomy_version_id: str | None = TAXONOMY_VERSION_ID) -> RunContext:
    return RunContext(
        agent_run_id="run_graph_test",
        analysis_version="an_graph_test",
        dataset_version="ds_test",
        taxonomy_version_id=taxonomy_version_id,
        job_role_id=JOB_ROLE_ID,
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
    )


def _run(repository: FakeSemantic) -> GraphBuildOutcome:
    return SemanticGraphBuilder(repository).run(_context())


# ============================================================ 냉시작
def test_an_empty_dataset_ends_with_the_role_node_only() -> None:
    """차원과 역량이 비어 있는 것이 냉시작의 정상 시작점이다."""
    repository = FakeSemantic()

    outcome = _run(repository)

    assert repository.node_types() == ["JobRole"]
    assert repository.edges == []
    assert outcome.errors == ()
    assert outcome.stop_reason is StopReason.SLOTS_FILLED


def test_an_empty_dataset_records_every_skipped_type() -> None:
    outcome = _run(FakeSemantic())
    skipped = {name for name, _ in outcome.skipped_types}

    assert skipped == {
        "Posting",
        "Company",
        "POSTED_BY",
        "CompanyCluster",
        "BELONGS_TO_CLUSTER",
        "RequirementDimension",
        "Technology",
        "Capability",
        "Standard",
        "MAPS_TO_STANDARD",
        "REQUIRES",
        "REQUIRES_CAPABILITY",
        "PREREQUISITE_OF",
    }


def test_a_missing_job_role_is_an_explicit_failure() -> None:
    outcome = SemanticGraphBuilder(FakeSemantic(role={})).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors != ()


def test_a_run_without_a_taxonomy_version_skips_the_dependent_types() -> None:
    repository = FakeSemantic(dimensions=[_dimension()])

    outcome = SemanticGraphBuilder(repository).run(_context(taxonomy_version_id=None))
    skipped = {name for name, _ in outcome.skipped_types}

    assert {"Technology", "REQUIRES", "REQUIRES_CAPABILITY"} <= skipped
    assert repository.node_of("Technology", "dim_kafka") is None


# ============================================================ 유형 분기
def test_a_technology_dimension_becomes_only_a_technology_node() -> None:
    """`Technology` 는 `RequirementDimension` 의 부분집합이다."""
    repository = FakeSemantic(dimensions=[_dimension(kind="technology")])

    _run(repository)

    assert repository.node_of("Technology", "dim_kafka") is not None
    assert repository.node_of("RequirementDimension", "dim_kafka") is None


def test_a_practice_dimension_becomes_a_requirement_dimension_node() -> None:
    repository = FakeSemantic(
        dimensions=[_dimension("dim_review", kind="practice")]
    )

    _run(repository)

    assert repository.node_of("RequirementDimension", "dim_review") is not None
    assert repository.node_of("Technology", "dim_review") is None


def test_the_node_type_of_a_dimension_follows_its_kind() -> None:
    assert dimension_node_type("technology") == "Technology"
    assert dimension_node_type("tooling") == "RequirementDimension"


# ============================================================ 엣지
def test_a_posting_points_at_its_company() -> None:
    repository = FakeSemantic(postings=[_posting()])

    _run(repository)
    edges = repository.edges_of("POSTED_BY")

    assert len(edges) == 1
    assert edges[0]["src_node_id"] == repository.node_of("Posting", "post_1")["node_id"]
    assert edges[0]["dst_node_id"] == repository.node_of("Company", "co_1")["node_id"]
    assert edges[0]["evidence_id"] is None


def test_a_cluster_membership_carries_its_validity_to_the_edge() -> None:
    repository = FakeSemantic(
        postings=[_posting()],
        memberships=[
            {
                "membership_id": "mem_1",
                "company_id": "co_1",
                "cluster_id": "startup",
                "cluster_label": "스타트업",
                "valid_from": date(2024, 1, 1),
                "valid_to": None,
            }
        ],
    )

    _run(repository)
    edge = repository.edges_of("BELONGS_TO_CLUSTER")[0]

    assert edge["evidence_id"] == "mem_1"
    assert edge["valid_from"] == date(2024, 1, 1)
    assert edge["valid_to"] is None


def test_a_membership_of_a_company_outside_the_dataset_makes_no_node() -> None:
    """소속만으로 회사 노드를 만들지 않는다. 모집단은 공고가 정한다."""
    repository = FakeSemantic(
        memberships=[
            {
                "membership_id": "mem_1",
                "company_id": "co_absent",
                "cluster_id": "startup",
                "cluster_label": "스타트업",
                "valid_from": date(2024, 1, 1),
                "valid_to": None,
            }
        ]
    )

    _run(repository)

    assert repository.node_of("Company", "co_absent") is None
    assert repository.edges_of("BELONGS_TO_CLUSTER") == []


def test_requires_carries_the_taxonomy_version_and_posted_by_does_not() -> None:
    repository = FakeSemantic(
        postings=[_posting()],
        dimensions=[_dimension()],
        assignments=[_assignment("assign_1")],
    )

    _run(repository)

    assert repository.edges_of("REQUIRES")[0]["taxonomy_version_id"] == (
        TAXONOMY_VERSION_ID
    )
    assert repository.edges_of("POSTED_BY")[0]["taxonomy_version_id"] is None


def test_two_assignments_over_one_pair_make_one_edge() -> None:
    """정규화된 요구는 하나다. 근거는 정렬에서 첫 할당이다."""
    repository = FakeSemantic(
        postings=[_posting()],
        dimensions=[_dimension()],
        assignments=[_assignment("assign_1"), _assignment("assign_2")],
    )

    outcome = _run(repository)
    edges = repository.edges_of("REQUIRES")

    assert len(edges) == 1
    assert edges[0]["evidence_id"] == "assign_1"
    assert outcome.reused_edges.get("REQUIRES") == 1


def test_a_capability_link_becomes_an_edge_with_a_composite_evidence() -> None:
    repository = FakeSemantic(
        dimensions=[_dimension()],
        capabilities=[{"capability_id": "cap_1", "canonical_label": "비동기 처리"}],
        links=[
            {
                "capability_id": "cap_1",
                "dimension_id": "dim_kafka",
                "taxonomy_version_id": TAXONOMY_VERSION_ID,
            }
        ],
    )

    _run(repository)
    edge = repository.edges_of("REQUIRES_CAPABILITY")[0]

    assert edge["evidence_id"] == f"cap_1|dim_kafka|{TAXONOMY_VERSION_ID}"
    dimension = repository.node_of("Technology", "dim_kafka")
    assert edge["src_node_id"] == dimension["node_id"]


def test_a_standard_mapping_becomes_a_capability_edge() -> None:
    repository = FakeSemantic(
        capabilities=[{"capability_id": "cap_1", "canonical_label": "비동기 처리"}],
        standards=[
            {
                "capability_id": "cap_1",
                "standard_id": "std_ncs_1",
                "standard_label": "서버프로그램 구현",
                "dimension_version_id": "dimv_1",
            }
        ],
    )

    _run(repository)
    edge = repository.edges_of("MAPS_TO_STANDARD")[0]

    assert edge["evidence_id"] == "dimv_1"
    assert repository.node_of("Standard", "std_ncs_1") is not None


def test_a_prerequisite_without_evidence_is_not_created() -> None:
    """선수 관계는 관측이 아니라 판단이므로 근거 없이 만들지 않는다."""
    repository = FakeSemantic(
        capabilities=[
            {"capability_id": "cap_1", "canonical_label": "비동기 처리"},
            {"capability_id": "cap_2", "canonical_label": "메시지 브로커 운영"},
        ]
    )

    outcome = _run(repository)

    assert repository.edges_of("PREREQUISITE_OF") == []
    assert ("PREREQUISITE_OF", NO_PREREQUISITE_EVIDENCE) in outcome.skipped_types


def test_a_prerequisite_with_standard_evidence_is_created() -> None:
    """근거가 있으면 만든다. 지금은 원천이 없어 이 경로가 비어 있다."""
    repository = FakeSemantic(
        capabilities=[
            {"capability_id": "cap_1", "canonical_label": "비동기 처리"},
            {"capability_id": "cap_2", "canonical_label": "메시지 브로커 운영"},
        ],
        prerequisites=[
            {
                "src_capability_id": "cap_1",
                "dst_capability_id": "cap_2",
                "evidence_id": "std_ncs_1",
            }
        ],
    )

    _run(repository)

    assert repository.edges_of("PREREQUISITE_OF")[0]["evidence_id"] == "std_ncs_1"


# ============================================================ 폐기
def test_an_unregistered_node_type_is_discarded_with_a_reason() -> None:
    """등록 목록에서 `Technology` 를 뺀 온톨로지 버전을 가정한다."""
    without_technology = [t for t in NODE_TYPES if t != "Technology"]
    repository = FakeSemantic(
        rows=_rows(node_types=without_technology), dimensions=[_dimension()]
    )

    outcome = _run(repository)

    assert repository.node_of("Technology", "dim_kafka") is None
    assert [d.reason_code for d in outcome.discarded] == [
        REASON_NODE_TYPE_NOT_REGISTERED
    ]
    assert outcome.discarded[0].target_id == node_identifier(
        "semantic",
        "Technology",
        "requirement_dimensions",
        "dim_kafka",
        ONTOLOGY_VERSION,
    )


def test_a_connection_that_is_not_allowed_is_discarded() -> None:
    """허용 연결을 좁힌 온톨로지 버전에서 기술 차원으로 가는 요구가 폐기된다."""
    narrowed = dict(CONNECTIONS)
    narrowed["REQUIRES"] = {
        "src": ["Posting"],
        "dst": ["RequirementDimension"],
        "taxonomy_version": True,
    }
    repository = FakeSemantic(
        rows=_rows(connections=narrowed),
        postings=[_posting()],
        dimensions=[_dimension()],
        assignments=[_assignment("assign_1")],
    )

    outcome = _run(repository)

    assert repository.edges_of("REQUIRES") == []
    assert [d.reason_code for d in outcome.discarded] == [
        REASON_CONNECTION_NOT_ALLOWED
    ]
    assert outcome.discarded[0].blocks_publication


# ============================================================ 재실행
def test_rerunning_creates_no_duplicate() -> None:
    repository = FakeSemantic(
        postings=[_posting()],
        dimensions=[_dimension()],
        assignments=[_assignment("assign_1")],
    )

    first = _run(repository)
    nodes, edges = len(repository.nodes), len(repository.edges)
    second = _run(repository)

    assert first.node_count > 0 and first.edge_count > 0
    assert (len(repository.nodes), len(repository.edges)) == (nodes, edges)
    assert second.node_count == 0 and second.edge_count == 0
    assert second.reused_nodes["Posting"] == 1
    assert second.stop_reason is StopReason.NO_NEW_EVIDENCE


# ============================================================ 저장 범위
def test_no_edge_is_written_with_a_weight() -> None:
    """그래프는 D3a 에서 구축하고 통계는 D4 에서 계산한다."""
    repository = FakeSemantic(postings=[_posting()])

    _run(repository)

    assert all("weight" not in edge for edge in repository.edges)


def test_only_pre_semantic_edge_types_are_written() -> None:
    repository = FakeSemantic(
        postings=[_posting()],
        dimensions=[_dimension()],
        assignments=[_assignment("assign_1")],
        capabilities=[{"capability_id": "cap_1", "canonical_label": "비동기 처리"}],
        links=[
            {
                "capability_id": "cap_1",
                "dimension_id": "dim_kafka",
                "taxonomy_version_id": TAXONOMY_VERSION_ID,
            }
        ],
    )

    _run(repository)

    assert set(repository.edge_types()) <= PRE_SEMANTIC_EDGE_TYPES
    assert all(e["graph_layer"] == "semantic" for e in repository.edges)


def test_every_written_node_carries_the_run_versions() -> None:
    repository = FakeSemantic(postings=[_posting()])

    _run(repository)
    node = repository.node_of("Posting", "post_1")

    assert node["ontology_version"] == ONTOLOGY_VERSION
    assert node["dataset_version"] == "ds_test"
    assert node["analysis_version"] == "an_graph_test"
    assert node["taxonomy_version_id"] is None


def test_the_repository_belongs_to_the_knowledge_agent() -> None:
    """행 수준 정책이 강제하는 경계를 저장소가 코드에서도 갖는다."""
    assert SemanticGraphRepository.component is Component.AGENT_KNOWLEDGE
    assert can_write(Component.AGENT_KNOWLEDGE, "knowledge_nodes")
    assert can_write(Component.AGENT_KNOWLEDGE, "knowledge_edges")


# ============================================================ 활성 분류체계 버전
class RecordingUnit:
    """저장소가 실제로 실행하는 SQL 을 붙잡는 대역. 데이터베이스에 붙지 않는다."""

    def __init__(self, component: Component) -> None:
        self.component = component
        self.sql = ""
        self.params: dict[str, Any] = {}

    def fetch_one(
        self, sql: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        self.sql = sql
        self.params = dict(params or {})
        return None


def test_the_graph_repository_reads_the_active_taxonomy_version() -> None:
    """`SemanticGraphBuilder` 가 요구하는 값을 그래프 거래 안에서 읽을 수 있어야 한다."""
    unit = RecordingUnit(Component.AGENT_KNOWLEDGE)

    assert SemanticGraphRepository(unit).active_taxonomy_version(JOB_ROLE_ID) is None
    assert unit.params == {"job_role_id": JOB_ROLE_ID}


def test_every_repository_sees_the_same_active_taxonomy_version() -> None:
    """조회가 갈리면 구성요소마다 다른 버전을 보고도 아무 데서도 걸리지 않는다.

    조건은 `requirement_taxonomy_versions` 의 부분 유니크 인덱스와 같아야 한다
    (docs/erd.md 7.2).
    """
    sql = Repository._ACTIVE_TAXONOMY

    assert SemanticGraphRepository._ACTIVE_TAXONOMY == sql
    assert StatisticsRepository._ACTIVE_TAXONOMY == sql
    assert AssignmentRepository._ACTIVE_TAXONOMY == sql
    assert PromotionRepository._ACTIVE_TAXONOMY == sql
    assert "tv.published_at IS NOT NULL" in sql
    assert "tv.superseded_at IS NULL" in sql
