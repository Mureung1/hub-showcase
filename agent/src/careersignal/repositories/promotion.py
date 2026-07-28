"""승격 심사와 분류체계 버전 발행 저장소.

통계 분석 에이전트가 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장이며,
컬럼은 docs/erd.md 7.2~7.9 다.

승격 심사가 세는 독립 공고 수와 독립 회사 수는 A 계층 자료에서만 나온다. 모집단이
`posting_versions` 이므로(docs/metric-spec.md 2.1) 후보의 근거 mention 은 공고를
거쳐야 세어지고, 공고로 등록되지 않은 출처의 표현은 어느 쪽에도 들어가지 않는다.
경로는 `requirement_candidate_mentions` → `requirement_mentions` →
`posting_versions` → `postings` → `companies` 다.

세는 단위는 후보 하나가 아니라 같은 개념 이름으로 묶인 후보 한 벌이다. 후보는 표현의
매칭 키로 갈리므로 같은 개념의 다른 표기가 서로 다른 후보가 되고, 후보마다 세면 어느
쪽도 임계값을 넘지 못한다. 묶는 규칙은 `taxonomy/promotion.py` 가 정하고 이 저장소는
받은 후보 목록을 한 번에 센다.

발행은 이전 활성 버전을 supersede 하고 새 버전을 넣는 두 문장이다. 두 문장이 한
거래에 있어야 `requirement_taxonomy_versions` 의 부분 유니크 인덱스
(docs/erd.md 7.2)를 어기지 않는다. 거래는 `repositories/base.py` 의
`unit_of_work` 하나가 연다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from typing import Any

from psycopg.types.json import Jsonb

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository

TERMINAL_DECISIONS: tuple[str, ...] = ("promote", "merge", "reject")
"""다시 심사하지 않는 판정. `hold` 는 근거가 쌓이면 결론이 바뀐다."""


def decision_identifier(candidate_id: str, taxonomy_version_id: str) -> str:
    """결정 행의 기본키. 후보 하나와 심사 기준 버전 하나가 결정한다.

    심사는 특정 분류체계 버전을 기준으로 이뤄진다
    (docs/adr/0011-candidate-judgment-context.md). 그래서 같은 버전에서 같은 후보를
    다시 심사하면 같은 행이고, 새 버전에서 심사하면 새 행이다.
    `requirement_candidate_decisions` 의 기본키는 `decision_id` 하나뿐이고 후보에
    유니크 제약이 없으므로(docs/erd.md 7.9) 후보당 여러 행이 허용된다.

    실행 식별자를 재료에 넣지 않는다. `hold` 는 종결 판정이 아니라 다음 실행에 다시
    올라오는데, 실행마다 식별자가 갈리면 같은 버전의 같은 결론이 행 여럿이 되고 실행
    식별자가 같으면 기본키를 어긴다. 어느 실행이 판정했는지는 `decided_by` 가 담는다.

    자리가 저장소인 이유는 이 값이 이 저장소가 쓰는 표의 기본키 형식이기 때문이다.
    `repositories/sources.py` 의 `content_hash` 와 같은 성격이며, 심사 대상 조회가
    같은 함수로 이미 결정된 후보를 걸러야 하므로 두 자리가 같은 정의를 봐야 한다.
    """
    material = f"{candidate_id}:{taxonomy_version_id}".encode()
    return f"dec_{hashlib.sha256(material).hexdigest()[:24]}"

DIMENSION_ASSIGNMENT = "dimension_assignment"
"""평가 세트에서 기대 차원을 담는 케이스 종류. docs/erd.md 13장의 CHECK 값이다."""


def _jsonb(value: Any) -> Jsonb | None:
    """jsonb 컬럼에 넣을 값. 래퍼가 타입을 명시하므로 text 로 추론되지 않는다."""
    return None if value is None else Jsonb(value)


class PromotionRepository(Repository):
    """승격 심사와 버전 발행의 저장소.

    `requirement_candidate_decisions`, `requirement_taxonomy_versions`,
    `requirement_dimensions`, `requirement_dimension_versions`,
    `requirement_aliases`, `requirement_dimension_relations` 가 이 구성요소의 쓰기
    범위에 있다. 근거는 docs/permission-matrix.md 3장이고 코드의 정의는
    `domain/permissions.py` 의 `_WRITE_SCOPE[Component.AGENT_STATS]` 다.
    """

    component = Component.AGENT_STATS

    # ------------------------------------------------------------ 활성 분류체계
    # `active_taxonomy_version` 과 `_ACTIVE_TAXONOMY` 는 `Repository` 가 갖는다.
    # 심사와 발행이 보는 활성 버전은 추출·발견·할당이 보는 것과 같은 행이어야
    # 하므로 조회를 한 벌로 둔다.

    # ------------------------------------------------------------ 심사 대상
    _CANDIDATES_TO_REVIEW = """
        SELECT c.candidate_id, c.proposed_label, c.lifecycle_status,
               c.nearest_dimension_id, c.relation_judgment,
               c.proposed_dimension_kind,
               c.judged_against_taxonomy_version_id, c.judgment_rationale,
               dv.display_label AS nearest_label
        FROM requirement_candidates c
        LEFT JOIN requirement_dimension_versions dv
               ON dv.dimension_id = c.nearest_dimension_id
              AND dv.taxonomy_version_id = %(taxonomy_version_id)s
              AND dv.lifecycle_status = 'active'
        WHERE c.taxonomy_id = %(taxonomy_id)s
          AND NOT EXISTS (
                SELECT 1 FROM requirement_candidate_decisions d
                WHERE d.candidate_id = c.candidate_id
                  AND d.decision <> 'hold'
              )
        ORDER BY c.candidate_id
    """
    """심사에 올릴 후보.

    종결 판정을 받은 후보를 뺀다. `hold` 는 종결이 아니므로 다시 올라오고, 근거가
    임계값을 채우면 다음 실행에서 판정이 바뀐다.

    `hold` 후보를 무한히 다시 올리지는 않는다. 같은 버전에서 이미 결정이 있는 후보는
    `candidates_to_review` 가 결정 식별자로 걸러 낸다. 그 조건이 SQL 이 아닌 이유는
    식별자가 `decision_identifier` 의 해시이고, 같은 해시를 SQL 에 한 번 더 적으면 두
    정의가 갈리기 때문이다. 조건을 세는 자리와 거르는 자리가 하나여야 한다.

    상대 차원의 표시 라벨을 활성 버전에서 함께 읽는다. 관계 판정은 특정 분류체계
    버전을 기준으로 나오므로(docs/adr/0011-candidate-judgment-context.md) 그 사이
    상대 차원이 사라졌으면 이 조인이 비고 심사가 보류로 가른다.
    """

    _RECORDED_DECISION_IDS = """
        SELECT d.decision_id
        FROM requirement_candidate_decisions d
        JOIN requirement_candidates c ON c.candidate_id = d.candidate_id
        WHERE c.taxonomy_id = %(taxonomy_id)s
    """
    """이 분류체계의 후보에 이미 남은 결정 식별자.

    식별자가 후보와 심사 기준 버전을 담으므로(`decision_identifier`) 이 집합만 있으면
    "이 버전에서 이미 심사한 후보" 를 가릴 수 있다. 결정 행에 분류체계 버전 컬럼이
    없어도(docs/erd.md 7.9) 스키마를 바꾸지 않고 판정할 수 있는 이유가 이것이다.
    """

    def recorded_decision_ids(self, taxonomy_id: str) -> set[str]:
        """이미 저장된 결정 식별자 집합."""
        rows = self.unit.fetch_all(
            self._RECORDED_DECISION_IDS, {"taxonomy_id": taxonomy_id}
        )
        return {row["decision_id"] for row in rows}

    def candidates_to_review(
        self,
        taxonomy_id: str,
        taxonomy_version_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """승격 심사의 입력.

        `candidate_id` 로 정렬한다. 식별자가 결정적이므로(`candidate_identifier`)
        이 정렬은 적재 순서와 무관하게 같은 차례를 준다.

        이 버전에서 이미 결정을 받은 후보를 뺀다. 같은 버전·같은 근거로 다시 심사하면
        같은 결론이 나오고, 그 결론을 저장하면 결정 식별자가 같아 기본키를 어긴다.
        새 버전이 발행되면 식별자가 달라지므로 `hold` 후보가 다시 올라온다.

        `limit` 은 상한이다. 거르고 난 뒤의 수가 그보다 적을 수 있다.
        """
        sql = self._CANDIDATES_TO_REVIEW
        params: dict[str, Any] = {
            "taxonomy_id": taxonomy_id,
            "taxonomy_version_id": taxonomy_version_id,
        }
        if limit is not None:
            sql = f"{sql}        LIMIT %(limit)s\n"
            params["limit"] = limit
        rows = self.unit.fetch_all(sql, params)
        recorded = self.recorded_decision_ids(taxonomy_id)
        if not recorded:
            return rows
        return [
            row
            for row in rows
            if decision_identifier(row["candidate_id"], taxonomy_version_id)
            not in recorded
        ]

    _CANDIDATE_EVIDENCE = """
        SELECT count(DISTINCT pv.posting_id)  AS independent_posting_count,
               count(DISTINCT p.company_id)   AS independent_company_count
        FROM requirement_candidate_mentions cm
        JOIN requirement_mentions m ON m.mention_id = cm.mention_id
        JOIN posting_versions pv ON pv.posting_version_id = m.posting_version_id
        JOIN postings p ON p.posting_id = pv.posting_id
        WHERE cm.candidate_id = ANY(%(candidate_ids)s)
          AND m.dataset_version = %(dataset_version)s
    """
    """후보 묶음의 독립 공고 수와 독립 회사 수.

    공고는 `posting_versions.posting_id` 로 센다. 같은 공고의 여러 버전이 같은
    표현을 담아도 공고 하나다.

    회사는 `postings.company_id` 로 따로 센다. 공고 수를 회사 수로 대신 쓰면 한
    회사가 올린 공고 둘이 회사 둘로 세어지고, 그 회사의 특징이 직무 전체의 차원으로
    승격된다. 근거는 docs/statistics-model.md 3.4 다.

    후보 하나가 아니라 후보 목록을 받는다. 후보는 표현의 매칭 키로 갈리므로
    (`taxonomy/discovery.py` 의 `candidate_identifier`) 같은 개념을 가리키는 표현이
    표기마다 다른 후보가 된다. 후보 하나로 세면 `3년 이상의 Java 서버 개발 경험` 과
    `Java 기반 백엔드 개발 경험` 이 각각 공고 하나로 세어져 둘 다 임계값을 넘지
    못한다. `DISTINCT` 가 목록 전체에 걸리므로 같은 공고를 두 후보가 함께 증명해도
    공고 하나다.
    """

    def group_evidence(
        self, candidate_ids: Sequence[str], dataset_version: str
    ) -> dict[str, int]:
        """묶음이 임계값과 견줄 두 수. 근거가 없으면 둘 다 0 이다."""
        if not candidate_ids:
            return {"independent_posting_count": 0, "independent_company_count": 0}
        row = self.unit.fetch_one(
            self._CANDIDATE_EVIDENCE,
            {
                "candidate_ids": list(candidate_ids),
                "dataset_version": dataset_version,
            },
        )
        return {
            "independent_posting_count": int(
                (row or {}).get("independent_posting_count") or 0
            ),
            "independent_company_count": int(
                (row or {}).get("independent_company_count") or 0
            ),
        }

    def candidate_evidence(
        self, candidate_id: str, dataset_version: str
    ) -> dict[str, int]:
        """후보 하나만 센 두 수. 묶음이 후보 하나인 경우와 같다."""
        return self.group_evidence((candidate_id,), dataset_version)

    _CANDIDATE_MENTION_COUNTS = """
        SELECT cm.candidate_id, count(*) AS mention_count
        FROM requirement_candidate_mentions cm
        JOIN requirement_mentions m ON m.mention_id = cm.mention_id
        WHERE cm.candidate_id = ANY(%(candidate_ids)s)
          AND m.dataset_version = %(dataset_version)s
        GROUP BY cm.candidate_id
    """
    """후보마다 붙은 근거 mention 수.

    묶음의 대표 후보를 고르는 데 쓴다. 독립 공고 수가 아니라 mention 수인 이유는
    대표를 고르는 일이 심사가 아니기 때문이다. 임계값을 견주는 수는 묶음 전체에서
    한 번 세고(`group_evidence`), 이 수는 같은 묶음 안에서 누구의 근거가 가장 두꺼운지
    만 가른다.
    """

    def candidate_mention_counts(
        self, candidate_ids: Sequence[str], dataset_version: str
    ) -> dict[str, int]:
        """후보별 근거 mention 수. 근거가 없는 후보는 목록에 없다."""
        if not candidate_ids:
            return {}
        rows = self.unit.fetch_all(
            self._CANDIDATE_MENTION_COUNTS,
            {
                "candidate_ids": list(candidate_ids),
                "dataset_version": dataset_version,
            },
        )
        return {row["candidate_id"]: int(row["mention_count"]) for row in rows}

    _REPRESENTATIVE_SENTENCES = """
        SELECT m.raw_expression
        FROM requirement_candidate_mentions cm
        JOIN requirement_mentions m ON m.mention_id = cm.mention_id
        JOIN posting_versions pv ON pv.posting_version_id = m.posting_version_id
        WHERE cm.candidate_id = %(candidate_id)s
          AND m.dataset_version = %(dataset_version)s
        ORDER BY m.mention_id
        LIMIT %(limit)s
    """
    """결정 행에 남길 대표 문장.

    `mention_id` 로 정렬해 재실행이 같은 문장을 고르게 한다. 전량을 담지 않는다.
    결정 행은 근거를 읽을 만큼만 담고 원문의 자리는 `requirement_mentions` 가
    가진다.
    """

    def representative_sentences(
        self, candidate_id: str, dataset_version: str, limit: int
    ) -> list[str]:
        rows = self.unit.fetch_all(
            self._REPRESENTATIVE_SENTENCES,
            {
                "candidate_id": candidate_id,
                "dataset_version": dataset_version,
                "limit": limit,
            },
        )
        return [row["raw_expression"] for row in rows]

    # ------------------------------------------------------------ 평가 세트
    _EXPECTED_DIMENSION_LABELS = """
        SELECT s.eval_set_id, i.expected_value
        FROM evaluation_expected_items i
        JOIN evaluation_cases c ON c.case_id = i.case_id
        JOIN evaluation_sets s ON s.eval_set_id = c.eval_set_id
        WHERE s.job_role_id = %(job_role_id)s
          AND c.case_type = %(case_type)s
        ORDER BY s.eval_set_id, i.expected_id
    """
    """평가 세트의 기대 차원 라벨.

    기대 차원은 분류체계 버전과 독립적인 사람 기준이며 라벨 문자열로 적힌다
    (docs/erd.md 13장). 승격 심사가 이 목록과 후보 라벨을 대조한다.

    통계 분석 에이전트의 읽기 범위에 평가 세트가 있다
    (docs/permission-matrix.md 4장). 쓰기는 평가 실행기의 몫이며 이 저장소는 읽기만
    한다.
    """

    def expected_dimension_labels(self, job_role_id: str) -> dict[str, Any]:
        """대조에 쓸 기대 차원 라벨과 그 세트.

        세트가 여럿이면 라벨을 합치고 세트 식별자는 첫 세트를 적는다. 대조 결과는
        어느 라벨과 맞았는지를 담으므로 세트를 나눠 적을 필요가 없다.
        """
        rows = self.unit.fetch_all(
            self._EXPECTED_DIMENSION_LABELS,
            {"job_role_id": job_role_id, "case_type": DIMENSION_ASSIGNMENT},
        )
        labels: dict[str, None] = {}
        eval_set_id: str | None = None
        for row in rows:
            eval_set_id = eval_set_id or row["eval_set_id"]
            value = row["expected_value"] or {}
            for label in value.get("dimension_labels", ()):
                labels.setdefault(str(label), None)
        return {"eval_set_id": eval_set_id, "labels": tuple(labels)}

    # ------------------------------------------------------------ 결정
    def add_decision(self, values: dict[str, Any]) -> None:
        """승격 결정 한 줄. 컬럼은 docs/erd.md 7.9 다.

        `representative_sentences` 와 `eval_set_comparison` 은 jsonb 다.
        """
        row = dict(values)
        row["representative_sentences"] = _jsonb(
            row.get("representative_sentences") or []
        )
        row["eval_set_comparison"] = _jsonb(row.get("eval_set_comparison"))
        self.unit.insert("requirement_candidate_decisions", row)

    def set_candidate_lifecycle(self, candidate_id: str, lifecycle_status: str) -> None:
        """후보의 생명주기 상태를 옮긴다.

        전이가 허용되는지는 `taxonomy/lifecycle.py` 가 먼저 가른다. 데이터베이스의
        CHECK 는 값의 집합만 강제하고 차례를 강제하지 않는다.
        """
        self.unit.update(
            "requirement_candidates",
            {"lifecycle_status": lifecycle_status},
            "candidate_id = %(candidate_id)s",
            {"candidate_id": candidate_id},
        )

    # ------------------------------------------------------------ 버전 발행
    _SUPERSEDE_ACTIVE = (
        "taxonomy_id = %(taxonomy_id)s "
        "AND published_at IS NOT NULL AND superseded_at IS NULL"
    )
    """supersede 대상. 활성 버전을 고르는 조건을 부분 유니크 인덱스와 같게 둔다."""

    def publish_version(self, values: dict[str, Any], published_at: Any) -> int:
        """새 분류체계 버전을 발행한다.

        이전 활성 버전의 `superseded_at` 을 먼저 채우고 새 행을 넣는다. 차례가
        의미를 갖는다. 부분 유니크 인덱스가 분류체계마다 활성 행 하나만 허용하므로
        (docs/erd.md 7.2) 반대로 하면 삽입이 제약 위반으로 실패한다.

        두 문장은 한 거래 안에 있다. 거래가 중간에 끊기면 둘 다 되돌아가고, 이전
        버전이 supersede 된 채 새 버전이 없는 상태가 남지 않는다.

        돌려주는 값은 supersede 한 이전 활성 버전의 수다. 첫 발행이면 0 이다.
        """
        superseded = self.unit.update(
            "requirement_taxonomy_versions",
            {"superseded_at": published_at},
            self._SUPERSEDE_ACTIVE,
            {"taxonomy_id": values["taxonomy_id"]},
        )
        self.unit.insert("requirement_taxonomy_versions", dict(values))
        return superseded

    def next_version_number(self, taxonomy_id: str) -> int:
        """다음 `version_number`. `UNIQUE (taxonomy_id, version_number)` 를 채운다."""
        current = self.unit.fetch_value(
            """
            SELECT max(version_number) FROM requirement_taxonomy_versions
            WHERE taxonomy_id = %s
            """,
            (taxonomy_id,),
        )
        return int(current or 0) + 1

    # ------------------------------------------------------------ 승계 원본
    _DIMENSION_VERSIONS = """
        SELECT dv.dimension_id, dv.internal_canonical_label, dv.display_label,
               dv.definition, dv.lifecycle_status, dv.standard_mapping_status,
               dv.standard_id, dv.mapping_confidence, dv.mapping_evidence,
               dv.review_status, dv.role_boundary_eligible
        FROM requirement_dimension_versions dv
        WHERE dv.taxonomy_version_id = %(taxonomy_version_id)s
        ORDER BY dv.dimension_id
    """
    """이전 버전의 차원 행. 새 버전으로 승계할 원본이다.

    `requirement_dimension_versions` 는 `(dimension_id, taxonomy_version_id)` 가
    UNIQUE 이므로 버전마다 행이 하나씩 있어야 한다(docs/erd.md 7.4). 새 버전에 행을
    만들지 않은 차원은 활성 어휘에서 사라진다.
    """

    def dimension_versions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._DIMENSION_VERSIONS, {"taxonomy_version_id": taxonomy_version_id}
        )

    def aliases(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        """이전 버전의 별칭. 승계하지 않으면 기지 추출이 표기 변형을 놓친다."""
        return self.unit.fetch_all(
            """
            SELECT dimension_id, alias_text, alias_source
            FROM requirement_aliases
            WHERE taxonomy_version_id = %s
            ORDER BY alias_text
            """,
            (taxonomy_version_id,),
        )

    def relations(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        """이전 버전의 차원 관계."""
        return self.unit.fetch_all(
            """
            SELECT src_dimension_id, dst_dimension_id, relation_type
            FROM requirement_dimension_relations
            WHERE taxonomy_version_id = %s
            ORDER BY src_dimension_id, dst_dimension_id, relation_type
            """,
            (taxonomy_version_id,),
        )

    # ------------------------------------------------------------ 분류체계 내용
    def add_dimension(self, values: dict[str, Any]) -> None:
        """차원의 정체성. 컬럼은 docs/erd.md 7.3 이다.

        라벨이 바뀌어도 이 행은 그대로다. 버전별 라벨과 생명주기는
        `requirement_dimension_versions` 가 갖는다.
        """
        self.unit.insert("requirement_dimensions", dict(values))

    def add_dimension_version(self, values: dict[str, Any]) -> None:
        """차원의 버전별 라벨과 생명주기. 컬럼은 docs/erd.md 7.4 다.

        `mapping_evidence` 는 jsonb 다.
        """
        row = dict(values)
        row["mapping_evidence"] = _jsonb(row.get("mapping_evidence"))
        self.unit.insert("requirement_dimension_versions", row)

    def add_alias(self, values: dict[str, Any]) -> None:
        """차원의 다른 표기. 컬럼은 docs/erd.md 7.5 다."""
        self.unit.insert("requirement_aliases", dict(values))

    def add_relation(self, values: dict[str, Any]) -> None:
        """차원 사이의 관계. 컬럼은 docs/erd.md 7.6 이다."""
        self.unit.insert("requirement_dimension_relations", dict(values))

    def dimension_count(self, taxonomy_version_id: str) -> int:
        return self.unit.fetch_value(
            """
            SELECT count(*) FROM requirement_dimension_versions
            WHERE taxonomy_version_id = %s
            """,
            (taxonomy_version_id,),
        )
