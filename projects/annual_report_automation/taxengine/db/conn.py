"""DB 연결 계층 — SQLite(로컬 파일)와 Postgres(Supabase)를 같은 얼굴로 연다.

기존 코드(migrate/reader/snapshot/api)는 전부 sqlite3 스타일로 SQL을 쓴다:
`conn.execute("... ?", params)` + `cur.lastrowid`. Supabase(Postgres) 이관에서
ORM을 도입하는 대신(과설계 회피 방침, notes/DB-스키마-설계.md §8) 이 모듈이
두 백엔드의 차이 딱 3가지만 흡수한다:

  1. 플레이스홀더  — sqlite3 `?` ↔ psycopg `%s`  (PG연결.execute가 치환)
  2. 새 행 id      — `cur.lastrowid` ↔ `RETURNING id`  (삽입후id())
  3. 백엔드 판별   — PG인가()로 호출부가 분기 (INSERT OR IGNORE ↔ ON CONFLICT 등)

스키마는 두 벌이다: schema.sql(SQLite, 파일 없으면 여기서 지연 생성) /
schema.postgres.sql(Supabase SQL Editor에서 1회 수동 적용). **한쪽을 고치면
반드시 다른 쪽도 같이 고칠 것** — 드리프트는 tests/test_supabase_smoke.py의
정답 대조(차감납부세액 8,575,599)가 마지막 안전망이다.

주의: `?`→`%s` 치환은 단순 문자열 치환이다 — SQL 리터럴 안에 '?' 문자가
들어가는 쿼리를 쓰면 깨진다(현재 코드베이스에는 없음을 확인, 새 쿼리도 지킬 것).
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Union

SCHEMA_PATH = Path(__file__).parent / "schema.sql"
기본_DB경로 = "taxengine/db/taxwiz.db"

_PG_스킴 = ("postgres://", "postgresql://")


class PG연결:
    """psycopg(3) Connection을 sqlite3.Connection과 같은 얼굴로 감싼다.

    psycopg의 conn.execute(sql, params)는 sqlite3와 같은 편의 API라(커서 반환,
    fetchone/fetchall 동일) 여기서 하는 일은 플레이스홀더 치환뿐이다.
    """

    def __init__(self, raw):
        self.raw = raw  # psycopg.Connection

    def execute(self, sql: str, params=()):
        return self.raw.execute(sql.replace("?", "%s"), params)

    def commit(self) -> None:
        self.raw.commit()

    def rollback(self) -> None:
        self.raw.rollback()

    def close(self) -> None:
        self.raw.close()


연결 = Union[sqlite3.Connection, PG연결]


def PG인가(conn: 연결) -> bool:
    return isinstance(conn, PG연결)


def db_열기(대상: str | Path) -> 연결:
    """대상이 postgres:// URL이면 Supabase(Postgres), 아니면 SQLite 파일 경로.

    SQLite: 파일이 없으면 schema.sql을 실행해 새로 만든다(기존 migrate.db_열기 동작 그대로).
    Postgres: 스키마는 미리 적용돼 있어야 한다(schema.postgres.sql 참고).
    prepare_threshold=None은 Supabase pooler(특히 transaction pooler)가 prepared
    statement를 지원하지 않는 경우를 대비한 안전값.
    """
    if isinstance(대상, str) and 대상.startswith(_PG_스킴):
        import psycopg  # 선택 의존성 — SQLite만 쓰면 설치 불필요 (pyproject [postgres])

        return PG연결(psycopg.connect(대상, prepare_threshold=None))

    db_path = Path(대상)
    새로만듦 = not db_path.exists()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    if 새로만듦:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()
    return conn


def 기본_대상() -> str | Path:
    """환경변수로 접속 대상을 정한다 — TAXWIZ_DATABASE_URL(Postgres)이 있으면 우선,
    없으면 TAXWIZ_DB(SQLite 파일 경로, 기본 taxengine/db/taxwiz.db)."""
    url = os.environ.get("TAXWIZ_DATABASE_URL")
    if url:
        return url
    return Path(os.environ.get("TAXWIZ_DB", 기본_DB경로))


def 삽입후id(conn: 연결, sql: str, params=()) -> int:
    """INSERT를 실행하고 새 행의 id를 돌려준다 — SQLite는 lastrowid, Postgres는 RETURNING id."""
    if PG인가(conn):
        return conn.execute(sql + " RETURNING id", params).fetchone()[0]
    return conn.execute(sql, params).lastrowid
