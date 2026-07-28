"""그래프 경로 탐색.

경로 유형의 정의는 `graph/policy.py`, 허용 연결과 층 경계는 docs/ontology-v1.md
2.2·3.2·7장, 두 층을 잇는 계보 경로의 모양은 docs/knowledge-schema.md 7.6이다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 인접 관계를 `GraphView` 로
받아 경로 목록을 낸다. 탐색이 조회를 직접 하지 않으므로 실데이터 없이 규칙을
검사할 수 있고, 저장소는 노드·엣지 행을 공급하는 일만 맡는다.

엣지는 파생 표현이며 진실의 원천은 정규 테이블이다(docs/ontology-v1.md 5장).
탐색은 읽기만 하고 엣지를 고치지 않는다.

`weight` 가 비어 있는 동안에도 탐색은 동작한다. 순위는 정해지지 않으므로 대체
정렬 규칙이 저장 순서를 하나로 고정한다. 규칙의 이름은
`policy.ORDER_LENGTH_THEN_IDENTIFIER` 다.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.graph.ontology import (
    CROSS_LAYER_EDGE_TYPES,
    REASON_CONNECTION_NOT_ALLOWED,
    REASON_EDGE_TYPE_NOT_REGISTERED,
    REASON_NODE_TYPE_NOT_REGISTERED,
    GraphLayer,
    Ontology,
    Violation,
)
from careersignal.graph.policy import PathSpec, TraversalPolicy

CUT_CYCLE = "TRAVERSAL_CYCLE"
"""이미 지난 노드로 되돌아왔다. 경로를 끊고 사유를 남긴다."""

CUT_DEPTH = "TRAVERSAL_DEPTH_LIMIT"
"""깊이 상한에서 멈췄다. 더 긴 경로가 있어도 따라가지 않는다."""

CUT_BRANCH = "TRAVERSAL_BRANCH_LIMIT"
"""한 노드의 나가는 엣지가 가지 상한을 넘었다. 정렬에서 앞의 것만 따라간다."""

CUT_VISIT = "TRAVERSAL_VISIT_LIMIT"
"""방문 상한에 닿아 탐색을 멈췄다."""

CUT_PATH = "TRAVERSAL_PATH_LIMIT"
"""경로 수 상한에 닿아 더 담지 않았다."""

CUT_LAYER = "TRAVERSAL_LAYER_BOUNDARY"
"""허용되지 않은 층 경계 이동이다. 그 엣지를 따라가지 않는다."""

CUT_ENDPOINT = "TRAVERSAL_ENDPOINT_NOT_FOUND"
"""엣지가 가리키는 노드가 인접 관계에 없다. 경로를 이어갈 수 없다."""

CUT_STEP_EXHAUSTED = "TRAVERSAL_STEP_EXHAUSTED"
"""사슬의 이 홉에서 이어갈 엣지가 없다. 완성되지 않은 경로는 결과에 담지 않는다."""


class GraphNode(BaseModel):
    """탐색이 읽는 만큼의 노드. 컬럼은 docs/erd.md 8.2다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    node_id: str
    node_type: str
    graph_layer: GraphLayer


class GraphEdge(BaseModel):
    """탐색이 읽는 만큼의 엣지. 컬럼은 docs/erd.md 8.3이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    edge_id: str
    edge_type: str
    graph_layer: GraphLayer
    src_node_id: str
    dst_node_id: str

    weight: float | None = None
    """순위 가중치. 집계 이후에 채우므로 비어 있는 것이 정상 상태다."""


class GraphPath(BaseModel):
    """경로 하나. `graph_paths` 한 행의 두 배열에 대응한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    path_type: str
    node_sequence: tuple[str, ...] = Field(min_length=2)
    edge_sequence: tuple[str, ...] = Field(min_length=1)
    weights: tuple[float | None, ...] = ()

    @model_validator(mode="after")
    def _lengths(self) -> GraphPath:
        """`CHECK (array_length(edge_sequence,1) = array_length(node_sequence,1) - 1)`.

        제약을 모델에서 먼저 지킨다. 어긋난 경로는 저장 시점이 아니라 만들어진
        자리에서 걸린다.
        """
        if len(self.edge_sequence) != len(self.node_sequence) - 1:
            raise ValueError("엣지 열의 길이는 노드 열의 길이보다 하나 작다")
        if self.weights and len(self.weights) != len(self.edge_sequence):
            raise ValueError("가중치는 엣지마다 하나다")
        return self

    @property
    def length(self) -> int:
        """홉의 수."""
        return len(self.edge_sequence)

    @property
    def ranked(self) -> bool:
        """순위를 정할 수 있는 경로인가. 엣지 하나라도 가중치가 없으면 거짓이다."""
        return bool(self.weights) and all(w is not None for w in self.weights)

    @property
    def weight_sum(self) -> float:
        """가중치 합. 순위를 정할 수 없는 경로는 0이다."""
        if not self.ranked:
            return 0.0
        return float(sum(w for w in self.weights if w is not None))


class TraversalCut(BaseModel):
    """탐색을 끊은 자리 하나."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    reason_code: str
    detail: dict[str, Any] = Field(default_factory=dict)


class TraversalOutcome(BaseModel):
    """경로 유형 하나의 탐색 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    path_type: str
    paths: tuple[GraphPath, ...] = ()
    visited: int = 0
    """살펴본 엣지의 수. 방문 상한과 견주는 값이다."""

    cuts: tuple[TraversalCut, ...] = ()
    """끊은 자리와 사유. 순환, 상한, 층 경계가 모두 여기 남는다."""

    violations: tuple[Violation, ...] = ()
    """사슬이 온톨로지를 어겼다. 어긴 사슬은 탐색하지 않는다."""

    @property
    def ranked(self) -> bool:
        """가중치로 순위를 정한 결과인가. 경로 하나라도 가중치가 없으면 거짓이다."""
        return bool(self.paths) and all(path.ranked for path in self.paths)

    @property
    def path_count(self) -> int:
        return len(self.paths)

    def cut_counts(self) -> dict[str, int]:
        """사유별 횟수. 같은 사유가 여러 자리에서 나온다."""
        counts: dict[str, int] = {}
        for cut in self.cuts:
            counts[cut.reason_code] = counts.get(cut.reason_code, 0) + 1
        return counts


class GraphView:
    """탐색이 읽는 인접 관계.

    값 모델이 아니라 조회 구조라 pydantic 모델로 두지 않는다. 두 층을 한 뷰에
    담는다. `ASSIGNED_TO` 가 provenance 에서 semantic 으로 넘어가므로 층을 나눠
    담으면 그 홉에서 도착 노드를 찾지 못한다.

    나가는 엣지를 `(도착 노드 식별자, 엣지 식별자)` 로 정렬해 둔다. 입력 순서가
    흔들려도 탐색 순서가 같다.
    """

    def __init__(
        self, nodes: Iterable[GraphNode], edges: Iterable[GraphEdge]
    ) -> None:
        self._nodes: dict[str, GraphNode] = {node.node_id: node for node in nodes}
        self._out: dict[tuple[str, str], list[GraphEdge]] = {}
        for edge in edges:
            self._out.setdefault((edge.src_node_id, edge.edge_type), []).append(edge)
        for bucket in self._out.values():
            bucket.sort(key=lambda edge: (edge.dst_node_id, edge.edge_id))

    @classmethod
    def from_rows(
        cls,
        node_rows: Sequence[Mapping[str, Any]],
        edge_rows: Sequence[Mapping[str, Any]],
    ) -> GraphView:
        """저장소 조회 결과를 그대로 받는다."""
        nodes = [
            GraphNode(
                node_id=row["node_id"],
                node_type=row["node_type"],
                graph_layer=GraphLayer(row["graph_layer"]),
            )
            for row in node_rows
        ]
        edges = [
            GraphEdge(
                edge_id=row["edge_id"],
                edge_type=row["edge_type"],
                graph_layer=GraphLayer(row["graph_layer"]),
                src_node_id=row["src_node_id"],
                dst_node_id=row["dst_node_id"],
                weight=None if row.get("weight") is None else float(row["weight"]),
            )
            for row in edge_rows
        ]
        return cls(nodes, edges)

    @property
    def empty(self) -> bool:
        """노드가 없으면 빈 그래프다. 냉시작의 정상 상태다."""
        return not self._nodes

    def node(self, node_id: str) -> GraphNode | None:
        return self._nodes.get(node_id)

    def out_edges(self, node_id: str, edge_type: str) -> tuple[GraphEdge, ...]:
        """한 노드에서 이 유형으로 나가는 엣지. 정렬이 고정되어 있다."""
        return tuple(self._out.get((node_id, edge_type), ()))

    def start_nodes(
        self, node_type: str, graph_layer: GraphLayer
    ) -> tuple[GraphNode, ...]:
        """출발 노드 집합. 식별자 사전순이다."""
        found = [
            node
            for node in self._nodes.values()
            if node.node_type == node_type and node.graph_layer is graph_layer
        ]
        found.sort(key=lambda node: node.node_id)
        return tuple(found)


def layer_transition_allowed(
    edge_type: str,
    edge_layer: GraphLayer,
    src_layer: GraphLayer,
    dst_layer: GraphLayer,
) -> bool:
    """이 홉이 층 경계를 지키는가.

    엣지의 끝점은 엣지와 같은 층에 있다. 예외는 `ASSIGNED_TO` 하나이며 이 엣지만
    provenance 에서 semantic 노드로 넘어간다(docs/ontology-v1.md 3.2·7장).
    검증이 같은 규칙으로 엣지를 폐기하지만, 탐색은 폐기되지 않은 엣지가 남아
    있어도 이 규칙 밖으로 나가지 않는다.
    """
    if src_layer is not edge_layer:
        return False
    if dst_layer is edge_layer:
        return True
    return (
        edge_type in CROSS_LAYER_EDGE_TYPES
        and edge_layer is GraphLayer.PROVENANCE
        and dst_layer is GraphLayer.SEMANTIC
    )


def path_sort_key(path: GraphPath) -> tuple[Any, ...]:
    """경로 하나의 정렬 자리.

    `weight` 가 비어 있는 동안 순위는 정해지지 않는다(docs/ontology-v1.md 6장).
    순위가 없어도 저장 순서는 하나여야 하므로 네 자리로 가른다.

    1. 홉이 적은 경로가 앞이다. 짧은 경로가 더 직접적인 연결이다.
    2. 가중치가 모두 채워진 경로가 앞이다. 순위를 정할 수 있는 경로를 먼저 둔다.
    3. 가중치 합이 큰 경로가 앞이다. 모두 비어 있으면 이 자리가 모두 같다.
    4. 노드 열, 엣지 열의 사전순이다. 식별자가 재료에서 계산된 결정적 값이므로
       (`graph/identifiers.py`) 이 자리가 언제나 순서를 하나로 정한다.
    """
    return (
        path.length,
        0 if path.ranked else 1,
        -path.weight_sum,
        path.node_sequence,
        path.edge_sequence,
    )


def order_paths(paths: Iterable[GraphPath]) -> tuple[GraphPath, ...]:
    """경로 목록을 대체 정렬 규칙으로 정렬한다."""
    return tuple(sorted(paths, key=path_sort_key))


def validate_spec(ontology: Ontology, spec: PathSpec) -> tuple[Violation, ...]:
    """사슬이 허용 연결을 어기지 않는지 본다.

    유형 등록과 연결 허용 둘이다. 출발 노드 유형이 첫 홉의 출발 목록에 있어야 하고,
    앞 홉의 도착 목록과 다음 홉의 출발 목록이 겹쳐야 사슬이 이어진다. 어긴 사슬은
    탐색하지 않는다. 어기는 경로를 계산하면 온톨로지가 막은 연결이 캐시로 들어간다.
    """
    found: list[Violation] = []
    start_layer = ontology.layer(spec.start_layer)
    if not start_layer.has_node_type(spec.start_node_type):
        found.append(
            Violation(
                reason_code=REASON_NODE_TYPE_NOT_REGISTERED,
                detail={
                    "path_type": spec.path_type,
                    "node_type": spec.start_node_type,
                    "graph_layer": str(spec.start_layer),
                },
            )
        )

    reachable = {spec.start_node_type}
    for step in spec.steps:
        layer = ontology.layer(step.graph_layer)
        if not layer.has_edge_type(step.edge_type):
            found.append(
                Violation(
                    reason_code=REASON_EDGE_TYPE_NOT_REGISTERED,
                    detail={
                        "path_type": spec.path_type,
                        "edge_type": step.edge_type,
                        "graph_layer": str(step.graph_layer),
                    },
                )
            )
            return tuple(found)

        rule = layer.rule(step.edge_type)
        if rule is None or not (reachable & set(rule.src)):
            found.append(
                Violation(
                    reason_code=REASON_CONNECTION_NOT_ALLOWED,
                    detail={
                        "path_type": spec.path_type,
                        "edge_type": step.edge_type,
                        "src": sorted(reachable),
                    },
                )
            )
            return tuple(found)
        reachable = set(rule.dst)

    return tuple(found)


class _Partial:
    """만들어지는 중인 경로 하나. 결과가 아니므로 값 모델로 두지 않는다."""

    __slots__ = ("nodes", "edges", "weights", "seen")

    def __init__(
        self,
        nodes: tuple[str, ...],
        edges: tuple[str, ...],
        weights: tuple[float | None, ...],
        seen: frozenset[str],
    ) -> None:
        self.nodes = nodes
        self.edges = edges
        self.weights = weights
        self.seen = seen

    def extend(self, edge: GraphEdge) -> _Partial:
        return _Partial(
            nodes=self.nodes + (edge.dst_node_id,),
            edges=self.edges + (edge.edge_id,),
            weights=self.weights + (edge.weight,),
            seen=self.seen | {edge.dst_node_id},
        )


def traverse(
    view: GraphView,
    spec: PathSpec,
    policy: TraversalPolicy,
    ontology: Ontology | None = None,
    start_node_ids: Sequence[str] | None = None,
) -> TraversalOutcome:
    """출발 노드 집합에서 사슬을 따라가 경로 목록을 만든다.

    깊이를 한 단계씩 넓히므로 짧은 경로가 먼저 만들어진다. 같은 깊이 안에서는
    출발 노드와 도착 노드의 식별자 순서를 따르므로 실행 순서가 하나로 정해진다.

    그래프가 비어 있으면 빈 결과다. 냉시작에서 요구 차원과 역량이 아직 없는 것이
    정상 상태이며, 이 실행은 실패가 아니다.

    `ontology` 를 주면 사슬을 먼저 판정하고 어긴 사슬은 탐색하지 않는다.
    """
    if ontology is not None:
        violations = validate_spec(ontology, spec)
        if violations:
            return TraversalOutcome(path_type=spec.path_type, violations=violations)

    starts = view.start_nodes(spec.start_node_type, spec.start_layer)
    if start_node_ids is not None:
        wanted = set(start_node_ids)
        starts = tuple(node for node in starts if node.node_id in wanted)
    if not starts:
        return TraversalOutcome(path_type=spec.path_type)

    frontier = [
        _Partial(
            nodes=(node.node_id,),
            edges=(),
            weights=(),
            seen=frozenset({node.node_id}),
        )
        for node in starts
    ]
    found: list[GraphPath] = []
    cuts: list[TraversalCut] = []
    visited = 0
    depth = 0
    fixed = spec.fixed_length
    limit = policy.max_depth if fixed is None else min(fixed, policy.max_depth)
    if fixed is not None and fixed > policy.max_depth:
        cuts.append(
            TraversalCut(
                reason_code=CUT_DEPTH,
                detail={
                    "path_type": spec.path_type,
                    "chain_length": fixed,
                    "max_depth": policy.max_depth,
                },
            )
        )

    while frontier and depth < limit:
        step = spec.step_at(depth)
        complete = fixed is not None and depth == fixed - 1
        following: list[_Partial] = []
        stopped = False

        for partial in frontier:
            source = partial.nodes[-1]
            edges = view.out_edges(source, step.edge_type)
            if not edges:
                if not complete and (not spec.repeating or not partial.edges):
                    # 반복 사슬은 한 홉이라도 이었으면 그 자체가 완성된 경로다.
                    cuts.append(
                        TraversalCut(
                            reason_code=CUT_STEP_EXHAUSTED,
                            detail={
                                "path_type": spec.path_type,
                                "node_id": source,
                                "edge_type": step.edge_type,
                            },
                        )
                    )
                continue
            if len(edges) > policy.max_branching:
                cuts.append(
                    TraversalCut(
                        reason_code=CUT_BRANCH,
                        detail={
                            "path_type": spec.path_type,
                            "node_id": source,
                            "found": len(edges),
                            "max_branching": policy.max_branching,
                        },
                    )
                )
                edges = edges[: policy.max_branching]

            for edge in edges:
                if visited >= policy.max_visits:
                    cuts.append(
                        TraversalCut(
                            reason_code=CUT_VISIT,
                            detail={
                                "path_type": spec.path_type,
                                "max_visits": policy.max_visits,
                            },
                        )
                    )
                    stopped = True
                    break
                visited += 1

                target = view.node(edge.dst_node_id)
                origin = view.node(source)
                if target is None or origin is None:
                    cuts.append(
                        TraversalCut(
                            reason_code=CUT_ENDPOINT,
                            detail={
                                "path_type": spec.path_type,
                                "edge_id": edge.edge_id,
                                "dst_node_id": edge.dst_node_id,
                            },
                        )
                    )
                    continue

                if not layer_transition_allowed(
                    edge.edge_type,
                    edge.graph_layer,
                    origin.graph_layer,
                    target.graph_layer,
                ):
                    cuts.append(
                        TraversalCut(
                            reason_code=CUT_LAYER,
                            detail={
                                "path_type": spec.path_type,
                                "edge_id": edge.edge_id,
                                "edge_type": edge.edge_type,
                                "src_layer": str(origin.graph_layer),
                                "dst_layer": str(target.graph_layer),
                            },
                        )
                    )
                    continue

                if edge.dst_node_id in partial.seen:
                    cuts.append(
                        TraversalCut(
                            reason_code=CUT_CYCLE,
                            detail={
                                "path_type": spec.path_type,
                                "edge_id": edge.edge_id,
                                "node_id": edge.dst_node_id,
                            },
                        )
                    )
                    continue

                grown = partial.extend(edge)
                if complete or spec.repeating:
                    if len(found) >= policy.max_paths:
                        cuts.append(
                            TraversalCut(
                                reason_code=CUT_PATH,
                                detail={
                                    "path_type": spec.path_type,
                                    "max_paths": policy.max_paths,
                                },
                            )
                        )
                        stopped = True
                        break
                    found.append(
                        GraphPath(
                            path_type=spec.path_type,
                            node_sequence=grown.nodes,
                            edge_sequence=grown.edges,
                            weights=grown.weights,
                        )
                    )
                if not complete:
                    following.append(grown)

            if stopped:
                break

        if stopped:
            break

        depth += 1
        frontier = following
        if frontier and depth >= limit and spec.repeating:
            cuts.append(
                TraversalCut(
                    reason_code=CUT_DEPTH,
                    detail={
                        "path_type": spec.path_type,
                        "max_depth": policy.max_depth,
                        "open": len(frontier),
                    },
                )
            )

    return TraversalOutcome(
        path_type=spec.path_type,
        paths=order_paths(found),
        visited=visited,
        cuts=tuple(cuts),
    )


__all__ = [
    "CUT_BRANCH",
    "CUT_CYCLE",
    "CUT_DEPTH",
    "CUT_ENDPOINT",
    "CUT_LAYER",
    "CUT_PATH",
    "CUT_STEP_EXHAUSTED",
    "CUT_VISIT",
    "GraphEdge",
    "GraphNode",
    "GraphPath",
    "GraphView",
    "TraversalCut",
    "TraversalOutcome",
    "layer_transition_allowed",
    "order_paths",
    "path_sort_key",
    "traverse",
    "validate_spec",
]
