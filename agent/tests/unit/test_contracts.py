"""공통 실행 계약 검증."""

from __future__ import annotations

from datetime import date

import pytest
from pydantic import ValidationError

from careersignal.contracts import (
    Budget,
    CheckName,
    CheckResult,
    CheckVerdict,
    EvidenceCandidate,
    EvidenceSet,
    EvidenceSlot,
    EvidenceUsage,
    MissingEvidence,
    ObjectiveContract,
    RepairAction,
    RepairOrder,
    ResearchRequest,
    ResearchStatus,
    RetrievalStrategy,
    RunContext,
    Severity,
    TypedVerdict,
    UsageType,
    VerificationResult,
    is_publishable,
)
from careersignal.contracts.check_result import AutonomyLevel
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import SourceTier


def _context(**kw: object) -> RunContext:
    base = {
        "agent_run_id": "run_001",
        "analysis_version": "an_001",
        "dataset_version": "ds_001",
        "job_role_id": "backend",
        "scope_level": ScopeLevel.CLUSTER,
        "scope_id": "fintech",
        "as_of_date": date(2026, 7, 27),
    }
    base.update(kw)
    return RunContext(**base)  # type: ignore[arg-type]


# ---------------------------------------------------------------- RunContext
def test_run_context_requires_prefixes() -> None:
    with pytest.raises(ValidationError):
        _context(analysis_version="wrong_001")


def test_run_context_scope_rules() -> None:
    with pytest.raises(ValidationError):
        _context(scope_level=ScopeLevel.OVERALL)  # scope_id 가 남아 있다
    ok = _context(scope_level=ScopeLevel.OVERALL, scope_id=None)
    assert ok.scope_key == "backend:overall:"


def test_run_context_is_frozen() -> None:
    ctx = _context()
    with pytest.raises(ValidationError):
        ctx.job_role_id = "frontend"  # type: ignore[misc]


def test_budget_defaults() -> None:
    assert Budget().max_repair_rounds == 2


# ---------------------------------------------------------------- Objective
def test_objective_completion() -> None:
    contract = ObjectiveContract(
        objective_id="obj_001",
        objective="핀테크 기업군 편차 해석",
        required_evidence_slots=(
            EvidenceSlot(slot="overall_baseline", support_type="statistic_fact"),
            EvidenceSlot(
                slot="cluster_support",
                support_type="posting_evidence",
                minimum=3,
                minimum_independent_companies=3,
            ),
            EvidenceSlot(
                slot="official_context", support_type="chunk", required=False
            ),
        ),
    )
    assert contract.unmet({}) == ("overall_baseline", "cluster_support")
    assert not contract.is_complete({"overall_baseline": 1, "cluster_support": 2})
    assert contract.is_complete({"overall_baseline": 1, "cluster_support": 3})


# ---------------------------------------------------------------- Evidence
def test_usage_requires_claim_only_for_citation() -> None:
    EvidenceUsage(candidate_id="c1", usage_type=UsageType.PLANNING)
    EvidenceUsage(candidate_id="c1", usage_type=UsageType.UNUSED)
    with pytest.raises(ValidationError):
        EvidenceUsage(candidate_id="c1", usage_type=UsageType.SUPPORTS_CLAIM)


def test_evidence_set_counts_independent_companies() -> None:
    members = tuple(
        EvidenceCandidate(
            candidate_id=f"c{i}",
            target_type="chunk",
            target_id=f"chunk_{i}",
            strategy=RetrievalStrategy.VECTOR,
            strategy_rank=i + 1,
            company_id=company,
            source_tier=SourceTier.POSTING,
        )
        for i, company in enumerate(["a", "a", "b", "c"])
    )
    es = EvidenceSet(
        evidence_set_id="es_1",
        objective_id="obj_001",
        optimization_policy_version="v1",
        members=members,
        slot_assignment={"cluster_support": ("c0", "c2", "c3")},
    )
    assert es.independent_companies() == 3
    assert es.filled_counts() == {"cluster_support": 3}


# ---------------------------------------------------------------- Verification
def test_check_autonomy_levels() -> None:
    schema = CheckResult(
        check=CheckName.SCHEMA,
        target_type="analysis_claim",
        target_id="claim_1",
        verdict=CheckVerdict.PASS,
    )
    entail = CheckResult(
        check=CheckName.ENTAILMENT,
        target_type="analysis_claim",
        target_id="claim_1",
        verdict=CheckVerdict.PASS,
    )
    assert schema.autonomy_level is AutonomyLevel.A0
    assert entail.autonomy_level is AutonomyLevel.A1


def test_blocking_detection() -> None:
    fail = CheckResult(
        check=CheckName.SOURCE_POLICY,
        target_type="analysis_claim",
        target_id="claim_42",
        verdict=CheckVerdict.FAIL,
        severity=Severity.BLOCKING,
        reason_code="EXTERNAL_TIER_USED_FOR_COMPANY_REQUIREMENT",
        repair_action=RepairAction.DROP_CLAIM,
    )
    result = VerificationResult(
        target_type="analysis_claim",
        target_id="claim_42",
        analysis_version="an_001",
        checks=(fail,),
        verdict=TypedVerdict.POLICY_VIOLATION,
    )
    assert result.blocking == (fail,)
    assert not result.publishable


def test_only_two_verdicts_publish() -> None:
    assert is_publishable(TypedVerdict.VERIFIED)
    assert is_publishable(TypedVerdict.VERIFIED_WITH_WARNING)
    for v in (
        TypedVerdict.INSUFFICIENT_EVIDENCE,
        TypedVerdict.CONTRADICTED,
        TypedVerdict.POLICY_VIOLATION,
        TypedVerdict.SCHEMA_INVALID,
        TypedVerdict.NEEDS_RESEARCH,
    ):
        assert not is_publishable(v)


# ---------------------------------------------------------------- Repair
def test_statistical_failure_cannot_lower_confidence() -> None:
    with pytest.raises(ValidationError):
        RepairOrder(
            target_claim_id="claim_1",
            failed_check=CheckName.NUMERICAL,
            reason="분모 불일치",
            action=RepairAction.LOWER_CONFIDENCE,
        )


def test_request_research_needs_missing_evidence() -> None:
    with pytest.raises(ValidationError):
        RepairOrder(
            target_claim_id="claim_1",
            failed_check=CheckName.ENTAILMENT,
            reason="공식 보강 근거 없음",
            action=RepairAction.REQUEST_RESEARCH,
        )
    ok = RepairOrder(
        target_claim_id="claim_1",
        failed_check=CheckName.ENTAILMENT,
        reason="공식 보강 근거 없음",
        action=RepairAction.REQUEST_RESEARCH,
        missing_evidence=MissingEvidence(
            source_tier=SourceTier.COMPANY_OFFICIAL, topic="transaction_integrity"
        ),
    )
    assert not ok.exhausted(max_rounds=2)
    assert ok.model_copy(update={"round": 3}).exhausted(max_rounds=2)


# ---------------------------------------------------------------- Research
def test_fulfilled_request_needs_snapshots() -> None:
    with pytest.raises(ValidationError):
        ResearchRequest(
            request_id="req_1",
            requested_by_run_id="run_001",
            analysis_version="an_001",
            goal="핀테크 공식 자료 확보",
            needed_evidence_type="chunk",
            job_role_id="backend",
            scope_level=ScopeLevel.CLUSTER,
            scope_id="fintech",
            status=ResearchStatus.FULFILLED,
        )
