"""사용자 관심사 조회·저장 API 단위 테스트.

외부 I/O 경계(Supabase client)만 fake로 대체한다.
DB 제약, RLS, RPC 권한, 동시성은 local Supabase 통합 테스트(pgTAP)로 검증한다.
실행: cd backend && python -m unittest tests.test_user_interests_api -v
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
ID_1 = "20000000-0000-0000-0000-000000000001"
ID_2 = "20000000-0000-0000-0000-000000000002"
ID_3 = "20000000-0000-0000-0000-000000000003"
ID_4 = "20000000-0000-0000-0000-000000000004"
AUTH_HEADER = {"Authorization": "Bearer test-token"}


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeTableQuery:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *_args, **_kwargs):
        return self

    def execute(self):
        return _FakeResult(self._rows)


class _FakeRpcQuery:
    def __init__(self, client: "FakeUserClient", name: str, params: dict):
        self._client = client
        self._name = name
        self._params = params

    def execute(self):
        self._client.rpc_calls.append((self._name, self._params))
        if self._client.rpc_error is not None:
            raise self._client.rpc_error
        return _FakeResult(self._client.rpc_result)


class FakeUserClient:
    """Supabase user client를 흉내내는 테스트 더블."""

    def __init__(self, rows=None, rpc_result=None, rpc_error=None):
        self._rows = rows or []
        self.rpc_result = rpc_result
        self.rpc_error = rpc_error
        self.rpc_calls: list[tuple[str, dict]] = []

    def table(self, _name: str):
        return _FakeTableQuery(self._rows)

    def rpc(self, name: str, params: dict):
        return _FakeRpcQuery(self, name, params)


class UserInterestsApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(app.dependency_overrides.clear)

    def test_empty_user_returns_onboarding_false(self):
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        app.dependency_overrides[get_user_client] = lambda: FakeUserClient([])
        response = self.client.get(
            "/api/user-interests",
            headers={"Authorization": "Bearer test-token"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"hasCompletedOnboarding": False, "interests": []},
        )

    def test_saved_interests_are_sorted_and_include_inactive(self):
        rows = [
            {
                "interests": {
                    "id": ID_2,
                    "name": "숨김",
                    "display_order": 5,
                    "launch_status": "hidden",
                }
            },
            {
                "interests": {
                    "id": ID_1,
                    "name": "AI",
                    "display_order": 1,
                    "launch_status": "active",
                }
            },
        ]
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        app.dependency_overrides[get_user_client] = lambda: FakeUserClient(rows)
        response = self.client.get(
            "/api/user-interests",
            headers={"Authorization": "Bearer test-token"},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual([x["displayOrder"] for x in body["interests"]], [1, 5])
        self.assertFalse(body["interests"][1]["selectable"])
        for item in body["interests"]:
            self.assertNotIn("display_order", item)
            self.assertNotIn("launch_status", item)

    def test_get_requires_token(self):
        response = self.client.get("/api/user-interests")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")

    def test_post_rejects_empty_duplicate_four_and_extra_fields(self):
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        app.dependency_overrides[get_user_client] = lambda: FakeUserClient()
        invalid_bodies = [
            {"interestIds": []},
            {"interestIds": [ID_1, ID_1]},
            {"interestIds": [ID_1, ID_2, ID_3, ID_4]},
            {"interestIds": [ID_1], "userId": TEST_USER_ID},
        ]
        for body in invalid_bodies:
            with self.subTest(body=body):
                response = self.client.post(
                    "/api/user-interests",
                    json=body,
                    headers=AUTH_HEADER,
                )
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

    def test_post_calls_replace_rpc_and_returns_201(self):
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        fake = FakeUserClient(rpc_result=[ID_1, ID_2])
        app.dependency_overrides[get_user_client] = lambda: fake
        response = self.client.post(
            "/api/user-interests",
            json={"interestIds": [ID_1, ID_2]},
            headers=AUTH_HEADER,
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json(), {"interestIds": [ID_1, ID_2]})
        self.assertEqual(
            fake.rpc_calls,
            [("replace_user_interests", {"p_interest_ids": [ID_1, ID_2]})],
        )

    def test_post_maps_rpc_validation_error_without_leaking_db_text(self):
        app.dependency_overrides[get_current_user_id] = lambda: TEST_USER_ID
        fake = FakeUserClient(
            rpc_error=RuntimeError(
                "INTEREST_NOT_SELECTABLE: select * from private_table"
            )
        )
        app.dependency_overrides[get_user_client] = lambda: fake
        response = self.client.post(
            "/api/user-interests",
            json={"interestIds": [ID_1]},
            headers=AUTH_HEADER,
        )
        self.assertEqual(response.status_code, 422)
        serialized = response.text
        self.assertNotIn("private_table", serialized)
        self.assertNotIn("INTEREST_NOT_SELECTABLE", serialized)

    def test_post_requires_token(self):
        response = self.client.post(
            "/api/user-interests",
            json={"interestIds": [ID_1]},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")


if __name__ == "__main__":
    unittest.main()
