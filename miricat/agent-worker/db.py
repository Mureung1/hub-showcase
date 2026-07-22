import os
import pathlib

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

if __name__ == "__main__":
    saved = save_notice(
        source="test",
        source_url="https://example.com/test-1",
        title="테스트 공지",
        raw_text="본문 내용",
        extraction={"events": []},
    )
    print("저장됨:", saved)