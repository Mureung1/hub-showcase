"""역량별 깊이 프로파일 저장소.

집계 파이프라인이 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장이며 컬럼은
docs/erd.md 10.6 이다. 판정과 합치는 규칙은 `metrics/depth_profile.py` 가 갖고, 이
모듈은 조회와 저장만 한다.

읽는 표는 역량과 차원 연결(docs/erd.md 7.10·7.11), 저장된 지표 행(같은 문서 10.5), 지표
정책(같은 문서 10.3)이다. `capabilities` 와 `capability_dimension_links` 는 D3b 가 쓰는
표이므로(`domain/permissions.py` 의 `_WRITE_SCOPE[Component.AGENT_KNOWLEDGE]`) 이
저장소는 읽기만 한다.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import Any

from psycopg.types.json import Jsonb

from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository

DEPTH_FAMILY = "depth_distribution"
"""프로파일의 입력이 되는 지표 family(docs/metric-spec.md 3.3)."""


def _jsonb(value: Any) -> Jsonb | None:
    """jsonb 컬럼에 넣을 값. 래퍼가 타입을 명시하므로 text 로 추론되지 않는다."""
    return None if value is None else Jsonb(value)


def _profile_values(values: dict[str, Any]) -> dict[str, Any]:
    """프로파일 한 줄을 넣을 수 있는 모양으로 손질한다.

    한 줄씩 넣는 경로와 묶어 넣는 경로가 같은 손질을 쓰게 한자리에 둔다.
    """
    row = dict(values)
    row["depth_distribution"] = _jsonb(row.get("depth_distribution"))
    row["evidence_support"] = _jsonb(row.get("evidence_support"))
    return row


class DepthProfileRepository(Repository):
    """`capability_depth_profiles` 의 저장소.

    쓰기 주체는 집계 파이프라인이다. 근거는 docs/permission-matrix.md 3장이고 코드의
    정의는 `domain/permissions.py` 의 `_WRITE_SCOPE[Component.PIPE_AGGREGATE]` 다.
    `saturation_observations` 를 쓰는 구성요소가 다르므로 두 표는 같은 거래에서
    쓰지 않는다.
    """

    component = Component.PIPE_AGGREGATE

    # ------------------------------------------------------------ 역량
    _CAPABILITIES = """
        SELECT capability_id, canonical_label
        FROM capabilities
        WHERE job_role_id = %(job_role_id)s
          AND is_active
        ORDER BY capability_id
    """
    """직무의 활성 역량(docs/erd.md 7.10).

    냉시작에서는 빈 목록이며 그 상태가 정상 시작점이다. 역량은 D3b 가 채우고 프로파일은
    D4 산출물이므로(docs/knowledge-schema.md 8.6), 역량이 없으면 만들 프로파일이 없다.
    """

    def capabilities(self, job_role_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._CAPABILITIES, {"job_role_id": job_role_id})

    _CAPABILITY_LINKS = """
        SELECT capability_id, dimension_id
        FROM capability_dimension_links
        WHERE taxonomy_version_id = %(taxonomy_version_id)s
        ORDER BY capability_id, dimension_id
    """
    """역량과 차원의 연결(docs/erd.md 7.11).

    기본키가 `(capability_id, dimension_id, taxonomy_version_id)` 이므로 한 역량에 차원이
    여럿 붙는다. 분류체계 버전으로 좁혀 읽어 다른 버전의 연결이 섞이지 않게 한다.
    """

    def capability_dimension_links(
        self, taxonomy_version_id: str
    ) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._CAPABILITY_LINKS, {"taxonomy_version_id": taxonomy_version_id}
        )

    # ------------------------------------------------------------ 입력 지표
    _DEPTH_POLICY = """
        SELECT metric_policy_version, metric_family, formula_version,
               minimum_n, minimum_n_comparison,
               suppression_policy, uncertainty_method
        FROM metric_policy_versions
        WHERE metric_family = %(metric_family)s
          AND effective_from::date <= %(as_of_date)s
        ORDER BY effective_from DESC, metric_policy_version
        LIMIT 1
    """
    """실행 시점에 유효한 `depth_distribution` 정책(docs/erd.md 10.3).

    최소 표본과 억제 정책은 코드 상수가 아니라 이 표의 행이다(docs/metric-spec.md 6장).
    프로파일의 표본 판정이 입력 지표의 판정과 같은 임계값을 써야 하므로 같은 family 의
    행을 읽는다. 같은 발효 시각이 둘이면 `metric_policy_version` 의 사전 순이 가른다.
    """

    def depth_policy(self, as_of_date: date) -> dict[str, Any] | None:
        return self.unit.fetch_one(
            self._DEPTH_POLICY,
            {"metric_family": DEPTH_FAMILY, "as_of_date": as_of_date},
        )

    _DEPTH_FACTS = """
        SELECT scope_level, scope_id, entry_segment, period_id,
               dimension_id, measure, numerator, denominator
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
          AND metric_family = %(metric_family)s
          AND dimension_id IS NOT NULL
          AND numerator IS NOT NULL
          AND denominator IS NOT NULL
          AND (%(period_ids)s::text[] IS NULL
               OR period_id = ANY(%(period_ids)s::text[]))
        ORDER BY scope_level, scope_id, entry_segment, period_id,
                 dimension_id, measure
    """
    """저장된 `depth_distribution` 행(docs/erd.md 10.5).

    프로파일은 지표를 다시 세지 않고 저장된 행에서 만든다. 다시 세면 그 사이에 적재가
    늘었을 때 화면의 `depth_distribution` 과 프로파일이 서로 다른 분모를 갖는다.

    값이 억제된 행도 읽는다. 억제는 `value` 만 비우고 `numerator` 와 `denominator` 는
    남기므로(docs/metric-spec.md 2.4) 카운트가 그대로 있다. 프로파일의 표본 판정은 합친
    분모로 다시 하며, 그 판정이 저장 여부를 정한다.
    """

    def depth_facts(
        self, analysis_version: str, period_ids: Sequence[str] | None = None
    ) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._DEPTH_FACTS,
            {
                "analysis_version": analysis_version,
                "metric_family": DEPTH_FAMILY,
                "period_ids": list(period_ids) if period_ids is not None else None,
            },
        )

    # ------------------------------------------------------------ 증분 판정
    _EXISTING_PROFILES = """
        SELECT capability_id, scope_level, scope_id, entry_segment, period_id
        FROM capability_depth_profiles
        WHERE analysis_version = %(analysis_version)s
    """
    """이 분석 버전에 이미 있는 프로파일.

    조건을 `capability_depth_profiles_scope_unique` 와 같게 둔다(docs/erd.md 10.6,
    `0009_entry_segment_axis.sql`). 같은 프로파일을 다시 만들지 않으므로 실행을 나눠
    돌려도 앞으로만 나아가고, 새 분석 버전에서는 집합이 비어 전량이 대상이 된다.
    """

    def existing_profile_keys(self, analysis_version: str) -> set[tuple[str, ...]]:
        rows = self.unit.fetch_all(
            self._EXISTING_PROFILES, {"analysis_version": analysis_version}
        )
        return {
            (
                row["capability_id"],
                row["scope_level"],
                row["scope_id"],
                row["entry_segment"],
                row["period_id"],
            )
            for row in rows
        }

    # ------------------------------------------------------------ 저장
    def add_profile(self, values: dict[str, Any]) -> None:
        """프로파일 한 줄. 컬럼은 docs/erd.md 10.6 이다.

        `depth_distribution` 과 `evidence_support` 는 jsonb 이므로 래퍼를 씌운다.
        """
        self.unit.insert("capability_depth_profiles", _profile_values(values))

    def add_profiles(self, rows: Sequence[dict[str, Any]]) -> None:
        """프로파일 여러 줄을 `VALUES` 목록 하나로 넣는다.

        손질은 `add_profile` 과 같은 함수가 한다. 묶음 저장이 실패하면 같은 행을 한 줄씩
        다시 넣으므로(`repositories/base.py` 의 `insert_in_batches`) 두 경로의 손질이
        갈리면 다시 넣은 행만 jsonb 가 text 로 추론된다.
        """
        self.unit.insert_many(
            "capability_depth_profiles", [_profile_values(row) for row in rows]
        )

    def profile_count(self, analysis_version: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM capability_depth_profiles "
            "WHERE analysis_version = %s",
            (analysis_version,),
        )


__all__ = ["DEPTH_FAMILY", "DepthProfileRepository"]
