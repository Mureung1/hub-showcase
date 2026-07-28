"""평가 세트 적재 검증.

세 표의 컬럼과 제약은 docs/erd.md 13장, 파일 구조는 docs/eval/README.md 에서 온다.
저장소 없이 대역으로 검증한다.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from careersignal.evaluation import (
    ALREADY_LOADED,
    EvaluationSetError,
    EvaluationSetFile,
    EvaluationSetLoader,
    RubricCatalog,
)

EVAL_DIR = Path(__file__).resolve().parents[3] / "docs" / "eval"
EVAL_FILE = EVAL_DIR / "backend_v1.json"
DIMENSION_FILE = EVAL_DIR / "backend_dimensions_v1.json"
RUBRIC_FILE = EVAL_DIR / "rubrics_v1.json"
LOADED_AT = datetime(2026, 7, 28, 9, 0, 0)

requires_eval_file = pytest.mark.skipif(
    not EVAL_FILE.exists(), reason="docs/eval/backend_v1.json 이 없다"
)

requires_dimension_file = pytest.mark.skipif(
    not (DIMENSION_FILE.exists() and RUBRIC_FILE.exists()),
    reason="docs/eval/backend_dimensions_v1.json 또는 rubrics_v1.json 이 없다",
)


class FakeEvaluation:
    """평가 세트 저장소의 대역."""

    def __init__(self, postings: dict[tuple[str, str], str] | None = None) -> None:
        self.sets: dict[str, dict[str, Any]] = {}
        self.cases: dict[str, dict[str, Any]] = {}
        self.items: dict[str, dict[str, Any]] = {}
        self.postings = postings or {}

    def find_set(self, eval_set_id: str) -> dict[str, Any] | None:
        return self.sets.get(eval_set_id)

    def is_loaded(self, eval_set_id: str) -> bool:
        return eval_set_id in self.sets

    def add_set(self, values: dict[str, Any]) -> None:
        self.sets[values["eval_set_id"]] = values

    def add_cases(self, rows: list[dict[str, Any]]) -> None:
        for row in rows:
            self.cases[row["case_id"]] = row

    def add_expected_items(self, rows: list[dict[str, Any]]) -> None:
        for row in rows:
            self.items[row["expected_id"]] = row

    def find_posting_id(self, source_id: str, job_role_id: str) -> str | None:
        return self.postings.get((source_id, job_role_id))


def _item(**kw: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "expected_field": "requirement_mention",
        "expected_value": {
            "raw_expression": "대규모 트랜잭션 처리",
            "requiredness": "required",
        },
        "rubric": "raw_expression 이 원문의 부분 문자열과 일치하면 정답으로 센다",
    }
    return base | kw


def _case(**kw: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "case_type": "mention_extraction",
        "source_id": "src_one",
        "content_file": "one.txt",
        "expected_entry_label": "experienced",
        "expected_job_role_id": "backend",
        "expected_items": [_item()],
    }
    return base | kw


def _document(**kw: Any) -> EvaluationSetFile:
    base: dict[str, Any] = {
        "job_role_id": "backend",
        "source_file": "docs/eval/backend_test.json",
        "cases": [_case()],
    }
    return EvaluationSetFile.model_validate(base | kw)


# ============================================================ 적재
def test_a_file_fills_three_tables() -> None:
    store = FakeEvaluation()
    document = _document(
        cases=[
            _case(
                source_id="src_one",
                expected_items=[
                    _item(),
                    _item(
                        expected_value={
                            "raw_expression": "분산 캐시 운영",
                            "requiredness": "preferred",
                        },
                        rubric=None,
                    ),
                ],
            ),
            _case(source_id="src_two", expected_items=[_item()]),
        ]
    )

    outcome = EvaluationSetLoader(store).load_document(document, loaded_at=LOADED_AT)

    assert (outcome.created_sets, outcome.created_cases, outcome.created_items) == (1, 2, 3)
    assert len(store.sets) == 1 and len(store.cases) == 2 and len(store.items) == 3
    assert store.sets[outcome.eval_set_id]["loaded_at"] == LOADED_AT


def test_loading_the_same_file_twice_adds_nothing() -> None:
    """이미 적재된 세트는 건너뛰고 그 사실을 결과에 담는다."""
    store = FakeEvaluation()
    loader = EvaluationSetLoader(store)
    document = _document()
    first = loader.load_document(document, loaded_at=LOADED_AT)

    second = loader.load_document(document, loaded_at=LOADED_AT)

    assert second.created_sets == 0 and second.created_cases == 0
    assert second.created_items == 0
    assert second.skipped == ((first.eval_set_id, ALREADY_LOADED),)
    assert len(store.cases) == 1 and len(store.items) == 1


def test_identifiers_do_not_change_between_runs() -> None:
    """JSON 이 식별자를 담지 않아도 같은 파일은 같은 식별자를 낸다."""
    document = _document(cases=[_case(case_id=None, expected_items=[_item()])])
    first, second = FakeEvaluation(), FakeEvaluation()

    EvaluationSetLoader(first).load_document(document, loaded_at=LOADED_AT)
    EvaluationSetLoader(second).load_document(document, loaded_at=LOADED_AT)

    assert set(first.sets) == set(second.sets)
    assert set(first.cases) == set(second.cases)
    assert set(first.items) == set(second.items)


def test_the_file_identifier_wins_over_the_generated_one() -> None:
    store = FakeEvaluation()
    document = _document(
        eval_set_id="eval_backend_v1", cases=[_case(case_id="case_one")]
    )

    outcome = EvaluationSetLoader(store).load_document(document, loaded_at=LOADED_AT)

    assert outcome.eval_set_id == "eval_backend_v1"
    assert "case_one" in store.cases


# ============================================================ 공고 해결
def test_a_posting_is_resolved_from_the_source_id() -> None:
    """파일은 출처만 담는다. 공고는 적재 시점에 찾는다."""
    store = FakeEvaluation(postings={("src_one", "backend"): "post_one"})

    EvaluationSetLoader(store).load_document(_document(), loaded_at=LOADED_AT)

    assert next(iter(store.cases.values()))["posting_id"] == "post_one"


def test_a_source_outside_the_population_leaves_the_posting_empty() -> None:
    store = FakeEvaluation()

    outcome = EvaluationSetLoader(store).load_document(_document(), loaded_at=LOADED_AT)

    assert next(iter(store.cases.values()))["posting_id"] is None
    assert outcome.unresolved_postings == tuple(store.cases)


# ============================================================ 제약 위반
def test_a_case_type_outside_the_check_is_refused() -> None:
    """`evaluation_cases.case_type` 의 CHECK 는 다섯 값만 받는다."""
    with pytest.raises(ValidationError):
        _document(cases=[_case(case_type="salary_estimation")])


def test_an_empty_expected_value_is_refused() -> None:
    with pytest.raises(ValidationError):
        _document(cases=[_case(expected_items=[_item(expected_value={})])])


def test_a_key_that_has_no_column_or_meaning_is_refused() -> None:
    """계약은 `extra="forbid"` 다. 모르는 키는 조용히 버려지지 않는다."""
    with pytest.raises(ValidationError):
        _document(cases=[_case(expected_dimension="database")])


def test_a_case_of_another_job_role_is_refused() -> None:
    document = _document(cases=[_case(expected_job_role_id="devops")])

    with pytest.raises(EvaluationSetError) as failure:
        EvaluationSetLoader(FakeEvaluation()).load_document(document)

    assert "devops" in str(failure.value)


def test_a_repeated_case_identifier_is_refused() -> None:
    document = _document(
        cases=[_case(case_id="case_one"), _case(case_id="case_one", source_id="src_two")]
    )

    with pytest.raises(EvaluationSetError) as failure:
        EvaluationSetLoader(FakeEvaluation()).load_document(document)

    assert "case_one" in str(failure.value)


def test_a_repeated_expected_identifier_is_refused() -> None:
    document = _document(
        cases=[
            _case(
                expected_items=[_item(expected_id="exp_one"), _item(expected_id="exp_one")]
            )
        ]
    )

    with pytest.raises(EvaluationSetError):
        EvaluationSetLoader(FakeEvaluation()).load_document(document)


def test_a_refused_file_writes_nothing() -> None:
    """절반만 들어간 평가 세트는 채점의 분모를 바꾼다."""
    store = FakeEvaluation()
    document = _document(
        cases=[_case(), _case(source_id="src_two", expected_job_role_id="devops")]
    )

    with pytest.raises(EvaluationSetError):
        EvaluationSetLoader(store).load_document(document)

    assert store.sets == {} and store.cases == {} and store.items == {}


# ============================================================ 실제 평가 세트
@requires_eval_file
def test_the_real_backend_set_passes_the_contract() -> None:
    document = EvaluationSetFile.load(EVAL_FILE)

    assert document.job_role_id == "backend"
    assert document.case_count() == 6
    assert document.expected_item_count() == 78
    assert all(str(c.case_type) == "mention_extraction" for c in document.cases)


@requires_eval_file
def test_the_real_backend_set_loads_into_three_tables() -> None:
    store = FakeEvaluation()

    outcome = EvaluationSetLoader(store).load(EVAL_FILE, loaded_at=LOADED_AT)

    assert outcome.eval_set_id == "eval_backend_v1"
    assert (outcome.created_cases, outcome.created_items) == (6, 78)
    assert len(outcome.unresolved_postings) == 6
    assert all(row["posting_id"] is None for row in store.cases.values())


# ============================================================ 기대 차원
def _rubrics(**kw: Any) -> RubricCatalog:
    base: dict[str, Any] = {
        "rubric_set_id": "rubrics_test",
        "source_file": "docs/eval/rubrics_test.json",
        "rubrics": [
            {
                "rubric_id": "rb_dimension_assignment",
                "group": "dimension_assignment",
                "title": "차원 라벨과 깊이 등급 일치",
                "decision": "라벨 집합과 깊이 등급을 각각 센다",
                "pass_when": ["라벨 집합이 같으면 정답으로 센다"],
            }
        ],
    }
    return RubricCatalog.model_validate(base | kw)


def _dimension_document(**kw: Any) -> EvaluationSetFile:
    base: dict[str, Any] = {
        "job_role_id": "backend",
        "source_file": "docs/eval/backend_dimensions_test.json",
        "dimension_labels": [
            {"label": "트랜잭션과 동시성 제어", "definition": "동시 접근과 정합성을 다룬다"}
        ],
        "cases": [
            _case(
                case_type="dimension_assignment",
                expected_items=[
                    _item(
                        expected_field="dimension_assignment",
                        expected_value={
                            "raw_expression": "동시성 제어 로직을 구현",
                            "dimension_labels": ["트랜잭션과 동시성 제어"],
                            "depth_level": "tradeoff",
                        },
                        rubric="rb_dimension_assignment",
                    )
                ],
            )
        ],
    }
    return EvaluationSetFile.model_validate(base | kw)


def test_a_dimension_set_is_a_separate_evaluation_set_row() -> None:
    """세트는 원본 파일 하나다. 차원 세트는 표현 세트와 다른 행이 된다."""
    store = FakeEvaluation()
    loader = EvaluationSetLoader(store)

    mention = loader.load_document(_document(), loaded_at=LOADED_AT)
    dimension = loader.load_document(_dimension_document(), loaded_at=LOADED_AT)

    assert mention.eval_set_id != dimension.eval_set_id
    assert len(store.sets) == 2 and len(store.cases) == 2
    assert {row["case_type"] for row in store.cases.values()} == {
        "mention_extraction",
        "dimension_assignment",
    }


def test_a_dimension_label_outside_the_catalog_is_refused() -> None:
    with pytest.raises(ValidationError) as failure:
        _dimension_document(
            cases=[
                _case(
                    case_type="dimension_assignment",
                    expected_items=[
                        _item(
                            expected_value={
                                "raw_expression": "쿼리 최적화 경험",
                                "dimension_labels": ["데이터 저장소와 쿼리 최적화"],
                            }
                        )
                    ],
                )
            ]
        )

    assert "데이터 저장소와 쿼리 최적화" in str(failure.value)


def test_a_set_without_a_dimension_catalog_is_not_checked() -> None:
    """차원을 채점하지 않는 세트가 있다. 목록이 비면 검사하지 않는다."""
    document = _dimension_document(dimension_labels=[])

    assert document.dimension_label_references() == ("트랜잭션과 동시성 제어",)


# ============================================================ 루브릭 정책
def test_a_rubric_reference_outside_the_catalog_is_refused() -> None:
    document = _dimension_document(
        cases=[
            _case(
                case_type="dimension_assignment",
                expected_items=[_item(rubric="rb_unknown_policy")],
            )
        ]
    )

    with pytest.raises(EvaluationSetError) as failure:
        EvaluationSetLoader(FakeEvaluation(), rubrics=_rubrics()).load_document(document)

    assert "rb_unknown_policy" in str(failure.value)


def test_a_written_decision_is_not_a_rubric_reference() -> None:
    """접두사가 판정 문장과 정책 참조를 가른다. backend_v1.json 은 문장을 적는다."""
    document = _document()

    assert document.rubric_references() == ()
    EvaluationSetLoader(FakeEvaluation(), rubrics=_rubrics()).load_document(document)


def test_a_rubric_identifier_without_the_prefix_is_refused() -> None:
    with pytest.raises(ValidationError):
        _rubrics(
            rubrics=[
                {
                    "rubric_id": "dimension_assignment",
                    "group": "dimension_assignment",
                    "title": "차원 라벨 일치",
                    "decision": "라벨 집합을 센다",
                    "pass_when": ["라벨 집합이 같으면 정답으로 센다"],
                }
            ]
        )


def test_a_rubric_without_a_pass_condition_is_refused() -> None:
    """정답으로 세는 조건이 없으면 채점이 성립하지 않는다."""
    with pytest.raises(ValidationError):
        _rubrics(
            rubrics=[
                {
                    "rubric_id": "rb_empty",
                    "group": "interpretation",
                    "title": "빈 정책",
                    "decision": "판정한다",
                    "pass_when": [],
                }
            ]
        )


def test_a_related_rubric_outside_the_catalog_is_refused() -> None:
    with pytest.raises(ValidationError) as failure:
        _rubrics(
            rubrics=[
                {
                    "rubric_id": "rb_dimension_assignment",
                    "group": "dimension_assignment",
                    "title": "차원 라벨 일치",
                    "decision": "라벨 집합을 센다",
                    "pass_when": ["라벨 집합이 같으면 정답으로 센다"],
                    "related_rubrics": ["rb_depth_level_grade"],
                }
            ]
        )

    assert "rb_depth_level_grade" in str(failure.value)


# ============================================================ 실제 차원 세트
@requires_dimension_file
def test_the_real_dimension_set_passes_the_contract() -> None:
    document = EvaluationSetFile.load(DIMENSION_FILE)

    assert document.job_role_id == "backend"
    assert document.case_count() == 6
    assert document.expected_item_count() == 78
    assert len(document.dimension_labels) == 30
    assert all(str(c.case_type) == "dimension_assignment" for c in document.cases)
    assert document.status == "draft"


@requires_dimension_file
def test_every_expected_dimension_quotes_the_mention_set() -> None:
    """기대 차원의 근거는 backend_v1.json 에 실제로 있는 표현이다."""
    mentions = {
        item.expected_value["raw_expression"]
        for case in EvaluationSetFile.load(EVAL_FILE).cases
        for item in case.expected_items
    }
    document = EvaluationSetFile.load(DIMENSION_FILE)

    quoted = [
        item.expected_value["raw_expression"]
        for case in document.cases
        for item in case.expected_items
    ]

    assert len(quoted) == 78
    assert set(quoted) <= mentions


@requires_dimension_file
def test_every_depth_level_follows_the_signal_map() -> None:
    """깊이 등급은 rb_depth_level_grade 의 신호 표에서 결정된다."""
    catalog = RubricCatalog.load(RUBRIC_FILE)
    signals = next(r for r in catalog.rubrics if r.rubric_id == "rb_depth_level_grade")
    assert signals.signal_map is not None
    assert set(signals.signal_map.values()) == {"foundation", "application", "tradeoff"}

    for case in EvaluationSetFile.load(DIMENSION_FILE).cases:
        for item in case.expected_items:
            value = item.expected_value
            assert signals.signal_map[value["depth_signal"]] == value["depth_level"]


@requires_dimension_file
def test_the_real_rubric_catalog_resolves_every_reference() -> None:
    catalog = RubricCatalog.load(RUBRIC_FILE)
    store = FakeEvaluation()

    outcome = EvaluationSetLoader(store, rubrics=catalog).load(
        DIMENSION_FILE, loaded_at=LOADED_AT
    )

    assert catalog.status == "draft"
    assert outcome.eval_set_id == "eval_backend_dimensions_v1"
    assert (outcome.created_cases, outcome.created_items) == (6, 78)
    assert all(row["rubric"] in catalog.identifiers() for row in store.items.values())


@requires_dimension_file
def test_the_two_backend_sets_do_not_share_identifiers() -> None:
    """두 세트가 한 데이터베이스에 들어가도 기본키가 겹치지 않는다."""
    store = FakeEvaluation()
    loader = EvaluationSetLoader(store, rubrics=RubricCatalog.load(RUBRIC_FILE))

    loader.load(EVAL_FILE, loaded_at=LOADED_AT)
    loader.load(DIMENSION_FILE, loaded_at=LOADED_AT)

    assert len(store.sets) == 2
    assert len(store.cases) == 12
    assert len(store.items) == 156
