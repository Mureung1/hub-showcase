"""데이터 변경별 재실행 범위 계산.

표는 docs/architecture.md 7.1 이다. 이 모듈은 그 표를 코드로 옮긴 것이며 열 이름과
칸의 값을 문서의 글자 그대로 쓴다. 문서와 코드가 같은 낱말을 쓰지 않으면 표가
바뀌었을 때 어느 칸이 코드의 어느 분기인지 사람이 다시 맞춰야 한다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 변경 유형과 범위만 받아
어떤 단계를 어느 범위로 다시 돌릴지 돌려준다. 실제 실행은 `schedule.py` 가
차례를 정하고 `orchestrator.py` 가 시작한다.

칸의 값 가운데 `미실행` 과 `Express에서 재조합` 만 실행을 만들지 않는다. 둘은
다른 이유로 실행이 없다. 앞은 그 변경이 그 단계의 산출물을 흔들지 않는다는
뜻이고, 뒤는 산출물이 이미 있고 조합만 조회 시점에 다시 한다는 뜻이다(같은 문서
9.1). 하나로 뭉뚱그리면 로드맵을 다시 계산하지 않은 이유를 잃는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from careersignal.domain.scope import Scope, ScopeLevel


class Stage(StrEnum):
    """docs/architecture.md 7.1 표의 열 이름."""

    COLLECT_INDEX = "수집·인덱싱"
    MENTION_DIMENSION = "mention·차원"
    STATISTICS = "통계"
    GRAPH_WIKI = "그래프·Wiki"
    INTERPRETATION = "해석"
    STRATEGY = "전략"
    ROADMAP = "로드맵"


STAGE_ORDER: tuple[Stage, ...] = (
    Stage.COLLECT_INDEX,
    Stage.MENTION_DIMENSION,
    Stage.STATISTICS,
    Stage.GRAPH_WIKI,
    Stage.INTERPRETATION,
    Stage.STRATEGY,
    Stage.ROADMAP,
)
"""표의 왼쪽에서 오른쪽 차례. 이 차례가 곧 의존의 방향이다.

실행 순서 자체는 `schedule.py` 의 그래프가 정한다. 여기서는 표를 읽고 쓰는 차례를
고정해 같은 변경이 언제나 같은 순서의 결과를 내게 한다.
"""


class RerunScope(StrEnum):
    """표의 칸에 적힌 값.

    `실행`·`미실행` 은 수집·인덱싱 열에만 나오는 실행 여부이고 나머지는 범위다.
    한 열거값으로 묶는 이유는 칸 하나가 둘 중 어느 쪽이든 될 수 있기 때문이다.
    """

    RUN = "실행"
    NOT_RUN = "미실행"
    JOB_ROLE = "해당 직무"
    JOB_ROLE_CLUSTER_PERIOD = "해당 직무·기업군·기간"
    AFFECTED_SCOPE = "영향 범위"
    TWO_JOB_ROLES = "두 직무"
    JOB_ROLE_AND_BOTH_CLUSTERS = "직무 전체와 이전·새 기업군"
    CLUSTER_EDGES_ONLY = "기업군 엣지만"
    SAME_SCOPE = "동일 범위"
    FULL_REASSIGNMENT = "전량 재할당"
    WHOLE_JOB_ROLE = "해당 직무 전체"
    WIKI_LINKED_SCOPE = "Wiki 연결 범위"
    LINKED_SCOPE = "연결된 범위"
    STANDARD_LINK_REFRESH = "표준 연결 갱신"
    AFFECTED_JOB_ROLE = "영향 직무"
    EDGE_WEIGHT_AND_DEPTH = "엣지 weight와 깊이 기준"
    EXPRESS_RECOMBINE = "Express에서 재조합"


class ChangeType(StrEnum):
    """표의 행. 값은 저장과 로그에 쓰는 식별자이고 표시 이름은 `CHANGE_LABELS` 다."""

    POSTING = "posting"
    POSTING_JOB_ROLE = "posting_job_role"
    POSTING_CLUSTER = "posting_cluster"
    TAXONOMY_VERSION = "taxonomy_version"
    ONTOLOGY_VERSION = "ontology_version"
    COMPANY_OFFICIAL_SOURCE = "company_official_source"
    PUBLIC_STANDARD_SOURCE = "public_standard_source"
    EXTERNAL_STRATEGY_SOURCE = "external_strategy_source"
    METRIC_POLICY_VERSION = "metric_policy_version"
    USER_CHECK_STATE = "user_check_state"


CHANGE_LABELS: dict[ChangeType, str] = {
    ChangeType.POSTING: "신규·수정·삭제 채용공고",
    ChangeType.POSTING_JOB_ROLE: "공고의 직무 분류 변경",
    ChangeType.POSTING_CLUSTER: "공고의 기업군 분류 변경",
    ChangeType.TAXONOMY_VERSION: "분류체계 버전 발행",
    ChangeType.ONTOLOGY_VERSION: "온톨로지 버전 발행",
    ChangeType.COMPANY_OFFICIAL_SOURCE: "회사 공식 자료",
    ChangeType.PUBLIC_STANDARD_SOURCE: "공공·직무 표준",
    ChangeType.EXTERNAL_STRATEGY_SOURCE: "외부 전략 자료",
    ChangeType.METRIC_POLICY_VERSION: "지표 정책 버전",
    ChangeType.USER_CHECK_STATE: "사용자 체크 상태",
}
"""표의 `변경 데이터` 열. 문서의 글자 그대로 둔다."""


IMPACT_TABLE: dict[ChangeType, dict[Stage, RerunScope]] = {
    ChangeType.POSTING: {
        Stage.COLLECT_INDEX: RerunScope.RUN,
        Stage.MENTION_DIMENSION: RerunScope.JOB_ROLE,
        Stage.STATISTICS: RerunScope.JOB_ROLE_CLUSTER_PERIOD,
        Stage.GRAPH_WIKI: RerunScope.AFFECTED_SCOPE,
        Stage.INTERPRETATION: RerunScope.AFFECTED_SCOPE,
        Stage.STRATEGY: RerunScope.AFFECTED_SCOPE,
        Stage.ROADMAP: RerunScope.AFFECTED_SCOPE,
    },
    ChangeType.POSTING_JOB_ROLE: {
        Stage.COLLECT_INDEX: RerunScope.RUN,
        Stage.MENTION_DIMENSION: RerunScope.TWO_JOB_ROLES,
        Stage.STATISTICS: RerunScope.TWO_JOB_ROLES,
        Stage.GRAPH_WIKI: RerunScope.TWO_JOB_ROLES,
        Stage.INTERPRETATION: RerunScope.TWO_JOB_ROLES,
        Stage.STRATEGY: RerunScope.TWO_JOB_ROLES,
        Stage.ROADMAP: RerunScope.TWO_JOB_ROLES,
    },
    ChangeType.POSTING_CLUSTER: {
        Stage.COLLECT_INDEX: RerunScope.RUN,
        Stage.MENTION_DIMENSION: RerunScope.NOT_RUN,
        Stage.STATISTICS: RerunScope.JOB_ROLE_AND_BOTH_CLUSTERS,
        Stage.GRAPH_WIKI: RerunScope.CLUSTER_EDGES_ONLY,
        Stage.INTERPRETATION: RerunScope.SAME_SCOPE,
        Stage.STRATEGY: RerunScope.SAME_SCOPE,
        Stage.ROADMAP: RerunScope.SAME_SCOPE,
    },
    ChangeType.TAXONOMY_VERSION: {
        Stage.COLLECT_INDEX: RerunScope.NOT_RUN,
        Stage.MENTION_DIMENSION: RerunScope.FULL_REASSIGNMENT,
        Stage.STATISTICS: RerunScope.WHOLE_JOB_ROLE,
        Stage.GRAPH_WIKI: RerunScope.WHOLE_JOB_ROLE,
        Stage.INTERPRETATION: RerunScope.AFFECTED_SCOPE,
        Stage.STRATEGY: RerunScope.AFFECTED_SCOPE,
        Stage.ROADMAP: RerunScope.AFFECTED_SCOPE,
    },
    ChangeType.ONTOLOGY_VERSION: {
        Stage.COLLECT_INDEX: RerunScope.NOT_RUN,
        Stage.MENTION_DIMENSION: RerunScope.NOT_RUN,
        Stage.STATISTICS: RerunScope.NOT_RUN,
        Stage.GRAPH_WIKI: RerunScope.WHOLE_JOB_ROLE,
        Stage.INTERPRETATION: RerunScope.AFFECTED_SCOPE,
        Stage.STRATEGY: RerunScope.AFFECTED_SCOPE,
        Stage.ROADMAP: RerunScope.AFFECTED_SCOPE,
    },
    ChangeType.COMPANY_OFFICIAL_SOURCE: {
        Stage.COLLECT_INDEX: RerunScope.RUN,
        Stage.MENTION_DIMENSION: RerunScope.NOT_RUN,
        Stage.STATISTICS: RerunScope.NOT_RUN,
        Stage.GRAPH_WIKI: RerunScope.WIKI_LINKED_SCOPE,
        Stage.INTERPRETATION: RerunScope.LINKED_SCOPE,
        Stage.STRATEGY: RerunScope.AFFECTED_SCOPE,
        Stage.ROADMAP: RerunScope.AFFECTED_SCOPE,
    },
    ChangeType.PUBLIC_STANDARD_SOURCE: {
        Stage.COLLECT_INDEX: RerunScope.RUN,
        Stage.MENTION_DIMENSION: RerunScope.STANDARD_LINK_REFRESH,
        Stage.STATISTICS: RerunScope.AFFECTED_JOB_ROLE,
        Stage.GRAPH_WIKI: RerunScope.AFFECTED_JOB_ROLE,
        Stage.INTERPRETATION: RerunScope.AFFECTED_JOB_ROLE,
        Stage.STRATEGY: RerunScope.AFFECTED_JOB_ROLE,
        Stage.ROADMAP: RerunScope.AFFECTED_JOB_ROLE,
    },
    ChangeType.EXTERNAL_STRATEGY_SOURCE: {
        Stage.COLLECT_INDEX: RerunScope.RUN,
        Stage.MENTION_DIMENSION: RerunScope.NOT_RUN,
        Stage.STATISTICS: RerunScope.NOT_RUN,
        Stage.GRAPH_WIKI: RerunScope.WIKI_LINKED_SCOPE,
        Stage.INTERPRETATION: RerunScope.NOT_RUN,
        Stage.STRATEGY: RerunScope.LINKED_SCOPE,
        Stage.ROADMAP: RerunScope.LINKED_SCOPE,
    },
    ChangeType.METRIC_POLICY_VERSION: {
        Stage.COLLECT_INDEX: RerunScope.NOT_RUN,
        Stage.MENTION_DIMENSION: RerunScope.NOT_RUN,
        Stage.STATISTICS: RerunScope.WHOLE_JOB_ROLE,
        Stage.GRAPH_WIKI: RerunScope.EDGE_WEIGHT_AND_DEPTH,
        Stage.INTERPRETATION: RerunScope.AFFECTED_SCOPE,
        Stage.STRATEGY: RerunScope.AFFECTED_SCOPE,
        Stage.ROADMAP: RerunScope.AFFECTED_SCOPE,
    },
    ChangeType.USER_CHECK_STATE: {
        Stage.COLLECT_INDEX: RerunScope.NOT_RUN,
        Stage.MENTION_DIMENSION: RerunScope.NOT_RUN,
        Stage.STATISTICS: RerunScope.NOT_RUN,
        Stage.GRAPH_WIKI: RerunScope.NOT_RUN,
        Stage.INTERPRETATION: RerunScope.NOT_RUN,
        Stage.STRATEGY: RerunScope.NOT_RUN,
        Stage.ROADMAP: RerunScope.EXPRESS_RECOMBINE,
    },
}
"""docs/architecture.md 7.1 의 열 줄. 빈 칸을 두지 않는다.

칸을 비우면 그 변경이 그 단계를 건드리지 않는다는 판단과 아직 정하지 않았다는
상태를 구분할 수 없다. 열 줄 하나가 일곱 칸을 모두 갖는지는 검사가 지킨다.
"""


NO_RERUN: frozenset[RerunScope] = frozenset(
    {RerunScope.NOT_RUN, RerunScope.EXPRESS_RECOMBINE}
)
"""분석 실행을 만들지 않는 칸.

`Express에서 재조합` 은 로드맵 산출물을 다시 만들지 않고 조회 시점에 체크 상태만
겹쳐 보인다(docs/architecture.md 9.1). 오케스트레이터가 시작할 실행이 없다는 점은
`미실행` 과 같아 여기 함께 둔다.
"""

WIDENS_TO_JOB_ROLE: frozenset[RerunScope] = frozenset(
    {
        RerunScope.JOB_ROLE,
        RerunScope.WHOLE_JOB_ROLE,
        RerunScope.AFFECTED_JOB_ROLE,
        RerunScope.FULL_REASSIGNMENT,
        RerunScope.STANDARD_LINK_REFRESH,
        RerunScope.EDGE_WEIGHT_AND_DEPTH,
    }
)
"""변경이 관찰된 자리보다 넓게, 직무 전체로 다시 도는 칸.

공고 한 건이 바뀌어도 차원 할당과 분류체계·지표 정책이 걸린 계산은 직무 전체가
같은 기준을 써야 한다. 좁은 범위만 다시 돌리면 한 기업군의 수치만 새 기준이 된다.
"""


@dataclass(frozen=True, slots=True)
class ChangeEvent:
    """오케스트레이터가 받은 데이터 변경 하나.

    `scope` 는 변경이 관찰된 자리다. 공고 한 건이면 `posting`, 기업군 재분류면
    `cluster` 다. 표의 칸이 이 자리를 넓히거나 그대로 쓴다.

    `previous_job_role_id` 와 `previous_cluster_id` 는 재분류에서만 채운다.
    바뀌기 전 분류의 통계도 다시 세야 하는데, 변경 뒤의 행만 보면 그 값을 알 수
    없기 때문이다.
    """

    change_type: ChangeType
    scope: Scope
    previous_job_role_id: str | None = None
    previous_cluster_id: str | None = None
    cluster_id: str | None = None

    @property
    def label(self) -> str:
        return CHANGE_LABELS[self.change_type]


@dataclass(frozen=True, slots=True)
class StageImpact:
    """단계 하나가 받은 영향."""

    stage: Stage
    rerun: RerunScope
    scopes: tuple[Scope, ...]

    @property
    def runs(self) -> bool:
        return self.rerun not in NO_RERUN


@dataclass(frozen=True, slots=True)
class ImpactPlan:
    """변경 하나가 만든 일곱 단계의 판정."""

    event: ChangeEvent
    impacts: tuple[StageImpact, ...]

    def impact_of(self, stage: Stage) -> StageImpact:
        for impact in self.impacts:
            if impact.stage is stage:
                return impact
        raise KeyError(f"표에 없는 단계: {stage}")

    def runs(self, stage: Stage) -> bool:
        return self.impact_of(stage).runs

    @property
    def stages_to_run(self) -> tuple[Stage, ...]:
        """다시 돌릴 단계. 표의 왼쪽에서 오른쪽 차례를 지킨다."""
        return tuple(i.stage for i in self.impacts if i.runs)

    @property
    def anything_runs(self) -> bool:
        return bool(self.stages_to_run)


def rerun_scope(change_type: ChangeType, stage: Stage) -> RerunScope:
    """표의 칸 하나를 읽는다."""
    row = IMPACT_TABLE.get(change_type)
    if row is None:
        raise KeyError(f"표에 없는 변경 유형: {change_type}")
    cell = row.get(stage)
    if cell is None:
        raise KeyError(f"{change_type} 행에 {stage} 칸이 없다")
    return cell


def _overall(job_role_id: str) -> Scope:
    return Scope(job_role_id=job_role_id, level=ScopeLevel.OVERALL)


def target_scopes(event: ChangeEvent, rerun: RerunScope) -> tuple[Scope, ...]:
    """칸의 값이 가리키는 범위를 실제 범위로 푼다.

    실행이 없는 칸은 빈 값이다. 나머지는 적어도 하나를 돌려준다. 같은 범위가 두 번
    나오면 하나로 접는다. 두 직무나 두 기업군을 도는 칸이 원래 자리와 겹칠 수 있다.
    """
    if rerun in NO_RERUN:
        return ()

    job_role_id = event.scope.job_role_id
    if rerun is RerunScope.TWO_JOB_ROLES:
        if not event.previous_job_role_id:
            raise ValueError(
                f"{event.label} 은 이전 직무가 있어야 두 직무를 다시 돌릴 수 있다"
            )
        return _dedupe((_overall(event.previous_job_role_id), _overall(job_role_id)))

    if rerun is RerunScope.JOB_ROLE_AND_BOTH_CLUSTERS:
        new_cluster = event.cluster_id or (
            event.scope.scope_id if event.scope.level is ScopeLevel.CLUSTER else None
        )
        if not event.previous_cluster_id or not new_cluster:
            raise ValueError(
                f"{event.label} 은 이전 기업군과 새 기업군이 모두 있어야 한다"
            )
        return _dedupe(
            (
                _overall(job_role_id),
                Scope(job_role_id, ScopeLevel.CLUSTER, event.previous_cluster_id),
                Scope(job_role_id, ScopeLevel.CLUSTER, new_cluster),
            )
        )

    if rerun in WIDENS_TO_JOB_ROLE:
        return (_overall(job_role_id),)
    return (event.scope,)


def _dedupe(scopes: tuple[Scope, ...]) -> tuple[Scope, ...]:
    """같은 범위를 한 번만 남긴다. 처음 나온 차례를 지킨다."""
    seen: dict[str, Scope] = {}
    for scope in scopes:
        seen.setdefault(scope.key, scope)
    return tuple(seen.values())


def impact_of(event: ChangeEvent) -> ImpactPlan:
    """변경 유형과 범위를 받아 일곱 단계의 재실행 판정을 돌려준다.

    표에 적힌 판정만 옮긴다. 어느 단계를 먼저 도는지는 이 함수가 정하지 않는다.
    """
    impacts = tuple(
        StageImpact(
            stage=stage,
            rerun=(cell := rerun_scope(event.change_type, stage)),
            scopes=target_scopes(event, cell),
        )
        for stage in STAGE_ORDER
    )
    return ImpactPlan(event=event, impacts=impacts)
