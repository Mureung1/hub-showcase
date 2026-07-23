from scout import fetch_list
from sources import SOURCES, REQUEST_DELAY_SEC
from graph import run
from db import save_notice
import time


for source in SOURCES:
    if not source["active"]:
        continue
    items = fetch_list(source)
    for seq, title in items:
        result = run(source, seq)
        if result.get("error"):
            print(f"[{source['name']}] {seq} 처리 실패:", result["error"])
            continue
            
        source_url = source["view_url"].format(id=seq)
        save_notice(
            source=source["id"],
            source_url=source_url,
            title=title,
            raw_text=result["raw_text"],
            extraction=result["extraction"],)