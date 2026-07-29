"""채용공고 해석 에이전트 검증 (Phase 15).

규칙은 docs/agent-design.md 5.1·7.4·8장, docs/erd.md 11.3~11.6,
`agent/data/demo_seed/CONTRACT.md` 5장 B·8장에서 온다. 생성 모델을 대역으로
대체하고 저장소를 메모리 대역으로 바꾼 뒤, 요구 3구분·기준선·편차·범위 확인·상충
표시와 payload 형태만 검사한다. 외부 호출은 하지 않는다.
"""

from __future__ import annotations

import json
from datetime import date
from types import SimpleNamespace
from typing import Any

import pytest
from pydantic import ValidationError

from careersignal.agents.interpretation import (
    AGENT_NAME,
    AGENT_VERSION,
    BASELINE_SLOT,
    CLUSTER_SLOT,
    DEVIATION_DELTA,
    INSUFFICIENT,
    INTERPRETATION_CLAIM_TYPES,
    NO_BASELINE,
    OFFICIAL_SLOT,
    OUTPUT_TYPE,
    REFLECTED_IN_STATISTICS,
    BaselineItem,
    ClaimDraft,
    ClaimType,
    ConfidenceGrade,
    ContextSignal,
    CoverageAssertion,
    DeviationItem,
    DeviationVerdict,
    EntailmentVerdict,
    EvidenceRef,
    Interpretation,
    InterpretationAgent,
    OpenAIDeviationInterpreter,
    PostingEvidence,
    PostingView,
    RawLine,
    RawSection,
    Relation,
    RequirementKind,
    ScopeRef,
    StatisticFact,
    StubDeviationInterpreter,
    StubEntailmentJudge,
    SupportType,
    UnchangedItem,
    VerificationStatus,
    baseline_items,
    build_payload,
    confidence_grade,
    conflicting_supports,
    coverage_assertion,
    deviations,
    interpretation_objective,
    judge_deviation,
    may_assert_no_deviation,
    output_identifier,
    unchanged_items,
)
from careersignal.agents.interpretation.baseline import (
    PREVALENCE_FAMILY,
    REQUIREDNESS_FAMILY,
)
from careersignal.agents.interpretation.prompts import (
    DEVIATION_INTERPRETATION_PROMPT,
    DEVIATION_RESPONSE_SCHEMA,
    ENTAILMENT_TASK,
    INTERPRETATION_TASK,
    NO_EVIDENCE,
    deviation_message,
)
from careersignal.contracts.run_context import Budget, RunContext, StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.providers.models import TASK_TIER, Tier, chat_model

JOB = "backend"
CLUSTER = "핀테크·금융"
ANALYSIS = "an_demo_backend"


# ------------------------------------------------------------------ 대역


class FakeOpenAI:
    """OpenAI 클라이언트의 대역. 요청을 기록하고 정해 둔 답을 준다."""

    def __init__(self, payload: dict[str, Any] | None = None) -> None:
        self.requests: list[dict[str, Any]] = []
        self._payload = payload or {
            "explanation": "정합성 보장을 설명할 수 있어야 합니다.",
            "requirement_kind": "explicit_requirement",
            "deviation_label": "동시성·롤백까지",
        }
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs: Any) -> Any:
        self.requests.append(kwargs)
        content = json.dumps(self._payload, ensure_ascii=False)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))]
        )


class FakeRepository:
    """저장소 대역. psycopg 없이 저장 경로를 검사한다."""

    def __init__(
        self,
        facts: dict[tuple[str, str], list[dict[str, Any]]] | None = None,
        fail_on: str | None = None,
    ) -> None:
        self._facts = facts or {}
        self._fail_on = fail_on
        self.outputs: list[dict[str, Any]] = []
        self.claims: list[dict[str, Any]] = []
        self.claim_evidence: list[dict[str, Any]] = []
        self.assertions: list[dict[str, Any]] = []

    def statistics_facts(
        self,
        analysis_version: str,
        scope_level: str,
        scope_id: str,
        period_id: str | None = None,
    ) -> list[dict[str, Any]]:
        return list(self._facts.get((scope_level, scope_id), []))

    def add_output(self, values: dict[str, Any]) -> None:
        if self._fail_on == "output":
            raise RuntimeError("산출물 저장 실패")
        self.outputs.append(values)

    def add_claim(self, values: dict[str, Any]) -> None:
        if self._fail_on == "claim":
            raise RuntimeError("주장 저장 실패")
        self.claims.append(values)

    def add_claim_evidence(self, values: dict[str, Any]) -> None:
        self.claim_evidence.append(values)

    def add_coverage_assertion(self, values: dict[str, Any]) -> None:
        self.assertions.append(values)


def fact(
    dimension_id: str,
    value: float,
    family: str = PREVALENCE_FAMILY,
    scope_level: str = "overall",
    scope_id: str = JOB,
    sample_size: int = 9,
    sample_status: str = "analysis_ready",
    label: str | None = None,
) -> dict[str, Any]:
    return {
        "fact_id": f"fact_{family}_{scope_id}_{dimension_id}",
        "metric_family": family,
        "measure": "ratio",
        "scope_level": scope_level,
        "scope_id": scope_id,
        "dimension_id": dimension_id,
        "dimension_label": label or dimension_id,
        "value": value,
        "sample_size": sample_size,
        "sample_status": sample_status,
        "period_id": "recent_12m",
    }


def facts(rows: list[dict[str, Any]]) -> tuple[StatisticFact, ...]:
    return tuple(StatisticFact(**row) for row in rows)


OVERALL_ROWS = [
    fact("dim_backend_crud", 0.68, label="CRUD API"),
    fact("dim_backend_rdb", 0.67, label="RDB 스키마"),
    fact("dim_backend_error", 0.50, label="예외 처리"),
    fact("dim_backend_deploy", 0.43, label="배포"),
    fact("dim_backend_test", 0.40, label="테스트"),
    fact("dim_backend_git", 0.33, label="Git 협업"),
    fact("dim_backend_tx", 0.27, label="트랜잭션"),
    fact("dim_backend_crud", 0.92, family=REQUIREDNESS_FAMILY),
]

CLUSTER_ROWS = [
    fact("dim_backend_tx", 0.80, scope_level="cluster", scope_id=CLUSTER, label="트랜잭션"),
    fact("dim_backend_crud", 0.70, scope_level="cluster", scope_id=CLUSTER, label="CRUD API"),
    fact("dim_backend_sec", 0.55, scope_level="cluster", scope_id=CLUSTER, label="보안"),
]


def context(
    scope_level: ScopeLevel = ScopeLevel.CLUSTER,
    scope_id: str | None = CLUSTER,
    max_tool_calls: int = 40,
) -> RunContext:
    return RunContext(
        agent_run_id="run_demo_backend_interpretation",
        analysis_version=ANALYSIS,
        dataset_version="ds_demo_v1",
        job_role_id=JOB,
        scope_level=scope_level,
        scope_id=scope_id,
        as_of_date=date(2026, 7, 28),
        budget=Budget(max_tool_calls=max_tool_calls),
    )


def repository(fail_on: str | None = None) -> FakeRepository:
    return FakeRepository(
        {
            ("overall", JOB): OVERALL_ROWS,
            ("cluster", CLUSTER): CLUSTER_ROWS,
        },
        fail_on=fail_on,
    )


def evidence(relation: Relation = Relation.SUPPORTS) -> dict[str, list[PostingEvidence]]:
    return {
        "dim_backend_tx": [
            PostingEvidence(
                chunk_id="chunk_demo_backend_01_1",
                posting_id="dp_backend_01",
                company_id="co_a",
                dimension_id="dim_backend_tx",
                text="대용량 트랜잭션의 안전한 처리 경험",
            ),
            PostingEvidence(
                chunk_id="chunk_demo_backend_02_1",
                posting_id="dp_backend_02",
                company_id="co_b",
                dimension_id="dim_backend_tx",
                text="결제·정산의 정확성 보장",
                relation=relation,
            ),
        ]
    }


# --------------------------------------------------- 15-1 근거 슬롯과 요구 3구분


def test_requirement_kinds_are_three() -> None:
    """docs/agent-design.md 7.4 의 세 구분만 존재한다."""
    assert [k.value for k in RequirementKind] == [
        "explicit_requirement",
        "inferred_requirement",
        "company_context_signal",
    ]


def test_only_explicit_requirement_reaches_statistics() -> None:
    """해석한 요구와 회사 맥락 신호는 통계에 반영하지 않는다."""
    assert REFLECTED_IN_STATISTICS == {RequirementKind.EXPLICIT_REQUIREMENT}


def test_objective_declares_slots_before_retrieval() -> None:
    """검색 이전에 완료 조건을 선언한다(docs/agent-design.md 5.1)."""
    objective = interpretation_objective(JOB, ScopeLevel.CLUSTER, CLUSTER)
    names = [slot.slot for slot in objective.required_evidence_slots]
    assert names == [BASELINE_SLOT, CLUSTER_SLOT, OFFICIAL_SLOT]

    required = {slot.slot for slot in objective.required_slots}
    assert BASELINE_SLOT in required and CLUSTER_SLOT in required
    # 회사 공식 자료는 선택 슬롯이다. 비어도 주장은 성립하되 신뢰도가 낮아진다.
    assert OFFICIAL_SLOT not in required


def test_cluster_slot_requires_independent_companies() -> None:
    """기업군 일반화는 독립 회사 둘 이상을 요구한다."""
    objective = interpretation_objective(JOB, ScopeLevel.CLUSTER, CLUSTER)
    slot = next(s for s in objective.required_evidence_slots if s.slot == CLUSTER_SLOT)
    assert slot.minimum_independent_companies >= 2


def test_overall_scope_has_no_cluster_slot() -> None:
    """직무 전체 범위는 공고 근거 슬롯을 요구하지 않는다."""
    objective = interpretation_objective(JOB, ScopeLevel.OVERALL)
    assert CLUSTER_SLOT not in {s.slot for s in objective.required_evidence_slots}


def test_objective_is_incomplete_until_required_slots_fill() -> None:
    objective = interpretation_objective(JOB, ScopeLevel.CLUSTER, CLUSTER)
    assert objective.unmet({BASELINE_SLOT: 1}) == (CLUSTER_SLOT,)
    assert objective.is_complete({BASELINE_SLOT: 1, CLUSTER_SLOT: 2})


def test_requirement_claims_carry_their_kind() -> None:
    """요구를 말하는 주장은 3구분을 반드시 갖는다."""
    with pytest.raises(ValidationError):
        ClaimDraft(
            claim_id="claim_x",
            claim_type=ClaimType.INFERRED_REQUIREMENT,
            scope_level=ScopeLevel.CLUSTER,
            scope_id=CLUSTER,
            claim_text="해석한 요구",
        )


def test_statistic_claim_has_no_requirement_kind() -> None:
    """수치 주장은 요구가 아니므로 구분을 갖지 않는다."""
    with pytest.raises(ValidationError):
        ClaimDraft(
            claim_id="claim_x",
            claim_type=ClaimType.STATISTIC,
            requirement_kind=RequirementKind.EXPLICIT_REQUIREMENT,
            scope_level=ScopeLevel.OVERALL,
            scope_id=JOB,
            claim_text="68% 에 나타난다",
        )


def test_strategy_claim_is_rejected() -> None:
    """전략 주장은 다음 에이전트의 것이다."""
    with pytest.raises(ValidationError):
        ClaimDraft(
            claim_id="claim_x",
            claim_type=ClaimType.STRATEGY,
            scope_level=ScopeLevel.CLUSTER,
            scope_id=CLUSTER,
            claim_text="포트폴리오를 이렇게 쓴다",
        )
    assert ClaimType.STRATEGY not in INTERPRETATION_CLAIM_TYPES


def test_claim_models_are_frozen_and_closed() -> None:
    """CONTRACT 8장. 결과 모델은 frozen + extra=forbid 다."""
    draft = ClaimDraft(
        claim_id="claim_x",
        claim_type=ClaimType.STATISTIC,
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB,
        claim_text="수치",
    )
    with pytest.raises(ValidationError):
        draft.claim_text = "다른 수치"  # type: ignore[misc]
    with pytest.raises(ValidationError):
        BaselineItem(item_id="a", title="b", unknown=1)  # type: ignore[call-arg]


def test_evidence_rows_drop_duplicate_primary_keys() -> None:
    """`analysis_claim_evidence` 의 기본키 중복을 저장 전에 접는다."""
    ref = EvidenceRef(support_type=SupportType.CHUNK, support_id="chunk_1")
    draft = ClaimDraft(
        claim_id="claim_x",
        claim_type=ClaimType.STATISTIC,
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB,
        claim_text="수치",
        evidence=(ref, ref),
    )
    assert len(draft.evidence_rows()) == 1


# ------------------------------------------------- 15-2 기준선·편차와 범위 확인


def test_baseline_reads_prevalence_and_requiredness() -> None:
    """기준선의 두 수치는 직무 기준선 지표에서 온다."""
    items = baseline_items(facts(OVERALL_ROWS))
    first = items[0]
    assert first.item_id == "dim_backend_crud"
    assert first.freq_pct == 68
    assert first.required_ratio == 92
    # 등장 비율이 높은 순서다.
    assert [item.freq_pct for item in items] == sorted(
        [item.freq_pct for item in items], reverse=True
    )


def test_baseline_is_capped_at_nine_items() -> None:
    rows = [fact(f"dim_{n:02d}", 0.9 - n / 100) for n in range(20)]
    assert len(baseline_items(facts(rows))) == 9


def test_baseline_skips_facts_without_value() -> None:
    """`not_computable` 은 값이 없다. 0 으로 바꿔 세지 않는다."""
    rows = [
        fact("dim_a", 0.5),
        {**fact("dim_b", 0.0), "value": None, "sample_status": "not_computable"},
    ]
    assert [i.item_id for i in baseline_items(facts(rows))] == ["dim_a"]


def test_deviation_needs_the_threshold() -> None:
    baseline = StatisticFact(**fact("dim_backend_tx", 0.27))
    scoped = StatisticFact(
        **fact("dim_backend_tx", 0.80, scope_level="cluster", scope_id=CLUSTER)
    )
    verdict = judge_deviation("dim_backend_tx", "트랜잭션", baseline, scoped)
    assert verdict.is_deviation
    assert round(verdict.delta, 2) == 0.53
    assert verdict.baseline_text == "직무 전체 27%"

    small = StatisticFact(
        **fact("dim_backend_tx", 0.27 + DEVIATION_DELTA / 2, scope_level="cluster", scope_id=CLUSTER)
    )
    assert not judge_deviation("dim_backend_tx", "트랜잭션", baseline, small).is_deviation


def test_lower_scope_value_is_not_a_deviation() -> None:
    """덜 요구하는 것은 준비 항목을 늘리지 않는다."""
    baseline = StatisticFact(**fact("dim_a", 0.60))
    scoped = StatisticFact(**fact("dim_a", 0.20, scope_level="cluster", scope_id=CLUSTER))
    assert not judge_deviation("dim_a", "a", baseline, scoped).is_deviation


def test_missing_scope_fact_is_not_a_deviation() -> None:
    """측정하지 않은 것을 요구하지 않는다로 바꾸어 말하지 않는다."""
    baseline = StatisticFact(**fact("dim_a", 0.60))
    verdict = judge_deviation("dim_a", "a", baseline, None)
    assert not verdict.is_deviation
    assert verdict.scope_pct is None


def test_new_requirement_is_marked_as_absent_from_baseline() -> None:
    """직무 전체에 없던 요구는 기준선 칸에 "공통 항목에 없음" 을 적는다."""
    verdicts = deviations(facts(OVERALL_ROWS), facts(CLUSTER_ROWS))
    security = next(v for v in verdicts if v.dimension_id == "dim_backend_sec")
    assert security.is_new
    assert security.baseline_text == NO_BASELINE


def test_deviations_are_ordered_by_gap() -> None:
    verdicts = deviations(facts(OVERALL_ROWS), facts(CLUSTER_ROWS))
    # 보안은 기준선이 없어 차이가 55%p, 트랜잭션은 27%p 위의 80% 라 53%p 다.
    assert [v.dimension_id for v in verdicts] == [
        "dim_backend_sec",
        "dim_backend_tx",
    ]
    assert [round(v.delta, 2) for v in verdicts] == [0.55, 0.53]


def test_coverage_complete_is_computed_not_given() -> None:
    """docs/erd.md 11.6. 검사한 수와 모집단 수가 값을 정한다."""
    partial = coverage_assertion(
        "cov_1", ScopeLevel.CLUSTER, CLUSTER, population_n=9, checked_n=5, matched_n=2,
        assertion="편차 전수 검사",
    )
    assert not partial.coverage_complete
    full = coverage_assertion(
        "cov_2", ScopeLevel.CLUSTER, CLUSTER, population_n=9, checked_n=9, matched_n=2,
        assertion="편차 전수 검사",
    )
    assert full.coverage_complete
    assert full.row(ANALYSIS)["coverage_complete"] is True
    with pytest.raises(ValidationError):
        CoverageAssertion(
            assertion_id="cov_3",
            scope_level=ScopeLevel.CLUSTER,
            scope_id=CLUSTER,
            population_n=3,
            checked_n=5,
            matched_n=0,
            assertion="검사 수가 모집단을 넘는다",
        )


def test_no_deviation_claim_requires_complete_coverage() -> None:
    """편차 없음은 전수 검사를 마쳤을 때만 말한다."""
    partial = coverage_assertion(
        "cov_1", ScopeLevel.CLUSTER, CLUSTER, population_n=9, checked_n=5, matched_n=1,
        assertion="검사 중",
    )
    assert not may_assert_no_deviation(partial)
    assert not may_assert_no_deviation(None)

    items = baseline_items(facts(OVERALL_ROWS))
    partial_notes = unchanged_items(items, ("dim_backend_tx",), partial)
    assert {n.note for n in partial_notes} == {INSUFFICIENT}

    full = coverage_assertion(
        "cov_2", ScopeLevel.CLUSTER, CLUSTER, population_n=9, checked_n=9, matched_n=1,
        assertion="전수 검사",
    )
    complete_notes = unchanged_items(items, ("dim_backend_tx",), full)
    assert INSUFFICIENT not in {n.note for n in complete_notes}
    # 항목을 빼지 않는다. 화면이 두 경우를 같은 자리에서 구분한다.
    assert [n.item_id for n in partial_notes] == [n.item_id for n in complete_notes]


def test_baseline_module_is_pure() -> None:
    """기준선 판정은 저장소도 모델 제공자도 부르지 않는다."""
    import ast
    from pathlib import Path

    path = (
        Path(__file__).resolve().parents[2]
        / "src"
        / "careersignal"
        / "agents"
        / "interpretation"
        / "baseline.py"
    )
    forbidden = {"psycopg", "openai", "careersignal.repositories", "careersignal.providers"}
    tree = ast.parse(path.read_text(encoding="utf-8"))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module)
    assert not {n for n in names if n in forbidden or n.split(".")[0] in forbidden}


# ---------------------------------------------------------- 15-3 근거 함의 검증


def test_entailment_stub_always_supports() -> None:
    """대역은 항상 지지 판정이다. 실제 판정은 B6 이 검사 5 로 넣는다."""
    judge = StubEntailmentJudge()
    verdict = judge.judge("주장", "근거")
    assert verdict.entailed
    assert verdict.relation is Relation.SUPPORTS
    assert judge.judged == [("주장", "근거")]


def test_entailment_judge_drops_unsupported_evidence() -> None:
    """지지하지 못하는 근거는 주장에 붙이지 않는다."""
    judge = StubEntailmentJudge(
        EntailmentVerdict(entailed=False, relation=Relation.SUPPORTS, rationale="무관")
    )
    repo = repository()
    agent = InterpretationAgent(
        StubDeviationInterpreter(), repo, judge=judge, workers=1
    )
    agent.run(
        context(), ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
    )
    # 통계 사실 근거는 판정 대상이 아니다. 판정이 버린 것은 공고 청크뿐이다.
    assert not [r for r in repo.claim_evidence if r["support_type"] == "chunk"]
    assert judge.judged


def test_entailment_judge_is_optional() -> None:
    """판정자가 없으면 붙은 근거를 그대로 쓴다."""
    repo = repository()
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    agent.run(
        context(), ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
    )
    assert any(r["support_type"] == "chunk" for r in repo.claim_evidence)


def test_entailment_task_uses_registered_tier() -> None:
    assert TASK_TIER[ENTAILMENT_TASK] is Tier.STANDARD
    assert TASK_TIER[INTERPRETATION_TASK] is Tier.STANDARD


# ---------------------------------------------------------- 15-4 상충 근거 검사


def test_conflicting_supports_marks_mixed_relations() -> None:
    """같은 차원에 지지와 반박이 함께 있으면 표시한다."""
    refs = {
        "dim_a": (
            EvidenceRef(support_type=SupportType.CHUNK, support_id="c1"),
            EvidenceRef(
                support_type=SupportType.CHUNK,
                support_id="c2",
                relation=Relation.CONTRADICTS,
            ),
        ),
        "dim_b": (EvidenceRef(support_type=SupportType.CHUNK, support_id="c3"),),
    }
    assert conflicting_supports(refs) == ("dim_a",)


def test_conflict_is_marked_not_silently_resolved() -> None:
    """반박 근거를 버리지 않는다. 실행 결과에 남긴다."""
    repo = repository()
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    outcome = agent.run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(Relation.CONTRADICTS),
    )
    assert outcome.conflicts == ("dim_backend_tx",)
    assert any(r["relation"] == "contradicts" for r in repo.claim_evidence)


def test_contradicted_claim_is_not_high_confidence() -> None:
    """상충이 남은 주장을 높은 등급으로 보이지 않는다."""
    verdict = DeviationVerdict(
        dimension_id="dim_a",
        topic="a",
        baseline_pct=27,
        scope_pct=80,
        delta=0.53,
        is_deviation=True,
        is_new=False,
        sample_size=9,
    )
    assert confidence_grade(verdict, 3, 3) is ConfidenceGrade.HIGH
    assert confidence_grade(verdict, 3, 3, contradicted=True) is ConfidenceGrade.LOW
    assert confidence_grade(verdict, 1, 1) is ConfidenceGrade.MID
    assert confidence_grade(verdict, 0, 0) is ConfidenceGrade.LOW


def test_contradicted_claim_is_stored_as_contradicted() -> None:
    repo = repository()
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    agent.run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(Relation.CONTRADICTS),
    )
    statuses = {
        row["verification_status"]
        for row in repo.claims
        if row["structured_slots"].get("dimension_id") == "dim_backend_tx"
        and row["claim_type"] != "statistic"
    }
    assert statuses == {str(VerificationStatus.CONTRADICTED)}


# ------------------------------------------------------------ payload (5장 B)


def test_build_payload_keys_match_the_contract() -> None:
    payload = build_payload(
        job=JOB,
        scope=ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        baseline=(BaselineItem(item_id="a", title="A", freq_pct=68, required_ratio=92),),
        deviations=(
            DeviationItem(
                item_id="b",
                topic="트랜잭션",
                baseline="직무 전체 27%",
                deviation="정합성 보장까지",
                evidence='"결제·정산의 정확성"',
                explanation="설명",
                confidence=ConfidenceGrade.HIGH,
                ratio="같은 직군 27%",
            ),
        ),
        unchanged=(UnchangedItem(item_id="a", title="A", note="같다"),),
    )
    assert set(payload) == {
        "job",
        "scope",
        "baseline",
        "deviations",
        "unchanged",
        "posting",
        "agent_version",
        "source",
    }
    assert set(payload["scope"]) == {"level", "cluster_tag", "posting_id"}
    assert payload["scope"]["cluster_tag"] == CLUSTER
    assert payload["agent_version"] == AGENT_VERSION
    assert payload["source"] == "agent"
    assert payload["posting"] is None
    assert set(payload["baseline"][0]) == {
        "item_id",
        "title",
        "desc",
        "freq_pct",
        "required_ratio",
    }
    # 3구분은 저장 경로의 값이다. 화면 계약에는 그 키가 없다.
    assert set(payload["deviations"][0]) == {
        "item_id",
        "topic",
        "baseline",
        "deviation",
        "evidence",
        "explanation",
        "confidence",
        "ratio",
        "related_stat",
    }


def test_payload_is_json_serialisable_with_posting() -> None:
    posting = PostingView(
        posting_id="dp_backend_01",
        company="A 핀테크사",
        title="백엔드 신입",
        summary=Interpretation(
            title="종합 해석", body="본문", confidence=ConfidenceGrade.HIGH
        ),
        raw_sections=(
            RawSection(section="자격요건", lines=(RawLine(text="한 줄", mark_n=1),)),
        ),
        unchanged_note="공통 기대치와 같다",
    )
    payload = build_payload(
        job=JOB,
        scope=ScopeRef(level=ScopeLevel.POSTING, posting_id="dp_backend_01"),
        baseline=(),
        posting=posting,
    )
    text = json.dumps(payload, ensure_ascii=False)
    assert "dp_backend_01" in text
    assert payload["posting"]["raw_sections"][0]["lines"][0]["mark_n"] == 1
    assert payload["scope"]["level"] == "posting"


def test_scope_requires_its_identifier() -> None:
    with pytest.raises(ValidationError):
        ScopeRef(level=ScopeLevel.POSTING)
    with pytest.raises(ValidationError):
        ScopeRef(level=ScopeLevel.CLUSTER)


# ---------------------------------------------------------------- 실행 골격


def test_run_stores_output_claims_evidence_and_assertion() -> None:
    repo = repository()
    interpreter = StubDeviationInterpreter()
    agent = InterpretationAgent(
        interpreter, repo, judge=StubEntailmentJudge(), workers=1
    )
    outcome = agent.run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
        signals=(
            ContextSignal(
                support_id="wr_demo_backend_sec_1",
                dimension_id="dim_backend_sec",
                topic="보안",
                text="보안 정책을 기술 블로그에 반복해 적었다",
            ),
        ),
        population_n=9,
        checked_n=9,
    )

    assert len(repo.outputs) == 1
    output = repo.outputs[0]
    assert output["output_type"] == OUTPUT_TYPE
    assert output["produced_by_agent"] == AGENT_NAME
    assert output["output_id"] == output_identifier(ANALYSIS, "cluster", CLUSTER)
    assert outcome.output_id == output["output_id"]
    assert outcome.created_claims == len(repo.claims)
    assert outcome.created_evidence == len(repo.claim_evidence)
    assert repo.assertions and repo.assertions[0]["coverage_complete"] is True
    assert outcome.gained_evidence
    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert interpreter.calls  # 편차마다 한 번 부른다


def test_run_marks_context_signal_claims() -> None:
    """공고에 없고 회사 자료에만 있는 요구는 맥락 신호로 남는다."""
    repo = repository()
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    agent.run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
    )
    kinds = {
        row["structured_slots"]["dimension_id"]: row["requirement_kind"]
        for row in repo.claims
        if row["claim_type"] != "statistic"
    }
    # 근거 문장이 붙은 차원은 명시 요구, 붙지 않은 차원은 맥락 신호다(대역 규칙).
    assert kinds["dim_backend_tx"] == "explicit_requirement"
    assert kinds["dim_backend_sec"] == "company_context_signal"


def test_no_deviation_claim_appears_only_with_full_coverage() -> None:
    repo = repository()
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    agent.run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
        population_n=9,
        checked_n=5,
    )
    assert not [r for r in repo.claims if r["claim_type"] == "no_deviation"]

    repo_full = repository()
    InterpretationAgent(StubDeviationInterpreter(), repo_full, workers=1).run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
        population_n=9,
        checked_n=9,
    )
    assert [r for r in repo_full.claims if r["claim_type"] == "no_deviation"]


def test_unmet_slot_is_not_slots_filled() -> None:
    """필수 슬롯이 비면 주장을 저장했더라도 충족이 아니다."""
    repo = repository()
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    outcome = agent.run(
        context(), ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER)
    )
    assert outcome.unmet_slots == (CLUSTER_SLOT,)
    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE


def test_missing_facts_end_as_frontier_exhausted() -> None:
    agent = InterpretationAgent(StubDeviationInterpreter(), FakeRepository(), workers=1)
    outcome = agent.run(
        context(ScopeLevel.OVERALL, None), ScopeRef(level=ScopeLevel.OVERALL)
    )
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert outcome.created_claims == 0


def test_budget_limits_model_calls() -> None:
    repo = repository()
    interpreter = StubDeviationInterpreter()
    agent = InterpretationAgent(interpreter, repo, workers=1)
    outcome = agent.run(
        context(max_tool_calls=1),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
    )
    assert len(interpreter.calls) == 1
    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED


def test_output_failure_stops_before_claims() -> None:
    """가리킬 곳이 없는 주장을 만들지 않는다."""
    repo = repository(fail_on="output")
    agent = InterpretationAgent(StubDeviationInterpreter(), repo, workers=1)
    outcome = agent.run(
        context(),
        ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
        evidence=evidence(),
    )
    assert repo.claims == []
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.errors


def test_identifiers_are_deterministic() -> None:
    """다시 실행하면 같은 행을 덮는다."""
    assert output_identifier(ANALYSIS, "cluster", CLUSTER) == output_identifier(
        ANALYSIS, "cluster", CLUSTER
    )
    assert output_identifier(ANALYSIS, "cluster", CLUSTER) != output_identifier(
        ANALYSIS, "overall", JOB
    )
    repo_a, repo_b = repository(), repository()
    for repo in (repo_a, repo_b):
        InterpretationAgent(StubDeviationInterpreter(), repo, workers=1).run(
            context(),
            ScopeRef(level=ScopeLevel.CLUSTER, cluster_tag=CLUSTER),
            evidence=evidence(),
        )
    assert [r["claim_id"] for r in repo_a.claims] == [
        r["claim_id"] for r in repo_b.claims
    ]


def test_agent_does_not_import_psycopg() -> None:
    """CONTRACT 8장. 실행 골격은 저장소 구현을 모른다."""
    import ast
    from pathlib import Path

    path = (
        Path(__file__).resolve().parents[2]
        / "src"
        / "careersignal"
        / "agents"
        / "interpretation"
        / "agent.py"
    )
    tree = ast.parse(path.read_text(encoding="utf-8"))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module)
    assert "psycopg" not in {n.split(".")[0] for n in names}
    assert not {n for n in names if n.startswith("careersignal.repositories")}


# ------------------------------------------------------------------ 어댑터


def test_openai_adapter_requests_structured_output() -> None:
    client = FakeOpenAI()
    adapter = OpenAIDeviationInterpreter(client)
    narrative = adapter.interpret(
        "트랜잭션", "직무 전체 27%", "이 범위 80%", ("결제·정산의 정확성",)
    )
    request = client.requests[0]
    assert request["model"] == chat_model(INTERPRETATION_TASK)
    assert request["messages"][0]["content"] == DEVIATION_INTERPRETATION_PROMPT
    assert request["response_format"]["json_schema"]["strict"] is True
    assert request["response_format"]["json_schema"]["schema"] == DEVIATION_RESPONSE_SCHEMA
    assert narrative.requirement_kind is RequirementKind.EXPLICIT_REQUIREMENT
    assert narrative.deviation_label == "동시성·롤백까지"


def test_openai_adapter_downgrades_explicit_without_evidence() -> None:
    """근거 문장이 없는데 명시 요구라고 답하면 해석한 요구로 내린다."""
    adapter = OpenAIDeviationInterpreter(FakeOpenAI())
    narrative = adapter.interpret("보안", NO_BASELINE, "신규 요구", ())
    assert narrative.requirement_kind is RequirementKind.INFERRED_REQUIREMENT


def test_openai_adapter_rejects_unknown_kind() -> None:
    adapter = OpenAIDeviationInterpreter(
        FakeOpenAI(
            {
                "explanation": "설명",
                "requirement_kind": "made_up",
                "deviation_label": "",
            }
        )
    )
    narrative = adapter.interpret("주제", "기준", "편차", ("근거",))
    assert narrative.requirement_kind is RequirementKind.INFERRED_REQUIREMENT


def test_openai_adapter_rejects_empty_explanation() -> None:
    adapter = OpenAIDeviationInterpreter(
        FakeOpenAI(
            {"explanation": "  ", "requirement_kind": "explicit_requirement",
             "deviation_label": ""}
        )
    )
    with pytest.raises(ValueError):
        adapter.interpret("주제", "기준", "편차", ("근거",))


def test_narrative_has_no_self_reported_confidence() -> None:
    """모델의 자기 보고를 신뢰도로 쓰지 않는다(docs/agent-design.md 8장)."""
    assert "confidence" not in DEVIATION_RESPONSE_SCHEMA["properties"]


def test_deviation_message_quotes_evidence_lines() -> None:
    message = deviation_message("트랜잭션", "직무 전체 27%", "이 범위 80%", ("문장 하나",))
    assert "1. 문장 하나" in message
    assert NO_EVIDENCE in deviation_message("보안", NO_BASELINE, "신규", ())


def test_stub_interpreter_is_deterministic() -> None:
    stub = StubDeviationInterpreter()
    first = stub.interpret("트랜잭션", "직무 전체 27%", "이 범위 80%", ("근거",))
    second = stub.interpret("트랜잭션", "직무 전체 27%", "이 범위 80%", ("근거",))
    assert first == second
    assert first.requirement_kind is RequirementKind.EXPLICIT_REQUIREMENT
