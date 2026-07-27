"""검사 2. 자료 정책 검사.

정의는 docs/agent-design.md 9장의 검사 2와 docs/data-strategy.md 3.1을 따른다.

자료 계층은 품질의 단일 순서가 아니라 허용 용도의 구분이다. 이 검사는 근거를
어떤 용도로 쓰는지 판정하고, 그 용도가 자료의 `allowed_uses` 에 있는지 본다.
자료 정책은 사람 점검이 아니라 이 검사로 강제한다.

용도는 대상이 정한다. 주장은 `claim_type` 이, Wiki 는 `field_name` 이 정한다.
Wiki 필드와 허용 용도는 일대일로 대응한다.

시간 적합성도 이 검사가 본다. 실행 봉투의 `as_of_date` 이후에 수집한 자료를
근거로 쓰면 그 실행은 몰랐어야 할 것을 쓴 것이고 재실행 재현성이 깨진다.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Protocol

from careersignal.contracts.check_result import CheckVerdict, RepairAction, Severity
from careersignal.domain.source_policy import AllowedUse
from careersignal.verification.protocol import (
    REASON_NOT_APPLICABLE,
    Check,
    CheckContext,
    CheckOutcome,
    passed,
)

TARGET_CLAIM = "analysis_claim"
TARGET_WIKI = "wiki_revision"

REASON_NOT_ASSESSED = "POLICY_NOT_ASSESSED"
"""평가가 없으면 계층을 알 수 없다. 모르는 자료를 근거로 두지 않는다."""

REASON_DISALLOWED_USE = "POLICY_DISALLOWED_USE"
REASON_OUT_OF_TIME_WINDOW = "POLICY_OUT_OF_TIME_WINDOW"
REASON_UNKNOWN_CLAIM_TYPE = "POLICY_UNKNOWN_CLAIM_TYPE"

CLAIM_TYPE_USE: dict[str, AllowedUse] = {
    "statistic": AllowedUse.STATISTICS,
    "posting_explicit": AllowedUse.INTERPRETATION_CONTEXT,
    "cluster_generalization": AllowedUse.INTERPRETATION_CONTEXT,
    "inferred_requirement": AllowedUse.INTERPRETATION_CONTEXT,
    "company_context_signal": AllowedUse.INTERPRETATION_CONTEXT,
    "no_deviation": AllowedUse.INTERPRETATION_CONTEXT,
    "strategy": AllowedUse.STRATEGY,
}
"""`analysis_claims.claim_type` 이 근거의 용도를 정한다."""

WIKI_FIELD_USE: dict[str, AllowedUse] = {
    "definition": AllowedUse.WIKI_DEFINITION,
    "why_required": AllowedUse.WIKI_WHY_REQUIRED,
    "depth_criteria": AllowedUse.WIKI_DEPTH_CRITERIA,
    "prerequisites": AllowedUse.WIKI_PREREQUISITES,
    "common_misconceptions": AllowedUse.WIKI_COMMON_MISCONCEPTIONS,
    "interview_verification": AllowedUse.WIKI_INTERVIEW_VERIFICATION,
    "learning_sequence": AllowedUse.WIKI_LEARNING_SEQUENCE,
}
"""docs/knowledge-schema.md 8.5의 필드와 일대일로 대응한다."""


class SourcePolicyReader(Protocol):
    def claim_type(self, claim_id: str) -> str | None: ...
    def claim_source_policy(self, claim_id: str) -> list[dict[str, Any]]: ...
    def wiki_source_policy(self, revision_id: str) -> list[dict[str, Any]]: ...


def _as_date(value: datetime | date | None) -> date | None:
    if value is None:
        return None
    return value.date() if isinstance(value, datetime) else value


def _violation(
    row: dict[str, Any], required: AllowedUse, as_of: date
) -> CheckOutcome | None:
    """근거 한 건을 판정한다. 문제가 없으면 None 이다."""
    detail: dict[str, Any] = {
        "chunk_id": row.get("chunk_id"),
        "snapshot_id": row.get("snapshot_id"),
        "required_use": str(required),
    }

    if row.get("allowed_uses") is None:
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_NOT_ASSESSED,
            repair_action=RepairAction.SWAP_EVIDENCE,
            detail=detail,
        )

    fetched = _as_date(row.get("fetched_at"))
    if fetched is not None and fetched > as_of:
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_OUT_OF_TIME_WINDOW,
            repair_action=RepairAction.SWAP_EVIDENCE,
            detail=detail | {"fetched_at": fetched.isoformat(), "as_of": as_of.isoformat()},
        )

    if str(required) not in set(row["allowed_uses"]):
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_DISALLOWED_USE,
            repair_action=RepairAction.DROP_CLAIM,
            detail=detail
            | {
                "source_tier": row.get("source_tier"),
                "allowed_uses": sorted(row["allowed_uses"]),
            },
        )
    return None


def _check_claim(
    reader: SourcePolicyReader, claim_id: str, as_of: date
) -> CheckOutcome:
    claim_type = reader.claim_type(claim_id)
    if claim_type is None:
        return CheckOutcome(
            verdict=CheckVerdict.SKIP,
            reason_code=REASON_NOT_APPLICABLE,
            detail={"claim_id": claim_id},
        )

    required = CLAIM_TYPE_USE.get(claim_type)
    if required is None:
        return CheckOutcome(
            verdict=CheckVerdict.FAIL,
            severity=Severity.BLOCKING,
            reason_code=REASON_UNKNOWN_CLAIM_TYPE,
            detail={"claim_type": claim_type},
        )

    rows = reader.claim_source_policy(claim_id)
    if not rows:
        return CheckOutcome(
            verdict=CheckVerdict.SKIP,
            reason_code=REASON_NOT_APPLICABLE,
            detail={"claim_id": claim_id, "chunk_evidence": 0},
        )

    for row in rows:
        outcome = _violation(row, required, as_of)
        if outcome is not None:
            return outcome
    return passed()


def _check_wiki(
    reader: SourcePolicyReader, revision_id: str, as_of: date
) -> CheckOutcome:
    rows = reader.wiki_source_policy(revision_id)
    if not rows:
        return CheckOutcome(
            verdict=CheckVerdict.SKIP,
            reason_code=REASON_NOT_APPLICABLE,
            detail={"revision_id": revision_id, "field_evidence": 0},
        )

    for row in rows:
        required = WIKI_FIELD_USE.get(row["field_name"])
        if required is None:
            return CheckOutcome(
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=REASON_DISALLOWED_USE,
                detail={"field_name": row["field_name"]},
            )
        outcome = _violation(row, required, as_of)
        if outcome is not None:
            return outcome
    return passed()


def source_policy_check(reader: SourcePolicyReader) -> Check:
    """검사 2의 구현을 만든다."""

    def check(context: CheckContext) -> CheckOutcome:
        as_of = context.run.as_of_date
        if context.target_type == TARGET_CLAIM:
            return _check_claim(reader, context.target_id, as_of)
        if context.target_type == TARGET_WIKI:
            return _check_wiki(reader, context.target_id, as_of)
        return CheckOutcome(
            verdict=CheckVerdict.SKIP,
            reason_code=REASON_NOT_APPLICABLE,
            detail={"target_type": context.target_type},
        )

    return check
