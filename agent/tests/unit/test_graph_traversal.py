"""그래프 탐색 검증.

규칙은 docs/ontology-v1.md 2.2·3.2·6·7장과 docs/knowledge-schema.md 7.6에서 온다.
인접 관계를 손으로 만들어 넣고 탐색만 검사한다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from typing import Any

from careersignal.graph.ontology import (
    REASON_CONNECTION_NOT_ALLOWED,
    REASON_EDGE_TYPE_NOT_REGISTERED,
    GraphLayer,
    Ontology,
)
from careersignal.graph.policy import (
    GRAPH_POLICY_V1,
    SPEC_CAPABILITY_PREREQUISITE_CHAIN,
    SPEC_MENTION_DIMENSION_NORMALIZATION,
    SPEC_MENTION_EVIDENCE_LINEAGE,
    SPEC_POSTING_REQUIREMENT_CAPABILITY,
    PathSpec,
    PathStep,
    policy_for,
)
from careersignal.graph.traversal import (
    CUT_BRANCH,
    CUT_CYCLE,
    CUT_DEPTH,
    CUT_LAYER,
    CUT_PATH,
    CUT_VISIT,
    GraphEdge,
    GraphNode,
    GraphPath,
    GraphView,
    layer_transition_allowed,
    order_paths,
    traverse,
    validate_spec,
)

SEMANTIC_NODES = [
    "JobRole",
    "Posting",
    "Company",
    "RequirementDimension",
    "Capability",
    "Technology",
    "Standard",
]

SEMANTIC_CONNECTIONS: dict[str, dict[str, Any]] = {
    "POSTED_BY": {"src": ["Posting"], "dst": ["Company"], "taxonomy_version": False},
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
    "PREREQUISITE_OF": {
        "src": ["Capability"],
        "dst": ["Capability"],
        "taxonomy_version": False,
    },
}

PROVENANCE_NODES = [
    "SourceSnapshot",
    "Chunk",
    "RequirementMention",
    "Assignment",
    "AgentRun",
]

PROVENANCE_CONNECTIONS: dict[str, dict[str, Any]] = {
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
}


def _ontology() -> Ontology:
    """두 층의 등록 목록. `0002_seed_reference.sql` 의 부분집합이다."""
    return Ontology.from_rows(
        [
            {
                "ontology_version": "v1",
                "graph_layer": "semantic",
                "node_types": SEMANTIC_NODES,
                "edge_types": list(SEMANTIC_CONNECTIONS),
                "allowed_connections": SEMANTIC_CONNECTIONS,
                "required_evidence_by_edge_type": {},
            },
            {
                "ontology_version": "v1",
                "graph_layer": "provenance",
                "node_types": PROVENANCE_NODES,
                "edge_types": list(PROVENANCE_CONNECTIONS),
                "allowed_connections": PROVENANCE_CONNECTIONS,
                "required_evidence_by_edge_type": {},
            },
        ]
    )


def _node(node_id: str, node_type: str, layer: str = "semantic") -> GraphNode:
    return GraphNode(
        node_id=node_id, node_type=node_type, graph_layer=GraphLayer(layer)
    )


def _edge(
    edge_id: str,
    edge_type: str,
    src: str,
    dst: str,
    layer: str = "semantic",
    weight: float | None = None,
) -> GraphEdge:
    return GraphEdge(
        edge_id=edge_id,
        edge_type=edge_type,
        graph_layer=GraphLayer(layer),
        src_node_id=src,
        dst_node_id=dst,
        weight=weight,
    )


def _posting_view() -> GraphView:
    """공고 하나가 기술 차원을 거쳐 역량 둘에 닿는 그래프."""
    return GraphView(
        nodes=[
            _node("node_post", "Posting"),
            _node("node_dim", "Technology"),
            _node("node_cap_a", "Capability"),
            _node("node_cap_b", "Capability"),
        ],
        edges=[
            _edge("edge_req", "REQUIRES", "node_post", "node_dim"),
            _edge("edge_cap_a", "REQUIRES_CAPABILITY", "node_dim", "node_cap_a"),
            _edge("edge_cap_b", "REQUIRES_CAPABILITY", "node_dim", "node_cap_b"),
        ],
    )


# ============================================================ 빈 그래프
def test_빈_그래프는_빈_결과를_낸다():
    view = GraphView(nodes=[], edges=[])
    assert view.empty

    outcome = traverse(view, SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1)

    assert outcome.paths == ()
    assert outcome.visited == 0
    assert outcome.cuts == ()


def test_출발_노드가_없으면_빈_결과다():
    """차원과 역량이 냉시작이라 비어 있어도 실패가 아니다."""
    view = GraphView(nodes=[_node("node_cap", "Capability")], edges=[])

    outcome = traverse(view, SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1)

    assert outcome.paths == ()


def test_사슬이_끊기면_완성된_경로가_없다():
    """`REQUIRES` 만 있고 `REQUIRES_CAPABILITY` 가 없는 그래프다."""
    view = GraphView(
        nodes=[_node("node_post", "Posting"), _node("node_dim", "Technology")],
        edges=[_edge("edge_req", "REQUIRES", "node_post", "node_dim")],
    )

    outcome = traverse(view, SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1)

    assert outcome.paths == ()
    assert outcome.visited == 1


# ============================================================ 경로 유형
def test_공고에서_역량까지의_경로를_만든다():
    outcome = traverse(
        _posting_view(), SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1
    )

    assert [path.node_sequence for path in outcome.paths] == [
        ("node_post", "node_dim", "node_cap_a"),
        ("node_post", "node_dim", "node_cap_b"),
    ]
    assert all(path.length == 2 for path in outcome.paths)


def test_계보_경로가_스냅샷까지_닿는다():
    view = GraphView(
        nodes=[
            _node("node_mention", "RequirementMention", "provenance"),
            _node("node_chunk", "Chunk", "provenance"),
            _node("node_snap", "SourceSnapshot", "provenance"),
        ],
        edges=[
            _edge(
                "edge_ev",
                "EVIDENCED_BY",
                "node_mention",
                "node_chunk",
                "provenance",
            ),
            _edge("edge_part", "PART_OF", "node_chunk", "node_snap", "provenance"),
        ],
    )

    outcome = traverse(view, SPEC_MENTION_EVIDENCE_LINEAGE, GRAPH_POLICY_V1)

    assert len(outcome.paths) == 1
    assert outcome.paths[0].node_sequence == (
        "node_mention",
        "node_chunk",
        "node_snap",
    )


def test_선수_역량_사슬은_길이마다_경로가_된다():
    view = GraphView(
        nodes=[
            _node("node_cap_1", "Capability"),
            _node("node_cap_2", "Capability"),
            _node("node_cap_3", "Capability"),
        ],
        edges=[
            _edge("edge_a", "PREREQUISITE_OF", "node_cap_1", "node_cap_2"),
            _edge("edge_b", "PREREQUISITE_OF", "node_cap_2", "node_cap_3"),
        ],
    )

    outcome = traverse(view, SPEC_CAPABILITY_PREREQUISITE_CHAIN, GRAPH_POLICY_V1)

    assert [path.edge_sequence for path in outcome.paths] == [
        ("edge_a",),
        ("edge_b",),
        ("edge_a", "edge_b"),
    ]


# ============================================================ 길이 관계
def test_노드_열과_엣지_열의_길이_관계가_지켜진다():
    outcome = traverse(
        _posting_view(), SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1
    )

    for path in outcome.paths:
        assert len(path.edge_sequence) == len(path.node_sequence) - 1


def test_길이_관계를_어긴_경로는_만들어지지_않는다():
    """`graph_paths` 의 CHECK 를 모델이 먼저 지킨다."""
    try:
        GraphPath(
            path_type="x",
            node_sequence=("node_a", "node_b"),
            edge_sequence=("edge_a", "edge_b"),
        )
    except ValueError:
        return
    raise AssertionError("길이 관계를 어긴 경로가 만들어졌다")


# ============================================================ 순환
def test_순환을_만나면_끊고_사유를_남긴다():
    view = GraphView(
        nodes=[_node("node_cap_1", "Capability"), _node("node_cap_2", "Capability")],
        edges=[
            _edge("edge_a", "PREREQUISITE_OF", "node_cap_1", "node_cap_2"),
            _edge("edge_b", "PREREQUISITE_OF", "node_cap_2", "node_cap_1"),
        ],
    )

    outcome = traverse(view, SPEC_CAPABILITY_PREREQUISITE_CHAIN, GRAPH_POLICY_V1)

    assert outcome.cut_counts()[CUT_CYCLE] == 2
    for path in outcome.paths:
        assert len(set(path.node_sequence)) == len(path.node_sequence)


def test_자기_자신으로_돌아오는_엣지도_순환이다():
    view = GraphView(
        nodes=[_node("node_cap", "Capability")],
        edges=[_edge("edge_self", "PREREQUISITE_OF", "node_cap", "node_cap")],
    )

    outcome = traverse(view, SPEC_CAPABILITY_PREREQUISITE_CHAIN, GRAPH_POLICY_V1)

    assert outcome.paths == ()
    assert CUT_CYCLE in outcome.cut_counts()


# ============================================================ 정렬
def test_가중치가_모두_비어도_순서가_결정적이다():
    """`weight` 가 비어 있는 동안 탐색은 동작하고 순위만 정해지지 않는다."""
    view = _posting_view()
    reversed_view = GraphView(
        nodes=[
            _node("node_cap_b", "Capability"),
            _node("node_cap_a", "Capability"),
            _node("node_dim", "Technology"),
            _node("node_post", "Posting"),
        ],
        edges=[
            _edge("edge_cap_b", "REQUIRES_CAPABILITY", "node_dim", "node_cap_b"),
            _edge("edge_cap_a", "REQUIRES_CAPABILITY", "node_dim", "node_cap_a"),
            _edge("edge_req", "REQUIRES", "node_post", "node_dim"),
        ],
    )

    first = traverse(view, SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1)
    second = traverse(
        reversed_view, SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1
    )

    assert not first.ranked
    assert first.paths == second.paths


def test_가중치가_있으면_합이_큰_경로가_앞이다():
    view = GraphView(
        nodes=[
            _node("node_post", "Posting"),
            _node("node_dim", "Technology"),
            _node("node_cap_a", "Capability"),
            _node("node_cap_b", "Capability"),
        ],
        edges=[
            _edge("edge_req", "REQUIRES", "node_post", "node_dim", weight=0.5),
            _edge(
                "edge_cap_a",
                "REQUIRES_CAPABILITY",
                "node_dim",
                "node_cap_a",
                weight=0.1,
            ),
            _edge(
                "edge_cap_b",
                "REQUIRES_CAPABILITY",
                "node_dim",
                "node_cap_b",
                weight=0.9,
            ),
        ],
    )

    outcome = traverse(view, SPEC_POSTING_REQUIREMENT_CAPABILITY, GRAPH_POLICY_V1)

    assert outcome.ranked
    assert outcome.paths[0].node_sequence[-1] == "node_cap_b"


def test_가중치가_채워진_경로가_비어_있는_경로보다_앞이다():
    ranked = GraphPath(
        path_type="x",
        node_sequence=("node_a", "node_b"),
        edge_sequence=("edge_2",),
        weights=(0.1,),
    )
    unranked = GraphPath(
        path_type="x",
        node_sequence=("node_a", "node_c"),
        edge_sequence=("edge_1",),
        weights=(None,),
    )

    assert order_paths([unranked, ranked]) == (ranked, unranked)


def test_짧은_경로가_긴_경로보다_앞이다():
    short = GraphPath(
        path_type="x", node_sequence=("node_z", "node_y"), edge_sequence=("edge_z",)
    )
    long = GraphPath(
        path_type="x",
        node_sequence=("node_a", "node_b", "node_c"),
        edge_sequence=("edge_a", "edge_b"),
    )

    assert order_paths([long, short]) == (short, long)


# ============================================================ 층 경계
def test_ASSIGNED_TO만_층을_넘는다():
    assert layer_transition_allowed(
        "ASSIGNED_TO",
        GraphLayer.PROVENANCE,
        GraphLayer.PROVENANCE,
        GraphLayer.SEMANTIC,
    )
    assert not layer_transition_allowed(
        "EVIDENCED_BY",
        GraphLayer.PROVENANCE,
        GraphLayer.PROVENANCE,
        GraphLayer.SEMANTIC,
    )


def test_허용되지_않은_층_경계_이동이_탐색에서_나오지_않는다():
    """`EVIDENCED_BY` 가 semantic 노드를 가리키는 어긋난 엣지를 둔다."""
    view = GraphView(
        nodes=[
            _node("node_mention", "RequirementMention", "provenance"),
            _node("node_dim", "Technology", "semantic"),
            _node("node_snap", "SourceSnapshot", "provenance"),
        ],
        edges=[
            _edge(
                "edge_bad",
                "EVIDENCED_BY",
                "node_mention",
                "node_dim",
                "provenance",
            )
        ],
    )

    outcome = traverse(view, SPEC_MENTION_EVIDENCE_LINEAGE, GRAPH_POLICY_V1)

    assert outcome.paths == ()
    assert outcome.cut_counts()[CUT_LAYER] == 1


def test_정규화_경로만_provenance에서_semantic으로_간다():
    view = GraphView(
        nodes=[
            _node("node_mention", "RequirementMention", "provenance"),
            _node("node_dim", "Technology", "semantic"),
        ],
        edges=[
            _edge(
                "edge_assign",
                "ASSIGNED_TO",
                "node_mention",
                "node_dim",
                "provenance",
            )
        ],
    )

    outcome = traverse(view, SPEC_MENTION_DIMENSION_NORMALIZATION, GRAPH_POLICY_V1)

    assert len(outcome.paths) == 1
    assert outcome.cuts == ()


# ============================================================ 상한
def test_가지_상한을_넘으면_앞의_것만_따라간다():
    policy = GRAPH_POLICY_V1.model_copy(update={"max_branching": 1})

    outcome = traverse(_posting_view(), SPEC_POSTING_REQUIREMENT_CAPABILITY, policy)

    assert len(outcome.paths) == 1
    assert outcome.cut_counts()[CUT_BRANCH] == 1


def test_방문_상한에_닿으면_멈추고_사유를_남긴다():
    policy = GRAPH_POLICY_V1.model_copy(update={"max_visits": 1})

    outcome = traverse(_posting_view(), SPEC_POSTING_REQUIREMENT_CAPABILITY, policy)

    assert outcome.visited == 1
    assert CUT_VISIT in outcome.cut_counts()


def test_경로_수_상한에_닿으면_더_담지_않는다():
    policy = GRAPH_POLICY_V1.model_copy(update={"max_paths": 1})

    outcome = traverse(_posting_view(), SPEC_POSTING_REQUIREMENT_CAPABILITY, policy)

    assert len(outcome.paths) == 1
    assert CUT_PATH in outcome.cut_counts()


def test_깊이_상한이_사슬보다_짧으면_경로가_없다():
    policy = GRAPH_POLICY_V1.model_copy(update={"max_depth": 1})

    outcome = traverse(_posting_view(), SPEC_POSTING_REQUIREMENT_CAPABILITY, policy)

    assert outcome.paths == ()
    assert CUT_DEPTH in outcome.cut_counts()


def test_반복_사슬은_깊이_상한에서_끊고_사유를_남긴다():
    view = GraphView(
        nodes=[_node(f"node_cap_{i}", "Capability") for i in range(4)],
        edges=[
            _edge(
                f"edge_{i}",
                "PREREQUISITE_OF",
                f"node_cap_{i}",
                f"node_cap_{i + 1}",
            )
            for i in range(3)
        ],
    )
    policy = GRAPH_POLICY_V1.model_copy(update={"max_depth": 1})

    outcome = traverse(view, SPEC_CAPABILITY_PREREQUISITE_CHAIN, policy)

    assert all(path.length == 1 for path in outcome.paths)
    assert CUT_DEPTH in outcome.cut_counts()


# ============================================================ 온톨로지 판정
def test_등록된_사슬은_판정을_통과한다():
    ontology = _ontology()
    for spec in GRAPH_POLICY_V1.path_specs:
        assert validate_spec(ontology, spec) == ()


def test_등록되지_않은_엣지_유형의_사슬은_탐색하지_않는다():
    spec = PathSpec(
        path_type="unknown",
        start_node_type="Posting",
        start_layer=GraphLayer.SEMANTIC,
        steps=(PathStep(edge_type="INVENTED", graph_layer=GraphLayer.SEMANTIC),),
    )

    violations = validate_spec(_ontology(), spec)
    outcome = traverse(
        _posting_view(), spec, GRAPH_POLICY_V1, ontology=_ontology()
    )

    assert violations[0].reason_code == REASON_EDGE_TYPE_NOT_REGISTERED
    assert outcome.paths == ()
    assert outcome.violations


def test_허용되지_않은_연결의_사슬은_판정에서_걸린다():
    spec = PathSpec(
        path_type="bad",
        start_node_type="Capability",
        start_layer=GraphLayer.SEMANTIC,
        steps=(PathStep(edge_type="REQUIRES", graph_layer=GraphLayer.SEMANTIC),),
    )

    violations = validate_spec(_ontology(), spec)

    assert violations[0].reason_code == REASON_CONNECTION_NOT_ALLOWED


# ============================================================ 정책
def test_등록되지_않은_정책_버전은_예외다():
    try:
        policy_for("gp_없음")
    except KeyError:
        return
    raise AssertionError("등록되지 않은 정책 버전이 통과했다")


def test_정책이_네_경로_유형을_등록한다():
    assert GRAPH_POLICY_V1.path_types == (
        "posting_requirement_capability",
        "capability_prerequisite_chain",
        "mention_evidence_lineage",
        "mention_dimension_normalization",
    )
