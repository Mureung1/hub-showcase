"""검사 등록·실행 프레임워크 검증.

docs/agent-design.md 9장의 검사 목록과 실행 규칙이 코드와 일치하는지 확인한다.
"""

from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from careersignal.contracts import (
    CheckName,
    CheckVerdict,
    RepairAction,
    RunContext,
    Severity,
)
from careersignal.contracts.check_result import CHECK_AUTONOMY, AutonomyLevel
from careersignal.domain.scope import ScopeLevel
from careersignal.verification import (
    CHECK_SPECS,
    REASON_CHECK_ERROR,
    REASON_NOT_APPLICABLE,
    REASON_NOT_REGISTERED,
    CheckContext,
    CheckOutcome,
    CheckRegistry,
    CheckRunner,
    not_applicable,
    passed,
)

EXECUTED_COUNT = 7
"""검사 여덟 종 가운데 러너가 실행하는 수. 8은 집계 단계다."""


def _context(**kw: object) -> CheckContext:
    run = RunContext(
        agent_run_id="run_001",
        analysis_version="an_001",
        dataset_version="ds_001",
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 27),
    )
    base = {
        "run": run,
        "target_type": "analysis_claim",
        "target_id": "claim_42",
    }
    return CheckContext(**(base | kw))


# ============================================================ 명세
def test_specs_match_the_design_document() -> None:
    """검사 여덟 종이 문서의 순서 그대로 선언된다."""
    assert len(CHECK_SPECS) == 8
    assert [s.order for s in CHECK_SPECS] == list(range(1, 9))
    assert [s.check for s in CHECK_SPECS] == [
        CheckName.SCHEMA,
        CheckName.SOURCE_POLICY,
        CheckName.CITATION_SPAN,
        CheckName.NUMERICAL,
        CheckName.ENTAILMENT,
        CheckName.CROSS_MODEL,
        CheckName.CONTRADICTION,
        CheckName.TYPED_VERDICT,
    ]


def test_only_typed_verdict_is_an_aggregate_step() -> None:
    aggregates = [s.check for s in CHECK_SPECS if s.aggregate]
    assert aggregates == [CheckName.TYPED_VERDICT]
    assert len(CheckRegistry().executable()) == EXECUTED_COUNT


def test_autonomy_comes_from_the_contract_table() -> None:
    """자율성 등급을 두 곳에 적지 않는다."""
    for spec in CHECK_SPECS:
        assert spec.autonomy is CHECK_AUTONOMY[spec.check]
    model_backed = {s.check for s in CHECK_SPECS if s.autonomy is AutonomyLevel.A1}
    assert model_backed == {CheckName.ENTAILMENT, CheckName.CROSS_MODEL}


def test_database_accepts_every_declared_autonomy_level() -> None:
    """verification_results.autonomy_level 은 A0·A1 만 허용한다."""
    assert {s.autonomy for s in CHECK_SPECS} <= {AutonomyLevel.A0, AutonomyLevel.A1}


# ============================================================ 등록
def test_registry_rejects_duplicate_implementation() -> None:
    registry = CheckRegistry()
    registry.register(CheckName.SCHEMA, lambda ctx: passed())
    with pytest.raises(ValueError):
        registry.register(CheckName.SCHEMA, lambda ctx: passed())


def test_registry_rejects_aggregate_step() -> None:
    """집계는 앞선 결과를 입력으로 받으므로 검사와 같은 자리에 두지 않는다."""
    registry = CheckRegistry()
    with pytest.raises(ValueError):
        registry.register(CheckName.TYPED_VERDICT, lambda ctx: passed())


def test_registry_rejects_non_callable() -> None:
    registry = CheckRegistry()
    with pytest.raises(TypeError):
        registry.register(CheckName.SCHEMA, "not a function")


def test_unregistered_lists_missing_implementations() -> None:
    registry = CheckRegistry()
    assert len(registry.unregistered()) == EXECUTED_COUNT
    registry.register(CheckName.SCHEMA, lambda ctx: passed())
    assert CheckName.SCHEMA not in registry.unregistered()
    assert len(registry.unregistered()) == EXECUTED_COUNT - 1


# ============================================================ 판정 형식
def test_non_pass_outcome_requires_a_reason() -> None:
    """이유 없는 실패는 수리할 수 없다."""
    with pytest.raises(ValidationError):
        CheckOutcome(verdict=CheckVerdict.FAIL)
    with pytest.raises(ValidationError):
        CheckOutcome(verdict=CheckVerdict.SKIP)


def test_pass_outcome_cannot_carry_a_repair_action() -> None:
    with pytest.raises(ValidationError):
        CheckOutcome(verdict=CheckVerdict.PASS, repair_action=RepairAction.DROP_CLAIM)


# ============================================================ 실행
def test_unregistered_check_is_recorded_as_skip() -> None:
    """구현이 없는 검사를 조용히 넘기지 않는다."""
    report = CheckRunner().run(_context())

    assert len(report.results) == EXECUTED_COUNT
    assert all(r.verdict is CheckVerdict.SKIP for r in report.results)
    assert all(r.reason_code == REASON_NOT_REGISTERED for r in report.results)
    assert len(report.unregistered) == EXECUTED_COUNT
    assert report.complete is False


def test_complete_is_true_only_when_every_check_ran() -> None:
    registry = CheckRegistry()
    for spec in registry.executable():
        registry.register(spec.check, lambda ctx: passed())
    report = CheckRunner(registry).run(_context())

    assert report.complete is True
    assert len(report.executed) == EXECUTED_COUNT
    assert report.blocking == ()


def test_not_applicable_is_distinguished_from_unregistered() -> None:
    """적용 대상이 아닌 검사와 빠뜨린 검사를 이유 코드로 구분한다."""
    registry = CheckRegistry()
    registry.register(CheckName.CROSS_MODEL, lambda ctx: not_applicable())
    report = CheckRunner(registry).run(_context())

    cross = next(r for r in report.results if r.check is CheckName.CROSS_MODEL)
    assert cross.verdict is CheckVerdict.SKIP
    assert cross.reason_code == REASON_NOT_APPLICABLE
    assert CheckName.CROSS_MODEL not in report.unregistered


def test_failing_check_blocks_publication() -> None:
    registry = CheckRegistry()
    registry.register(
        CheckName.SOURCE_POLICY,
        lambda ctx: CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code="EXTERNAL_TIER_USED_FOR_COMPANY_REQUIREMENT",
            repair_action=RepairAction.DROP_CLAIM,
        ),
    )
    report = CheckRunner(registry).run(_context())

    assert len(report.blocking) == 1
    assert report.blocking[0].check is CheckName.SOURCE_POLICY


def test_warning_severity_does_not_block() -> None:
    registry = CheckRegistry()
    registry.register(
        CheckName.CONTRADICTION,
        lambda ctx: CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.WARNING,
            reason_code="WEAK_COUNTEREVIDENCE",
        ),
    )
    report = CheckRunner(registry).run(_context())

    assert len(report.failed) == 1
    assert report.blocking == ()


# ============================================================ 검사기 결함
def _explode(context: CheckContext) -> CheckOutcome:
    raise RuntimeError("검사기 내부 오류")


def test_exception_becomes_a_blocking_failure() -> None:
    """판정을 알 수 없는 검사를 통과로 두지 않는다."""
    registry = CheckRegistry()
    registry.register(CheckName.NUMERICAL, _explode)
    report = CheckRunner(registry).run(_context())

    numerical = next(r for r in report.results if r.check is CheckName.NUMERICAL)
    assert numerical.verdict is CheckVerdict.FAIL
    assert numerical.severity is Severity.BLOCKING
    assert numerical.reason_code == REASON_CHECK_ERROR
    assert numerical.repair_action is None
    assert numerical.detail["error"] == "RuntimeError"


def test_one_broken_check_does_not_stop_the_others() -> None:
    registry = CheckRegistry()
    registry.register(CheckName.SCHEMA, _explode)
    registry.register(CheckName.CITATION_SPAN, lambda ctx: passed())
    report = CheckRunner(registry).run(_context())

    assert len(report.results) == EXECUTED_COUNT
    citation = next(r for r in report.results if r.check is CheckName.CITATION_SPAN)
    assert citation.verdict is CheckVerdict.PASS


def test_wrong_return_type_becomes_a_blocking_failure() -> None:
    registry = CheckRegistry()
    registry.register(CheckName.SCHEMA, lambda ctx: "통과했습니다")
    report = CheckRunner(registry).run(_context())

    schema = next(r for r in report.results if r.check is CheckName.SCHEMA)
    assert schema.verdict is CheckVerdict.FAIL
    assert schema.reason_code == REASON_CHECK_ERROR


# ============================================================ 식별자
def test_runner_assembles_the_target_from_the_context() -> None:
    """검사는 대상 식별자를 바꿀 수 없다."""
    registry = CheckRegistry()
    registry.register(CheckName.SCHEMA, lambda ctx: passed())
    report = CheckRunner(registry).run(
        _context(target_type="checklist_item", target_id="item_7")
    )

    assert report.target_id == "item_7"
    assert report.analysis_version == "an_001"
    assert all(r.target_type == "checklist_item" for r in report.results)
    assert all(r.target_id == "item_7" for r in report.results)


def test_check_receives_the_payload() -> None:
    seen: list[dict] = []

    def capture(context: CheckContext) -> CheckOutcome:
        seen.append(context.payload)
        return passed()

    registry = CheckRegistry()
    registry.register(CheckName.SCHEMA, capture)
    CheckRunner(registry).run(_context(payload={"claim_text": "트랜잭션 무결성"}))

    assert seen == [{"claim_text": "트랜잭션 무결성"}]
