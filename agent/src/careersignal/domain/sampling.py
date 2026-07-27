"""표본 상태 판정.

정의는 docs/metric-spec.md 를 따른다.
표본이 적은 결과를 일괄로 숨기지 않고 사용 가능 범위를 구분한다.
저장소와 생성 모델을 import 하지 않는다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class SampleStatus(StrEnum):
    NOT_COMPUTABLE = "not_computable"
    LOW_CONFIDENCE = "low_confidence"
    NOT_COMPARABLE = "not_comparable"
    ANALYSIS_READY = "analysis_ready"


@dataclass(frozen=True, slots=True)
class MetricPolicy:
    """`metric_policy_versions` 한 행에 대응한다."""

    metric_family: str
    formula_version: str
    minimum_n: int
    minimum_n_comparison: int

    def __post_init__(self) -> None:
        if self.minimum_n < 1:
            raise ValueError("minimum_n 은 1 이상이다")
        if self.minimum_n_comparison < self.minimum_n:
            raise ValueError("minimum_n_comparison 은 minimum_n 이상이다")


def classify(denominator: int, policy: MetricPolicy) -> SampleStatus:
    if denominator <= 0:
        return SampleStatus.NOT_COMPUTABLE
    if denominator < policy.minimum_n:
        return SampleStatus.LOW_CONFIDENCE
    if denominator < policy.minimum_n_comparison:
        return SampleStatus.NOT_COMPARABLE
    return SampleStatus.ANALYSIS_READY


def combine(a: SampleStatus, b: SampleStatus) -> SampleStatus:
    """두 분모를 함께 쓰는 지표는 더 약한 쪽을 따른다."""
    order = [
        SampleStatus.NOT_COMPUTABLE,
        SampleStatus.LOW_CONFIDENCE,
        SampleStatus.NOT_COMPARABLE,
        SampleStatus.ANALYSIS_READY,
    ]
    return order[min(order.index(a), order.index(b))]


def usable_for_comparison(status: SampleStatus) -> bool:
    """기간 비교와 기업군 비교의 입력으로 쓸 수 있는지 판정한다."""
    return status is SampleStatus.ANALYSIS_READY


def has_value(status: SampleStatus) -> bool:
    """값을 저장하는지 판정한다. 계산 불가만 값이 없다."""
    return status is not SampleStatus.NOT_COMPUTABLE
