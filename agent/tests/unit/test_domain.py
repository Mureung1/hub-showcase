"""순수 도메인 로직 검증."""

from __future__ import annotations

import pytest

from careersignal.domain.confidence import (
    ClaimType,
    ConfidenceComponents,
    ConfidenceLevel,
    ContradictionStatus,
    assess,
)
from careersignal.domain.depth import DepthLevel, is_advanced_signal, is_deeper
from careersignal.domain.sampling import (
    MetricPolicy,
    SampleStatus,
    classify,
    combine,
    usable_for_comparison,
)
from careersignal.domain.scope import Scope, ScopeLevel
from careersignal.domain.source_policy import (
    AllowedUse,
    RequirementKind,
    SourceTier,
    counts_in_statistics,
    is_allowed,
    violations,
)
from careersignal.domain.versioning import (
    AnalysisVersionStatus,
    can_transition,
    require_prefix,
)


# ---------------------------------------------------------------- scope
def test_overall_scope_rejects_scope_id() -> None:
    with pytest.raises(ValueError):
        Scope("backend", ScopeLevel.OVERALL, "fintech")


def test_cluster_scope_requires_scope_id() -> None:
    with pytest.raises(ValueError):
        Scope("backend", ScopeLevel.CLUSTER)


def test_scope_narrowing() -> None:
    overall = Scope("backend", ScopeLevel.OVERALL)
    cluster = Scope("backend", ScopeLevel.CLUSTER, "fintech")
    assert overall.narrows_to(cluster)
    assert not cluster.narrows_to(overall)


# ---------------------------------------------------------------- versioning
def test_gate_precedes_activation() -> None:
    assert can_transition(AnalysisVersionStatus.VALIDATING, AnalysisVersionStatus.GATED)
    assert can_transition(AnalysisVersionStatus.GATED, AnalysisVersionStatus.ACTIVE)
    assert not can_transition(
        AnalysisVersionStatus.VALIDATING, AnalysisVersionStatus.ACTIVE
    )


def test_failed_never_activates() -> None:
    assert not can_transition(
        AnalysisVersionStatus.FAILED, AnalysisVersionStatus.ACTIVE
    )


def test_prefix_enforced() -> None:
    assert require_prefix("an_20260727a", "analysis_version")
    with pytest.raises(ValueError):
        require_prefix("ds_20260727a", "analysis_version")


# ---------------------------------------------------------------- source policy
def test_external_tier_cannot_feed_statistics() -> None:
    assert not is_allowed(SourceTier.VERIFIED_EXTERNAL, AllowedUse.STATISTICS)
    assert is_allowed(SourceTier.POSTING, AllowedUse.STATISTICS)


def test_company_official_excluded_from_statistics() -> None:
    assert not is_allowed(SourceTier.COMPANY_OFFICIAL, AllowedUse.STATISTICS)


def test_violations_reports_disallowed_uses() -> None:
    bad = violations(
        SourceTier.VERIFIED_EXTERNAL,
        frozenset({AllowedUse.STATISTICS, AllowedUse.STRATEGY}),
    )
    assert bad == frozenset({AllowedUse.STATISTICS})


def test_only_explicit_requirements_count() -> None:
    assert counts_in_statistics(RequirementKind.EXPLICIT)
    assert not counts_in_statistics(RequirementKind.INFERRED)
    assert not counts_in_statistics(RequirementKind.COMPANY_CONTEXT_SIGNAL)


# ---------------------------------------------------------------- depth
def test_depth_order() -> None:
    assert is_deeper(DepthLevel.TRADEOFF, DepthLevel.APPLICATION)
    assert not is_deeper(DepthLevel.FOUNDATION, DepthLevel.APPLICATION)
    assert is_advanced_signal(DepthLevel.TRADEOFF)


# ---------------------------------------------------------------- sampling
POLICY = MetricPolicy("posting_prevalence", "v1", minimum_n=10, minimum_n_comparison=20)


@pytest.mark.parametrize(
    ("denominator", "expected"),
    [
        (0, SampleStatus.NOT_COMPUTABLE),
        (5, SampleStatus.LOW_CONFIDENCE),
        (15, SampleStatus.NOT_COMPARABLE),
        (30, SampleStatus.ANALYSIS_READY),
    ],
)
def test_sample_status(denominator: int, expected: SampleStatus) -> None:
    assert classify(denominator, POLICY) is expected


def test_combine_takes_weaker() -> None:
    assert (
        combine(SampleStatus.ANALYSIS_READY, SampleStatus.NOT_COMPARABLE)
        is SampleStatus.NOT_COMPARABLE
    )


def test_only_analysis_ready_is_comparable() -> None:
    assert usable_for_comparison(SampleStatus.ANALYSIS_READY)
    assert not usable_for_comparison(SampleStatus.NOT_COMPARABLE)


# ---------------------------------------------------------------- confidence
def _components(**kw: object) -> ConfidenceComponents:
    base = {
        "source_quality": SourceTier.POSTING,
        "evidence_directness": True,
        "independent_support_count": 1,
        "scope_coverage": 1.0,
        "temporal_fitness": True,
        "contradiction_status": ContradictionStatus.NONE,
        "verification_passed": True,
    }
    base.update(kw)
    return ConfidenceComponents(**base)  # type: ignore[arg-type]


def test_single_posting_fact_is_high() -> None:
    assert assess(ClaimType.POSTING_FACT, _components()) is ConfidenceLevel.HIGH


def test_generalization_needs_multiple_companies() -> None:
    weak = _components(independent_support_count=1, sample_size=20)
    strong = _components(independent_support_count=4, sample_size=20)
    assert assess(ClaimType.CLUSTER_GENERALIZATION, weak) is ConfidenceLevel.LOW
    assert assess(ClaimType.CLUSTER_GENERALIZATION, strong) is ConfidenceLevel.HIGH


def test_no_evidence_is_dropped() -> None:
    assert (
        assess(ClaimType.POSTING_FACT, _components(independent_support_count=0))
        is ConfidenceLevel.DROPPED
    )


def test_absence_requires_complete_coverage() -> None:
    incomplete = _components(coverage_complete=False)
    complete = _components(coverage_complete=True, scope_coverage=1.0)
    assert assess(ClaimType.ABSENCE, incomplete) is ConfidenceLevel.DROPPED
    assert assess(ClaimType.ABSENCE, complete) is ConfidenceLevel.HIGH


def test_unresolved_contradiction_lowers() -> None:
    c = _components(contradiction_status=ContradictionStatus.UNRESOLVED)
    assert assess(ClaimType.POSTING_FACT, c) is ConfidenceLevel.LOW
