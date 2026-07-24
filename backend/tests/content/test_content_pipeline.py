"""콘텐츠 수집 파이프라인 회귀 테스트.

네트워크·실DB 없이 검증한다. 코드 리뷰(2026-07-16) 1·2차 지적을 고정한다.
외부 I/O(fetcher.fetch_feed, repository.*)는 모의로 주입한다.
실행: cd backend && python -m unittest
"""

from __future__ import annotations

import os
import unittest
from datetime import datetime, timezone
from unittest import mock

# service는 import 시점에 설정을 읽으므로 더미 값을 넣는다(실 비밀키 불필요).
os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "sb_secret_test")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

import httpx

from app.content import fetcher, parser, planner, service
from app.content.models import (
    FeedError,
    FetchResult,
    ItemStatus,
    PipelineError,
    RejectReason,
    SourceConfig,
)
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


def eligible_row() -> dict:
    return dict(
        id="00000000-0000-0000-0000-000000000001",
        name="테스트 블로그",
        feed_url="https://blog.example.com/feed",
        source_type="official_blog",
        collection_method="rss",
        language="ko",
        default_exposure="primary",
        trust_level="high",
        active=True,
        paywall_risk="low",
        source_quality_score=0.7,
        content_type="blog",
        excerpt_field="summary",
        default_reading_time_minutes=7,
    )


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

    def test_idna_failure_raises(self):
        # 2차 리뷰: IDNA 변환 실패는 fallback하지 말고 예외를 올려야 한다.
        bad_host = "https://" + ("é" * 64) + ".com/a"
        with self.assertRaises(UnicodeError):
            normalize_url(bad_host)


class BadUrlIsolationTest(unittest.TestCase):
    def test_bad_port_item_isolated(self):
        feed = build_rss(
            item_xml("잘못된 포트", "https://example.com:bad/a")
            + item_xml("정상 글", "https://blog.example.com/good")
        )
        source = make_source()
        candidates = parser.parse_feed(feed, source)
        self.assertEqual(len(candidates), 2)
        plan = planner.build_plan(source, candidates, set(), mode="dry_run")
        statuses = {i.title: (i.status, i.reject_reason) for i in plan.items}
        self.assertEqual(statuses["잘못된 포트"], (ItemStatus.REJECTED, RejectReason.INVALID_URL))
        self.assertEqual(statuses["정상 글"][0], ItemStatus.PLANNED_NEW)

    def test_idna_failure_item_isolated(self):
        # 2차 리뷰: IDNA 실패 URL도 격리되고 나머지 item은 처리돼야 한다.
        bad = "https://" + ("한" * 64) + ".com/a"
        feed = build_rss(
            item_xml("잘못된 IDN", bad) + item_xml("정상 글", "https://blog.example.com/good")
        )
        source = make_source()
        candidates = parser.parse_feed(feed, source)
        self.assertEqual(len(candidates), 2)
        plan = planner.build_plan(source, candidates, set(), mode="dry_run")
        statuses = {i.title: (i.status, i.reject_reason) for i in plan.items}
        self.assertEqual(statuses["잘못된 IDN"], (ItemStatus.REJECTED, RejectReason.INVALID_URL))
        self.assertEqual(statuses["정상 글"][0], ItemStatus.PLANNED_NEW)


class FeedParseFailureTest(unittest.TestCase):
    def test_bozo_feed_raises(self):
        broken = b"<rss><channel><item><title>no close"
        with self.assertRaises(PipelineError) as ctx:
            parser.parse_feed(broken, make_source())
        self.assertEqual(ctx.exception.code, FeedError.FEED_PARSE_ERROR)


class FeedTimezoneFallbackTest(unittest.TestCase):
    def test_timezone_less_date_uses_source_timezone(self):
        feed = build_rss(
            item_xml(
                "DEVOCEAN 글",
                "https://devocean.sk.com/blog/1",
                pub="Tue, 30 Jun 2026 13:04:43",
            )
        )

        candidates = parser.parse_feed(
            feed,
            make_source(feed_timezone="Asia/Seoul"),
        )

        self.assertEqual(
            candidates[0].published_at,
            datetime(2026, 6, 30, 4, 4, 43, tzinfo=timezone.utc),
        )

    def test_source_config_loads_feed_timezone(self):
        row = eligible_row()
        row["feed_timezone"] = "Asia/Seoul"

        with mock.patch.object(service.repository, "fetch_source_row", return_value=row), \
             mock.patch.object(
                 service.repository,
                 "fetch_source_interests",
                 return_value=[("IT·개발", 1.0)],
             ):
            source = service.load_source_config(row["id"])

        self.assertEqual(source.feed_timezone, "Asia/Seoul")


class FetchSizeLimitTest(unittest.TestCase):
    def test_oversize_response_fails(self):
        # P2-1: 5MiB 초과 응답은 FETCH_TOO_LARGE로 실패한다.
        big = b"x" * (fetcher.MAX_RESPONSE_BYTES + 1)

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=big)

        transport = httpx.MockTransport(handler)
        with self.assertRaises(PipelineError) as ctx:
            fetcher.fetch_feed("https://blog.example.com/feed", transport=transport)
        self.assertEqual(ctx.exception.code, FeedError.FETCH_TOO_LARGE)

    def test_within_limit_succeeds(self):
        body = build_rss(item_xml("글1", "https://blog.example.com/1"))

        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, content=body)

        transport = httpx.MockTransport(handler)
        result = fetcher.fetch_feed("https://blog.example.com/feed", transport=transport)
        self.assertIsInstance(result, FetchResult)
        self.assertEqual(result.content, body)


class SaveExecutionTest(unittest.TestCase):
    """실제 service._save()·service.run(save)을 가짜 repository로 실행한다."""

    def _run_save(self, ingest_side_effect):
        source = make_source()
        feed = build_rss(
            item_xml("글1", "https://blog.example.com/1")
            + item_xml("글2", "https://blog.example.com/2", pub="")  # 발행일 없음
        )
        with mock.patch.object(service.repository, "fetch_source_row", return_value=eligible_row()), \
             mock.patch.object(service.repository, "fetch_source_interests", return_value=[("IT·개발", 1.0)]), \
             mock.patch.object(service.fetcher, "fetch_feed", return_value=FetchResult("https://blog.example.com/feed", feed)), \
             mock.patch.object(service.repository, "fetch_existing_canonical_urls", return_value=set()), \
             mock.patch.object(service.repository, "ingest_article", side_effect=ingest_side_effect) as ingest:
            plan = service.run(source.id, service.MODE_SAVE)
        return plan, ingest

    def test_save_preserves_plan_aggregates(self):
        # 2차 리뷰: 실제 _save() 실행 후에도 계획 집계가 유지돼야 한다.
        plan, ingest = self._run_save(lambda sid, item: {"status": "inserted", "article_id": "x"})
        self.assertEqual(ingest.call_count, 2)
        self.assertEqual(plan.planned_new_count, 2)          # 계획 시점 값 유지
        self.assertEqual(plan.missing_published_at_count, 1)  # 글2 발행일 없음
        self.assertEqual(plan.inserted_count, 2)
        self.assertEqual(plan.failed_count, 0)
        self.assertEqual(plan.run_status, "success")
        self.assertTrue(all(i.status == ItemStatus.INSERTED for i in plan.items))

    def test_partial_failure_continues_and_marks_status(self):
        # 리뷰: RPC 일부 실패 후 다음 item 계속, run_status=partial_failure.
        def side_effect(sid, item):
            if item.canonical_url.endswith("/1"):
                raise RuntimeError("rpc down")
            return {"status": "inserted", "article_id": "x"}

        plan, ingest = self._run_save(side_effect)
        self.assertEqual(ingest.call_count, 2)  # 첫 실패에도 두 번째 시도
        self.assertEqual(plan.inserted_count, 1)
        self.assertEqual(plan.failed_count, 1)
        self.assertEqual(plan.planned_new_count, 2)  # 계획 집계 유지
        self.assertEqual(plan.run_status, "partial_failure")

    def test_dry_run_never_writes(self):
        # 리뷰: dry-run은 저장 함수를 호출하지 않아야 한다(행 수 불변의 코드 수준 보장).
        source = make_source()
        feed = build_rss(item_xml("글1", "https://blog.example.com/1"))
        with mock.patch.object(service.repository, "fetch_source_row", return_value=eligible_row()), \
             mock.patch.object(service.repository, "fetch_source_interests", return_value=[("IT·개발", 1.0)]), \
             mock.patch.object(service.fetcher, "fetch_feed", return_value=FetchResult("https://blog.example.com/feed", feed)), \
             mock.patch.object(service.repository, "fetch_existing_canonical_urls", return_value=set()), \
             mock.patch.object(service.repository, "ingest_article") as ingest:
            plan = service.run(source.id, service.MODE_DRY_RUN)
        ingest.assert_not_called()
        self.assertEqual(plan.planned_new_count, 1)


class InterestMetricsTest(unittest.TestCase):
    def test_source_rule_tag_distribution(self):
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
