"""평가 세트 적재.

`docs/eval/` 의 JSON 파일을 `evaluation_sets`·`evaluation_cases`·
`evaluation_expected_items` 세 표로 나눠 넣는다. 자료의 정의는
docs/data-strategy.md 9장, 컬럼과 제약은 docs/erd.md 13장이다.

결정적 helper 다. 에이전트를 시작하지 않고 생성 모델을 쓰지 않는다. 같은 파일을
다시 적재하면 같은 식별자가 나오고, 이미 적재된 세트에는 아무것도 넣지 않는다.

파일이 표의 제약과 어긋나면 아무것도 넣지 않고 예외를 낸다. 절반만 들어간 평가
세트는 채점의 분모를 바꾸므로, 검사를 모두 마친 뒤에 쓰기를 시작한다.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from careersignal.evaluation.schema import (
    EvaluationCase,
    EvaluationSetFile,
    RubricCatalog,
)
from careersignal.repositories.evaluation import EvaluationRepository

ALREADY_LOADED = "이미 적재된 세트다"
"""건너뛴 사유. 다시 실행해도 안전한 것은 이 판정 때문이다."""


class EvaluationSetError(ValueError):
    """평가 세트 파일이 세 표의 제약과 어긋난다."""


def _digest(*parts: str) -> str:
    """구분자를 넣어 이어 붙인다. 이어 붙인 자리가 달라도 같은 값이 나오지 않는다."""
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()


def evaluation_set_identifier(source_file: str) -> str:
    """세트는 원본 파일 하나로 식별된다. 같은 파일은 언제나 같은 세트다."""
    return f"eval_{_digest(source_file)[:24]}"


def evaluation_case_identifier(eval_set_id: str, case_type: str, key: str) -> str:
    """케이스는 세트 안에서 채점 종류와 대상으로 식별된다."""
    return f"case_{_digest(eval_set_id, case_type, key)[:24]}"


def expected_item_identifier(
    case_id: str, expected_field: str, expected_value: dict[str, Any]
) -> str:
    """기대 항목은 내용으로 식별된다.

    항목의 순서를 바꿔도 같은 식별자가 나온다. 키를 정렬해 직렬화하므로 같은 내용은
    표기 순서가 달라도 같은 값이 된다.
    """
    canonical = json.dumps(
        expected_value, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    )
    return f"exp_{_digest(case_id, expected_field, canonical)[:24]}"


@dataclass(frozen=True, slots=True)
class LoadOutcome:
    """적재 한 번의 결과."""

    eval_set_id: str
    created_sets: int = 0
    created_cases: int = 0
    created_items: int = 0
    skipped: tuple[tuple[str, str], ...] = ()
    """넣지 않은 세트. `(평가 세트 식별자, 사유)` 다."""

    unresolved_postings: tuple[str, ...] = ()
    """공고를 해결하지 못한 케이스. `posting_id` 가 비어 있어 공고 범위를 대조하지 못한다."""

    @property
    def loaded(self) -> bool:
        return self.created_sets == 1


class EvaluationSetLoader:
    """평가 세트 파일을 세 표로 나눠 넣는다.

    `rubrics` 를 주면 기대 항목이 가리키는 루브릭 식별자가 정책 파일에 있는지
    함께 검사한다. 주지 않으면 `rubric` 값을 판정 문장으로만 다룬다.
    """

    def __init__(
        self,
        repository: EvaluationRepository,
        rubrics: RubricCatalog | None = None,
    ) -> None:
        self._repository = repository
        self._rubrics = rubrics

    def load(self, path: Path, loaded_at: datetime | None = None) -> LoadOutcome:
        """파일 하나를 적재한다.

        읽기와 검증은 `EvaluationSetFile` 이 수행한다. 계약을 통과하지 못한 파일은
        여기까지 오지 않는다.
        """
        return self.load_document(EvaluationSetFile.load(path), loaded_at=loaded_at)

    def load_document(
        self, document: EvaluationSetFile, loaded_at: datetime | None = None
    ) -> LoadOutcome:
        """검증을 마친 파일 내용을 적재한다.

        `loaded_at` 은 적재 시점이다. 파일이 담지 않는 값이며 비우면 지금으로 채운다.
        """
        eval_set_id = document.eval_set_id or evaluation_set_identifier(
            document.source_file
        )
        if self._repository.is_loaded(eval_set_id):
            return LoadOutcome(
                eval_set_id=eval_set_id, skipped=((eval_set_id, ALREADY_LOADED),)
            )

        self._check_rubric_references(document)
        cases, items, unresolved = self._rows(document, eval_set_id)

        self._repository.add_set(
            {
                "eval_set_id": eval_set_id,
                "job_role_id": document.job_role_id,
                "source_file": document.source_file,
                "loaded_at": loaded_at or datetime.now(),
            }
        )
        self._repository.add_cases(cases)
        self._repository.add_expected_items(items)

        return LoadOutcome(
            eval_set_id=eval_set_id,
            created_sets=1,
            created_cases=len(cases),
            created_items=len(items),
            unresolved_postings=unresolved,
        )

    def _check_rubric_references(self, document: EvaluationSetFile) -> None:
        """루브릭 식별자가 정책 파일에 있는지 본다.

        없는 식별자를 그대로 적재하면 `rubric` 컬럼에 아무 정책도 가리키지 않는
        문자열이 남아 채점 기준이 비게 된다.
        """
        if self._rubrics is None:
            return
        unknown = sorted(
            reference
            for reference in document.rubric_references()
            if not self._rubrics.contains(reference)
        )
        if unknown:
            raise EvaluationSetError(
                f"기대 항목이 가리키는 루브릭이 {self._rubrics.source_file} 에 없다:"
                f" {unknown}"
            )

    # ------------------------------------------------------------ 행 만들기
    def _rows(
        self, document: EvaluationSetFile, eval_set_id: str
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]], tuple[str, ...]]:
        """세 표의 행을 만든다. 하나라도 제약과 어긋나면 예외를 낸다."""
        cases: list[dict[str, Any]] = []
        items: list[dict[str, Any]] = []
        unresolved: list[str] = []
        seen_cases: set[str] = set()
        seen_items: set[str] = set()

        for index, case in enumerate(document.cases):
            case_id = case.case_id or evaluation_case_identifier(
                eval_set_id, str(case.case_type), _case_key(case, index)
            )
            if case_id in seen_cases:
                raise EvaluationSetError(
                    f"case_id {case_id} 가 파일에 두 번 있다."
                    " evaluation_cases.case_id 는 기본키다"
                )
            seen_cases.add(case_id)

            if (
                case.expected_job_role_id is not None
                and case.expected_job_role_id != document.job_role_id
            ):
                raise EvaluationSetError(
                    f"케이스 {case_id} 의 expected_job_role_id"
                    f" {case.expected_job_role_id} 가 세트의 직무"
                    f" {document.job_role_id} 와 다르다. evaluation_cases 에는 직무"
                    " 컬럼이 없어 세트의 직무로만 대조한다"
                )

            posting_id = case.posting_id or self._posting_of(case, document.job_role_id)
            if posting_id is None:
                unresolved.append(case_id)

            cases.append(
                {
                    "case_id": case_id,
                    "eval_set_id": eval_set_id,
                    "posting_id": posting_id,
                    "case_type": str(case.case_type),
                }
            )
            items.extend(self._item_rows(case, case_id, seen_items))

        return cases, items, tuple(unresolved)

    def _item_rows(
        self, case: EvaluationCase, case_id: str, seen: set[str]
    ) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for item in case.expected_items:
            expected_id = item.expected_id or expected_item_identifier(
                case_id, item.expected_field, item.expected_value
            )
            if expected_id in seen:
                raise EvaluationSetError(
                    f"expected_id {expected_id} 가 파일에 두 번 있다."
                    " evaluation_expected_items.expected_id 는 기본키이며,"
                    f" 케이스 {case_id} 안에 같은 내용의 기대 항목이 두 번 있어도"
                    " 같은 식별자가 나온다"
                )
            seen.add(expected_id)
            rows.append(
                {
                    "expected_id": expected_id,
                    "case_id": case_id,
                    "expected_field": item.expected_field,
                    "expected_value": item.expected_value,
                    "rubric": item.rubric,
                }
            )
        return rows

    def _posting_of(self, case: EvaluationCase, job_role_id: str) -> str | None:
        """출처 식별자로 공고를 찾는다. 모집단에 없는 출처는 비워 둔다."""
        if case.source_id is None:
            return None
        return self._repository.find_posting_id(case.source_id, job_role_id)


def _case_key(case: EvaluationCase, index: int) -> str:
    """케이스를 세트 안에서 가리키는 값.

    출처가 있으면 출처로, 없으면 원문 파일로, 둘 다 없으면 파일 안의 자리로 가리킨다.
    """
    return case.source_id or case.content_file or f"#{index}"
