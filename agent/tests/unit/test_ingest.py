"""적재 파이프라인 검증.

규칙은 docs/knowledge-schema.md 3장과 docs/data-strategy.md 7장에서 온다.
저장소는 대역으로 대체하고 적재 판정만 검사한다.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import pytest

from careersignal.domain.source_policy import AllowedUse, FetchStatus, SourceTier
from careersignal.pipelines import (
    NO_PRIOR_SNAPSHOT,
    FetchResult,
    SourceIngestPipeline,
    snapshot_identifier,
)
from careersignal.repositories.sources import content_hash

SOURCE = "src_backend_1"
FIRST = "우리는 대규모 트랜잭션 처리 경험을 중요하게 봅니다."
SECOND = "우리는 대규모 트랜잭션 처리와 분산 캐시 경험을 중요하게 봅니다."


class FakeSourceRepository:
    """저장소의 대역. 스냅샷·관찰·평가를 따로 담는다."""

    def __init__(self) -> None:
        self.snapshots: list[dict[str, Any]] = []
        self.observations: list[dict[str, Any]] = []
        self.assessments: list[dict[str, Any]] = []

    def latest_snapshot(self, source_id: str) -> dict[str, Any] | None:
        rows = [s for s in self.snapshots if s["source_id"] == source_id]
        return rows[-1] if rows else None

    def find_snapshot_by_hash(self, source_id: str, digest: str) -> str | None:
        for row in self.snapshots:
            if row["source_id"] == source_id and row["content_hash"] == digest:
                return row["snapshot_id"]
        return None

    def add_snapshot(self, snapshot_id: str, source_id: str, raw_content: str, **kw: Any) -> str:
        digest = content_hash(raw_content)
        existing = self.find_snapshot_by_hash(source_id, digest)
        if existing:
            return existing
        self.snapshots.append(
            {
                "snapshot_id": snapshot_id,
                "source_id": source_id,
                "content_hash": digest,
                "raw_content": raw_content,
                **kw,
            }
        )
        return snapshot_id

    def add_observation(self, observation_id: str, snapshot_id: str, **kw: Any) -> None:
        self.observations.append(
            {"observation_id": observation_id, "snapshot_id": snapshot_id, **kw}
        )

    def add_assessment(self, assessment_id: str, snapshot_id: str, **kw: Any) -> None:
        self.assessments.append(
            {"assessment_id": assessment_id, "snapshot_id": snapshot_id, **kw}
        )


@pytest.fixture
def pipeline() -> SourceIngestPipeline:
    return SourceIngestPipeline(FakeSourceRepository())


def _store(pipeline: SourceIngestPipeline) -> FakeSourceRepository:
    return pipeline._repository  # type: ignore[attr-defined]  # noqa: SLF001


def _ok(content: str, **kw: Any) -> FetchResult:
    return FetchResult(
        source_id=SOURCE, status=FetchStatus.OK, raw_content=content, **kw
    )


# ============================================================ 입력 형식
def test_successful_fetch_requires_content() -> None:
    with pytest.raises(ValueError):
        FetchResult(source_id=SOURCE, status=FetchStatus.OK)


def test_failed_fetch_carries_no_content() -> None:
    """접근에 실패했는데 원문이 있으면 어디선가 지어낸 것이다."""
    with pytest.raises(ValueError):
        FetchResult(
            source_id=SOURCE, status=FetchStatus.NOT_FOUND, raw_content="지어낸 내용"
        )


# ============================================================ 첫 수집
def test_first_fetch_creates_snapshot_and_observation(
    pipeline: SourceIngestPipeline,
) -> None:
    outcome = pipeline.record(_ok(FIRST), "ds_1")

    assert outcome.created_snapshot is True
    assert outcome.superseded_snapshot_id is None
    assert len(_store(pipeline).snapshots) == 1
    assert len(_store(pipeline).observations) == 1


def test_snapshot_identifier_is_deterministic() -> None:
    """적재는 A0 다. 같은 출처의 같은 내용은 같은 식별자를 갖는다."""
    digest = content_hash(FIRST)
    assert snapshot_identifier(SOURCE, digest) == snapshot_identifier(SOURCE, digest)
    assert snapshot_identifier("src_other", digest) != snapshot_identifier(
        SOURCE, digest
    )
    assert snapshot_identifier(SOURCE, digest).startswith("snap_")


# ============================================================ 재수집
def test_same_content_reuses_the_snapshot(pipeline: SourceIngestPipeline) -> None:
    """내용 해시가 같으면 새 스냅샷을 만들지 않는다."""
    first = pipeline.record(_ok(FIRST), "ds_1")
    second = pipeline.record(_ok(FIRST), "ds_1")

    assert second.reused_snapshot is True
    assert second.created_snapshot is False
    assert second.snapshot_id == first.snapshot_id
    assert len(_store(pipeline).snapshots) == 1


def test_same_content_still_records_an_observation(
    pipeline: SourceIngestPipeline,
) -> None:
    """수집 시도는 매번 기록한다. 내용이 같아도 관찰은 별개 사실이다."""
    pipeline.record(_ok(FIRST), "ds_1")
    pipeline.record(_ok(FIRST), "ds_1")

    assert len(_store(pipeline).observations) == 2


def test_changed_content_supersedes_the_previous_snapshot(
    pipeline: SourceIngestPipeline,
) -> None:
    first = pipeline.record(_ok(FIRST), "ds_1")
    second = pipeline.record(_ok(SECOND), "ds_1")

    assert second.created_snapshot is True
    assert second.superseded_snapshot_id == first.snapshot_id
    assert len(_store(pipeline).snapshots) == 2


def test_reverting_to_earlier_content_reuses_that_snapshot(
    pipeline: SourceIngestPipeline,
) -> None:
    """공고가 이전 내용으로 되돌아가면 그때의 스냅샷을 다시 쓴다."""
    first = pipeline.record(_ok(FIRST), "ds_1")
    pipeline.record(_ok(SECOND), "ds_1")
    third = pipeline.record(_ok(FIRST), "ds_1")

    assert third.snapshot_id == first.snapshot_id
    assert third.reused_snapshot is True
    assert len(_store(pipeline).snapshots) == 2


# ============================================================ 접근 실패
@pytest.mark.parametrize(
    "status",
    [
        FetchStatus.NOT_FOUND,
        FetchStatus.FORBIDDEN,
        FetchStatus.TIMEOUT,
        FetchStatus.PARSE_ERROR,
    ],
)
def test_failure_preserves_the_previous_snapshot(
    pipeline: SourceIngestPipeline, status: FetchStatus
) -> None:
    """접근할 수 없게 된 자료도 기존 분석의 계보를 위해 보존한다."""
    first = pipeline.record(_ok(FIRST), "ds_1")
    failed = pipeline.record(
        FetchResult(source_id=SOURCE, status=status, http_status=404), "ds_1"
    )

    assert failed.snapshot_id == first.snapshot_id
    assert failed.created_snapshot is False
    assert failed.recorded is True
    assert len(_store(pipeline).snapshots) == 1
    assert _store(pipeline).observations[-1]["fetch_status"] == str(status)


def test_first_fetch_failure_has_nowhere_to_attach(
    pipeline: SourceIngestPipeline,
) -> None:
    """관찰은 특정 내용에 대한 관찰이다. 내용이 한 번도 없으면 붙일 곳이 없다."""
    outcome = pipeline.record(
        FetchResult(source_id=SOURCE, status=FetchStatus.FORBIDDEN), "ds_1"
    )

    assert outcome.recorded is False
    assert outcome.skipped_reason == NO_PRIOR_SNAPSHOT
    assert _store(pipeline).observations == []


def test_failure_does_not_change_the_stored_content(
    pipeline: SourceIngestPipeline,
) -> None:
    """접근 실패를 기록하려고 원문을 건드리지 않는다. 표를 나눈 이유다."""
    pipeline.record(_ok(FIRST), "ds_1")
    pipeline.record(FetchResult(source_id=SOURCE, status=FetchStatus.NOT_FOUND), "ds_1")

    assert _store(pipeline).snapshots[0]["raw_content"] == FIRST


# ============================================================ 평가
def test_assessment_is_separate_from_the_snapshot(
    pipeline: SourceIngestPipeline,
) -> None:
    outcome = pipeline.record(_ok(FIRST), "ds_1")
    assert outcome.snapshot_id is not None

    pipeline.assess(
        snapshot_id=outcome.snapshot_id,
        tier=SourceTier.POSTING,
        allowed_uses=frozenset({AllowedUse.STATISTICS}),
        assessment_version="sa_v1",
    )
    stored = _store(pipeline).assessments[0]
    assert stored["snapshot_id"] == outcome.snapshot_id
    assert stored["assessment_version"] == "sa_v1"


def test_reassessment_keeps_the_earlier_version(
    pipeline: SourceIngestPipeline,
) -> None:
    """평가 기준이 바뀌면 새 버전으로 다시 평가하고 이전 평가를 보존한다."""
    outcome = pipeline.record(_ok(FIRST), "ds_1")
    assert outcome.snapshot_id is not None

    for version in ("sa_v1", "sa_v2"):
        pipeline.assess(
            snapshot_id=outcome.snapshot_id,
            tier=SourceTier.POSTING,
            allowed_uses=frozenset({AllowedUse.STATISTICS}),
            assessment_version=version,
        )
    versions = [a["assessment_version"] for a in _store(pipeline).assessments]
    assert versions == ["sa_v1", "sa_v2"]


# ============================================================ 시각
def test_observation_uses_the_fetch_time(pipeline: SourceIngestPipeline) -> None:
    moment = datetime(2026, 7, 27, 9, 30) - timedelta(days=3)
    pipeline.record(_ok(FIRST, fetched_at=moment), "ds_1")

    assert _store(pipeline).observations[0]["observed_at"] == moment
