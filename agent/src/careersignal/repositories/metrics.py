"""지표 집계 저장소.

집계 파이프라인이 사용한다. 쓰기 범위는 docs/permission-matrix.md 3장이며 컬럼은
docs/erd.md 10.5 다. 수치를 저장하는 경로는 이 구성요소 하나다
(docs/permission-matrix.md 3장).

읽는 표는 D3a 할당, 기준 표, 정책 표다(docs/permission-matrix.md 4장).
`metric_templates`·`metric_policy_versions`·`dimension_metric_applicability` 는
운영자가 마이그레이션과 시드로 관리하며 어떤 구성요소도 쓰지 않으므로
(`domain/permissions.py` 의 `OPERATOR_ONLY_TABLES`) 이 저장소에 쓰기 메서드를 두지
않는다.

집계 문장은 `metrics/families.py` 의 조각을 조립해 만든다. 조각마다 그 조인과 중복
제거의 근거가 붙어 있고, 이 모듈은 조각을 문장으로 세워 실행하는 일만 한다. 정의와
실행을 나누면 SQL 을 실행하지 않고도 정의를 검사할 수 있다.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import Any

from psycopg.types.json import Jsonb

from careersignal.domain.depth import DepthLevel
from careersignal.domain.permissions import Component
from careersignal.domain.sampling import MetricPolicy, SampleStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntryLabel, EntrySegment
from careersignal.metrics import families
from careersignal.metrics.verification import (
    AssignmentRow,
    ClusterMembership,
    FactAudit,
    PopulationSpec,
    PopulationUnit,
    StoredFact,
    VersionContext,
)
from careersignal.repositories.base import Repository, Unit
from careersignal.taxonomy.requiredness import Requiredness


def _jsonb(value: Any) -> Jsonb | None:
    """jsonb 컬럼에 넣을 값. 래퍼가 타입을 명시하므로 text 로 추론되지 않는다."""
    return None if value is None else Jsonb(value)


def _fact_values(values: dict[str, Any]) -> dict[str, Any]:
    """`statistics_facts` 한 줄을 넣을 수 있는 모양으로 손질한다.

    한 줄씩 넣는 경로와 묶어 넣는 경로가 같은 손질을 쓰게 한자리에 둔다.
    """
    row = dict(values)
    row["uncertainty"] = _jsonb(row.get("uncertainty"))
    return row


def _statement(*parts: str) -> str:
    """`WITH` 절과 `SELECT` 를 한 문장으로 세운다.

    앞부분은 CTE 이고 마지막이 `SELECT` 다. 조각을 문자열로 잇는 것이지 값이나 식별자를
    끼워 넣지 않으므로 주입 경로가 되지 않는다. 모든 값은 이름 있는 자리표시자다.
    """
    *ctes, select = parts
    return "WITH\n" + ",\n".join(ctes) + "\n" + select


class MetricRepository(Repository):
    """지표 집계의 저장소.

    `statistics_facts` 가 이 구성요소의 쓰기 범위에 있다. 근거는
    docs/permission-matrix.md 3장이고 코드의 정의는 `domain/permissions.py` 의
    `_WRITE_SCOPE[Component.PIPE_AGGREGATE]` 다.
    """

    component = Component.PIPE_AGGREGATE

    # ------------------------------------------------------------ 활성 분류체계
    # `active_taxonomy_version` 과 `_ACTIVE_TAXONOMY` 는 `Repository` 가 갖는다.
    # 집계가 보는 활성 버전은 할당이 쓴 것과 같은 행이어야 하므로 조회를 한 벌로 둔다.

    _METRIC_TEMPLATES = """
        SELECT metric_family, formula_version, input_arity, output_unit
        FROM metric_templates
        ORDER BY metric_family, formula_version
    """
    """활성 지표 템플릿(docs/erd.md 10.1).

    실행 조합 전개의 첫 축이다(docs/statistics-model.md 6장). 목록을 코드에 고정하지
    않는 이유는 수식 버전이 표의 행이기 때문이다. 새 `formula_version` 을 시드로 더하면
    전개가 그 버전도 함께 돈다.
    """

    def metric_templates(self) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._METRIC_TEMPLATES)

    _EFFECTIVE_POLICIES = """
        SELECT DISTINCT ON (metric_family)
               metric_policy_version, metric_family, formula_version,
               minimum_n, minimum_n_comparison,
               suppression_policy, uncertainty_method
        FROM metric_policy_versions
        WHERE effective_from::date <= %(as_of_date)s
        ORDER BY metric_family, effective_from DESC, metric_policy_version
    """
    """family 마다 실행 시점에 유효한 지표 정책(docs/erd.md 10.3).

    최소 표본, 억제 정책, 불확실성 방법은 코드 상수가 아니라 이 표의 행이다
    (docs/metric-spec.md 6장). 정책이 바뀌면 새 버전을 발행하고 이전 결과를 보존하므로
    family 마다 행이 여럿일 수 있고, 실행은 `as_of_date` 기준으로 가장 최근에 발효된
    하나를 쓴다.

    `effective_from` 을 날짜로 잘라 견준다. 컬럼이 `timestamptz` 이고 시드가 `now()` 로
    넣으므로, 실행 봉투의 `as_of_date`(날짜)를 그대로 견주면 같은 날 발행한 정책이
    자정 이후 시각이라는 이유로 빠진다.

    `DISTINCT ON` 뒤의 `ORDER BY` 가 `metric_family` 로 시작해야 한다. 같은 발효 시각이
    둘이면 `metric_policy_version` 의 사전 순이 가르므로 실행마다 같은 행을 고른다.
    """

    def effective_policies(self, as_of_date: date) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._EFFECTIVE_POLICIES, {"as_of_date": as_of_date}
        )

    _METRIC_POLICY_ROWS = """
        SELECT metric_policy_version, metric_family, formula_version,
               minimum_n, minimum_n_comparison,
               suppression_policy, uncertainty_method, effective_from
        FROM metric_policy_versions
        WHERE (%(metric_family)s::text IS NULL
               OR metric_family = %(metric_family)s)
        ORDER BY metric_family, effective_from, metric_policy_version
    """
    """지표 정책 행 전량(docs/erd.md 10.3).

    `effective_policies` 와 다르다. 그쪽은 실행 시점에 유효한 행 하나를 family 마다
    고르고, 이쪽은 발효 시각을 자르지 않은 목록을 그대로 준다. 고르는 규칙을
    `metrics/policy.py` 의 `select_policy` 가 갖는 자리에서 쓴다. 두 곳이 같은 규칙을
    각자 적으면 시간 연산자와 집계가 서로 다른 정책으로 판정할 수 있다.

    `effective_from` 을 함께 읽는다. 고르는 축이 그 값이므로 빠지면 `select_policy` 가
    버전 이름의 사전 순으로만 고른다.
    """

    def metric_policy_rows(
        self, metric_family: str | None = None
    ) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._METRIC_POLICY_ROWS, {"metric_family": metric_family}
        )

    _PERIOD_ROWS = """
        SELECT period_id, label, starts_on, ends_on, is_baseline
        FROM periods
        ORDER BY starts_on, period_id
    """
    """기간 정의 전량(docs/erd.md 3.5).

    `periods` 는 식별자만 주고 이쪽은 정의를 준다. 시간 연산자가 어느 기간이 앞이고
    뒤인지를 식별자가 아니라 `starts_on`·`ends_on` 으로 정하므로
    (`metrics/temporal.py`) 날짜가 함께 와야 한다.
    """

    def period_rows(self) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._PERIOD_ROWS)

    _FACTS_FOR_PERIODS = """
        SELECT metric_family, measure, metric_policy_version,
               scope_level, scope_id, entry_segment, period_id,
               dimension_id, secondary_dimension_id,
               numerator, denominator, value, sample_size, sample_status
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
          AND metric_family = %(metric_family)s
          AND period_id = ANY(%(period_ids)s::text[])
        ORDER BY period_id, measure, scope_level, scope_id, entry_segment,
                 dimension_id, secondary_dimension_id
    """
    """시간 연산자의 입력이 되는 지표 행(docs/erd.md 10.5).

    컬럼을 `metrics/temporal.py` 의 `MetricPoint` 와 같은 집합으로 둔다. 그 모델이
    `extra="forbid"` 이므로 컬럼을 더하면 변환이 멈춘다. `fact_id` 와
    `analysis_version` 은 델타의 정체성에 들어가지 않으므로 읽지 않는다.

    기간을 배열로 받는다. 두 기간의 행을 한 조회로 가져와야 같은 시점의 저장 상태를
    견준다.
    """

    def facts_for_periods(
        self,
        analysis_version: str,
        metric_family: str,
        period_ids: Sequence[str],
    ) -> list[dict[str, Any]]:
        if not period_ids:
            return []
        return self.unit.fetch_all(
            self._FACTS_FOR_PERIODS,
            {
                "analysis_version": analysis_version,
                "metric_family": metric_family,
                "period_ids": list(period_ids),
            },
        )

    _ACTIVE_DIMENSIONS = """
        SELECT dv.dimension_id, dv.role_boundary_eligible
        FROM requirement_dimension_versions dv
        WHERE dv.taxonomy_version_id = %(taxonomy_version_id)s
          AND dv.lifecycle_status = 'active'
        ORDER BY dv.dimension_id
    """
    """집계에 넣을 차원(docs/metric-spec.md 2.3).

    `lifecycle_status` 가 `active` 가 아닌 차원은 집계에 포함하지 않는다. 냉시작에서는
    빈 목록이며 그 상태가 정상 시작점이다. 그때는 계산할 조합이 없다.

    `role_boundary_eligible` 을 함께 읽는다. `scope_expansion` 의 대상이 이 값으로
    정해지고 분류체계 버전마다 다시 판정되므로(docs/metric-spec.md 3.6) 차원 목록과 같은
    조회에서 나와야 두 값이 어긋나지 않는다.
    """

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._ACTIVE_DIMENSIONS, {"taxonomy_version_id": taxonomy_version_id}
        )

    _APPLICABILITY = """
        SELECT dimension_id, metric_family, applicable
        FROM dimension_metric_applicability
        WHERE taxonomy_version_id = %(taxonomy_version_id)s
        ORDER BY dimension_id, metric_family
    """
    """차원과 지표의 적용 가능성(docs/erd.md 10.4).

    분류체계 버전별로 기록한다. `applicable` 이 거짓인 조합은 계산하지 않으며, 계산된
    행이 있으면 검증에서 차단한다(docs/metric-spec.md 5장). 읽기만 한다.
    """

    def applicability(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return self.unit.fetch_all(
            self._APPLICABILITY, {"taxonomy_version_id": taxonomy_version_id}
        )

    _PERIODS = """
        SELECT period_id
        FROM periods
        ORDER BY starts_on, period_id
    """
    """통계의 기간 축(docs/erd.md 3.5).

    기간을 코드에 적지 않고 표에서 읽는다. 기간 정의를 수정하지 않고 새 `period_id` 를
    더해 확장하므로, 이 조회가 늘어난 기간을 그대로 전개에 넣는다.
    """

    def periods(self) -> list[str]:
        return [row["period_id"] for row in self.unit.fetch_all(self._PERIODS)]

    _CLUSTER_SCOPES = """
        SELECT DISTINCT m.cluster_id
        FROM company_cluster_memberships m
        JOIN postings p ON p.company_id = m.company_id
        JOIN posting_versions pv ON pv.posting_id = p.posting_id
        WHERE p.job_role_id = %(job_role_id)s
          AND pv.dataset_version = %(dataset_version)s
          AND m.valid_from <= %(as_of_date)s
          AND (m.valid_to IS NULL OR m.valid_to >= %(as_of_date)s)
        ORDER BY m.cluster_id
    """
    """이 데이터셋에 공고가 있는 기업군(docs/statistics-model.md 5.2).

    기업군 범위의 모집단은 `company_cluster_memberships` 를 실행 봉투의 `as_of_date`
    기준으로 해석해 확정한다. 공고 버전은 기업군을 속성으로 갖지 않으므로
    (docs/erd.md 4.6) 회사를 거쳐 소속을 푼다.

    공고가 하나도 없는 기업군은 빼다. 분모가 0 인 조합을 전개해도 `not_computable` 행만
    쌓이고, 그 행은 이 데이터셋에 그 기업군이 없다는 사실을 되풀이할 뿐이다.
    """

    def cluster_scopes(
        self, job_role_id: str, dataset_version: str, as_of_date: date
    ) -> list[str]:
        rows = self.unit.fetch_all(
            self._CLUSTER_SCOPES,
            {
                "job_role_id": job_role_id,
                "dataset_version": dataset_version,
                "as_of_date": as_of_date,
            },
        )
        return [row["cluster_id"] for row in rows]

    # ------------------------------------------------------------ 증분 판정
    _EXISTING_FACTS = """
        SELECT metric_family, measure, scope_level, scope_id, entry_segment,
               period_id,
               COALESCE(dimension_id, '')           AS dimension_id,
               COALESCE(secondary_dimension_id, '') AS secondary_dimension_id
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
    """
    """이 분석 버전에 이미 있는 지표 행.

    증분 재실행이 이 집합에서 갈린다. 조건을 `idx_statistics_facts_unique` 와 같게 두고
    NULL 을 같은 방식으로 접는다(docs/erd.md 10.5). 같은 조합을 다시 계산하지 않으므로
    실행을 나눠 돌려도 앞으로만 나아간다.

    분석 버전으로 좁히는 것이 재계산의 전제다. 새 분석 버전에서는 이 집합이 비어 있어
    전량이 대상이 되고, 이전 버전의 행은 조건에 걸리지 않아 그대로 남는다. 정책 버전이
    다른 수치를 비교하지 않으므로(docs/metric-spec.md 6장) 옛 행을 지우지 않는다.
    """

    def existing_fact_keys(self, analysis_version: str) -> set[tuple[str, ...]]:
        rows = self.unit.fetch_all(
            self._EXISTING_FACTS, {"analysis_version": analysis_version}
        )
        return {
            (
                row["metric_family"],
                row["measure"],
                row["scope_level"],
                row["scope_id"],
                row["entry_segment"],
                row["period_id"],
                row["dimension_id"],
                row["secondary_dimension_id"],
            )
            for row in rows
        }

    _PREVALENCE_FACTS = """
        SELECT dimension_id, numerator, denominator
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
          AND metric_family = 'posting_prevalence'
          AND measure = 'ratio'
          AND scope_level = %(scope_level)s
          AND scope_id = %(scope_id)s
          AND entry_segment = %(entry_segment)s
          AND period_id = %(period_id)s
          AND dimension_id IS NOT NULL
        ORDER BY dimension_id
    """
    """봉투 하나의 `posting_prevalence` 결과.

    차원 쌍의 전개가 이 값으로 대상을 자르고(docs/metric-spec.md 5장),
    `cluster_contrast` 가 직무 전체 값을 여기서 읽는다(같은 문서 3.4).

    이번 실행이 방금 만든 행과 이전 실행이 남긴 행을 함께 본다. 증분 재실행에서
    `posting_prevalence` 를 건너뛰어도 쌍의 대상과 기준선이 달라지지 않아야 하므로,
    메모리에 쌓은 값이 아니라 저장된 행을 다시 읽는다.
    """

    def prevalence_facts(
        self,
        analysis_version: str,
        scope_level: str,
        scope_id: str,
        entry_segment: str,
        period_id: str,
    ) -> dict[str, tuple[int, int]]:
        """차원마다 `(분자, 분모)`. 값이 비어 있는 행은 빼다."""
        rows = self.unit.fetch_all(
            self._PREVALENCE_FACTS,
            {
                "analysis_version": analysis_version,
                "scope_level": scope_level,
                "scope_id": scope_id,
                "entry_segment": entry_segment,
                "period_id": period_id,
            },
        )
        return {
            row["dimension_id"]: (int(row["numerator"]), int(row["denominator"]))
            for row in rows
            if row["numerator"] is not None and row["denominator"] is not None
        }

    # ------------------------------------------------------------ 집계
    # 차원 축을 갖는 네 문장은 봉투 하나에 한 번만 보낸다. 조합마다 보내면 조회 수가
    # `지표 × 차원 × 범위 × 대상군 × 기간` 이 되고, 왕복 하나가 수십 밀리초인 원격
    # 저장소에서는 그 왕복이 집계 시간의 거의 전부가 된다. 묶는 축은 `dimension_id` 이며
    # 조인·중복 제거·모집단 조건은 `metrics/families.py` 의 조각 그대로다.

    _PREVALENCE_BY_DIMENSION = _statement(
        families.POPULATION_CTE,
        families.ASSIGNED_CTE,
        families.DIMENSION_LIST_CTE,
        families.PREVALENCE_GROUPED_SELECT,
    )
    """봉투 하나의 `posting_prevalence` 카운트 전량. 정의는 docs/metric-spec.md 3.1 이다.

    차원마다 한 행이며 할당이 없는 차원도 분자 0 으로 나온다. 분모는 모집단 크기라
    차원과 무관하므로 행마다 같은 값이다.
    """

    _REQUIREDNESS_BY_DIMENSION = _statement(
        families.POPULATION_CTE,
        families.ASSIGNED_CTE,
        families.DIMENSION_LIST_CTE,
        families.REQUIREDNESS_GROUPED_SELECT,
    )
    """봉투 하나의 `requiredness_ratio` 카운트 전량. 정의는 docs/metric-spec.md 3.2 다."""

    _DEPTH_BY_DIMENSION = _statement(
        families.POPULATION_CTE,
        families.ASSIGNED_CTE,
        families.DIMENSION_LIST_CTE,
        families.DEPTH_RANK_GROUPED_CTE,
        families.DEPTH_GROUPED_SELECT,
    )
    """봉투 하나의 `depth_distribution` 카운트 전량. 정의는 docs/metric-spec.md 3.3 이다.

    대표 등급을 고르는 `ranked` 를 차원까지 묶어 세운다. 차원을 묶음에 넣지 않으면 서로
    다른 차원의 깊이가 한 공고에서 섞인다.
    """

    _COOCCURRENCE_PAIRS = _statement(
        families.POPULATION_CTE,
        families.ASSIGNED_CTE,
        families.DIMENSION_LIST_CTE,
        families.COOCCURRENCE_PAIR_MEMBERS_CTE,
        families.COOCCURRENCE_PAIR_SELECT,
    )
    """봉투 하나의 `cooccurrence` 쌍별 교집합 크기. 정의는 docs/metric-spec.md 3.5 다.

    쌍마다 문장을 보내지 않는다. 쌍은 차원 수의 제곱으로 늘어 상한이 만 단위이므로
    이쪽이 조합 수로는 가장 큰 축이다. 대상 차원의 소속을 한 번 세운 뒤 자기 자신과 이어
    쌍 전부를 한 문장으로 센다.

    교집합이 0 인 쌍은 행이 없다. `n_a`·`n_b`·`n_total` 은 같은 봉투의
    `_PREVALENCE_BY_DIMENSION` 결과가 이미 갖고 있으므로 여기서 세지 않는다.
    """

    _SCOPE_EXPANSION = _statement(
        families.POPULATION_CTE,
        families.ASSIGNED_CTE,
        families.SCOPE_EXPANSION_SELECT,
    )
    """`scope_expansion` 의 카운트. 정의는 docs/metric-spec.md 3.6 이다."""

    _ADVANCED_SIGNAL = _statement(
        families.POPULATION_CTE,
        families.ASSIGNED_CTE,
        families.ADVANCED_SIGNAL_SELECT,
    )
    """`entry_label_advanced_signal_rate` 의 카운트. 정의는 docs/metric-spec.md 3.7 이다."""

    def prevalence_counts_by_dimension(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """`dimension_ids` 마다 한 행. 차례는 차원 식별자 순서다."""
        return self.unit.fetch_all(self._PREVALENCE_BY_DIMENSION, params)

    def requiredness_counts_by_dimension(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._REQUIREDNESS_BY_DIMENSION, params)

    def depth_counts_by_dimension(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        return self.unit.fetch_all(self._DEPTH_BY_DIMENSION, params)

    def cooccurrence_pair_counts(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """교집합이 있는 쌍만 돌려준다. 없는 쌍의 `n_ab` 는 0 이다."""
        return self.unit.fetch_all(self._COOCCURRENCE_PAIRS, params)

    def scope_expansion_counts(self, params: dict[str, Any]) -> dict[str, Any]:
        return self.unit.fetch_one(self._SCOPE_EXPANSION, params) or {}

    def advanced_signal_counts(self, params: dict[str, Any]) -> dict[str, Any]:
        return self.unit.fetch_one(self._ADVANCED_SIGNAL, params) or {}

    # ------------------------------------------------------------ 저장
    def add_fact(self, values: dict[str, Any]) -> None:
        """지표 한 줄. 컬럼은 docs/erd.md 10.5 다.

        `uncertainty` 는 jsonb 이므로 래퍼를 씌운다. 값이 없으면 NULL 이며,
        `count` 와 `difference` 를 산출하는 measure 가 여기에 해당한다
        (docs/metric-spec.md 2.5).
        """
        self.unit.insert("statistics_facts", _fact_values(values))

    def add_facts(self, rows: Sequence[dict[str, Any]]) -> None:
        """지표 여러 줄을 `VALUES` 목록 하나로 넣는다.

        손질은 `add_fact` 와 같은 함수가 한다. 묶음 저장이 실패하면 같은 행을 한 줄씩
        다시 넣으므로(`repositories/base.py` 의 `insert_in_batches`) 두 경로의 손질이
        갈리면 다시 넣은 행만 jsonb 가 text 로 추론된다.
        """
        self.unit.insert_many(
            "statistics_facts", [_fact_values(row) for row in rows]
        )

    def fact_count(self, analysis_version: str) -> int:
        return self.unit.fetch_value(
            "SELECT count(*) FROM statistics_facts WHERE analysis_version = %s",
            (analysis_version,),
        )


class StatisticsAuditRepository(Repository):
    """수치 검증이 대조할 재료를 공급한다.

    `verification/checks/statistics.py` 의 `StatisticsReader` 를 만족한다. 판정은
    `metrics/verification.py` 의 순수 함수가 하고 이 저장소는 읽기만 한다.

    거래가 검증 파이프라인의 것이다. 검증은 전 표를 읽고(docs/permission-matrix.md
    4장) 어떤 표에도 이 경로로 쓰지 않는다. 집계 저장소와 나누는 이유는 거래마다
    role 이 하나이기 때문이다. 검증을 집계 거래에서 돌리면 검사가 집계의 쓰기 권한을
    함께 들고 다닌다.

    집계 질의를 재사용하지 않는다. 저장값은 `POPULATION_CTE` 와 `ASSIGNED_CTE` 의
    조인이 만들었고, 이 저장소는 그 조건을 걸지 않은 원자 행을 그대로 실어 보낸다.
    같은 질의를 두 번 실행하면 대조가 자기 자신을 견주게 되어 조인 조건이 틀려도
    양쪽이 똑같이 틀린다. 모집단 조건·중복 제거·활성 분류체계 조건은 판정 함수가
    파이썬에서 처음부터 다시 적용한다.
    """

    component = Component.PIPE_VERIFY

    def __init__(self, unit: Unit, as_of_date: date | None = None) -> None:
        """`as_of_date` 는 기업군 소속을 해석하는 기준일이다.

        집계가 실행 봉투의 `as_of_date` 로 소속을 확정하므로
        (docs/statistics-model.md 5.2) 검증도 같은 날짜를 써야 같은 모집단이 나온다.
        `statistics_facts` 에 그 날짜를 담는 컬럼이 없어 호출자가 넘긴다. 넘기지
        않으면 기간의 마지막 날을 쓴다. 기간이 끝난 뒤 소속이 바뀐 경우에만 두 값이
        갈리며, 그때는 기업군 범위의 분모가 어긋난 것으로 보고된다.
        """
        super().__init__(unit)
        self._as_of_date = as_of_date
        self._candidates: dict[tuple[str, str], tuple[PopulationUnit, ...]] = {}
        self._assignments: dict[tuple[str, str], tuple[AssignmentRow, ...]] = {}
        self._flags: dict[str, dict[tuple[str, str], bool]] = {}
        self._effective: dict[str, str] = {}
        """실행 하나가 되풀이해 읽지 않도록 원자 행을 거래 안에서 기억한다.

        `fact_ids` 가 분석 버전의 행 전부를 주므로 행마다 같은 공고 버전 목록을 다시
        읽으면 조회 수가 행 수만큼 늘어난다. 거래 하나 안에서 원천 표가 바뀌지 않으므로
        기억한 값과 다시 읽은 값이 다를 수 없다.
        """

        self._versions: dict[str, dict[str, Any] | None] = {}
        self._periods: dict[str, dict[str, Any] | None] = {}
        self._policies: dict[str, dict[str, Any] | None] = {}
        """행마다 같은 값이 나오는 기준 행을 식별자로 기억한다.

        분석 버전은 산출물 전체가 하나를 공유하고, 기간은 몇 개이며, 정책은 지표
        family 수만큼이다. 행마다 다시 읽으면 조회 수가 행 수의 세 배가 된다.

        거래 하나 안에서 값이 바뀌지 않는다. `analysis_versions`·`periods`·
        `metric_policy_versions` 는 검증 역할이 쓰지 못하는 표이고
        (docs/permission-matrix.md 3장·4장), 앞의 두 표는 실행 봉투가 이미 고정한
        행이며 정책 표는 운영자만 마이그레이션으로 바꾼다(`OPERATOR_ONLY_TABLES`).
        따라서 기억한 값과 다시 읽은 값이 다를 수 없다. 저장소 인스턴스가 거래
        하나보다 오래 살지 않으므로 캐시의 수명도 거래를 넘지 않는다.

        찾지 못한 식별자도 `None` 으로 기억한다. 없는 것을 되묻는 것도 왕복이다.
        """

        self._baselines: dict[
            str, dict[tuple[str, str, str], tuple[int | None, int | None]]
        ] = {}
        self._delta_index: dict[
            str, dict[tuple[str, ...], list[tuple[Any, str, StoredFact]]]
        ] = {}
        """`cluster_contrast` 기준선과 `temporal_delta` 입력의 색인.

        분석 버전 하나를 한 번에 읽어 두고 행마다 사전에서 찾는다. 둘 다 저장된 행을
        읽는 것이 정의이므로 색인이 재계산의 재사용이 되지 않는다. 해당 family 의 행이
        나올 때까지 만들지 않는다.
        """

    # ------------------------------------------------------------ 대상
    _FACT_IDS = """
        SELECT fact_id
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
        ORDER BY fact_id
    """
    """검사할 지표 행. 분석 버전 하나의 집계 산출물 전체다."""

    def fact_ids(self, analysis_version: str) -> list[str]:
        return [
            row["fact_id"]
            for row in self.unit.fetch_all(
                self._FACT_IDS, {"analysis_version": analysis_version}
            )
        ]

    _FACT_COUNT = """
        SELECT count(*) AS fact_count
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
    """
    """검사 대상 행 수. 검사한 수와 남은 수를 판정에 적기 위해 먼저 센다."""

    def fact_count(self, analysis_version: str) -> int:
        """분석 버전의 지표 행 수. 한도를 건 실행이 남은 수를 적을 수 있게 한다."""
        row = self.unit.fetch_one(
            self._FACT_COUNT, {"analysis_version": analysis_version}
        )
        return 0 if row is None else int(row["fact_count"])

    _FACT_COLUMNS = """
        fact_id, analysis_version, metric_family, measure,
        metric_policy_version, scope_level, scope_id, entry_segment,
        period_id, dimension_id, secondary_dimension_id,
        numerator, denominator, value, sample_size, sample_status
    """
    """대조에 쓰는 컬럼. 한 행을 읽는 문장과 묶어 읽는 문장이 같은 목록을 쓴다."""

    _FACT_COLUMNS_QUALIFIED = ",\n        ".join(
        f"f.{column.strip()}" for column in _FACT_COLUMNS.split(",")
    )
    """같은 목록에 별칭을 붙인 것. `periods` 와 조인하면 `period_id` 가 겹친다."""

    _FACT = f"""
        SELECT {_FACT_COLUMNS}
        FROM statistics_facts
        WHERE fact_id = %(fact_id)s
    """

    _FACT_PAGE = f"""
        SELECT {_FACT_COLUMNS}
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
          AND fact_id > %(after)s
        ORDER BY fact_id
        LIMIT %(size)s
    """
    """묶음 하나. 앞 묶음의 마지막 식별자보다 큰 행을 식별자 순서로 집는다.

    `OFFSET` 을 쓰지 않는다. 뒷 묶음일수록 건너뛰는 행이 늘어 같은 표를 되풀이해
    훑는다. `fact_id` 가 기본 키이므로 마지막 값 다음부터 집으면 묶음마다 같은 비용이다.

    `fact_ids` 로 식별자를 모은 뒤 행을 하나씩 읽지 않는다. 행 하나마다 왕복이 하나
    붙어 원격 저장소에서는 그 왕복이 검증 시간의 거의 전부가 된다.
    """

    _ANALYSIS_VERSION = """
        SELECT job_role_id, dataset_version, taxonomy_version_id,
               metric_policy_version
        FROM analysis_versions
        WHERE analysis_version = %(analysis_version)s
    """
    """행이 속한 실행이 고정한 버전(docs/erd.md 11.1).

    `statistics_facts` 는 분류체계 버전을 컬럼으로 갖지 않으므로 버전 일치 검사가 이
    행을 본다(docs/statistics-model.md 10장).
    """

    _PERIOD = """
        SELECT period_id, starts_on, ends_on
        FROM periods
        WHERE period_id = %(period_id)s
    """

    _POLICY = """
        SELECT metric_family, formula_version, minimum_n, minimum_n_comparison
        FROM metric_policy_versions
        WHERE metric_policy_version = %(metric_policy_version)s
    """
    """행이 선언한 정책. 표본 판정을 이 임계값으로 다시 한다."""

    _EFFECTIVE_POLICIES = """
        SELECT DISTINCT ON (metric_family)
               metric_family, metric_policy_version
        FROM metric_policy_versions
        WHERE effective_from::date <= %(as_of_date)s
        ORDER BY metric_family, effective_from DESC, metric_policy_version
    """
    """family 마다 실행 시점에 유효한 정책 버전.

    버전 일치 검사가 대조할 기대값이다. `analysis_versions.metric_policy_version` 은
    단일 값인데 `metric_policy_versions` 는 family 마다 행이므로(docs/erd.md 10.3·11.1)
    분석 버전의 한 값과 견주면 그 family 를 뺀 모든 행이 위반으로 판정된다. 집계가 각
    family 의 유효 정책으로 판정하므로 검증도 같은 축으로 견준다.

    `effective_policies`(집계용)와 같은 규칙으로 고른다. 두 곳이 다른 행을 고르면
    검증이 집계와 다른 임계값을 기대한다.
    """

    _CANDIDATES = """
        SELECT pv.posting_version_id, pv.posting_id, p.company_id,
               p.job_role_id, pv.dataset_version,
               pv.posted_at::date AS posted_on, pv.entry_label
        FROM posting_versions pv
        JOIN postings p ON p.posting_id = pv.posting_id
        WHERE p.job_role_id = %(job_role_id)s
          AND pv.dataset_version = %(dataset_version)s
          AND pv.posted_at IS NOT NULL
        ORDER BY pv.posting_version_id
    """
    """모집단 후보. 직무와 데이터셋 버전까지만 좁힌다.

    기간·범위·대상군 조건을 걸지 않는다. 그 세 조건을 다시 적용하는 것이 검증의
    일이며, 여기서 미리 걸면 저장값을 만든 조건을 그대로 베끼는 것이 된다.

    기업군 소속을 조인하지 않는다. 한 회사가 여러 기업군에 속할 수 있어
    (docs/erd.md 3.4) 조인하면 같은 공고 버전이 여러 행이 되고, 중복 제거 검사가
    조회가 부풀린 행을 집계의 결함으로 읽는다. 소속은 따로 읽어 회사별로 붙인다.

    `posted_at` 이 없는 공고 버전은 뺀다. 어떤 기간의 `BETWEEN` 에도 들지 않아 모든
    모집단에서 빠지므로, 재계산에 넣어도 제외 사유만 늘린다.
    """

    _MEMBERSHIPS = """
        SELECT DISTINCT m.company_id, m.cluster_id, m.valid_from, m.valid_to
        FROM company_cluster_memberships m
        JOIN postings p ON p.company_id = m.company_id
        WHERE p.job_role_id = %(job_role_id)s
        ORDER BY m.company_id, m.cluster_id, m.valid_from
    """
    """회사별 기업군 소속. 유효 구간을 해석하지 않고 그대로 싣는다.

    기준일로 푸는 것은 판정 함수의 몫이다(`ClusterMembership.holds_on`). 저장소가
    풀어서 주면 집계와 같은 시점 조건을 두 번 쓰게 되어 그 조건이 틀려도 드러나지
    않는다.
    """

    _ASSIGNMENTS = """
        SELECT rm.posting_version_id, a.dimension_id, a.taxonomy_version_id,
               a.requiredness, a.depth_level,
               dv.lifecycle_status, dv.role_boundary_eligible
        FROM requirement_mentions rm
        JOIN posting_versions pv
          ON pv.posting_version_id = rm.posting_version_id
        JOIN postings p ON p.posting_id = pv.posting_id
        JOIN posting_requirement_assignments a ON a.mention_id = rm.mention_id
        LEFT JOIN requirement_dimension_versions dv
          ON dv.dimension_id = a.dimension_id
         AND dv.taxonomy_version_id = a.taxonomy_version_id
        WHERE p.job_role_id = %(job_role_id)s
          AND pv.dataset_version = %(dataset_version)s
        ORDER BY rm.posting_version_id, a.dimension_id, a.taxonomy_version_id
    """
    """차원 할당. 분류체계 버전과 생명주기로 거르지 않는다.

    활성 분류체계 조건(docs/metric-spec.md 2.3)을 판정 함수가 다시 적용한다. 여기서
    걸면 승격 전 후보의 할당이 집계에 섞였는지를 검증이 볼 수 없다.

    `DISTINCT` 를 쓰지 않는다. 한 공고 버전에서 같은 차원이 여러 mention 으로 나타난
    상태가 그대로 와야 중복 제거 검사가 부풀린 수를 재현할 수 있다.

    `requirement_dimension_versions` 를 바깥 조인으로 붙인다. 판이 없는 할당도 행으로
    남겨야 그 사실이 검증에 드러난다. 안쪽 조인이면 조용히 사라진다.
    """

    _APPLICABLE_FLAGS = """
        SELECT dimension_id, metric_family, applicable
        FROM dimension_metric_applicability
        WHERE taxonomy_version_id = %(taxonomy_version_id)s
    """

    _BASELINE_PREVALENCES = """
        SELECT entry_segment, period_id, dimension_id, numerator, denominator
        FROM statistics_facts
        WHERE analysis_version = %(analysis_version)s
          AND metric_family = 'posting_prevalence'
          AND measure = 'ratio'
          AND scope_level = 'overall'
          AND dimension_id IS NOT NULL
    """
    """`cluster_contrast` 가 견주는 직무 전체 값(docs/metric-spec.md 3.4).

    직무 전체 값은 같은 분석 버전의 `posting_prevalence` 행에서 조회한다고 명세가
    정한다. 저장된 행을 읽는 것이 정의이므로 이 조회는 재계산의 재사용이 아니다.

    행마다 하나씩 찾지 않고 분석 버전의 기준선 전체를 한 번에 읽는다. 기준선 수는
    (대상군 × 기간 × 차원) 이라 `cluster_contrast` 행 수보다 기업군 수만큼 적다.
    """

    _BASE_FACTS_FOR_DELTA = f"""
        SELECT {_FACT_COLUMNS_QUALIFIED}, pd.starts_on
        FROM statistics_facts f
        JOIN periods pd ON pd.period_id = f.period_id
        WHERE f.analysis_version = %(analysis_version)s
          AND f.metric_family <> 'temporal_delta'
        ORDER BY f.metric_family, f.measure, f.scope_level, f.scope_id,
                 f.entry_segment, COALESCE(f.dimension_id, ''),
                 COALESCE(f.secondary_dimension_id, ''),
                 pd.starts_on, f.period_id
    """
    """`temporal_delta` 가 뺀 두 기준값의 재료.

    델타 행은 나중 기간에 달리고 앞 기간을 컬럼으로 담지 않는다(docs/erd.md 10.5).
    앞 기간은 같은 정체성의 기준 지표 행 가운데 나중 기간 바로 앞의 것으로 정한다.
    `metrics/temporal.py` 가 기간의 앞뒤를 `starts_on` 으로 정하는 것과 같은 축이며,
    실행도 잇닿은 기간끼리만 델타를 만든다.

    델타 행마다 두 줄을 찾아 읽지 않고 기준 지표 행 전체를 한 번에 읽어 정체성별로
    묶는다. 정렬을 `starts_on` 오름차순으로 두므로 어느 기간의 바로 앞 행은 그 기간
    이하의 마지막 두 항목이다. 앞선 문장이 `starts_on DESC, period_id DESC` 로 두
    줄을 집던 것과 같은 차례다.

    `COALESCE` 로 NULL 을 접는 것은 `idx_statistics_facts_unique` 와 같은 방식이다.
    `temporal_delta` 는 기준 지표가 될 수 없어 뺀다. `measure` 가
    `<base_metric>__<measure>` 이므로 델타의 기준 family 는 언제나 델타가 아니다.
    """

    # ------------------------------------------------------------ 대조 재료
    def fact_audit(self, fact_id: str) -> FactAudit | None:
        """행 하나를 대조하는 데 필요한 재료를 모은다. 행이 없으면 비운다.

        모으기만 하고 판정하지 않는다. 어느 조건이 어긋났는지는
        `metrics/verification.py` 의 여섯 검사가 정한다.
        """
        row = self.unit.fetch_one(self._FACT, {"fact_id": fact_id})
        if row is None:
            return None
        return self._audit(_stored_fact(row))

    def fact_audit_page(
        self, analysis_version: str, after: str, size: int
    ) -> list[tuple[str, FactAudit | None]]:
        """식별자 `after` 다음의 지표 행을 `size` 개까지 읽어 재료로 옮긴다.

        돌려주는 항목은 `(fact_id, 재료)` 이고 차례는 식별자 순서다. 기준 행을 찾지
        못한 행은 재료 자리를 비워 둔다. 그 사실을 검사가 판정으로 옮기며, 저장소가
        조용히 빼면 검사하지 않은 행이 통과로 읽힌다.

        받은 항목 수가 `size` 보다 적으면 그 묶음이 마지막이다.
        """
        rows = self.unit.fetch_all(
            self._FACT_PAGE,
            {"analysis_version": analysis_version, "after": after, "size": size},
        )
        page: list[tuple[str, FactAudit | None]] = []
        for row in rows:
            fact = _stored_fact(row)
            page.append((fact.fact_id, self._audit(fact)))
        return page

    def _audit(self, fact: StoredFact) -> FactAudit | None:
        """읽어 온 지표 행 하나를 대조 재료로 옮긴다. 기준 행이 없으면 비운다."""
        version = self._version_row(fact.analysis_version)
        period = self._period_row(fact.period_id)
        policy_row = self._policy_row(fact.metric_policy_version)
        if version is None or period is None or policy_row is None:
            return None

        job_role_id = str(version["job_role_id"])
        dataset_version = str(version["dataset_version"])
        taxonomy_version_id = str(version["taxonomy_version_id"])
        as_of_date = self._as_of_date or period["ends_on"]

        spec = PopulationSpec(
            job_role_id=job_role_id,
            dataset_version=dataset_version,
            scope_level=fact.scope_level,
            scope_id=(
                job_role_id
                if fact.scope_level is ScopeLevel.OVERALL
                else fact.scope_id
            ),
            period_starts_on=period["starts_on"],
            period_ends_on=period["ends_on"],
            entry_segment=fact.entry_segment,
            as_of_date=as_of_date,
            period_id=fact.period_id,
        )
        context = VersionContext(
            analysis_version=fact.analysis_version,
            dataset_version=dataset_version,
            taxonomy_version_id=taxonomy_version_id,
            metric_policy_version=self._expected_policy_version(fact, as_of_date)
            or str(version["metric_policy_version"]),
        )
        baseline_numerator, baseline_denominator = self._baseline(fact)
        return FactAudit(
            fact=fact,
            spec=spec,
            context=context,
            policy=MetricPolicy(
                metric_family=fact.metric_family,
                formula_version=str(policy_row["formula_version"]),
                minimum_n=int(policy_row["minimum_n"]),
                minimum_n_comparison=int(policy_row["minimum_n_comparison"]),
            ),
            declared_taxonomy_version_id=taxonomy_version_id,
            candidates=self._population(job_role_id, dataset_version),
            assignments=self._assignment_rows(job_role_id, dataset_version),
            applicable_flags=self._applicable(taxonomy_version_id),
            baseline_denominator=baseline_denominator,
            baseline_prevalence=(
                None
                if baseline_numerator is None or not baseline_denominator
                else baseline_numerator / baseline_denominator
            ),
            temporal_inputs=self._temporal_inputs(fact),
        )

    def _version_row(self, analysis_version: str) -> dict[str, Any] | None:
        """실행이 고정한 버전 행. 산출물 전체가 같은 값을 본다."""
        if analysis_version not in self._versions:
            self._versions[analysis_version] = self.unit.fetch_one(
                self._ANALYSIS_VERSION, {"analysis_version": analysis_version}
            )
        return self._versions[analysis_version]

    def _period_row(self, period_id: str) -> dict[str, Any] | None:
        """기간 행. 기간 수만큼만 읽는다."""
        if period_id not in self._periods:
            self._periods[period_id] = self.unit.fetch_one(
                self._PERIOD, {"period_id": period_id}
            )
        return self._periods[period_id]

    def _policy_row(self, metric_policy_version: str) -> dict[str, Any] | None:
        """정책 행. 지표 family 수만큼만 읽는다."""
        if metric_policy_version not in self._policies:
            self._policies[metric_policy_version] = self.unit.fetch_one(
                self._POLICY, {"metric_policy_version": metric_policy_version}
            )
        return self._policies[metric_policy_version]

    def _expected_policy_version(
        self, fact: StoredFact, as_of_date: date
    ) -> str | None:
        """이 행이 선언해야 할 정책 버전. 판정하지 않고 기대값만 고른다.

        `temporal_delta` 는 전용 정책 행이 없다(docs/metric-spec.md 4장·6장). 델타의
        신뢰도는 두 입력의 신뢰도에 좌우되므로 기준 지표의 정책이 그 자리이며,
        `measure` 의 `<base_metric>__<measure>` 에서 기준 지표를 읽는다. 실행도 같은
        규칙으로 저장한다.
        """
        family = fact.metric_family
        if family == "temporal_delta":
            family = fact.measure.partition("__")[0]
        if not self._effective:
            self._effective = {
                str(row["metric_family"]): str(row["metric_policy_version"])
                for row in self.unit.fetch_all(
                    self._EFFECTIVE_POLICIES, {"as_of_date": as_of_date}
                )
            }
        return self._effective.get(family)

    def _population(
        self, job_role_id: str, dataset_version: str
    ) -> tuple[PopulationUnit, ...]:
        key = (job_role_id, dataset_version)
        if key not in self._candidates:
            memberships: dict[str, list[ClusterMembership]] = {}
            for row in self.unit.fetch_all(
                self._MEMBERSHIPS, {"job_role_id": job_role_id}
            ):
                memberships.setdefault(str(row["company_id"]), []).append(
                    ClusterMembership(
                        cluster_id=str(row["cluster_id"]),
                        valid_from=row["valid_from"],
                        valid_to=row["valid_to"],
                    )
                )
            self._candidates[key] = tuple(
                PopulationUnit(
                    posting_version_id=str(row["posting_version_id"]),
                    posting_id=str(row["posting_id"]),
                    company_id=str(row["company_id"]),
                    job_role_id=str(row["job_role_id"]),
                    dataset_version=str(row["dataset_version"]),
                    posted_on=row["posted_on"],
                    entry_label=EntryLabel(str(row["entry_label"])),
                    memberships=tuple(
                        memberships.get(str(row["company_id"]), ())
                    ),
                )
                for row in self.unit.fetch_all(
                    self._CANDIDATES,
                    {"job_role_id": job_role_id, "dataset_version": dataset_version},
                )
            )
        return self._candidates[key]

    def _assignment_rows(
        self, job_role_id: str, dataset_version: str
    ) -> tuple[AssignmentRow, ...]:
        key = (job_role_id, dataset_version)
        if key not in self._assignments:
            self._assignments[key] = tuple(
                AssignmentRow(
                    posting_version_id=str(row["posting_version_id"]),
                    dimension_id=str(row["dimension_id"]),
                    taxonomy_version_id=str(row["taxonomy_version_id"]),
                    requiredness=Requiredness(str(row["requiredness"])),
                    depth_level=(
                        None
                        if row["depth_level"] is None
                        else DepthLevel(str(row["depth_level"]))
                    ),
                    lifecycle_status=str(row["lifecycle_status"] or ""),
                    role_boundary_eligible=bool(row["role_boundary_eligible"]),
                )
                for row in self.unit.fetch_all(
                    self._ASSIGNMENTS,
                    {"job_role_id": job_role_id, "dataset_version": dataset_version},
                )
            )
        return self._assignments[key]

    def _applicable(self, taxonomy_version_id: str) -> dict[tuple[str, str], bool]:
        if taxonomy_version_id not in self._flags:
            self._flags[taxonomy_version_id] = {
                (str(row["dimension_id"]), str(row["metric_family"])): bool(
                    row["applicable"]
                )
                for row in self.unit.fetch_all(
                    self._APPLICABLE_FLAGS,
                    {"taxonomy_version_id": taxonomy_version_id},
                )
            }
        return self._flags[taxonomy_version_id]

    def _baseline(self, fact: StoredFact) -> tuple[int | None, int | None]:
        """`cluster_contrast` 의 직무 전체 분자·분모. 다른 지표는 둘 다 비운다."""
        if fact.metric_family != "cluster_contrast" or fact.dimension_id is None:
            return None, None
        index = self._baseline_index(fact.analysis_version)
        return index.get(
            (str(fact.entry_segment), fact.period_id, fact.dimension_id),
            (None, None),
        )

    def _baseline_index(
        self, analysis_version: str
    ) -> dict[tuple[str, str, str], tuple[int | None, int | None]]:
        """분석 버전의 기준선 전부. `cluster_contrast` 행이 나올 때 한 번 만든다."""
        if analysis_version not in self._baselines:
            self._baselines[analysis_version] = {
                (
                    str(row["entry_segment"]),
                    str(row["period_id"]),
                    str(row["dimension_id"]),
                ): (
                    None if row["numerator"] is None else int(row["numerator"]),
                    None if row["denominator"] is None else int(row["denominator"]),
                )
                for row in self.unit.fetch_all(
                    self._BASELINE_PREVALENCES,
                    {"analysis_version": analysis_version},
                )
            }
        return self._baselines[analysis_version]

    def _temporal_inputs(
        self, fact: StoredFact
    ) -> tuple[StoredFact, StoredFact] | None:
        """`temporal_delta` 가 뺀 두 기준값. 순서는 `(period_a, period_b)` 다."""
        if fact.metric_family != "temporal_delta":
            return None
        base_family, separator, base_measure = fact.measure.partition("__")
        if not separator:
            return None
        period = self._period_row(fact.period_id)
        if period is None:
            return None
        entries = self._delta_entries(fact.analysis_version).get(
            (
                base_family,
                base_measure,
                str(fact.scope_level),
                fact.scope_id,
                str(fact.entry_segment),
                fact.dimension_id or "",
                fact.secondary_dimension_id or "",
            ),
            [],
        )
        earlier = [
            entry for entry in entries if entry[0] <= period["starts_on"]
        ]
        if len(earlier) < 2:
            return None
        return earlier[-2][2], earlier[-1][2]

    def _delta_entries(
        self, analysis_version: str
    ) -> dict[tuple[str, ...], list[tuple[Any, str, StoredFact]]]:
        """정체성별 기준 지표 행. `temporal_delta` 행이 나올 때 한 번 만든다.

        항목은 `(starts_on, period_id, 저장값)` 이고 문장의 정렬이 오름차순이라 그대로
        담으면 기간 순서가 된다.
        """
        if analysis_version not in self._delta_index:
            index: dict[tuple[str, ...], list[tuple[Any, str, StoredFact]]] = {}
            for row in self.unit.fetch_all(
                self._BASE_FACTS_FOR_DELTA, {"analysis_version": analysis_version}
            ):
                stored = _stored_fact(row)
                key = (
                    stored.metric_family,
                    stored.measure,
                    str(stored.scope_level),
                    stored.scope_id,
                    str(stored.entry_segment),
                    stored.dimension_id or "",
                    stored.secondary_dimension_id or "",
                )
                index.setdefault(key, []).append(
                    (row["starts_on"], stored.period_id, stored)
                )
            for entries in index.values():
                entries.sort(key=lambda entry: (entry[0], entry[1]))
            self._delta_index[analysis_version] = index
        return self._delta_index[analysis_version]


def _stored_fact(row: dict[str, Any]) -> StoredFact:
    """`statistics_facts` 한 행을 대조할 값으로 옮긴다."""
    return StoredFact(
        fact_id=str(row["fact_id"]),
        analysis_version=str(row["analysis_version"]),
        metric_family=str(row["metric_family"]),
        measure=str(row["measure"]),
        metric_policy_version=str(row["metric_policy_version"]),
        scope_level=ScopeLevel(str(row["scope_level"])),
        scope_id=str(row["scope_id"]),
        entry_segment=EntrySegment(str(row["entry_segment"])),
        period_id=str(row["period_id"]),
        sample_size=int(row["sample_size"]),
        sample_status=SampleStatus(str(row["sample_status"])),
        dimension_id=(
            None if row["dimension_id"] is None else str(row["dimension_id"])
        ),
        secondary_dimension_id=(
            None
            if row["secondary_dimension_id"] is None
            else str(row["secondary_dimension_id"])
        ),
        numerator=None if row["numerator"] is None else int(row["numerator"]),
        denominator=None if row["denominator"] is None else int(row["denominator"]),
        value=None if row["value"] is None else float(row["value"]),
    )


__all__ = ["MetricRepository", "StatisticsAuditRepository"]
