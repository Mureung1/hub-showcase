"""권한 경계 검증.

docs/permission-matrix.md 6.3의 표가 이 테스트의 목록이다.
허용 범위 밖 쓰기가 실제로 실패하는지 확인한다.
"""

from __future__ import annotations

import psycopg
import pytest

from careersignal.domain.permissions import (
    Component,
    can_write,
    require_write,
)

from .conftest import requires_db

pytestmark = requires_db


def as_role(conn: psycopg.Connection, role: str) -> None:
    """구성요소 role 로 전환한다.

    PostgreSQL 16 부터 SET ROLE 에는 멤버십의 SET 옵션이 필요하다.
    전환이 안 되면 권한 검사 자체가 성립하지 않으므로 원인을 구분해 알린다.
    """
    with conn.cursor() as cur:
        try:
            cur.execute(f'SET LOCAL ROLE "{role}"')
        except psycopg.errors.InsufficientPrivilege as exc:
            conn.rollback()
            pytest.fail(
                f"{role} 로 전환할 수 없다. 접속 사용자에게 SET 옵션이 없다. "
                f"alembic upgrade head 로 0007 을 적용한다. 원문: {exc}"
            )


def test_connection_user_can_switch_to_every_role(rollback_conn) -> None:
    """권한 검사의 전제. 전환이 안 되면 아래 검사들이 모두 무의미하다."""
    from careersignal.domain.permissions import DB_ROLE

    missing = []
    with rollback_conn.cursor() as cur:
        for role in DB_ROLE.values():
            cur.execute("SELECT pg_has_role(current_user, %s, 'SET')", (role,))
            if not cur.fetchone()[0]:
                missing.append(role)
    assert missing == [], f"SET 옵션이 없는 role: {missing}"


def expect_denied(conn: psycopg.Connection, sql: str, params: tuple = ()) -> str:
    """실패해야 하는 문장. 실패 사유를 돌려준다."""
    with conn.cursor() as cur:
        with pytest.raises(psycopg.Error) as exc:
            cur.execute(sql, params)
    conn.rollback()
    return str(exc.value)


# ============================================================ 코드 층
def test_code_layer_blocks_out_of_scope_tables() -> None:
    """데이터베이스에 가기 전에 코드가 먼저 막는다."""
    assert not can_write(Component.AGENT_INTERPRET, "statistics_facts")
    assert not can_write(Component.AGENT_STATS, "analysis_claims")
    assert not can_write(Component.SERVING, "analysis_outputs")
    assert can_write(Component.AGENT_INTERPRET, "analysis_claims")

    with pytest.raises(PermissionError):
        require_write(Component.AGENT_INTERPRET, "statistics_facts")


def test_every_component_can_write_telemetry() -> None:
    for component in Component:
        if component is Component.SERVING:
            continue
        assert can_write(component, "agent_runs")
        assert can_write(component, "tool_calls")


def test_operator_tables_belong_to_nobody() -> None:
    for component in Component:
        assert not can_write(component, "job_roles")
        assert not can_write(component, "metric_policy_versions")
        assert not can_write(component, "ontology_versions")


# ============================================================ 데이터베이스 층
def test_interpret_role_cannot_write_statistics(rollback_conn) -> None:
    as_role(rollback_conn, "cs_agent_interpret")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO statistics_facts (fact_id, analysis_version, metric_family,"
        " metric_policy_version, scope_level, scope_id, period_id, measure,"
        " sample_size, sample_status) VALUES"
        " ('fact_x','an_x','posting_prevalence','mp_v1_prevalence','overall','backend',"
        " 'recent_12m','ratio',1,'analysis_ready')",
    )
    assert "permission denied" in message.lower()


def test_stats_role_cannot_write_claims(rollback_conn) -> None:
    as_role(rollback_conn, "cs_agent_stats")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO analysis_claims (claim_id, analysis_version, output_id,"
        " claim_type, scope_level, scope_id, claim_text, structured_slots,"
        " confidence_components, verification_status)"
        " VALUES ('claim_x','an_x','out_x','statistic','overall','backend','t',"
        " '{}'::jsonb,'{}'::jsonb,'verified')",
    )
    assert "permission denied" in message.lower()


def test_serving_role_cannot_write_anything(rollback_conn) -> None:
    as_role(rollback_conn, "cs_serving")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO job_roles (job_role_id, display_name) VALUES ('x','x')",
    )
    assert "permission denied" in message.lower()


def test_requester_cannot_change_research_request_status(rollback_conn) -> None:
    """요청자는 넣기만 하고 상태는 오케스트레이터만 바꾼다."""
    as_role(rollback_conn, "cs_agent_interpret")
    message = expect_denied(
        rollback_conn,
        "UPDATE research_requests SET status = 'fulfilled' WHERE request_id = 'x'",
    )
    assert "permission denied" in message.lower()


# ============================================================ 제약 층
def test_strategy_role_cannot_forge_output_type(rollback_conn) -> None:
    """산출물 종류와 실행 주체의 불일치를 CHECK 가 막는다."""
    as_role(rollback_conn, "cs_agent_strategy")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO analysis_outputs (output_id, analysis_version, job_role_id,"
        " scope_level, scope_id, output_type, payload, produced_by_agent,"
        " verification_status, generated_at)"
        " VALUES ('out_x','an_x','backend','overall','backend','roadmap','{}'::jsonb,"
        " 'strategy','verified', now())",
    )
    assert "output_producer_match" in message or "check constraint" in message.lower()


def test_coverage_flag_cannot_be_forged(rollback_conn) -> None:
    """전수 확인이 아닌데 편차 없음을 주장할 수 없다."""
    as_role(rollback_conn, "cs_agent_interpret")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO coverage_assertions (assertion_id, analysis_version, scope_level,"
        " scope_id, population_n, checked_n, matched_n, assertion, coverage_complete)"
        " VALUES ('as_x','an_x','cluster','fintech',10,5,0,'absent',true)",
    )
    assert "coverage_flag_derived" in message or "check constraint" in message.lower()


def test_numerator_cannot_exceed_denominator(rollback_conn) -> None:
    as_role(rollback_conn, "cs_pipe_aggregate")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO statistics_facts (fact_id, analysis_version, metric_family,"
        " metric_policy_version, scope_level, scope_id, period_id, measure,"
        " numerator, denominator, sample_size, sample_status)"
        " VALUES ('fact_x','an_x','posting_prevalence','mp_v1_prevalence','overall',"
        " 'backend','recent_12m','ratio', 20, 10, 10, 'analysis_ready')",
    )
    assert "numerator_within" in message or "check constraint" in message.lower()


def test_disallowed_source_use_is_rejected(rollback_conn) -> None:
    as_role(rollback_conn, "cs_agent_collect")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO source_assessments (assessment_id, snapshot_id, source_tier,"
        " allowed_uses, assessment_version, assessed_at)"
        " VALUES ('as_x','snap_x','D', ARRAY['not_a_real_use'], 'v1', now())",
    )
    assert "allowed_uses_known" in message or "check constraint" in message.lower()


# ============================================================ 행 수준 정책
def test_knowledge_agent_cannot_write_provenance_edges(rollback_conn) -> None:
    as_role(rollback_conn, "cs_agent_knowledge")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO knowledge_edges (edge_id, graph_layer, edge_type, src_node_id,"
        " dst_node_id, verification_status, ontology_version)"
        " VALUES ('edge_x','provenance','SUPPORTED_BY','node_a','node_b','verified','v1')",
    )
    assert "policy" in message.lower() or "permission denied" in message.lower()


def test_lineage_pipeline_cannot_write_pre_semantic_edges(rollback_conn) -> None:
    as_role(rollback_conn, "cs_pipe_lineage")
    message = expect_denied(
        rollback_conn,
        "INSERT INTO knowledge_edges (edge_id, graph_layer, edge_type, src_node_id,"
        " dst_node_id, verification_status, ontology_version)"
        " VALUES ('edge_y','semantic','REQUIRES','node_a','node_b','verified','v1')",
    )
    assert "policy" in message.lower() or "permission denied" in message.lower()


# ============================================================ 트리거 층
# 행 수준 트리거는 대상 행이 있어야 실행된다. 빈 표에 대한 UPDATE 는
# 아무 행도 건드리지 않으므로 예외가 나지 않는다. 최소 계보를 만들고 검사한다.

SEED_SOURCE_CHAIN = """
INSERT INTO dataset_versions (dataset_version, as_of_date)
  VALUES ('ds_trigger_test', current_date);
INSERT INTO sources (source_id, source_type, url, first_seen_at)
  VALUES ('src_trigger_test', 'job_posting', 'https://example.test/trigger', now());
INSERT INTO source_snapshots (snapshot_id, source_id, content_hash, raw_content,
                              fetched_at, dataset_version)
  VALUES ('snap_trigger_test', 'src_trigger_test',
          repeat('a', 64), 'original', now(), 'ds_trigger_test');
INSERT INTO source_observations (observation_id, snapshot_id, observed_at, fetch_status)
  VALUES ('obs_trigger_test', 'snap_trigger_test', now(), 'ok');
"""


def test_snapshot_content_cannot_be_updated(rollback_conn) -> None:
    """권한과 무관하게 원본은 보존된다."""
    with rollback_conn.cursor() as cur:
        cur.execute(SEED_SOURCE_CHAIN)
        with pytest.raises(psycopg.Error) as exc:
            cur.execute(
                "UPDATE source_snapshots SET raw_content = 'tampered'"
                " WHERE snapshot_id = 'snap_trigger_test'"
            )
    rollback_conn.rollback()
    assert "append-only" in str(exc.value)


def test_snapshot_cannot_be_deleted(rollback_conn) -> None:
    with rollback_conn.cursor() as cur:
        cur.execute(SEED_SOURCE_CHAIN)
        with pytest.raises(psycopg.Error) as exc:
            cur.execute(
                "DELETE FROM source_snapshots WHERE snapshot_id = 'snap_trigger_test'"
            )
    rollback_conn.rollback()
    assert "append-only" in str(exc.value)


def test_observation_cannot_be_deleted(rollback_conn) -> None:
    with rollback_conn.cursor() as cur:
        cur.execute(SEED_SOURCE_CHAIN)
        with pytest.raises(psycopg.Error) as exc:
            cur.execute(
                "DELETE FROM source_observations"
                " WHERE observation_id = 'obs_trigger_test'"
            )
    rollback_conn.rollback()
    assert "append-only" in str(exc.value)


@pytest.mark.parametrize(
    "table",
    [
        "source_snapshots",
        "source_observations",
        "retrieval_runs",
        "retrieval_queries",
        "retrieval_candidates",
        "evidence_sets",
        "evidence_set_members",
        "evidence_usages",
        "tool_calls",
        "agent_runs",
        "agent_run_steps",
    ],
)
def test_append_only_trigger_installed(rollback_conn, table: str) -> None:
    """행이 없어도 트리거가 걸려 있는지는 확인할 수 있다."""
    with rollback_conn.cursor() as cur:
        cur.execute(
            "SELECT count(*) FROM pg_trigger"
            " WHERE tgrelid = %s::regclass AND NOT tgisinternal",
            (table,),
        )
        assert cur.fetchone()[0] >= 1


# ============================================================ 기준 데이터
def test_seed_reference_data_present(rollback_conn) -> None:
    with rollback_conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM company_clusters")
        assert cur.fetchone()[0] == 6
        cur.execute("SELECT count(*) FROM metric_templates")
        assert cur.fetchone()[0] == 7
        cur.execute("SELECT count(*) FROM ontology_versions")
        assert cur.fetchone()[0] == 2
        cur.execute("SELECT count(*) FROM periods")
        assert cur.fetchone()[0] == 2


def test_pgvector_is_installed(rollback_conn) -> None:
    with rollback_conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
        assert cur.fetchone() is not None


def test_embedding_column_matches_smoke_test(rollback_conn) -> None:
    """P2-2에서 확인한 차원과 테이블 정의가 일치한다."""
    from careersignal.providers.models import EMBEDDING

    with rollback_conn.cursor() as cur:
        cur.execute(
            "SELECT atttypmod FROM pg_attribute"
            " WHERE attrelid = 'chunk_embeddings'::regclass AND attname = 'embedding'"
        )
        assert cur.fetchone()[0] == EMBEDDING.dimensions
