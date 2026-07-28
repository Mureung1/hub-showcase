"""표현과 차원의 할당 저장소.

통계 분석 에이전트가 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장이며,
컬럼은 docs/erd.md 7.13 이다.

할당 대상은 언제나 채용공고의 표현이다. 모집단이 `posting_versions` 이므로
공고로 등록되지 않은 출처의 표현은 어떤 지표의 분모에도 들어가지 못한다.
근거는 docs/metric-spec.md 2.1 이다. 분류체계는 직무마다 하나이므로
(docs/erd.md 7.1) 대상을 직무로 제한한다.

읽는 것과 쓰는 것을 분류체계 버전으로 함께 좁힌다. 집계의 키가
`dimension_id` 와 `taxonomy_version_id` 이고 버전이 다른 할당을 섞어 집계하지
않으므로(docs/statistics-model.md 3.5), 증분 판정도 버전 안에서만 성립한다.
"""

from __future__ import annotations

from typing import Any

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository


class AssignmentRepository(Repository):
    """할당 실행의 저장소.

    `posting_requirement_assignments` 가 이 구성요소의 쓰기 범위에 있다. 근거는
    docs/permission-matrix.md 3장이고 코드의 정의는
    `domain/permissions.py` 의 `_WRITE_SCOPE[Component.AGENT_STATS]` 다.
    """

    component = Component.AGENT_STATS

    # ------------------------------------------------------------ 활성 분류체계
    # `active_taxonomy_version` 과 `_ACTIVE_TAXONOMY` 는 `Repository` 가 갖는다.

    _ACTIVE_DIMENSIONS = """
        SELECT d.dimension_id, d.dimension_kind, dv.internal_canonical_label,
               dv.display_label, dv.definition
        FROM requirement_dimension_versions dv
        JOIN requirement_dimensions d ON d.dimension_id = dv.dimension_id
        WHERE dv.taxonomy_version_id = %(taxonomy_version_id)s
          AND dv.lifecycle_status = 'active'
        ORDER BY d.dimension_id
    """
    """할당할 수 있는 차원.

    `lifecycle_status` 가 `active` 인 행만 고른다. 근거는 docs/erd.md 7.4 와
    docs/statistics-model.md 3.3 이며, 승격 전 후보에 할당하면 심사를 거치지 않은
    차원이 집계에 들어간다. 냉시작에서는 빈 목록이며 그 상태가 정상 시작점이다.
    """

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._ACTIVE_DIMENSIONS, {"taxonomy_version_id": taxonomy_version_id}
        )

    _ACTIVE_ALIASES = """
        SELECT a.alias_id, a.dimension_id, a.alias_text, a.alias_source
        FROM requirement_aliases a
        JOIN requirement_dimension_versions dv
          ON dv.dimension_id = a.dimension_id
         AND dv.taxonomy_version_id = a.taxonomy_version_id
        WHERE a.taxonomy_version_id = %(taxonomy_version_id)s
          AND dv.lifecycle_status = 'active'
        ORDER BY a.alias_text
    """
    """활성 차원의 별칭. 별칭 정확 일치 방법이 대조하는 표현이다.

    별칭은 분류체계 버전 안에서 하나의 표현이 한 차원에만 붙는다
    (docs/erd.md 7.5). 차원 버전과 함께 조인해 활성이 아닌 차원의 별칭이 어휘에
    들어가지 않게 한다.
    """

    def active_aliases(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._ACTIVE_ALIASES, {"taxonomy_version_id": taxonomy_version_id}
        )

    # ------------------------------------------------------------ 할당 대상
    _MENTIONS_TO_ASSIGN = """
        SELECT m.mention_id, m.raw_expression, m.posting_version_id, m.section,
               m.stated_requiredness
        FROM requirement_mentions m
        JOIN posting_versions pv ON pv.posting_version_id = m.posting_version_id
        JOIN postings p ON p.posting_id = pv.posting_id
        WHERE m.dataset_version = %(dataset_version)s
          AND p.job_role_id = %(job_role_id)s
          AND NOT EXISTS (
                SELECT 1 FROM posting_requirement_assignments a
                WHERE a.mention_id = m.mention_id
                  AND a.taxonomy_version_id = %(taxonomy_version_id)s
              )
        ORDER BY m.mention_id
    """
    """할당에 걸 요구 표현. 이 버전에 아직 할당이 없는 것만.

    공고를 안쪽 조인으로 묶어 A 계층 자료만 남긴다. 집계가 A 계층만 쓰므로
    (docs/data-strategy.md 3장) 다른 계층의 표현을 할당해도 어떤 분모에도 들어가지
    못한다.

    `NOT EXISTS` 가 `LIMIT` 앞에 있어야 한다. `LIMIT` 이 먼저 자르면 이미 할당된
    표현이 그 안을 채우고, 같은 `--limit` 으로 다시 돌려도 전부 건너뛰기만 하고
    아무것도 진행하지 않는다. 조건은 `assigned_mentions()` 와 같다. 분류체계
    버전으로 좁히므로 새 버전에서는 아무것도 빠지지 않고 전량이 대상이 된다.

    `mention_id` 로 정렬한다. 식별자가 결정적이므로(`mention_identifier`) 이 정렬은
    적재 순서와 무관하게 같은 순서를 준다.
    """

    def mentions_to_assign(
        self,
        dataset_version: str,
        job_role_id: str,
        taxonomy_version_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        """할당 실행의 입력.

        `taxonomy_version_id` 는 증분 판정의 기준이다. 이 버전에 이미 할당이 있는
        표현은 조회가 먼저 빼고, 이전 버전의 할당은 조건에 걸리지 않는다.

        `limit` 은 남은 mention 수를 자르므로 나눠 돌려도 실행마다 앞으로 나아간다.
        재할당도 자를 수 있으나 자른 실행 하나가 재할당의 완료를 뜻하지는 않는다
        (docs/statistics-model.md 3.5).
        """
        sql = self._MENTIONS_TO_ASSIGN
        params: dict[str, Any] = {
            "dataset_version": dataset_version,
            "job_role_id": job_role_id,
            "taxonomy_version_id": taxonomy_version_id,
        }
        if limit is not None:
            sql = f"{sql}        LIMIT %(limit)s\n"
            params["limit"] = limit
        return self.unit.fetch_all(sql, params)

    _ASSIGNED_MENTIONS = """
        SELECT a.mention_id
        FROM posting_requirement_assignments a
        JOIN requirement_mentions m ON m.mention_id = a.mention_id
        WHERE m.dataset_version = %(dataset_version)s
          AND a.taxonomy_version_id = %(taxonomy_version_id)s
    """
    """이 분류체계 버전에서 이미 할당된 mention.

    `posting_requirement_assignments` 는 데이터셋 버전을 갖지 않으므로
    (docs/erd.md 7.13) mention 을 거쳐 범위를 좁힌다. 증분 재실행이 이 집합에서
    갈리고, `UNIQUE (mention_id, taxonomy_version_id)` 가 중복 삽입을 막는다.

    버전으로 좁히는 것이 재할당의 전제다. 새 버전에서는 이 집합이 비어 있어 전량이
    대상이 되고, 이전 버전의 행은 조건에 걸리지 않아 그대로 남는다.
    """

    def assigned_mentions(
        self, dataset_version: str, taxonomy_version_id: str
    ) -> set[str]:
        """이 버전에서 이미 할당된 mention. 다시 할당하지 않는다.

        `_MENTIONS_TO_ASSIGN` 이 같은 조건을 이미 걸었으므로 정상 경로에서 이
        집합에 걸리는 mention 은 없다. 두 실행이 겹칠 때의 방어선으로 남긴다.
        """
        rows = self.unit.fetch_all(
            self._ASSIGNED_MENTIONS,
            {
                "dataset_version": dataset_version,
                "taxonomy_version_id": taxonomy_version_id,
            },
        )
        return {r["mention_id"] for r in rows}

    # ------------------------------------------------------------ 할당
    def add_assignment(self, values: dict[str, Any]) -> None:
        """할당 한 줄. 컬럼은 docs/erd.md 7.13 이다.

        `mention_id` 와 `taxonomy_version_id` 가 함께 UNIQUE 이므로 한 mention 은
        분류체계 버전당 하나의 차원에만 붙는다. 지표의 중복 제거가 이 제약에
        의존한다.
        """
        self.unit.insert("posting_requirement_assignments", dict(values))

    def assignment_count(self, taxonomy_version_id: str) -> int:
        return self.unit.fetch_value(
            """
            SELECT count(*) FROM posting_requirement_assignments
            WHERE taxonomy_version_id = %s
            """,
            (taxonomy_version_id,),
        )
