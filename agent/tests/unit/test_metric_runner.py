"""지표 집계 실행 검증.

규칙은 docs/statistics-model.md 5.1·6장, docs/metric-spec.md 3장·5장, 저장 자리는
docs/erd.md 10.5 에서 온다. 저장소를 대역으로 대체하고 조합 전개, 저장 규칙, 증분
재실행, 냉시작만 검사한다. 데이터베이스와 외부 호출은 하지 않는다.
"""

from __future__ import annotations

import re
from collections import Counter
from collections.abc import Sequence
from datetime import date
from typing import Any

import pytest

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.sampling import MetricPolicy, SampleStatus, classify
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.metrics import families
from careersignal.metrics.expansion import ARITY_BY_FAMILY, Envelope, MetricFamily
from careersignal.metrics.runner import (
    MISSING_DIMENSION_COUNT,
    NO_ACTIVE_TAXONOMY,
    TAXONOMY_MISMATCH,
    TRANSACTION_LOST,
    MeasurePoint,
    MetricAggregation,
    SampleVerdict,
    fact_identifier,
)
from careersignal.repositories.base import INSERT_BATCH_SIZE
from careersignal.repositories.metrics import MetricRepository

JOB_ROLE_ID = "backend"
TAXONOMY_VERSION_ID = "tx_backend_v1"
ANALYSIS_VERSION = "an_test"
DATASET_VERSION = "ds_test"
PERIOD = "y2026"
CLUSTER = "cluster_platform"
AS_OF = date(2026, 7, 1)

FACT_COLUMNS = {
    "fact_id",
    "analysis_version",
    "metric_family",
    "metric_policy_version",
    "scope_level",
    "scope_id",
    "entry_segment",
    "period_id",
    "dimension_id",
    "secondary_dimension_id",
    "measure",
    "numerator",
    "denominator",
    "value",
    "sample_size",
    "sample_status",
    "uncertainty",
}
"""docs/erd.md 10.5 의 컬럼. `created_at` 은 기본값이 채운다."""

DEFAULT_COUNTS: dict[str, dict[str, int]] = {
    str(MetricFamily.POSTING_PREVALENCE): {"numerator": 6, "denominator": 12},
    str(MetricFamily.REQUIREDNESS_RATIO): {"numerator": 4, "denominator": 6},
    str(MetricFamily.DEPTH_DISTRIBUTION): {
        "foundation": 3,
        "application": 2,
        "tradeoff": 1,
        "denominator": 6,
    },
    str(MetricFamily.SCOPE_EXPANSION): {"numerator": 2, "denominator": 12},
    str(MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE): {
        "numerator": 1,
        "denominator": 4,
    },
}
"""대역이 돌려주는 기본 카운트. 조합마다 같은 값을 준다."""

DEFAULT_PAIR_COUNT = 3
"""차원 쌍의 기본 교집합 크기.

`cooccurrence` 의 `n_a`·`n_b`·`n_total` 은 대역이 따로 돌려주지 않는다. 셋은 각각 두
차원의 `posting_prevalence` 분자와 그 분모이며, 실행이 같은 봉투의 유병률 카운트에서
읽는다(docs/metric-spec.md 3.5).
"""

AGGREGATION_STATEMENTS: tuple[str, ...] = (
    "_PREVALENCE_BY_DIMENSION",
    "_REQUIREDNESS_BY_DIMENSION",
    "_DEPTH_BY_DIMENSION",
    "_COOCCURRENCE_PAIRS",
    "_SCOPE_EXPANSION",
    "_ADVANCED_SIGNAL",
)
"""집계가 실행하는 문장. 자리표시자가 실행이 만드는 이름 안에 있어야 한다."""

DIMENSION_FAMILIES: tuple[MetricFamily, ...] = (
    MetricFamily.POSTING_PREVALENCE,
    MetricFamily.REQUIREDNESS_RATIO,
    MetricFamily.DEPTH_DISTRIBUTION,
)
"""차원별 묶음 조회를 갖는 family. 봉투 하나에 문장 하나다."""

ACTIVE_TAXONOMY: dict[str, Any] = {
    "taxonomy_version_id": TAXONOMY_VERSION_ID,
    "taxonomy_id": "tax_backend",
    "version_number": 1,
    "taxonomy_policy_version": "tp_v1",
}
"""`Repository.active_taxonomy_version` 이 돌려주는 행. 대역의 기본값이다."""

_UNSET = object()
"""인자를 주지 않은 것과 None 을 준 것을 가른다. None 은 활성 버전이 없다는 뜻이다."""


def _templates(*fams: MetricFamily) -> list[dict[str, Any]]:
    """시드의 `metric_templates` 행과 같은 모양이다."""
    return [
        {
            "metric_family": str(family),
            "formula_version": "v1",
            "input_arity": str(ARITY_BY_FAMILY[family]),
            "output_unit": "ratio",
        }
        for family in (fams or tuple(MetricFamily))
    ]


def _policies(*fams: MetricFamily) -> list[dict[str, Any]]:
    """시드의 `metric_policy_versions` v1 값과 같다(docs/metric-spec.md 6장)."""
    return [
        {
            "metric_policy_version": f"mp_v1_{str(family)[:8]}",
            "metric_family": str(family),
            "formula_version": "v1",
            "minimum_n": 5,
            "minimum_n_comparison": 10,
            "suppression_policy": "label_low_confidence",
            "uncertainty_method": "wilson_95",
        }
        for family in (fams or tuple(MetricFamily))
    ]


def _dimensions(*ids: str, boundary: frozenset[str] = frozenset()) -> list[dict[str, Any]]:
    return [
        {"dimension_id": i, "role_boundary_eligible": i in boundary} for i in ids
    ]


def _context(
    scope_level: ScopeLevel = ScopeLevel.OVERALL, scope_id: str | None = None
) -> RunContext:
    return RunContext(
        agent_run_id="run_metrics",
        analysis_version=ANALYSIS_VERSION,
        dataset_version=DATASET_VERSION,
        taxonomy_version_id=TAXONOMY_VERSION_ID,
        job_role_id=JOB_ROLE_ID,
        scope_level=scope_level,
        scope_id=scope_id,
        as_of_date=AS_OF,
    )


class StubSamplePolicy:
    """표본 판정의 대역.

    실제 판정과 억제는 `metrics/policy.py` 가 갖는다. 이 대역은 정책 행의 임계값을
    그대로 쓰는 최소 구현이며, 집계가 판정 결과를 어떻게 저장하는지만 검사한다.
    판정의 내용 자체는 `test_metric_policy.py` 가 검사한다.
    """

    def __init__(self, suppress_value: bool = False) -> None:
        self.suppress_value = suppress_value
        self.points: list[MeasurePoint] = []

    def evaluate(self, point: MeasurePoint) -> SampleVerdict:
        self.points.append(point)
        status = classify(
            point.sample_size,
            MetricPolicy(
                metric_family=point.metric_family,
                formula_version=point.formula_version,
                minimum_n=point.minimum_n,
                minimum_n_comparison=point.minimum_n_comparison,
            ),
        )
        computable = (
            status is not SampleStatus.NOT_COMPUTABLE and not self.suppress_value
        )
        uncertainty = (
            {"method": point.uncertainty_method, "lower": 0.0, "upper": 1.0}
            if point.wilson_applicable and computable
            else None
        )
        return SampleVerdict(
            sample_status=status,
            value=point.value if computable else None,
            numerator=point.numerator,
            denominator=point.denominator,
            sample_size=point.sample_size,
            uncertainty=uncertainty,
            suppressed=self.suppress_value or not computable,
            reason=None,
        )


class FakeMetrics:
    """지표 저장소의 대역. SQL 을 실행하지 않는다.

    `idx_statistics_facts_unique` 를 `fact_id` 로 흉내 낸다. 실행이 같은 조합·measure 를
    두 번 넣으려 하면 여기서 걸린다.

    묶음 조회는 차원 하나짜리 카운트를 그대로 모아 만든다. `counts` 가 `(family, 범위,
    차원)` 마다 한 벌을 갖고, 묶음 결과의 각 줄이 그 벌이다. 조합마다 문장을 보내던
    때와 같은 값이 실행에 들어가므로, 저장된 분자·분모가 달라지면 묶는 쪽이 어긋난
    것이다.

    묶음 저장은 되돌림까지 흉내 낸다. 한 행이라도 걸리면 그 묶음의 어떤 행도 남지
    않는다. 실제 세이브포인트가 묶음 전체를 되돌리는 것과 같아야, 실패한 묶음을 한
    줄씩 다시 넣어 나쁜 행만 골라내는 경로가 검사된다.
    """

    def __init__(
        self,
        dimensions: list[dict[str, Any]] | None = None,
        templates: list[dict[str, Any]] | None = None,
        policies: list[dict[str, Any]] | None = None,
        applicability: list[dict[str, Any]] | None = None,
        periods: list[str] | None = None,
        clusters: list[str] | None = None,
        counts: dict[tuple[str, str, str | None], dict[str, int]] | None = None,
        pair_counts: dict[tuple[str, str, str], int] | None = None,
        active: Any = _UNSET,
    ) -> None:
        self._dimensions = dimensions if dimensions is not None else _dimensions("dim_a")
        self._templates = templates if templates is not None else _templates()
        self._policies = policies if policies is not None else _policies()
        self._applicability = applicability or []
        self._periods = periods if periods is not None else [PERIOD]
        self._clusters = clusters or []
        self._counts = counts or {}
        self._pair_counts = pair_counts or {}
        self._active = ACTIVE_TAXONOMY if active is _UNSET else active
        self.rows: list[dict[str, Any]] = []
        self.queried: list[tuple[str, dict[str, Any]]] = []
        self.inserts: list[int] = []
        """저장 문장 하나가 실은 행 수. 길이가 곧 저장에 든 왕복 수다."""

        self.fact_reads = 0
        """저장된 `posting_prevalence` 행을 읽은 횟수. 봉투마다 한 번이어야 한다."""

    # -------------------------------------------------------- 읽기
    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return self._active

    def metric_templates(self) -> list[dict[str, Any]]:
        return list(self._templates)

    def effective_policies(self, as_of_date: date) -> list[dict[str, Any]]:
        return list(self._policies)

    def active_dimensions(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._dimensions)

    def applicability(self, taxonomy_version_id: str) -> list[dict[str, Any]]:
        return list(self._applicability)

    def periods(self) -> list[str]:
        return list(self._periods)

    def cluster_scopes(
        self, job_role_id: str, dataset_version: str, as_of_date: date
    ) -> list[str]:
        return list(self._clusters)

    def existing_fact_keys(self, analysis_version: str) -> set[tuple[str, ...]]:
        return {
            (
                row["metric_family"],
                row["measure"],
                row["scope_level"],
                row["scope_id"],
                row["entry_segment"],
                row["period_id"],
                row["dimension_id"] or "",
                row["secondary_dimension_id"] or "",
            )
            for row in self.rows
            if row["analysis_version"] == analysis_version
        }

    def prevalence_facts(
        self,
        analysis_version: str,
        scope_level: str,
        scope_id: str,
        entry_segment: str,
        period_id: str,
    ) -> dict[str, tuple[int, int]]:
        self.fact_reads += 1
        return {
            row["dimension_id"]: (row["numerator"], row["denominator"])
            for row in self.rows
            if row["analysis_version"] == analysis_version
            and row["metric_family"] == str(MetricFamily.POSTING_PREVALENCE)
            and row["measure"] == "ratio"
            and row["scope_level"] == scope_level
            and row["scope_id"] == scope_id
            and row["entry_segment"] == entry_segment
            and row["period_id"] == period_id
            and row["numerator"] is not None
        }

    # -------------------------------------------------------- 집계
    def counts_of(
        self, family: MetricFamily, scope_id: str, dimension_id: str | None
    ) -> dict[str, int]:
        """차원 하나짜리 카운트. 묶음 조회의 한 줄이 되는 값이다.

        조합마다 문장을 보내던 때 그 문장이 돌려주던 것과 같다. 묶음이 이 값을 그대로
        실어 나르는지가 곧 묶기 전후의 분자·분모가 같은지다.
        """
        key = (str(family), scope_id, dimension_id)
        return dict(self._counts.get(key, DEFAULT_COUNTS[str(family)]))

    def _row(self, family: MetricFamily, params: dict[str, Any]) -> dict[str, int]:
        self.queried.append((str(family), dict(params)))
        return self.counts_of(family, params["scope_id"], None)

    def _grouped(
        self, family: MetricFamily, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        self.queried.append((str(family), dict(params)))
        return [
            {
                "dimension_id": dimension_id,
                **self.counts_of(family, params["scope_id"], dimension_id),
            }
            for dimension_id in sorted(params["dimension_ids"])
        ]

    def prevalence_counts_by_dimension(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        return self._grouped(MetricFamily.POSTING_PREVALENCE, params)

    def requiredness_counts_by_dimension(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        return self._grouped(MetricFamily.REQUIREDNESS_RATIO, params)

    def depth_counts_by_dimension(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        return self._grouped(MetricFamily.DEPTH_DISTRIBUTION, params)

    def cooccurrence_pair_counts(
        self, params: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """교집합이 있는 쌍만 돌려준다. 없는 쌍은 실행이 0 으로 읽는다."""
        self.queried.append((str(MetricFamily.COOCCURRENCE), dict(params)))
        wanted = sorted(params["dimension_ids"])
        rows = []
        for index, left in enumerate(wanted):
            for right in wanted[index + 1 :]:
                n_ab = self._pair_counts.get(
                    (params["scope_id"], left, right), DEFAULT_PAIR_COUNT
                )
                if n_ab:
                    rows.append(
                        {
                            "dimension_id": left,
                            "secondary_dimension_id": right,
                            "n_ab": n_ab,
                        }
                    )
        return rows

    def scope_expansion_counts(self, params: dict[str, Any]) -> dict[str, int]:
        return self._row(MetricFamily.SCOPE_EXPANSION, params)

    def advanced_signal_counts(self, params: dict[str, Any]) -> dict[str, int]:
        return self._row(MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE, params)

    # -------------------------------------------------------- 쓰기
    def add_fact(self, values: dict[str, Any]) -> None:
        self.inserts.append(1)
        if any(row["fact_id"] == values["fact_id"] for row in self.rows):
            raise ValueError(f"중복 지표 행: {values['fact_id']}")
        self.rows.append(dict(values))

    def add_facts(self, rows: Sequence[dict[str, Any]]) -> None:
        """묶음 하나가 문장 하나다. 한 행이 걸리면 묶음 전체가 남지 않는다."""
        self.inserts.append(len(rows))
        staged = list(self.rows)
        seen = {row["fact_id"] for row in staged}
        for values in rows:
            if values["fact_id"] in seen:
                raise ValueError(f"중복 지표 행: {values['fact_id']}")
            seen.add(values["fact_id"])
            staged.append(dict(values))
        self.rows = staged


def _run(
    repository: FakeMetrics,
    context: RunContext | None = None,
    policy: StubSamplePolicy | None = None,
) -> Any:
    return MetricAggregation(repository, policy or StubSamplePolicy()).run(  # type: ignore[arg-type]
        context or _context()
    )


def _facts(repository: FakeMetrics, family: MetricFamily) -> list[dict[str, Any]]:
    return [row for row in repository.rows if row["metric_family"] == str(family)]


def _by_measure(
    results: Sequence[families.MeasureResult],
) -> dict[str, families.MeasureResult]:
    return {result.measure: result for result in results}


def _expected_results(
    family: MetricFamily, counts: dict[str, int]
) -> tuple[families.MeasureResult, ...]:
    """카운트 한 벌을 measure 로 옮긴다. 조합마다 조회하던 때의 경로 그대로다."""
    if family is MetricFamily.POSTING_PREVALENCE:
        return families.prevalence(counts["numerator"], counts["denominator"])
    if family is MetricFamily.REQUIREDNESS_RATIO:
        return families.requiredness(counts["numerator"], counts["denominator"])
    if family is MetricFamily.DEPTH_DISTRIBUTION:
        return families.depth_distribution(
            counts["foundation"],
            counts["application"],
            counts["tradeoff"],
            counts["denominator"],
        )
    raise AssertionError(f"차원별 카운트가 없는 지표: {family}")


# ------------------------------------------------------------ 권한
def test_metric_repository_writes_only_statistics_facts() -> None:
    """쓰기 주체는 집계 파이프라인이다(docs/permission-matrix.md 3장)."""
    assert MetricRepository.component is Component.PIPE_AGGREGATE
    assert can_write(Component.PIPE_AGGREGATE, "statistics_facts")
    assert not can_write(Component.PIPE_AGGREGATE, "metric_policy_versions")
    assert not can_write(Component.PIPE_AGGREGATE, "dimension_metric_applicability")


def test_metric_repository_has_no_policy_write_methods() -> None:
    """운영자 전용 표에 쓰는 메서드를 두지 않는다."""
    names = dir(MetricRepository)
    assert not [n for n in names if "template" in n and n.startswith("add")]
    assert not [n for n in names if "applicab" in n and n.startswith("add")]


# ------------------------------------------------------------ 냉시작
def test_no_dimensions_ends_without_computing() -> None:
    """차원이 0개면 안전하게 계산할 조합 없음으로 끝난다."""
    repository = FakeMetrics(dimensions=[])
    outcome = _run(repository)

    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert outcome.dimension_count == 0
    assert outcome.expanded_combinations == 0
    assert outcome.stored_facts == 0
    assert repository.rows == []
    assert repository.queried == []


def test_no_periods_ends_without_computing() -> None:
    repository = FakeMetrics(periods=[])
    outcome = _run(repository)
    assert outcome.stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert repository.queried == []


def test_missing_active_taxonomy_halts() -> None:
    outcome = _run(FakeMetrics(active=None))
    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert outcome.halted_reason == NO_ACTIVE_TAXONOMY


def test_taxonomy_version_mismatch_halts() -> None:
    repository = FakeMetrics(
        active={
            "taxonomy_version_id": "tx_backend_v2",
            "taxonomy_id": "tax_backend",
            "version_number": 2,
            "taxonomy_policy_version": "tp_v1",
        }
    )
    outcome = _run(repository)
    assert outcome.halted_reason == TAXONOMY_MISMATCH
    assert repository.rows == []


# ------------------------------------------------------------ 저장
def test_stored_fact_fills_every_column() -> None:
    repository = FakeMetrics()
    _run(repository)

    row = _facts(repository, MetricFamily.POSTING_PREVALENCE)[0]
    assert set(row) == FACT_COLUMNS
    assert row["fact_id"].startswith("fact_")
    assert row["analysis_version"] == ANALYSIS_VERSION
    assert row["scope_level"] == "overall"
    assert row["scope_id"] == JOB_ROLE_ID
    assert row["period_id"] == PERIOD
    assert row["measure"] == "ratio"
    assert (row["numerator"], row["denominator"]) == (6, 12)
    assert row["value"] == pytest.approx(0.5)
    assert row["sample_size"] == 12
    assert row["sample_status"] == "analysis_ready"
    assert row["uncertainty"]["method"] == "wilson_95"


def test_overall_scope_id_is_the_job_role() -> None:
    """`statistics_facts.scope_id` 가 NOT NULL 이므로 직무 전체는 직무 식별자를 담는다."""
    repository = FakeMetrics()
    _run(repository)
    assert {row["scope_id"] for row in repository.rows} == {JOB_ROLE_ID}


def test_all_five_direct_families_are_stored() -> None:
    repository = FakeMetrics()
    outcome = _run(repository)

    stored = {row["metric_family"] for row in repository.rows}
    assert stored == {
        str(MetricFamily.POSTING_PREVALENCE),
        str(MetricFamily.REQUIREDNESS_RATIO),
        str(MetricFamily.DEPTH_DISTRIBUTION),
        str(MetricFamily.SCOPE_EXPANSION),
        str(MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE),
    }
    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    assert outcome.stored_facts == len(repository.rows)


def test_depth_distribution_stores_three_measures_per_combination() -> None:
    repository = FakeMetrics()
    _run(repository)
    rows = _facts(repository, MetricFamily.DEPTH_DISTRIBUTION)
    assert {row["measure"] for row in rows} == set(families.DEPTH_MEASURES)
    per_segment = [r for r in rows if r["entry_segment"] == "all"]
    assert sum(r["numerator"] for r in per_segment) == per_segment[0]["denominator"]


def test_entry_signal_rate_is_stored_only_for_entry_junior() -> None:
    """분모가 이미 신입·주니어 표시 공고이므로 다른 대상군 행을 만들지 않는다."""
    repository = FakeMetrics()
    _run(repository)
    rows = _facts(repository, MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE)
    assert len(rows) == 1
    assert rows[0]["entry_segment"] == "entry_junior"


def test_segment_filter_is_passed_as_entry_labels() -> None:
    """대상군은 `entry_label` 목록으로 펴서 모집단을 거른다(docs/metric-spec.md 2.7)."""
    repository = FakeMetrics()
    _run(repository)
    labels = {
        tuple(params["entry_labels"] or ())
        for family, params in repository.queried
        if family == str(MetricFamily.POSTING_PREVALENCE)
    }
    assert labels == {
        (),
        ("entry", "entry_junior", "junior"),
        ("experienced",),
        ("unspecified",),
    }


def test_query_params_carry_versions_and_as_of_date() -> None:
    repository = FakeMetrics()
    _run(repository)
    _, params = repository.queried[0]
    assert params["taxonomy_version_id"] == TAXONOMY_VERSION_ID
    assert params["dataset_version"] == DATASET_VERSION
    assert params["job_role_id"] == JOB_ROLE_ID
    assert params["as_of_date"] == AS_OF


# ------------------------------------------------------------ 적용 가능성
def test_blocked_combination_is_not_computed() -> None:
    """적용 불가로 표시된 조합은 계산하지 않는다(docs/metric-spec.md 5장)."""
    repository = FakeMetrics(
        dimensions=_dimensions("dim_a", "dim_b"),
        applicability=[
            {
                "dimension_id": "dim_b",
                "metric_family": str(MetricFamily.POSTING_PREVALENCE),
                "applicable": False,
            }
        ],
    )
    _run(repository)
    prevalence = _facts(repository, MetricFamily.POSTING_PREVALENCE)
    assert {row["dimension_id"] for row in prevalence} == {"dim_a"}
    requiredness = _facts(repository, MetricFamily.REQUIREDNESS_RATIO)
    assert {row["dimension_id"] for row in requiredness} == {"dim_a", "dim_b"}


# ------------------------------------------------------------ 증분 재실행
def test_second_run_computes_nothing() -> None:
    """같은 조합을 두 번 계산하지 않는다."""
    repository = FakeMetrics()
    first = _run(repository)
    stored = len(repository.rows)
    repository.queried.clear()

    second = _run(repository)
    assert second.expanded_combinations == first.expanded_combinations
    assert second.skipped_combinations == first.expanded_combinations
    assert second.computed_combinations == 0
    assert second.stored_facts == 0
    assert second.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert len(repository.rows) == stored
    assert repository.queried == []


def test_new_dimension_is_computed_on_rerun() -> None:
    """이미 계산한 조합만 건너뛴다. 늘어난 차원은 다음 실행이 집는다."""
    repository = FakeMetrics()
    _run(repository)
    before = len(repository.rows)

    repository._dimensions = _dimensions("dim_a", "dim_b")
    outcome = _run(repository)
    assert outcome.stored_facts > 0
    assert {row["dimension_id"] for row in repository.rows} >= {"dim_a", "dim_b"}
    assert len(repository.rows) > before


def test_fact_identifier_is_stable_and_distinct() -> None:
    key = ("posting_prevalence", "ratio", "overall", JOB_ROLE_ID, "all", PERIOD, "dim_a", "")
    assert fact_identifier(ANALYSIS_VERSION, key) == fact_identifier(
        ANALYSIS_VERSION, key
    )
    assert fact_identifier(ANALYSIS_VERSION, key) != fact_identifier("an_other", key)


# ------------------------------------------------------------ 차원 쌍
def test_pairs_are_computed_only_above_minimum_n() -> None:
    """`posting_prevalence` 가 `minimum_n` 이상인 차원끼리만 쌍을 만든다."""
    repository = FakeMetrics(
        dimensions=_dimensions("dim_a", "dim_b", "dim_c"),
        counts={
            (str(MetricFamily.POSTING_PREVALENCE), JOB_ROLE_ID, "dim_c"): {
                "numerator": 2,
                "denominator": 12,
            }
        },
    )
    _run(repository)
    pairs = {
        (row["dimension_id"], row["secondary_dimension_id"])
        for row in _facts(repository, MetricFamily.COOCCURRENCE)
    }
    assert pairs == {("dim_a", "dim_b")}


def test_cooccurrence_stores_five_measures() -> None:
    repository = FakeMetrics(dimensions=_dimensions("dim_a", "dim_b"))
    _run(repository)
    rows = [
        row
        for row in _facts(repository, MetricFamily.COOCCURRENCE)
        if row["entry_segment"] == "all"
    ]
    assert {row["measure"] for row in rows} == set(
        families.MEASURES[MetricFamily.COOCCURRENCE]
    )
    count_row = next(row for row in rows if row["measure"] == "count")
    assert count_row["denominator"] is None
    assert count_row["sample_size"] == 12
    assert count_row["uncertainty"] is None


# ------------------------------------------------------------ 기업군 대비
def test_cluster_contrast_uses_stored_prevalence_rows() -> None:
    repository = FakeMetrics(
        clusters=[CLUSTER],
        counts={
            (str(MetricFamily.POSTING_PREVALENCE), CLUSTER, "dim_a"): {
                "numerator": 4,
                "denominator": 5,
            }
        },
    )
    _run(repository)
    rows = {
        row["measure"]: row
        for row in _facts(repository, MetricFamily.CLUSTER_CONTRAST)
        if row["entry_segment"] == "all"
    }
    assert set(rows) == {"prevalence_difference", "prevalence_ratio"}
    assert rows["prevalence_difference"]["scope_level"] == "cluster"
    assert rows["prevalence_difference"]["numerator"] == 4
    assert rows["prevalence_difference"]["denominator"] == 5
    assert rows["prevalence_difference"]["value"] == pytest.approx(0.8 - 0.5)
    assert rows["prevalence_ratio"]["value"] == pytest.approx(1.6)
    assert rows["prevalence_difference"]["uncertainty"] is None


def test_cluster_contrast_omits_ratio_when_baseline_is_zero() -> None:
    """직무 전체 비율이 0 이면 비율 행을 저장하지 않는다(docs/metric-spec.md 3.4)."""
    repository = FakeMetrics(
        clusters=[CLUSTER],
        counts={
            (str(MetricFamily.POSTING_PREVALENCE), JOB_ROLE_ID, "dim_a"): {
                "numerator": 0,
                "denominator": 12,
            }
        },
    )
    _run(repository)
    measures = {
        row["measure"] for row in _facts(repository, MetricFamily.CLUSTER_CONTRAST)
    }
    assert measures == {"prevalence_difference"}


def test_cluster_contrast_is_not_recomputed_when_ratio_is_absent() -> None:
    """비율 행이 없는 것은 미완이 아니다. 다시 계산하지 않는다."""
    repository = FakeMetrics(
        clusters=[CLUSTER],
        counts={
            (str(MetricFamily.POSTING_PREVALENCE), JOB_ROLE_ID, "dim_a"): {
                "numerator": 0,
                "denominator": 12,
            }
        },
    )
    _run(repository)
    stored = len(repository.rows)
    outcome = _run(repository)
    assert outcome.stored_facts == 0
    assert len(repository.rows) == stored


def test_cluster_contrast_only_on_cluster_scope() -> None:
    repository = FakeMetrics(clusters=[CLUSTER])
    _run(repository)
    assert {
        row["scope_level"] for row in _facts(repository, MetricFamily.CLUSTER_CONTRAST)
    } == {"cluster"}


# ------------------------------------------------------------ 표본 판정 확장점
def test_sample_policy_receives_policy_thresholds() -> None:
    """임계값은 코드 상수가 아니라 정책 행에서 온다(docs/metric-spec.md 6장)."""
    repository = FakeMetrics()
    policy = StubSamplePolicy()
    MetricAggregation(repository, policy).run(_context())  # type: ignore[arg-type]

    point = policy.points[0]
    assert (point.minimum_n, point.minimum_n_comparison) == (5, 10)
    assert point.uncertainty_method == "wilson_95"
    assert point.suppression_policy == "label_low_confidence"
    assert point.metric_policy_version.startswith("mp_v1_")


def test_not_computable_leaves_value_empty() -> None:
    """분모가 0 인 조합은 값을 남기지 않는다(docs/metric-spec.md 2.4)."""
    repository = FakeMetrics(
        counts={
            (str(MetricFamily.POSTING_PREVALENCE), JOB_ROLE_ID, "dim_a"): {
                "numerator": 0,
                "denominator": 0,
            }
        }
    )
    _run(repository)
    row = _facts(repository, MetricFamily.POSTING_PREVALENCE)[0]
    assert row["sample_status"] == "not_computable"
    assert row["value"] is None
    assert row["uncertainty"] is None


def test_suppressed_verdict_keeps_the_row_and_empties_the_value() -> None:
    """억제는 값만 비우고 행은 남긴다(docs/metric-spec.md 2.4).

    계산하지 못했다는 사실 자체가 화면의 정보다. 행을 지우면 아직 안 돌린 것과
    돌렸는데 표본이 없는 것을 구분할 수 없다.
    """
    repository = FakeMetrics()
    outcome = _run(repository, policy=StubSamplePolicy(suppress_value=True))
    assert repository.rows
    assert outcome.stored_facts == len(repository.rows)
    assert outcome.suppressed_values == len(repository.rows)
    assert all(row["value"] is None for row in repository.rows)


def test_wilson_is_requested_for_ratio_measures_only() -> None:
    repository = FakeMetrics(dimensions=_dimensions("dim_a", "dim_b"), clusters=[CLUSTER])
    policy = StubSamplePolicy()
    MetricAggregation(repository, policy).run(_context())  # type: ignore[arg-type]

    for point in policy.points:
        family = MetricFamily(point.metric_family)
        assert point.wilson_applicable == (
            point.measure in families.WILSON_MEASURES[family]
        )


# ------------------------------------------------------------ 범위 고정
def test_narrow_scope_context_computes_that_scope_only() -> None:
    repository = FakeMetrics(clusters=[CLUSTER])
    _run(repository, _context(ScopeLevel.CLUSTER, CLUSTER))
    assert {row["scope_level"] for row in repository.rows} == {"cluster"}
    assert {row["scope_id"] for row in repository.rows} == {CLUSTER}


# ------------------------------------------------------------ 한도와 이어달리기
def test_limit_caps_the_computed_combinations() -> None:
    """한도는 이번 실행이 계산할 조합 수다."""
    repository = FakeMetrics(dimensions=_dimensions("dim_a", "dim_b", "dim_c"))
    outcome = MetricAggregation(repository, StubSamplePolicy()).run(  # type: ignore[arg-type]
        _context(), limit=2
    )
    assert outcome.computed_combinations == 2
    assert outcome.limit_reached


def test_limited_runs_move_forward_each_time() -> None:
    """이어 돌리면 앞으로만 나아간다. 체크포인트 파일이 필요 없다."""
    repository = FakeMetrics(dimensions=_dimensions("dim_a", "dim_b", "dim_c"))
    first = MetricAggregation(repository, StubSamplePolicy()).run(  # type: ignore[arg-type]
        _context(), limit=2
    )
    second = MetricAggregation(repository, StubSamplePolicy()).run(  # type: ignore[arg-type]
        _context(), limit=2
    )
    assert second.skipped_combinations >= first.computed_combinations
    assert second.computed_combinations == 2
    assert len(repository.rows) > first.stored_facts


def test_a_run_without_a_limit_reports_no_limit() -> None:
    outcome = _run(FakeMetrics())
    assert not outcome.limit_reached


def test_limit_does_not_count_skipped_combinations() -> None:
    """이미 저장된 조합이 한도를 먹으면 이어 돌리는 실행이 멎는다."""
    repository = FakeMetrics(dimensions=_dimensions("dim_a", "dim_b"))
    MetricAggregation(repository, StubSamplePolicy()).run(_context())  # type: ignore[arg-type]
    again = MetricAggregation(repository, StubSamplePolicy()).run(  # type: ignore[arg-type]
        _context(), limit=1
    )
    assert again.computed_combinations == 0
    assert not again.limit_reached


# ============================================================ 왕복 수
DIMENSION_SCALE = 47
CLUSTER_SCALE = 6
PERIOD_SCALE = 2
PAIR_ELIGIBLE_SCALE = 4
"""이번 실행이 찍은 규모.

차원 47개·봉투 56개는 `python3 scripts/stage_e.py` 가 남긴 수다. 봉투 56개는
`(직무 전체 1 + 기업군 6) × 대상군 4 × 기간 2` 다.

쌍을 만들 차원만 4개로 둔다. 쌍은 차원 수의 제곱으로 늘어 47개면 봉투마다 1,081쌍이고
검사 하나가 30만 행을 만든다. 자르는 규칙은 실행의 것 그대로이며(`minimum_n` 미만인
차원은 쌍을 만들지 않는다, docs/metric-spec.md 5장) 여기서는 그 규칙에 걸리도록 나머지
차원의 유병률 분자를 낮춘다.
"""

ENVELOPE_SCALE = (1 + CLUSTER_SCALE) * PERIOD_SCALE * 4
"""봉투 수. 대상군 네 값은 `runner.ALL_SEGMENTS` 다."""

LEGACY_QUERY_PER_COMBINATION = 1
LEGACY_INSERT_PER_FACT = 1
"""고치기 전의 왕복 규칙.

조합마다 집계 질의 하나, 행마다 INSERT 하나였다. 이 규모에서 왕복이 2만 7천 번이고
왕복 하나가 수십 밀리초인 원격 저장소에서는 그것이 실행 시간의 거의 전부였다.
두 상수는 줄어든 폭을 수로 확인하기 위한 기준이다.
"""


def _scaled_repository() -> FakeMetrics:
    """차원 47개·봉투 56개의 대역."""
    dimension_ids = [f"dim_{index:02d}" for index in range(DIMENSION_SCALE)]
    clusters = [f"cluster_{index}" for index in range(CLUSTER_SCALE)]
    thin = {
        (str(MetricFamily.POSTING_PREVALENCE), scope_id, dimension_id): {
            "numerator": 2,
            "denominator": 12,
        }
        for scope_id in (JOB_ROLE_ID, *clusters)
        for dimension_id in dimension_ids[PAIR_ELIGIBLE_SCALE:]
    }
    return FakeMetrics(
        dimensions=_dimensions(*dimension_ids),
        clusters=clusters,
        periods=[f"y202{index}" for index in range(PERIOD_SCALE)],
        counts=thin,
    )


@pytest.fixture(scope="module")
def scaled() -> tuple[FakeMetrics, Any]:
    """이 규모의 실행을 한 번만 돌려 여러 검사가 나눠 본다."""
    repository = _scaled_repository()
    outcome = MetricAggregation(repository, StubSamplePolicy()).run(  # type: ignore[arg-type]
        _context()
    )
    return repository, outcome


def test_the_run_reproduces_the_observed_scale(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """검사가 보는 규모가 실행이 찍은 규모와 같다."""
    _, outcome = scaled
    assert outcome.dimension_count == DIMENSION_SCALE
    assert outcome.envelope_count == ENVELOPE_SCALE == 56
    assert outcome.stored_facts > 19_000
    assert not outcome.errors


def test_aggregation_queries_are_one_per_family_and_envelope(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """차원 47개가 각각 따로 돌지 않는다. 봉투 하나에 family 하나면 질의 하나다.

    `scope_expansion` 과 `entry_label_advanced_signal_rate` 는 차원을 받지 않아 봉투마다
    조합이 하나뿐이므로 묶을 축이 없다. 뒤의 것은 `entry_junior` 봉투에서만 전개된다
    (docs/metric-spec.md 5장).
    """
    repository, _ = scaled
    counted = Counter(family for family, _ in repository.queried)
    entry_junior = ENVELOPE_SCALE // 4
    assert counted == {
        str(MetricFamily.POSTING_PREVALENCE): ENVELOPE_SCALE,
        str(MetricFamily.REQUIREDNESS_RATIO): ENVELOPE_SCALE,
        str(MetricFamily.DEPTH_DISTRIBUTION): ENVELOPE_SCALE,
        str(MetricFamily.SCOPE_EXPANSION): ENVELOPE_SCALE,
        str(MetricFamily.COOCCURRENCE): ENVELOPE_SCALE,
        str(MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE): entry_junior,
    }


def test_cluster_contrast_sends_no_aggregation_query(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """기업군 대비는 저장된 행을 견줄 뿐 다시 세지 않는다(docs/metric-spec.md 3.4)."""
    repository, outcome = scaled
    assert outcome.by_family[str(MetricFamily.CLUSTER_CONTRAST)] > 0
    assert str(MetricFamily.CLUSTER_CONTRAST) not in {
        family for family, _ in repository.queried
    }


def test_stored_prevalence_is_read_once_per_envelope(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """쌍의 대상과 기업군 기준선이 같은 조회를 나눠 쓴다."""
    repository, _ = scaled
    assert repository.fact_reads == ENVELOPE_SCALE


def test_facts_are_stored_in_batches(scaled: tuple[FakeMetrics, Any]) -> None:
    """행마다 INSERT 하나가 아니라 묶음마다 하나다."""
    repository, outcome = scaled
    assert sum(repository.inserts) == outcome.stored_facts
    assert max(repository.inserts) <= INSERT_BATCH_SIZE
    lower_bound = -(-outcome.stored_facts // INSERT_BATCH_SIZE)
    # 단계가 끝날 때마다 남은 것을 먼저 저장하므로 단계 수만큼 묶음이 더 생긴다.
    assert lower_bound <= len(repository.inserts) <= lower_bound + 3


def test_round_trips_fall_by_two_orders_of_magnitude(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """이 규모에서 왕복이 2만 7천 번에서 400번 아래로 줄었다.

    회귀를 막는 자리다. 조합마다 질의를 보내거나 행마다 INSERT 를 보내는 코드가 다시
    들어오면 이 수가 그 자리에서 튄다.
    """
    repository, outcome = scaled
    contrast = outcome.by_family[str(MetricFamily.CLUSTER_CONTRAST)]
    contrast_combinations = len(
        [row for row in repository.rows if row["measure"] == "prevalence_difference"]
    )
    assert contrast_combinations * 2 >= contrast

    legacy = (
        (outcome.computed_combinations - contrast_combinations)
        * LEGACY_QUERY_PER_COMBINATION
        + outcome.stored_facts * LEGACY_INSERT_PER_FACT
    )
    now = len(repository.queried) + len(repository.inserts) + repository.fact_reads

    assert legacy > 27_000
    assert now < 450
    assert now * 60 < legacy


# ============================================================ 묶기 전후의 값
def test_batched_counts_match_the_per_combination_counts(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """묶어 세도 저장되는 분자·분모가 같다.

    대역의 묶음 결과는 차원 하나짜리 카운트를 그대로 모은 것이다. 저장된 행의 분자·분모가
    그 값에서 나온 measure 와 같으면, 묶는 축을 더한 것이 값을 바꾸지 않았다는 뜻이다.
    """
    repository, _ = scaled
    checked = 0
    for row in repository.rows:
        family = MetricFamily(row["metric_family"])
        if family not in DIMENSION_FAMILIES:
            continue
        counts = repository.counts_of(family, row["scope_id"], row["dimension_id"])
        expected = _by_measure(_expected_results(family, counts))[row["measure"]]
        assert (row["numerator"], row["denominator"]) == (
            expected.numerator,
            expected.denominator,
        )
        assert row["sample_size"] == expected.sample_size
        checked += 1
    assert checked > 13_000


def test_batched_cooccurrence_matches_the_per_pair_counts(
    scaled: tuple[FakeMetrics, Any]
) -> None:
    """쌍을 묶어 세도 네 카운트가 같다.

    `n_a`·`n_b`·`n_total` 을 쌍 문장에서 빼고 유병률 결과에서 읽는다. 두 경로가 같은
    수를 주는지가 여기서 갈린다.
    """
    repository, _ = scaled
    rows = [
        row
        for row in repository.rows
        if row["metric_family"] == str(MetricFamily.COOCCURRENCE)
    ]
    assert rows
    for row in rows:
        left = repository.counts_of(
            MetricFamily.POSTING_PREVALENCE, row["scope_id"], row["dimension_id"]
        )
        right = repository.counts_of(
            MetricFamily.POSTING_PREVALENCE,
            row["scope_id"],
            row["secondary_dimension_id"],
        )
        expected = _by_measure(
            families.cooccurrence(
                DEFAULT_PAIR_COUNT,
                left["numerator"],
                right["numerator"],
                left["denominator"],
            )
        )[row["measure"]]
        assert (row["numerator"], row["denominator"]) == (
            expected.numerator,
            expected.denominator,
        )
        assert row["sample_size"] == expected.sample_size


def test_a_pair_without_a_shared_posting_counts_zero() -> None:
    """쌍 조회에 없는 쌍의 교집합은 0 이다. 행이 빠진 것을 계산 실패로 읽지 않는다."""
    repository = FakeMetrics(
        dimensions=_dimensions("dim_a", "dim_b"),
        pair_counts={(JOB_ROLE_ID, "dim_a", "dim_b"): 0},
    )
    outcome = _run(repository)
    rows = {
        row["measure"]: row
        for row in _facts(repository, MetricFamily.COOCCURRENCE)
        if row["entry_segment"] == "all"
    }
    assert rows["count"]["numerator"] == 0
    assert rows["jaccard"]["numerator"] == 0
    assert rows["jaccard"]["denominator"] == 12
    assert not outcome.errors


def test_a_dimension_missing_from_the_batch_is_not_read_as_zero() -> None:
    """묶음 결과에 차원이 없으면 계산하지 않고 실패로 남긴다.

    분자 0 은 그 차원이 한 공고에도 나타나지 않았다는 자료이고, 행이 빠진 것은 조회가
    차원 목록을 지키지 않았다는 뜻이다. 둘을 같게 두면 조회의 결함이 수치로 굳는다.
    """

    class ForgetfulMetrics(FakeMetrics):
        def prevalence_counts_by_dimension(
            self, params: dict[str, Any]
        ) -> list[dict[str, Any]]:
            rows = super().prevalence_counts_by_dimension(params)
            return [row for row in rows if row["dimension_id"] != "dim_a"]

    repository = ForgetfulMetrics(dimensions=_dimensions("dim_a"))
    outcome = _run(repository)
    assert _facts(repository, MetricFamily.POSTING_PREVALENCE) == []
    assert any(MISSING_DIMENSION_COUNT in reason for _, reason in outcome.errors)


def test_every_placeholder_is_filled_by_the_run_parameters() -> None:
    """집계 문장의 자리표시자가 실행이 만드는 이름 안에 있다.

    빠진 이름 하나가 실행 중간에 드라이버 예외로 튀어나오면 앞 단계의 산출물만 남는다.
    문장을 봉투 단위로 묶으면서 `dimension_id` 가 `dimension_ids` 로 바뀌었으므로 이
    대조가 필요하다.
    """
    aggregation = MetricAggregation(FakeMetrics(), StubSamplePolicy())  # type: ignore[arg-type]
    envelope = Envelope(
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB_ROLE_ID,
        entry_segment=EntrySegment.ALL,
        period_id=PERIOD,
    )
    state = _StateForParams()
    filled = set(
        aggregation._params(envelope, state, ("dim_a",))  # type: ignore[arg-type]
    )
    for name in AGGREGATION_STATEMENTS:
        needed = set(re.findall(r"%\((\w+)\)s", getattr(MetricRepository, name)))
        assert needed
        assert needed <= filled, f"{name} 이 채워지지 않는 이름을 쓴다: {needed - filled}"


class _StateForParams:
    """`_params` 만 부르기 위한 최소 상태."""

    context = _context()
    taxonomy_version_id = TAXONOMY_VERSION_ID


# ============================================================ 묶음 저장의 실패
class RefusingMetrics(FakeMetrics):
    """정해진 measure 의 행을 거절하는 대역."""

    def __init__(self, refuse: str, fatal: bool = False, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._refuse = refuse
        self._fatal = fatal

    def _guard(self, values: dict[str, Any]) -> None:
        if values["measure"] != self._refuse:
            return
        if self._fatal:
            raise _DeadTransaction("current transaction is aborted")
        raise ValueError(f"제약 위반: {values['fact_id']}")

    def add_fact(self, values: dict[str, Any]) -> None:
        self._guard(values)
        super().add_fact(values)

    def add_facts(self, rows: Sequence[dict[str, Any]]) -> None:
        for values in rows:
            self._guard(values)
        super().add_facts(rows)


class _DeadTransaction(Exception):
    """거래를 죽이는 실패. 이름과 메시지가 판정의 재료다."""


def test_one_bad_row_does_not_take_the_batch_down_with_it() -> None:
    """묶음이 되돌아가면 한 줄씩 다시 넣어 나쁜 행만 뺀다.

    행마다 세이브포인트를 잡던 때와 저장되는 행 집합이 같다. 묶음 하나가 통째로
    사라지면 잘못이 없는 행 수백 개가 함께 없어진다.
    """
    repository = RefusingMetrics(
        "foundation", dimensions=_dimensions("dim_a", "dim_b")
    )
    outcome = _run(repository)

    measures = {row["measure"] for row in repository.rows}
    assert "foundation" not in measures
    assert {"ratio", "application", "tradeoff"} <= measures
    assert outcome.stored_facts == len(repository.rows)
    assert len(outcome.errors) == len(
        _facts(repository, MetricFamily.DEPTH_DISTRIBUTION)
    ) // 2
    assert outcome.by_family[str(MetricFamily.POSTING_PREVALENCE)] > 0


def test_a_dead_transaction_stops_the_run_after_one_reason() -> None:
    """죽은 거래에 계속 넣으면 같은 사유의 실패 줄이 행 수만큼 쌓인다."""
    repository = RefusingMetrics(
        "ratio", fatal=True, dimensions=_dimensions("dim_a", "dim_b")
    )
    outcome = _run(repository)

    assert outcome.stop_reason is StopReason.EXPLICIT_FAILURE
    assert len(outcome.errors) == 2
    assert outcome.errors[-1][1] == TRANSACTION_LOST
    assert repository.rows == []


# ============================================================ 진행 표시
def test_progress_reports_every_combination_with_a_running_total() -> None:
    """조합 하나마다 알린다. 간격을 정하는 것은 받는 쪽의 몫이다."""
    repository = FakeMetrics(dimensions=_dimensions("dim_a", "dim_b"))
    seen: list[tuple[int, int]] = []
    outcome = MetricAggregation(repository, StubSamplePolicy()).run(  # type: ignore[arg-type]
        _context(), progress=lambda done, total: seen.append((done, total))
    )
    assert len(seen) == outcome.expanded_combinations
    assert [done for done, _ in seen] == list(range(1, len(seen) + 1))
    assert all(done <= total for done, total in seen)
    assert seen[-1][0] == seen[-1][1]


def test_a_run_without_a_progress_callback_still_works() -> None:
    outcome = _run(FakeMetrics())
    assert outcome.stored_facts > 0


# ------------------------------------------------------------ 패키지 재수출
def test_metrics_package_exports_exist() -> None:
    """`__all__` 의 이름이 모두 실재한다."""
    import careersignal.metrics as package

    missing = [name for name in package.__all__ if not hasattr(package, name)]
    assert missing == []


def test_metrics_package_exports_no_reason_codes() -> None:
    """사유 코드와 정책 상수는 모듈에서 직접 import 한다.

    같은 이름의 사유가 여러 모듈에 있어 한 이름 공간에 모으면 어느 단계의 사유인지
    읽히지 않는다. `graph/__init__.py` 와 `taxonomy/__init__.py` 가 같은 방침이다.
    """
    import careersignal.metrics as package

    assert not [name for name in package.__all__ if name.isupper()]
    assert "NO_ACTIVE_TAXONOMY" not in package.__all__
    assert "DEPTH_MEASURES" not in package.__all__


def test_metric_entry_points_are_exported() -> None:
    import careersignal.metrics as package

    for name in (
        "MetricAggregation",
        "CapabilityDepthProfiles",
        "SaturationTracking",
        "PolicySampler",
        "temporal_deltas",
        "audit_facts",
    ):
        assert name in package.__all__


def test_repositories_package_exports_the_metric_repositories() -> None:
    import careersignal.repositories as package

    for name in (
        "MetricRepository",
        "DepthProfileRepository",
        "SaturationRepository",
        "StatisticsAuditRepository",
    ):
        assert name in package.__all__
        assert hasattr(package, name)


def test_checks_package_exports_the_numerical_check() -> None:
    import careersignal.verification.checks as package

    for name in ("numerical_consistency_check", "StatisticsReader", "TARGET_FACT"):
        assert name in package.__all__
        assert hasattr(package, name)


# ------------------------------------------------------------ 검증 저장소
def test_audit_repository_reads_with_the_verification_role() -> None:
    """검사가 집계의 쓰기 권한을 들고 다니지 않는다."""
    from careersignal.repositories.metrics import StatisticsAuditRepository

    assert StatisticsAuditRepository.component is Component.PIPE_VERIFY
    assert not can_write(Component.PIPE_VERIFY, "statistics_facts")
    assert not [
        name for name in dir(StatisticsAuditRepository) if name.startswith("add_")
    ]


def test_audit_repository_satisfies_the_reader_protocol() -> None:
    """갈래 C 가 지정한 두 메서드를 그대로 갖는다."""
    from careersignal.repositories.metrics import StatisticsAuditRepository

    assert callable(StatisticsAuditRepository.fact_ids)
    assert callable(StatisticsAuditRepository.fact_audit)


def test_audit_repository_does_not_reuse_the_aggregation_statements() -> None:
    """재계산이 자기 자신을 대조하지 않는다.

    후보 조회에 기간·범위·대상군 조건이 없어야 판정 함수가 그 조건을 처음부터 다시
    적용한다. 집계 CTE 를 그대로 쓰면 조인이 틀려도 양쪽이 똑같이 틀린다.
    """
    from careersignal.repositories.metrics import StatisticsAuditRepository

    candidates = StatisticsAuditRepository._CANDIDATES
    assert "period" not in candidates
    assert "entry_label = ANY" not in candidates
    assert "company_cluster_memberships" not in candidates
    assignments = StatisticsAuditRepository._ASSIGNMENTS
    assert "lifecycle_status = 'active'" not in assignments
    assert "%(taxonomy_version_id)s" not in assignments
