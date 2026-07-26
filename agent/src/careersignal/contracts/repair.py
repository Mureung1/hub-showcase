"""수리 지시.

정의는 docs/agent-design.md 10장을 따른다.
검증 실패는 자유 서술이 아니라 고정 스키마의 수리 지시로 표현한다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.contracts.check_result import CheckName, RepairAction
from careersignal.domain.source_policy import SourceTier

STATISTICAL_CHECKS: frozenset[CheckName] = frozenset(
    {CheckName.NUMERICAL, CheckName.SOURCE_POLICY}
)
"""통계 오류와 자료 정책 위반은 신뢰도 하향으로 유지하지 않고 폐기한다."""


class MissingEvidence(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    source_tier: SourceTier | None = None
    company_id: str | None = None
    topic: str | None = None
    slot: str | None = None


class RepairOrder(BaseModel):
    """`repair_orders` 한 행에 대응한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    target_claim_id: str
    failed_check: CheckName
    reason: str
    action: RepairAction
    missing_evidence: MissingEvidence | None = None
    requery_hint: str | None = None
    round: int = Field(default=1, ge=1)

    @model_validator(mode="after")
    def _action_consistency(self) -> RepairOrder:
        if self.action is RepairAction.REQUEST_RESEARCH and not self.missing_evidence:
            raise ValueError("request_research 는 missing_evidence 가 필요하다")
        if self.action is RepairAction.REQUERY and not self.requery_hint:
            raise ValueError("requery 는 requery_hint 가 필요하다")
        if (
            self.action is RepairAction.LOWER_CONFIDENCE
            and self.failed_check in STATISTICAL_CHECKS
        ):
            raise ValueError(
                f"{self.failed_check} 실패는 신뢰도 하향으로 유지할 수 없다"
            )
        return self

    def exhausted(self, max_rounds: int) -> bool:
        return self.round > max_rounds
