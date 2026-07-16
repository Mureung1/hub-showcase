"""접근성 판정. content_pipeline.md 8장.

원문 요청 없이 title, URL, excerpt와 source.paywall_risk만 사용한다.
"""

from __future__ import annotations

from app.content.models import ArticleCandidate, SourceConfig

PAYWALL_SIGNALS = (
    "premium",
    "paid",
    "members",
    "membership",
    "subscribe",
    "유료",
    "구독",
    "멤버십",
    "회원전용",
)


def decide_access_type(candidate: ArticleCandidate, source: SourceConfig) -> str:
    """'paywalled' | 'free' | 'unknown'. free만 저장 후보로 넘어간다."""
    haystack = " ".join(
        part for part in (candidate.title, candidate.canonical_url, candidate.official_excerpt) if part
    ).lower()

    if any(signal in haystack for signal in PAYWALL_SIGNALS):
        return "paywalled"
    if source.paywall_risk == "low":
        return "free"
    return "unknown"
