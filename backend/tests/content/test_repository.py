"""fetch_collectable_source_ids가 sources의 필터 조건을 실제로 적용하는지 검증한다.

Supabase 쿼리 체인(select/eq/in_/neq/not_.is_/order)을 Fake로 대체해 실DB 없이 검증한다.
"""

from __future__ import annotations

import unittest
import uuid
from unittest import mock

from app.content import repository


def eligible_row(**overrides: object) -> dict:
    """수집 대상 조건을 모두 만족하는 sources 행을 만든다. overrides로 특정 필드만 조건 위반 상태로 바꾼다."""
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
    """Supabase execute() 응답 흉내. .data만 있으면 된다."""

    def __init__(self, data: list[dict]):
        self.data = data


class _FakeSourcesQuery:
    """sources 테이블 쿼리 체인 흉내.

    실제 SDK처럼 필터 메서드가 호출될 때마다 남은 행을 좁혀나가므로,
    체이닝 순서를 강제하지 않고도 최종 결과로 필터 의미를 검증할 수 있다.
    """

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
    """`.not_.is_(...)`처럼 다음 필터를 부정하는 postgrest 체인의 마지막 단계."""

    def __init__(self, query: _FakeSourcesQuery):
        self._query = query

    def is_(self, field: str, _value: object) -> _FakeSourcesQuery:
        self._query._rows = [row for row in self._query._rows if row.get(field) is not None]
        return self._query


class FakeSourcesClient:
    """create_admin_client()를 대체하는 최소 Fake. sources 테이블 조회만 지원한다."""

    def __init__(self, rows: list[dict]):
        self._rows = rows

    def table(self, name: str) -> _FakeSourcesQuery:
        assert name == "sources"
        return _FakeSourcesQuery(self._rows)


def fetch_ids_with_rows(rows: list[dict]) -> list[str]:
    """create_admin_client를 FakeSourcesClient로 바꿔치기하고 실제 조회 함수를 호출한다."""
    with mock.patch.object(repository, "create_admin_client", return_value=FakeSourcesClient(rows)):
        return repository.fetch_collectable_source_ids()


class FetchCollectableSourceIdsTest(unittest.TestCase):
    def test_excludes_sources_failing_any_single_condition(self):
        """7개 조건 중 하나라도 어긴 소스는 결과에서 제외된다."""
        # 조건 하나만 위반한 소스와 조건을 완전히 만족하는 소스를 함께 넣어,
        # 위반 조건 하나가 단독으로 제외 사유가 되는지 확인한다.
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
        """trust_level이 high/medium인 소스를 모두 포함하고, id 오름차순 문자열로 반환한다."""
        high = eligible_row(trust_level="high")
        medium = eligible_row(trust_level="medium")
        # 입력 순서와 무관하게 정렬되는지 확인하려고 id 역순으로 넣는다.
        rows = sorted([high, medium], key=lambda row: row["id"], reverse=True)

        ids = fetch_ids_with_rows(rows)

        expected = sorted([high["id"], medium["id"]])
        self.assertEqual(ids, expected)
        for source_id in ids:
            self.assertIsInstance(source_id, str)

    def test_returns_empty_list_when_no_source_matches(self):
        """조건을 만족하는 소스가 하나도 없으면 빈 리스트를 반환한다."""
        ids = fetch_ids_with_rows([eligible_row(active=False)])
        self.assertEqual(ids, [])
