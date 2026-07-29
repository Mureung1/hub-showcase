"""합격 전략 에이전트의 규칙과 산출물 검증.

Phase 16 의 세 단위를 검사한다. 활용처 배정(16-1), 개념과 버전 인스턴스의
분리(16-2), 연결 완전성과 자료 정책(16-3)이다. payload 의 모양은
`agent/data/demo_seed/CONTRACT.md` 5장 C 에서, 저장 행은 docs/erd.md 11.7 에서 온다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.agents.strategy import (
    AGENT_VERSION,
    OUTPUT_TYPE,
    PRODUCED_BY,
    BaselineRequirement,
    Channel,
    ChecklistCopy,
    ChecklistDraft,
    ChecklistKind,
    Confidence,
    DeviationSignal,
    EvidenceKind,
    EvidenceLink,
    InterpretationInput,
    StrategyPlanner,
    StubStrategyWriter,
    assign_channels,
    build_payload,
    concept_identifier,
    draft_checklist,
    evidence_checks,
    item_identifier,
    item_of,
    output_identifier,
    policy_violations,
    surviving_checks,
    unlinked,
    version_marker,
)
from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import SourceTier

JOB = "backend"
CLUSTER = "cl_fintech"
CLUSTER_LABEL = "핀테크·금융"


class Store:
    """전략 저장소 대역. 메모리에만 담는다."""

    def __init__(self) -> None:
        self.concepts: dict[str, dict[str, Any]] = {}
        self.items: list[dict[str, Any]] = []
        self.outputs: list[dict[str, Any]] = []

    def find_concept(self, concept_id: str) -> dict[str, Any] | None:
        return self.concepts.get(concept_id)

    def add_concept(self, values: dict[str, Any]) -> None:
        if values["concept_id"] in self.concepts:
            raise AssertionError("같은 개념을 두 번 만들었다")
        self.concepts[values["concept_id"]] = values

    def add_item(self, values: dict[str, Any]) -> None:
        self.items.append(values)

    def save_output(self, values: dict[str, Any]) -> None:
        self.outputs.append(values)


class BrokenWriter:
    """문구 생성이 실패하는 대역."""

    def write(self, draft: ChecklistDraft) -> ChecklistCopy:
        raise RuntimeError("문구 생성 실패")


def _context(**kw: Any) -> RunContext:
    base: dict[str, Any] = {
        "agent_run_id": "run_demo_backend_strategy",
        "analysis_version": "an_demo_backend",
        "dataset_version": "ds_demo_v1",
        "job_role_id": JOB,
        "scope_level": ScopeLevel.OVERALL,
        "as_of_date": date(2026, 7, 28),
    }
    return RunContext(**(base | kw))


def _interpretation(**kw: Any) -> InterpretationInput:
    base: dict[str, Any] = {
        "job_role_id": JOB,
        "scope_level": ScopeLevel.OVERALL,
        "baseline": (
            BaselineRequirement(
                item_id="dim_backend_crud-api",
                title="CRUD REST API 프로젝트",
                desc="공고 68% 가 요구",
                freq_pct=68.0,
                required_ratio=0.92,
            ),
            BaselineRequirement(
                item_id="dim_backend_collab",
                title="협업 문제 해결 서사",
                kind=ChecklistKind.STORY,
                required_ratio=0.6,
            ),
            BaselineRequirement(
                item_id="dim_backend_security",
                title="보안 기본 이해",
                required_ratio=0.2,
            ),
        ),
        "deviations": (
            DeviationSignal(
                item_id="dim_backend_tx",
                dev_n=1,
                topic="트랜잭션·동시성 심화",
                deviation="핀테크는 필수로 적는다",
                confidence=Confidence.HIGH,
            ),
            DeviationSignal(
                item_id="dim_backend_tx-theory",
                dev_n=2,
                topic="트랜잭션·DB 이론",
                kind=ChecklistKind.STUDY,
                confidence=Confidence.MID,
            ),
        ),
    }
    return InterpretationInput(**(base | kw))


# --------------------------------------------------------------- 16-1 활용처
def test_kind_decides_the_primary_channel() -> None:
    """갈래마다 반드시 가는 자리가 하나 있다."""
    assert assign_channels(ChecklistKind.PROJECT) == (Channel.PORTFOLIO,)
    assert assign_channels(ChecklistKind.STORY) == (Channel.ESSAY,)
    assert assign_channels(ChecklistKind.STUDY) == (Channel.INTERVIEW,)


def test_deviation_adds_interview() -> None:
    """편차 항목은 면접을 함께 받는다. 순서는 계약이 정한 순서다."""
    assert assign_channels(ChecklistKind.PROJECT, is_deviation=True) == (
        Channel.PORTFOLIO,
        Channel.INTERVIEW,
    )
    assert assign_channels(ChecklistKind.STORY, is_deviation=True) == (
        Channel.ESSAY,
        Channel.INTERVIEW,
    )


def test_preferred_deviation_does_not_take_interview() -> None:
    """우대로 배정된 편차는 면접 준비 목록에 올리지 않는다."""
    assert assign_channels(
        ChecklistKind.PROJECT, is_deviation=True, required=False
    ) == (Channel.PORTFOLIO,)


def test_study_stays_on_interview_only() -> None:
    """학습 항목은 산출물이 남지 않아 다른 자리에 쓸 것이 없다."""
    assert assign_channels(
        ChecklistKind.STUDY, is_deviation=True, required=True
    ) == (Channel.INTERVIEW,)


def test_channels_are_a_subset_of_three() -> None:
    """`checklist_items.channels` 의 CHECK 를 넘는 값이 나오지 않는다."""
    allowed = {Channel.ESSAY, Channel.PORTFOLIO, Channel.INTERVIEW}
    for kind in ChecklistKind:
        for is_deviation in (False, True):
            for required in (False, True):
                channels = assign_channels(
                    kind, is_deviation=is_deviation, required=required
                )
                assert channels
                assert set(channels) <= allowed


def test_low_required_ratio_becomes_preferred() -> None:
    """절반에 못 미치는 요구 비율은 우대로 배정한다."""
    drafts = {d.title: d for d in draft_checklist(_interpretation())}
    assert drafts["보안 기본 이해"].required is False
    assert drafts["CRUD REST API 프로젝트"].required is True


def test_low_confidence_deviation_becomes_preferred() -> None:
    """신뢰도가 낮은 편차를 필수로 올리지 않는다."""
    interpretation = _interpretation(
        deviations=(
            DeviationSignal(
                item_id="dim_backend_security",
                dev_n=1,
                topic="보안 기본 이해",
                confidence=Confidence.LOW,
            ),
        ),
    )
    draft = next(
        d for d in draft_checklist(interpretation) if d.title == "보안 기본 이해"
    )
    assert draft.required is False
    assert draft.channels == (Channel.PORTFOLIO,)


def test_deviations_come_first() -> None:
    """좁은 범위에서 갈리는 지점을 먼저 읽힌다."""
    drafts = draft_checklist(_interpretation())
    assert [d.is_deviation for d in drafts][:2] == [True, True]


# --------------------------------------------------------------- 16-2 개념
def test_concept_identifier_is_deterministic() -> None:
    """같은 제목은 언제나 같은 개념이다."""
    first = concept_identifier(JOB, "CRUD REST API 프로젝트")
    second = concept_identifier(JOB, " CRUD REST API 프로젝트 ")
    assert first == second
    assert first.startswith(f"cc_{JOB}_")


def test_concept_identifier_separates_korean_titles() -> None:
    """ASCII 로 옮기면 같아지는 제목을 해시가 가른다."""
    first = concept_identifier(JOB, "트랜잭션·동시성 심화")
    second = concept_identifier(JOB, "트랜잭션·DB 이론")
    assert first != second


def test_ascii_title_keeps_a_readable_slug() -> None:
    assert concept_identifier(JOB, "CRUD API") == "cc_backend_crud-api"


def test_identifiers_follow_the_seed_contract() -> None:
    """CONTRACT 1장의 식별자 모양을 지킨다. 표식은 데모 시드의 `demo` 다."""
    assert item_identifier(
        JOB, ScopeLevel.CLUSTER, CLUSTER, "CRUD API"
    ) == f"ci_demo_{JOB}_{CLUSTER}_crud-api"
    assert (
        output_identifier(JOB, ScopeLevel.OVERALL, None)
        == f"out_demo_{JOB}_strat_overall"
    )
    # 표식을 넘기지 않으면 분석 버전에서 만든다. 두 버전이 같은 값을 갖지 않는다.
    assert version_marker("an_demo_backend") != version_marker("an_demo_backend_2")


def test_concept_survives_a_copy_change() -> None:
    """문구가 바뀌어도 개념 식별자는 그대로다.

    사용자 체크 상태의 키가 개념 식별자이므로 이것이 곧 체크의 생존이다.
    """
    store = Store()
    context = _context()
    interpretation = _interpretation()

    first = StrategyPlanner(StubStrategyWriter(), store, workers=1).run(
        context, interpretation
    )
    checks = {item.concept_id: True for item in first.items}

    second = StrategyPlanner(
        StubStrategyWriter(suffix="(개정)"), store, workers=1
    ).run(
        _context(analysis_version="an_demo_backend_2"),
        interpretation,
    )

    assert [i.concept_id for i in second.items] == [i.concept_id for i in first.items]
    # 항목 식별자는 버전 표식을 담으므로 버전마다 다르다. 기본키가 겹치지 않는다.
    assert [i.item_id for i in second.items] != [i.item_id for i in first.items]
    assert [i.reason for i in second.items] != [i.reason for i in first.items]
    assert surviving_checks(checks, second.items) == checks
    # 개념은 한 번만 만든다. 두 번째 실행은 새 개념을 만들지 않는다.
    assert second.concepts == ()
    assert len(store.concepts) == len(first.items)


def test_dropped_concept_loses_its_check() -> None:
    """사라진 개념의 체크만 떨어진다."""
    store = Store()
    outcome = StrategyPlanner(StubStrategyWriter(), store, workers=1).run(
        _context(), _interpretation()
    )
    checks = {item.concept_id: True for item in outcome.items}
    checks["cc_backend_gone"] = True
    assert surviving_checks(checks, outcome.items) == {
        item.concept_id: True for item in outcome.items
    }


def test_concept_row_has_no_analysis_version() -> None:
    """개념은 버전을 넘어 유지되므로 버전 컬럼을 갖지 않는다."""
    store = Store()
    StrategyPlanner(StubStrategyWriter(), store, workers=1).run(
        _context(), _interpretation()
    )
    for row in store.concepts.values():
        assert set(row) == {"concept_id", "job_role_id", "canonical_title", "kind"}
    for row in store.items:
        assert row["analysis_version"] == "an_demo_backend"
        assert set(row["channels"]) <= {"essay", "portfolio", "interview"}


def test_same_title_in_baseline_and_deviation_is_one_concept() -> None:
    """개념은 제목마다 하나이며 두 근거를 함께 딛는다."""
    interpretation = _interpretation(
        baseline=(
            BaselineRequirement(
                item_id="dim_backend_tx",
                title="트랜잭션·동시성 심화",
                required_ratio=0.8,
            ),
        ),
        deviations=(
            DeviationSignal(
                item_id="dim_backend_tx",
                dev_n=1,
                topic="트랜잭션·동시성 심화",
            ),
        ),
    )
    drafts = draft_checklist(interpretation)
    assert len(drafts) == 1
    assert {link.kind for link in drafts[0].evidence_links} == {
        EvidenceKind.DIMENSION,
        EvidenceKind.DEVIATION,
    }


# --------------------------------------------------------------- 16-3 검사
def _draft(**kw: Any) -> ChecklistDraft:
    base: dict[str, Any] = {
        "concept_id": "cc_backend_tx",
        "title": "트랜잭션",
        "channels": (Channel.PORTFOLIO,),
    }
    return ChecklistDraft(**(base | kw))


def test_unlinked_item_fails_the_completeness_check() -> None:
    """근거가 하나도 없는 항목을 가려낸다."""
    draft = _draft()
    assert unlinked([draft]) == ("cc_backend_tx",)
    checks = evidence_checks([draft])
    assert len(checks) == 1
    assert checks[0].reason_code == "missing_evidence_link"
    assert checks[0].blocks_publication


def test_unverified_tier_fails_the_policy_check() -> None:
    """E 계층은 `strategy` 용도를 갖지 못한다."""
    draft = _draft(
        evidence_links=(
            EvidenceLink(
                concept_id="cc_backend_tx",
                kind=EvidenceKind.DIMENSION,
                ref_id="dim_backend_tx",
                source_tier=SourceTier.UNVERIFIED,
            ),
        )
    )
    assert policy_violations([draft]) == (
        ("cc_backend_tx", "dim_backend_tx", SourceTier.UNVERIFIED),
    )
    checks = evidence_checks([draft])
    assert checks[0].reason_code == "tier_not_allowed_for_strategy"
    assert checks[0].blocks_publication


def test_allowed_tiers_pass_the_policy_check() -> None:
    """A~D 계층은 전략 근거가 된다(docs/data-strategy.md 3장)."""
    drafts = [
        _draft(
            concept_id=f"cc_backend_{tier}",
            evidence_links=(
                EvidenceLink(
                    concept_id=f"cc_backend_{tier}",
                    kind=EvidenceKind.DIMENSION,
                    ref_id="dim_backend_tx",
                    source_tier=tier,
                ),
            ),
        )
        for tier in (
            SourceTier.POSTING,
            SourceTier.COMPANY_OFFICIAL,
            SourceTier.PUBLIC_STANDARD,
            SourceTier.VERIFIED_EXTERNAL,
        )
    ]
    assert evidence_checks(drafts) == ()


def test_blocked_items_are_not_stored() -> None:
    """검사에 걸린 항목은 개념도 인스턴스도 만들지 않는다."""
    store = Store()
    writer = StubStrategyWriter()
    interpretation = _interpretation(
        baseline=(
            BaselineRequirement(
                item_id="dim_backend_crud-api",
                title="CRUD REST API 프로젝트",
                required_ratio=0.9,
            ),
            BaselineRequirement(
                item_id="dim_backend_rumor",
                title="소문으로 도는 요구",
                required_ratio=0.9,
                source_tier=SourceTier.UNVERIFIED,
            ),
        ),
        deviations=(),
    )
    outcome = StrategyPlanner(writer, store, workers=1, marker="demo").run(
        _context(), interpretation
    )

    blocked = concept_identifier(JOB, "소문으로 도는 요구")
    assert outcome.rejected == (blocked,)
    assert blocked not in store.concepts
    assert [row["concept_id"] for row in store.items] != [blocked]
    assert all(draft.concept_id != blocked for draft in writer.calls)
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.blocked is True
    # 나머지 항목은 그대로 저장된다.
    assert len(outcome.items) == 1
    assert store.outputs[0]["verification_status"] == "verified_with_warning"


# --------------------------------------------------------------- 실행과 payload
def test_run_stores_concepts_items_and_output() -> None:
    store = Store()
    outcome = StrategyPlanner(
        StubStrategyWriter(), store, workers=1, marker="demo"
    ).run(_context(), _interpretation())

    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert outcome.gained_evidence is True
    assert outcome.output_id == f"out_demo_{JOB}_strat_overall"
    assert len(store.concepts) == len(outcome.items) == 5
    assert len(store.items) == 5

    row = store.outputs[0]
    assert row["output_type"] == OUTPUT_TYPE
    assert row["produced_by_agent"] == PRODUCED_BY
    assert row["scope_level"] == "overall"
    # scope_id 는 NOT NULL 이므로 overall 범위는 직무 식별자를 넣는다.
    assert row["scope_id"] == JOB
    assert row["payload"] == outcome.payload


def test_payload_checklist_key_is_the_concept_id() -> None:
    """화면 체크 상태와 로드맵이 이 키에 기댄다."""
    store = Store()
    outcome = StrategyPlanner(StubStrategyWriter(), store, workers=1).run(
        _context(), _interpretation()
    )
    payload = outcome.payload
    assert payload is not None
    concept_ids = [item.concept_id for item in outcome.items]
    assert [entry["item_id"] for entry in payload["checklist"]] == concept_ids
    assert all(entry["item_id"].startswith("cc_") for entry in payload["checklist"])
    # 링크도 같은 키를 쓴다.
    linked = {
        one
        for card in payload["essay"] + payload["interview"]
        for one in card["linked_item_ids"]
    }
    assert linked <= set(concept_ids)


def test_payload_keeps_the_contract_shape() -> None:
    """CONTRACT 5장 C 의 최상위 키와 항목 칸을 그대로 유지한다."""
    payload = build_payload(
        _interpretation(
            scope_level=ScopeLevel.CLUSTER,
            scope_id=CLUSTER,
            cluster_tag=CLUSTER_LABEL,
        ),
        [
            item_of(
                _draft(
                    channels=(Channel.PORTFOLIO, Channel.INTERVIEW),
                    is_deviation=True,
                    dev_n=1,
                    topic="핀테크는 필수로 적는다",
                ),
                ChecklistCopy(reason="편차 · 근거", evidence_needed="설계 문서"),
                analysis_version="an_demo_backend",
                job_role_id=JOB,
                scope_level=ScopeLevel.CLUSTER,
                scope_id=CLUSTER,
            )
        ],
    )

    assert set(payload) == {
        "job",
        "scope",
        "checklist",
        "portfolio",
        "essay",
        "interview",
        "agent_version",
        "source",
    }
    assert payload["scope"] == {
        "level": "cluster",
        "cluster_tag": CLUSTER_LABEL,
        "posting_id": None,
    }
    assert set(payload["portfolio"]) == {"highlights", "intro_orders"}
    assert payload["portfolio"]["intro_orders"][0]["cluster"] == CLUSTER_LABEL
    assert payload["agent_version"] == AGENT_VERSION
    assert payload["source"] == "stored"

    entry = payload["checklist"][0]
    assert set(entry) == {
        "item_id",
        "title",
        "subtitle",
        "reason",
        "evidence_needed",
        "channels",
        "kind",
        "is_deviation",
        "dev_n",
        "required",
        "have",
    }
    # 사용자 상태는 브라우저에 있다. 저장되는 값은 항상 false 다.
    assert entry["have"] is False
    assert entry["channels"] == ["portfolio", "interview"]
    # 자기소개서에 배정되지 않은 항목은 자기소개서 카드에 나오지 않는다.
    assert payload["essay"] == []
    assert payload["interview"][0]["kicker"] == "편차 1"


def test_copy_outside_the_assigned_channels_is_dropped() -> None:
    """배정되지 않은 자리의 문구는 대역이 비운다."""
    copy = StubStrategyWriter().write(_draft(channels=(Channel.PORTFOLIO,)))
    assert copy.interview_question is None
    assert copy.narrative is None
    assert copy.tips


def test_scope_mismatch_stops_before_writing() -> None:
    """봉투와 입력의 범위가 다르면 실행하지 않는다."""
    store = Store()
    planner = StrategyPlanner(StubStrategyWriter(), store, workers=1)
    with pytest.raises(ValueError):
        planner.run(
            _context(scope_level=ScopeLevel.CLUSTER, scope_id=CLUSTER),
            _interpretation(),
        )
    assert store.items == []


def test_writer_failure_does_not_lose_the_other_items() -> None:
    """한 항목의 실패가 나머지를 막지 않는다."""

    class Flaky(StubStrategyWriter):
        def write(self, draft: ChecklistDraft) -> ChecklistCopy:
            if draft.dev_n == 1:
                raise RuntimeError("문구 생성 실패")
            return super().write(draft)

    store = Store()
    outcome = StrategyPlanner(Flaky(), store, workers=1).run(
        _context(), _interpretation()
    )
    assert len(outcome.errors) == 1
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert len(outcome.items) == 4


def test_budget_limits_the_calls() -> None:
    """예산을 넘겨 부르지 않는다."""
    store = Store()
    writer = StubStrategyWriter()
    outcome = StrategyPlanner(writer, store, workers=1).run(
        _context(budget=Budget(max_tool_calls=2)), _interpretation()
    )
    assert len(writer.calls) == 2
    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED


def test_empty_interpretation_exhausts_the_frontier() -> None:
    store = Store()
    outcome = StrategyPlanner(StubStrategyWriter(), store, workers=1).run(
        _context(), _interpretation(baseline=(), deviations=())
    )
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert outcome.payload is None
    assert outcome.gained_evidence is False
    assert store.outputs == []


def test_all_writers_failing_reports_no_items() -> None:
    store = Store()
    outcome = StrategyPlanner(BrokenWriter(), store, workers=1).run(
        _context(), _interpretation()
    )
    assert outcome.items == ()
    assert outcome.payload is None
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
