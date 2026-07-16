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

if __name__ == "__main__":
    unittest.main()
