"""합격 전략 에이전트의 계약.

정의는 docs/agent-design.md 6장·7.5, docs/erd.md 11.7,
`agent/data/demo_seed/CONTRACT.md` 5장 C 와 8장을 따른다.

이 에이전트는 해석 산출물을 받아 체크리스트 개념과 버전 인스턴스를 만들고,
각 항목을 자기소개서·포트폴리오·면접 가운데 어디에서 쓰는지 배정한다.

계약이 지키는 것 셋.

- **개념과 인스턴스의 분리.** `checklist_concepts.concept_id` 는 분석 버전을 넘어
  유지되고 `checklist_items` 가 버전별 문구를 갖는다. 사용자 체크 상태의 키가
  개념 식별자이므로(docs/erd.md 11.7 끝문단) 문구가 바뀌어도 체크가 살아남는다.
- **활용처의 부분집합 제약.** `channels` 는 `essay`·`portfolio`·`interview` 의
  부분집합이다. `checklist_items` 의 CHECK 와 같은 집합을 여기서도 강제한다.
- **근거 없는 항목은 만들지 않는다.** 모든 항목은 최소 하나의 근거(차원 또는
  편차)에 연결되고, 그 근거의 자료 계층이 `strategy` 용도를 허용해야 한다.

저장소는 `Protocol` 로만 안다. `psycopg` 를 import 하지 않는다.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.contracts.check_result import CheckResult
from careersignal.contracts.run_context import StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import SourceTier

AGENT_VERSION = "1.0.0"
"""payload 의 `agent_version`. CONTRACT 5장 C 가 고정한 값이다."""

STORED = "stored"
"""payload 의 `source`. 저장된 활성 결과를 뜻한다(CONTRACT 5장 B)."""


class Channel(StrEnum):
    """체크리스트 항목을 쓰는 자리.

    `checklist_items.channels` 의 CHECK `channels <@ ARRAY['essay','portfolio',
    'interview']` 와 같은 집합이다.
    """

    ESSAY = "essay"
    PORTFOLIO = "portfolio"
    INTERVIEW = "interview"


class ChecklistKind(StrEnum):
    """`checklist_concepts.kind` 의 값 집합.

    `project` 는 산출물로 증명하는 것, `story` 는 서사로 말하는 것,
    `study` 는 면접에서 이해를 검증받는 것이다.
    """

    PROJECT = "project"
    STORY = "story"
    STUDY = "study"


class EvidenceKind(StrEnum):
    """체크리스트 항목이 딛는 근거의 갈래.

    해석 산출물의 기준선 항목(차원)과 편차 두 가지뿐이다. 전략 에이전트는 통계를
    다시 계산하지 않고 해석이 세운 것 위에만 항목을 세운다.
    """

    DIMENSION = "dimension"
    DEVIATION = "deviation"


class Confidence(StrEnum):
    """해석 산출물의 신뢰도 표기(CONTRACT 5장 B)."""

    HIGH = "high"
    MID = "mid"
    LOW = "low"


class BaselineRequirement(BaseModel):
    """해석 산출물의 기준선 항목 하나.

    `item_id` 는 요구 차원 식별자(`dim_<job>_<slug>`)다. 체크리스트 개념 식별자와
    다르다. 개념 식별자는 이 에이전트가 제목에서 결정적으로 만든다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    item_id: str
    title: str
    desc: str = ""
    freq_pct: float | None = Field(default=None, ge=0.0, le=100.0)
    required_ratio: float | None = Field(default=None, ge=0.0, le=1.0)
    kind: ChecklistKind = ChecklistKind.PROJECT
    source_tier: SourceTier = SourceTier.POSTING
    """이 기준선을 뒷받침한 자료의 계층. 기준선은 공고 집계이므로 기본이 A 다."""


class DeviationSignal(BaseModel):
    """해석 산출물의 편차 하나.

    `dev_n` 은 화면이 편차 ①②③ 로 부르는 번호이며 payload 의 `dev_n` 으로 간다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    item_id: str
    dev_n: int = Field(ge=1)
    topic: str
    deviation: str = ""
    evidence: str = ""
    explanation: str = ""
    confidence: Confidence = Confidence.MID
    kind: ChecklistKind = ChecklistKind.PROJECT
    source_tier: SourceTier = SourceTier.POSTING


class InterpretationInput(BaseModel):
    """전략 실행의 유일한 분석 입력.

    `agent/main.py` 의 `ConditionsRequest.reverse` 가 담던 해석 응답에 대응한다.
    범위는 `RunContext` 와 같아야 하며 실행이 대조한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    job_role_id: str
    scope_level: ScopeLevel
    scope_id: str | None = None
    cluster_tag: str | None = None
    """payload `scope.cluster_tag`. 기업군 표시명 문자열이다(CONTRACT 5장 B)."""

    posting_id: str | None = None
    baseline: tuple[BaselineRequirement, ...] = ()
    deviations: tuple[DeviationSignal, ...] = ()

    @model_validator(mode="after")
    def _scope_shape(self) -> InterpretationInput:
        if self.scope_level is ScopeLevel.OVERALL and self.scope_id is not None:
            raise ValueError("overall 범위는 scope_id 를 갖지 않는다")
        if self.scope_level is not ScopeLevel.OVERALL and not self.scope_id:
            raise ValueError(f"{self.scope_level} 범위는 scope_id 가 필요하다")
        return self


class EvidenceLink(BaseModel):
    """체크리스트 항목 하나가 딛는 근거 하나.

    `concept_id` 로 항목을 가리킨다. 연결 완전성 검사(16-3)와 자료 정책 검사가
    이 목록만 읽는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    concept_id: str
    kind: EvidenceKind
    ref_id: str
    """근거가 된 차원 식별자 또는 편차 항목 식별자."""

    source_tier: SourceTier = SourceTier.POSTING


class ChecklistDraft(BaseModel):
    """문구를 붙이기 전의 체크리스트 항목 하나.

    무엇을 항목으로 세울지와 어디에 쓸지는 규칙이 정한다(16-1). 모델은 이 초안을
    받아 문구만 만든다. 규칙과 문구를 한 곳에서 만들면 모델이 활용처를 바꿔
    `channels` 제약을 깨뜨릴 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    concept_id: str
    title: str
    kind: ChecklistKind = ChecklistKind.PROJECT
    channels: tuple[Channel, ...] = ()
    is_deviation: bool = False
    dev_n: int | None = None
    required: bool = True
    topic: str = ""
    """근거 요약. 모델에게 왜 이 항목이 필요한지 알려 주는 재료다."""

    evidence_links: tuple[EvidenceLink, ...] = ()

    @model_validator(mode="after")
    def _channels_are_subset(self) -> ChecklistDraft:
        if len(set(self.channels)) != len(self.channels):
            raise ValueError("channels 에 같은 활용처가 두 번 오지 않는다")
        if self.dev_n is not None and not self.is_deviation:
            raise ValueError("dev_n 은 편차 항목만 갖는다")
        return self


class ChecklistCopy(BaseModel):
    """모델이 만드는 항목 하나의 문구.

    항목이 배정받은 활용처의 문구를 한 번에 만든다. 활용처마다 따로 부르면 같은
    항목을 두고 서로 어긋난 이야기가 나온다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    subtitle: str = ""
    reason: str
    """왜 필요한가. `checklist_items.reason` 으로 간다."""

    evidence_needed: str
    """무엇으로 증명하는가. `checklist_items.evidence_needed` 로 간다."""

    tips: tuple[str, ...] = ()
    sample_sentence: str | None = None
    narrative_problem: str | None = None
    narrative_solve: str | None = None
    narrative_growth: str | None = None
    interview_question: str | None = None
    interview_followups: tuple[str, ...] = ()
    interview_point: str | None = None

    @property
    def narrative(self) -> dict[str, str] | None:
        """세 칸이 모두 찼을 때만 서사다. 반쯤 빈 서사는 화면에 내지 않는다."""
        parts = (
            self.narrative_problem,
            self.narrative_solve,
            self.narrative_growth,
        )
        if any(part is None for part in parts):
            return None
        return {
            "problem": self.narrative_problem or "",
            "solve": self.narrative_solve or "",
            "growth": self.narrative_growth or "",
        }


class ChecklistConcept(BaseModel):
    """`checklist_concepts` 한 행.

    분석 버전을 담지 않는다. 개념은 버전을 넘어 유지된다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    concept_id: str
    job_role_id: str
    canonical_title: str
    kind: ChecklistKind

    def as_row(self) -> dict[str, Any]:
        return {
            "concept_id": self.concept_id,
            "job_role_id": self.job_role_id,
            "canonical_title": self.canonical_title,
            "kind": str(self.kind),
        }


class ChecklistItem(BaseModel):
    """`checklist_items` 한 행. 분석 버전과 범위마다 새로 생긴다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    item_id: str
    concept_id: str
    analysis_version: str
    scope_level: ScopeLevel
    scope_id: str | None = None
    title: str
    subtitle: str = ""
    reason: str
    evidence_needed: str
    channels: tuple[Channel, ...]
    required: bool = True
    is_deviation: bool = False
    dev_n: int | None = None
    kind: ChecklistKind = ChecklistKind.PROJECT
    wording: ChecklistCopy | None = None
    """활용처 카드가 읽는 문구. 저장 행에는 담기지 않는다.

    이름을 `copy` 로 두지 않는다. `BaseModel.copy` 를 가린다.
    """

    @model_validator(mode="after")
    def _has_channel(self) -> ChecklistItem:
        if not self.channels:
            raise ValueError("활용처가 없는 항목은 화면에 자리가 없다")
        return self

    def as_row(self) -> dict[str, Any]:
        """`checklist_items` 적재 행. `kind` 와 `wording` 은 개념·payload 의 몫이다."""
        return {
            "item_id": self.item_id,
            "concept_id": self.concept_id,
            "analysis_version": self.analysis_version,
            "scope_level": str(self.scope_level),
            "scope_id": self.scope_id,
            "title": self.title,
            "subtitle": self.subtitle,
            "reason": self.reason,
            "evidence_needed": self.evidence_needed,
            "channels": [str(channel) for channel in self.channels],
            "required": self.required,
            "is_deviation": self.is_deviation,
        }

    def as_payload_entry(self) -> dict[str, Any]:
        """payload `checklist[]` 한 칸(CONTRACT 5장 C).

        `item_id` 자리에 **개념 식별자**를 넣는다. 화면 체크 상태와 로드맵의
        `fills[].item_id` 가 이 키에 기댄다.
        """
        return {
            "item_id": self.concept_id,
            "title": self.title,
            "subtitle": self.subtitle,
            "reason": self.reason,
            "evidence_needed": self.evidence_needed,
            "channels": [str(channel) for channel in self.channels],
            "kind": str(self.kind),
            "is_deviation": self.is_deviation,
            "dev_n": self.dev_n,
            "required": self.required,
            "have": False,
        }


@runtime_checkable
class StrategyWriter(Protocol):
    """체크리스트 항목 하나의 문구를 만드는 것. 제공자를 감춘다.

    활용처 배정과 근거 연결은 이미 정해져 초안에 들어 있다. 구현이 그것을 바꿀
    자리는 없다.
    """

    def write(self, draft: ChecklistDraft) -> ChecklistCopy: ...


@runtime_checkable
class StrategyRepository(Protocol):
    """전략 산출물이 저장소에 요구하는 것 넷.

    좁게 잡아 대역으로 검증할 수 있게 한다. 구현은 `repositories/` 가 갖는다.
    """

    def find_concept(self, concept_id: str) -> dict[str, Any] | None: ...

    def add_concept(self, values: dict[str, Any]) -> None: ...

    def add_item(self, values: dict[str, Any]) -> None: ...

    def save_output(self, values: dict[str, Any]) -> None: ...


class StrategyOutcome(BaseModel):
    """전략 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    output_id: str | None = None
    concepts: tuple[ChecklistConcept, ...] = ()
    """이번 실행이 새로 만든 개념. 이미 있던 개념은 담지 않는다."""

    items: tuple[ChecklistItem, ...] = ()
    rejected: tuple[str, ...] = ()
    """검사에 걸려 저장하지 않은 항목의 개념 식별자."""

    checks: tuple[CheckResult, ...] = ()
    errors: tuple[tuple[str, str], ...] = ()
    payload: dict[str, Any] | None = None

    @property
    def gained_evidence(self) -> bool:
        return bool(self.items)

    @property
    def blocked(self) -> bool:
        """차단 판정이 하나라도 있으면 이 산출물은 활성화 후보가 아니다."""
        return any(check.blocks_publication for check in self.checks)


__all__ = [
    "AGENT_VERSION",
    "STORED",
    "BaselineRequirement",
    "Channel",
    "ChecklistConcept",
    "ChecklistCopy",
    "ChecklistDraft",
    "ChecklistItem",
    "ChecklistKind",
    "Confidence",
    "DeviationSignal",
    "EvidenceKind",
    "EvidenceLink",
    "InterpretationInput",
    "StrategyOutcome",
    "StrategyRepository",
    "StrategyWriter",
]
