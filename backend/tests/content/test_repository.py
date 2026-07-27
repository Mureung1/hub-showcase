from __future__ import annotations

import unittest
import uuid
from unittest import mock

from app.content import repository


def eligible_row(**overrides: object) -> dict:
    row = {
        "id": str(uuid.uuid4()),
        "active": True,
        "collection_method": "rss",
        "language": "ko",
        "default_exposure": "primary",
        "trust_level": "high",
        "paywall_risk": "low",
        "feed_url": "https://example.com/feed.xml",
    }
    row.update(overrides)
    return row


class _FakeResult:
    def __init__(self, data: list[dict]):
        self.data = data


class _FakeSourcesQuery:
    def __init__(self, rows: list[dict]):
        self._rows = list(rows)

    def select(self, _columns: str) -> "_FakeSourcesQuery":
        return self

    def eq(self, field: str, value: object) -> "_FakeSourcesQuery":
        self._rows = [row for row in self._rows if row.get(field) == value]
        return self

    def in_(self, field: str, values: list[object]) -> "_FakeSourcesQuery":
        self._rows = [row for row in self._rows if row.get(field) in values]
        return self

    def neq(self, field: str, value: object) -> "_FakeSourcesQuery":
        self._rows = [row for row in self._rows if row.get(field) != value]
        return self

    @property
    def not_(self) -> "_FakeNotFilter":
        return _FakeNotFilter(self)

    def order(self, field: str) -> "_FakeSourcesQuery":
        self._rows = sorted(self._rows, key=lambda row: row[field])
        return self

    def execute(self) -> _FakeResult:
        return _FakeResult(self._rows)


class _FakeNotFilter:
    def __init__(self, query: _FakeSourcesQuery):
        self._query = query

    def is_(self, field: str, _value: object) -> _FakeSourcesQuery:
        self._query._rows = [row for row in self._query._rows if row.get(field) is not None]
        return self._query


class FakeSourcesClient:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def table(self, name: str) -> _FakeSourcesQuery:
        assert name == "sources"
        return _FakeSourcesQuery(self._rows)


def fetch_ids_with_rows(rows: list[dict]) -> list[str]:
    with mock.patch.object(repository, "create_admin_client", return_value=FakeSourcesClient(rows)):
        return repository.fetch_collectable_source_ids()


class FetchCollectableSourceIdsTest(unittest.TestCase):
    def test_excludes_sources_failing_any_single_condition(self):
        violations = {
            "active=False": {"active": False},
            "collection_method=api": {"collection_method": "api"},
            "language=en": {"language": "en"},
            "default_exposure=optional": {"default_exposure": "optional"},
            "trust_level=low": {"trust_level": "low"},
            "paywall_risk=high": {"paywall_risk": "high"},
            "feed_url=None": {"feed_url": None},
            "feed_url=empty": {"feed_url": ""},
        }
        for label, override in violations.items():
            with self.subTest(label):
                eligible = eligible_row()
                ineligible = eligible_row(**override)
                ids = fetch_ids_with_rows([eligible, ineligible])
                self.assertEqual(ids, [eligible["id"]])

    def test_returns_matching_ids_in_ascending_order_as_strings(self):
        high = eligible_row(trust_level="high")
        medium = eligible_row(trust_level="medium")
        rows = sorted([high, medium], key=lambda row: row["id"], reverse=True)

        ids = fetch_ids_with_rows(rows)

        expected = sorted([high["id"], medium["id"]])
        self.assertEqual(ids, expected)
        for source_id in ids:
            self.assertIsInstance(source_id, str)

    def test_returns_empty_list_when_no_source_matches(self):
        ids = fetch_ids_with_rows([eligible_row(active=False)])
        self.assertEqual(ids, [])
