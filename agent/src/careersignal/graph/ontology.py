"""온톨로지 등록 목록과 노드·엣지 후보 검사.

등록 내용은 `ontology_versions` 행이며(docs/erd.md 8.1) 그 정의는
docs/ontology-v1.md 2·3·4장이다. 검사 일곱 종은 같은 문서 7장이다.

이 모듈은 저장소를 import 하지 않는다. 일곱 검사 가운데 다섯은 후보만으로
판정하고, `근거 실재` 와 `파생 일치` 는 원천 행을 봐야 하므로 `OntologyLookup`
을 통해 판정한다. 순수 판정과 조회를 나누면 등록 목록의 해석을 데이터베이스
없이 검사할 수 있다.

위반한 후보는 폐기하고 `CheckResult` 로 사유를 남긴다. 기록을 `verification_results`
에 넣는 것은 검증 파이프라인이다. 그래프를 쓰는 두 구성요소는 그 표의 쓰기 범위를
갖지 않는다(docs/permission-matrix.md 3장).

층 구축의 공통 절차도 여기 둔다. semantic 층과 provenance 층이 같은 검사와 같은
중복 제거를 지나므로, 두 빌더가 후보를 만드는 일만 맡고 검사·저장·집계는 이
모듈의 `LayerBuild` 하나를 공유한다.
"""

from __future__ import annotations

from collections.abc import Callable, Mapping, Sequence
from enum import StrEnum
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.check_result import (
    CheckName,
    CheckResult,
    CheckVerdict,
    Severity,
)
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.contracts.verification import TypedVerdict
from careersignal.graph.identifiers import edge_identifier, node_identifier
from careersignal.repositories.base import item_savepoint, transaction_is_dead

TRANSACTION_LOST = "거래가 죽어 남은 노드와 엣지를 저장하지 못한다"
"""저장이 거래를 죽이는 실패를 냈다. 남은 항목을 시도하지 않고 멈춘 사유다.

PostgreSQL 은 거래 안에서 오류가 나면 남은 명령을 전부 거부한다. 죽은 거래에 계속
저장하면 같은 사유의 실패 줄이 항목 수만큼 쌓인다. 저장하지 못한 항목은 식별자가
결정적이므로 다음 실행이 같은 자리에서 다시 만든다.
"""


class GraphLayer(StrEnum):
    """그래프의 두 논리 층. `knowledge_nodes.graph_layer` 의 CHECK 와 같은 집합이다."""

    SEMANTIC = "semantic"
    PROVENANCE = "provenance"


TARGET_NODE = "knowledge_node"
TARGET_EDGE = "knowledge_edge"
"""폐기 기록의 `target_type`. 대상은 산출물이 아니라 그래프 원소다."""

REASON_NODE_TYPE_NOT_REGISTERED = "ONTOLOGY_NODE_TYPE_NOT_REGISTERED"
REASON_EDGE_TYPE_NOT_REGISTERED = "ONTOLOGY_EDGE_TYPE_NOT_REGISTERED"
REASON_CONNECTION_NOT_ALLOWED = "ONTOLOGY_CONNECTION_NOT_ALLOWED"
REASON_SELF_REFERENCE = "ONTOLOGY_SELF_REFERENCE"
REASON_EVIDENCE_MISSING = "ONTOLOGY_EVIDENCE_MISSING"
REASON_EVIDENCE_NOT_FOUND = "ONTOLOGY_EVIDENCE_NOT_FOUND"
REASON_TAXONOMY_VERSION_MISMATCH = "ONTOLOGY_TAXONOMY_VERSION_MISMATCH"
REASON_DERIVATION_MISMATCH = "ONTOLOGY_DERIVATION_MISMATCH"
REASON_LAYER_BOUNDARY = "ONTOLOGY_LAYER_BOUNDARY"
REASON_ENDPOINT_NOT_FOUND = "GRAPH_ENDPOINT_NOT_FOUND"
"""폐기 사유. 앞의 아홉은 docs/ontology-v1.md 7장의 검사에 대응한다.

`GRAPH_ENDPOINT_NOT_FOUND` 는 검사가 아니라 구축의 전제다. 끝점 노드가 아직
없으면 외래키가 성립하지 않으므로 엣지를 만들지 않는다.
"""

TAXONOMY_NODE_TYPES: frozenset[str] = frozenset({"RequirementDimension", "Technology"})
"""분류체계에 의존하는 노드 유형. 정의는 docs/knowledge-schema.md 7.4다."""

DERIVED_EDGE_TYPES: frozenset[str] = frozenset(
    {
        "BELONGS_TO_CLUSTER",
        "REQUIRES",
        "SUPPORTED_BY",
        "CONTRADICTED_BY",
        "DERIVED_FROM",
        "FILLS",
        "PROVEN_BY",
        "USED_IN_CHANNEL",
        "TEACHES",
        "ASSIGNED_TO",
    }
)
"""관계형 테이블에서 빌드한 파생 엣지. 정의는 docs/ontology-v1.md 5장이다.

진실의 원천은 근거 표의 정규 테이블이며 엣지는 경로 탐색을 위한 표현이다.
"""

CROSS_LAYER_EDGE_TYPES: frozenset[str] = frozenset({"ASSIGNED_TO"})
"""semantic 노드를 도착점으로 갖는 provenance 엣지. `ASSIGNED_TO` 하나뿐이다."""

EVIDENCE_SEPARATOR = "|"
"""복합키 근거의 구분자. `capability_dimension_links` 처럼 키가 여럿인 근거에 쓴다."""

EDGE_VERIFICATION_STATUS = str(TypedVerdict.VERIFIED)
"""저장하는 엣지의 `verification_status`.

검사를 통과한 후보만 저장하므로 저장 시점의 상태는 통과다. 이후 검증이
불일치를 찾으면 검증 파이프라인이 상태를 낮춘다.
"""


def evidence_key(*parts: str) -> str:
    """복합키 근거를 `evidence_id` 한 값으로 만든다."""
    return EVIDENCE_SEPARATOR.join(parts)


def evidence_parts(evidence_id: str) -> tuple[str, ...]:
    """복합키 근거를 다시 나눈다. 조회하는 쪽이 컬럼 순서를 안다."""
    return tuple(evidence_id.split(EVIDENCE_SEPARATOR))


# ============================================================ 후보
class NodeRef(BaseModel):
    """엣지가 끝점을 가리키는 데 필요한 만큼의 노드."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    node_id: str
    graph_layer: GraphLayer
    node_type: str
    ref_id: str


class NodeCandidate(BaseModel):
    """저장 전의 노드 하나. 컬럼은 docs/erd.md 8.2다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    node_id: str
    graph_layer: GraphLayer
    node_type: str
    ref_table: str
    ref_id: str
    label: str
    taxonomy_version_id: str | None = None

    @property
    def ref(self) -> NodeRef:
        return NodeRef(
            node_id=self.node_id,
            graph_layer=self.graph_layer,
            node_type=self.node_type,
            ref_id=self.ref_id,
        )


class EdgeCandidate(BaseModel):
    """저장 전의 엣지 하나. 컬럼은 docs/erd.md 8.3이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    edge_id: str
    graph_layer: GraphLayer
    edge_type: str
    src: NodeRef
    dst: NodeRef
    evidence_id: str | None = None
    taxonomy_version_id: str | None = None


class Violation(BaseModel):
    """폐기 사유 하나."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    reason_code: str
    detail: dict[str, Any] = Field(default_factory=dict)


def discard_record(
    target_type: str, target_id: str, violation: Violation
) -> CheckResult:
    """폐기를 `verification_results` 한 행의 모양으로 옮긴다.

    검사 이름은 스키마 검사다. 유형 등록, 허용 연결, 필수 근거는 모두 허용 값의
    문제이며 docs/agent-design.md 9장의 검사 1이 담는 범위다.

    `repair_action` 을 비운다. 폐기한 엣지는 원천 테이블이 고쳐진 뒤 재구축으로
    복구하며, 에이전트가 수리할 대상이 아니다.
    """
    return CheckResult(
        check=CheckName.SCHEMA,
        target_type=target_type,
        target_id=target_id,
        verdict=CheckVerdict.FAIL,
        severity=Severity.BLOCKING,
        reason_code=violation.reason_code,
        detail=dict(violation.detail),
    )


# ============================================================ 등록 목록
class ConnectionRule(BaseModel):
    """엣지 유형 하나의 허용 연결. `allowed_connections` 의 값 하나다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    src: tuple[str, ...]
    dst: tuple[str, ...]
    taxonomy_version: bool = False


class OntologyLayer(BaseModel):
    """`ontology_versions` 한 행. 층 하나의 등록 목록이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    ontology_version: str
    graph_layer: GraphLayer
    node_types: tuple[str, ...]
    edge_types: tuple[str, ...]
    connections: dict[str, ConnectionRule]
    required_evidence: dict[str, str]

    def has_node_type(self, node_type: str) -> bool:
        return node_type in self.node_types

    def has_edge_type(self, edge_type: str) -> bool:
        return edge_type in self.edge_types

    def rule(self, edge_type: str) -> ConnectionRule | None:
        return self.connections.get(edge_type)

    def evidence_kind(self, edge_type: str) -> str | None:
        """이 엣지가 요구하는 근거의 종류. 없으면 외래키로 성립하는 엣지다."""
        return self.required_evidence.get(edge_type)

    @classmethod
    def from_row(cls, row: Mapping[str, Any]) -> OntologyLayer:
        connections = {
            edge_type: ConnectionRule(
                src=tuple(rule["src"]),
                dst=tuple(rule["dst"]),
                taxonomy_version=bool(rule.get("taxonomy_version", False)),
            )
            for edge_type, rule in row["allowed_connections"].items()
        }
        return cls(
            ontology_version=row["ontology_version"],
            graph_layer=GraphLayer(row["graph_layer"]),
            node_types=tuple(row["node_types"]),
            edge_types=tuple(row["edge_types"]),
            connections=connections,
            required_evidence=dict(row["required_evidence_by_edge_type"]),
        )


class Ontology(BaseModel):
    """한 온톨로지 버전의 두 층.

    층 경계 검사가 도착 노드의 층을 봐야 하므로 두 층을 함께 담는다.
    `ontology_version` 과 `graph_layer` 가 복합 기본키이며 두 층은 독립적으로
    버전을 올린다(docs/ontology-v1.md 1장). 이 모델은 같은 버전의 두 행을 묶은
    것이며 층별 버전이 갈리면 층마다 따로 만든다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    layers: dict[GraphLayer, OntologyLayer]

    @classmethod
    def from_rows(cls, rows: Sequence[Mapping[str, Any]]) -> Ontology:
        """`ontology_versions` 조회 결과를 그대로 받는다."""
        layers = {}
        for row in rows:
            layer = OntologyLayer.from_row(row)
            layers[layer.graph_layer] = layer
        if not layers:
            raise ValueError("온톨로지 버전 행이 없다")
        return cls(layers=layers)

    def layer(self, graph_layer: GraphLayer) -> OntologyLayer:
        if graph_layer not in self.layers:
            raise KeyError(f"{graph_layer} 층이 등록되어 있지 않다")
        return self.layers[graph_layer]

    def node_layer(self, node_type: str) -> GraphLayer | None:
        """이 유형이 등록된 층. 어느 층에도 없으면 비운다."""
        for graph_layer, layer in self.layers.items():
            if layer.has_node_type(node_type):
                return graph_layer
        return None

    # -------------------------------------------------------- 순수 검사
    def check_node(
        self, node: NodeCandidate, taxonomy_version_id: str | None = None
    ) -> tuple[Violation, ...]:
        """노드 후보를 판정한다. 유형 등록과 버전 일치 둘이다."""
        layer = self.layer(node.graph_layer)
        if not layer.has_node_type(node.node_type):
            return (
                Violation(
                    reason_code=REASON_NODE_TYPE_NOT_REGISTERED,
                    detail={
                        "graph_layer": str(node.graph_layer),
                        "node_type": node.node_type,
                    },
                ),
            )

        found: list[Violation] = []
        dependent = node.node_type in TAXONOMY_NODE_TYPES
        expected = taxonomy_version_id if dependent else None
        if node.taxonomy_version_id != expected:
            found.append(
                Violation(
                    reason_code=REASON_TAXONOMY_VERSION_MISMATCH,
                    detail={
                        "node_type": node.node_type,
                        "expected": expected,
                        "found": node.taxonomy_version_id,
                    },
                )
            )
        return tuple(found)

    def check_edge(
        self, edge: EdgeCandidate, taxonomy_version_id: str | None = None
    ) -> tuple[Violation, ...]:
        """엣지 후보를 판정한다.

        유형 등록, 연결 허용, 근거 존재, 버전 일치, 층 경계 다섯이다. 나머지 둘은
        원천 행을 봐야 하므로 `check_evidence_exists` 와 `check_derivation` 이 맡는다.

        유형이 등록되지 않았으면 나머지를 따지지 않는다. 허용 연결과 필수 근거의
        정의가 유형별로 달려 있어 기준이 없기 때문이다.
        """
        layer = self.layer(edge.graph_layer)
        if not layer.has_edge_type(edge.edge_type):
            return (
                Violation(
                    reason_code=REASON_EDGE_TYPE_NOT_REGISTERED,
                    detail={
                        "graph_layer": str(edge.graph_layer),
                        "edge_type": edge.edge_type,
                    },
                ),
            )

        found: list[Violation] = []
        rule = layer.rule(edge.edge_type)
        if (
            rule is None
            or edge.src.node_type not in rule.src
            or edge.dst.node_type not in rule.dst
        ):
            found.append(
                Violation(
                    reason_code=REASON_CONNECTION_NOT_ALLOWED,
                    detail={
                        "edge_type": edge.edge_type,
                        "src": edge.src.node_type,
                        "dst": edge.dst.node_type,
                    },
                )
            )

        if edge.src.node_id == edge.dst.node_id and edge.edge_type != "PREREQUISITE_OF":
            found.append(
                Violation(
                    reason_code=REASON_SELF_REFERENCE,
                    detail={"edge_type": edge.edge_type, "node_id": edge.src.node_id},
                )
            )

        found.extend(self._check_evidence_declared(layer, edge))
        found.extend(self._check_taxonomy_version(rule, edge, taxonomy_version_id))
        found.extend(self._check_layer_boundary(edge))
        return tuple(found)

    @staticmethod
    def _check_evidence_declared(
        layer: OntologyLayer, edge: EdgeCandidate
    ) -> tuple[Violation, ...]:
        """근거 존재. 요구하는 엣지의 `evidence_id` 가 비어 있으면 폐기한다."""
        kind = layer.evidence_kind(edge.edge_type)
        if kind is None or edge.evidence_id:
            return ()
        return (
            Violation(
                reason_code=REASON_EVIDENCE_MISSING,
                detail={"edge_type": edge.edge_type, "evidence_kind": kind},
            ),
        )

    @staticmethod
    def _check_taxonomy_version(
        rule: ConnectionRule | None,
        edge: EdgeCandidate,
        taxonomy_version_id: str | None,
    ) -> tuple[Violation, ...]:
        """버전 일치. 의존 엣지는 실행 컨텍스트와 같은 분류체계 버전을 갖는다."""
        dependent = rule is not None and rule.taxonomy_version
        expected = taxonomy_version_id if dependent else None
        matched = edge.taxonomy_version_id == expected
        if matched and not (dependent and expected is None):
            return ()
        return (
            Violation(
                reason_code=REASON_TAXONOMY_VERSION_MISMATCH,
                detail={
                    "edge_type": edge.edge_type,
                    "expected": expected,
                    "found": edge.taxonomy_version_id,
                },
            ),
        )

    @staticmethod
    def _check_layer_boundary(edge: EdgeCandidate) -> tuple[Violation, ...]:
        """층 경계.

        엣지의 끝점은 엣지와 같은 층에 있다. 예외는 `ASSIGNED_TO` 하나이며 이
        엣지만 semantic 노드를 도착점으로 갖는다. 원문 표현에서 정규화된 차원으로
        이어지는 계보라 두 층을 잇는다(docs/ontology-v1.md 3.2).
        """
        crossing = edge.edge_type in CROSS_LAYER_EDGE_TYPES
        bad_src = edge.src.graph_layer is not edge.graph_layer
        bad_dst = edge.dst.graph_layer is not edge.graph_layer and not (
            crossing
            and edge.graph_layer is GraphLayer.PROVENANCE
            and edge.dst.graph_layer is GraphLayer.SEMANTIC
        )
        if not bad_src and not bad_dst:
            return ()
        return (
            Violation(
                reason_code=REASON_LAYER_BOUNDARY,
                detail={
                    "edge_type": edge.edge_type,
                    "graph_layer": str(edge.graph_layer),
                    "src_layer": str(edge.src.graph_layer),
                    "dst_layer": str(edge.dst.graph_layer),
                },
            ),
        )


# ============================================================ 조회가 필요한 검사
class OntologyLookup(Protocol):
    """저장소 조회가 필요한 두 검사가 요구하는 것.

    좁게 잡아 대역으로 검증할 수 있게 한다. 저장소가 이 모양을 만족한다.
    """

    def evidence_exists(self, evidence_kind: str, evidence_id: str) -> bool: ...

    def derivation_matches(
        self,
        edge_type: str,
        evidence_id: str | None,
        src_ref_id: str,
        dst_ref_id: str,
    ) -> bool: ...


def check_evidence_exists(
    ontology: Ontology, edge: EdgeCandidate, lookup: OntologyLookup
) -> tuple[Violation, ...]:
    """근거 실재. `evidence_id` 가 가리키는 행이 실제로 있는지 본다."""
    kind = ontology.layer(edge.graph_layer).evidence_kind(edge.edge_type)
    if kind is None or not edge.evidence_id:
        return ()
    if lookup.evidence_exists(kind, edge.evidence_id):
        return ()
    return (
        Violation(
            reason_code=REASON_EVIDENCE_NOT_FOUND,
            detail={
                "edge_type": edge.edge_type,
                "evidence_kind": kind,
                "evidence_id": edge.evidence_id,
            },
        ),
    )


def check_derivation(
    edge: EdgeCandidate, lookup: OntologyLookup
) -> tuple[Violation, ...]:
    """파생 일치. 파생 엣지의 두 끝점이 원천 행과 같은 짝인지 본다.

    근거 실재와 다르다. 근거 행이 있어도 그 행이 다른 두 끝을 잇고 있으면 엣지가
    원천과 어긋난 것이다. 어긋난 엣지는 폐기하고 다시 기록한다
    (docs/ontology-v1.md 5장).
    """
    if edge.edge_type not in DERIVED_EDGE_TYPES:
        return ()
    if lookup.derivation_matches(
        edge.edge_type, edge.evidence_id, edge.src.ref_id, edge.dst.ref_id
    ):
        return ()
    return (
        Violation(
            reason_code=REASON_DERIVATION_MISMATCH,
            detail={
                "edge_type": edge.edge_type,
                "evidence_id": edge.evidence_id,
                "src": edge.src.ref_id,
                "dst": edge.dst.ref_id,
            },
        ),
    )


# ============================================================ 구축 결과
class GraphBuildOutcome(BaseModel):
    """층 구축 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    graph_layer: GraphLayer
    ontology_version: str
    taxonomy_version_id: str | None = None

    created_nodes: dict[str, int] = Field(default_factory=dict)
    reused_nodes: dict[str, int] = Field(default_factory=dict)
    """이미 있어 다시 만들지 않은 노드. 재실행이 여기서 갈린다."""

    created_edges: dict[str, int] = Field(default_factory=dict)
    reused_edges: dict[str, int] = Field(default_factory=dict)

    discarded: tuple[CheckResult, ...] = ()
    """폐기한 후보와 사유. 검증 파이프라인이 `verification_results` 에 기록한다."""

    skipped_types: tuple[tuple[str, str], ...] = ()
    """원천이 비어 만들지 않은 유형. `(유형, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    """구축 전제의 실패. `(대상, 사유)` 다."""

    @property
    def node_count(self) -> int:
        return sum(self.created_nodes.values())

    @property
    def edge_count(self) -> int:
        return sum(self.created_edges.values())

    @property
    def discarded_count(self) -> int:
        return len(self.discarded)

    @property
    def gained_evidence(self) -> bool:
        return self.node_count > 0 or self.edge_count > 0


class GraphWriter(Protocol):
    """빌더가 저장소에 요구하는 것 넷."""

    def node_ids(self, ontology_version: str, graph_layer: str) -> set[str]: ...

    def edge_ids(self, ontology_version: str, graph_layer: str) -> set[str]: ...

    def add_node(self, values: dict[str, Any]) -> None: ...

    def add_edge(self, values: dict[str, Any]) -> None: ...


class LayerBuild:
    """한 층의 후보를 검사해 저장하고 결과를 쌓는다.

    두 층의 빌더가 이 클래스를 공유한다. 식별자가 결정적이므로 이미 저장된
    식별자 집합과 대조하는 것만으로 재실행의 중복을 막는다.

    `weight` 를 넣지 않는다. 그래프는 D3a 에서 구축하고 통계는 D4 에서 계산하므로
    엣지가 만들어지는 시점에는 값이 없다(docs/ontology-v1.md 6장).
    """

    def __init__(
        self,
        ontology: Ontology,
        graph_layer: GraphLayer,
        ontology_version: str,
        context: RunContext,
        writer: GraphWriter,
        lookup: OntologyLookup | None = None,
    ) -> None:
        self.ontology = ontology
        self.graph_layer = graph_layer
        self.ontology_version = ontology_version
        self.context = context
        self._writer = writer
        self._lookup = lookup

        self._node_ids = writer.node_ids(ontology_version, str(graph_layer))
        self._edge_ids = writer.edge_ids(ontology_version, str(graph_layer))
        self._refs: dict[tuple[str, str], NodeRef] = {}

        self.visited = 0
        self.created_nodes: dict[str, int] = {}
        self.reused_nodes: dict[str, int] = {}
        self.created_edges: dict[str, int] = {}
        self.reused_edges: dict[str, int] = {}
        self.discarded: list[CheckResult] = []
        self.skipped: list[tuple[str, str]] = []
        self.errors: list[tuple[str, str]] = []
        self.transaction_lost = False
        """거래가 죽었는가. 참이면 남은 노드와 엣지를 저장하지 않는다."""

    # -------------------------------------------------------- 노드
    def node(
        self,
        node_type: str,
        ref_table: str,
        ref_id: str,
        label: str,
        taxonomy_version_id: str | None = None,
    ) -> NodeRef | None:
        """노드 하나를 검사해 저장한다. 폐기하면 비운다."""
        self.visited += 1
        candidate = NodeCandidate(
            node_id=node_identifier(
                str(self.graph_layer),
                node_type,
                ref_table,
                ref_id,
                self.ontology_version,
            ),
            graph_layer=self.graph_layer,
            node_type=node_type,
            ref_table=ref_table,
            ref_id=ref_id,
            label=label,
            taxonomy_version_id=taxonomy_version_id,
        )
        violations = self.ontology.check_node(
            candidate, self.context.taxonomy_version_id
        )
        if violations:
            self._discard(TARGET_NODE, candidate.node_id, violations)
            return None

        ref = candidate.ref
        self._refs[(node_type, ref_id)] = ref
        if candidate.node_id in self._node_ids:
            self._count(self.reused_nodes, node_type)
            return ref

        if not self._write(
            candidate.node_id,
            lambda: self._writer.add_node(
                _node_row(candidate, self.context, self.ontology_version)
            ),
        ):
            # 저장하지 못한 노드를 끝점 목록에서 뺀다. 남겨 두면 이 노드를 가리키는
            # 엣지가 없는 행을 참조한다.
            self._refs.pop((node_type, ref_id), None)
            return None
        self._node_ids.add(candidate.node_id)
        self._count(self.created_nodes, node_type)
        return ref

    def ref(self, node_type: str, ref_id: str) -> NodeRef | None:
        """이번 구축에서 만든 노드를 유형과 원천 식별자로 찾는다."""
        return self._refs.get((node_type, ref_id))

    def adopt(self, ref: NodeRef) -> None:
        """다른 층에서 만든 노드를 끝점으로 쓸 수 있게 등록한다.

        `ASSIGNED_TO` 의 도착점이 semantic 노드이므로 계보 층이 이 경로로
        지식 구축 에이전트가 만든 노드를 참조한다. 노드를 만들지 않는다.
        """
        self._refs[(ref.node_type, ref.ref_id)] = ref

    # -------------------------------------------------------- 엣지
    def edge(
        self,
        edge_type: str,
        src: NodeRef | None,
        dst: NodeRef | None,
        evidence_id: str | None = None,
        taxonomy_version_id: str | None = None,
        valid_from: Any = None,
        valid_to: Any = None,
    ) -> bool:
        """엣지 하나를 검사해 저장한다. 저장했으면 참이다."""
        self.visited += 1
        if src is None or dst is None:
            self._discard(
                TARGET_EDGE,
                edge_type,
                (
                    Violation(
                        reason_code=REASON_ENDPOINT_NOT_FOUND,
                        detail={
                            "edge_type": edge_type,
                            "src": None if src is None else src.node_id,
                            "dst": None if dst is None else dst.node_id,
                        },
                    ),
                ),
            )
            return False

        candidate = EdgeCandidate(
            edge_id=edge_identifier(
                str(self.graph_layer),
                edge_type,
                src.node_id,
                dst.node_id,
                self.ontology_version,
                taxonomy_version_id,
            ),
            graph_layer=self.graph_layer,
            edge_type=edge_type,
            src=src,
            dst=dst,
            evidence_id=evidence_id,
            taxonomy_version_id=taxonomy_version_id,
        )
        violations = list(
            self.ontology.check_edge(candidate, self.context.taxonomy_version_id)
        )
        if not violations and self._lookup is not None:
            violations.extend(
                check_evidence_exists(self.ontology, candidate, self._lookup)
            )
            violations.extend(check_derivation(candidate, self._lookup))
        if violations:
            self._discard(TARGET_EDGE, candidate.edge_id, violations)
            return False

        if candidate.edge_id in self._edge_ids:
            self._count(self.reused_edges, edge_type)
            return False

        if not self._write(
            candidate.edge_id,
            lambda: self._writer.add_edge(
                _edge_row(
                    candidate, self.context, self.ontology_version, valid_from, valid_to
                )
            ),
        ):
            return False
        self._edge_ids.add(candidate.edge_id)
        self._count(self.created_edges, edge_type)
        return True

    # -------------------------------------------------------- 저장
    def _write(self, target: str, save: Callable[[], None]) -> bool:
        """항목 하나를 되돌림 지점 안에서 저장한다. 저장했으면 참이다.

        실패한 항목만 되돌리고 거래를 살려 두므로 한 항목의 실패가 뒤 항목의 저장을
        막지 않는다. 되돌림으로도 살릴 수 없는 실패를 만나면 그 뒤로는 아무것도
        시도하지 않는다. 죽은 거래에 계속 저장하면 같은 사유의 실패 줄이 항목 수만큼
        쌓인다.
        """
        if self.transaction_lost:
            return False
        try:
            with item_savepoint(self._writer):
                save()
        except Exception as exc:
            self.errors.append((target, f"{type(exc).__name__}: {exc}"))
            if transaction_is_dead(exc):
                self.transaction_lost = True
                self.errors.append((target, TRANSACTION_LOST))
            return False
        return True

    # -------------------------------------------------------- 결과
    def skip(self, type_name: str, reason: str) -> None:
        """원천이 비어 만들지 않은 유형을 남긴다."""
        self.skipped.append((type_name, reason))

    def fail(self, target: str, reason: str) -> None:
        self.errors.append((target, reason))

    def outcome(self) -> GraphBuildOutcome:
        return GraphBuildOutcome(
            agent_run_id=self.context.agent_run_id,
            stop_reason=_stop_reason(
                visited=self.visited,
                created=sum(self.created_nodes.values())
                + sum(self.created_edges.values()),
                errors=bool(self.errors),
            ),
            graph_layer=self.graph_layer,
            ontology_version=self.ontology_version,
            taxonomy_version_id=self.context.taxonomy_version_id,
            created_nodes=dict(self.created_nodes),
            reused_nodes=dict(self.reused_nodes),
            created_edges=dict(self.created_edges),
            reused_edges=dict(self.reused_edges),
            discarded=tuple(self.discarded),
            skipped_types=tuple(self.skipped),
            errors=tuple(self.errors),
        )

    # -------------------------------------------------------- 내부
    def _discard(
        self, target_type: str, target_id: str, violations: Sequence[Violation]
    ) -> None:
        for violation in violations:
            self.discarded.append(discard_record(target_type, target_id, violation))

    @staticmethod
    def _count(counter: dict[str, int], key: str) -> None:
        counter[key] = counter.get(key, 0) + 1


def _node_row(
    node: NodeCandidate, context: RunContext, ontology_version: str
) -> dict[str, Any]:
    """저장할 노드 한 줄. 컬럼은 docs/erd.md 8.2다.

    `weight` 가 없는 표이므로 버전 컬럼만 채운다. `taxonomy_version_id` 는
    `RequirementDimension` 과 `Technology` 만 값을 갖는다.
    """
    return {
        "node_id": node.node_id,
        "graph_layer": str(node.graph_layer),
        "node_type": node.node_type,
        "ref_table": node.ref_table,
        "ref_id": node.ref_id,
        "label": node.label,
        "ontology_version": ontology_version,
        "dataset_version": context.dataset_version,
        "taxonomy_version_id": node.taxonomy_version_id,
        "analysis_version": context.analysis_version,
    }


def _edge_row(
    edge: EdgeCandidate,
    context: RunContext,
    ontology_version: str,
    valid_from: Any,
    valid_to: Any,
) -> dict[str, Any]:
    """저장할 엣지 한 줄. 컬럼은 docs/erd.md 8.3이다.

    `weight` 를 넣지 않는다. 집계 파이프라인이 D4 직후 UPDATE 로 채운다.
    """
    return {
        "edge_id": edge.edge_id,
        "graph_layer": str(edge.graph_layer),
        "edge_type": edge.edge_type,
        "src_node_id": edge.src.node_id,
        "dst_node_id": edge.dst.node_id,
        "evidence_id": edge.evidence_id,
        "produced_by_run_id": context.agent_run_id,
        "verification_status": EDGE_VERIFICATION_STATUS,
        "ontology_version": ontology_version,
        "dataset_version": context.dataset_version,
        "taxonomy_version_id": edge.taxonomy_version_id,
        "analysis_version": context.analysis_version,
        "valid_from": valid_from,
        "valid_to": valid_to,
    }


def _stop_reason(visited: int, created: int, errors: bool) -> StopReason:
    """docs/agent-design.md 11.3의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 구축 전제가 깨진 실행을 근거 없음으로 볼 수 없고,
    후보가 하나도 없던 실행을 만들 것이 없었다는 사실과 구분한다.
    """
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not visited:
        return StopReason.FRONTIER_EXHAUSTED
    if created:
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "CROSS_LAYER_EDGE_TYPES",
    "DERIVED_EDGE_TYPES",
    "EDGE_VERIFICATION_STATUS",
    "EVIDENCE_SEPARATOR",
    "REASON_CONNECTION_NOT_ALLOWED",
    "REASON_DERIVATION_MISMATCH",
    "REASON_EDGE_TYPE_NOT_REGISTERED",
    "REASON_ENDPOINT_NOT_FOUND",
    "REASON_EVIDENCE_MISSING",
    "REASON_EVIDENCE_NOT_FOUND",
    "REASON_LAYER_BOUNDARY",
    "REASON_NODE_TYPE_NOT_REGISTERED",
    "REASON_SELF_REFERENCE",
    "REASON_TAXONOMY_VERSION_MISMATCH",
    "TARGET_EDGE",
    "TARGET_NODE",
    "TAXONOMY_NODE_TYPES",
    "ConnectionRule",
    "EdgeCandidate",
    "GraphBuildOutcome",
    "GraphLayer",
    "GraphWriter",
    "LayerBuild",
    "NodeCandidate",
    "NodeRef",
    "Ontology",
    "OntologyLayer",
    "OntologyLookup",
    "Violation",
    "check_derivation",
    "check_evidence_exists",
    "discard_record",
    "evidence_key",
    "evidence_parts",
]
