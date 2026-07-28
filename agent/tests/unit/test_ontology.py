"""온톨로지 등록 목록과 후보 검사 검증.

규칙은 docs/ontology-v1.md 2·3·4·7장에서 온다. 등록 목록은 손으로 적지 않고
`0002_seed_reference.sql` 이 실제로 시드한 내용을 읽어 쓴다. 검사기가 문서와
맞아도 시드와 어긋나면 실행에서 다른 판정이 나오기 때문이다.

데이터베이스에 붙지 않는다. 조회가 필요한 두 검사는 대역으로 검사한다.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import pytest

from careersignal.contracts.check_result import CheckName, CheckVerdict, Severity
from careersignal.graph.identifiers import (
    EDGE_PREFIX,
    NODE_PREFIX,
    edge_identifier,
    node_identifier,
)
from careersignal.graph.ontology import (
    CROSS_LAYER_EDGE_TYPES,
    REASON_CONNECTION_NOT_ALLOWED,
    REASON_DERIVATION_MISMATCH,
    REASON_EDGE_TYPE_NOT_REGISTERED,
    REASON_EVIDENCE_MISSING,
    REASON_EVIDENCE_NOT_FOUND,
    REASON_LAYER_BOUNDARY,
    REASON_NODE_TYPE_NOT_REGISTERED,
    REASON_SELF_REFERENCE,
    REASON_TAXONOMY_VERSION_MISMATCH,
    TARGET_EDGE,
    EdgeCandidate,
    GraphLayer,
    NodeCandidate,
    Ontology,
    Violation,
    check_derivation,
    check_evidence_exists,
    discard_record,
    evidence_key,
    evidence_parts,
)

ONTOLOGY_VERSION = "v1"
TAXONOMY_VERSION_ID = "tx_backend_v1"

SEED = (
    Path(__file__).resolve().parents[2]
    / "migrations"
    / "sql"
    / "0002_seed_reference.sql"
)

SEMANTIC_NODE_TYPES = {
    "JobRole",
    "Posting",
    "Company",
    "CompanyCluster",
    "RequirementDimension",
    "Capability",
    "Technology",
    "Standard",
    "ProofArtifact",
    "Channel",
    "LearningResource",
    "Project",
}
"""docs/ontology-v1.md 2.1의 노드 유형. D5 이후 넷을 포함한다."""

PROVENANCE_NODE_TYPES = {
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
}
"""docs/ontology-v1.md 3.1의 노드 유형."""


def _seed_rows() -> list[dict[str, Any]]:
    """`0002_seed_reference.sql` 의 `ontology_versions` INSERT 를 행으로 읽는다."""
    text = SEED.read_text(encoding="utf-8")
    start = text.index("INSERT INTO ontology_versions")
    block = text[start : text.index(";", start)]
    literals = re.findall(r"'(\[.*?\]|\{.*?\})'::jsonb", block, re.DOTALL)
    layers = re.findall(r"'(semantic|provenance)'", block)
    assert len(layers) == 2
    assert len(literals) == 4 * len(layers)

    rows = []
    for index, layer in enumerate(layers):
        node_types, edge_types, connections, evidence = literals[
            index * 4 : index * 4 + 4
        ]
        rows.append(
            {
                "ontology_version": ONTOLOGY_VERSION,
                "graph_layer": layer,
                "node_types": json.loads(node_types),
                "edge_types": json.loads(edge_types),
                "allowed_connections": json.loads(connections),
                "required_evidence_by_edge_type": json.loads(evidence),
            }
        )
    return rows


@pytest.fixture(scope="module")
def ontology() -> Ontology:
    return Ontology.from_rows(_seed_rows())


def _node(
    node_type: str,
    ref_id: str = "ref_1",
    graph_layer: GraphLayer = GraphLayer.SEMANTIC,
    ref_table: str = "some_table",
    taxonomy_version_id: str | None = None,
) -> NodeCandidate:
    return NodeCandidate(
        node_id=node_identifier(
            str(graph_layer), node_type, ref_table, ref_id, ONTOLOGY_VERSION
        ),
        graph_layer=graph_layer,
        node_type=node_type,
        ref_table=ref_table,
        ref_id=ref_id,
        label=ref_id,
        taxonomy_version_id=taxonomy_version_id,
    )


def _edge(
    edge_type: str,
    src: NodeCandidate,
    dst: NodeCandidate,
    graph_layer: GraphLayer = GraphLayer.SEMANTIC,
    evidence_id: str | None = None,
    taxonomy_version_id: str | None = None,
) -> EdgeCandidate:
    return EdgeCandidate(
        edge_id=edge_identifier(
            str(graph_layer),
            edge_type,
            src.node_id,
            dst.node_id,
            ONTOLOGY_VERSION,
            taxonomy_version_id,
        ),
        graph_layer=graph_layer,
        edge_type=edge_type,
        src=src.ref,
        dst=dst.ref,
        evidence_id=evidence_id,
        taxonomy_version_id=taxonomy_version_id,
    )


def _codes(violations: tuple[Violation, ...]) -> set[str]:
    return {v.reason_code for v in violations}


class FakeLookup:
    """조회가 필요한 두 검사의 대역. SQL 을 실행하지 않는다."""

    def __init__(self, evidence: bool = True, derived: bool = True) -> None:
        self._evidence = evidence
        self._derived = derived
        self.asked: list[tuple[str, str]] = []

    def evidence_exists(self, evidence_kind: str, evidence_id: str) -> bool:
        self.asked.append((evidence_kind, evidence_id))
        return self._evidence

    def derivation_matches(
        self,
        edge_type: str,
        evidence_id: str | None,
        src_ref_id: str,
        dst_ref_id: str,
    ) -> bool:
        return self._derived


# ============================================================ 시드와의 일치
def test_the_seed_registers_both_layers(ontology: Ontology) -> None:
    assert set(ontology.layers) == {GraphLayer.SEMANTIC, GraphLayer.PROVENANCE}


def test_registered_node_types_match_the_ontology_document(
    ontology: Ontology,
) -> None:
    assert set(ontology.layer(GraphLayer.SEMANTIC).node_types) == SEMANTIC_NODE_TYPES
    assert (
        set(ontology.layer(GraphLayer.PROVENANCE).node_types) == PROVENANCE_NODE_TYPES
    )


def test_every_registered_edge_type_declares_allowed_connections(
    ontology: Ontology,
) -> None:
    """허용 연결이 없는 엣지 유형은 무엇을 이어도 폐기된다."""
    for layer in ontology.layers.values():
        assert set(layer.edge_types) == set(layer.connections)


def test_technology_is_a_destination_of_the_same_edges_as_the_dimension(
    ontology: Ontology,
) -> None:
    """`Technology` 는 `RequirementDimension` 의 부분집합이다."""
    semantic = ontology.layer(GraphLayer.SEMANTIC)
    assert set(semantic.rule("REQUIRES").dst) == {"RequirementDimension", "Technology"}
    assert set(semantic.rule("REQUIRES_CAPABILITY").src) == {
        "RequirementDimension",
        "Technology",
    }


def test_only_assigned_to_leaves_the_provenance_layer(ontology: Ontology) -> None:
    """semantic 노드를 도착점으로 갖는 provenance 엣지가 `ASSIGNED_TO` 뿐이다."""
    provenance = ontology.layer(GraphLayer.PROVENANCE)
    crossing = {
        edge_type
        for edge_type, rule in provenance.connections.items()
        if not set(rule.dst) <= PROVENANCE_NODE_TYPES
    }
    assert crossing == set(CROSS_LAYER_EDGE_TYPES)


def test_taxonomy_dependent_edges_match_the_schema_document(
    ontology: Ontology,
) -> None:
    """분류체계에 의존하는 엣지는 셋이다. docs/knowledge-schema.md 7.4다."""
    dependent = {
        edge_type
        for layer in ontology.layers.values()
        for edge_type, rule in layer.connections.items()
        if rule.taxonomy_version
    }
    assert dependent == {"REQUIRES", "REQUIRES_CAPABILITY", "ASSIGNED_TO"}


def test_prerequisite_of_requires_evidence(ontology: Ontology) -> None:
    """선수 관계는 관측이 아니라 판단이므로 근거 없이 만들지 않는다."""
    semantic = ontology.layer(GraphLayer.SEMANTIC)
    assert semantic.evidence_kind("PREREQUISITE_OF") is not None
    assert semantic.evidence_kind("POSTED_BY") is None


# ============================================================ 유형 등록
def test_an_unregistered_node_type_is_discarded(ontology: Ontology) -> None:
    violations = ontology.check_node(_node("Mascot"))

    assert _codes(violations) == {REASON_NODE_TYPE_NOT_REGISTERED}


def test_a_provenance_node_type_is_not_registered_in_the_semantic_layer(
    ontology: Ontology,
) -> None:
    """층마다 등록 목록이 다르다. 같은 이름이라도 다른 층에서는 미등록이다."""
    violations = ontology.check_node(_node("Chunk"))

    assert _codes(violations) == {REASON_NODE_TYPE_NOT_REGISTERED}


def test_an_unregistered_edge_type_is_discarded(ontology: Ontology) -> None:
    edge = _edge("MENTIONS", _node("Posting"), _node("Company"))

    violations = ontology.check_edge(edge)

    assert _codes(violations) == {REASON_EDGE_TYPE_NOT_REGISTERED}


def test_an_unregistered_edge_type_hides_the_other_checks(ontology: Ontology) -> None:
    """기준이 되는 허용 연결과 필수 근거의 정의가 없으므로 나머지를 따지지 않는다."""
    edge = _edge("MENTIONS", _node("Chunk"), _node("Company"))

    assert len(ontology.check_edge(edge)) == 1


# ============================================================ 연결 허용
def test_a_reversed_direction_is_discarded(ontology: Ontology) -> None:
    """`POSTED_BY` 는 공고에서 회사로 간다. 반대 방향은 등록되어 있지 않다."""
    edge = _edge("POSTED_BY", _node("Company"), _node("Posting"))

    assert REASON_CONNECTION_NOT_ALLOWED in _codes(ontology.check_edge(edge))


def test_an_unlisted_source_and_destination_pair_is_discarded(
    ontology: Ontology,
) -> None:
    edge = _edge(
        "MAPS_TO_STANDARD",
        _node("Posting"),
        _node("Standard"),
        evidence_id="dimv_1",
    )

    assert REASON_CONNECTION_NOT_ALLOWED in _codes(ontology.check_edge(edge))


def test_a_self_edge_is_discarded_except_for_prerequisite_of(
    ontology: Ontology,
) -> None:
    """자기 참조를 허용하는 유형은 `PREREQUISITE_OF` 하나다(docs/erd.md 8.3)."""
    capability = _node("Capability", "cap_1")
    loop = _edge("MAPS_TO_STANDARD", capability, capability, evidence_id="dimv_1")
    allowed = _edge("PREREQUISITE_OF", capability, capability, evidence_id="std_1")

    assert REASON_SELF_REFERENCE in _codes(ontology.check_edge(loop))
    assert REASON_SELF_REFERENCE not in _codes(ontology.check_edge(allowed))


# ============================================================ 근거 존재
def test_an_edge_without_its_required_evidence_is_discarded(
    ontology: Ontology,
) -> None:
    edge = _edge(
        "PREREQUISITE_OF", _node("Capability", "cap_1"), _node("Capability", "cap_2")
    )

    assert REASON_EVIDENCE_MISSING in _codes(ontology.check_edge(edge))


def test_an_edge_that_stands_on_a_foreign_key_needs_no_evidence(
    ontology: Ontology,
) -> None:
    edge = _edge("POSTED_BY", _node("Posting"), _node("Company", "co_1"))

    assert ontology.check_edge(edge) == ()


# ============================================================ 버전 일치
def test_a_taxonomy_dependent_edge_without_a_version_is_discarded(
    ontology: Ontology,
) -> None:
    edge = _edge(
        "REQUIRES",
        _node("Posting"),
        _node("Technology", "dim_1", taxonomy_version_id=TAXONOMY_VERSION_ID),
        evidence_id="assign_1",
    )

    violations = ontology.check_edge(edge, TAXONOMY_VERSION_ID)

    assert REASON_TAXONOMY_VERSION_MISMATCH in _codes(violations)


def test_a_taxonomy_dependent_edge_from_another_version_is_discarded(
    ontology: Ontology,
) -> None:
    edge = _edge(
        "REQUIRES",
        _node("Posting"),
        _node("Technology", "dim_1", taxonomy_version_id=TAXONOMY_VERSION_ID),
        evidence_id="assign_1",
        taxonomy_version_id="tx_backend_v2",
    )

    violations = ontology.check_edge(edge, TAXONOMY_VERSION_ID)

    assert REASON_TAXONOMY_VERSION_MISMATCH in _codes(violations)


def test_an_independent_edge_carrying_a_taxonomy_version_is_discarded(
    ontology: Ontology,
) -> None:
    """분류체계에 의존하지 않는 엣지는 버전을 비운다(docs/erd.md 8.3)."""
    edge = _edge(
        "POSTED_BY",
        _node("Posting"),
        _node("Company", "co_1"),
        taxonomy_version_id=TAXONOMY_VERSION_ID,
    )

    violations = ontology.check_edge(edge, TAXONOMY_VERSION_ID)

    assert REASON_TAXONOMY_VERSION_MISMATCH in _codes(violations)


def test_only_dimension_nodes_carry_a_taxonomy_version(ontology: Ontology) -> None:
    dimension = _node("Technology", "dim_1", taxonomy_version_id=TAXONOMY_VERSION_ID)
    company = _node("Company", "co_1", taxonomy_version_id=TAXONOMY_VERSION_ID)

    assert ontology.check_node(dimension, TAXONOMY_VERSION_ID) == ()
    assert REASON_TAXONOMY_VERSION_MISMATCH in _codes(
        ontology.check_node(company, TAXONOMY_VERSION_ID)
    )


# ============================================================ 층 경계
def test_assigned_to_may_end_on_a_semantic_node(ontology: Ontology) -> None:
    edge = _edge(
        "ASSIGNED_TO",
        _node("RequirementMention", "mention_1", GraphLayer.PROVENANCE),
        _node("Technology", "dim_1", taxonomy_version_id=TAXONOMY_VERSION_ID),
        graph_layer=GraphLayer.PROVENANCE,
        evidence_id="assign_1",
        taxonomy_version_id=TAXONOMY_VERSION_ID,
    )

    assert ontology.check_edge(edge, TAXONOMY_VERSION_ID) == ()


def test_another_provenance_edge_may_not_end_on_a_semantic_node(
    ontology: Ontology,
) -> None:
    """`ASSIGNED_TO` 말고는 두 층을 잇지 않는다."""
    edge = _edge(
        "EVIDENCED_BY",
        _node("RequirementMention", "mention_1", GraphLayer.PROVENANCE),
        _node("Capability", "cap_1"),
        graph_layer=GraphLayer.PROVENANCE,
        evidence_id="mention_1",
    )

    assert REASON_LAYER_BOUNDARY in _codes(ontology.check_edge(edge))


def test_a_semantic_edge_may_not_start_on_a_provenance_node(
    ontology: Ontology,
) -> None:
    edge = _edge(
        "POSTED_BY",
        _node("Posting", "posting_1", GraphLayer.PROVENANCE),
        _node("Company", "co_1"),
    )

    assert REASON_LAYER_BOUNDARY in _codes(ontology.check_edge(edge))


# ============================================================ 조회가 필요한 검사
def test_evidence_that_points_at_nothing_is_discarded(ontology: Ontology) -> None:
    edge = _edge(
        "MAPS_TO_STANDARD",
        _node("Capability", "cap_1"),
        _node("Standard", "std_1"),
        evidence_id="dimv_1",
    )
    lookup = FakeLookup(evidence=False)

    violations = check_evidence_exists(ontology, edge, lookup)

    assert _codes(violations) == {REASON_EVIDENCE_NOT_FOUND}
    assert lookup.asked == [("dimension_version_mapping", "dimv_1")]


def test_evidence_that_resolves_passes(ontology: Ontology) -> None:
    edge = _edge(
        "MAPS_TO_STANDARD",
        _node("Capability", "cap_1"),
        _node("Standard", "std_1"),
        evidence_id="dimv_1",
    )

    assert check_evidence_exists(ontology, edge, FakeLookup()) == ()


def test_an_edge_without_declared_evidence_is_not_asked_about(
    ontology: Ontology,
) -> None:
    """시드가 `BELONGS_TO_CLUSTER` 에 필수 근거를 선언하지 않는다.

    검사기는 문서가 아니라 등록 목록을 따른다. 시드가 요구하지 않는 근거를
    검사기가 요구하면 실행에서 만들 수 있는 엣지가 폐기된다.
    """
    edge = _edge(
        "BELONGS_TO_CLUSTER",
        _node("Company", "co_1"),
        _node("CompanyCluster", "cl_1"),
        evidence_id="mem_1",
    )
    lookup = FakeLookup(evidence=False)

    assert check_evidence_exists(ontology, edge, lookup) == ()
    assert lookup.asked == []


def test_a_derived_edge_that_disagrees_with_its_source_row_is_discarded() -> None:
    edge = _edge(
        "REQUIRES",
        _node("Posting"),
        _node("Technology", "dim_1", taxonomy_version_id=TAXONOMY_VERSION_ID),
        evidence_id="assign_1",
        taxonomy_version_id=TAXONOMY_VERSION_ID,
    )

    violations = check_derivation(edge, FakeLookup(derived=False))

    assert _codes(violations) == {REASON_DERIVATION_MISMATCH}


def test_an_edge_that_is_not_derived_skips_the_derivation_check() -> None:
    """`POSTED_BY` 는 외래키로 성립하므로 원천 행과 대조할 것이 없다."""
    edge = _edge("POSTED_BY", _node("Posting"), _node("Company", "co_1"))

    assert check_derivation(edge, FakeLookup(derived=False)) == ()


# ============================================================ 폐기 기록
def test_a_discard_is_recorded_as_a_blocking_schema_failure() -> None:
    record = discard_record(
        TARGET_EDGE,
        "edge_1",
        Violation(reason_code=REASON_LAYER_BOUNDARY, detail={"edge_type": "PART_OF"}),
    )

    assert record.check is CheckName.SCHEMA
    assert record.verdict is CheckVerdict.FAIL
    assert record.severity is Severity.BLOCKING
    assert record.reason_code == REASON_LAYER_BOUNDARY
    assert record.blocks_publication
    assert record.detail == {"edge_type": "PART_OF"}


# ============================================================ 식별자
def test_the_same_material_gives_the_same_node_identifier() -> None:
    first = node_identifier("semantic", "Company", "companies", "co_1", "v1")
    second = node_identifier("semantic", "Company", "companies", "co_1", "v1")

    assert first == second
    assert first.startswith(NODE_PREFIX)


def test_two_node_types_over_one_reference_are_different_nodes() -> None:
    """같은 차원을 두 유형으로 만들면 유일 제약이 막지 못하는 중복이 된다."""
    technology = node_identifier(
        "semantic", "Technology", "requirement_dimensions", "dim_1", "v1"
    )
    dimension = node_identifier(
        "semantic", "RequirementDimension", "requirement_dimensions", "dim_1", "v1"
    )

    assert technology != dimension


def test_an_ontology_version_change_gives_a_new_node_identifier() -> None:
    assert node_identifier(
        "semantic", "Company", "companies", "co_1", "v1"
    ) != node_identifier("semantic", "Company", "companies", "co_1", "v2")


def test_the_same_pair_gives_the_same_edge_identifier() -> None:
    first = edge_identifier("semantic", "REQUIRES", "node_a", "node_b", "v1", "tx_1")
    second = edge_identifier("semantic", "REQUIRES", "node_a", "node_b", "v1", "tx_1")

    assert first == second
    assert first.startswith(EDGE_PREFIX)


def test_the_evidence_does_not_change_the_edge_identifier() -> None:
    """한 공고가 같은 차원을 여러 번 요구해도 정규화된 요구는 하나다."""
    plain = edge_identifier("semantic", "REQUIRES", "node_a", "node_b", "v1", "tx_1")
    other = edge_identifier("semantic", "REQUIRES", "node_a", "node_b", "v1", "tx_2")

    assert plain != other


def test_a_composite_evidence_key_survives_a_round_trip() -> None:
    key = evidence_key("cap_1", "dim_1", TAXONOMY_VERSION_ID)

    assert evidence_parts(key) == ("cap_1", "dim_1", TAXONOMY_VERSION_ID)


# ============================================================ 적재
def test_an_empty_ontology_row_set_is_refused() -> None:
    with pytest.raises(ValueError):
        Ontology.from_rows([])


def test_an_unregistered_layer_is_refused(ontology: Ontology) -> None:
    single = Ontology.from_rows(_seed_rows()[:1])

    with pytest.raises(KeyError):
        single.layer(GraphLayer.PROVENANCE)
