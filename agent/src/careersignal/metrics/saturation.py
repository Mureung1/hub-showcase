"""표본 수렴 기록.

정의는 docs/statistics-model.md 8장이고 저장 자리는 docs/erd.md 10.7 의
`saturation_observations` 다. 공고를 추가할 때 새로 등장하는 차원 후보의 증가량을
남기며, 공고 누적 수·신규 후보 수·누적 차원 수·한계 증가량을 담는다.

이 기록은 데이터셋 충분성의 진단 자료이며 수집이나 분석 실행의 단독 종료 사유가 아니다
(docs/statistics-model.md 8장). 증가 곡선과 기업군별 확보 범위를 함께 검토해 표본의
충분성을 판단하므로, 이 모듈은 어떤 실행도 멈추지 않고 값을 판정하지도 않는다. 한계
증가량이 0 이어도 다음 실행을 막지 않는다.

관측 시점마다 한 행이다. 같은 관측을 두 번 남기지 않도록 마지막 관측과 견주는 증분
판정을 둔다. 판정은 순수 함수이며 저장소 없이 검사된다.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, date, datetime

from pydantic import BaseModel, ConfigDict, Field

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.domain.scope import ScopeLevel
from careersignal.repositories.saturation import SaturationRepository

MARGINAL_GAIN_DIGITS = 6
"""한계 증가량을 반올림하는 소수 자리. `numeric(12,6)` 과 맞춘다(docs/erd.md 10.7)."""

NO_PRIOR_OBSERVATION = "앞선 관측이 없다"
"""첫 관측의 한계 증가량이 비어 있는 사유.

증가량은 두 관측 사이의 변화이므로 첫 관측에는 값이 없다. 0 으로 채우면 후보가 더 나오지
않은 상태와 아직 견줄 대상이 없는 상태가 같은 값이 된다. `marginal_gain` 이 NULL 을
허용하는 자리다.
"""

NO_POSTING_ADDED = "공고가 늘지 않았다"
"""공고 누적 수가 그대로인 관측의 한계 증가량이 비어 있는 사유.

분모가 0 이므로 공고당 증가량이 성립하지 않는다. 후보만 늘어난 관측이 여기에 해당하며,
행은 남기고 증가량만 비운다.
"""

COUNT_DECREASED = "누적 값은 줄지 않는다"
"""누적 공고 수·후보 수·차원 수가 앞선 관측보다 작다. 관측을 남기지 않는다."""

TAXONOMY_MISMATCH = "실행 봉투의 분류체계 버전이 활성 버전과 다르다"
"""봉투가 고정한 버전과 저장소의 활성 버전이 어긋났다. 두 버전의 차원 수를 섞지 않는다."""


class SaturationSample(BaseModel):
    """관측 시점의 누적 원자료. 저장소가 세어 온 값이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    posting_count: int = Field(ge=0)
    """범위·데이터셋의 누적 `posting_version` 수. 중복 제거 단위와 같다."""

    candidate_total: int = Field(ge=0)
    """이 직무 분류체계의 누적 차원 후보 수(docs/erd.md 7.7)."""

    dimension_count: int = Field(ge=0)
    """활성 분류체계 버전의 누적 차원 수(docs/erd.md 7.4)."""


class SeriesState(BaseModel):
    """같은 범위에 이미 남은 관측들의 요약.

    누적 값이므로 앞선 관측의 최댓값이 직전 상태다. `candidate_total` 만 합계인 이유는
    `saturation_observations` 가 누적 후보 수를 두지 않고 관측마다의 신규 후보 수를 담기
    때문이다(docs/erd.md 10.7). 신규 후보 수를 모두 더한 값이 지금까지 기록한 누적 후보
    수다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    observation_count: int = Field(default=0, ge=0)
    posting_count: int = Field(default=0, ge=0)
    candidate_total: int = Field(default=0, ge=0)
    dimension_count: int = Field(default=0, ge=0)

    @property
    def has_prior(self) -> bool:
        """앞선 관측이 있는가. 첫 관측과 증가량 0 을 가르는 값이다."""
        return self.observation_count > 0


class SaturationObservation(BaseModel):
    """관측 한 행. 컬럼은 docs/erd.md 10.7 이다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    posting_count: int = Field(ge=0)
    new_candidate_count: int = Field(ge=0)
    cumulative_dimension_count: int = Field(ge=0)
    marginal_gain: float | None = None
    """공고 한 건을 더할 때 늘어난 차원 후보 수. 정의되지 않으면 비운다."""

    posting_delta: int = Field(ge=0)
    """앞선 관측 이후 늘어난 공고 수. 증가량의 분모이며 표에는 담지 않는다."""

    first_observation: bool
    """첫 관측인가. 증가량이 비어 있는 두 사유를 가른다."""


def marginal_gain(
    new_candidate_count: int, posting_delta: int, has_prior: bool
) -> float | None:
    """한계 증가량.

    ```text
    marginal_gain = 신규 후보 수 / 늘어난 공고 수
    ```

    공고 한 건을 더할 때 새로 나타난 차원 후보의 수다. 누적 후보 수를 누적 공고 수로
    나누지 않고 두 관측 사이의 차이로 나누는 이유는, 수렴을 보는 값이 곡선의 높이가
    아니라 기울기이기 때문이다. 누적 평균은 공고가 늘수록 앞선 관측에 눌려 기울기가
    0 에 가까워진 뒤에도 계속 양수로 남는다.

    두 자리에서 값이 없다. 첫 관측은 견줄 앞선 관측이 없고(`NO_PRIOR_OBSERVATION`),
    공고가 늘지 않은 관측은 분모가 0 이다(`NO_POSTING_ADDED`). 둘 다 NULL 이며 증가량
    0 과 구분된다. 증가량 0 은 공고를 더했는데 새 후보가 나오지 않았다는 관측이고, 그
    구분이 수렴 판단의 근거다.
    """
    if not has_prior or posting_delta <= 0:
        return None
    return round(new_candidate_count / posting_delta, MARGINAL_GAIN_DIGITS)


def is_repeat(sample: SaturationSample, state: SeriesState) -> bool:
    """같은 관측을 두 번 남기려는가.

    세 누적 값이 앞선 관측과 모두 같으면 새 관측이 아니다. 관측 시점마다 한 행이라는
    것이 이 표의 규약이므로(docs/statistics-model.md 8장), 아무것도 달라지지 않은 실행이
    행을 늘리면 곡선에 평평한 구간이 실제보다 길게 그려진다.
    """
    return (
        state.has_prior
        and sample.posting_count == state.posting_count
        and sample.candidate_total == state.candidate_total
        and sample.dimension_count == state.dimension_count
    )


def observe(
    sample: SaturationSample, state: SeriesState
) -> SaturationObservation | None:
    """관측 하나를 만든다. 달라진 것이 없으면 None 이다.

    누적 값이 앞선 관측보다 작으면 예외다. 누적은 줄지 않으며, 줄었다면 범위나 분석
    버전이 다른 계열을 하나로 읽은 것이다. 값을 0 으로 깎아 넘기면 그 사실이 남지 않는다.
    """
    if (
        sample.posting_count < state.posting_count
        or sample.candidate_total < state.candidate_total
        or sample.dimension_count < state.dimension_count
    ):
        raise ValueError(COUNT_DECREASED)
    if is_repeat(sample, state):
        return None

    posting_delta = sample.posting_count - state.posting_count
    new_candidate_count = sample.candidate_total - state.candidate_total
    return SaturationObservation(
        posting_count=sample.posting_count,
        new_candidate_count=new_candidate_count,
        cumulative_dimension_count=sample.dimension_count,
        marginal_gain=marginal_gain(
            new_candidate_count, posting_delta, state.has_prior
        ),
        posting_delta=posting_delta,
        first_observation=not state.has_prior,
    )


def observation_identifier(
    analysis_version: str,
    job_role_id: str,
    scope_id: str,
    sample: SaturationSample,
) -> str:
    """같은 계열의 같은 누적 상태는 같은 관측이다.

    재료가 증분 판정이 보는 값과 같으므로, 판정을 지나친 중복 삽입도 기본키에서 막힌다.
    """
    material = ":".join(
        [
            analysis_version,
            job_role_id,
            scope_id,
            str(sample.posting_count),
            str(sample.candidate_total),
            str(sample.dimension_count),
        ]
    ).encode()
    return f"sat_{hashlib.sha256(material).hexdigest()[:24]}"


def observed_at(as_of_date: date) -> datetime:
    """관측 시각. 실행 봉투의 `as_of_date` 를 UTC 자정으로 읽는다.

    실행 시각을 쓰지 않는 이유는 같은 봉투를 다시 돌린 결과가 시각만 다른 행으로 남지
    않게 하기 위해서다. 관측이 가리키는 것은 실행한 순간이 아니라 데이터셋을 해석한
    기준일이다(docs/architecture.md 5장).
    """
    return datetime(as_of_date.year, as_of_date.month, as_of_date.day, tzinfo=UTC)


class SaturationOutcome(BaseModel):
    """수렴 기록 실행 하나의 결과.

    종료 사유는 이 실행 자체의 것이며 수집이나 분석의 종료를 뜻하지 않는다
    (docs/statistics-model.md 8장).
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_version_id: str | None = None

    scope_id: str | None = None
    observation: SaturationObservation | None = None
    """이번에 남긴 관측. 달라진 것이 없으면 비운다."""

    stored_observations: int = 0
    repeated_observations: int = 0
    """앞선 관측과 같아 남기지 않은 관측 수."""

    errors: tuple[tuple[str, str], ...] = ()
    halted_reason: str | None = None

    @property
    def gained_evidence(self) -> bool:
        return self.stored_observations > 0

    @property
    def halted(self) -> bool:
        return self.halted_reason is not None


class SaturationTracking:
    """공고 누적과 차원 후보 증가를 `saturation_observations` 에 남긴다.

    쓰기 주체가 D3a 분류체계 에이전트이므로(docs/permission-matrix.md 3장) 이 실행은
    `Component.AGENT_STATS` 거래에서 돈다. 프로파일과 쓰기 주체가 다르므로 거래를 따로
    연다.
    """

    def __init__(self, repository: SaturationRepository) -> None:
        self._repository = repository

    def run(self, context: RunContext) -> SaturationOutcome:
        """관측 하나를 세어 남긴다. 같은 관측이면 아무것도 남기지 않는다.

        범위는 실행 봉투를 따른다. `overall` 의 `scope_id` 는 직무 식별자다.
        `saturation_observations.scope_id` 가 NOT NULL 이고 직무 전체에는 가리킬 대상이
        없기 때문이며, `statistics_facts` 와 같은 규약이다.

        활성 분류체계 버전이 없으면 누적 차원 수를 0 으로 읽는다. 후보만 쌓이고 아직
        승격이 없는 냉시작의 정상 상태이며, 그 구간이야말로 증가 곡선이 필요한 자리다.
        """
        active = self._repository.active_taxonomy_version(context.job_role_id)
        taxonomy_version_id = (
            str(active["taxonomy_version_id"]) if active is not None else None
        )
        if (
            context.taxonomy_version_id is not None
            and taxonomy_version_id is not None
            and context.taxonomy_version_id != taxonomy_version_id
        ):
            return SaturationOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.EXPLICIT_FAILURE,
                taxonomy_version_id=taxonomy_version_id,
                halted_reason=TAXONOMY_MISMATCH,
                errors=((context.job_role_id, TAXONOMY_MISMATCH),),
            )

        scope_id = context.scope_id or context.job_role_id
        cluster_id = (
            context.scope_id
            if context.scope_level is ScopeLevel.CLUSTER
            else None
        )
        sample = SaturationSample(
            posting_count=self._repository.posting_count(
                context.job_role_id,
                context.dataset_version,
                context.as_of_date,
                cluster_id,
            ),
            candidate_total=self._repository.candidate_total(context.job_role_id),
            dimension_count=(
                self._repository.active_dimension_count(taxonomy_version_id)
                if taxonomy_version_id is not None
                else 0
            ),
        )
        state = SeriesState.model_validate(
            self._repository.series_state(
                context.analysis_version, context.job_role_id, scope_id
            )
        )

        try:
            observation = observe(sample, state)
        except ValueError as exc:
            return SaturationOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.EXPLICIT_FAILURE,
                taxonomy_version_id=taxonomy_version_id,
                scope_id=scope_id,
                errors=((scope_id, str(exc)),),
                halted_reason=str(exc),
            )

        if observation is None:
            return SaturationOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.NO_NEW_EVIDENCE,
                taxonomy_version_id=taxonomy_version_id,
                scope_id=scope_id,
                repeated_observations=1,
            )

        row = {
            "observation_id": observation_identifier(
                context.analysis_version, context.job_role_id, scope_id, sample
            ),
            "analysis_version": context.analysis_version,
            "job_role_id": context.job_role_id,
            "scope_id": scope_id,
            "posting_count": observation.posting_count,
            "new_candidate_count": observation.new_candidate_count,
            "cumulative_dimension_count": observation.cumulative_dimension_count,
            "marginal_gain": observation.marginal_gain,
            "observed_at": observed_at(context.as_of_date),
        }
        try:
            self._repository.add_observation(row)
        except Exception as exc:
            return SaturationOutcome(
                agent_run_id=context.agent_run_id,
                stop_reason=StopReason.EXPLICIT_FAILURE,
                taxonomy_version_id=taxonomy_version_id,
                scope_id=scope_id,
                errors=((scope_id, f"{type(exc).__name__}: {exc}"),),
            )
        return SaturationOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.SLOTS_FILLED,
            taxonomy_version_id=taxonomy_version_id,
            scope_id=scope_id,
            observation=observation,
            stored_observations=1,
        )


__all__ = [
    "COUNT_DECREASED",
    "MARGINAL_GAIN_DIGITS",
    "NO_POSTING_ADDED",
    "NO_PRIOR_OBSERVATION",
    "TAXONOMY_MISMATCH",
    "SaturationObservation",
    "SaturationOutcome",
    "SaturationSample",
    "SaturationTracking",
    "SeriesState",
    "is_repeat",
    "marginal_gain",
    "observation_identifier",
    "observe",
    "observed_at",
]
