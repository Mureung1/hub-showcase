"""수집 실행 오케스트레이션. docs/plan/engineering/content-pipeline.md 2·14장.

load config → fetch → parse → 기존 URL 조회 → CollectionPlan.
dry-run은 계획까지, save는 planned_new만 RPC로 저장한다.
"""

from __future__ import annotations

from app.content import fetcher, parser, planner, repository
from app.content.models import (
    CollectionPlan,
    FeedError,
    ItemStatus,
    PipelineError,
    SourceConfig,
)

MODE_DRY_RUN = "dry_run"
MODE_SAVE = "save"

# eligible source가 만족해야 하는 고정 조건. docs/plan/engineering/content-pipeline.md 4장.
_ELIGIBLE = {
    "active": True,
    "collection_method": "rss",
    "language": "ko",
    "default_exposure": "primary",
    "paywall_risk": "low",
}
_ELIGIBLE_TRUST = {"high", "medium"}


def load_source_config(source_id: str) -> SourceConfig:
    """sources 행을 읽어 eligibility를 검증한 뒤 불변 SourceConfig를 만든다."""
    row = repository.fetch_source_row(source_id)
    if row is None:
        raise PipelineError(FeedError.SOURCE_NOT_FOUND, source_id)

    eligible = (
        all(row.get(key) == value for key, value in _ELIGIBLE.items())
        and row.get("trust_level") in _ELIGIBLE_TRUST
        and row.get("feed_url")
    )
    if not eligible:
        raise PipelineError(FeedError.SOURCE_NOT_ELIGIBLE, source_id)

    interests = repository.fetch_source_interests(source_id)
    if len(interests) < 1:
        raise PipelineError(FeedError.SOURCE_INTERESTS_EMPTY, source_id)

    return SourceConfig(
        id=row["id"],
        name=row["name"],
        feed_url=row["feed_url"],
        source_type=row["source_type"],
        content_type=row["content_type"],
        excerpt_field=row["excerpt_field"],
        default_reading_time_minutes=row["default_reading_time_minutes"],
        source_quality_score=float(row["source_quality_score"]),
        paywall_risk=row["paywall_risk"],
        interest_count=len(interests),
        feed_timezone=row.get("feed_timezone"),
        interests=tuple(interests),
    )


def run(source_id: str, mode: str) -> CollectionPlan:
    """한 source를 한 번 수집한다. feed/source 실패는 PipelineError로 올린다."""
    source = load_source_config(source_id)

    fetch_result = fetcher.fetch_feed(source.feed_url)
    candidates = parser.parse_feed(fetch_result.content, source)

    canonical_urls = sorted({c.canonical_url for c in candidates if c.canonical_url})
    existing = repository.fetch_existing_canonical_urls(canonical_urls)

    plan = planner.build_plan(source, candidates, existing, mode=mode)

    # duplicate는 정상이지만, 모든 item이 rejected면 실패다.
    if plan.items and plan.rejected_count == len(plan.items):
        raise PipelineError(FeedError.ALL_ITEMS_REJECTED, source_id)

    if mode == MODE_SAVE:
        _save(source, plan)

    return plan


def _save(source: SourceConfig, plan: CollectionPlan) -> None:
    """planned_new item만 RPC로 저장하고 결과를 plan에 반영한다.

    한 item RPC가 실패해도 다음 item은 처리한다. docs/plan/engineering/content-pipeline.md 17장.
    """
    # 계획 시점 planned_new만 저장 대상으로 고정한다(상태를 바꿔가며 순회하지 않도록).
    planned = [item for item in plan.items if item.status == ItemStatus.PLANNED_NEW]
    for item in planned:
        try:
            result = repository.ingest_article(source.id, item)
        except Exception as exc:  # noqa: BLE001 - RPC 실패는 item 단위로 기록하고 계속한다
            item.status = ItemStatus.FAILED
            plan.failed_count += 1
            plan.failed_items.append(
                {"title": item.title, "canonical_url": item.canonical_url, "error": type(exc).__name__}
            )
            continue

        status = (result or {}).get("status")
        if status == "inserted":
            item.status = ItemStatus.INSERTED
            plan.inserted_count += 1
        elif status == "duplicate":
            item.status = ItemStatus.DUPLICATE_RACE
            plan.duplicate_race_count += 1
        else:
            item.status = ItemStatus.FAILED
            plan.failed_count += 1
            plan.failed_items.append(
                {"title": item.title, "canonical_url": item.canonical_url, "error": f"unexpected status {status!r}"}
            )

    plan.run_status = "partial_failure" if plan.failed_count > 0 else "success"
