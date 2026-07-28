r"""Stage D(Phase 8~12)의 산출물을 지워 실행 전 상태로 되돌리는 운영자 도구.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/reset_stage_d.py

기본 동작은 세기만 하는 것이다. 위 명령은 표마다 지울 행 수를 찍고 한 줄도
지우지 않는다. 실제로 지우려면 `--execute` 를 준다:
    python scripts/reset_stage_d.py --execute

`--execute` 는 지울 행 수를 먼저 보여주고 확인 문자열을 받는다. 확인 문자열은
데이터셋 버전(예: ds_backend_2026_07)이며 `y` 한 글자로는 진행하지 않는다.
확인을 묻지 않으려면 `--yes` 를 함께 준다:
    python scripts/reset_stage_d.py --execute --yes

그래프만 되돌린다:
    python scripts/reset_stage_d.py --phase 12 --execute

범위는 `--dataset-version` 과 `--job-role` 로 좁히고 기본값은 매니페스트에서
읽는다. `scripts/stage_d.py` 와 `scripts/index.py` 가 쓰는 방식과 같다.

되돌리는 표와 순서는 docs/erd.md 7장·8장의 외래키 방향과
`migrations/versions/0001_initial_schema.py` 의 `DROP_ORDER` 를 따른다. 지우는
차례는 참조하는 쪽이 먼저다.

Phase 되돌림은 뒤로 번진다. Phase 9 를 되돌리면 그 산출물 위에 쌓인 Phase 10·11·12
도 함께 되돌린다. 앞 단계를 지우고 뒤 단계를 남기면 남은 행이 사라진 행을 가리켜
분석이 틀린 근거를 갖는다. `--phase` 는 시작 단계 하나만 받고 나머지는 `phase_cascade`
가 펼친다.

권한은 `unit_of_work` 를 쓰지 않는다. `src/careersignal/repositories/base.py` 의
`unit_of_work` 는 거래마다 `SET LOCAL ROLE` 로 구성요소 role 로 전환하고,
`migrations/sql/0004_component_grants.sql` 은 어떤 구성요소 role 에도 DELETE 를 주지
않는다(`graph_paths` 에 대한 `cs_pipe_lineage` 만 예외). 실행 경로가 지울 수 없는
것이 설계이며 그 설계를 이 스크립트 때문에 넓히지 않는다. 그래서 이 스크립트는
role 전환 없이 `SUPABASE_DB_URL` 소유자 연결로 psycopg 거래를 직접 연다.
스키마의 소유자가 에이전트 서비스의 `migrations/` 라는
docs/adr/0006-migration-ownership.md 의 결정에 따라, 스키마를 바꾸는 migration 과
데이터를 되돌리는 이 도구는 같은 소유자 자리에 둔다.

지우지 않는 표가 있다. `agent_runs`·`agent_run_steps`·`tool_calls` 는 추가 전용이며
`migrations/sql/0006_telemetry_triggers.sql` 의 트리거가 삭제를 막는다. 실행 기록은
무엇을 언제 돌렸는지의 근거이므로 산출물을 지워도 남긴다. `analysis_versions` 도
같은 이유로 남긴다. Stage B·C 의 산출물(`sources`·`source_snapshots`·`postings`·
`source_chunks` 따위)은 이 스크립트가 다루는 대상이 아니다.

되돌린 뒤에는 `python scripts/stage_d.py` 를 다시 돌린다.
"""

from __future__ import annotations

import argparse
import os
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

from careersignal.agents.collector import SourceManifest  # noqa: E402
from careersignal.graph.semantic import ONTOLOGY_VERSION  # noqa: E402

DEFAULT_MANIFEST = ROOT / "data" / "manifest" / "backend.json"

FIRST_PHASE = 8
LAST_PHASE = 12

PHASE_LABEL: dict[int, str] = {
    8: "요구 표현 추출",
    9: "차원 후보 발견",
    10: "승격 심사와 버전 발행",
    11: "할당",
    12: "그래프 구축과 경로 캐시",
}

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_ABORTED = 2

KEPT_TABLES: tuple[tuple[str, str], ...] = (
    ("agent_runs", "실행 기록. 추가 전용이며 트리거가 삭제를 막는다"),
    ("agent_run_steps", "실행 기록. 추가 전용이며 트리거가 삭제를 막는다"),
    ("tool_calls", "실행 기록. 추가 전용이며 트리거가 삭제를 막는다"),
    ("analysis_versions", "실행 봉투. 산출물이 아니라 무엇을 돌렸는지의 기록이다"),
)
"""Stage D 가 만들지만 되돌리지 않는 표. 왜 남기는지를 함께 적는다."""


# ================================================================ 범위 조회
SCOPED_MENTIONS = """
    SELECT m.mention_id
    FROM requirement_mentions AS m
    JOIN posting_versions AS pv ON pv.posting_version_id = m.posting_version_id
    JOIN postings AS p ON p.posting_id = pv.posting_id
    WHERE m.dataset_version = %(dataset_version)s
      AND p.job_role_id = %(job_role_id)s
"""
"""이 데이터셋·직무의 요구 표현.

`requirement_mentions` 는 `dataset_version` 을 갖지만 직무는 갖지 않는다. 직무는
공고를 거쳐 붙으므로 `posting_versions` 와 `postings` 를 지나 좁힌다. 조건을
`repositories/statistics.py` 의 `mentions_to_discover` 와 같게 둔다.
"""

SCOPED_EXTRACTED_CHUNKS = """
    SELECT c.chunk_id
    FROM source_chunks AS c
    JOIN posting_versions AS pv ON pv.snapshot_id = c.snapshot_id
    JOIN postings AS p ON p.posting_id = pv.posting_id
    WHERE c.dataset_version = %(dataset_version)s
      AND pv.dataset_version = %(dataset_version)s
      AND p.job_role_id = %(job_role_id)s
"""
"""이 데이터셋·직무의 추출 기록이 가리키는 청크.

`chunk_extractions` 도 `dataset_version` 은 갖지만 직무는 갖지 않는다. 직무는 청크가
속한 스냅샷에서 공고를 거쳐 붙으므로 `posting_versions` 와 `postings` 를 지나 좁힌다.
조인을 `repositories/statistics.py` 의 `_POSTING_CHUNKS` 와 같게 둔다. 되돌린 뒤 다시
대상이 되어야 하는 청크와 기록을 지우는 청크가 같은 집합이어야 한다.
"""

DOOMED_TAXONOMY_VERSIONS = """
    SELECT tv.taxonomy_version_id
    FROM requirement_taxonomy_versions AS tv
    WHERE tv.taxonomy_id = %(taxonomy_id)s
      AND tv.version_number > (
            SELECT min(v.version_number)
            FROM requirement_taxonomy_versions AS v
            WHERE v.taxonomy_id = %(taxonomy_id)s
      )
"""
"""지울 분류체계 버전. 첫 버전은 남긴다.

첫 버전은 `migrations/sql/0002_seed_reference.sql` 이 만든 시드다(백엔드 직무는
`tx_backend_v1`). Stage D 가 만든 것이 아니므로 지우지 않으며, 이것까지 지우면
활성 분류체계가 없어져 다음 실행의 Phase 9·11·12 가 전부 멈춘다.
`version_number` 의 최솟값 하나만 남기고 그 뒤에 발행된 버전을 지운다.
"""

DOOMED_CANDIDATES = """
    SELECT c.candidate_id
    FROM requirement_candidates AS c
    WHERE c.taxonomy_id = %(taxonomy_id)s
      AND NOT EXISTS (
            SELECT 1
            FROM requirement_candidate_mentions AS cm
            JOIN requirement_mentions AS m ON m.mention_id = cm.mention_id
            WHERE cm.candidate_id = c.candidate_id
              AND m.dataset_version <> %(dataset_version)s
      )
"""
"""지울 차원 후보.

`requirement_candidates` 에는 데이터셋 버전 컬럼이 없다. 근거인 요구 표현을 거쳐
좁힌다. 이 데이터셋 밖의 표현을 근거로 갖는 후보는 다른 데이터셋의 산출물이므로
남긴다.

조건이 지우는 차례와 무관하다. `requirement_candidate_mentions` 를 먼저 지워도
"이 데이터셋 밖의 근거가 없다" 는 판정이 달라지지 않으므로, 세는 시점의 수와 지운
행 수가 어긋나지 않는다.
"""

DOOMED_DIMENSIONS = f"""
    SELECT d.dimension_id
    FROM requirement_dimensions AS d
    WHERE d.taxonomy_id = %(taxonomy_id)s
      AND NOT EXISTS (
            SELECT 1
            FROM requirement_dimension_versions AS dv
            WHERE dv.dimension_id = d.dimension_id
              AND dv.taxonomy_version_id NOT IN ({DOOMED_TAXONOMY_VERSIONS})
      )
"""
"""지울 차원.

`requirement_dimensions` 도 데이터셋 버전을 갖지 않는다. 남길 분류체계 버전에
판이 하나도 없는 차원만 지운다. 시드가 만든 첫 버전에 판이 있는 차원은 남는다.

`DOOMED_CANDIDATES` 와 같이 지우는 차례와 무관하다. `requirement_dimension_versions`
를 먼저 지워도 남는 판은 지울 버전 밖의 것뿐이라 판정이 같다.
"""

SCOPED_ANALYSIS_VERSIONS = """
    SELECT av.analysis_version
    FROM analysis_versions AS av
    WHERE av.job_role_id = %(job_role_id)s
      AND av.dataset_version = %(dataset_version)s
"""
"""이 직무·데이터셋의 분석 버전.

`graph_paths` 는 데이터셋 버전 컬럼이 없고 캐시 키 넷 가운데 `analysis_version` 이
직무와 데이터셋을 함께 가리킨다(docs/erd.md 8.4).
"""

DOOMED_NODES = """
    SELECT n.node_id
    FROM knowledge_nodes AS n
    WHERE n.dataset_version = %(dataset_version)s
      AND n.ontology_version = %(ontology_version)s
"""
"""지울 그래프 노드.

`graph/ontology.py` 의 `_node_row` 가 노드마다 `dataset_version` 과
`ontology_version` 을 채운다. 두 값이 그래프 층 산출물의 범위다.
"""


# ================================================================ 지울 대상
@dataclass(frozen=True, slots=True)
class DeleteStep:
    """지울 표 하나와 그 범위 조건.

    조건 없는 삭제를 만들 수 없다. 세는 문장과 지우는 문장이 같은 `where` 하나에서
    나오므로 미리 보여 준 수와 실제로 지운 수가 어긋나지 않는다.
    """

    phase: int
    table: str
    alias: str
    where: str
    note: str = ""

    def __post_init__(self) -> None:
        if not self.where.strip():
            raise ValueError(f"{self.table} 의 범위 조건이 비어 있다")

    def count_sql(self) -> str:
        return f"SELECT count(*) FROM {self.table} AS {self.alias} WHERE {self.where}"

    def delete_sql(self) -> str:
        return f"DELETE FROM {self.table} AS {self.alias} WHERE {self.where}"


DELETE_STEPS: tuple[DeleteStep, ...] = (
    DeleteStep(
        phase=12,
        table="graph_paths",
        alias="tgt",
        where=f"tgt.analysis_version IN ({SCOPED_ANALYSIS_VERSIONS})",
        note="경로 캐시",
    ),
    DeleteStep(
        phase=12,
        table="knowledge_edges",
        alias="tgt",
        where=(
            "tgt.dataset_version = %(dataset_version)s"
            " AND tgt.ontology_version = %(ontology_version)s"
        ),
        note="의미 층과 계보 층의 엣지",
    ),
    DeleteStep(
        phase=12,
        table="knowledge_nodes",
        alias="tgt",
        where=(
            "tgt.dataset_version = %(dataset_version)s"
            " AND tgt.ontology_version = %(ontology_version)s"
        ),
        note="의미 층과 계보 층의 노드",
    ),
    DeleteStep(
        phase=11,
        table="posting_requirement_assignments",
        alias="tgt",
        where=f"tgt.mention_id IN ({SCOPED_MENTIONS})",
        note="표현을 차원에 붙인 결과",
    ),
    DeleteStep(
        phase=10,
        table="requirement_candidate_decisions",
        alias="tgt",
        where=(
            f"(tgt.promoted_to_version_id IN ({DOOMED_TAXONOMY_VERSIONS})"
            f" OR tgt.candidate_id IN ({DOOMED_CANDIDATES}))"
        ),
        note="승격 심사 결정",
    ),
    DeleteStep(
        phase=9,
        table="requirement_candidate_mentions",
        alias="tgt",
        where=(
            f"(tgt.mention_id IN ({SCOPED_MENTIONS})"
            f" OR tgt.candidate_id IN ({DOOMED_CANDIDATES}))"
        ),
        note="후보와 근거 표현의 연결",
    ),
    DeleteStep(
        phase=9,
        table="requirement_candidates",
        alias="tgt",
        where=f"tgt.candidate_id IN ({DOOMED_CANDIDATES})",
        note="차원 후보",
    ),
    DeleteStep(
        phase=10,
        table="requirement_aliases",
        alias="tgt",
        where=f"tgt.taxonomy_version_id IN ({DOOMED_TAXONOMY_VERSIONS})",
        note="차원 별칭",
    ),
    DeleteStep(
        phase=10,
        table="requirement_dimension_relations",
        alias="tgt",
        where=f"tgt.taxonomy_version_id IN ({DOOMED_TAXONOMY_VERSIONS})",
        note="차원 사이의 관계",
    ),
    DeleteStep(
        phase=10,
        table="requirement_dimension_versions",
        alias="tgt",
        where=f"tgt.taxonomy_version_id IN ({DOOMED_TAXONOMY_VERSIONS})",
        note="차원의 버전별 판",
    ),
    DeleteStep(
        phase=10,
        table="requirement_dimensions",
        alias="tgt",
        where=f"tgt.dimension_id IN ({DOOMED_DIMENSIONS})",
        note="차원의 정체성",
    ),
    DeleteStep(
        phase=10,
        table="requirement_taxonomy_versions",
        alias="tgt",
        where=f"tgt.taxonomy_version_id IN ({DOOMED_TAXONOMY_VERSIONS})",
        note="첫 버전을 뺀 분류체계 버전",
    ),
    DeleteStep(
        phase=8,
        table="chunk_extractions",
        alias="tgt",
        where=(
            "tgt.dataset_version = %(dataset_version)s"
            f" AND tgt.chunk_id IN ({SCOPED_EXTRACTED_CHUNKS})"
        ),
        note="추출을 마친 청크의 기록",
    ),
    DeleteStep(
        phase=8,
        table="requirement_mentions",
        alias="tgt",
        where=f"tgt.mention_id IN ({SCOPED_MENTIONS})",
        note="요구 표현",
    ),
)
"""지우는 차례.

Phase 번호의 역순이 아니라 외래키의 역순이다. 참조하는 쪽을 먼저 지운다.
`requirement_candidates.nearest_dimension_id` 가 `requirement_dimensions` 를
가리키므로 Phase 9 의 후보가 Phase 10 의 차원보다 먼저 지워져야 하고,
`requirement_mentions` 는 후보 연결과 할당이 가리키므로 맨 뒤다. 순서의 근거는
docs/erd.md 7장·8장의 외래키와 `migrations/versions/0001_initial_schema.py` 의
`DROP_ORDER` 다.

`chunk_extractions` 는 Phase 8 이고 `requirement_mentions` 와 서로 가리키지 않는다
(docs/erd.md 6.2). 둘의 앞뒤는 자유이며, 이 표를 남기면 되돌린 청크가 "처리됨" 인
채로 남아 다시 실행해도 대상에 들어오지 않으므로 반드시 함께 지운다.
"""

RESTORE_WHERE = """
    tv.taxonomy_id = %(taxonomy_id)s
      AND tv.superseded_at IS NOT NULL
      AND tv.version_number = (
            SELECT min(v.version_number)
            FROM requirement_taxonomy_versions AS v
            WHERE v.taxonomy_id = %(taxonomy_id)s
      )
"""
"""다시 활성으로 돌릴 분류체계 버전.

Phase 10 이 새 버전을 발행할 때 이전 활성 버전의 `superseded_at` 을 채워 은퇴시킨다
(`repositories/promotion.py` 의 `publish_version`). 새 버전을 지우기만 하고 이 값을
되돌리지 않으면 활성 버전이 하나도 없게 되어 다음 실행의 Phase 9·11·12 가 전부
멈춘다. 지운 뒤에 남은 첫 버전의 값을 `NULL` 로 되돌린다.

`requirement_taxonomy_versions` 의 부분 유니크 인덱스가 분류체계마다 활성 버전을
하나로 강제하므로(docs/erd.md 7.2) 이 갱신은 뒤 버전을 지운 다음에만 안전하다.
"""

RESTORE_COUNT_SQL = (
    f"SELECT count(*) FROM requirement_taxonomy_versions AS tv WHERE {RESTORE_WHERE}"
)
RESTORE_SQL = (
    "UPDATE requirement_taxonomy_versions AS tv SET superseded_at = NULL "
    f"WHERE {RESTORE_WHERE}"
)


# ================================================================ 막는 참조
@dataclass(frozen=True, slots=True)
class Blocker:
    """지우지 않는 표가 지울 행을 가리키는 자리.

    외래키가 `ON DELETE RESTRICT` 라 이런 행이 하나라도 있으면 삭제가 실패한다.
    거래 전체가 되돌아가므로 데이터는 안전하지만, 무엇이 막았는지 먼저 알려 주는
    쪽이 psycopg 의 외래키 오류보다 읽기 쉽다.
    """

    table: str
    column: str
    target: str
    sql: str


def _blocker(table: str, column: str, target: str, scope: str, extra: str = "") -> Blocker:
    where = f"{column} IN ({scope})"
    if extra:
        where = f"{where} AND {extra}"
    return Blocker(
        table=table,
        column=column,
        target=target,
        sql=f"SELECT count(*) FROM {table} WHERE {where}",
    )


def blockers_for(phases: Sequence[int]) -> tuple[Blocker, ...]:
    """이번 범위에서 삭제를 막을 수 있는 참조를 모은다.

    Phase 10 을 되돌리면 분류체계 버전과 차원이 사라진다. 그 둘을 가리키는 표
    가운데 이 스크립트가 지우지 않는 것이 검사 대상이다. Phase 12 를 되돌리면
    노드가 사라지므로 범위 밖의 엣지가 그 노드를 가리키는지 본다.
    """
    found: list[Blocker] = []
    selected = set(phases)

    if 10 in selected:
        for table, column in (
            ("analysis_versions", "taxonomy_version_id"),
            ("knowledge_versions", "taxonomy_version_id"),
            ("capability_dimension_links", "taxonomy_version_id"),
            ("capability_depth_profiles", "taxonomy_version_id"),
            ("dimension_metric_applicability", "taxonomy_version_id"),
        ):
            found.append(
                _blocker(table, column, "분류체계 버전", DOOMED_TAXONOMY_VERSIONS)
            )
        for table, column in (
            ("statistics_facts", "dimension_id"),
            ("statistics_facts", "secondary_dimension_id"),
            ("coverage_assertions", "dimension_id"),
            ("capability_dimension_links", "dimension_id"),
            ("dimension_metric_applicability", "dimension_id"),
        ):
            found.append(_blocker(table, column, "차원", DOOMED_DIMENSIONS))

        # 남는 후보가 지울 차원·버전을 가리키면 막힌다. Phase 9 를 함께 되돌리면
        # 그 후보도 지우므로 지울 후보를 검사에서 뺀다.
        survivor = (
            f"candidate_id NOT IN ({DOOMED_CANDIDATES})" if 9 in selected else ""
        )
        found.append(
            _blocker(
                "requirement_candidates",
                "nearest_dimension_id",
                "차원",
                DOOMED_DIMENSIONS,
                survivor,
            )
        )
        found.append(
            _blocker(
                "requirement_candidates",
                "judged_against_taxonomy_version_id",
                "분류체계 버전",
                DOOMED_TAXONOMY_VERSIONS,
                survivor,
            )
        )

    if 12 in selected:
        found.append(
            Blocker(
                table="knowledge_edges",
                column="src_node_id·dst_node_id",
                target="그래프 노드",
                sql=(
                    "SELECT count(*) FROM knowledge_edges AS e WHERE ("
                    f"e.src_node_id IN ({DOOMED_NODES})"
                    f" OR e.dst_node_id IN ({DOOMED_NODES})"
                    ") AND (e.dataset_version IS DISTINCT FROM %(dataset_version)s"
                    " OR e.ontology_version IS DISTINCT FROM %(ontology_version)s)"
                ),
            )
        )
    return tuple(found)


# ================================================================ 순수 함수
def phase_cascade(start: int) -> tuple[int, ...]:
    """되돌릴 Phase 를 펼친다. 한 Phase 를 되돌리면 그 뒤도 함께 되돌린다.

    Phase 9 를 되돌리면 10·11·12 도 무효다. 후보가 사라지면 그 후보를 승격해 만든
    차원과 그 차원에 붙인 할당, 그 할당으로 만든 그래프가 모두 근거를 잃는다.
    되돌릴 단계를 사용자가 임의로 고르게 두면 사라진 행을 가리키는 산출물이 남는다.
    """
    if start < FIRST_PHASE or start > LAST_PHASE:
        raise ValueError(f"Phase 는 {FIRST_PHASE}~{LAST_PHASE} 사이다")
    return tuple(range(start, LAST_PHASE + 1))


def steps_for(phases: Sequence[int]) -> tuple[DeleteStep, ...]:
    """고른 Phase 의 삭제 단계만 남긴다. 외래키 차례는 그대로 둔다."""
    selected = set(phases)
    return tuple(step for step in DELETE_STEPS if step.phase in selected)


def confirmation_matches(typed: str, dataset_version: str) -> bool:
    """확인 문자열이 데이터셋 버전과 같은가.

    `y` 나 `yes` 로는 지워지지 않는다. 지우는 대상의 이름을 그대로 치게 해야
    무엇을 지우는지 읽지 않고 손가락만 움직이는 확인을 막는다. 앞뒤 공백만 걷어
    내고 대소문자는 구분한다.
    """
    return typed.strip() == dataset_version


def total_rows(counts: Sequence[tuple[DeleteStep, int]]) -> int:
    return sum(count for _, count in counts)


# ================================================================ 저장소
def connect() -> Any:
    """소유자 연결 하나.

    `unit_of_work` 를 쓰지 않고 role 도 바꾸지 않는다. 근거는 모듈 docstring 이다.
    psycopg 를 함수 안에서 불러 `--help` 가 드라이버 없이도 동작하게 한다.
    """
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        raise SystemExit("SUPABASE_DB_URL 이 agent/.env 에 없다")
    import psycopg

    return psycopg.connect(url)


def find_taxonomy_id(conn: Any, job_role_id: str) -> str | None:
    """직무의 분류체계. 직무마다 하나다(docs/erd.md 7.1)."""
    with conn.cursor() as cur:
        cur.execute(
            "SELECT taxonomy_id FROM requirement_taxonomies WHERE job_role_id = %s",
            (job_role_id,),
        )
        row = cur.fetchone()
    return row[0] if row else None


def count_rows(conn: Any, sql: str, params: dict[str, Any]) -> int:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
    return int(row[0]) if row else 0


def run_write(conn: Any, sql: str, params: dict[str, Any]) -> int:
    """지우거나 고치고 손댄 행 수를 돌려준다. 거래는 부르는 쪽이 닫는다."""
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount


# ================================================================ 출력
def report_scope(
    job_role_id: str,
    dataset_version: str,
    taxonomy_id: str | None,
    ontology_version: str,
    phases: Sequence[int],
    execute: bool,
) -> None:
    print("Stage D 되돌리기")
    print(f"  직무          {job_role_id}")
    print(f"  데이터셋      {dataset_version}")
    print(f"  분류체계      {taxonomy_id or '없음'}")
    print(f"  온톨로지      {ontology_version}")
    print(f"  되돌릴 Phase  {' '.join(str(phase) for phase in phases)}")
    for phase in phases:
        print(f"                Phase {phase:<3}{PHASE_LABEL[phase]}")
    if execute:
        print("  방식          실제로 지운다")
    else:
        print("  방식          세기만 한다. 지우려면 --execute 를 붙인다")


def report_counts(counts: Sequence[tuple[DeleteStep, int]], restore: int) -> None:
    print("\n지울 행")
    for step, count in counts:
        print(f"  Phase {step.phase:<4}{step.table:<38}{count:>8}행  {step.note}")
    print(f"  {'합계':<48}{total_rows(counts):>8}행")
    if restore:
        print(f"\n  활성 분류체계 버전을 되살린다  {restore}행")


def report_kept() -> None:
    print("\n지우지 않는 표")
    for table, reason in KEPT_TABLES:
        print(f"  {table:<24}{reason}")
    print("  Stage B·C 의 원문·공고·청크·임베딩은 이 스크립트가 다루지 않는다")


def report_blockers(blocked: Sequence[tuple[Blocker, int]]) -> None:
    print("\n삭제를 막는 참조")
    for blocker, count in blocked:
        print(
            f"  {blocker.table}.{blocker.column} 가 지울 {blocker.target}을(를) "
            f"가리킨다  {count}행"
        )
    print("  이 행을 먼저 정리하기 전에는 되돌리지 못한다. 한 줄도 지우지 않았다")


# ================================================================ 인자
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Stage D(Phase 8~12)의 산출물을 지워 실행 전 상태로 되돌린다"
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--dataset-version", default=None, help="기본값은 매니페스트의 데이터셋 버전"
    )
    parser.add_argument("--job-role", default=None, help="기본값은 매니페스트의 직무")
    parser.add_argument(
        "--ontology-version",
        default=ONTOLOGY_VERSION,
        help="그래프 표의 범위를 정하는 온톨로지 버전",
    )
    parser.add_argument(
        "--phase",
        type=int,
        default=FIRST_PHASE,
        help=(
            f"되돌릴 첫 Phase. {FIRST_PHASE}~{LAST_PHASE}. "
            "이 Phase 와 그 뒤 Phase 를 함께 되돌린다"
        ),
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="실제로 지운다. 주지 않으면 세기만 한다",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="확인 문자열을 묻지 않고 지운다",
    )
    return parser.parse_args(argv)


def confirm(dataset_version: str, rows: int) -> bool:
    """확인 문자열을 받는다. 대화 입력이 없으면 진행하지 않는다."""
    if not sys.stdin.isatty():
        print("\n확인 입력을 받을 수 없다. --yes 를 붙여 실행한다")
        return False
    print(f"\n{rows}행을 지운다. 되돌릴 수 없다")
    typed = input(f"지우려면 데이터셋 버전을 그대로 입력한다 ({dataset_version}) ")
    return confirmation_matches(typed, dataset_version)


# ================================================================ 실행
def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    try:
        phases = phase_cascade(args.phase)
    except ValueError as error:
        print(f"Phase 가 잘못되었다: {error}")
        return EXIT_ABORTED

    manifest = SourceManifest.load(args.manifest)
    dataset_version = args.dataset_version or manifest.dataset_version
    job_role_id = args.job_role or manifest.job_role_id
    restored = 0

    # 거래 하나로 끝낸다. 세는 조회와 지우는 문장이 같은 거래 안에 있고 마지막에만
    # 반영하므로, 중간에 무엇이 실패해도 되돌아가 한 줄도 지워지지 않는다.
    with connect() as conn:
        taxonomy_id = find_taxonomy_id(conn, job_role_id)
        report_scope(
            job_role_id,
            dataset_version,
            taxonomy_id,
            args.ontology_version,
            phases,
            args.execute,
        )

        params: dict[str, Any] = {
            "dataset_version": dataset_version,
            "job_role_id": job_role_id,
            "taxonomy_id": taxonomy_id,
            "ontology_version": args.ontology_version,
        }

        steps = steps_for(phases)
        if taxonomy_id is None:
            skipped = tuple(step for step in steps if "%(taxonomy_id)s" in step.where)
            steps = tuple(step for step in steps if step not in skipped)
            print("\n분류체계를 찾지 못해 범위를 좁힐 수 없는 표가 있다. 지우지 않는다")
            for step in skipped:
                print(f"  {step.table}")

        blocked: list[tuple[Blocker, int]] = []
        if taxonomy_id is not None:
            for blocker in blockers_for(phases):
                count = count_rows(conn, blocker.sql, params)
                if count:
                    blocked.append((blocker, count))

        counts = [(step, count_rows(conn, step.count_sql(), params)) for step in steps]
        restore = (
            count_rows(conn, RESTORE_COUNT_SQL, params)
            if taxonomy_id is not None and 10 in phases
            else 0
        )
        report_counts(counts, restore)
        report_kept()

        if blocked:
            report_blockers(blocked)
            conn.rollback()
            return EXIT_FAILED

        if not args.execute:
            print("\n지우지 않았다. 실제로 지우려면 --execute 를 붙인다")
            conn.rollback()
            return EXIT_OK

        if not args.yes and not confirm(dataset_version, total_rows(counts)):
            print("확인 문자열이 다르다. 지우지 않았다")
            conn.rollback()
            return EXIT_ABORTED

        print("\n지운 행")
        try:
            for step in steps:
                removed = run_write(conn, step.delete_sql(), params)
                print(f"  Phase {step.phase:<4}{step.table:<38}{removed:>8}행")
            if taxonomy_id is not None and 10 in phases:
                restored = run_write(conn, RESTORE_SQL, params)
        except Exception as error:
            conn.rollback()
            print(f"\n실패했다. 아무것도 지우지 않았다: {error}")
            return EXIT_FAILED
        conn.commit()

    if restored:
        print(f"\n활성 분류체계 버전을 되살렸다  {restored}행")
    print("\n되돌렸다. python scripts/stage_d.py 로 다시 돌린다")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
