"""저장소 접근의 유일한 통로.

정의는 docs/permission-matrix.md 6.1을 따른다.
다른 모듈은 psycopg 를 직접 import 하지 않는다.

거래마다 `SET LOCAL ROLE` 로 구성요소 role 을 지정한다. 거래가 끝나면 전환이
자동으로 풀리므로 role 이 새어 나가지 않는다.

항목을 순회하며 저장하는 자리는 `item_savepoint` 로 항목 하나를 감싼다. PostgreSQL
은 거래 안에서 오류가 나면 그 거래의 남은 명령을 전부 거부하므로, 세이브포인트 없이
예외만 잡고 다음 항목으로 넘어가면 뒤의 저장이 모두 `InFailedSqlTransaction` 으로
실패하며 같은 사유가 항목 수만큼 반복된다. 세이브포인트는 실패한 항목만 되돌리고
거래를 살려 둔다.

세이브포인트로도 살릴 수 없는 실패가 있다. 연결이 끊겼거나 거래가 이미 죽은 뒤라면
되돌리기 자체가 실패한다. `transaction_is_dead` 가 그것을 가르고, 부르는 쪽은 참이면
남은 항목을 시도하지 않고 멈춘다.
"""

from __future__ import annotations

import os
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from typing import Any

import psycopg
from psycopg.pq import TransactionStatus
from psycopg.rows import dict_row

from careersignal.domain.permissions import (
    DB_ROLE,
    Component,
    require_write,
)


def connection_string() -> str:
    url = os.getenv("SUPABASE_DB_URL")
    if not url:
        raise RuntimeError("SUPABASE_DB_URL 이 agent/.env 에 없다")
    return url


# ================================================================ 거래 사망 판정
TRANSACTION_FATAL_EXCEPTIONS: frozenset[str] = frozenset(
    {
        "InFailedSqlTransaction",
        "OperationalError",
        "InterfaceError",
        "AdminShutdown",
        "IdleInTransactionSessionTimeout",
        "ConnectionTimeout",
    }
)
"""이름만으로 거래가 죽었다고 보는 예외 클래스.

- `InFailedSqlTransaction` 은 이 거래가 이미 오류로 끝난 뒤다. 남은 명령은 전부
  거부되므로 다음 항목을 시도하는 것이 실패 줄만 쌓는다.
- `OperationalError`·`InterfaceError` 는 연결 자체가 끊긴 상태다.
- 나머지 셋은 서버가 세션을 닫은 경우이며 되돌리기도 통하지 않는다.

이름을 적을 뿐 예외 클래스를 import 하지 않는다. 문자열 대조는 드라이버가 바뀌어도
같은 자리에서 동작하고, 대역이 같은 이름의 예외를 던져 검사할 수 있다. 방식은
`taxonomy/assignment.py` 의 `is_unrecoverable` 과 같다.
"""

TRANSACTION_FATAL_MARKERS: tuple[str, ...] = (
    "current transaction is aborted",
    "server closed the connection",
    "connection is closed",
    "connection already closed",
    "connection is bad",
    "the connection is lost",
)
"""메시지에 이 말이 있으면 거래가 죽었다.

클래스 이름만으로 가를 수 없는 자리가 있다. 드라이버가 예외를 감싸면 이름이 바뀌어도
이 문장은 남는다. 대조는 소문자로 접은 뒤 부분 문자열로 한다.
"""


def is_transaction_fatal(exception_name: str, message: str) -> bool:
    """이 실패 뒤에 같은 거래로 더 저장할 수 있는가를 가른다. 순수 함수다.

    예외 객체가 아니라 `type(exc).__name__` 과 `str(exc)` 두 문자열만 받는다. 두
    문자열이면 대역으로 모든 갈래를 검사할 수 있다.

    참이면 부르는 쪽이 남은 항목을 시도하지 않고 멈춘다. 죽은 거래에 명령을 더 보내면
    같은 사유의 실패 줄만 항목 수만큼 쌓이고, 무엇이 진짜 원인이었는지 묻힌다.
    거짓이면 그 항목만 실패로 세고 다음 항목으로 넘어간다.
    """
    if exception_name in TRANSACTION_FATAL_EXCEPTIONS:
        return True
    folded = message.casefold()
    return any(marker in folded for marker in TRANSACTION_FATAL_MARKERS)


def transaction_is_dead(exc: BaseException) -> bool:
    """예외 객체 하나를 `is_transaction_fatal` 의 두 문자열로 옮긴다."""
    return is_transaction_fatal(type(exc).__name__, str(exc))


class Unit:
    """한 거래. 구성요소 role 로 전환된 상태에서 실행한다."""

    def __init__(self, conn: psycopg.Connection, component: Component) -> None:
        self._conn = conn
        self.component = component

    # ------------------------------------------------------------ 읽기
    def fetch_all(
        self, sql: str, params: Sequence[Any] | dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        with self._conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params)
            return list(cur.fetchall())

    def fetch_one(
        self, sql: str, params: Sequence[Any] | dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        with self._conn.cursor(row_factory=dict_row) as cur:
            cur.execute(sql, params)
            return cur.fetchone()

    def fetch_value(
        self, sql: str, params: Sequence[Any] | dict[str, Any] | None = None
    ) -> Any:
        with self._conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            return row[0] if row else None

    # ------------------------------------------------------------ 쓰기
    def insert(self, table: str, values: dict[str, Any]) -> None:
        """쓰기 범위를 코드에서 먼저 막고, 데이터베이스가 다시 막는다."""
        require_write(self.component, table)
        columns = ", ".join(values)
        placeholders = ", ".join(f"%({k})s" for k in values)
        with self._conn.cursor() as cur:
            cur.execute(
                f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", values
            )

    def insert_many(self, table: str, rows: Sequence[dict[str, Any]]) -> None:
        require_write(self.component, table)
        if not rows:
            return
        columns = ", ".join(rows[0])
        placeholders = ", ".join(f"%({k})s" for k in rows[0])
        with self._conn.cursor() as cur:
            cur.executemany(
                f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", rows
            )

    def update(
        self, table: str, values: dict[str, Any], where: str, params: dict[str, Any]
    ) -> int:
        require_write(self.component, table)
        assignments = ", ".join(f"{k} = %(set_{k})s" for k in values)
        merged = {f"set_{k}": v for k, v in values.items()} | params
        with self._conn.cursor() as cur:
            cur.execute(f"UPDATE {table} SET {assignments} WHERE {where}", merged)
            return cur.rowcount

    def execute(
        self, sql: str, params: Sequence[Any] | dict[str, Any] | None = None
    ) -> None:
        """제약과 정책 검증에만 사용한다. 일반 쓰기는 insert·update 를 쓴다."""
        with self._conn.cursor() as cur:
            cur.execute(sql, params)

    # ------------------------------------------------------------ 항목 되돌림
    @contextmanager
    def savepoint(self) -> Iterator[None]:
        """항목 하나의 되돌림 지점.

        안에서 예외가 나면 이 지점까지만 되돌리고 예외를 그대로 올린다. 거래는 살아
        있으므로 부르는 쪽이 다음 항목을 계속 저장할 수 있다. 감싸지 않으면 실패한 항목
        하나가 거래를 죽이고 뒤의 저장이 전부 `InFailedSqlTransaction` 이 된다.

        psycopg 의 `Connection.transaction()` 은 거래가 이미 열려 있으면 `SAVEPOINT`
        를 발행한다. `unit_of_work` 가 `SET LOCAL ROLE` 을 먼저 실행하므로 이 메서드가
        불리는 시점에는 언제나 거래가 열려 있다.

        **주 갈래에서만 부른다.** `Unit` 은 psycopg 연결 하나를 감싸며 스레드 안전하지
        않다. 모델 호출만 겹치고 저장은 돌아온 결과를 주 갈래에서 하는 전제
        (`providers/concurrency.py`)를 이 메서드가 바꾸지 않는다.
        """
        if self._conn.pgconn.transaction_status == TransactionStatus.IDLE:
            # 거래가 아직 열리지 않았다. 이 상태에서 `transaction()` 을 쓰면
            # 세이브포인트가 아니라 바깥 거래가 되고, 정상 종료할 때 그 자리에서
            # 커밋해 버린다. 문장 하나로 거래를 먼저 연다.
            with self._conn.cursor() as cur:
                cur.execute("SELECT 1")
        with self._conn.transaction():
            yield


@contextmanager
def unit_of_work(component: Component, conninfo: str | None = None) -> Iterator[Unit]:
    """구성요소 role 로 전환한 거래를 연다.

    예외가 나면 되돌리고 정상 종료하면 반영한다.
    """
    role = DB_ROLE[component]
    with psycopg.connect(conninfo or connection_string()) as conn:
        try:
            with conn.cursor() as cur:
                cur.execute(f'SET LOCAL ROLE "{role}"')
            yield Unit(conn, component)
            conn.commit()
        except Exception:
            conn.rollback()
            raise


@contextmanager
def item_savepoint(repository: Any) -> Iterator[None]:
    """항목 하나의 저장을 되돌림 지점 안에서 실행한다.

    저장소가 어느 거래 위에 서 있는지 모르는 자리에서도 쓸 수 있게 저장소 객체를
    받는다. `Repository` 는 `unit` 을 갖고 `Unit` 은 `savepoint` 를 갖는다.

    되돌림 지점을 만들 수 없는 저장소는 그냥 통과시킨다. 단위 검사의 대역 저장소는
    거래를 갖지 않으며, 대역에까지 거래를 요구하면 규칙만 보는 검사가 데이터베이스를
    끌어들인다. 통과시켜도 대역에는 되돌릴 거래가 없으므로 의미가 달라지지 않는다.
    """
    unit = getattr(repository, "unit", None)
    savepoint = getattr(unit, "savepoint", None)
    if savepoint is None:
        yield
        return
    with savepoint():
        yield


class Repository:
    """구성요소별 저장소의 기반.

    각 구성요소는 자기 저장소만 주입받는다. 다른 구성요소의 쓰기 메서드는
    코드에 존재하지 않으므로 잘못 호출할 대상이 없다.
    """

    component: Component

    def __init__(self, unit: Unit) -> None:
        if unit.component is not self.component:
            raise PermissionError(
                f"{type(self).__name__} 는 {self.component} 거래에서만 쓴다. "
                f"현재 거래는 {unit.component} 다"
            )
        self.unit = unit

    # ------------------------------------------------------------ 활성 분류체계
    _ACTIVE_TAXONOMY = """
        SELECT tv.taxonomy_version_id, tv.taxonomy_id, tv.version_number,
               tv.taxonomy_policy_version
        FROM requirement_taxonomy_versions tv
        JOIN requirement_taxonomies t ON t.taxonomy_id = tv.taxonomy_id
        WHERE t.job_role_id = %(job_role_id)s
          AND tv.published_at IS NOT NULL
          AND tv.superseded_at IS NULL
    """
    """직무의 활성 분류체계 버전.

    조건을 `requirement_taxonomy_versions` 의 부분 유니크 인덱스와 같게 둔다
    (docs/erd.md 7.2). 인덱스가 `published_at IS NOT NULL AND superseded_at IS NULL`
    인 행을 분류체계마다 하나로 강제하고, `requirement_taxonomies.job_role_id` 가
    UNIQUE 이므로 이 조회는 많아야 한 행이다. 애플리케이션이 최신 버전을 고르는
    규칙을 따로 두면 인덱스와 어긋날 수 있다.

    자리가 저장소 공통 기반이다. 통계·승격·할당·그래프가 모두 같은 직무의 같은 활성
    버전을 봐야 하는데, 같은 조회를 저장소마다 베껴 두면 한쪽만 고쳐졌을 때 두
    구성요소가 서로 다른 버전을 보고도 아무 데서도 걸리지 않는다. 조회는 읽기이고
    모든 구성요소 role 이 SELECT 를 갖고 있으므로(`0004_component_grants.sql`) 기반에
    두어도 쓰기 범위가 넓어지지 않는다.
    """

    def active_taxonomy_version(self, job_role_id: str) -> dict[str, Any] | None:
        """활성 분류체계 버전 한 행. 발행된 버전이 없으면 비운다."""
        return self.unit.fetch_one(self._ACTIVE_TAXONOMY, {"job_role_id": job_role_id})
