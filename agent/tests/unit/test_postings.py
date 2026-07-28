"""모집단 등록 검증.

분모는 언제나 `posting_versions` 이며 규칙은 docs/metric-spec.md 2.1과 2.8에서 온다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.agents.collector import ManifestEntry, ManifestPosition, SourceType
from careersignal.pipelines import (
    NO_SNAPSHOT,
    PostingRegistrar,
    posting_identifier,
    posting_version_identifier,
)

AS_OF = date(2026, 7, 27)


class FakeIngest:
    """적재 파이프라인 저장소의 대역."""

    def __init__(self) -> None:
        self.postings: dict[str, dict[str, Any]] = {}
        self.versions: dict[str, dict[str, Any]] = {}

    def find_posting(self, posting_id: str) -> dict[str, Any] | None:
        return self.postings.get(posting_id)

    def find_posting_version(self, version_id: str) -> dict[str, Any] | None:
        return self.versions.get(version_id)

    def add_posting(self, values: dict[str, Any]) -> None:
        self.postings[values["posting_id"]] = values

    def add_posting_version(self, values: dict[str, Any]) -> None:
        self.versions[values["posting_version_id"]] = values


def _entry(**kw: Any) -> ManifestEntry:
    base: dict[str, Any] = {
        "source_id": "src_one",
        "url": "https://example.test/one",
        "source_type": SourceType.JOB_POSTING,
        "tier": "A",
        "allowed_uses": ("statistics",),
        "company_id": "co_one",
        "title": "백엔드 개발자",
        "entry_label": "experienced",
    }
    return ManifestEntry(**(base | kw))


# ============================================================ 식별자
def test_the_same_source_and_role_make_the_same_posting() -> None:
    assert posting_identifier("src_a", "backend") == posting_identifier("src_a", "backend")


def test_a_different_role_makes_a_different_posting() -> None:
    assert posting_identifier("src_a", "backend") != posting_identifier("src_a", "devops")


def test_a_version_is_identified_by_posting_and_snapshot() -> None:
    first = posting_version_identifier("post_a", "snap_1")
    second = posting_version_identifier("post_a", "snap_2")

    assert first != second
    assert first == posting_version_identifier("post_a", "snap_1")


# ============================================================ 초안 생성
def test_a_posting_source_makes_one_draft() -> None:
    drafts = _entry().to_postings()

    assert len(drafts) == 1
    assert drafts[0].job_role_id == "backend"
    assert drafts[0].entry_label == "experienced"


def test_a_source_that_is_not_a_posting_makes_no_draft() -> None:
    entry = _entry(
        source_type=SourceType.PUBLIC_STANDARD, tier="C",
        allowed_uses=("wiki_definition",), entry_label=None,
    )

    assert entry.to_postings() == ()


def test_positions_of_the_same_role_merge_into_one_posting() -> None:
    """나누면 같은 요구가 두 번 세어져 분자와 분모가 함께 부푼다."""
    entry = _entry(
        entry_label=None,
        positions=(
            ManifestPosition(position_name="Software Engineer", entry_label="experienced"),
            ManifestPosition(position_name="Server Engineer", entry_label="experienced"),
        ),
    )

    drafts = entry.to_postings()

    assert len(drafts) == 1
    assert "Software Engineer" in drafts[0].title
    assert "Server Engineer" in drafts[0].title


def test_positions_of_different_roles_make_separate_postings() -> None:
    entry = _entry(
        entry_label=None,
        positions=(
            ManifestPosition(position_name="Application Architect", entry_label="experienced"),
            ManifestPosition(
                position_name="AI Architect", job_role_ids=("ai_engineer",),
                entry_label="experienced",
            ),
        ),
    )

    assert {d.job_role_id for d in entry.to_postings()} == {"backend", "ai_engineer"}


def test_a_source_without_a_segment_label_is_refused() -> None:
    with pytest.raises(ValueError):
        _entry(entry_label=None).to_postings()


def test_positions_with_conflicting_segments_are_refused() -> None:
    entry = _entry(
        entry_label=None,
        positions=(
            ManifestPosition(position_name="A", entry_label="experienced"),
            ManifestPosition(position_name="B", entry_label="entry"),
        ),
    )

    with pytest.raises(ValueError):
        entry.to_postings()


# ============================================================ 등록
def test_registration_creates_a_posting_and_a_version() -> None:
    store = FakeIngest()
    drafts = _entry().to_postings()

    outcome = PostingRegistrar(store).register(
        drafts, {"src_one": "snap_1"}, "ds_test", AS_OF
    )

    assert outcome.created_postings == 1
    assert outcome.created_versions == 1
    assert outcome.population == 1
    assert store.versions[next(iter(store.versions))]["entry_label"] == "experienced"


def test_a_source_without_a_snapshot_is_skipped() -> None:
    """원문을 한 번도 얻지 못한 출처는 모집단에 들어가지 않는다."""
    store = FakeIngest()

    outcome = PostingRegistrar(store).register(_entry().to_postings(), {}, "ds_test", AS_OF)

    assert outcome.population == 0
    assert outcome.skipped == (("src_one", NO_SNAPSHOT),)


def test_running_twice_adds_nothing() -> None:
    store = FakeIngest()
    drafts = _entry().to_postings()
    registrar = PostingRegistrar(store)
    registrar.register(drafts, {"src_one": "snap_1"}, "ds_test", AS_OF)

    outcome = registrar.register(drafts, {"src_one": "snap_1"}, "ds_test", AS_OF)

    assert outcome.created_postings == 0
    assert outcome.created_versions == 0
    assert outcome.existing_versions == 1
    assert len(store.versions) == 1


def test_new_content_adds_a_version_to_the_same_posting() -> None:
    store = FakeIngest()
    drafts = _entry().to_postings()
    registrar = PostingRegistrar(store)
    registrar.register(drafts, {"src_one": "snap_1"}, "ds_test", AS_OF)

    outcome = registrar.register(drafts, {"src_one": "snap_2"}, "ds_test", AS_OF)

    assert outcome.created_postings == 0
    assert outcome.created_versions == 1
    assert len(store.postings) == 1
    assert len(store.versions) == 2


def test_the_dataset_as_of_date_fills_a_missing_posting_date() -> None:
    """기간 축이 posted_at 으로 갈린다. 비워 두면 어떤 지표도 성립하지 않는다."""
    store = FakeIngest()

    PostingRegistrar(store).register(
        _entry().to_postings(), {"src_one": "snap_1"}, "ds_test", AS_OF
    )

    stored = store.versions[next(iter(store.versions))]
    assert stored["posted_at"].date() == AS_OF
