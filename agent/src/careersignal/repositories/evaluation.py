"""평가 세트 저장소.

`evaluation_sets`·`evaluation_cases`·`evaluation_expected_items` 세 표에 쓴다.
컬럼과 제약은 docs/erd.md 13장, 자료의 성격은 docs/data-strategy.md 9장이다.

구성요소는 평가 실행기다. docs/permission-matrix.md 3장은 평가 표를 평가 실행기에
두고 분석 실행 경로에서 접근하지 않는다고 정한다. `cs_eval_runner` role 과 평가 표
`GRANT` 는 migration 0016 이 만든다.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from psycopg.types.json import Jsonb

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository


class EvaluationRepository(Repository):
    component = Component.EVAL_RUNNER

    # ------------------------------------------------------------ 평가 세트
    def find_set(self, eval_set_id: str) -> dict[str, Any] | None:
        return self.unit.fetch_one(
            """
            SELECT eval_set_id, job_role_id, source_file, loaded_at
            FROM evaluation_sets
            WHERE eval_set_id = %s
            """,
            (eval_set_id,),
        )

    def is_loaded(self, eval_set_id: str) -> bool:
        """이미 적재된 세트인가.

        적재기가 다시 실행되어도 안전한 근거다. 세트 한 개와 그 케이스·기대 항목을
        한 거래에서 넣으므로, 세트 행이 있으면 나머지도 있다.
        """
        return self.find_set(eval_set_id) is not None

    def add_set(self, values: dict[str, Any]) -> None:
        self.unit.insert("evaluation_sets", values)

    # ------------------------------------------------------------ 평가 케이스
    def add_cases(self, rows: Sequence[dict[str, Any]]) -> None:
        """케이스는 세트 행이 먼저 있어야 한다. 외래키가 순서를 강제한다."""
        self.unit.insert_many("evaluation_cases", list(rows))

    # ------------------------------------------------------------ 기대 항목
    def add_expected_items(self, rows: Sequence[dict[str, Any]]) -> None:
        """`expected_value` 는 jsonb 다. 래퍼가 타입을 명시하므로 text 로 추론되지 않는다."""
        self.unit.insert_many(
            "evaluation_expected_items",
            [dict(row, expected_value=Jsonb(row["expected_value"])) for row in rows],
        )

    # ------------------------------------------------------------ 공고 해결
    def find_posting_id(self, source_id: str, job_role_id: str) -> str | None:
        """`evaluation_cases.posting_id` 를 적재 시점에 해결한다.

        평가 세트 파일은 출처 식별자를 담고 공고 식별자를 담지 않는다. 근거는
        docs/eval/README.md 의 구조 표다. 같은 출처의 같은 직무는 공고 하나이며
        규칙은 docs/metric-spec.md 2.8이다.
        """
        return self.unit.fetch_value(
            """
            SELECT posting_id FROM postings
            WHERE source_id = %s AND job_role_id = %s
            ORDER BY posting_id
            LIMIT 1
            """,
            (source_id, job_role_id),
        )
