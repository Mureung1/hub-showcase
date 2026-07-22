"""정해진 게시판(sources.py)에서 공지 목록을 긁어온다. (MIRI-13)"""

import re
import requests
from bs4 import BeautifulSoup

from sources import SOURCES, HEADERS, MAX_ITEMS_PER_RUN


def fetch_list(source):
    """소스 하나의 게시판 목록에서 (글번호, 제목) 리스트를 뽑는다."""
    resp = requests.get(source["list_url"], headers=HEADERS, timeout=10)
    resp.encoding = resp.apparent_encoding      # 인코딩 자동 감지 (한글 깨짐 방지)

    items = re.findall(source["list_pattern"], resp.text)          # ① 어느 패턴으로 뽑지?
    items = items[:MAX_ITEMS_PER_RUN]                          # ② 최근 몇 건만?

    return items

def fetch_body(source, seq):
    """글번호 하나로 본문 페이지를 긁어 텍스트를 뽑는다."""
    
    url = source["view_url"].format(id=seq)      # ① 틀에 글번호 끼우기
    resp = requests.get(url, headers=HEADERS, timeout=10)
    resp.encoding = resp.apparent_encoding

    soup = BeautifulSoup(resp.text, "html.parser")  # ② HTML 파싱
    box = soup.select_one(".sub04-05-view-wrap")
    return box.get_text(" ", strip=True) if box else ""

if __name__ == "__main__":
    for source in SOURCES:
        if not source["active"]:            # 꺼둔 소스는 건너뜀
            continue
        print(f"=== {source['name']} ===")

        items = fetch_list(source)
        for seq, title in items:
            print(" ", seq, title.strip())

        # 첫 글 하나만 본문 뽑아보기 (확인용)
        first_seq = items[0][0]              # 첫 글의 글번호
        print("\n--- 첫 글 본문 (앞 400자) ---")
        print(fetch_body(source, first_seq)[:400])

