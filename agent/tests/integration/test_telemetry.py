"""실행 궤적과 도구 호출 기록 검증.

기록 범위는 docs/permission-matrix.md 3.1, 불변성 규칙은 6.2를 따른다.
실행 기록 두 종은 시작할 때 행을 만들고 끝날 때 결말만 채운다.
"""

from __future__ import annotations

from datetime import datetime

import psycopg
import pytest

from careersignal.contracts.check_result import AutonomyLevel
from careersignal.domain.permissions import Component
from careersignal.repositories.base import Unit
from careersignal.repositories.telemetry import TelemetryRepository

from .conftest import requires_db

pytestmark = requires_db

ANALYSIS_VERSION = "an_trace_test"
RUN_ID = "run_trace_test"

SEED = """
INSERT INTO dataset_versions (dataset_version, job_role_id, as_of_date)
  VALUES ('ds_trace_test', 'backend', current_date);
INSERT INTO analysis_versions (
  analysis_version, job_role_id, dataset_version, taxonomy_version_id,
  model_version, prompt_version, retrieval_policy_version, metric_policy_version,
  scope_spec, status
) VALUES (
  'an_trace_test', 'backend', 'ds_trace_test', 'tx_backend_v1',
  'model_v1', 'prompt_v1', 'rp_v1', 'mp_v1_prevalence',
  '{"scope_level": "overall"}'::jsonb, 'running'
);
"""


@pytest.fixture
def trace_unit(rollback_conn: psycopg.Connection) -> Unit:
    """계측은 전 구성요소가 쓴다. 해석 에이전트 역할로 확인한다."""
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute('SET LOCAL ROLE "cs_agent_interpret"')
    return Unit(rollback_conn, Component.AGENT_INTERPRET)


def _started(unit: Unit) -> TelemetryRepository:
    repository = TelemetryRepository(unit)
    repository.start_run(
        agent_run_id=RUN_ID,
        analysis_version=ANALYSIS_VERSION,
        agent_name="interpretation",
        iteration=1,
        objective_id="obj_trace_test",
    )
    return repository


# ============================================================ 실행 기록
def test_run_is_opened_then_closed(trace_unit: Unit) -> None:
    """다른 표가 실행 중에 agent_run_id 를 참조하므로 행이 먼저 있어야 한다."""
    repository = _started(trace_unit)
    opened = trace_unit.fetch_one(
        "SELECT * FROM agent_runs WHERE agent_run_id = %s", (RUN_ID,)
    )
    assert opened["stop_reason"] is None
    assert opened["ended_at"] is None

    repository.finish_run(RUN_ID, stop_reason="slots_filled", tokens=1200, cost=0.42)
    closed = trace_unit.fetch_one(
        "SELECT * FROM agent_runs WHERE agent_run_id = %s", (RUN_ID,)
    )
    assert closed["stop_reason"] == "slots_filled"
    assert closed["tokens"] == 1200
    assert closed["ended_at"] is not None


def test_stop_reason_is_restricted_to_the_declared_set(trace_unit: Unit) -> None:
    """종료 사유는 docs/agent-design.md 11.3의 일곱 값이다."""
    repository = _started(trace_unit)
    with pytest.raises(psycopg.errors.CheckViolation):
        repository.finish_run(RUN_ID, stop_reason="아무튼_끝남")


def test_start_time_rewrite_is_denied_by_grant(trace_unit: Unit) -> None:
    """구성요소에는 결말 컬럼의 UPDATE 만 있다. 트리거까지 가지 않는다."""
    _started(trace_unit)
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        trace_unit.execute(
            "UPDATE agent_runs SET started_at = now() WHERE agent_run_id = %s",
            (RUN_ID,),
        )


def test_run_delete_is_denied_by_grant(trace_unit: Unit) -> None:
    _started(trace_unit)
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        trace_unit.execute(
            "DELETE FROM agent_runs WHERE agent_run_id = %s", (RUN_ID,)
        )


# ============================================================ 단계 기록
def test_step_records_autonomy_level(trace_unit: Unit) -> None:
    repository = _started(trace_unit)
    repository.record_step(
        step_id="step_trace_1",
        agent_run_id=RUN_ID,
        step_name="evidence_set_optimization",
        autonomy_level=AutonomyLevel.A0,
    )
    repository.finish_step("step_trace_1", ended_at=datetime.now())

    row = trace_unit.fetch_one(
        "SELECT * FROM agent_run_steps WHERE step_id = 'step_trace_1'"
    )
    assert row["autonomy_level"] == "A0"
    assert row["ended_at"] is not None


def test_step_identity_rewrite_is_denied_by_grant(trace_unit: Unit) -> None:
    """단계에는 ended_at 의 UPDATE 만 있다."""
    repository = _started(trace_unit)
    repository.record_step(
        step_id="step_trace_1",
        agent_run_id=RUN_ID,
        step_name="router",
        autonomy_level=AutonomyLevel.A0,
    )
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        trace_unit.execute(
            "UPDATE agent_run_steps SET agent_run_id = 'run_other'"
            " WHERE step_id = 'step_trace_1'"
        )


# ============================================================ 도구 호출
def test_tool_call_arguments_are_stored_as_jsonb(trace_unit: Unit) -> None:
    """jsonb 컬럼에 문자열을 넘기면 타입이 text 로 추론된다."""
    repository = _started(trace_unit)
    repository.record_tool_call(
        call_id="call_trace_1",
        agent_run_id=RUN_ID,
        tool_name="search_vector",
        arguments={"query": "트랜잭션 무결성", "top_k": 20},
        latency=134,
    )
    row = trace_unit.fetch_one(
        "SELECT * FROM tool_calls WHERE call_id = 'call_trace_1'"
    )
    assert row["arguments"]["query"] == "트랜잭션 무결성"
    assert row["arguments"]["top_k"] == 20
    assert row["latency"] == 134


def test_tool_call_records_failure(trace_unit: Unit) -> None:
    """실패한 호출도 궤적에 남는다."""
    repository = _started(trace_unit)
    repository.record_tool_call(
        call_id="call_trace_2",
        agent_run_id=RUN_ID,
        tool_name="fetch_source",
        arguments={"url": "https://example.test/gone"},
        error="404",
    )
    row = trace_unit.fetch_one(
        "SELECT * FROM tool_calls WHERE call_id = 'call_trace_2'"
    )
    assert row["error"] == "404"


def test_tool_call_update_is_denied_by_grant(trace_unit: Unit) -> None:
    """도구 호출에는 INSERT 만 있다."""
    repository = _started(trace_unit)
    repository.record_tool_call(
        call_id="call_trace_3", agent_run_id=RUN_ID, tool_name="search_sql"
    )
    with pytest.raises(psycopg.errors.InsufficientPrivilege):
        trace_unit.execute(
            "UPDATE tool_calls SET error = 'rewritten' WHERE call_id = 'call_trace_3'"
        )


# ============================================================ 트리거 층
# 권한이 먼저 막으므로 구성요소 role 로는 트리거에 닿지 않는다. 권한 설정이
# 잘못되어도 기록이 보존되는지 확인하려면 권한이 있는 소유자로 시도해야 한다.

SEED_RUN = """
INSERT INTO agent_runs (agent_run_id, analysis_version, agent_name, iteration, started_at)
  VALUES ('run_trace_test', 'an_trace_test', 'interpretation', 1, now());
INSERT INTO agent_run_steps (step_id, agent_run_id, step_name, autonomy_level, started_at)
  VALUES ('step_trace_1', 'run_trace_test', 'router', 'A0', now());
INSERT INTO tool_calls (call_id, agent_run_id, tool_name)
  VALUES ('call_trace_1', 'run_trace_test', 'search_sql');
"""


def _owner_denied(conn: psycopg.Connection, sql: str) -> str:
    """권한이 있는 소유자로 시도해 트리거를 확인한다."""
    with conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute(SEED_RUN)
        with pytest.raises(psycopg.Error) as exc:
            cur.execute(sql)
    conn.rollback()
    return str(exc.value)


def test_trigger_protects_run_start_time(rollback_conn: psycopg.Connection) -> None:
    """트리거는 값이 실제로 달라질 때 막는다.

    `now()` 는 거래 시작 시각이라 같은 거래 안에서는 항상 같은 값을 준다.
    시드와 같은 `now()` 로 덮어쓰면 `IS DISTINCT FROM` 이 거짓이라 통과한다.
    """
    message = _owner_denied(
        rollback_conn,
        "UPDATE agent_runs SET started_at = now() - interval '1 day'"
        " WHERE agent_run_id = 'run_trace_test'",
    )
    assert "immutable" in message


def test_trigger_blocks_run_delete(rollback_conn: psycopg.Connection) -> None:
    message = _owner_denied(
        rollback_conn, "DELETE FROM agent_runs WHERE agent_run_id = 'run_trace_test'"
    )
    assert "append-only" in message


def test_trigger_protects_step_identity(rollback_conn: psycopg.Connection) -> None:
    message = _owner_denied(
        rollback_conn,
        "UPDATE agent_run_steps SET agent_run_id = 'run_other'"
        " WHERE step_id = 'step_trace_1'",
    )
    assert "immutable" in message


def test_trigger_blocks_tool_call_update(rollback_conn: psycopg.Connection) -> None:
    message = _owner_denied(
        rollback_conn,
        "UPDATE tool_calls SET error = 'rewritten' WHERE call_id = 'call_trace_1'",
    )
    assert "append-only" in message


def test_completion_columns_remain_updatable(rollback_conn: psycopg.Connection) -> None:
    """결말은 채울 수 있어야 한다. 트리거가 전량 차단하지 않는다."""
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute(SEED_RUN)
        cur.execute(
            "UPDATE agent_runs SET stop_reason = 'slots_filled', ended_at = now()"
            " WHERE agent_run_id = 'run_trace_test'"
        )
        assert cur.rowcount == 1
    rollback_conn.rollback()


# ============================================================ 공통 쓰기
def test_every_component_can_write_the_trace(rollback_conn: psycopg.Connection) -> None:
    """계측은 구성요소 제한이 없다. 검증 파이프라인 역할로도 기록한다."""
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute('SET LOCAL ROLE "cs_pipe_verify"')

    unit = Unit(rollback_conn, Component.PIPE_VERIFY)
    TelemetryRepository(unit).start_run(
        agent_run_id="run_verify_trace",
        analysis_version=ANALYSIS_VERSION,
        agent_name="verification",
        iteration=1,
    )
    row = unit.fetch_one(
        "SELECT * FROM agent_runs WHERE agent_run_id = 'run_verify_trace'"
    )
    assert row["agent_name"] == "verification"
