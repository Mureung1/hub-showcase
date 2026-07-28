"""시간 연산자 `temporal_delta`.

수식과 저장 형태는 docs/metric-spec.md 4장, 연산자의 성격은
docs/statistics-model.md 5.8 이다. 기간 축의 정의는 docs/erd.md 3.5 의 `periods` 다.

`temporal_delta` 는 독립 지표가 아니라 다른 지표에 적용하는 연산자다. 어떤 지표의
변화인지를 `measure` 에 반드시 남긴다. `temporal_delta` 단독으로는 해석할 수 없다.

계산은 순수 함수다. 두 기간의 지표 행과 기간 정의를 값으로 받아 결과 하나를 돌려주며
저장소도 생성 모델도 부르지 않는다. 두 기간의 행을 찾아 오는 것은 저장소의 몫이다.

기간 식별자를 코드에 적지 않는다. 어느 기간이 앞이고 뒤인지는 `periods` 행의
`starts_on`·`ends_on` 이 정한다. 기간을 늘릴 때 이 모듈을 고치지 않는다.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict, model_validator

from careersignal.domain.sampling import (
    SampleStatus,
    classify,
    usable_for_comparison,
)
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.metrics.policy import MetricPolicyVersion

TEMPORAL_DELTA_FAMILY = "temporal_delta"
"""저장되는 `statistics_facts.metric_family` 값. docs/metric-spec.md 4장이다."""

MEASURE_SEPARATOR = "__"
"""`measure` 를 `<base_metric>__<measure>` 로 잇는 구분자. 같은 문서 4장이다."""

# ------------------------------------------------------------ 계산하지 않는 사유
REASON_PERIOD_MISMATCH = "지표 행의 기간이 인자로 받은 기간과 다르다"
"""기간 정의와 값이 어긋나면 어느 기간의 변화인지 말할 수 없다."""

REASON_PERIOD_ORDER = "두 기간이 겹치거나 순서가 뒤바뀌었다"
"""나중 기간에서 앞 기간을 뺀다. 겹치는 기간은 같은 공고를 양쪽에서 센다."""

REASON_KEY_MISMATCH = "두 기간의 지표·범위·대상군·차원이 다르다"
"""서로 다른 대상군의 수치를 하나의 기준선으로 비교하지 않는다
(docs/statistics-model.md 5.3)."""

REASON_POLICY_MISMATCH = "두 기간의 지표 정책 버전이 다르다"
"""서로 다른 정책 버전의 수치는 비교하지 않는다(docs/statistics-model.md 5.9)."""

REASON_NOT_COMPARABLE = "기간 비교에 쓸 수 없는 표본 상태다"
"""`analysis_ready` 가 아닌 값끼리 뺀 결과는 의미가 없다(docs/metric-spec.md 2.4)."""

REASON_SUPPRESSED = "한쪽 기간의 값이 억제되어 없다"
"""억제 정책이 값을 비운 기간은 델타의 입력이 되지 못한다."""

REASON_MISSING_DENOMINATOR = "한쪽 기간의 분모가 없다"
"""`sample_size` 가 두 기간 분모 중 작은 값이므로 분모 없이는 저장할 수 없다."""

REASON_NO_COUNTERPART = "짝이 되는 기간의 지표 행이 없다"
"""한 기간에만 있는 지표는 변화를 말할 수 없다."""


class Period(BaseModel):
    """`periods` 한 행. 컬럼은 docs/erd.md 3.5 다.

    기간은 달력 연도를 따른다. 기간 정의를 수정하지 않고 새 `period_id` 를 더해
    확장하므로, 비교의 앞뒤는 식별자가 아니라 날짜가 정한다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    period_id: str
    label: str = ""
    starts_on: date
    ends_on: date
    is_baseline: bool = False

    @model_validator(mode="after")
    def _check_range(self) -> Period:
        if self.starts_on > self.ends_on:
            raise ValueError("starts_on 은 ends_on 이하다")
        return self

    def precedes(self, other: Period) -> bool:
        """이 기간이 다른 기간보다 앞서고 겹치지 않는가."""
        return self.ends_on < other.starts_on


class MetricPoint(BaseModel):
    """한 기간의 지표 값. `statistics_facts` 한 행에서 만든다.

    컬럼은 docs/erd.md 10.5 다. 델타는 이 값 두 개에서만 나오며, 이 모듈은 값을 다시
    집계하지 않는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_family: str
    measure: str
    metric_policy_version: str
    scope_level: ScopeLevel
    scope_id: str
    """`statistics_facts.scope_id` 는 NOT NULL 이므로 `overall` 범위도 값을 갖는다."""

    entry_segment: EntrySegment
    period_id: str
    dimension_id: str | None = None
    secondary_dimension_id: str | None = None
    numerator: int | None = None
    denominator: int | None = None
    value: float | None = None
    sample_size: int = 0
    sample_status: SampleStatus

    @property
    def key(self) -> tuple[Any, ...]:
        """기간을 뺀 지표 정체성. 이 키가 같은 두 행만 뺀다."""
        return (
            self.metric_family,
            self.measure,
            self.scope_level,
            self.scope_id,
            self.entry_segment,
            self.dimension_id,
            self.secondary_dimension_id,
        )


class TemporalDelta(BaseModel):
    """계산된 시간 델타 하나. 저장 형태는 docs/metric-spec.md 4장이다.

    양 기간의 표본 수를 함께 담는다(docs/statistics-model.md 5.8). `statistics_facts`
    의 `sample_size` 는 한 값만 담으므로 작은 쪽이 그 자리에 들어가고, 두 기간의 값은
    이 객체가 갖는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_family: str = TEMPORAL_DELTA_FAMILY
    measure: str
    """`<base_metric>__<measure>` 형태. 어떤 지표의 변화인지가 여기에 남는다."""

    base_metric_family: str
    base_measure: str
    metric_policy_version: str
    scope_level: ScopeLevel
    scope_id: str
    entry_segment: EntrySegment
    period_id: str
    """비교의 나중 기간(`period_b`). 델타 행은 이 기간에 달린다."""

    prior_period_id: str
    """비교의 앞 기간(`period_a`)."""

    dimension_id: str | None = None
    secondary_dimension_id: str | None = None
    numerator: int | None
    """`period_b` 의 분자."""

    denominator: int
    """`period_b` 의 분모."""

    value: float
    """`value(period_b) - value(period_a)`."""

    sample_size: int
    """두 기간 분모 중 작은 값. 비교의 신뢰도가 표본이 적은 기간에 좌우된다."""

    prior_sample_size: int
    """`period_a` 의 분모."""

    latest_sample_size: int
    """`period_b` 의 분모."""

    sample_status: SampleStatus
    uncertainty: None = None
    """`temporal_delta` 는 구간을 저장하지 않는다(docs/metric-spec.md 4장)."""

    @model_validator(mode="after")
    def _check_family(self) -> TemporalDelta:
        if self.metric_family != TEMPORAL_DELTA_FAMILY:
            raise ValueError(f"metric_family 는 {TEMPORAL_DELTA_FAMILY} 다")
        if self.base_metric_family == TEMPORAL_DELTA_FAMILY:
            raise ValueError("델타에 델타를 다시 적용하지 않는다")
        return self

    def fact_columns(self) -> dict[str, Any]:
        """`statistics_facts` 에 넣을 컬럼. docs/metric-spec.md 4장의 표와 같다."""
        return {
            "metric_family": self.metric_family,
            "metric_policy_version": self.metric_policy_version,
            "scope_level": str(self.scope_level),
            "scope_id": self.scope_id,
            "entry_segment": str(self.entry_segment),
            "period_id": self.period_id,
            "dimension_id": self.dimension_id,
            "secondary_dimension_id": self.secondary_dimension_id,
            "measure": self.measure,
            "numerator": self.numerator,
            "denominator": self.denominator,
            "value": self.value,
            "sample_size": self.sample_size,
            "sample_status": str(self.sample_status),
            "uncertainty": None,
        }


class DeltaOutcome(BaseModel):
    """델타 계산의 결과. 계산하지 않은 경우 사유를 남긴다.

    두 기간 중 하나라도 비교에 쓸 수 없으면 행을 만들지 않는다
    (docs/metric-spec.md 4장). 사유는 실행 결과에 남기는 값이며 지표 행이 아니다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    computed: bool
    delta: TemporalDelta | None = None
    reason: str | None = None
    prior_period_id: str | None = None
    latest_period_id: str | None = None

    @model_validator(mode="after")
    def _check_shape(self) -> DeltaOutcome:
        if self.computed and self.delta is None:
            raise ValueError("계산했다면 델타가 있다")
        if not self.computed and not self.reason:
            raise ValueError("계산하지 않았다면 사유가 있다")
        return self


def period_from_row(row: Mapping[str, Any]) -> Period:
    """저장소가 읽어 온 `periods` 행을 기간 값으로 옮긴다."""
    return Period.model_validate(dict(row))


def point_from_row(row: Mapping[str, Any]) -> MetricPoint:
    """저장소가 읽어 온 `statistics_facts` 행을 기간별 값으로 옮긴다."""
    return MetricPoint.model_validate(dict(row))


def delta_measure(base_metric_family: str, base_measure: str) -> str:
    """`<base_metric>__<measure>`. 어떤 지표의 변화인지를 남기는 자리다."""
    return f"{base_metric_family}{MEASURE_SEPARATOR}{base_measure}"


def temporal_delta(
    policy: MetricPolicyVersion,
    prior: MetricPoint,
    latest: MetricPoint,
    *,
    period_a: Period,
    period_b: Period,
) -> DeltaOutcome:
    """두 기간의 지표 값에서 변화를 계산한다.

    수식은 docs/metric-spec.md 4장을 그대로 따른다.

    ```text
    temporal_delta(base_metric, measure, scope, period_a, period_b)
      = value(base_metric, measure, scope, period_b)
      - value(base_metric, measure, scope, period_a)
    ```

    `prior` 가 `period_a`, `latest` 가 `period_b` 의 값이다. 두 값이 모두 있어야
    델타가 성립한다. 한쪽이 억제되었거나 계산 불가면 계산하지 않고 사유를 남긴다.

    비교에는 `minimum_n_comparison` 이 적용된다. `not_comparable` 이하인 값은 기간
    비교에 쓰지 않는다(docs/metric-spec.md 2.4).
    """
    outcome = _refused(prior, latest, period_a, period_b, policy)
    if outcome is not None:
        return outcome

    prior_value = prior.value
    latest_value = latest.value
    prior_denominator = prior.denominator
    latest_denominator = latest.denominator
    if (
        prior_value is None
        or latest_value is None
        or prior_denominator is None
        or latest_denominator is None
    ):
        raise ValueError("값과 분모가 모두 있어야 델타가 성립한다")

    value = latest_value - prior_value
    sample_size = min(prior_denominator, latest_denominator)
    delta = TemporalDelta(
        measure=delta_measure(latest.metric_family, latest.measure),
        base_metric_family=latest.metric_family,
        base_measure=latest.measure,
        metric_policy_version=policy.metric_policy_version,
        scope_level=latest.scope_level,
        scope_id=latest.scope_id,
        entry_segment=latest.entry_segment,
        period_id=period_b.period_id,
        prior_period_id=period_a.period_id,
        dimension_id=latest.dimension_id,
        secondary_dimension_id=latest.secondary_dimension_id,
        numerator=latest.numerator,
        denominator=latest_denominator,
        value=value,
        sample_size=sample_size,
        prior_sample_size=prior_denominator,
        latest_sample_size=latest_denominator,
        sample_status=classify(sample_size, policy.thresholds),
    )
    return DeltaOutcome(
        computed=True,
        delta=delta,
        prior_period_id=period_a.period_id,
        latest_period_id=period_b.period_id,
    )


def temporal_deltas(
    policy: MetricPolicyVersion,
    prior_points: Iterable[MetricPoint],
    latest_points: Iterable[MetricPoint],
    *,
    period_a: Period,
    period_b: Period,
) -> list[DeltaOutcome]:
    """두 기간의 지표 행 묶음을 정체성 키로 맞춰 델타를 계산한다.

    한쪽 기간에만 있는 지표는 계산하지 않고 사유를 남긴다. 결과 순서는 키 순서이며
    같은 입력에 같은 순서를 준다.
    """
    prior_by_key = {p.key: p for p in prior_points}
    latest_by_key = {p.key: p for p in latest_points}

    outcomes: list[DeltaOutcome] = []
    for key in sorted(
        set(prior_by_key) | set(latest_by_key), key=lambda k: tuple(str(v) for v in k)
    ):
        prior = prior_by_key.get(key)
        latest = latest_by_key.get(key)
        if prior is None or latest is None:
            outcomes.append(
                DeltaOutcome(
                    computed=False,
                    reason=REASON_NO_COUNTERPART,
                    prior_period_id=period_a.period_id,
                    latest_period_id=period_b.period_id,
                )
            )
            continue
        outcomes.append(
            temporal_delta(policy, prior, latest, period_a=period_a, period_b=period_b)
        )
    return outcomes


def _refused(
    prior: MetricPoint,
    latest: MetricPoint,
    period_a: Period,
    period_b: Period,
    policy: MetricPolicyVersion,
) -> DeltaOutcome | None:
    """계산하지 않을 사유가 있으면 그 결과를, 없으면 None 을 돌려준다."""

    def refuse(reason: str) -> DeltaOutcome:
        return DeltaOutcome(
            computed=False,
            reason=reason,
            prior_period_id=period_a.period_id,
            latest_period_id=period_b.period_id,
        )

    if prior.period_id != period_a.period_id or latest.period_id != period_b.period_id:
        return refuse(REASON_PERIOD_MISMATCH)
    if not period_a.precedes(period_b):
        return refuse(REASON_PERIOD_ORDER)
    if prior.key != latest.key:
        return refuse(REASON_KEY_MISMATCH)
    if (
        prior.metric_policy_version != policy.metric_policy_version
        or latest.metric_policy_version != policy.metric_policy_version
    ):
        return refuse(REASON_POLICY_MISMATCH)
    if not usable_for_comparison(prior.sample_status) or not usable_for_comparison(
        latest.sample_status
    ):
        return refuse(REASON_NOT_COMPARABLE)
    if prior.value is None or latest.value is None:
        return refuse(REASON_SUPPRESSED)
    if prior.denominator is None or latest.denominator is None:
        return refuse(REASON_MISSING_DENOMINATOR)
    return None
