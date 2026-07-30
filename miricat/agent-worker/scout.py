"""정해진 게시판(sources.py)에서 공지 목록을 긁어온다. (MIRI-13)"""

import re
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import requests
from bs4 import BeautifulSoup

from sources import SOURCES, HEADERS, MAX_ITEMS_PER_RUN


def _gbis_fetch_list(source):
    """GBIS 전용: 목록이 HTML이 아니라 JSON API(POST)로 온다."""
    resp = requests.post(source["list_url"], headers=HEADERS, timeout=10, data={
        "cmd": "getRouteChangeList", "pageNum": "", "pageCnt": "10", "title": "", "titleOp": "",
    })
    items = [(str(n["NOTICE_IDX"]), " ".join((n.get("TITLE") or "").split()))
             for n in resp.json().get("list", [])]
    return items[:MAX_ITEMS_PER_RUN]


def _gbis_fetch_body(source, seq):
    """GBIS 전용: 본문이 페이지 script의 contents_c 변수에 담겨 온다 — 정규식으로 뽑고 태그 제거."""
    resp = requests.get(source["view_url"].format(id=seq), headers=HEADERS, timeout=10)
    resp.encoding = resp.apparent_encoding
    m = re.search(r"contents_c = '(.*?)';", resp.text, re.S)
    if not m:
        return ""
    return " ".join(re.sub(r"<[^>]+>", " ", m.group(1)).split())


_topis_cache = {}   # TOPIS는 목록 JSON에 본문(HTML)이 같이 온다 — 캐시해두고 body에서 재사용


def _topis_fetch_list(source):
    """서울 TOPIS 전용: 목록이 JSON API(POST)이고 본문까지 포함."""
    resp = requests.post(source["list_url"], data={"pageIndex": "1"},
                         headers={**HEADERS, "X-Requested-With": "XMLHttpRequest"}, timeout=10)
    items = []
    for row in resp.json().get("rows", []):
        # 원문 URL에 게시판 구분(bdwrDivCd)과 글번호가 둘 다 필요해서 합성 id로 만든다
        seq = f"{row.get('bdwrDivCd')}&bdwrSeq={row.get('bdwrSeq')}"
        _topis_cache[seq] = row
        items.append((seq, " ".join((row.get("bdwrTtlNm") or "").split())))
    return items[:MAX_ITEMS_PER_RUN]


def _topis_fetch_body(source, seq):
    row = _topis_cache.get(str(seq))
    if not row:
        return ""
    text = re.sub(r"<[^>]+>", " ", row.get("bdwrCts") or "").replace("&nbsp;", " ")
    return " ".join(text.split())


_daegu_cache = {}   # 대구도 목록 JSON에 본문(bodyNote)이 같이 온다


def _daegu_fetch_list(source):
    """대구 BIS 전용: 내부 JSON API 3개(공지 C·정류소 조정 A·우회운행 detourList)를 합쳐 수집."""
    base = "https://businfo.daegu.go.kr:8095/dbms_web_api"
    boards = [("C", f"{base}/boardC"), ("A", f"{base}/boardA"), ("D", f"{base}/detourList")]
    items = []
    for tag, url in boards:
        try:
            rows = requests.get(url, headers=HEADERS, timeout=10,
                                verify=source.get("verify_ssl", True)).json().get("body", [])
        except Exception:
            continue                     # 게시판 하나 죽어도 나머지는 수집
        for row in rows[:MAX_ITEMS_PER_RUN]:
            seq = f"{tag}{row.get('no')}"          # 게시판 구분 + 글번호 = 합성 id
            _daegu_cache[seq] = row
            items.append((seq, " ".join((row.get("ttle") or "").split())))
    return items[:MAX_ITEMS_PER_RUN * 2]           # 게시판 3개 합산이라 상한 완화


def _daegu_fetch_body(source, seq):
    row = _daegu_cache.get(str(seq))
    if not row:
        return ""
    import html as _html
    text = re.sub(r"<[^>]+>", " ", row.get("bodyNote") or "")
    return " ".join(_html.unescape(text).split())


# 표준(HTML+정규식) 틀을 못 따르는 소스들의 전용 페처 (목록 함수, 본문 함수)
FETCHERS = {
    "daegu": (_daegu_fetch_list, _daegu_fetch_body),
    "gbis_route_change": (_gbis_fetch_list, _gbis_fetch_body),
    "topis": (_topis_fetch_list, _topis_fetch_body),
}


def fetch_list(source):
    """소스 하나의 게시판 목록에서 (글번호, 제목) 리스트를 뽑는다."""
    custom = FETCHERS.get(source.get("fetcher"))
    if custom:
        return custom[0](source)
    resp = requests.get(source["list_url"], headers=HEADERS, timeout=10,
                        verify=source.get("verify_ssl", True))   # 제주 등 중간 인증서 누락 사이트 예외
    resp.encoding = resp.apparent_encoding      # 인코딩 자동 감지 (한글 깨짐 방지)

    items = re.findall(source["list_pattern"], resp.text)
    items = [(seq, " ".join(title.replace("&nbsp;", " ").split())) for seq, title in items]   # 제목의 개행·탭·&nbsp; 정리

    # 교통 공지만 통과 (시정 소식·공모전 섞인 게시판용) — title_filter 없으면 전부 통과
    title_filter = source.get("title_filter")
    if title_filter:
        items = [(s, t) for s, t in items if re.search(title_filter, t)]

    return items[:MAX_ITEMS_PER_RUN]                                   # 최근 몇 건만

def fetch_body(source, seq):
    """글번호 하나로 본문 페이지를 긁어 텍스트를 뽑는다."""
    custom = FETCHERS.get(source.get("fetcher"))
    if custom:
        return custom[1](source, seq)

    url = source["view_url"].format(id=seq)      # ① 틀에 글번호 끼우기
    resp = requests.get(url, headers=HEADERS, timeout=10,
                        verify=source.get("verify_ssl", True))
    resp.encoding = resp.apparent_encoding

    soup = BeautifulSoup(resp.text, "html.parser")  # ② HTML 파싱
    # 본문 영역 셀렉터는 소스마다 다르다 — 소스 설정에서 읽고, 없으면 버스조합 기본값
    box = soup.select_one(source.get("body_selector", ".sub04-05-view-wrap"))
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

