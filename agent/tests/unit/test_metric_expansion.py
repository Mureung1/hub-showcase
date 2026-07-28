"""지표 실행 조합 전개 검증.

규칙은 docs/statistics-model.md 6장과 docs/metric-spec.md 5장에서 온다. 전개는 순수
함수이므로 저장소 없이 단독으로 검사한다. 데이터베이스와 외부 호출은 하지 않는다.
"""

from __future__ import annotations

import pytest

from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.metrics.expansion import (
    ARITY_BY_FAMILY,
    FAMILY_ORDER,
    Applicability,
    DimensionRef,
    Envelope,
    InputArity,
    MetricFamily,
    MetricTemplate,
    dimension_pairs,
    envelopes,
    expand,
)

JOB_ROLE_ID = "backend"
PERIOD = "y2026"
OTHER_PERIOD = "y2024_2025"
CLUSTER = "cluster_platform"

SEGMENTS = (
    EntrySegment.ALL,
    EntrySegment.ENTRY_JUNIOR,
    EntrySegment.EXPERIENCED,
    EntrySegment.UNSPECIFIED,
)


def _templates(*fams: MetricFamily) -> list[MetricTemplate]:
    """시드의 `metric_templates` 와 같은 모양으로 만든다."""
    return [
        MetricTemplate(
            metric_family=str(family),
            formula_version="v1",
            input_arity=ARITY_BY_FAMILY[family],
            output_unit="ratio",
        )
        for family in fams
    ]


def _all_templates() -> list[MetricTemplate]:
    return _templates(*FAMILY_ORDER)


def _dimensions(*ids: str) -> list[DimensionRef]:
    return [DimensionRef(dimension_id=i) for i in ids]


def _overall(segment: EntrySegment = EntrySegment.ALL, period: str = PERIOD) -> Envelope:
    return Envelope(
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB_ROLE_ID,
        entry_segment=segment,
        period_id=period,
    )


def _cluster(segment: EntrySegment = EntrySegment.ALL, period: str = PERIOD) -> Envelope:
    return Envelope(
        scope_level=ScopeLevel.CLUSTER,
        scope_id=CLUSTER,
        entry_segment=segment,
        period_id=period,
    )


# ------------------------------------------------------------ 냉시작
def test_no_dimensions_expands_nothing() -> None:
    """차원이 0개면 계산할 조합이 없다.

    냉시작의 활성 분류체계에는 차원이 없다. 일곱 family 의 분자가 모두 차원 할당에서
    나오므로 차원을 받지 않는 두 family 도 조합을 만들지 않는다.
    """
    assert expand(_all_templates(), [], [_overall()]) == ()


def test_no_envelopes_expands_nothing() -> None:
    """기간이나 범위가 없으면 분모를 거를 조건이 없다."""
    assert expand(_all_templates(), _dimensions("dim_a"), []) == ()


def test_envelopes_empty_when_any_axis_empty() -> None:
    assert envelopes([], SEGMENTS, [PERIOD]) == ()
    assert envelopes([(ScopeLevel.OVERALL, JOB_ROLE_ID)], SEGMENTS, []) == ()


# ------------------------------------------------------------ 전개 단위
def test_one_dimension_families_expand_over_dimension_and_envelope() -> None:
    """차원 하나를 받는 지표는 차원 × 범위 × 대상군 × 기간으로 전개한다."""
    made = expand(
        _templates(MetricFamily.POSTING_PREVALENCE),
        _dimensions("dim_a", "dim_b"),
        envelopes([(ScopeLevel.OVERALL, JOB_ROLE_ID)], SEGMENTS, [PERIOD, OTHER_PERIOD]),
    )
    assert len(made) == 2 * 4 * 2
    assert {c.dimension_id for c in made} == {"dim_a", "dim_b"}
    assert all(c.secondary_dimension_id is None for c in made)


def test_scope_only_family_has_no_dimension() -> None:
    """`scope_expansion` 은 차원을 받지 않는다(docs/metric-spec.md 3.6)."""
    made = expand(
        _templates(MetricFamily.SCOPE_EXPANSION),
        _dimensions("dim_a", "dim_b"),
        [_overall()],
    )
    assert len(made) == 1
    assert made[0].dimension_id is None


def test_cluster_contrast_expands_only_on_cluster_scope() -> None:
    """기업군이 직무 전체와 얼마나 다른가를 재므로 기업군 범위에서만 전개한다."""
    made = expand(
        _templates(MetricFamily.CLUSTER_CONTRAST),
        _dimensions("dim_a"),
        [_overall(), _cluster()],
    )
    assert [c.envelope.scope_level for c in made] == [ScopeLevel.CLUSTER]


def test_entry_signal_rate_is_not_expanded_by_segment() -> None:
    """`entry_label_advanced_signal_rate` 는 대상군으로 전개하지 않는다.

    분모가 이미 신입·주니어 표시 공고이므로 다른 대상군에서는 정의되지 않는다
    (docs/metric-spec.md 5장). `statistics_facts` 의 `entry_signal_rate_segment` CHECK 가
    같은 규칙을 데이터베이스에서 다시 막는다.
    """
    made = expand(
        _templates(MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE),
        _dimensions("dim_a"),
        envelopes([(ScopeLevel.OVERALL, JOB_ROLE_ID)], SEGMENTS, [PERIOD]),
    )
    assert len(made) == 1
    assert made[0].envelope.entry_segment is EntrySegment.ENTRY_JUNIOR


def test_other_families_expand_over_all_four_segments() -> None:
    """대상군 축은 `all` 을 더해 네 값이다(docs/metric-spec.md 2.7)."""
    made = expand(
        _templates(MetricFamily.SCOPE_EXPANSION),
        _dimensions("dim_a"),
        envelopes([(ScopeLevel.OVERALL, JOB_ROLE_ID)], SEGMENTS, [PERIOD]),
    )
    assert {c.envelope.entry_segment for c in made} == set(SEGMENTS)


# ------------------------------------------------------------ 적용 가능성
def test_blocked_combination_is_not_expanded() -> None:
    """`applicable` 이 거짓인 조합은 계산하지 않는다(docs/metric-spec.md 5장)."""
    blocked = Applicability.from_rows(
        [
            {
                "dimension_id": "dim_b",
                "metric_family": str(MetricFamily.POSTING_PREVALENCE),
                "applicable": False,
            }
        ]
    )
    made = expand(
        _templates(MetricFamily.POSTING_PREVALENCE),
        _dimensions("dim_a", "dim_b"),
        [_overall()],
        blocked,
    )
    assert [c.dimension_id for c in made] == ["dim_a"]


def test_applicable_true_rows_do_not_block() -> None:
    """참으로 적은 행은 막지 않는다. 표에 없는 조합도 적용 가능으로 본다."""
    policy = Applicability.from_rows(
        [
            {
                "dimension_id": "dim_a",
                "metric_family": str(MetricFamily.POSTING_PREVALENCE),
                "applicable": True,
            }
        ]
    )
    made = expand(
        _templates(MetricFamily.POSTING_PREVALENCE),
        _dimensions("dim_a", "dim_b"),
        [_overall()],
        policy,
    )
    assert [c.dimension_id for c in made] == ["dim_a", "dim_b"]


def test_blocked_dimension_is_excluded_from_pairs() -> None:
    """적용 불가로 표시된 차원은 차원 쌍에도 들어가지 않는다."""
    blocked = Applicability.from_rows(
        [
            {
                "dimension_id": "dim_b",
                "metric_family": str(MetricFamily.COOCCURRENCE),
                "applicable": False,
            }
        ]
    )
    envelope = _overall()
    made = expand(
        _templates(MetricFamily.COOCCURRENCE),
        _dimensions("dim_a", "dim_b", "dim_c"),
        [envelope],
        blocked,
        {envelope: ["dim_a", "dim_b", "dim_c"]},
    )
    assert [(c.dimension_id, c.secondary_dimension_id) for c in made] == [
        ("dim_a", "dim_c")
    ]


# ------------------------------------------------------------ 차원 쌍
def test_pairs_are_normalized_and_unique() -> None:
    """쌍은 `dimension_id < secondary_dimension_id` 로 정규화해 한 번만 만든다."""
    assert dimension_pairs(["dim_c", "dim_a", "dim_b", "dim_a"]) == (
        ("dim_a", "dim_b"),
        ("dim_a", "dim_c"),
        ("dim_b", "dim_c"),
    )


def test_pairs_need_eligible_list() -> None:
    """쌍의 대상을 주지 않으면 `cooccurrence` 조합을 만들지 않는다.

    조합 폭발을 막기 위해 `posting_prevalence` 가 `minimum_n` 이상인 차원끼리만
    수행하며, 그 판정은 앞선 실행의 결과에 달렸다(docs/metric-spec.md 5장).
    """
    made = expand(
        _templates(MetricFamily.COOCCURRENCE),
        _dimensions("dim_a", "dim_b"),
        [_overall()],
    )
    assert made == ()


def test_pairs_are_expanded_per_envelope() -> None:
    """쌍의 대상은 봉투마다 다르다. 봉투마다 분모가 다르기 때문이다."""
    wide = _overall()
    narrow = _overall(EntrySegment.EXPERIENCED)
    made = expand(
        _templates(MetricFamily.COOCCURRENCE),
        _dimensions("dim_a", "dim_b", "dim_c"),
        [wide, narrow],
        None,
        {wide: ["dim_a", "dim_b", "dim_c"], narrow: ["dim_a"]},
    )
    assert len([c for c in made if c.envelope == wide]) == 3
    assert len([c for c in made if c.envelope == narrow]) == 0


# ------------------------------------------------------------ 결정성
def test_expansion_is_deterministic_regardless_of_input_order() -> None:
    """입력의 차례가 달라도 같은 목록을 준다. 나눠 돌린 실행을 대조할 수 있어야 한다."""
    templates = _all_templates()
    dimensions = _dimensions("dim_b", "dim_a", "dim_c")
    envs = envelopes(
        [(ScopeLevel.CLUSTER, CLUSTER), (ScopeLevel.OVERALL, JOB_ROLE_ID)],
        SEGMENTS,
        [OTHER_PERIOD, PERIOD],
    )
    eligible = {envelope: ["dim_c", "dim_a", "dim_b"] for envelope in envs}

    first = expand(templates, dimensions, envs, None, eligible)
    second = expand(
        list(reversed(templates)),
        list(reversed(dimensions)),
        list(reversed(envs)),
        None,
        eligible,
    )
    assert first == second
    assert len(set(first)) == len(first)


def test_family_order_puts_prevalence_first() -> None:
    """`posting_prevalence` 가 맨 앞이다. 쌍과 기업군 대비가 그 결과를 입력으로 쓴다."""
    assert FAMILY_ORDER[0] is MetricFamily.POSTING_PREVALENCE
    assert set(FAMILY_ORDER) == set(MetricFamily)


def test_arity_table_matches_seed() -> None:
    """입력 차수는 docs/metric-spec.md 5장의 표와 같다."""
    assert ARITY_BY_FAMILY == {
        MetricFamily.POSTING_PREVALENCE: InputArity.ONE_DIMENSION,
        MetricFamily.REQUIREDNESS_RATIO: InputArity.ONE_DIMENSION,
        MetricFamily.DEPTH_DISTRIBUTION: InputArity.ONE_DIMENSION,
        MetricFamily.CLUSTER_CONTRAST: InputArity.DIMENSION_CLUSTER,
        MetricFamily.COOCCURRENCE: InputArity.TWO_DIMENSIONS,
        MetricFamily.SCOPE_EXPANSION: InputArity.SCOPE_ONLY,
        MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE: InputArity.SCOPE_ONLY,
    }


def test_template_with_wrong_arity_is_rejected() -> None:
    """템플릿의 입력 차수가 문서와 다르면 전개하지 않는다."""
    wrong = [
        MetricTemplate(
            metric_family=str(MetricFamily.POSTING_PREVALENCE),
            formula_version="v1",
            input_arity=InputArity.SCOPE_ONLY,
            output_unit="ratio",
        )
    ]
    with pytest.raises(ValueError):
        expand(wrong, _dimensions("dim_a"), [_overall()])


def test_fact_key_matches_unique_index() -> None:
    """조합 키는 `idx_statistics_facts_unique` 와 같은 자리를 갖는다."""
    made = expand(
        _templates(MetricFamily.POSTING_PREVALENCE),
        _dimensions("dim_a"),
        [_cluster(EntrySegment.EXPERIENCED)],
    )
    assert made[0].fact_key("ratio") == (
        "posting_prevalence",
        "ratio",
        "cluster",
        CLUSTER,
        "experienced",
        PERIOD,
        "dim_a",
        "",
    )
