"""근거 집합과 사용 기록.

정의는 docs/agent-design.md 5.3~5.4를 따른다.
검색 결과는 최종 인용 외에도 반례 검사, 용어 정규화, 다음 검색 계획, 부재 확인에 기여한다.
"""

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.domain.source_policy import SourceTier


class UsageType(StrEnum):
    SUPPORTS_CLAIM = "supports_claim"
    CONTRADICTS_CLAIM = "contradicts_claim"
    VERIFICATION_ONLY = "verification_only"
    NORMALIZATION = "normalization"
    PLANNING = "planning"
    COVERAGE_CHECK = "coverage_check"
    UNUSED = "unused"


CONTRIBUTING_USAGES: frozenset[UsageType] = frozenset(
    {
        UsageType.SUPPORTS_CLAIM,
        UsageType.CONTRADICTS_CLAIM,
        UsageType.VERIFICATION_ONLY,
        UsageType.NORMALIZATION,
        UsageType.PLANNING,
        UsageType.COVERAGE_CHECK,
    }
)


class RetrievalStrategy(StrEnum):
    SQL = "sql"
    KEYWORD = "keyword"
    VECTOR = "vector"
    GRAPH = "graph"
    FUSION = "fusion"
    RERANK = "rerank"


class EvidenceCandidate(BaseModel):
    """검색 후보 한 건. `retrieval_candidates` 한 행에 대응한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    target_type: str
    target_id: str
    strategy: RetrievalStrategy
    strategy_rank: int = Field(ge=1)
    lexical_score: float | None = None
    vector_score: float | None = None
    graph_score: float | None = None
    fusion_score: float | None = None
    rerank_score: float | None = None
    source_tier: SourceTier | None = None
    company_id: str | None = None
    selected: bool = False
    rejection_reason: str | None = None


class EvidenceUsage(BaseModel):
    """후보가 실제로 어떤 역할을 했는지 기록한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    usage_type: UsageType
    used_claim_id: str | None = None

    @model_validator(mode="after")
    def _claim_required_for_citation(self) -> EvidenceUsage:
        needs_claim = self.usage_type in (
            UsageType.SUPPORTS_CLAIM,
            UsageType.CONTRADICTS_CLAIM,
        )
        if needs_claim and not self.used_claim_id:
            raise ValueError(f"{self.usage_type} 은 used_claim_id 가 필요하다")
        return self


class EvidenceSet(BaseModel):
    """근거 묶음. 개별 점수가 아니라 묶음 전체를 평가한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    evidence_set_id: str
    objective_id: str
    optimization_policy_version: str
    members: tuple[EvidenceCandidate, ...]
    slot_assignment: dict[str, tuple[str, ...]] = Field(default_factory=dict)

    def filled_counts(self) -> dict[str, int]:
        return {slot: len(ids) for slot, ids in self.slot_assignment.items()}

    def independent_companies(self) -> int:
        return len({m.company_id for m in self.members if m.company_id})

    def tiers(self) -> frozenset[SourceTier]:
        return frozenset(m.source_tier for m in self.members if m.source_tier)
