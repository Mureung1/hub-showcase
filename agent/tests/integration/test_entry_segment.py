"""대상군 축의 스키마 강제 검증.

migration 0009가 적용됐는지, 축이 유일 조건에 들어갔는지 확인한다.
정의는 docs/erd.md 10.5·10.6이다.
"""

from __future__ import annotations

import psycopg
import pytest

from careersignal.domain.segment import EntrySegment

from .conftest import requires_db

pytestmark = requires_db

SEED = """
INSERT INTO dataset_versions (dataset_version, job_role_id, as_of_date)
  VALUES ('ds_segment_test', 'backend', current_date);
INSERT INTO analysis_versions (
  analysis_version, job_role_id, dataset_version, taxonomy_version_id,
  model_version, prompt_version, retrieval_policy_version, metric_policy_version,
  scope_spec, status
) VALUES (
  'an_segment_test', 'backend', 'ds_segment_test', 'tx_backend_v1',
  'model_v1', 'prompt_v1', 'rp_v1', 'mp_v1_prevalence',
  '{"scope_level": "overall"}'::jsonb, 'running'
);
"""


def _fact(fact_id: str, segment: str, family: str = "posting_prevalence") -> str:
    return (
        "INSERT INTO statistics_facts (fact_id, analysis_version, metric_family,"
        " metric_policy_version, scope_level, scope_id, entry_segment, period_id,"
        " measure, numerator, denominator, sample_size, sample_status)"
        f" VALUES ('{fact_id}', 'an_segment_test', '{family}', 'mp_v1_prevalence',"
        f" 'overall', 'backend', '{segment}', 'recent_12m', 'ratio', 6, 10, 10,"
        " 'analysis_ready')"
    )


@pytest.fixture
def seeded(rollback_conn: psycopg.Connection) -> psycopg.Connection:
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
    return rollback_conn


def test_segment_values_match_the_domain(seeded: psycopg.Connection) -> None:
    """도메인 값이 그대로 저장된다."""
    with seeded.cursor() as cur:
        for index, segment in enumerate(EntrySegment):
            cur.execute(_fact(f"fact_seg_{index}", str(segment)))
        cur.execute(
            "SELECT count(*) FROM statistics_facts WHERE analysis_version = %s",
            ("an_segment_test",),
        )
        assert cur.fetchone()[0] == len(EntrySegment)


def test_unknown_segment_is_rejected(seeded: psycopg.Connection) -> None:
    with seeded.cursor() as cur:
        with pytest.raises(psycopg.errors.CheckViolation):
            cur.execute(_fact("fact_bad", "senior"))
    seeded.rollback()


def test_segment_is_required(seeded: psycopg.Connection) -> None:
    """대상군 없는 지표 행은 어느 기준선의 값인지 알 수 없다."""
    with seeded.cursor() as cur:
        with pytest.raises(psycopg.errors.NotNullViolation):
            cur.execute(
                "INSERT INTO statistics_facts (fact_id, analysis_version, metric_family,"
                " metric_policy_version, scope_level, scope_id, period_id, measure,"
                " sample_size, sample_status) VALUES"
                " ('fact_x','an_segment_test','posting_prevalence','mp_v1_prevalence',"
                " 'overall','backend','recent_12m','ratio',10,'analysis_ready')"
            )
    seeded.rollback()


def test_two_segments_coexist_for_the_same_metric(
    seeded: psycopg.Connection,
) -> None:
    """축이 유일 조건에 없으면 두 대상군의 값이 서로를 덮어쓴다."""
    with seeded.cursor() as cur:
        cur.execute(_fact("fact_ej", "entry_junior"))
        cur.execute(_fact("fact_ex", "experienced"))
        cur.execute(
            "SELECT count(*) FROM statistics_facts"
            " WHERE analysis_version = 'an_segment_test'"
            "   AND metric_family = 'posting_prevalence' AND measure = 'ratio'"
        )
        assert cur.fetchone()[0] == 2


def test_same_metric_and_segment_cannot_repeat(seeded: psycopg.Connection) -> None:
    with seeded.cursor() as cur:
        cur.execute(_fact("fact_a", "entry_junior"))
        with pytest.raises(psycopg.errors.UniqueViolation):
            cur.execute(_fact("fact_b", "entry_junior"))
    seeded.rollback()


def test_signal_rate_is_confined_to_entry_junior(
    seeded: psycopg.Connection,
) -> None:
    """분모에 이미 대상군이 반영된 지표를 다른 대상군으로 저장할 수 없다."""
    with seeded.cursor() as cur:
        cur.execute(
            _fact("fact_ok", "entry_junior", "entry_label_advanced_signal_rate")
        )
        with pytest.raises(psycopg.errors.CheckViolation):
            cur.execute(
                _fact("fact_no", "experienced", "entry_label_advanced_signal_rate")
            )
    seeded.rollback()
