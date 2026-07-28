"""표현과 차원의 할당 검증.

규칙은 docs/erd.md 7.13, docs/statistics-model.md 3.1·3.5,
docs/adr/0005-mention-assignment-separation.md 에서 온다. 생성 모델과 임베딩을
대역으로 대체하고 방법 사슬, 저장 규칙, 증분과 재할당, 깊이 판정만 검사한다.
외부 호출은 하지 않는다.
"""

from __future__ import annotations

import hashlib
from datetime import date
from typing import Any

import pytest

from careersignal.agents.statistics.assigner import StubDimensionAssigner
from careersignal.contracts import Budget, RunContext, StopReason
from careersignal.domain.depth import DepthLevel
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.providers.models import EMBEDDING
from careersignal.repositories.assignment import AssignmentRepository
from careersignal.taxonomy.assignment import (
    ALIAS_EXACT,
    METHOD_CONFIDENCE,
    METHODS,
    MODEL_JUDGMENT,
    NO_DIMENSIONS,
    NOT_ASSIGNED,
    PENDING_VERIFICATION,
    VECTOR_MATCH,
    AssignmentOutcome,
    RequirementAssignment,
    assignment_identifier,
)
from careersignal.taxonomy.depth import DEFAULT_LEVEL, judge_depth
from careersignal.taxonomy.requiredness import Requiredness

TAXONOMY_ID = "tax_backend"
TAXONOMY_VERSION_ID = "tx_backend_v1"
NEXT_VERSION_ID = "tx_backend_v2"

ASSIGNMENT_COLUMNS = {
    "assignment_id",
    "mention_id",
    "taxonomy_version_id",
    "dimension_id",
    "normalized_label",
    "requiredness",
    "depth_level",
    "assignment_confidence",
    "assignment_method",
    "verifier_status",
}
"""docs/erd.md 7.13 의 컬럼. `created_at` 은 기본값이 채운다."""


def _dimension(
    dimension_id: str = "dim_queue",
    label: str = "메시지 큐",
    kind: str = "technology",
    canonical: str | None = None,
) -> dict[str, Any]:
    return {
        "dimension_id": dimension_id,
        "dimension_kind": kind,
        "internal_canonical_label": canonical or label,
        "display_label": label,
        "definition": "메시지 브로커로 작업을 비동기로 전달한다",
    }


def _alias(alias_text: str, dimension_id: str = "dim_queue") -> dict[str, Any]:
    return {
        "alias_id": f"alias_{alias_text}",
        "dimension_id": dimension_id,
        "alias_text": alias_text,
        "alias_source": "discovered",
    }


def _mention(
    mention_id: str,
    raw_expression: str,
    stated_requiredness: str = "자격요건",
    posting_version_id: str = "pv_1",
) -> dict[str, Any]:
    return {
        "mention_id": mention_id,
        "raw_expression": raw_expression,
        "posting_version_id": posting_version_id,
        "section": stated_requiredness,
        "stated_requiredness": stated_requiredness,
    }


class FakeAssignments:
    """할당 저장소의 대역. SQL 을 실행하지 않는다.

    `UNIQUE (mention_id, taxonomy_version_id)` 를 그대로 흉내 낸다. 실행이 같은
    mention 을 같은 버전에 두 번 넣으려 하면 여기서 걸린다.
    """

    def __init__(
        self,
        mentions: list[dict[str, Any]] | None = None,
        dimensions: list[dict[str, Any]] | None = None,
        aliases: list[dict[str, Any]] | None = None,
        active: dict[str, Any] | None = None,
    ) -> None:
        self._mentions = mentions or []
        self._dimensions = dimensions or []
        self._aliases = aliases or []
        self._active = (
            active
            if active is not None
            else {
                "taxonomy_version_id": TAXONOMY_VERSION_ID,
                "taxonomy_id": TAXONOMY_ID,
                "version_number": 1,
                "taxonomy_policy_version": "tp_v1",
            }
        )
        self.rows: list[dict[str, Any]] = []
        self.raced: set[str] = set()
        """이 실행의 조회 밖에서 다른 실행이 할당한 표현.

        조회가 거르지 못하는 자리이며 파이썬의 건너뛰기가 잡는다.
        """

    # ------------------------------------------------------------ 조회
    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return dict(self._active) if self._active else None

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._dimensions)

    def active_aliases(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._aliases)

    def mentions_to_assign(
        self,
        dataset_version: str,
        job_role_id: str,
        taxonomy_version_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """이 버전에 이미 할당이 있는 표현을 뺀 뒤 자른다.

        차례가 `_MENTIONS_TO_ASSIGN` 과 같다. 자르고 나서 빼면 `--limit` 이 이미
        할당된 표현으로 채워져 재실행이 앞으로 나아가지 못한다.
        """
        done = self._stored(taxonomy_version_id)
        rows = [row for row in self._mentions if row["mention_id"] not in done]
        return list(rows if limit is None else rows[:limit])

    def assigned_mentions(
        self, dataset_version: str, taxonomy_version_id: str
    ) -> set[str]:
        return self._stored(taxonomy_version_id) | self.raced

    def _stored(self, taxonomy_version_id: str) -> set[str]:
        return {
            row["mention_id"]
            for row in self.rows
            if row["taxonomy_version_id"] == taxonomy_version_id
        }

    # ------------------------------------------------------------ 쓰기
    def add_assignment(self, values: dict[str, Any]) -> None:
        key = (values["mention_id"], values["taxonomy_version_id"])
        if any(
            (row["mention_id"], row["taxonomy_version_id"]) == key for row in self.rows
        ):
            raise ValueError("UNIQUE (mention_id, taxonomy_version_id)")
        self.rows.append(dict(values))

    # ------------------------------------------------------------ 대역 조작
    def publish(self, taxonomy_version_id: str, version_number: int) -> None:
        """새 분류체계 버전을 활성으로 바꾼다. 이전 할당 행은 그대로 둔다."""
        self._active = {
            "taxonomy_version_id": taxonomy_version_id,
            "taxonomy_id": TAXONOMY_ID,
            "version_number": version_number,
            "taxonomy_policy_version": "tp_v1",
        }

    def rows_of(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return [
            row
            for row in self.rows
            if row["taxonomy_version_id"] == taxonomy_version_id
        ]


class FakeEmbeddings:
    """임베딩의 대역. 외부를 호출하지 않는다.

    같은 묶음 이름을 받은 문자열은 같은 벡터를 받아 유사도가 1 이고, 다른 묶음은
    작은 양수만 겹친다. 벡터에 뜻은 없지만 문턱값 판정을 검사하는 데는 뜻이 필요
    없다.

    `calls` 는 호출마다 받은 문자열 묶음이다. 별칭 일치가 임베딩보다 먼저 쓰이는지
    확인하는 데 쓴다.
    """

    model = "fake-embedding"

    def __init__(
        self,
        groups: dict[str, str] | None = None,
        dimensions: int = EMBEDDING.dimensions,
    ) -> None:
        self._groups = groups or {}
        self._dimensions = dimensions
        self.calls: list[list[str]] = []

    def embed(self, texts: list[str]) -> list[list[float]]:
        self.calls.append(list(texts))
        return [self._vector(text) for text in texts]

    def _vector(self, text: str) -> list[float]:
        group = self._groups.get(text, text)
        digest = hashlib.sha256(group.encode("utf-8")).digest()
        axis = 1 + int.from_bytes(digest[:4], "big") % (self._dimensions - 1)
        vector = [0.0] * self._dimensions
        vector[0] = 0.5
        vector[axis] = 1.0
        return vector


class Exploding:
    """예외를 던지는 배정 구현. 구현 결함과 배정 없음을 가른다."""

    def assign(self, expression: str, options: Any = (), section: Any = None) -> Any:
        raise RuntimeError("배정 응답을 읽지 못했다")


class ExplodingEmbeddings:
    """예외를 던지는 임베딩 구현."""

    model = "exploding-embedding"

    def embed(self, texts: list[str]) -> list[list[float]]:
        raise RuntimeError("임베딩 응답을 읽지 못했다")


def _context(
    max_tool_calls: int = 40, taxonomy_version_id: str | None = None
) -> RunContext:
    return RunContext(
        agent_run_id="run_assignment_test",
        analysis_version="an_assignment_test",
        dataset_version="ds_test",
        taxonomy_version_id=taxonomy_version_id,
        job_role_id="backend",
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 28),
        budget=Budget(max_tool_calls=max_tool_calls),
    )


# ============================================================ 깊이 등급
@pytest.mark.parametrize(
    "expression",
    ["메시지 큐 개념 이해", "HTTP 동작 원리에 대한 이해", "자료구조 기본 지식"],
)
def test_a_conceptual_expression_is_foundation(expression: str) -> None:
    """개념·용어·기본 작동 원리를 이해한다. docs/knowledge-schema.md 8.2 다."""
    assert judge_depth(expression) is DepthLevel.FOUNDATION


@pytest.mark.parametrize(
    "expression",
    ["Kafka 운영 경험", "Spring Boot 기반 API 개발", "Redis 를 활용한 캐시 구현"],
)
def test_an_applied_expression_is_application(expression: str) -> None:
    """코드·도구·프로젝트에 적용한다."""
    assert judge_depth(expression) is DepthLevel.APPLICATION


@pytest.mark.parametrize(
    "expression",
    [
        "대용량 트래픽 처리 경험",
        "동시성 이슈 해결 경험",
        "장애 대응 경험",
        "성능 개선과 병목 분석",
    ],
)
def test_a_design_or_incident_expression_is_tradeoff(expression: str) -> None:
    """설계 선택, 트레이드오프, 장애·운영 상황을 설명한다.

    docs/statistics-model.md 5.7 이 심화 신호의 예로 든 대용량·동시성·장애 대응이
    여기에 들어간다.
    """
    assert judge_depth(expression) is DepthLevel.TRADEOFF


@pytest.mark.parametrize(
    "expression",
    [
        "실시간 최적 배차를 위한 시스템 아키텍처 설계 및 개선",
        "요구사항 분석을 기반으로 시스템 구조 및 아키텍처를 설계",
        "기존에 구축된 시스템을 리뷰하고 좀 더 스케일하도록 재설계",
    ],
)
def test_the_rubric_scale_and_structure_signals_are_tradeoff(expression: str) -> None:
    """docs/eval/rubrics_v1.json 의 `rb_depth_level_grade` 가 적은 신호다.

    규모 신호는 대용량·대규모·실시간·고가용성이고, 시스템 구조의 선택이나 재설계도
    tradeoff 다. 표현은 docs/eval/backend_dimensions_v1.json 의 기대 항목에서 가져왔다.
    """
    assert judge_depth(expression) is DepthLevel.TRADEOFF


def test_a_topic_word_alone_does_not_raise_the_grade() -> None:
    """분산 처리는 주제이지 깊이 신호가 아니다.

    docs/eval/rubrics_v1.json 의 `rb_depth_level_grade` 는 규모·동시성·장애·구조 선택만
    tradeoff 신호로 두고, 신호 없이 통념으로 등급을 올리는 것을 `fail_when` 이 막는다.
    이 표현의 기대 등급은 docs/eval/backend_dimensions_v1.json 에서 `foundation` 이다.
    """
    assert (
        judge_depth("분산 처리 시스템 또는 마이크로서비스 아키텍처에 대한 이해도가 높으신 분")
        is DepthLevel.FOUNDATION
    )


def test_the_deepest_signal_wins() -> None:
    """docs/metric-spec.md 3.3 의 대표 등급 규칙과 순서가 같다."""
    assert judge_depth("대용량 트래픽 처리 경험과 기본 개념 이해") is DepthLevel.TRADEOFF


@pytest.mark.parametrize("expression", ["Java", "", "   ", None])
def test_an_expression_without_a_signal_takes_the_default(expression: str) -> None:
    """등급을 반드시 하나 골라야 하므로 가장 적게 주장하는 값을 고른다."""
    assert judge_depth(expression) is DEFAULT_LEVEL is DepthLevel.FOUNDATION


# ============================================================ 식별자
def test_the_same_mention_and_version_give_the_same_assignment() -> None:
    assert assignment_identifier("mention_1", TAXONOMY_VERSION_ID) == (
        assignment_identifier("mention_1", TAXONOMY_VERSION_ID)
    )


def test_a_new_version_gives_a_new_assignment() -> None:
    """이전 버전의 행이 남아야 하므로 식별자가 갈린다."""
    assert assignment_identifier("mention_1", TAXONOMY_VERSION_ID) != (
        assignment_identifier("mention_1", NEXT_VERSION_ID)
    )


def test_the_assignment_identifier_carries_its_prefix() -> None:
    assert assignment_identifier("mention_1", TAXONOMY_VERSION_ID).startswith("assign_")


# ============================================================ 냉시작
def test_no_dimension_means_nothing_to_assign() -> None:
    """차원이 하나도 없는 상태는 실패가 아니다."""
    store = FakeAssignments([_mention("mention_1", "Kafka 운영 경험")])
    assigner = StubDimensionAssigner()
    embeddings = FakeEmbeddings()

    outcome = RequirementAssignment(assigner, store, embeddings).run(_context())

    assert outcome.vocabulary_size == 0
    assert outcome.assigned_mentions == 0
    assert outcome.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert outcome.unassigned == (("mention_1", NO_DIMENSIONS),)
    assert store.rows == []


def test_a_cold_start_calls_neither_the_model_nor_the_embedding() -> None:
    """붙을 곳이 없는 실행이 비용을 쓰지 않는다."""
    store = FakeAssignments([_mention("mention_1", "Kafka 운영 경험")])
    assigner = StubDimensionAssigner()
    embeddings = FakeEmbeddings()

    RequirementAssignment(assigner, store, embeddings).run(_context())

    assert assigner.calls == []
    assert embeddings.calls == []


def test_no_mention_ends_with_an_exhausted_frontier() -> None:
    store = FakeAssignments([], [_dimension()])

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED


# ============================================================ 방법 사슬
def test_an_alias_match_comes_before_the_vector_and_the_model() -> None:
    """값싸고 흔들리지 않는 방법을 먼저 쓴다."""
    store = FakeAssignments(
        [_mention("mention_1", "메시지 큐")],
        [_dimension()],
        [_alias("Message Queue")],
    )
    assigner = StubDimensionAssigner()
    embeddings = FakeEmbeddings()

    outcome = RequirementAssignment(assigner, store, embeddings).run(_context())

    assert outcome.count_of(ALIAS_EXACT) == 1
    assert store.rows[0]["assignment_method"] == ALIAS_EXACT
    assert embeddings.calls == []
    assert assigner.calls == []


def test_an_alias_text_matches_before_the_vector_too() -> None:
    store = FakeAssignments(
        [_mention("mention_1", "message queue")],
        [_dimension()],
        [_alias("Message Queue")],
    )
    embeddings = FakeEmbeddings()

    outcome = RequirementAssignment(
        StubDimensionAssigner(), store, embeddings
    ).run(_context())

    assert outcome.count_of(ALIAS_EXACT) == 1
    assert embeddings.calls == []


def test_a_near_vector_assigns_before_the_model() -> None:
    """표기가 달라도 의미가 가까우면 모델을 부르지 않는다."""
    store = FakeAssignments(
        [_mention("mention_1", "카프카 운영 경험")], [_dimension()]
    )
    assigner = StubDimensionAssigner()
    embeddings = FakeEmbeddings({"카프카 운영 경험": "queue", "메시지 큐": "queue"})

    outcome = RequirementAssignment(assigner, store, embeddings).run(_context())

    assert outcome.count_of(VECTOR_MATCH) == 1
    assert store.rows[0]["assignment_method"] == VECTOR_MATCH
    assert outcome.embedded_expressions == 1
    assert assigner.calls == []


def test_a_far_vector_falls_through_to_the_model() -> None:
    store = FakeAssignments(
        [_mention("mention_1", "카프카 운영 경험")], [_dimension()]
    )
    assigner = StubDimensionAssigner("dim_queue")
    embeddings = FakeEmbeddings()

    outcome = RequirementAssignment(assigner, store, embeddings).run(_context())

    assert outcome.count_of(MODEL_JUDGMENT) == 1
    assert store.rows[0]["assignment_method"] == MODEL_JUDGMENT
    assert outcome.judged == 1


def test_the_model_runs_without_an_embedding_client() -> None:
    """임베딩을 주지 않으면 벡터 방법만 빠진다."""
    store = FakeAssignments(
        [_mention("mention_1", "메시지 큐 운영 경험")], [_dimension()]
    )

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert outcome.count_of(MODEL_JUDGMENT) == 1
    assert outcome.embedded_expressions == 0


def test_an_expression_nobody_matches_stays_unassigned() -> None:
    """가까운 차원에 억지로 붙이지 않는다. 이 표현은 차원 후보로 남는다."""
    store = FakeAssignments(
        [_mention("mention_1", "쿠버네티스 운영")], [_dimension()]
    )
    embeddings = FakeEmbeddings()

    outcome = RequirementAssignment(
        StubDimensionAssigner(), store, embeddings
    ).run(_context())

    assert outcome.assigned_mentions == 0
    assert outcome.unassigned == (("mention_1", NOT_ASSIGNED),)
    assert store.rows == []


# ============================================================ 신뢰도와 방법
def test_the_method_values_match_the_check() -> None:
    assert set(METHODS) == {
        "alias_exact",
        "vector_match",
        "model_judgment",
        "manual",
    }


def test_every_method_carries_its_own_confidence() -> None:
    """방법마다 근거의 강도가 다르므로 값을 가른다."""
    assert set(METHOD_CONFIDENCE) == set(METHODS)
    assert all(0.0 <= value <= 1.0 for value in METHOD_CONFIDENCE.values())
    assert (
        METHOD_CONFIDENCE["alias_exact"]
        > METHOD_CONFIDENCE["vector_match"]
        > METHOD_CONFIDENCE["model_judgment"]
    )


@pytest.mark.parametrize("method", ["alias_exact", "vector_match", "model_judgment"])
def test_the_stored_confidence_comes_from_the_method(method: str) -> None:
    groups = (
        {"카프카 운영 경험": "queue", "메시지 큐": "queue"}
        if method == VECTOR_MATCH
        else {}
    )
    store = FakeAssignments(
        [_mention("mention_1", "카프카 운영 경험")],
        [_dimension()],
        [_alias("카프카 운영 경험")] if method == ALIAS_EXACT else [],
    )

    RequirementAssignment(
        StubDimensionAssigner("dim_queue"), store, FakeEmbeddings(groups)
    ).run(_context())

    assert store.rows[0]["assignment_method"] == method
    assert store.rows[0]["assignment_confidence"] == METHOD_CONFIDENCE[method]


# ============================================================ 저장 규칙
def test_the_stored_row_fills_every_column() -> None:
    store = FakeAssignments(
        [_mention("mention_1", "메시지 큐", "우대사항")],
        [_dimension(canonical="message_queue")],
    )

    RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    row = store.rows[0]
    assert set(row) == ASSIGNMENT_COLUMNS
    assert row["taxonomy_version_id"] == TAXONOMY_VERSION_ID
    assert row["dimension_id"] == "dim_queue"
    assert row["normalized_label"] == "message_queue"
    assert row["requiredness"] == Requiredness.PREFERRED
    assert row["depth_level"] == DepthLevel.FOUNDATION
    assert row["verifier_status"] == PENDING_VERIFICATION


def test_the_requiredness_comes_from_the_stated_label() -> None:
    """원문은 mention 에 남고 해석 결과는 할당에 담긴다."""
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐", "자격요건"),
            _mention("mention_2", "메시지 큐", "주요업무", "pv_2"),
        ],
        [_dimension()],
    )

    RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert [row["requiredness"] for row in store.rows] == ["required", "responsibility"]


def test_the_depth_level_comes_from_the_expression() -> None:
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐 개념 이해"),
            _mention("mention_2", "메시지 큐 대용량 트래픽 운영 경험", "자격요건", "pv_2"),
        ],
        [_dimension()],
        [_alias("메시지 큐 개념 이해"), _alias("메시지 큐 대용량 트래픽 운영 경험")],
    )

    RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert [row["depth_level"] for row in store.rows] == ["foundation", "tradeoff"]


# ============================================================ 증분
def test_a_mention_is_not_assigned_twice_in_one_version() -> None:
    """한 mention 은 분류체계 버전당 하나의 차원에만 할당된다.

    조회가 이미 할당된 표현을 빼므로 두 번째 실행은 건너뛸 것도 받지 않는다.
    """
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], [_dimension()])
    assignment = RequirementAssignment(StubDimensionAssigner(), store)

    first = assignment.run(_context())
    second = assignment.run(_context())

    assert first.assigned_mentions == 1
    assert second.assigned_mentions == 0
    assert second.skipped_mentions == 0
    assert len(store.rows) == 1


def test_a_rerun_does_not_call_the_model_again() -> None:
    store = FakeAssignments(
        [_mention("mention_1", "메시지 큐 운영 경험")], [_dimension()]
    )
    assigner = StubDimensionAssigner()
    assignment = RequirementAssignment(assigner, store)

    assignment.run(_context())
    assignment.run(_context())

    assert len(assigner.calls) == 1


def test_the_limit_splits_the_work_across_runs() -> None:
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐"),
            _mention("mention_2", "메시지 큐", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )
    assignment = RequirementAssignment(StubDimensionAssigner(), store)

    assignment.run(_context(), limit=1)
    assignment.run(_context())

    assert len(store.rows) == 2


def test_the_same_limit_twice_finishes_the_work() -> None:
    """`--limit` 을 두 번 줘도 두 번째가 같은 앞자리를 다시 집으면 안 된다."""
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐"),
            _mention("mention_2", "메시지 큐", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )
    assignment = RequirementAssignment(StubDimensionAssigner(), store)

    assignment.run(_context(), limit=1)
    second = assignment.run(_context(), limit=1)

    assert second.assigned_mentions == 1
    assert second.skipped_mentions == 0
    assert {row["mention_id"] for row in store.rows} == {"mention_1", "mention_2"}


def test_a_mention_assigned_by_an_overlapping_run_is_still_skipped() -> None:
    """조회가 거른 뒤에도 파이썬이 다시 확인한다. 두 실행이 겹칠 때의 방어선이다."""
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], [_dimension()])
    store.raced = {"mention_1"}

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert outcome.skipped_mentions == 1
    assert outcome.assigned_mentions == 0
    assert store.rows == []


# ============================================================ 재할당
def test_a_new_version_reassigns_every_mention() -> None:
    """새 분류체계 버전을 발행하면 데이터셋의 mention 전체를 다시 할당한다."""
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐"),
            _mention("mention_2", "메시지 큐", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )
    assignment = RequirementAssignment(StubDimensionAssigner(), store)
    assignment.run(_context())

    store.publish(NEXT_VERSION_ID, 2)
    outcome = assignment.reassign(_context())

    assert outcome.full_reassignment is True
    assert outcome.taxonomy_version_id == NEXT_VERSION_ID
    assert outcome.assigned_mentions == 2
    assert outcome.skipped_mentions == 0


def test_the_previous_version_rows_stay() -> None:
    """분류체계 변경 전후의 통계를 각각 재현할 수 있어야 한다."""
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], [_dimension()])
    assignment = RequirementAssignment(StubDimensionAssigner(), store)
    assignment.run(_context())

    store.publish(NEXT_VERSION_ID, 2)
    assignment.reassign(_context())

    assert len(store.rows_of(TAXONOMY_VERSION_ID)) == 1
    assert len(store.rows_of(NEXT_VERSION_ID)) == 1
    assert len({row["assignment_id"] for row in store.rows}) == 2


def test_a_repeated_reassignment_stays_inside_the_unique_constraint() -> None:
    """중간에 끊긴 재할당을 다시 돌려도 안전하다."""
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], [_dimension()])
    assignment = RequirementAssignment(StubDimensionAssigner(), store)

    assignment.reassign(_context())
    outcome = assignment.reassign(_context())

    assert outcome.skipped_mentions == 0
    assert outcome.errors == ()
    assert len(store.rows) == 1


def test_a_new_version_can_assign_a_mention_to_another_dimension() -> None:
    """버전이 다르면 같은 표현이 다른 차원으로 갈 수 있다."""
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], [_dimension()])
    assignment = RequirementAssignment(StubDimensionAssigner(), store)
    assignment.run(_context())

    store._dimensions = [_dimension("dim_broker", "메시지 큐")]
    store.publish(NEXT_VERSION_ID, 2)
    assignment.reassign(_context())

    assert store.rows_of(TAXONOMY_VERSION_ID)[0]["dimension_id"] == "dim_queue"
    assert store.rows_of(NEXT_VERSION_ID)[0]["dimension_id"] == "dim_broker"


# ============================================================ 실행 전제
def test_no_active_taxonomy_stops_the_run() -> None:
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], active={})

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.assigned_mentions == 0


def test_a_version_mismatch_stops_the_run() -> None:
    """봉투가 고정한 버전과 저장소의 활성 버전이 어긋나면 진행하지 않는다."""
    store = FakeAssignments([_mention("mention_1", "메시지 큐")], [_dimension()])

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(
        _context(taxonomy_version_id=NEXT_VERSION_ID)
    )

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert store.rows == []


# ============================================================ 실패와 예산
def test_a_broken_assigner_is_not_read_as_no_evidence() -> None:
    store = FakeAssignments(
        [_mention("mention_1", "메시지 큐 운영 경험")], [_dimension()]
    )

    outcome = RequirementAssignment(Exploding(), store).run(_context())

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert len(outcome.errors) == 1


def test_a_broken_embedding_only_empties_the_vector_method() -> None:
    """벡터 결과가 비는 것과 실행이 실패하는 것은 다른 상태다."""
    store = FakeAssignments(
        [_mention("mention_1", "메시지 큐 운영 경험")], [_dimension()]
    )

    outcome = RequirementAssignment(
        StubDimensionAssigner(), store, ExplodingEmbeddings()
    ).run(_context())

    assert outcome.count_of(MODEL_JUDGMENT) == 1
    assert outcome.errors[0][0] == VECTOR_MATCH


def test_an_exhausted_budget_leaves_the_rest_for_the_next_run() -> None:
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐 운영 경험"),
            _mention("mention_2", "메시지 큐 구축 경험", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(
        _context(max_tool_calls=1)
    )

    assert outcome.stop_reason is StopReason.BUDGET_EXHAUSTED
    assert outcome.judged == 1
    assert len(store.rows) == 1


# ============================================================ 결과 모델과 권한
def test_the_outcome_is_frozen() -> None:
    outcome = AssignmentOutcome(
        agent_run_id="run_1", stop_reason=StopReason.NO_NEW_EVIDENCE
    )

    with pytest.raises(Exception):
        outcome.assigned_mentions = 1  # type: ignore[misc]


def test_the_visited_mentions_split_into_assigned_and_unassigned() -> None:
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐"),
            _mention("mention_2", "쿠버네티스 운영", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )

    outcome = RequirementAssignment(StubDimensionAssigner(), store).run(_context())

    assert outcome.visited_mentions == 2
    assert outcome.assigned_mentions + len(outcome.unassigned) == 2


def test_the_assignment_table_is_inside_the_write_scope() -> None:
    """근거는 docs/permission-matrix.md 3장이다."""
    assert AssignmentRepository.component is Component.AGENT_STATS
    assert can_write(Component.AGENT_STATS, "posting_requirement_assignments")


# ============================================================ 나눠 도는 재할당
def test_a_reassignment_can_be_cut_into_runs() -> None:
    """전량 재할당을 건수로 나눠 돌 수 있어야 한다.

    `limit` 은 한 번에 처리할 건수를 자를 뿐이며 재할당의 완료 조건이 아니다.
    """
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐"),
            _mention("mention_2", "메시지 큐", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )
    assignment = RequirementAssignment(StubDimensionAssigner(), store)
    assignment.run(_context())
    store.publish(NEXT_VERSION_ID, 2)

    first = assignment.reassign(_context(), limit=1)
    second = assignment.reassign(_context(), limit=1)

    assert first.full_reassignment is True
    assert second.full_reassignment is True
    assert first.assigned_mentions == 1
    assert second.assigned_mentions == 1
    assert {
        row["mention_id"] for row in store.rows
        if row["taxonomy_version_id"] == NEXT_VERSION_ID
    } == {"mention_1", "mention_2"}


def test_a_reassignment_without_a_limit_still_takes_everything() -> None:
    """기본값은 전량이다. 인자를 주지 않으면 동작이 바뀌지 않는다."""
    store = FakeAssignments(
        [
            _mention("mention_1", "메시지 큐"),
            _mention("mention_2", "메시지 큐", "자격요건", "pv_2"),
        ],
        [_dimension()],
    )

    outcome = RequirementAssignment(StubDimensionAssigner(), store).reassign(_context())

    assert outcome.assigned_mentions == 2


# ============================================================ 조회 문자열
class RecordingUnit:
    """저장소가 실제로 실행하는 SQL 을 붙잡는 대역. 데이터베이스에 붙지 않는다.

    대역 저장소로는 이 결함을 잡지 못한다. `--limit` 이 자르는 차례는 파이썬이
    아니라 SQL 이 정하고, 단위 시험은 데이터베이스에 붙을 수 없다. 그래서 저장소가
    만들어 낸 조회 문자열을 직접 본다.
    """

    def __init__(self, component: Component) -> None:
        self.component = component
        self.sql = ""
        self.params: dict[str, Any] = {}

    def fetch_all(
        self, sql: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        self.sql = sql
        self.params = dict(params or {})
        return []


def _recorded_assign_sql(limit: int | None = 200) -> RecordingUnit:
    unit = RecordingUnit(Component.AGENT_STATS)
    AssignmentRepository(unit).mentions_to_assign(
        "ds_2026_01", "backend", TAXONOMY_VERSION_ID, limit
    )
    return unit


def test_the_assigned_mentions_leave_before_the_limit_cuts() -> None:
    """자르고 나서 걸러 내면 같은 `--limit` 을 다시 줘도 아무것도 진행하지 못한다."""
    unit = _recorded_assign_sql()

    assert "NOT EXISTS" in unit.sql
    assert unit.sql.index("NOT EXISTS") < unit.sql.index("LIMIT")


def test_the_assignment_exclusion_matches_the_assigned_mentions_rule() -> None:
    """제외 기준이 `assigned_mentions()` 와 같다. 분류체계 버전 안에서만 성립한다."""
    unit = _recorded_assign_sql()

    assert "FROM posting_requirement_assignments a" in unit.sql
    assert "a.mention_id = m.mention_id" in unit.sql
    assert "a.taxonomy_version_id = %(taxonomy_version_id)s" in unit.sql
    assert unit.params["taxonomy_version_id"] == TAXONOMY_VERSION_ID


def test_the_assignment_order_stays_deterministic() -> None:
    """정렬을 바꾸면 나눠 돌린 실행의 결과를 대조할 수 없다."""
    sql = _recorded_assign_sql(limit=None).sql

    assert sql.rstrip().endswith("ORDER BY m.mention_id")
