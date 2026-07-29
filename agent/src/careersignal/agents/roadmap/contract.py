"""준비 로드맵 에이전트의 계약.

정의는 docs/agent-design.md 6장·7.6, docs/erd.md 11.7,
`agent/data/demo_seed/CONTRACT.md` 5장 D·8장을 따른다.

로드맵은 자기 앞 단계의 산출물을 HTTP 응답으로 받지 않는다. 실행 봉투(`RunContext`)와
저장소 조회로 입력을 얻고, 그 입력을 이 모듈의 모델로 고정한다. 저장소는 `Protocol`
로만 안다. `psycopg` 를 import 하지 않는다.

**개념 식별자가 이 계약의 중심이다.** 체크 상태의 키는 `checklist_concepts.concept_id`
이고(docs/architecture.md 9.1), payload 의 `fills[].item_id` 와 `check_rows[].item_id`
가 같은 값을 담는다. 여기서 어긋나면 체크 상태를 반영한 재조합이 통째로 빗나간다.
그래서 `item_id` 라는 이름을 쓰면서도 값은 개념 식별자다. 화면 계약의 키 이름을 바꾸지
않기 위한 것이며, CONTRACT 5장 D 가 같은 것을 적는다.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Any, Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.run_context import StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.scope import ScopeLevel

AGENT_NAME = "roadmap"
"""`agent_runs.agent_name` 과 `analysis_outputs.produced_by_agent` 에 적는 이름."""

AGENT_VERSION = "1.0.0"
"""payload 의 `agent_version`. CONTRACT 5장 D 의 값이다."""

OUTPUT_TYPE = "roadmap"
"""`analysis_outputs.output_type`."""

STORED_SOURCE = "stored"
"""payload 의 `source`. 저장된 활성 결과를 그대로 반환하는 경로다(CONTRACT 4장)."""


class ConceptKind(StrEnum):
    """`checklist_concepts.kind`. docs/erd.md 11.7 의 CHECK 와 같은 집합이다."""

    PROJECT = "project"
    STORY = "story"
    STUDY = "study"


class FillKind(StrEnum):
    """payload 의 `fills[].kind` 와 `check_rows[].kind` (CONTRACT 5장 D).

    `roadmap_item_fills.fill_kind` 의 CHECK 와 같은 집합이다. 개념의 갈래
    (`ConceptKind`)와 다른 축이며 `fill_kind` 가 둘을 잇는다. 편차에서 온 개념은
    `dev`, 학습 개념은 `study`, 나머지는 `normal` 이다. 화면이 편차 항목을 다르게
    보여 주기 때문에 이 축이 따로 있다.
    """

    DEV = "dev"
    NORMAL = "normal"
    STUDY = "study"


class StepPriority(StrEnum):
    """`roadmap_items.priority`. docs/erd.md 11.7 의 CHECK 다."""

    VHIGH = "vhigh"
    HIGH = "high"
    MID = "mid"


class TrackPriority(StrEnum):
    """`study_tracks.priority`. 단계 우선순위에 `track` 이 하나 더 있다.

    `track` 은 순위가 낮다는 뜻이 아니라 단계에 붙지 않는 별도 트랙이라는 뜻이다.
    코딩테스트처럼 공고 요구 분석의 대상이 아닌 전형 관문이 여기에 들어간다.
    """

    VHIGH = "vhigh"
    HIGH = "high"
    MID = "mid"
    TRACK = "track"


def fill_kind(kind: ConceptKind, is_deviation: bool) -> FillKind:
    """개념의 갈래와 편차 여부에서 채움 갈래를 정한다.

    편차가 학습 개념보다 앞선다. 편차 항목은 화면에서 `편차 ①` 처럼 번호와 함께
    강조되며, 그것이 학습이라는 사실보다 이 기업군의 변별점이라는 사실이 먼저다.
    """
    if is_deviation:
        return FillKind.DEV
    if kind is ConceptKind.STUDY:
        return FillKind.STUDY
    return FillKind.NORMAL


# --------------------------------------------------------------------- 입력


class ChecklistConcept(BaseModel):
    """전략 에이전트가 만든 체크리스트 개념 하나.

    `checklist_concepts` 와 `checklist_items` 를 범위 하나에서 조인한 모양이다.
    로드맵은 체크리스트를 다시 만들지 않고 이미 있는 것을 단계에 배치한다
    (docs/agent-design.md 12장: 전략이 만든 체크리스트를 관계형으로 조회한다).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    concept_id: str
    title: str
    kind: ConceptKind
    capability_id: str | None = None
    """이 개념을 담는 역량. 선수 관계 정렬의 마디다.

    비어 있으면 어느 단계에도 붙지 못하고 17-3 의 누락 표시 대상이 된다.
    """

    required: bool = True
    is_deviation: bool = False
    dev_n: int | None = None
    subtitle: str | None = None
    evidence_needed: str | None = None

    @property
    def fill_kind(self) -> FillKind:
        return fill_kind(self.kind, self.is_deviation)


class Capability(BaseModel):
    """`capabilities` 한 행. 단계와 학습 트랙의 제목 재료다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    capability_id: str
    label: str
    definition: str | None = None


class PrerequisiteEdge(BaseModel):
    """`knowledge_edges` 의 `PREREQUISITE_OF` 한 줄.

    `src` 를 갖춘 뒤에 `dst` 로 간다. 엣지의 방향이 그대로 단계 순서의 방향이다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    src_capability_id: str
    dst_capability_id: str
    evidence_id: str | None = None


class DepthReference(BaseModel):
    """`capability_depth_profiles` 의 기대 깊이 하나 (17-2).

    `expected_depth` 를 `study_tracks.depth_reference` 로 옮긴다. 학습 트랙의 깊이는
    로드맵이 지어내는 값이 아니라 공고 집계에서 나온 값이다
    (docs/agent-design.md 7.6).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    capability_id: str
    expected_depth: DepthLevel
    confidence: str | None = None
    sample_size: int | None = None


class RoadmapSource(BaseModel):
    """로드맵 한 벌을 만드는 데 필요한 입력 전부.

    저장소 조회 결과를 이 모델로 모아 두면 `build_payload` 가 저장소를 모른다.
    같은 값을 넣으면 같은 payload 가 나오므로 재실행이 결과를 흔들지 않는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    job_role_id: str
    scope_level: ScopeLevel
    scope_id: str | None = None
    cluster_tag: str | None = None
    """화면이 쓰는 기업군 표시명. CONTRACT 5장 B 의 `scope.cluster_tag` 와 같다."""

    concepts: tuple[ChecklistConcept, ...] = ()
    capabilities: tuple[Capability, ...] = ()
    prerequisites: tuple[PrerequisiteEdge, ...] = ()
    depth_references: tuple[DepthReference, ...] = ()


# ------------------------------------------------------------------ 모델 포트


class StepBrief(BaseModel):
    """서술을 얻으려고 모델에 보내는 단계 하나의 사실.

    사실은 규칙이 정하고 문장만 모델이 쓴다. 순서·우선순위·깊이는 이미 정해진 값이며
    모델이 그것을 바꿀 자리를 주지 않는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    step_order: int
    capability_id: str
    capability_label: str
    concept_titles: tuple[str, ...] = ()
    deviation_titles: tuple[str, ...] = ()
    weeks: int | None = None
    priority: str = StepPriority.MID
    depth: DepthLevel | None = None
    is_study: bool = False
    prerequisite_labels: tuple[str, ...] = ()


class StepNarration(BaseModel):
    """단계 하나의 문장. 모델이 채우는 유일한 것이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    title: str
    body: str = ""
    deliverable: str = ""
    depth: str = ""
    """학습 트랙의 `어디까지`. 프로젝트 단계는 비어 있다."""

    reason_title: str = ""
    reason: str = ""
    tags: tuple[str, ...] = ()


@runtime_checkable
class StepNarrator(Protocol):
    """단계 서술을 쓰는 구현이 지켜야 하는 모양.

    구현은 `OpenAIStepNarrator` 와 `StubStepNarrator` 두 벌이다(CONTRACT 8장).
    데모 경로는 언제나 대역을 쓴다.
    """

    def narrate(self, brief: StepBrief) -> StepNarration: ...


# -------------------------------------------------------------------- 저장소


@runtime_checkable
class RoadmapRepository(Protocol):
    """로드맵이 읽고 쓰는 표. `Protocol` 이므로 구현을 여기서 알지 못한다.

    쓰기 범위는 docs/permission-matrix.md 의 에이전트 경계를 따른다. 로드맵은
    `roadmap_items`·`roadmap_item_fills`·`study_tracks`·`analysis_outputs(roadmap)`
    네 곳에만 쓴다. 체크리스트는 전략의 소유이므로 읽기만 한다.
    """

    def checklist_concepts(
        self, analysis_version: str, scope_level: str, scope_id: str | None
    ) -> list[dict[str, Any]]: ...

    def capabilities(self, job_role_id: str) -> list[dict[str, Any]]: ...

    def capability_prerequisites(
        self, job_role_id: str, knowledge_version: str | None
    ) -> list[dict[str, Any]]: ...

    def depth_references(
        self, analysis_version: str, scope_level: str, scope_id: str | None
    ) -> list[dict[str, Any]]: ...

    def add_roadmap_items(self, rows: list[dict[str, Any]]) -> None: ...

    def add_roadmap_item_fills(self, rows: list[dict[str, Any]]) -> None: ...

    def add_study_tracks(self, rows: list[dict[str, Any]]) -> None: ...

    def add_analysis_output(self, values: dict[str, Any]) -> None: ...


# --------------------------------------------------------------------- 산출


class RoadmapPlan(BaseModel):
    """한 범위의 로드맵 산출 한 벌.

    payload 와 세 표의 행을 함께 담는다. 같은 계산에서 나온 것이므로 따로 만들면
    payload 의 단계와 `roadmap_items` 의 행이 어긋날 수 있다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    payload: dict[str, Any]
    roadmap_items: tuple[dict[str, Any], ...] = ()
    roadmap_item_fills: tuple[dict[str, Any], ...] = ()
    study_tracks: tuple[dict[str, Any], ...] = ()
    unlinked_concept_ids: tuple[str, ...] = ()
    """어떤 단계에도 붙지 못한 개념 (17-3). 조용히 버리지 않고 남긴다."""

    errors: tuple[tuple[str, str], ...] = ()
    """서술 구현이 던진 예외. `(단계 식별자, 사유)` 다."""


class RoadmapOutcome(BaseModel):
    """로드맵 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    output_id: str | None = None
    created_items: int = 0
    created_fills: int = 0
    created_tracks: int = 0
    unlinked_concept_ids: tuple[str, ...] = ()
    cycle: tuple[str, ...] = ()
    """선수 관계 순환. 비어 있지 않으면 명시적 실패다 (17-3)."""

    errors: tuple[tuple[str, str], ...] = Field(default_factory=tuple)

    @property
    def gained_evidence(self) -> bool:
        """이번 실행이 새로 만든 것이 있는가.

        단계를 하나도 만들지 못하면 학습 트랙만으로는 로드맵이라 하지 않는다.
        """
        return self.created_items > 0


__all__ = [
    "AGENT_NAME",
    "AGENT_VERSION",
    "OUTPUT_TYPE",
    "STORED_SOURCE",
    "Capability",
    "ChecklistConcept",
    "ConceptKind",
    "DepthReference",
    "FillKind",
    "PrerequisiteEdge",
    "RoadmapOutcome",
    "RoadmapPlan",
    "RoadmapRepository",
    "RoadmapSource",
    "StepBrief",
    "StepNarration",
    "StepNarrator",
    "StepPriority",
    "TrackPriority",
    "fill_kind",
]
