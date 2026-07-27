"""판정 집계와 상태 전이 검증.

정의는 docs/agent-design.md 9.4와 docs/architecture.md 8장에서 온다.
"""

from __future__ import annotations

from datetime import date

import pytest

from careersignal.contracts import (
    CheckName,
    CheckResult,
    CheckVerdict,
    RepairAction,
    RunContext,
    Severity,
    TypedVerdict,
)
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.verification import (
    REASON_NOT_REGISTERED,
    CheckContext,
    CheckRegistry,
    CheckRunner,
    CheckRunReport,
)
from careersignal.verification.verdict import (
    VERDICT_BY_CHECK,
    decide,
    publishable,
    summarize,
    validation_outcome,
)

EXECUTED_COUNT = 7


def _result(
    check: CheckName,
    verdict: CheckVerdict = CheckVerdict.PASS,
    severity: Severity = Severity.INFO,
    reason_code: str | None = None,
    repair_action: RepairAction | None = None,
) -> CheckResult:
    return CheckResult(
        check=check,
        target_type="analysis_claim",
        target_id="claim_42",
        verdict=verdict,
        severity=severity,
        reason_code=reason_code,
        repair_action=repair_action,
    )


def _report(*overrides: CheckResult, target_id: str = "claim_42") -> CheckRunReport:
    """지정한 검사만 바꾸고 나머지는 통과로 채운다."""
    replaced = {r.check: r for r in overrides}
    results = tuple(
        replaced.get(spec.check, _result(spec.check))
        for spec in CheckRegistry().executable()
    )
    return CheckRunReport(
        target_type="analysis_claim",
        target_id=target_id,
        analysis_version="an_001",
        results=tuple(r.model_copy(update={"target_id": target_id}) for r in results),
    )


def _fail(check: CheckName, **kw: object) -> CheckResult:
    return _result(
        check,
        verdict=CheckVerdict.FAIL,
        severity=Severity.BLOCKING,
        reason_code="TEST_FAIL",
        **kw,
    )


# ============================================================ 판정 불가
def test_incomplete_verification_has_no_verdict() -> None:
    """선언된 검사를 다 돌리지 않았으면 산출물의 상태를 알 수 없다."""
    report = CheckRunReport(
        target_type="analysis_claim",
        target_id="claim_42",
        analysis_version="an_001",
        results=(
            _result(
                CheckName.SCHEMA,
                verdict=CheckVerdict.SKIP,
                severity=Severity.BLOCKING,
                reason_code=REASON_NOT_REGISTERED,
            ),
        ),
    )
    assert decide(report) is None
    assert summarize(report) is None
    assert publishable(report) is False


def test_default_registry_cannot_reach_a_verdict() -> None:
    """4-2까지 다섯 검사가 비어 있다. 아무것도 공개되지 않는다."""
    context = CheckContext(
        run=RunContext(
            agent_run_id="run_001",
            analysis_version="an_001",
            dataset_version="ds_001",
            job_role_id="backend",
            scope_level=ScopeLevel.OVERALL,
            as_of_date=date(2026, 7, 27),
        ),
        target_type="analysis_claim",
        target_id="claim_42",
    )
    assert decide(CheckRunner().run(context)) is None


# ============================================================ 통과
def test_all_pass_is_verified() -> None:
    assert decide(_report()) is TypedVerdict.VERIFIED
    assert publishable(_report()) is True


def test_warning_becomes_verified_with_warning() -> None:
    report = _report(
        _result(
            CheckName.CONTRADICTION,
            verdict=CheckVerdict.FAIL,
            severity=Severity.WARNING,
            reason_code="WEAK_COUNTEREVIDENCE",
        )
    )
    assert decide(report) is TypedVerdict.VERIFIED_WITH_WARNING
    assert publishable(report) is True


def test_not_applicable_skip_does_not_block() -> None:
    """적용 대상이 아닌 검사는 판정을 막지 않는다."""
    report = _report(
        _result(
            CheckName.CROSS_MODEL,
            verdict=CheckVerdict.SKIP,
            reason_code="CHECK_NOT_APPLICABLE",
        )
    )
    assert decide(report) is TypedVerdict.VERIFIED


# ============================================================ 검사와 판정의 대응
@pytest.mark.parametrize(
    ("check", "expected"),
    [
        (CheckName.SCHEMA, TypedVerdict.SCHEMA_INVALID),
        (CheckName.SOURCE_POLICY, TypedVerdict.POLICY_VIOLATION),
        (CheckName.CONTRADICTION, TypedVerdict.CONTRADICTED),
        (CheckName.NUMERICAL, TypedVerdict.CONTRADICTED),
        (CheckName.CROSS_MODEL, TypedVerdict.CONTRADICTED),
        (CheckName.CITATION_SPAN, TypedVerdict.INSUFFICIENT_EVIDENCE),
        (CheckName.ENTAILMENT, TypedVerdict.INSUFFICIENT_EVIDENCE),
    ],
)
def test_each_check_maps_to_a_verdict(
    check: CheckName, expected: TypedVerdict
) -> None:
    assert decide(_report(_fail(check))) is expected


def test_every_executed_check_has_a_mapping() -> None:
    """대응이 빠진 검사가 있으면 실패가 verified 로 새어 나간다."""
    executed = {s.check for s in CheckRegistry().executable()}
    assert executed <= set(VERDICT_BY_CHECK)


# ============================================================ 우선순위
def test_schema_failure_outranks_everything() -> None:
    """구조가 깨졌으면 근거의 함의를 따질 수 없다."""
    report = _report(
        _fail(CheckName.SCHEMA),
        _fail(CheckName.SOURCE_POLICY),
        _fail(CheckName.CONTRADICTION),
    )
    assert decide(report) is TypedVerdict.SCHEMA_INVALID


def test_policy_violation_outranks_contradiction() -> None:
    report = _report(_fail(CheckName.SOURCE_POLICY), _fail(CheckName.CONTRADICTION))
    assert decide(report) is TypedVerdict.POLICY_VIOLATION


def test_needs_research_outranks_insufficient_evidence() -> None:
    """두 판정은 후속 동작이 다르다. 순서가 바뀌면 조사 요청이 묻힌다."""
    report = _report(
        _fail(CheckName.ENTAILMENT, repair_action=RepairAction.REQUEST_RESEARCH),
        _fail(CheckName.CITATION_SPAN),
    )
    assert decide(report) is TypedVerdict.NEEDS_RESEARCH


def test_unmet_slots_produce_insufficient_evidence() -> None:
    """필수 슬롯 정보는 목표 계약에서 오며 에이전트가 선언한 뒤 채워진다."""
    assert decide(_report()) is TypedVerdict.VERIFIED
    assert (
        decide(_report(), unmet_slots=("cluster_support",))
        is TypedVerdict.INSUFFICIENT_EVIDENCE
    )


# ============================================================ 묶음
def test_summarize_carries_every_check() -> None:
    result = summarize(_report())

    assert result is not None
    assert result.verdict is TypedVerdict.VERIFIED
    assert len(result.checks) == EXECUTED_COUNT
    assert result.publishable is True


# ============================================================ 상태 전이
def test_all_publishable_moves_to_gated() -> None:
    reports = [_report(target_id="claim_1"), _report(target_id="claim_2")]
    assert validation_outcome(reports) is AnalysisVersionStatus.GATED


def test_one_failure_fails_the_whole_version() -> None:
    """한 화면만 새 버전인 상태를 허용하지 않는다."""
    reports = [
        _report(target_id="claim_1"),
        _report(_fail(CheckName.SOURCE_POLICY), target_id="claim_2"),
    ]
    assert validation_outcome(reports) is AnalysisVersionStatus.FAILED


def test_no_reports_fails() -> None:
    """검증하지 않은 버전을 수용 평가로 넘기지 않는다."""
    assert validation_outcome([]) is AnalysisVersionStatus.FAILED


def test_unmet_slots_are_applied_per_target() -> None:
    reports = [_report(target_id="claim_1"), _report(target_id="claim_2")]
    outcome = validation_outcome(reports, {"claim_2": ("overall_baseline",)})
    assert outcome is AnalysisVersionStatus.FAILED
