"""수집 에이전트 계약과 종료 조건 검증.

종료 조건은 docs/agent-design.md 11.1, 원본 분리는 docs/knowledge-schema.md 3장에서 온다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.agents.collector import (
    CollectionTarget,
    ManifestEntry,
    ManifestPosition,
    PreparedFetcher,
    SourceCollector,
    SourceManifest,
    SourceType,
    UnavailableFetcher,
)
from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import FetchStatus
from careersignal.pipelines import FetchResult, SourceIngestPipeline

from .test_ingest import FakeSourceRepository

POSTING = "우리는 대규모 트랜잭션 처리 경험을 중요하게 봅니다."
UPDATED = "우리는 대규모 트랜잭션 처리와 분산 캐시 경험을 중요하게 봅니다."


class Store(FakeSourceRepository):
    """출처 등록까지 담는 대역."""

    def __init__(self) -> None:
        super().__init__()
        self.sources: dict[str, dict[str, Any]] = {}

    def find_source(self, source_id: str) -> dict[str, Any] | None:
        return self.sources.get(source_id)

    def register_source(self, values: dict[str, Any]) -> None:
        self.sources[values["source_id"]] = values


def _context(**kw: Any) -> RunContext:
    base: dict[str, Any] = {
        "agent_run_id": "run_collect_1",
        "analysis_version": "an_001",
        "dataset_version": "ds_001",
        "job_role_id": "backend",
        "scope_level": ScopeLevel.OVERALL,
        "as_of_date": date(2026, 7, 27),
    }
    return RunContext(**(base | kw))


def _target(source_id: str = "src_1", **kw: Any) -> CollectionTarget:
    base: dict[str, Any] = {
        "source_id": source_id,
        "url": f"https://example.test/{source_id}",
        "source_type": SourceType.JOB_POSTING,
        "job_role_ids": ("backend",),
        "robots_policy": "allow",
    }
    return CollectionTarget(**(base | kw))


def _collector(fetcher: Any, store: Store | None = None) -> SourceCollector:
    store = store or Store()
    return SourceCollector(fetcher, SourceIngestPipeline(store), store)


def _store(collector: SourceCollector) -> Store:
    return collector._repository  # type: ignore[attr-defined]  # noqa: SLF001


# ============================================================ 출처 등록
def test_source_is_registered_before_content_arrives() -> None:
    """URL 은 알지만 내용을 못 얻은 상태가 스냅샷 없는 sources 행이다."""
    collector = _collector(UnavailableFetcher())
    collector.collect(_context(), (_target(),))

    store = _store(collector)
    assert "src_1" in store.sources
    assert store.snapshots == []


def test_existing_source_is_not_registered_twice() -> None:
    collector = _collector(PreparedFetcher({"src_1": POSTING}))
    collector.collect(_context(), (_target(),))
    collector.collect(_context(), (_target(),))

    assert len(_store(collector).sources) == 1


def test_target_metadata_reaches_the_source_row() -> None:
    """이용 조건과 robots 정책을 sources 에 기록한다."""
    collector = _collector(PreparedFetcher({"src_1": POSTING}))
    collector.collect(
        _context(), (_target(robots_policy="disallow", license_note="공개 열람만"),)
    )

    row = _store(collector).sources["src_1"]
    assert row["robots_policy"] == "disallow"
    assert row["license_note"] == "공개 열람만"
    assert row["job_role_ids"] == ["backend"]


# ============================================================ 적재 연결
def test_successful_collection_creates_a_snapshot() -> None:
    collector = _collector(PreparedFetcher({"src_1": POSTING}))
    outcome = collector.collect(_context(), (_target(),))

    assert outcome.gained_evidence is True
    assert len(outcome.new_snapshots) == 1
    assert outcome.targets[0].created_snapshot is True


def test_unchanged_content_gains_no_evidence() -> None:
    """같은 내용을 다시 가져오면 새 근거가 아니다."""
    store = Store()
    fetcher = PreparedFetcher({"src_1": POSTING})
    _collector(fetcher, store).collect(_context(), (_target(),))
    second = _collector(fetcher, store).collect(_context(), (_target(),))

    assert second.gained_evidence is False
    assert second.targets[0].reused_snapshot is True


def test_changed_content_gains_evidence() -> None:
    store = Store()
    _collector(PreparedFetcher({"src_1": POSTING}), store).collect(
        _context(), (_target(),)
    )
    second = _collector(PreparedFetcher({"src_1": UPDATED}), store).collect(
        _context(), (_target(),)
    )

    assert second.gained_evidence is True
    assert len(store.snapshots) == 2


def test_failure_does_not_stop_the_remaining_targets() -> None:
    """한 출처의 실패가 나머지 수집을 막지 않는다."""
    collector = _collector(PreparedFetcher({"src_2": POSTING}))
    outcome = collector.collect(
        _context(), (_target("src_1"), _target("src_2"), _target("src_3"))
    )

    assert outcome.attempted == 3
    assert len(outcome.new_snapshots) == 1


# ============================================================ 조사 요청 연결
def test_fulfilled_requests_are_reported_not_updated() -> None:
    """상태 갱신은 오케스트레이터의 몫이다. 에이전트는 보고만 한다."""
    collector = _collector(PreparedFetcher({"src_1": POSTING}))
    outcome = collector.collect(
        _context(), (_target(research_request_id="req_1"),)
    )

    assert outcome.fulfilled_request_ids == ("req_1",)


def test_request_without_new_evidence_is_not_reported() -> None:
    collector = _collector(UnavailableFetcher())
    outcome = collector.collect(
        _context(), (_target(research_request_id="req_1"),)
    )

    assert outcome.fulfilled_request_ids == ()


def test_duplicate_requests_are_reported_once() -> None:
    collector = _collector(PreparedFetcher({"src_1": POSTING, "src_2": UPDATED}))
    outcome = collector.collect(
        _context(),
        (
            _target("src_1", research_request_id="req_1"),
            _target("src_2", research_request_id="req_1"),
        ),
    )

    assert outcome.fulfilled_request_ids == ("req_1",)


# ============================================================ 종료 사유
def test_new_evidence_stops_with_slots_filled() -> None:
    collector = _collector(PreparedFetcher({"src_1": POSTING}))
    outcome = collector.collect(_context(), (_target(),))

    assert outcome.stop_reason is StopReason.SLOTS_FILLED


def test_no_new_content_stops_with_no_new_evidence() -> None:
    collector = _collector(UnavailableFetcher())
    outcome = collector.collect(_context(), (_target(),))

    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE


def test_empty_target_list_stops_with_frontier_exhausted() -> None:
    """조사할 대상이 없는 것과 조사해서 못 찾은 것을 구분한다."""
    collector = _collector(PreparedFetcher({}))
    outcome = collector.collect(_context(), ())

    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert outcome.attempted == 0


def test_budget_limit_stops_with_budget_exhausted() -> None:
    collector = _collector(PreparedFetcher({"src_1": POSTING, "src_2": UPDATED}))
    outcome = collector.collect(
        _context(budget=Budget(max_tool_calls=1)),
        (_target("src_1"), _target("src_2")),
    )

    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED
    assert outcome.attempted == 1


def test_budget_outranks_new_evidence() -> None:
    """대상을 남기고 끝난 실행을 전수 조사로 볼 수 없다."""
    collector = _collector(PreparedFetcher({"src_1": POSTING, "src_2": UPDATED}))
    outcome = collector.collect(
        _context(budget=Budget(max_tool_calls=1)),
        (_target("src_1"), _target("src_2")),
    )

    assert outcome.gained_evidence is True
    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED


class BrokenFetcher:
    def fetch(self, target: CollectionTarget) -> FetchResult:
        raise RuntimeError("가져오기 구현 결함")


def test_fetcher_defect_stops_with_explicit_failure() -> None:
    """가져오기 구현이 깨진 실행을 근거 없음으로 보지 않는다."""
    collector = _collector(BrokenFetcher())
    outcome = collector.collect(_context(), (_target(),))

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.targets[0].error is not None
    assert outcome.targets[0].snapshot_id is None


def test_stop_reasons_match_the_database_check() -> None:
    """agent_runs.stop_reason 의 CHECK 와 같은 집합이어야 기록된다."""
    assert {str(s) for s in StopReason} == {
        "slots_filled",
        "no_new_evidence",
        "frontier_exhausted",
        "budget_exhausted",
        "repair_limit",
        "no_progress",
        "explicit_failure",
    }


# ============================================================ 스텁 계약
def test_prepared_fetcher_reports_absence_instead_of_inventing() -> None:
    result = PreparedFetcher({}).fetch(_target())

    assert result.status is FetchStatus.NOT_FOUND
    assert result.raw_content is None


def test_unavailable_fetcher_refuses_success_states() -> None:
    with pytest.raises(ValueError):
        UnavailableFetcher(status=FetchStatus.OK)


# ============================================================ 매니페스트 집계
def _manifest(*entries: ManifestEntry) -> SourceManifest:
    return SourceManifest(
        job_role_id="backend",
        dataset_version="ds_manifest_test",
        as_of_date=date(2026, 7, 27),
        entries=entries,
    )


def _entry(source_id: str, source_type: SourceType, **kw: Any) -> ManifestEntry:
    return ManifestEntry(
        source_id=source_id,
        url=f"https://example.test/{source_id}",
        source_type=source_type,
        tier="A" if source_type is SourceType.JOB_POSTING else "C",
        allowed_uses=("statistics",)
        if source_type is SourceType.JOB_POSTING
        else ("wiki_definition",),
        **kw,
    )


def test_a_source_without_positions_makes_one_posting() -> None:
    manifest = _manifest(_entry("src_one", SourceType.JOB_POSTING))

    assert manifest.posting_count() == 1


def test_positions_split_one_source_into_several_postings() -> None:
    """모집분야마다 요구사항 본문이 갈리면 공고가 나뉜다. docs/metric-spec.md 2.8."""
    manifest = _manifest(
        _entry(
            "src_multi",
            SourceType.JOB_POSTING,
            positions=(
                ManifestPosition(position_name="Application Architect"),
                ManifestPosition(position_name="Software Engineer"),
            ),
        )
    )

    assert manifest.posting_count() == 2


def test_sources_that_are_not_postings_make_no_posting() -> None:
    """공공 표준과 회사 공식 자료는 모집단에 들어가지 않는다."""
    manifest = _manifest(
        _entry("src_posting", SourceType.JOB_POSTING),
        _entry("src_standard", SourceType.PUBLIC_STANDARD),
        _entry("src_company", SourceType.COMPANY_OFFICIAL),
    )

    assert len(manifest.entries) == 3
    assert manifest.posting_count() == 1


def test_segment_counts_ignore_sources_without_a_label() -> None:
    manifest = _manifest(
        _entry("src_exp", SourceType.JOB_POSTING, entry_label="experienced"),
        _entry("src_new", SourceType.JOB_POSTING, entry_label="entry"),
        _entry("src_standard", SourceType.PUBLIC_STANDARD),
    )

    assert manifest.segment_counts() == {"experienced": 1, "entry_junior": 1}
