"""지표 family 일곱 종의 정의 검증.

분자·분모·measure 의 기준은 docs/metric-spec.md 3.1~3.7 이고, 공통 규약은 같은 문서
2.1~2.5 다. 데이터베이스를 켜지 않으므로 카운트를 measure 로 옮기는 순수 함수와 SQL
조각의 모양만 검사한다.
"""

from __future__ import annotations

import pytest

from careersignal.domain.segment import EntrySegment
from careersignal.metrics import families
from careersignal.metrics.expansion import MetricFamily

WILSON_FAMILIES = {
    MetricFamily.POSTING_PREVALENCE,
    MetricFamily.REQUIREDNESS_RATIO,
    MetricFamily.DEPTH_DISTRIBUTION,
    MetricFamily.SCOPE_EXPANSION,
    MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE,
}


def _by_measure(
    results: tuple[families.MeasureResult, ...],
) -> dict[str, families.MeasureResult]:
    return {result.measure: result for result in results}


# ------------------------------------------------------------ 공통 규약
def test_every_family_has_measures() -> None:
    assert set(families.MEASURES) == set(MetricFamily)
    assert set(families.WILSON_MEASURES) == set(MetricFamily)
    assert set(families.REQUIRED_MEASURES) == set(MetricFamily)


def test_denominator_zero_leaves_value_empty() -> None:
    """분모가 0 이면 `value` 가 없다(docs/metric-spec.md 2.4)."""
    assert families.ratio(0, 0) is None
    assert families.prevalence(0, 0)[0].value is None


def test_population_filters_by_role_dataset_and_period() -> None:
    """분모 모집단은 `posting_versions` 이며 범위·기간으로 거른다(2.1)."""
    sql = families.POPULATION_CTE
    assert "FROM posting_versions pv" in sql
    assert "JOIN postings p ON p.posting_id = pv.posting_id" in sql
    assert "p.job_role_id = %(job_role_id)s" in sql
    assert "pv.dataset_version = %(dataset_version)s" in sql
    assert "pv.posted_at::date BETWEEN pd.starts_on AND pd.ends_on" in sql


def test_cluster_scope_is_resolved_by_as_of_date() -> None:
    """기업군 소속은 `company_cluster_memberships` 를 `as_of_date` 로 해석한다(2.1)."""
    sql = families.POPULATION_CTE
    assert "company_cluster_memberships m" in sql
    assert "m.valid_from <= %(as_of_date)s" in sql
    assert "m.valid_to IS NULL OR m.valid_to >= %(as_of_date)s" in sql


def test_assignment_join_keeps_active_dimensions_only() -> None:
    """`lifecycle_status` 가 `active` 가 아닌 차원은 집계에 넣지 않는다(2.3)."""
    sql = families.ASSIGNED_CTE
    assert "a.taxonomy_version_id = %(taxonomy_version_id)s" in sql
    assert "dv.lifecycle_status = 'active'" in sql


@pytest.mark.parametrize(
    "sql",
    [
        families.PREVALENCE_SELECT,
        families.REQUIREDNESS_SELECT,
        families.SCOPE_EXPANSION_SELECT,
        families.ADVANCED_SIGNAL_SELECT,
    ],
)
def test_counts_deduplicate_by_posting_version_id(sql: str) -> None:
    """모든 지표의 중복 제거 단위는 `posting_version_id` 다(2.2)."""
    assert "count(DISTINCT posting_version_id)" in sql
    assert "count(DISTINCT mention_id)" not in sql
    assert "count(DISTINCT posting_id)" not in sql


def test_pair_sets_deduplicate_by_posting_version_id() -> None:
    assert families.COOCCURRENCE_SETS_CTE.count(
        "SELECT DISTINCT posting_version_id FROM assigned"
    ) == 2


def test_depth_rank_groups_by_posting_version_id() -> None:
    assert "GROUP BY posting_version_id" in families.DEPTH_RANK_CTE


# ------------------------------------------------------------ 3.1 posting_prevalence
def test_posting_prevalence_numerator_and_denominator() -> None:
    """분자는 해당 차원 할당이 있는 공고 버전, 분모는 모집단 전체다(3.1)."""
    assert "SELECT count(*) FROM population)" in families.PREVALENCE_SELECT
    assert "WHERE dimension_id = %(dimension_id)s) AS numerator" in (
        families.PREVALENCE_SELECT
    )

    result = families.prevalence(3, 12)[0]
    assert (result.measure, result.numerator, result.denominator) == ("ratio", 3, 12)
    assert result.value == pytest.approx(0.25)
    assert result.sample_size == 12


# ------------------------------------------------------------ 3.2 requiredness_ratio
def test_requiredness_denominator_is_prevalence_numerator() -> None:
    """분모가 전체 모집단이 아니라 해당 차원이 나타난 공고 수다(3.2)."""
    sql = families.REQUIREDNESS_SELECT
    assert "FROM population" not in sql
    assert "requiredness = 'required'" in sql
    assert sql.count("dimension_id = %(dimension_id)s") == 2

    result = families.requiredness(2, 5)[0]
    assert (result.numerator, result.denominator, result.sample_size) == (2, 5, 5)
    assert result.value == pytest.approx(0.4)


# ------------------------------------------------------------ 3.3 depth_distribution
def test_depth_measures_are_the_three_levels() -> None:
    assert families.MEASURES[MetricFamily.DEPTH_DISTRIBUTION] == (
        "foundation",
        "application",
        "tradeoff",
    )


def test_depth_representative_rule_takes_the_deepest_level() -> None:
    """가장 깊은 등급 하나만 센다. 순서는 foundation < application < tradeoff 다(3.3)."""
    sql = families.DEPTH_RANK_CTE
    assert "WHEN 'tradeoff'    THEN 3" in sql
    assert "WHEN 'application' THEN 2" in sql
    assert "ELSE 1 END" in sql
    assert "max(CASE depth_level" in sql


def test_depth_numerators_sum_to_denominator() -> None:
    """세 measure 의 분자 합이 분모와 정확히 일치한다(3.3)."""
    results = families.depth_distribution(4, 3, 1, 8)
    assert sum(r.numerator or 0 for r in results) == 8
    assert [r.measure for r in results] == list(families.DEPTH_MEASURES)
    assert all(r.denominator == 8 for r in results)


def test_depth_rejects_counts_that_do_not_sum() -> None:
    with pytest.raises(ValueError):
        families.depth_distribution(4, 3, 1, 9)


# ------------------------------------------------------------ 3.4 cluster_contrast
def test_cluster_contrast_stores_cluster_counts_and_derived_value() -> None:
    """두 measure 모두 기업군 범위의 원본 카운트를 담는다(3.4)."""
    results = _by_measure(
        families.cluster_contrast(
            cluster_numerator=6,
            cluster_denominator=10,
            baseline_numerator=6,
            baseline_denominator=20,
        )
    )
    assert set(results) == {"prevalence_difference", "prevalence_ratio"}
    difference = results["prevalence_difference"]
    assert (difference.numerator, difference.denominator) == (6, 10)
    assert difference.value == pytest.approx(0.6 - 0.3)
    assert difference.comparison_sample_size == 20
    assert results["prevalence_ratio"].value == pytest.approx(2.0)


def test_cluster_contrast_skips_ratio_when_baseline_is_zero() -> None:
    """직무 전체 비율이 0 이면 `prevalence_ratio` 행을 만들지 않는다(3.4)."""
    results = families.cluster_contrast(
        cluster_numerator=3,
        cluster_denominator=5,
        baseline_numerator=0,
        baseline_denominator=20,
    )
    assert [r.measure for r in results] == ["prevalence_difference"]
    assert results[0].value == pytest.approx(0.6)


def test_cluster_contrast_without_baseline_population_has_no_value() -> None:
    """직무 전체 분모가 0 이면 견줄 값이 없다."""
    results = families.cluster_contrast(3, 5, 0, 0)
    assert [r.measure for r in results] == ["prevalence_difference"]
    assert results[0].value is None


def test_cluster_contrast_required_measure_is_difference_only() -> None:
    """증분 판정은 조건 없이 만드는 measure 로 갈린다."""
    assert families.REQUIRED_MEASURES[MetricFamily.CLUSTER_CONTRAST] == (
        "prevalence_difference",
    )


# ------------------------------------------------------------ 3.5 cooccurrence
def test_cooccurrence_measures_follow_the_spec() -> None:
    """다섯 measure 의 분자·분모는 docs/metric-spec.md 3.5 의 표와 같다."""
    results = _by_measure(families.cooccurrence(n_ab=4, n_a=10, n_b=8, n_total=20))
    assert set(results) == {
        "count",
        "jaccard",
        "conditional_a_given_b",
        "conditional_b_given_a",
        "association_lift",
    }

    assert (results["count"].numerator, results["count"].denominator) == (4, None)
    assert results["count"].sample_size == 20

    n_union = 10 + 8 - 4
    assert results["jaccard"].denominator == n_union
    assert results["jaccard"].value == pytest.approx(4 / n_union)

    assert results["conditional_a_given_b"].denominator == 8
    assert results["conditional_a_given_b"].value == pytest.approx(0.5)
    assert results["conditional_b_given_a"].denominator == 10
    assert results["conditional_b_given_a"].value == pytest.approx(0.4)

    lift = results["association_lift"]
    assert (lift.numerator, lift.denominator) == (4, 20)
    assert lift.value == pytest.approx((4 / 20) / ((10 / 20) * (8 / 20)))


def test_cooccurrence_lift_is_empty_when_a_set_is_empty() -> None:
    """한 집합이 비면 독립 가정 기대 비율이 0 이라 lift 가 정의되지 않는다."""
    results = _by_measure(families.cooccurrence(0, 0, 5, 20))
    assert results["association_lift"].value is None
    assert results["conditional_b_given_a"].value is None


def test_cooccurrence_count_has_no_value_on_empty_population() -> None:
    """모집단이 0 이면 `not_computable` 이므로 값을 남기지 않는다(2.4)."""
    assert _by_measure(families.cooccurrence(0, 0, 0, 0))["count"].value is None


def test_cooccurrence_counts_come_from_set_operations() -> None:
    sql = families.COOCCURRENCE_SELECT
    assert "JOIN set_b b USING (posting_version_id)) AS n_ab" in sql
    assert "(SELECT count(*) FROM population)          AS n_total" in sql


# ------------------------------------------------------------ 3.6 scope_expansion
def test_scope_expansion_uses_role_boundary_eligible() -> None:
    """경계 차원 중 무엇이든 하나라도 있으면 분자에 센다(3.6)."""
    assert "WHERE role_boundary_eligible" in families.SCOPE_EXPANSION_SELECT
    assert "dv.role_boundary_eligible" in families.ASSIGNED_CTE
    assert "%(dimension_id)s" not in families.SCOPE_EXPANSION_SELECT

    result = families.scope_expansion(7, 20)[0]
    assert (result.numerator, result.denominator) == (7, 20)
    assert result.value == pytest.approx(0.35)


# ------------------------------------------------------------ 3.7 entry_label 심화 신호
def test_advanced_signal_numerator_is_tradeoff_depth() -> None:
    """분자는 `depth_level = 'tradeoff'` 인 할당이 있는 공고 버전이다(3.7)."""
    assert "WHERE depth_level = 'tradeoff'" in families.ADVANCED_SIGNAL_SELECT
    result = families.advanced_signal_rate(3, 9)[0]
    assert (result.numerator, result.denominator) == (3, 9)
    assert result.value == pytest.approx(1 / 3)


def test_advanced_signal_denominator_labels() -> None:
    """분모는 신입·주니어 표기 공고다. `unspecified` 와 `experienced` 는 뺀다(3.7)."""
    assert families.ADVANCED_SIGNAL_LABELS == ("entry", "junior", "entry_junior")
    assert families.segment_labels(EntrySegment.ENTRY_JUNIOR) == tuple(
        sorted(families.ADVANCED_SIGNAL_LABELS)
    )


# ------------------------------------------------------------ 2.5 불확실성
def test_wilson_is_stored_for_ratio_measures_only() -> None:
    """`count` 와 `difference` 를 산출하는 measure 는 불확실성을 저장하지 않는다(2.5)."""
    for family in WILSON_FAMILIES:
        assert families.WILSON_MEASURES[family] == frozenset(
            families.MEASURES[family]
        )
    assert families.WILSON_MEASURES[MetricFamily.CLUSTER_CONTRAST] == frozenset()
    assert families.WILSON_MEASURES[MetricFamily.COOCCURRENCE] == frozenset(
        {"jaccard", "conditional_a_given_b", "conditional_b_given_a"}
    )


# ------------------------------------------------------------ 2.7 대상군
def test_segment_labels_fold_five_labels_into_three_axes() -> None:
    assert families.segment_labels(EntrySegment.ALL) is None
    assert families.segment_labels(EntrySegment.EXPERIENCED) == ("experienced",)
    assert families.segment_labels(EntrySegment.UNSPECIFIED) == ("unspecified",)
