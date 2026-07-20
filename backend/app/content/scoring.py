"""읽기 시간과 품질 점수. docs/plan/engineering/content-pipeline.md 9장.

본문 길이는 읽지 않는다. feed 필드 또는 source 기본값만 사용한다.
"""

from __future__ import annotations

from app.content.models import ArticleCandidate, SourceConfig

QUALITY_THRESHOLD = 0.65
FREE_ACCESS_BONUS = 0.10
METADATA_BONUS = 0.05
READING_TIME_MIN = 1
READING_TIME_MAX = 60


def resolve_reading_time(feed_reading_time: int | None, source: SourceConfig) -> tuple[int, str]:
    """(minutes, source) 반환. feed 값이 유효(1..60)하면 그 값, 아니면 source 기본값."""
    if feed_reading_time is not None and READING_TIME_MIN <= feed_reading_time <= READING_TIME_MAX:
        return feed_reading_time, "source_meta"
    return source.default_reading_time_minutes, "source_default"


def compute_quality_score(candidate: ArticleCandidate, source: SourceConfig) -> float:
    """docs/plan/engineering/content-pipeline.md 9장 공식. free 후보만 이 함수에 도달한다.

    quality = clamp(source_quality_score + 0.10(free) + metadata_bonus, 0, 1)
    metadata_bonus: excerpt/published_at/author 중 2개 이상 있으면 0.05.
    """
    present = sum(
        1
        for value in (candidate.official_excerpt, candidate.published_at, candidate.author)
        if value is not None
    )
    metadata_bonus = METADATA_BONUS if present >= 2 else 0.0
    score = source.source_quality_score + FREE_ACCESS_BONUS + metadata_bonus
    return max(0.0, min(1.0, score))
