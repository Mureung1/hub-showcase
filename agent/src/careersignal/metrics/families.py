"""지표 family 일곱 종의 정의와 SQL 조각.

분자·분모·measure 의 기준은 docs/metric-spec.md 3.1~3.7 이고, 공통 규약은 같은 문서
2.1~2.5 다. 집계는 결정적으로 수행하며 생성 모델은 수치를 산출하지 않는다
(docs/statistics-model.md 5.1).

이 모듈은 두 가지를 담는다. 하나는 SQL 조각이고 하나는 카운트를 measure 행으로 옮기는
순수 함수다. SQL 을 실행하지 않으므로 저장소를 import 하지 않는다. 조각을 문장으로
조립하고 실행하는 것은 `repositories/metrics.py` 다.

세 가지 규약이 일곱 family 에 공통으로 걸린다.

- 모든 지표의 분모 모집단은 `posting_versions` 다(docs/metric-spec.md 2.1). 통계 집계는
  A 계층 자료만 쓰므로 공고로 등록되지 않은 출처는 어떤 분모에도 들어가지 않는다.
- 모든 지표의 중복 제거 단위는 `posting_version_id` 다(같은 문서 2.2). 한 공고 버전에서
  같은 차원이 여러 mention 으로 나타나도 한 번 센다.
- 차원을 받는 지표는 활성 분류체계의 할당만 쓴다(같은 문서 2.3).
  `lifecycle_status` 가 `active` 가 아닌 차원은 집계에 포함하지 않는다.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from careersignal.domain.segment import EntryLabel, EntrySegment, segment_of
from careersignal.metrics.expansion import MetricFamily

RATIO = "ratio"
"""분자를 분모로 나눈 하나의 비율. 네 family 가 이 measure 하나만 갖는다."""

DEPTH_MEASURES: tuple[str, ...] = ("foundation", "application", "tradeoff")
"""`depth_distribution` 의 measure. 깊이 등급 이름을 그대로 쓴다.

셋의 분자 합이 분모와 정확히 같다. 한 공고 버전이 같은 차원에 여러 깊이의 할당을
가지면 가장 깊은 등급 하나만 세기 때문이다(docs/metric-spec.md 3.3).
"""

PREVALENCE_DIFFERENCE = "prevalence_difference"
"""`cluster_contrast` 의 차이 measure. 기업군 비율에서 직무 전체 비율을 뺀다."""

PREVALENCE_RATIO = "prevalence_ratio"
"""`cluster_contrast` 의 비율 measure. 직무 전체 비율이 0 이면 만들지 않는다."""

COOCCURRENCE_COUNT = "count"
COOCCURRENCE_JACCARD = "jaccard"
COOCCURRENCE_A_GIVEN_B = "conditional_a_given_b"
COOCCURRENCE_B_GIVEN_A = "conditional_b_given_a"
COOCCURRENCE_LIFT = "association_lift"
"""`cooccurrence` 의 다섯 measure. 정의는 docs/metric-spec.md 3.5 다."""

MEASURES: dict[MetricFamily, tuple[str, ...]] = {
    MetricFamily.POSTING_PREVALENCE: (RATIO,),
    MetricFamily.REQUIREDNESS_RATIO: (RATIO,),
    MetricFamily.DEPTH_DISTRIBUTION: DEPTH_MEASURES,
    MetricFamily.CLUSTER_CONTRAST: (PREVALENCE_DIFFERENCE, PREVALENCE_RATIO),
    MetricFamily.COOCCURRENCE: (
        COOCCURRENCE_COUNT,
        COOCCURRENCE_JACCARD,
        COOCCURRENCE_A_GIVEN_B,
        COOCCURRENCE_B_GIVEN_A,
        COOCCURRENCE_LIFT,
    ),
    MetricFamily.SCOPE_EXPANSION: (RATIO,),
    MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE: (RATIO,),
}
"""family 가 만들 수 있는 measure 전부."""

REQUIRED_MEASURES: dict[MetricFamily, tuple[str, ...]] = {
    **MEASURES,
    MetricFamily.CLUSTER_CONTRAST: (PREVALENCE_DIFFERENCE,),
}
"""조건 없이 반드시 만드는 measure. 증분 판정이 이 목록으로 갈린다.

`cluster_contrast` 의 `prevalence_ratio` 는 직무 전체 비율이 0 이면 만들지 않으므로
(docs/metric-spec.md 3.4) 없는 것이 정상이다. 그 자리를 "아직 계산하지 않았다" 로 읽으면
같은 조합을 매 실행 다시 계산한다.
"""

WILSON_MEASURES: dict[MetricFamily, frozenset[str]] = {
    MetricFamily.POSTING_PREVALENCE: frozenset({RATIO}),
    MetricFamily.REQUIREDNESS_RATIO: frozenset({RATIO}),
    MetricFamily.DEPTH_DISTRIBUTION: frozenset(DEPTH_MEASURES),
    MetricFamily.CLUSTER_CONTRAST: frozenset(),
    MetricFamily.COOCCURRENCE: frozenset(
        {COOCCURRENCE_JACCARD, COOCCURRENCE_A_GIVEN_B, COOCCURRENCE_B_GIVEN_A}
    ),
    MetricFamily.SCOPE_EXPANSION: frozenset({RATIO}),
    MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE: frozenset({RATIO}),
}
"""Wilson 95% 구간을 저장하는 measure(docs/metric-spec.md 2.5).

비율을 산출하는 measure 만 담는다. `count` 와 `difference` 를 산출하는 measure 는
`uncertainty` 를 비운다. `association_lift` 는 비율의 비율이라 Wilson 구간이 성립하지
않고, `cluster_contrast` 의 두 measure 는 서로 다른 두 모집단의 비율에서 파생하므로
한 이항 분포의 구간으로 표현되지 않는다.
"""

ADVANCED_SIGNAL_LABELS: tuple[str, ...] = ("entry", "junior", "entry_junior")
"""`entry_label_advanced_signal_rate` 의 분모가 되는 `entry_label`.

`unspecified` 와 `experienced` 는 제외한다(docs/metric-spec.md 3.7). `경력무관` 은
`unspecified` 이며 신입이 지원할 수 있다는 뜻이지 신입을 대상으로 삼는다는 뜻이 아니다
(같은 문서 2.6).
"""


def segment_labels(segment: EntrySegment) -> tuple[str, ...] | None:
    """대상군을 모집단 필터의 `entry_label` 목록으로 옮긴다.

    `all` 은 대상군으로 제한하지 않은 모집단 전체이므로 필터가 없다는 뜻의 None 이다
    (docs/metric-spec.md 2.7).

    대응을 여기에 다시 적지 않고 `domain/segment.py` 의 `segment_of` 에서 뒤집어
    만든다. 표기 다섯 값을 축 세 값으로 접는 규칙이 하나뿐이어야 접는 쪽과 푸는 쪽이
    어긋나지 않는다.
    """
    if segment is EntrySegment.ALL:
        return None
    return tuple(
        sorted(str(label) for label in EntryLabel if segment_of(label) is segment)
    )


class MeasureResult(BaseModel):
    """measure 하나의 산출값. `statistics_facts` 한 행이 될 재료다.

    `sample_status` 와 `uncertainty` 는 여기에 없다. 표본 상태 판정과 억제, 불확실성
    계산은 `metrics/policy.py` 가 담당하며 `metrics/runner.py` 의 `SamplePolicy` 로
    들어온다. 두 값을 이 자리에서 임시로 채우면 정책 버전이 정하는 임계값이 아니라
    코드 상수가 판정한 것이 된다(docs/metric-spec.md 6장).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    measure: str
    numerator: int | None = None
    denominator: int | None = None
    value: float | None = None
    sample_size: int = 0
    comparison_sample_size: int | None = None
    """함께 견주는 다른 모집단의 분모. `cluster_contrast` 만 갖는다.

    표본 판정이 기업군 분모와 직무 전체 분모를 둘 다 보므로(docs/metric-spec.md 3.4)
    판정을 맡은 쪽에 두 값을 함께 넘긴다.
    """


def ratio(numerator: int, denominator: int) -> float | None:
    """분모가 0 이면 값이 없다.

    분모가 0 인 조합은 `not_computable` 이고 `value` 는 NULL 이다
    (docs/metric-spec.md 2.4). `statistics_facts` 의 `not_computable_has_no_value`
    CHECK 가 같은 규칙을 데이터베이스에서 다시 막는다.
    """
    return None if denominator <= 0 else numerator / denominator


# ------------------------------------------------------------ SQL 조각
POPULATION_CTE = """
        population AS (
            SELECT pv.posting_version_id
            FROM posting_versions pv
            JOIN postings p ON p.posting_id = pv.posting_id
            JOIN periods pd ON pd.period_id = %(period_id)s
            WHERE p.job_role_id = %(job_role_id)s
              AND pv.dataset_version = %(dataset_version)s
              AND pv.posted_at::date BETWEEN pd.starts_on AND pd.ends_on
              AND (%(entry_labels)s::text[] IS NULL
                   OR pv.entry_label = ANY(%(entry_labels)s::text[]))
              AND (%(scope_level)s <> 'posting' OR p.posting_id = %(scope_id)s)
              AND (%(scope_level)s <> 'cluster' OR EXISTS (
                    SELECT 1 FROM company_cluster_memberships m
                    WHERE m.company_id = p.company_id
                      AND m.cluster_id = %(scope_id)s
                      AND m.valid_from <= %(as_of_date)s
                      AND (m.valid_to IS NULL OR m.valid_to >= %(as_of_date)s)
                  ))
        )"""
"""모든 지표의 분모 모집단(docs/metric-spec.md 2.1).

`posting_versions` 를 직무·데이터셋·기간으로 거른다. `postings` 를 조인하는 이유는
직무 판정이 공고 단위이기 때문이다(docs/erd.md 4.5). 기간은 `periods` 한 행을 조인해
`posted_at` 의 날짜가 그 구간에 드는지로 가른다. 기간 정의를 코드에 적지 않고 표에서
읽어야 `period_id` 를 더해 기간을 늘릴 수 있다(docs/erd.md 3.5).

기업군 조건은 `company_cluster_memberships` 를 실행 봉투의 `as_of_date` 로 해석한다
(docs/statistics-model.md 5.2). 공고 버전은 기업군을 속성으로 갖지 않으므로
(docs/erd.md 4.6) 소속을 조인이 아니라 시점 조건으로 확정한다. `EXISTS` 를 쓰는 이유는
한 회사가 서로 다른 기업군에 동시에 속할 수 있어(docs/erd.md 3.4) 조인하면 같은 공고
버전이 여러 번 나오기 때문이다.

`entry_labels` 가 NULL 이면 대상군으로 제한하지 않는다. `all` 행은 대상군별 행과 분모가
다른 별개의 행이며 대상군별 값을 더해 만들지 않는다(docs/metric-spec.md 2.7).

결과는 `posting_version_id` 하나뿐이고 그것이 기본키이므로 이 CTE 는 중복이 없다.
뒤따르는 카운트가 `posting_version_id` 단위의 중복 제거를 여기서 이미 얻는다.
"""

ASSIGNED_CTE = """
        assigned AS (
            SELECT DISTINCT
                   rm.posting_version_id,
                   a.dimension_id,
                   a.requiredness,
                   a.depth_level,
                   dv.role_boundary_eligible
            FROM population pop
            JOIN requirement_mentions rm
              ON rm.posting_version_id = pop.posting_version_id
            JOIN posting_requirement_assignments a ON a.mention_id = rm.mention_id
            JOIN requirement_dimension_versions dv
              ON dv.dimension_id = a.dimension_id
             AND dv.taxonomy_version_id = a.taxonomy_version_id
            WHERE a.taxonomy_version_id = %(taxonomy_version_id)s
              AND dv.lifecycle_status = 'active'
        )"""
"""모집단 안의 활성 차원 할당(docs/metric-spec.md 2.3).

`requirement_mentions` 를 거쳐 공고 버전과 할당을 잇는다. 할당은 mention 에 붙고
mention 이 `posting_version_id` 를 가지므로(docs/erd.md 6.1·7.13) 이 경로가 유일하다.

`requirement_dimension_versions` 를 함께 조인해 `lifecycle_status` 가 `active` 인 차원만
남긴다. 승격 전 후보에 붙은 할당이 집계에 들어가면 심사를 거치지 않은 차원이 화면에
숫자로 나온다(docs/statistics-model.md 3.3). 같은 조인이 `role_boundary_eligible` 도
가져오므로 `scope_expansion` 이 조인을 하나 더 걸지 않는다.

`DISTINCT` 는 한 공고 버전에서 같은 차원이 여러 mention 으로 나타났을 때 행이 부푸는
것을 줄일 뿐이며, 중복 제거의 근거는 카운트의 `count(DISTINCT posting_version_id)` 다
(docs/metric-spec.md 2.2). 같은 차원이 한 공고에서 `required` 와 `preferred` 로 갈리면
이 CTE 에 두 행이 남고, 그 갈림을 `requiredness_ratio` 가 쓴다.
"""

PREVALENCE_SELECT = """
        SELECT
            (SELECT count(DISTINCT posting_version_id) FROM assigned
              WHERE dimension_id = %(dimension_id)s) AS numerator,
            (SELECT count(*) FROM population)         AS denominator"""
"""`posting_prevalence` 의 분자·분모(docs/metric-spec.md 3.1).

분자는 해당 차원 할당이 있는 `posting_version` 수, 분모는 범위·대상군·기간의
`posting_version` 수다. 분모가 모집단 전체이므로 `population` 을 그대로 센다.
"""

REQUIREDNESS_SELECT = """
        SELECT
            (SELECT count(DISTINCT posting_version_id) FROM assigned
              WHERE dimension_id = %(dimension_id)s
                AND requiredness = 'required')  AS numerator,
            (SELECT count(DISTINCT posting_version_id) FROM assigned
              WHERE dimension_id = %(dimension_id)s) AS denominator"""
"""`requiredness_ratio` 의 분자·분모(docs/metric-spec.md 3.2).

분모가 모집단 전체가 아니라 `posting_prevalence` 의 분자와 같다. 해당 차원이 나타난
공고 중 필수로 표기한 비율이므로 나타나지 않은 공고는 분모에 들지 않는다.

한 공고에 같은 차원의 `required` 할당과 `preferred` 할당이 함께 있으면 `required` 로
센다. `count(DISTINCT posting_version_id)` 가 `required` 행 하나만 있어도 그 공고를 한
번 세므로 이 규칙이 조건 하나로 성립한다.
"""

DEPTH_RANK_CTE = """
        ranked AS (
            SELECT posting_version_id,
                   max(CASE depth_level
                         WHEN 'tradeoff'    THEN 3
                         WHEN 'application' THEN 2
                         ELSE 1 END) AS depth_rank
            FROM assigned
            WHERE dimension_id = %(dimension_id)s
            GROUP BY posting_version_id
        )"""
"""대표 등급 규칙(docs/metric-spec.md 3.3).

한 공고 버전이 같은 차원에 여러 깊이의 할당을 가지면 가장 깊은 등급 하나만 센다.
순서는 `foundation < application < tradeoff` 다. `max` 와 `GROUP BY` 가 공고 버전마다
한 행을 남기므로 세 measure 의 분자 합이 분모와 정확히 일치하고, 백분율로 읽어도
100%를 넘지 않는다.

준비 기준으로도 이 규칙이 맞다. 가장 깊은 요구에 맞추면 아래 등급은 따라온다.
"""

DEPTH_SELECT = """
        SELECT
            count(*) FILTER (WHERE depth_rank = 1) AS foundation,
            count(*) FILTER (WHERE depth_rank = 2) AS application,
            count(*) FILTER (WHERE depth_rank = 3) AS tradeoff,
            count(*)                               AS denominator
        FROM ranked"""
"""`depth_distribution` 의 등급별 분자와 분모(docs/metric-spec.md 3.3).

분모는 해당 차원 할당이 있는 `posting_version` 수이며 `ranked` 의 행 수와 같다.
`ranked` 가 공고 버전마다 한 행이므로 따로 중복을 제거하지 않는다.
"""

COOCCURRENCE_SETS_CTE = """
        set_a AS (
            SELECT DISTINCT posting_version_id FROM assigned
            WHERE dimension_id = %(dimension_id)s
        ),
        set_b AS (
            SELECT DISTINCT posting_version_id FROM assigned
            WHERE dimension_id = %(secondary_dimension_id)s
        )"""
"""두 차원이 나타난 공고 버전 집합(docs/metric-spec.md 3.5).

집합 연산으로 다섯 measure 를 모두 만든다. `DISTINCT` 가 집합의 정의를 그대로
표현하므로 교집합·합집합의 크기가 `posting_version_id` 단위다.
"""

COOCCURRENCE_SELECT = """
        SELECT
            (SELECT count(*) FROM set_a a
              JOIN set_b b USING (posting_version_id)) AS n_ab,
            (SELECT count(*) FROM set_a)               AS n_a,
            (SELECT count(*) FROM set_b)               AS n_b,
            (SELECT count(*) FROM population)          AS n_total"""
"""`cooccurrence` 의 네 카운트(docs/metric-spec.md 3.5).

합집합 크기는 따로 세지 않고 `n_a + n_b - n_ab` 로 얻는다. 세 값이 이미 같은 기준으로
세어졌으므로 한 번 더 조회할 이유가 없고, 포함배제로 얻은 값이 조회 결과와 어긋날 수도
없다.
"""

SCOPE_EXPANSION_SELECT = """
        SELECT
            (SELECT count(DISTINCT posting_version_id) FROM assigned
              WHERE role_boundary_eligible) AS numerator,
            (SELECT count(*) FROM population) AS denominator"""
"""`scope_expansion` 의 분자·분모(docs/metric-spec.md 3.6).

차원을 받지 않는다. 경계 차원 중 무엇이든 하나라도 있으면 분자에 센다.
`role_boundary_eligible` 은 `requirement_dimension_versions` 의 컬럼이므로 분류체계
버전마다 다시 판정되며, `ASSIGNED_CTE` 가 활성 버전의 값을 이미 가져온다.
"""

ADVANCED_SIGNAL_SELECT = """
        SELECT
            (SELECT count(DISTINCT posting_version_id) FROM assigned
              WHERE depth_level = 'tradeoff') AS numerator,
            (SELECT count(*) FROM population)  AS denominator"""
"""`entry_label_advanced_signal_rate` 의 분자·분모(docs/metric-spec.md 3.7).

분모가 전체 모집단이 아니라 `entry_label IN ('entry','junior','entry_junior')` 인
공고다. 그 제한을 이 조각이 다시 걸지 않는 이유는 `POPULATION_CTE` 의 `entry_labels`
가 이미 같은 집합이기 때문이다. 이 지표는 `entry_junior` 대상군에서만 전개되고
(docs/metric-spec.md 5장) `segment_labels(EntrySegment.ENTRY_JUNIOR)` 가
`ADVANCED_SIGNAL_LABELS` 와 같은 세 값을 준다. 조건을 두 곳에 적으면 한쪽만 고쳐졌을 때
분모가 조용히 달라진다.

심화 신호는 `depth_level` 이 `tradeoff` 인 할당의 존재로 판정한다
(docs/statistics-model.md 5.7). 이 지표는 관측값이며 기대값과의 차이가 아니다.
"""


# ------------------------------------------------------------ 결과 판정
def prevalence(numerator: int, denominator: int) -> tuple[MeasureResult, ...]:
    """`posting_prevalence` 의 measure 한 줄."""
    return (
        MeasureResult(
            measure=RATIO,
            numerator=numerator,
            denominator=denominator,
            value=ratio(numerator, denominator),
            sample_size=denominator,
        ),
    )


def requiredness(numerator: int, denominator: int) -> tuple[MeasureResult, ...]:
    """`requiredness_ratio` 의 measure 한 줄."""
    return (
        MeasureResult(
            measure=RATIO,
            numerator=numerator,
            denominator=denominator,
            value=ratio(numerator, denominator),
            sample_size=denominator,
        ),
    )


def depth_distribution(
    foundation: int, application: int, tradeoff: int, denominator: int
) -> tuple[MeasureResult, ...]:
    """`depth_distribution` 의 등급별 measure 세 줄.

    세 분자의 합이 분모와 같은지 여기서 확인한다. 대표 등급 규칙이 공고 버전마다 한
    등급만 남기므로 어긋날 수 없고(docs/metric-spec.md 3.3), 어긋났다면 조회가 규칙을
    지키지 않은 것이다. `statistics_facts` 의 `numerator_within` CHECK 는 행 하나씩만
    보므로 합의 어긋남을 잡지 못한다.
    """
    counts = (foundation, application, tradeoff)
    if sum(counts) != denominator:
        raise ValueError(
            "depth_distribution 세 measure 의 분자 합이 분모와 다르다: "
            f"{counts} vs {denominator}"
        )
    return tuple(
        MeasureResult(
            measure=measure,
            numerator=count,
            denominator=denominator,
            value=ratio(count, denominator),
            sample_size=denominator,
        )
        for measure, count in zip(DEPTH_MEASURES, counts)
    )


def scope_expansion(numerator: int, denominator: int) -> tuple[MeasureResult, ...]:
    """`scope_expansion` 의 measure 한 줄."""
    return (
        MeasureResult(
            measure=RATIO,
            numerator=numerator,
            denominator=denominator,
            value=ratio(numerator, denominator),
            sample_size=denominator,
        ),
    )


def advanced_signal_rate(
    numerator: int, denominator: int
) -> tuple[MeasureResult, ...]:
    """`entry_label_advanced_signal_rate` 의 measure 한 줄."""
    return (
        MeasureResult(
            measure=RATIO,
            numerator=numerator,
            denominator=denominator,
            value=ratio(numerator, denominator),
            sample_size=denominator,
        ),
    )


def cooccurrence(
    n_ab: int, n_a: int, n_b: int, n_total: int
) -> tuple[MeasureResult, ...]:
    """`cooccurrence` 의 measure 다섯 줄(docs/metric-spec.md 3.5).

    `count` 는 분모가 없다. 표본 수는 모집단 크기를 담는다. 교집합 수 하나만 놓고는
    그 수가 몇 건 가운데 나온 것인지 알 수 없다.

    `association_lift` 는 비율의 비율이므로 `numerator`·`denominator` 에 교집합 수와
    모집단 수를 담고 `value` 에 lift 를 담는다. 두 집합 가운데 하나라도 비면 독립 가정
    기대 비율이 0 이라 lift 가 정의되지 않으므로 값을 비운다.
    """
    n_union = n_a + n_b - n_ab
    lift = (
        None
        if n_a <= 0 or n_b <= 0 or n_total <= 0
        else (n_ab * n_total) / (n_a * n_b)
    )
    return (
        MeasureResult(
            measure=COOCCURRENCE_COUNT,
            numerator=n_ab,
            denominator=None,
            value=None if n_total <= 0 else float(n_ab),
            sample_size=n_total,
        ),
        MeasureResult(
            measure=COOCCURRENCE_JACCARD,
            numerator=n_ab,
            denominator=n_union,
            value=ratio(n_ab, n_union),
            sample_size=n_union,
        ),
        MeasureResult(
            measure=COOCCURRENCE_A_GIVEN_B,
            numerator=n_ab,
            denominator=n_b,
            value=ratio(n_ab, n_b),
            sample_size=n_b,
        ),
        MeasureResult(
            measure=COOCCURRENCE_B_GIVEN_A,
            numerator=n_ab,
            denominator=n_a,
            value=ratio(n_ab, n_a),
            sample_size=n_a,
        ),
        MeasureResult(
            measure=COOCCURRENCE_LIFT,
            numerator=n_ab,
            denominator=n_total,
            value=lift,
            sample_size=n_total,
        ),
    )


def cluster_contrast(
    cluster_numerator: int,
    cluster_denominator: int,
    baseline_numerator: int,
    baseline_denominator: int,
) -> tuple[MeasureResult, ...]:
    """`cluster_contrast` 의 measure 한두 줄(docs/metric-spec.md 3.4).

    두 measure 모두 `value` 에 결과를 담고 `numerator`·`denominator` 에는 기업군 범위의
    원본 카운트를 담는다. `statistics_facts` 의 두 컬럼이 정수 카운트만 담는다는 규약을
    지키기 위해서다(docs/erd.md 10.5). 직무 전체 값은 같은 분석 버전의
    `posting_prevalence` 행에서 조회한다.

    직무 전체 비율이 0 이면 `prevalence_ratio` 행을 만들지 않는다. 0 으로 나눌 수 없고,
    작은 분모에서 나온 비율은 과장된다. `prevalence_difference` 행은 그대로 저장한다.

    직무 전체 분모가 0 이면 견줄 값 자체가 없으므로 두 measure 모두 `value` 를 비운다.
    표본 판정이 기업군 분모와 직무 전체 분모를 둘 다 보므로
    `comparison_sample_size` 에 직무 전체 분모를 함께 담는다.
    """
    cluster_value = ratio(cluster_numerator, cluster_denominator)
    baseline_value = ratio(baseline_numerator, baseline_denominator)

    difference = (
        None
        if cluster_value is None or baseline_value is None
        else cluster_value - baseline_value
    )
    results = [
        MeasureResult(
            measure=PREVALENCE_DIFFERENCE,
            numerator=cluster_numerator,
            denominator=cluster_denominator,
            value=difference,
            sample_size=cluster_denominator,
            comparison_sample_size=baseline_denominator,
        )
    ]
    if baseline_value:
        results.append(
            MeasureResult(
                measure=PREVALENCE_RATIO,
                numerator=cluster_numerator,
                denominator=cluster_denominator,
                value=(
                    None if cluster_value is None else cluster_value / baseline_value
                ),
                sample_size=cluster_denominator,
                comparison_sample_size=baseline_denominator,
            )
        )
    return tuple(results)


__all__ = [
    "ADVANCED_SIGNAL_LABELS",
    "ADVANCED_SIGNAL_SELECT",
    "ASSIGNED_CTE",
    "COOCCURRENCE_A_GIVEN_B",
    "COOCCURRENCE_B_GIVEN_A",
    "COOCCURRENCE_COUNT",
    "COOCCURRENCE_JACCARD",
    "COOCCURRENCE_LIFT",
    "COOCCURRENCE_SELECT",
    "COOCCURRENCE_SETS_CTE",
    "DEPTH_MEASURES",
    "DEPTH_RANK_CTE",
    "DEPTH_SELECT",
    "MEASURES",
    "POPULATION_CTE",
    "PREVALENCE_DIFFERENCE",
    "PREVALENCE_RATIO",
    "PREVALENCE_SELECT",
    "RATIO",
    "REQUIREDNESS_SELECT",
    "REQUIRED_MEASURES",
    "SCOPE_EXPANSION_SELECT",
    "WILSON_MEASURES",
    "MeasureResult",
    "advanced_signal_rate",
    "cluster_contrast",
    "cooccurrence",
    "depth_distribution",
    "prevalence",
    "ratio",
    "requiredness",
    "scope_expansion",
    "segment_labels",
]
