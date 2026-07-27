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
    res = _sb.table("routes").select("id, name, lines, stops, roads").execute()
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

def reset_alerts(keyword=None):
    """경보 표시(alerted_at)를 되돌린다 — 데모/리허설에서 경보를 다시 울리기 위한 용도.
    keyword를 주면 제목에 그 단어가 든 공지만, 없으면 표시된 공지 전부."""
    q = _sb.table("notices").update({"alerted_at": None})
    if keyword:
        q = q.ilike("title", f"%{keyword}%")          # ilike = 대소문자 무시 부분 일치
    else:
        q = q.filter("alerted_at", "not.is", "null")  # 이미 표시된 것만 (전부 리셋)
    res = q.execute()
    return len(res.data or [])

if __name__ == "__main__":
    saved = save_notice(
        source="test",
        source_url="https://example.com/test-1",
        title="테스트 공지",
        raw_text="본문 내용",
        extraction={"events": []},
    )
    print("저장됨:", saved)