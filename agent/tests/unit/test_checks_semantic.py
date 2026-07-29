"""검사 5·6·7 검증.

실패 조건은 docs/agent-design.md 9장과 agent/data/demo_seed/CONTRACT.md 11장에서 온다.
저장소 조회와 판정자는 대역으로 대체한다. 검사의 판정 규칙만 검사한다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.contracts import CheckVerdict, RepairAction, RunContext, Severity
from careersignal.domain.confidence import ContradictionStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.providers.models import NVIDIA_AUDIT_MODEL
from careersignal.verification import REASON_NOT_APPLICABLE, CheckContext
from careersignal.verification.checks.contradiction import (
    REASON_ABSENCE_REFUTED,
    REASON_UNRESOLVED,
    AbsenceJudgment,
    contradiction_detector_check,
)
from careersignal.verification.checks.contradiction import (
    REASON_TARGET_NOT_FOUND as CONTRADICTION_TARGET_NOT_FOUND,
)
from careersignal.verification.checks.cross_model import (
    REASON_DISAGREEMENT,
    REASON_NOT_SAMPLED,
    SAMPLE_SIZE,
    AuditJudgment,
    cross_model_sample_audit_check,
    select_sample,
)
from careersignal.verification.checks.cross_model import (
    REASON_NO_EVIDENCE as CROSS_MODEL_NO_EVIDENCE,
)
from careersignal.verification.checks.entailment import (
    REASON_NO_EVIDENCE,
    REASON_NOT_ENTAILED,
    REASON_OVERGENERALIZED,
    REASON_TARGET_NOT_FOUND,
    EntailmentJudgment,
    EntailmentLabel,
    claim_evidence_entailment_check,
)

CLAIM_ID = "claim_42"
STATEMENT = "이 직무는 대규모 트랜잭션 무결성 경험을 요구한다."
EVIDENCE = ["대규모 트랜잭션 무결성 운영 경험을 중요하게 봅니다."]


def _context(
    target_type: str = "analysis_claim", target_id: str = CLAIM_ID
) -> CheckContext:
    return CheckContext(
        run=RunContext(
            agent_run_id="run_001",
            analysis_version="an_001",
            dataset_version="ds_001",
            job_role_id="backend",
            scope_level=ScopeLevel.OVERALL,
            as_of_date=date(2026, 7, 27),
        ),
        target_type=target_type,
        target_id=target_id,
    )


class ExplodingReader:
    """부르면 터지는 조회. 판정자가 없을 때 저장소를 건드리지 않음을 확인한다."""

    def __getattr__(self, name: str) -> Any:
        def boom(*args: Any, **kwargs: Any) -> Any:
            raise AssertionError(f"판정자가 없는데 {name} 을 불렀다")

        return boom


# ============================================================ 검사 5
class FakeEntailmentReader:
    def __init__(
        self, statement: str | None = STATEMENT, evidence: list[str] | None = None
    ) -> None:
        self._statement = statement
        self._evidence = EVIDENCE if evidence is None else evidence

    def claim_statement(self, claim_id: str) -> str | None:
        return self._statement

    def claim_evidence_texts(self, claim_id: str) -> list[str]:
        return list(self._evidence)


class StubEntailmentJudge:
    """결정적 대역. 외부를 호출하지 않는다."""

    model = "stub-entailment-judge"

    def __init__(self, label: EntailmentLabel) -> None:
        self._label = label
        self.calls: list[tuple[str, tuple[str, ...]]] = []

    def judge(self, statement: str, evidence: tuple[str, ...]) -> EntailmentJudgment:
        self.calls.append((statement, evidence))
        return EntailmentJudgment(label=self._label, rationale="대역 판정")


def test_entailment_without_judge_is_not_applicable() -> None:
    """판정자를 주입하지 않으면 미등록이 아니라 적용 대상 아님이다.

    데모가 모델 호출 0회로 검사를 활성화하는 근거다.
    """
    check = claim_evidence_entailment_check(ExplodingReader())
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE
    assert outcome.severity is Severity.INFO


def test_entailment_skips_other_target_types() -> None:
    check = claim_evidence_entailment_check(
        FakeEntailmentReader(), StubEntailmentJudge(EntailmentLabel.ENTAILED)
    )
    outcome = check(_context(target_type="requirement_mention", target_id="mention_1"))

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE


def test_entailment_fails_when_claim_is_missing() -> None:
    check = claim_evidence_entailment_check(
        FakeEntailmentReader(statement=None),
        StubEntailmentJudge(EntailmentLabel.ENTAILED),
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_TARGET_NOT_FOUND
    assert outcome.severity is Severity.BLOCKING


def test_entailment_without_evidence_is_skipped() -> None:
    """근거가 없으면 함의를 따질 것이 없다. 근거 부족은 다른 검사가 다룬다."""
    judge = StubEntailmentJudge(EntailmentLabel.ENTAILED)
    check = claim_evidence_entailment_check(FakeEntailmentReader(evidence=[]), judge)
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NO_EVIDENCE
    assert judge.calls == []


def test_entailment_passes_and_records_the_judge_model() -> None:
    judge = StubEntailmentJudge(EntailmentLabel.ENTAILED)
    check = claim_evidence_entailment_check(FakeEntailmentReader(), judge)
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.PASS
    assert outcome.judge_model == "stub-entailment-judge"
    assert len(judge.calls) == 1


def test_overgeneralization_is_a_warning_that_narrows_scope() -> None:
    """근거는 살아 있고 주장이 넓다. 공개를 막지 않고 범위를 좁힌다."""
    check = claim_evidence_entailment_check(
        FakeEntailmentReader(), StubEntailmentJudge(EntailmentLabel.OVERGENERALIZED)
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.severity is Severity.WARNING
    assert outcome.reason_code == REASON_OVERGENERALIZED
    assert outcome.repair_action is RepairAction.NARROW_SCOPE


def test_unsupported_claim_blocks_and_swaps_evidence() -> None:
    check = claim_evidence_entailment_check(
        FakeEntailmentReader(), StubEntailmentJudge(EntailmentLabel.NOT_ENTAILED)
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.severity is Severity.BLOCKING
    assert outcome.reason_code == REASON_NOT_ENTAILED
    assert outcome.repair_action is RepairAction.SWAP_EVIDENCE


# ============================================================ 검사 6
class FakeCrossModelReader:
    def __init__(
        self,
        candidates: list[str] | None = None,
        statement: str | None = STATEMENT,
        evidence: list[str] | None = None,
    ) -> None:
        self._candidates = [CLAIM_ID] if candidates is None else candidates
        self._statement = statement
        self._evidence = EVIDENCE if evidence is None else evidence

    def risk_sample_candidates(self, analysis_version: str) -> list[str]:
        return list(self._candidates)

    def claim_statement(self, claim_id: str) -> str | None:
        return self._statement

    def claim_evidence_texts(self, claim_id: str) -> list[str]:
        return list(self._evidence)


class StubAuditJudge:
    """결정적 대역. 모델 식별자를 선언하지 않아 기본값이 쓰이는지도 함께 본다."""

    def __init__(self, agrees: bool, model: str = "") -> None:
        self._agrees = agrees
        self._model = model
        self.calls: list[tuple[str, tuple[str, ...]]] = []

    def audit(self, statement: str, evidence: tuple[str, ...]) -> AuditJudgment:
        self.calls.append((statement, evidence))
        return AuditJudgment(agrees=self._agrees, model=self._model)


def test_cross_model_without_judge_is_not_applicable() -> None:
    check = cross_model_sample_audit_check(ExplodingReader())
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE
    assert outcome.severity is Severity.INFO


def test_sample_selection_is_deterministic() -> None:
    """정렬 후 앞에서 n개. 조회 순서와 중복이 표본을 바꾸지 않는다."""
    unsorted = ["claim_c", "claim_a", "claim_b", "claim_a"]

    assert select_sample(unsorted, 2) == ("claim_a", "claim_b")
    assert select_sample(unsorted, 2) == select_sample(sorted(unsorted), 2)
    assert select_sample(unsorted) == ("claim_a", "claim_b", "claim_c")


def test_sample_size_default_is_declared() -> None:
    assert SAMPLE_SIZE > 0
    assert len(select_sample([f"claim_{i:03d}" for i in range(50)])) == SAMPLE_SIZE


def test_sample_selection_rejects_a_negative_size() -> None:
    with pytest.raises(ValueError):
        select_sample(["claim_a"], -1)


def test_claims_outside_the_risk_sample_are_skipped() -> None:
    """위험 조건에 걸리지 않은 산출물은 `skip` 으로 기록한다."""
    judge = StubAuditJudge(agrees=True)
    check = cross_model_sample_audit_check(
        FakeCrossModelReader(candidates=["claim_other"]), judge
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_SAMPLED
    assert judge.calls == []


def test_cross_model_uses_the_other_family_model_by_default() -> None:
    judge = StubAuditJudge(agrees=True)
    check = cross_model_sample_audit_check(FakeCrossModelReader(), judge)
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.PASS
    assert outcome.judge_model == NVIDIA_AUDIT_MODEL


def test_cross_model_disagreement_blocks() -> None:
    check = cross_model_sample_audit_check(
        FakeCrossModelReader(), StubAuditJudge(agrees=False)
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.severity is Severity.BLOCKING
    assert outcome.reason_code == REASON_DISAGREEMENT
    assert outcome.repair_action is RepairAction.ADD_COUNTEREVIDENCE


def test_cross_model_without_evidence_is_skipped() -> None:
    judge = StubAuditJudge(agrees=True)
    check = cross_model_sample_audit_check(
        FakeCrossModelReader(evidence=[]), judge
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == CROSS_MODEL_NO_EVIDENCE
    assert judge.calls == []


# ============================================================ 검사 7
class FakeContradictionReader:
    def __init__(
        self,
        status: ContradictionStatus | None = ContradictionStatus.NONE,
        claim_type: str | None = "posting_explicit",
        counterevidence: list[str] | None = None,
        statement: str | None = STATEMENT,
    ) -> None:
        self._status = status
        self._claim_type = claim_type
        self._counter = counterevidence or []
        self._statement = statement

    def claim_type(self, claim_id: str) -> str | None:
        return self._claim_type

    def claim_statement(self, claim_id: str) -> str | None:
        return self._statement

    def contradiction_status(self, claim_id: str) -> ContradictionStatus | None:
        return self._status

    def counterevidence_texts(self, claim_id: str) -> list[str]:
        return list(self._counter)


class StubAbsenceJudge:
    model = "stub-absence-judge"

    def __init__(self, confirmed: bool) -> None:
        self._confirmed = confirmed
        self.calls: list[tuple[str, tuple[str, ...]]] = []

    def confirm_absence(
        self, statement: str, counterevidence: tuple[str, ...]
    ) -> AbsenceJudgment:
        self.calls.append((statement, counterevidence))
        return AbsenceJudgment(confirmed=self._confirmed)


def test_contradiction_without_judge_is_not_applicable() -> None:
    """규칙 부분만 따로 돌리지 않는다. 검사 하나가 통째로 대상 밖이다."""
    check = contradiction_detector_check(ExplodingReader())
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE
    assert outcome.severity is Severity.INFO


def test_unresolved_contradiction_blocks() -> None:
    check = contradiction_detector_check(
        FakeContradictionReader(
            status=ContradictionStatus.UNRESOLVED, counterevidence=["반례"]
        ),
        StubAbsenceJudge(confirmed=True),
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.severity is Severity.BLOCKING
    assert outcome.reason_code == REASON_UNRESOLVED
    assert outcome.repair_action is RepairAction.ADD_COUNTEREVIDENCE


def test_resolved_contradiction_passes_without_calling_the_judge() -> None:
    """부재 주장이 아니면 판정자를 부르지 않는다."""
    judge = StubAbsenceJudge(confirmed=True)
    check = contradiction_detector_check(
        FakeContradictionReader(status=ContradictionStatus.RESOLVED), judge
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.PASS
    assert judge.calls == []


def test_missing_claim_blocks() -> None:
    check = contradiction_detector_check(
        FakeContradictionReader(status=None), StubAbsenceJudge(confirmed=True)
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == CONTRADICTION_TARGET_NOT_FOUND


@pytest.mark.parametrize("claim_type", ["absence", "no_deviation"])
def test_absence_claims_are_confirmed_by_the_judge(claim_type: str) -> None:
    """부재 주장은 반례를 못 찾았다는 사실만으로 참이 되지 않는다."""
    judge = StubAbsenceJudge(confirmed=True)
    check = contradiction_detector_check(
        FakeContradictionReader(claim_type=claim_type), judge
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.PASS
    assert outcome.judge_model == "stub-absence-judge"
    assert len(judge.calls) == 1


def test_refuted_absence_claim_is_dropped() -> None:
    check = contradiction_detector_check(
        FakeContradictionReader(claim_type="no_deviation", counterevidence=["반례"]),
        StubAbsenceJudge(confirmed=False),
    )
    outcome = check(_context())

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.severity is Severity.BLOCKING
    assert outcome.reason_code == REASON_ABSENCE_REFUTED
    assert outcome.repair_action is RepairAction.DROP_CLAIM
