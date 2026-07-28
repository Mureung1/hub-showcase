"""Stage E 통합 실행 스크립트의 계산 검증.

`scripts/stage_e.py` 는 패키지가 아니라 실행 스크립트라 `pytest` 가 수집하지 않는다.
여기서는 파일 경로로 불러와 순수 함수만 검사한다. 저장소에 붙지 않고 스크립트 전체를
돌리지 않는다.

검사 대상은 다섯이다. 단위 구간 전개, 계산할 조합 수, 델타의 저장 키, 결과 출력,
실행 전 가드다. 앞 셋은 실행 전에 사용자가 보는 유일한 수이거나 저장 자리를 정하는
키다. 결과 출력은 다섯 실행이 돌려주는 결과 모델의 필드·property 를 그대로 읽으므로
이름이 어긋나면 실행이 끝난 뒤에 `AttributeError` 로 무너진다.
"""

from __future__ import annotations

import importlib.util
import sys
from datetime import date
from pathlib import Path
from types import ModuleType

import pytest

from careersignal.contracts.check_result import (
    CheckName,
    CheckResult,
    CheckVerdict,
    Severity,
)
from careersignal.contracts.run_context import StopReason
from careersignal.domain.sampling import SampleStatus
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.segment import EntrySegment
from careersignal.metrics.depth_profile import DepthProfileOutcome
from careersignal.metrics.expansion import Envelope, MetricCombination, MetricFamily
from careersignal.metrics.runner import MetricOutcome
from careersignal.metrics.saturation import SaturationObservation, SaturationOutcome
from careersignal.metrics.temporal import Period, TemporalDelta
from careersignal.orchestration.envelope import analysis_version_identifier
from careersignal.verification.runner import CheckRunReport

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "stage_e.py"

JOB_ROLE_ID = "backend"
DATASET_VERSION = "ds_backend_2026_07"
ANALYSIS_VERSION = "an_stage_e"
PERIOD = "y2026"


def _load() -> ModuleType:
    """스크립트를 모듈로 불러온다.

    `pyproject.toml` 을 고치지 않는다. `scripts/` 를 테스트 경로에 넣으면 다른
    스크립트도 함께 수집되고, 그 스크립트들은 실행되면 저장소에 붙는다.
    """
    spec = importlib.util.spec_from_file_location("stage_e", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


stage = _load()


def _envelope(period_id: str = PERIOD) -> Envelope:
    return Envelope(
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB_ROLE_ID,
        entry_segment=EntrySegment.ALL,
        period_id=period_id,
    )


def _combination(dimension_id: str = "dim_a") -> MetricCombination:
    return MetricCombination(
        metric_family=str(MetricFamily.POSTING_PREVALENCE),
        formula_version="v1",
        envelope=_envelope(),
        dimension_id=dimension_id,
    )


def _period(period_id: str, year: int) -> Period:
    return Period(
        period_id=period_id,
        label=str(year),
        starts_on=date(year, 1, 1),
        ends_on=date(year, 12, 31),
    )


# ============================================================ 단위 구간
def test_full_range_runs_in_dependency_order() -> None:
    """번호 순서가 아니라 의존 관계가 실행 순서를 정한다."""
    assert stage.unit_range(1, 6) == (1, 2, 5, 6, 4)


def test_sample_verdict_unit_runs_the_aggregation() -> None:
    """13-3 은 단독 실행이 없다. 표본 판정은 13-1 의 저장 경로에 붙어 있다."""
    assert stage.unit_range(3, 3) == (1,)


def test_range_keeps_only_selected_units() -> None:
    assert stage.unit_range(1, 2) == (1, 2)
    assert stage.unit_range(5, 6) == (5, 6)
    assert stage.unit_range(4, 4) == (4,)


@pytest.mark.parametrize("start,end", [(0, 6), (1, 7), (4, 2)])
def test_bad_range_is_refused(start: int, end: int) -> None:
    """잘못된 구간을 조용히 좁히지 않는다."""
    with pytest.raises(ValueError):
        stage.unit_range(start, end)


# ============================================================ 진행 판정
def test_precondition_failure_blocks_next_units() -> None:
    errors = ((JOB_ROLE_ID, stage.NO_ACTIVE_TAXONOMY),)
    assert stage.blocks_next_units(StopReason.EXPLICIT_FAILURE, errors)


def test_partial_failure_does_not_block() -> None:
    """조합 하나가 실패한 것은 뒤 단계를 막지 않는다."""
    errors = (("dim_a", "ValueError: 카운트가 없다"),)
    assert not stage.blocks_next_units(StopReason.EXPLICIT_FAILURE, errors)


def test_other_stop_reasons_do_not_block() -> None:
    assert not stage.blocks_next_units(StopReason.FRONTIER_EXHAUSTED)
    assert not stage.blocks_next_units(StopReason.NO_NEW_EVIDENCE)


def test_precondition_reasons_come_from_the_modules() -> None:
    """사유 문구를 스크립트가 다시 적지 않는다."""
    assert stage.NO_ACTIVE_TAXONOMY in stage.PRECONDITION_REASONS
    assert stage.TAXONOMY_MISMATCH in stage.PRECONDITION_REASONS
    assert stage.NO_POLICY in stage.PRECONDITION_REASONS


# ============================================================ 스키마 확인
def test_migration_head_reads_the_chain(tmp_path: Path) -> None:
    (tmp_path / "0001_a.py").write_text(
        'revision = "0001_a"\ndown_revision = None\n', encoding="utf-8"
    )
    (tmp_path / "0002_b.py").write_text(
        'revision = "0002_b"\ndown_revision = "0001_a"\n', encoding="utf-8"
    )
    assert stage.migration_head(tmp_path) == "0002_b"


def test_broken_chain_is_not_guessed(tmp_path: Path) -> None:
    (tmp_path / "0001_a.py").write_text(
        'revision = "0001_a"\ndown_revision = None\n', encoding="utf-8"
    )
    (tmp_path / "0002_b.py").write_text(
        'revision = "0002_b"\ndown_revision = None\n', encoding="utf-8"
    )
    with pytest.raises(ValueError):
        stage.migration_head(tmp_path)


def test_repository_migrations_have_one_head() -> None:
    """0022 를 더한 뒤에도 사슬이 하나다."""
    assert stage.migration_head().startswith("0022")


def test_schema_is_current_needs_the_same_revision() -> None:
    assert stage.schema_is_current("0022_x", "0022_x")
    assert not stage.schema_is_current(None, "0022_x")
    assert not stage.schema_is_current("0021_x", "0022_x")


# ============================================================ 분석 버전
def test_planned_analysis_version_matches_the_envelope() -> None:
    """세기만 하는 실행이 봉투를 만들지 않고도 같은 버전을 가리킨다."""
    planned = stage.planned_analysis_version(JOB_ROLE_ID, DATASET_VERSION)
    assert planned == analysis_version_identifier(
        job_role_id=JOB_ROLE_ID,
        dataset_version=DATASET_VERSION,
        taxonomy_version_id=stage.TAXONOMY_VERSION_ID,
        model_version=stage.MODEL_VERSION,
        prompt_version=stage.PROMPT_VERSION,
        retrieval_policy_version=stage.RETRIEVAL_POLICY_VERSION,
        metric_policy_version=stage.METRIC_POLICY_VERSION,
    )
    assert planned.startswith("an_")


# ============================================================ 조합 수
def test_pair_upper_bound_counts_unordered_pairs() -> None:
    assert stage.pair_upper_bound(4, 2) == 12
    assert stage.pair_upper_bound(1, 5) == 0
    assert stage.pair_upper_bound(4, 0) == 0


def test_remaining_skips_combinations_that_have_every_measure() -> None:
    """예상 수를 증분 판정과 같은 규칙으로 센다."""
    combination = _combination()
    stored = {combination.fact_key("ratio")}
    assert stage.remaining_combinations([combination], stored) == 0
    assert stage.remaining_combinations([combination], set()) == 1


def test_remaining_counts_a_partially_stored_combination() -> None:
    """반드시 만드는 measure 가 하나라도 빠지면 다시 계산한다."""
    combination = MetricCombination(
        metric_family=str(MetricFamily.DEPTH_DISTRIBUTION),
        formula_version="v1",
        envelope=_envelope(),
        dimension_id="dim_a",
    )
    stored = {combination.fact_key("foundation")}
    assert stage.remaining_combinations([combination], stored) == 1


# ============================================================ 기간 쌍
def test_period_pairs_are_adjacent_and_ordered() -> None:
    """건너뛴 쌍을 만들지 않는다. 델타 행은 나중 기간 하나에만 달린다."""
    periods = [_period("y2026", 2026), _period("y2024", 2024), _period("y2025", 2025)]
    pairs = stage.period_pairs(periods)
    assert [(a.period_id, b.period_id) for a, b in pairs] == [
        ("y2024", "y2025"),
        ("y2025", "y2026"),
    ]


def test_one_period_has_no_pair() -> None:
    assert stage.period_pairs([_period("y2026", 2026)]) == ()
    assert stage.period_pairs([]) == ()


# ============================================================ 델타 저장 키
def _delta() -> TemporalDelta:
    return TemporalDelta(
        measure="posting_prevalence__ratio",
        base_metric_family=str(MetricFamily.POSTING_PREVALENCE),
        base_measure="ratio",
        metric_policy_version="mp_v1_prevalence",
        scope_level=ScopeLevel.OVERALL,
        scope_id=JOB_ROLE_ID,
        entry_segment=EntrySegment.ALL,
        period_id="y2026",
        prior_period_id="y2025",
        dimension_id="dim_a",
        numerator=6,
        denominator=12,
        value=0.1,
        sample_size=10,
        prior_sample_size=10,
        latest_sample_size=12,
        sample_status=SampleStatus.ANALYSIS_READY,
    )


def test_delta_key_matches_the_unique_condition() -> None:
    """키의 차례와 NULL 접는 방식을 `MetricCombination.fact_key` 와 같게 둔다."""
    key = stage.delta_fact_key(_delta().fact_columns())
    assert key == (
        "temporal_delta",
        "posting_prevalence__ratio",
        "overall",
        JOB_ROLE_ID,
        "all",
        "y2026",
        "dim_a",
        "",
    )


def test_delta_key_has_the_same_shape_as_the_aggregation_key() -> None:
    """증분 판정이 두 키를 한 집합에서 견주므로 모양이 같아야 한다."""
    aggregated = _combination().fact_key("ratio")
    assert len(stage.delta_fact_key(_delta().fact_columns())) == len(aggregated)


# ============================================================ 결과 출력
def test_aggregation_report_reads_the_outcome_fields() -> None:
    outcome = MetricOutcome(
        agent_run_id="run_e",
        stop_reason=StopReason.SLOTS_FILLED,
        taxonomy_version_id="tx_backend_v1",
        template_count=7,
        dimension_count=3,
        envelope_count=4,
        expanded_combinations=40,
        skipped_combinations=10,
        computed_combinations=30,
        stored_facts=36,
        by_family={"posting_prevalence": 12},
        suppressed_values=2,
        limit_reached=True,
        missing_input=(("dim_a", "견줄 posting_prevalence 행이 없다"),),
        errors=(("dim_b", "ValueError: 카운트가 없다"),),
    )
    stage.report_aggregation(outcome)
    assert stage._aggregation_incomplete(outcome)


def test_profile_report_reads_the_outcome_fields() -> None:
    outcome = DepthProfileOutcome(
        agent_run_id="run_e",
        stop_reason=StopReason.SLOTS_FILLED,
        taxonomy_version_id="tx_backend_v1",
        capability_count=5,
        envelope_count=2,
        expanded_profiles=10,
        skipped_profiles=1,
        stored_profiles=8,
        suppressed_profiles=1,
        limit_reached=False,
        missing_input=(("cap_a", "역량에 연결된 차원이 없다"),),
    )
    stage.report_profiles(outcome)


def test_saturation_report_reads_the_outcome_fields() -> None:
    outcome = SaturationOutcome(
        agent_run_id="run_e",
        stop_reason=StopReason.SLOTS_FILLED,
        taxonomy_version_id="tx_backend_v1",
        scope_id=JOB_ROLE_ID,
        observation=SaturationObservation(
            posting_count=30,
            new_candidate_count=4,
            cumulative_dimension_count=12,
            marginal_gain=0.4,
            posting_delta=10,
            first_observation=False,
        ),
        stored_observations=1,
    )
    stage.report_saturation(outcome)


def test_delta_report_reads_the_summary_fields() -> None:
    summary = stage.DeltaSummary(
        pairs=1,
        families=7,
        computed=3,
        stored=3,
        skipped=1,
        refused=2,
        reasons={"기간 비교에 쓸 수 없는 표본 상태다": 2},
    )
    stage.report_delta(summary)
    assert summary.stop_reason is StopReason.SLOTS_FILLED


def test_delta_summary_stop_reason_follows_the_run() -> None:
    assert stage.DeltaSummary().stop_reason is StopReason.FRONTIER_EXHAUSTED
    assert (
        stage.DeltaSummary(pairs=1).stop_reason is StopReason.NO_NEW_EVIDENCE
    )
    assert (
        stage.DeltaSummary(pairs=1, errors=[("a", "b")]).stop_reason
        is StopReason.EXPLICIT_FAILURE
    )


def test_verification_report_reads_the_check_report() -> None:
    report = CheckRunReport(
        target_type=stage.TARGET_AGGREGATION,
        target_id=ANALYSIS_VERSION,
        analysis_version=ANALYSIS_VERSION,
        results=(
            CheckResult(
                check=CheckName.NUMERICAL,
                target_type=stage.TARGET_AGGREGATION,
                target_id=ANALYSIS_VERSION,
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code="METRIC_RECOUNT_MISMATCH",
                detail={"violation_count": 3},
            ),
        ),
    )
    stage.report_verification(report)
    assert len(report.failed) == 1


def test_estimates_cover_every_selected_unit() -> None:
    workload = stage.Workload(
        analysis_version=ANALYSIS_VERSION,
        taxonomy_version_id="tx_backend_v1",
        dimension_count=4,
        envelope_count=2,
        direct_combinations=48,
        remaining_direct=20,
        pair_bound=12,
        stored_facts=100,
        period_pair_count=1,
        capability_count=3,
        profile_envelopes=2,
        stored_profiles=1,
    )
    estimates = stage.build_estimates(stage.unit_range(1, 6), workload)
    assert [estimate.unit for estimate in estimates] == [1, 2, 5, 6, 4]
    assert estimates[0].targets == 32
    assert stage.report_estimate(estimates) == 32 + 1 + 5 + 1 + 100


def test_combination_total_is_not_a_call_count() -> None:
    """Phase 13 은 모델을 부르지 않는다. 보여 주는 수는 조합 수다."""
    assert "호출하지 않는다" in stage.NO_MODEL_CALLS


def test_grouped_counts_reasons_from_pairs() -> None:
    pairs = [("a", "사유1"), ("b", "사유1"), ("c", "사유2")]
    assert stage._grouped(pairs) == [("사유1", 2), ("사유2", 1)]


def test_spread_prints_empty_counts() -> None:
    assert stage._spread({}) == "없음"
    assert stage._spread({"b": 2, "a": 1}) == "a 1  b 2"


# ============================================================ 실행 전 가드
def test_bad_limit_stops_before_the_repository() -> None:
    """저장소를 열기 전에 거른다. 0 은 아무것도 하지 않는 실행이다."""
    assert stage.main(["--limit", "0"]) == stage.EXIT_ABORTED


def test_bad_range_stops_before_the_repository() -> None:
    assert stage.main(["--from", "6", "--to", "1"]) == stage.EXIT_ABORTED


# ============================================================ 구성요소
def test_units_write_with_their_own_component() -> None:
    """거래마다 role 이 하나다. 쓰기 주체가 다른 표를 한 거래에서 쓰지 않는다."""
    from careersignal.domain.permissions import Component, can_write

    assert can_write(stage.UNIT_COMPONENT[1], "statistics_facts")
    assert can_write(stage.UNIT_COMPONENT[2], "statistics_facts")
    assert can_write(stage.UNIT_COMPONENT[5], "capability_depth_profiles")
    assert can_write(stage.UNIT_COMPONENT[6], "saturation_observations")
    assert can_write(stage.UNIT_COMPONENT[4], "verification_results")
    assert stage.UNIT_COMPONENT[6] is Component.AGENT_STATS
    assert not can_write(Component.PIPE_AGGREGATE, "saturation_observations")
    assert not can_write(Component.AGENT_STATS, "statistics_facts")


# ============================================================ 델타 실행
class FakeDeltaRepository:
    """13-2 가 쓰는 저장소의 대역. SQL 을 실행하지 않는다."""

    def __init__(self, rows: list[dict[str, object]]) -> None:
        self._rows = rows
        self.stored: list[dict[str, object]] = []

    def facts_for_periods(
        self, analysis_version: str, metric_family: str, period_ids: list[str]
    ) -> list[dict[str, object]]:
        return [
            dict(row)
            for row in self._rows
            if row["metric_family"] == metric_family
            and row["period_id"] in period_ids
        ]

    def add_fact(self, values: dict[str, object]) -> None:
        self.stored.append(dict(values))


def _fact_row(period_id: str, value: float, **override: object) -> dict[str, object]:
    base: dict[str, object] = {
        "metric_family": str(MetricFamily.POSTING_PREVALENCE),
        "measure": "ratio",
        "metric_policy_version": "mp_v1_prevalence",
        "scope_level": "overall",
        "scope_id": JOB_ROLE_ID,
        "entry_segment": "all",
        "period_id": period_id,
        "dimension_id": "dim_a",
        "secondary_dimension_id": None,
        "numerator": 6,
        "denominator": 12,
        "value": value,
        "sample_size": 12,
        "sample_status": str(SampleStatus.ANALYSIS_READY),
    }
    return base | override


def _delta_context() -> object:
    from careersignal.contracts.run_context import RunContext

    return RunContext(
        agent_run_id="run_stage_e",
        analysis_version=ANALYSIS_VERSION,
        dataset_version=DATASET_VERSION,
        job_role_id=JOB_ROLE_ID,
        scope_level=ScopeLevel.OVERALL,
        as_of_date=date(2026, 7, 1),
    )


def _prevalence_template() -> object:
    from careersignal.metrics.expansion import InputArity, MetricTemplate

    return MetricTemplate(
        metric_family=str(MetricFamily.POSTING_PREVALENCE),
        formula_version="v1",
        input_arity=InputArity.ONE_DIMENSION,
        output_unit="ratio",
    )


def _prevalence_policy() -> object:
    from careersignal.metrics.policy import MetricPolicyVersion

    return MetricPolicyVersion(
        metric_policy_version="mp_v1_prevalence",
        metric_family=str(MetricFamily.POSTING_PREVALENCE),
        formula_version="v1",
        minimum_n=5,
        minimum_n_comparison=10,
        suppression_policy="label_low_confidence",
        uncertainty_method="wilson_95",
    )


def _run_deltas(
    repository: FakeDeltaRepository,
    existing: set[tuple[str, ...]] | None = None,
    limit: int | None = None,
) -> object:
    summary = stage.DeltaSummary(pairs=1, families=1)
    stage._deltas_for_template(
        repository,  # type: ignore[arg-type]
        _delta_context(),  # type: ignore[arg-type]
        _prevalence_template(),  # type: ignore[arg-type]
        [_prevalence_policy()],
        [(_period("y2025", 2025), _period("y2026", 2026))],
        existing if existing is not None else set(),
        summary,
        limit,
    )
    return summary


def test_delta_run_stores_one_row_per_pair() -> None:
    """두 기간의 저장된 값에서 차이를 만들어 한 행으로 남긴다."""
    repository = FakeDeltaRepository(
        [_fact_row("y2025", 0.4), _fact_row("y2026", 0.5)]
    )
    summary = _run_deltas(repository)
    assert summary.stored == 1
    row = repository.stored[0]
    assert row["metric_family"] == "temporal_delta"
    assert row["measure"] == "posting_prevalence__ratio"
    assert row["period_id"] == "y2026"
    assert row["value"] == pytest.approx(0.1)
    assert row["fact_id"].startswith("fact_")
    assert row["analysis_version"] == ANALYSIS_VERSION


def test_delta_run_skips_rows_that_already_exist() -> None:
    """증분 재실행이 같은 델타를 두 번 만들지 않는다."""
    repository = FakeDeltaRepository(
        [_fact_row("y2025", 0.4), _fact_row("y2026", 0.5)]
    )
    first = _run_deltas(repository)
    stored_key = stage.delta_fact_key(repository.stored[0])
    second = _run_deltas(repository, existing={stored_key})
    assert first.stored == 1
    assert second.stored == 0
    assert second.skipped == 1


def test_delta_run_refuses_not_comparable_inputs() -> None:
    """비교 불가로 표시된 값끼리 뺀 결과는 저장하지 않는다."""
    repository = FakeDeltaRepository(
        [
            _fact_row("y2025", 0.4, sample_status=str(SampleStatus.LOW_CONFIDENCE)),
            _fact_row("y2026", 0.5),
        ]
    )
    summary = _run_deltas(repository)
    assert summary.stored == 0
    assert summary.refused == 1
    assert sum(summary.reasons.values()) == 1


def test_delta_run_respects_the_limit() -> None:
    repository = FakeDeltaRepository(
        [
            _fact_row("y2025", 0.4),
            _fact_row("y2026", 0.5),
            _fact_row("y2025", 0.2, dimension_id="dim_b"),
            _fact_row("y2026", 0.3, dimension_id="dim_b"),
        ]
    )
    summary = _run_deltas(repository, limit=1)
    assert summary.stored == 1
    assert summary.limit_reached


def test_delta_run_records_a_failed_insert() -> None:
    """행 하나의 저장 실패로 멈추지 않고 사유를 남긴다."""

    class Failing(FakeDeltaRepository):
        def add_fact(self, values: dict[str, object]) -> None:
            raise RuntimeError("제약 위반")

    summary = _run_deltas(
        Failing([_fact_row("y2025", 0.4), _fact_row("y2026", 0.5)])
    )
    assert summary.stored == 0
    assert summary.errors


def test_sample_verdict_rides_along_with_a_storing_unit() -> None:
    """구간에 13-2 가 있으면 13-3 때문에 13-1 을 다시 돌리지 않는다."""
    assert stage.unit_range(2, 5) == (2, 5, 4)
    assert stage.unit_range(3, 4) == (1, 4)


def _check_result(verdict: CheckVerdict) -> CheckResult:
    return CheckResult(
        check=CheckName.NUMERICAL,
        target_type=stage.TARGET_AGGREGATION,
        target_id=ANALYSIS_VERSION,
        verdict=verdict,
        severity=Severity.BLOCKING if verdict is CheckVerdict.FAIL else Severity.INFO,
        reason_code=None if verdict is CheckVerdict.PASS else "STATISTICS_NO_FACTS",
    )


def test_verification_without_facts_is_not_a_pass() -> None:
    """검사할 대상이 없는 것과 검사해서 문제가 없는 것은 다른 상태다."""
    assert (
        stage.verification_stop_reason([_check_result(CheckVerdict.SKIP)])
        is StopReason.FRONTIER_EXHAUSTED
    )
    assert stage.verification_stop_reason([]) is StopReason.FRONTIER_EXHAUSTED


def test_verification_stop_reason_reports_violations() -> None:
    assert (
        stage.verification_stop_reason([_check_result(CheckVerdict.FAIL)])
        is StopReason.EXPLICIT_FAILURE
    )
    assert (
        stage.verification_stop_reason([_check_result(CheckVerdict.PASS)])
        is StopReason.SLOTS_FILLED
    )
