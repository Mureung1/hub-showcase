"""평가 세트 JSON 계약.

`docs/eval/` 의 파일을 검증한다. 자료의 정의는 docs/data-strategy.md 9장, 담는 값의
설명은 docs/eval/README.md 다. 컬럼과 제약은 docs/erd.md 13장과
`agent/migrations/sql/0001_initial_schema.sql` 의 세 표에서 온다.

파일 하나가 `evaluation_sets` 한 행이고, `cases` 가 `evaluation_cases`,
`expected_items` 가 `evaluation_expected_items` 에 대응한다.

계약은 표에 컬럼이 없는 키도 받는다. 세트의 `dataset_version`·`content_root`·
`status`·`note`·`rubric_file`·`dimension_labels` 와 케이스의 `source_id`·
`content_file`·`expected_entry_label`·`expected_job_role_id` 는 컬럼이 아니라 적재
시점의 해결과 대조에 쓰는 값이다. 컬럼이 아닌 값은 적재되지 않으므로
데이터베이스에는 남지 않는다.

채점 기준 자체는 세트가 아니라 정책 파일에 있다. `RubricCatalog` 가
`docs/eval/rubrics_v1.json` 을 받고, 기대 항목의 `rubric` 이 `rb_` 로 시작하면
그 파일의 `rubric_id` 를 가리킨다.
"""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from careersignal.domain.segment import EntryLabel

RUBRIC_ID_PREFIX = "rb_"
"""루브릭 식별자의 접두사. 이 접두사로 시작하는 `rubric` 만 정책 파일을 가리킨다."""


class EvaluationCaseType(StrEnum):
    """`evaluation_cases.case_type` 의 CHECK 값 집합.

    다섯 값 밖의 값은 데이터베이스가 거부한다. 계약이 먼저 거부해 적재가 시작되기
    전에 드러난다.
    """

    MENTION_EXTRACTION = "mention_extraction"
    DIMENSION_ASSIGNMENT = "dimension_assignment"
    INTERPRETATION = "interpretation"
    STRATEGY_LINKAGE = "strategy_linkage"
    COVERAGE = "coverage"


class ExpectedItem(BaseModel):
    """채점 기준 하나. `evaluation_expected_items` 한 행이다.

    `expected_id` 가 없으면 적재기가 결정적으로 만든다. 규칙은
    `careersignal.evaluation.loader.expected_item_identifier` 다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    expected_field: str = Field(min_length=1)
    expected_value: dict[str, Any]
    """jsonb NOT NULL 이다. 담는 필드는 docs/eval/README.md 의 표에 있다."""

    expected_id: str | None = None
    rubric: str | None = None
    """일치 판정 규칙. 지표의 분자를 무엇으로 세는지가 여기서 갈린다."""

    @field_validator("expected_value")
    @classmethod
    def _reject_an_empty_value(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not value:
            raise ValueError(
                "expected_value 가 비어 있다. evaluation_expected_items.expected_value 는"
                " NOT NULL 이며 채점 기준이 없는 기대 항목은 성립하지 않는다"
            )
        return value


class EvaluationCase(BaseModel):
    """공고 하나에 대한 채점 단위. `evaluation_cases` 한 행이다.

    `posting_id` 는 파일이 비워 두고 적재 시점에 `source_id` 로 해결한다. 근거는
    docs/eval/README.md 의 구조 표다. 컬럼이 nullable 이므로 해결하지 못해도
    적재는 진행되고, 해결하지 못한 케이스는 적재 결과에 남는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    case_type: EvaluationCaseType
    expected_items: tuple[ExpectedItem, ...] = ()

    case_id: str | None = None
    posting_id: str | None = None

    source_id: str | None = None
    """공고를 해결하는 열쇠. `evaluation_cases` 에는 컬럼이 없다."""

    content_file: str | None = None
    """원문 파일 이름. 기대 항목의 문자열을 대조하는 자리이며 컬럼이 아니다."""

    expected_entry_label: EntryLabel | None = None
    """대상군 범위 일치를 확인하는 값. 정의는 docs/metric-spec.md 2.6이다."""

    expected_job_role_id: str | None = None
    """직무 범위 일치를 확인하는 값. 세트의 직무와 달라지면 적재기가 거부한다."""


class DimensionLabel(BaseModel):
    """기대 차원 하나. 분류체계 버전과 독립적인 사람 기준이다.

    `requirement_dimensions` 를 외래키로 참조하지 않으므로 라벨 문자열로 적는다.
    근거는 docs/erd.md 13장의 마지막 문장이다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    label: str = Field(min_length=1)
    definition: str = Field(min_length=1)
    boundary: str | None = None
    """인접한 차원과 가르는 기준. 어느 쪽으로 보내는지를 적는다."""


class EvaluationSetFile(BaseModel):
    """평가 세트 파일 하나. `evaluation_sets` 한 행이다.

    `loaded_at` 은 파일이 담지 않는다. 적재 시점에 채운다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    job_role_id: str = Field(min_length=1)
    source_file: str = Field(min_length=1)
    cases: tuple[EvaluationCase, ...] = ()

    eval_set_id: str | None = None
    dataset_version: str | None = None
    content_root: str | None = None
    """원문 파일이 있는 디렉터리. 저장소 밖의 경로이며 컬럼이 아니다."""

    status: str | None = None
    """사람이 확정했는가. `draft` 는 채점 기준으로 쓰지 않는다. 컬럼이 아니다."""

    note: str | None = None

    rubric_file: str | None = None
    """기대 항목의 `rubric` 이 가리키는 정책 파일. 컬럼이 아니다."""

    dimension_labels: tuple[DimensionLabel, ...] = ()
    """이 세트가 쓰는 기대 차원 목록. 컬럼이 아니다."""

    @model_validator(mode="after")
    def _keep_dimension_labels_in_the_catalog(self) -> EvaluationSetFile:
        """목록이 있으면 기대 항목이 목록 밖의 라벨을 쓰지 않는다.

        목록이 비면 검사하지 않는다. 차원을 채점하지 않는 세트가 있다.
        """
        if not self.dimension_labels:
            return self
        known = {entry.label for entry in self.dimension_labels}
        unknown = sorted(set(self.dimension_label_references()) - known)
        if unknown:
            raise ValueError(
                f"dimension_labels 에 없는 차원 라벨을 기대 항목이 쓴다: {unknown}"
            )
        return self

    @classmethod
    def load(cls, path: Path) -> EvaluationSetFile:
        return cls.model_validate_json(path.read_text(encoding="utf-8"))

    def case_count(self) -> int:
        return len(self.cases)

    def expected_item_count(self) -> int:
        """기대 항목 수. 재현율의 분모다. 정의는 docs/eval/README.md 의 지표 표다."""
        return sum(len(case.expected_items) for case in self.cases)

    def rubric_references(self) -> tuple[str, ...]:
        """정책 파일을 가리키는 `rubric` 값. 판정 문장을 직접 적은 항목은 빠진다."""
        seen: list[str] = []
        for case in self.cases:
            for item in case.expected_items:
                rubric = item.rubric
                if rubric and rubric.startswith(RUBRIC_ID_PREFIX) and rubric not in seen:
                    seen.append(rubric)
        return tuple(seen)

    def dimension_label_references(self) -> tuple[str, ...]:
        """기대 항목이 쓴 차원 라벨. `expected_value.dimension_labels` 에서 모은다."""
        seen: list[str] = []
        for case in self.cases:
            for item in case.expected_items:
                labels = item.expected_value.get("dimension_labels")
                if not isinstance(labels, list):
                    continue
                for label in labels:
                    if isinstance(label, str) and label not in seen:
                        seen.append(label)
        return tuple(seen)


class Rubric(BaseModel):
    """채점 기준 하나. 개별 케이스의 정답이 아니라 정책이다.

    `evaluation_expected_items.rubric` 이 `rubric_id` 로 이 정책을 가리킨다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    rubric_id: str = Field(min_length=1)
    group: str = Field(min_length=1)
    title: str = Field(min_length=1)
    decision: str = Field(min_length=1)
    pass_when: tuple[str, ...] = Field(min_length=1)
    """정답으로 세는 조건. 하나 이상이어야 채점이 성립한다."""

    applies_to: EvaluationCaseType | None = None
    """이 정책이 채점하는 케이스 종류. 케이스에 매이지 않는 정책은 비운다."""

    fail_when: tuple[str, ...] = ()
    reference: tuple[str, ...] = ()
    related_rubrics: tuple[str, ...] = ()
    signal_map: dict[str, str] | None = None
    matrix: dict[str, Any] | None = None
    """표로 적는 정책. 주장 유형과 자료 계층처럼 두 축의 교차가 필요한 자리다."""

    @field_validator("rubric_id")
    @classmethod
    def _require_the_prefix(cls, value: str) -> str:
        if not value.startswith(RUBRIC_ID_PREFIX):
            raise ValueError(
                f"rubric_id {value} 가 {RUBRIC_ID_PREFIX} 로 시작하지 않는다."
                " 접두사가 판정 문장과 정책 참조를 가른다"
            )
        return value


class RubricCatalog(BaseModel):
    """루브릭 정책 파일 하나. 세 표의 어느 행도 아니다.

    파일의 `status` 가 `draft` 인 동안에는 채점 기준으로 쓰지 않는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    rubric_set_id: str = Field(min_length=1)
    source_file: str = Field(min_length=1)
    rubrics: tuple[Rubric, ...] = Field(min_length=1)

    status: str | None = None
    note: str | None = None

    @model_validator(mode="after")
    def _keep_identifiers_unique_and_resolvable(self) -> RubricCatalog:
        identifiers: set[str] = set()
        for rubric in self.rubrics:
            if rubric.rubric_id in identifiers:
                raise ValueError(f"rubric_id {rubric.rubric_id} 가 파일에 두 번 있다")
            identifiers.add(rubric.rubric_id)
        for rubric in self.rubrics:
            missing = sorted(set(rubric.related_rubrics) - identifiers)
            if missing:
                raise ValueError(
                    f"{rubric.rubric_id} 의 related_rubrics 가 파일에 없다: {missing}"
                )
        return self

    @classmethod
    def load(cls, path: Path) -> RubricCatalog:
        return cls.model_validate_json(path.read_text(encoding="utf-8"))

    def identifiers(self) -> frozenset[str]:
        return frozenset(rubric.rubric_id for rubric in self.rubrics)

    def contains(self, rubric_id: str) -> bool:
        return rubric_id in self.identifiers()
