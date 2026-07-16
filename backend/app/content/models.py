"""RSS 수집 파이프라인의 런타임 데이터 모델과 상태·오류 코드.

이 모듈은 Supabase client를 모른다. DB 접근은 repository에만 둔다.
content_pipeline.md 4·14·15장 참조.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class ItemStatus(str, Enum):
    """item 하나의 처리 결과. content_pipeline.md 15장."""

    PLANNED_NEW = "planned_new"
    INSERTED = "inserted"
    DUPLICATE_IN_FEED = "duplicate_in_feed"
    DUPLICATE_IN_DB = "duplicate_in_db"
    DUPLICATE_RACE = "duplicate_race"
    REJECTED = "rejected"
    FAILED = "failed"


class RejectReason(str, Enum):
    """item 제외 사유. content_pipeline.md 15장."""

    MISSING_TITLE = "MISSING_TITLE"
    MISSING_URL = "MISSING_URL"
    INVALID_URL = "INVALID_URL"
    UNSUPPORTED_URL_SCHEME = "UNSUPPORTED_URL_SCHEME"
    FUTURE_PUBLISHED_AT = "FUTURE_PUBLISHED_AT"
    PAYWALL_SIGNAL = "PAYWALL_SIGNAL"
    ACCESS_UNKNOWN = "ACCESS_UNKNOWN"
    QUALITY_BELOW_THRESHOLD = "QUALITY_BELOW_THRESHOLD"
    DUPLICATE_IN_FEED = "DUPLICATE_IN_FEED"
    DUPLICATE_IN_DB = "DUPLICATE_IN_DB"


class FeedError(str, Enum):
    """feed/source 단위 오류. 하나라도 나면 저장 0건. content_pipeline.md 15장."""

    SOURCE_NOT_FOUND = "SOURCE_NOT_FOUND"
    SOURCE_NOT_ELIGIBLE = "SOURCE_NOT_ELIGIBLE"
    SOURCE_INTERESTS_EMPTY = "SOURCE_INTERESTS_EMPTY"
    FETCH_TIMEOUT = "FETCH_TIMEOUT"
    FETCH_HTTP_ERROR = "FETCH_HTTP_ERROR"
    FETCH_TOO_LARGE = "FETCH_TOO_LARGE"
    REDIRECT_HOST_CHANGED = "REDIRECT_HOST_CHANGED"
    FEED_PARSE_ERROR = "FEED_PARSE_ERROR"
    FEED_EMPTY = "FEED_EMPTY"
    ALL_ITEMS_REJECTED = "ALL_ITEMS_REJECTED"


class PipelineError(Exception):
    """feed/source 단위 실패. code로 실패 사유를 전달한다."""

    def __init__(self, code: FeedError, detail: str | None = None) -> None:
        self.code = code
        self.detail = detail
        super().__init__(f"{code.value}: {detail}" if detail else code.value)


@dataclass(frozen=True)
class SourceConfig:
    """실행 시작 시 sources 행과 관심사를 읽어 만드는 불변 런타임 설정.

    content_pipeline.md 4장. eligible 여부는 이 객체를 만들기 전에 검증한다.
    """

    id: str
    name: str
    feed_url: str
    source_type: str
    content_type: str
    excerpt_field: str
    default_reading_time_minutes: int
    source_quality_score: float
    paywall_risk: str
    interest_count: int


@dataclass(frozen=True)
class FetchResult:
    """fetcher가 돌려주는 원본 응답."""

    final_url: str
    content: bytes


@dataclass
class ArticleCandidate:
    """parse·sanitize 후, 검증 전의 item. content_pipeline.md 6장."""

    title: str
    original_url: str
    canonical_url: str
    published_at: datetime | None
    author: str | None
    official_excerpt: str | None
    thumbnail_url: str | None


@dataclass
class PlannedItem:
    """검증까지 끝난 item 하나의 계획. dry-run·save 공통."""

    status: ItemStatus
    title: str
    original_url: str
    canonical_url: str
    reject_reason: RejectReason | None = None
    # 저장 대상(planned_new)일 때만 채운다.
    published_at: datetime | None = None
    author: str | None = None
    official_excerpt: str | None = None
    thumbnail_url: str | None = None
    reading_time_minutes: int | None = None
    reading_time_source: str | None = None
    quality_score: float | None = None

    def to_rpc_payload(self) -> dict:
        """ingest_rss_article이 허용하는 key만 담아 반환한다.

        None 값은 넣지 않는다. RPC가 알 수 없는 key를 거부하므로 계약을 지킨다.
        """
        payload: dict = {
            "title": self.title,
            "canonical_url": self.canonical_url,
            "original_url": self.original_url,
            "quality_score": self.quality_score,
        }
        if self.published_at is not None:
            payload["published_at"] = self.published_at.isoformat()
        if self.author is not None:
            payload["author"] = self.author
        if self.official_excerpt is not None:
            payload["official_excerpt"] = self.official_excerpt
        if self.thumbnail_url is not None:
            payload["thumbnail_url"] = self.thumbnail_url
        if self.reading_time_minutes is not None:
            payload["reading_time_minutes"] = self.reading_time_minutes
        if self.reading_time_source is not None:
            payload["reading_time_source"] = self.reading_time_source
        return payload


@dataclass
class CollectionPlan:
    """dry-run·save 공통 실행 계획과 집계. content_pipeline.md 14장."""

    source_id: str
    feed_url: str
    mode: str
    fetched_count: int
    parsed_count: int
    items: list[PlannedItem] = field(default_factory=list)
    # save 단계에서 채운다.
    inserted_count: int = 0
    duplicate_race_count: int = 0
    failed_count: int = 0
    failed_items: list[dict] = field(default_factory=list)

    @property
    def planned_new(self) -> list[PlannedItem]:
        return [i for i in self.items if i.status == ItemStatus.PLANNED_NEW]

    @property
    def planned_new_count(self) -> int:
        return len(self.planned_new)

    @property
    def duplicate_in_feed_count(self) -> int:
        return sum(1 for i in self.items if i.status == ItemStatus.DUPLICATE_IN_FEED)

    @property
    def duplicate_in_db_count(self) -> int:
        return sum(1 for i in self.items if i.status == ItemStatus.DUPLICATE_IN_DB)

    @property
    def rejected_count(self) -> int:
        return sum(1 for i in self.items if i.status == ItemStatus.REJECTED)

    @property
    def rejected_by_reason(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for item in self.items:
            if item.status == ItemStatus.REJECTED and item.reject_reason is not None:
                counts[item.reject_reason.value] = counts.get(item.reject_reason.value, 0) + 1
        return counts

    @property
    def missing_published_at_count(self) -> int:
        return sum(1 for i in self.planned_new if i.published_at is None)

    @property
    def missing_published_at_ratio(self) -> float:
        if self.planned_new_count == 0:
            return 0.0
        return round(self.missing_published_at_count / self.planned_new_count, 4)
