"""표본 수렴 기록 검증.

규칙은 docs/statistics-model.md 8장이고 저장 자리는 docs/erd.md 10.7 이다. 저장소를
대역으로 대체하고 한계 증가량, 증분 판정, 범위별 계열, 냉시작만 검사한다. 데이터베이스와
외부 호출은 하지 않는다.
"""

from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import pytest

from careersignal.contracts import RunContext, StopReason
from careersignal.domain.permissions import Component, can_write
from careersignal.domain.scope import ScopeLevel
from careersignal.metrics.saturation import (
    COUNT_DECREASED,
    TAXONOMY_MISMATCH,
    SaturationSample,
    SaturationTracking,
    SeriesState,
    is_repeat,
    marginal_gain,
    observation_identifier,
    observe,
    observed_at,
)
from careersignal.repositories.saturation import SaturationRepository

JOB_ROLE_ID = "backend"
TAXONOMY_VERSION_ID = "tx_backend_v1"
ANALYSIS_VERSION = "an_test"
DATASET_VERSION = "ds_test"
CLUSTER = "cluster_platform"
AS_OF = date(2026, 7, 1)

OBSERVATION_COLUMNS = {
    "observation_id",
    "analysis_version",
    "job_role_id",
    "scope_id",
    "posting_count",
    "new_candidate_count",
    "cumulative_dimension_count",
    "marginal_gain",
    "observed_at",
}
"""docs/erd.md 10.7 의 컬럼. `created_at` 은 기본값이 채운다."""

ACTIVE_TAXONOMY: dict[str, Any] = {
    "taxonomy_version_id": TAXONOMY_VERSION_ID,
    "taxonomy_id": "tax_backend",
    "version_number": 1,
    "taxonomy_policy_version": "tp_v1",
}
"""`Repository.active_taxonomy_version` 이 돌려주는 행. 대역의 기본값이다."""

_UNSET = object()
"""인자를 주지 않은 것과 None 을 준 것을 가른다. None 은 활성 버전이 없다는 뜻이다."""


def _context(
    scope_level: ScopeLevel = ScopeLevel.OVERALL, scope_id: str | None = None
) -> RunContext:
    return RunContext(
        agent_run_id="run_saturation",
        analysis_version=ANALYSIS_VERSION,
        dataset_version=DATASET_VERSION,
        taxonomy_version_id=TAXONOMY_VERSION_ID,
        job_role_id=JOB_ROLE_ID,
        scope_level=scope_level,
        scope_id=scope_id,
        as_of_date=AS_OF,
    )


class FakeSaturation:
    """수렴 기록 저장소의 대역. SQL 을 실행하지 않는다.

    `series_state` 를 저장된 행에서 다시 세어 실제 조회와 같은 값을 준다. 누적 값은
    최댓값, 누적 후보 수는 신규 후보 수의 합이다.
    """

    def __init__(
        self,
        posting_count: int = 30,
        candidate_total: int = 12,
        dimension_count: int = 8,
        active: Any = _UNSET,
    ) -> None:
        self.counts = {
            "posting_count": posting_count,
            "candidate_total": candidate_total,
            "dimension_count": dimension_count,
        }
        self._active = ACTIVE_TAXONOMY if active is _UNSET else active
        self.rows: list[dict[str, Any]] = []
        self.posting_queries: list[dict[str, Any]] = []

    # -------------------------------------------------------- 읽기
    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        return self._active

    def posting_count(
        self,
        job_role_id: str,
        dataset_version: str,
        as_of_date: date,
        cluster_id: str | None = None,
    ) -> int:
        self.posting_queries.append(
            {"job_role_id": job_role_id, "cluster_id": cluster_id}
        )
        return int(self.counts["posting_count"])

    def candidate_total(self, job_role_id: str) -> int:
        return int(self.counts["candidate_total"])

    def active_dimension_count(self, taxonomy_version_id: str) -> int:
        return int(self.counts["dimension_count"])

    def series_state(
        self, analysis_version: str, job_role_id: str, scope_id: str
    ) -> dict[str, Any]:
        series = [
            row
            for row in self.rows
            if row["analysis_version"] == analysis_version
            and row["job_role_id"] == job_role_id
            and row["scope_id"] == scope_id
        ]
        return {
            "observation_count": len(series),
            "posting_count": max((r["posting_count"] for r in series), default=0),
            "candidate_total": sum(r["new_candidate_count"] for r in series),
            "dimension_count": max(
                (r["cumulative_dimension_count"] for r in series), default=0
            ),
        }

    # -------------------------------------------------------- 쓰기
    def add_observation(self, values: dict[str, Any]) -> None:
        if any(row["observation_id"] == values["observation_id"] for row in self.rows):
            raise AssertionError(f"같은 관측을 두 번 넣었다: {values['observation_id']}")
        self.rows.append(dict(values))


def _run(fake: FakeSaturation, context: RunContext | None = None) -> Any:
    return SaturationTracking(fake).run(context or _context())  # type: ignore[arg-type]


# ------------------------------------------------------------ 한계 증가량
def test_first_observation_has_no_marginal_gain() -> None:
    """첫 관측은 견줄 앞선 관측이 없으므로 증가량이 비어 있다."""
    assert (
        marginal_gain(new_candidate_count=12, posting_delta=30, has_prior=False)
        is None
    )


def test_zero_gain_differs_from_first_observation() -> None:
    """공고를 더했는데 새 후보가 없으면 0 이다. 첫 관측의 빈 값과 다르다."""
    zero = marginal_gain(new_candidate_count=0, posting_delta=10, has_prior=True)
    assert zero == 0.0
    assert zero is not None


def test_marginal_gain_divides_by_added_postings() -> None:
    """증가량은 두 관측 사이의 기울기다. 누적 평균이 아니다."""
    assert marginal_gain(new_candidate_count=3, posting_delta=12, has_prior=True) == (
        pytest.approx(0.25)
    )


def test_marginal_gain_is_empty_without_added_postings() -> None:
    """공고가 늘지 않은 관측은 분모가 0 이므로 증가량이 성립하지 않는다."""
    assert marginal_gain(new_candidate_count=2, posting_delta=0, has_prior=True) is None


# ------------------------------------------------------------ 관측 만들기
def _sample(postings: int, candidates: int, dimensions: int) -> SaturationSample:
    return SaturationSample(
        posting_count=postings,
        candidate_total=candidates,
        dimension_count=dimensions,
    )


def test_observe_marks_first_observation() -> None:
    """첫 관측은 누적 후보 전부를 신규로 센다."""
    observation = observe(_sample(30, 12, 8), SeriesState())
    assert observation is not None
    assert observation.first_observation
    assert observation.new_candidate_count == 12
    assert observation.marginal_gain is None


def test_observe_returns_none_for_repeat() -> None:
    """세 누적 값이 그대로면 새 관측이 아니다."""
    state = SeriesState(
        observation_count=1, posting_count=30, candidate_total=12, dimension_count=8
    )
    sample = _sample(30, 12, 8)
    assert is_repeat(sample, state)
    assert observe(sample, state) is None


def test_observe_counts_only_new_candidates() -> None:
    """신규 후보 수는 앞선 관측과의 차이다."""
    state = SeriesState(
        observation_count=1, posting_count=30, candidate_total=12, dimension_count=8
    )
    observation = observe(_sample(50, 15, 9), state)
    assert observation is not None
    assert observation.new_candidate_count == 3
    assert observation.posting_delta == 20
    assert observation.marginal_gain == pytest.approx(0.15)
    assert not observation.first_observation


def test_observe_rejects_decreasing_counts() -> None:
    """누적 값은 줄지 않는다. 줄었다면 계열을 잘못 읽은 것이다."""
    state = SeriesState(
        observation_count=1, posting_count=30, candidate_total=12, dimension_count=8
    )
    with pytest.raises(ValueError, match=COUNT_DECREASED):
        observe(_sample(20, 12, 8), state)


def test_observed_at_follows_envelope_date() -> None:
    """관측 시각은 실행 봉투의 기준일이다. 실행 시각이 아니다."""
    assert observed_at(AS_OF) == datetime(2026, 7, 1, tzinfo=UTC)


def test_observation_identifier_is_deterministic() -> None:
    """같은 계열의 같은 누적 상태는 같은 식별자다."""
    sample = _sample(30, 12, 8)
    first = observation_identifier(ANALYSIS_VERSION, JOB_ROLE_ID, JOB_ROLE_ID, sample)
    assert first == observation_identifier(
        ANALYSIS_VERSION, JOB_ROLE_ID, JOB_ROLE_ID, sample
    )
    assert first != observation_identifier(
        ANALYSIS_VERSION, JOB_ROLE_ID, CLUSTER, sample
    )
    assert first != observation_identifier(
        ANALYSIS_VERSION, JOB_ROLE_ID, JOB_ROLE_ID, _sample(31, 12, 8)
    )


# ------------------------------------------------------------ 실행
def test_observation_row_matches_erd_columns() -> None:
    """저장 행의 컬럼이 docs/erd.md 10.7 과 같다."""
    fake = FakeSaturation()
    outcome = _run(fake)
    assert outcome.stored_observations == 1
    assert outcome.stop_reason is StopReason.SLOTS_FILLED
    row = fake.rows[0]
    assert set(row) == OBSERVATION_COLUMNS
    assert row["scope_id"] == JOB_ROLE_ID
    assert row["posting_count"] == 30
    assert row["new_candidate_count"] == 12
    assert row["cumulative_dimension_count"] == 8
    assert row["marginal_gain"] is None


def test_same_observation_is_not_recorded_twice() -> None:
    """관측 시점마다 한 행이다. 달라진 것이 없으면 행을 늘리지 않는다."""
    fake = FakeSaturation()
    first = _run(fake)
    second = _run(fake)
    assert first.stored_observations == 1
    assert second.stored_observations == 0
    assert second.repeated_observations == 1
    assert second.stop_reason is StopReason.NO_NEW_EVIDENCE
    assert len(fake.rows) == 1


def test_second_observation_records_zero_gain() -> None:
    """공고만 늘고 후보가 늘지 않은 관측은 증가량 0 으로 남는다."""
    fake = FakeSaturation()
    _run(fake)
    fake.counts["posting_count"] = 60
    outcome = _run(fake)
    assert outcome.stored_observations == 1
    assert fake.rows[1]["new_candidate_count"] == 0
    assert fake.rows[1]["marginal_gain"] == 0.0
    assert fake.rows[0]["marginal_gain"] is None


def test_series_is_separate_per_scope() -> None:
    """범위마다 계열이 따로다. 기업군 관측이 직무 전체 계열을 잇지 않는다."""
    fake = FakeSaturation()
    _run(fake)
    outcome = _run(fake, _context(ScopeLevel.CLUSTER, CLUSTER))
    assert outcome.stored_observations == 1
    assert outcome.scope_id == CLUSTER
    assert fake.rows[1]["scope_id"] == CLUSTER
    assert fake.rows[1]["marginal_gain"] is None
    assert fake.posting_queries[-1]["cluster_id"] == CLUSTER


def test_cold_start_without_taxonomy_records_zero_dimensions() -> None:
    """활성 분류체계 버전이 없으면 누적 차원 수는 0 이다. 관측은 그대로 남긴다."""
    fake = FakeSaturation(active=None)
    outcome = _run(fake)
    assert outcome.stored_observations == 1
    assert fake.rows[0]["cumulative_dimension_count"] == 0
    assert outcome.taxonomy_version_id is None


def test_halts_on_taxonomy_mismatch() -> None:
    """봉투의 분류체계 버전이 활성 버전과 다르면 두 버전의 차원 수를 섞지 않는다."""
    fake = FakeSaturation(
        active={**ACTIVE_TAXONOMY, "taxonomy_version_id": "tx_other"}
    )
    outcome = _run(fake)
    assert outcome.halted
    assert outcome.halted_reason == TAXONOMY_MISMATCH
    assert fake.rows == []


def test_decreasing_counts_are_reported_not_written() -> None:
    """누적이 줄어든 실행은 사유만 남기고 행을 넣지 않는다."""
    fake = FakeSaturation()
    _run(fake)
    fake.counts["candidate_total"] = 3
    outcome = _run(fake)
    assert outcome.stored_observations == 0
    assert outcome.errors == ((JOB_ROLE_ID, COUNT_DECREASED),)
    assert len(fake.rows) == 1


def test_repository_writes_as_stats_component() -> None:
    """쓰기 주체는 D3a 분류체계 에이전트다(docs/permission-matrix.md 3장).

    깊이 프로파일과 쓰기 주체가 다르므로 거래를 따로 연다.
    """
    assert SaturationRepository.component is Component.AGENT_STATS
    assert can_write(Component.AGENT_STATS, "saturation_observations")
    assert not can_write(Component.PIPE_AGGREGATE, "saturation_observations")
