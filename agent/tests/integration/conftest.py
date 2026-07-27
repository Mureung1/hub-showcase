"""통합 테스트 공통 설정.

실제 데이터베이스가 필요하다. SUPABASE_DB_URL 이 없으면 건너뛴다.
테스트는 거래를 되돌리므로 데이터를 남기지 않는다.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from dotenv import load_dotenv

AGENT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(AGENT_ROOT / ".env")

DB_URL = os.getenv("SUPABASE_DB_URL")

requires_db = pytest.mark.skipif(
    not DB_URL, reason="SUPABASE_DB_URL 이 없어 통합 테스트를 건너뛴다"
)


@pytest.fixture
def db_url() -> str:
    if not DB_URL:
        pytest.skip("SUPABASE_DB_URL 없음")
    return DB_URL


@pytest.fixture
def rollback_conn(db_url: str) -> Iterator[object]:
    """되돌리는 거래. 테스트가 남긴 행을 정리하지 않아도 된다."""
    import psycopg

    conn = psycopg.connect(db_url)
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()
