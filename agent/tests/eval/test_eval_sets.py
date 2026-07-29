"""정답 파일 검증.

`docs/eval/` 의 평가 세트 파일이 `careersignal.evaluation.schema` 의 계약을 지키고
`careersignal.evaluation.loader` 로 적재되는 형태인지 본다. 데이터베이스에 접속하지
않는다. 저장소는 대역이며 파싱과 행 만들기까지만 확인한다.

파일이 담는 값의 설명은 docs/eval/README.md, 컬럼과 제약은 docs/erd.md 13장이다.
"""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any

import pytest

from careersignal.evaluation import (
    EvaluationSetFile,
    EvaluationSetLoader,
    RubricCatalog,
)

EVAL_DIR = Path(__file__).resolve().parents[3] / "docs" / "eval"
RUBRIC_FILE = EVAL_DIR / "rubrics_v1.json"
LOADED_AT = datetime(2026, 7, 29, 9, 0, 0)

SET_FILES = (
    "backend_v1.json",
    "backend_dimensions_v1.json",
    "frontend_v1.json",
    "frontend_dimensions_v1.json",
)

FRONTEND_FILES = ("frontend_v1.json", "frontend_dimensions_v1.json")

DEMO_POSTING_ID = re.compile(r"^dp_[a-z_]+_(0[1-9])$")
"""생성 공고의 식별자 규약. agent/data/demo_seed/CONTRACT.md 1장이다."""

DEPTH_LEVELS = frozenset({"foundation", "application", "tradeoff"})
REQUIREDNESS = frozenset({"required", "preferred", "responsibility"})


class FakeEvaluation:
    """평가 세트 저장소의 대역. 넣은 행을 그대로 들고 있는다."""

    def __init__(self) -> None:
        self.sets: dict[str, dict[str, Any]] = {}
        self.cases: dict[str, dict[str, Any]] = {}
        self.items: dict[str, dict[str, Any]] = {}

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
        return None


def _load(name: str) -> EvaluationSetFile:
    return EvaluationSetFile.load(EVAL_DIR / name)


@pytest.fixture(scope="module")
def rubrics() -> RubricCatalog:
    return RubricCatalog.load(RUBRIC_FILE)


@pytest.mark.parametrize("name", SET_FILES)
def test_계약을_지킨다(name: str) -> None:
    """모든 정답 파일이 `EvaluationSetFile` 로 읽힌다."""
    document = _load(name)
    assert document.source_file == f"docs/eval/{name}"
    assert document.case_count() > 0
    assert document.expected_item_count() > 0


@pytest.mark.parametrize("name", SET_FILES)
def test_초안_상태를_유지한다(name: str) -> None:
    """초안으로 채점해 추이를 보는 것과 게이트로 쓰는 것을 가른다."""
    assert _load(name).status == "draft"


def test_루브릭_정책도_계약을_지킨다(rubrics: RubricCatalog) -> None:
    assert rubrics.status == "draft"
    assert rubrics.source_file == "docs/eval/rubrics_v1.json"


@pytest.mark.parametrize("name", SET_FILES)
def test_가리키는_루브릭이_정책_파일에_있다(
    name: str, rubrics: RubricCatalog
) -> None:
    """없는 식별자를 적재하면 `rubric` 컬럼이 아무 정책도 가리키지 않는다."""
    unknown = [
        reference
        for reference in _load(name).rubric_references()
        if not rubrics.contains(reference)
    ]
    assert unknown == []


@pytest.mark.parametrize("name", SET_FILES)
def test_데이터베이스_없이_적재된다(name: str, rubrics: RubricCatalog) -> None:
    """세 표의 행까지 만든다. 저장소는 대역이며 접속하지 않는다."""
    document = _load(name)
    repository = FakeEvaluation()
    outcome = EvaluationSetLoader(repository, rubrics=rubrics).load(
        EVAL_DIR / name, loaded_at=LOADED_AT
    )

    assert outcome.loaded
    assert outcome.created_cases == document.case_count()
    assert outcome.created_items == document.expected_item_count()
    assert len(repository.cases) == outcome.created_cases
    assert len(repository.items) == outcome.created_items


@pytest.mark.parametrize("name", SET_FILES)
def test_다시_적재하면_아무것도_넣지_않는다(
    name: str, rubrics: RubricCatalog
) -> None:
    repository = FakeEvaluation()
    loader = EvaluationSetLoader(repository, rubrics=rubrics)
    loader.load(EVAL_DIR / name, loaded_at=LOADED_AT)
    again = loader.load(EVAL_DIR / name, loaded_at=LOADED_AT)

    assert not again.loaded
    assert again.skipped != ()


@pytest.mark.parametrize("name", SET_FILES)
def test_식별자가_파일_안에서_유일하다(name: str) -> None:
    """`case_id` 와 `expected_id` 는 두 표의 기본키다."""
    document = _load(name)
    case_ids = [case.case_id for case in document.cases]
    expected_ids = [
        item.expected_id for case in document.cases for item in case.expected_items
    ]

    assert None not in case_ids
    assert None not in expected_ids
    assert len(set(case_ids)) == len(case_ids)
    assert len(set(expected_ids)) == len(expected_ids)


@pytest.mark.parametrize("name", SET_FILES)
def test_케이스의_직무가_세트의_직무와_같다(name: str) -> None:
    """`evaluation_cases` 에는 직무 컬럼이 없어 세트의 직무로만 대조한다."""
    document = _load(name)
    for case in document.cases:
        assert case.expected_job_role_id == document.job_role_id


# ------------------------------------------------------------ 프론트엔드 세트
@pytest.mark.parametrize("name", FRONTEND_FILES)
def test_생성_공고를_가리킨다(name: str) -> None:
    """대상은 `scripts/demo_seed/frontend.py` 가 만드는 공고 아홉 건이다."""
    document = _load(name)
    assert document.job_role_id == "frontend"
    assert document.dataset_version == "ds_demo_v1"
    assert document.case_count() == 9

    posting_ids = [case.posting_id for case in document.cases]
    assert posting_ids == [f"dp_frontend_0{n}" for n in range(1, 10)]
    assert all(DEMO_POSTING_ID.match(str(value)) for value in posting_ids)
    assert [case.source_id for case in document.cases] == [
        f"src_demo_frontend_0{n}" for n in range(1, 10)
    ]


def test_요구_표현_세트가_필요한_필드를_담는다() -> None:
    document = _load("frontend_v1.json")
    for case in document.cases:
        assert str(case.case_type) == "mention_extraction"
        for item in case.expected_items:
            value = item.expected_value
            assert item.expected_field == "requirement_mention"
            assert set(value) == {
                "raw_expression",
                "stated_requiredness",
                "requiredness",
                "section",
                "evidence_quote",
            }
            assert value["requiredness"] in REQUIREDNESS
            assert value["raw_expression"] in value["evidence_quote"]


def test_차원_세트가_요구_표현_세트를_가리킨다() -> None:
    """`mention_expected_id` 가 두 세트를 잇는다."""
    mentions = {
        item.expected_id: item.expected_value
        for case in _load("frontend_v1.json").cases
        for item in case.expected_items
    }
    dimensions = _load("frontend_dimensions_v1.json")

    for case in dimensions.cases:
        assert str(case.case_type) == "dimension_assignment"
        for item in case.expected_items:
            value = item.expected_value
            source = mentions[value["mention_expected_id"]]
            assert value["raw_expression"] == source["raw_expression"]
            assert value["requiredness"] == source["requiredness"]


def test_차원_라벨이_목록_안에_있다() -> None:
    document = _load("frontend_dimensions_v1.json")
    known = {entry.label for entry in document.dimension_labels}

    assert len(known) == 8
    assert set(document.dimension_label_references()) <= known
    for case in document.cases:
        for item in case.expected_items:
            assert len(item.expected_value["dimension_labels"]) == 1


def test_깊이_신호가_등급을_결정한다(rubrics: RubricCatalog) -> None:
    """`depth_signal` 과 `depth_level` 의 대응은 루브릭의 `signal_map` 이다."""
    signal_map = next(
        rubric.signal_map
        for rubric in rubrics.rubrics
        if rubric.rubric_id == "rb_frontend_depth_signal"
    )
    assert signal_map is not None
    assert set(signal_map.values()) <= DEPTH_LEVELS

    for case in _load("frontend_dimensions_v1.json").cases:
        for item in case.expected_items:
            value = item.expected_value
            assert signal_map[value["depth_signal"]] == value["depth_level"]


def test_같은_표현은_공고가_달라도_같은_등급을_받는다() -> None:
    """정답은 공고별 관측이 아니라 표현 하나에 대한 사람 기준이다."""
    grades: dict[str, tuple[str, str, tuple[str, ...]]] = {}
    for case in _load("frontend_dimensions_v1.json").cases:
        for item in case.expected_items:
            value = item.expected_value
            grade = (
                value["depth_signal"],
                value["depth_level"],
                tuple(value["dimension_labels"]),
            )
            expression = value["raw_expression"]
            assert grades.setdefault(expression, grade) == grade
