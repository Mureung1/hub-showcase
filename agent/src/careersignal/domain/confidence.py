"""신뢰도 판정.

정의는 docs/agent-design.md 8장을 따른다.
생성 모델의 자기 보고를 신뢰도로 사용하지 않는다. 구성값과 주장 유형 정책으로 판정한다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from careersignal.domain.source_policy import SourceTier


class ClaimType(StrEnum):
    POSTING_FACT = "posting_fact"
    STATISTIC = "statistic"
    CLUSTER_GENERALIZATION = "cluster_generalization"
    INFERRED_REQUIREMENT = "inferred_requirement"
    COMPANY_CONTEXT_SIGNAL = "company_context_signal"
    STRATEGY = "strategy"
    ABSENCE = "absence"


class ConfidenceLevel(StrEnum):
    HIGH = "high"
    MID = "mid"
    LOW = "low"
    DROPPED = "dropped"


class ContradictionStatus(StrEnum):
    NONE = "none"
    UNRESOLVED = "unresolved"
    RESOLVED = "resolved"


@dataclass(frozen=True, slots=True)
class ConfidenceComponents:
    """화면 등급은 이 구성값에서 파생한다. 구성값을 저장하고 등급은 계산한다."""

    source_quality: SourceTier | None
    evidence_directness: bool
    independent_support_count: int
    scope_coverage: float
    temporal_fitness: bool
    contradiction_status: ContradictionStatus
    verification_passed: bool
    sample_size: int = 0
    coverage_complete: bool = False

    def __post_init__(self) -> None:
        if not 0.0 <= self.scope_coverage <= 1.0:
            raise ValueError("scope_coverage 는 0 과 1 사이다")
        if self.independent_support_count < 0:
            raise ValueError("independent_support_count 는 음수일 수 없다")


_TIER_RANK: dict[SourceTier, int] = {
    SourceTier.POSTING: 4,
    SourceTier.COMPANY_OFFICIAL: 3,
    SourceTier.PUBLIC_STANDARD: 2,
    SourceTier.VERIFIED_EXTERNAL: 1,
    SourceTier.UNVERIFIED: 0,
}

MIN_INDEPENDENT_COMPANIES_FOR_GENERALIZATION = 3
MIN_SAMPLE_FOR_GENERALIZATION = 8


def assess(claim_type: ClaimType, c: ConfidenceComponents) -> ConfidenceLevel:
    """주장 유형별 정책으로 신뢰도를 판정한다."""
    if c.independent_support_count == 0 or c.source_quality is None:
        return ConfidenceLevel.DROPPED
    if c.source_quality is SourceTier.UNVERIFIED:
        return ConfidenceLevel.DROPPED
    if not c.verification_passed:
        return ConfidenceLevel.DROPPED
    if c.contradiction_status is ContradictionStatus.UNRESOLVED:
        return ConfidenceLevel.LOW

    tier = _TIER_RANK[c.source_quality]

    match claim_type:
        case ClaimType.POSTING_FACT:
            # 기업 공식 공고의 직접 문장이면 근거 하나로 충분하다.
            if (
                c.source_quality is SourceTier.POSTING
                and c.evidence_directness
                and c.temporal_fitness
            ):
                return ConfidenceLevel.HIGH
            return ConfidenceLevel.MID if c.evidence_directness else ConfidenceLevel.LOW

        case ClaimType.STATISTIC:
            # 수치 검증을 통과한 전수 집계만 취급한다.
            return ConfidenceLevel.HIGH if c.sample_size > 0 else ConfidenceLevel.LOW

        case ClaimType.CLUSTER_GENERALIZATION:
            enough_companies = (
                c.independent_support_count
                >= MIN_INDEPENDENT_COMPANIES_FOR_GENERALIZATION
            )
            enough_sample = c.sample_size >= MIN_SAMPLE_FOR_GENERALIZATION
            if enough_companies and enough_sample and c.scope_coverage >= 0.8:
                return ConfidenceLevel.HIGH
            if enough_companies and c.sample_size > 0:
                return ConfidenceLevel.MID
            return ConfidenceLevel.LOW

        case ClaimType.INFERRED_REQUIREMENT:
            if tier >= _TIER_RANK[SourceTier.COMPANY_OFFICIAL] and (
                c.independent_support_count >= 2
            ):
                return ConfidenceLevel.MID
            return ConfidenceLevel.LOW

        case ClaimType.COMPANY_CONTEXT_SIGNAL:
            # 요구사항이 아님을 표시하는 신호이므로 상한을 mid 로 둔다.
            if (
                c.source_quality is SourceTier.COMPANY_OFFICIAL
                and c.independent_support_count >= 2
            ):
                return ConfidenceLevel.MID
            return ConfidenceLevel.LOW

        case ClaimType.STRATEGY:
            if c.independent_support_count >= 2 and c.evidence_directness:
                return ConfidenceLevel.MID
            return ConfidenceLevel.LOW

        case ClaimType.ABSENCE:
            # 찾지 못한 것과 부재를 확인한 것을 구분한다.
            if not c.coverage_complete:
                return ConfidenceLevel.DROPPED
            return (
                ConfidenceLevel.HIGH if c.scope_coverage >= 1.0 else ConfidenceLevel.MID
            )

    raise ValueError(f"알 수 없는 주장 유형: {claim_type}")


def is_publishable(level: ConfidenceLevel) -> bool:
    return level is not ConfidenceLevel.DROPPED
