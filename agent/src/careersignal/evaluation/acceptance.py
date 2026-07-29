"""수용 기준 판정.

채점 결과가 릴리스 기준을 충족하는가를 정한다. 기준 항목은
docs/checklist.md 9장, 분석 버전의 자리는 docs/architecture.md 8장이다. 수용 평가는
활성화 이전 단계이며 충족하지 않으면 활성화하지 않는다.

순수 함수다. 저장소도 생성 모델도 부르지 않는다. 지표 값과 정책 하나를 받아 판정만
돌려준다.

기준값은 코드 상수가 아니다. `AcceptancePolicy` 를 부르는 쪽이 명시적으로 만들어
넘긴다. 이 모듈은 어떤 지표의 어떤 값이 기준인지 스스로 정하지 않는다. 임계값을
모듈 상수로 두면 값을 바꾼 순간 이전 판정의 근거가 사라지고, 어떤 기준으로
활성화를 막았는지 판정 결과만 보고 알 수 없다. 같은 이유로
`careersignal.taxonomy.promotion` 도 임계값을 정책 버전에 둔다.

초안은 게이트가 아니다. 평가 세트와 루브릭 정책의 `status` 가 `draft` 인 동안에는
채점해서 추이를 보되 그 결과로 활성화를 막지 않는다. 근거는 docs/backlog.md 의
평가 세트 절과 docs/eval/README.md 의 확정 범위다. 판정은 `not_gating` 이며 미달과
구별된다. 미달은 기준을 재어 떨어진 것이고 `not_gating` 은 아직 재지 않기로 한
것이다.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from careersignal.evaluation.schema import RubricCatalog

DRAFT_STATUS = "draft"
"""사람이 확정하기 전의 상태. 세 평가 파일이 모두 이 값을 적고 있다."""

CONFIRMED_STATUS = "confirmed"
"""사람이 확정한 상태. 이 상태의 세트만 게이트 판정에 쓴다."""

NON_GATING_STATUSES: frozenset[str] = frozenset({DRAFT_STATUS})
"""게이트로 쓰지 않는 상태."""

NO_STATUS_REASON = "평가 자료가 확정 상태를 적지 않았다"
DRAFT_SET_REASON = "평가 세트가 draft 다"
DRAFT_RUBRIC_REASON = "루브릭 정책이 draft 다"
MISSING_METRIC = "지표를 채점하지 않았다"


class AcceptanceVerdict(StrEnum):
    """수용 판정 세 값."""

    PASS = "pass"
    """기준을 모두 충족했다. 활성화를 막지 않는다."""

    FAIL = "fail"
    """기준을 하나 이상 충족하지 못했다. 활성화를 막는다."""

    NOT_GATING = "not_gating"
    """게이트 판정에 쓰지 않는 평가다. 채점은 했고 기준을 재지 않았다."""


class Threshold(BaseModel):
    """지표 하나의 기준값.

    `minimum` 은 그 이상이어야 하는 값, `maximum` 은 그 이하여야 하는 값이다. 비율이
    낮을수록 좋은 지표(미지원 주장 비율 같은)는 `maximum` 으로 적는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    metric_name: str = Field(min_length=1)
    minimum: float | None = None
    maximum: float | None = None
    note: str | None = None
    """이 기준값을 고른 근거. 판정 결과와 함께 남는다."""

    @model_validator(mode="after")
    def _require_a_bound(self) -> Threshold:
        if self.minimum is None and self.maximum is None:
            raise ValueError(
                f"{self.metric_name} 의 기준값이 없다. 재지 않는 지표는 기준 목록에"
                " 넣지 않는다"
            )
        if (
            self.minimum is not None
            and self.maximum is not None
            and self.minimum > self.maximum
        ):
            raise ValueError(
                f"{self.metric_name} 의 minimum 이 maximum 보다 크다. 충족할 수 있는"
                " 값이 없다"
            )
        return self


class AcceptancePolicy(BaseModel):
    """수용 기준 한 벌.

    정책 하나가 기준 전부를 정한다. 값을 바꾸려면 새 정책 버전을 만들고 판정 결과에
    그 버전을 남긴다. `rubric_set_id` 는 이 기준이 어느 루브릭 정책을 전제로 하는지
    가리킨다. 루브릭이 바뀌면 같은 지표 이름이라도 세는 것이 달라진다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    acceptance_policy_version: str = Field(min_length=1)
    rubric_set_id: str = Field(min_length=1)
    thresholds: tuple[Threshold, ...] = Field(min_length=1)
    note: str | None = None

    @model_validator(mode="after")
    def _keep_metric_names_unique(self) -> AcceptancePolicy:
        seen: set[str] = set()
        for threshold in self.thresholds:
            if threshold.metric_name in seen:
                raise ValueError(
                    f"{threshold.metric_name} 의 기준이 두 번 있다. 어느 값으로"
                    " 판정하는지 정해지지 않는다"
                )
            seen.add(threshold.metric_name)
        return self

    def metric_names(self) -> tuple[str, ...]:
        return tuple(threshold.metric_name for threshold in self.thresholds)


@dataclass(frozen=True, slots=True)
class Shortfall:
    """기준을 충족하지 못한 지표 하나."""

    metric_name: str
    reason: str
    observed: float | None = None
    bound: float | None = None

    def __str__(self) -> str:
        seen = "결측" if self.observed is None else f"{self.observed}"
        return f"{self.metric_name}={seen} ({self.reason})"


@dataclass(frozen=True, slots=True)
class AcceptanceDecision:
    """수용 판정 하나."""

    verdict: AcceptanceVerdict
    acceptance_policy_version: str
    reason: str
    shortfalls: tuple[Shortfall, ...] = ()
    measured: tuple[str, ...] = ()
    """실제로 잰 지표 이름. `not_gating` 이면 비어 있다."""

    @property
    def blocks_activation(self) -> bool:
        """활성화를 막는가. 미달만 막는다."""
        return self.verdict is AcceptanceVerdict.FAIL


def gating_reason(
    set_status: str | None, rubric_status: str | None = None
) -> str | None:
    """게이트로 쓰지 않는 사유. `None` 이면 게이트로 쓴다.

    세트와 루브릭 정책 둘 다 확정되어야 기준을 잰다. 기준을 정한 문장이 초안이면
    그 문장으로 잰 값도 초안이기 때문이다.
    """
    if set_status is None:
        return NO_STATUS_REASON
    if set_status in NON_GATING_STATUSES:
        return DRAFT_SET_REASON
    if rubric_status is not None and rubric_status in NON_GATING_STATUSES:
        return DRAFT_RUBRIC_REASON
    return None


def catalog_status(rubrics: RubricCatalog | None) -> str | None:
    """루브릭 정책 파일의 확정 상태. 파일을 주지 않으면 알 수 없다."""
    return None if rubrics is None else rubrics.status


def judge_acceptance(
    metrics: Mapping[str, float],
    policy: AcceptancePolicy,
    *,
    set_status: str | None,
    rubric_status: str | None = None,
) -> AcceptanceDecision:
    """채점 결과를 수용 기준과 견준다.

    채점하지 않은 지표는 미달이다. 기준에 적힌 지표를 재지 못한 실행은 그 축을
    통과했다고 말할 수 없고, 없는 값을 건너뛰면 케이스를 하나도 넣지 않은 세트가
    모든 기준을 통과한다.
    """
    skip = gating_reason(set_status, rubric_status)
    if skip is not None:
        return AcceptanceDecision(
            verdict=AcceptanceVerdict.NOT_GATING,
            acceptance_policy_version=policy.acceptance_policy_version,
            reason=f"{skip}. 채점 결과를 추이로만 남기고 게이트 판정에 쓰지 않는다",
        )

    shortfalls: list[Shortfall] = []
    measured: list[str] = []
    for threshold in policy.thresholds:
        observed = metrics.get(threshold.metric_name)
        if observed is None:
            shortfalls.append(
                Shortfall(metric_name=threshold.metric_name, reason=MISSING_METRIC)
            )
            continue
        measured.append(threshold.metric_name)
        if threshold.minimum is not None and observed < threshold.minimum:
            shortfalls.append(
                Shortfall(
                    metric_name=threshold.metric_name,
                    reason=f"기준 {threshold.minimum} 이상에 미치지 못한다",
                    observed=observed,
                    bound=threshold.minimum,
                )
            )
        if threshold.maximum is not None and observed > threshold.maximum:
            shortfalls.append(
                Shortfall(
                    metric_name=threshold.metric_name,
                    reason=f"기준 {threshold.maximum} 이하를 넘는다",
                    observed=observed,
                    bound=threshold.maximum,
                )
            )

    if shortfalls:
        detail = ", ".join(str(entry) for entry in shortfalls)
        return AcceptanceDecision(
            verdict=AcceptanceVerdict.FAIL,
            acceptance_policy_version=policy.acceptance_policy_version,
            reason=f"수용 기준 미달: {detail}",
            shortfalls=tuple(shortfalls),
            measured=tuple(measured),
        )

    return AcceptanceDecision(
        verdict=AcceptanceVerdict.PASS,
        acceptance_policy_version=policy.acceptance_policy_version,
        reason=f"수용 기준 {len(measured)} 개를 모두 충족한다",
        measured=tuple(measured),
    )
