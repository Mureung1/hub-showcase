"""분석 실행 오케스트레이터.

Phase 19 의 네 조각을 엮는 실행 골격이다. 영향 범위(`impact.py`)로 무엇을 다시
돌릴지 정하고, 실행 순서(`schedule.py`)로 차례를 세우고, 봉투(`envelope.py`)로
분석 버전과 실행 행을 보장하고, 조사 요청(`research.py`)과 단계 전이
(`lifecycle.py`)를 저장소에 반영한다.

저장소를 `Protocol` 로 받는다. `psycopg` 를 import 하지 않으며 어떤 SQL 도 여기에
없다. 데이터베이스 접근은 `repositories/` 만 수행한다(AGENTS.md 의 모듈 경계).
봉투를 만드는 일도 마찬가지라 `ensure_envelope` 를 인자로 받아 바꿔 낄 수 있게
두었다. 기본값이 곧 실제 경로이므로 바꿔 끼지 않으면 문서에 적힌 그 함수가 돈다.

오케스트레이터는 도메인 에이전트를 시작하는 유일한 구성요소다
(docs/architecture.md 4장). 여기서 만드는 것은 각 단계가 받을 실행 봉투이고,
에이전트끼리 산출물을 주고받지 않으므로 봉투에는 앞 단계의 결과가 아니라 범위와
버전만 담긴다(같은 문서 5장).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from typing import Protocol

from careersignal.contracts.research import ResearchRequest, ResearchStatus
from careersignal.contracts.run_context import Budget, RunContext
from careersignal.domain.permissions import Component
from careersignal.domain.scope import Scope, ScopeLevel
from careersignal.orchestration import lifecycle
from careersignal.orchestration.envelope import (
    Envelope,
    agent_run_identifier,
    ensure_envelope,
)
from careersignal.orchestration.impact import ChangeEvent, ImpactPlan, impact_of
from careersignal.orchestration.research import ResearchPlan, plan_research
from careersignal.orchestration.schedule import (
    ONLY_INVOKER,
    RunSchedule,
    ScheduledStep,
    Step,
    require_orchestrator,
    schedule,
)

ORCHESTRATOR_AGENT_NAME = "orchestrator"
"""봉투를 여는 실행의 `agent_runs.agent_name`."""

AGENT_NAMES: dict[Step, str] = {
    Step.COLLECT: "collector",
    Step.INDEX: "indexing",
    Step.MENTION: "statistics_extraction",
    Step.KNOWLEDGE_GRAPH: "knowledge_semantic",
    Step.AGGREGATE: "metric_aggregation",
    Step.WIKI: "wiki_generation",
    Step.INTERPRETATION: "interpretation",
    Step.STRATEGY: "strategy",
    Step.ROADMAP: "roadmap",
    Step.LINEAGE: "lineage_provenance",
    Step.VERIFY: "verification",
}
"""단계마다 `agent_runs.agent_name` 에 남길 이름.

`scripts/stage_d.py` 와 `scripts/stage_e.py` 가 이미 쓰는 이름을 그대로 쓴다.
같은 일을 하는 실행이 스크립트로 돌 때와 오케스트레이터로 돌 때 다른 이름을 남기면
계보 조회가 두 이름을 모두 알아야 한다.
"""


class ControlPlaneStore(Protocol):
    """오케스트레이터가 저장소에 요구하는 것 넷.

    분석 버전의 상태는 오케스트레이터의 쓰기 범위이고 조사 요청의 상태 전이도
    오케스트레이터만 수행한다(docs/permission-matrix.md 3장·5.3). 수집 에이전트는
    조사 요청을 읽기만 한다.
    """

    def current_status(self, analysis_version: str) -> str | None: ...

    def set_status(self, analysis_version: str, status: str) -> int: ...

    def queued_research_requests(
        self, analysis_version: str
    ) -> Sequence[ResearchRequest]: ...

    def set_research_status(
        self, request_id: str, status: str, reason: str | None = None
    ) -> int: ...


class EnvelopeFactory(Protocol):
    """분석 버전과 실행 행을 보장하는 함수의 모양. 기본값은 `ensure_envelope` 다."""

    def __call__(
        self,
        job_role_id: str,
        dataset_version: str,
        agent_name: str,
        taxonomy_version_id: str,
        iteration: int = 1,
        objective_id: str | None = None,
    ) -> Envelope: ...


@dataclass(frozen=True, slots=True)
class StepRun:
    """단계 하나가 받을 실행 봉투.

    한 단계가 여러 범위를 돌면 범위마다 실행을 따로 만든다. 범위가 실행을 가르지
    않으면 두 기업군의 결과가 한 `agent_run_id` 아래 섞여 어느 쪽이 실패했는지
    계측으로 가릴 수 없다.
    """

    step: Step
    runner: Component
    agent_name: str
    context: RunContext
    invoked_by: Component = ONLY_INVOKER


@dataclass(frozen=True, slots=True)
class OrchestrationPlan:
    """변경 하나가 만든 실행 계획 전체."""

    event: ChangeEvent
    impact: ImpactPlan
    run_schedule: RunSchedule
    envelope: Envelope | None = None
    research: ResearchPlan | None = None
    step_runs: tuple[StepRun, ...] = ()

    @property
    def opened(self) -> bool:
        """분석 버전을 열었는가. 돌릴 단계가 없으면 열지 않는다."""
        return self.envelope is not None


class Orchestrator:
    """변경 이벤트 하나를 실행 계획으로 옮긴다."""

    def __init__(
        self,
        store: ControlPlaneStore,
        envelope_factory: EnvelopeFactory = ensure_envelope,
        invoked_by: Component = ONLY_INVOKER,
    ) -> None:
        require_orchestrator(invoked_by)
        self._store = store
        self._envelope = envelope_factory
        self._invoked_by = invoked_by

    # ------------------------------------------------------------ 계획
    def plan(self, event: ChangeEvent) -> RunSchedule:
        """영향 범위와 실행 순서만 계산한다. 저장소를 건드리지 않는다."""
        return schedule(impact_of(event), invoked_by=self._invoked_by)

    def start(
        self,
        event: ChangeEvent,
        dataset_version: str,
        taxonomy_version_id: str,
        as_of_date: date,
        iteration: int = 1,
        budget: Budget | None = None,
        research_limit: int | None = None,
    ) -> OrchestrationPlan:
        """변경 하나를 받아 분석 버전을 열고 단계별 봉투를 만든다.

        돌릴 단계가 하나도 없으면 분석 버전을 열지 않고 빈 계획을 돌려준다.
        사용자 체크 상태 변경처럼 산출물을 다시 만들지 않는 변경이 여기 해당하며,
        그런 변경에 버전을 열면 산출물 없는 버전이 활성 후보로 쌓인다.

        봉투는 `running` 으로 열린다. `draft` 는 영향 범위만 등록한 상태이고
        이 경로는 곧바로 산출물을 만들기 때문이다(docs/architecture.md 8장,
        `envelope.BOOTSTRAP_STATUS`).
        """
        run_schedule = self.plan(event)
        impact = run_schedule.plan
        if run_schedule.is_empty:
            return OrchestrationPlan(
                event=event, impact=impact, run_schedule=run_schedule
            )

        envelope = self._envelope(
            job_role_id=event.scope.job_role_id,
            dataset_version=dataset_version,
            agent_name=ORCHESTRATOR_AGENT_NAME,
            taxonomy_version_id=taxonomy_version_id,
            iteration=iteration,
        )
        research = self.resolve_research(
            envelope.analysis_version, limit=research_limit
        )
        return OrchestrationPlan(
            event=event,
            impact=impact,
            run_schedule=run_schedule,
            envelope=envelope,
            research=research,
            step_runs=self.step_runs(
                run_schedule,
                envelope=envelope,
                event=event,
                dataset_version=dataset_version,
                taxonomy_version_id=taxonomy_version_id,
                as_of_date=as_of_date,
                iteration=iteration,
                budget=budget,
            ),
        )

    # ------------------------------------------------------------ 봉투
    def step_runs(
        self,
        run_schedule: RunSchedule,
        envelope: Envelope,
        event: ChangeEvent,
        dataset_version: str,
        taxonomy_version_id: str,
        as_of_date: date,
        iteration: int = 1,
        budget: Budget | None = None,
    ) -> tuple[StepRun, ...]:
        """차례가 정해진 단계마다 범위별 실행 봉투를 만든다.

        `upstream_output_ids` 를 채우지 않는다. 앞 단계의 산출물은 봉투로 건네지
        않고 저장소에서 읽는다(docs/architecture.md 5장). 그 자리는 한 실행이 특정
        산출물을 다시 손볼 때만 쓴다.
        """
        runs: list[StepRun] = []
        for step in run_schedule.steps:
            agent_name = AGENT_NAMES[step.step]
            for scope in _scopes_of(step, event):
                runs.append(
                    StepRun(
                        step=step.step,
                        runner=step.runner,
                        agent_name=agent_name,
                        invoked_by=step.invoked_by,
                        context=RunContext(
                            agent_run_id=agent_run_identifier(
                                analysis_version=envelope.analysis_version,
                                agent_name=agent_name,
                                iteration=iteration,
                                objective_id=scope.key,
                            ),
                            analysis_version=envelope.analysis_version,
                            dataset_version=dataset_version,
                            taxonomy_version_id=taxonomy_version_id,
                            job_role_id=scope.job_role_id,
                            scope_level=scope.level,
                            scope_id=scope.scope_id,
                            as_of_date=as_of_date,
                            budget=budget or Budget(),
                        ),
                    )
                )
        return tuple(runs)

    # ------------------------------------------------------------ 조사 요청
    def resolve_research(
        self, analysis_version: str, limit: int | None = None
    ) -> ResearchPlan:
        """조사 요청을 읽어 정책을 검사하고 상태를 옮긴다.

        정책을 어긴 요청은 사유와 함께 `rejected` 로 닫고 나머지는 `scheduled` 로
        올린다. 수집 실행 자체는 계획으로만 돌려준다. 실행을 여는 것은 `start` 의
        차례이며 여기서 열면 정책 검사와 실행 생성이 한 함수에 섞인다.
        """
        plan = plan_research(
            self._store.queued_research_requests(analysis_version), limit=limit
        )
        for decision in plan.decisions:
            self._store.set_research_status(
                decision.request_id, str(decision.status), decision.reason
            )
        return plan

    # ------------------------------------------------------------ 단계 전이
    def advance(self, analysis_version: str) -> lifecycle.StageTransition:
        return lifecycle.advance(self._store, analysis_version)

    def transition(
        self, analysis_version: str, target: lifecycle.AnalysisVersionStatus
    ) -> lifecycle.StageTransition:
        return lifecycle.transition(self._store, analysis_version, target)

    def fail(self, analysis_version: str) -> lifecycle.StageTransition:
        return lifecycle.fail(self._store, analysis_version)

    def retry(self, analysis_version: str) -> lifecycle.StageTransition:
        return lifecycle.retry(self._store, analysis_version)


def _scopes_of(step: ScheduledStep, event: ChangeEvent) -> tuple[Scope, ...]:
    """단계가 돌 범위. 표에 열이 없는 단계는 직무 전체 하나다.

    계보 기록과 검증은 분석 버전 전체를 대상으로 하므로 좁은 범위를 갖지 않는다.
    """
    if step.scopes:
        return step.scopes
    return (Scope(event.scope.job_role_id, ScopeLevel.OVERALL),)


def rejected_request_ids(plan: ResearchPlan) -> tuple[str, ...]:
    """정책 위반으로 닫힌 요청. 실행 결과에 남긴다."""
    return tuple(
        d.request_id for d in plan.decisions if d.status is ResearchStatus.REJECTED
    )


__all__ = [
    "AGENT_NAMES",
    "ORCHESTRATOR_AGENT_NAME",
    "ControlPlaneStore",
    "EnvelopeFactory",
    "OrchestrationPlan",
    "Orchestrator",
    "ResearchRequest",
    "StepRun",
]
