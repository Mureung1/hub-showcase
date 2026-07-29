"""준비 로드맵 에이전트 검증.

단위는 docs/backlog.md Phase 17 의 셋이다.

- 17-1 선수 관계 정렬과 충족 연결
- 17-2 깊이 기준을 반영한 학습 전략
- 17-3 순환과 누락 검사

체크 상태 재조합은 docs/architecture.md 9.1 에서, payload 의 모양은
`agent/data/demo_seed/CONTRACT.md` 5장 D 에서, 구조 규칙은 같은 문서 8장에서 온다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest

from careersignal.agents.roadmap import (
    AGENT_VERSION,
    ALWAYS_LABEL,
    CONCURRENT_LABEL,
    HELD_LABEL,
    OUTPUT_TYPE,
    UNPLACED_LABEL,
    Capability,
    ChecklistConcept,
    ConceptKind,
    CyclicPrerequisites,
    DepthReference,
    FillKind,
    OpenAIStepNarrator,
    PrerequisiteEdge,
    RoadmapPlanner,
    RoadmapSource,
    StepBrief,
    StepNarrator,
    StubStepNarrator,
    build_payload,
    find_cycle,
    recompose,
    topological_order,
    unlinked_concepts,
)
from careersignal.contracts import RunContext, StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.scope import ScopeLevel

ANALYSIS_VERSION = "an_demo_backend"

# 선수 관계: RDB 기본기 → 트랜잭션 → 대용량. 학습 역량은 트랜잭션에 붙는다.
CAPABILITIES = (
    Capability(capability_id="cap_backend_high-volume", label="대용량 처리"),
    Capability(capability_id="cap_backend_tx", label="트랜잭션·동시성"),
    Capability(capability_id="cap_backend_rdb", label="RDB 설계"),
)

PREREQUISITES = (
    PrerequisiteEdge(src_capability_id="cap_backend_rdb", dst_capability_id="cap_backend_tx"),
    PrerequisiteEdge(
        src_capability_id="cap_backend_tx", dst_capability_id="cap_backend_high-volume"
    ),
)

CONCEPTS = (
    # 입력 순서를 일부러 선수 관계와 어긋나게 둔다. 정렬이 순서를 만드는지 본다.
    ChecklistConcept(
        concept_id="cc_backend_high-volume",
        title="대용량 처리 이해",
        kind=ConceptKind.PROJECT,
        capability_id="cap_backend_high-volume",
        is_deviation=True,
        dev_n=3,
    ),
    ChecklistConcept(
        concept_id="cc_backend_tx-integrity",
        title="트랜잭션·동시성 심화",
        kind=ConceptKind.PROJECT,
        capability_id="cap_backend_tx",
        is_deviation=True,
        dev_n=1,
    ),
    ChecklistConcept(
        concept_id="cc_backend_tx-theory",
        title="트랜잭션·DB 이론",
        kind=ConceptKind.STUDY,
        capability_id="cap_backend_tx",
    ),
    ChecklistConcept(
        concept_id="cc_backend_rdb-schema",
        title="RDB 설계·쿼리 기본기",
        kind=ConceptKind.PROJECT,
        capability_id="cap_backend_rdb",
    ),
)

DEPTHS = (
    DepthReference(
        capability_id="cap_backend_tx", expected_depth=DepthLevel.TRADEOFF, sample_size=9
    ),
)


def _source(**kw: Any) -> RoadmapSource:
    base: dict[str, Any] = {
        "job_role_id": "backend",
        "scope_level": ScopeLevel.CLUSTER,
        "scope_id": "cluster_fintech",
        "cluster_tag": "핀테크·금융",
        "concepts": CONCEPTS,
        "capabilities": CAPABILITIES,
        "prerequisites": PREREQUISITES,
        "depth_references": DEPTHS,
    }
    base.update(kw)
    return RoadmapSource(**base)


def _plan(**kw: Any):
    return build_payload(_source(**kw), StubStepNarrator(), analysis_version=ANALYSIS_VERSION)


def _context(**kw: Any) -> RunContext:
    base: dict[str, Any] = {
        "agent_run_id": "run_demo_backend_roadmap",
        "analysis_version": ANALYSIS_VERSION,
        "dataset_version": "ds_demo_v1",
        "job_role_id": "backend",
        "scope_level": ScopeLevel.CLUSTER,
        "scope_id": "cluster_fintech",
        "as_of_date": date(2026, 6, 1),
    }
    base.update(kw)
    return RunContext(**base)


class Store:
    """저장소 대역. `RoadmapRepository` 의 모양만 갖는다."""

    def __init__(self, source: RoadmapSource | None = None) -> None:
        self._source = source if source is not None else _source()
        self.items: list[dict[str, Any]] = []
        self.fills: list[dict[str, Any]] = []
        self.tracks: list[dict[str, Any]] = []
        self.outputs: list[dict[str, Any]] = []

    def checklist_concepts(
        self, analysis_version: str, scope_level: str, scope_id: str | None
    ) -> list[dict[str, Any]]:
        return [concept.model_dump() for concept in self._source.concepts]

    def capabilities(self, job_role_id: str) -> list[dict[str, Any]]:
        return [capability.model_dump() for capability in self._source.capabilities]

    def capability_prerequisites(
        self, job_role_id: str, knowledge_version: str | None
    ) -> list[dict[str, Any]]:
        return [edge.model_dump() for edge in self._source.prerequisites]

    def depth_references(
        self, analysis_version: str, scope_level: str, scope_id: str | None
    ) -> list[dict[str, Any]]:
        return [reference.model_dump() for reference in self._source.depth_references]

    def add_roadmap_items(self, rows: list[dict[str, Any]]) -> None:
        self.items.extend(rows)

    def add_roadmap_item_fills(self, rows: list[dict[str, Any]]) -> None:
        self.fills.extend(rows)

    def add_study_tracks(self, rows: list[dict[str, Any]]) -> None:
        self.tracks.extend(rows)

    def add_analysis_output(self, values: dict[str, Any]) -> None:
        self.outputs.append(values)


# ------------------------------------------------------- 17-1 선수 관계 정렬


def test_topological_order_puts_prerequisites_first() -> None:
    order = topological_order(
        ["c", "a", "b"], [("a", "b"), ("b", "c")]
    )
    assert order == ("a", "b", "c")


def test_topological_order_keeps_input_order_among_free_nodes() -> None:
    """진입 차수가 같으면 입력 순서를 지킨다. 식별자 사전순으로 흔들리지 않는다."""
    assert topological_order(["z", "a", "m"], []) == ("z", "a", "m")


def test_topological_order_ignores_edges_outside_the_node_set() -> None:
    """범위 밖 역량이 진입 차수를 남기면 정렬이 시작되지 못한다."""
    assert topological_order(["a"], [("outside", "a"), ("a", "a")]) == ("a",)


def test_steps_follow_prerequisite_order_not_input_order() -> None:
    steps = _plan().payload["project_steps"]
    assert [step["n"] for step in steps] == [1, 2, 3]
    assert [step["title"] for step in steps] == [
        "RDB 설계 다지기",
        "트랜잭션·동시성 다지기",
        "대용량 처리 다지기",
    ]


def test_fills_link_steps_to_checklist_concepts() -> None:
    """`fills[].item_id` 는 `checklist_concepts.concept_id` 다 (CONTRACT 5장 D)."""
    plan = _plan()
    first = plan.payload["project_steps"][0]
    assert first["fills"] == [
        {
            "item_id": "cc_backend_rdb-schema",
            "label": "RDB 설계·쿼리 기본기",
            "kind": FillKind.NORMAL,
        }
    ]

    linked = {(row["roadmap_item_id"], row["concept_id"]) for row in plan.roadmap_item_fills}
    assert ("ri_backend_cluster_fintech_2", "cc_backend_tx-integrity") in linked


def test_deviation_concepts_are_marked_dev() -> None:
    plan = _plan()
    kinds = {
        fill["item_id"]: fill["kind"]
        for step in plan.payload["project_steps"]
        for fill in step["fills"]
    }
    assert kinds["cc_backend_tx-integrity"] == FillKind.DEV
    assert kinds["cc_backend_rdb-schema"] == FillKind.NORMAL


def test_check_rows_point_at_the_step_that_fills_them() -> None:
    rows = {row["item_id"]: row["source_step"] for row in _plan().payload["check_rows"]}
    assert rows["cc_backend_rdb-schema"] == "STEP 01"
    assert rows["cc_backend_tx-integrity"] == "STEP 02"
    assert rows["cc_backend_high-volume"] == "STEP 03"
    assert rows["cc_backend_tx-theory"] == CONCURRENT_LABEL


def test_priority_puts_required_deviation_steps_first() -> None:
    steps = {step["title"]: step["priority"] for step in _plan().payload["project_steps"]}
    assert steps["트랜잭션·동시성 다지기"] == "vhigh"
    assert steps["RDB 설계 다지기"] == "high"


def test_payload_keeps_the_screen_contract_keys() -> None:
    payload = _plan().payload
    assert set(payload) == {
        "job",
        "scope",
        "project_steps",
        "study_tracks",
        "check_rows",
        "agent_version",
        "source",
    }
    assert payload["agent_version"] == AGENT_VERSION
    assert payload["scope"] == {
        "level": "cluster",
        "cluster_tag": "핀테크·금융",
        "posting_id": None,
    }


# --------------------------------------------------------- 17-2 깊이 기준


def test_study_track_carries_expected_depth_as_depth_reference() -> None:
    """`capability_depth_profiles.expected_depth` 를 그대로 옮긴다."""
    plan = _plan()
    assert len(plan.study_tracks) == 1
    track = plan.study_tracks[0]
    assert track["capability_id"] == "cap_backend_tx"
    assert track["depth_reference"] == DepthLevel.TRADEOFF
    assert track["track_id"] == "st_backend_cluster_fintech_tx"


def test_study_track_depth_sentence_follows_the_grade() -> None:
    track = _plan().payload["study_tracks"][0]
    assert "견주어" in track["depth"]
    assert track["phase"] == "STEP 02와 병행"


def test_study_track_without_depth_profile_leaves_reference_empty() -> None:
    """기대 깊이가 없으면 등급을 지어내지 않는다."""
    plan = _plan(depth_references=())
    assert plan.study_tracks[0]["depth_reference"] is None
    assert plan.payload["study_tracks"][0]["depth"] == ""


def test_detached_study_capability_becomes_a_separate_track() -> None:
    """프로젝트 단계가 없는 학습 역량은 별도 트랙이며 `상시` 로 표시한다."""
    concepts = (
        *CONCEPTS,
        ChecklistConcept(
            concept_id="cc_backend_cs-basics",
            title="CS 기본기",
            kind=ConceptKind.STUDY,
            capability_id="cap_backend_cs",
            required=False,
        ),
    )
    capabilities = (*CAPABILITIES, Capability(capability_id="cap_backend_cs", label="CS 기본기"))
    plan = _plan(concepts=concepts, capabilities=capabilities)

    track = next(t for t in plan.payload["study_tracks"] if t["title"] == "CS 기본기 학습")
    assert track["priority"] == "track"
    assert track["phase"].startswith(ALWAYS_LABEL)

    rows = {row["item_id"]: row["source_step"] for row in plan.payload["check_rows"]}
    assert rows["cc_backend_cs-basics"] == ALWAYS_LABEL


# -------------------------------------------------- 17-3 순환과 누락 검사


def test_find_cycle_returns_the_loop() -> None:
    cycle = find_cycle(["a", "b", "c"], [("a", "b"), ("b", "c"), ("c", "a")])
    assert set(cycle) == {"a", "b", "c"}


def test_topological_order_raises_on_a_cycle() -> None:
    with pytest.raises(CyclicPrerequisites) as caught:
        topological_order(["a", "b"], [("a", "b"), ("b", "a")])
    assert set(caught.value.cycle) == {"a", "b"}


def test_build_payload_fails_explicitly_on_a_cycle() -> None:
    """임의의 순서를 지어내지 않는다."""
    looped = (
        *PREREQUISITES,
        PrerequisiteEdge(
            src_capability_id="cap_backend_high-volume", dst_capability_id="cap_backend_rdb"
        ),
    )
    with pytest.raises(CyclicPrerequisites):
        _plan(prerequisites=looped)


def test_run_reports_a_cycle_as_explicit_failure_without_saving() -> None:
    looped = (
        *PREREQUISITES,
        PrerequisiteEdge(
            src_capability_id="cap_backend_high-volume", dst_capability_id="cap_backend_rdb"
        ),
    )
    store = Store(_source(prerequisites=looped))
    outcome = RoadmapPlanner(StubStepNarrator(), store, workers=1).run(_context())

    assert outcome.stop_reason == StopReason.EXPLICIT_FAILURE
    assert outcome.cycle
    assert outcome.gained_evidence is False
    assert store.items == []
    assert store.outputs == []


def test_unlinked_concepts_are_reported_not_dropped() -> None:
    """어떤 단계에도 붙지 못한 개념은 표시하고 체크 줄에는 남긴다."""
    orphan = ChecklistConcept(
        concept_id="cc_backend_collab-story",
        title="협업 문제 해결 서사",
        kind=ConceptKind.STORY,
    )
    plan = _plan(concepts=(*CONCEPTS, orphan))

    assert plan.unlinked_concept_ids == ("cc_backend_collab-story",)
    rows = {row["item_id"]: row["source_step"] for row in plan.payload["check_rows"]}
    assert rows["cc_backend_collab-story"] == UNPLACED_LABEL


def test_unlinked_concepts_keeps_input_order() -> None:
    assert unlinked_concepts(["c", "a", "b", "a"], ["b"]) == ("c", "a")


# ------------------------------------------------------------- 재조합 (9.1)


def test_recompose_pushes_held_steps_back_and_renumbers() -> None:
    payload = _plan().payload
    result = recompose(payload, {"cc_backend_rdb-schema": True})

    assert [step["title"] for step in result["project_steps"]] == [
        "트랜잭션·동시성 다지기",
        "대용량 처리 다지기",
        "RDB 설계 다지기",
    ]
    assert [step["n"] for step in result["project_steps"]] == [1, 2, 3]
    assert result["project_steps"][2]["phase"].startswith("STEP 03")
    # 보유 단계의 우선순위는 한 칸 내린다.
    assert result["project_steps"][2]["priority"] == "mid"


def test_recompose_updates_source_step_for_held_and_moved_concepts() -> None:
    payload = _plan().payload
    result = recompose(payload, {"cc_backend_rdb-schema": True})
    rows = {row["item_id"]: row["source_step"] for row in result["check_rows"]}

    assert rows["cc_backend_rdb-schema"] == HELD_LABEL
    assert rows["cc_backend_tx-integrity"] == "STEP 01"
    assert rows["cc_backend_high-volume"] == "STEP 02"


def test_recompose_moves_study_track_phase_with_its_step() -> None:
    payload = _plan().payload
    assert payload["study_tracks"][0]["phase"] == "STEP 02와 병행"
    result = recompose(payload, {"cc_backend_rdb-schema": True})
    assert result["study_tracks"][0]["phase"] == "STEP 01와 병행"


def test_recompose_ignores_false_checks() -> None:
    """꺼진 체크가 되살아나지 않는다."""
    payload = _plan().payload
    result = recompose(payload, {"cc_backend_rdb-schema": False})
    assert [step["n"] for step in result["project_steps"]] == [1, 2, 3]
    assert result["project_steps"][0]["title"] == "RDB 설계 다지기"


def test_recompose_is_pure() -> None:
    """입력 payload 를 고치지 않는다. 같은 입력에 같은 결과가 나온다."""
    payload = _plan().payload
    before = [step["n"] for step in payload["project_steps"]]
    first = recompose(payload, {"cc_backend_rdb-schema": True})
    second = recompose(payload, {"cc_backend_rdb-schema": True})

    assert [step["n"] for step in payload["project_steps"]] == before
    assert payload["check_rows"][3]["source_step"] == "STEP 01"
    assert first == second


def test_recompose_with_no_checks_keeps_the_stored_order() -> None:
    payload = _plan().payload
    assert recompose(payload, {}) == payload


def test_recompose_does_not_hold_a_track_without_fills() -> None:
    """채우는 것이 없는 트랙은 체크와 무관하게 자리를 지킨다."""
    payload = _plan().payload
    payload["study_tracks"].append(
        {
            "phase": "상시 · 별도 트랙",
            "priority": "track",
            "title": "알고리즘·코딩테스트",
            "depth": "지원 시점까지 꾸준히",
            "reason_title": "왜 따로 두나요?",
            "reason": "전형 단계이지 공고 요구가 아니다.",
            "fills": [],
        }
    )
    result = recompose(payload, {"cc_backend_tx-theory": True})
    assert result["study_tracks"][0]["title"] == "알고리즘·코딩테스트"
    assert result["study_tracks"][0]["priority"] == "track"


# ------------------------------------------------------------- 실행과 저장


def test_run_saves_four_outputs_and_reports_slots_filled() -> None:
    store = Store()
    outcome = RoadmapPlanner(StubStepNarrator(), store, workers=1).run(_context())

    assert outcome.stop_reason == StopReason.SLOTS_FILLED
    assert outcome.gained_evidence is True
    assert outcome.output_id == "out_backend_road_cluster_fintech"
    # `roadmap_item_fills` 는 단계가 채우는 것만 담는다. 학습 개념은 `study_tracks` 로
    # 이어지며 docs/erd.md 11.7 에 트랙용 충족 표가 없다.
    assert (outcome.created_items, outcome.created_fills, outcome.created_tracks) == (3, 3, 1)

    saved = store.outputs[0]
    assert saved["output_type"] == OUTPUT_TYPE
    assert saved["produced_by_agent"] == "roadmap"
    assert saved["payload"]["job"] == "backend"


def test_run_reads_inputs_through_the_repository_protocol() -> None:
    """에이전트는 앞 단계의 응답을 받지 않고 저장소를 조회한다."""
    store = Store()
    planner = RoadmapPlanner(StubStepNarrator(), store, workers=1)
    loaded = planner.load(_context())
    assert [concept.concept_id for concept in loaded.concepts] == [
        concept.concept_id for concept in CONCEPTS
    ]


def test_run_without_project_steps_reports_no_new_evidence() -> None:
    store = Store(_source(concepts=(), capabilities=(), prerequisites=(), depth_references=()))
    outcome = RoadmapPlanner(StubStepNarrator(), store, workers=1).run(_context())
    assert outcome.stop_reason == StopReason.NO_NEW_EVIDENCE
    assert store.outputs == []


# ------------------------------------------------------------- 구조 규칙 (8장)


def test_narrator_implementations_satisfy_the_port() -> None:
    assert isinstance(StubStepNarrator(), StepNarrator)
    assert isinstance(OpenAIStepNarrator(client=object()), StepNarrator)


def test_result_models_are_frozen_and_reject_unknown_keys() -> None:
    concept = CONCEPTS[0]
    with pytest.raises(Exception):
        concept.title = "다른 이름"  # type: ignore[misc]
    with pytest.raises(Exception):
        ChecklistConcept(
            concept_id="cc_x", title="x", kind=ConceptKind.PROJECT, unknown=1  # type: ignore[call-arg]
        )


def test_step_narration_falls_back_when_the_narrator_fails() -> None:
    """서술이 실패해도 순서와 충족 연결은 남는다."""

    class Broken:
        def narrate(self, brief: StepBrief):
            raise RuntimeError("모델 응답 없음")

    plan = build_payload(_source(), Broken(), analysis_version=ANALYSIS_VERSION, workers=1)
    assert len(plan.payload["project_steps"]) == 3
    assert plan.payload["project_steps"][0]["title"] == "RDB 설계"
    assert len(plan.errors) == 4


def test_module_does_not_import_psycopg() -> None:
    """에이전트는 저장소를 `Protocol` 로만 안다 (CONTRACT 8장)."""
    import ast
    from pathlib import Path

    root = Path(__file__).resolve().parents[2] / "src" / "careersignal" / "agents" / "roadmap"
    for path in root.glob("*.py"):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            names: list[str] = []
            if isinstance(node, ast.Import):
                names = [alias.name for alias in node.names]
            elif isinstance(node, ast.ImportFrom) and node.module:
                names = [node.module]
            assert not any(
                name.split(".")[0] in {"psycopg", "careersignal.repositories"}
                or name.startswith("careersignal.repositories")
                for name in names
            ), f"{path.name} 이 저장소를 직접 import 한다"


def test_pure_modules_have_no_provider_or_repository_imports() -> None:
    """`ordering.py` 와 `recompose.py` 는 값만 받는 순수 함수다."""
    import ast
    from pathlib import Path

    root = Path(__file__).resolve().parents[2] / "src" / "careersignal" / "agents" / "roadmap"
    forbidden = {"careersignal.providers", "careersignal.repositories", "openai", "psycopg"}
    for name in ("ordering.py", "recompose.py"):
        tree = ast.parse((root / name).read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module:
                assert node.module.split(".")[0] not in {"openai", "psycopg"}
                assert not any(node.module.startswith(bad) for bad in forbidden)
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    assert alias.name.split(".")[0] not in {"openai", "psycopg"}
