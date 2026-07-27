"""검사 1 스키마와 검사 3 근거 위치 검증.

실패 조건은 docs/agent-design.md 9장, docs/erd.md 6장, docs/knowledge-schema.md 12장에서 온다.
저장소 조회는 대역으로 대체한다. 검사의 판정 규칙만 검사한다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from careersignal.contracts import CheckVerdict, RepairAction, RunContext, Severity
from careersignal.domain.confidence import ContradictionStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.verification import REASON_NOT_APPLICABLE, CheckContext
from careersignal.verification.checks import citation_span_check, schema_check
from careersignal.verification.checks.citation import (
    REASON_SPAN_MISMATCH,
    REASON_SPAN_OUT_OF_RANGE,
    REASON_SUPPORT_UNRESOLVED,
    REASON_TARGET_NOT_FOUND,
)
from careersignal.verification.checks.schema import (
    REASON_FIELD_MISSING,
    REASON_INVALID,
    REASON_NOT_DECLARED,
)

CHUNK_TEXT = "우리 팀은 대규모 트랜잭션 무결성과 분산 캐시 운영 경험을 중요하게 봅니다."


def _context(target_type: str, target_id: str, **payload: Any) -> CheckContext:
    return CheckContext(
        run=RunContext(
            agent_run_id="run_001",
            analysis_version="an_001",
            dataset_version="ds_001",
            job_role_id="backend",
            scope_level=ScopeLevel.OVERALL,
            as_of_date=date(2026, 7, 27),
        ),
        target_type=target_type,
        target_id=target_id,
        payload=payload,
    )


def _components(**override: Any) -> dict[str, Any]:
    base = {
        "source_quality": "A",
        "evidence_directness": True,
        "independent_support_count": 3,
        "scope_coverage": 0.9,
        "temporal_fitness": True,
        "contradiction_status": ContradictionStatus.NONE,
        "verification_passed": True,
    }
    return base | override


class FakeReader:
    """저장소 조회의 대역."""

    def __init__(
        self,
        mention: dict[str, Any] | None = None,
        evidence_count: int = 0,
        unresolved: list[dict[str, Any]] | None = None,
    ) -> None:
        self._mention = mention
        self._count = evidence_count
        self._unresolved = unresolved or []

    def mention_with_chunk(self, mention_id: str) -> dict[str, Any] | None:
        return self._mention

    def evidence_count(self, claim_id: str) -> int:
        return self._count

    def unresolved_supports(self, claim_id: str) -> list[dict[str, Any]]:
        return self._unresolved


def _mention_row(**override: Any) -> dict[str, Any]:
    """'트랜잭션 무결성' 은 CHUNK_TEXT 의 12~21 구간이다."""
    start = CHUNK_TEXT.index("트랜잭션 무결성")
    base = {
        "mention_id": "men_1",
        "chunk_id": "chunk_1",
        "chunk_text": CHUNK_TEXT,
        "raw_expression": "트랜잭션 무결성",
        "evidence_span_start": start,
        "evidence_span_end": start + len("트랜잭션 무결성"),
    }
    return base | override


# ============================================================ 검사 1 스키마
def test_undeclared_target_is_skipped_as_blocking() -> None:
    """규칙이 없는 대상을 통과로 두지 않는다."""
    outcome = schema_check()(_context("roadmap_item", "road_1"))

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_DECLARED
    assert outcome.severity is Severity.BLOCKING


def test_valid_confidence_components_pass() -> None:
    outcome = schema_check()(
        _context("analysis_claim", "claim_1", confidence_components=_components())
    )
    assert outcome.verdict is CheckVerdict.PASS


def test_missing_required_field_fails() -> None:
    outcome = schema_check()(_context("analysis_claim", "claim_1"))

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_FIELD_MISSING
    assert outcome.severity is Severity.BLOCKING


def test_unknown_component_key_fails() -> None:
    """구성값 목록에 없는 키는 통과하지 않는다."""
    outcome = schema_check()(
        _context(
            "analysis_claim",
            "claim_1",
            confidence_components=_components(model_self_reported=0.9),
        )
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_INVALID


def test_out_of_range_scope_coverage_fails() -> None:
    """domain 의 판정 규칙을 스키마 검사가 그대로 적용한다."""
    outcome = schema_check()(
        _context(
            "analysis_claim",
            "claim_1",
            confidence_components=_components(scope_coverage=1.7),
        )
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_INVALID


def test_wrong_type_fails() -> None:
    outcome = schema_check()(
        _context(
            "analysis_claim",
            "claim_1",
            confidence_components=_components(independent_support_count="셋"),
        )
    )
    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_INVALID


def test_failure_detail_names_the_source_document() -> None:
    """수리하는 쪽이 어느 기준을 어겼는지 알아야 한다."""
    outcome = schema_check()(_context("analysis_claim", "claim_1"))
    assert outcome.detail["source"] == "docs/agent-design.md 8장"


# ============================================================ 검사 3 mention
def test_matching_span_passes() -> None:
    check = citation_span_check(FakeReader(mention=_mention_row()))
    assert check(_context("requirement_mention", "men_1")).verdict is CheckVerdict.PASS


def test_missing_mention_fails() -> None:
    check = citation_span_check(FakeReader(mention=None))
    outcome = check(_context("requirement_mention", "men_x"))

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_TARGET_NOT_FOUND


def test_span_beyond_chunk_length_fails() -> None:
    check = citation_span_check(
        FakeReader(mention=_mention_row(evidence_span_end=len(CHUNK_TEXT) + 40))
    )
    outcome = check(_context("requirement_mention", "men_1"))

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_SPAN_OUT_OF_RANGE
    assert outcome.repair_action is RepairAction.DROP_CLAIM


def test_shifted_span_fails() -> None:
    """오프셋이 두 칸 밀리면 다른 문자열이 잘린다."""
    row = _mention_row()
    check = citation_span_check(
        FakeReader(
            mention=row
            | {
                "evidence_span_start": row["evidence_span_start"] + 2,
                "evidence_span_end": row["evidence_span_end"] + 2,
            }
        )
    )
    outcome = check(_context("requirement_mention", "men_1"))

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_SPAN_MISMATCH
    assert outcome.repair_action is RepairAction.DROP_CLAIM
    assert outcome.detail["expected"] == "트랜잭션 무결성"


def test_expression_not_in_chunk_fails() -> None:
    """원문에 없는 표현을 지어내면 걸린다."""
    check = citation_span_check(
        FakeReader(mention=_mention_row(raw_expression="쿠버네티스 운영"))
    )
    outcome = check(_context("requirement_mention", "men_1"))

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_SPAN_MISMATCH


def test_offsets_are_character_based() -> None:
    """한글을 바이트로 세면 구간이 어긋난다. 문자 단위임을 고정한다."""
    row = _mention_row()
    assert CHUNK_TEXT[row["evidence_span_start"] : row["evidence_span_end"]] == (
        "트랜잭션 무결성"
    )
    assert len(CHUNK_TEXT.encode("utf-8")) != len(CHUNK_TEXT)


# ============================================================ 검사 3 claim
def test_resolved_supports_pass() -> None:
    check = citation_span_check(FakeReader(evidence_count=2, unresolved=[]))
    assert check(_context("analysis_claim", "claim_1")).verdict is CheckVerdict.PASS


def test_unresolved_support_fails() -> None:
    """외래키가 없는 다형 참조를 이 검사가 막는다."""
    check = citation_span_check(
        FakeReader(
            evidence_count=2,
            unresolved=[{"support_type": "chunk", "support_id": "chunk_missing"}],
        )
    )
    outcome = check(_context("analysis_claim", "claim_1"))

    assert outcome.verdict is CheckVerdict.FAIL
    assert outcome.reason_code == REASON_SUPPORT_UNRESOLVED
    assert outcome.repair_action is RepairAction.SWAP_EVIDENCE


def test_claim_without_evidence_is_not_applicable() -> None:
    """근거 부족은 필수 슬롯 판정이 다룬다. 검사할 위치가 없다."""
    check = citation_span_check(FakeReader(evidence_count=0))
    outcome = check(_context("analysis_claim", "claim_1"))

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE


def test_other_target_types_are_not_applicable() -> None:
    check = citation_span_check(FakeReader())
    outcome = check(_context("checklist_item", "item_1"))

    assert outcome.verdict is CheckVerdict.SKIP
    assert outcome.reason_code == REASON_NOT_APPLICABLE
