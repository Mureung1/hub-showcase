r"""데모 시드 CSV 를 Supabase 에 적재하고 되돌리는 운영자 도구 (갈래 B17).

``agent/data/demo_seed/CONTRACT.md`` 9.3 의 적재 순서와 컬럼 순서가 기준이다.
``scripts/build_demo_seed.py`` 가 만든 ``agent/data/demo_seed/<table>.csv`` 를 읽는다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/load_demo_seed.py --dry-run     CSV 만 검사한다. 접속하지 않는다
    python scripts/load_demo_seed.py               적재한다
    python scripts/load_demo_seed.py --replace     기존 시드를 한 거래에서 원자 교체한다
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

**공유 신원.** 생성 데이터는 실 데이터와 저장소를 같이 쓴다. `dataset_version` 으로
갈리는 표는 부딪히지 않지만, 실 데이터와 신원을 공유하는 두 자리는 부딪힌다.

- `knowledge_nodes` 의 참조 노드(JobRole·Company·CompanyCluster·Standard)와
  `knowledge_edges` 의 참조 엣지는 정본 식별자를 쓰므로 실 데이터가 이미 만든 행과
  같은 행이다. 임시 표로 받아 `ON CONFLICT DO NOTHING` 으로 옮겨 이미 있는 행을
  건너뛴다. `ADOPTED_TABLES` 다.
- `requirement_taxonomies` 는 `UNIQUE (job_role_id)` 라 직무마다 하나뿐이다. 실
  데이터가 먼저 만든 직무는 시드 행을 넣지 않고 실제 `taxonomy_id` 를 **채택**해
  의존 표의 값을 바꾼다.
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys
import time
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.demo_seed._csv import LOAD_ORDER, TABLE_COLUMNS, demo_seed_root  # noqa: E402

DATASET_VERSION = "ds_demo_v1"
ANALYSIS_VERSION_PATTERN = "an_demo_%"
NULL_TOKEN = r"\N"
"""CSV 의 NULL 표기. `COPY ... NULL '\\N'` 과 같은 값이다."""

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_ABORTED = 2

REPLACE_ADVISORY_LOCK_KEY = 0x4353525F44534D4F
"""`CSR_DSMO`를 정수로 읽은 거래 advisory lock 키."""

REPLACE_LOCK_TIMEOUT = "5s"
REPLACE_STATEMENT_TIMEOUT = "15min"


class ReplaceBusyError(RuntimeError):
    """다른 적재·교체가 advisory lock을 잡고 있다."""


class ExternalSeedReferenceError(RuntimeError):
    """적재 목록 밖의 표가 삭제 대상 시드 행을 참조한다."""


class ReplacementVerificationError(RuntimeError):
    """커밋 전 교체 결과가 수용 기준을 만족하지 않는다."""


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

REQUIRED_GUARDED_TRIGGERS: frozenset[tuple[str, str]] = frozenset(
    {
        ("source_snapshots", "trg_snapshots_append_only"),
        ("source_observations", "trg_observations_append_only"),
        ("agent_runs", "trg_agent_runs_completion_only"),
    }
)


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


# ============================================================ 공유 신원
ADOPTED_TABLES: frozenset[str] = frozenset({"knowledge_nodes", "knowledge_edges"})
"""이미 있는 행을 건너뛰고 넣는 표. 의미 그래프의 두 표다.

`graph/identifiers.py` 가 두 표의 식별자를 재료에서 계산한다. `node_identifier` 의
재료는 `knowledge_nodes` 의 유일 제약 다섯 컬럼이고, `edge_identifier` 의 재료는 층,
유형, 두 끝점, 온톨로지 버전, 분류체계 버전이다. 재료가 같으면 식별자가 같다.

그래서 참조 노드(JobRole·Company·CompanyCluster·Standard)와 그 사이의 참조
엣지(`BELONGS_TO_CLUSTER` 같은 분류체계 무관 엣지)는 실 데이터가 만들었든 시드가
만들었든 **같은 행**이다. 넣을 것이 아니라 건너뛸 것이다. 분석 노드·엣지
(Dimension·Capability·Claim, `REQUIRES` 계열)는 분석 버전이나 분류체계 버전이 달라
식별자부터 갈리므로 그대로 들어간다.

건너뛰기는 `COPY` 를 임시 표에 받고 `INSERT ... SELECT ... ON CONFLICT DO NOTHING`
으로 옮겨 이룬다. `COPY` 자체에는 `ON CONFLICT` 가 없고, 행 단위 INSERT 로 바꾸면
왕복이 실행 시간의 거의 전부가 된다. 표당 `COPY` 는 여전히 한 번이다.

건너뛴 행은 실 데이터의 `analysis_version`·`dataset_version` 을 그대로 갖는다.
`--rollback` 의 조건이 두 표시로 좁혀져 있으므로 되돌리기가 그 행을 지우지 않는다.
"""

TAXONOMY_ID_TABLES: tuple[str, ...] = tuple(
    table for table in LOAD_ORDER if "taxonomy_id" in TABLE_COLUMNS[table]
)
"""`taxonomy_id` 컬럼을 가진 표. 채택이 일어나면 이 표들의 값을 바꿔서 넣는다.

목록을 손으로 적지 않고 `TABLE_COLUMNS` 에서 전수로 계산한다. 계약에 표가 늘어
`taxonomy_id` 를 갖게 되면 여기에 저절로 들어온다.
"""


def _assert_adoption_lists() -> None:
    """채택 목록이 계약과 보호 목록에 어긋나지 않는지 본다. import 시점에 부른다."""
    unknown = ADOPTED_TABLES - set(LOAD_ORDER)
    if unknown:
        raise RuntimeError(f"채택 목록에 계약이 모르는 표가 있다: {sorted(unknown)}")
    protected = ADOPTED_TABLES & PROTECTED_TABLES
    if protected:
        raise RuntimeError(f"보호 표를 채택 목록에 둘 수 없다: {sorted(protected)}")


_assert_adoption_lists()


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


def stage_statements(table: str) -> tuple[str, str, str]:
    """`ADOPTED_TABLES` 표의 세 문장. (임시 표 만들기, COPY, 옮기기)

    `ON COMMIT DROP` 이라 거래가 끝나면 임시 표가 사라진다. 되돌리기가 청소할 것이
    남지 않는다.
    """
    if table in PROTECTED_TABLES:
        raise RuntimeError(f"보호 표에는 쓰지 않는다: {table}")
    if table not in ADOPTED_TABLES:
        raise RuntimeError(f"채택 표가 아니다: {table}")
    columns = ", ".join(TABLE_COLUMNS[table])
    stage = f"stage_{table}"
    create = f"CREATE TEMP TABLE {stage} (LIKE {table} INCLUDING DEFAULTS) ON COMMIT DROP"
    copy = (
        f"COPY {stage} ({columns}) FROM STDIN "
        rf"WITH (FORMAT csv, HEADER true, NULL '\N')"
    )
    insert = (
        f"INSERT INTO {table} ({columns}) "
        f"SELECT {columns} FROM {stage} "
        f"ON CONFLICT DO NOTHING"
    )
    return create, copy, insert


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
        # 채택이 일어나면 시드 버전이 실 데이터의 분류체계에 매달린다. 버전만 보고
        # 거슬러 오르면 실 데이터의 taxonomy_id 가 범위에 들어와 --rollback 이
        # 44건이 매달린 실 데이터 분류체계를 지운다. 그래서 "매달린 버전이 전부
        # 데모 버전인 분류체계"로 좁힌다. 데모 아닌 버전이 하나라도 있으면 실
        # 데이터가 쓰는 분류체계이므로 범위 밖이다.
        "demo_taxonomy",
        """SELECT DISTINCT taxonomy_id FROM requirement_taxonomy_versions
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)
             AND taxonomy_id NOT IN (
               SELECT taxonomy_id FROM requirement_taxonomy_versions
               WHERE taxonomy_version_id NOT IN (
                 SELECT taxonomy_version_id FROM demo_taxonomy_version)
             )""",
    ),
    (
        # 같은 위험이 없다. 채택은 `taxonomy_id` 만 바꾸고 `taxonomy_version_id` 는
        # 시드가 새로 만든 값 그대로다. 실 데이터의 knowledge_versions 행은 실
        # 데이터의 taxonomy_version_id 를 참조하므로 이 조건에 걸리지 않는다.
        "demo_knowledge",
        """SELECT DISTINCT knowledge_version FROM knowledge_versions
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)""",
    ),
    (
        # 같은 위험이 없다. 데모 taxonomy_version_id 를 참조하는 차원 버전은 시드가
        # 만든 행뿐이다. 실 데이터의 차원은 실 데이터의 버전 아래에만 매달린다.
        "demo_dimension",
        """SELECT DISTINCT dimension_id FROM requirement_dimension_versions
           WHERE taxonomy_version_id IN (SELECT taxonomy_version_id FROM demo_taxonomy_version)""",
    ),
    (
        # 같은 위험이 없다. 위와 같은 이유다. 연결 행의 taxonomy_version_id 가 데모
        # 버전이면 그 연결도 시드가 만든 것이고, 거기 걸린 capability_id 도 시드 것이다.
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


# ============================================================ 분류체계 채택
#
# `requirement_taxonomies` 는 `UNIQUE (job_role_id)` 다(docs/erd.md 7.1). 직무마다
# 분류체계가 하나이므로 실 데이터가 먼저 만든 직무에는 시드가 자기 분류체계를 새로
# 넣을 자리가 없다. 넣기를 포기하고 이미 있는 것을 쓴다. 이것이 채택이다.
#
# 채택하면 시드가 쓰던 `taxonomy_id` 는 저장소에 존재하지 않는 값이 되므로,
# 그 값을 참조하는 표의 값을 실제 `taxonomy_id` 로 바꿔서 넣어야 외래키가 성립한다.
# 바꿀 자리는 `TAXONOMY_ID_TABLES` 가 전수로 알려 준다.


@dataclass(frozen=True)
class TaxonomyPlan:
    """채택한 분류체계 하나에 대한 조정 계획."""

    taxonomy_id: str
    """실 데이터가 이미 가진 `taxonomy_id`."""
    next_version_number: int
    """`UNIQUE (taxonomy_id, version_number)` 를 피하는 다음 번호."""
    has_active: bool
    """이미 활성 버전이 있는가. 있으면 시드 버전을 초안으로 넣는다."""


@dataclass(frozen=True)
class Adoption:
    """이번 적재에서 일어나는 채택 전체."""

    taxonomies: dict[str, str] = field(default_factory=dict)
    """시드 `taxonomy_id` → 실제 `taxonomy_id`. 두 값이 같을 수도 있다."""
    versions: dict[str, TaxonomyPlan] = field(default_factory=dict)
    """시드 `taxonomy_id` → 버전 번호·활성 여부 계획."""

    @property
    def rewrite(self) -> dict[str, str]:
        """값을 실제로 바꿔야 하는 짝만. 시드 값과 실제 값이 같으면 바꿀 것이 없다."""
        return {seed: real for seed, real in self.taxonomies.items() if seed != real}

    def __bool__(self) -> bool:
        return bool(self.taxonomies)


def read_rows(table: str, path: Path) -> list[list[str]]:
    """CSV 의 데이터 행만 읽는다. 헤더는 버린다. 값은 전부 문자열이다."""
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.reader(handle)
        if next(reader, None) is None:
            return []
        return [row for row in reader]


def render_csv(table: str, rows: Sequence[Sequence[str]]) -> bytes:
    """행 목록을 계약의 헤더가 붙은 CSV 바이트로 만든다. `COPY` 에 그대로 흘린다."""
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(TABLE_COLUMNS[table])
    for row in rows:
        writer.writerow(row)
    return buffer.getvalue().encode("utf-8")


def plan_adoption(cur: Any, taxonomy_csv: Path | None) -> Adoption:
    """시드의 분류체계마다 실 데이터에 이미 있는지 본다. 읽기만 한다.

    시드 CSV 의 각 행에 대해 `job_role_id` 로 조회한다. 이미 있으면 채택이고,
    채택한 분류체계에 한해 버전 번호와 활성 여부까지 함께 정한다.
    """
    if taxonomy_csv is None or not taxonomy_csv.exists():
        return Adoption()
    columns = TABLE_COLUMNS["requirement_taxonomies"]
    taxonomy_at = columns.index("taxonomy_id")
    role_at = columns.index("job_role_id")

    taxonomies: dict[str, str] = {}
    for row in read_rows("requirement_taxonomies", taxonomy_csv):
        if len(row) != len(columns):
            continue
        seed_taxonomy_id, job_role_id = row[taxonomy_at], row[role_at]
        cur.execute(
            "SELECT taxonomy_id FROM requirement_taxonomies WHERE job_role_id = %s",
            (job_role_id,),
        )
        found = cur.fetchone()
        if found is None:
            continue  # 시드가 처음 만드는 직무다. 시드 값을 그대로 쓴다
        taxonomies[seed_taxonomy_id] = str(found[0])

    versions: dict[str, TaxonomyPlan] = {}
    for seed_taxonomy_id, real_taxonomy_id in taxonomies.items():
        cur.execute(
            "SELECT COALESCE(MAX(version_number), 0) + 1 "
            "FROM requirement_taxonomy_versions WHERE taxonomy_id = %s",
            (real_taxonomy_id,),
        )
        row = cur.fetchone()
        next_number = int(row[0]) if row and row[0] is not None else 1
        cur.execute(
            "SELECT 1 FROM requirement_taxonomy_versions "
            "WHERE taxonomy_id = %s AND published_at IS NOT NULL AND superseded_at IS NULL "
            "LIMIT 1",
            (real_taxonomy_id,),
        )
        versions[seed_taxonomy_id] = TaxonomyPlan(
            taxonomy_id=real_taxonomy_id,
            next_version_number=next_number,
            has_active=cur.fetchone() is not None,
        )
    return Adoption(taxonomies=taxonomies, versions=versions)


def needs_rewrite(table: str, adoption: Adoption) -> bool:
    """이 표를 파일 그대로 흘리지 않고 값을 바꿔서 넣어야 하는가."""
    return bool(adoption) and table in TAXONOMY_ID_TABLES


def effective_rows(
    table: str, path: Path, adoption: Adoption
) -> tuple[list[list[str]], list[str]]:
    """채택을 반영한 뒤 실제로 저장소에 들어갈 행. (행, 알림) 을 낸다. 순수 함수다.

    - `requirement_taxonomies`: 채택한 직무의 행은 넣지 않는다.
    - `taxonomy_id` 를 가진 나머지 표: 시드 값을 실제 값으로 바꾼다.
    - `requirement_taxonomy_versions`: 채택한 분류체계 아래에서만 `version_number` 를
      다시 매기고, 이미 활성 버전이 있으면 `published_at` 을 지워 초안으로 넣는다.
    """
    columns = TABLE_COLUMNS[table]
    at = {column: index for index, column in enumerate(columns)}
    rows: list[list[str]] = []
    notes: list[str] = []
    allocated: dict[str, int] = {}
    rewrite = adoption.rewrite

    for record in read_rows(table, path):
        if len(record) != len(columns):
            rows.append(list(record))  # 칸 수는 validate_file 이 이미 잡는다
            continue
        row = list(record)
        seed_taxonomy_id = row[at["taxonomy_id"]] if "taxonomy_id" in at else None

        if table == "requirement_taxonomies":
            if seed_taxonomy_id in adoption.taxonomies:
                notes.append(
                    f"requirement_taxonomies  {row[at['job_role_id']]}: "
                    f"{seed_taxonomy_id} → {adoption.taxonomies[seed_taxonomy_id]} 채택. 넣지 않는다"
                )
                continue
            rows.append(row)
            continue

        if seed_taxonomy_id is not None and seed_taxonomy_id in rewrite:
            row[at["taxonomy_id"]] = rewrite[seed_taxonomy_id]

        if table == "requirement_taxonomy_versions" and seed_taxonomy_id in adoption.versions:
            plan = adoption.versions[seed_taxonomy_id]
            number = allocated.get(seed_taxonomy_id, plan.next_version_number)
            allocated[seed_taxonomy_id] = number + 1
            version_id = row[at["taxonomy_version_id"]]
            if row[at["version_number"]] != str(number):
                notes.append(
                    f"requirement_taxonomy_versions  {version_id}: "
                    f"version_number {row[at['version_number']]} → {number}"
                )
            row[at["version_number"]] = str(number)
            if plan.has_active and row[at["published_at"]] != NULL_TOKEN:
                row[at["published_at"]] = NULL_TOKEN
                notes.append(
                    f"requirement_taxonomy_versions  {version_id}: "
                    f"{plan.taxonomy_id} 에 활성 버전이 이미 있다. published_at 을 지워 초안으로 넣는다"
                )
        rows.append(row)
    return rows, notes


# ============================================================ 적재
def load_tables(
    cur: Any, files: Sequence[tuple[str, Path]], counts: Mapping[str, int]
) -> tuple[dict[str, tuple[int, int]], list[str]]:
    """거래 하나 안에서 표를 차례로 넣는다. (표별 (넣은 행, 건너뛴 행), 알림) 을 낸다.

    표당 `COPY` 는 한 번이다. 세 갈래가 있다.

    1. `ADOPTED_TABLES`: 임시 표에 `COPY` 하고 `ON CONFLICT DO NOTHING` 으로 옮긴다.
    2. 채택으로 값이 바뀌는 표: 바꾼 행을 만들어 `COPY` 에 흘린다.
    3. 나머지: 파일을 그대로 `COPY` 에 흘린다. 가장 흔한 갈래다.
    """
    paths = dict(files)
    adoption = plan_adoption(cur, paths.get("requirement_taxonomies"))
    result: dict[str, tuple[int, int]] = {}
    notes: list[str] = []

    for index, (table, path) in enumerate(files, start=1):
        started = time.monotonic()
        payload: bytes | None = None
        rows = counts.get(table, 0)
        if needs_rewrite(table, adoption):
            changed, table_notes = effective_rows(table, path, adoption)
            notes.extend(table_notes)
            payload = render_csv(table, changed)
            rows = len(changed)

        if table in ADOPTED_TABLES:
            create, copy_sql, insert_sql = stage_statements(table)
            cur.execute(create)
            with cur.copy(copy_sql) as copy:
                _write_copy(copy, path, payload)
            cur.execute(insert_sql)
            inserted = cur.rowcount if cur.rowcount is not None and cur.rowcount >= 0 else rows
            skipped = max(rows - inserted, 0)
        else:
            with cur.copy(copy_statement(table)) as copy:
                _write_copy(copy, path, payload)
            inserted, skipped = rows, 0

        result[table] = (inserted, skipped)
        elapsed = time.monotonic() - started
        tail = f" (이미 있어 건너뜀 {skipped}행)" if skipped else ""
        print(f"  [{index:2d}/{len(files)}] {table:38s} {inserted:7d}행 {elapsed:6.2f}초{tail}")
    return result, notes


def _write_copy(copy: Any, path: Path, payload: bytes | None) -> None:
    """`COPY` 에 내용을 흘린다. 바꿀 것이 없으면 파일을 그대로 흘린다."""
    if payload is not None:
        copy.write(payload)
        return
    with path.open("rb") as handle:
        while chunk := handle.read(1 << 20):
            copy.write(chunk)


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
    with _connect() as conn:
        with conn.cursor() as cur:
            configure_replace_transaction(cur)
            loaded, notes = load_tables(cur, files, counts)
        conn.commit()
    total = time.monotonic() - started
    if notes:
        print("\n[채택] 실 데이터가 이미 가진 신원에 맞췄다")
        for line in notes:
            print(f"  {line}")
    inserted = sum(count for count, _ in loaded.values())
    skipped = sum(count for _, count in loaded.values())
    tail = f" · 건너뜀 {skipped}행" if skipped else ""
    print(f"\n[완료] {len(loaded)}개 표 · {inserted}행{tail} · {total:.2f}초")
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
            configure_replace_transaction(cur)
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


# ============================================================ 사전 점검
#
# 생성 데이터는 실 데이터와 같은 저장소에 산다. `dataset_version` 으로 갈리는 표는
# 서로 부딪히지 않지만, 직무 단위로 유일한 표(`requirement_taxonomies` 의
# `UNIQUE (job_role_id)` 같은 것)는 실 데이터가 이미 자리를 차지하고 있을 수 있다.
# COPY 한복판에서 알게 되면 어느 표까지 갔는지 모른 채 거래가 통째로 되감긴다.
# 쓰기 전에 읽기만으로 부딪힐 자리를 전부 찾아 낸다.

_CONSTRAINT_QUERY = """
SELECT c.conname,
       c.contype,
       ARRAY(
         SELECT a.attname
         FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
         ORDER BY k.ord
       ) AS columns
FROM pg_constraint c
WHERE c.conrelid = %s::regclass AND c.contype IN ('p', 'u')
"""

_PARTIAL_INDEX_QUERY = """
SELECT i.relname, pg_get_indexdef(i.oid)
FROM pg_index x
JOIN pg_class i ON i.oid = x.indexrelid
WHERE x.indrelid = %s::regclass AND x.indisunique AND x.indpred IS NOT NULL
"""


_INDEX_SHAPE = re.compile(r"USING\s+\w+\s+\(([^()]+)\)\s+WHERE\s+(.+)$", re.I | re.S)
_NULL_CHECK = re.compile(r"(\w+)\s+IS\s+(NOT\s+)?NULL", re.I)


def parse_partial_unique_index(definition: str) -> tuple[tuple[str, ...], dict[str, bool]] | None:
    """부분 유일 인덱스 정의에서 (키 컬럼, NULL 조건) 을 뽑는다. 순수 함수다.

    `a IS NOT NULL AND b IS NULL` 꼴만 이해한다. `idx_active_taxonomy_version` 이
    이 꼴이며, 부분 유일 인덱스의 조건은 대개 NULL 여부다. 이해하지 못하는 조건은
    `None` 을 내고 호출한 쪽이 사람에게 넘긴다. 반쯤 이해한 채 통과라고 말하지 않는다.
    """
    shape = _INDEX_SHAPE.search(definition)
    if shape is None:
        return None
    columns = tuple(part.strip() for part in shape.group(1).split(","))
    predicate = shape.group(2)
    conditions: dict[str, bool] = {}
    remainder = predicate
    for match in _NULL_CHECK.finditer(predicate):
        conditions[match.group(1)] = bool(match.group(2))  # True 면 NOT NULL 이어야 한다
        remainder = remainder.replace(match.group(0), "", 1)
    leftover = re.sub(r"[()\s;]|AND", "", remainder, flags=re.I)
    if leftover or not conditions:
        return None
    if any(not column.isidentifier() for column in columns):
        return None
    return columns, conditions


def index_predicate(definition: str) -> str:
    """인덱스 정의의 `WHERE` 뒤를 그대로 돌려준다. 저장소 쪽 판정에 쓴다."""
    shape = _INDEX_SHAPE.search(definition)
    return shape.group(2).strip().rstrip(";") if shape else ""


def effective_key_rows(
    table: str,
    path: Path,
    columns: Sequence[str],
    adoption: Adoption,
    conditions: Mapping[str, bool] | None = None,
) -> list[tuple[str, ...]]:
    """실제로 들어갈 값 기준으로 키 컬럼만 뽑는다. 채택으로 바뀐 값을 반영한다.

    한 칸이라도 NULL 이면 유일 제약이 걸리지 않으므로 뺀다. `conditions` 를 주면
    부분 유일 인덱스의 조건을 만족하는 행만 남긴다.
    """
    contract = TABLE_COLUMNS[table]
    if not set(columns) <= set(contract):
        return []
    if conditions and not set(conditions) <= set(contract):
        return []
    rows = (
        effective_rows(table, path, adoption)[0]
        if needs_rewrite(table, adoption)
        else read_rows(table, path)
    )
    at = {column: index for index, column in enumerate(contract)}
    keys: list[tuple[str, ...]] = []
    for row in rows:
        if len(row) != len(contract):
            continue
        if conditions and any(
            (row[at[column]] != NULL_TOKEN) != required for column, required in conditions.items()
        ):
            continue
        values = tuple(row[at[column]] for column in columns)
        if any(value == NULL_TOKEN for value in values):
            continue
        keys.append(values)
    return keys


def existing_keys(
    cur: Any,
    table: str,
    columns: Sequence[str],
    keys: Sequence[tuple[str, ...]],
    predicate: str = "",
) -> list[tuple[str, ...]]:
    """이미 있는 키만 돌려준다. 읽기만 한다.

    `predicate` 를 주면 부분 유일 인덱스의 조건을 저장소 쪽에도 그대로 걸어,
    조건을 만족하는 행끼리만 겹치는지 본다.
    """
    if not keys:
        return []
    selected = ", ".join(columns)
    placeholder = "(" + ", ".join(["%s"] * len(columns)) + ")"
    tail = f" AND ({predicate})" if predicate else ""
    found: list[tuple[str, ...]] = []
    batch = 500
    for start in range(0, len(keys), batch):
        chunk = keys[start : start + batch]
        values = ", ".join([placeholder] * len(chunk))
        params = [value for key in chunk for value in key]
        cur.execute(
            f"SELECT {selected} FROM {table} WHERE ({selected}) IN ({values}){tail}", params
        )
        found.extend(tuple(str(value) for value in row) for row in cur.fetchall())
    return found


def run_preflight(root: Path) -> int:
    """적재 전에 부딪힐 자리를 읽기만으로 찾는다. 한 행도 쓰지 않는다."""
    files = dict(csv_paths(root))
    if not files:
        print(f"[실패] {root} 에 CSV 가 없다. 먼저 scripts/build_demo_seed.py 를 돌린다")
        return EXIT_FAILED

    conflicts: list[str] = []
    adoptions: list[str] = []
    notes: list[str] = []
    print("적재 전 점검. 읽기만 한다\n")
    with _connect() as conn:
        with conn.cursor() as cur:
            # 채택을 먼저 정한다. 채택이 정해져야 각 표에 실제로 들어갈 값을 알 수 있고,
            # 그 값으로 판정해야 "채택하면 풀리는 것"을 충돌로 세지 않는다.
            adoption = plan_adoption(cur, files.get("requirement_taxonomies"))
            for table in LOAD_ORDER:
                path = files.get(table)
                if path is None:
                    continue
                if needs_rewrite(table, adoption):
                    adoptions.extend(effective_rows(table, path, adoption)[1])

                cur.execute(_CONSTRAINT_QUERY, (table,))
                for name, contype, columns in cur.fetchall():
                    keys = effective_key_rows(table, path, columns, adoption)
                    clash = existing_keys(cur, table, columns, keys)
                    if not clash:
                        continue
                    kind = "기본키" if contype == "p" else "유일 제약"
                    sample = ", ".join("·".join(key) for key in clash[:3])
                    if table in ADOPTED_TABLES:
                        # ON CONFLICT DO NOTHING 이 받아 낸다. 막히지 않는다
                        adoptions.append(
                            f"{table:34s} {kind} {name}  {len(clash)}건은 이미 있다. "
                            f"건너뛴다  예: {sample}"
                        )
                    else:
                        conflicts.append(
                            f"{table:34s} {kind} {name}  {len(clash)}건  예: {sample}"
                        )

                cur.execute(_PARTIAL_INDEX_QUERY, (table,))
                for name, definition in cur.fetchall():
                    parsed = parse_partial_unique_index(definition)
                    if parsed is None:
                        notes.append(
                            f"{table:34s} 부분 유일 인덱스 {name}  조건을 읽지 못했다. 사람이 본다"
                            f"\n      {definition}"
                        )
                        continue
                    columns, conditions = parsed
                    keys = effective_key_rows(table, path, columns, adoption, conditions)
                    clash = existing_keys(
                        cur, table, columns, keys, predicate=index_predicate(definition)
                    )
                    if not clash:
                        continue
                    sample = ", ".join("·".join(key) for key in clash[:3])
                    if table in ADOPTED_TABLES:
                        adoptions.append(
                            f"{table:34s} 부분 유일 인덱스 {name}  {len(clash)}건은 이미 있다. 건너뛴다"
                        )
                    else:
                        conflicts.append(
                            f"{table:34s} 부분 유일 인덱스 {name}  {len(clash)}건  예: {sample}"
                        )
        conn.rollback()

    if adoptions:
        print(f"[채택] {len(adoptions)}건. 실 데이터에 맞춰 넣으므로 적재를 막지 않는다")
        for line in adoptions:
            print(f"  {line}")
        print()
    if notes:
        print("[확인] 조건을 판정하지 못한 인덱스")
        for line in notes:
            print(f"  {line}")
        print()
    if conflicts:
        print(f"[충돌] {len(conflicts)}건. 이대로 적재하면 실패한다")
        for line in conflicts:
            print(f"  {line}")
        return EXIT_FAILED
    print("[통과] 채택으로 풀리지 않는 충돌이 없다")
    return EXIT_OK


# ============================================================ 원자 교체
_EXTERNAL_FK_QUERY = """
SELECT child.relname,
       c.conname,
       parent.relname,
       ARRAY(
         SELECT a.attname
         FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
         ORDER BY k.ord
       ) AS child_columns,
       ARRAY(
         SELECT a.attname
         FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum
         ORDER BY k.ord
       ) AS parent_columns
FROM pg_constraint c
JOIN pg_class child ON child.oid = c.conrelid
JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
JOIN pg_class parent ON parent.oid = c.confrelid
JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
WHERE c.contype = 'f'
  AND parent.relname = ANY(%s)
  AND NOT (child.relname = ANY(%s))
  AND child_ns.nspname = current_schema()
  AND parent_ns.nspname = current_schema()
ORDER BY child.relname, c.conname
"""

_ORPHAN_FK_QUERY = """
SELECT child.relname,
       c.conname,
       parent.relname,
       ARRAY(
         SELECT a.attname
         FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
         ORDER BY k.ord
       ) AS child_columns,
       ARRAY(
         SELECT a.attname
         FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
         JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum
         ORDER BY k.ord
       ) AS parent_columns
FROM pg_constraint c
JOIN pg_class child ON child.oid = c.conrelid
JOIN pg_namespace child_ns ON child_ns.oid = child.relnamespace
JOIN pg_class parent ON parent.oid = c.confrelid
JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
WHERE c.contype = 'f'
  AND child.relname = ANY(%s)
  AND child_ns.nspname = current_schema()
  AND parent_ns.nspname = current_schema()
ORDER BY child.relname, c.conname
"""


REPLACEMENT_CHECKS: tuple[tuple[str, str, Any], ...] = (
    (
        "dataset version",
        "SELECT COUNT(*) = 1 FROM dataset_versions WHERE dataset_version = %(ds)s",
        True,
    ),
    (
        "posting total",
        """SELECT COUNT(*) = 135
           FROM posting_versions WHERE dataset_version = %(ds)s""",
        True,
    ),
    (
        "postings per job",
        """SELECT COUNT(*) = 9 AND MIN(n) = 15 AND MAX(n) = 15
           FROM (
             SELECT p.job_role_id, COUNT(*) AS n
             FROM postings p
             JOIN posting_versions pv ON pv.posting_id = p.posting_id
             WHERE pv.dataset_version = %(ds)s
             GROUP BY p.job_role_id
           ) counts""",
        True,
    ),
    (
        "recent postings per job",
        """SELECT COUNT(*) = 9 AND MIN(n) = 9 AND MAX(n) = 9
           FROM (
             SELECT p.job_role_id, COUNT(*) AS n
             FROM postings p
             JOIN posting_versions pv ON pv.posting_id = p.posting_id
             WHERE pv.dataset_version = %(ds)s
               AND pv.posted_at >= DATE '2026-01-01'
               AND pv.posted_at < DATE '2026-07-01'
             GROUP BY p.job_role_id
           ) counts""",
        True,
    ),
    (
        "previous postings per job",
        """SELECT COUNT(*) = 9 AND MIN(n) = 6 AND MAX(n) = 6
           FROM (
             SELECT p.job_role_id, COUNT(*) AS n
             FROM postings p
             JOIN posting_versions pv ON pv.posting_id = p.posting_id
             WHERE pv.dataset_version = %(ds)s
               AND pv.posted_at >= DATE '2024-03-01'
               AND pv.posted_at < DATE '2025-12-01'
             GROUP BY p.job_role_id
           ) counts""",
        True,
    ),
    (
        "analysis outputs",
        "SELECT COUNT(*) = 441 FROM analysis_outputs WHERE analysis_version LIKE %(an)s",
        True,
    ),
    (
        "active analysis versions",
        """SELECT COUNT(*) = 9
           FROM active_analysis_versions WHERE analysis_version LIKE %(an)s""",
        True,
    ),
)


def _quote_identifier(identifier: str) -> str:
    """카탈로그가 돌려준 식별자를 SQL 식별자로 안전하게 감싼다."""
    return '"' + identifier.replace('"', '""') + '"'


def configure_replace_transaction(cur: Any) -> None:
    """교체 거래의 잠금 대기 한도와 중복 실행 방지 잠금을 설정한다."""
    cur.execute(f"SET LOCAL lock_timeout = '{REPLACE_LOCK_TIMEOUT}'")
    cur.execute(f"SET LOCAL statement_timeout = '{REPLACE_STATEMENT_TIMEOUT}'")
    cur.execute("SELECT pg_try_advisory_xact_lock(%s)", (REPLACE_ADVISORY_LOCK_KEY,))
    row = cur.fetchone()
    if row is None or row[0] is not True:
        raise ReplaceBusyError("다른 데모 시드 적재 또는 교체가 실행 중이다")


def collect_replace_scope(cur: Any, params: Mapping[str, str]) -> None:
    """삭제 대상 식별자를 삭제 전에 거래 임시 표에 고정한다."""
    for name, query in SCOPE_TEMP_TABLES:
        cur.execute(f"CREATE TEMP TABLE {name} ON COMMIT DROP AS {query}", params)


def snapshot_protected_tables(cur: Any) -> dict[str, tuple[int, str]]:
    """보호 표의 행 수와 전체 행 서명을 저장한다."""
    snapshot: dict[str, tuple[int, str]] = {}
    for table in sorted(PROTECTED_TABLES):
        quoted = _quote_identifier(table)
        cur.execute(
            "SELECT COUNT(*), "
            "COALESCE(md5(string_agg(payload, E'\\n' ORDER BY payload)), md5('')) "
            f"FROM (SELECT row_to_json(t)::text AS payload FROM {quoted} AS t) rows"
        )
        row = cur.fetchone()
        if row is None:
            raise ReplacementVerificationError(f"보호 표 스냅샷을 읽지 못했다: {table}")
        snapshot[table] = (int(row[0]), str(row[1]))
    return snapshot


def assert_protected_tables_unchanged(
    cur: Any, before: Mapping[str, tuple[int, str]]
) -> None:
    """커밋 직전에 보호 표의 행 수와 식별자 포함 전체 서명이 같은지 본다."""
    after = snapshot_protected_tables(cur)
    changed = [table for table in sorted(before) if before[table] != after.get(table)]
    if changed:
        raise ReplacementVerificationError(f"보호 표가 바뀌었다: {changed}")


def assert_no_external_seed_references(cur: Any, params: Mapping[str, str]) -> None:
    """적재 목록 밖 외래키가 삭제 대상 행을 가리키면 삭제 전에 중단한다."""
    cur.execute(_EXTERNAL_FK_QUERY, (list(LOAD_ORDER), list(LOAD_ORDER)))
    references: list[str] = []
    for child, constraint, parent, child_columns, parent_columns in cur.fetchall():
        predicate = DELETE_PREDICATES.get(str(parent))
        if not predicate:
            raise ReplacementVerificationError(f"외부 FK 부모의 삭제 조건이 없다: {parent}")
        pairs = " AND ".join(
            f"external.{_quote_identifier(str(child_col))} = "
            f"seed.{_quote_identifier(str(parent_col))}"
            for child_col, parent_col in zip(child_columns, parent_columns, strict=True)
        )
        cur.execute(
            f"WITH seed AS (SELECT * FROM {_quote_identifier(str(parent))} WHERE {predicate}) "
            f"SELECT 1 FROM {_quote_identifier(str(child))} AS external "
            f"JOIN seed ON {pairs} LIMIT 1",
            params,
        )
        if cur.fetchone() is not None:
            references.append(f"{child}.{constraint} -> {parent}")
    if references:
        raise ExternalSeedReferenceError(
            "시드 밖 외래키 참조가 있어 교체하지 않는다: " + ", ".join(references)
        )


def guarded_trigger_states(cur: Any) -> tuple[tuple[str, str, str], ...]:
    """보호 대상 사용자 트리거의 표·이름·활성 모드를 읽는다."""
    cur.execute(
        """SELECT c.relname, t.tgname, t.tgenabled
           FROM pg_trigger t
           JOIN pg_class c ON c.oid = t.tgrelid
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE c.relname = ANY(%s) AND n.nspname = current_schema()
             AND NOT t.tgisinternal
           ORDER BY c.relname, t.tgname""",
        (list(TRIGGER_GUARDED_TABLES),),
    )
    return tuple((str(table), str(trigger), str(state)) for table, trigger, state in cur.fetchall())


def assert_guarded_triggers_active(cur: Any) -> None:
    """기존 상태가 이미 비활성이면 교체가 원인을 숨기지 않도록 중단한다."""
    states = guarded_trigger_states(cur)
    present = {(table, trigger) for table, trigger, _state in states}
    missing = sorted(REQUIRED_GUARDED_TRIGGERS - present)
    disabled = [
        (table, trigger)
        for table, trigger, state in states
        if state == "D"
    ]
    if missing:
        raise ReplacementVerificationError(f"필수 추가 전용 트리거가 없다: {missing}")
    if disabled:
        raise ReplacementVerificationError(f"교체 전부터 비활성인 트리거가 있다: {disabled}")


def set_guarded_triggers(
    cur: Any,
    enabled: bool,
    states: Sequence[tuple[str, str, str]] | None = None,
) -> None:
    """추가 전용 트리거를 개별로 내리고 원래 활성 모드로 복구한다."""
    known = tuple(states) if states is not None else guarded_trigger_states(cur)
    for table, trigger, state in known:
        if enabled:
            action = {"O": "ENABLE", "A": "ENABLE ALWAYS", "R": "ENABLE REPLICA"}.get(state)
            if action is None:
                raise ReplacementVerificationError(
                    f"복구할 수 없는 트리거 상태다: {table}.{trigger}={state}"
                )
        else:
            action = "DISABLE"
        cur.execute(
            f"ALTER TABLE {_quote_identifier(table)} {action} TRIGGER "
            f"{_quote_identifier(trigger)}"
        )


def delete_seed_rows(cur: Any, params: Mapping[str, str]) -> dict[str, int]:
    """고정한 범위만 FK 역순으로 집합 삭제한다."""
    removed: dict[str, int] = {}
    for table in DELETE_ORDER:
        cur.execute(delete_statement(table), params)
        if cur.rowcount:
            removed[table] = int(cur.rowcount)
    return removed


def _key_conflicts(
    cur: Any, files: Mapping[str, Path]
) -> tuple[list[str], list[str]]:
    """현재 거래에 남은 실 데이터와의 금지 충돌 및 허용 채택을 구분한다."""
    conflicts: list[str] = []
    adoptions: list[str] = []
    adoption = plan_adoption(cur, files.get("requirement_taxonomies"))
    for table in LOAD_ORDER:
        path = files.get(table)
        if path is None:
            continue
        cur.execute(_CONSTRAINT_QUERY, (table,))
        for name, _contype, columns in cur.fetchall():
            keys = effective_key_rows(table, path, columns, adoption)
            clash = existing_keys(cur, table, columns, keys)
            if not clash:
                continue
            detail = f"{table}.{name} {len(clash)}건"
            (adoptions if table in ADOPTED_TABLES else conflicts).append(detail)

        cur.execute(_PARTIAL_INDEX_QUERY, (table,))
        for name, definition in cur.fetchall():
            parsed = parse_partial_unique_index(definition)
            if parsed is None:
                conflicts.append(f"{table}.{name} 부분 유일 인덱스 조건 판독 실패")
                continue
            columns, conditions = parsed
            keys = effective_key_rows(table, path, columns, adoption, conditions)
            clash = existing_keys(
                cur, table, columns, keys, predicate=index_predicate(definition)
            )
            if clash:
                detail = f"{table}.{name} {len(clash)}건"
                (adoptions if table in ADOPTED_TABLES else conflicts).append(detail)
    return conflicts, adoptions


def assert_replace_key_safety(cur: Any, files: Sequence[tuple[str, Path]]) -> None:
    """삭제 후 남은 실 데이터와의 충돌은 막고 정본 신원 채택만 허용한다."""
    conflicts, _adoptions = _key_conflicts(cur, dict(files))
    if conflicts:
        raise ReplacementVerificationError("실 데이터 키 충돌: " + ", ".join(conflicts))


def assert_no_orphan_foreign_keys(cur: Any) -> None:
    """적재 표가 가진 모든 FK에 고아 행이 없는지 동적으로 검사한다."""
    cur.execute(_ORPHAN_FK_QUERY, (list(LOAD_ORDER),))
    orphans: list[str] = []
    for child, constraint, parent, child_columns, parent_columns in cur.fetchall():
        present = " AND ".join(
            f"child.{_quote_identifier(str(column))} IS NOT NULL" for column in child_columns
        )
        pairs = " AND ".join(
            f"parent.{_quote_identifier(str(parent_col))} = "
            f"child.{_quote_identifier(str(child_col))}"
            for child_col, parent_col in zip(child_columns, parent_columns, strict=True)
        )
        cur.execute(
            f"SELECT 1 FROM {_quote_identifier(str(child))} AS child "
            f"WHERE {present} AND NOT EXISTS ("
            f"SELECT 1 FROM {_quote_identifier(str(parent))} AS parent WHERE {pairs}) LIMIT 1"
        )
        if cur.fetchone() is not None:
            orphans.append(f"{child}.{constraint}")
    if orphans:
        raise ReplacementVerificationError("고아 외래키가 있다: " + ", ".join(orphans))


def verify_replacement(cur: Any, params: Mapping[str, str]) -> None:
    """모든 COPY 뒤, 커밋 전에 최종 데이터·FK·트리거 수용 기준을 검사한다."""
    failed: list[str] = []
    for label, query, expected in REPLACEMENT_CHECKS:
        cur.execute(query, params)
        row = cur.fetchone()
        actual = row[0] if row else None
        if actual != expected:
            failed.append(f"{label}: {actual!r} (기대 {expected!r})")
    assert_no_orphan_foreign_keys(cur)
    assert_guarded_triggers_active(cur)
    if failed:
        raise ReplacementVerificationError("커밋 전 검증 실패: " + "; ".join(failed))


def replace_in_transaction(
    cur: Any,
    files: Sequence[tuple[str, Path]],
    counts: Mapping[str, int],
) -> tuple[dict[str, tuple[int, int]], list[str]]:
    """이미 열린 한 거래 안에서 기존 시드를 새 CSV로 원자 교체한다."""
    params = {"ds": DATASET_VERSION, "an": ANALYSIS_VERSION_PATTERN}
    configure_replace_transaction(cur)
    collect_replace_scope(cur, params)
    protected = snapshot_protected_tables(cur)
    assert_no_external_seed_references(cur, params)
    trigger_states = guarded_trigger_states(cur)
    present = {(table, trigger) for table, trigger, _state in trigger_states}
    missing = sorted(REQUIRED_GUARDED_TRIGGERS - present)
    disabled = [
        (table, trigger) for table, trigger, state in trigger_states if state == "D"
    ]
    if missing or disabled:
        raise ReplacementVerificationError(
            f"트리거 상태가 안전하지 않다: missing={missing}, disabled={disabled}"
        )

    set_guarded_triggers(cur, enabled=False, states=trigger_states)
    try:
        delete_seed_rows(cur, params)
        assert_replace_key_safety(cur, files)
        loaded, notes = load_tables(cur, files, counts)
    except BaseException:
        # SQL 오류로 거래가 aborted 상태면 이 복구도 실패할 수 있다. 그 경우 거래
        # rollback 자체가 ALTER TABLE을 되돌린다. 복구 오류로 원 예외를 가리지 않는다.
        try:
            set_guarded_triggers(cur, enabled=True, states=trigger_states)
        except BaseException:
            pass
        raise
    else:
        set_guarded_triggers(cur, enabled=True, states=trigger_states)

    verify_replacement(cur, params)
    assert_protected_tables_unchanged(cur, protected)
    return loaded, notes


def _assert_complete_replace_files(counts: Mapping[str, int]) -> None:
    missing = [table for table in LOAD_ORDER if table not in counts]
    if missing:
        raise ReplacementVerificationError(f"교체 CSV가 빠졌다: {missing}")


def run_replace(root: Path) -> int:
    """CSV 전수 검사 뒤 한 연결·한 거래로 교체하고 검증이 끝난 뒤에만 커밋한다."""
    counts, problems = validate_all(root)
    if problems:
        print(f"[실패] CSV 검사 {len(problems)}건")
        for line in problems[:20]:
            print(f"       {line}")
        return EXIT_FAILED
    _assert_complete_replace_files(counts)
    gaps = missing_delete_predicates()
    if gaps:
        raise ReplacementVerificationError(f"삭제 조건이 없는 표: {list(gaps)}")

    files = csv_paths(root)
    started = time.monotonic()
    with _connect() as conn:
        try:
            with conn.cursor() as cur:
                loaded, notes = replace_in_transaction(cur, files, counts)
            conn.commit()
        except BaseException:
            conn.rollback()
            raise

    if notes:
        print("\n[채택] 실 데이터가 이미 가진 신원에 맞췄다")
        for line in notes:
            print(f"  {line}")
    inserted = sum(count for count, _ in loaded.values())
    skipped = sum(count for _, count in loaded.values())
    print(
        f"\n[완료] 원자 교체 {len(loaded)}개 표 · {inserted}행 · "
        f"건너뜀 {skipped}행 · {time.monotonic() - started:.2f}초"
    )
    return EXIT_OK


# ============================================================ 실행
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="데모 시드 CSV 를 적재하거나 되돌린다. 접속 문자열은 SUPABASE_DB_URL 에서만 읽는다.",
    )
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--dry-run", action="store_true", help="접속하지 않고 CSV 만 검사한다")
    modes.add_argument(
        "--preflight",
        action="store_true",
        help="적재 전에 실 데이터와 부딪히는 키를 찾는다. 읽기만 한다",
    )
    modes.add_argument("--rollback", action="store_true", help="생성 데이터 행만 지운다")
    modes.add_argument(
        "--replace",
        action="store_true",
        help=(
            "기존 시드를 한 거래에서 교체한다. ALTER TABLE 잠금 대기가 생길 수 있고 "
            "제한 시간을 넘으면 전부 롤백한다"
        ),
    )
    parser.add_argument("--yes", action="store_true", help="삭제·교체 확인을 묻지 않는다")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

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

    if args.preflight:
        return run_preflight(root)
    if args.rollback:
        return run_rollback(args.yes)
    if args.replace:
        if not args.yes and not confirm(
            "기존 데모 시드를 삭제한 뒤 같은 거래에서 새 CSV를 적재한다. "
            "ALTER TABLE의 짧은 잠금이 생길 수 있다.",
            DATASET_VERSION,
        ):
            print("[중단] 확인 문자열이 다르다. 한 줄도 지우지 않았다")
            return EXIT_ABORTED
        return run_replace(root)
    return run_load(root)


if __name__ == "__main__":
    raise SystemExit(main())
