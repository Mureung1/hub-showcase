"""검증 결과 저장 검증.

검증 파이프라인이 자기 범위에만 쓰고, 스키마가 판정 없는 행을 막는지 확인한다.
쓰기 범위의 기준은 docs/permission-matrix.md 3장이다.
"""

from __future__ import annotations

from datetime import date

import psycopg
import pytest

from careersignal.contracts import (
    CheckName,
    CheckResult,
    CheckVerdict,
    MissingEvidence,
    RepairAction,
    RepairOrder,
    ResearchRequest,
    RunContext,
    Severity,
)
from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import SourceTier
from careersignal.repositories.base import Unit
from careersignal.repositories.verification import VerificationRepository
from careersignal.verification import CheckContext, CheckRegistry, CheckRunner, passed

from .conftest import requires_db

pytestmark = requires_db

ANALYSIS_VERSION = "an_verify_test"
RUN_ID = "run_verify_test"

SEED = """
INSERT INTO dataset_versions (dataset_version, job_role_id, as_of_date)
  VALUES ('ds_verify_test', 'backend', current_date);
INSERT INTO analysis_versions (
  analysis_version, job_role_id, dataset_version, taxonomy_version_id,
  model_version, prompt_version, retrieval_policy_version, metric_policy_version,
  scope_spec, status
) VALUES (
  'an_verify_test', 'backend', 'ds_verify_test', 'tx_backend_v1',
  'model_v1', 'prompt_v1', 'rp_v1', 'mp_v1_prevalence',
  '{"scope_level": "overall"}'::jsonb, 'validating'
);
INSERT INTO agent_runs (agent_run_id, analysis_version, agent_name, iteration, started_at)
  VALUES ('run_verify_test', 'an_verify_test', 'interpretation', 1, now());
INSERT INTO analysis_outputs (
  output_id, analysis_version, job_role_id, scope_level, scope_id,
  output_type, payload, produced_by_agent, verification_status, generated_at
) VALUES (
  'out_verify_test', 'an_verify_test', 'backend', 'overall', 'backend',
  'interpretation', '{}'::jsonb, 'interpretation', 'insufficient_evidence', now()
);
INSERT INTO analysis_claims (
  claim_id, analysis_version, output_id, claim_type, scope_level, scope_id,
  claim_text, structured_slots, confidence_components, verification_status
) VALUES (
  'claim_42', 'an_verify_test', 'out_verify_test', 'cluster_generalization',
  'overall', 'backend', '트랜잭션 무결성을 반복 요구한다',
  '{}'::jsonb, '{}'::jsonb, 'insufficient_evidence'
);
"""


@pytest.fixture
def verify_unit(rollback_conn: psycopg.Connection) -> Unit:
    """기준 행을 먼저 넣고 검증 role 로 전환한다.

    분석 버전과 실행 기록은 검증 파이프라인의 쓰기 범위가 아니므로 전환 전에 넣는다.
    `SET LOCAL ROLE` 은 거래가 끝날 때까지 유지되고, 거래는 되돌린다.
    """
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute('SET LOCAL ROLE "cs_pipe_verify"')
    return Unit(rollback_conn, Component.PIPE_VERIFY)


def _context() -> CheckContext:
    return CheckContext(
        run=RunContext(
            agent_run_id=RUN_ID,
            analysis_version=ANALYSIS_VERSION,
            dataset_version="ds_verify_test",
            job_role_id="backend",
            scope_level=ScopeLevel.OVERALL,
            as_of_date=date(2026, 7, 27),
        ),
        target_type="analysis_claim",
        target_id="claim_42",
    )


# ============================================================ 검사 결과
def test_runner_output_is_storable(verify_unit: Unit) -> None:
    """러너의 결과가 그대로 저장된다. 중간 변환을 두지 않는다."""
    registry = CheckRegistry()
    for spec in registry.executable():
        registry.register(spec.check, lambda ctx: passed())
    report = CheckRunner(registry).run(_context())

    repository = VerificationRepository(verify_unit)
    result_ids = repository.record_results(ANALYSIS_VERSION, report.results)

    assert len(result_ids) == len(report.results)
    stored = repository.results_for(ANALYSIS_VERSION, "analysis_claim", "claim_42")
    assert len(stored) == len(report.results)
    assert {row["verdict"] for row in stored} == {"pass"}
    assert {row["autonomy_level"] for row in stored} <= {"A0", "A1"}


def test_skip_verdict_is_accepted(verify_unit: Unit) -> None:
    """0008 이 허용한 값. 실행하지 않은 검사를 기록할 수 있다."""
    repository = VerificationRepository(verify_unit)
    repository.record_results(
        ANALYSIS_VERSION,
        [
            CheckResult(
                check=CheckName.CROSS_MODEL,
                target_type="analysis_claim",
                target_id="claim_42",
                verdict=CheckVerdict.SKIP,
                reason_code="CHECK_NOT_APPLICABLE",
            )
        ],
    )
    stored = repository.results_for(ANALYSIS_VERSION, "analysis_claim", "claim_42")
    assert stored[0]["verdict"] == "skip"


def test_detail_is_stored_as_jsonb(verify_unit: Unit) -> None:
    repository = VerificationRepository(verify_unit)
    repository.record_results(
        ANALYSIS_VERSION,
        [
            CheckResult(
                check=CheckName.NUMERICAL,
                target_type="analysis_claim",
                target_id="claim_42",
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code="CHECK_ERROR",
                detail={"error": "RuntimeError", "message": "검사기 내부 오류"},
            )
        ],
    )
    stored = repository.results_for(ANALYSIS_VERSION, "analysis_claim", "claim_42")
    assert stored[0]["detail"]["message"] == "검사기 내부 오류"


def test_blocking_results_are_queryable(verify_unit: Unit) -> None:
    repository = VerificationRepository(verify_unit)
    repository.record_results(
        ANALYSIS_VERSION,
        [
            CheckResult(
                check=CheckName.SCHEMA,
                target_type="analysis_claim",
                target_id="claim_1",
                verdict=CheckVerdict.PASS,
            ),
            CheckResult(
                check=CheckName.SOURCE_POLICY,
                target_type="analysis_claim",
                target_id="claim_2",
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code="EXTERNAL_TIER_USED_FOR_COMPANY_REQUIREMENT",
                repair_action=RepairAction.DROP_CLAIM,
            ),
            CheckResult(
                check=CheckName.CONTRADICTION,
                target_type="analysis_claim",
                target_id="claim_3",
                verdict=CheckVerdict.FAIL,
                severity=Severity.WARNING,
                reason_code="WEAK_COUNTEREVIDENCE",
            ),
        ],
    )
    blocking = repository.blocking_results(ANALYSIS_VERSION)
    assert [row["target_id"] for row in blocking] == ["claim_2"]


# ============================================================ 스키마 제약
def test_verdict_cannot_be_null(rollback_conn: psycopg.Connection) -> None:
    """판정 없는 행이 쌓이면 릴리스 게이트가 검증하지 않은 산출물을 통과시킨다."""
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        with pytest.raises(psycopg.errors.NotNullViolation):
            cur.execute(
                "INSERT INTO verification_results (result_id, analysis_version,"
                " target_type, target_id, check_name, autonomy_level, severity)"
                " VALUES ('ver_x', 'an_verify_test', 'analysis_claim', 'claim_42',"
                " 'schema_validator', 'A0', 'info')"
            )
    rollback_conn.rollback()


def test_warn_verdict_is_rejected(rollback_conn: psycopg.Connection) -> None:
    """경고는 verdict 가 아니라 severity 가 담는다."""
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        with pytest.raises(psycopg.errors.CheckViolation):
            cur.execute(
                "INSERT INTO verification_results (result_id, analysis_version,"
                " target_type, target_id, check_name, autonomy_level, verdict, severity)"
                " VALUES ('ver_x', 'an_verify_test', 'analysis_claim', 'claim_42',"
                " 'schema_validator', 'A0', 'warn', 'warning')"
            )
    rollback_conn.rollback()


# ============================================================ 수리 지시
def test_request_research_action_is_accepted(verify_unit: Unit) -> None:
    """0008 이 허용한 값. 예시 JSON 과 제약이 일치한다."""
    repository = VerificationRepository(verify_unit)
    order_id = repository.add_repair_order(
        RUN_ID,
        RepairOrder(
            target_claim_id="claim_42",
            failed_check=CheckName.ENTAILMENT,
            reason="공고 근거는 존재하나 회사 공식 보강 근거가 없음",
            action=RepairAction.REQUEST_RESEARCH,
            missing_evidence=MissingEvidence(
                source_tier=SourceTier.COMPANY_OFFICIAL,
                company_id="company_a",
                topic="transaction_integrity",
            ),
        ),
    )
    row = verify_unit.fetch_one(
        "SELECT * FROM repair_orders WHERE order_id = %s", (order_id,)
    )
    assert row["action"] == "request_research"
    assert row["missing_evidence"]["source_tier"] == "B"


# ============================================================ 조사 요청
def test_verify_pipeline_can_open_research_request(verify_unit: Unit) -> None:
    """needs_research 판정이 요청을 발행한다. 상태는 오케스트레이터만 바꾼다."""
    repository = VerificationRepository(verify_unit)
    repository.open_research_request(
        ResearchRequest(
            request_id="req_verify_test",
            requested_by_run_id=RUN_ID,
            analysis_version=ANALYSIS_VERSION,
            goal="핀테크 기업군의 트랜잭션 무결성 공식 자료 확보",
            needed_evidence_type="company_official",
            job_role_id="backend",
            scope_level=ScopeLevel.CLUSTER,
            scope_id="fintech",
        )
    )
    row = verify_unit.fetch_one(
        "SELECT * FROM research_requests WHERE request_id = 'req_verify_test'"
    )
    assert row["status"] == "open"


def test_verify_pipeline_cannot_change_request_status(verify_unit: Unit) -> None:
    with pytest.raises(psycopg.Error) as exc:
        verify_unit.execute(
            "UPDATE research_requests SET status = 'fulfilled'"
            " WHERE request_id = 'req_verify_test'"
        )
    assert "permission denied" in str(exc.value).lower()


# ============================================================ 쓰기 범위
def test_verify_pipeline_cannot_write_claims(verify_unit: Unit) -> None:
    """검증은 판정만 남기고 산출물을 고치지 않는다."""
    with pytest.raises(PermissionError):
        VerificationRepository(verify_unit).unit.insert(
            "analysis_claims", {"claim_id": "claim_x"}
        )


def test_repository_refuses_a_foreign_transaction(
    rollback_conn: psycopg.Connection,
) -> None:
    """다른 구성요소의 거래에서는 만들 수 없다."""
    with pytest.raises(PermissionError):
        VerificationRepository(Unit(rollback_conn, Component.AGENT_INTERPRET))
