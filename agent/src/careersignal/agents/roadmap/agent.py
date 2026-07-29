"""준비 로드맵의 실행 골격.

정의는 docs/agent-design.md 6장·7.6·11.3, docs/backlog.md Phase 17,
docs/erd.md 11.7, `agent/data/demo_seed/CONTRACT.md` 5장 D 를 따른다.

세 가지를 한다.

- 17-1 `PREREQUISITE_OF` 를 위상 정렬해 단계 순서를 만들고, 각 단계가 어떤 체크리스트
  개념을 충족하는지 `roadmap_item_fills` 로 잇는다.
- 17-2 `capability_depth_profiles.expected_depth` 를 `study_tracks.depth_reference` 로
  옮긴다. 학습의 깊이는 로드맵이 정하지 않고 집계가 정한다.
- 17-3 선수 관계에 순환이 있으면 명시적 실패로 끝낸다. 어떤 단계에도 붙지 못한
  체크리스트 개념은 결과에 남긴다.

**순서와 기간과 깊이는 규칙이 정하고 문장만 모델이 쓴다.** 모델 호출은 단계마다
한 번이고 `providers/concurrency.map_ordered` 로 묶어 던진다. 돌아온 결과는 입력
순서대로 조립하므로 동시 실행이 단계 번호를 흔들지 않는다.

저장소는 `Protocol` 로만 안다(`contract.RoadmapRepository`). `psycopg` 를 import 하지
않는다.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from typing import Any

from careersignal.agents.roadmap.contract import (
    AGENT_NAME,
    AGENT_VERSION,
    OUTPUT_TYPE,
    STORED_SOURCE,
    Capability,
    ChecklistConcept,
    ConceptKind,
    DepthReference,
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
)
from careersignal.agents.roadmap.ordering import (
    CyclicPrerequisites,
    topological_order,
    unlinked_concepts,
)
from careersignal.agents.roadmap.prompts import depth_sentence
from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.scope import ScopeLevel
from careersignal.providers.concurrency import DEFAULT_WORKERS, map_ordered

BASE_WEEKS = 2
"""단계 하나의 기본 기간. 편차 항목 하나마다 한 주를 더한다.

기간을 모델이 정하게 두면 같은 입력이 실행마다 다른 일정을 낸다. 규칙으로 둔다.
"""

MAX_WEEKS = 6
"""한 단계의 상한. 여섯 주를 넘기면 단계를 쪼개야 하는 신호이지 늘릴 일이 아니다."""

CONCURRENT_LABEL = "병행"
"""프로젝트 단계와 나란히 가는 학습의 `check_rows[].source_step`."""

ALWAYS_LABEL = "상시"
"""어느 단계에도 붙지 않는 학습의 `check_rows[].source_step`."""

UNPLACED_LABEL = "미배치"
"""어떤 단계에도 붙지 못한 개념의 `source_step` (17-3).

빈 문자열로 두지 않는다. 화면이 빈 값을 보유로 읽거나 그냥 감추면 누락이 묻힌다.
"""

HELD_LABEL = "보유"
"""이미 채운 개념의 `source_step`. 재조합이 이 값을 채운다(`recompose.py`)."""


# --------------------------------------------------------------- 규칙 부분


def _scope_key(source: RoadmapSource) -> str:
    """식별자에 들어가는 범위 조각. CONTRACT 1장의 `<scope>` 다."""
    if source.scope_level is ScopeLevel.OVERALL:
        return "overall"
    return source.scope_id or "overall"


def _slug(capability_id: str, job_role_id: str) -> str:
    """`cap_<job>_<slug>` 에서 slug 만 꺼낸다. 규약을 벗어난 값은 그대로 쓴다."""
    prefix = f"cap_{job_role_id}_"
    return capability_id[len(prefix) :] if capability_id.startswith(prefix) else capability_id


def _weeks(concepts: Sequence[ChecklistConcept]) -> int:
    """단계 기간. 편차 항목이 많을수록 길다."""
    extra = sum(1 for concept in concepts if concept.is_deviation)
    return min(BASE_WEEKS + extra, MAX_WEEKS)


def _priority(concepts: Sequence[ChecklistConcept]) -> StepPriority:
    """단계 우선순위.

    필수인 편차 항목을 채우는 단계가 가장 앞이다. 편차는 이 기업군의 변별점이고
    필수는 없으면 탈락하는 것이므로, 둘이 겹친 자리가 먼저다.
    """
    if any(concept.is_deviation and concept.required for concept in concepts):
        return StepPriority.VHIGH
    if any(concept.required for concept in concepts):
        return StepPriority.HIGH
    return StepPriority.MID


def _track_priority(concepts: Sequence[ChecklistConcept], attached: bool) -> TrackPriority:
    """학습 트랙 우선순위. 어느 단계에도 붙지 않으면 별도 트랙이다."""
    if not attached:
        return TrackPriority.TRACK
    return TrackPriority(str(_priority(concepts)))


def _fill(concept: ChecklistConcept) -> dict[str, Any]:
    """payload 의 `fills[]` 한 칸.

    `item_id` 는 `checklist_concepts.concept_id` 다. 체크 상태의 키와 같아야 재조합이
    맞아떨어진다(docs/architecture.md 9.1).
    """
    return {
        "item_id": concept.concept_id,
        "label": concept.title,
        "kind": str(concept.fill_kind),
    }


def _fallback(brief: StepBrief, capability_label: str) -> StepNarration:
    """서술을 얻지 못한 단계의 문장.

    단계를 통째로 버리지 않는다. 순서와 충족 연결은 규칙이 이미 만들었고 그것이
    로드맵의 뼈대이므로, 문장이 비어도 단계는 남긴다. 실패는 `errors` 에 남는다.
    """
    return StepNarration(
        title=capability_label,
        depth=depth_sentence(brief.depth) if brief.is_study else "",
    )


# ------------------------------------------------------------------- 조립


def build_payload(
    source: RoadmapSource,
    narrator: StepNarrator,
    analysis_version: str,
    workers: int = DEFAULT_WORKERS,
) -> RoadmapPlan:
    """로드맵 한 벌을 만든다. 저장은 하지 않는다.

    순수한 조립이므로 저장소 없이 검사할 수 있다. 같은 `source` 와 같은 서술 구현을
    주면 같은 결과가 나온다.

    선수 관계에 순환이 있으면 `CyclicPrerequisites` 를 던진다. 임의의 순서를 지어
    로드맵을 내지 않는다(17-3).
    """
    labels = {capability.capability_id: capability.label for capability in source.capabilities}
    depths: dict[str, DepthLevel] = {
        reference.capability_id: reference.expected_depth
        for reference in source.depth_references
    }

    # 역량마다 채우는 개념을 모은다. 개념의 입력 순서가 역량의 순서를 정한다.
    grouped: dict[str, list[ChecklistConcept]] = {}
    for concept in source.concepts:
        if concept.capability_id is None:
            continue
        grouped.setdefault(concept.capability_id, []).append(concept)

    edges = [
        (edge.src_capability_id, edge.dst_capability_id) for edge in source.prerequisites
    ]
    ordered = topological_order(list(grouped), edges)

    # 역량 하나가 프로젝트 단계와 학습 트랙으로 갈린다. 학습 개념은 트랙으로 간다.
    step_plan: list[tuple[str, list[ChecklistConcept]]] = []
    track_plan: list[tuple[str, list[ChecklistConcept]]] = []
    for capability_id in ordered:
        concepts = grouped[capability_id]
        project = [c for c in concepts if c.kind is not ConceptKind.STUDY]
        study = [c for c in concepts if c.kind is ConceptKind.STUDY]
        if project:
            step_plan.append((capability_id, project))
        if study:
            track_plan.append((capability_id, study))

    step_number = {capability_id: n for n, (capability_id, _) in enumerate(step_plan, 1)}
    incoming: dict[str, list[str]] = {}
    for src, dst in edges:
        if src in grouped and dst in grouped:
            incoming.setdefault(dst, []).append(src)

    def _label(capability_id: str) -> str:
        return labels.get(capability_id, capability_id)

    def _prerequisite_labels(capability_id: str) -> tuple[str, ...]:
        return tuple(_label(src) for src in incoming.get(capability_id, ()))

    briefs: list[StepBrief] = []
    for n, (capability_id, concepts) in enumerate(step_plan, 1):
        briefs.append(
            StepBrief(
                step_order=n,
                capability_id=capability_id,
                capability_label=_label(capability_id),
                concept_titles=tuple(c.title for c in concepts),
                deviation_titles=tuple(c.title for c in concepts if c.is_deviation),
                weeks=_weeks(concepts),
                priority=str(_priority(concepts)),
                prerequisite_labels=_prerequisite_labels(capability_id),
            )
        )
    step_count = len(briefs)
    for n, (capability_id, concepts) in enumerate(track_plan, step_count + 1):
        attached = capability_id in step_number
        briefs.append(
            StepBrief(
                step_order=n,
                capability_id=capability_id,
                capability_label=_label(capability_id),
                concept_titles=tuple(c.title for c in concepts),
                deviation_titles=tuple(c.title for c in concepts if c.is_deviation),
                priority=str(_track_priority(concepts, attached)),
                depth=depths.get(capability_id),
                is_study=True,
                prerequisite_labels=_prerequisite_labels(capability_id),
            )
        )

    # 모델 호출만 겹친다. 조립은 입력 순서대로 주 갈래에서 한다.
    completed = map_ordered(narrator.narrate, briefs, workers=workers)
    narrations: list[StepNarration] = []
    errors: list[tuple[str, str]] = []
    for index, brief in enumerate(briefs):
        result = completed[index] if index < len(completed) else None
        if result is None or result.failed or result.value is None:
            reason = (
                f"{type(result.error).__name__}: {result.error}"
                if result is not None and result.error is not None
                else "서술을 시도하지 못했다"
            )
            errors.append((brief.capability_id, reason))
            narrations.append(_fallback(brief, _label(brief.capability_id)))
        else:
            narrations.append(result.value)

    scope_key = _scope_key(source)
    source_step: dict[str, str] = {}

    project_steps: list[dict[str, Any]] = []
    item_rows: list[dict[str, Any]] = []
    fill_rows: list[dict[str, Any]] = []
    for n, (capability_id, concepts) in enumerate(step_plan, 1):
        narration = narrations[n - 1]
        weeks = _weeks(concepts)
        priority = _priority(concepts)
        step_label = f"STEP {n:02d}"
        phase = f"{step_label} · {weeks}주"
        roadmap_item_id = f"ri_{source.job_role_id}_{scope_key}_{n}"

        project_steps.append(
            {
                "n": n,
                "phase": phase,
                "weeks": weeks,
                "priority": str(priority),
                "title": narration.title,
                "body": narration.body,
                "deliverable": narration.deliverable,
                "fills": [_fill(concept) for concept in concepts],
                "reason_title": narration.reason_title,
                "reason": narration.reason,
                "tags": list(narration.tags),
            }
        )
        item_rows.append(
            {
                "roadmap_item_id": roadmap_item_id,
                "analysis_version": analysis_version,
                "scope_level": str(source.scope_level),
                "scope_id": source.scope_id,
                "step_order": n,
                "phase_label": phase,
                "weeks": weeks,
                "priority": str(priority),
                "title": narration.title,
                "body": narration.body,
                "deliverable": narration.deliverable,
                "reason": narration.reason,
                "tags": list(narration.tags),
            }
        )
        for concept in concepts:
            fill_rows.append(
                {
                    "roadmap_item_id": roadmap_item_id,
                    "concept_id": concept.concept_id,
                    "fill_kind": str(concept.fill_kind),
                }
            )
            source_step[concept.concept_id] = step_label

    study_tracks: list[dict[str, Any]] = []
    track_rows: list[dict[str, Any]] = []
    for offset, (capability_id, concepts) in enumerate(track_plan):
        narration = narrations[step_count + offset]
        attached = capability_id in step_number
        priority = _track_priority(concepts, attached)
        expected = depths.get(capability_id)
        if attached:
            phase = f"STEP {step_number[capability_id]:02d}와 병행"
            label = CONCURRENT_LABEL
        else:
            phase = f"{ALWAYS_LABEL} · 별도 트랙"
            label = ALWAYS_LABEL

        study_tracks.append(
            {
                "phase": phase,
                "priority": str(priority),
                "title": narration.title,
                "depth": narration.depth or depth_sentence(expected),
                "reason_title": narration.reason_title,
                "reason": narration.reason,
                "fills": [_fill(concept) for concept in concepts],
            }
        )
        track_rows.append(
            {
                # 17-2. 깊이는 집계가 정한 등급을 그대로 옮긴다.
                "track_id": f"st_{source.job_role_id}_{scope_key}_{_slug(capability_id, source.job_role_id)}",
                "analysis_version": analysis_version,
                "scope_level": str(source.scope_level),
                "scope_id": source.scope_id,
                "capability_id": capability_id,
                "phase_label": phase,
                "priority": str(priority),
                "depth_reference": str(expected) if expected is not None else None,
            }
        )
        for concept in concepts:
            source_step[concept.concept_id] = label

    check_rows = [
        {
            "item_id": concept.concept_id,
            "title": concept.title,
            "kind": str(concept.fill_kind),
            "is_deviation": concept.is_deviation,
            "dev_n": concept.dev_n,
            "required": concept.required,
            "source_step": source_step.get(concept.concept_id, UNPLACED_LABEL),
        }
        for concept in source.concepts
    ]

    payload = {
        "job": source.job_role_id,
        "scope": {
            "level": str(source.scope_level),
            "cluster_tag": source.cluster_tag,
            "posting_id": source.scope_id
            if source.scope_level is ScopeLevel.POSTING
            else None,
        },
        "project_steps": project_steps,
        "study_tracks": study_tracks,
        "check_rows": check_rows,
        "agent_version": AGENT_VERSION,
        "source": STORED_SOURCE,
    }

    return RoadmapPlan(
        payload=payload,
        roadmap_items=tuple(item_rows),
        roadmap_item_fills=tuple(fill_rows),
        study_tracks=tuple(track_rows),
        unlinked_concept_ids=unlinked_concepts(
            [concept.concept_id for concept in source.concepts], source_step
        ),
        errors=tuple(errors),
    )


# ------------------------------------------------------------------- 실행


class RoadmapPlanner:
    """저장소에서 입력을 읽어 로드맵을 만들고 저장한다."""

    def __init__(
        self,
        narrator: StepNarrator,
        repository: RoadmapRepository,
        workers: int = DEFAULT_WORKERS,
    ) -> None:
        self._narrator = narrator
        self._repository = repository
        self._workers = workers

    def load(self, context: RunContext) -> RoadmapSource:
        """실행 봉투가 가리키는 범위의 입력을 모은다.

        에이전트는 앞 단계의 응답을 통째로 받지 않고 공통 식별자로 저장소를 조회한다
        (docs/architecture.md 10.2).
        """
        scope_level = str(context.scope_level)
        concepts = tuple(
            ChecklistConcept.model_validate(row)
            for row in self._repository.checklist_concepts(
                context.analysis_version, scope_level, context.scope_id
            )
        )
        capabilities = tuple(
            Capability.model_validate(row)
            for row in self._repository.capabilities(context.job_role_id)
        )
        prerequisites = tuple(
            PrerequisiteEdge.model_validate(row)
            for row in self._repository.capability_prerequisites(
                context.job_role_id, context.knowledge_version
            )
        )
        references = tuple(
            DepthReference.model_validate(row)
            for row in self._repository.depth_references(
                context.analysis_version, scope_level, context.scope_id
            )
        )
        return RoadmapSource(
            job_role_id=context.job_role_id,
            scope_level=context.scope_level,
            scope_id=context.scope_id,
            concepts=concepts,
            capabilities=capabilities,
            prerequisites=prerequisites,
            depth_references=references,
        )

    def run(self, context: RunContext, source: RoadmapSource | None = None) -> RoadmapOutcome:
        """로드맵을 만들어 저장한다.

        순환은 명시적 실패다. 저장을 시작하기 전에 끝내므로 반쪽짜리 로드맵이 남지
        않는다.
        """
        prepared = source if source is not None else self.load(context)

        try:
            plan = build_payload(
                prepared,
                self._narrator,
                analysis_version=context.analysis_version,
                workers=self._workers,
            )
        except CyclicPrerequisites as exc:
            return RoadmapOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.EXPLICIT_FAILURE,
                cycle=exc.cycle,
                errors=((AGENT_NAME, str(exc)),),
            )

        if not plan.roadmap_items:
            return RoadmapOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.NO_NEW_EVIDENCE,
                unlinked_concept_ids=plan.unlinked_concept_ids,
                errors=plan.errors,
            )

        self._repository.add_roadmap_items(list(plan.roadmap_items))
        self._repository.add_roadmap_item_fills(list(plan.roadmap_item_fills))
        self._repository.add_study_tracks(list(plan.study_tracks))

        output_id = f"out_{prepared.job_role_id}_road_{_scope_key(prepared)}"
        self._repository.add_analysis_output(
            {
                "output_id": output_id,
                "analysis_version": context.analysis_version,
                "job_role_id": prepared.job_role_id,
                "scope_level": str(prepared.scope_level),
                "scope_id": prepared.scope_id,
                "output_type": OUTPUT_TYPE,
                "payload": plan.payload,
                "produced_by_agent": AGENT_NAME,
                "verification_status": None,
                "generated_at": datetime.now(),
            }
        )

        return RoadmapOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.SLOTS_FILLED,
            output_id=output_id,
            created_items=len(plan.roadmap_items),
            created_fills=len(plan.roadmap_item_fills),
            created_tracks=len(plan.study_tracks),
            unlinked_concept_ids=plan.unlinked_concept_ids,
            errors=plan.errors,
        )


__all__ = [
    "ALWAYS_LABEL",
    "BASE_WEEKS",
    "CONCURRENT_LABEL",
    "HELD_LABEL",
    "MAX_WEEKS",
    "UNPLACED_LABEL",
    "RoadmapPlanner",
    "build_payload",
]
