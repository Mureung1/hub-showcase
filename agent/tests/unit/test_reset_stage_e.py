"""Stage E 되돌리기 스크립트의 순수 함수 검증.

`scripts/reset_stage_e.py` 는 패키지가 아니라 실행 스크립트라 `pytest` 가 수집하지
않는다. 여기서는 파일 경로로 불러와 순수 함수만 검사한다. 저장소에 붙지 않고 한 줄도
지우지 않는다.

검사 대상은 넷이다. 되돌림 범위 전개, 지우는 차례와 범위 조건, 지우지 않는 표, 확인
문자열 판정이다. 이 스크립트는 잘못 돌면 실데이터가 사라지므로 조건 없는 삭제가
하나도 없다는 사실을 테스트로 고정한다.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "reset_stage_e.py"

DATASET_VERSION = "ds_backend_2026_07"


def _load() -> ModuleType:
    """스크립트를 모듈로 불러온다."""
    spec = importlib.util.spec_from_file_location("reset_stage_e", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


reset = _load()


# ============================================================ 되돌림 범위
def test_cascade_reaches_the_last_unit() -> None:
    """한 단위를 되돌리면 그 뒤도 함께 되돌린다."""
    assert reset.unit_cascade(1) == (1, 2, 3, 4, 5, 6)
    assert reset.unit_cascade(5) == (5, 6)


@pytest.mark.parametrize("unit", [0, 7, -1])
def test_bad_unit_is_refused(unit: int) -> None:
    with pytest.raises(ValueError):
        reset.unit_cascade(unit)


def test_steps_follow_the_selected_units() -> None:
    tables = [step.table for step in reset.steps_for(reset.unit_cascade(5))]
    assert tables == ["capability_depth_profiles", "saturation_observations"]


def test_full_reset_covers_the_three_tables() -> None:
    """되돌릴 표는 셋이다. `statistics_facts` 는 단위마다 갈라 지운다."""
    tables = {step.table for step in reset.steps_for(reset.unit_cascade(1))}
    assert tables == {
        "statistics_facts",
        "capability_depth_profiles",
        "saturation_observations",
    }


def test_profiles_are_deleted_before_the_facts_they_came_from() -> None:
    order = [step.table for step in reset.steps_for(reset.unit_cascade(1))]
    assert order.index("capability_depth_profiles") < order.index("statistics_facts")


def test_the_two_fact_steps_do_not_overlap() -> None:
    """델타 행과 나머지 지표 행을 갈라 세므로 합계가 부풀지 않는다."""
    conditions = [
        step.where for step in reset.DELETE_STEPS if step.table == "statistics_facts"
    ]
    assert len(conditions) == 2
    assert any("metric_family = 'temporal_delta'" in where for where in conditions)
    assert any("metric_family <> 'temporal_delta'" in where for where in conditions)


# ============================================================ 조건 없는 삭제 금지
def test_every_delete_has_a_where_clause() -> None:
    for step in reset.DELETE_STEPS:
        assert " WHERE " in step.delete_sql(), step.table


def test_every_delete_is_scoped_by_the_analysis_version() -> None:
    """세 표 모두 분석 버전이 직무와 데이터셋을 함께 가리킨다."""
    for step in reset.DELETE_STEPS:
        assert "analysis_version" in step.where, step.table


def test_count_and_delete_share_the_condition() -> None:
    """보여 준 수와 지운 수가 어긋나지 않는다."""
    for step in reset.DELETE_STEPS:
        assert step.where in step.count_sql()
        assert step.where in step.delete_sql()


def test_empty_condition_is_refused() -> None:
    with pytest.raises(ValueError):
        reset.DeleteStep(unit=1, table="statistics_facts", alias="tgt", where="  ")


# ============================================================ 지우지 않는 표
def test_kept_tables_carry_a_reason() -> None:
    kept = dict(reset.KEPT_TABLES)
    assert "verification_results" in kept
    assert "analysis_versions" in kept
    assert all(reason for reason in kept.values())


def test_verification_results_are_not_deleted() -> None:
    assert "verification_results" not in {step.table for step in reset.DELETE_STEPS}


# ============================================================ 막는 참조
def test_blockers_only_when_facts_are_deleted() -> None:
    assert reset.blockers_for((5, 6)) == ()
    blockers = reset.blockers_for(reset.unit_cascade(1))
    assert [blocker.table for blocker in blockers] == ["analysis_claim_evidence"]


def test_blocker_query_is_scoped() -> None:
    for blocker in reset.blockers_for(reset.unit_cascade(1)):
        assert "WHERE" in blocker.sql
        assert "job_role_id" in blocker.sql


# ============================================================ 확인 문자열
def test_confirmation_needs_the_dataset_version() -> None:
    assert reset.confirmation_matches(DATASET_VERSION, DATASET_VERSION)
    assert reset.confirmation_matches(f"  {DATASET_VERSION} ", DATASET_VERSION)
    assert not reset.confirmation_matches("y", DATASET_VERSION)
    assert not reset.confirmation_matches("", DATASET_VERSION)
    assert not reset.confirmation_matches(DATASET_VERSION.upper(), DATASET_VERSION)


def test_bad_unit_stops_before_the_repository() -> None:
    assert reset.main(["--unit", "9"]) == reset.EXIT_ABORTED


def test_total_rows_sums_the_counts() -> None:
    counts = [(step, 3) for step in reset.DELETE_STEPS]
    assert reset.total_rows(counts) == 3 * len(reset.DELETE_STEPS)
