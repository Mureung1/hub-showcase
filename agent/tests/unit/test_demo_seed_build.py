"""데모 시드 빌더와 적재기의 순수 함수 검증 (갈래 B17).

`scripts/build_demo_seed.py` 와 `scripts/load_demo_seed.py` 는 패키지가 아니라 실행
스크립트라 `pytest` 가 수집하지 않는다. 여기서는 파일 경로로 불러와 순수 함수만
검사한다. 저장소에 붙지 않고 한 줄도 쓰거나 지우지 않는다.

고정하는 사실은 넷이다. 조각을 합치는 차례, 기본키 중복을 놓치지 않는다는 것,
실 데이터 표를 쓰지도 지우지도 않는다는 것, 조건 없는 DELETE 가 없다는 것이다.
잘못 돌면 실데이터가 사라지는 스크립트이므로 마지막 둘을 테스트로 못 박는다.
"""

from __future__ import annotations

import csv
import importlib.util
import re
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

AGENT_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = AGENT_ROOT / "scripts"


def _load(name: str) -> ModuleType:
    """스크립트를 모듈로 불러온다."""
    if str(AGENT_ROOT) not in sys.path:
        sys.path.insert(0, str(AGENT_ROOT))
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


build_seed = _load("build_demo_seed")
load_seed = _load("load_demo_seed")

from scripts.demo_seed._csv import LOAD_ORDER, TABLE_COLUMNS  # noqa: E402


# ============================================================ 조각 목록
def test_part_order_covers_nine_jobs_and_user_postings() -> None:
    """CONTRACT 2장의 아홉 직무와 A10 조각을 모두 부른다."""
    assert len(build_seed.JOB_PARTS) == 9
    assert build_seed.PART_ORDER == (*build_seed.JOB_PARTS, "user_postings")
    assert set(build_seed.JOB_PARTS) == {
        "backend", "frontend", "ai_engineer", "data_engineer", "fullstack",
        "devops", "mobile", "security", "game_client",
    }


def test_every_contract_table_has_a_primary_key() -> None:
    """계약의 45개 표 전부에 기본키를 적어 두었다."""
    assert build_seed.missing_primary_keys() == ()
    assert set(build_seed.PRIMARY_KEYS) == set(LOAD_ORDER)


def test_primary_key_columns_exist_in_the_contract_column_list() -> None:
    """기본키 컬럼이 계약의 컬럼 순서 안에 있다."""
    for table, key in build_seed.PRIMARY_KEYS.items():
        assert key, f"{table}: 기본키가 비었다"
        assert set(key) <= set(TABLE_COLUMNS[table]), table


def test_selected_parts_keeps_contract_order() -> None:
    """`--parts` 를 어떤 차례로 줘도 합치는 차례는 계약 순서다."""
    assert build_seed.selected_parts("frontend,backend") == ["backend", "frontend"]
    assert build_seed.selected_parts("") == list(build_seed.PART_ORDER)
    with pytest.raises(SystemExit):
        build_seed.selected_parts("nosuchjob")


# ============================================================ 합치기
def _part(rows: dict[str, list[dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    return rows


def test_merge_follows_load_order_and_part_order() -> None:
    """바깥은 적재 순서, 안쪽은 조각 순서다."""
    parts = {
        "frontend": _part({"capabilities": [{"capability_id": "cap_frontend_a"}]}),
        "backend": _part(
            {
                "capabilities": [{"capability_id": "cap_backend_a"}],
                "dataset_versions": [{"dataset_version": "ds_demo_v1"}],
            }
        ),
    }
    merged = build_seed.merge_parts(parts, ("backend", "frontend"))
    assert list(merged) == ["dataset_versions", "capabilities"]
    assert [row["capability_id"] for row in merged["capabilities"]] == [
        "cap_backend_a",
        "cap_frontend_a",
    ]


def test_merge_drops_empty_tables() -> None:
    """행이 없는 표는 결과에 담지 않는다. 빈 CSV 를 만들지 않는다."""
    merged = build_seed.merge_parts({"backend": _part({"capabilities": []})}, ("backend",))
    assert merged == {}


# ============================================================ 중복 검사
def test_duplicate_primary_key_names_both_parts() -> None:
    """중복이 있으면 어느 조각끼리 겹쳤는지를 밝힌다."""
    parts = {
        "backend": _part({"dataset_versions": [{"dataset_version": "ds_demo_v1"}]}),
        "frontend": _part({"dataset_versions": [{"dataset_version": "ds_demo_v1"}]}),
    }
    problems = build_seed.find_duplicates(parts, ("backend", "frontend"))
    assert len(problems) == 1
    assert "dataset_versions" in problems[0]
    assert "backend" in problems[0] and "frontend" in problems[0]


def test_duplicate_check_uses_composite_keys() -> None:
    """복합 기본키는 컬럼 하나가 같다고 중복으로 보지 않는다."""
    parts = {
        "backend": _part(
            {"roadmap_item_fills": [{"roadmap_item_id": "ri_a", "concept_id": "cc_1"}]}
        ),
        "frontend": _part(
            {"roadmap_item_fills": [{"roadmap_item_id": "ri_a", "concept_id": "cc_2"}]}
        ),
    }
    assert build_seed.find_duplicates(parts, ("backend", "frontend")) == []


def test_no_duplicate_within_a_single_part_is_ignored() -> None:
    """한 조각 안의 중복도 잡는다. 조각 이름이 두 번 나온다."""
    parts = {
        "backend": _part(
            {"capabilities": [{"capability_id": "cap_x"}, {"capability_id": "cap_x"}]}
        ),
    }
    problems = build_seed.find_duplicates(parts, ("backend",))
    assert len(problems) == 1
    assert problems[0].count("backend") == 2


# ============================================================ 보호 목록
def test_protected_tables_are_never_written_or_deleted() -> None:
    """실 데이터 표는 적재 순서에도 삭제 순서에도 없다."""
    assert load_seed.PROTECTED_TABLES & set(LOAD_ORDER) == set()
    assert load_seed.PROTECTED_TABLES & set(load_seed.DELETE_ORDER) == set()
    load_seed.assert_protected_untouched()


def test_protected_list_matches_the_contract() -> None:
    """CONTRACT 9.3 이 마이그레이션 소유로 정한 표를 전부 담는다."""
    assert load_seed.PROTECTED_TABLES >= {
        "job_roles", "companies", "company_clusters", "company_cluster_memberships",
        "periods", "metric_templates", "metric_template_parameters",
        "metric_policy_versions", "ontology_versions", "standards",
    }


@pytest.mark.parametrize("table", sorted(load_seed.PROTECTED_TABLES))
def test_protected_tables_refuse_copy_and_delete(table: str) -> None:
    """보호 표로 문장을 만들려 하면 코드가 거부한다."""
    with pytest.raises(RuntimeError):
        load_seed.copy_statement(table)
    with pytest.raises(RuntimeError):
        load_seed.delete_statement(table)


# ============================================================ COPY 문
@pytest.mark.parametrize("table", LOAD_ORDER)
def test_copy_statement_shape(table: str) -> None:
    """표마다 COPY 를 한 번씩 쓴다. 형식과 NULL 표기가 계약과 같다."""
    statement = load_seed.copy_statement(table)
    assert statement.startswith(f"COPY {table} (")
    assert "FROM STDIN" in statement
    assert "FORMAT csv" in statement
    assert "HEADER true" in statement
    assert r"NULL '\N'" in statement
    assert ", ".join(TABLE_COLUMNS[table]) in statement
    assert "INSERT" not in statement


# ============================================================ 삭제
def test_delete_order_is_the_reverse_of_load_order() -> None:
    """적재의 역순으로 지운다. 자식이 먼저다."""
    assert load_seed.DELETE_ORDER == tuple(reversed(LOAD_ORDER))


def test_every_table_has_a_delete_predicate() -> None:
    assert load_seed.missing_delete_predicates() == ()
    assert set(load_seed.DELETE_PREDICATES) == set(LOAD_ORDER)


@pytest.mark.parametrize("table", LOAD_ORDER)
def test_no_unconditional_delete(table: str) -> None:
    """조건 없는 DELETE 가 하나도 없다. 모든 조건이 두 표시로 되짚어진다."""
    statement = load_seed.delete_statement(table)
    assert statement.startswith(f"DELETE FROM {table} WHERE ")
    predicate = statement.split(" WHERE ", 1)[1].strip()
    assert predicate
    anchored = (
        "%(ds)s" in predicate
        or "%(an)s" in predicate
        or "FROM demo_" in predicate
    )
    assert anchored, f"{table}: 생성 데이터 표시로 좁히지 않는다"


def test_scope_temp_tables_are_defined_before_use() -> None:
    """임시 표가 다른 임시 표를 참조하면 그 표가 먼저 만들어진다."""
    known = {name for name, _ in load_seed.SCOPE_TEMP_TABLES}
    made: set[str] = set()
    for name, query in load_seed.SCOPE_TEMP_TABLES:
        for referenced in re.findall(r"FROM\s+(demo_\w+)", query):
            assert referenced in known, f"{name}: 모르는 임시 표 {referenced}"
            assert referenced in made, f"{name} 가 {referenced} 보다 먼저 만들어진다"
        made.add(name)


def test_delete_predicates_only_reference_known_temp_tables() -> None:
    """삭제 조건이 부르는 임시 표는 전부 범위 수집 단계가 만든다."""
    known = {name for name, _ in load_seed.SCOPE_TEMP_TABLES}
    for table, predicate in load_seed.DELETE_PREDICATES.items():
        for token in predicate.split():
            if token.startswith("demo_"):
                assert token.rstrip(")") in known, f"{table}: 모르는 임시 표 {token}"


def test_trigger_guarded_tables_cover_the_append_only_ones() -> None:
    """추가 전용 트리거가 걸린 표를 빠짐없이 내렸다가 올린다."""
    assert {"source_snapshots", "source_observations"} <= set(load_seed.TRIGGER_GUARDED_TABLES)
    assert "agent_runs" in load_seed.TRIGGER_GUARDED_TABLES


# ============================================================ CSV 검증
def test_validate_header_rejects_reordered_columns() -> None:
    columns = list(TABLE_COLUMNS["capabilities"])
    assert load_seed.validate_header("capabilities", columns) == []
    swapped = [columns[1], columns[0], *columns[2:]]
    assert load_seed.validate_header("capabilities", swapped)


def test_validate_file_counts_rows_and_catches_short_rows(tmp_path: Path) -> None:
    path = tmp_path / "capabilities.csv"
    columns = list(TABLE_COLUMNS["capabilities"])
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(columns)
        writer.writerow(["cap_backend_a", "backend", "라벨", "정의", "true"])
    rows, problems = load_seed.validate_file("capabilities", path)
    assert (rows, problems) == (1, [])

    with path.open("a", encoding="utf-8", newline="") as handle:
        handle.write("cap_backend_b,backend\n")
    rows, problems = load_seed.validate_file("capabilities", path)
    assert rows == 2
    assert problems and "칸 수" in problems[0]


def test_dry_run_reports_missing_directory(tmp_path: Path) -> None:
    """CSV 가 없으면 접속하지 않고 무엇을 먼저 돌려야 하는지 알린다."""
    counts, problems = load_seed.validate_all(tmp_path)
    assert counts == {}
    assert problems and "build_demo_seed.py" in problems[0]


# ============================================================ 실제 산출물
BUILT = [table for table in LOAD_ORDER if (AGENT_ROOT / "data" / "demo_seed" / f"{table}.csv").exists()]


@pytest.mark.skipif(not BUILT, reason="아직 build_demo_seed.py 를 돌리지 않았다")
def test_built_csv_files_pass_validation() -> None:
    """만들어 둔 CSV 가 계약의 헤더와 칸 수를 지킨다."""
    _, problems = load_seed.validate_all(AGENT_ROOT / "data" / "demo_seed")
    assert problems == []
