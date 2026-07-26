"""실행 봉투.

정의는 docs/architecture.md 5장을 따른다.
에이전트는 산출물을 서로 전달하지 않고 이 봉투와 저장소 조회만으로 실행한다.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from careersignal.domain.scope import ScopeLevel


class Budget(BaseModel):
    """실행별 한도. 초과하면 종료 사유 budget_exhausted 로 기록한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    max_retrieval_rounds: int = Field(default=2, ge=1, le=10)
    max_repair_rounds: int = Field(default=2, ge=0, le=5)
    max_tokens: int = Field(default=120_000, ge=1_000)
    max_tool_calls: int = Field(default=40, ge=1)


class RunContext(BaseModel):
    """한 에이전트 실행의 범위와 버전을 고정한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    analysis_version: str
    dataset_version: str
    taxonomy_version_id: str | None = None
    knowledge_version: str | None = None

    job_role_id: str
    scope_level: ScopeLevel
    scope_id: str | None = None

    upstream_output_ids: tuple[str, ...] = ()
    as_of_date: date
    budget: Budget = Field(default_factory=Budget)

    @field_validator("agent_run_id")
    @classmethod
    def _run_prefix(cls, v: str) -> str:
        if not v.startswith("run_"):
            raise ValueError("agent_run_id 는 'run_' 로 시작한다")
        return v

    @field_validator("analysis_version")
    @classmethod
    def _analysis_prefix(cls, v: str) -> str:
        if not v.startswith("an_"):
            raise ValueError("analysis_version 은 'an_' 로 시작한다")
        return v

    @field_validator("dataset_version")
    @classmethod
    def _dataset_prefix(cls, v: str) -> str:
        if not v.startswith("ds_"):
            raise ValueError("dataset_version 은 'ds_' 로 시작한다")
        return v

    @field_validator("taxonomy_version_id")
    @classmethod
    def _taxonomy_prefix(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith("tx_"):
            raise ValueError("taxonomy_version_id 는 'tx_' 로 시작한다")
        return v

    @field_validator("knowledge_version")
    @classmethod
    def _knowledge_prefix(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith("kn_"):
            raise ValueError("knowledge_version 은 'kn_' 로 시작한다")
        return v

    @model_validator(mode="after")
    def _scope_consistency(self) -> RunContext:
        if self.scope_level is ScopeLevel.OVERALL and self.scope_id is not None:
            raise ValueError("overall 범위는 scope_id 를 갖지 않는다")
        if self.scope_level is not ScopeLevel.OVERALL and not self.scope_id:
            raise ValueError(f"{self.scope_level} 범위는 scope_id 가 필요하다")
        return self

    @property
    def scope_key(self) -> str:
        return f"{self.job_role_id}:{self.scope_level}:{self.scope_id or ''}"
