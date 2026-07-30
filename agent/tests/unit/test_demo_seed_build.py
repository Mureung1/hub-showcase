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
import importlib
import importlib.util
import json
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


# ============================================================ 히트맵 등급
@pytest.mark.parametrize("job", build_seed.JOB_PARTS)
@pytest.mark.parametrize(
    ("value", "expected"),
    ((None, "—"), (0, "약"), (20, "약"), (21, "중"), (99, "중"), (100, "강")),
)
def test_cluster_axis_level_boundaries(job: str, value: int | None, expected: str) -> None:
    """결측값과 약·중·강의 경계를 모든 직무 생성기가 같은 방식으로 분류한다."""
    module = importlib.import_module(f"scripts.demo_seed.{job}")
    assert module.axis_level(value) == expected


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


# ============================================================ 적재 차례와 외래키
#
# `source_assessments.assessed_by_run_id` 가 `agent_runs` 를 참조하는데 적재 차례가
# 그 반대였던 적이 있다. COPY 는 한 표를 통째로 넣으므로 참조 대상 표가 먼저 와야 한다.
# 차례를 눈으로 정하면 같은 실수가 다시 난다. 마이그레이션의 외래키에서 계산한다.

MIGRATION_SQL = AGENT_ROOT / "migrations" / "sql"
_CREATE_TABLE = re.compile(
    r"CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\((.*?)\n\);", re.S
)
_REFERENCES = re.compile(r"REFERENCES\s+(\w+)")


def foreign_keys() -> dict[str, set[str]]:
    """마이그레이션의 `CREATE TABLE` 에서 표별 참조 대상을 읽는다."""
    statements = "\n".join(
        path.read_text(encoding="utf-8") for path in sorted(MIGRATION_SQL.glob("*.sql"))
    )
    found: dict[str, set[str]] = {}
    for match in _CREATE_TABLE.finditer(statements):
        table, body = match.group(1), match.group(2)
        found.setdefault(table, set()).update(
            reference.group(1) for reference in _REFERENCES.finditer(body)
        )
    return found


def test_every_seeded_table_is_defined_by_a_migration() -> None:
    """시드가 쓰는 표는 전부 마이그레이션이 만든다."""
    defined = set(foreign_keys())
    # user_postings 는 0026 이 만들며 외래키가 없다. 정의 자체는 있어야 한다.
    missing = [table for table in LOAD_ORDER if table not in defined]
    assert missing == ["user_postings"] or missing == []


def test_load_order_puts_referenced_tables_first() -> None:
    """참조 대상 표가 참조하는 표보다 먼저 온다."""
    references = foreign_keys()
    seeded = set(LOAD_ORDER)
    position = {table: index for index, table in enumerate(LOAD_ORDER)}
    violations = [
        (table, target)
        for table in LOAD_ORDER
        for target in references.get(table, ())
        if target in seeded and target != table and position[target] > position[table]
    ]
    assert violations == []


def test_delete_order_is_the_reverse_of_load_order() -> None:
    """되돌리기는 적재의 역순이다. 자식 표를 먼저 지운다."""
    assert load_seed.DELETE_ORDER == tuple(reversed(LOAD_ORDER))


# ============================================================ 그래프 식별자 정규화
#
# 조각은 `nd_demo_<job>_0001` 처럼 손으로 지은 id 를 쓴다. 정본은
# `careersignal.graph.identifiers` 이고 `knowledge_nodes` 의 유일 제약이 곧 그
# 재료다(docs/erd.md 8.2). 아래 검사는 저장소에 붙지 않고 손수 만든 작은 표로만
# 대응·중복 제거·배열 리터럴 치환·검사 실패를 못 박는다.

from careersignal.graph.identifiers import edge_identifier, node_identifier  # noqa: E402


def _node(node_id: str, ref_id: str, node_type: str = "CompanyCluster") -> dict[str, Any]:
    """유일 제약 컬럼이 같고 id 만 다른 노드 행."""
    return {
        "node_id": node_id,
        "graph_layer": "semantic",
        "node_type": node_type,
        "ref_table": "company_clusters",
        "ref_id": ref_id,
        "label": f"라벨 {ref_id}",
        "ontology_version": "v1",
        "dataset_version": "ds_demo_v1",
        "taxonomy_version_id": "tx_demo_backend",
        "analysis_version": "an_demo_backend",
    }


def _edge(edge_id: str, src: str, dst: str, **overrides: Any) -> dict[str, Any]:
    row = {
        "edge_id": edge_id,
        "graph_layer": "semantic",
        "edge_type": "BELONGS_TO_CLUSTER",
        "src_node_id": src,
        "dst_node_id": dst,
        "ontology_version": "v1",
        "taxonomy_version_id": None,
        "analysis_version": "an_demo_backend",
    }
    row.update(overrides)
    return row


def _path(path_id: str, nodes: list[str], edges: list[str]) -> dict[str, Any]:
    return {
        "path_id": path_id,
        "path_type": "posting_requirement_capability",
        "node_sequence": nodes,
        "edge_sequence": edges,
        "taxonomy_version_id": "tx_demo_backend",
        "knowledge_version": "kn_demo_backend",
        "analysis_version": "an_demo_backend",
        "graph_policy_version": "gp_v1",
        "computed_at": "2026-07-27T09:00:00+09:00",
    }


def test_normalize_nodes_uses_the_canonical_identifier() -> None:
    """새 id 는 유일 제약 다섯 컬럼으로 계산한 정본 값이다."""
    rows, mapping = build_seed.normalize_nodes([_node("nd_demo_backend_0002", "startup")])
    expected = node_identifier("semantic", "CompanyCluster", "company_clusters", "startup", "v1")
    assert rows[0]["node_id"] == expected
    assert mapping == {"nd_demo_backend_0002": expected}
    assert expected.startswith("node_")


def test_normalize_nodes_folds_the_same_natural_key_into_one_row() -> None:
    """같은 참조 노드를 두 조각이 따로 만들어도 첫 행만 남는다."""
    rows, mapping = build_seed.normalize_nodes(
        [
            _node("nd_demo_backend_0002", "startup"),
            _node("nd_demo_frontend_0007", "startup"),
            _node("nd_demo_backend_0003", "bigtech_platform"),
        ]
    )
    assert len(rows) == 2
    assert rows[0]["label"] == "라벨 startup"
    assert mapping["nd_demo_backend_0002"] == mapping["nd_demo_frontend_0007"]
    assert mapping["nd_demo_backend_0003"] != mapping["nd_demo_backend_0002"]


def test_normalize_nodes_does_not_touch_the_input_rows() -> None:
    """순수 함수다. 조각이 준 행을 고치지 않는다."""
    original = _node("nd_demo_backend_0002", "startup")
    build_seed.normalize_nodes([original])
    assert original["node_id"] == "nd_demo_backend_0002"


def test_normalize_edges_remaps_endpoints_and_recomputes_the_identifier() -> None:
    """두 끝점을 새 id 로 바꾼 뒤 정본 함수로 edge_id 를 다시 계산한다."""
    node_map = {"nd_a": "node_aaa", "nd_b": "node_bbb"}
    rows, mapping = build_seed.normalize_edges([_edge("edge_demo_1", "nd_a", "nd_b")], node_map)
    expected = edge_identifier("semantic", "BELONGS_TO_CLUSTER", "node_aaa", "node_bbb", "v1", None)
    assert rows[0]["src_node_id"] == "node_aaa"
    assert rows[0]["dst_node_id"] == "node_bbb"
    assert rows[0]["edge_id"] == expected == mapping["edge_demo_1"]


def test_normalize_edges_folds_edges_that_became_the_same() -> None:
    """노드를 합치면 뜻이 같아진 엣지가 하나로 접히고 대응표가 남는다."""
    node_map = {"nd_a": "node_aaa", "nd_a2": "node_aaa", "nd_b": "node_bbb"}
    rows, mapping = build_seed.normalize_edges(
        [_edge("edge_demo_1", "nd_a", "nd_b"), _edge("edge_demo_2", "nd_a2", "nd_b")],
        node_map,
    )
    assert len(rows) == 1
    assert mapping["edge_demo_1"] == mapping["edge_demo_2"] == rows[0]["edge_id"]


def test_normalize_edges_treats_empty_taxonomy_as_none() -> None:
    """분류체계 버전이 비면 그대로 `None` 을 넘긴다."""
    node_map = {"nd_a": "node_aaa", "nd_b": "node_bbb"}
    rows, _ = build_seed.normalize_edges(
        [_edge("edge_demo_1", "nd_a", "nd_b", taxonomy_version_id="")], node_map
    )
    assert rows[0]["edge_id"] == edge_identifier(
        "semantic", "BELONGS_TO_CLUSTER", "node_aaa", "node_bbb", "v1", None
    )


def test_parse_array_literal_reverses_the_csv_writer() -> None:
    """`_csv.array_literal` 이 쓴 리터럴을 원소로 되돌린다."""
    from scripts.demo_seed._csv import array_literal

    values = ["node_a", "따옴표 \" 있는 값", "쉼표,값", ""]
    assert build_seed.parse_array_literal(array_literal(values)) == values
    assert build_seed.parse_array_literal("{}") == []
    assert build_seed.parse_array_literal(["node_a", "node_b"]) == ["node_a", "node_b"]
    with pytest.raises(ValueError):
        build_seed.parse_array_literal("node_a,node_b")


def test_remap_sequence_replaces_elements_inside_the_literal() -> None:
    """배열 리터럴은 통째가 아니라 원소 단위로 바뀐다."""
    assert build_seed.remap_sequence("{nd_a,nd_b}", {"nd_a": "node_aaa"}) == "{node_aaa,nd_b}"
    assert build_seed.remap_sequence(["nd_a"], {"nd_a": "node_aaa"}) == "{node_aaa}"


def test_normalize_paths_remaps_both_sequences_and_folds_duplicates() -> None:
    """대응 뒤 같아진 경로는 첫 행만 남고 길이 규칙이 유지된다."""
    node_map = {"nd_a": "node_aaa", "nd_a2": "node_aaa", "nd_b": "node_bbb"}
    edge_map = {"ed_1": "edge_111", "ed_2": "edge_111"}
    rows = build_seed.normalize_paths(
        [_path("gp_1", ["nd_a", "nd_b"], ["ed_1"]), _path("gp_2", ["nd_a2", "nd_b"], ["ed_2"])],
        node_map,
        edge_map,
    )
    assert len(rows) == 1
    assert rows[0]["path_id"] == "gp_1"
    assert rows[0]["node_sequence"] == "{node_aaa,node_bbb}"
    assert rows[0]["edge_sequence"] == "{edge_111}"
    assert (
        len(build_seed.parse_array_literal(rows[0]["edge_sequence"]))
        == len(build_seed.parse_array_literal(rows[0]["node_sequence"])) - 1
    )


def _tiny_graph() -> dict[str, list[dict[str, Any]]]:
    """두 조각이 같은 참조 노드를 따로 만든 최소 표 묶음."""
    return {
        "knowledge_nodes": [
            _node("nd_demo_backend_0001", "startup"),
            _node("nd_demo_backend_0002", "dp_backend_01", node_type="Posting"),
            _node("nd_demo_frontend_0001", "startup"),
            _node("nd_demo_frontend_0002", "dp_frontend_01", node_type="Posting"),
        ],
        "knowledge_edges": [
            _edge("edge_demo_b1", "nd_demo_backend_0002", "nd_demo_backend_0001"),
            _edge("edge_demo_f1", "nd_demo_frontend_0002", "nd_demo_frontend_0001"),
        ],
        "graph_paths": [
            _path("gp_1", ["nd_demo_backend_0002", "nd_demo_backend_0001"], ["edge_demo_b1"]),
        ],
    }


def test_normalize_graph_identifiers_reports_no_problem_on_a_clean_set() -> None:
    """정규화가 끝나면 자연키 중복도 매달린 끝점도 없다."""
    merged, problems = build_seed.normalize_graph_identifiers(_tiny_graph())
    assert problems == []
    assert len(merged["knowledge_nodes"]) == 3  # startup 노드가 하나로 접힌다
    assert len(merged["knowledge_edges"]) == 2
    node_ids = {row["node_id"] for row in merged["knowledge_nodes"]}
    assert all(node_id.startswith("node_") for node_id in node_ids)
    assert all(row["edge_id"].startswith("edge_") for row in merged["knowledge_edges"])
    assert set(build_seed.parse_array_literal(merged["graph_paths"][0]["node_sequence"])) <= node_ids


def test_normalize_graph_identifiers_fails_when_an_old_id_leaks_elsewhere() -> None:
    """다른 표에 옛 식별자가 남으면 조용히 넘기지 않고 사유를 낸다."""
    merged = _tiny_graph()
    merged["verification_results"] = [
        {"result_id": "vr_1", "target_type": "node", "target_id": "nd_demo_backend_0001"}
    ]
    _, problems = build_seed.normalize_graph_identifiers(merged)
    assert problems
    assert "verification_results" in problems[0]
    assert "nd_demo_backend_0001" in problems[0]


def test_stale_leak_scan_looks_inside_json_and_array_cells() -> None:
    """jsonb·배열 칸 안에 박힌 옛 식별자도 찾는다."""
    merged = {
        "analysis_outputs": [{"output_id": "ao_1", "payload": {"nodes": ["nd_demo_backend_0001"]}}],
    }
    problems = build_seed.stale_identifier_leaks(merged, {"nd_demo_backend_0001": "node_aaa"})
    assert len(problems) == 1
    assert "payload" in problems[0]


def test_check_catches_a_natural_key_duplicate() -> None:
    """자연키가 겹치면 유일 제약 위반이므로 검사가 잡는다."""
    problems = build_seed.check_graph_identifiers(
        {"knowledge_nodes": [_node("node_a", "startup"), _node("node_b", "startup")]}
    )
    assert any("자연키" in line for line in problems)


def test_check_catches_a_dangling_edge_and_path_element() -> None:
    """엣지의 끝점과 경로의 원소가 표에 없으면 검사가 잡는다."""
    problems = build_seed.check_graph_identifiers(
        {
            "knowledge_nodes": [_node("node_a", "startup")],
            "knowledge_edges": [_edge("edge_1", "node_a", "node_missing")],
            "graph_paths": [_path("gp_1", ["node_a", "node_missing"], ["edge_missing"])],
        }
    )
    assert any("knowledge_edges" in line and "node_missing" in line for line in problems)
    assert any("gp_1" in line and "edge_missing" in line for line in problems)


def test_check_catches_a_wrong_sequence_length() -> None:
    """`CHECK (len(edge_sequence) = len(node_sequence) - 1)` 을 여기서 먼저 본다."""
    problems = build_seed.check_graph_identifiers(
        {
            "knowledge_nodes": [_node("node_a", "startup")],
            "graph_paths": [_path("gp_1", ["node_a"], ["edge_1"])],
        }
    )
    assert any("gp_1" in line and "맞지 않는다" in line for line in problems)


def test_check_catches_a_missing_prefix() -> None:
    """모든 식별자가 `node_`·`edge_` 접두사를 갖는다."""
    problems = build_seed.check_graph_identifiers(
        {
            "knowledge_nodes": [_node("nd_demo_backend_0001", "startup")],
            "knowledge_edges": [
                _edge("ke_x", "nd_demo_backend_0001", "nd_demo_backend_0001"),
            ],
        }
    )
    assert any("node_ 접두사가 없다" in line for line in problems)
    assert any("edge_ 접두사가 없다" in line for line in problems)


# ============================================================ 실제 산출물의 자연키
@pytest.mark.skipif(
    not (AGENT_ROOT / "data" / "demo_seed" / "knowledge_nodes.csv").exists(),
    reason="아직 build_demo_seed.py 를 돌리지 않았다",
)
def test_built_knowledge_nodes_have_no_natural_key_duplicate() -> None:
    """만들어 둔 CSV 에 유일 제약을 깨는 조합이 없다."""
    path = AGENT_ROOT / "data" / "demo_seed" / "knowledge_nodes.csv"
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    keys = [tuple(row[column] for column in build_seed.NODE_KEY_COLUMNS) for row in rows]
    assert len(set(keys)) == len(keys)
    assert len({row["node_id"] for row in rows}) == len(rows)
    assert all(row["node_id"].startswith("node_") for row in rows)


# ============================================================ 공고 범위 전략·로드맵 파생
#
# 직무 조각은 전략·로드맵을 overall 1행 + cluster 6행까지만 만든다. 공고 범위는
# 조각을 합치는 자리에서 한 번에 파생한다. 규칙이 아홉 직무 모듈로 흩어지면 직무마다
# 달라지므로, 아래 검사는 파생 규칙이 한 곳에 있고 그 결과가 계약과 맞음을 못 박는다.
# 저장소에 붙지 않고 손수 만든 작은 조각으로만 검사한다.


def _cluster_strategy_payload() -> dict[str, Any]:
    return {
        "job": "demo",
        "scope": {"level": "cluster", "cluster_tag": "핀테크·금융", "posting_id": None},
        "checklist": [
            {"item_id": "cc_demo_api", "title": "API", "kind": "project",
             "reason": "기준선", "required": True, "is_deviation": False, "dev_n": None},
            {"item_id": "cc_demo_tx", "title": "트랜잭션", "kind": "project",
             "reason": "편차 1", "required": True, "is_deviation": True, "dev_n": 1},
            {"item_id": "cc_demo_docs", "title": "문서화", "kind": "study",
             "reason": "기준선", "required": False, "is_deviation": False, "dev_n": None},
        ],
        "agent_version": "1.0.0",
        "source": "stored",
    }


def _cluster_roadmap_payload() -> dict[str, Any]:
    return {
        "job": "demo",
        "scope": {"level": "cluster", "cluster_tag": "핀테크·금융", "posting_id": None},
        "project_steps": [
            {"n": 1, "phase": "STEP 01 · 3주", "weeks": 3, "priority": "vhigh", "title": "API",
             "body": "", "deliverable": "", "tags": [], "reason_title": "왜 이 순서인가요?",
             "reason": "기업군 기준", "fills": [{"item_id": "cc_demo_api", "label": "API", "kind": "normal"}]},
            {"n": 2, "phase": "STEP 02 · 2주", "weeks": 2, "priority": "high", "title": "트랜잭션",
             "body": "", "deliverable": "", "tags": [], "reason_title": "왜 이 순서인가요?",
             "reason": "기업군 기준", "fills": [{"item_id": "cc_demo_tx", "label": "TX", "kind": "dev"}]},
        ],
        "study_tracks": [],
        "check_rows": [
            {"item_id": "cc_demo_api", "title": "API", "kind": "project", "is_deviation": False,
             "dev_n": None, "required": True, "source_step": "STEP 01"},
            {"item_id": "cc_demo_tx", "title": "트랜잭션", "kind": "project", "is_deviation": True,
             "dev_n": 1, "required": True, "source_step": "STEP 02"},
            {"item_id": "cc_demo_docs", "title": "문서화", "kind": "study", "is_deviation": False,
             "dev_n": None, "required": False, "source_step": "병행"},
        ],
        "agent_version": "1.0.0",
        "source": "stored",
    }


def _posting_interpretation() -> dict[str, Any]:
    return {
        "job": "demo",
        "scope": {"level": "posting", "cluster_tag": "핀테크·금융", "posting_id": "dp_demo_01"},
        "baseline": [],
        "deviations": [
            {"item_id": "tx", "topic": "트랜잭션", "evidence": '"정합성" 문장이 있음'},
            {"item_id": "docs", "topic": "문서", "evidence": "문서화 요구가 있음"},
        ],
        "unchanged": [],
        "posting": {"posting_id": "dp_demo_01", "company": "비바리퍼블리카", "title": "백엔드"},
        "agent_version": "1.0.0",
        "source": "stored",
    }


def test_deviation_reason_quotes_the_posting_evidence() -> None:
    """편차 사유는 회사명과 근거 문장으로 다시 쓴다. 안쪽 따옴표는 겹치지 않는다."""
    reason = build_seed.deviation_reason("비바리퍼블리카", '"정합성" 문장')
    assert reason.startswith("비바리퍼블리카 공고는 ")
    assert "'정합성' 문장\"라고 명시합니다." in reason
    assert "기업군 기준보다 앞당겨 준비합니다." in reason
    assert reason.count('"') == 2


def test_content_quality_rejects_empty_posting_sections_and_particle_gaps() -> None:
    """요약·세 해석 유형 누락과 따옴표 뒤 조사 공백을 생성 단계에서 막는다."""
    payload = _posting_interpretation()
    payload["posting"].update(
        {
            "summary": {"title": "", "body": ""},
            "baseline_notes": [],
            "interpretations": [],
            "signal_notes": [],
            "unchanged_note": '"API" 를 요구합니다.',
        }
    )
    tables = {
        "analysis_outputs": [
            {
                "output_id": "out_demo_intp",
                "output_type": "interpretation",
                "scope_level": "posting",
                "payload": payload,
            }
        ]
    }
    problems = build_seed.check_content_quality("demo", tables)
    assert any("summary" in problem for problem in problems)
    assert any("baseline_notes" in problem for problem in problems)
    assert any("interpretations" in problem for problem in problems)
    assert any("signal_notes" in problem for problem in problems)
    assert any("조사 앞" in problem for problem in problems)


def test_fill_matches_the_same_steps_deliverable() -> None:
    """채워짐 라벨의 구체 역량은 같은 단계 산출물에서 확인할 수 있어야 한다."""
    step = {
        "title": "API 프로젝트",
        "body": "예외 응답을 설계합니다.",
        "deliverable": "README에 테스트 결과와 API 명세를 기록합니다.",
    }
    assert build_seed._fill_matches_step({"label": "테스트 작성 습관"}, step)
    assert not build_seed._fill_matches_step({"label": "협업 문제 해결 서사"}, step)


def test_align_roadmap_fills_updates_payload_and_normalized_row() -> None:
    """기업군 편차 항목은 단계 과제와 정규화 산출물 양쪽에 같은 문구로 연결한다."""
    step = {
        "n": 2,
        "title": "API 프로젝트",
        "body": "예외 응답을 설계합니다.",
        "deliverable": "API 명세",
        "fills": [{"item_id": "cc_demo_collab", "label": "협업 결정 기록"}],
    }
    normalized = {
        "scope_level": "cluster",
        "scope_id": "startup",
        "step_order": 2,
        "body": step["body"],
        "deliverable": step["deliverable"],
    }
    tables = {
        "analysis_outputs": [
            {
                "output_type": "roadmap",
                "scope_level": "cluster",
                "scope_id": "startup",
                "payload": {"project_steps": [step]},
            }
        ],
        "roadmap_items": [normalized],
    }

    build_seed.align_roadmap_fills(tables)

    assert build_seed._fill_matches_step(step["fills"][0], step)
    assert "협업 결정 기록" in step["body"]
    assert normalized["body"] == step["body"]
    assert normalized["deliverable"] == step["deliverable"]


def test_deviation_concepts_matches_by_dev_n_then_by_slug() -> None:
    """편차는 기업군이 이미 표시한 `dev_n` 으로 먼저, 없으면 개념 slug 로 잇는다."""
    checklist = _cluster_strategy_payload()["checklist"]
    matched = build_seed.deviation_concepts(
        "demo", checklist, _posting_interpretation()["deviations"]
    )
    assert [(order, concept) for order, concept, _ in matched] == [
        (1, "cc_demo_tx"),  # dev_n = 1 로 표시된 항목
        (2, "cc_demo_docs"),  # cc_demo_docs 가 slug 로 맞는다
    ]


def test_deviation_concepts_skips_a_deviation_without_a_checklist_item() -> None:
    """`dev_n` 표시도 없고 slug 도 맞지 않으면 건너뛴다. 없는 항목을 만들지 않는다."""
    checklist = [
        item for item in _cluster_strategy_payload()["checklist"] if not item["is_deviation"]
    ]
    matched = build_seed.deviation_concepts(
        "demo", checklist, [{"item_id": "없는항목", "evidence": "x"}, {"item_id": "docs", "evidence": "y"}]
    )
    assert [(order, concept) for order, concept, _ in matched] == [(2, "cc_demo_docs")]


def test_derive_posting_strategy_promotes_and_keeps_every_item() -> None:
    """편차 항목이 앞으로 오고 사유가 그 공고 근거로 바뀐다. 항목은 하나도 지우지 않는다."""
    payload, promoted = build_seed.derive_posting_strategy(
        "demo", _cluster_strategy_payload(), _posting_interpretation(), "dp_demo_01"
    )
    assert payload["scope"] == {
        "level": "posting", "cluster_tag": "핀테크·금융", "posting_id": "dp_demo_01",
    }
    assert [item["item_id"] for item in payload["checklist"]] == [
        "cc_demo_tx", "cc_demo_docs", "cc_demo_api",
    ]
    assert [item["dev_n"] for item in payload["checklist"]] == [1, 2, None]
    assert [item["is_deviation"] for item in payload["checklist"]] == [True, True, False]
    assert payload["checklist"][0]["reason"].startswith("비바리퍼블리카 공고는 ")
    assert payload["checklist"][2]["reason"] == "기준선"  # 편차와 무관한 항목은 그대로
    assert [concept for _, concept, _ in promoted] == ["cc_demo_tx", "cc_demo_docs"]
    # 바탕이 된 기업군 payload 는 건드리지 않는다.
    assert _cluster_strategy_payload()["checklist"][0]["reason"] == "기준선"


def test_derive_posting_roadmap_pulls_the_deviation_step_forward() -> None:
    """편차를 채우는 단계가 앞으로 오고 `n`·`STEP nn`·`source_step` 이 다시 매겨진다."""
    strategy, promoted = build_seed.derive_posting_strategy(
        "demo", _cluster_strategy_payload(), _posting_interpretation(), "dp_demo_01"
    )
    payload = build_seed.derive_posting_roadmap(
        "demo", _cluster_roadmap_payload(), strategy, _posting_interpretation(),
        promoted, "dp_demo_01",
    )
    assert [(step["n"], step["phase"]) for step in payload["project_steps"]] == [
        (1, "STEP 01 · 2주"), (2, "STEP 02 · 3주"),
    ]
    assert payload["project_steps"][0]["title"] == "트랜잭션"
    assert payload["project_steps"][0]["reason"].startswith("비바리퍼블리카 공고는 ")
    assert payload["project_steps"][1]["reason_title"] == "왜 이 순서인가요?"
    assert payload["scope"] == strategy["scope"]
    rows = {row["item_id"]: row for row in payload["check_rows"]}
    assert rows["cc_demo_tx"]["source_step"] == "STEP 01"
    assert rows["cc_demo_api"]["source_step"] == "STEP 02"
    assert rows["cc_demo_docs"]["source_step"] == "병행"  # 단계가 아닌 문구는 그대로


def test_derive_posting_roadmap_check_rows_match_the_strategy_checklist() -> None:
    """로드맵의 `check_rows` 는 같은 공고 전략의 체크리스트를 그대로 따라간다."""
    strategy, promoted = build_seed.derive_posting_strategy(
        "demo", _cluster_strategy_payload(), _posting_interpretation(), "dp_demo_01"
    )
    payload = build_seed.derive_posting_roadmap(
        "demo", _cluster_roadmap_payload(), strategy, _posting_interpretation(),
        promoted, "dp_demo_01",
    )
    assert [row["item_id"] for row in payload["check_rows"]] == [
        item["item_id"] for item in strategy["checklist"]
    ]
    assert [row["dev_n"] for row in payload["check_rows"]] == [1, 2, None]


def _demo_part() -> dict[str, list[dict[str, Any]]]:
    """직무 조각 하나를 흉내 낸다. 기업군 1종 · 공고 1건짜리 최소 조각이다."""
    common = {
        "analysis_version": "an_demo_demo",
        "job_role_id": "demo",
        "produced_by_agent": "x",
        "verification_status": "verified",
        "generated_at": "2026-07-27T09:00:00+09:00",
    }
    return {
        "analysis_outputs": [
            {**common, "output_id": "out_demo_demo_intp_fin", "scope_level": "cluster",
             "scope_id": "fin", "output_type": "interpretation", "produced_by_agent": "interpretation",
             "payload": {"scope": {"level": "cluster", "cluster_tag": "핀테크·금융"},
                         "deviations": _posting_interpretation()["deviations"]}},
            {**common, "output_id": "out_demo_demo_intp_dp_demo_01", "scope_level": "posting",
             "scope_id": "dp_demo_01", "output_type": "interpretation",
             "produced_by_agent": "interpretation", "payload": _posting_interpretation()},
            {**common, "output_id": "out_demo_demo_strat_fin", "scope_level": "cluster",
             "scope_id": "fin", "output_type": "strategy", "produced_by_agent": "strategy",
             "payload": _cluster_strategy_payload()},
            {**common, "output_id": "out_demo_demo_road_fin", "scope_level": "cluster",
             "scope_id": "fin", "output_type": "roadmap", "produced_by_agent": "roadmap",
             "payload": _cluster_roadmap_payload()},
        ],
        "checklist_items": [
            {"item_id": f"ci_demo_demo_fin_{slug}", "concept_id": f"cc_demo_{slug}",
             "analysis_version": "an_demo_demo", "scope_level": "cluster", "scope_id": "fin",
             "title": slug, "subtitle": "", "reason": "기준선", "evidence_needed": "-",
             "channels": ["portfolio"], "required": True, "is_deviation": False}
            for slug in ("api", "tx", "docs")
        ],
        "roadmap_items": [
            {"roadmap_item_id": f"ri_demo_demo_fin_{n}", "analysis_version": "an_demo_demo",
             "scope_level": "cluster", "scope_id": "fin", "step_order": n, "phase_label": f"STEP 0{n}",
             "weeks": 1, "priority": "high", "title": "t", "body": "", "deliverable": "",
             "reason": "", "tags": []}
            for n in (1, 2)
        ],
        "roadmap_item_fills": [
            {"roadmap_item_id": "ri_demo_demo_fin_1", "concept_id": "cc_demo_api", "fill_kind": "normal"},
            {"roadmap_item_id": "ri_demo_demo_fin_2", "concept_id": "cc_demo_tx", "fill_kind": "dev"},
        ],
        "study_tracks": [
            {"track_id": "st_demo_demo_fin_cs", "analysis_version": "an_demo_demo",
             "scope_level": "cluster", "scope_id": "fin", "capability_id": "cap_demo_cs",
             "phase_label": "병행", "priority": "high", "depth_reference": "foundation"},
        ],
    }


def test_derive_posting_scopes_adds_rows_in_place_with_posting_identifiers() -> None:
    """파생은 조각 자리에 행을 더한다. 식별자와 범위가 공고 범위로 바뀐다."""
    parts = {"demo": _demo_part()}
    totals = build_seed.derive_posting_scopes(parts, ["demo"])
    assert totals["analysis_outputs"] == 2
    assert totals["checklist_items"] == 3
    assert totals["roadmap_items"] == 2
    assert totals["study_tracks"] == 1

    added = [row for row in parts["demo"]["analysis_outputs"] if row["scope_level"] == "posting"]
    derived = [row for row in added if row["output_type"] in {"strategy", "roadmap"}]
    assert {row["output_id"] for row in derived} == {
        "out_demo_demo_strat_dp_demo_01", "out_demo_demo_road_dp_demo_01",
    }
    assert {row["produced_by_agent"] for row in derived} == {"strategy", "roadmap"}
    # 시각은 기업군 행의 값을 그대로 물려받는다. 새로 만들면 재실행이 달라진다.
    assert {row["generated_at"] for row in derived} == {"2026-07-27T09:00:00+09:00"}

    items = [row for row in parts["demo"]["checklist_items"] if row["scope_level"] == "posting"]
    assert {row["item_id"] for row in items} == {
        "ci_demo_demo_dp_demo_01_api", "ci_demo_demo_dp_demo_01_tx", "ci_demo_demo_dp_demo_01_docs",
    }
    assert {row["scope_id"] for row in items} == {"dp_demo_01"}
    steps = [row for row in parts["demo"]["roadmap_items"] if row["scope_level"] == "posting"]
    assert sorted(row["step_order"] for row in steps) == [1, 2]
    assert {row["roadmap_item_id"] for row in steps} == {
        "ri_demo_demo_dp_demo_01_1", "ri_demo_demo_dp_demo_01_2",
    }
    tracks = [row for row in parts["demo"]["study_tracks"] if row["scope_level"] == "posting"]
    assert [row["track_id"] for row in tracks] == ["st_demo_demo_dp_demo_01_cs"]


def test_derive_posting_scopes_does_not_add_analysis_claims() -> None:
    """`analysis_claims` 는 늘리지 않는다. 파생이 손대는 표는 다섯 종뿐이다."""
    assert "analysis_claims" not in build_seed.DERIVED_TABLES
    parts = {"demo": _demo_part()}
    parts["demo"]["analysis_claims"] = [{"claim_id": "claim_demo_1"}]
    build_seed.derive_posting_scopes(parts, ["demo"])
    assert parts["demo"]["analysis_claims"] == [{"claim_id": "claim_demo_1"}]


def test_check_posting_scopes_catches_a_wrong_output_count() -> None:
    """허용된 15건·30건 전환 규모가 아니면 사유를 밝힌다."""
    parts = {"demo": _demo_part()}
    build_seed.derive_posting_scopes(parts, ["demo"])
    problems = build_seed.check_posting_scopes(parts, ["demo"])
    assert any("analysis_outputs 가 6행이다" in line for line in problems)


def test_output_counts_follow_the_posting_scope_formula() -> None:
    """공고 범위 수에서 직무별 산출물 수를 결정적으로 계산한다."""
    assert build_seed.expected_output_counts(9) == {
        "statistics": 1,
        "interpretation": 16,
        "strategy": 16,
        "roadmap": 16,
    }
    assert build_seed.expected_output_counts(30) == {
        "statistics": 1,
        "interpretation": 37,
        "strategy": 37,
        "roadmap": 37,
    }
    assert build_seed.expected_output_total(9) == 49
    assert build_seed.expected_output_total(30) == 112


def test_transition_gate_accepts_fifteen_or_thirty_posting_states() -> None:
    """병렬 전환 중에는 기존 15건과 목표 30건 상태만 허용한다."""
    assert build_seed.posting_count_problem("demo", 9) is None
    assert build_seed.posting_count_problem("demo", 30) is None
    assert build_seed.posting_count_problem("demo", 5) == (
        "demo: posting 범위 interpretation 이 5행이다 (전환 중 허용값 9·30)"
    )
    assert build_seed.posting_count_problem("demo", 30, allow_transition=False) is None
    assert build_seed.posting_count_problem("demo", 9, allow_transition=False) == (
        "demo: posting 범위 interpretation 이 9행이다 (최종 기대값 30)"
    )
    assert build_seed.parse_args(["--check", "--final"]).final is True


def test_target_posting_inventory_has_period_cluster_and_status_balance() -> None:
    """30건은 기간·기업군·진행 상태가 목표 분포와 정확히 맞아야 한다."""
    versions: list[dict[str, Any]] = []
    outputs: list[dict[str, Any]] = []
    number = 1
    for cluster in range(6):
        for offset in range(3):
            posting_id = f"dp_demo_{number:02d}"
            versions.append(
                {
                    "posting_id": posting_id,
                    "posted_at": f"2026-0{cluster + 1}-{offset + 1:02d}T10:00:00+09:00",
                    "closed_at": r"\N" if offset == 0 else "2026-06-30T18:00:00+09:00",
                }
            )
            outputs.append(
                {
                    "scope_level": "posting",
                    "scope_id": posting_id,
                    "output_type": "interpretation",
                    "payload": {"scope": {"cluster_tag": f"cluster-{cluster}"}},
                }
            )
            number += 1
        for offset in range(2):
            posting_id = f"dp_demo_{number:02d}"
            versions.append(
                {
                    "posting_id": posting_id,
                    "posted_at": f"2025-0{cluster + 1}-{offset + 1:02d}T10:00:00+09:00",
                    "closed_at": "2025-11-30T18:00:00+09:00",
                }
            )
            outputs.append(
                {
                    "scope_level": "posting",
                    "scope_id": posting_id,
                    "output_type": "interpretation",
                    "payload": {"scope": {"cluster_tag": f"cluster-{cluster}"}},
                }
            )
            number += 1

    tables = {"posting_versions": versions, "analysis_outputs": outputs}
    assert build_seed.check_posting_inventory("demo", tables) == []

    versions[0]["closed_at"] = "2026-06-30T18:00:00+09:00"
    problems = build_seed.check_posting_inventory("demo", tables)
    assert any("진행 중 5건" in problem for problem in problems)


def test_check_posting_scopes_catches_a_mismatched_check_row_set() -> None:
    """전략의 체크리스트와 로드맵의 `check_rows` 가 어긋나면 잡는다."""
    parts = {"demo": _demo_part()}
    build_seed.derive_posting_scopes(parts, ["demo"])
    for row in parts["demo"]["analysis_outputs"]:
        if row["output_id"] == "out_demo_demo_road_dp_demo_01":
            row["payload"]["check_rows"].pop()
    problems = build_seed.check_posting_scopes(parts, ["demo"])
    assert any("check_rows 가 다르다" in line for line in problems)


def test_check_posting_scopes_catches_a_scope_id_mismatch() -> None:
    """payload 의 `scope.posting_id` 가 행의 `scope_id` 와 다르면 잡는다."""
    parts = {"demo": _demo_part()}
    build_seed.derive_posting_scopes(parts, ["demo"])
    for row in parts["demo"]["analysis_outputs"]:
        if row["output_id"] == "out_demo_demo_strat_dp_demo_01":
            row["payload"]["scope"]["posting_id"] = "dp_other_99"
    problems = build_seed.check_posting_scopes(parts, ["demo"])
    assert any("행의 scope_id" in line for line in problems)


def test_check_posting_scopes_catches_a_step_order_gap() -> None:
    """`roadmap_items.step_order` 가 1부터 이어지지 않으면 잡는다."""
    parts = {"demo": _demo_part()}
    build_seed.derive_posting_scopes(parts, ["demo"])
    for row in parts["demo"]["roadmap_items"]:
        if row["roadmap_item_id"] == "ri_demo_demo_dp_demo_01_2":
            row["step_order"] = 5
    problems = build_seed.check_posting_scopes(parts, ["demo"])
    assert any("1부터 이어지지 않는다" in line for line in problems)


def test_check_posting_scopes_catches_two_identical_payloads_in_one_cluster() -> None:
    """같은 기업군의 두 공고 payload 가 완전히 같으면 편차가 반영되지 않은 것이다."""
    parts = {"demo": _demo_part()}
    build_seed.derive_posting_scopes(parts, ["demo"])
    twin = []
    for row in parts["demo"]["analysis_outputs"]:
        if row["scope_id"] != "dp_demo_01" or row["output_type"] not in {"strategy", "roadmap"}:
            continue
        payload = json.loads(json.dumps(row["payload"], ensure_ascii=False))
        payload["scope"]["posting_id"] = "dp_demo_02"
        twin.append({**row, "output_id": f"{row['output_id']}x", "scope_id": "dp_demo_02",
                     "payload": payload})
    parts["demo"]["analysis_outputs"].extend(twin)
    problems = build_seed.check_posting_scopes(parts, ["demo"])
    assert not any("payload 가 완전히 같다" in line for line in problems)
    # 범위 표시까지 같으면 두 공고를 가릴 수 없다.
    for row in twin:
        row["payload"]["scope"]["posting_id"] = "dp_demo_01"
    problems = build_seed.check_posting_scopes(parts, ["demo"])
    assert any("payload 가 완전히 같다" in line for line in problems)


# ============================================================ 실제 산출물의 공고 범위
@pytest.mark.skipif(
    not (AGENT_ROOT / "data" / "demo_seed" / "analysis_outputs.csv").exists(),
    reason="아직 build_demo_seed.py 를 돌리지 않았다",
)
def test_built_analysis_outputs_carry_posting_scoped_strategy_and_roadmap() -> None:
    """전환 중인 실제 CSV 가 직무별 15건·30건 상태와 공고 산출물을 정확히 맞춘다."""
    csv.field_size_limit(1 << 30)
    path = AGENT_ROOT / "data" / "demo_seed" / "analysis_outputs.csv"
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    for job in build_seed.JOB_PARTS:
        mine = [row for row in rows if row["job_role_id"] == job]
        postings = {row["scope_id"] for row in mine
                    if row["output_type"] == "interpretation" and row["scope_level"] == "posting"}
        assert len(postings) in build_seed.ALLOWED_POSTING_OUTPUT_COUNTS
        expected = build_seed.expected_output_counts(len(postings))
        assert len(mine) == build_seed.expected_output_total(len(postings))
        counted = {
            output_type: len([row for row in mine if row["output_type"] == output_type])
            for output_type in expected
        }
        assert counted == expected

        for posting_id in postings:
            strategy = json.loads(
                next(row["payload"] for row in mine
                     if row["output_id"] == f"out_demo_{job}_strat_{posting_id}")
            )
            roadmap = json.loads(
                next(row["payload"] for row in mine
                     if row["output_id"] == f"out_demo_{job}_road_{posting_id}")
            )
            assert strategy["scope"]["posting_id"] == posting_id
            assert roadmap["scope"] == strategy["scope"]
            assert {item["item_id"] for item in strategy["checklist"]} == {
                row["item_id"] for row in roadmap["check_rows"]
            }
            assert any(item["is_deviation"] for item in strategy["checklist"])

    expected_total = sum(
        build_seed.expected_output_total(
            len({row["scope_id"] for row in rows
                 if row["job_role_id"] == job
                 and row["output_type"] == "interpretation"
                 and row["scope_level"] == "posting"})
        )
        for job in build_seed.JOB_PARTS
    )
    assert len(rows) == expected_total


@pytest.mark.skipif(
    not (AGENT_ROOT / "data" / "demo_seed" / "roadmap_items.csv").exists(),
    reason="아직 build_demo_seed.py 를 돌리지 않았다",
)
def test_built_normalized_rows_cover_the_posting_scope() -> None:
    """정규화 네 표에 공고 범위 행이 있고 유일 제약을 지킨다."""
    root = AGENT_ROOT / "data" / "demo_seed"
    tables: dict[str, list[dict[str, str]]] = {}
    for table in ("checklist_items", "roadmap_items", "study_tracks", "roadmap_item_fills"):
        with (root / f"{table}.csv").open(encoding="utf-8", newline="") as handle:
            tables[table] = list(csv.DictReader(handle))

    for table, columns in build_seed.UNIQUE_KEYS.items():
        keys = [tuple(row[column] for column in columns) for row in tables[table]]
        assert len(set(keys)) == len(keys), table
        assert any(row["scope_level"] == "posting" for row in tables[table]), table

    # 기업군 식별자는 아홉 직무가 함께 쓰므로 분석 버전까지 묶어야 한 범위가 된다.
    orders: dict[tuple[str, str, str], list[int]] = {}
    for row in tables["roadmap_items"]:
        key = (row["analysis_version"], row["scope_level"], row["scope_id"])
        orders.setdefault(key, []).append(int(row["step_order"]))
    for scope, values in orders.items():
        assert sorted(values) == list(range(1, len(values) + 1)), scope

    known = {row["roadmap_item_id"] for row in tables["roadmap_items"]}
    assert {row["roadmap_item_id"] for row in tables["roadmap_item_fills"]} <= known


# ============================================================ 공유 신원과 채택
#
# 생성 데이터는 실 데이터와 저장소를 같이 쓴다. `knowledge_nodes` 의 참조 노드와
# `requirement_taxonomies` 는 실 데이터와 신원을 공유하므로 그대로 넣으면 부딪힌다.
# 저장소에 붙을 수 없으니 커서를 흉내 내는 대역으로 못 박는다. 대역은 `execute` 로
# 들어온 SQL 을 보고 미리 정해 둔 답을 내고, `copy` 로 흘러 들어간 바이트를 모은다.

import sqlite3  # noqa: E402


class _FakeCopy:
    """`cur.copy(...)` 가 내주는 대역. 흘러 들어온 바이트를 모은다."""

    def __init__(self, sink: list[bytes]) -> None:
        self._sink = sink

    def __enter__(self) -> "_FakeCopy":
        return self

    def __exit__(self, *exc: object) -> bool:
        return False

    def write(self, chunk: bytes | str) -> None:
        self._sink.append(chunk if isinstance(chunk, bytes) else chunk.encode("utf-8"))


class _FakeCursor:
    """psycopg 커서 대역. `execute`·`fetchone`·`fetchall`·`copy` 만 흉내 낸다."""

    def __init__(
        self,
        taxonomies: dict[str, str] | None = None,
        max_version: dict[str, int] | None = None,
        active: set[str] | None = None,
        inserted: int = 0,
    ) -> None:
        self.taxonomies = dict(taxonomies or {})      # job_role_id → 실 데이터의 taxonomy_id
        self.max_version = dict(max_version or {})    # 실 taxonomy_id → 지금까지의 최대 번호
        self.active = set(active or ())               # 활성 버전이 이미 있는 실 taxonomy_id
        self.statements: list[str] = []
        self.copied: dict[str, bytes] = {}
        self.rowcount = 0
        self._inserted = inserted
        self._result: list[tuple[Any, ...]] = []

    def execute(self, sql: str, params: Any = None) -> "_FakeCursor":
        text = " ".join(sql.split())
        self.statements.append(text)
        if "FROM requirement_taxonomies WHERE job_role_id" in text:
            found = self.taxonomies.get(params[0])
            self._result = [(found,)] if found else []
        elif "COALESCE(MAX(version_number)" in text:
            self._result = [(self.max_version.get(params[0], 0) + 1,)]
        elif "published_at IS NOT NULL AND superseded_at IS NULL" in text:
            self._result = [(1,)] if params[0] in self.active else []
        elif text.startswith("INSERT INTO"):
            self.rowcount = self._inserted
            self._result = []
        else:
            self._result = []
        return self

    def fetchone(self) -> tuple[Any, ...] | None:
        return self._result[0] if self._result else None

    def fetchall(self) -> list[tuple[Any, ...]]:
        return list(self._result)

    def copy(self, statement: str) -> _FakeCopy:
        sink: list[bytes] = []
        self.copied[" ".join(statement.split())] = b""
        key = " ".join(statement.split())

        class _Recording(_FakeCopy):
            def __exit__(_self, *exc: object) -> bool:  # noqa: N805
                self.copied[key] = b"".join(sink)
                return False

        return _Recording(sink)

    # ---- 시험이 읽기 좋으라고 두는 도우미
    def payload(self, table: str) -> str:
        """그 표로 흘러 들어간 CSV 를 문자열로 낸다."""
        for statement, blob in self.copied.items():
            if statement.startswith(f"COPY {table} (") or statement.startswith(
                f"COPY stage_{table} ("
            ):
                return blob.decode("utf-8")
        raise AssertionError(f"{table} 로 COPY 한 적이 없다")

    def rows_of(self, table: str) -> list[dict[str, str]]:
        """그 표로 흘러 들어간 CSV 를 행 목록으로 낸다."""
        lines = self.payload(table).splitlines()
        reader = csv.reader(lines)
        header = next(reader)
        assert header == list(TABLE_COLUMNS[table])
        return [dict(zip(header, row)) for row in reader]


def _seed_csv(root: Path, table: str, rows: list[dict[str, str]]) -> Path:
    """계약 컬럼을 채운 시드 CSV 를 만든다. 적지 않은 칸은 NULL 표기다."""
    path = root / f"{table}.csv"
    columns = list(TABLE_COLUMNS[table])
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(columns)
        for row in rows:
            assert set(row) <= set(columns), f"{table}: 계약에 없는 컬럼"
            writer.writerow([row.get(column, load_seed.NULL_TOKEN) for column in columns])
    return path


def _taxonomy_fixture(root: Path) -> list[tuple[str, Path]]:
    """백엔드·프론트엔드 두 직무짜리 최소 시드. 적재 순서 그대로 돌려준다."""
    files = [
        (
            "requirement_taxonomies",
            _seed_csv(
                root,
                "requirement_taxonomies",
                [
                    {"taxonomy_id": "taxonomy_backend", "job_role_id": "backend"},
                    {"taxonomy_id": "taxonomy_frontend", "job_role_id": "frontend"},
                ],
            ),
        ),
        (
            "requirement_taxonomy_versions",
            _seed_csv(
                root,
                "requirement_taxonomy_versions",
                [
                    {
                        "taxonomy_version_id": "tx_demo_backend",
                        "taxonomy_id": "taxonomy_backend",
                        "version_number": "1",
                        "taxonomy_policy_version": "tp_v1",
                        "published_at": "2026-07-27T09:00:00+09:00",
                    },
                    {
                        "taxonomy_version_id": "tx_demo_frontend",
                        "taxonomy_id": "taxonomy_frontend",
                        "version_number": "1",
                        "taxonomy_policy_version": "tp_v1",
                        "published_at": "2026-07-27T09:00:00+09:00",
                    },
                ],
            ),
        ),
        (
            "requirement_dimensions",
            _seed_csv(
                root,
                "requirement_dimensions",
                [
                    {
                        "dimension_id": "dim_backend_a",
                        "taxonomy_id": "taxonomy_backend",
                        "dimension_kind": "skill",
                    },
                    {
                        "dimension_id": "dim_frontend_a",
                        "taxonomy_id": "taxonomy_frontend",
                        "dimension_kind": "skill",
                    },
                ],
            ),
        ),
    ]
    return files


def _counts(files: list[tuple[str, Path]]) -> dict[str, int]:
    return {table: load_seed.validate_file(table, path)[0] for table, path in files}


# ------------------------------------------------------------ 채택 목록
def test_adopted_tables_is_declared_and_sane() -> None:
    """건너뛰기로 넣는 표를 모듈 상수로 선언한다. 보호 표는 들어올 수 없다.

    두 표는 `graph/identifiers.py` 가 재료에서 식별자를 계산하는 자리다. 실 데이터와
    시드가 같은 참조 노드·엣지를 가리키면 식별자가 같으므로 넣을 것이 아니라
    건너뛸 것이다.
    """
    assert load_seed.ADOPTED_TABLES == frozenset({"knowledge_nodes", "knowledge_edges"})
    assert load_seed.ADOPTED_TABLES <= set(LOAD_ORDER)
    assert load_seed.ADOPTED_TABLES & load_seed.PROTECTED_TABLES == set()


def test_taxonomy_id_tables_are_computed_from_the_contract() -> None:
    """`taxonomy_id` 를 가진 표를 손으로 적지 않고 전수로 찾는다."""
    assert set(load_seed.TAXONOMY_ID_TABLES) == {
        table for table in LOAD_ORDER if "taxonomy_id" in TABLE_COLUMNS[table]
    }
    assert {"requirement_taxonomy_versions", "requirement_dimensions"} <= set(
        load_seed.TAXONOMY_ID_TABLES
    )


def test_stage_statements_keep_one_copy_per_table() -> None:
    """채택 표는 임시 표에 COPY 하고 ON CONFLICT DO NOTHING 으로 옮긴다."""
    create, copy_sql, insert_sql = load_seed.stage_statements("knowledge_nodes")
    columns = ", ".join(TABLE_COLUMNS["knowledge_nodes"])
    assert "CREATE TEMP TABLE stage_knowledge_nodes" in create
    assert "LIKE knowledge_nodes INCLUDING DEFAULTS" in create
    assert "ON COMMIT DROP" in create
    assert copy_sql.startswith("COPY stage_knowledge_nodes (")
    assert "FROM STDIN" in copy_sql and r"NULL '\N'" in copy_sql
    assert insert_sql.startswith(f"INSERT INTO knowledge_nodes ({columns})")
    assert insert_sql.endswith("ON CONFLICT DO NOTHING")
    with pytest.raises(RuntimeError):
        load_seed.stage_statements("capabilities")


# ------------------------------------------------------------ 채택이 일어날 때
def test_adoption_drops_the_seed_row_and_remaps_every_dependent(tmp_path: Path) -> None:
    """이미 있는 분류체계는 넣지 않고, 대응을 의존 표에 전부 적용한다."""
    files = _taxonomy_fixture(tmp_path)
    cur = _FakeCursor(taxonomies={"backend": "tx_real_backend"}, max_version={"tx_real_backend": 2})
    load_seed.load_tables(cur, files, _counts(files))

    taxonomies = cur.rows_of("requirement_taxonomies")
    assert [row["job_role_id"] for row in taxonomies] == ["frontend"]

    versions = {row["taxonomy_version_id"]: row for row in cur.rows_of("requirement_taxonomy_versions")}
    assert versions["tx_demo_backend"]["taxonomy_id"] == "tx_real_backend"
    assert versions["tx_demo_frontend"]["taxonomy_id"] == "taxonomy_frontend"

    dimensions = {row["dimension_id"]: row for row in cur.rows_of("requirement_dimensions")}
    assert dimensions["dim_backend_a"]["taxonomy_id"] == "tx_real_backend"
    assert dimensions["dim_frontend_a"]["taxonomy_id"] == "taxonomy_frontend"


def test_adoption_renumbers_only_the_adopted_taxonomy(tmp_path: Path) -> None:
    """채택한 분류체계의 버전 번호만 MAX+1 로 바꾼다. 나머지 직무는 그대로다."""
    files = _taxonomy_fixture(tmp_path)
    cur = _FakeCursor(taxonomies={"backend": "tx_real_backend"}, max_version={"tx_real_backend": 2})
    _, notes = load_seed.load_tables(cur, files, _counts(files))

    versions = {row["taxonomy_version_id"]: row for row in cur.rows_of("requirement_taxonomy_versions")}
    assert versions["tx_demo_backend"]["version_number"] == "3"
    assert versions["tx_demo_frontend"]["version_number"] == "1"
    assert any("version_number 1 → 3" in note for note in notes)


def test_active_version_forces_the_seed_version_into_a_draft(tmp_path: Path) -> None:
    """활성 버전이 이미 있으면 시드 버전의 published_at 을 지워 초안으로 넣는다."""
    files = _taxonomy_fixture(tmp_path)
    cur = _FakeCursor(
        taxonomies={"backend": "tx_real_backend"},
        max_version={"tx_real_backend": 2},
        active={"tx_real_backend"},
    )
    _, notes = load_seed.load_tables(cur, files, _counts(files))

    versions = {row["taxonomy_version_id"]: row for row in cur.rows_of("requirement_taxonomy_versions")}
    assert versions["tx_demo_backend"]["published_at"] == load_seed.NULL_TOKEN
    assert versions["tx_demo_frontend"]["published_at"] == "2026-07-27T09:00:00+09:00"
    assert any("초안" in note for note in notes)
    # 실 데이터의 활성 버전을 건드리는 문장이 없다.
    assert not any(
        statement.startswith("UPDATE") or statement.startswith("DELETE")
        for statement in cur.statements
    )


def test_no_adoption_sends_the_seed_values_unchanged(tmp_path: Path) -> None:
    """채택이 없으면 파일을 그대로 흘린다. 값이 한 칸도 바뀌지 않는다."""
    files = _taxonomy_fixture(tmp_path)
    cur = _FakeCursor()  # 실 데이터에 분류체계가 하나도 없다
    _, notes = load_seed.load_tables(cur, files, _counts(files))

    assert notes == []
    for table, path in files:
        assert cur.payload(table) == path.read_text(encoding="utf-8")


# ------------------------------------------------------------ 갈래 구분
def test_only_adopted_tables_use_the_staging_path(tmp_path: Path) -> None:
    """`ADOPTED_TABLES` 가 아닌 표는 여전히 표 자신에게 직접 COPY 한다."""
    files = [
        (
            "capabilities",
            _seed_csv(
                tmp_path,
                "capabilities",
                [
                    {
                        "capability_id": "cap_backend_a",
                        "job_role_id": "backend",
                        "canonical_label": "라벨",
                        "definition": "정의",
                        "is_active": "true",
                    }
                ],
            ),
        ),
        (
            "knowledge_nodes",
            _seed_csv(
                tmp_path,
                "knowledge_nodes",
                [
                    {
                        "node_id": "kn_jobrole_backend",
                        "graph_layer": "reference",
                        "node_type": "JobRole",
                        "ref_table": "job_roles",
                        "ref_id": "backend",
                        "label": "백엔드",
                        "ontology_version": "ont_v1",
                    },
                    {
                        "node_id": "kn_dim_backend_a",
                        "graph_layer": "analysis",
                        "node_type": "Dimension",
                        "ref_table": "requirement_dimensions",
                        "ref_id": "dim_backend_a",
                        "label": "차원",
                        "ontology_version": "ont_v1",
                    },
                ],
            ),
        ),
    ]
    cur = _FakeCursor(inserted=1)
    loaded, _ = load_seed.load_tables(cur, files, _counts(files))

    assert "COPY capabilities (" in " | ".join(cur.copied)
    assert "COPY stage_capabilities (" not in " | ".join(cur.copied)
    assert not any("stage_capabilities" in statement for statement in cur.statements)
    assert loaded["capabilities"] == (1, 0)

    assert any(statement.startswith("CREATE TEMP TABLE stage_knowledge_nodes") for statement in cur.statements)
    assert any(
        statement.startswith("INSERT INTO knowledge_nodes (") and statement.endswith("ON CONFLICT DO NOTHING")
        for statement in cur.statements
    )
    # 두 행을 흘렸고 하나만 들어갔다. 나머지 하나는 이미 있던 참조 노드다.
    assert loaded["knowledge_nodes"] == (1, 1)
    assert len(cur.rows_of("knowledge_nodes")) == 2


def test_each_table_is_copied_exactly_once(tmp_path: Path) -> None:
    """채택이 있어도 표당 COPY 는 한 번이다."""
    files = _taxonomy_fixture(tmp_path)
    cur = _FakeCursor(taxonomies={"backend": "tx_real_backend"})
    load_seed.load_tables(cur, files, _counts(files))
    copies = [statement for statement in cur.copied]
    assert len(copies) == len(files)
    assert len(set(copies)) == len(copies)


# ------------------------------------------------------------ 부분 유일 인덱스
_ACTIVE_INDEX_DEF = (
    "CREATE UNIQUE INDEX idx_active_taxonomy_version ON public.requirement_taxonomy_versions "
    "USING btree (taxonomy_id) WHERE ((published_at IS NOT NULL) AND (superseded_at IS NULL))"
)


def test_partial_unique_index_condition_is_parsed() -> None:
    """조건까지 읽어서 판정한다. 사람에게 넘기지 않는다."""
    parsed = load_seed.parse_partial_unique_index(_ACTIVE_INDEX_DEF)
    assert parsed is not None
    columns, conditions = parsed
    assert columns == ("taxonomy_id",)
    assert conditions == {"published_at": True, "superseded_at": False}
    assert "published_at IS NOT NULL" in load_seed.index_predicate(_ACTIVE_INDEX_DEF)


def test_unreadable_index_condition_falls_back_to_a_human() -> None:
    """이해하지 못하는 조건은 통과라고 말하지 않는다."""
    definition = (
        "CREATE UNIQUE INDEX idx_x ON public.t USING btree (a) WHERE (status = 'active'::text)"
    )
    assert load_seed.parse_partial_unique_index(definition) is None


def test_draft_rows_fall_outside_the_active_index(tmp_path: Path) -> None:
    """초안으로 바뀐 시드 버전은 활성 인덱스의 조건에 들지 않는다."""
    files = dict(_taxonomy_fixture(tmp_path))
    adoption = load_seed.plan_adoption(
        _FakeCursor(
            taxonomies={"backend": "tx_real_backend"},
            max_version={"tx_real_backend": 2},
            active={"tx_real_backend"},
        ),
        files["requirement_taxonomies"],
    )
    columns, conditions = load_seed.parse_partial_unique_index(_ACTIVE_INDEX_DEF)  # type: ignore[misc]
    keys = load_seed.effective_key_rows(
        "requirement_taxonomy_versions",
        files["requirement_taxonomy_versions"],
        columns,
        adoption,
        conditions,
    )
    assert keys == [("taxonomy_frontend",)]  # 채택한 백엔드 버전은 초안이라 빠진다


# ------------------------------------------------------------ 되돌리기 범위
def test_demo_taxonomy_scope_excludes_real_taxonomies() -> None:
    """채택이 일어나도 실 데이터의 분류체계는 되돌리기 범위 밖이다.

    SQL 을 문자열로 훑지 않고 sqlite 로 실제 실행한다. 조건이 뜻대로 도는지는
    글자가 아니라 결과로 확인한다.
    """
    query = dict(load_seed.SCOPE_TEMP_TABLES)["demo_taxonomy"]
    conn = sqlite3.connect(":memory:")
    conn.execute(
        "CREATE TABLE requirement_taxonomy_versions "
        "(taxonomy_version_id text, taxonomy_id text)"
    )
    conn.execute("CREATE TABLE demo_taxonomy_version (taxonomy_version_id text)")
    conn.executemany(
        "INSERT INTO requirement_taxonomy_versions VALUES (?, ?)",
        [
            ("tx_real_backend_v1", "tx_real_backend"),  # 실 공고 44건이 매달린 버전
            ("tx_demo_backend", "tx_real_backend"),     # 채택으로 실 분류체계에 붙은 시드 버전
            ("tx_demo_frontend", "taxonomy_frontend"),  # 시드가 처음 만든 분류체계
        ],
    )
    conn.executemany(
        "INSERT INTO demo_taxonomy_version VALUES (?)",
        [("tx_demo_backend",), ("tx_demo_frontend",)],
    )
    scoped = {row[0] for row in conn.execute(query)}
    assert scoped == {"taxonomy_frontend"}

    naive = (
        "SELECT DISTINCT taxonomy_id FROM requirement_taxonomy_versions "
        "WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    )
    assert "tx_real_backend" in {row[0] for row in conn.execute(naive)}  # 좁히지 않으면 들어온다
    conn.close()


def test_version_keyed_scopes_never_pick_up_real_rows() -> None:
    """채택은 taxonomy_id 만 바꾼다. taxonomy_version_id 로 좁히는 범위는 안전하다."""
    scopes = dict(load_seed.SCOPE_TEMP_TABLES)
    for name in ("demo_knowledge", "demo_dimension", "demo_capability"):
        assert "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)" in (
            " ".join(scopes[name].split())
        )
