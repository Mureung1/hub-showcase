"""저장소 접근의 유일한 통로.

정의는 docs/permission-matrix.md 6.1을 따른다.
다른 모듈은 psycopg 를 직접 import 하지 않는다.

거래마다 `SET LOCAL ROLE` 로 구성요소 role 을 지정한다. 거래가 끝나면 전환이
자동으로 풀리므로 role 이 새어 나가지 않는다.
"""

from __future__ import annotations

import os
from collections.abc import Iterator, Sequence
from contextlib import contextmanager
from typing import Any

import psycopg
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
