"""검사 2 자료 정책 검증.

실패 조건은 docs/data-strategy.md 3.1과 docs/knowledge-schema.md 8.5에서 온다.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

import pytest

from careersignal.contracts import CheckVerdict, RepairAction, RunContext, Severity
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import (
    TIER_ALLOWED_USES,
    AllowedUse,
    SourceTier,
)
from careersignal.verification import REASON_NOT_APPLICABLE, CheckContext
from careersignal.verification.checks import (
    CLAIM_TYPE_USE,
    WIKI_FIELD_USE,
    source_policy_check,
)
from careersignal.verification.checks.source_policy import (
    REASON_DISALLOWED_USE,
    REASON_NOT_ASSESSED,
    REASON_OUT_OF_TIME_WINDOW,
    REASON_UNKNOWN_CLAIM_TYPE,
)

AS_OF = date(2026, 7, 27)


def _context(target_type: str, target_id: str) -> CheckContext:
    return CheckContext(
        run=RunContext(
            agent_run_id="run_001",
            analysis_version="an_001",
            dataset_version="ds_001",
            job_role_id="backend",
            scope_level=ScopeLevel.OVERALL,
            as_of_date=AS_OF,
        ),
        target_type=target_type,
        target_id=target_id,
    )


def _evidence(
    tier: SourceTier | None = SourceTier.POSTING,
    uses: list[AllowedUse] | None = None,
    fetched_at: datetime | None = None,
    field_name: str | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "chunk_id": "chunk_1",
        "snapshot_id": "snap_1",
        "published_at": None,
        "fetched_at": fetched_at or datetime(2026, 7, 1),
        "source_tier": str(tier) if tier else None,
        "allowed_uses": None
        if uses is None
        else [str(u) for u in uses],
        "assessment_version": "sa_v1" if uses is not None else None,
    }
    if field_name:
        row["field_name"] = field_name
    return row


class FakeReader:
    def __init__(
        self,
        claim_type: str | None = "statistic",
        claim_rows: list[dict[str, Any]] | None = None,
        wiki_rows: list[dict[str, Any]] | None = None,
    ) -> None:
        self._claim_type = claim_type
        self._claim_rows = claim_rows if claim_rows is not None else []
        self._wiki_rows = wiki_rows if wiki_rows is not None else []

    def claim_type(self, claim_id: str) -> str | None:
        return self._claim_type

    def claim_source_policy(self, claim_id: str) -> list[dict[str, Any]]:
        return self._claim_rows

    def wiki_source_policy(self, revision_id: str) -> list[dict[str, Any]]:
        return self._wiki_rows


def _claim(**kw: Any) -> Any:
    return source_policy_check(FakeReader(**kw))(_context("analysis_claim", "claim_1"))


def _wiki(rows: list[dict[str, Any]]) -> Any:
    return source_policy_check(FakeReader(wiki_rows=rows))(
        _context("wiki_revision", "rev_1")
    )


# ============================================================ 매핑
def test_every_claim_type_has_a_use() -> None:
    """대응이 빠진 주장 유형이 있으면 그 근거가 검사 없이 통과한다."""
    declared = {
        "posting_explicit",
        "statistic",
        "cluster_generalization",
        "inferred_requirement",
        "company_context_signal",
        "strategy",
        "no_deviation",
    }
    assert declared == set(CLAIM_TYPE_USE)


def test_wiki_fields_map_one_to_one() -> None:
    """docs/data-strategy.md 3.1의 일대일 대응."""
    wiki_uses = {u for u in AllowedUse if str(u).startswith("wiki_")}
    assert set(WIKI_FIELD_USE.values()) == wiki_uses
    assert len(WIKI_FIELD_USE) == len(wiki_uses)


# ============================================================ 통과
def test_posting_tier_supports_statistics() -> None:
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[_evidence(SourceTier.POSTING, [AllowedUse.STATISTICS])],
    )
    assert outcome.verdict is CheckVerdict.PASS


def test_claim_without_chunk_evidence_is_not_applicable() -> None:
    outcome = _claim(claim_rows=[])
    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE


# ============================================================ 허용 용도
def test_external_tier_cannot_support_a_statistic() -> None:
    """D 계층을 통계 근거로 쓰면 차단하고 주장을 폐기한다."""
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[
            _evidence(SourceTier.VERIFIED_EXTERNAL, [AllowedUse.STRATEGY])
        ],
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_DISALLOWED_USE
    assert outcome.repair_action is RepairAction.DROP_CLAIM
    assert outcome.severity is Severity.BLOCKING


def test_external_tier_can_support_a_strategy() -> None:
    """같은 자료라도 용도가 다르면 허용된다. 계층은 품질 순서가 아니다."""
    outcome = _claim(
        claim_type="strategy",
        claim_rows=[
            _evidence(SourceTier.VERIFIED_EXTERNAL, [AllowedUse.STRATEGY])
        ],
    )
    assert outcome.verdict is CheckVerdict.PASS


def test_company_official_cannot_support_a_statistic() -> None:
    """회사 공식 자료는 해석 맥락이지 통계 근거가 아니다."""
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[
            _evidence(
                SourceTier.COMPANY_OFFICIAL, [AllowedUse.INTERPRETATION_CONTEXT]
            )
        ],
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_DISALLOWED_USE


def test_one_bad_source_fails_the_whole_claim() -> None:
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[
            _evidence(SourceTier.POSTING, [AllowedUse.STATISTICS]),
            _evidence(SourceTier.VERIFIED_EXTERNAL, [AllowedUse.STRATEGY]),
        ],
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_DISALLOWED_USE


# ============================================================ 평가 없음
def test_unassessed_source_is_refused() -> None:
    """계층을 모르는 자료를 통과시키지 않는다."""
    outcome = _claim(claim_rows=[_evidence(tier=None, uses=None)])

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_NOT_ASSESSED
    assert outcome.repair_action is RepairAction.SWAP_EVIDENCE


# ============================================================ 시간 적합성
def test_source_collected_after_the_reference_date_is_refused() -> None:
    """기준일 이후 자료를 쓰면 그 실행은 몰랐어야 할 것을 쓴 것이다."""
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[
            _evidence(
                SourceTier.POSTING,
                [AllowedUse.STATISTICS],
                fetched_at=datetime(2026, 8, 1),
            )
        ],
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_OUT_OF_TIME_WINDOW
    assert outcome.repair_action is RepairAction.SWAP_EVIDENCE


def test_source_collected_on_the_reference_date_passes() -> None:
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[
            _evidence(
                SourceTier.POSTING,
                [AllowedUse.STATISTICS],
                fetched_at=datetime(2026, 7, 27, 23, 59),
            )
        ],
    )
    assert outcome.verdict is CheckVerdict.PASS


# ============================================================ 알 수 없는 유형
def test_unknown_claim_type_fails() -> None:
    outcome = _claim(claim_type="새로운_유형", claim_rows=[_evidence()])

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_UNKNOWN_CLAIM_TYPE


def test_missing_claim_is_not_applicable() -> None:
    outcome = _claim(claim_type=None)
    assert outcome.verdict is CheckVerdict.SKIP


# ============================================================ Wiki
def test_public_standard_supports_a_definition() -> None:
    outcome = _wiki(
        [
            _evidence(
                SourceTier.PUBLIC_STANDARD,
                [AllowedUse.WIKI_DEFINITION],
                field_name="definition",
            )
        ]
    )
    assert outcome.verdict is CheckVerdict.PASS


def test_posting_tier_cannot_define_a_capability() -> None:
    """정의는 공공 표준과 공식 문서의 몫이다."""
    outcome = _wiki(
        [
            _evidence(
                SourceTier.POSTING,
                [AllowedUse.WIKI_WHY_REQUIRED],
                field_name="definition",
            )
        ]
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_DISALLOWED_USE


def test_external_tier_supports_interview_verification() -> None:
    outcome = _wiki(
        [
            _evidence(
                SourceTier.VERIFIED_EXTERNAL,
                [AllowedUse.WIKI_INTERVIEW_VERIFICATION],
                field_name="interview_verification",
            )
        ]
    )
    assert outcome.verdict is CheckVerdict.PASS


@pytest.mark.parametrize("field", sorted(WIKI_FIELD_USE))
def test_each_wiki_field_accepts_only_its_own_use(field: str) -> None:
    """필드마다 토큰이 있어야 필드 단위로 판정할 수 있다."""
    other = next(u for f, u in WIKI_FIELD_USE.items() if f != field)
    outcome = _wiki([_evidence(SourceTier.PUBLIC_STANDARD, [other], field_name=field)])

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_DISALLOWED_USE


# ============================================================ 계층 정책과의 일치
@pytest.mark.parametrize("tier", list(SourceTier))
def test_check_agrees_with_the_tier_policy(tier: SourceTier) -> None:
    """검사의 판정이 domain 의 계층 정책과 어긋나지 않는다."""
    allowed = TIER_ALLOWED_USES[tier]
    outcome = _claim(
        claim_type="statistic",
        claim_rows=[_evidence(tier, sorted(allowed))],
    )
    expected = (
        CheckVerdict.PASS if AllowedUse.STATISTICS in allowed else CheckVerdict.FAIL
    )
    assert outcome.verdict is expected
