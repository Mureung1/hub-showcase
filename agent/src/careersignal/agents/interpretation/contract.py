"""채용공고 해석 에이전트의 입출력 계약.

정의는 docs/agent-design.md 5.1·7.4·8장, docs/erd.md 11.3~11.6,
`agent/data/demo_seed/CONTRACT.md` 5장 B 를 따른다.

이 모듈은 값의 모양만 정한다. 저장소도 모델 제공자도 import 하지 않으며,
`psycopg` 를 알지 못한다. 실행은 `agent.py`, 판정은 `baseline.py`, 모델 호출은
`adapter.py` 가 맡는다.

요구는 세 가지로 갈린다(docs/agent-design.md 7.4). 공고에 적힌 것만 통계에
반영하고, 해석한 요구와 회사 맥락 신호는 반영하지 않는다. 이 구분을 주장 행의
`requirement_kind` 로 남겨야 아래 갈래(전략·로드맵)가 통계 기준선과 맥락 신호를
같은 무게로 다루지 않는다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.contracts.objective import EvidenceSlot, ObjectiveContract
from careersignal.contracts.run_context import StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import AllowedUse, SourceTier

AGENT_NAME = "interpretation"
"""`analysis_outputs.produced_by_agent` 와 `agent_runs.agent_name` 의 값."""

AGENT_VERSION = "1.0.0"
"""payload 의 `agent_version`. 화면과 서버가 그대로 읽는다."""

OUTPUT_TYPE = "interpretation"
"""`analysis_outputs.output_type`."""


class RequirementKind(StrEnum):
    """요구 3구분. docs/agent-design.md 7.4 의 표다.

    `EXPLICIT_REQUIREMENT` 만 통계에 반영한다. 나머지 둘은 포트폴리오 강조 순서와
    면접 준비 후보에만 영향을 주고 기준선·필수 체크리스트를 움직이지 않는다.
    """

    EXPLICIT_REQUIREMENT = "explicit_requirement"
    INFERRED_REQUIREMENT = "inferred_requirement"
    COMPANY_CONTEXT_SIGNAL = "company_context_signal"


REFLECTED_IN_STATISTICS: frozenset[RequirementKind] = frozenset(
    {RequirementKind.EXPLICIT_REQUIREMENT}
)
"""통계에 반영하는 구분. 해석한 요구와 맥락 신호는 여기에 없다."""


class ClaimType(StrEnum):
    """`analysis_claims.claim_type` 의 값 집합(docs/erd.md 11.4)."""

    POSTING_EXPLICIT = "posting_explicit"
    STATISTIC = "statistic"
    CLUSTER_GENERALIZATION = "cluster_generalization"
    INFERRED_REQUIREMENT = "inferred_requirement"
    COMPANY_CONTEXT_SIGNAL = "company_context_signal"
    STRATEGY = "strategy"
    NO_DEVIATION = "no_deviation"


INTERPRETATION_CLAIM_TYPES: frozenset[ClaimType] = frozenset(
    {
        ClaimType.POSTING_EXPLICIT,
        ClaimType.STATISTIC,
        ClaimType.CLUSTER_GENERALIZATION,
        ClaimType.INFERRED_REQUIREMENT,
        ClaimType.COMPANY_CONTEXT_SIGNAL,
        ClaimType.NO_DEVIATION,
    }
)
"""해석 에이전트가 낼 수 있는 주장 유형. `strategy` 는 다음 에이전트의 것이다."""

KIND_OF_CLAIM: dict[ClaimType, RequirementKind] = {
    ClaimType.POSTING_EXPLICIT: RequirementKind.EXPLICIT_REQUIREMENT,
    ClaimType.CLUSTER_GENERALIZATION: RequirementKind.EXPLICIT_REQUIREMENT,
    ClaimType.INFERRED_REQUIREMENT: RequirementKind.INFERRED_REQUIREMENT,
    ClaimType.COMPANY_CONTEXT_SIGNAL: RequirementKind.COMPANY_CONTEXT_SIGNAL,
}
"""요구를 말하는 주장 유형이 갖는 3구분.

`statistic` 과 `no_deviation` 은 요구 자체가 아니라 수치와 부재를 말하므로
`requirement_kind` 를 비운다.
"""


class SupportType(StrEnum):
    """`analysis_claim_evidence.support_type`."""

    CHUNK = "chunk"
    STATISTIC_FACT = "statistic_fact"
    GRAPH_PATH = "graph_path"
    WIKI_REVISION = "wiki_revision"


class Relation(StrEnum):
    """근거가 주장을 지지하는지 반박하는지."""

    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"


class VerificationStatus(StrEnum):
    """`analysis_claims.verification_status`."""

    VERIFIED = "verified"
    VERIFIED_WITH_WARNING = "verified_with_warning"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    CONTRADICTED = "contradicted"
    POLICY_VIOLATION = "policy_violation"
    SCHEMA_INVALID = "schema_invalid"
    NEEDS_RESEARCH = "needs_research"


class ConfidenceGrade(StrEnum):
    """화면 등급. payload 의 `confidence` 가 이 셋만 갖는다."""

    HIGH = "high"
    MID = "mid"
    LOW = "low"


# --------------------------------------------------------------- 15-1 목표 계약

BASELINE_SLOT = "overall_baseline"
CLUSTER_SLOT = "cluster_support"
OFFICIAL_SLOT = "official_context"

MINIMUM_INDEPENDENT_COMPANIES = 2
"""기업군 일반화가 요구하는 독립 회사 수.

승격 임계값과 같은 값을 쓴다(`agent/data/demo_seed/CONTRACT.md` 2장). 한 회사의
공고 여러 건은 회사 하나의 사정이지 기업군의 성질이 아니다.
"""


def interpretation_objective(
    job_role_id: str,
    scope_level: ScopeLevel,
    scope_id: str | None = None,
) -> ObjectiveContract:
    """검색 이전에 완료 조건을 선언한다(docs/agent-design.md 5.1).

    범위마다 필요한 슬롯이 다르다. 직무 전체는 기준선 통계만 있으면 성립하고,
    기업군·공고 범위는 그 위에 공고 근거를 더 요구한다. 회사 공식 자료는 선택
    슬롯이다. 비어 있어도 주장은 성립하되 신뢰도가 낮아진다.
    """
    slots: list[EvidenceSlot] = [
        EvidenceSlot(
            slot=BASELINE_SLOT,
            support_type=SupportType.STATISTIC_FACT,
            minimum=1,
        )
    ]
    if scope_level is not ScopeLevel.OVERALL:
        slots.append(
            EvidenceSlot(
                slot=CLUSTER_SLOT,
                support_type=SupportType.CHUNK,
                minimum=1,
                minimum_independent_companies=(
                    MINIMUM_INDEPENDENT_COMPANIES
                    if scope_level is ScopeLevel.CLUSTER
                    else 0
                ),
                allowed_tiers=(SourceTier.POSTING,),
            )
        )
    slots.append(
        EvidenceSlot(
            slot=OFFICIAL_SLOT,
            support_type=SupportType.WIKI_REVISION,
            minimum=1,
            allowed_tiers=(SourceTier.COMPANY_OFFICIAL, SourceTier.PUBLIC_STANDARD),
            required=False,
        )
    )
    return ObjectiveContract(
        objective_id=f"obj_intp_{job_role_id}_{scope_level}_{scope_id or 'all'}",
        objective=f"{job_role_id} {scope_level} 범위의 기준선과 편차 해석",
        required_evidence_slots=tuple(slots),
        # 미검증 외부 글로 회사의 요구를 말하지 않는다(docs/agent-design.md 6장).
        forbidden_source_uses=(
            (SourceTier.UNVERIFIED, AllowedUse.INTERPRETATION_CONTEXT),
            (SourceTier.VERIFIED_EXTERNAL, AllowedUse.STATISTICS),
        ),
        allowed_tools=("statistics_facts", "chunk_search", "graph_paths"),
    )


# ------------------------------------------------------------------ 입력 모델


class StatisticFact(BaseModel):
    """`statistics_facts` 한 행 가운데 해석이 읽는 부분(docs/erd.md 10.5).

    저장소가 무엇이든 이 모양으로 넘어온다. 해석은 값을 다시 계산하지 않고
    집계가 낸 수치를 인용한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    fact_id: str
    metric_family: str
    measure: str
    scope_level: ScopeLevel
    scope_id: str
    dimension_id: str | None = None
    dimension_label: str | None = None
    value: float | None = None
    numerator: int | None = None
    denominator: int | None = None
    sample_size: int = 0
    sample_status: str = "analysis_ready"
    period_id: str = "recent_12m"

    @property
    def usable(self) -> bool:
        """인용할 수 있는 사실인지.

        `not_computable` 은 값이 없고, `not_comparable` 은 다른 범위와 견줄 수
        없다. 둘 다 기준선과 편차의 재료로 쓰지 않는다.
        """
        return self.value is not None and self.sample_status in (
            "analysis_ready",
            "low_confidence",
        )

    @property
    def percent(self) -> int | None:
        """비율을 화면이 쓰는 정수 백분율로."""
        if self.value is None:
            return None
        return round(self.value * 100)


class PostingEvidence(BaseModel):
    """공고 근거 한 건. 청크의 자리와 회사를 함께 갖는다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    chunk_id: str
    posting_id: str
    company_id: str
    dimension_id: str | None = None
    text: str
    section: str | None = None
    source_url: str | None = None
    relation: Relation = Relation.SUPPORTS
    """이 근거가 주장을 지지하는지 반박하는지.

    반박 근거를 버리지 않고 같은 자리에 담는다. 반례를 지우면 상충 검사(15-4)가
    검사할 것이 남지 않는다.
    """


class ContextSignal(BaseModel):
    """회사 공식 자료에 반복되나 공고에는 없는 맥락(docs/agent-design.md 7.4)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    support_id: str
    support_type: SupportType = SupportType.WIKI_REVISION
    dimension_id: str | None = None
    topic: str
    text: str
    source_tier: SourceTier = SourceTier.COMPANY_OFFICIAL
    repeated_in: int = Field(default=1, ge=1)


# ------------------------------------------------------------------ 출력 모델


class EvidenceRef(BaseModel):
    """`analysis_claim_evidence` 한 행."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    support_type: SupportType
    support_id: str
    relation: Relation = Relation.SUPPORTS
    weight: float | None = Field(default=None, ge=0.0, le=1.0)

    @property
    def key(self) -> tuple[str, str, str]:
        """기본키 (claim_id 를 뺀 부분). 같은 주장 안에서 중복을 가른다."""
        return (str(self.support_type), self.support_id, str(self.relation))


class ClaimDraft(BaseModel):
    """저장 직전의 주장 하나. `analysis_claims` 한 행과 근거 목록을 함께 담는다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    claim_id: str
    claim_type: ClaimType
    requirement_kind: RequirementKind | None = None
    scope_level: ScopeLevel
    scope_id: str
    claim_text: str
    structured_slots: Mapping[str, Any] = Field(default_factory=dict)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    confidence_components: Mapping[str, Any] = Field(default_factory=dict)
    verification_status: VerificationStatus = VerificationStatus.NEEDS_RESEARCH
    evidence: tuple[EvidenceRef, ...] = ()

    @model_validator(mode="after")
    def _kind_matches_type(self) -> ClaimDraft:
        """요구를 말하는 주장은 3구분을 반드시 갖는다.

        구분이 비면 아래 갈래가 해석한 요구를 명시 요구와 같은 무게로 읽는다.
        `statistic` 과 `no_deviation` 은 요구가 아니므로 반대로 비어 있어야 한다.
        """
        expected = KIND_OF_CLAIM.get(self.claim_type)
        if expected is None:
            if self.requirement_kind is not None:
                raise ValueError(
                    f"{self.claim_type} 주장은 requirement_kind 를 갖지 않는다"
                )
            return self
        if self.requirement_kind is None:
            raise ValueError(f"{self.claim_type} 주장은 requirement_kind 가 필요하다")
        if self.requirement_kind is not expected:
            raise ValueError(
                f"{self.claim_type} 주장의 구분은 {expected} 다"
            )
        return self

    @model_validator(mode="after")
    def _claim_type_allowed(self) -> ClaimDraft:
        if self.claim_type not in INTERPRETATION_CLAIM_TYPES:
            raise ValueError(f"해석 에이전트가 낼 수 없는 주장 유형: {self.claim_type}")
        return self

    @property
    def contradicted(self) -> bool:
        return any(e.relation is Relation.CONTRADICTS for e in self.evidence)

    def row(self, analysis_version: str, output_id: str) -> dict[str, Any]:
        """`analysis_claims` 에 넣을 값."""
        return {
            "claim_id": self.claim_id,
            "analysis_version": analysis_version,
            "output_id": output_id,
            "claim_type": str(self.claim_type),
            "requirement_kind": (
                str(self.requirement_kind) if self.requirement_kind else None
            ),
            "scope_level": str(self.scope_level),
            "scope_id": self.scope_id,
            "claim_text": self.claim_text,
            "structured_slots": dict(self.structured_slots),
            "confidence": self.confidence,
            "confidence_components": dict(self.confidence_components),
            "verification_status": str(self.verification_status),
        }

    def evidence_rows(self) -> tuple[dict[str, Any], ...]:
        """`analysis_claim_evidence` 에 넣을 값. 기본키 중복을 미리 접는다."""
        seen: set[tuple[str, str, str]] = set()
        rows: list[dict[str, Any]] = []
        for ref in self.evidence:
            if ref.key in seen:
                continue
            seen.add(ref.key)
            rows.append(
                {
                    "claim_id": self.claim_id,
                    "support_type": str(ref.support_type),
                    "support_id": ref.support_id,
                    "relation": str(ref.relation),
                    "weight": ref.weight,
                }
            )
        return tuple(rows)


class CoverageAssertion(BaseModel):
    """범위 확인 한 건(docs/erd.md 11.6).

    `coverage_complete` 를 스스로 정하지 않고 검사한 수와 모집단 수에서 만든다.
    데이터베이스의 `CHECK` 와 같은 식을 여기서도 강제해, 저장 전에 어긋난 값이
    payload 로 새지 않게 한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    assertion_id: str
    scope_level: ScopeLevel
    scope_id: str
    dimension_id: str | None = None
    population_n: int = Field(ge=0)
    checked_n: int = Field(ge=0)
    matched_n: int = Field(ge=0)
    assertion: str

    @model_validator(mode="after")
    def _counts(self) -> CoverageAssertion:
        if self.checked_n > self.population_n:
            raise ValueError("checked_n 은 population_n 을 넘지 못한다")
        if self.matched_n > self.checked_n:
            raise ValueError("matched_n 은 checked_n 을 넘지 못한다")
        return self

    @property
    def coverage_complete(self) -> bool:
        """전수 검사를 마쳤는가. 계산식이며 값을 받지 않는다."""
        return self.checked_n == self.population_n

    def row(self, analysis_version: str) -> dict[str, Any]:
        return {
            "assertion_id": self.assertion_id,
            "analysis_version": analysis_version,
            "scope_level": str(self.scope_level),
            "scope_id": self.scope_id,
            "dimension_id": self.dimension_id,
            "population_n": self.population_n,
            "checked_n": self.checked_n,
            "matched_n": self.matched_n,
            "assertion": self.assertion,
            "coverage_complete": self.coverage_complete,
        }


# --------------------------------------------------- payload 모델 (CONTRACT 5장 B)


class ScopeRef(BaseModel):
    """payload 의 `scope`. React 가 보내는 모양 그대로다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    level: ScopeLevel
    cluster_tag: str | None = None
    """기업군 **표시명**. 식별자가 아니다(CONTRACT 5장 B)."""

    posting_id: str | None = None

    @model_validator(mode="after")
    def _level_fields(self) -> ScopeRef:
        if self.level is ScopeLevel.POSTING and not self.posting_id:
            raise ValueError("posting 범위는 posting_id 가 필요하다")
        if self.level is ScopeLevel.CLUSTER and not self.cluster_tag:
            raise ValueError("cluster 범위는 cluster_tag 가 필요하다")
        return self


class BaselineItem(BaseModel):
    """직무 기준선 한 줄."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    item_id: str
    title: str
    desc: str = ""
    freq_pct: int | None = None
    required_ratio: int | None = None


class DeviationItem(BaseModel):
    """기준선에서 벗어난 요구 한 줄."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    item_id: str
    topic: str
    baseline: str
    deviation: str
    evidence: str
    explanation: str
    confidence: ConfidenceGrade
    ratio: str
    related_stat: str | None = None
    requirement_kind: RequirementKind = RequirementKind.EXPLICIT_REQUIREMENT
    """payload 밖의 저장 경로가 읽는다. 화면은 무시해도 된다."""


class UnchangedItem(BaseModel):
    """편차 없음 한 줄."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    item_id: str
    title: str
    note: str


class SourceRef(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    type: str
    url: str | None = None


class RawLine(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    text: str
    mark_n: int | None = None
    note_n: int | None = None
    base_n: int | None = None
    base_ref: str | None = None


class RawSection(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    section: str
    lines: tuple[RawLine, ...] = ()


class Interpretation(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    n: int | None = None
    title: str
    body: str
    confidence: ConfidenceGrade
    ratio: str | None = None
    sources: tuple[SourceRef, ...] = ()


class BaselineNote(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    n: int
    base_ref: str
    body: str


class SignalNote(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    n: int
    title: str
    body: str


class PostingView(BaseModel):
    """공고 범위에서만 채우는 블록."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    posting_id: str
    company: str
    title: str
    summary: Interpretation
    raw_sections: tuple[RawSection, ...] = ()
    interpretations: tuple[Interpretation, ...] = ()
    baseline_notes: tuple[BaselineNote, ...] = ()
    signal_notes: tuple[SignalNote, ...] = ()
    unchanged_note: str = ""


# ---------------------------------------------------------------- 모델 포트


class DeviationNarrative(BaseModel):
    """편차 하나에 붙는 설명 문장.

    확신 값을 담지 않는다. 생성 모델의 자기 보고를 신뢰도로 쓰지 않으며
    (docs/agent-design.md 8장), 등급은 `baseline.py` 가 근거 수와 표본에서 낸다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    explanation: str
    requirement_kind: RequirementKind = RequirementKind.EXPLICIT_REQUIREMENT
    deviation_label: str = ""
    """편차가 요구하는 수준을 한 구로 적은 것. 비면 부르는 쪽이 기본값을 쓴다."""


@runtime_checkable
class DeviationInterpreter(Protocol):
    """편차 하나를 문장으로 옮기는 것.

    `topic` 은 차원 이름, `baseline` 은 직무 전체의 수준, `deviation` 은 이 범위가
    더 요구하는 것, `evidence` 는 인용할 근거 문장이다.
    """

    def interpret(
        self,
        topic: str,
        baseline: str,
        deviation: str,
        evidence: tuple[str, ...] = (),
    ) -> DeviationNarrative: ...


class EntailmentVerdict(BaseModel):
    """근거 한 건이 주장을 실제로 지지하는지에 대한 판정(15-3)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    entailed: bool
    relation: Relation = Relation.SUPPORTS
    rationale: str = ""


@runtime_checkable
class EntailmentJudge(Protocol):
    """주장과 근거의 함의를 판정하는 포트.

    근거를 붙였다는 사실과 그 근거가 주장을 실제로 함의한다는 사실은 다르다.
    여기서는 포트만 정하고, 실제 판정 구현은 B6 이 검사 5(근거 함의 검증)로 넣는다.
    이 갈래는 항상 지지로 답하는 대역만 갖는다(`adapter.StubEntailmentJudge`).
    """

    def judge(self, claim_text: str, evidence_text: str) -> EntailmentVerdict: ...


# ---------------------------------------------------------------- 저장소 포트


@runtime_checkable
class InterpretationRepository(Protocol):
    """해석이 읽고 쓰는 저장소.

    구현은 `repositories/` 가 갖는다. 이 모듈과 `agent.py` 는 `psycopg` 를 모른다.
    """

    def statistics_facts(
        self,
        analysis_version: str,
        scope_level: str,
        scope_id: str,
        period_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """범위 하나의 지표 사실. 값은 `StatisticFact` 의 필드 이름을 쓴다."""
        ...

    def add_output(self, values: dict[str, Any]) -> None: ...

    def add_claim(self, values: dict[str, Any]) -> None: ...

    def add_claim_evidence(self, values: dict[str, Any]) -> None: ...

    def add_coverage_assertion(self, values: dict[str, Any]) -> None: ...


# ------------------------------------------------------------------- 실행 결과


@dataclass(frozen=True, slots=True)
class InterpretationOutcome:
    """해석 실행 하나의 결과."""

    agent_run_id: str
    stop_reason: StopReason
    output_id: str | None = None
    payload: Mapping[str, Any] | None = None
    created_claims: int = 0
    created_evidence: int = 0
    created_assertions: int = 0
    unmet_slots: tuple[str, ...] = ()
    conflicts: tuple[str, ...] = field(default_factory=tuple)
    """지지와 반박이 함께 붙은 차원(15-4). 사람이 보게 남긴다."""

    errors: tuple[tuple[str, str], ...] = field(default_factory=tuple)

    @property
    def gained_evidence(self) -> bool:
        return self.created_claims > 0


__all__ = [
    "AGENT_NAME",
    "AGENT_VERSION",
    "BASELINE_SLOT",
    "CLUSTER_SLOT",
    "INTERPRETATION_CLAIM_TYPES",
    "KIND_OF_CLAIM",
    "MINIMUM_INDEPENDENT_COMPANIES",
    "OFFICIAL_SLOT",
    "OUTPUT_TYPE",
    "REFLECTED_IN_STATISTICS",
    "BaselineItem",
    "BaselineNote",
    "ClaimDraft",
    "ClaimType",
    "ConfidenceGrade",
    "ContextSignal",
    "CoverageAssertion",
    "DeviationInterpreter",
    "DeviationItem",
    "DeviationNarrative",
    "EntailmentJudge",
    "EntailmentVerdict",
    "EvidenceRef",
    "Interpretation",
    "InterpretationOutcome",
    "InterpretationRepository",
    "PostingEvidence",
    "PostingView",
    "RawLine",
    "RawSection",
    "Relation",
    "RequirementKind",
    "ScopeRef",
    "SignalNote",
    "SourceRef",
    "StatisticFact",
    "SupportType",
    "UnchangedItem",
    "VerificationStatus",
    "interpretation_objective",
]
