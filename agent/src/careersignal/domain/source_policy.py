"""자료 계층과 허용 용도.

정의는 docs/data-strategy.md 3장을 따른다.
자료 계층은 품질의 단일 순서가 아니라 허용 용도의 구분이다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

from enum import StrEnum


class SourceTier(StrEnum):
    POSTING = "A"
    COMPANY_OFFICIAL = "B"
    PUBLIC_STANDARD = "C"
    VERIFIED_EXTERNAL = "D"
    UNVERIFIED = "E"


class AllowedUse(StrEnum):
    STATISTICS = "statistics"
    INTERPRETATION_CONTEXT = "interpretation_context"
    STRATEGY = "strategy"
    ROADMAP = "roadmap"
    WIKI_DEFINITION = "wiki_definition"
    WIKI_WHY_REQUIRED = "wiki_why_required"
    WIKI_DEPTH_CRITERIA = "wiki_depth_criteria"
    WIKI_PREREQUISITES = "wiki_prerequisites"
    WIKI_COMMON_MISCONCEPTIONS = "wiki_common_misconceptions"
    WIKI_INTERVIEW_VERIFICATION = "wiki_interview_verification"
    WIKI_LEARNING_SEQUENCE = "wiki_learning_sequence"


TIER_ALLOWED_USES: dict[SourceTier, frozenset[AllowedUse]] = {
    SourceTier.POSTING: frozenset(
        {
            AllowedUse.STATISTICS,
            AllowedUse.INTERPRETATION_CONTEXT,
            AllowedUse.STRATEGY,
            AllowedUse.ROADMAP,
            AllowedUse.WIKI_WHY_REQUIRED,
        }
    ),
    SourceTier.COMPANY_OFFICIAL: frozenset(
        {
            AllowedUse.INTERPRETATION_CONTEXT,
            AllowedUse.STRATEGY,
            AllowedUse.ROADMAP,
            AllowedUse.WIKI_WHY_REQUIRED,
            AllowedUse.WIKI_DEPTH_CRITERIA,
        }
    ),
    SourceTier.PUBLIC_STANDARD: frozenset(
        {
            AllowedUse.INTERPRETATION_CONTEXT,
            AllowedUse.STRATEGY,
            AllowedUse.ROADMAP,
            AllowedUse.WIKI_DEFINITION,
            AllowedUse.WIKI_PREREQUISITES,
        }
    ),
    SourceTier.VERIFIED_EXTERNAL: frozenset(
        {
            AllowedUse.STRATEGY,
            AllowedUse.ROADMAP,
            AllowedUse.WIKI_DEPTH_CRITERIA,
            AllowedUse.WIKI_COMMON_MISCONCEPTIONS,
            AllowedUse.WIKI_INTERVIEW_VERIFICATION,
            AllowedUse.WIKI_LEARNING_SEQUENCE,
        }
    ),
    SourceTier.UNVERIFIED: frozenset(),
}


class RequirementKind(StrEnum):
    """docs/data-strategy.md 4장의 요구 세 구분."""

    EXPLICIT = "explicit_requirement"
    INFERRED = "inferred_requirement"
    COMPANY_CONTEXT_SIGNAL = "company_context_signal"


COUNTS_IN_STATISTICS: frozenset[RequirementKind] = frozenset(
    {RequirementKind.EXPLICIT}
)


def is_allowed(tier: SourceTier, use: AllowedUse) -> bool:
    return use in TIER_ALLOWED_USES[tier]


def violations(tier: SourceTier, uses: frozenset[AllowedUse]) -> frozenset[AllowedUse]:
    """허용되지 않은 용도를 돌려준다. 비어 있으면 정책을 지킨다."""
    return frozenset(u for u in uses if not is_allowed(tier, u))


def counts_in_statistics(kind: RequirementKind) -> bool:
    return kind in COUNTS_IN_STATISTICS
