"""통합 Verifier와 위험 기반 계층화 검증.

실패 조건은 docs/agent-design.md 9.1·9.5, docs/architecture.md 8장,
agent/data/demo_seed/CONTRACT.md 11장에서 온다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.contracts import CheckName, CheckVerdict, RunContext, TypedVerdict
from careersignal.domain.sampling import SampleStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.versioning import AnalysisVersionStatus
from careersignal.verification import (
    REASON_NOT_APPLICABLE,
    REASON_NOT_REGISTERED,
    CheckRegistry,
    CheckRunner,
)
from careersignal.verification.integrated import (
    CHECK_TARGETS,
    RISK_ABSENCE,
    RISK_CONFIDENCE_BOUNDARY,
    RISK_COUNTEREVIDENCE,
    RISK_EXTERNAL_STRATEGY,
    RISK_FIRST_RUN,
    RISK_GENERALIZATION,
    IntegratedVerifier,
    TargetProfile,
    default_registry,
    is_risk_sample,
    planned_checks,
    risk_reasons,
    risk_sample,
)

CLAIM_ID = "claim_42"

SEMANTIC_CHECKS = (
    CheckName.ENTAILMENT,
    CheckName.CROSS_MODEL,
    CheckName.CONTRADICTION,
)
"""판정자를 쓰는 검사 셋. 데모는 이 셋을 판정자 없이 등록한다."""


def _run() -> RunContext:
    return RunContext(
        agent_run_id="run_001",
        analysis_version="an_001",
        dataset_version="ds_001",
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 27),
    )


def _components() -> dict[str, Any]:
    return {
        "source_quality": "A",
        "evidence_directness": True,
        "independent_support_count": 3,
        "scope_coverage": 0.9,
        "temporal_fitness": True,
        "contradiction_status": "none",
        "verification_passed": True,
    }


def _claim_profile(**override: Any) -> TargetProfile:
    base: dict[str, Any] = {
        "target_type": "analysis_claim",
        "target_id": CLAIM_ID,
        "claim_type": "posting_explicit",
        "payload": {"confidence_components": _components()},
    }
    return TargetProfile(**(base | override))


class FakeSourcePolicyReader:
    """근거 행이 없으면 검사 2는 `skip` 이다. 계층화 검증에는 그것으로 충분하다."""

    def claim_type(self, claim_id: str) -> str | None:
        return "posting_explicit"

    def claim_source_policy(self, claim_id: str) -> list[dict[str, Any]]:
        return []

    def wiki_source_policy(self, revision_id: str) -> list[dict[str, Any]]:
        return []


class FakeCitationReader:
    def __init__(self, unresolved: list[dict[str, Any]] | None = None) -> None:
        self._unresolved = unresolved or []

    def mention_with_chunk(self, mention_id: str) -> dict[str, Any] | None:
        return None

    def evidence_count(self, claim_id: str) -> int:
        return 2

    def unresolved_supports(self, claim_id: str) -> list[dict[str, Any]]:
        return list(self._unresolved)


class FakeStatisticsReader:
    def fact_ids(self, analysis_version: str) -> list[str]:
        return []

    def fact_audit(self, fact_id: str) -> Any:
        return None

    def fact_count(self, analysis_version: str) -> int:
        return 0

    def fact_audit_page(
        self, analysis_version: str, after: str, size: int
    ) -> list[tuple[str, Any]]:
        return []


def _registry(citation: FakeCitationReader | None = None) -> CheckRegistry:
    """판정자 없이 검사 1~7 을 모두 등록한 레지스트리."""
    return default_registry(
        source_policy_reader=FakeSourcePolicyReader(),
        citation_reader=citation or FakeCitationReader(),
        statistics_reader=FakeStatisticsReader(),
    )


# ============================================================ 18-2 계층화
def test_check_targets_cover_every_executable_check() -> None:
    """계층화 표와 러너의 실행 대상이 같은 검사 집합을 갖는다."""
    executable = {spec.check for spec in CheckRegistry().executable()}

    assert set(CHECK_TARGETS) == executable


def test_plain_claim_skips_the_cross_model_audit() -> None:
    """위험 조건에 걸리지 않은 주장에는 검사 6이 적용되지 않는다."""
    planned = planned_checks(_claim_profile())

    assert CheckName.CROSS_MODEL not in planned
    assert planned == frozenset(
        {
            CheckName.SCHEMA,
            CheckName.SOURCE_POLICY,
            CheckName.CITATION_SPAN,
            CheckName.ENTAILMENT,
            CheckName.CONTRADICTION,
        }
    )


def test_risky_claim_adds_the_cross_model_audit() -> None:
    planned = planned_checks(_claim_profile(has_counterevidence=True))

    assert CheckName.CROSS_MODEL in planned


def test_claim_without_evidence_drops_the_entailment_check() -> None:
    planned = planned_checks(_claim_profile(has_evidence=False))

    assert CheckName.ENTAILMENT not in planned


@pytest.mark.parametrize(
    ("target_type", "expected"),
    [
        ("requirement_mention", {CheckName.CITATION_SPAN}),
        ("wiki_revision", {CheckName.SOURCE_POLICY}),
        ("statistic_fact", {CheckName.NUMERICAL}),
        ("statistics_aggregation", {CheckName.NUMERICAL}),
    ],
)
def test_non_claim_targets_get_their_own_checks(
    target_type: str, expected: set[CheckName]
) -> None:
    profile = TargetProfile(target_type=target_type, target_id="x_1")

    assert planned_checks(profile) == frozenset(expected)
    assert not is_risk_sample(profile)


@pytest.mark.parametrize(
    ("override", "reason"),
    [
        ({"claim_type": "cluster_generalization"}, RISK_GENERALIZATION),
        ({"generalized_from_narrow_base": True}, RISK_GENERALIZATION),
        (
            {"claim_type": "strategy", "external_tier_evidence": True},
            RISK_EXTERNAL_STRATEGY,
        ),
        ({"has_counterevidence": True}, RISK_COUNTEREVIDENCE),
        ({"sample_status": SampleStatus.LOW_CONFIDENCE}, RISK_CONFIDENCE_BOUNDARY),
        ({"claim_type": "no_deviation"}, RISK_ABSENCE),
        ({"first_run_of_version": True}, RISK_FIRST_RUN),
    ],
)
def test_each_risk_condition_names_itself(
    override: dict[str, Any], reason: str
) -> None:
    """docs/agent-design.md 9.1의 여섯 조건이 각각 사유로 남는다."""
    reasons = risk_reasons(_claim_profile(**override))

    assert reason in reasons


def test_analysis_ready_sample_is_not_a_risk() -> None:
    profile = _claim_profile(sample_status=SampleStatus.ANALYSIS_READY)

    assert risk_reasons(profile) == ()


def test_risk_sample_is_deterministic_and_capped() -> None:
    profiles = [
        _claim_profile(target_id=f"claim_{i:03d}", has_counterevidence=True)
        for i in range(9, -1, -1)
    ] + [_claim_profile(target_id="claim_999")]

    assert risk_sample(profiles, 3) == ("claim_000", "claim_001", "claim_002")
    assert "claim_999" not in risk_sample(profiles)


# ============================================================ 18-3 조립
def test_semantic_checks_are_registered_without_a_judge() -> None:
    """판정자가 없어도 검사 5·6·7 은 등록된다. 미등록은 판정을 막기 때문이다."""
    registry = _registry()

    assert registry.unregistered() == ()
    for check in SEMANTIC_CHECKS:
        assert registry.implementation(check) is not None


def test_missing_reader_leaves_the_check_unregistered() -> None:
    """조회 없이 등록하면 무엇을 검사했는지 모르는 통과가 생긴다."""
    registry = default_registry()

    assert set(registry.unregistered()) == {
        CheckName.SOURCE_POLICY,
        CheckName.CITATION_SPAN,
        CheckName.NUMERICAL,
    }


@pytest.mark.parametrize(
    "judge_field",
    ["entailment_judge", "cross_model_judge", "absence_judge"],
)
def test_a_judge_without_a_reader_is_rejected(judge_field: str) -> None:
    with pytest.raises(ValueError):
        default_registry(**{judge_field: object()})


def test_semantic_checks_report_not_applicable_without_a_judge() -> None:
    """데모의 모델 호출 0회. `CHECK_NOT_REGISTERED` 로 떨어지지 않는다."""
    report = IntegratedVerifier(_registry()).verify(_run(), [_claim_profile()]).reports[
        0
    ]
    by_check = {result.check: result for result in report.results}

    for check in SEMANTIC_CHECKS:
        assert by_check[check].verdict is CheckVerdict.SKIP
        assert by_check[check].reason_code == REASON_NOT_APPLICABLE
    assert report.complete
    assert report.unregistered == ()


# ============================================================ 18-3 판정
def test_a_clean_version_reaches_gated() -> None:
    report = IntegratedVerifier(_registry()).verify(_run(), [_claim_profile()])

    assert report.status is AnalysisVersionStatus.GATED
    assert report.activatable
    assert report.verdicts[("analysis_claim", CLAIM_ID)] is TypedVerdict.VERIFIED
    assert report.blocked == ()


def test_a_blocking_failure_fails_the_version() -> None:
    citation = FakeCitationReader(unresolved=[{"support_id": "x", "type": "chunk"}])
    report = IntegratedVerifier(_registry(citation)).verify(
        _run(), [_claim_profile()]
    )

    assert report.status is AnalysisVersionStatus.FAILED
    assert not report.activatable
    assert report.verdicts[("analysis_claim", CLAIM_ID)] is (
        TypedVerdict.INSUFFICIENT_EVIDENCE
    )
    assert report.blocked == (("analysis_claim", CLAIM_ID),)


def test_an_unregistered_check_leaves_the_target_undecided() -> None:
    """검사 하나가 빠진 배포를 `verified` 로 통과시키지 않는다."""
    registry = default_registry(source_policy_reader=FakeSourcePolicyReader())
    report = IntegratedVerifier(registry).verify(_run(), [_claim_profile()])

    assert report.undecided == (("analysis_claim", CLAIM_ID),)
    assert report.status is AnalysisVersionStatus.FAILED
    assert REASON_NOT_REGISTERED in {
        result.reason_code for result in report.reports[0].results
    }


def test_unmet_slots_block_publication() -> None:
    report = IntegratedVerifier(_registry()).verify(
        _run(), [_claim_profile()], unmet={CLAIM_ID: ("evidence",)}
    )

    assert report.verdicts[("analysis_claim", CLAIM_ID)] is (
        TypedVerdict.INSUFFICIENT_EVIDENCE
    )
    assert report.status is AnalysisVersionStatus.FAILED


def test_a_version_without_targets_fails() -> None:
    """검증하지 않은 버전을 수용 평가로 넘기지 않는다."""
    report = IntegratedVerifier(_registry()).verify(_run(), [])

    assert report.status is AnalysisVersionStatus.FAILED
    assert report.reports == ()


def test_the_verifier_rejects_a_runner_and_a_registry_together() -> None:
    with pytest.raises(ValueError):
        IntegratedVerifier(registry=CheckRegistry(), runner=CheckRunner())
