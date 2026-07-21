"""나의 깸 기록 목록 조회 API 단위 테스트.

외부 I/O 경계(Supabase client)만 fake로 대체한다.
실행: cd backend && .venv/bin/python -m unittest tests.test_mission_records_list_api -v
"""

from __future__ import annotations

import os
import unittest
from datetime import datetime

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "sb_secret_test")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test")

from fastapi.testclient import TestClient

from app.api.deps import get_current_user_id, get_user_client
from app.main import app

TEST_USER_ID = "10000000-0000-0000-0000-000000000001"
OTHER_USER_ID = "10000000-0000-0000-0000-000000000002"
AUTH_HEADER = {"Authorization": "Bearer test-token"}

ARTICLE_A = "40000000-0000-0000-0000-000000000001"


def make_record_row(
    record_id: str,
    *,
    user_id: str = TEST_USER_ID,
    article_id: str = ARTICLE_A,
    article_title: str = "A 글",
    source_name: str = "요즘IT",
    interest_tags: list[dict] | None = None,
    mission_type: str = "connection",
    mission_prompt: str = "내 상황이나 프로젝트와 연결해보면?",
    user_answer: str = "생각을 정리해봤다.",
    created_at: str = "2026-07-14T03:00:00Z",
    original_url: str | None = None,
    url_status: str = "active",
) -> dict:
    if interest_tags is None:
        interest_tags = [{"interests": {"id": "20000000-0000-0000-0000-000000000001", "name": "IT·개발"}}]
    return {
        "id": record_id,
        "article_id": article_id,
        "user_id": user_id,
        "mission_type": mission_type,
        "mission_prompt": mission_prompt,
        "user_answer": user_answer,
        "created_at": created_at,
        "articles": {
            "title": article_title,
            "canonical_url": original_url or f"https://example.com/{article_id}",
            "url_status": url_status,
            "sources": {"name": source_name},
            "content_interest_tags": interest_tags,
        },
    }


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeMissionRecordsListQuery:
    def __init__(self, rows: list[dict], recorded_calls: list[tuple[str, str, str]]):
        self._rows = rows
        self._user_id: str | None = None
        self._order_keys: list[tuple[str, bool]] = []
        self._recorded_calls = recorded_calls

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, field: str, value: str):
        self._recorded_calls.append(("eq", field, value))
        if field == "user_id":
            self._user_id = value
        return self

    def gte(self, field: str, value: str):
        self._recorded_calls.append(("gte", field, value))
        return self

    def lt(self, field: str, value: str):
        self._recorded_calls.append(("lt", field, value))
        return self

    def order(self, field: str, desc: bool = False):
        self._order_keys.append((field, desc))
        return self

    def execute(self):
        rows = [row for row in self._rows if row["user_id"] == self._user_id]
        gte_value = next((v for op, f, v in self._recorded_calls if op == "gte" and f == "created_at"), None)
        lt_value = next((v for op, f, v in self._recorded_calls if op == "lt" and f == "created_at"), None)
        if gte_value is not None:
            boundary = datetime.fromisoformat(gte_value)
            rows = [row for row in rows if datetime.fromisoformat(row["created_at"]) >= boundary]
        if lt_value is not None:
            boundary = datetime.fromisoformat(lt_value)
            rows = [row for row in rows if datetime.fromisoformat(row["created_at"]) < boundary]
        for field, desc in reversed(self._order_keys):
            rows = sorted(rows, key=lambda row: row[field], reverse=desc)
        return _FakeResult(rows)


class FakeMissionRecordsListClient:
    def __init__(self, rows: list[dict] | None = None):
        self.rows = rows or []
        self.recorded_calls: list[tuple[str, str, str]] = []

    def table(self, name: str):
        if name == "mission_records":
            return _FakeMissionRecordsListQuery(self.rows, self.recorded_calls)
        raise AssertionError(f"unexpected table: {name}")


def override_user(client: FakeMissionRecordsListClient, user_id: str = TEST_USER_ID) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    app.dependency_overrides[get_user_client] = lambda: client


class MissionRecordsListApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(app.dependency_overrides.clear)

    def test_missing_date_returns_422(self):
        fake = FakeMissionRecordsListClient(rows=[])
        override_user(fake)

        response = self.client.get("/api/mission-records", headers=AUTH_HEADER)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

    def test_sends_created_at_gte_and_lt_with_kst_day_converted_to_utc_boundaries(self):
        fake = FakeMissionRecordsListClient(rows=[])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-21"}
        )

        self.assertEqual(response.status_code, 200)
        gte_calls = [
            (field, value) for op, field, value in fake.recorded_calls if op == "gte"
        ]
        lt_calls = [(field, value) for op, field, value in fake.recorded_calls if op == "lt"]
        self.assertEqual(len(gte_calls), 1)
        self.assertEqual(len(lt_calls), 1)
        gte_field, gte_value = gte_calls[0]
        lt_field, lt_value = lt_calls[0]
        self.assertEqual(gte_field, "created_at")
        self.assertEqual(lt_field, "created_at")
        self.assertEqual(
            datetime.fromisoformat(gte_value).astimezone(),
            datetime.fromisoformat("2026-07-20T15:00:00+00:00"),
        )
        self.assertEqual(
            datetime.fromisoformat(lt_value).astimezone(),
            datetime.fromisoformat("2026-07-21T15:00:00+00:00"),
        )
        eq_calls = [(field, value) for op, field, value in fake.recorded_calls if op == "eq"]
        self.assertIn(("user_id", TEST_USER_ID), eq_calls)

    def test_kst_day_start_instant_record_is_included(self):
        row = make_record_row(
            "50000000-0000-0000-0000-000000000001", created_at="2026-07-20T15:00:00Z"
        )
        fake = FakeMissionRecordsListClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-21"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [row["id"]])

    def test_instant_just_before_kst_day_end_is_included(self):
        row = make_record_row(
            "50000000-0000-0000-0000-000000000001", created_at="2026-07-21T14:59:59Z"
        )
        fake = FakeMissionRecordsListClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-21"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()], [row["id"]])

    def test_next_kst_day_start_instant_is_excluded(self):
        row = make_record_row(
            "50000000-0000-0000-0000-000000000001", created_at="2026-07-21T15:00:00Z"
        )
        fake = FakeMissionRecordsListClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-21"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_previous_day_record_is_excluded(self):
        row = make_record_row(
            "50000000-0000-0000-0000-000000000001", created_at="2026-07-20T14:59:59Z"
        )
        fake = FakeMissionRecordsListClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-21"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_invalid_date_format_and_nonexistent_date_return_422(self):
        fake = FakeMissionRecordsListClient(rows=[])
        override_user(fake)
        for invalid_date in ("2026-13-01", "not-a-date", "2026-02-30", "07-14-2026"):
            with self.subTest(date=invalid_date):
                response = self.client.get(
                    "/api/mission-records",
                    headers=AUTH_HEADER,
                    params={"date": invalid_date},
                )
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

    def test_returns_authenticated_users_own_records(self):
        row = make_record_row("50000000-0000-0000-0000-000000000001")
        fake = FakeMissionRecordsListClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["id"], "50000000-0000-0000-0000-000000000001")
        self.assertEqual(body[0]["userAnswer"], "생각을 정리해봤다.")

    def test_does_not_return_other_users_records(self):
        own_row = make_record_row("50000000-0000-0000-0000-000000000001", user_id=TEST_USER_ID)
        other_row = make_record_row(
            "50000000-0000-0000-0000-000000000002", user_id=OTHER_USER_ID
        )
        fake = FakeMissionRecordsListClient(rows=[own_row, other_row])
        override_user(fake, user_id=TEST_USER_ID)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual([item["id"] for item in body], ["50000000-0000-0000-0000-000000000001"])

    def test_includes_article_information(self):
        row = make_record_row(
            "50000000-0000-0000-0000-000000000001",
            article_id=ARTICLE_A,
            article_title="숏폼 시대, 우리는 정말 더 많이 이해하고 있을까",
            source_name="요즘IT",
            interest_tags=[
                {"interests": {"id": "20000000-0000-0000-0000-000000000001", "name": "IT·개발"}}
            ],
            original_url="https://example.com/short-form",
            url_status="active",
        )
        fake = FakeMissionRecordsListClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        item = response.json()[0]
        self.assertEqual(item["articleId"], ARTICLE_A)
        self.assertEqual(item["articleTitle"], "숏폼 시대, 우리는 정말 더 많이 이해하고 있을까")
        self.assertEqual(item["sourceName"], "요즘IT")
        self.assertEqual(
            item["interestTags"],
            [{"id": "20000000-0000-0000-0000-000000000001", "name": "IT·개발"}],
        )
        self.assertEqual(item["originalUrl"], "https://example.com/short-form")
        self.assertEqual(item["urlStatus"], "active")

    def test_multiple_records_for_same_article_are_returned_as_separate_items(self):
        first = make_record_row(
            "50000000-0000-0000-0000-000000000001",
            article_id=ARTICLE_A,
            mission_type="question",
            user_answer="첫 번째 생각",
            created_at="2026-07-14T01:00:00Z",
        )
        second = make_record_row(
            "50000000-0000-0000-0000-000000000002",
            article_id=ARTICLE_A,
            mission_type="expression",
            user_answer="다시 읽고 든 생각",
            created_at="2026-07-14T10:00:00Z",
        )
        fake = FakeMissionRecordsListClient(rows=[first, second])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body), 2)
        self.assertEqual({item["articleId"] for item in body}, {ARTICLE_A})
        self.assertEqual(
            {item["userAnswer"] for item in body}, {"첫 번째 생각", "다시 읽고 든 생각"}
        )

    def test_orders_by_created_at_desc_then_id_desc(self):
        older = make_record_row(
            "50000000-0000-0000-0000-000000000001", created_at="2026-07-14T01:00:00Z"
        )
        newer = make_record_row(
            "50000000-0000-0000-0000-000000000002", created_at="2026-07-14T05:00:00Z"
        )
        # 같은 시각. id 내림차순으로 tie-break해야 한다.
        same_time_low_id = make_record_row(
            "50000000-0000-0000-0000-000000000003", created_at="2026-07-14T10:00:00Z"
        )
        same_time_high_id = make_record_row(
            "50000000-0000-0000-0000-000000000009", created_at="2026-07-14T10:00:00Z"
        )
        fake = FakeMissionRecordsListClient(
            rows=[older, newer, same_time_low_id, same_time_high_id]
        )
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.json()]
        self.assertEqual(
            ids,
            [
                "50000000-0000-0000-0000-000000000009",
                "50000000-0000-0000-0000-000000000003",
                "50000000-0000-0000-0000-000000000002",
                "50000000-0000-0000-0000-000000000001",
            ],
        )

    def test_returns_empty_array_when_no_records(self):
        fake = FakeMissionRecordsListClient(rows=[])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_keeps_records_for_broken_removed_and_paywalled_articles(self):
        for status in ("broken", "removed", "paywalled"):
            with self.subTest(url_status=status):
                row = make_record_row(
                    "50000000-0000-0000-0000-000000000001", url_status=status
                )
                fake = FakeMissionRecordsListClient(rows=[row])
                override_user(fake)

                response = self.client.get(
                    "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
                )

                self.assertEqual(response.status_code, 200)
                item = response.json()[0]
                self.assertEqual(item["urlStatus"], status)
                app.dependency_overrides.clear()

    def test_missing_token_returns_401(self):
        response = self.client.get("/api/mission-records")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")

    def test_internal_db_error_is_not_leaked_in_response(self):
        class _ExplodingListQuery:
            def select(self, *_args, **_kwargs):
                return self

            def eq(self, *_args, **_kwargs):
                return self

            def gte(self, *_args, **_kwargs):
                return self

            def lt(self, *_args, **_kwargs):
                return self

            def order(self, *_args, **_kwargs):
                return self

            def execute(self):
                raise RuntimeError("db connection string postgres://user:secret@host/db failed")

        class _ExplodingClient(FakeMissionRecordsListClient):
            def table(self, name: str):
                if name == "mission_records":
                    return _ExplodingListQuery()
                return super().table(name)

        fake = _ExplodingClient()
        override_user(fake)
        no_raise_client = TestClient(app, raise_server_exceptions=False)

        response = no_raise_client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("secret", response.text)
        self.assertNotIn("postgres://", response.text)

    def test_lookup_uses_user_client_not_admin_client(self):
        fake = FakeMissionRecordsListClient(rows=[])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records", headers=AUTH_HEADER, params={"date": "2026-07-14"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(
            app.dependency_overrides[get_user_client](), FakeMissionRecordsListClient
        )


if __name__ == "__main__":
    unittest.main()
