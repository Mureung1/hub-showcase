r"""Stage E(Phase 13)의 산출물을 지워 실행 전 상태로 되돌리는 운영자 도구.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/reset_stage_e.py

기본 동작은 세기만 하는 것이다. 위 명령은 표마다 지울 행 수를 찍고 한 줄도 지우지
않는다. 실제로 지우려면 `--execute` 를 준다:
    python scripts/reset_stage_e.py --execute

`--execute` 는 지울 행 수를 먼저 보여주고 확인 문자열을 받는다. 확인 문자열은
데이터셋 버전(예: ds_backend_2026_07)이며 `y` 한 글자로는 진행하지 않는다. 확인을
묻지 않으려면 `--yes` 를 함께 준다:
    python scripts/reset_stage_e.py --execute --yes

깊이 프로파일부터 뒤 산출물만 되돌린다:
    python scripts/reset_stage_e.py --unit 5 --execute

범위는 `--dataset-version` 과 `--job-role` 로 좁히고 기본값은 매니페스트에서 읽는다.
`scripts/stage_e.py` 와 `scripts/reset_stage_d.py` 가 쓰는 방식과 같다.

되돌림은 뒤로 번진다. 13-1 을 되돌리면 그 지표 행 위에 쌓인 13-2·13-5 도 함께
되돌린다. 앞 단계를 지우고 뒤 단계를 남기면 남은 행이 사라진 행을 가리켜 분석이 틀린
근거를 갖는다. `--unit` 은 시작 단위 하나만 받고 나머지는 `unit_cascade` 가 펼친다.

단위 가운데 지울 표가 없는 것이 둘이다. 13-3(표본 판정)은 별도의 표가 아니라
`statistics_facts` 의 `sample_status`·`uncertainty` 컬럼이므로 그 행과 함께 사라진다.
13-4(수치 검증)의 `verification_results` 는 지우지 않는다. 무엇을 언제 검사했는지의
기록이며 산출물이 아니다.

권한은 `unit_of_work` 를 쓰지 않는다. `src/careersignal/repositories/base.py` 의
`unit_of_work` 는 거래마다 `SET LOCAL ROLE` 로 구성요소 role 로 전환하고,
`migrations/sql/0004_component_grants.sql` 은 어떤 구성요소 role 에도 DELETE 를 주지
않는다. 실행 경로가 지울 수 없는 것이 설계이며 그 설계를 이 스크립트 때문에 넓히지
않는다. 그래서 이 스크립트는 role 전환 없이 `SUPABASE_DB_URL` 소유자 연결로 psycopg
거래를 직접 연다. 근거는 docs/adr/0006-migration-ownership.md 다.

되돌린 뒤에는 `python scripts/stage_e.py` 를 다시 돌린다.
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
from careersignal.metrics.temporal import TEMPORAL_DELTA_FAMILY  # noqa: E402

DEFAULT_MANIFEST = ROOT / "data" / "manifest" / "backend.json"

FIRST_UNIT = 1
LAST_UNIT = 6

UNIT_LABEL: dict[int, str] = {
    1: "지표 집계",
    2: "시간 연산자",
    3: "표본 판정과 억제",
    4: "수치 검증",
    5: "역량별 깊이 프로파일",
    6: "표본 수렴 기록",
}

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_ABORTED = 2

KEPT_TABLES: tuple[tuple[str, str], ...] = (
    ("verification_results", "무엇을 언제 검사했는지의 기록. 산출물이 아니다"),
    ("agent_runs", "실행 기록. 추가 전용이며 트리거가 삭제를 막는다"),
    ("agent_run_steps", "실행 기록. 추가 전용이며 트리거가 삭제를 막는다"),
    ("tool_calls", "실행 기록. 추가 전용이며 트리거가 삭제를 막는다"),
    ("analysis_versions", "실행 봉투. 산출물이 아니라 무엇을 돌렸는지의 기록이다"),
    ("metric_policy_versions", "운영자가 마이그레이션과 시드로 관리하는 정책 표다"),
)
"""Stage E 가 건드리지만 되돌리지 않는 표. 왜 남기는지를 함께 적는다."""


# ================================================================ 범위 조회
SCOPED_ANALYSIS_VERSIONS = """
    SELECT av.analysis_version
    FROM analysis_versions AS av
    WHERE av.job_role_id = %(job_role_id)s
      AND av.dataset_version = %(dataset_version)s
"""
"""이 직무·데이터셋의 분석 버전.

세 산출물 표는 모두 `analysis_version` 을 NOT NULL 로 갖는다(docs/erd.md 10.5~10.7).
데이터셋 버전 컬럼은 없으므로 분석 버전이 직무와 데이터셋을 함께 가리킨다.
"""

DOOMED_FACTS = f"""
    SELECT f.fact_id
    FROM statistics_facts AS f
    WHERE f.analysis_version IN ({SCOPED_ANALYSIS_VERSIONS})
"""
"""지울 지표 행. 주장이 이 행을 근거로 삼는지 확인하는 데 쓴다."""


# ================================================================ 지울 대상
@dataclass(frozen=True, slots=True)
class DeleteStep:
    """지울 표 하나와 그 범위 조건.

    조건 없는 삭제를 만들 수 없다. 세는 문장과 지우는 문장이 같은 `where` 하나에서
    나오므로 미리 보여 준 수와 실제로 지운 수가 어긋나지 않는다.
    """

    unit: int
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
        unit=5,
        table="capability_depth_profiles",
        alias="tgt",
        where=f"tgt.analysis_version IN ({SCOPED_ANALYSIS_VERSIONS})",
        note="역량별 기대 깊이",
    ),
    DeleteStep(
        unit=2,
        table="statistics_facts",
        alias="tgt",
        where=(
            f"tgt.analysis_version IN ({SCOPED_ANALYSIS_VERSIONS})"
            f" AND tgt.metric_family = '{TEMPORAL_DELTA_FAMILY}'"
        ),
        note="시간 연산자가 만든 지표 행",
    ),
    DeleteStep(
        unit=1,
        table="statistics_facts",
        alias="tgt",
        where=(
            f"tgt.analysis_version IN ({SCOPED_ANALYSIS_VERSIONS})"
            f" AND tgt.metric_family <> '{TEMPORAL_DELTA_FAMILY}'"
        ),
        note="일곱 family 의 지표 행",
    ),
    DeleteStep(
        unit=6,
        table="saturation_observations",
        alias="tgt",
        where=(
            f"tgt.analysis_version IN ({SCOPED_ANALYSIS_VERSIONS})"
            " AND tgt.job_role_id = %(job_role_id)s"
        ),
        note="표본 수렴 관측",
    ),
)
"""지우는 차례와 범위.

`statistics_facts` 를 두 단계로 나눈다. 13-2 의 델타 행은 13-1 의 지표 행에서 나왔고
같은 표에 담기므로, `metric_family` 로 갈라야 단위를 골라 되돌릴 수 있다. 두 조건이
서로 겹치지 않으므로 둘을 함께 고르면 표 전체를 한 번씩만 센다.

깊이 프로파일을 먼저 지운다. 외래키가 걸려 있지는 않으나 지표 행에서 파생한
산출물이므로(docs/statistics-model.md 9장) 근거보다 먼저 사라져야 중간 상태가
남지 않는다.

`saturation_observations` 는 지표 행을 근거로 삼지 않는다. 공고 누적과 차원 후보
증가를 세므로 13-1 을 되돌려도 그대로 유효하지만, 되돌림이 뒤로 번지는 규칙을 따라
13-6 을 골랐을 때만 지운다.
"""


# ================================================================ 막는 참조
@dataclass(frozen=True, slots=True)
class Blocker:
    """지우지 않는 표가 지울 행을 가리키는 자리.

    `analysis_claim_evidence.support_id` 는 외래키가 아니다(docs/erd.md 11.5). 지워도
    삭제가 실패하지 않고 주장이 사라진 근거를 가리킨 채로 남는다. 데이터베이스가 막지
    않으므로 이 스크립트가 먼저 본다.
    """

    table: str
    column: str
    target: str
    sql: str


def blockers_for(units: Sequence[int]) -> tuple[Blocker, ...]:
    """이번 범위에서 되돌림을 막을 참조를 모은다.

    지표 행을 지우는 단위에서만 본다. 깊이 프로파일과 수렴 관측을 근거로 인용하는
    자리는 아직 없다.
    """
    if not {1, 2} & set(units):
        return ()
    return (
        Blocker(
            table="analysis_claim_evidence",
            column="support_id",
            target="지표 행",
            sql=(
                "SELECT count(*) FROM analysis_claim_evidence AS e "
                "WHERE e.support_type = 'statistic_fact' "
                f"AND e.support_id IN ({DOOMED_FACTS})"
            ),
        ),
    )


# ================================================================ 순수 함수
def unit_cascade(start: int) -> tuple[int, ...]:
    """되돌릴 단위를 펼친다. 한 단위를 되돌리면 그 뒤도 함께 되돌린다.

    13-1 을 되돌리면 13-2 와 13-5 도 무효다. 지표 행이 사라지면 그 행을 뺀 델타와 그
    행을 합친 프로파일이 근거를 잃는다. 되돌릴 단위를 사용자가 임의로 고르게 두면
    사라진 행을 가리키는 산출물이 남는다.
    """
    if start < FIRST_UNIT or start > LAST_UNIT:
        raise ValueError(f"단위는 {FIRST_UNIT}~{LAST_UNIT} 사이다")
    return tuple(range(start, LAST_UNIT + 1))


def steps_for(units: Sequence[int]) -> tuple[DeleteStep, ...]:
    """고른 단위의 삭제 단계만 남긴다. 지우는 차례는 그대로 둔다."""
    selected = set(units)
    return tuple(step for step in DELETE_STEPS if step.unit in selected)


def confirmation_matches(typed: str, dataset_version: str) -> bool:
    """확인 문자열이 데이터셋 버전과 같은가.

    `y` 나 `yes` 로는 지워지지 않는다. 지우는 대상의 이름을 그대로 치게 해야 무엇을
    지우는지 읽지 않고 손가락만 움직이는 확인을 막는다.
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


def count_rows(conn: Any, sql: str, params: dict[str, Any]) -> int:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        row = cur.fetchone()
    return int(row[0]) if row else 0


def run_write(conn: Any, sql: str, params: dict[str, Any]) -> int:
    """지우고 손댄 행 수를 돌려준다. 거래는 부르는 쪽이 닫는다."""
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.rowcount


# ================================================================ 출력
def report_scope(
    job_role_id: str,
    dataset_version: str,
    units: Sequence[int],
    execute: bool,
) -> None:
    print("Stage E 되돌리기")
    print(f"  직무          {job_role_id}")
    print(f"  데이터셋      {dataset_version}")
    print(f"  되돌릴 단위   {' '.join(f'13-{unit}' for unit in units)}")
    for unit in units:
        print(f"                13-{unit}  {UNIT_LABEL[unit]}")
    if execute:
        print("  방식          실제로 지운다")
    else:
        print("  방식          세기만 한다. 지우려면 --execute 를 붙인다")


def report_counts(counts: Sequence[tuple[DeleteStep, int]]) -> None:
    print("\n지울 행")
    for step, count in counts:
        print(f"  13-{step.unit:<4}{step.table:<32}{count:>8}행  {step.note}")
    print(f"  {'합계':<40}{total_rows(counts):>8}행")


def report_kept() -> None:
    print("\n지우지 않는 표")
    for table, reason in KEPT_TABLES:
        print(f"  {table:<24}{reason}")
    print("  Stage B·C·D 의 원문·공고·표현·할당은 이 스크립트가 다루지 않는다")


def report_blockers(blocked: Sequence[tuple[Blocker, int]]) -> None:
    print("\n되돌림을 막는 참조")
    for blocker, count in blocked:
        print(
            f"  {blocker.table}.{blocker.column} 가 지울 {blocker.target}을(를) "
            f"가리킨다  {count}행"
        )
    print("  이 행을 먼저 정리하기 전에는 되돌리지 못한다. 한 줄도 지우지 않았다")


# ================================================================ 인자
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Stage E(Phase 13)의 산출물을 지워 실행 전 상태로 되돌린다"
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument(
        "--dataset-version", default=None, help="기본값은 매니페스트의 데이터셋 버전"
    )
    parser.add_argument("--job-role", default=None, help="기본값은 매니페스트의 직무")
    parser.add_argument(
        "--unit",
        type=int,
        default=FIRST_UNIT,
        help=(
            f"되돌릴 첫 단위. {FIRST_UNIT}~{LAST_UNIT}. "
            "이 단위와 그 뒤 단위를 함께 되돌린다"
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
        units = unit_cascade(args.unit)
    except ValueError as error:
        print(f"단위가 잘못되었다: {error}")
        return EXIT_ABORTED

    manifest = SourceManifest.load(args.manifest)
    dataset_version = args.dataset_version or manifest.dataset_version
    job_role_id = args.job_role or manifest.job_role_id

    # 거래 하나로 끝낸다. 세는 조회와 지우는 문장이 같은 거래 안에 있고 마지막에만
    # 반영하므로, 중간에 무엇이 실패해도 되돌아가 한 줄도 지워지지 않는다.
    with connect() as conn:
        report_scope(job_role_id, dataset_version, units, args.execute)

        params: dict[str, Any] = {
            "dataset_version": dataset_version,
            "job_role_id": job_role_id,
        }
        steps = steps_for(units)
        blocked: list[tuple[Blocker, int]] = []
        for blocker in blockers_for(units):
            count = count_rows(conn, blocker.sql, params)
            if count:
                blocked.append((blocker, count))

        counts = [(step, count_rows(conn, step.count_sql(), params)) for step in steps]
        report_counts(counts)
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
                print(f"  13-{step.unit:<4}{step.table:<32}{removed:>8}행")
        except Exception as error:
            conn.rollback()
            print(f"\n실패했다. 아무것도 지우지 않았다: {error}")
            return EXIT_FAILED
        conn.commit()

    print("\n되돌렸다. python scripts/stage_e.py 로 다시 돌린다")
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
