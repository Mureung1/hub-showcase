"""글 상세 조회 API 단위 테스트.

외부 I/O 경계(Supabase client)만 fake로 대체한다.
실행: cd backend && python -m unittest tests.test_article_detail_api -v
"""

from __future__ import annotations

import os
import unittest

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "sb_secret_test")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id, get_user_client
from app.main import app

TEST_USER_ID = "10000000-0000-0000-0000-000000000001"
AUTH_HEADER = {"Authorization": "Bearer test-token"}

ARTICLE_A = "40000000-0000-0000-0000-000000000001"

ARTICLE_A_ROW = {
    "id": ARTICLE_A,
    "title": "글 제목",
    "translated_title": None,
    "canonical_url": "https://example.com/article",
    "published_at": "2026-07-14T03:00:00Z",
    "author": None,
    "official_excerpt": "원출처가 제공한 소개문",
    "translated_excerpt": None,
    "reading_time_minutes": 5,
    "language": "ko",
    "access_type": "free",
    "url_status": "active",
    "content_type": "blog",
    "source_type": "official_blog",
    "sources": {"name": "Toss Tech"},
}


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeArticleDetailQuery:
    def __init__(self, rows: list[dict]):
        self._rows = rows
        self._id: str | None = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, _field: str, value: str):
        self._id = value
        return self

    def execute(self):
        matched = [row for row in self._rows if row["id"] == self._id]
        return _FakeResult(matched)


class FakeArticleDetailClient:
    def __init__(self, articles=None):
        self.articles = articles or []

    def table(self, name: str):
        if name == "articles":
            return _FakeArticleDetailQuery(self.articles)
        raise AssertionError(f"unexpected table: {name}")


def override_user(client: FakeArticleDetailClient) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    app.dependency_overrides[get_user_client] = lambda: client


class ArticleDetailApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(app.dependency_overrides.clear)

    def test_valid_article_id_returns_200(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)

    def test_response_matches_field_values_and_key_set(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        body = response.json()

        self.assertEqual(
            set(body.keys()),
            {
                "id",
                "title",
                "translatedTitle",
                "sourceName",
                "sourceType",
                "contentType",
                "publishedAt",
                "author",
                "officialExcerpt",
                "translatedExcerpt",
                "readingTimeMinutes",
                "language",
                "accessType",
                "urlStatus",
                "originalUrl",
                "recommendedMission",
                "missionOptions",
            },
        )
        self.assertEqual(body["id"], ARTICLE_A)
        self.assertEqual(body["title"], "글 제목")
        self.assertIsNone(body["translatedTitle"])
        self.assertEqual(body["sourceName"], "Toss Tech")
        self.assertEqual(body["sourceType"], "official_blog")
        self.assertEqual(body["contentType"], "blog")
        self.assertEqual(body["publishedAt"], "2026-07-14T03:00:00Z")
        self.assertIsNone(body["author"])
        self.assertEqual(body["officialExcerpt"], "원출처가 제공한 소개문")
        self.assertIsNone(body["translatedExcerpt"])
        self.assertEqual(body["readingTimeMinutes"], 5)
        self.assertEqual(body["language"], "ko")
        self.assertEqual(body["accessType"], "free")
        self.assertEqual(body["urlStatus"], "active")
        self.assertEqual(body["originalUrl"], "https://example.com/article")

    def test_mission_options_has_exactly_four_unique_types_in_fixed_order(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        options = response.json()["missionOptions"]

        self.assertEqual(len(options), 4)
        types = [option["type"] for option in options]
        self.assertEqual(len(set(types)), 4)
        self.assertEqual(types, ["question", "rebuttal", "connection", "expression"])

    def test_mission_prompts_match_server_definition(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        prompts_by_type = {
            option["type"]: option["prompt"] for option in response.json()["missionOptions"]
        }

        self.assertEqual(
            prompts_by_type,
            {
                "question": "이 글의 핵심 주장은 뭐지?",
                "rebuttal": "이 주장에 반대한다면?",
                "connection": "내 상황이나 프로젝트와 연결해보면?",
                "expression": "이 글이 놓친 관점은 뭐지?",
            },
        )

    def test_recommended_mission_is_connection_and_matches_options(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        body = response.json()

        self.assertEqual(body["recommendedMission"]["type"], "connection")
        connection_option = next(
            option for option in body["missionOptions"] if option["type"] == "connection"
        )
        self.assertEqual(body["recommendedMission"], connection_option)

    def test_recommended_mission_is_stable_across_repeated_requests(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        first = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        second = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)

        self.assertEqual(first.json()["recommendedMission"], second.json()["recommendedMission"])

    def test_response_has_no_original_content_replacement_fields(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        body = response.json()

        forbidden_fields = {
            "body",
            "content",
            "sentences",
            "paragraphs",
            "summary",
            "aiSummary",
            "fullText",
            "rawHtml",
            "contentHtml",
            "markdown",
            "selectedQuote",
            "anchorType",
            "userId",
        }
        self.assertEqual(set(body.keys()) & forbidden_fields, set())

    def test_url_status_active_is_returned_as_is(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.json()["urlStatus"], "active")

    def test_broken_article_returns_200_with_broken_url_status(self):
        broken_row = {**ARTICLE_A_ROW, "url_status": "broken"}
        fake = FakeArticleDetailClient(articles=[broken_row])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["urlStatus"], "broken")

    def test_removed_article_returns_200_with_removed_url_status(self):
        removed_row = {**ARTICLE_A_ROW, "url_status": "removed"}
        fake = FakeArticleDetailClient(articles=[removed_row])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["urlStatus"], "removed")

    def test_paywalled_article_returns_200_with_paywalled_url_status(self):
        paywalled_row = {**ARTICLE_A_ROW, "url_status": "paywalled"}
        fake = FakeArticleDetailClient(articles=[paywalled_row])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["urlStatus"], "paywalled")

    def test_does_not_call_a_separate_recommendation_rpc(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        self.assertFalse(hasattr(fake, "rpc"))
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)

    def test_unknown_article_id_returns_404(self):
        fake = FakeArticleDetailClient(articles=[])
        override_user(fake)
        unknown_id = "40000000-0000-0000-0000-000000000099"
        response = self.client.get(f"/api/articles/{unknown_id}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "NOT_FOUND")

    def test_invalid_uuid_returns_422(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get("/api/articles/not-a-uuid", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

    def test_missing_token_returns_401(self):
        response = self.client.get(f"/api/articles/{ARTICLE_A}")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")

    def test_lookup_uses_user_client_not_admin_client(self):
        fake = FakeArticleDetailClient(articles=[ARTICLE_A_ROW])
        override_user(fake)
        response = self.client.get(f"/api/articles/{ARTICLE_A}", headers=AUTH_HEADER)
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(
            app.dependency_overrides[get_user_client](), FakeArticleDetailClient
        )


if __name__ == "__main__":
    unittest.main()
