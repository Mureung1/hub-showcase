"""자료 정책 검사의 조회 경로 검증.

근거에서 청크·스냅샷·평가로 이어지는 조인과 최신 평가 선택을 확인한다.
정의는 docs/data-strategy.md 3.1이다.
"""

from __future__ import annotations

from datetime import date

import psycopg
import pytest

from careersignal.contracts import CheckVerdict, RepairAction, RunContext
from careersignal.domain.permissions import Component
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.base import Unit
from careersignal.repositories.verification import VerificationRepository
from careersignal.verification import CheckContext
from careersignal.verification.checks import source_policy_check
from careersignal.verification.checks.source_policy import (
    REASON_DISALLOWED_USE,
    REASON_NOT_ASSESSED,
)

from .conftest import requires_db

pytestmark = requires_db

CHUNK_TEXT = "대규모 트랜잭션 처리 경험을 중요하게 봅니다."

SEED = f"""
INSERT INTO dataset_versions (dataset_version, job_role_id, as_of_date)
  VALUES ('ds_policy_test', 'backend', DATE '2026-07-27');
INSERT INTO analysis_versions (
  analysis_version, job_role_id, dataset_version, taxonomy_version_id,
  model_version, prompt_version, retrieval_policy_version, metric_policy_version,
  scope_spec, status
) VALUES (
  'an_policy_test', 'backend', 'ds_policy_test', 'tx_backend_v1',
  'model_v1', 'prompt_v1', 'rp_v1', 'mp_v1_prevalence',
  '{{"scope_level": "overall"}}'::jsonb, 'validating'
);

-- 공고 원문(A 계층)과 외부 전문가 자료(D 계층)
INSERT INTO sources (source_id, source_type, url, first_seen_at) VALUES
  ('src_posting', 'job_posting', 'https://example.test/careers', now()),
  ('src_expert', 'external_expert', 'https://example.test/blog', now()),
  ('src_unassessed', 'company_official', 'https://example.test/tech', now());

INSERT INTO source_snapshots (snapshot_id, source_id, content_hash, raw_content,
                              fetched_at, dataset_version) VALUES
  ('snap_posting', 'src_posting', repeat('1', 64), '{CHUNK_TEXT}',
   TIMESTAMPTZ '2026-07-01 09:00+09', 'ds_policy_test'),
  ('snap_expert', 'src_expert', repeat('2', 64), '{CHUNK_TEXT}',
   TIMESTAMPTZ '2026-07-01 09:00+09', 'ds_policy_test'),
  ('snap_unassessed', 'src_unassessed', repeat('3', 64), '{CHUNK_TEXT}',
   TIMESTAMPTZ '2026-07-01 09:00+09', 'ds_policy_test');

INSERT INTO source_chunks (chunk_id, snapshot_id, ordinal, text, context,
                           embedding_text, token_count, dataset_version) VALUES
  ('chunk_posting', 'snap_posting', 1, '{CHUNK_TEXT}', '{{}}'::jsonb,
   '{CHUNK_TEXT}', 12, 'ds_policy_test'),
  ('chunk_expert', 'snap_expert', 1, '{CHUNK_TEXT}', '{{}}'::jsonb,
   '{CHUNK_TEXT}', 12, 'ds_policy_test'),
  ('chunk_unassessed', 'snap_unassessed', 1, '{CHUNK_TEXT}', '{{}}'::jsonb,
   '{CHUNK_TEXT}', 12, 'ds_policy_test');

-- 공고 스냅샷은 두 번 평가됐다. 최신 평가가 적용되어야 한다.
INSERT INTO source_assessments (assessment_id, snapshot_id, source_tier, allowed_uses,
                                assessment_version, assessed_at) VALUES
  ('assess_old', 'snap_posting', 'A', ARRAY['interpretation_context'],
   'sa_v1', TIMESTAMPTZ '2026-06-01 09:00+09'),
  ('assess_new', 'snap_posting', 'A', ARRAY['statistics','interpretation_context'],
   'sa_v2', TIMESTAMPTZ '2026-07-02 09:00+09'),
  ('assess_expert', 'snap_expert', 'D', ARRAY['strategy','roadmap'],
   'sa_v1', TIMESTAMPTZ '2026-07-02 09:00+09');

INSERT INTO analysis_outputs (output_id, analysis_version, job_role_id, scope_level,
                              scope_id, output_type, payload, produced_by_agent,
                              verification_status, generated_at)
  VALUES ('out_policy', 'an_policy_test', 'backend', 'overall', 'backend',
          'interpretation', '{{}}'::jsonb, 'interpretation',
          'insufficient_evidence', now());

INSERT INTO analysis_claims (claim_id, analysis_version, output_id, claim_type,
                             scope_level, scope_id, claim_text, structured_slots,
                             confidence_components, verification_status) VALUES
  ('claim_stat', 'an_policy_test', 'out_policy', 'statistic', 'overall', 'backend',
   '공고의 60%가 트랜잭션 처리를 요구한다', '{{}}'::jsonb, '{{}}'::jsonb,
   'insufficient_evidence'),
  ('claim_strategy', 'an_policy_test', 'out_policy', 'strategy', 'overall', 'backend',
   '트랜잭션 처리 프로젝트를 포트폴리오에 넣는다', '{{}}'::jsonb, '{{}}'::jsonb,
   'insufficient_evidence'),
  ('claim_unassessed', 'an_policy_test', 'out_policy', 'statistic', 'overall',
   'backend', '평가되지 않은 자료에 기댄 주장', '{{}}'::jsonb, '{{}}'::jsonb,
   'insufficient_evidence'),
  ('claim_bad_stat', 'an_policy_test', 'out_policy', 'statistic', 'overall', 'backend',
   '외부 자료를 통계 근거로 삼은 주장', '{{}}'::jsonb, '{{}}'::jsonb,
   'insufficient_evidence');

INSERT INTO analysis_claim_evidence (claim_id, support_type, support_id, relation) VALUES
  ('claim_stat', 'chunk', 'chunk_posting', 'supports'),
  ('claim_stat', 'chunk', 'chunk_expert', 'contradicts'),
  ('claim_strategy', 'chunk', 'chunk_expert', 'supports'),
  ('claim_unassessed', 'chunk', 'chunk_unassessed', 'supports'),
  ('claim_bad_stat', 'chunk', 'chunk_expert', 'supports');
"""


@pytest.fixture
def verify_unit(rollback_conn: psycopg.Connection) -> Unit:
    with rollback_conn.cursor() as cur:
        cur.execute(SEED)
        cur.execute('SET LOCAL ROLE "cs_pipe_verify"')
    return Unit(rollback_conn, Component.PIPE_VERIFY)


def _run(unit: Unit, claim_id: str) -> object:
    check = source_policy_check(VerificationRepository(unit))
    return check(
        CheckContext(
            run=RunContext(
                agent_run_id="run_policy",
                analysis_version="an_policy_test",
                dataset_version="ds_policy_test",
                job_role_id="backend",
                scope_level=ScopeLevel.OVERALL,
                as_of_date=date(2026, 7, 27),
            ),
            target_type="analysis_claim",
            target_id=claim_id,
        )
    )


def test_latest_assessment_wins(verify_unit: Unit) -> None:
    """옛 평가는 통계를 허용하지 않았고 새 평가는 허용한다."""
    rows = VerificationRepository(verify_unit).claim_source_policy("claim_stat")

    assert len(rows) == 1
    assert rows[0]["assessment_version"] == "sa_v2"
    assert sorted(rows[0]["allowed_uses"]) == ["interpretation_context", "statistics"]


def test_contradicting_evidence_is_excluded(verify_unit: Unit) -> None:
    """D 계층 반례가 통계 주장의 정책 검사를 막지 않는다."""
    rows = VerificationRepository(verify_unit).claim_source_policy("claim_stat")

    assert [r["chunk_id"] for r in rows] == ["chunk_posting"]
    assert _run(verify_unit, "claim_stat").verdict is CheckVerdict.PASS


def test_external_tier_supporting_a_statistic_is_blocked(verify_unit: Unit) -> None:
    """같은 D 계층 청크라도 지지 근거로 쓰면 차단된다."""
    outcome = _run(verify_unit, "claim_bad_stat")

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_DISALLOWED_USE
    assert outcome.repair_action is RepairAction.DROP_CLAIM


def test_external_tier_supporting_a_strategy_passes(verify_unit: Unit) -> None:
    assert _run(verify_unit, "claim_strategy").verdict is CheckVerdict.PASS


def test_unassessed_source_is_blocked(verify_unit: Unit) -> None:
    outcome = _run(verify_unit, "claim_unassessed")

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_NOT_ASSESSED
