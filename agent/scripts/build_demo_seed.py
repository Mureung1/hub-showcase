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
import sys
from collections import defaultdict
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.demo_seed._csv import (  # noqa: E402
    LOAD_ORDER,
    TABLE_COLUMNS,
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

    problems = find_duplicates(parts, order)
    if problems:
        print(f"\n[실패] 기본키 중복 {len(problems)}건")
        for line in problems[:20]:
            print(f"       {line}")
        if len(problems) > 20:
            print(f"       … 외 {len(problems) - 20}건")
        return EXIT_FAILED

    merged = merge_parts(parts, order)
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
