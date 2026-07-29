"""Phase 19 오케스트레이터 검증.

영향 범위는 docs/architecture.md 7.1, 실행 순서는 같은 문서 7장, 조사 요청은 5.1과
docs/data-strategy.md 3장, 단계 전이는 같은 문서 8장에서 온다. 저장소는 대역으로
대체하고 판정만 검사한다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

import ast
from datetime import date
from pathlib import Path
from typing import Any

import pytest

from careersignal.contracts.research import ResearchRequest, ResearchStatus
from careersignal.contracts.run_context import RunContext
from careersignal.domain.permissions import Component
from careersignal.domain.scope import Scope, ScopeLevel
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.orchestration import impact as impact_mod
from careersignal.orchestration import lifecycle as stage
from careersignal.orchestration import research as research_mod
from careersignal.orchestration import schedule as schedule_mod
from careersignal.orchestration.envelope import Envelope
from careersignal.orchestration.impact import (
    IMPACT_TABLE,
    STAGE_ORDER,
    ChangeEvent,
    ChangeType,
    RerunScope,
    Stage,
    impact_of,
    rerun_scope,
)
from careersignal.orchestration.orchestrator import (
    AGENT_NAMES,
    ORCHESTRATOR_AGENT_NAME,
    Orchestrator,
)
from careersignal.orchestration.research import (
    plan_research,
    policy_violation,
    queue_order,
    usable_tiers,
)
from careersignal.orchestration.schedule import (
    DEPENDENCIES,
    STEP_ORDER,
    Step,
    schedule,
    topological_order,
)

JOB_ROLE = "backend"
DATASET = "ds_backend_2607"
TAXONOMY = "tx_backend_v3"
ANALYSIS = "an_backend_test"
AS_OF = date(2026, 7, 28)

OVERALL = Scope(JOB_ROLE, ScopeLevel.OVERALL)
FINTECH = Scope(JOB_ROLE, ScopeLevel.CLUSTER, "fintech")
POSTING = Scope(JOB_ROLE, ScopeLevel.POSTING, "dp_backend_01")


# ============================================================ 19-1 영향 범위
def test_the_table_has_every_change_and_every_stage() -> None:
    """빈 칸을 두지 않는다. 빠진 칸은 판단이 아니라 누락이다."""
    assert set(IMPACT_TABLE) == set(ChangeType)
    for change, row in IMPACT_TABLE.items():
        assert tuple(row) == STAGE_ORDER, change


def test_the_stage_names_are_the_column_names_of_the_document() -> None:
    assert [str(s) for s in STAGE_ORDER] == [
        "수집·인덱싱",
        "mention·차원",
        "통계",
        "그래프·Wiki",
        "해석",
        "전략",
        "로드맵",
    ]


def test_the_posting_row_matches_the_document() -> None:
    row = IMPACT_TABLE[ChangeType.POSTING]
    assert [str(row[s]) for s in STAGE_ORDER] == [
        "실행",
        "해당 직무",
        "해당 직무·기업군·기간",
        "영향 범위",
        "영향 범위",
        "영향 범위",
        "영향 범위",
    ]


def test_the_user_check_row_matches_the_document() -> None:
    row = IMPACT_TABLE[ChangeType.USER_CHECK_STATE]
    assert [str(row[s]) for s in STAGE_ORDER] == [
        "미실행",
        "미실행",
        "미실행",
        "미실행",
        "미실행",
        "미실행",
        "Express에서 재조합",
    ]


def test_a_posting_change_runs_every_stage() -> None:
    plan = impact_of(ChangeEvent(ChangeType.POSTING, POSTING))
    assert plan.stages_to_run == STAGE_ORDER


def test_a_user_check_change_runs_nothing() -> None:
    """Express 재조합은 분석 실행이 아니다. 산출물을 다시 만들지 않는다."""
    plan = impact_of(ChangeEvent(ChangeType.USER_CHECK_STATE, OVERALL))
    assert plan.stages_to_run == ()
    assert plan.anything_runs is False
    assert plan.impact_of(Stage.ROADMAP).rerun is RerunScope.EXPRESS_RECOMBINE
    assert plan.impact_of(Stage.ROADMAP).scopes == ()


def test_a_taxonomy_release_skips_collection() -> None:
    plan = impact_of(ChangeEvent(ChangeType.TAXONOMY_VERSION, OVERALL))
    assert plan.runs(Stage.COLLECT_INDEX) is False
    assert plan.impact_of(Stage.MENTION_DIMENSION).rerun is RerunScope.FULL_REASSIGNMENT


def test_an_ontology_release_touches_only_the_graph_and_downstream() -> None:
    plan = impact_of(ChangeEvent(ChangeType.ONTOLOGY_VERSION, OVERALL))
    assert plan.stages_to_run == (
        Stage.GRAPH_WIKI,
        Stage.INTERPRETATION,
        Stage.STRATEGY,
        Stage.ROADMAP,
    )


def test_an_external_strategy_source_does_not_reach_interpretation() -> None:
    """외부 전략 자료는 해석의 근거가 아니다. 표의 해석 칸이 미실행이다."""
    plan = impact_of(ChangeEvent(ChangeType.EXTERNAL_STRATEGY_SOURCE, OVERALL))
    assert plan.runs(Stage.INTERPRETATION) is False
    assert plan.runs(Stage.STRATEGY) is True


def test_a_narrow_change_widens_where_the_table_says_so() -> None:
    """공고 한 건이 바뀌어도 mention·차원은 직무 전체를 다시 돈다."""
    plan = impact_of(ChangeEvent(ChangeType.POSTING, POSTING))
    assert plan.impact_of(Stage.MENTION_DIMENSION).scopes == (OVERALL,)
    assert plan.impact_of(Stage.GRAPH_WIKI).scopes == (POSTING,)


def test_a_job_role_reclassification_reruns_both_job_roles() -> None:
    event = ChangeEvent(
        ChangeType.POSTING_JOB_ROLE, POSTING, previous_job_role_id="frontend"
    )
    plan = impact_of(event)
    assert plan.impact_of(Stage.STATISTICS).scopes == (
        Scope("frontend", ScopeLevel.OVERALL),
        OVERALL,
    )


def test_a_job_role_reclassification_without_the_previous_role_is_refused() -> None:
    """변경 뒤의 행만 보면 이전 직무를 알 수 없다. 그 통계는 낡은 채로 남는다."""
    with pytest.raises(ValueError, match="이전 직무"):
        impact_of(ChangeEvent(ChangeType.POSTING_JOB_ROLE, POSTING))


def test_a_cluster_reclassification_reruns_both_clusters_and_the_job_role() -> None:
    event = ChangeEvent(
        ChangeType.POSTING_CLUSTER,
        POSTING,
        previous_cluster_id="platform",
        cluster_id="fintech",
    )
    plan = impact_of(event)
    assert plan.impact_of(Stage.STATISTICS).scopes == (
        OVERALL,
        Scope(JOB_ROLE, ScopeLevel.CLUSTER, "platform"),
        FINTECH,
    )
    assert plan.runs(Stage.MENTION_DIMENSION) is False


def test_a_cluster_reclassification_without_both_clusters_is_refused() -> None:
    with pytest.raises(ValueError, match="이전 기업군"):
        impact_of(ChangeEvent(ChangeType.POSTING_CLUSTER, POSTING))


def test_an_unknown_cell_is_an_error_not_a_default() -> None:
    with pytest.raises(KeyError):
        rerun_scope(ChangeType.POSTING, "없는 열")  # type: ignore[arg-type]


# ============================================================ 19-2 실행 순서
def test_the_full_run_follows_the_documented_sequence() -> None:
    plan = impact_of(ChangeEvent(ChangeType.POSTING, POSTING))
    assert schedule(plan).step_order == STEP_ORDER


def test_a_skipped_stage_drops_its_steps_without_breaking_the_order() -> None:
    """수집·인덱싱이 빠져도 남은 단계의 차례가 무너지지 않는다."""
    plan = impact_of(ChangeEvent(ChangeType.TAXONOMY_VERSION, OVERALL))
    order = schedule(plan).step_order
    assert Step.COLLECT not in order
    assert Step.INDEX not in order
    assert order == (
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


def test_the_graph_orders_the_ontology_release() -> None:
    plan = impact_of(ChangeEvent(ChangeType.ONTOLOGY_VERSION, OVERALL))
    assert schedule(plan).step_order == (
        Step.KNOWLEDGE_GRAPH,
        Step.WIKI,
        Step.INTERPRETATION,
        Step.STRATEGY,
        Step.ROADMAP,
        Step.LINEAGE,
        Step.VERIFY,
    )


def test_lineage_and_verification_follow_whatever_ran() -> None:
    """계보는 별도의 트리거를 갖지 않고 재실행된 산출물을 따라 실행한다."""
    plan = impact_of(ChangeEvent(ChangeType.EXTERNAL_STRATEGY_SOURCE, OVERALL))
    order = schedule(plan).step_order
    assert order[-2:] == (Step.LINEAGE, Step.VERIFY)
    assert Step.INTERPRETATION not in order


def test_nothing_runs_when_no_stage_is_affected() -> None:
    plan = impact_of(ChangeEvent(ChangeType.USER_CHECK_STATE, OVERALL))
    assert schedule(plan).is_empty is True


def test_every_step_carries_the_component_that_runs_it() -> None:
    plan = impact_of(ChangeEvent(ChangeType.POSTING, POSTING))
    runners = {s.step: s.runner for s in schedule(plan).steps}
    assert runners[Step.COLLECT] is Component.AGENT_COLLECT
    assert runners[Step.AGGREGATE] is Component.PIPE_AGGREGATE
    assert runners[Step.VERIFY] is Component.PIPE_VERIFY


def test_a_domain_agent_cannot_schedule_steps() -> None:
    """에이전트는 다른 에이전트를 시작하지 않는다. 조사 요청으로 대신한다."""
    plan = impact_of(ChangeEvent(ChangeType.POSTING, POSTING))
    with pytest.raises(ValueError, match="단계를 시작할 수 없다"):
        schedule(plan, invoked_by=Component.AGENT_INTERPRET)


def test_every_scheduled_step_is_invoked_by_the_orchestrator() -> None:
    plan = impact_of(ChangeEvent(ChangeType.POSTING, POSTING))
    for step in schedule(plan).steps:
        assert step.invoked_by is Component.ORCHESTRATOR


def test_the_sort_is_deterministic_for_independent_steps() -> None:
    first = topological_order(frozenset({Step.WIKI, Step.KNOWLEDGE_GRAPH}))
    second = topological_order(frozenset({Step.KNOWLEDGE_GRAPH, Step.WIKI}))
    assert first == second == (Step.KNOWLEDGE_GRAPH, Step.WIKI)


def test_a_cycle_is_refused_rather_than_partly_ordered(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """고리를 조용히 잘라 내면 뒤 단계가 앞 단계의 저장 결과 없이 시작한다."""
    broken = dict(DEPENDENCIES)
    broken[Step.MENTION] = (Step.AGGREGATE,)
    monkeypatch.setattr(schedule_mod, "DEPENDENCIES", broken)
    with pytest.raises(ValueError, match="닫힌 고리"):
        topological_order(frozenset({Step.MENTION, Step.AGGREGATE}))


def test_an_unknown_step_is_refused() -> None:
    with pytest.raises(KeyError):
        topological_order(frozenset({"없는 단계"}))  # type: ignore[arg-type]


# ============================================================ 19-3 조사 요청
def _request(
    request_id: str,
    *,
    use: str = str(AllowedUse.INTERPRETATION_CONTEXT),
    tiers: tuple[SourceTier, ...] = (),
    status: ResearchStatus = ResearchStatus.OPEN,
    priority: int = 5,
    scope: Scope = OVERALL,
    company_id: str | None = None,
) -> ResearchRequest:
    return ResearchRequest(
        request_id=request_id,
        requested_by_run_id="run_interpret_1",
        analysis_version=ANALYSIS,
        goal="근거 부족",
        needed_evidence_type=use,
        needed_tiers=tiers,
        job_role_id=scope.job_role_id,
        scope_level=scope.level,
        scope_id=scope.scope_id,
        company_id=company_id,
        status=status,
        priority=priority,
    )


def test_the_queue_reads_open_before_scheduled_and_high_priority_first() -> None:
    requests = [
        _request("rq_low", priority=2),
        _request("rq_busy", status=ResearchStatus.SCHEDULED, priority=9),
        _request("rq_high", priority=9),
        _request("rq_done", status=ResearchStatus.EXPIRED, priority=9),
    ]
    assert [r.request_id for r in queue_order(requests)] == [
        "rq_high",
        "rq_low",
        "rq_busy",
    ]


def test_a_terminal_request_is_not_read_again() -> None:
    closed = [
        _request("rq_a", status=ResearchStatus.REJECTED),
        _request("rq_b", status=ResearchStatus.EXPIRED),
    ]
    assert queue_order(closed) == ()


def test_a_request_without_tiers_takes_every_tier_the_use_allows() -> None:
    request = _request("rq_stat", use=str(AllowedUse.STATISTICS))
    assert usable_tiers(request) == (SourceTier.POSTING,)


def test_a_statistics_request_on_company_material_is_rejected() -> None:
    """B 계층은 통계 집계에 쓰지 못한다. docs/data-strategy.md 3장."""
    request = _request(
        "rq_bad",
        use=str(AllowedUse.STATISTICS),
        tiers=(SourceTier.COMPANY_OFFICIAL,),
    )
    assert policy_violation(request) is not None
    assert plan_research([request]).decisions[0].status is ResearchStatus.REJECTED


def test_an_unverified_tier_request_is_rejected() -> None:
    request = _request("rq_e", tiers=(SourceTier.UNVERIFIED,))
    assert policy_violation(request) is not None


def test_an_unknown_evidence_type_is_rejected() -> None:
    request = _request("rq_odd", use="아무 근거")
    reason = policy_violation(request)
    assert reason is not None
    assert research_mod.UNKNOWN_EVIDENCE_TYPE in reason


def test_a_rejected_request_carries_its_reason() -> None:
    plan = plan_research([_request("rq_odd", use="아무 근거")])
    assert plan.rejected[0].reason is not None
    assert plan.runs == ()


def test_a_passing_request_becomes_a_collection_run() -> None:
    plan = plan_research([_request("rq_ok", tiers=(SourceTier.COMPANY_OFFICIAL,))])
    assert plan.scheduled[0].status is ResearchStatus.SCHEDULED
    assert len(plan.runs) == 1
    run = plan.runs[0]
    assert run.request_ids == ("rq_ok",)
    assert run.allowed_tiers == (SourceTier.COMPANY_OFFICIAL,)
    assert run.agent_name == research_mod.COLLECTOR_AGENT_NAME


def test_requests_on_the_same_scope_and_company_share_one_run() -> None:
    plan = plan_research(
        [
            _request("rq_1", company_id="co_toss", priority=7),
            _request("rq_2", company_id="co_toss", priority=3),
            _request("rq_3", company_id="co_naver", priority=6),
        ]
    )
    assert [r.request_ids for r in plan.runs] == [("rq_1", "rq_2"), ("rq_3",)]
    assert plan.runs[0].priority == 7


def test_a_different_scope_does_not_share_a_run() -> None:
    plan = plan_research([_request("rq_a"), _request("rq_b", scope=FINTECH)])
    assert len(plan.runs) == 2


def test_the_limit_leaves_the_rest_untouched() -> None:
    plan = plan_research(
        [_request("rq_1", priority=9), _request("rq_2", priority=1)], limit=1
    )
    assert [d.request_id for d in plan.decisions] == ["rq_1"]


# ============================================================ 19-4 단계 전이
class FakeStageStore:
    """분석 버전 상태 하나만 갖는 대역."""

    def __init__(self, status: str | None = str(AnalysisVersionStatus.DRAFT)) -> None:
        self.status = status
        self.writes: list[str] = []

    def current_status(self, analysis_version: str) -> str | None:
        return self.status

    def set_status(self, analysis_version: str, status: str) -> int:
        if self.status is None:
            return 0
        self.status = status
        self.writes.append(status)
        return 1


def test_the_pipeline_is_the_documented_success_path() -> None:
    assert [str(s) for s in stage.PIPELINE] == [
        "draft",
        "running",
        "validating",
        "gated",
        "active",
    ]


def test_the_transition_table_is_not_redefined_here() -> None:
    """전이 표는 `domain/versioning.py` 하나만 갖는다."""
    text = Path(stage.__file__).read_text(encoding="utf-8")
    assert "_ALLOWED_TRANSITIONS" not in text
    assert "from careersignal.domain.versioning import" in text


def test_advancing_walks_the_pipeline_one_step_at_a_time() -> None:
    store = FakeStageStore()
    assert stage.advance(store, ANALYSIS).after is AnalysisVersionStatus.RUNNING
    assert stage.advance(store, ANALYSIS).after is AnalysisVersionStatus.VALIDATING
    assert stage.advance(store, ANALYSIS).after is AnalysisVersionStatus.GATED
    assert stage.advance(store, ANALYSIS).after is AnalysisVersionStatus.ACTIVE
    assert store.writes == ["running", "validating", "gated", "active"]


def test_skipping_a_stage_is_refused() -> None:
    store = FakeStageStore()
    with pytest.raises(ValueError, match="전이할 수 없다"):
        stage.transition(store, ANALYSIS, AnalysisVersionStatus.ACTIVE)
    assert store.writes == []


def test_a_draft_cannot_fail_because_it_has_not_run() -> None:
    store = FakeStageStore()
    with pytest.raises(ValueError, match="전이할 수 없다"):
        stage.fail(store, ANALYSIS)


def test_validation_failure_and_retry_follow_the_documented_edges() -> None:
    store = FakeStageStore(str(AnalysisVersionStatus.VALIDATING))
    assert stage.fail(store, ANALYSIS).after is AnalysisVersionStatus.FAILED
    assert stage.retry(store, ANALYSIS).after is AnalysisVersionStatus.RUNNING


def test_an_active_version_is_superseded_not_failed() -> None:
    store = FakeStageStore(str(AnalysisVersionStatus.ACTIVE))
    assert stage.supersede(store, ANALYSIS).after is AnalysisVersionStatus.SUPERSEDED
    with pytest.raises(ValueError):
        stage.advance(FakeStageStore(str(AnalysisVersionStatus.ACTIVE)), ANALYSIS)


def test_a_missing_version_is_refused() -> None:
    with pytest.raises(ValueError, match="저장된 분석 버전이 없다"):
        stage.advance(FakeStageStore(None), ANALYSIS)


def test_a_status_outside_the_value_set_is_refused() -> None:
    with pytest.raises(ValueError, match="분석 버전 상태가 아니다"):
        stage.advance(FakeStageStore("published"), ANALYSIS)


# ============================================================ 오케스트레이터
class FakeControlPlane(FakeStageStore):
    """단계 전이와 조사 요청을 함께 받는 대역."""

    def __init__(
        self,
        status: str | None = str(AnalysisVersionStatus.RUNNING),
        requests: tuple[ResearchRequest, ...] = (),
    ) -> None:
        super().__init__(status)
        self.requests = requests
        self.research_writes: list[tuple[str, str, str | None]] = []

    def queued_research_requests(
        self, analysis_version: str
    ) -> tuple[ResearchRequest, ...]:
        return self.requests

    def set_research_status(
        self, request_id: str, status: str, reason: str | None = None
    ) -> int:
        self.research_writes.append((request_id, status, reason))
        return 1


def _envelope_factory(**kwargs: Any) -> Envelope:
    """봉투 대역. 실제 경로는 `ensure_envelope` 이며 기본값으로 꽂혀 있다."""
    _envelope_factory.calls.append(kwargs)  # type: ignore[attr-defined]
    return Envelope(
        analysis_version=ANALYSIS, agent_run_id="run_orchestrator", created_version=True
    )


_envelope_factory.calls = []  # type: ignore[attr-defined]


@pytest.fixture(autouse=True)
def _reset_factory() -> None:
    _envelope_factory.calls = []  # type: ignore[attr-defined]


def _orchestrator(store: FakeControlPlane) -> Orchestrator:
    return Orchestrator(store, envelope_factory=_envelope_factory)


def test_a_change_without_impact_opens_no_analysis_version() -> None:
    """산출물이 없는 버전을 열면 활성 후보만 늘어난다."""
    store = FakeControlPlane()
    plan = _orchestrator(store).start(
        ChangeEvent(ChangeType.USER_CHECK_STATE, OVERALL),
        dataset_version=DATASET,
        taxonomy_version_id=TAXONOMY,
        as_of_date=AS_OF,
    )
    assert plan.opened is False
    assert plan.step_runs == ()
    assert _envelope_factory.calls == []  # type: ignore[attr-defined]


def test_a_posting_change_opens_a_version_and_builds_every_step_envelope() -> None:
    store = FakeControlPlane()
    plan = _orchestrator(store).start(
        ChangeEvent(ChangeType.POSTING, POSTING),
        dataset_version=DATASET,
        taxonomy_version_id=TAXONOMY,
        as_of_date=AS_OF,
    )
    assert plan.opened is True
    assert _envelope_factory.calls[0]["agent_name"] == ORCHESTRATOR_AGENT_NAME  # type: ignore[attr-defined]
    assert tuple(dict.fromkeys(r.step for r in plan.step_runs)) == STEP_ORDER
    for run in plan.step_runs:
        assert isinstance(run.context, RunContext)
        assert run.context.analysis_version == ANALYSIS
        assert run.context.agent_run_id.startswith("run_")
        assert run.agent_name == AGENT_NAMES[run.step]


def test_step_envelopes_carry_no_upstream_outputs() -> None:
    """에이전트는 산출물을 주고받지 않는다. 앞 단계의 결과는 저장소에서 읽는다."""
    plan = _orchestrator(FakeControlPlane()).start(
        ChangeEvent(ChangeType.POSTING, POSTING),
        dataset_version=DATASET,
        taxonomy_version_id=TAXONOMY,
        as_of_date=AS_OF,
    )
    assert all(r.context.upstream_output_ids == () for r in plan.step_runs)


def test_a_stage_with_two_scopes_gets_two_run_envelopes() -> None:
    plan = _orchestrator(FakeControlPlane()).start(
        ChangeEvent(
            ChangeType.POSTING_JOB_ROLE, POSTING, previous_job_role_id="frontend"
        ),
        dataset_version=DATASET,
        taxonomy_version_id=TAXONOMY,
        as_of_date=AS_OF,
    )
    mention = [r for r in plan.step_runs if r.step is Step.MENTION]
    assert {r.context.job_role_id for r in mention} == {"backend", "frontend"}
    assert len({r.context.agent_run_id for r in mention}) == 2


def test_steps_without_a_column_run_on_the_whole_job_role() -> None:
    plan = _orchestrator(FakeControlPlane()).start(
        ChangeEvent(ChangeType.POSTING, POSTING),
        dataset_version=DATASET,
        taxonomy_version_id=TAXONOMY,
        as_of_date=AS_OF,
    )
    verify = [r for r in plan.step_runs if r.step is Step.VERIFY]
    assert len(verify) == 1
    assert verify[0].context.scope_level is ScopeLevel.OVERALL


def test_research_requests_are_judged_and_closed_when_a_run_starts() -> None:
    store = FakeControlPlane(
        requests=(
            _request("rq_ok", tiers=(SourceTier.COMPANY_OFFICIAL,)),
            _request("rq_bad", use=str(AllowedUse.STATISTICS), tiers=(SourceTier.UNVERIFIED,)),
        )
    )
    plan = _orchestrator(store).start(
        ChangeEvent(ChangeType.POSTING, POSTING),
        dataset_version=DATASET,
        taxonomy_version_id=TAXONOMY,
        as_of_date=AS_OF,
    )
    assert plan.research is not None
    written = {r[0]: r[1] for r in store.research_writes}
    assert written == {"rq_ok": "scheduled", "rq_bad": "rejected"}
    assert [r.request_ids for r in plan.research.runs] == [("rq_ok",)]


def test_a_rejected_request_is_closed_with_a_reason() -> None:
    store = FakeControlPlane(requests=(_request("rq_bad", use="아무 근거"),))
    _orchestrator(store).resolve_research(ANALYSIS)
    assert store.research_writes[0][1] == "rejected"
    assert store.research_writes[0][2] is not None


def test_the_orchestrator_refuses_to_act_for_a_domain_agent() -> None:
    with pytest.raises(ValueError, match="단계를 시작할 수 없다"):
        Orchestrator(
            FakeControlPlane(),
            envelope_factory=_envelope_factory,
            invoked_by=Component.AGENT_STRATEGY,
        )


def test_the_orchestrator_moves_the_version_through_its_stages() -> None:
    store = FakeControlPlane(str(AnalysisVersionStatus.RUNNING))
    orchestrator = _orchestrator(store)
    assert orchestrator.advance(ANALYSIS).after is AnalysisVersionStatus.VALIDATING
    assert orchestrator.fail(ANALYSIS).after is AnalysisVersionStatus.FAILED
    assert orchestrator.retry(ANALYSIS).after is AnalysisVersionStatus.RUNNING


# ============================================================ 모듈 경계
SRC = Path(__file__).resolve().parents[2] / "src" / "careersignal"

PURE_MODULES = ("impact.py", "schedule.py", "research.py", "lifecycle.py")
"""저장소를 import 하지 않는다고 스스로 적은 오케스트레이션 모듈.

`orchestration/` 전체가 순수하지는 않다. `envelope.py` 는 거래를 열고
`orchestrator.py` 는 그 봉투를 부른다. 나머지 넷은 값만 받아 판정하므로 저장소 없이
검사할 수 있고, 그 성질이 깨지면 SQL 없이 규칙만 검사하던 이 파일이 데이터베이스를
요구한다.
"""

FORBIDDEN = {
    "psycopg",
    "sqlalchemy",
    "openai",
    "httpx",
    "requests",
    "supabase",
    "fastapi",
    "careersignal.repositories",
    "careersignal.providers",
    "careersignal.agents",
    "careersignal.pipelines",
}


def _imports(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            found.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            found.add(node.module)
    return found


def test_the_pure_orchestration_modules_have_no_repository_imports() -> None:
    bad = [
        f"{name} -> {imported}"
        for name in PURE_MODULES
        for imported in _imports(SRC / "orchestration" / name)
        if imported in FORBIDDEN or imported.split(".")[0] in FORBIDDEN
    ]
    assert bad == []


def test_the_orchestrator_takes_its_repository_instead_of_opening_one() -> None:
    """저장소는 `Protocol` 로 받는다. SQL 도 드라이버도 여기에 없다."""
    path = SRC / "orchestration" / "orchestrator.py"
    assert "psycopg" not in _imports(path)
    text = path.read_text(encoding="utf-8")
    assert "Protocol" in text
    assert "from careersignal.orchestration.envelope import" in text
    assert "ensure_envelope" in text


def test_the_impact_table_is_the_only_copy_of_the_document_table() -> None:
    """표를 두 곳에 두면 한쪽만 고쳐졌을 때 어느 쪽이 옳은지 알 수 없다."""
    assert impact_mod.IMPACT_TABLE is IMPACT_TABLE
    schedule_text = (SRC / "orchestration" / "schedule.py").read_text(encoding="utf-8")
    assert "IMPACT_TABLE = " not in schedule_text
