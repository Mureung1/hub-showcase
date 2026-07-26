"""조사 요청.

정의는 docs/architecture.md 5.1을 따른다.
근거가 부족한 에이전트는 수집 에이전트를 직접 호출하지 않는다.
요청을 저장하고 오케스트레이터가 정책을 검사한 뒤 수집을 스케줄링한다.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import SourceTier


class ResearchStatus(StrEnum):
    OPEN = "open"
    SCHEDULED = "scheduled"
    FULFILLED = "fulfilled"
    REJECTED = "rejected"


class ResearchRequest(BaseModel):
    """`research_requests` 한 행에 대응한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    request_id: str
    requested_by_run_id: str
    analysis_version: str

    goal: str
    needed_evidence_type: str
    needed_tiers: tuple[SourceTier, ...] = ()
    slot: str | None = None

    job_role_id: str
    scope_level: ScopeLevel
    scope_id: str | None = None
    company_id: str | None = None

    status: ResearchStatus = ResearchStatus.OPEN
    priority: int = Field(default=5, ge=1, le=9)
    fulfilled_by_snapshot_ids: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _consistency(self) -> ResearchRequest:
        if self.scope_level is ScopeLevel.OVERALL and self.scope_id is not None:
            raise ValueError("overall 범위는 scope_id 를 갖지 않는다")
        if self.scope_level is not ScopeLevel.OVERALL and not self.scope_id:
            raise ValueError(f"{self.scope_level} 범위는 scope_id 가 필요하다")
        if (
            self.status is ResearchStatus.FULFILLED
            and not self.fulfilled_by_snapshot_ids
        ):
            raise ValueError("fulfilled 상태는 수집된 스냅샷 식별자가 필요하다")
        return self
