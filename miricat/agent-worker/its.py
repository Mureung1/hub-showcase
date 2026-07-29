"""국가교통정보센터(ITS) 돌발상황 수집 — 전국 도로의 공사·사고·통제.

버스 게시판과 달리 이미 구조화된 API라 LLM 추출이 필요 없다.
notices 테이블에 같은 모양(extraction)으로 저장해서 기존 판정·리마인드·리포트를 전부 재사용한다.
사건 좌표(x, y)를 extraction에 실어 4층(반경) 매칭의 재료로 쓴다.
"""
import os
import re

import requests

API_URL = "https://openapi.its.go.kr:9443/eventInfo"
# 정체·서행류는 돌발이라기보다 혼잡 정보 — 미리캣은 구조적 사건(공사·사고·통제·행사)만 받는다
NOISE = re.compile(r"정체|서행|차량증가")
MAX_INCIDENTS = 80


def _fmt_date(s):
    """'20260729091133' → '2026-07-29'"""
    return f"{s[:4]}-{s[4:6]}-{s[6:8]}" if s and len(s) >= 8 else ""


def fetch_incidents():
    """전국 돌발상황 → notices 저장용 (source_url, title, extraction) 리스트."""
    key = os.environ.get("ITS_API_KEY")
    if not key:
        raise RuntimeError("ITS_API_KEY 없음")
    r = requests.get(API_URL, timeout=15, params={
        "apiKey": key, "type": "all", "eventType": "all", "getType": "json",
        "minX": "124", "maxX": "132", "minY": "33", "maxY": "39",
    })
    items = (r.json().get("body") or {}).get("items", [])

    out = []
    for it in items:
        detail = it.get("eventDetailType") or it.get("eventType") or "돌발상황"
        if NOISE.search(detail):
            continue
        road = it.get("roadName") or "도로"
        start, end = it.get("startDate") or "", it.get("endDate") or ""
        period = (f"{_fmt_date(start)} ~ {_fmt_date(end)}" if end
                  else _fmt_date(start))   # 종료 미상 돌발은 그날짜만 → 다음날 자동 소멸 (영구 유령 방지)
        event = {
            "event_name": f"{road} {detail}",
            "location": f"{road} · {(it.get('message') or '').strip()[:80]}",
            "period": period,
            "affected_lines": [], "affected_stops": [],
            "x": float(it.get("coordX") or 0), "y": float(it.get("coordY") or 0),   # 4층(반경) 재료
        }
        out.append({
            # linkId+시작시각 = 사건 고유키 (upsert 중복 방지). 사람용 상세 링크가 없어 지도 페이지로.
            "source_url": f"https://www.its.go.kr/map#evt-{it.get('linkId')}-{start}",
            "title": f"[도로 돌발] {road} {detail}",
            "raw_text": (it.get("message") or "").strip(),
            "extraction": {"events": [event]},
        })
        if len(out) >= MAX_INCIDENTS:
            break
    return out
