"""경로 캐시 실행.

표는 docs/erd.md 8.4의 `graph_paths` 이고 캐시라는 지위는
docs/knowledge-schema.md 7.5, docs/adr/0002-graph-two-layers.md 다. 진실의 원천은
`knowledge_edges` 이며 경로는 버전이 고정된 엣지에서 계산한다.

캐시 키는 네 버전이다. `taxonomy_version_id`, `knowledge_version`,
`analysis_version`, `graph_policy_version` 가운데 하나라도 다르면 다른 키이며 캐시
미스다. 분류체계 버전을 발행하면 의존 노드·엣지를 재구축하므로
(docs/knowledge-schema.md 7.4) 이 키가 실제 의존 관계와 일치한다.

쓰기 범위는 계보 기록 파이프라인이다(docs/permission-matrix.md 3장). 탐색 자체는
`graph/traversal.py` 의 순수 함수가 수행하고 이 모듈은 조회, 캐시 판정, 저장을
잇는다.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.graph.ontology import Ontology, Violation
from careersignal.graph.policy import GRAPH_POLICY_V1, policy_for
from careersignal.graph.semantic import ONTOLOGY_VERSION
from careersignal.graph.traversal import (
    GraphPath,
    GraphView,
    TraversalCut,
    traverse,
)

PATH_PREFIX = "path_"
"""`graph_paths.path_id` 의 접두사. docs/erd.md 2.2에 자리가 없어 표 이름을 따른다."""

DIGEST_LENGTH = 24
"""해시에서 잘라 쓰는 길이. `graph/identifiers.py` 와 같다."""

MATERIAL_SEPARATOR = ":"
SEQUENCE_SEPARATOR = ">"
"""재료를 잇는 문자. 식별자와 열의 경계를 다른 문자로 나눈다."""

NO_ONTOLOGY = "온톨로지 버전이 등록되어 있지 않다"
NO_GRAPH = "그래프에 노드가 없다"
NO_PATHS = "사슬을 완성하는 경로가 없다"
SPEC_REJECTED = "사슬이 허용 연결을 어긴다"
"""건너뛴 경로 유형의 사유. 만들 것이 없는 상태와 규칙 위반을 구분한다."""


def path_identifier(
    path_type: str,
    node_sequence: tuple[str, ...],
    edge_sequence: tuple[str, ...],
    taxonomy_version_id: str | None,
    knowledge_version: str | None,
    analysis_version: str,
    graph_policy_version: str,
) -> str:
    """같은 캐시 키의 같은 경로는 같은 식별자다.

    재료에 네 버전을 모두 넣는다. 버전이 하나만 달라도 다른 행이 되므로, 재실행이
    같은 경로를 다시 계산해도 이전 버전의 행을 덮어쓰지 않는다.
    """
    material = MATERIAL_SEPARATOR.join(
        (
            path_type,
            SEQUENCE_SEPARATOR.join(node_sequence),
            SEQUENCE_SEPARATOR.join(edge_sequence),
            taxonomy_version_id or "",
            knowledge_version or "",
            analysis_version,
            graph_policy_version,
        )
    )
    return PATH_PREFIX + hashlib.sha256(material.encode()).hexdigest()[:DIGEST_LENGTH]


class CacheKey(BaseModel):
    """경로 캐시의 키. 네 버전과 경로 유형이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    path_type: str
    taxonomy_version_id: str | None = None
    knowledge_version: str | None = None
    analysis_version: str
    graph_policy_version: str

    @classmethod
    def of(
        cls, path_type: str, context: RunContext, graph_policy_version: str
    ) -> CacheKey:
        """실행 봉투가 고정한 버전으로 키를 만든다."""
        return cls(
            path_type=path_type,
            taxonomy_version_id=context.taxonomy_version_id,
            knowledge_version=context.knowledge_version,
            analysis_version=context.analysis_version,
            graph_policy_version=graph_policy_version,
        )

    def as_filter(self) -> dict[str, Any]:
        """조회와 저장에 쓰는 컬럼 값."""
        return {
            "path_type": self.path_type,
            "taxonomy_version_id": self.taxonomy_version_id,
            "knowledge_version": self.knowledge_version,
            "analysis_version": self.analysis_version,
            "graph_policy_version": self.graph_policy_version,
        }

    def row(self, path: GraphPath, computed_at: datetime) -> dict[str, Any]:
        """저장할 경로 한 줄. 컬럼은 docs/erd.md 8.4다."""
        return {
            "path_id": path_identifier(
                self.path_type,
                path.node_sequence,
                path.edge_sequence,
                self.taxonomy_version_id,
                self.knowledge_version,
                self.analysis_version,
                self.graph_policy_version,
            ),
            "path_type": self.path_type,
            "node_sequence": list(path.node_sequence),
            "edge_sequence": list(path.edge_sequence),
            "taxonomy_version_id": self.taxonomy_version_id,
            "knowledge_version": self.knowledge_version,
            "analysis_version": self.analysis_version,
            "graph_policy_version": self.graph_policy_version,
            "computed_at": computed_at,
        }


class PathCacheOutcome(BaseModel):
    """경로 캐시 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    graph_policy_version: str
    ontology_version: str

    hits: dict[str, int] = Field(default_factory=dict)
    """경로 유형에서 캐시가 준 경로 수로 가는 대응. 다시 계산하지 않은 유형이다."""

    misses: dict[str, int] = Field(default_factory=dict)
    """경로 유형에서 새로 계산한 경로 수로 가는 대응."""

    visited: dict[str, int] = Field(default_factory=dict)
    """경로 유형별로 살펴본 엣지 수."""

    cuts: tuple[TraversalCut, ...] = ()
    """끊은 자리와 사유. 순환과 상한이 모두 여기 남는다."""

    violations: tuple[Violation, ...] = ()
    """온톨로지를 어겨 탐색하지 않은 사슬."""

    invalidated: int = 0
    """무효화로 지운 행의 수."""

    skipped_types: tuple[tuple[str, str], ...] = ()
    """계산하지 않은 경로 유형. `(유형, 사유)` 다."""

    errors: tuple[tuple[str, str], ...] = ()
    """실행 전제의 실패. `(대상, 사유)` 다."""

    @property
    def hit_count(self) -> int:
        return sum(self.hits.values())

    @property
    def miss_count(self) -> int:
        return sum(self.misses.values())

    @property
    def path_count(self) -> int:
        return self.hit_count + self.miss_count

    @property
    def gained_evidence(self) -> bool:
        return self.miss_count > 0

    def cut_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for cut in self.cuts:
            counts[cut.reason_code] = counts.get(cut.reason_code, 0) + 1
        return counts


class PathSource(Protocol):
    """실행이 저장소에 요구하는 것.

    좁게 잡아 대역으로 검증할 수 있게 한다. `GraphPathRepository` 가 이 모양을
    만족한다.
    """

    def ontology_rows(self, ontology_version: str) -> list[dict[str, Any]]: ...

    def traversal_nodes(self, ontology_version: str) -> list[dict[str, Any]]: ...

    def traversal_edges(self, ontology_version: str) -> list[dict[str, Any]]: ...

    def cached_paths(self, key: dict[str, Any]) -> list[dict[str, Any]]: ...

    def add_path(self, values: dict[str, Any]) -> None: ...

    def delete_stale_paths(self, key: dict[str, Any]) -> int: ...


class GraphPathRunner:
    """정책이 등록한 경로 유형을 계산해 캐시에 담는다.

    캐시 적중은 다시 계산하지 않는다. `graph_paths` 는 UPDATE 로 고치는 표가 아니라
    지우고 다시 계산하는 캐시이므로(docs/erd.md 14장) 적중한 키의 행을 건드리지
    않는다.
    """

    def __init__(self, repository: PathSource) -> None:
        self._repository = repository

    def run(
        self,
        context: RunContext,
        ontology_version: str = ONTOLOGY_VERSION,
        graph_policy_version: str = GRAPH_POLICY_V1.graph_policy_version,
        computed_at: datetime | None = None,
    ) -> PathCacheOutcome:
        """등록된 경로 유형을 선언 순서대로 계산한다.

        그래프가 비어 있으면 모든 유형을 건너뛰고 사실을 결과에 남긴다. 냉시작에서
        요구 차원과 역량이 아직 없는 것이 정상 상태이므로, 만들 것이 없는 실행과
        전제가 깨진 실행을 구분한다.
        """
        policy = policy_for(graph_policy_version)
        rows = self._repository.ontology_rows(ontology_version)
        if not rows:
            return PathCacheOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.EXPLICIT_FAILURE,
                graph_policy_version=graph_policy_version,
                ontology_version=ontology_version,
                errors=((ontology_version, NO_ONTOLOGY),),
            )

        ontology = Ontology.from_rows(rows)
        view = GraphView.from_rows(
            self._repository.traversal_nodes(ontology_version),
            self._repository.traversal_edges(ontology_version),
        )

        hits: dict[str, int] = {}
        misses: dict[str, int] = {}
        visited: dict[str, int] = {}
        cuts: list[TraversalCut] = []
        violations: list[Violation] = []
        skipped: list[tuple[str, str]] = []
        stamp = computed_at or datetime.now()

        if view.empty:
            for spec in policy.path_specs:
                skipped.append((spec.path_type, NO_GRAPH))
            return PathCacheOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.FRONTIER_EXHAUSTED,
                graph_policy_version=graph_policy_version,
                ontology_version=ontology_version,
                skipped_types=tuple(skipped),
            )

        for spec in policy.path_specs:
            key = CacheKey.of(spec.path_type, context, graph_policy_version)
            cached = self._repository.cached_paths(key.as_filter())
            if cached:
                hits[spec.path_type] = len(cached)
                continue

            outcome = traverse(view, spec, policy, ontology=ontology)
            cuts.extend(outcome.cuts)
            violations.extend(outcome.violations)
            visited[spec.path_type] = outcome.visited

            if outcome.violations:
                skipped.append((spec.path_type, SPEC_REJECTED))
                continue
            if not outcome.paths:
                skipped.append((spec.path_type, NO_PATHS))
                continue

            for path in outcome.paths:
                self._repository.add_path(key.row(path, stamp))
            misses[spec.path_type] = len(outcome.paths)

        return PathCacheOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                computed=sum(misses.values()),
                cached=sum(hits.values()),
                violated=bool(violations),
            ),
            graph_policy_version=graph_policy_version,
            ontology_version=ontology_version,
            hits=hits,
            misses=misses,
            visited=visited,
            cuts=tuple(cuts),
            violations=tuple(violations),
            skipped_types=tuple(skipped),
        )

    def invalidate(
        self,
        context: RunContext,
        path_types: tuple[str, ...],
        graph_policy_version: str = GRAPH_POLICY_V1.graph_policy_version,
    ) -> int:
        """이 키와 어긋나는 캐시 행을 지운다.

        `run` 은 이 메서드를 부르지 않는다. 활성 분석 버전의 경로를 화면이 조회하므로
        (docs/permission-matrix.md 4장) 새 버전을 계산하는 실행이 옛 행을 지우면
        조회 대상이 사라진다. 버전을 은퇴시키는 자리에서만 부른다.
        """
        removed = 0
        for path_type in path_types:
            key = CacheKey.of(path_type, context, graph_policy_version)
            removed += self._repository.delete_stale_paths(key.as_filter())
        return removed


def _stop_reason(computed: int, cached: int, violated: bool) -> StopReason:
    """docs/agent-design.md 11.3의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 사슬이 규칙을 어긴 실행을 만들 것이 없던 실행과 같게 볼
    수 없고, 캐시가 전부 적중한 실행은 새 근거를 얻지 못한 것이다.
    """
    if violated:
        return StopReason.EXPLICIT_FAILURE
    if computed:
        return StopReason.SLOTS_FILLED
    if cached:
        return StopReason.NO_NEW_EVIDENCE
    return StopReason.FRONTIER_EXHAUSTED


__all__ = [
    "DIGEST_LENGTH",
    "NO_GRAPH",
    "NO_ONTOLOGY",
    "NO_PATHS",
    "PATH_PREFIX",
    "SPEC_REJECTED",
    "CacheKey",
    "GraphPathRunner",
    "PathCacheOutcome",
    "PathSource",
    "path_identifier",
]
