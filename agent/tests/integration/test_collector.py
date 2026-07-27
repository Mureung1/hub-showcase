"""수집 에이전트가 실제 저장소를 지나는 경로 검증.

조사 요청은 읽기만 하고 상태는 바꾸지 못한다.
정의는 docs/permission-matrix.md 5.3이다.
"""

from __future__ import annotations

from datetime import date

import psycopg
import pytest

from careersignal.agents.collector import (
    CollectionTarget,
    PreparedFetcher,
    SourceCollector,
    SourceType,
)
from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.pipelines import SourceIngestPipeline
from careersignal.repositories.base import Unit
from careersignal.repositories.sources import SourceRepository

from .conftest import requires_db

pytestmark = requires_db

POSTING = "우리는 대규모 트랜잭션 처리 경험을 중요하게 봅니다."

SEED = """
INSERT INTO dataset_versions (dataset_version, job_role_id, as_of_date)
  VALUES ('ds_collect_test', 'backend', DATE '2026-07-27');
INSERT INTO analysis_versions (
  analysis_version, job_role_id, dataset_version, taxonomy_version_id,
  model_version, prompt_version, retrieval_policy_version, metric_policy_version,
  scope_spec, status
) VALUES (
  'an_collect_test', 'backend', 'ds_collect_test', 'tx_backend_v1',
  'model_v1', 'prompt_v1', 'rp_v1', 'mp_v1_prevalence',
  '{"scope_level": "overall"}'::jsonb, 'running'
);
INSERT INTO agent_runs (agent_run_id, analysis_version, agent_name, iteration, started_at)
  VALUES ('run_collect_test', 'an_collect_test', 'interpretation', 1, now());
INSERT INTO research_requests (request_id, requested_by_run_id, analysis_version, goal,
                               needed_evidence_type, scope_level, scope_id,
                               status, priority) VALUES
  ('req_low', 'run_collect_test', 'an_collect_test', '핀테크 기술 자료 확보',
   'company_official', 'cluster', 'fintech', 'open', 3),
  ('req_high', 'run_collect_test', 'an_collect_test', '백엔드 공고 원문 확보',
   'job_posting', 'overall', NULL, 'scheduled', 8),
  ('req_done', 'run_collect_test', 'an_collect_test', '이미 끝난 요청',
   'job_posting', 'overall', NULL, 'rejected', 5);
"""


@pytest.fixture
def collect_unit(rollback_conn: psycopg.Connection) -> Unit:
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute('SET LOCAL ROLE "cs_agent_collect"')
    return Unit(rollback_conn, Component.AGENT_COLLECT)


@pytest.fixture
def collector(collect_unit: Unit) -> SourceCollector:
    repository = SourceRepository(collect_unit)
    return SourceCollector(
        PreparedFetcher({"src_collect_1": POSTING}),
        SourceIngestPipeline(repository),
        repository,
    )


def _context() -> RunContext:
    return RunContext(
        agent_run_id="run_collect_test",
        analysis_version="an_collect_test",
        dataset_version="ds_collect_test",
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 27),
    )


def _target(source_id: str, **kw: object) -> CollectionTarget:
    return CollectionTarget(
        source_id=source_id,
        url=f"https://example.test/{source_id}",
        source_type=SourceType.JOB_POSTING,
        publisher="검증 테스트 회사",
        job_role_ids=("backend",),
        robots_policy="allow",
        **kw,
    )


# ============================================================ 조사 요청 소비
def test_pending_requests_come_back_by_priority(collect_unit: Unit) -> None:
    """열린 요청과 예정된 요청만 우선순위 순으로 소비한다."""
    rows = SourceRepository(collect_unit).pending_research_requests("an_collect_test")

    assert [r["request_id"] for r in rows] == ["req_high", "req_low"]
    assert rows[0]["priority"] == 8


def test_collector_cannot_change_request_status(collect_unit: Unit) -> None:
    """요청자도 수집자도 상태를 바꾸지 못한다. 오케스트레이터만 바꾼다."""
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        collect_unit.execute(
            "UPDATE research_requests SET status = 'fulfilled'"
            " WHERE request_id = 'req_high'"
        )


# ============================================================ 수집과 적재
def test_collection_writes_source_snapshot_and_observation(
    collector: SourceCollector, collect_unit: Unit
) -> None:
    outcome = collector.collect(
        _context(), (_target("src_collect_1", research_request_id="req_high"),)
    )

    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert outcome.fulfilled_request_ids == ("req_high",)

    row = collect_unit.fetch_one(
        """
        SELECT s.source_id, s.publisher, s.robots_policy,
               (SELECT count(*) FROM source_snapshots WHERE source_id = s.source_id) AS snapshots,
               (SELECT count(*) FROM source_observations o
                  JOIN source_snapshots x ON x.snapshot_id = o.snapshot_id
                WHERE x.source_id = s.source_id) AS observations
        FROM sources s WHERE s.source_id = 'src_collect_1'
        """
    )
    assert row["publisher"] == "검증 테스트 회사"
    assert row["robots_policy"] == "allow"
    assert row["snapshots"] == 1
    assert row["observations"] == 1


def test_unfetchable_source_is_registered_without_a_snapshot(
    collector: SourceCollector, collect_unit: Unit
) -> None:
    """URL 은 알지만 내용이 없는 상태가 그대로 저장된다."""
    outcome = collector.collect(_context(), (_target("src_collect_missing"),))

    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE
    row = collect_unit.fetch_one(
        """
        SELECT (SELECT count(*) FROM sources WHERE source_id = 'src_collect_missing') AS sources,
               (SELECT count(*) FROM source_snapshots WHERE source_id = 'src_collect_missing') AS snapshots
        """
    )
    assert row["sources"] == 1
    assert row["snapshots"] == 0


def test_collector_cannot_write_analysis_output(collect_unit: Unit) -> None:
    """수집은 원본만 쓴다. 분석 산출물에 손대지 않는다."""
    with pytest.raises(PermissionError):
        SourceRepository(collect_unit).unit.insert(
            "analysis_claims", {"claim_id": "claim_x"}
        )
