"""검색 계측 기록과 계측 지표, 버전 고정의 검증.

표의 순서와 지표의 정의를 검사한다. 표는 docs/erd.md 12장, 지표는
docs/architecture.md 14.2, 실행 기록은 같은 문서 14.3이다.

저장소는 대역으로 대체한다. 데이터베이스에 붙지 않는다.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import pytest

from careersignal.contracts.evidence import (
    EvidenceCandidate,
    EvidenceSet,
    EvidenceUsage,
    RetrievalStrategy,
    UsageType,
)
from careersignal.domain.source_policy import AllowedUse, SourceTier
from careersignal.orchestration.envelope import Envelope
from careersignal.telemetry.instrumentation import (
    AblationCase,
    CandidateUsageRow,
    ClaimEvidenceRow,
    InstrumentationReport,
    citation_precision,
    citation_utilization,
    claim_coverage,
    marginal_utility,
    ratio,
    report,
)
from careersignal.telemetry.retrieval import (
    RetrievalRecorder,
    query_identifier,
    retrieval_run_identifier,
    usage_identifier,
)
from careersignal.telemetry.versions import (
    RunVersions,
    VersionDriftError,
    VersionPinboard,
    pin_versions,
)

ENVELOPE = Envelope(
    analysis_version="an_test", agent_run_id="run_test", created_version=True
)
AGENT = "interpretation"
MOMENT = datetime(2026, 7, 29, 10, 0, 0)


class FakeRetrievalStore:
    """계측 표 여섯의 대역. 넣은 순서를 그대로 남긴다."""

    def __init__(self) -> None:
        self.runs: list[dict[str, Any]] = []
        self.queries: list[dict[str, Any]] = []
        self.candidates: list[dict[str, Any]] = []
        self.sets: list[dict[str, Any]] = []
        self.members: list[tuple[str, list[tuple[str, str]]]] = []
        self.usages: list[dict[str, Any]] = []
        self.order: list[str] = []

    def add_retrieval_run(
        self,
        retrieval_run_id: str,
        analysis_version: str,
        agent_name: str,
        agent_run_id: str,
        started_at: datetime,
    ) -> None:
        self.order.append("retrieval_runs")
        self.runs.append(
            {
                "retrieval_run_id": retrieval_run_id,
                "analysis_version": analysis_version,
                "agent_name": agent_name,
                "agent_run_id": agent_run_id,
                "started_at": started_at,
            }
        )

    def add_query(
        self,
        query_id: str,
        retrieval_run_id: str,
        subquery_type: str,
        query_text: str,
        strategy: str,
        filters: dict[str, Any],
    ) -> None:
        self.order.append("retrieval_queries")
        self.queries.append(
            {
                "query_id": query_id,
                "retrieval_run_id": retrieval_run_id,
                "subquery_type": subquery_type,
                "query_text": query_text,
                "strategy": strategy,
                "filters": filters,
            }
        )

    def add_candidates(self, query_id: str, rows: list[dict[str, Any]]) -> None:
        self.order.append("retrieval_candidates")
        self.candidates.extend(rows)

    def add_evidence_set(
        self,
        evidence_set_id: str,
        retrieval_run_id: str,
        objective_id: str,
        optimization_policy_version: str,
    ) -> None:
        self.order.append("evidence_sets")
        self.sets.append(
            {
                "evidence_set_id": evidence_set_id,
                "retrieval_run_id": retrieval_run_id,
                "objective_id": objective_id,
                "optimization_policy_version": optimization_policy_version,
            }
        )

    def add_members(
        self, evidence_set_id: str, members: list[tuple[str, str]]
    ) -> None:
        self.order.append("evidence_set_members")
        self.members.append((evidence_set_id, members))

    def add_usages(self, rows: list[dict[str, Any]]) -> None:
        self.order.append("evidence_usages")
        self.usages.extend(rows)


def _candidate(candidate_id: str, selected: bool = True) -> EvidenceCandidate:
    return EvidenceCandidate(
        candidate_id=candidate_id,
        target_type="chunk",
        target_id=f"chunk_{candidate_id}",
        strategy=RetrievalStrategy.FUSION,
        strategy_rank=1,
        fusion_score=0.5,
        source_tier=SourceTier.POSTING,
        company_id="co_1",
        selected=selected,
    )


def _evidence_set(*candidate_ids: str) -> EvidenceSet:
    return EvidenceSet(
        evidence_set_id="eset_1",
        objective_id="obj_1",
        optimization_policy_version="ev_v1",
        members=tuple(_candidate(cid) for cid in candidate_ids),
        slot_assignment={"cluster_support": tuple(candidate_ids)},
    )


def _recorder(store: FakeRetrievalStore) -> RetrievalRecorder:
    return RetrievalRecorder(store, ENVELOPE, AGENT)


# ============================================================ 7-4 기록 순서
def test_여섯_표가_외래키_순서로_기록된다():
    store = FakeRetrievalStore()
    recorder = _recorder(store)

    recorder.start(started_at=MOMENT)
    recorder.record_query("Spring Boot", "keyword", "requirement", (_candidate("c1"),))
    recorder.record_evidence_set(_evidence_set("c1"))
    recorder.record_usages(
        (
            EvidenceUsage(
                candidate_id="c1",
                usage_type=UsageType.SUPPORTS_CLAIM,
                used_claim_id="claim_1",
            ),
        ),
        recorded_at=MOMENT,
    )

    assert store.order == [
        "retrieval_runs",
        "retrieval_queries",
        "retrieval_candidates",
        "evidence_sets",
        "evidence_set_members",
        "evidence_usages",
    ]


def test_실행_행이_봉투의_분석_버전과_실행_식별자를_담는다():
    """`retrieval_runs` 는 둘 다 NOT NULL 이다. 봉투 없이는 한 줄도 넣지 못한다."""
    store = FakeRetrievalStore()
    run_id = _recorder(store).start(started_at=MOMENT)

    row = store.runs[0]
    assert row["analysis_version"] == "an_test"
    assert row["agent_run_id"] == "run_test"
    assert row["agent_name"] == AGENT
    assert run_id == retrieval_run_identifier("an_test", "run_test", 1)


def test_실행을_시작하지_않으면_질의를_담지_않는다():
    store = FakeRetrievalStore()

    with pytest.raises(ValueError):
        _recorder(store).record_query("Spring Boot", "keyword", "requirement")

    assert store.queries == []


def test_실행을_두_번_시작하지_않는다():
    """계측은 append-only 라 같은 기본키를 두 번 넣지 못한다."""
    recorder = _recorder(FakeRetrievalStore())
    recorder.start(started_at=MOMENT)

    with pytest.raises(ValueError):
        recorder.start(started_at=MOMENT)


def test_표의_전략_값만_질의로_받는다():
    recorder = _recorder(FakeRetrievalStore())
    recorder.start(started_at=MOMENT)

    with pytest.raises(ValueError):
        recorder.record_query("Spring Boot", "fusion", "requirement")


def test_기록되지_않은_후보는_근거_집합에_담기지_않는다():
    """외래키가 거부할 행을 만들기 전에 멈춘다."""
    store = FakeRetrievalStore()
    recorder = _recorder(store)
    recorder.start(started_at=MOMENT)
    recorder.record_query("Spring Boot", "keyword", "requirement", (_candidate("c1"),))

    with pytest.raises(ValueError):
        recorder.record_evidence_set(_evidence_set("c1", "c2"))

    assert store.sets == []


def test_기록되지_않은_후보의_사용_목적을_담지_않는다():
    store = FakeRetrievalStore()
    recorder = _recorder(store)
    recorder.start(started_at=MOMENT)

    with pytest.raises(ValueError):
        recorder.record_usages(
            (EvidenceUsage(candidate_id="c9", usage_type=UsageType.PLANNING),)
        )

    assert store.usages == []


def test_고르지_않은_후보도_담는다():
    """`citation_utilization` 의 분모가 실제 검색량과 같아야 한다."""
    store = FakeRetrievalStore()
    recorder = _recorder(store)
    recorder.start(started_at=MOMENT)
    dropped = _candidate("c2", selected=False).model_copy(
        update={"rejection_reason": "EVIDENCE_TIER_OUT_OF_SCOPE"}
    )
    recorder.record_query(
        "Spring Boot", "keyword", "requirement", (_candidate("c1"), dropped)
    )

    rows = {row["candidate_id"]: row for row in store.candidates}
    assert rows["c1"]["selected"] is True
    assert rows["c2"]["selected"] is False
    assert rows["c2"]["rejection_reason"] == "EVIDENCE_TIER_OUT_OF_SCOPE"


def test_인용하지_않은_기여도_담는다():
    """반례 검사와 계획도 검색의 기여다(docs/architecture.md 14.2)."""
    store = FakeRetrievalStore()
    recorder = _recorder(store)
    recorder.start(started_at=MOMENT)
    recorder.record_query("Spring Boot", "keyword", "requirement", (_candidate("c1"),))

    usage_ids = recorder.record_usages(
        (EvidenceUsage(candidate_id="c1", usage_type=UsageType.PLANNING),),
        recorded_at=MOMENT,
    )

    assert store.usages[0]["usage_type"] == "planning"
    assert store.usages[0]["used_claim_id"] is None
    assert usage_ids == (
        usage_identifier("c1", UsageType.PLANNING, None),
    )


def test_식별자가_결정적이다():
    """재실행이 계측을 늘리지 않는다."""
    run_id = retrieval_run_identifier("an_test", "run_test", 1)
    assert run_id == retrieval_run_identifier("an_test", "run_test", 1)
    assert run_id != retrieval_run_identifier("an_test", "run_test", 2)

    query_id = query_identifier(run_id, "requirement", "keyword", "Spring Boot")
    assert query_id == query_identifier(run_id, "requirement", "keyword", "Spring Boot")
    assert query_id != query_identifier(run_id, "requirement", "vector", "Spring Boot")

    first = usage_identifier("c1", UsageType.SUPPORTS_CLAIM, "claim_1")
    assert first != usage_identifier("c1", UsageType.SUPPORTS_CLAIM, "claim_2")


def test_거른_조건이_없으면_빈_객체를_넣는다():
    """`retrieval_queries.filters` 는 NOT NULL 이다."""
    store = FakeRetrievalStore()
    recorder = _recorder(store)
    recorder.start(started_at=MOMENT)
    recorder.record_query("Spring Boot", "keyword", "requirement")

    assert store.queries[0]["filters"] == {}


# ============================================================ 24-2 계측 지표
def test_인용_외의_기여도_사용률에_들어간다():
    rows = (
        CandidateUsageRow(
            candidate_id="c1",
            usage_type=UsageType.SUPPORTS_CLAIM,
            used_claim_id="claim_1",
        ),
        CandidateUsageRow(candidate_id="c2", usage_type=UsageType.NORMALIZATION),
        CandidateUsageRow(candidate_id="c3", usage_type=UsageType.UNUSED),
        CandidateUsageRow(candidate_id="c4"),
    )

    assert citation_utilization(rows) == 0.5


def test_한_후보의_여러_사용_기록이_분모를_부풀리지_않는다():
    rows = (
        CandidateUsageRow(
            candidate_id="c1",
            usage_type=UsageType.SUPPORTS_CLAIM,
            used_claim_id="claim_1",
        ),
        CandidateUsageRow(
            candidate_id="c1",
            usage_type=UsageType.SUPPORTS_CLAIM,
            used_claim_id="claim_2",
        ),
        CandidateUsageRow(candidate_id="c2", usage_type=UsageType.UNUSED),
    )

    assert citation_utilization(rows) == 0.5


def test_정밀도는_인용_가운데_지지의_비율이다():
    rows = (
        CandidateUsageRow(
            candidate_id="c1",
            usage_type=UsageType.SUPPORTS_CLAIM,
            used_claim_id="claim_1",
        ),
        CandidateUsageRow(
            candidate_id="c2",
            usage_type=UsageType.CONTRADICTS_CLAIM,
            used_claim_id="claim_1",
        ),
        CandidateUsageRow(candidate_id="c3", usage_type=UsageType.PLANNING),
    )

    assert citation_precision(rows) == 0.5


def test_주장에_붙지_않은_용도는_정밀도의_분모가_아니다():
    rows = (
        CandidateUsageRow(candidate_id="c1", usage_type=UsageType.COVERAGE_CHECK),
        CandidateUsageRow(candidate_id="c2", usage_type=UsageType.UNUSED),
    )

    assert citation_precision(rows) is None


def test_허용되지_않은_계층은_주장을_덮지_않는다():
    """통계 주장의 근거는 A 계층만이다(docs/data-strategy.md 3장)."""
    rows = (
        ClaimEvidenceRow(
            claim_id="claim_1", candidate_id="c1", source_tier=SourceTier.POSTING
        ),
        ClaimEvidenceRow(
            claim_id="claim_2",
            candidate_id="c2",
            source_tier=SourceTier.VERIFIED_EXTERNAL,
        ),
    )

    assert claim_coverage(rows, AllowedUse.STATISTICS) == 0.5
    assert claim_coverage(rows, AllowedUse.INTERPRETATION_CONTEXT) == 1.0


def test_근거가_없는_주장도_분모에_들어간다():
    rows = (
        ClaimEvidenceRow(
            claim_id="claim_1", candidate_id="c1", source_tier=SourceTier.POSTING
        ),
        ClaimEvidenceRow(claim_id="claim_2"),
    )

    assert claim_coverage(rows, AllowedUse.INTERPRETATION_CONTEXT) == 0.5


def test_계층을_모르는_근거는_연결로_세지_않는다():
    rows = (ClaimEvidenceRow(claim_id="claim_1", candidate_id="c1"),)

    assert claim_coverage(rows, AllowedUse.INTERPRETATION_CONTEXT) == 0.0


def test_분모가_비면_값을_비운다():
    """재지 못한 것과 재었더니 0 인 것을 구분한다."""
    assert ratio(0, 0) is None
    assert citation_utilization(()) is None
    assert claim_coverage((), AllowedUse.STRATEGY) is None

    empty = report((), ())
    assert empty.values() == {
        "citation_utilization": None,
        "citation_precision": None,
        "claim_coverage": None,
    }
    assert empty.candidates == 0


def test_보고가_분모를_함께_담는다():
    usage_rows = (
        CandidateUsageRow(
            candidate_id="c1",
            usage_type=UsageType.SUPPORTS_CLAIM,
            used_claim_id="claim_1",
        ),
        CandidateUsageRow(candidate_id="c2", usage_type=UsageType.UNUSED),
    )
    claim_rows = (
        ClaimEvidenceRow(
            claim_id="claim_1", candidate_id="c1", source_tier=SourceTier.POSTING
        ),
    )

    summary = report(usage_rows, claim_rows, AllowedUse.INTERPRETATION_CONTEXT)

    assert summary.candidates == 2
    assert summary.citations == 1
    assert summary.claims == 1
    assert summary.citation_utilization == 0.5
    assert summary.citation_precision == 1.0
    assert summary.claim_coverage == 1.0


def test_한계_효용은_실험을_돌리지_않고_차이만_낸다():
    baseline = InstrumentationReport(
        citation_utilization=0.8, citation_precision=0.9, claim_coverage=None
    )
    ablated = InstrumentationReport(
        citation_utilization=0.5, citation_precision=0.9, claim_coverage=0.4
    )

    delta = marginal_utility(baseline, ablated)

    assert delta["citation_utilization"] == 0.3
    assert delta["citation_precision"] == 0.0
    assert delta["claim_coverage"] is None


def test_제거_실험은_인터페이스만_둔다():
    """평가 세트 표본에서 측정한다. 이 모듈에 구현이 없다."""
    from careersignal.telemetry import instrumentation

    case = AblationCase(removed_kind="strategy", removed_id="vector")

    assert case.eval_set_id is None
    assert not hasattr(instrumentation, "run_ablation")


# ============================================================ 24-3 버전 고정
def test_봉투와_버전을_한_줄로_기록한다():
    recorded: list[dict[str, str]] = []

    class FakeLog:
        def record_run_versions(self, values: dict[str, str]) -> None:
            recorded.append(values)

    pin = pin_versions(ENVELOPE, RunVersions(), FakeLog())

    assert pin.as_row() == recorded[0]
    assert recorded[0]["analysis_version"] == "an_test"
    assert recorded[0]["agent_run_id"] == "run_test"
    assert recorded[0]["model_version"] == "model_v1"
    assert recorded[0]["metric_policy_version"] == "mp_v1_prevalence"


def test_같은_버전으로_다시_고정해도_기록이_늘지_않는다():
    recorded: list[dict[str, str]] = []

    class FakeLog:
        def record_run_versions(self, values: dict[str, str]) -> None:
            recorded.append(values)

    board = VersionPinboard(FakeLog())
    board.pin(ENVELOPE)
    board.pin(ENVELOPE)

    assert len(recorded) == 1


def test_실행_중에_모델이_바뀌면_예외다():
    board = VersionPinboard()
    board.pin(ENVELOPE)

    with pytest.raises(VersionDriftError) as error:
        board.require(
            "run_test", RunVersions(model_version="model_v2")
        )

    assert "model_v1 -> model_v2" in str(error.value)


def test_실행_중에_프롬프트가_바뀌면_고정을_거부한다():
    board = VersionPinboard()
    board.pin(ENVELOPE)

    with pytest.raises(VersionDriftError):
        board.pin(ENVELOPE, RunVersions(prompt_version="prompt_v2"))


def test_고정하지_않은_실행은_확인할_수_없다():
    with pytest.raises(VersionDriftError):
        VersionPinboard().require("run_없음", RunVersions())


def test_같은_버전이면_통과한다():
    board = VersionPinboard()
    board.pin(ENVELOPE)

    board.require("run_test", RunVersions())

    assert board.versions_of("run_test") == RunVersions()
    assert board.pinned_runs == ("run_test",)


def test_분석_버전_행에서_버전_넷을_읽는다():
    row = {
        "analysis_version": "an_test",
        "model_version": "model_v2",
        "prompt_version": "prompt_v2",
        "retrieval_policy_version": "rp_v2",
        "metric_policy_version": "mp_v2",
    }

    versions = RunVersions.from_row(row)

    assert versions.model_version == "model_v2"
    assert versions.metric_policy_version == "mp_v2"


def test_버전_열이_없는_행은_기본값으로_덮지_않는다():
    """없는 열을 기본값으로 덮으면 어긋남을 못 본다."""
    with pytest.raises(KeyError):
        RunVersions.from_row({"model_version": "model_v2"})
