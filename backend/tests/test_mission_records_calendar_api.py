"""나의 깸 캘린더 조회 API 단위 테스트.

외부 I/O 경계(Supabase client)만 fake로 대체한다.
실행: cd backend && .venv/bin/python -m unittest tests.test_mission_records_calendar_api -v
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


def make_record_row(user_id: str, created_at: str) -> dict:
    return {"user_id": user_id, "created_at": created_at}


class _FakeResult:
    def __init__(self, data):
        self.data = data


class _FakeMissionRecordsCalendarQuery:
    def __init__(self, rows: list[dict], recorded_calls: list[tuple[str, str, str]]):
        self._rows = rows
        self._user_id: str | None = None
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

    def execute(self):
        rows = [row for row in self._rows if row["user_id"] == self._user_id]
        gte_value = next(
            (v for op, f, v in self._recorded_calls if op == "gte" and f == "created_at"), None
        )
        lt_value = next(
            (v for op, f, v in self._recorded_calls if op == "lt" and f == "created_at"), None
        )
        if gte_value is not None:
            boundary = datetime.fromisoformat(gte_value)
            rows = [row for row in rows if datetime.fromisoformat(row["created_at"]) >= boundary]
        if lt_value is not None:
            boundary = datetime.fromisoformat(lt_value)
            rows = [row for row in rows if datetime.fromisoformat(row["created_at"]) < boundary]
        return _FakeResult(rows)


class FakeMissionRecordsCalendarClient:
    def __init__(self, rows: list[dict] | None = None):
        self.rows = rows or []
        self.recorded_calls: list[tuple[str, str, str]] = []

    def table(self, name: str):
        if name == "mission_records":
            return _FakeMissionRecordsCalendarQuery(self.rows, self.recorded_calls)
        raise AssertionError(f"unexpected table: {name}")


def override_user(client: FakeMissionRecordsCalendarClient, user_id: str = TEST_USER_ID) -> None:
    app.dependency_overrides[get_current_user_id] = lambda: user_id
    app.dependency_overrides[get_user_client] = lambda: client


class MissionRecordsCalendarApiTest(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.addCleanup(app.dependency_overrides.clear)

    def test_missing_month_returns_422(self):
        fake = FakeMissionRecordsCalendarClient(rows=[])
        override_user(fake)

        response = self.client.get("/api/mission-records/calendar", headers=AUTH_HEADER)

        self.assertEqual(response.status_code, 422)
        self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

    def test_invalid_and_nonexistent_month_return_422(self):
        fake = FakeMissionRecordsCalendarClient(rows=[])
        override_user(fake)
        for invalid_month in (
            "2026-13",
            "not-a-month",
            "2026-00",
            "07-2026",
            "2026/07",
            "2026-7",
        ):
            with self.subTest(month=invalid_month):
                response = self.client.get(
                    "/api/mission-records/calendar",
                    headers=AUTH_HEADER,
                    params={"month": invalid_month},
                )
                self.assertEqual(response.status_code, 422)
                self.assertEqual(response.json()["code"], "VALIDATION_ERROR")

    def test_sends_user_id_and_kst_month_converted_to_utc_boundaries(self):
        fake = FakeMissionRecordsCalendarClient(rows=[])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        eq_calls = [(field, value) for op, field, value in fake.recorded_calls if op == "eq"]
        self.assertIn(("user_id", TEST_USER_ID), eq_calls)

        gte_calls = [(field, value) for op, field, value in fake.recorded_calls if op == "gte"]
        lt_calls = [(field, value) for op, field, value in fake.recorded_calls if op == "lt"]
        self.assertEqual(len(gte_calls), 1)
        self.assertEqual(len(lt_calls), 1)
        gte_field, gte_value = gte_calls[0]
        lt_field, lt_value = lt_calls[0]
        self.assertEqual(gte_field, "created_at")
        self.assertEqual(lt_field, "created_at")
        self.assertEqual(
            datetime.fromisoformat(gte_value).astimezone(),
            datetime.fromisoformat("2026-06-30T15:00:00+00:00"),
        )
        self.assertEqual(
            datetime.fromisoformat(lt_value).astimezone(),
            datetime.fromisoformat("2026-07-31T15:00:00+00:00"),
        )

    def test_kst_month_start_instant_record_is_included(self):
        row = make_record_row(TEST_USER_ID, "2026-06-30T15:00:00Z")
        fake = FakeMissionRecordsCalendarClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["days"], [{"date": "2026-07-01", "recordCount": 1}])

    def test_next_kst_month_start_instant_is_excluded(self):
        row = make_record_row(TEST_USER_ID, "2026-07-31T15:00:00Z")
        fake = FakeMissionRecordsCalendarClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["days"], [])

    def test_previous_month_record_is_excluded(self):
        row = make_record_row(TEST_USER_ID, "2026-06-30T14:59:59Z")
        fake = FakeMissionRecordsCalendarClient(rows=[row])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["days"], [])

    def test_same_kst_date_records_are_summed(self):
        rows = [
            make_record_row(TEST_USER_ID, "2026-07-21T01:00:00Z"),
            make_record_row(TEST_USER_ID, "2026-07-21T10:00:00Z"),
            make_record_row(TEST_USER_ID, "2026-07-21T13:00:00Z"),
        ]
        fake = FakeMissionRecordsCalendarClient(rows=rows)
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["days"], [{"date": "2026-07-21", "recordCount": 3}])

    def test_different_dates_are_each_returned_and_sorted_ascending(self):
        rows = [
            make_record_row(TEST_USER_ID, "2026-07-21T03:00:00Z"),
            make_record_row(TEST_USER_ID, "2026-07-03T03:00:00Z"),
        ]
        fake = FakeMissionRecordsCalendarClient(rows=rows)
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["days"],
            [
                {"date": "2026-07-03", "recordCount": 1},
                {"date": "2026-07-21", "recordCount": 1},
            ],
        )

    def test_returns_empty_days_when_no_records_in_month(self):
        fake = FakeMissionRecordsCalendarClient(rows=[])
        override_user(fake)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"month": "2026-07", "days": []})

    def test_only_aggregates_own_records(self):
        own_row = make_record_row(TEST_USER_ID, "2026-07-21T03:00:00Z")
        other_row = make_record_row(OTHER_USER_ID, "2026-07-21T03:00:00Z")
        fake = FakeMissionRecordsCalendarClient(rows=[own_row, other_row])
        override_user(fake, user_id=TEST_USER_ID)

        response = self.client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["days"], [{"date": "2026-07-21", "recordCount": 1}])

    def test_missing_token_returns_401(self):
        response = self.client.get(
            "/api/mission-records/calendar", params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "UNAUTHORIZED")

    def test_internal_db_error_is_not_leaked_in_response(self):
        class _ExplodingCalendarQuery:
            def select(self, *_args, **_kwargs):
                return self

            def eq(self, *_args, **_kwargs):
                return self

            def gte(self, *_args, **_kwargs):
                return self

            def lt(self, *_args, **_kwargs):
                return self

            def execute(self):
                raise RuntimeError("db connection string postgres://user:secret@host/db failed")

        class _ExplodingClient(FakeMissionRecordsCalendarClient):
            def table(self, name: str):
                if name == "mission_records":
                    return _ExplodingCalendarQuery()
                return super().table(name)

        fake = _ExplodingClient()
        override_user(fake)
        no_raise_client = TestClient(app, raise_server_exceptions=False)

        response = no_raise_client.get(
            "/api/mission-records/calendar", headers=AUTH_HEADER, params={"month": "2026-07"}
        )

        self.assertEqual(response.status_code, 500)
        self.assertNotIn("secret", response.text)
        self.assertNotIn("postgres://", response.text)


if __name__ == "__main__":
    unittest.main()
