import os
import pathlib
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client

load_dotenv(dotenv_path=pathlib.Path(__file__).resolve().parents[1] / ".env")
_sb = create_client(
    supabase_url=os.getenv("SUPABASE_URL"),
    supabase_key=os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

def save_notice(source, source_url, title, raw_text, extraction):
    """공지 1건을 저장. source_url이 같으면 갱신(upsert)."""
    row = {
        "source": source,
        "source_url": source_url,
        "title": title,
        "raw_text": raw_text,
        "extraction": extraction,
    }
    res = _sb.table("notices").upsert(row, on_conflict="source_url").execute()
    return res.data

def find_notice(source_url):
    """source_url로 공지 1건 조회. 없으면 None."""
    res = _sb.table("notices").select("*").eq("source_url", source_url).execute()
    return res.data[0] if res.data else None

def get_routes():
    """등록된 경로 전부 — 매일 판정의 기준."""
    res = _sb.table("routes").select("id, name, lines, stops").execute()
    return res.data or []

def get_notices():
    """저장된 공지 전부(판정용). alerted_at 포함 — 이미 알린 공지 구분용."""
    res = _sb.table("notices").select("id, source, source_url, title, extraction, alerted_at").execute()
    return res.data or []

def mark_alerted(notice_id):
    """이 공지는 경보를 보냈다고 표시 — 다음 실행에서 재경보 방지(멱등성)."""
    _sb.table("notices").update(
        {"alerted_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", notice_id).execute()

if __name__ == "__main__":
    saved = save_notice(
        source="test",
        source_url="https://example.com/test-1",
        title="테스트 공지",
        raw_text="본문 내용",
        extraction={"events": []},
    )
    print("저장됨:", saved)