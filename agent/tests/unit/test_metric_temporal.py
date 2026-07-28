"""시간 연산자 검증.

기준은 docs/metric-spec.md 4장과 docs/statistics-model.md 5.8 이며, 기간 정의는
docs/erd.md 3.5 다. 기간 값은 `agent/migrations/sql/0010_calendar_year_periods.sql`
의 시드를 그대로 옮긴 것이고, 기간 식별자를 코드가 아니라 이 값으로 넘긴다.

저장소를 쓰지 않는다. 두 기간의 지표 행과 기간 정의를 값으로 넘겨 검증한다.
"""

from __future__ import annotations

from datetime import date

import pytest

from careersignal.domain.sampling import SampleStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.metrics.policy import (
    SUPPRESSION_LABEL_LOW_CONFIDENCE,
    UNCERTAINTY_WILSON_95,
    MetricPolicyVersion,
)
from careersignal.metrics.temporal import (
    REASON_KEY_MISMATCH,
    REASON_NO_COUNTERPART,
    REASON_NOT_COMPARABLE,
    REASON_PERIOD_MISMATCH,
    REASON_PERIOD_ORDER,
    REASON_POLICY_MISMATCH,
    REASON_SUPPRESSED,
    TEMPORAL_DELTA_FAMILY,
    MetricPoint,
    Period,
    delta_measure,
    period_from_row,
    point_from_row,
    temporal_delta,
    temporal_deltas,
)

POLICY = MetricPolicyVersion(
    metric_policy_version="mp_v1_prevalence",
    metric_family="posting_prevalence",
    formula_version="v1",
    minimum_n=5,
    minimum_n_comparison=10,
    suppression_policy=SUPPRESSION_LABEL_LOW_CONFIDENCE,
    uncertainty_method=UNCERTAINTY_WILSON_95,
)

# 0010_calendar_year_periods.sql 의 두 행과 같다.
PRIOR_PERIOD = Period(
    period_id="y2024_2025",
    label="2024~2025년",
    starts_on=date(2024, 1, 1),
    ends_on=date(2025, 12, 31),
)
LATEST_PERIOD = Period(
    period_id="y2026",
    label="2026년",
    starts_on=date(2026, 1, 1),
    ends_on=date(2026, 12, 31),
    is_baseline=True,
)


def point(
    period_id: str,
    numerator: int,
    denominator: int,
    *,
    status: SampleStatus = SampleStatus.ANALYSIS_READY,
    value: float | None = None,
    segment: EntrySegment = EntrySegment.ALL,
    policy_version: str = "mp_v1_prevalence",
    dimension_id: str = "dim_java",
) -> MetricPoint:
    return MetricPoint(
        metric_family="posting_prevalence",
        measure="ratio",
        metric_policy_version=policy_version,
        scope_level=ScopeLevel.OVERALL,
        scope_id="backend",
        entry_segment=segment,
        period_id=period_id,
        dimension_id=dimension_id,
        numerator=numerator,
        denominator=denominator,
        value=value if value is not None else numerator / denominator,
        sample_size=denominator,
        sample_status=status,
    )


# ---------------------------------------------------------------- 기간
def test_periods_come_from_the_table_not_from_code() -> None:
    """비교의 앞뒤는 식별자가 아니라 날짜가 정한다."""
    assert PRIOR_PERIOD.precedes(LATEST_PERIOD)
    assert not LATEST_PERIOD.precedes(PRIOR_PERIOD)


def test_period_rejects_reversed_range() -> None:
    with pytest.raises(ValueError):
        Period(period_id="bad", starts_on=date(2026, 12, 31), ends_on=date(2026, 1, 1))


def test_period_from_row() -> None:
    period = period_from_row(
        {
            "period_id": "y2026",
            "label": "2026년",
            "starts_on": date(2026, 1, 1),
            "ends_on": date(2026, 12, 31),
            "is_baseline": True,
        }
    )
    assert period == LATEST_PERIOD


def test_point_from_row() -> None:
    built = point_from_row(
        {
            "metric_family": "posting_prevalence",
            "measure": "ratio",
            "metric_policy_version": "mp_v1_prevalence",
            "scope_level": "overall",
            "scope_id": "backend",
            "entry_segment": "all",
            "period_id": "y2026",
            "dimension_id": "dim_java",
            "secondary_dimension_id": None,
            "numerator": 12,
            "denominator": 20,
            "value": 0.6,
            "sample_size": 20,
            "sample_status": "analysis_ready",
        }
    )
    assert built.entry_segment is EntrySegment.ALL
    assert built.sample_status is SampleStatus.ANALYSIS_READY


# ---------------------------------------------------------------- 계산
def test_delta_is_the_later_period_minus_the_earlier() -> None:
    prior = point("y2024_2025", 5, 20)
    latest = point("y2026", 12, 20)
    outcome = temporal_delta(
        POLICY, prior, latest, period_a=PRIOR_PERIOD, period_b=LATEST_PERIOD
    )
    assert outcome.computed
    assert outcome.delta is not None
    assert outcome.delta.value == pytest.approx(0.6 - 0.25)


def test_delta_names_which_metric_changed() -> None:
    """`temporal_delta` 단독으로는 해석할 수 없다(docs/metric-spec.md 4장)."""
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 5, 20),
        point("y2026", 12, 20),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    delta = outcome.delta
    assert delta is not None
    assert delta.metric_family == TEMPORAL_DELTA_FAMILY
    assert delta.measure == "posting_prevalence__ratio"
    assert delta.measure == delta_measure("posting_prevalence", "ratio")
    assert delta.base_metric_family == "posting_prevalence"
    assert delta.base_measure == "ratio"
    assert delta.dimension_id == "dim_java"


def test_delta_records_both_period_sample_sizes() -> None:
    """양 기간의 표본 수를 함께 기록한다(docs/statistics-model.md 5.8)."""
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 4, 14),
        point("y2026", 12, 22),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    delta = outcome.delta
    assert delta is not None
    assert delta.prior_sample_size == 14
    assert delta.latest_sample_size == 22
    # 비교의 신뢰도가 표본이 적은 기간에 좌우되므로 작은 쪽이 `sample_size` 다.
    assert delta.sample_size == 14
    assert delta.prior_period_id == "y2024_2025"
    assert delta.period_id == "y2026"


def test_delta_row_follows_the_storage_table() -> None:
    """저장 형태는 docs/metric-spec.md 4장의 표와 같다."""
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 4, 14),
        point("y2026", 12, 22),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    delta = outcome.delta
    assert delta is not None
    columns = delta.fact_columns()
    assert columns["metric_family"] == "temporal_delta"
    assert columns["period_id"] == "y2026"
    assert columns["numerator"] == 12
    assert columns["denominator"] == 22
    assert columns["sample_size"] == 14
    assert columns["uncertainty"] is None
    assert columns["sample_status"] == "analysis_ready"
    assert columns["metric_policy_version"] == "mp_v1_prevalence"


def test_delta_carries_the_base_metric_policy_version() -> None:
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 5, 20),
        point("y2026", 12, 20),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert outcome.delta is not None
    assert outcome.delta.metric_policy_version == POLICY.metric_policy_version


# ---------------------------------------------------------------- 거절
def test_not_comparable_input_produces_no_delta() -> None:
    """비교 최소 표본에 못 미친 값끼리 뺀 결과는 의미가 없다."""
    prior = point("y2024_2025", 2, 9, status=SampleStatus.NOT_COMPARABLE)
    latest = point("y2026", 12, 20)
    outcome = temporal_delta(
        POLICY, prior, latest, period_a=PRIOR_PERIOD, period_b=LATEST_PERIOD
    )
    assert not outcome.computed
    assert outcome.delta is None
    assert outcome.reason == REASON_NOT_COMPARABLE


@pytest.mark.parametrize(
    "status",
    [
        SampleStatus.NOT_COMPUTABLE,
        SampleStatus.LOW_CONFIDENCE,
        SampleStatus.NOT_COMPARABLE,
    ],
)
def test_only_analysis_ready_values_enter_a_comparison(status: SampleStatus) -> None:
    latest = point("y2026", 3, 12, status=status)
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 5, 20),
        latest,
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_NOT_COMPARABLE


def test_suppressed_period_produces_no_delta() -> None:
    """한쪽 기간의 값이 억제되어 비어 있으면 델타를 계산하지 않는다."""
    hidden = point("y2024_2025", 5, 20).model_copy(update={"value": None})
    outcome = temporal_delta(
        POLICY,
        hidden,
        point("y2026", 12, 20),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_SUPPRESSED


def test_different_policy_versions_are_not_compared() -> None:
    """서로 다른 정책 버전의 수치는 비교하지 않는다(5.9)."""
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 5, 20, policy_version="mp_v2_prevalence"),
        point("y2026", 12, 20),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_POLICY_MISMATCH


def test_different_segments_are_not_compared() -> None:
    """서로 다른 대상군의 수치를 하나의 기준선으로 비교하지 않는다(5.3)."""
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 5, 20, segment=EntrySegment.ENTRY_JUNIOR),
        point("y2026", 12, 20, segment=EntrySegment.EXPERIENCED),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_KEY_MISMATCH


def test_different_dimensions_are_not_compared() -> None:
    outcome = temporal_delta(
        POLICY,
        point("y2024_2025", 5, 20, dimension_id="dim_java"),
        point("y2026", 12, 20, dimension_id="dim_kotlin"),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_KEY_MISMATCH


def test_reversed_periods_produce_no_delta() -> None:
    outcome = temporal_delta(
        POLICY,
        point("y2026", 12, 20),
        point("y2024_2025", 5, 20),
        period_a=LATEST_PERIOD,
        period_b=PRIOR_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_PERIOD_ORDER


def test_point_period_must_match_the_period_row() -> None:
    outcome = temporal_delta(
        POLICY,
        point("y2026", 5, 20),
        point("y2026", 12, 20),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert not outcome.computed
    assert outcome.reason == REASON_PERIOD_MISMATCH


# ---------------------------------------------------------------- 묶음
def test_batch_pairs_points_by_metric_identity() -> None:
    prior = [
        point("y2024_2025", 5, 20, dimension_id="dim_java"),
        point("y2024_2025", 2, 20, dimension_id="dim_kafka"),
    ]
    latest = [
        point("y2026", 12, 20, dimension_id="dim_java"),
        point("y2026", 9, 20, dimension_id="dim_kafka"),
    ]
    outcomes = temporal_deltas(
        POLICY, prior, latest, period_a=PRIOR_PERIOD, period_b=LATEST_PERIOD
    )
    assert [o.computed for o in outcomes] == [True, True]
    values = {o.delta.dimension_id: o.delta.value for o in outcomes if o.delta}
    assert values["dim_java"] == pytest.approx(0.35)
    assert values["dim_kafka"] == pytest.approx(0.35)


def test_batch_reports_missing_counterparts() -> None:
    outcomes = temporal_deltas(
        POLICY,
        [point("y2024_2025", 5, 20, dimension_id="dim_java")],
        [point("y2026", 9, 20, dimension_id="dim_kafka")],
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert [o.reason for o in outcomes] == [
        REASON_NO_COUNTERPART,
        REASON_NO_COUNTERPART,
    ]


def test_batch_is_deterministic() -> None:
    prior = [
        point("y2024_2025", 2, 20, dimension_id="dim_kafka"),
        point("y2024_2025", 5, 20, dimension_id="dim_java"),
    ]
    latest = [
        point("y2026", 9, 20, dimension_id="dim_kafka"),
        point("y2026", 12, 20, dimension_id="dim_java"),
    ]
    first = temporal_deltas(
        POLICY, prior, latest, period_a=PRIOR_PERIOD, period_b=LATEST_PERIOD
    )
    second = temporal_deltas(
        POLICY,
        list(reversed(prior)),
        list(reversed(latest)),
        period_a=PRIOR_PERIOD,
        period_b=LATEST_PERIOD,
    )
    assert first == second


def test_delta_of_a_delta_is_refused() -> None:
    """`temporal_delta` 는 연산자이며 그 자신에 다시 적용하지 않는다."""
    prior = point("y2024_2025", 5, 20).model_copy(
        update={"metric_family": TEMPORAL_DELTA_FAMILY}
    )
    latest = point("y2026", 12, 20).model_copy(
        update={"metric_family": TEMPORAL_DELTA_FAMILY}
    )
    with pytest.raises(ValueError):
        temporal_delta(
            POLICY, prior, latest, period_a=PRIOR_PERIOD, period_b=LATEST_PERIOD
        )
