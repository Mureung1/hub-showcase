"""지표 정책 적용. 표본 상태 판정·불확실성·억제.

임계값과 방법은 docs/metric-spec.md 6장과 docs/erd.md 10.3 에 따라
`metric_policy_versions` 의 행이 정한다. 코드 상수가 아니다. 이 모듈의 상수는
데이터베이스 CHECK 와 같은 값 집합, 그리고 수식이 쓰는 상수뿐이다.

결측 처리는 docs/metric-spec.md 2.4, 불확실성 수식은 같은 문서 2.5, 표본 상태 네
값의 의미는 docs/statistics-model.md 5.10 이다. 판정을 대상군마다 따로 하는 근거는
docs/statistics-model.md 5.3 이며, 이 모듈은 행 하나만 보므로 호출자가 대상군별로
따로 부르면 그 규칙이 지켜진다.

전부 순수 함수다. 저장소와 생성 모델을 import 하지 않는다. 정책 행을 읽는 것은
저장소의 몫이고, 이 모듈은 그 행을 값으로 받아 판정만 한다. 임계값 판정 자체는
`careersignal.domain.sampling` 이 이미 갖고 있으므로 다시 쓰지 않고 그대로 쓴다.
"""

from __future__ import annotations

import math
from collections.abc import Iterable, Mapping
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.domain.sampling import (
    MetricPolicy as SampleThresholds,
)
from careersignal.domain.sampling import (
    SampleStatus,
    classify,
)

# ------------------------------------------------------------ 정책 값 집합
SUPPRESSION_HIDE = "hide"
"""표본이 모자란 값을 노출하지 않는다. 행은 남기고 `value` 와 `uncertainty` 만 비운다."""

SUPPRESSION_LABEL_LOW_CONFIDENCE = "label_low_confidence"
"""값을 그대로 두고 낮은 신뢰도로 표시한다. 정책 v1 이 쓰는 값이다."""

SUPPRESSION_LABEL_NOT_COMPARABLE = "label_not_comparable"
"""값을 그대로 두되 비교에 쓰지 않도록 `not_comparable` 로 표시한다."""

SUPPRESSION_POLICIES: tuple[str, ...] = (
    SUPPRESSION_HIDE,
    SUPPRESSION_LABEL_LOW_CONFIDENCE,
    SUPPRESSION_LABEL_NOT_COMPARABLE,
)
"""docs/erd.md 10.3 의 `suppression_policy` CHECK 와 같은 집합이다."""

UNCERTAINTY_WILSON_95 = "wilson_95"
"""Wilson score 95% 구간을 계산한다."""

UNCERTAINTY_NONE = "none"
"""구간을 계산하지 않는다. `uncertainty` 는 NULL 로 남는다."""

UNCERTAINTY_METHODS: tuple[str, ...] = (UNCERTAINTY_WILSON_95, UNCERTAINTY_NONE)
"""docs/erd.md 10.3 의 `uncertainty_method` CHECK 와 같은 집합이다."""

Z_95 = 1.959964
"""표준정규분포의 양측 95% 임계값. docs/metric-spec.md 2.5 가 적은 값이다."""

UNCERTAINTY_DIGITS = 6
"""구간을 반올림하는 소수 자리. `statistics_facts.value` 의 `numeric(12,6)` 과 맞춘다."""

# ------------------------------------------------------------ 불확실성 대상
MEASURES_WITHOUT_UNCERTAINTY: frozenset[str] = frozenset(
    {"count", "association_lift", "prevalence_difference", "prevalence_ratio"}
)
"""구간을 저장하지 않는 measure.

`count` 와 `difference` 를 산출하는 measure 는 비율이 아니므로 구간이 성립하지 않는다
(docs/metric-spec.md 2.5). `association_lift` 는 비율의 비율이라 Wilson 구간이
성립하지 않고(같은 문서 3.5), `cluster_contrast` 의 두 measure 는 불확실성이 없다
(같은 문서 3.4).
"""

FAMILIES_WITHOUT_UNCERTAINTY: frozenset[str] = frozenset(
    {"cluster_contrast", "temporal_delta"}
)
"""구간을 저장하지 않는 지표 family.

`cluster_contrast` 는 docs/metric-spec.md 3.4, `temporal_delta` 는 같은 문서 4장이
`uncertainty` 를 두지 않는다고 적는다. 정책 행의 `uncertainty_method` 보다 이 목록이
앞선다. 정책은 방법을 고르는 자리이고, 그 measure 에 구간이 성립하는가는 수식이
정하기 때문이다.
"""

# ------------------------------------------------------------ 분모 없는 measure
MEASURES_WITHOUT_DENOMINATOR: frozenset[str] = frozenset({"count"})
"""정의상 분모를 갖지 않는 measure. docs/metric-spec.md 3.5 의 `count` 하나다.

분모가 없는 것과 분모를 계산하지 못한 것은 다른 상태다. `cooccurrence` 의 `count` 는
두 차원이 함께 나타난 공고 버전 수 자체가 값이므로 나눌 분모가 없고, 명세가 그 자리를
NULL 로 규정한다. 이 measure 를 `not_computable` 로 두면 계산된 수를 계산 불가로 적게
되고, `metrics/verification.py` 의 표본 판정 검사가 저장된 표본 수로 다시 판정하므로
검증에서도 어긋난다.

표본 판정은 분모 대신 `sample_size` 로 한다. `families.cooccurrence` 가 그 자리에
모집단 크기를 담는다. 교집합 수 하나만 놓고는 그 수가 몇 건 가운데 나온 것인지 알 수
없다.
"""

# ------------------------------------------------------------ 사유
REASON_ZERO_DENOMINATOR = "분모가 0 이다"
"""범위·대상군·기간에 해당하는 공고 버전이 하나도 없다. 분모를 0 으로 저장한다."""

REASON_MISSING_DENOMINATOR = "분모가 없다"
"""분모를 계산하지 못했다. 분모 0 과 구분해 `denominator` 를 NULL 로 저장한다."""

REASON_MISSING_VALUE = "값을 계산하지 못했다"
"""분모는 섰으나 값이 없다. 분자가 없고 호출자도 값을 주지 않은 경우다."""

REASON_ZERO_COMPARISON_DENOMINATOR = "비교 대상 분모가 0 이다"
"""두 분모를 함께 쓰는 지표에서 상대 쪽 분모가 서지 않았다. 차이도 비율도 없다."""

REASON_HIDDEN = "최소 표본에 못 미쳐 정책이 값을 숨긴다"
"""`hide` 정책이 값을 비운 경우. 행 자체는 남는다(docs/metric-spec.md 2.4)."""

UNKNOWN_POLICY = "지표 family 에 해당하는 정책 버전이 없다"
"""임계값을 지어내지 않는다. 정책 행이 없으면 그 지표는 계산하지 않는다."""


class MetricPolicyVersion(BaseModel):
    """`metric_policy_versions` 한 행. 컬럼은 docs/erd.md 10.3 이다.

    최소 표본·억제 정책·불확실성 방법을 이 행이 정한다. 정책이 바뀌면 새 버전을
    발행하고 이전 결과를 보존하며, 서로 다른 정책 버전의 수치는 비교하지 않는다
    (docs/statistics-model.md 5.9).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_policy_version: str
    metric_family: str
    formula_version: str
    minimum_n: int = Field(ge=1)
    """비율을 값으로 쓸 수 있는 최소 분모. 미만이면 낮은 신뢰도로 표시한다."""

    minimum_n_comparison: int = Field(ge=1)
    """기간·기업군 비교에 쓸 수 있는 최소 분모. 미만이면 비교 입력에서 뺀다."""

    suppression_policy: str
    uncertainty_method: str
    effective_from: datetime | None = None
    """정책이 적용되기 시작한 시각. 같은 family 에 버전이 여럿일 때 고르는 축이다."""

    @model_validator(mode="after")
    def _check_row(self) -> MetricPolicyVersion:
        if self.minimum_n_comparison < self.minimum_n:
            raise ValueError("minimum_n_comparison 은 minimum_n 이상이다")
        if self.suppression_policy not in SUPPRESSION_POLICIES:
            raise ValueError(f"등록되지 않은 억제 정책이다: {self.suppression_policy}")
        if self.uncertainty_method not in UNCERTAINTY_METHODS:
            raise ValueError(
                f"등록되지 않은 불확실성 방법이다: {self.uncertainty_method}"
            )
        return self

    @property
    def thresholds(self) -> SampleThresholds:
        """임계값 판정에 쓰는 도메인 값. 판정 규칙은 `domain/sampling.py` 가 갖는다."""
        return SampleThresholds(
            metric_family=self.metric_family,
            formula_version=self.formula_version,
            minimum_n=self.minimum_n,
            minimum_n_comparison=self.minimum_n_comparison,
        )


class SampleVerdict(BaseModel):
    """한 지표 행의 판정 결과. `statistics_facts` 의 컬럼으로 그대로 옮긴다.

    억제는 행을 지우는 것이 아니다. 계산하지 못했다는 사실 자체가 화면의 정보이며,
    행을 지우면 아직 안 돌린 것과 돌렸는데 표본이 없는 것을 구분할 수 없다
    (docs/metric-spec.md 2.4).

    집계 실행 하나의 결과는 `metrics/runner.py` 의 `MetricOutcome` 이다. 이름을 나누는
    이유는 두 값의 범위가 다르기 때문이다. 이 값은 행 하나의 판정이고 그 값은 실행
    하나의 요약이다. `metrics/runner.py` 의 `SamplePolicy` 가 돌려주는 것이 이 값이다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    sample_status: SampleStatus
    value: float | None
    numerator: int | None
    denominator: int | None
    sample_size: int
    uncertainty: dict[str, Any] | None
    suppressed: bool
    """값을 노출하지 않는가. `hide` 정책과 계산 불가에서만 참이다."""

    reason: str | None
    """값이 없거나 숨겨진 사유. 노출 가능한 값에는 없다."""

    def fact_columns(self) -> dict[str, Any]:
        """`statistics_facts` 에 넣을 컬럼. `suppressed` 와 `reason` 은 열이 없다."""
        return {
            "numerator": self.numerator,
            "denominator": self.denominator,
            "value": self.value,
            "sample_size": self.sample_size,
            "sample_status": str(self.sample_status),
            "uncertainty": self.uncertainty,
        }


def policy_from_row(row: Mapping[str, Any]) -> MetricPolicyVersion:
    """저장소가 읽어 온 `metric_policy_versions` 행을 정책 값으로 옮긴다."""
    return MetricPolicyVersion.model_validate(dict(row))


def select_policy(
    policies: Iterable[MetricPolicyVersion],
    metric_family: str,
    formula_version: str,
    as_of: datetime | None = None,
) -> MetricPolicyVersion:
    """지표 family 와 수식 버전에 해당하는 정책 하나를 고른다.

    같은 family 에 버전이 여럿이면 `as_of` 이전에 적용된 것 중 가장 나중 것을 고른다.
    `as_of` 가 없으면 `effective_from` 이 가장 나중인 것을 고른다. 해당하는 행이
    없으면 예외다. 임계값을 기본값으로 메우면 어떤 정책으로 판정했는지 행만 보고
    알 수 없다.
    """
    matched = [
        p
        for p in policies
        if p.metric_family == metric_family and p.formula_version == formula_version
    ]
    if as_of is not None:
        matched = [
            p for p in matched if p.effective_from is None or p.effective_from <= as_of
        ]
    if not matched:
        raise KeyError(f"{UNKNOWN_POLICY}: {metric_family}/{formula_version}")

    dated = [p for p in matched if p.effective_from is not None]
    if dated:
        newest = max(p.effective_from for p in dated)  # type: ignore[type-var]
        matched = [p for p in dated if p.effective_from == newest]
    return max(matched, key=lambda p: p.metric_policy_version)


def same_policy(a: MetricPolicyVersion | str, b: MetricPolicyVersion | str) -> bool:
    """두 수치가 같은 정책 버전에서 나왔는가.

    서로 다른 정책 버전의 수치는 비교하지 않는다(docs/statistics-model.md 5.9).
    """
    left = a.metric_policy_version if isinstance(a, MetricPolicyVersion) else a
    right = b.metric_policy_version if isinstance(b, MetricPolicyVersion) else b
    return left == right


def wilson_interval(numerator: int, denominator: int) -> tuple[float, float]:
    """Wilson score 95% 구간. 수식은 docs/metric-spec.md 2.5 를 그대로 따른다.

    ```text
    z  = 1.959964
    p  = numerator / denominator
    n  = denominator
    c  = 1 + z² / n
    mid = (p + z² / (2n)) / c
    half = z / c * sqrt( p(1-p)/n + z² / (4n²) )

    lower = max(0, mid - half)
    upper = min(1, mid + half)
    ```

    정규 근사 대신 Wilson 을 쓰는 이유는 분모가 작거나 비율이 0 과 1 에 가까울 때
    구간이 정의역을 벗어나지 않기 때문이다.
    """
    if denominator <= 0:
        raise ValueError("분모가 0 이면 구간이 성립하지 않는다")
    if not 0 <= numerator <= denominator:
        raise ValueError("분자는 0 이상 분모 이하다")

    z = Z_95
    p = numerator / denominator
    n = denominator
    c = 1 + z * z / n
    mid = (p + z * z / (2 * n)) / c
    half = z / c * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))

    lower = max(0.0, mid - half)
    upper = min(1.0, mid + half)
    return round(lower, UNCERTAINTY_DIGITS), round(upper, UNCERTAINTY_DIGITS)


def stores_uncertainty(policy: MetricPolicyVersion, measure: str) -> bool:
    """이 조합이 구간을 저장하는가.

    수식이 먼저고 정책이 그 다음이다. 비율이 아닌 measure 는 정책이 `wilson_95` 여도
    구간을 두지 않는다(docs/metric-spec.md 2.5·3.4·3.5).
    """
    if policy.metric_family in FAMILIES_WITHOUT_UNCERTAINTY:
        return False
    if measure in MEASURES_WITHOUT_UNCERTAINTY:
        return False
    return policy.uncertainty_method == UNCERTAINTY_WILSON_95


def uncertainty_for(
    policy: MetricPolicyVersion,
    measure: str,
    numerator: int | None,
    denominator: int | None,
) -> dict[str, Any] | None:
    """`statistics_facts.uncertainty` 에 넣을 jsonb. 대상이 아니면 None 이다.

    저장 형태는 docs/metric-spec.md 2.5 의 예와 같다.

    ```json
    { "method": "wilson_95", "lower": 0.412, "upper": 0.734 }
    ```
    """
    if not stores_uncertainty(policy, measure):
        return None
    if numerator is None or denominator is None or denominator <= 0:
        return None
    lower, upper = wilson_interval(numerator, denominator)
    return {"method": UNCERTAINTY_WILSON_95, "lower": lower, "upper": upper}


def classify_pair(
    sample_size: int, comparison_sample_size: int, policy: MetricPolicyVersion
) -> SampleStatus:
    """두 분모를 함께 쓰는 지표의 표본 상태. 규칙은 docs/metric-spec.md 3.4 다.

    둘 다 `minimum_n_comparison` 이상일 때만 `analysis_ready` 이고, 한쪽이라도
    미달이면 `not_comparable` 이다. `cluster_contrast` 가 기업군 분모와 직무 전체
    분모를 함께 보는 자리다.
    """
    if sample_size <= 0 or comparison_sample_size <= 0:
        return SampleStatus.NOT_COMPUTABLE
    both_ready = (
        sample_size >= policy.minimum_n_comparison
        and comparison_sample_size >= policy.minimum_n_comparison
    )
    return SampleStatus.ANALYSIS_READY if both_ready else SampleStatus.NOT_COMPARABLE


def evaluate(
    policy: MetricPolicyVersion,
    *,
    measure: str,
    numerator: int | None,
    denominator: int | None,
    sample_size: int | None = None,
    comparison_sample_size: int | None = None,
    value: float | None = None,
) -> SampleVerdict:
    """집계 결과 하나에 정책을 적용해 저장할 값을 만든다.

    결측 처리는 docs/metric-spec.md 2.4 의 표를 그대로 따른다.

    | 상황 | 처리 |
    | --- | --- |
    | 분모가 0 | `not_computable`, `value` 는 NULL |
    | 분모가 `minimum_n` 미만 | `low_confidence`, `value` 저장 |
    | `minimum_n` 이상 `minimum_n_comparison` 미만 | `not_comparable`, `value` 저장 |
    | 분모가 `minimum_n_comparison` 이상 | `analysis_ready` |

    `value` 를 주지 않으면 `numerator / denominator` 로 채운다. 비율에서 파생하는
    measure 는 호출자가 값을 계산해 넘기고 `numerator`·`denominator` 에는 원본
    카운트를 담는다(docs/metric-spec.md 3.4).

    `sample_size` 를 주지 않으면 분모를 쓴다. 두 분모를 함께 쓰는 지표는 호출자가
    작은 쪽을 넘긴다(docs/metric-spec.md 4장). 판정은 분모가 아니라 이 표본 수로
    한다. 두 값이 다른 지표는 저장된 `sample_size` 가 판정의 근거이며, 검증
    (`metrics/verification.py`)도 같은 값으로 다시 판정한다.

    `comparison_sample_size` 를 주면 3.4 의 두 분모 규칙을 적용한다.
    `cluster_contrast` 가 직무 전체 분모를 여기에 넘긴다.

    `MEASURES_WITHOUT_DENOMINATOR` 에 든 measure 는 분모가 없는 것이 정의다. 이때는
    분모 없음을 계산 불가로 읽지 않고 `sample_size` 로 판정하며, 값은 호출자가 넘긴
    것을 그대로 쓴다.

    판정은 행 하나만 본다. 대상군마다 따로 부르면 한 대상군의 미달이 다른 대상군의
    수치를 억제하지 않는다(docs/statistics-model.md 5.3).
    """
    if numerator is not None and numerator < 0:
        raise ValueError("분자는 음수일 수 없다")
    if denominator is not None and denominator < 0:
        raise ValueError("분모는 음수일 수 없다")
    if numerator is not None and denominator is not None and numerator > denominator:
        raise ValueError("분자는 분모를 넘을 수 없다")

    size = sample_size if sample_size is not None else (denominator or 0)
    if size < 0:
        raise ValueError("표본 수는 음수일 수 없다")

    # 분모 없음을 셋으로 가른다. 정의상 분모가 없는 measure, 분모를 계산하지 못한
    # measure, 분모가 0 인 measure 는 서로 다른 상태이며 행에 남는 값이 다르다.
    if denominator is None and measure in MEASURES_WITHOUT_DENOMINATOR:
        return _without_denominator(policy, measure, numerator, size, value)
    if denominator is None:
        return SampleVerdict(
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
            numerator=numerator,
            denominator=None,
            sample_size=size,
            uncertainty=None,
            suppressed=True,
            reason=REASON_MISSING_DENOMINATOR,
        )
    if denominator == 0:
        return SampleVerdict(
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
            numerator=numerator,
            denominator=0,
            sample_size=size,
            uncertainty=None,
            suppressed=True,
            reason=REASON_ZERO_DENOMINATOR,
        )

    if comparison_sample_size is not None and comparison_sample_size <= 0:
        return SampleVerdict(
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
            numerator=numerator,
            denominator=denominator,
            sample_size=size,
            uncertainty=None,
            suppressed=True,
            reason=REASON_ZERO_COMPARISON_DENOMINATOR,
        )

    computed = value if value is not None else _ratio(numerator, denominator)
    if computed is None:
        return SampleVerdict(
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
            numerator=numerator,
            denominator=denominator,
            sample_size=size,
            uncertainty=None,
            suppressed=True,
            reason=REASON_MISSING_VALUE,
        )

    if comparison_sample_size is None:
        status = classify(size, policy.thresholds)
    else:
        status = classify_pair(size, comparison_sample_size, policy)
    uncertainty = uncertainty_for(policy, measure, numerator, denominator)
    return _suppress(
        policy, status, computed, numerator, denominator, size, uncertainty
    )


def _without_denominator(
    policy: MetricPolicyVersion,
    measure: str,
    numerator: int | None,
    sample_size: int,
    value: float | None,
) -> SampleVerdict:
    """분모가 정의되지 않는 measure 의 판정. 근거는 `MEASURES_WITHOUT_DENOMINATOR` 다.

    판정의 입력이 표본 수다. 값은 호출자가 넘긴 것을 쓰고, 넘기지 않았으면 분자를
    값으로 읽지 않는다. 분자와 값이 같은 수라도 그 사실을 정하는 것은 수식이다
    (`metrics/families.py`).

    구간은 두지 않는다. `count` 는 비율이 아니므로 Wilson 구간이 성립하지 않으며
    `MEASURES_WITHOUT_UNCERTAINTY` 가 같은 판정을 한다(docs/metric-spec.md 2.5).
    """
    if value is None:
        return SampleVerdict(
            sample_status=SampleStatus.NOT_COMPUTABLE,
            value=None,
            numerator=numerator,
            denominator=None,
            sample_size=sample_size,
            uncertainty=None,
            suppressed=True,
            reason=REASON_MISSING_VALUE,
        )
    status = classify(sample_size, policy.thresholds)
    return _suppress(
        policy,
        status,
        value,
        numerator,
        None,
        sample_size,
        uncertainty_for(policy, measure, numerator, None),
    )


def _ratio(numerator: int | None, denominator: int) -> float | None:
    """분자가 없으면 값이 없다. 0 으로 메우지 않는다."""
    if numerator is None:
        return None
    return numerator / denominator


def _suppress(
    policy: MetricPolicyVersion,
    status: SampleStatus,
    value: float,
    numerator: int | None,
    denominator: int | None,
    sample_size: int,
    uncertainty: dict[str, Any] | None,
) -> SampleVerdict:
    """억제 정책을 적용한다. 행은 언제나 남고 정책은 표시와 노출만 정한다.

    | `suppression_policy` | 최소 표본에 못 미친 값의 처리 |
    | --- | --- |
    | `hide` | 값과 구간을 비우고 표본 상태만 남긴다 |
    | `label_low_confidence` | 값을 그대로 두고 `low_confidence` 로 표시한다 |
    | `label_not_comparable` | 값을 그대로 두고 `not_comparable` 로 올려 표시한다 |

    `label_not_comparable` 이 `low_confidence` 를 `not_comparable` 로 올리는 이유는
    이 정책을 쓰는 `cluster_contrast` 가 한쪽 분모라도 미달이면 비교에 쓰지 않기
    때문이다(docs/metric-spec.md 3.4).
    """
    if status is SampleStatus.ANALYSIS_READY:
        return SampleVerdict(
            sample_status=status,
            value=value,
            numerator=numerator,
            denominator=denominator,
            sample_size=sample_size,
            uncertainty=uncertainty,
            suppressed=False,
            reason=None,
        )

    if policy.suppression_policy == SUPPRESSION_HIDE:
        return SampleVerdict(
            sample_status=status,
            value=None,
            numerator=numerator,
            denominator=denominator,
            sample_size=sample_size,
            uncertainty=None,
            suppressed=True,
            reason=REASON_HIDDEN,
        )

    labelled = status
    if (
        policy.suppression_policy == SUPPRESSION_LABEL_NOT_COMPARABLE
        and status is SampleStatus.LOW_CONFIDENCE
    ):
        labelled = SampleStatus.NOT_COMPARABLE

    return SampleVerdict(
        sample_status=labelled,
        value=value,
        numerator=numerator,
        denominator=denominator,
        sample_size=sample_size,
        uncertainty=uncertainty,
        suppressed=False,
        reason=None,
    )


__all__ = [
    "FAMILIES_WITHOUT_UNCERTAINTY",
    "MEASURES_WITHOUT_DENOMINATOR",
    "MEASURES_WITHOUT_UNCERTAINTY",
    "REASON_HIDDEN",
    "REASON_MISSING_DENOMINATOR",
    "REASON_MISSING_VALUE",
    "REASON_ZERO_COMPARISON_DENOMINATOR",
    "REASON_ZERO_DENOMINATOR",
    "SUPPRESSION_HIDE",
    "SUPPRESSION_LABEL_LOW_CONFIDENCE",
    "SUPPRESSION_LABEL_NOT_COMPARABLE",
    "SUPPRESSION_POLICIES",
    "UNCERTAINTY_DIGITS",
    "UNCERTAINTY_METHODS",
    "UNCERTAINTY_NONE",
    "UNCERTAINTY_WILSON_95",
    "UNKNOWN_POLICY",
    "Z_95",
    "MetricPolicyVersion",
    "SampleVerdict",
    "classify_pair",
    "evaluate",
    "policy_from_row",
    "same_policy",
    "select_policy",
    "stores_uncertainty",
    "uncertainty_for",
    "wilson_interval",
]
