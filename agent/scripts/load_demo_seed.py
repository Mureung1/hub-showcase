r"""데모 시드 CSV 를 Supabase 에 적재하고 되돌리는 운영자 도구 (갈래 B17).

``agent/data/demo_seed/CONTRACT.md`` 9.3 의 적재 순서와 컬럼 순서가 기준이다.
``scripts/build_demo_seed.py`` 가 만든 ``agent/data/demo_seed/<table>.csv`` 를 읽는다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/load_demo_seed.py --dry-run     CSV 만 검사한다. 접속하지 않는다
    python scripts/load_demo_seed.py               적재한다
    python scripts/load_demo_seed.py --rollback    생성 데이터만 지운다

적재는 **접속 한 번, 거래 하나**다. 표마다 `COPY ... FROM STDIN` 을 한 번씩 실행한다.
행 단위 INSERT 를 쓰지 않는다. 만 단위 행을 한 줄씩 넣으면 왕복이 실행 시간의 거의
전부가 되고, 중간에 끊기면 절반만 들어간 상태가 남는다. 거래 하나로 묶으면 결과는
전부이거나 전무다.

권한은 `unit_of_work` 를 쓰지 않는다. `src/careersignal/repositories/base.py` 의
`unit_of_work` 는 거래마다 `SET LOCAL ROLE` 로 구성요소 role 로 전환하고,
`migrations/sql/0004_component_grants.sql` 은 어떤 구성요소 role 에도 DELETE 를 주지
않는다. 실행 경로가 지울 수 없는 것이 설계이므로 이 스크립트는 role 전환 없이
`SUPABASE_DB_URL` 소유자 연결로 psycopg 거래를 직접 연다. 근거는
docs/adr/0006-migration-ownership.md 다.

접속 문자열은 `SUPABASE_DB_URL` 환경변수에서만 읽는다. 명령줄로 받지 않는다.

**보호 목록.** 실 데이터 표(`job_roles`·`companies`·`periods` 등)는 쓰지도 지우지도
않는다. 목록은 `PROTECTED_TABLES` 이며 import 시점에 적재 순서·삭제 순서와 겹치지
않는지 검사한다. 겹치면 스크립트가 아예 뜨지 않는다.

**되돌리기 범위.** `dataset_version = 'ds_demo_v1'` 이거나
`analysis_version LIKE 'an_demo_%'` 인 행만 지운다. 두 표시를 갖지 않는 표는 거래
첫머리에 임시 표로 대상 식별자를 모아 두고 그 목록으로만 지운다. 조건 없는 DELETE 가
하나도 없다.

`source_snapshots`·`source_observations`·`agent_runs` 는 추가 전용 트리거가 삭제를
막는다. 되돌리기 동안만 `ALTER TABLE ... DISABLE TRIGGER USER` 로 내리고 `finally`
에서 반드시 다시 올린다.
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from collections.abc import Sequence
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.demo_seed._csv import LOAD_ORDER, TABLE_COLUMNS, demo_seed_root  # noqa: E402

DATASET_VERSION = "ds_demo_v1"
ANALYSIS_VERSION_PATTERN = "an_demo_%"

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_ABORTED = 2


# ============================================================ 보호 목록
PROTECTED_TABLES: frozenset[str] = frozenset(
    {
        "job_roles",
        "companies",
        "company_clusters",
        "company_cluster_memberships",
        "periods",
        "metric_templates",
        "metric_template_parameters",
        "metric_policy_versions",
        "ontology_versions",
        "standards",
    }
)
"""마이그레이션이 소유하는 실 데이터 표. 시드는 읽기만 한다.

CONTRACT 9.3 아래의 규정이다. 이 표들은 아홉 직무가 공유하는 기준 데이터이며
생성 데이터가 섞이면 실 데이터 쪽 분석이 함께 오염된다. 목록을 주석이 아니라
`assert_protected_untouched()` 로 강제한다.
"""

DELETE_ORDER: tuple[str, ...] = tuple(reversed(LOAD_ORDER))
"""지우는 차례는 적재의 역순이다. 자식을 먼저 지워야 외래키가 막지 않는다."""

TRIGGER_GUARDED_TABLES: tuple[str, ...] = (
    "source_snapshots",
    "source_observations",
    "agent_runs",
)
"""추가 전용 트리거가 DELETE 를 막는 표.

`0001_initial_schema.sql` 의 `trg_snapshots_append_only`·`trg_observations_append_only`
와 `0006_telemetry_triggers.sql` 의 `trg_agent_runs_completion_only` 다. 세 트리거
모두 DELETE 에서 예외를 던지므로 되돌리기 동안만 내린다.
"""


def assert_protected_untouched() -> None:
    """보호 표가 적재·삭제 목록에 끼어들지 않았는지 본다. import 시점에 부른다."""
    loaded = PROTECTED_TABLES & set(LOAD_ORDER)
    if loaded:
        raise RuntimeError(f"보호 표가 적재 순서에 있다: {sorted(loaded)}")
    deleted = PROTECTED_TABLES & set(DELETE_ORDER)
    if deleted:
        raise RuntimeError(f"보호 표가 삭제 순서에 있다: {sorted(deleted)}")
    guarded = set(TRIGGER_GUARDED_TABLES) - set(LOAD_ORDER)
    if guarded:
        raise RuntimeError(f"트리거 목록에 시드가 쓰지 않는 표가 있다: {sorted(guarded)}")


assert_protected_untouched()


# ============================================================ COPY
def copy_statement(table: str) -> str:
    """표 하나의 `COPY ... FROM STDIN`. 컬럼 순서는 계약이 정한 그대로다."""
    if table in PROTECTED_TABLES:
        raise RuntimeError(f"보호 표에는 쓰지 않는다: {table}")
    columns = ", ".join(TABLE_COLUMNS[table])
    return (
        f"COPY {table} ({columns}) FROM STDIN "
        rf"WITH (FORMAT csv, HEADER true, NULL '\N')"
    )


# ============================================================ 되돌리기 범위
SCOPE_TEMP_TABLES: tuple[tuple[str, str], ...] = (
    (
        "demo_analysis",
        """SELECT analysis_version FROM analysis_versions
           WHERE analysis_version LIKE %(an)s""",
    ),
    (
        "demo_taxonomy_version",
        """SELECT DISTINCT taxonomy_version_id FROM analysis_versions
           WHERE analysis_version LIKE %(an)s""",
    ),
    (
        "demo_taxonomy",
        """SELECT DISTINCT taxonomy_id FROM requirement_taxonomy_versions
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)""",
    ),
    (
        "demo_knowledge",
        """SELECT DISTINCT knowledge_version FROM knowledge_versions
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)""",
    ),
    (
        "demo_dimension",
        """SELECT DISTINCT dimension_id FROM requirement_dimension_versions
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)""",
    ),
    (
        "demo_capability",
        """SELECT DISTINCT capability_id FROM capability_dimension_links
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)""",
    ),
    (
        "demo_snapshot",
        "SELECT snapshot_id FROM source_snapshots WHERE dataset_version = %(ds)s",
    ),
    (
        "demo_source",
        """SELECT DISTINCT source_id FROM source_snapshots WHERE dataset_version = %(ds)s""",
    ),
    (
        "demo_posting",
        """SELECT DISTINCT posting_id FROM posting_versions WHERE dataset_version = %(ds)s""",
    ),
    (
        "demo_mention",
        "SELECT mention_id FROM requirement_mentions WHERE dataset_version = %(ds)s",
    ),
    (
        "demo_page",
        """SELECT page_id FROM wiki_pages
           WHERE knowledge_version IN (SELECT knowledge_version FROM demo_knowledge)""",
    ),
    (
        "demo_revision",
        """SELECT revision_id FROM wiki_revisions
           WHERE page_id IN (SELECT page_id FROM demo_page)""",
    ),
    (
        "demo_claim",
        "SELECT claim_id FROM analysis_claims WHERE analysis_version LIKE %(an)s",
    ),
    (
        "demo_roadmap_item",
        "SELECT roadmap_item_id FROM roadmap_items WHERE analysis_version LIKE %(an)s",
    ),
    (
        "demo_concept",
        """SELECT concept_id FROM checklist_items WHERE analysis_version LIKE %(an)s
           UNION
           SELECT f.concept_id FROM roadmap_item_fills AS f
           WHERE f.roadmap_item_id IN (SELECT roadmap_item_id FROM demo_roadmap_item)""",
    ),
    (
        "demo_user_posting",
        """SELECT DISTINCT user_posting_id FROM user_posting_analyses
           WHERE analysis_version LIKE %(an)s""",
    ),
)
"""되돌리기 대상 식별자를 모으는 임시 표.

지우기 전에 한 번에 모은다. 삭제가 진행되면 표시를 지닌 부모 행이 사라져 나중에는
같은 질의가 빈 결과를 내므로, 범위 계산과 삭제를 분리한다. 뿌리는 둘뿐이다.
`dataset_version = 'ds_demo_v1'` 과 `analysis_version LIKE 'an_demo_%'`.
"""

DELETE_PREDICATES: dict[str, str] = {
    "dataset_versions": "dataset_version = %(ds)s",
    "sources": "source_id IN (SELECT source_id FROM demo_source)",
    "source_snapshots": "dataset_version = %(ds)s",
    "source_observations": "snapshot_id IN (SELECT snapshot_id FROM demo_snapshot)",
    "source_assessments": "snapshot_id IN (SELECT snapshot_id FROM demo_snapshot)",
    "postings": "posting_id IN (SELECT posting_id FROM demo_posting)",
    "posting_versions": "dataset_version = %(ds)s",
    "source_chunks": "dataset_version = %(ds)s",
    "requirement_taxonomies": "taxonomy_id IN (SELECT taxonomy_id FROM demo_taxonomy)",
    "requirement_taxonomy_versions": (
        "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    ),
    "analysis_versions": "analysis_version LIKE %(an)s",
    "agent_runs": "analysis_version LIKE %(an)s",
    "requirement_dimensions": "dimension_id IN (SELECT dimension_id FROM demo_dimension)",
    "requirement_dimension_versions": (
        "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    ),
    "requirement_aliases": (
        "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    ),
    "requirement_dimension_relations": (
        "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    ),
    "capabilities": "capability_id IN (SELECT capability_id FROM demo_capability)",
    "capability_dimension_links": (
        "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    ),
    "requirement_mentions": "dataset_version = %(ds)s",
    "chunk_extractions": "dataset_version = %(ds)s",
    "posting_requirement_assignments": "mention_id IN (SELECT mention_id FROM demo_mention)",
    "knowledge_versions": "knowledge_version IN (SELECT knowledge_version FROM demo_knowledge)",
    "dimension_metric_applicability": (
        "taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)"
    ),
    "statistics_facts": "analysis_version LIKE %(an)s",
    "capability_depth_profiles": "analysis_version LIKE %(an)s",
    "saturation_observations": "analysis_version LIKE %(an)s",
    "knowledge_nodes": "(analysis_version LIKE %(an)s OR dataset_version = %(ds)s)",
    "knowledge_edges": "(analysis_version LIKE %(an)s OR dataset_version = %(ds)s)",
    "graph_paths": "analysis_version LIKE %(an)s",
    "wiki_pages": "page_id IN (SELECT page_id FROM demo_page)",
    "wiki_revisions": "revision_id IN (SELECT revision_id FROM demo_revision)",
    "wiki_evidence": "revision_id IN (SELECT revision_id FROM demo_revision)",
    "analysis_outputs": "analysis_version LIKE %(an)s",
    "analysis_claims": "analysis_version LIKE %(an)s",
    "analysis_claim_evidence": "claim_id IN (SELECT claim_id FROM demo_claim)",
    "coverage_assertions": "analysis_version LIKE %(an)s",
    "checklist_concepts": "concept_id IN (SELECT concept_id FROM demo_concept)",
    "checklist_items": "analysis_version LIKE %(an)s",
    "roadmap_items": "analysis_version LIKE %(an)s",
    "roadmap_item_fills": "roadmap_item_id IN (SELECT roadmap_item_id FROM demo_roadmap_item)",
    "study_tracks": "analysis_version LIKE %(an)s",
    "verification_results": "analysis_version LIKE %(an)s",
    "active_analysis_versions": "analysis_version LIKE %(an)s",
    "user_postings": "user_posting_id IN (SELECT user_posting_id FROM demo_user_posting)",
    "user_posting_analyses": "analysis_version LIKE %(an)s",
}
"""표별 삭제 조건. 조건 없는 DELETE 는 없다.

모든 조건은 두 표시 중 하나로 되짚어진다. 표시를 직접 갖지 않는 표는
`SCOPE_TEMP_TABLES` 가 모은 식별자 목록으로 좁힌다.
"""


def missing_delete_predicates() -> tuple[str, ...]:
    """삭제 조건이 없는 표. 계약에 표가 늘면 여기서 드러난다."""
    return tuple(table for table in DELETE_ORDER if not DELETE_PREDICATES.get(table, "").strip())


def delete_statement(table: str) -> str:
    """표 하나의 조건부 DELETE."""
    if table in PROTECTED_TABLES:
        raise RuntimeError(f"보호 표는 지우지 않는다: {table}")
    predicate = DELETE_PREDICATES.get(table, "").strip()
    if not predicate:
        raise RuntimeError(f"삭제 조건이 없다: {table}")
    return f"DELETE FROM {table} WHERE {predicate}"


# ============================================================ CSV 검증
def csv_paths(root: Path) -> list[tuple[str, Path]]:
    """적재 순서대로 (표, 파일). 없는 파일은 담지 않는다."""
    found: list[tuple[str, Path]] = []
    for table in LOAD_ORDER:
        path = root / f"{table}.csv"
        if path.exists():
            found.append((table, path))
    return found


def validate_header(table: str, header: Sequence[str]) -> list[str]:
    """헤더가 계약의 컬럼 순서와 같은지 본다. 순수 함수다."""
    expected = list(TABLE_COLUMNS[table])
    if list(header) != expected:
        return [f"{table}: 헤더가 계약과 다르다\n        기대 {expected}\n        실제 {list(header)}"]
    return []


def validate_file(table: str, path: Path) -> tuple[int, list[str]]:
    """파일 하나를 검사한다. (행 수, 문제 목록) 을 낸다. 접속하지 않는다."""
    problems: list[str] = []
    width = len(TABLE_COLUMNS[table])
    rows = 0
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration:
            return 0, [f"{table}: 파일이 비었다"]
        problems.extend(validate_header(table, header))
        for line_no, row in enumerate(reader, start=2):
            rows += 1
            if len(row) != width:
                problems.append(f"{table}:{line_no} 칸 수 {len(row)} ≠ {width}")
                if len(problems) > 20:
                    break
    return rows, problems


def validate_all(root: Path) -> tuple[dict[str, int], list[str]]:
    """모든 CSV 를 검사한다. `--dry-run` 의 본체다."""
    files = csv_paths(root)
    if not files:
        return {}, [f"{root} 에 CSV 가 없다. 먼저 scripts/build_demo_seed.py 를 돌린다"]
    counts: dict[str, int] = {}
    problems: list[str] = []
    for table, path in files:
        rows, table_problems = validate_file(table, path)
        counts[table] = rows
        problems.extend(table_problems)
    return counts, problems


# ============================================================ 접속
def connection_string() -> str:
    """`SUPABASE_DB_URL` 만 읽는다. 명령줄로는 받지 않는다."""
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        raise SystemExit("SUPABASE_DB_URL 이 agent/.env 에 없다")
    return url


def _connect() -> Any:
    import psycopg  # 이 자리에서만 필요하다. --dry-run 은 psycopg 없이도 돈다

    return psycopg.connect(connection_string(), autocommit=False)


# ============================================================ 적재
def run_load(root: Path) -> int:
    """접속 한 번, 거래 하나. 표마다 COPY 한 번씩."""
    counts, problems = validate_all(root)
    if problems:
        print(f"[실패] CSV 검사 {len(problems)}건")
        for line in problems[:20]:
            print(f"       {line}")
        return EXIT_FAILED

    files = csv_paths(root)
    print(f"표 {len(files)}개 · 행 {sum(counts.values())}개를 적재한다\n")
    started = time.monotonic()
    loaded: dict[str, int] = {}
    with _connect() as conn:
        with conn.cursor() as cur:
            for index, (table, path) in enumerate(files, start=1):
                table_started = time.monotonic()
                statement = copy_statement(table)
                with cur.copy(statement) as copy:
                    with path.open("rb") as handle:
                        while chunk := handle.read(1 << 20):
                            copy.write(chunk)
                loaded[table] = counts[table]
                elapsed = time.monotonic() - table_started
                print(
                    f"  [{index:2d}/{len(files)}] {table:38s} "
                    f"{counts[table]:7d}행 {elapsed:6.2f}초"
                )
        conn.commit()
    total = time.monotonic() - started
    print(f"\n[완료] {len(loaded)}개 표 · {sum(loaded.values())}행 · {total:.2f}초")
    return EXIT_OK


# ============================================================ 되돌리기
def confirm(prompt: str, expected: str) -> bool:
    """확인 문자열을 받는다. `y` 한 글자로는 진행하지 않는다."""
    print(prompt)
    try:
        answer = input(f"계속하려면 {expected!r} 를 그대로 입력한다: ")
    except EOFError:
        return False
    return answer.strip() == expected


def run_rollback(assume_yes: bool) -> int:
    """생성 데이터만 지운다. 적재의 역순으로 지운다."""
    gaps = missing_delete_predicates()
    if gaps:
        print(f"[실패] 삭제 조건이 없는 표: {list(gaps)}")
        return EXIT_FAILED

    if not assume_yes and not confirm(
        f"생성 데이터({DATASET_VERSION} · {ANALYSIS_VERSION_PATTERN})를 지운다. "
        f"보호 표 {len(PROTECTED_TABLES)}개는 건드리지 않는다.",
        DATASET_VERSION,
    ):
        print("[중단] 확인 문자열이 다르다. 한 줄도 지우지 않았다")
        return EXIT_ABORTED

    params = {"ds": DATASET_VERSION, "an": ANALYSIS_VERSION_PATTERN}
    started = time.monotonic()
    removed: dict[str, int] = {}
    with _connect() as conn:
        with conn.cursor() as cur:
            # 1. 범위를 먼저 모은다. 삭제가 시작되면 표시를 지닌 부모가 사라진다.
            for name, query in SCOPE_TEMP_TABLES:
                cur.execute(f"CREATE TEMP TABLE {name} ON COMMIT DROP AS {query}", params)
            print("[범위] 임시 표 %d개를 만들었다" % len(SCOPE_TEMP_TABLES))

            # 2. 추가 전용 트리거를 잠시 내린다. finally 에서 반드시 올린다.
            for table in TRIGGER_GUARDED_TABLES:
                cur.execute(f"ALTER TABLE {table} DISABLE TRIGGER USER")
            try:
                for index, table in enumerate(DELETE_ORDER, start=1):
                    cur.execute(delete_statement(table), params)
                    if cur.rowcount:
                        removed[table] = cur.rowcount
                        print(f"  [{index:2d}/{len(DELETE_ORDER)}] {table:38s} {cur.rowcount:7d}행")
            finally:
                for table in TRIGGER_GUARDED_TABLES:
                    cur.execute(f"ALTER TABLE {table} ENABLE TRIGGER USER")
                print("[트리거] 추가 전용 트리거를 다시 올렸다")
        conn.commit()
    total = time.monotonic() - started
    print(f"\n[완료] {len(removed)}개 표 · {sum(removed.values())}행 삭제 · {total:.2f}초")
    return EXIT_OK


# ============================================================ 실행
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="데모 시드 CSV 를 적재하거나 되돌린다. 접속 문자열은 SUPABASE_DB_URL 에서만 읽는다.",
    )
    parser.add_argument("--dry-run", action="store_true", help="접속하지 않고 CSV 만 검사한다")
    parser.add_argument("--rollback", action="store_true", help="생성 데이터 행만 지운다")
    parser.add_argument("--yes", action="store_true", help="되돌리기 확인을 묻지 않는다")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    if args.dry_run and args.rollback:
        print("[실패] --dry-run 과 --rollback 을 함께 줄 수 없다")
        return EXIT_FAILED

    root = demo_seed_root()
    if args.dry_run:
        counts, problems = validate_all(root)
        for table in LOAD_ORDER:
            if table in counts:
                print(f"  {table:38s} {counts[table]:7d}")
        if problems:
            print(f"\n[실패] {len(problems)}건")
            for line in problems[:20]:
                print(f"       {line}")
            return EXIT_FAILED
        print(f"\n[통과] 표 {len(counts)}개 · 행 {sum(counts.values())}개. 접속하지 않았다")
        return EXIT_OK

    try:
        from dotenv import load_dotenv
    except ImportError:
        print("python-dotenv 가 필요하다. pip install -r requirements.txt")
        return EXIT_FAILED
    load_dotenv(ROOT / ".env")

    if args.rollback:
        return run_rollback(args.yes)
    return run_load(root)


if __name__ == "__main__":
    raise SystemExit(main())
