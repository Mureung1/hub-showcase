"""콘텐츠 수집 파이프라인 회귀 테스트.

DB·네트워크 없이 순수 로직만 검증한다. 코드 리뷰(2026-07-16)의 P1 재현 사례를 고정한다.
실행: cd backend && python -m unittest
"""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from app.content import parser, planner
from app.content.models import ItemStatus, RejectReason, SourceConfig
from app.content.url_normalizer import normalize_url


def make_source(**overrides) -> SourceConfig:
    base = dict(
        id="00000000-0000-0000-0000-000000000001",
        name="테스트 블로그",
        feed_url="https://blog.example.com/feed",
        source_type="official_blog",
        content_type="blog",
        excerpt_field="summary",
        default_reading_time_minutes=7,
        source_quality_score=0.7,
        paywall_risk="low",
        interest_count=1,
        interests=(("IT·개발", 1.0),),
    )
    base.update(overrides)
    return SourceConfig(**base)


def build_rss(items_xml: str) -> bytes:
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<rss version="2.0"><channel><title>t</title>'
        "<link>https://blog.example.com</link><description>d</description>"
        f"{items_xml}</channel></rss>"
    ).encode("utf-8")


def item_xml(title: str, link: str, *, pub: str = "Mon, 30 Jun 2025 09:00:00 +0000", desc: str = "소개문") -> str:
    return f"<item><title>{title}</title><link>{link}</link><description>{desc}</description><pubDate>{pub}</pubDate></item>"


class UrlNormalizationTest(unittest.TestCase):
    def test_strips_tracking_keeps_meaningful_query(self):
        got = normalize_url("https://EXAMPLE.com:443/a?id=10&utm_source=rss#top")
        self.assertEqual(got, "https://example.com/a?id=10")

    def test_preserves_percent_encoding_in_value(self):
        # P1-1: 값 안의 %2F, %26 등이 디코드되어 구분자로 바뀌면 안 된다.
        raw = "https://example.com/a?next=%2Ffoo%3Fa%3D1%26b%3D2&sig=a%2Bb%3D"
        self.assertEqual(normalize_url(raw), raw)

    def test_preserves_plus_and_blank_values(self):
        raw = "https://example.com/a?x=a+b&empty=&flag"
        self.assertEqual(normalize_url(raw), raw)

    def test_does_not_merge_trailing_slash(self):
        self.assertNotEqual(
            normalize_url("https://example.com/a"),
            normalize_url("https://example.com/a/"),
        )


class BadUrlIsolationTest(unittest.TestCase):
    def test_bad_port_item_isolated_not_whole_feed(self):
        # P1-2: 잘못된 port를 가진 item 하나가 나머지를 죽이면 안 된다.
        feed = build_rss(
            item_xml("잘못된 포트", "https://example.com:bad/a")
            + item_xml("정상 글", "https://blog.example.com/good")
        )
        source = make_source()
        candidates = parser.parse_feed(feed, source)  # 예외 없이 통과해야 한다
        self.assertEqual(len(candidates), 2)

        plan = planner.build_plan(source, candidates, set(), mode="dry_run")
        statuses = {i.title: (i.status, i.reject_reason) for i in plan.items}
        self.assertEqual(statuses["잘못된 포트"][0], ItemStatus.REJECTED)
        self.assertEqual(statuses["잘못된 포트"][1], RejectReason.INVALID_URL)
        self.assertEqual(statuses["정상 글"][0], ItemStatus.PLANNED_NEW)


class FeedParseFailureTest(unittest.TestCase):
    def test_bozo_feed_raises(self):
        from app.content.models import FeedError, PipelineError

        broken = b"<rss><channel><item><title>no close"
        with self.assertRaises(PipelineError) as ctx:
            parser.parse_feed(broken, make_source())
        self.assertEqual(ctx.exception.code, FeedError.FEED_PARSE_ERROR)


class SaveAggregatePreservationTest(unittest.TestCase):
    def test_planned_counts_survive_status_mutation(self):
        # P1-3: save가 item 상태를 inserted로 바꿔도 계획 집계가 유지돼야 한다.
        feed = build_rss(item_xml("글1", "https://blog.example.com/1", pub=""))
        source = make_source()
        candidates = parser.parse_feed(feed, source)
        plan = planner.build_plan(source, candidates, set(), mode="save")
        self.assertEqual(plan.planned_new_count, 1)
        self.assertEqual(plan.missing_published_at_count, 1)  # pub 비어 있음
        self.assertEqual(plan.missing_published_at_ratio, 1.0)

        # save를 흉내 내 상태를 바꾼다.
        for item in plan.items:
            if item.status == ItemStatus.PLANNED_NEW:
                item.status = ItemStatus.INSERTED

        # 고정 집계는 그대로여야 한다.
        self.assertEqual(plan.planned_new_count, 1)
        self.assertEqual(plan.missing_published_at_count, 1)
        self.assertEqual(plan.missing_published_at_ratio, 1.0)


class InterestMetricsTest(unittest.TestCase):
    def test_source_rule_tag_distribution(self):
        # P1-4: 관심사 태깅 지표가 계산돼야 한다.
        feed = build_rss(
            item_xml("글1", "https://blog.example.com/1")
            + item_xml("글2", "https://blog.example.com/2")
        )
        source = make_source(interests=(("IT·개발", 1.0), ("AI", 0.5)))
        candidates = parser.parse_feed(feed, source)
        plan = planner.build_plan(source, candidates, set(), mode="dry_run")
        self.assertEqual(plan.planned_new_count, 2)
        self.assertEqual(plan.interest_tag_counts, {"IT·개발": 2, "AI": 2})
        self.assertEqual(plan.tagging_method_counts, {"source_rule": 2})
        self.assertEqual(plan.untagged_count, 0)


if __name__ == "__main__":
    unittest.main()
