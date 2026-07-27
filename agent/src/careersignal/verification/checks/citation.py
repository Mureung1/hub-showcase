"""검사 3. 근거 위치 검사.

정의는 docs/agent-design.md 9장의 검사 3을 따른다.
대상은 엣지가 아니라 표다. 근거는 docs/knowledge-schema.md 12장에 있다.

대상이 둘이며 검사 방법이 다르다.

- `requirement_mention`: `evidence_span_*` 이 `source_chunks.text` 의 오프셋이므로
  구간을 잘라 `raw_expression` 과 대조한다. 근거는 docs/erd.md 6장이다.
- `analysis_claim`: `analysis_claim_evidence.support_id` 가 `support_type` 에 따라
  네 표로 갈리는 다형 참조라 외래키를 걸 수 없다. 실제로 해소되는지 확인한다.

오프셋은 문자 단위다. 바이트 단위로 자르면 한글에서 어긋난다.
"""

from __future__ import annotations

from typing import Any, Protocol

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.verification.protocol import (
    REASON_NOT_APPLICABLE,
    Check,
    CheckContext,
    CheckOutcome,
    passed,
)

TARGET_MENTION = "requirement_mention"
TARGET_CLAIM = "analysis_claim"

REASON_TARGET_NOT_FOUND = "TARGET_NOT_FOUND"
REASON_SPAN_OUT_OF_RANGE = "CITATION_SPAN_OUT_OF_RANGE"
REASON_SPAN_MISMATCH = "CITATION_SPAN_MISMATCH"
REASON_SUPPORT_UNRESOLVED = "CITATION_SUPPORT_UNRESOLVED"


class CitationReader(Protocol):
    """검사가 필요로 하는 조회. 저장소가 이 모양을 만족한다."""

    def mention_with_chunk(self, mention_id: str) -> dict[str, Any] | None: ...
    def evidence_count(self, claim_id: str) -> int: ...
    def unresolved_supports(self, claim_id: str) -> list[dict[str, Any]]: ...


def _check_mention(reader: CitationReader, mention_id: str) -> CheckOutcome:
    row = reader.mention_with_chunk(mention_id)
    if row is None:
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_TARGET_NOT_FOUND,
            detail={"mention_id": mention_id},
        )

    text: str = row["chunk_text"]
    start: int = row["evidence_span_start"]
    end: int = row["evidence_span_end"]
    expression: str = row["raw_expression"]

    if end > len(text):
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_SPAN_OUT_OF_RANGE,
            repair_action=RepairAction.DROP_CLAIM,
            detail={
                "chunk_id": row["chunk_id"],
                "span": [start, end],
                "chunk_length": len(text),
            },
        )

    quoted = text[start:end]
    if quoted != expression:
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_SPAN_MISMATCH,
            repair_action=RepairAction.DROP_CLAIM,
            detail={
                "chunk_id": row["chunk_id"],
                "span": [start, end],
                "expected": expression,
                "found": quoted,
            },
        )
    return passed()


def _check_claim(reader: CitationReader, claim_id: str) -> CheckOutcome:
    if reader.evidence_count(claim_id) == 0:
        # 근거 부족은 필수 슬롯 판정이 다룬다. 검사할 위치 자체가 없다.
        return CheckOutcome(
            verdict=CheckVerdict.SKIP,
            reason_code=REASON_NOT_APPLICABLE,
            detail={"claim_id": claim_id, "evidence_count": 0},
        )

    unresolved = reader.unresolved_supports(claim_id)
    if unresolved:
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_SUPPORT_UNRESOLVED,
            repair_action=RepairAction.SWAP_EVIDENCE,
            detail={"unresolved": unresolved},
        )
    return passed()


def citation_span_check(reader: CitationReader) -> Check:
    """검사 3의 구현을 만든다."""

    def check(context: CheckContext) -> CheckOutcome:
        if context.target_type == TARGET_MENTION:
            return _check_mention(reader, context.target_id)
        if context.target_type == TARGET_CLAIM:
            return _check_claim(reader, context.target_id)
        return CheckOutcome(
            verdict=CheckVerdict.SKIP,
            reason_code=REASON_NOT_APPLICABLE,
            detail={"target_type": context.target_type},
        )

    return check
