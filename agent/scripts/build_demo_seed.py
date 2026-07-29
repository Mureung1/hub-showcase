"""직무 조각을 합쳐 테이블별 데모 시드 CSV 를 만든다 (갈래 B17).

``agent/data/demo_seed/CONTRACT.md`` 9장이 기준이다. 각 A 갈래는
``scripts/demo_seed/<job_role_id>.py`` 와 ``scripts/demo_seed/user_postings.py`` 에서
``build() -> dict[table, list[row]]`` 를 내보낸다. 이 스크립트는 그 조각을 불러
``LOAD_ORDER`` 순서로 이어 붙여 ``agent/data/demo_seed/<table>.csv`` 를 만든다.

**데이터베이스에 접속하지 않는다.** 메모리에서 합치고 파일로만 낸다.

모듈이 아직 없으면 건너뛴다. 병렬 갈래가 작업 중일 수 있으므로 없는 조각 때문에
전체가 멈추지 않는다. 무엇을 건너뛰었는지는 마지막에 함께 찍는다.

합치면서 테이블마다 기본키 중복을 본다. 중복이 있으면 어느 조각끼리 겹쳤는지를
밝히고 실패한다. 두 직무가 같은 식별자를 쓰면 적재가 통째로 되돌아가므로, 그 사실을
DB 가 아니라 여기서 먼저 잡는다.

합친 뒤 CSV 를 쓰기 전에 그래프 식별자를 정본으로 갈아 끼운다. `knowledge_nodes` 의
`node_id` 는 조각이 손으로 지은 값이 아니라 `careersignal.graph.identifiers` 의
`node_identifier` 가 유일 제약 컬럼에서 계산한 값이어야 하고(docs/erd.md 8.2),
`knowledge_edges`·`graph_paths` 는 그 결과를 따라간다. 그래야 아홉 직무가 따로 만든
같은 참조 노드가 하나로 모이고 재실행이 같은 값을 준다.

실행:
    cd agent
    python scripts/build_demo_seed.py

옵션:
    --parts backend,frontend   합칠 조각을 좁힌다
    --check                    파일을 쓰지 않고 합치기·중복 검사만 한다
"""

from __future__ import annotations

import argparse
import importlib
import json
import re
import sys
from collections import Counter, defaultdict
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "src") not in sys.path:
    # 정본 식별자 함수는 `src/careersignal` 안에 있다. 패키지를 설치하지 않은
    # 환경에서도 스크립트만으로 돌아가도록 소스 경로를 함께 얹는다.
    sys.path.insert(0, str(ROOT / "src"))

from careersignal.graph.identifiers import (  # noqa: E402
    EDGE_PREFIX,
    NODE_PREFIX,
    edge_identifier,
    node_identifier,
)
from scripts.demo_seed._csv import (  # noqa: E402
    LOAD_ORDER,
    TABLE_COLUMNS,
    array_literal,
    demo_seed_root,
    write_table,
)

EXIT_OK = 0
EXIT_FAILED = 1

JOB_PARTS: tuple[str, ...] = (
    "backend",
    "frontend",
    "ai_engineer",
    "data_engineer",
    "fullstack",
    "devops",
    "mobile",
    "security",
    "game_client",
)
"""CONTRACT 2장의 직무 아홉 종. 모듈 이름이 곧 ``job_role_id`` 다."""

USER_PART = "user_postings"
"""A10 의 조각. 직무가 아니라 사용자 입력 공고 표를 담는다."""

PART_ORDER: tuple[str, ...] = (*JOB_PARTS, USER_PART)
"""합치는 차례. 같은 표 안에서 조각의 순서가 CSV 의 행 순서가 된다."""


# ============================================================ 기본키
PRIMARY_KEYS: dict[str, tuple[str, ...]] = {
    "dataset_versions": ("dataset_version",),
    "sources": ("source_id",),
    "source_snapshots": ("snapshot_id",),
    "source_observations": ("observation_id",),
    "source_assessments": ("assessment_id",),
    "postings": ("posting_id",),
    "posting_versions": ("posting_version_id",),
    "source_chunks": ("chunk_id",),
    "requirement_taxonomies": ("taxonomy_id",),
    "requirement_taxonomy_versions": ("taxonomy_version_id",),
    "analysis_versions": ("analysis_version",),
    "agent_runs": ("agent_run_id",),
    "requirement_dimensions": ("dimension_id",),
    "requirement_dimension_versions": ("dimension_version_id",),
    "requirement_aliases": ("alias_id",),
    "requirement_dimension_relations": ("relation_id",),
    "capabilities": ("capability_id",),
    "capability_dimension_links": ("capability_id", "dimension_id", "taxonomy_version_id"),
    "requirement_mentions": ("mention_id",),
    "chunk_extractions": ("chunk_id", "dataset_version"),
    "posting_requirement_assignments": ("assignment_id",),
    "knowledge_versions": ("knowledge_version",),
    "dimension_metric_applicability": ("taxonomy_version_id", "dimension_id", "metric_family"),
    "statistics_facts": ("fact_id",),
    "capability_depth_profiles": ("profile_id",),
    "saturation_observations": ("observation_id",),
    "knowledge_nodes": ("node_id",),
    "knowledge_edges": ("edge_id",),
    "graph_paths": ("path_id",),
    "wiki_pages": ("page_id",),
    "wiki_revisions": ("revision_id",),
    "wiki_evidence": ("revision_id", "field_name", "chunk_id"),
    "analysis_outputs": ("output_id",),
    "analysis_claims": ("claim_id",),
    "analysis_claim_evidence": ("claim_id", "support_type", "support_id", "relation"),
    "coverage_assertions": ("assertion_id",),
    "checklist_concepts": ("concept_id",),
    "checklist_items": ("item_id",),
    "roadmap_items": ("roadmap_item_id",),
    "roadmap_item_fills": ("roadmap_item_id", "concept_id"),
    "study_tracks": ("track_id",),
    "verification_results": ("result_id",),
    "active_analysis_versions": ("job_role_id",),
    "user_postings": ("user_posting_id",),
    "user_posting_analyses": ("user_analysis_id",),
}
"""표별 기본키. ``agent/migrations/sql/`` 의 PRIMARY KEY 선언과 같다.

CSV 를 합칠 때만 쓴다. 중복을 DB 가 아니라 여기서 잡으려면 키를 알아야 한다.
"""


def missing_primary_keys() -> tuple[str, ...]:
    """기본키를 적지 않은 표. 계약에 표가 늘면 여기서 드러난다."""
    return tuple(table for table in LOAD_ORDER if table not in PRIMARY_KEYS)


def key_of(table: str, row: Mapping[str, Any]) -> tuple[Any, ...]:
    """행 하나의 기본키 값. 없는 컬럼은 ``None`` 이다."""
    return tuple(row.get(column) for column in PRIMARY_KEYS[table])


# ============================================================ 조각 불러오기
class MissingPart(Exception):
    """조각 모듈이 아직 없다. 실패가 아니라 건너뛸 사유다."""


def load_part(part: str) -> dict[str, list[dict[str, Any]]]:
    """조각 모듈의 ``build()`` 를 부른다. 모듈이 없으면 `MissingPart` 를 낸다."""
    name = f"scripts.demo_seed.{part}"
    try:
        module = importlib.import_module(name)
    except ModuleNotFoundError as exc:
        # 조각 모듈 자신이 없을 때만 건너뛴다. 조각이 import 하는 다른 이름이
        # 없어서 난 실패까지 삼키면 빈 CSV 가 조용히 나온다.
        if exc.name in {name, f"scripts.demo_seed.{part}"}:
            raise MissingPart(part) from exc
        raise
    build = getattr(module, "build", None)
    if build is None:
        raise MissingPart(part)
    tables = build()
    unknown = set(tables) - set(TABLE_COLUMNS)
    if unknown:
        raise KeyError(f"{part}: 계약에 없는 표 {sorted(unknown)}")
    return {table: list(rows) for table, rows in tables.items() if rows}


# ============================================================ 합치기
def merge_parts(
    parts: Mapping[str, Mapping[str, Sequence[Mapping[str, Any]]]],
    order: Sequence[str] = PART_ORDER,
) -> dict[str, list[Mapping[str, Any]]]:
    """조각을 ``LOAD_ORDER`` 순서의 표별 행 목록으로 편다. 순수 함수다.

    바깥 순서는 적재 순서, 안쪽 순서는 ``order`` 가 준 조각 순서다. 행이 하나도
    없는 표는 결과에 담지 않는다.
    """
    merged: dict[str, list[Mapping[str, Any]]] = {}
    for table in LOAD_ORDER:
        rows: list[Mapping[str, Any]] = []
        for part in order:
            rows.extend(parts.get(part, {}).get(table, ()))
        if rows:
            merged[table] = rows
    return merged


def find_duplicates(
    parts: Mapping[str, Mapping[str, Sequence[Mapping[str, Any]]]],
    order: Sequence[str] = PART_ORDER,
) -> list[str]:
    """조각을 가로질러 기본키가 겹친 자리를 찾는다. 순수 함수다.

    한 줄이 표 하나의 한 키를 말한다. 어느 조각끼리 겹쳤는지를 반드시 적는다.
    """
    problems: list[str] = []
    for table in LOAD_ORDER:
        seen: dict[tuple[Any, ...], list[str]] = defaultdict(list)
        for part in order:
            for row in parts.get(part, {}).get(table, ()):
                seen[key_of(table, row)].append(part)
        for key, owners in seen.items():
            if len(owners) <= 1:
                continue
            shown = ", ".join(str(value) for value in key)
            problems.append(f"{table}: 키 ({shown}) 가 조각 {' + '.join(owners)} 에서 겹친다")
    return problems


def write_merged(
    root: Path, merged: Mapping[str, Sequence[Mapping[str, Any]]]
) -> dict[str, int]:
    """표별 CSV 를 ``<root>/<table>.csv`` 로 쓴다. 적재 순서를 지킨다."""
    counts: dict[str, int] = {}
    for table in LOAD_ORDER:
        rows = merged.get(table)
        if not rows:
            continue
        counts[table] = write_table(root / f"{table}.csv", table, rows)
    return counts


# ============================================================ 그래프 식별자 정규화
#
# 조각마다 `nd_demo_<job>_0001` 처럼 손으로 지은 node_id 를 쓰면 같은 참조 노드를
# 아홉 번 만든다. `knowledge_nodes` 의 유일 제약은
# `(graph_layer, node_type, ref_table, ref_id, ontology_version)` (docs/erd.md 8.2)
# 이므로 그 조합이 겹치는 순간 적재가 통째로 되돌아간다. 정본은
# `src/careersignal/graph/identifiers.py` 의 `node_identifier`·`edge_identifier` 다.
# 조각을 합친 뒤 CSV 를 쓰기 전에 모든 식별자를 정본 함수로 다시 계산하고, 같은
# 식별자로 모인 행을 하나로 접는다. 조각 모듈은 손대지 않는다.

GRAPH_TABLES: tuple[str, ...] = ("knowledge_nodes", "knowledge_edges", "graph_paths")
"""정규화가 손대는 세 표. 행 수 변화를 이 차례로 찍는다."""

NODE_KEY_COLUMNS: tuple[str, ...] = (
    "graph_layer", "node_type", "ref_table", "ref_id", "ontology_version",
)
"""`knowledge_nodes` 의 유일 제약 컬럼이자 `node_identifier` 의 재료."""

PATH_KEY_COLUMNS: tuple[str, ...] = (
    "path_type", "node_sequence", "edge_sequence", "taxonomy_version_id",
    "knowledge_version", "analysis_version", "graph_policy_version",
)
"""정규화 뒤 `graph_paths` 의 같은 행을 가려내는 기준."""

_TOKEN = re.compile(r"[A-Za-z0-9_-]+")
"""셀 안에서 식별자 모양의 토막을 뽑는 무늬. 옛 식별자 잔재를 훑을 때 쓴다."""


def parse_array_literal(value: object) -> list[str]:
    """PostgreSQL text[] 리터럴(`{a,b,c}`)을 원소 목록으로 편다.

    조각이 파이썬 열을 그대로 준 경우도 받는다. `array_literal` 의 역이며,
    큰따옴표로 감싼 원소와 역슬래시 이스케이프를 되돌린다.
    """
    if value is None:
        return []
    if not isinstance(value, str):
        return [str(item) for item in value]
    text = value.strip()
    if not (text.startswith("{") and text.endswith("}")):
        raise ValueError(f"배열 리터럴이 아니다: {value!r}")
    body = text[1:-1]
    if body == "":
        return []
    items: list[str] = []
    buffer: list[str] = []
    quoted = False
    escaped = False
    for char in body:
        if escaped:
            buffer.append(char)
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == '"':
            quoted = not quoted
        elif char == "," and not quoted:
            items.append("".join(buffer))
            buffer = []
        else:
            buffer.append(char)
    items.append("".join(buffer))
    return items


def remap_sequence(value: object, mapping: Mapping[str, str]) -> str:
    """배열 리터럴의 원소마다 대응표를 적용해 다시 리터럴로 만든다.

    대응표에 없는 원소는 그대로 둔다. 남았는지는 자기검사가 잡는다.
    """
    return array_literal(
        mapping.get(item, item) for item in parse_array_literal(value)
    )


def normalize_nodes(
    rows: Sequence[Mapping[str, Any]],
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """노드마다 `node_identifier` 로 id 를 다시 계산하고 첫 행만 남긴다.

    돌려주는 것은 (남은 행, 옛 id → 새 id) 다. 순수 함수이며 원본 행을 바꾸지 않는다.
    """
    kept: list[dict[str, Any]] = []
    mapping: dict[str, str] = {}
    seen: set[str] = set()
    for row in rows:
        material = tuple(str(row.get(column) or "") for column in NODE_KEY_COLUMNS)
        new_id = node_identifier(*material)
        mapping[str(row["node_id"])] = new_id
        if new_id in seen:
            continue
        seen.add(new_id)
        kept.append({**row, "node_id": new_id})
    return kept, mapping


def normalize_edges(
    rows: Sequence[Mapping[str, Any]], node_map: Mapping[str, str]
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """두 끝점을 새 노드 id 로 바꾸고 `edge_identifier` 로 id 를 다시 계산한다.

    `taxonomy_version_id` 가 비면 그대로 `None` 을 넘긴다. 정본이 빈 문자열로
    바꿔 재료에 넣는다. 돌려주는 것은 (남은 행, 옛 id → 새 id) 다.
    """
    kept: list[dict[str, Any]] = []
    mapping: dict[str, str] = {}
    seen: set[str] = set()
    for row in rows:
        src = str(row["src_node_id"])
        dst = str(row["dst_node_id"])
        src = node_map.get(src, src)
        dst = node_map.get(dst, dst)
        taxonomy = row.get("taxonomy_version_id") or None
        new_id = edge_identifier(
            str(row.get("graph_layer") or ""),
            str(row.get("edge_type") or ""),
            src,
            dst,
            str(row.get("ontology_version") or ""),
            str(taxonomy) if taxonomy is not None else None,
        )
        mapping[str(row["edge_id"])] = new_id
        if new_id in seen:
            continue
        seen.add(new_id)
        kept.append({**row, "edge_id": new_id, "src_node_id": src, "dst_node_id": dst})
    return kept, mapping


def normalize_paths(
    rows: Sequence[Mapping[str, Any]],
    node_map: Mapping[str, str],
    edge_map: Mapping[str, str],
) -> list[dict[str, Any]]:
    """경로의 두 배열을 원소 단위로 대응시키고 같아진 행을 하나로 접는다."""
    kept: list[dict[str, Any]] = []
    seen: set[tuple[Any, ...]] = set()
    for row in rows:
        moved = {
            **row,
            "node_sequence": remap_sequence(row.get("node_sequence"), node_map),
            "edge_sequence": remap_sequence(row.get("edge_sequence"), edge_map),
        }
        key = tuple(moved.get(column) for column in PATH_KEY_COLUMNS)
        if key in seen:
            continue
        seen.add(key)
        kept.append(moved)
    return kept


def _cell_text(value: object) -> str:
    """한 칸을 훑기 좋은 문자열로 편다. jsonb·배열도 통째로 문자열이 된다."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple, dict)):
        return json.dumps(value, ensure_ascii=False, default=str)
    return str(value)


def stale_identifier_leaks(
    merged: Mapping[str, Sequence[Mapping[str, Any]]], stale: Mapping[str, str]
) -> list[str]:
    """합친 표 전부를 훑어 옛 식별자가 남은 자리를 찾는다.

    노드·엣지 밖의 표가 옛 id 를 들고 있으면 정규화가 반쪽이다. 조용히 넘기지
    않고 표·컬럼·값을 그대로 적어 돌려준다.
    """
    problems: list[str] = []
    for table in LOAD_ORDER:
        for index, row in enumerate(merged.get(table, ())):
            for column, value in row.items():
                text = _cell_text(value)
                if not text:
                    continue
                for token in _TOKEN.findall(text):
                    if token in stale:
                        problems.append(
                            f"{table}[{index}].{column}: 옛 식별자 {token} 이 남았다"
                            f" (새 값 {stale[token]})"
                        )
    return problems


def check_graph_identifiers(
    merged: Mapping[str, Sequence[Mapping[str, Any]]],
) -> list[str]:
    """정규화 뒤 그래프 세 표가 스스로 앞뒤가 맞는지 본다."""
    nodes = merged.get("knowledge_nodes", ())
    edges = merged.get("knowledge_edges", ())
    paths = merged.get("graph_paths", ())
    problems: list[str] = []

    natural: dict[tuple[Any, ...], int] = defaultdict(int)
    for row in nodes:
        natural[tuple(row.get(column) for column in NODE_KEY_COLUMNS)] += 1
    duplicated = sorted(key for key, count in natural.items() if count > 1)
    for key in duplicated[:10]:
        problems.append(
            f"knowledge_nodes: 자연키 ({', '.join(str(part) for part in key)}) 가"
            f" {natural[key]}번 나온다"
        )
    if len(duplicated) > 10:
        problems.append(f"knowledge_nodes: 자연키 중복 … 외 {len(duplicated) - 10}건")

    node_ids = {str(row["node_id"]) for row in nodes}
    edge_ids = {str(row["edge_id"]) for row in edges}

    for row in edges:
        for column in ("src_node_id", "dst_node_id"):
            if str(row[column]) not in node_ids:
                problems.append(
                    f"knowledge_edges[{row['edge_id']}].{column}:"
                    f" {row[column]} 가 knowledge_nodes 에 없다"
                )

    for row in paths:
        sequence_nodes = parse_array_literal(row.get("node_sequence"))
        sequence_edges = parse_array_literal(row.get("edge_sequence"))
        if len(sequence_edges) != len(sequence_nodes) - 1:
            problems.append(
                f"graph_paths[{row['path_id']}]: 엣지 {len(sequence_edges)}개가"
                f" 노드 {len(sequence_nodes)}개와 맞지 않는다"
            )
        for item in sequence_nodes:
            if item not in node_ids:
                problems.append(
                    f"graph_paths[{row['path_id']}]: 노드 {item} 가 표에 없다"
                )
        for item in sequence_edges:
            if item not in edge_ids:
                problems.append(
                    f"graph_paths[{row['path_id']}]: 엣지 {item} 가 표에 없다"
                )

    for identifier in sorted(node_ids):
        if not identifier.startswith(NODE_PREFIX):
            problems.append(f"knowledge_nodes: {identifier} 에 {NODE_PREFIX} 접두사가 없다")
    for identifier in sorted(edge_ids):
        if not identifier.startswith(EDGE_PREFIX):
            problems.append(f"knowledge_edges: {identifier} 에 {EDGE_PREFIX} 접두사가 없다")
    return problems


def normalize_graph_identifiers(
    merged: Mapping[str, Sequence[Mapping[str, Any]]],
) -> tuple[dict[str, list[Mapping[str, Any]]], list[str]]:
    """합친 표의 그래프 식별자를 정본으로 갈아 끼운다. 순수 함수다.

    돌려주는 것은 (새 표 묶음, 사유 목록) 이다. 사유가 비지 않으면 부르는 쪽이
    파일을 쓰지 않고 실패로 끝낸다.
    """
    result: dict[str, list[Mapping[str, Any]]] = {
        table: list(rows) for table, rows in merged.items()
    }
    if "knowledge_nodes" not in result:
        return result, []

    nodes, node_map = normalize_nodes(result["knowledge_nodes"])
    result["knowledge_nodes"] = list(nodes)

    edge_map: dict[str, str] = {}
    if "knowledge_edges" in result:
        edges, edge_map = normalize_edges(result["knowledge_edges"], node_map)
        result["knowledge_edges"] = list(edges)

    if "graph_paths" in result:
        result["graph_paths"] = list(
            normalize_paths(result["graph_paths"], node_map, edge_map)
        )

    stale = {
        old: new
        for old, new in (*node_map.items(), *edge_map.items())
        if old != new
    }
    problems = stale_identifier_leaks(result, stale)
    problems.extend(check_graph_identifiers(result))
    return result, problems


# ============================================================ 공고 범위 전략·로드맵 파생
#
# 직무 조각은 `strategy`·`roadmap` 을 overall 1행 + cluster 6행까지만 만든다. 화면에서
# 개별 공고를 고르면 Express 가 기업군 행으로 떨어뜨려 늘 "이 공고의 개별 결과가 없어
# 기업군 기준을 보여 줍니다" 가 뜬다. 규칙을 아홉 직무 모듈에 흩어 두면 직무마다
# 달라지므로, 조각을 합치는 여기서 한 번에 파생한다. 조각 모듈은 손대지 않는다.
#
# 재료는 셋이다. 그 공고가 속한 기업군의 strategy·roadmap payload(바탕), 그 공고
# interpretation payload 의 `deviations`(차별점), 그 공고의 회사명·제목(문장에 쓸 이름).
# `generated_at` 은 기업군 행의 값을 그대로 물려받는다. 새 시각을 만들면 다시 돌릴 때마다
# CSV 가 바뀌어 재실행 결정성이 깨진다.

DERIVED_TABLES: tuple[str, ...] = (
    "analysis_outputs",
    "checklist_items",
    "roadmap_items",
    "roadmap_item_fills",
    "study_tracks",
)
"""파생이 행을 더하는 표. `analysis_claims` 는 늘리지 않는다."""

TARGET_POSTING_COUNT = 30
TARGET_POSTING_OUTPUT_COUNT = 30
ALLOWED_POSTING_COUNTS: frozenset[int] = frozenset({15, TARGET_POSTING_COUNT})
ALLOWED_POSTING_OUTPUT_COUNTS: frozenset[int] = frozenset({9, TARGET_POSTING_OUTPUT_COUNT})
"""병렬 전환 중 허용하는 기존 15건·목표 30건 상태와 공고 범위 해석 수."""


def expected_output_counts(posting_count: int) -> dict[str, int]:
    """공고 범위 수에서 직무별 산출물 종류별 계약 행 수를 계산한다.

    직무 조각은 overall 1행·기업군 6행을 공통으로 만들고, 대상 공고마다
    interpretation 1행을 만든다. 합치기는 같은 공고마다 strategy·roadmap 1행씩을
    파생하므로 세 종류의 행 수가 모두 ``7 + posting_count`` 다.
    """
    scoped = 7 + posting_count
    return {
        "statistics": 1,
        "interpretation": scoped,
        "strategy": scoped,
        "roadmap": scoped,
    }


def expected_output_total(posting_count: int) -> int:
    """공고 범위 수에 대응하는 직무별 `analysis_outputs` 전체 행 수."""
    return sum(expected_output_counts(posting_count).values())


def posting_count_problem(
    job: str, posting_count: int, *, allow_transition: bool = True
) -> str | None:
    """직무별 공고 범위가 전환 중 허용 상태와 다르면 실패 사유를 낸다."""
    allowed_counts = (
        ALLOWED_POSTING_OUTPUT_COUNTS
        if allow_transition
        else frozenset({TARGET_POSTING_OUTPUT_COUNT})
    )
    if posting_count in allowed_counts:
        return None
    if not allow_transition:
        return (
            f"{job}: posting 범위 interpretation 이 {posting_count}행이다 "
            f"(최종 기대값 {TARGET_POSTING_OUTPUT_COUNT})"
        )
    allowed = "·".join(str(value) for value in sorted(allowed_counts))
    return (
        f"{job}: posting 범위 interpretation 이 {posting_count}행이다 "
        f"(전환 중 허용값 {allowed})"
    )


def check_posting_inventory(
    job: str, tables: Mapping[str, Sequence[Mapping[str, Any]]]
) -> list[str]:
    """30건 목표 상태의 기간·기업군·진행 상태와 공고 산출물 대응을 검사한다."""
    versions = list(tables.get("posting_versions", ()))
    if not versions:
        return []
    if len(versions) not in ALLOWED_POSTING_COUNTS:
        allowed = "·".join(str(value) for value in sorted(ALLOWED_POSTING_COUNTS))
        return [f"{job}: 공고가 {len(versions)}건이다 (전환 중 허용값 {allowed})"]
    if len(versions) == 15:
        return []

    recent = [
        row
        for row in versions
        if "2026-01-01" <= str(row["posted_at"])[:10] <= "2026-06-30"
    ]
    previous = [
        row
        for row in versions
        if "2024-03-01" <= str(row["posted_at"])[:10] <= "2025-11-30"
    ]
    def is_open(row: Mapping[str, Any]) -> bool:
        return row.get("closed_at") in (None, "", r"\N")

    open_rows = [row for row in versions if is_open(row)]
    recent_open = [row for row in recent if is_open(row)]

    problems: list[str] = []
    expected_counts = (
        ("recent", len(recent), 18),
        ("prev", len(previous), 12),
        ("진행 중", len(open_rows), 6),
        ("마감", len(versions) - len(open_rows), 24),
        ("recent 진행 중", len(recent_open), 6),
        ("recent 마감", len(recent) - len(recent_open), 12),
        ("prev 마감", sum(not is_open(row) for row in previous), 12),
    )
    for label, actual, expected in expected_counts:
        if actual != expected:
            problems.append(f"{job}: {label} {actual}건이다 ({expected}건이어야 한다)")

    interpretations = {
        str(row["scope_id"]): str(row.get("payload", {}).get("scope", {}).get("cluster_tag"))
        for row in tables.get("analysis_outputs", ())
        if row.get("output_type") == "interpretation" and row.get("scope_level") == "posting"
    }
    version_ids = {str(row["posting_id"]) for row in versions}
    if set(interpretations) != version_ids:
        problems.append(
            f"{job}: 공고 30건과 posting interpretation 식별자 집합이 다르다"
        )

    for label, rows, expected_per_cluster in (
        ("recent", recent, 3),
        ("prev", previous, 2),
    ):
        clusters = Counter(interpretations.get(str(row["posting_id"])) for row in rows)
        if len(clusters) != 6 or set(clusters.values()) != {expected_per_cluster}:
            problems.append(
                f"{job}: {label} 기업군 분포가 {dict(clusters)}다 "
                f"(6개 기업군 각각 {expected_per_cluster}건이어야 한다)"
            )
    return problems

_STEP_LABEL = re.compile(r"STEP\s*0*(\d+)")
"""`STEP 01 · 3주` 처럼 단계 번호를 품은 라벨에서 번호를 집는 무늬."""

UNIQUE_KEYS: dict[str, tuple[str, ...]] = {
    "checklist_items": ("analysis_version", "scope_level", "scope_id", "concept_id"),
    "roadmap_items": ("analysis_version", "scope_level", "scope_id", "step_order"),
    "study_tracks": ("analysis_version", "scope_level", "scope_id", "capability_id"),
}
"""기본키가 아닌 유일 제약. `0001_initial_schema.sql` 의 UNIQUE 선언과 같다."""


def _concept_slug(job: str, concept_id: str) -> str:
    """`cc_<job>_<slug>` 에서 slug 만 뽑는다. 접두사가 없으면 통째로 쓴다."""
    prefix = f"cc_{job}_"
    return concept_id[len(prefix):] if concept_id.startswith(prefix) else concept_id


def _capability_slug(job: str, capability_id: str) -> str:
    """`cap_<job>_<slug>` 에서 slug 만 뽑는다."""
    prefix = f"cap_{job}_"
    return capability_id[len(prefix):] if capability_id.startswith(prefix) else capability_id


def deviation_reason(company: str, evidence: str) -> str:
    """편차 항목의 사유를 그 공고를 근거로 다시 쓴다.

    편차 근거 문장 자체가 큰따옴표를 품고 있는 경우가 있어 안쪽 따옴표는 작은따옴표로
    바꾼다. 인용 부호가 겹쳐 문장이 어디서 끊기는지 읽히지 않는 일을 막는다.
    """
    quoted = str(evidence).replace('"', "'").strip()
    return f'{company} 공고가 "{quoted}" 를 요구합니다. 기업군 기준보다 앞당겨 준비합니다.'


def deviation_concepts(
    job: str,
    cluster_checklist: Sequence[Mapping[str, Any]],
    deviations: Sequence[Mapping[str, Any]],
) -> list[tuple[int, str, Mapping[str, Any]]]:
    """공고 편차를 기업군 체크리스트 항목에 잇는다. 순수 함수다.

    돌려주는 것은 (편차 순번, `concept_id`, 편차) 의 열이다. 잇는 길은 둘이다.
    먼저 기업군 전략이 이미 `dev_n` 으로 표시한 항목을 순번으로 맞춘다(직무마다
    편차 slug 와 개념 slug 가 다르게 지어져 있어 이름만으로는 맞출 수 없다).
    그 순번에 표시가 없으면 `cc_<job>_<편차 item_id>` 가 체크리스트에 있는지 본다.
    둘 다 아니면 대응하는 항목이 없다는 뜻이라 건너뛴다.
    """
    known = {str(item["item_id"]) for item in cluster_checklist}
    by_dev_n = {
        item.get("dev_n"): str(item["item_id"])
        for item in cluster_checklist
        if item.get("is_deviation")
    }
    matched: list[tuple[int, str, Mapping[str, Any]]] = []
    taken: set[str] = set()
    for order, deviation in enumerate(deviations, 1):
        concept = by_dev_n.get(order)
        if concept is None:
            direct = f"cc_{job}_{deviation['item_id']}"
            concept = direct if direct in known else None
        if concept is None or concept in taken:
            continue
        taken.add(concept)
        matched.append((order, concept, deviation))
    return matched


def derive_posting_strategy(
    job: str,
    cluster_payload: Mapping[str, Any],
    interpretation: Mapping[str, Any],
    posting_id: str,
) -> tuple[dict[str, Any], list[tuple[int, str, Mapping[str, Any]]]]:
    """기업군 전략 payload 에서 공고 범위 전략 payload 를 만든다. 순수 함수다.

    편차에 해당하는 체크리스트 항목을 앞으로 끌어올리고 `is_deviation`·`dev_n` 을
    그 공고 해석에 맞춘다. 편차와 무관한 항목은 순서만 뒤로 밀릴 뿐 그대로 둔다.
    항목을 지우지 않는다.
    """
    payload = json.loads(json.dumps(cluster_payload, ensure_ascii=False))
    scope = interpretation["scope"]
    company = interpretation["posting"]["company"]
    promoted = deviation_concepts(job, payload["checklist"], interpretation["deviations"])

    by_id = {str(item["item_id"]): item for item in payload["checklist"]}
    head: list[dict[str, Any]] = []
    for order, concept, deviation in promoted:
        item = by_id[concept]
        item["is_deviation"] = True
        item["dev_n"] = order
        item["reason"] = deviation_reason(company, deviation.get("evidence", ""))
        head.append(item)
    promoted_ids = {concept for _, concept, _ in promoted}
    rest = [item for item in payload["checklist"] if str(item["item_id"]) not in promoted_ids]

    payload["job"] = job
    payload["scope"] = {
        "level": "posting",
        "cluster_tag": scope["cluster_tag"],
        "posting_id": posting_id,
    }
    payload["checklist"] = head + rest
    return payload, promoted


def _renumber_phase(label: object, step_order: int) -> object:
    """`STEP 01 · 3주` 의 번호만 새 단계 번호로 바꾼다. 번호가 없으면 그대로 둔다."""
    if not isinstance(label, str):
        return label
    return _STEP_LABEL.sub(f"STEP {step_order:02d}", label, count=1)


def derive_posting_roadmap(
    job: str,
    cluster_payload: Mapping[str, Any],
    strategy_payload: Mapping[str, Any],
    interpretation: Mapping[str, Any],
    promoted: Sequence[tuple[int, str, Mapping[str, Any]]],
    posting_id: str,
) -> dict[str, Any]:
    """기업군 로드맵 payload 에서 공고 범위 로드맵 payload 를 만든다. 순수 함수다.

    편차를 채우는 단계를 앞으로 당기고 `n` 과 `STEP nn` 을 다시 매긴다. `check_rows`
    는 같은 공고 전략의 체크리스트를 그대로 따라가므로 두 `item_id` 집합이 항상 같다.
    """
    payload = json.loads(json.dumps(cluster_payload, ensure_ascii=False))
    company = interpretation["posting"]["company"]
    rank_of = {concept: order for order, concept, _ in promoted}
    deviation_of = {concept: deviation for _, concept, deviation in promoted}

    def step_rank(step: Mapping[str, Any]) -> int | None:
        """그 단계가 채우는 편차 중 가장 앞선 순번. 편차를 안 채우면 ``None``."""
        orders = [
            rank_of[str(fill["item_id"])]
            for fill in step.get("fills", ())
            if str(fill["item_id"]) in rank_of
        ]
        return min(orders) if orders else None

    steps = list(payload.get("project_steps", ()))
    ranked = [(step, step_rank(step)) for step in steps]
    # 편차를 채우는 단계가 먼저, 그 안에서는 편차 순번 순. 나머지는 원래 차례를 지킨다.
    ranked.sort(key=lambda pair: (pair[1] is None, pair[1] or 0))

    old_to_new: dict[int, int] = {}
    for step_order, (step, rank) in enumerate(ranked, 1):
        old_to_new[int(step["n"])] = step_order
        step["n"] = step_order
        step["phase"] = _renumber_phase(step.get("phase"), step_order)
        if rank is None:
            continue
        concept = next(item for item in rank_of if rank_of[item] == rank)
        deviation = deviation_of[concept]
        step["reason_title"] = f"{company} 공고가 앞당긴 단계입니다"
        step["reason"] = deviation_reason(company, deviation.get("evidence", ""))
        for fill in step.get("fills", ()):
            if str(fill["item_id"]) in rank_of:
                fill["kind"] = "dev"
    payload["project_steps"] = [step for step, _ in ranked]

    # 개념마다 그 개념을 처음 채우는 새 단계 번호. 표에 적을 `source_step` 이 된다.
    first_step: dict[str, int] = {}
    for step in payload["project_steps"]:
        for fill in step.get("fills", ()):
            first_step.setdefault(str(fill["item_id"]), int(step["n"]))

    base_rows = {str(row["item_id"]): row for row in payload.get("check_rows", ())}
    rows: list[dict[str, Any]] = []
    for item in strategy_payload["checklist"]:
        concept = str(item["item_id"])
        base = base_rows.get(concept, {})
        if concept in first_step:
            source_step = f"STEP {first_step[concept]:02d}"
        else:
            # 단계가 아니라 `상시`·`병행` 처럼 적힌 자리는 문구를 그대로 두고
            # 번호만 새 차례로 옮긴다.
            source_step = base.get("source_step", "상시")
            if isinstance(source_step, str):
                source_step = _STEP_LABEL.sub(
                    lambda match: f"STEP {old_to_new.get(int(match.group(1)), int(match.group(1))):02d}",
                    source_step,
                )
        rows.append(
            {
                "item_id": concept,
                "title": base.get("title", item.get("title")),
                "kind": base.get("kind", item.get("kind")),
                "is_deviation": bool(item.get("is_deviation")),
                "dev_n": item.get("dev_n"),
                "required": bool(item.get("required")),
                "source_step": source_step,
            }
        )
    payload["check_rows"] = rows

    payload["job"] = job
    payload["scope"] = dict(strategy_payload["scope"])
    return payload


def _scoped(rows: Sequence[Mapping[str, Any]], level: str, scope_id: str) -> list[Mapping[str, Any]]:
    """한 범위의 행만 고른다."""
    return [
        row
        for row in rows
        if row.get("scope_level") == level and row.get("scope_id") == scope_id
    ]


def derive_posting_rows(
    job: str, tables: Mapping[str, Sequence[Mapping[str, Any]]]
) -> dict[str, list[dict[str, Any]]]:
    """직무 조각 하나에서 공고 범위 전략·로드맵과 정규화 행을 만든다. 순수 함수다.

    돌려주는 것은 더할 행만 담은 표 묶음이다. 원본 조각을 바꾸지 않는다.
    """
    outputs = list(tables.get("analysis_outputs", ()))
    added: dict[str, list[dict[str, Any]]] = {table: [] for table in DERIVED_TABLES}
    if not outputs:
        return added

    interpretations = {
        str(row["scope_id"]): row
        for row in outputs
        if row["output_type"] == "interpretation" and row["scope_level"] == "cluster"
    }
    strategies = {
        str(row["scope_id"]): row
        for row in outputs
        if row["output_type"] == "strategy" and row["scope_level"] == "cluster"
    }
    roadmaps = {
        str(row["scope_id"]): row
        for row in outputs
        if row["output_type"] == "roadmap" and row["scope_level"] == "cluster"
    }
    # 공고 해석은 기업군을 표시명(`cluster_tag`)으로만 들고 있다. 기업군 해석 행이
    # 표시명과 `cluster_id` 를 함께 들고 있으므로 그 둘로 되짚는다.
    cluster_of_tag = {
        str(row["payload"]["scope"]["cluster_tag"]): scope_id
        for scope_id, row in interpretations.items()
    }

    for row in outputs:
        if row["output_type"] != "interpretation" or row["scope_level"] != "posting":
            continue
        posting_id = str(row["scope_id"])
        interpretation = row["payload"]
        cluster_id = cluster_of_tag.get(str(interpretation["scope"]["cluster_tag"]))
        if cluster_id is None or cluster_id not in strategies or cluster_id not in roadmaps:
            continue

        strategy_row = strategies[cluster_id]
        roadmap_row = roadmaps[cluster_id]
        strategy_payload, promoted = derive_posting_strategy(
            job, strategy_row["payload"], interpretation, posting_id
        )
        roadmap_payload = derive_posting_roadmap(
            job, roadmap_row["payload"], strategy_payload, interpretation, promoted, posting_id
        )

        added["analysis_outputs"].append(
            {
                **strategy_row,
                "output_id": f"out_demo_{job}_strat_{posting_id}",
                "scope_level": "posting",
                "scope_id": posting_id,
                "payload": strategy_payload,
            }
        )
        added["analysis_outputs"].append(
            {
                **roadmap_row,
                "output_id": f"out_demo_{job}_road_{posting_id}",
                "scope_level": "posting",
                "scope_id": posting_id,
                "payload": roadmap_payload,
            }
        )

        # ---- 정규화 행. 기업군 행을 바탕으로 식별자만 공고 범위로 바꾼다.
        base_items = {
            str(item["concept_id"]): item
            for item in _scoped(tables.get("checklist_items", ()), "cluster", cluster_id)
        }
        for item in strategy_payload["checklist"]:
            concept = str(item["item_id"])
            base = base_items.get(concept)
            if base is None:
                continue
            slug = _concept_slug(job, concept)
            added["checklist_items"].append(
                {
                    **base,
                    "item_id": f"ci_demo_{job}_{posting_id}_{slug}",
                    "scope_level": "posting",
                    "scope_id": posting_id,
                    "reason": item["reason"],
                    "required": bool(item.get("required")),
                    "is_deviation": bool(item.get("is_deviation")),
                }
            )

        base_steps = {
            int(step["step_order"]): step
            for step in _scoped(tables.get("roadmap_items", ()), "cluster", cluster_id)
        }
        fills_of = defaultdict(list)
        for fill in tables.get("roadmap_item_fills", ()):
            fills_of[str(fill["roadmap_item_id"])].append(fill)
        for step in roadmap_payload["project_steps"]:
            step_order = int(step["n"])
            new_id = f"ri_demo_{job}_{posting_id}_{step_order}"
            base = base_steps.get(step_order, {})
            added["roadmap_items"].append(
                {
                    **base,
                    "roadmap_item_id": new_id,
                    "scope_level": "posting",
                    "scope_id": posting_id,
                    "step_order": step_order,
                    "phase_label": step.get("phase"),
                    "weeks": step.get("weeks", base.get("weeks")),
                    "priority": step.get("priority", base.get("priority")),
                    "title": step.get("title", base.get("title")),
                    "body": step.get("body", base.get("body")),
                    "deliverable": step.get("deliverable", base.get("deliverable")),
                    "reason": step.get("reason", base.get("reason")),
                    "tags": step.get("tags", base.get("tags")),
                }
            )
            for fill in step.get("fills", ()):
                added["roadmap_item_fills"].append(
                    {
                        "roadmap_item_id": new_id,
                        "concept_id": str(fill["item_id"]),
                        "fill_kind": fill.get("kind", "normal"),
                    }
                )

        for track in _scoped(tables.get("study_tracks", ()), "cluster", cluster_id):
            slug = _capability_slug(job, str(track["capability_id"]))
            added["study_tracks"].append(
                {
                    **track,
                    "track_id": f"st_demo_{job}_{posting_id}_{slug}",
                    "scope_level": "posting",
                    "scope_id": posting_id,
                }
            )

    return added


def derive_posting_scopes(
    parts: dict[str, dict[str, list[dict[str, Any]]]],
    order: Sequence[str] = JOB_PARTS,
) -> dict[str, int]:
    """직무 조각마다 공고 범위 행을 만들어 제자리에 더한다.

    조각 모듈을 고치지 않고 여기서 한 번에 파생하므로 규칙이 아홉 곳으로 흩어지지
    않는다. 돌려주는 것은 표별로 더한 행 수다.
    """
    totals: dict[str, int] = defaultdict(int)
    for part in order:
        tables = parts.get(part)
        if not tables:
            continue
        added = derive_posting_rows(part, tables)
        for table, rows in added.items():
            if not rows:
                continue
            tables.setdefault(table, []).extend(rows)
            totals[table] += len(rows)
    return dict(totals)


def check_posting_scopes(
    parts: Mapping[str, Mapping[str, Sequence[Mapping[str, Any]]]],
    order: Sequence[str] = JOB_PARTS,
    *,
    allow_transition: bool = True,
) -> list[str]:
    """파생 결과가 계약과 맞는지 스스로 본다. 어긋난 사유를 그대로 돌려준다."""
    problems: list[str] = []
    jobs = [part for part in order if parts.get(part, {}).get("analysis_outputs")]

    for job in jobs:
        tables = parts[job]
        problems.extend(check_posting_inventory(job, tables))
        outputs = list(tables.get("analysis_outputs", ()))
        posting_count = sum(
            1
            for row in outputs
            if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
        )
        count_problem = posting_count_problem(
            job, posting_count, allow_transition=allow_transition
        )
        if count_problem:
            problems.append(count_problem)
        expected_counts = expected_output_counts(posting_count)
        expected_total = expected_output_total(posting_count)

        # 1. 직무당 행 수
        if len(outputs) != expected_total:
            problems.append(
                f"{job}: analysis_outputs 가 {len(outputs)}행이다 ({expected_total}행이어야 한다)"
            )
        counted: dict[str, int] = defaultdict(int)
        for row in outputs:
            counted[str(row["output_type"])] += 1
        for output_type, expected in expected_counts.items():
            if counted.get(output_type, 0) != expected:
                problems.append(
                    f"{job}: {output_type} 가 {counted.get(output_type, 0)}행이다 ({expected}행이어야 한다)"
                )

        strategies = {
            str(row["scope_id"]): row["payload"]
            for row in outputs
            if row["output_type"] == "strategy" and row["scope_level"] == "posting"
        }
        roadmaps = {
            str(row["scope_id"]): row["payload"]
            for row in outputs
            if row["output_type"] == "roadmap" and row["scope_level"] == "posting"
        }

        for row in outputs:
            if row["scope_level"] != "posting" or row["output_type"] not in {"strategy", "roadmap"}:
                continue
            # 4. payload 의 범위와 행의 범위가 같다
            scope = row["payload"].get("scope", {})
            if scope.get("posting_id") != row["scope_id"]:
                problems.append(
                    f"{job}/{row['output_id']}: payload 의 posting_id {scope.get('posting_id')} 가"
                    f" 행의 scope_id {row['scope_id']} 와 다르다"
                )
            if scope.get("level") != "posting":
                problems.append(
                    f"{job}/{row['output_id']}: payload 의 scope.level 이 {scope.get('level')} 이다"
                )

        # 2. 전략의 체크리스트 집합 == 로드맵의 check_rows 집합
        for posting_id, strategy in strategies.items():
            roadmap = roadmaps.get(posting_id)
            if roadmap is None:
                problems.append(f"{job}/{posting_id}: 전략만 있고 로드맵이 없다")
                continue
            left = {str(item["item_id"]) for item in strategy.get("checklist", ())}
            right = {str(row["item_id"]) for row in roadmap.get("check_rows", ())}
            if left != right:
                problems.append(
                    f"{job}/{posting_id}: 전략 체크리스트와 로드맵 check_rows 가 다르다"
                    f" (전략만 {sorted(left - right)} · 로드맵만 {sorted(right - left)})"
                )

        # 3. 같은 기업군의 두 공고 payload 가 완전히 같지 않다
        by_cluster: dict[str, list[tuple[str, str]]] = defaultdict(list)
        for posting_id, strategy in strategies.items():
            tag = str(strategy.get("scope", {}).get("cluster_tag"))
            body = json.dumps(
                [strategy, roadmaps.get(posting_id)], ensure_ascii=False, sort_keys=True, default=str
            )
            by_cluster[tag].append((posting_id, body))
        for tag, entries in by_cluster.items():
            seen: dict[str, str] = {}
            for posting_id, body in entries:
                if body in seen:
                    problems.append(
                        f"{job}/{tag}: {seen[body]} 와 {posting_id} 의 payload 가 완전히 같다"
                        " (편차가 반영되지 않았다)"
                    )
                seen[body] = posting_id

        # 5. 범위마다 step_order 가 1부터 빈틈없이 이어진다
        orders: dict[tuple[str, str], list[int]] = defaultdict(list)
        for row in tables.get("roadmap_items", ()):
            orders[(str(row["scope_level"]), str(row["scope_id"]))].append(int(row["step_order"]))
        for (level, scope_id), values in orders.items():
            if sorted(values) != list(range(1, len(values) + 1)):
                problems.append(
                    f"{job}/{level}:{scope_id}: roadmap_items.step_order 가 {sorted(values)} 라"
                    " 1부터 이어지지 않는다"
                )

        # 유일 제약. 기본키 검사가 보지 않는 UNIQUE 선언을 여기서 함께 본다.
        for table, columns in UNIQUE_KEYS.items():
            seen_keys: set[tuple[Any, ...]] = set()
            for row in tables.get(table, ()):
                key = tuple(row.get(column) for column in columns)
                if key in seen_keys:
                    problems.append(f"{job}/{table}: 유일 제약 {columns} 가 {key} 에서 겹친다")
                seen_keys.add(key)

    total = sum(len(parts[job].get("analysis_outputs", ())) for job in jobs)
    expected_grand_total = sum(
        expected_output_total(
            sum(
                1
                for row in parts[job].get("analysis_outputs", ())
                if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
            )
        )
        for job in jobs
    )
    if jobs and total != expected_grand_total:
        problems.append(
            f"analysis_outputs 전체가 {total}행이다 ({expected_grand_total}행이어야 한다)"
        )
    return problems


# ============================================================ 실행
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="데모 시드 조각을 합쳐 테이블별 CSV 를 만든다. DB 에 접속하지 않는다.",
    )
    parser.add_argument(
        "--parts",
        default="",
        help=f"합칠 조각을 쉼표로 좁힌다. 기본은 전부: {','.join(PART_ORDER)}",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="파일을 쓰지 않고 합치기와 중복 검사만 한다",
    )
    parser.add_argument(
        "--final",
        action="store_true",
        help="15건 전환 상태를 허용하지 않고 직무별 30건·산출물 112행만 검사한다",
    )
    return parser.parse_args(argv)


def selected_parts(raw: str) -> list[str]:
    """``--parts`` 를 조각 목록으로 바꾼다. 순서는 항상 `PART_ORDER` 를 따른다."""
    if not raw.strip():
        return list(PART_ORDER)
    wanted = {name.strip() for name in raw.split(",") if name.strip()}
    unknown = wanted - set(PART_ORDER)
    if unknown:
        raise SystemExit(f"모르는 조각: {sorted(unknown)}")
    return [part for part in PART_ORDER if part in wanted]


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    order = selected_parts(args.parts)

    gaps = missing_primary_keys()
    if gaps:
        print(f"[실패] 기본키를 모르는 표: {list(gaps)}")
        return EXIT_FAILED

    parts: dict[str, dict[str, list[dict[str, Any]]]] = {}
    skipped: list[str] = []
    for part in order:
        try:
            parts[part] = load_part(part)
        except MissingPart:
            skipped.append(part)
            continue
        rows = sum(len(value) for value in parts[part].values())
        print(f"[읽음] {part:14s} {len(parts[part]):2d}개 표 · {rows:6d}행")

    if not parts:
        print("[실패] 합칠 조각이 하나도 없다")
        return EXIT_FAILED

    # 공고 범위 전략·로드맵을 파생한다. 중복 검사보다 먼저 해야 더한 행까지 함께 본다.
    derived = derive_posting_scopes(parts, [part for part in order if part in JOB_PARTS])
    if derived:
        print(
            f"\n[파생] 공고 범위 전략 {derived.get('analysis_outputs', 0) // 2}행"
            f" · 로드맵 {derived.get('analysis_outputs', 0) // 2}행"
        )
        print(
            "       "
            + " · ".join(
                f"{table} {count}행"
                for table, count in derived.items()
                if table != "analysis_outputs"
            )
        )
    derived_problems = check_posting_scopes(
        parts,
        [part for part in order if part in JOB_PARTS],
        allow_transition=not args.final,
    )
    if derived_problems:
        print(f"\n[실패] 공고 범위 파생 자기검사 {len(derived_problems)}건")
        for line in derived_problems[:20]:
            print(f"       {line}")
        if len(derived_problems) > 20:
            print(f"       … 외 {len(derived_problems) - 20}건")
        return EXIT_FAILED

    problems = find_duplicates(parts, order)
    if problems:
        print(f"\n[실패] 기본키 중복 {len(problems)}건")
        for line in problems[:20]:
            print(f"       {line}")
        if len(problems) > 20:
            print(f"       … 외 {len(problems) - 20}건")
        return EXIT_FAILED

    merged = merge_parts(parts, order)

    # 그래프 식별자를 정본으로 갈아 끼운다. CSV 를 쓰기 전에 한다.
    before = {table: len(merged.get(table, ())) for table in GRAPH_TABLES}
    merged, graph_problems = normalize_graph_identifiers(merged)
    after = {table: len(merged.get(table, ())) for table in GRAPH_TABLES}
    changed = ", ".join(
        f"{table} {before[table]} → {after[table]}"
        for table in GRAPH_TABLES
        if before[table] or after[table]
    )
    if changed:
        print(f"\n[정규화] {changed}")
    if graph_problems:
        print(f"\n[실패] 그래프 식별자 정규화 {len(graph_problems)}건")
        for line in graph_problems[:20]:
            print(f"       {line}")
        if len(graph_problems) > 20:
            print(f"       … 외 {len(graph_problems) - 20}건")
        return EXIT_FAILED

    root = demo_seed_root()
    if args.check:
        counts = {table: len(rows) for table, rows in merged.items()}
        print("\n[검사] 파일을 쓰지 않았다")
    else:
        counts = write_merged(root, merged)
        print(f"\n[씀] {root}")

    total = sum(counts.values())
    print(f"\n표 {len(counts)}개 · 행 {total}개")
    for table in LOAD_ORDER:
        if table in counts:
            print(f"  {table:38s} {counts[table]:7d}")

    if skipped:
        print(f"\n[건너뜀] 아직 없는 조각 {len(skipped)}개: {', '.join(skipped)}")
        print("         다른 갈래가 작업 중일 수 있다. 조각이 생기면 다시 돌린다.")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
