"""목표 계약.

정의는 docs/agent-design.md 5.1을 따른다.
검색 이전에 완료 조건을 선언한다. 필수 슬롯이 모두 채워지면 조사를 종료한다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from careersignal.domain.source_policy import AllowedUse, SourceTier


class EvidenceSlot(BaseModel):
    """이 슬롯이 채워져야 목표가 완료된다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    slot: str
    support_type: str
    minimum: int = Field(default=1, ge=0)
    minimum_independent_companies: int = Field(default=0, ge=0)
    allowed_tiers: tuple[SourceTier, ...] = ()
    required: bool = True


class ObjectiveContract(BaseModel):
    """에이전트 한 실행의 목표와 완료 조건."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    objective_id: str
    objective: str
    required_evidence_slots: tuple[EvidenceSlot, ...]
    forbidden_source_uses: tuple[tuple[SourceTier, AllowedUse], ...] = ()
    allowed_tools: tuple[str, ...] = ()
    max_retrieval_rounds: int = Field(default=2, ge=1, le=10)
    max_repair_rounds: int = Field(default=2, ge=0, le=5)

    @property
    def required_slots(self) -> tuple[EvidenceSlot, ...]:
        return tuple(s for s in self.required_evidence_slots if s.required)

    def unmet(self, filled: dict[str, int]) -> tuple[str, ...]:
        """아직 최소 개수를 채우지 못한 필수 슬롯 이름을 돌려준다."""
        return tuple(
            s.slot for s in self.required_slots if filled.get(s.slot, 0) < s.minimum
        )

    def is_complete(self, filled: dict[str, int]) -> bool:
        return not self.unmet(filled)
