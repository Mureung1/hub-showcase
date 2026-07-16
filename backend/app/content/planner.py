"""후보 검증과 안정적인 CollectionPlan 생성. content_pipeline.md 8·11·14장.

DB를 모르는 순수 함수다. 기존 URL 집합은 service가 repository로 조회해 넘긴다.
dry-run과 save는 이 계획 생성까지 완전히 같은 코드를 쓴다.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from app.content import access, scoring
from app.content.models import (
    ArticleCandidate,
    CollectionPlan,
    ItemStatus,
    PlannedItem,
    RejectReason,
    SourceConfig,
)

FUTURE_TOLERANCE = timedelta(hours=24)
ALLOWED_SCHEMES = {"http", "https"}


def build_plan(
    source: SourceConfig,
    candidates: list[ArticleCandidate],
    existing_canonical_urls: set[str],
    *,
    mode: str,
    now: datetime | None = None,
) -> CollectionPlan:
    now = now or datetime.now(timezone.utc)
    plan = CollectionPlan(
        source_id=source.id,
        feed_url=source.feed_url,
        mode=mode,
        fetched_count=len(candidates),
        parsed_count=len(candidates),
    )

    seen_in_feed: set[str] = set()
    for candidate in candidates:
        plan.items.append(_evaluate(candidate, source, existing_canonical_urls, seen_in_feed, now))

    # 안정적인 출력·저장 순서: planned_new만 canonical URL 오름차순 정렬
    plan.items.sort(key=_sort_key)

    _fix_aggregates(plan, source)
    return plan


def _fix_aggregates(plan: CollectionPlan, source: SourceConfig) -> None:
    """계획 시점 집계를 고정한다. save가 item 상태를 바꿔도 이 값은 유지된다."""
    planned = [i for i in plan.items if i.status == ItemStatus.PLANNED_NEW]
    plan.planned_new_count = len(planned)
    plan.missing_published_at_count = sum(1 for i in planned if i.published_at is None)
    plan.missing_published_at_ratio = (
        round(plan.missing_published_at_count / len(planned), 4) if planned else 0.0
    )

    # source_rule 태깅: 신규 글마다 source의 모든 관심사를 그대로 복사한다.
    # 따라서 각 관심사 tag 예상 건수 = planned_new 수, 미태깅은 관심사가 없을 때만 발생.
    if source.interests:
        for name, _weight in source.interests:
            plan.interest_tag_counts[name] = len(planned)
        if planned:
            plan.tagging_method_counts["source_rule"] = len(planned)
        plan.untagged_count = 0
    else:
        plan.untagged_count = len(planned)


def _sort_key(item: PlannedItem) -> tuple[int, str]:
    # planned_new를 먼저, 그 안에서 canonical URL 오름차순
    is_new = 0 if item.status == ItemStatus.PLANNED_NEW else 1
    return (is_new, item.canonical_url)


def _evaluate(
    candidate: ArticleCandidate,
    source: SourceConfig,
    existing_canonical_urls: set[str],
    seen_in_feed: set[str],
    now: datetime,
) -> PlannedItem:
    def reject(reason: RejectReason) -> PlannedItem:
        return PlannedItem(
            status=ItemStatus.REJECTED,
            title=candidate.title,
            original_url=candidate.original_url,
            canonical_url=candidate.canonical_url,
            reject_reason=reason,
        )

    # 1. 필수값·URL
    if not candidate.title:
        return reject(RejectReason.MISSING_TITLE)
    if not candidate.original_url:
        return reject(RejectReason.MISSING_URL)

    parts = urlsplit(candidate.original_url)
    if parts.scheme.lower() not in ALLOWED_SCHEMES:
        return reject(RejectReason.UNSUPPORTED_URL_SCHEME)
    if not parts.hostname or not candidate.canonical_url:
        return reject(RejectReason.INVALID_URL)

    # 2. 미래 발행일
    if candidate.published_at is not None and candidate.published_at > now + FUTURE_TOLERANCE:
        return reject(RejectReason.FUTURE_PUBLISHED_AT)

    # 3. 접근성
    access_type = access.decide_access_type(candidate, source)
    if access_type == "paywalled":
        return reject(RejectReason.PAYWALL_SIGNAL)
    if access_type != "free":
        return reject(RejectReason.ACCESS_UNKNOWN)

    # 4. 읽기 시간·품질 점수
    reading_time, reading_time_source = scoring.resolve_reading_time(None, source)
    quality = scoring.compute_quality_score(candidate, source)
    if quality < scoring.QUALITY_THRESHOLD:
        return reject(RejectReason.QUALITY_BELOW_THRESHOLD)

    # 5. feed 내부 중복
    if candidate.canonical_url in seen_in_feed:
        return PlannedItem(
            status=ItemStatus.DUPLICATE_IN_FEED,
            title=candidate.title,
            original_url=candidate.original_url,
            canonical_url=candidate.canonical_url,
            reject_reason=RejectReason.DUPLICATE_IN_FEED,
        )
    seen_in_feed.add(candidate.canonical_url)

    # 6. DB 기존 URL
    if candidate.canonical_url in existing_canonical_urls:
        return PlannedItem(
            status=ItemStatus.DUPLICATE_IN_DB,
            title=candidate.title,
            original_url=candidate.original_url,
            canonical_url=candidate.canonical_url,
            reject_reason=RejectReason.DUPLICATE_IN_DB,
        )

    # 7. 저장 대상
    return PlannedItem(
        status=ItemStatus.PLANNED_NEW,
        title=candidate.title,
        original_url=candidate.original_url,
        canonical_url=candidate.canonical_url,
        published_at=candidate.published_at,
        author=candidate.author,
        official_excerpt=candidate.official_excerpt,
        thumbnail_url=candidate.thumbnail_url,
        reading_time_minutes=reading_time,
        reading_time_source=reading_time_source,
        quality_score=quality,
    )
