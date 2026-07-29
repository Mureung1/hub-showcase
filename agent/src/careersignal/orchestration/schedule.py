"""분석 실행 순서 스케줄링.

차례의 근거는 docs/architecture.md 7장의 시퀀스다. 시퀀스를 그대로 리스트로 적지
않고 단계마다 선행 단계를 적은 그래프로 두고 위상 정렬한다. 리스트로 적으면 영향
없는 단계를 뺐을 때 남은 것들의 차례가 옳은지 사람이 다시 읽어야 하고, 문서의
시퀀스가 바뀌면 리스트의 어느 자리를 고쳐야 하는지도 눈으로 찾아야 한다.

7.1 의 표는 일곱 열이지만 시퀀스의 단계는 그보다 잘다. 수집과 인덱싱은 실행이
다르고 지식 그래프 구축과 Wiki 구축 사이에는 집계가 끼어 있다. 표의 한 열이 그
열에 속한 단계 전부의 실행 여부를 정하고, 그 안의 차례는 이 그래프가 정한다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다.

경계 하나를 값으로 지킨다. 단계 사이의 화살표는 실행의 차례일 뿐 호출이 아니다.
도메인 에이전트는 다른 에이전트를 시작하지 못하며(docs/architecture.md 4장,
AGENTS.md 의 모듈 경계) 앞 단계의 결과는 저장소에서 읽는다. `schedule` 이
`invoked_by` 를 받아 오케스트레이터가 아닌 구성요소의 요청을 거부하는 이유다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from careersignal.domain.permissions import Component
from careersignal.domain.scope import Scope
from careersignal.orchestration.impact import ImpactPlan, RerunScope, Stage


class Step(StrEnum):
    """docs/architecture.md 7장 시퀀스의 단계."""

    COLLECT = "수집"
    INDEX = "인덱싱"
    MENTION = "mention 추출과 차원 발견"
    KNOWLEDGE_GRAPH = "지식 그래프 구축"
    AGGREGATE = "집계"
    WIKI = "Wiki 구축"
    INTERPRETATION = "해석 실행"
    STRATEGY = "전략 실행"
    ROADMAP = "로드맵 실행"
    LINEAGE = "계보 기록"
    VERIFY = "분석 버전 전체 검증"


STEP_ORDER: tuple[Step, ...] = (
    Step.COLLECT,
    Step.INDEX,
    Step.MENTION,
    Step.KNOWLEDGE_GRAPH,
    Step.AGGREGATE,
    Step.WIKI,
    Step.INTERPRETATION,
    Step.STRATEGY,
    Step.ROADMAP,
    Step.LINEAGE,
    Step.VERIFY,
)
"""시퀀스에 적힌 차례. 위상 정렬이 갈릴 때만 이 차례로 가른다.

의존이 서로를 정하지 못하는 두 단계는 어느 쪽을 먼저 돌려도 되지만, 실행마다
차례가 달라지면 같은 입력의 두 실행이 같은 로그를 남기지 않는다.
"""

DEPENDENCIES: dict[Step, tuple[Step, ...]] = {
    Step.COLLECT: (),
    Step.INDEX: (Step.COLLECT,),
    Step.MENTION: (Step.INDEX,),
    Step.KNOWLEDGE_GRAPH: (Step.MENTION,),
    Step.AGGREGATE: (Step.MENTION, Step.KNOWLEDGE_GRAPH),
    Step.WIKI: (Step.KNOWLEDGE_GRAPH, Step.AGGREGATE),
    Step.INTERPRETATION: (Step.AGGREGATE, Step.WIKI),
    Step.STRATEGY: (Step.INTERPRETATION,),
    Step.ROADMAP: (Step.STRATEGY,),
    Step.LINEAGE: (Step.INTERPRETATION, Step.STRATEGY, Step.ROADMAP),
    Step.VERIFY: (Step.LINEAGE,),
}
"""단계마다 앞서야 하는 단계.

집계가 지식 그래프 뒤인 것은 집계가 엣지의 `weight` 를 채우기 때문이고, Wiki 가
집계 뒤인 것은 생성 대상 판정이 통계 우선순위를 쓰기 때문이다(docs/backlog.md
Phase 14). 계보 기록이 세 산출 단계를 모두 기다리는 것은 계보가 별도의 트리거
없이 재실행된 산출물이 저장될 때 따라 실행하기 때문이다(docs/architecture.md 7.1).
"""

STEP_STAGE: dict[Step, Stage | None] = {
    Step.COLLECT: Stage.COLLECT_INDEX,
    Step.INDEX: Stage.COLLECT_INDEX,
    Step.MENTION: Stage.MENTION_DIMENSION,
    Step.KNOWLEDGE_GRAPH: Stage.GRAPH_WIKI,
    Step.AGGREGATE: Stage.STATISTICS,
    Step.WIKI: Stage.GRAPH_WIKI,
    Step.INTERPRETATION: Stage.INTERPRETATION,
    Step.STRATEGY: Stage.STRATEGY,
    Step.ROADMAP: Stage.ROADMAP,
    Step.LINEAGE: None,
    Step.VERIFY: None,
}
"""단계가 속한 7.1 표의 열. 표에 열이 없는 단계는 비운다.

계보 기록과 검증은 어떤 변경이 왔는지와 무관하게 산출물이 하나라도 다시 만들어지면
따라 실행한다. 표에 열이 없는 것은 판정을 빠뜨린 것이 아니라 판정할 것이 없다는
뜻이다.
"""

RUNNERS: dict[Step, Component] = {
    Step.COLLECT: Component.AGENT_COLLECT,
    Step.INDEX: Component.PIPE_INDEX,
    Step.MENTION: Component.AGENT_STATS,
    Step.KNOWLEDGE_GRAPH: Component.AGENT_KNOWLEDGE,
    Step.AGGREGATE: Component.PIPE_AGGREGATE,
    Step.WIKI: Component.AGENT_KNOWLEDGE,
    Step.INTERPRETATION: Component.AGENT_INTERPRET,
    Step.STRATEGY: Component.AGENT_STRATEGY,
    Step.ROADMAP: Component.AGENT_ROADMAP,
    Step.LINEAGE: Component.PIPE_LINEAGE,
    Step.VERIFY: Component.PIPE_VERIFY,
}
"""단계를 수행하는 구성요소. 쓰기 범위는 docs/permission-matrix.md 3장이 정한다."""

FOLLOW_UP_STEPS: tuple[Step, ...] = (Step.LINEAGE, Step.VERIFY)
"""산출물이 하나라도 다시 만들어질 때만 따라 도는 단계."""

ONLY_INVOKER = Component.ORCHESTRATOR
"""단계를 시작할 수 있는 유일한 구성요소."""


@dataclass(frozen=True, slots=True)
class ScheduledStep:
    """돌릴 단계 하나."""

    step: Step
    stage: Stage | None
    runner: Component
    scopes: tuple[Scope, ...]
    rerun: RerunScope | None
    invoked_by: Component = ONLY_INVOKER
    """이 단계를 시작한 구성요소. 언제나 오케스트레이터다.

    값으로 남겨 두면 계측만 보고도 에이전트가 다른 에이전트를 시작했는지 가릴 수
    있다.
    """


@dataclass(frozen=True, slots=True)
class RunSchedule:
    """한 변경이 만든 실행 차례."""

    plan: ImpactPlan
    steps: tuple[ScheduledStep, ...]

    @property
    def step_order(self) -> tuple[Step, ...]:
        return tuple(s.step for s in self.steps)

    def includes(self, step: Step) -> bool:
        return any(s.step is step for s in self.steps)

    @property
    def is_empty(self) -> bool:
        return not self.steps


def require_orchestrator(invoked_by: Component) -> None:
    """오케스트레이터가 아닌 구성요소의 스케줄링 요청을 막는다.

    도메인 에이전트가 근거 부족을 만나면 수집을 직접 부르지 않고 조사 요청을
    저장한다(docs/architecture.md 5.1). 이 함수가 없으면 그 경계는 문서에만 있고
    에이전트가 스케줄러를 부르는 순간 깨진다.
    """
    if invoked_by is not ONLY_INVOKER:
        raise ValueError(
            f"{invoked_by} 는 단계를 시작할 수 없다."
            f" 단계 스케줄링은 {ONLY_INVOKER} 만 수행하며"
            " 도메인 에이전트는 조사 요청을 저장해 대신한다"
        )


def topological_order(steps: frozenset[Step]) -> tuple[Step, ...]:
    """주어진 단계만으로 위상 정렬한다.

    빠진 단계로 가는 의존은 지운다. 영향 없는 단계를 건너뛰어도 남은 단계의 차례가
    무너지지 않는다. 같은 층에 놓인 단계는 `STEP_ORDER` 차례로 가른다.

    닫힌 고리가 있으면 예외다. 그래프를 손으로 고치다 고리를 만들면 정렬이 조용히
    일부만 돌려주는데, 그러면 뒤 단계가 앞 단계의 저장 결과 없이 시작한다.
    """
    unknown = steps - set(DEPENDENCIES)
    if unknown:
        raise KeyError(f"시퀀스에 없는 단계: {sorted(unknown)}")

    rank = {step: index for index, step in enumerate(STEP_ORDER)}
    remaining = {s: {d for d in DEPENDENCIES[s] if d in steps} for s in steps}
    ordered: list[Step] = []
    while remaining:
        ready = sorted((s for s, d in remaining.items() if not d), key=rank.get)
        if not ready:
            left = sorted(remaining, key=rank.get)
            raise ValueError(f"의존이 닫힌 고리를 이룬다: {left}")
        step = ready[0]
        del remaining[step]
        ordered.append(step)
        for blockers in remaining.values():
            blockers.discard(step)
    return tuple(ordered)


def schedule(
    plan: ImpactPlan, invoked_by: Component = ONLY_INVOKER
) -> RunSchedule:
    """영향 판정을 실행 차례로 옮긴다.

    영향 없는 단계는 넣지 않는다. 산출 단계가 하나도 없으면 계보 기록과 검증도
    넣지 않는다. 만들 산출물이 없는 실행은 분석 버전을 열 이유가 없다.
    """
    require_orchestrator(invoked_by)

    running = {
        step
        for step, stage in STEP_STAGE.items()
        if stage is not None and plan.runs(stage)
    }
    if running:
        running.update(FOLLOW_UP_STEPS)

    steps = tuple(
        ScheduledStep(
            step=step,
            stage=STEP_STAGE[step],
            runner=RUNNERS[step],
            scopes=_scopes_for(plan, step),
            rerun=_rerun_for(plan, step),
            invoked_by=invoked_by,
        )
        for step in topological_order(frozenset(running))
    )
    return RunSchedule(plan=plan, steps=steps)


def _scopes_for(plan: ImpactPlan, step: Step) -> tuple[Scope, ...]:
    """단계가 돌 범위. 표에 열이 없는 단계는 분석 버전 전체이므로 비운다."""
    stage = STEP_STAGE[step]
    return () if stage is None else plan.impact_of(stage).scopes


def _rerun_for(plan: ImpactPlan, step: Step) -> RerunScope | None:
    stage = STEP_STAGE[step]
    return None if stage is None else plan.impact_of(stage).rerun
