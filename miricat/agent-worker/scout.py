"""정해진 게시판(sources.py)에서 공지 목록을 긁어온다. (MIRI-13)"""

import re
import requests

from sources import SOURCES, HEADERS, MAX_ITEMS_PER_RUN


def fetch_list(source):
    """소스 하나의 게시판 목록에서 (글번호, 제목) 리스트를 뽑는다."""
    resp = requests.get(source["list_url"], headers=HEADERS, timeout=10)
    resp.encoding = resp.apparent_encoding      # 인코딩 자동 감지 (한글 깨짐 방지)

    items = re.findall(source["list_pattern"], resp.text)          # ① 어느 패턴으로 뽑지?
    items = items[:MAX_ITEMS_PER_RUN]                          # ② 최근 몇 건만?

    return items


if __name__ == "__main__":
    for source in SOURCES:
        if not source["active"]:            # 꺼둔 소스는 건너뜀
            continue
        print(f"=== {source['name']} ===")
        for seq, title in fetch_list(source):
            print(" ", seq, title.strip())
