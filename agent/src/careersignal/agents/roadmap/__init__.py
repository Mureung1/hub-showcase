"""준비 로드맵 에이전트.

정의는 docs/agent-design.md 7.6, docs/backlog.md Phase 17, docs/erd.md 11.7,
`agent/data/demo_seed/CONTRACT.md` 5장 D·8장을 따른다.

선수 관계(`PREREQUISITE_OF`)의 위상 정렬이 단계 순서를 정하고, 각 단계가 어떤
체크리스트 개념을 충족하는지를 `roadmap_item_fills` 가 잇는다. 학습의 깊이는
`capability_depth_profiles.expected_depth` 를 `study_tracks.depth_reference` 로
옮긴 값이며 로드맵이 지어내지 않는다.

`recompose` 는 사용자 체크 상태를 반영해 저장된 로드맵을 다시 짜는 순수 함수다.
docs/architecture.md 9.1 의 "적용 동작으로 재조합" 이 이 함수다.
"""

from careersignal.agents.roadmap.adapter import (
    STEP_REASON_TITLE,
    TRACK_REASON_TITLE,
    OpenAIStepNarrator,
    StubStepNarrator,
)
from careersignal.agents.roadmap.agent import (
    ALWAYS_LABEL,
    BASE_WEEKS,
    CONCURRENT_LABEL,
    MAX_WEEKS,
    UNPLACED_LABEL,
    RoadmapPlanner,
    build_payload,
)
from careersignal.agents.roadmap.contract import (
    AGENT_NAME,
    AGENT_VERSION,
    OUTPUT_TYPE,
    STORED_SOURCE,
    Capability,
    ChecklistConcept,
    ConceptKind,
    DepthReference,
    FillKind,
    PrerequisiteEdge,
    RoadmapOutcome,
    RoadmapPlan,
    RoadmapRepository,
    RoadmapSource,
    StepBrief,
    StepNarration,
    StepNarrator,
    StepPriority,
    TrackPriority,
    fill_kind,
)
from careersignal.agents.roadmap.ordering import (
    CyclicPrerequisites,
    find_cycle,
    topological_order,
    unlinked_concepts,
)
from careersignal.agents.roadmap.prompts import (
    DEPTH_GUIDE,
    NARRATION_RESPONSE_SCHEMA,
    ROADMAP_TASK,
    STEP_NARRATION_PROMPT,
    TRACK_NARRATION_PROMPT,
    depth_sentence,
    user_message,
)
from careersignal.agents.roadmap.recompose import (
    HELD_LABEL,
    LOWER_PRIORITY,
    held_concepts,
    recompose,
)

__all__ = [
    "AGENT_NAME",
    "AGENT_VERSION",
    "ALWAYS_LABEL",
    "BASE_WEEKS",
    "CONCURRENT_LABEL",
    "DEPTH_GUIDE",
    "HELD_LABEL",
    "LOWER_PRIORITY",
    "MAX_WEEKS",
    "NARRATION_RESPONSE_SCHEMA",
    "OUTPUT_TYPE",
    "ROADMAP_TASK",
    "STEP_NARRATION_PROMPT",
    "STEP_REASON_TITLE",
    "STORED_SOURCE",
    "TRACK_NARRATION_PROMPT",
    "TRACK_REASON_TITLE",
    "UNPLACED_LABEL",
    "Capability",
    "ChecklistConcept",
    "ConceptKind",
    "CyclicPrerequisites",
    "DepthReference",
    "FillKind",
    "OpenAIStepNarrator",
    "PrerequisiteEdge",
    "RoadmapOutcome",
    "RoadmapPlan",
    "RoadmapPlanner",
    "RoadmapRepository",
    "RoadmapSource",
    "StepBrief",
    "StepNarration",
    "StepNarrator",
    "StepPriority",
    "StubStepNarrator",
    "TrackPriority",
    "build_payload",
    "depth_sentence",
    "fill_kind",
    "find_cycle",
    "held_concepts",
    "recompose",
    "topological_order",
    "unlinked_concepts",
    "user_message",
]
