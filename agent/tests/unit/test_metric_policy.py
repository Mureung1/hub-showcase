"""지표 정책 적용 검증. 표본 상태 판정·불확실성·억제.

기준은 docs/metric-spec.md 2.4·2.5·6장과 docs/statistics-model.md 5.3·5.10 이다.
임계값은 상수가 아니라 `metric_policy_versions` 행이 정하므로, 이 파일의 정책 값은
`agent/migrations/sql/0002_seed_reference.sql` 의 시드를 그대로 옮긴 것이다.

저장소를 쓰지 않는다. 모든 검증이 값 하나와 정책 하나로 성립한다.
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from careersignal.domain.sampling import SampleStatus
from careersignal.metrics.policy import (
    REASON_HIDDEN,
    REASON_MISSING_DENOMINATOR,
    REASON_MISSING_VALUE,
    REASON_ZERO_COMPARISON_DENOMINATOR,
    REASON_ZERO_DENOMINATOR,
    SUPPRESSION_HIDE,
    SUPPRESSION_LABEL_LOW_CONFIDENCE,
    SUPPRESSION_LABEL_NOT_COMPARABLE,
    UNCERTAINTY_NONE,
    UNCERTAINTY_WILSON_95,
    MetricPolicyVersion,
    classify_pair,
    evaluate,
    policy_from_row,
    same_policy,
    select_policy,
    stores_uncertainty,
    uncertainty_for,
    wilson_interval,
)

# ---------------------------------------------------------------- 정책 고정값
# 0002_seed_reference.sql 의 `mp_v1_prevalence` 행과 같다.
POLICY_V1 = MetricPolicyVersion(
    metric_policy_version="mp_v1_prevalence",
    metric_family="posting_prevalence",
    formula_version="v1",
    minimum_n=5,
    minimum_n_comparison=10,
    suppression_policy=SUPPRESSION_LABEL_LOW_CONFIDENCE,
    uncertainty_method=UNCERTAINTY_WILSON_95,
)

# 0002_seed_reference.sql 의 `mp_v1_contrast` 행과 같다.
POLICY_CONTRAST = POLICY_V1.model_copy(
    update={
        "metric_policy_version": "mp_v1_contrast",
        "metric_family": "cluster_contrast",
        "suppression_policy": SUPPRESSION_LABEL_NOT_COMPARABLE,
    }
)

POLICY_HIDE = POLICY_V1.model_copy(
    update={
        "metric_policy_version": "mp_hide_test",
        "suppression_policy": SUPPRESSION_HIDE,
    }
)

POLICY_NO_UNCERTAINTY = POLICY_V1.model_copy(
    update={
        "metric_policy_version": "mp_v1_cooccurrence",
        "metric_family": "cooccurrence",
        "uncertainty_method": UNCERTAINTY_NONE,
    }
)

RATIO = "ratio"


# ---------------------------------------------------------------- 정책 행
def test_seed_policy_values() -> None:
    """정책 v1 의 임계값은 시드가 정한다. 코드가 다른 값을 갖지 않는다."""
    assert POLICY_V1.minimum_n == 5
    assert POLICY_V1.minimum_n_comparison == 10
    assert POLICY_V1.uncertainty_method == UNCERTAINTY_WILSON_95
    assert POLICY_V1.suppression_policy == SUPPRESSION_LABEL_LOW_CONFIDENCE


def test_policy_from_row() -> None:
    policy = policy_from_row(
        {
            "metric_policy_version": "mp_v1_scope_exp",
            "metric_family": "scope_expansion",
            "formula_version": "v1",
            "minimum_n": 5,
            "minimum_n_comparison": 10,
            "suppression_policy": "label_low_confidence",
            "uncertainty_method": "wilson_95",
            "effective_from": datetime(2026, 1, 1, tzinfo=UTC),
        }
    )
    assert policy.thresholds.minimum_n == 5


@pytest.mark.parametrize(
    "bad", [{"suppression_policy": "drop"}, {"uncertainty_method": "normal_95"}]
)
def test_policy_rejects_values_outside_the_database_check(bad: dict[str, str]) -> None:
    with pytest.raises(ValueError):
        MetricPolicyVersion.model_validate(POLICY_V1.model_dump() | bad)


def test_policy_rejects_comparison_below_minimum() -> None:
    with pytest.raises(ValueError):
        MetricPolicyVersion(
            metric_policy_version="mp_bad",
            metric_family="posting_prevalence",
            formula_version="v1",
            minimum_n=10,
            minimum_n_comparison=5,
            suppression_policy=SUPPRESSION_LABEL_LOW_CONFIDENCE,
            uncertainty_method=UNCERTAINTY_WILSON_95,
        )


def test_policy_is_frozen() -> None:
    with pytest.raises(ValueError):
        POLICY_V1.minimum_n = 3  # type: ignore[misc]


def test_select_policy_picks_the_latest_effective_version() -> None:
    v1 = POLICY_V1.model_copy(
        update={"effective_from": datetime(2026, 1, 1, tzinfo=UTC)}
    )
    v2 = POLICY_V1.model_copy(
        update={
            "metric_policy_version": "mp_v2_prevalence",
            "minimum_n": 8,
            "minimum_n_comparison": 20,
            "effective_from": datetime(2026, 6, 1, tzinfo=UTC),
        }
    )
    picked = select_policy([v1, v2], "posting_prevalence", "v1")
    assert picked.metric_policy_version == "mp_v2_prevalence"

    earlier = select_policy(
        [v1, v2], "posting_prevalence", "v1", as_of=datetime(2026, 3, 1, tzinfo=UTC)
    )
    assert earlier.metric_policy_version == "mp_v1_prevalence"


def test_select_policy_refuses_to_invent_thresholds() -> None:
    with pytest.raises(KeyError):
        select_policy([POLICY_V1], "cooccurrence", "v1")


def test_different_policy_versions_are_not_the_same() -> None:
    """서로 다른 정책 버전의 수치는 비교하지 않는다."""
    assert same_policy(POLICY_V1, POLICY_V1.metric_policy_version)
    assert not same_policy(POLICY_V1, POLICY_CONTRAST)


# ---------------------------------------------------------------- 결측 처리
def test_zero_denominator_is_not_computable() -> None:
    """분모가 0 이면 계산 불가이고 값은 없다(docs/metric-spec.md 2.4)."""
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=0, denominator=0)
    assert outcome.sample_status is SampleStatus.NOT_COMPUTABLE
    assert outcome.value is None
    assert outcome.denominator == 0
    assert outcome.reason == REASON_ZERO_DENOMINATOR


def test_missing_denominator_is_distinguished_from_zero() -> None:
    """분모 0 과 분모 없음을 구분한다. 행에 남는 값이 다르다."""
    zero = evaluate(POLICY_V1, measure=RATIO, numerator=0, denominator=0)
    missing = evaluate(POLICY_V1, measure=RATIO, numerator=None, denominator=None)
    assert zero.sample_status is missing.sample_status is SampleStatus.NOT_COMPUTABLE
    assert zero.denominator == 0
    assert missing.denominator is None
    assert zero.reason != missing.reason
    assert missing.reason == REASON_MISSING_DENOMINATOR


def test_missing_numerator_leaves_no_value() -> None:
    """분모는 섰으나 분자가 없으면 값을 0 으로 메우지 않는다."""
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=None, denominator=12)
    assert outcome.sample_status is SampleStatus.NOT_COMPUTABLE
    assert outcome.value is None
    assert outcome.denominator == 12
    assert outcome.reason == REASON_MISSING_VALUE


def test_numerator_cannot_exceed_denominator() -> None:
    with pytest.raises(ValueError):
        evaluate(POLICY_V1, measure=RATIO, numerator=6, denominator=5)


# ---------------------------------------------------------------- 표본 상태
@pytest.mark.parametrize(
    ("denominator", "expected"),
    [
        (0, SampleStatus.NOT_COMPUTABLE),
        (1, SampleStatus.LOW_CONFIDENCE),
        (4, SampleStatus.LOW_CONFIDENCE),
        (5, SampleStatus.NOT_COMPARABLE),
        (9, SampleStatus.NOT_COMPARABLE),
        (10, SampleStatus.ANALYSIS_READY),
        (30, SampleStatus.ANALYSIS_READY),
    ],
)
def test_thresholds_split_the_four_statuses(
    denominator: int, expected: SampleStatus
) -> None:
    """정책 v1 의 5 와 10 이 네 값을 가른다."""
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=0, denominator=denominator)
    assert outcome.sample_status is expected


def test_minimum_n_comparison_is_the_line_for_not_comparable() -> None:
    """비교 최소 표본이 `not_comparable` 과 `analysis_ready` 를 가른다."""
    below = evaluate(POLICY_V1, measure=RATIO, numerator=3, denominator=9)
    at = evaluate(POLICY_V1, measure=RATIO, numerator=3, denominator=10)
    assert below.sample_status is SampleStatus.NOT_COMPARABLE
    assert at.sample_status is SampleStatus.ANALYSIS_READY
    # `not_comparable` 도 값은 저장한다. 단일 값 표시는 허용된다.
    assert below.value == pytest.approx(3 / 9)


def test_explicit_sample_size_drives_the_judgment() -> None:
    """분모와 표본 수가 다른 지표는 저장된 표본 수로 판정한다."""
    outcome = evaluate(
        POLICY_V1, measure=RATIO, numerator=5, denominator=30, sample_size=8
    )
    assert outcome.sample_size == 8
    assert outcome.sample_status is SampleStatus.NOT_COMPARABLE


def test_two_denominator_rule_needs_both_sides() -> None:
    """기업군 분모와 직무 전체 분모가 둘 다 서야 `analysis_ready` 다(3.4)."""
    assert classify_pair(20, 30, POLICY_CONTRAST) is SampleStatus.ANALYSIS_READY
    assert classify_pair(20, 9, POLICY_CONTRAST) is SampleStatus.NOT_COMPARABLE
    assert classify_pair(3, 30, POLICY_CONTRAST) is SampleStatus.NOT_COMPARABLE
    assert classify_pair(0, 30, POLICY_CONTRAST) is SampleStatus.NOT_COMPUTABLE


def test_cluster_contrast_uses_the_two_denominator_rule() -> None:
    outcome = evaluate(
        POLICY_CONTRAST,
        measure="prevalence_difference",
        numerator=4,
        denominator=12,
        comparison_sample_size=8,
        value=0.1,
    )
    assert outcome.sample_status is SampleStatus.NOT_COMPARABLE
    assert outcome.value == pytest.approx(0.1)


def test_zero_baseline_denominator_is_not_computable() -> None:
    outcome = evaluate(
        POLICY_CONTRAST,
        measure="prevalence_difference",
        numerator=4,
        denominator=12,
        comparison_sample_size=0,
        value=0.1,
    )
    assert outcome.sample_status is SampleStatus.NOT_COMPUTABLE
    assert outcome.value is None
    assert outcome.reason == REASON_ZERO_COMPARISON_DENOMINATOR


def test_status_follows_the_policy_row_not_a_constant() -> None:
    """임계값을 바꾼 정책은 같은 분모에 다른 상태를 낸다."""
    strict = POLICY_V1.model_copy(
        update={
            "metric_policy_version": "mp_v2_prevalence",
            "minimum_n": 12,
            "minimum_n_comparison": 30,
        }
    )
    loose = evaluate(POLICY_V1, measure=RATIO, numerator=5, denominator=10)
    tight = evaluate(strict, measure=RATIO, numerator=5, denominator=10)
    assert loose.sample_status is SampleStatus.ANALYSIS_READY
    assert tight.sample_status is SampleStatus.LOW_CONFIDENCE


def test_each_segment_is_judged_on_its_own_denominator() -> None:
    """한 대상군의 미달이 다른 대상군의 수치를 억제하지 않는다(5.3)."""
    entry_junior = evaluate(POLICY_V1, measure=RATIO, numerator=1, denominator=3)
    experienced = evaluate(POLICY_V1, measure=RATIO, numerator=8, denominator=20)
    assert entry_junior.sample_status is SampleStatus.LOW_CONFIDENCE
    assert experienced.sample_status is SampleStatus.ANALYSIS_READY
    assert experienced.value == pytest.approx(0.4)


# ---------------------------------------------------------------- 억제
def test_label_low_confidence_keeps_the_value() -> None:
    """정책 v1 은 숨기지 않고 낮은 신뢰도로 표시한다(docs/metric-spec.md 6장)."""
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=1, denominator=4)
    assert outcome.sample_status is SampleStatus.LOW_CONFIDENCE
    assert outcome.value == pytest.approx(0.25)
    assert outcome.suppressed is False
    assert outcome.uncertainty is not None


def test_hide_empties_the_value_but_keeps_the_row() -> None:
    """행을 지우면 아직 안 돌린 것과 표본이 없는 것을 구분할 수 없다(2.4)."""
    outcome = evaluate(POLICY_HIDE, measure=RATIO, numerator=1, denominator=4)
    assert outcome.sample_status is SampleStatus.LOW_CONFIDENCE
    assert outcome.value is None
    assert outcome.uncertainty is None
    assert outcome.suppressed is True
    assert outcome.reason == REASON_HIDDEN
    # 분모는 남는다. 표본이 몇 건이었는지가 화면의 정보다.
    assert outcome.denominator == 4
    assert outcome.sample_size == 4


def test_hide_does_not_touch_analysis_ready_values() -> None:
    outcome = evaluate(POLICY_HIDE, measure=RATIO, numerator=5, denominator=20)
    assert outcome.value == pytest.approx(0.25)
    assert outcome.suppressed is False


def test_label_not_comparable_raises_low_confidence() -> None:
    """이 정책을 쓰는 `cluster_contrast` 는 미달이면 비교에 쓰지 않는다(3.4)."""
    outcome = evaluate(
        POLICY_CONTRAST,
        measure="prevalence_difference",
        numerator=1,
        denominator=3,
        value=-0.12,
    )
    assert outcome.sample_status is SampleStatus.NOT_COMPARABLE
    assert outcome.value == pytest.approx(-0.12)
    assert outcome.suppressed is False


def test_fact_columns_carry_only_table_columns() -> None:
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=5, denominator=10)
    columns = outcome.fact_columns()
    assert set(columns) == {
        "numerator",
        "denominator",
        "value",
        "sample_size",
        "sample_status",
        "uncertainty",
    }
    assert columns["sample_status"] == "analysis_ready"


# ---------------------------------------------------------------- 불확실성
@pytest.mark.parametrize(
    ("numerator", "denominator", "lower", "upper"),
    [
        # 손으로 계산해 고정한 값. 공표된 Wilson 95% 구간과 같다.
        (5, 10, 0.236593, 0.763407),
        (0, 10, 0.0, 0.277533),
        (1, 5, 0.036224, 0.624465),
        (10, 10, 0.722467, 1.0),
    ],
)
def test_wilson_interval_matches_known_values(
    numerator: int, denominator: int, lower: float, upper: float
) -> None:
    """수식은 docs/metric-spec.md 2.5 를 그대로 따른다."""
    assert wilson_interval(numerator, denominator) == (lower, upper)


def test_wilson_interval_stays_inside_the_domain() -> None:
    """정규 근사 대신 Wilson 을 쓰는 이유가 이 성질이다."""
    for numerator in range(0, 6):
        lower, upper = wilson_interval(numerator, 5)
        assert 0.0 <= lower <= upper <= 1.0


def test_wilson_interval_rejects_zero_denominator() -> None:
    with pytest.raises(ValueError):
        wilson_interval(0, 0)


def test_uncertainty_shape_matches_the_jsonb_example() -> None:
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=5, denominator=10)
    assert outcome.uncertainty == {
        "method": "wilson_95",
        "lower": 0.236593,
        "upper": 0.763407,
    }


def test_uncertainty_method_none_stores_no_interval() -> None:
    """`uncertainty_method` 가 `none` 이면 구간을 만들지 않는다."""
    assert not stores_uncertainty(POLICY_NO_UNCERTAINTY, "jaccard")
    outcome = evaluate(
        POLICY_NO_UNCERTAINTY, measure="jaccard", numerator=3, denominator=12
    )
    assert outcome.uncertainty is None
    assert outcome.value == pytest.approx(0.25)


@pytest.mark.parametrize(
    "measure",
    ["count", "association_lift", "prevalence_difference", "prevalence_ratio"],
)
def test_non_ratio_measures_store_no_interval(measure: str) -> None:
    """비율이 아닌 measure 는 정책이 `wilson_95` 여도 구간을 두지 않는다(2.5)."""
    assert not stores_uncertainty(POLICY_V1, measure)
    assert uncertainty_for(POLICY_V1, measure, 3, 12) is None


def test_cluster_contrast_family_stores_no_interval() -> None:
    """docs/metric-spec.md 3.4 는 이 family 의 불확실성을 없음으로 둔다."""
    assert not stores_uncertainty(POLICY_CONTRAST, RATIO)


def test_not_computable_has_no_interval() -> None:
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=0, denominator=0)
    assert outcome.uncertainty is None


# ---------------------------------------------------------------- 분모 없는 measure
POLICY_COOCCURRENCE = POLICY_V1.model_copy(
    update={
        "metric_policy_version": "mp_v1_cooccurrence",
        "metric_family": "cooccurrence",
    }
)
"""0002 시드의 `mp_v1_cooccurrence` 행. 불확실성 방법은 0022 가 `wilson_95` 로 맞췄다."""


def test_count_measure_is_judged_on_the_sample_size() -> None:
    """`count` 는 분모가 없는 것이 정의다(docs/metric-spec.md 3.5).

    분모를 계산하지 못한 것과 다르다. 교집합 수는 계산된 값이며, 몇 건 가운데 나온
    수인지는 `sample_size` 가 담는다.
    """
    outcome = evaluate(
        POLICY_COOCCURRENCE,
        measure="count",
        numerator=3,
        denominator=None,
        sample_size=12,
        value=3.0,
    )
    assert outcome.sample_status is SampleStatus.ANALYSIS_READY
    assert outcome.value == pytest.approx(3.0)
    assert outcome.denominator is None
    assert not outcome.suppressed
    assert outcome.uncertainty is None


def test_count_measure_below_minimum_n_is_low_confidence() -> None:
    """표본 수가 판정의 입력이다. 임계값은 정책 행이 정한다."""
    outcome = evaluate(
        POLICY_COOCCURRENCE,
        measure="count",
        numerator=1,
        denominator=None,
        sample_size=3,
        value=1.0,
    )
    assert outcome.sample_status is SampleStatus.LOW_CONFIDENCE
    assert outcome.value == pytest.approx(1.0)


def test_count_measure_without_a_value_is_not_computable() -> None:
    """모집단이 0 이면 값을 만들지 못한다. 그 사실을 행에 남긴다."""
    outcome = evaluate(
        POLICY_COOCCURRENCE,
        measure="count",
        numerator=0,
        denominator=None,
        sample_size=0,
    )
    assert outcome.sample_status is SampleStatus.NOT_COMPUTABLE
    assert outcome.value is None
    assert outcome.reason == REASON_MISSING_VALUE


def test_undefined_lift_is_not_replaced_by_the_ratio() -> None:
    """`association_lift` 가 정의되지 않는 자리에 교집합 비율을 넣지 않는다.

    두 집합 가운데 하나라도 비면 lift 가 정의되지 않는다(docs/metric-spec.md 3.5).
    그 자리의 `numerator`·`denominator` 는 교집합 수와 모집단 수이므로, 값을 분자÷분모로
    메우면 lift 자리에 전혀 다른 수가 들어간다.
    """
    outcome = evaluate(
        POLICY_COOCCURRENCE,
        measure="association_lift",
        numerator=0,
        denominator=32,
        sample_size=32,
        value=None,
    )
    assert outcome.value is None
    assert outcome.sample_status is SampleStatus.NOT_COMPUTABLE
    assert outcome.reason == REASON_MISSING_VALUE


def test_ratio_measures_still_fall_back_to_the_counts() -> None:
    """값이 분자÷분모인 measure 는 그대로 메운다."""
    outcome = evaluate(POLICY_V1, measure=RATIO, numerator=3, denominator=12)

    assert outcome.value == pytest.approx(0.25)


def test_other_measures_still_treat_a_missing_denominator_as_not_computable() -> None:
    """분모가 없는 measure 는 `count` 하나다. 나머지는 계산하지 못한 것이다."""
    outcome = evaluate(
        POLICY_V1, measure=RATIO, numerator=3, denominator=None, sample_size=12
    )
    assert outcome.sample_status is SampleStatus.NOT_COMPUTABLE
    assert outcome.reason == REASON_MISSING_DENOMINATOR


def test_wilson_measures_agree_with_the_policy_exclusions() -> None:
    """수식과 정책이 같은 measure 를 가른다.

    `metrics/families.py` 는 구간을 저장할 measure 를 family 별로 적고
    `metrics/policy.py` 는 저장하지 않을 measure 와 family 를 적는다. 두 목록이
    어긋나면 집계가 구간을 기대한 자리에 정책이 NULL 을 넣는다.
    """
    from careersignal.metrics import families
    from careersignal.metrics.expansion import MetricFamily

    for family, measures in families.MEASURES.items():
        policy = POLICY_V1.model_copy(update={"metric_family": str(family)})
        for measure in measures:
            expected = measure in families.WILSON_MEASURES[MetricFamily(family)]
            assert stores_uncertainty(policy, measure) is expected, (family, measure)
