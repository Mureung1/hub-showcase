"""오늘의 깸 카드 API 단위 테스트.

외부 I/O 경계(Supabase client)만 fake로 대체한다.
DB 제약, RLS, RPC 권한, 동시성은 local Supabase 통합 테스트(pgTAP)로 검증한다.
실행: cd backend && python -m unittest tests.test_articles_today_api -v
"""

from __future__ import annotations

import os
import unittest

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "sb_secret_test")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id, get_user_client
from app.api.routes.articles import CANDIDATE_EMPTY_MESSAGE, ONBOARDING_EMPTY_MESSAGE
from app.main import app

TEST_USER_ID = "10000000-0000-0000-0000-000000000001"
AUTH_HEADER = {"Authorization": "Bearer test-token"}

INTEREST_AI = {
    "id": "20000000-0000-0000-0000-000000000001",
    "name": "AI",
    "display_order": 1,
    "empty_state_message": "AI 관심사에 맞는 글을 준비하고 있어요.",
}
ARTICLE_A = "40000000-0000-0000-0000-000000000001"
ARTICLE_B = "40000000-0000-0000-0000-000000000002"


def make_article_row(article_id: str, title: str, tags=None) -> dict:
    if tags is None:
        tags = [
            {
                "confidence": 1.0,
                "interests": {
                    "id": INTEREST_AI["id"],
                    "name": INTEREST_AI["name"],
                    "display_order": INTEREST_AI["display_order"],
                },
            }
        ]
    return {
        "id": article_id,
        "title": title,
        "translated_title": None,
        "canonical_url": f"https://example.com/{article_id}",
        "published_at": "2026-07-14T03:00:00Z",
        "official_excerpt": "원출처가 제공한 소개문",
        "translated_excerpt": None,
        "thumbnail_url": None,
        "reading_time_minutes": 5,
        "language": "ko",
        "access_type": "free",
        "content_type": "article",
        "source_type": "expert_article",
        "sources": {"name": "요즘IT"},
        "content_interest_tags": tags,
    }


ARTICLE_A_ROW = make_article_row(ARTICLE_A, "A 글")
ARTICLE_B_ROW = make_article_row(ARTICLE_B, "B 글")


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeUserInterestsQuery:
    def __init__(self, interests: list[dict]):
        self._interests = interests

    def select(self, *_args, **_kwargs):
        return self

    def execute(self):
        return _FakeResult([{"interests": interest} for interest in self._interests])


class _FakeArticlesQuery:
    def __init__(self, rows: list[dict]):
        self._rows = rows
        self._ids: list[str] | None = None

    def select(self, *_args, **_kwargs):
        return self

    def in_(self, _field: str, ids: list[str]):
        self._ids = ids
        return self

    def execute(self):
        wanted = set(self._ids or [])
        return _FakeResult([row for row in self._rows if row["id"] in wanted])


class _FakeRpcQuery:
    def __init__(self, client: "FakeTodayClient", name: str, params: dict):
        self._client = client
        self._name = name
        self._params = params

    def execute(self):
        self._client.recommendation_rpc_calls += 1
        return _FakeResult(self._client.recommendations)


class FakeTodayClient:
    def __init__(self, user_interests=None, recommendations=None, articles=None):
        self.user_interests = user_interests or []
        self.recommendations = recommendations or []
        self.articles = articles or []
        self.recommendation_rpc_calls = 0

    def table(self, name: str):
        if name == "user_interests":
            return _FakeUserInterestsQuery(self.user_interests)
        if name == "articles":
            return _FakeArticlesQuery(self.articles)
        raise AssertionError(f"unexpected table: {name}")

    def rpc(self, name: str, params: dict):
        return _FakeRpcQuery(self, name, params)


def override_user(client: FakeTodayClient) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    app.dependency_overrides[get_user_client] = lambda: client


class ArticlesTodayApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(app.dependency_overrides.clear)

    def test_no_interests_returns_onboarding_empty_without_rpc(self):
        fake = FakeTodayClient(user_interests=[], recommendations=[])
        override_user(fake)
        response = self.client.get("/api/articles/today", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["items"], [])
        self.assertEqual(body["emptyStateMessage"], ONBOARDING_EMPTY_MESSAGE)
        self.assertEqual(fake.recommendation_rpc_calls, 0)

    def test_hydration_preserves_rpc_order(self):
        fake = FakeTodayClient(
            user_interests=[INTEREST_AI],
            recommendations=[{"article_id": ARTICLE_B}, {"article_id": ARTICLE_A}],
            articles=[ARTICLE_A_ROW, ARTICLE_B_ROW],
        )
        override_user(fake)
        response = self.client.get("/api/articles/today?limit=2", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.json()["items"]],
            [ARTICLE_B, ARTICLE_A],
        )

    def test_limit_validation(self):
        fake = FakeTodayClient(user_interests=[INTEREST_AI])
        override_user(fake)
        for value in (0, 4):
            with self.subTest(limit=value):
                response = self.client.get(
                    f"/api/articles/today?limit={value}", headers=AUTH_HEADER
                )
                self.assertEqual(response.status_code, 422)

    def test_card_contains_no_body_or_sentences(self):
        fake = FakeTodayClient(
            user_interests=[INTEREST_AI],
            recommendations=[{"article_id": ARTICLE_A}],
            articles=[ARTICLE_A_ROW],
        )
        override_user(fake)
        response = self.client.get("/api/articles/today", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertNotIn("body", item)
        self.assertNotIn("sentences", item)
        self.assertNotIn("summary", item)

    def test_reason_tie_breaks_by_confidence_display_order_and_id(self):
        # 세 태그가 각 tie-break 키를 순서대로 강제한다.
        # tag_high: confidence 0.9 -> 압도적으로 높으면 즉시 승리(대조군)
        # tag_a/tag_b: confidence 0.5로 동률, display_order로 승부(display_order 낮은 쪽 승)
        # tag_b/tag_c: confidence 0.5, display_order 1로 동률 -> interest_id로 승부
        tags = [
            {
                "confidence": 0.5,
                "interests": {
                    "id": "30000000-0000-0000-0000-000000000003",
                    "name": "커리어",
                    "display_order": 2,
                },
            },
            {
                "confidence": 0.5,
                "interests": {
                    "id": "30000000-0000-0000-0000-000000000002",
                    "name": "IT",
                    "display_order": 1,
                },
            },
            {
                "confidence": 0.5,
                "interests": {
                    "id": "30000000-0000-0000-0000-000000000001",
                    "name": "AI",
                    "display_order": 1,
                },
            },
        ]
        article_row = make_article_row(ARTICLE_A, "A 글", tags=tags)
        selected_interests = [
            {
                "id": tag["interests"]["id"],
                "name": tag["interests"]["name"],
                "display_order": tag["interests"]["display_order"],
                "empty_state_message": None,
            }
            for tag in tags
        ]
        fake = FakeTodayClient(
            user_interests=selected_interests,
            recommendations=[{"article_id": ARTICLE_A}],
            articles=[article_row],
        )
        override_user(fake)
        response = self.client.get("/api/articles/today", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        item = response.json()["items"][0]
        self.assertEqual(item["recommendationReason"], "AI 관심사와 맞는 글이에요.")

    def test_empty_state_uses_common_message_when_selected_messages_are_null(self):
        interest = {**INTEREST_AI, "empty_state_message": None}
        fake = FakeTodayClient(user_interests=[interest], recommendations=[])
        override_user(fake)
        response = self.client.get("/api/articles/today", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["items"], [])
        self.assertEqual(body["emptyStateMessage"], CANDIDATE_EMPTY_MESSAGE)

    def test_today_requires_token(self):
        response = self.client.get("/api/articles/today")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")


if __name__ == "__main__":
    unittest.main()
