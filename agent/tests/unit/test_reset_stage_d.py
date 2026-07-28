"""Stage D 되돌리기 스크립트의 순수 함수 검증.

`scripts/reset_stage_d.py` 는 패키지가 아니라 실행 스크립트라 `pytest` 가 수집하지
않는다. 여기서는 파일 경로로 불러와 순수 함수만 검사한다. 저장소에 붙지 않고 한
줄도 지우지 않는다.

검사 대상은 넷이다. Phase 되돌림 범위 전개, 지우는 차례와 범위 조건, 지우지 않는
표, 확인 문자열 판정이다. 이 스크립트는 잘못 돌면 실데이터가 사라지므로 조건 없는
삭제가 하나도 없다는 사실을 테스트로 고정한다.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "reset_stage_d.py"

DATASET_VERSION = "ds_backend_2026_07"


def _load() -> ModuleType:
    """스크립트를 모듈로 불러온다.

    `pyproject.toml` 을 고치지 않는다. `scripts/` 를 테스트 경로에 넣으면 다른
    스크립트도 함께 수집되고, 그 스크립트들은 실행되면 저장소에 붙는다.
    """
    spec = importlib.util.spec_from_file_location("reset_stage_d", SCRIPT)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


reset = _load()


def _tables(steps: tuple[object, ...]) -> list[str]:
    return [step.table for step in steps]  # type: ignore[attr-defined]


PROTECTED_TABLES = (
    "sources",
    "source_snapshots",
    "source_observations",
    "source_assessments",
    "postings",
    "posting_versions",
    "source_chunks",
    "chunk_embeddings",
    "companies",
    "standards",
    "job_roles",
    "dataset_versions",
    "requirement_taxonomies",
    "agent_runs",
    "agent_run_steps",
    "tool_calls",
    "analysis_versions",
)
"""이 스크립트가 지우면 안 되는 표.

Stage B·C 의 산출물은 다시 모으는 데 큰 비용이 든다. 계측 표는 추가 전용이며
실행 기록은 산출물을 지워도 남는다.
"""

FOREIGN_KEYS = (
    ("knowledge_edges", "knowledge_nodes"),
    ("graph_paths", "requirement_taxonomy_versions"),
    ("knowledge_edges", "requirement_taxonomy_versions"),
    ("knowledge_nodes", "requirement_taxonomy_versions"),
    ("posting_requirement_assignments", "requirement_mentions"),
    ("posting_requirement_assignments", "requirement_taxonomy_versions"),
    ("posting_requirement_assignments", "requirement_dimensions"),
    ("requirement_candidate_decisions", "requirement_candidates"),
    ("requirement_candidate_decisions", "requirement_taxonomy_versions"),
    ("requirement_candidate_mentions", "requirement_candidates"),
    ("requirement_candidate_mentions", "requirement_mentions"),
    ("requirement_candidates", "requirement_dimensions"),
    ("requirement_candidates", "requirement_taxonomy_versions"),
    ("requirement_aliases", "requirement_dimensions"),
    ("requirement_aliases", "requirement_taxonomy_versions"),
    ("requirement_dimension_relations", "requirement_dimensions"),
    ("requirement_dimension_relations", "requirement_taxonomy_versions"),
    ("requirement_dimension_versions", "requirement_dimensions"),
    ("requirement_dimension_versions", "requirement_taxonomy_versions"),
)
"""되돌리는 표 사이의 외래키. `(참조하는 쪽, 참조되는 쪽)` 이다.

정의는 `migrations/sql/0001_initial_schema.sql` 과 docs/erd.md 7장·8장이다.
전부 `ON DELETE RESTRICT` 이므로 참조하는 쪽을 먼저 지워야 한다.
"""


# ================================================================ 범위 전개
def test_기본은_Phase_8부터_12까지_되돌린다() -> None:
    assert reset.phase_cascade(8) == (8, 9, 10, 11, 12)


def test_되돌림은_뒤_Phase_로_번진다() -> None:
    """Phase 9 를 되돌리면 그 위에 쌓인 10·11·12 도 무효다."""
    assert reset.phase_cascade(9) == (9, 10, 11, 12)
    assert reset.phase_cascade(11) == (11, 12)


def test_마지막_Phase_만_되돌릴_수_있다() -> None:
    assert reset.phase_cascade(12) == (12,)


def test_범위_밖의_Phase_를_거부한다() -> None:
    with pytest.raises(ValueError):
        reset.phase_cascade(7)
    with pytest.raises(ValueError):
        reset.phase_cascade(13)


# ================================================================ 지우는 차례
def test_고른_Phase_의_표만_지운다() -> None:
    assert _tables(reset.steps_for((12,))) == [
        "graph_paths",
        "knowledge_edges",
        "knowledge_nodes",
    ]


def test_Phase_11_을_되돌리면_할당과_그래프를_함께_지운다() -> None:
    tables = _tables(reset.steps_for(reset.phase_cascade(11)))
    assert "posting_requirement_assignments" in tables
    assert "graph_paths" in tables
    assert "requirement_mentions" not in tables


def test_전체_되돌림은_열세_표를_지운다() -> None:
    assert len(reset.steps_for(reset.phase_cascade(8))) == 13


def test_참조하는_표를_먼저_지운다() -> None:
    """외래키가 전부 `ON DELETE RESTRICT` 라 차례가 뒤집히면 삭제가 실패한다."""
    order = _tables(reset.DELETE_STEPS)
    for child, parent in FOREIGN_KEYS:
        assert order.index(child) < order.index(parent), f"{child} 가 {parent} 보다 뒤다"


def test_요구_표현을_맨_뒤에_지운다() -> None:
    assert _tables(reset.DELETE_STEPS)[-1] == "requirement_mentions"


def test_일부만_되돌려도_차례가_유지된다() -> None:
    partial = _tables(reset.steps_for((9, 10, 11, 12)))
    full = _tables(reset.steps_for(reset.phase_cascade(8)))
    assert partial == [table for table in full if table in set(partial)]


# ================================================================ 범위 조건
def test_조건_없는_삭제가_하나도_없다() -> None:
    """`WHERE` 없는 `DELETE` 는 표를 통째로 비운다. 하나도 없어야 한다."""
    for step in reset.DELETE_STEPS:
        sql = step.delete_sql()
        assert " WHERE " in sql
        head, condition = sql.split(" WHERE ", 1)
        assert condition.strip()
        assert "WHERE" not in head


def test_세는_문장과_지우는_문장이_같은_조건을_쓴다() -> None:
    """미리 보여 준 수와 실제로 지운 수가 어긋나지 않게 한다."""
    for step in reset.DELETE_STEPS:
        counted = step.count_sql().split(" WHERE ", 1)[1]
        deleted = step.delete_sql().split(" WHERE ", 1)[1]
        assert counted == deleted


def test_조건이_비면_단계를_만들지_못한다() -> None:
    with pytest.raises(ValueError):
        reset.DeleteStep(phase=8, table="requirement_mentions", alias="tgt", where="  ")


def test_모든_조건이_데이터셋이나_분류체계로_좁힌다() -> None:
    """범위를 좁히지 못하는 조건을 두지 않는다."""
    for step in reset.DELETE_STEPS:
        condition = step.delete_sql().split(" WHERE ", 1)[1]
        assert any(
            key in condition
            for key in (
                "%(dataset_version)s",
                "%(taxonomy_id)s",
                "%(job_role_id)s",
                "%(ontology_version)s",
            )
        ), f"{step.table} 의 조건이 범위를 좁히지 않는다"


def test_바깥_별칭이_안쪽_조회와_겹치지_않는다() -> None:
    """겹치면 안쪽 별칭이 이겨 조건이 다른 표를 가리킬 수 있다."""
    for step in reset.DELETE_STEPS:
        assert step.alias == "tgt"
        assert f"AS {step.alias}" not in step.where


# ================================================================ 지우지 않는 표
def test_보호할_표를_건드리지_않는다() -> None:
    """조회로 지나가는 것과 지우는 것을 구분한다. `DELETE` 의 대상만 본다."""
    targets = set(_tables(reset.DELETE_STEPS))
    for table in PROTECTED_TABLES:
        assert table not in targets


def test_실행_기록을_남기는_이유를_적어_둔다() -> None:
    kept = dict(reset.KEPT_TABLES)
    assert set(kept) == {
        "agent_runs",
        "agent_run_steps",
        "tool_calls",
        "analysis_versions",
    }
    assert all(reason for reason in kept.values())


# ================================================================ 분류체계 되살리기
def test_첫_버전만_남기고_뒤_버전을_지운다() -> None:
    condition = reset.DOOMED_TAXONOMY_VERSIONS
    assert "version_number > (" in condition
    assert "min(v.version_number)" in condition


def test_남은_첫_버전을_다시_활성으로_되돌린다() -> None:
    """`superseded_at` 을 되돌리지 않으면 활성 분류체계가 사라진다."""
    assert "superseded_at = NULL" in reset.RESTORE_SQL
    assert "min(v.version_number)" in reset.RESTORE_SQL
    assert "%(taxonomy_id)s" in reset.RESTORE_SQL


def test_되살릴_행도_미리_센다() -> None:
    counted = reset.RESTORE_COUNT_SQL.split(" WHERE ", 1)[1]
    updated = reset.RESTORE_SQL.split(" WHERE ", 1)[1]
    assert counted == updated


# ================================================================ 막는 참조
def test_Phase_12_만_되돌리면_분류체계_참조를_보지_않는다() -> None:
    tables = {blocker.table for blocker in reset.blockers_for((12,))}
    assert tables == {"knowledge_edges"}


def test_Phase_10_을_되돌리면_차원과_버전_참조를_본다() -> None:
    blockers = reset.blockers_for(reset.phase_cascade(10))
    pairs = {(blocker.table, blocker.column) for blocker in blockers}
    assert ("analysis_versions", "taxonomy_version_id") in pairs
    assert ("statistics_facts", "dimension_id") in pairs
    assert ("requirement_candidates", "nearest_dimension_id") in pairs


def test_함께_지울_후보는_막는_참조에서_뺀다() -> None:
    """Phase 9 를 함께 되돌리면 그 후보도 사라지므로 삭제를 막지 않는다."""
    with_nine = reset.blockers_for(reset.phase_cascade(9))
    without_nine = reset.blockers_for((10, 11, 12))
    candidate = next(
        b for b in with_nine if b.table == "requirement_candidates"
    )
    survivor = next(
        b for b in without_nine if b.table == "requirement_candidates"
    )
    assert "candidate_id NOT IN" in candidate.sql
    assert "candidate_id NOT IN" not in survivor.sql


# ================================================================ 확인 문자열
def test_데이터셋_버전을_그대로_쳐야_지운다() -> None:
    assert reset.confirmation_matches(DATASET_VERSION, DATASET_VERSION)


def test_한_글자_동의로는_지워지지_않는다() -> None:
    for typed in ("y", "Y", "yes", "예", ""):
        assert not reset.confirmation_matches(typed, DATASET_VERSION)


def test_앞뒤_공백만_걷어낸다() -> None:
    assert reset.confirmation_matches(f"  {DATASET_VERSION}\n", DATASET_VERSION)


def test_대소문자와_오타를_구분한다() -> None:
    assert not reset.confirmation_matches(DATASET_VERSION.upper(), DATASET_VERSION)
    assert not reset.confirmation_matches("ds_backend_2026_08", DATASET_VERSION)


def test_다른_데이터셋의_이름으로는_지워지지_않는다() -> None:
    assert not reset.confirmation_matches("ds_frontend_2026_07", DATASET_VERSION)


# ================================================================ 합계
def test_표별_행_수를_더한다() -> None:
    steps = reset.steps_for((12,))
    assert reset.total_rows(tuple(zip(steps, (368, 3723, 3834), strict=True))) == 7925


def test_지울_것이_없으면_합계도_0_이다() -> None:
    assert reset.total_rows(()) == 0
