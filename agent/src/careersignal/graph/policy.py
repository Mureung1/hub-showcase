"""그래프 탐색 정책과 경로 유형 등록 목록.

`graph_paths.graph_policy_version` 이 가리키는 값이며 네 버전 캐시 키의 한 자리다
(docs/erd.md 8.4, docs/adr/0002-graph-two-layers.md). 경로 유형의 사슬은
docs/ontology-v1.md 2.2·3.2의 허용 연결에서 나오고, 두 층을 잇는 계보 경로의 모양은
docs/knowledge-schema.md 7.6이다.

탐색 정책을 상수가 아니라 이름 붙인 레지스트리로 둔다. 깊이·가지·방문 상한과 정렬
규칙, 경로 유형의 사슬 전부가 한 정책 버전에 묶이므로, 하나라도 바꾸려면 새 정책
버전을 등록한다. 이전에 계산한 행의 `graph_policy_version` 이 그대로 남아 옛 캐시가
어떤 규칙으로 만들어졌는지 보존된다. 같은 방식을 `taxonomy/promotion.py` 의
`taxonomy_policy_version` 이 쓴다.

이 모듈은 저장소를 import 하지 않는다. 정책은 값이며 탐색과 캐시가 이 값을 읽는다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from careersignal.graph.ontology import GraphLayer

UNKNOWN_POLICY = "등록되지 않은 그래프 탐색 정책 버전이다"
"""캐시 행이 적은 정책 버전을 코드가 모른다. 한도를 지어내지 않는다."""

UNKNOWN_PATH_TYPE = "이 정책에 등록되지 않은 경로 유형이다"
"""정책마다 경로 유형 목록이 다르다. 정책 밖의 유형을 계산하지 않는다."""

ORDER_LENGTH_THEN_IDENTIFIER = "length_then_identifier"
"""`weight` 가 비어 있을 때 쓰는 대체 정렬 규칙의 이름.

`weight` 는 집계 이후에 채우는 후행 값이므로 그래프 구축 시점에는 비어 있다
(docs/ontology-v1.md 6장). 비어 있는 동안 경로 탐색은 동작하고 순위만 정해지지
않는다. 순위가 없어도 저장 순서는 하나로 정해져야 재실행이 같은 캐시를 만들므로,
가중치가 모두 있는 경로를 앞에 두고 나머지는 경로 길이와 식별자 사전순으로 가른다.
판정은 `traversal.path_sort_key` 가 수행한다.
"""

POSTING_REQUIREMENT_CAPABILITY = "posting_requirement_capability"
"""공고에서 요구 차원·기술을 거쳐 역량까지. 해석과 전략의 탐색 입력이다."""

CAPABILITY_PREREQUISITE_CHAIN = "capability_prerequisite_chain"
"""역량에서 선수 역량으로 이어지는 사슬. 준비 로드맵의 순서 판정에 쓴다."""

MENTION_EVIDENCE_LINEAGE = "mention_evidence_lineage"
"""원문 표현에서 청크를 거쳐 스냅샷까지. 근거 위치 표시의 계보 경로다."""

MENTION_DIMENSION_NORMALIZATION = "mention_dimension_normalization"
"""원문 표현에서 정규화된 차원까지. 두 층을 잇는 유일한 엣지를 지난다."""


class PathStep(BaseModel):
    """경로 사슬의 한 홉.

    층을 함께 선언한다. `ASSIGNED_TO` 만 provenance 에서 semantic 으로 넘어가므로
    (docs/ontology-v1.md 3.2) 어느 층의 등록 목록으로 이 홉을 판정하는지가 사슬
    정의에 드러나야 한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    edge_type: str
    graph_layer: GraphLayer


class PathSpec(BaseModel):
    """경로 유형 하나의 정의. `graph_paths.path_type` 의 값이 된다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    path_type: str
    start_node_type: str
    start_layer: GraphLayer
    steps: tuple[PathStep, ...] = Field(min_length=1)

    repeating: bool = False
    """같은 홉을 깊이 상한까지 반복하는가.

    참이면 사슬의 길이가 정해지지 않는다. `PREREQUISITE_OF` 처럼 자기 참조 유형이
    같은 엣지가 여기 해당하며, 길이 1 이상의 모든 사슬이 각각 하나의 경로다.
    거짓이면 사슬을 끝까지 지난 경로만 결과가 된다.
    """

    @property
    def edge_types(self) -> tuple[str, ...]:
        return tuple(step.edge_type for step in self.steps)

    def step_at(self, depth: int) -> PathStep:
        """이 깊이에서 따라갈 홉. 반복 사슬은 언제나 첫 홉이다."""
        if self.repeating:
            return self.steps[0]
        return self.steps[depth]

    @property
    def fixed_length(self) -> int | None:
        """완성된 경로의 길이. 반복 사슬은 정해지지 않는다."""
        return None if self.repeating else len(self.steps)


class TraversalPolicy(BaseModel):
    """탐색 한도와 정렬 규칙, 경로 유형 한 벌.

    정책 버전 하나가 탐색의 모든 규칙을 정한다. 값을 바꾸려면 새 정책 버전을
    등록한다. 캐시 키가 정책 버전을 포함하므로 옛 정책으로 만든 경로는 지워지지
    않고 남는다(docs/erd.md 8.4).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    graph_policy_version: str

    max_depth: int = Field(ge=1)
    """따라갈 홉의 최대 수. 반복 사슬의 길이를 여기서 끊는다."""

    max_branching: int = Field(ge=1)
    """한 노드에서 이어갈 나가는 엣지의 최대 수. 정렬 뒤 앞에서부터 센다."""

    max_visits: int = Field(ge=1)
    """한 경로 유형의 실행에서 살펴볼 엣지의 최대 수. 넘으면 탐색을 멈춘다."""

    max_paths: int = Field(ge=1)
    """한 경로 유형이 남길 경로의 최대 수."""

    order_rule: str
    """정렬 규칙의 이름. 캐시 행의 순서가 어떤 규칙으로 정해졌는지 남긴다."""

    path_specs: tuple[PathSpec, ...] = Field(min_length=1)

    @property
    def path_types(self) -> tuple[str, ...]:
        """이 정책이 계산하는 경로 유형. 선언 순서가 실행 순서다."""
        return tuple(spec.path_type for spec in self.path_specs)

    def spec(self, path_type: str) -> PathSpec:
        for spec in self.path_specs:
            if spec.path_type == path_type:
                return spec
        raise KeyError(f"{UNKNOWN_PATH_TYPE}: {path_type}")


SPEC_POSTING_REQUIREMENT_CAPABILITY = PathSpec(
    path_type=POSTING_REQUIREMENT_CAPABILITY,
    start_node_type="Posting",
    start_layer=GraphLayer.SEMANTIC,
    steps=(
        PathStep(edge_type="REQUIRES", graph_layer=GraphLayer.SEMANTIC),
        PathStep(edge_type="REQUIRES_CAPABILITY", graph_layer=GraphLayer.SEMANTIC),
    ),
)
"""`Posting → RequirementDimension|Technology → Capability`.

두 홉 모두 분류체계에 의존하는 엣지다. 도착 유형이 둘인 것은 `Technology` 가
`RequirementDimension` 의 부분집합이기 때문이며, 허용 연결이 두 유형을 함께 담는다
(docs/ontology-v1.md 2.2).
"""

SPEC_CAPABILITY_PREREQUISITE_CHAIN = PathSpec(
    path_type=CAPABILITY_PREREQUISITE_CHAIN,
    start_node_type="Capability",
    start_layer=GraphLayer.SEMANTIC,
    steps=(PathStep(edge_type="PREREQUISITE_OF", graph_layer=GraphLayer.SEMANTIC),),
    repeating=True,
)
"""`Capability → PREREQUISITE_OF → …`.

자기 참조 유형이 같은 유일한 엣지다. 순환은 준비 로드맵의 검증이 검사하지만
(docs/ontology-v1.md 2.2) 탐색은 검증을 기다리지 않고 순환을 만나면 끊고 사유를
남긴다.
"""

SPEC_MENTION_EVIDENCE_LINEAGE = PathSpec(
    path_type=MENTION_EVIDENCE_LINEAGE,
    start_node_type="RequirementMention",
    start_layer=GraphLayer.PROVENANCE,
    steps=(
        PathStep(edge_type="EVIDENCED_BY", graph_layer=GraphLayer.PROVENANCE),
        PathStep(edge_type="PART_OF", graph_layer=GraphLayer.PROVENANCE),
    ),
)
"""`RequirementMention → Chunk → SourceSnapshot`.

계보 경로의 마지막 두 홉이다(docs/knowledge-schema.md 7.6). 원문 문장의 자리까지
내려가는 경로이므로 근거 표시가 이 유형을 읽는다.
"""

SPEC_MENTION_DIMENSION_NORMALIZATION = PathSpec(
    path_type=MENTION_DIMENSION_NORMALIZATION,
    start_node_type="RequirementMention",
    start_layer=GraphLayer.PROVENANCE,
    steps=(PathStep(edge_type="ASSIGNED_TO", graph_layer=GraphLayer.PROVENANCE),),
)
"""`RequirementMention → RequirementDimension|Technology`.

provenance 에서 semantic 으로 넘어가는 유일한 홉이다. 다른 어떤 경로 유형도 층을
넘지 않는다.
"""

GRAPH_POLICY_V1 = TraversalPolicy(
    graph_policy_version="gp_v1",
    max_depth=4,
    max_branching=16,
    max_visits=5_000,
    max_paths=500,
    order_rule=ORDER_LENGTH_THEN_IDENTIFIER,
    path_specs=(
        SPEC_POSTING_REQUIREMENT_CAPABILITY,
        SPEC_CAPABILITY_PREREQUISITE_CHAIN,
        SPEC_MENTION_EVIDENCE_LINEAGE,
        SPEC_MENTION_DIMENSION_NORMALIZATION,
    ),
)
"""백엔드 직무 v1 의 탐색 정책.

공고 30건 규모에서 한도를 넉넉히 잡는다. 깊이 4는 선수 역량 사슬이 실제로 길어질
수 있는 유일한 유형이라는 사실에서 오고, 나머지 유형은 사슬 길이가 정해져 있어
깊이 상한에 닿지 않는다.
"""

POLICIES: dict[str, TraversalPolicy] = {
    GRAPH_POLICY_V1.graph_policy_version: GRAPH_POLICY_V1
}
"""등록된 정책 버전. 캐시 행이 적은 값을 여기서 찾는다."""


def policy_for(graph_policy_version: str) -> TraversalPolicy:
    """정책 버전 하나의 한도와 경로 유형.

    등록되지 않은 버전은 예외다. 기본값으로 넘어가면 어떤 한도로 계산한 캐시인지
    행만 보고 알 수 없다.
    """
    policy = POLICIES.get(graph_policy_version)
    if policy is None:
        raise KeyError(f"{UNKNOWN_POLICY}: {graph_policy_version}")
    return policy


__all__ = [
    "CAPABILITY_PREREQUISITE_CHAIN",
    "GRAPH_POLICY_V1",
    "MENTION_DIMENSION_NORMALIZATION",
    "MENTION_EVIDENCE_LINEAGE",
    "ORDER_LENGTH_THEN_IDENTIFIER",
    "POLICIES",
    "POSTING_REQUIREMENT_CAPABILITY",
    "SPEC_CAPABILITY_PREREQUISITE_CHAIN",
    "SPEC_MENTION_DIMENSION_NORMALIZATION",
    "SPEC_MENTION_EVIDENCE_LINEAGE",
    "SPEC_POSTING_REQUIREMENT_CAPABILITY",
    "UNKNOWN_PATH_TYPE",
    "UNKNOWN_POLICY",
    "PathSpec",
    "PathStep",
    "TraversalPolicy",
    "policy_for",
]
