"""Analyst — 제품의 '영향 판정' 로직 (MIRI-19, 결정론적 매칭).

추출된 공지 사건(events)이 '내 경로'와 겹치는지 규칙으로 판정한다. LLM 아님.
4단계 매칭 중 1·2단계(노선·정류장 문자열 겹침) + 3단계(경유 도로명 ↔ 공지 위치 문구, 자가용).
반경(4)은 경로 좌표열 확보 후 확장 — Tier2(KBO·팝업 등) 대응 지점.
"""

import re
from datetime import date

# ── 지역 게이팅: 공지 소스의 관할 지역과 경로 좌표가 겹칠 때만 매칭 ──
# (대전 46번 공지가 서울 경로에 걸리는 식의 타지역 오탐 방지)
REGIONS = {
    "daejeon_sejong": {"min_x": 127.15, "max_x": 127.65, "min_y": 36.10, "max_y": 36.75},
    "sudogwon":       {"min_x": 126.35, "max_x": 127.85, "min_y": 36.85, "max_y": 38.35},
    "busan":          {"min_x": 128.60, "max_x": 129.40, "min_y": 34.95, "max_y": 35.50},
}
SOURCE_REGION = {
    "daejeon_bus": "daejeon_sejong", "daejeon_city": "daejeon_sejong", "sejong_sctc": "daejeon_sejong",
    "seoul_topis": "sudogwon", "gbis_route": "sudogwon",
    "busan_bims": "busan",
}

def same_region(route, source_id):
    """경로 좌표(path)가 소스의 관할 상자에 걸치는가. 좌표 없는 옛 경로·미지정 소스는 보수적으로 통과."""
    region = REGIONS.get(SOURCE_REGION.get(source_id))
    points = route.get("path") or []
    if not region or not points:
        return True
    return any(
        region["min_x"] <= p.get("x", 0) <= region["max_x"] and region["min_y"] <= p.get("y", 0) <= region["max_y"]
        for p in points
    )

def _norm(s):
    # 매칭용 정규화: 소문자 + "노선" 제거 + 공백·"번" 제거. ("705번"↔"705", "B1 노선"↔"b1")
    s = (s or "").lower().replace("노선", "")
    return "".join(ch for ch in s if ch not in " 번")


def _hit(value, token):
    a, b = _norm(value), _norm(token)
    if not a or not b:
        return False
    if a.isdigit() and b.isdigit():
        return a == b                   # 숫자 노선은 정확일치만 — "46" ⊂ "462" 오탐 방지
    return a == b or a in b or b in a   # 문자 섞인 것(B1·급행2·정류장명)만 부분일치 허용

_DATE_RE = re.compile(r"(\d{4})[.\-]\s*(\d{1,2})[.\-]\s*(\d{1,2})")  # 연도 포함 완전 날짜
_MD_RE = re.compile(r"(\d{1,2})[.\-]\s*(\d{1,2})")                   # 'M.D' (연도 없음)


def _event_end(period):
    """기간 문자열에서 '종료일'을 뽑는다. 열린 기간·형식 불명이면 None.
    다양한 형식 대응: "2026-03-30 ~ 2026-04-03", "2026. 6. 1~ 6.30", "2026.7.20.~"."""
    tail = period.split("~")[-1].strip()      # '~' 뒤 = 종료쪽 (범위 없으면 전체)
    m = _DATE_RE.search(tail)
    if m:                                     # 종료쪽에 완전한 날짜가 있음
        y, mo, d = map(int, m.groups())
    else:                                     # 종료쪽이 'M.D'뿐이면 시작쪽 연도를 빌린다
        md = _MD_RE.search(tail)
        start = _DATE_RE.search(period)
        if not (md and start):
            return None                       # 종료일 못 정함(열린 기간 "…~" 등)
        y = int(start.group(1))
        mo, d = int(md.group(1)), int(md.group(2))
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def _is_current(period):
    """이 사건이 아직 유효한가 (진행 중 + 다가오는 것 포함).
    - 종료일이 있으면 그날까지 유효.
    - 종료일 없이 시행일만 있으면("5.13부터~") 시행 후 14일까지만 — 시간표 변경류는
      그 뒤엔 '새 소식'이 아니라 그냥 현재 상태다 (5월 공지가 7월에 경보 나가는 것 방지).
    - 날짜를 아예 못 읽으면 보수적으로 유지(True)."""
    if not period:
        return True
    end = _event_end(period)
    if end is not None:
        return end >= date.today()
    m = _DATE_RE.search(period)
    if m:
        start = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        return (date.today() - start).days <= 14
    return True


def analyze(route, extraction):
    """route={'lines':[...], 'stops':[...], 'roads':[...]}, extraction={'events':[...]} → 판정 dict.

    반환: {'affected': bool, 'matched': [{'event_name', 'matched':[겹친 노선/정류장/도로]}]}
    """
    mine = [*(route.get("lines") or []), *(route.get("stops") or [])]
    roads = route.get("roads") or []
    path = route.get("path") or []
    matched = []
    for ev in (extraction or {}).get("events", []):
        targets = [*(ev.get("affected_lines") or []), *(ev.get("affected_stops") or [])]
        hits = {v for v in targets for t in mine if _hit(v, t)}
        # 3층: 도로명 — 공지의 위치 문구(location·사건명)에 내 경유 도로가 등장하는가 (자가용)
        hay = _norm(f"{ev.get('location') or ''} {ev.get('event_name') or ''}")
        hits |= {r for r in roads if _norm(r) and _norm(r) in hay}
        # 4층: 반경 — 사건 좌표(ITS 돌발 등)가 내 경로에서 300m 이내인가
        if ev.get("x") and ev.get("y") and path and _near_route(ev["x"], ev["y"], path):
            hits.add(ev.get("event_name") or "경로 인근 사건")
        if hits and _is_current(ev.get("period")):
            matched.append({"event_name": ev.get("event_name"), "matched": sorted(hits)})
    return {"affected": len(matched) > 0, "matched": matched}


def _near_route(x, y, path, radius_m=300):
    """사건 좌표가 경로 좌표열의 어느 점에서든 radius_m 안이면 True (등장방형 근사 거리)."""
    import math
    cos_lat = math.cos(math.radians(y))
    for p in path:
        dx = (x - p.get("x", 0)) * 111320 * cos_lat
        dy = (y - p.get("y", 0)) * 110540
        if dx * dx + dy * dy <= radius_m * radius_m:
            return True
    return False


if __name__ == "__main__":
    # 간단 자기검증 (원촌육교 = 영향 / 302 시간표 = 영향 없음)
    route = {"lines": ["B1"], "stops": ["오정농수산시장"]}
    wonchon = {"events": [{"event_name": "원촌육교 통제", "affected_lines": ["B1"], "affected_stops": ["오정농수산시장"]}]}
    other = {"events": [{"event_name": "302 시간표 변경", "affected_lines": ["302", "42"], "affected_stops": []}]}
    print("원촌육교:", analyze(route, wonchon))
    print("302:", analyze(route, other))
