"""feedparser 파싱과 필드 매핑. content_pipeline.md 6장.

응답 bytes를 feedparser에 넘기고, bozo·version·구조를 검사한 뒤
ArticleCandidate 목록으로 변환한다. content:encoded와 Atom content는 쓰지 않는다.
"""

from __future__ import annotations

import calendar
from datetime import datetime, timezone

import feedparser

from app.content import sanitizer
from app.content.models import ArticleCandidate, FeedError, PipelineError, SourceConfig
from app.content.url_normalizer import normalize_url

SUPPORTED_VERSIONS = {"rss20", "atom10"}
MAX_ITEMS = 50


def parse_feed(content: bytes, source: SourceConfig) -> list[ArticleCandidate]:
    """feed bytes를 ArticleCandidate 목록으로 변환한다.

    bozo=true, 미지원 version, 구조 부재는 FEED_PARSE_ERROR. entry 0개는 FEED_EMPTY.
    """
    parsed = feedparser.parse(content)

    if parsed.bozo:
        exc = parsed.get("bozo_exception")
        detail = type(exc).__name__ if exc is not None else "bozo"
        raise PipelineError(FeedError.FEED_PARSE_ERROR, detail)

    version = parsed.get("version") or ""
    if version not in SUPPORTED_VERSIONS:
        raise PipelineError(FeedError.FEED_PARSE_ERROR, f"unsupported version: {version!r}")

    if not parsed.get("feed") or "entries" not in parsed:
        raise PipelineError(FeedError.FEED_PARSE_ERROR, "missing feed structure")

    entries = parsed.entries
    if not entries:
        raise PipelineError(FeedError.FEED_EMPTY)

    candidates: list[ArticleCandidate] = []
    for entry in entries[:MAX_ITEMS]:
        candidates.append(_map_entry(entry, source))
    return candidates


def _map_entry(entry, source: SourceConfig) -> ArticleCandidate:
    title = sanitizer.clean_title(entry.get("title"))
    original_url = (entry.get("link") or "").strip()
    canonical_url = normalize_url(original_url) if original_url else ""

    return ArticleCandidate(
        title=title or "",
        original_url=original_url,
        canonical_url=canonical_url,
        published_at=_parse_published_at(entry),
        author=sanitizer.clean_author(entry.get("author")),
        official_excerpt=_map_excerpt(entry, source),
        thumbnail_url=_map_thumbnail(entry),
    )


def _parse_published_at(entry) -> datetime | None:
    """published_parsed → updated_parsed를 UTC datetime으로. 없으면 None."""
    struct = entry.get("published_parsed") or entry.get("updated_parsed")
    if struct is None:
        return None
    return datetime.fromtimestamp(calendar.timegm(struct), tz=timezone.utc)


def _map_excerpt(entry, source: SourceConfig) -> str | None:
    """source.excerpt_field가 가리키는 소개문만 사용한다. content:encoded/content는 제외."""
    if source.excerpt_field == "none":
        return None
    # feedparser는 RSS description을 summary로 정규화한다.
    raw = entry.get("summary") if source.excerpt_field in ("summary", "description") else None
    return sanitizer.clean_excerpt(raw)


def _map_thumbnail(entry) -> str | None:
    """media_thumbnail → image media_content → image enclosure 순으로 URL만."""
    thumbnails = entry.get("media_thumbnail")
    if thumbnails:
        url = thumbnails[0].get("url")
        if url:
            return url.strip()

    for media in entry.get("media_content", []) or []:
        if str(media.get("medium") or "").lower() == "image" or str(media.get("type") or "").startswith("image"):
            url = media.get("url")
            if url:
                return url.strip()

    for enclosure in entry.get("enclosures", []) or []:
        if str(enclosure.get("type") or "").startswith("image"):
            url = enclosure.get("href") or enclosure.get("url")
            if url:
                return url.strip()

    return None
