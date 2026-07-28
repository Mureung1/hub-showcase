"""지표 실행 조합 전개.

정의는 docs/statistics-model.md 6장과 docs/metric-spec.md 5장이다. 실행 조합은
`활성 지표 템플릿 × 적용 가능한 차원(또는 차원 쌍) × 범위 × 대상군 × 기간` 으로
전개한다.

순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 전개와 판정을 집계 실행에서
떼어 두면 저장소 없이 조합 규칙만 검사할 수 있고, 규칙이 바뀌었을 때 어느 SQL 이
아니라 어느 규칙이 달라졌는지가 드러난다.

지표마다 입력 차수가 다르므로 모든 지표를 모든 차원에 적용하지 않는다. 차원 하나를
받는 지표, 차원 두 개를 받는 지표, 차원과 기업군을 함께 받는 지표, 차원 없이 범위만
받는 지표가 있다(docs/metric-spec.md 5장).
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from enum import StrEnum
from itertools import combinations

from pydantic import BaseModel, ConfigDict

from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.domain.segment import applicable as segment_applicable


class MetricFamily(StrEnum):
    """`metric_templates.metric_family` 의 일곱 값.

    시드가 넣는 목록과 같다(`migrations/sql/0002_seed_reference.sql`). `temporal_delta`
    는 독립 지표가 아니라 다른 지표에 적용하는 연산자이므로 여기에 없다
    (docs/metric-spec.md 4장).
    """

    POSTING_PREVALENCE = "posting_prevalence"
    REQUIREDNESS_RATIO = "requiredness_ratio"
    DEPTH_DISTRIBUTION = "depth_distribution"
    CLUSTER_CONTRAST = "cluster_contrast"
    COOCCURRENCE = "cooccurrence"
    SCOPE_EXPANSION = "scope_expansion"
    ENTRY_LABEL_ADVANCED_SIGNAL_RATE = "entry_label_advanced_signal_rate"


class InputArity(StrEnum):
    """`metric_templates.input_arity` 의 CHECK 와 같은 집합이다(docs/erd.md 10.1)."""

    SCOPE_ONLY = "scope_only"
    ONE_DIMENSION = "one_dimension"
    TWO_DIMENSIONS = "two_dimensions"
    DIMENSION_CLUSTER = "dimension_cluster"


ARITY_BY_FAMILY: dict[MetricFamily, InputArity] = {
    MetricFamily.POSTING_PREVALENCE: InputArity.ONE_DIMENSION,
    MetricFamily.REQUIREDNESS_RATIO: InputArity.ONE_DIMENSION,
    MetricFamily.DEPTH_DISTRIBUTION: InputArity.ONE_DIMENSION,
    MetricFamily.CLUSTER_CONTRAST: InputArity.DIMENSION_CLUSTER,
    MetricFamily.COOCCURRENCE: InputArity.TWO_DIMENSIONS,
    MetricFamily.SCOPE_EXPANSION: InputArity.SCOPE_ONLY,
    MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE: InputArity.SCOPE_ONLY,
}
"""family 별 입력 차수. docs/metric-spec.md 5장의 표와 같다.

시드의 `metric_templates` 가 같은 값을 갖는다. 두 곳이 어긋나면 전개가 문서와 다른
모양이 되므로 `expand` 가 템플릿의 값을 이 표와 대조한다.
"""

FAMILY_ORDER: tuple[MetricFamily, ...] = (
    MetricFamily.POSTING_PREVALENCE,
    MetricFamily.REQUIREDNESS_RATIO,
    MetricFamily.DEPTH_DISTRIBUTION,
    MetricFamily.SCOPE_EXPANSION,
    MetricFamily.ENTRY_LABEL_ADVANCED_SIGNAL_RATE,
    MetricFamily.COOCCURRENCE,
    MetricFamily.CLUSTER_CONTRAST,
)
"""실행 순서. 앞선 family 의 결과를 뒤가 입력으로 쓴다.

`posting_prevalence` 가 맨 앞이다. 차원 쌍의 전개가 `posting_prevalence` 의 분자로
대상을 자르고(docs/metric-spec.md 5장), `cluster_contrast` 는 기업군과 직무 전체의
`posting_prevalence` 를 견주므로(같은 문서 3.4) 둘 다 그 결과가 먼저 있어야 한다.

전개 자체는 이 순서에 의존하지 않는다. 순서는 결과의 차례를 고정해 재실행이 같은
목록을 주게 하는 것과 실행 단계를 나누는 데 쓴다.
"""

CLUSTER_ONLY_FAMILIES: frozenset[MetricFamily] = frozenset(
    {MetricFamily.CLUSTER_CONTRAST}
)
"""기업군 범위에서만 전개하는 지표.

`cluster_contrast` 는 기업군이 직무 전체와 얼마나 다른가를 재므로 기업군 범위가
아닌 조합에서는 견줄 대상이 없다(docs/metric-spec.md 3.4).
"""


class MetricTemplate(BaseModel):
    """`metric_templates` 한 행(docs/erd.md 10.1)."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_family: str
    formula_version: str
    input_arity: InputArity
    output_unit: str


class DimensionRef(BaseModel):
    """전개에 필요한 차원 정보.

    `role_boundary_eligible` 은 `requirement_dimension_versions` 의 컬럼이며 분류체계
    버전마다 다시 판정한다(docs/metric-spec.md 3.6). 전개에는 쓰지 않고 집계가 분자를
    가를 때 쓰지만, 차원 목록을 두 벌 나르지 않으려고 한자리에 담는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    dimension_id: str
    role_boundary_eligible: bool = False


class Envelope(BaseModel):
    """조합의 봉투. 범위·대상군·기간을 함께 묶는다.

    `statistics_facts` 의 유일 조건 가운데 지표와 차원을 뺀 나머지다
    (docs/erd.md 10.5). 세 축이 함께 움직여야 분모가 정해지므로 따로 나르지 않는다.

    `scope_id` 는 NOT NULL 이다. `overall` 범위에는 가리킬 대상이 없으므로 직무
    식별자를 담는다. 범위가 직무 전체라는 사실을 `scope_level` 이 이미 말하고,
    `scope_id` 는 어느 직무의 전체인지를 남긴다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    scope_level: ScopeLevel
    scope_id: str
    entry_segment: EntrySegment
    period_id: str

    @property
    def sort_key(self) -> tuple[str, str, str, str]:
        return (
            str(self.scope_level),
            self.scope_id,
            str(self.entry_segment),
            self.period_id,
        )


class Applicability(BaseModel):
    """`dimension_metric_applicability` 의 판정(docs/erd.md 10.4).

    운영자가 마이그레이션과 시드로 관리하는 표이며 어떤 구성요소도 쓰지 않는다
    (docs/permission-matrix.md 3장). 집계는 읽기만 한다.

    `applicable` 이 거짓인 조합만 담는다. 표에 행이 없는 조합은 적용 가능으로 본다.
    문서가 막는 것을 기록하라고 정하고("`applicable`이 거짓인 조합은 계산하지 않으며",
    docs/metric-spec.md 5장) 허용을 일일이 적으라고 하지 않으므로, 행이 없다는 것은
    판정하지 않았다는 뜻이지 금지했다는 뜻이 아니다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    blocked: frozenset[tuple[str, str]] = frozenset()
    """`(dimension_id, metric_family)` 로 적은 적용 불가 조합."""

    @classmethod
    def from_rows(cls, rows: Sequence[Mapping[str, object]]) -> Applicability:
        """저장소 행에서 만든다. `applicable` 이 거짓인 행만 담는다."""
        return cls(
            blocked=frozenset(
                (str(row["dimension_id"]), str(row["metric_family"]))
                for row in rows
                if not row["applicable"]
            )
        )

    def allows(self, dimension_id: str, metric_family: str) -> bool:
        return (dimension_id, metric_family) not in self.blocked


class MetricCombination(BaseModel):
    """계산할 조합 하나.

    `statistics_facts` 한 행이 아니라 한 묶음이다. family 마다 measure 가 여럿이므로
    (`depth_distribution` 은 셋, `cooccurrence` 는 다섯) 조합 하나가 행 여럿을 낳는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_family: str
    formula_version: str
    envelope: Envelope
    dimension_id: str | None = None
    secondary_dimension_id: str | None = None

    def fact_key(self, measure: str) -> tuple[str, ...]:
        """`statistics_facts` 의 유일 조건과 같은 키.

        `idx_statistics_facts_unique` 가 `COALESCE(dimension_id, '')` 로 NULL 을 접으므로
        여기서도 같게 접는다. 분석 버전은 실행 하나가 고정하므로 키에 넣지 않는다.
        """
        return (
            self.metric_family,
            measure,
            str(self.envelope.scope_level),
            self.envelope.scope_id,
            str(self.envelope.entry_segment),
            self.envelope.period_id,
            self.dimension_id or "",
            self.secondary_dimension_id or "",
        )


def envelopes(
    scopes: Sequence[tuple[ScopeLevel, str]],
    segments: Sequence[EntrySegment],
    periods: Sequence[str],
) -> tuple[Envelope, ...]:
    """범위 × 대상군 × 기간의 곱. 정렬해 돌려준다.

    셋 가운데 하나라도 비면 결과가 빈다. 기간이 없는 데이터셋에 지표를 만들 수 없고,
    범위가 없으면 분모를 거를 조건이 없다.
    """
    made = [
        Envelope(
            scope_level=level,
            scope_id=scope_id,
            entry_segment=segment,
            period_id=period_id,
        )
        for level, scope_id in scopes
        for segment in segments
        for period_id in periods
    ]
    return tuple(sorted(set(made), key=lambda e: e.sort_key))


def dimension_pairs(dimension_ids: Sequence[str]) -> tuple[tuple[str, str], ...]:
    """차원 쌍을 `dimension_id < secondary_dimension_id` 로 정규화한다.

    한 쌍당 한 행만 저장한다(docs/metric-spec.md 3.5). 방향이 있는 두 조건부 확률은
    행을 나누지 않고 measure 로 구분하므로, 쌍을 뒤집어 두 번 저장하면 같은 수치가
    두 벌 생긴다.
    """
    unique = sorted(set(dimension_ids))
    return tuple(combinations(unique, 2))


def expand(
    templates: Sequence[MetricTemplate],
    dimensions: Sequence[DimensionRef],
    scope_envelopes: Sequence[Envelope],
    applicability: Applicability | None = None,
    pair_eligible: Mapping[Envelope, Sequence[str]] | None = None,
) -> tuple[MetricCombination, ...]:
    """실행 조합을 전개한다. 순수 함수이며 결과는 결정적이다.

    입력의 차례가 달라도 같은 목록을 준다. 안에서 차원과 봉투를 정렬하고 family 를
    `FAMILY_ORDER` 로 돌기 때문이다. 나눠 돌린 실행을 대조하려면 이 성질이 필요하다.

    차원이 하나도 없으면 아무 조합도 만들지 않는다. 냉시작의 활성 분류체계에는 차원이
    없고, 일곱 family 의 분자는 모두 차원 할당에서 나온다. 차원을 받지 않는
    `scope_expansion` 과 `entry_label_advanced_signal_rate` 도 분자가 각각
    `role_boundary_eligible` 인 차원의 할당과 `depth_level` 이 `tradeoff` 인 할당이므로
    (docs/metric-spec.md 3.6·3.7), 차원이 없으면 분자가 언제나 0 이다. 0 을 채운 행은
    자료가 아니라 냉시작의 자국이므로 남기지 않는다.

    `pair_eligible` 은 봉투마다 차원 쌍을 만들 수 있는 차원 목록이다. 조합 폭발을 막기
    위해 `posting_prevalence` 가 `minimum_n` 이상인 차원끼리만 쌍을 만든다
    (docs/metric-spec.md 5장). 그 판정이 앞선 실행의 결과에 달렸으므로 전개가 스스로
    정하지 않고 인자로 받는다. 비어 있으면 `cooccurrence` 조합을 만들지 않는다.
    """
    policy = applicability or Applicability()
    ordered_dimensions = tuple(
        sorted({d.dimension_id: d for d in dimensions}.values(), key=lambda d: d.dimension_id)
    )
    ordered_envelopes = tuple(sorted(set(scope_envelopes), key=lambda e: e.sort_key))
    by_family = {
        family: [t for t in templates if t.metric_family == str(family)]
        for family in FAMILY_ORDER
    }

    if not ordered_dimensions:
        return ()

    made: list[MetricCombination] = []
    for family in FAMILY_ORDER:
        for template in sorted(by_family[family], key=lambda t: t.formula_version):
            if template.input_arity is not ARITY_BY_FAMILY[family]:
                raise ValueError(
                    f"{family} 의 입력 차수가 docs/metric-spec.md 5장과 다르다: "
                    f"{template.input_arity}"
                )
            made.extend(
                _expand_family(
                    family, template, ordered_dimensions, ordered_envelopes, policy,
                    pair_eligible,
                )
            )
    return tuple(made)


def _expand_family(
    family: MetricFamily,
    template: MetricTemplate,
    dimensions: Sequence[DimensionRef],
    scope_envelopes: Sequence[Envelope],
    policy: Applicability,
    pair_eligible: Mapping[Envelope, Sequence[str]] | None,
) -> list[MetricCombination]:
    """family 하나의 조합. 봉투를 먼저 거르고 차원을 붙인다."""
    allowed = [
        envelope
        for envelope in scope_envelopes
        if _envelope_allowed(family, envelope)
    ]
    usable = [
        d.dimension_id
        for d in dimensions
        if policy.allows(d.dimension_id, str(family))
    ]
    arity = ARITY_BY_FAMILY[family]
    made: list[MetricCombination] = []

    for envelope in allowed:
        if arity is InputArity.SCOPE_ONLY:
            made.append(
                MetricCombination(
                    metric_family=str(family),
                    formula_version=template.formula_version,
                    envelope=envelope,
                )
            )
            continue
        if arity is InputArity.TWO_DIMENSIONS:
            eligible = list(pair_eligible.get(envelope, ())) if pair_eligible else []
            allowed_ids = set(usable)
            for left, right in dimension_pairs(
                [d for d in eligible if d in allowed_ids]
            ):
                made.append(
                    MetricCombination(
                        metric_family=str(family),
                        formula_version=template.formula_version,
                        envelope=envelope,
                        dimension_id=left,
                        secondary_dimension_id=right,
                    )
                )
            continue
        for dimension_id in usable:
            made.append(
                MetricCombination(
                    metric_family=str(family),
                    formula_version=template.formula_version,
                    envelope=envelope,
                    dimension_id=dimension_id,
                )
            )
    return made


def _envelope_allowed(family: MetricFamily, envelope: Envelope) -> bool:
    """이 봉투에서 이 지표를 전개하는가.

    대상군 판정은 `domain/segment.py` 의 `applicable` 하나가 한다.
    `entry_label_advanced_signal_rate` 는 분모가 이미 신입·주니어 표시 공고이므로
    대상군으로 전개하지 않으며 `entry_junior` 봉투에서만 만들어진다
    (docs/metric-spec.md 5장, docs/statistics-model.md 5.3). 같은 규칙이
    `statistics_facts` 의 `entry_signal_rate_segment` CHECK 로도 강제된다.

    기업군 범위 조건은 `CLUSTER_ONLY_FAMILIES` 가 정한다.
    """
    if not segment_applicable(str(family), envelope.entry_segment):
        return False
    if family in CLUSTER_ONLY_FAMILIES:
        return envelope.scope_level is ScopeLevel.CLUSTER
    return True


__all__ = [
    "ARITY_BY_FAMILY",
    "CLUSTER_ONLY_FAMILIES",
    "FAMILY_ORDER",
    "Applicability",
    "DimensionRef",
    "Envelope",
    "InputArity",
    "MetricCombination",
    "MetricFamily",
    "MetricTemplate",
    "dimension_pairs",
    "envelopes",
    "expand",
]
