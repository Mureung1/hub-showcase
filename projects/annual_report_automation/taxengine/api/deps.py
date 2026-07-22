"""FastAPI 공용 dependency — DB 연결.

main.py에 있던 get_conn을 분리했다: auth.py(현재사용자)도 DB가 필요한데, main.py에서
가져오면 main ↔ auth 순환 import가 생긴다. main.py는 여기서 re-export하므로
`from taxengine.api.main import get_conn`(tests/test_api.py)은 계속 동작한다.
"""

from __future__ import annotations

from typing import Generator

from taxengine.db.conn import db_열기, 기본_대상, 연결


def get_conn() -> Generator[연결, None, None]:
    """요청마다 새 연결을 열고 끝나면 닫는다 — 커넥션은 스레드 간 공유하지 않는다.

    접속 대상은 환경변수로 정한다(conn.기본_대상): TAXWIZ_DATABASE_URL(Supabase/Postgres)
    우선, 없으면 TAXWIZ_DB(SQLite 파일 경로).

    한 요청 안에서 이 dependency를 여러 곳이 요구해도(FastAPI 기본 use_cache=True)
    같은 연결 하나를 공유한다 — 현재사용자(auth.py)와 엔드포인트가 같은 트랜잭션을 본다.
    """
    conn = db_열기(기본_대상())
    try:
        yield conn
    finally:
        conn.close()
