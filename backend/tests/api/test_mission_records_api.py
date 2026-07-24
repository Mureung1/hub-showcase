"""사고 기록 저장 API 단위 테스트.

외부 I/O 경계(Supabase client)만 fake로 대체한다.
실행: cd backend && python -m unittest tests.test_mission_records_api -v
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


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeArticlesExistsQuery:
    def __init__(self, existing_ids: set[str]):
        self._existing_ids = existing_ids
        self._id: str | None = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, _field: str, value: str):
        self._id = value
        return self

    def execute(self):
        rows = [{"id": self._id}] if self._id in self._existing_ids else []
        return _FakeResult(rows)


class _FakeMissionRecordsInsertQuery:
    def __init__(self, client: "FakeMissionRecordsClient"):
        self._client = client
        self._payload: dict | None = None

    def insert(self, payload: dict):
        self._payload = payload
        return self

    def execute(self):
        self._client.insert_calls.append(self._payload)
        row = {
            **self._payload,
            "id": f"50000000-0000-0000-0000-{len(self._client.insert_calls):012d}",
            "created_at": "2026-07-20T05:00:00Z",
        }
        return _FakeResult([row])


class FakeMissionRecordsClient:
    def __init__(self, existing_article_ids=None):
        self.existing_article_ids = set(existing_article_ids or [])
        self.insert_calls: list[dict] = []

    def table(self, name: str):
        if name == "articles":
            return _FakeArticlesExistsQuery(self.existing_article_ids)
        if name == "mission_records":
            return _FakeMissionRecordsInsertQuery(self)
        raise AssertionError(f"unexpected table: {name}")


def override_user(client: FakeMissionRecordsClient) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
    app.dependency_overrides[get_user_client] = lambda: client


class MissionRecordsApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(app.dependency_overrides.clear)

    def test_valid_request_returns_201_with_correct_insert_payload_and_response(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "우리 팀 온보딩도 결국 같은 문제다.",
            },
        )
        self.assertEqual(response.status_code, 201)

        self.assertEqual(len(fake.insert_calls), 1)
        payload = fake.insert_calls[0]
        self.assertEqual(payload["user_id"], TEST_USER_ID)
        self.assertEqual(payload["article_id"], ARTICLE_A)
        self.assertEqual(payload["mission_type"], "connection")
        self.assertEqual(payload["mission_prompt"], "내 상황이나 프로젝트와 연결해보면?")
        self.assertEqual(payload["user_answer"], "우리 팀 온보딩도 결국 같은 문제다.")
        self.assertIsNone(payload["selected_quote"])
        self.assertEqual(payload["anchor_type"], "whole_content")

        body = response.json()
        self.assertEqual(body["articleId"], ARTICLE_A)
        self.assertEqual(body["missionType"], "connection")
        self.assertEqual(body["missionPrompt"], "내 상황이나 프로젝트와 연결해보면?")
        self.assertEqual(body["userAnswer"], "우리 팀 온보딩도 결국 같은 문제다.")
        self.assertIsNone(body["selectedQuote"])
        self.assertEqual(body["anchorType"], "whole_content")
        self.assertEqual(body["createdAt"], "2026-07-20T05:00:00Z")


    def test_each_mission_type_saves_correct_server_prompt(self):
        expected_prompts = {
            "question": "이 글의 핵심 주장은 뭐지?",
            "rebuttal": "이 주장에 반대한다면?",
            "connection": "내 상황이나 프로젝트와 연결해보면?",
            "expression": "이 글이 놓친 관점은 뭐지?",
        }
        for mission_type, prompt in expected_prompts.items():
            with self.subTest(mission_type=mission_type):
                fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
                override_user(fake)
                response = self.client.post(
                    "/api/mission-records",
                    headers=AUTH_HEADER,
                    json={
                        "articleId": ARTICLE_A,
                        "missionType": mission_type,
                        "userAnswer": "생각을 정리해봤다.",
                    },
                )
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.json()["missionPrompt"], prompt)
                app.dependency_overrides.clear()

    def test_unknown_mission_type_returns_422_without_insert(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "not-a-real-type",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "VALIDATION_ERROR")
        self.assertEqual(fake.insert_calls, [])

    def test_empty_and_whitespace_only_answer_returns_422(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        for answer in ("", "   ", "\t\n  "):
            with self.subTest(answer=repr(answer)):
                response = self.client.post(
                    "/api/mission-records",
                    headers=AUTH_HEADER,
                    json={
                        "articleId": ARTICLE_A,
                        "missionType": "connection",
                        "userAnswer": answer,
                    },
                )
                self.assertEqual(response.status_code, 422)
        self.assertEqual(fake.insert_calls, [])

    def test_blocked_lazy_answers_and_whitespace_variants_return_422(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        blocked = ["네", "아니요", "ㅇㅇ", "ㄴㄴ", "몰라", "모름"]
        variants = blocked + [f"  {word}  " for word in blocked] + ["몰라  \n 모름".split()[0]]
        variants.append("  네   ")
        for answer in variants:
            with self.subTest(answer=repr(answer)):
                response = self.client.post(
                    "/api/mission-records",
                    headers=AUTH_HEADER,
                    json={
                        "articleId": ARTICLE_A,
                        "missionType": "connection",
                        "userAnswer": answer,
                    },
                )
                self.assertEqual(response.status_code, 422)
        self.assertEqual(fake.insert_calls, [])

    def test_valid_answer_is_saved_with_normalized_whitespace(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "  우리 팀   온보딩도    결국  같은 문제다.  ",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            fake.insert_calls[0]["user_answer"], "우리 팀 온보딩도 결국 같은 문제다."
        )
        self.assertEqual(
            response.json()["userAnswer"], "우리 팀 온보딩도 결국 같은 문제다."
        )

    def test_forged_server_fields_and_unknown_field_return_422(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        base_body = {
            "articleId": ARTICLE_A,
            "missionType": "connection",
            "userAnswer": "생각을 정리해봤다.",
        }
        forged_fields = {
            "userId": "99999999-0000-0000-0000-000000000099",
            "missionPrompt": "내가 정한 질문",
            "anchorType": "highlight",
            "selectedQuote": "인상 깊은 문장",
            "unknownField": "value",
        }
        for field, value in forged_fields.items():
            with self.subTest(field=field):
                override_user(fake)
                response = self.client.post(
                    "/api/mission-records",
                    headers=AUTH_HEADER,
                    json={**base_body, field: value},
                )
                self.assertEqual(response.status_code, 422)
                app.dependency_overrides.clear()
        self.assertEqual(fake.insert_calls, [])

    def test_missing_article_returns_404_without_insert(self):
        fake = FakeMissionRecordsClient(existing_article_ids=set())
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["code"], "NOT_FOUND")
        self.assertEqual(fake.insert_calls, [])

    def test_missing_token_returns_401(self):
        response = self.client.post(
            "/api/mission-records",
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")

    def test_insert_payload_user_id_comes_from_auth_not_request(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(fake.insert_calls[0]["user_id"], TEST_USER_ID)

    def test_insert_payload_has_no_engagement_fields(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(response.status_code, 201)
        payload = fake.insert_calls[0]
        self.assertNotIn("opened_original_at", payload)
        self.assertNotIn("returned_from_original_at", payload)
        self.assertNotIn("minimum_engagement_met", payload)

    def test_same_user_and_article_twice_creates_two_distinct_records(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        body = {
            "articleId": ARTICLE_A,
            "missionType": "connection",
            "userAnswer": "생각을 정리해봤다.",
        }
        first = self.client.post("/api/mission-records", headers=AUTH_HEADER, json=body)
        second = self.client.post("/api/mission-records", headers=AUTH_HEADER, json=body)

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(len(fake.insert_calls), 2)
        self.assertNotEqual(first.json()["id"], second.json()["id"])

    def test_response_key_set_matches_camelcase_contract(self):
        fake = FakeMissionRecordsClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        response = self.client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(
            set(response.json().keys()),
            {
                "id",
                "articleId",
                "missionType",
                "missionPrompt",
                "userAnswer",
                "selectedQuote",
                "anchorType",
                "createdAt",
            },
        )

    def test_internal_db_error_is_not_leaked_in_response(self):
        class _ExplodingInsertQuery:
            def insert(self, _payload):
                return self

            def execute(self):
                raise RuntimeError("db connection string postgres://user:secret@host/db failed")

        class _ExplodingClient(FakeMissionRecordsClient):
            def table(self, name: str):
                if name == "mission_records":
                    return _ExplodingInsertQuery()
                return super().table(name)

        fake = _ExplodingClient(existing_article_ids={ARTICLE_A})
        override_user(fake)
        no_raise_client = TestClient(app, raise_server_exceptions=False)
        response = no_raise_client.post(
            "/api/mission-records",
            headers=AUTH_HEADER,
            json={
                "articleId": ARTICLE_A,
                "missionType": "connection",
                "userAnswer": "생각을 정리해봤다.",
            },
        )
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("secret", response.text)
        self.assertNotIn("postgres://", response.text)


if __name__ == "__main__":
    unittest.main()
