"""표본 수렴 기록 저장소.

D3a 분류체계 에이전트가 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장이며 컬럼은
docs/erd.md 10.7 이다. 관측을 만드는 규칙은 `metrics/saturation.py` 가 갖고, 이 모듈은
누적 값을 세어 오고 행을 남기는 일만 한다.

`saturation_observations` 의 쓰기 주체는 `Component.AGENT_STATS` 이고
`capability_depth_profiles` 는 `Component.PIPE_AGGREGATE` 다
(`domain/permissions.py`). 거래마다 role 이 하나이므로 두 표를 한 거래에서 쓰지 않는다.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository


class SaturationRepository(Repository):
    """`saturation_observations` 의 저장소.

    쓰기 주체는 D3a 분류체계 에이전트다. 근거는 docs/permission-matrix.md 3장이고 코드의
    정의는 `domain/permissions.py` 의 `_WRITE_SCOPE[Component.AGENT_STATS]` 다.
    """

    component = Component.AGENT_STATS

    # ------------------------------------------------------------ 누적 값
    _POSTING_COUNT = """
        SELECT count(DISTINCT pv.posting_version_id) AS posting_count
        FROM posting_versions pv
        JOIN postings p ON p.posting_id = pv.posting_id
        LEFT JOIN company_cluster_memberships m
          ON %(cluster_id)s::text IS NOT NULL
         AND m.company_id = p.company_id
         AND m.cluster_id = %(cluster_id)s
         AND m.valid_from <= %(as_of_date)s
         AND (m.valid_to IS NULL OR m.valid_to >= %(as_of_date)s)
        WHERE p.job_role_id = %(job_role_id)s
          AND pv.dataset_version = %(dataset_version)s
          AND (%(cluster_id)s::text IS NULL OR m.company_id IS NOT NULL)
    """
    """범위의 누적 공고 버전 수.

    세는 단위가 `posting_version_id` 다. 모든 지표의 중복 제거 단위와 같아야
    (docs/metric-spec.md 2.2) 증가 곡선의 가로축과 지표의 분모가 같은 것을 센다.

    기업군 범위는 `company_cluster_memberships` 를 `as_of_date` 기준으로 해석해 확정한다.
    공고 버전은 기업군을 속성으로 갖지 않으므로(docs/erd.md 4.6) 회사를 거쳐 소속을 푼다.
    `cluster_id` 가 없으면 조인이 걸리지 않고 직무 전체를 센다.
    """

    def posting_count(
        self,
        job_role_id: str,
        dataset_version: str,
        as_of_date: date,
        cluster_id: str | None = None,
    ) -> int:
        return int(
            self.unit.fetch_value(
                self._POSTING_COUNT,
                {
                    "job_role_id": job_role_id,
                    "dataset_version": dataset_version,
                    "as_of_date": as_of_date,
                    "cluster_id": cluster_id,
                },
            )
            or 0
        )

    _CANDIDATE_TOTAL = """
        SELECT count(*) AS candidate_total
        FROM requirement_candidates c
        JOIN requirement_taxonomies t ON t.taxonomy_id = c.taxonomy_id
        WHERE t.job_role_id = %(job_role_id)s
    """
    """직무 분류체계의 누적 차원 후보 수(docs/erd.md 7.7).

    생명주기 상태로 거르지 않는다. 세는 것은 지금 살아 있는 후보가 아니라 지금까지 새로
    등장한 후보의 수이며, 기각된 후보도 한 번은 등장한 것이다.

    후보는 데이터셋 버전을 갖지 않으므로 직무로만 좁힌다. 관측의 계열이 분석 버전과
    범위로 갈리고, 신규 후보 수는 계열 안에서 앞선 관측과의 차이로 구한다.
    """

    def candidate_total(self, job_role_id: str) -> int:
        return int(
            self.unit.fetch_value(self._CANDIDATE_TOTAL, {"job_role_id": job_role_id})
            or 0
        )

    _DIMENSION_COUNT = """
        SELECT count(*) AS dimension_count
        FROM requirement_dimension_versions
        WHERE taxonomy_version_id = %(taxonomy_version_id)s
          AND lifecycle_status = 'active'
    """
    """활성 분류체계 버전의 차원 수(docs/erd.md 7.4).

    후보가 승격되어 어휘에 남은 결과이며, 후보 수와 함께 두면 발견과 승격이 각각 어디서
    멎는지가 갈린다.
    """

    def active_dimension_count(self, taxonomy_version_id: str) -> int:
        return int(
            self.unit.fetch_value(
                self._DIMENSION_COUNT, {"taxonomy_version_id": taxonomy_version_id}
            )
            or 0
        )

    # ------------------------------------------------------------ 증분 판정
    _SERIES_STATE = """
        SELECT count(*)                                  AS observation_count,
               COALESCE(max(posting_count), 0)           AS posting_count,
               COALESCE(sum(new_candidate_count), 0)     AS candidate_total,
               COALESCE(max(cumulative_dimension_count), 0) AS dimension_count
        FROM saturation_observations
        WHERE analysis_version = %(analysis_version)s
          AND job_role_id = %(job_role_id)s
          AND scope_id = %(scope_id)s
    """
    """같은 계열에 이미 남은 관측의 요약.

    누적 값은 줄지 않으므로 최댓값이 직전 상태다. 시각으로 정렬해 마지막 행을 고르지
    않는 이유는 같은 `observed_at` 을 갖는 행이 둘이면 어느 쪽을 고를지가 실행마다
    달라지기 때문이다.

    누적 후보 수는 합계다. 표가 관측마다의 신규 후보 수만 담으므로(docs/erd.md 10.7)
    지금까지 기록한 신규 후보를 모두 더한 값이 계열의 누적 후보 수다.
    """

    def series_state(
        self, analysis_version: str, job_role_id: str, scope_id: str
    ) -> dict[str, Any]:
        row = self.unit.fetch_one(
            self._SERIES_STATE,
            {
                "analysis_version": analysis_version,
                "job_role_id": job_role_id,
                "scope_id": scope_id,
            },
        )
        if row is None:
            return {
                "observation_count": 0,
                "posting_count": 0,
                "candidate_total": 0,
                "dimension_count": 0,
            }
        return {key: int(value) for key, value in row.items()}

    # ------------------------------------------------------------ 저장
    def add_observation(self, values: dict[str, Any]) -> None:
        """관측 한 줄. 컬럼은 docs/erd.md 10.7 이다.

        `marginal_gain` 은 NULL 을 허용한다. 첫 관측과 공고가 늘지 않은 관측은 증가량이
        성립하지 않으며, 그 상태를 0 으로 채우지 않는다.
        """
        self.unit.insert("saturation_observations", dict(values))

    def observation_count(self, analysis_version: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM saturation_observations "
            "WHERE analysis_version = %s",
            (analysis_version,),
        )


__all__ = ["SaturationRepository"]
