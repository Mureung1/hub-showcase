"""적재 파이프라인의 저장 경로 검증.

원본 네 표의 분리와 append-only 규칙이 실제 데이터베이스에서 지켜지는지 확인한다.
정의는 docs/knowledge-schema.md 3장이다.
"""

from __future__ import annotations

from datetime import datetime

import psycopg
import pytest

from careersignal.domain.permissions import Component
from careersignal.domain.source_policy import AllowedUse, FetchStatus, SourceTier
from careersignal.pipelines import FetchResult, SourceIngestPipeline
from careersignal.repositories.base import Unit
from careersignal.repositories.sources import SourceRepository

from .conftest import requires_db

pytestmark = requires_db

SOURCE_ID = "src_ingest_test"
DATASET = "ds_ingest_test"
FIRST = "우리는 대규모 트랜잭션 처리 경험을 중요하게 봅니다."
SECOND = "우리는 대규모 트랜잭션 처리와 분산 캐시 경험을 중요하게 봅니다."

SEED = """
INSERT INTO dataset_versions (dataset_version, job_role_id, as_of_date)
  VALUES ('ds_ingest_test', 'backend', current_date);
"""


@pytest.fixture
def collect_unit(rollback_conn: psycopg.Connection) -> Unit:
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute('SET LOCAL ROLE "cs_agent_collect"')
    return Unit(rollback_conn, Component.AGENT_COLLECT)


@pytest.fixture
def pipeline(collect_unit: Unit) -> SourceIngestPipeline:
    repository = SourceRepository(collect_unit)
    repository.register_source(
        {
            "source_id": SOURCE_ID,
            "source_type": "job_posting",
            "url": "https://example.test/careers/backend",
            "publisher": "검증 테스트 회사",
            "robots_policy": "allow",
            "job_role_ids": ["backend"],
            "first_seen_at": datetime.now(),
        }
    )
    return SourceIngestPipeline(repository)


def _ok(content: str) -> FetchResult:
    return FetchResult(
        source_id=SOURCE_ID,
        status=FetchStatus.OK,
        raw_content=content,
        canonical_url="https://example.test/careers/backend",
        http_status=200,
    )


# ============================================================ 분리 기록
def test_one_fetch_writes_snapshot_and_observation(
    pipeline: SourceIngestPipeline, collect_unit: Unit
) -> None:
    outcome = pipeline.record(_ok(FIRST), DATASET)

    snapshot = collect_unit.fetch_one(
        "SELECT * FROM source_snapshots WHERE snapshot_id = %s", (outcome.snapshot_id,)
    )
    observation = collect_unit.fetch_one(
        "SELECT * FROM source_observations WHERE observation_id = %s",
        (outcome.observation_id,),
    )
    assert snapshot["raw_content"] == FIRST
    assert len(snapshot["content_hash"]) == 64
    assert observation["fetch_status"] == "ok"
    assert observation["http_status"] == 200


def test_changed_content_links_to_the_previous_snapshot(
    pipeline: SourceIngestPipeline, collect_unit: Unit
) -> None:
    first = pipeline.record(_ok(FIRST), DATASET)
    second = pipeline.record(_ok(SECOND), DATASET)

    row = collect_unit.fetch_one(
        "SELECT supersedes_snapshot_id FROM source_snapshots WHERE snapshot_id = %s",
        (second.snapshot_id,),
    )
    assert row["supersedes_snapshot_id"] == first.snapshot_id


def test_duplicate_content_is_stored_once(
    pipeline: SourceIngestPipeline, collect_unit: Unit
) -> None:
    """UNIQUE (source_id, content_hash) 가 있지만 파이프라인이 먼저 판정한다."""
    pipeline.record(_ok(FIRST), DATASET)
    pipeline.record(_ok(FIRST), DATASET)

    counts = collect_unit.fetch_one(
        """
        SELECT (SELECT count(*) FROM source_snapshots WHERE source_id = %(s)s) AS snapshots,
               (SELECT count(*) FROM source_observations o
                  JOIN source_snapshots s ON s.snapshot_id = o.snapshot_id
                WHERE s.source_id = %(s)s) AS observations
        """,
        {"s": SOURCE_ID},
    )
    assert counts["snapshots"] == 1
    assert counts["observations"] == 2


def test_failure_attaches_to_the_preserved_snapshot(
    pipeline: SourceIngestPipeline, collect_unit: Unit
) -> None:
    """접근할 수 없게 된 자료의 스냅샷과 관찰 기록이 보존된다."""
    first = pipeline.record(_ok(FIRST), DATASET)
    failed = pipeline.record(
        FetchResult(
            source_id=SOURCE_ID, status=FetchStatus.NOT_FOUND, http_status=404
        ),
        DATASET,
    )

    assert failed.snapshot_id == first.snapshot_id
    row = collect_unit.fetch_one(
        "SELECT * FROM source_snapshots WHERE snapshot_id = %s", (first.snapshot_id,)
    )
    assert row["raw_content"] == FIRST


# ============================================================ 평가
def test_assessment_versions_accumulate(
    pipeline: SourceIngestPipeline, collect_unit: Unit
) -> None:
    outcome = pipeline.record(_ok(FIRST), DATASET)
    assert outcome.snapshot_id is not None

    for version in ("sa_v1", "sa_v2"):
        pipeline.assess(
            snapshot_id=outcome.snapshot_id,
            tier=SourceTier.POSTING,
            allowed_uses=frozenset({AllowedUse.STATISTICS, AllowedUse.STRATEGY}),
            assessment_version=version,
        )
    rows = collect_unit.fetch_all(
        "SELECT * FROM source_assessments WHERE snapshot_id = %s"
        " ORDER BY assessment_version",
        (outcome.snapshot_id,),
    )
    assert [r["assessment_version"] for r in rows] == ["sa_v1", "sa_v2"]
    assert sorted(rows[0]["allowed_uses"]) == ["statistics", "strategy"]


def test_disallowed_use_is_refused_before_the_database(
    pipeline: SourceIngestPipeline,
) -> None:
    """D 계층 자료를 통계 근거로 쓰겠다는 평가는 저장되지 않는다."""
    outcome = pipeline.record(_ok(FIRST), DATASET)
    assert outcome.snapshot_id is not None

    with pytest.raises(PermissionError):
        pipeline.assess(
            snapshot_id=outcome.snapshot_id,
            tier=SourceTier.VERIFIED_EXTERNAL,
            allowed_uses=frozenset({AllowedUse.STATISTICS}),
            assessment_version="sa_v1",
        )


def test_same_assessment_version_cannot_be_written_twice(
    pipeline: SourceIngestPipeline,
) -> None:
    outcome = pipeline.record(_ok(FIRST), DATASET)
    assert outcome.snapshot_id is not None

    def assess() -> None:
        pipeline.assess(
            snapshot_id=outcome.snapshot_id,
            tier=SourceTier.POSTING,
            allowed_uses=frozenset({AllowedUse.STATISTICS}),
            assessment_version="sa_v1",
        )

    assess()
    with pytest.raises(psycopg.errors.UniqueViolation):
        assess()
