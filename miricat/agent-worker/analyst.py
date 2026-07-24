"""Analyst — 제품의 '영향 판정' 로직 (MIRI-19, 결정론적 매칭).

추출된 공지 사건(events)이 '내 경로'와 겹치는지 규칙으로 판정한다. LLM 아님.
지금은 4단계 매칭의 1·2단계(노선·정류장 문자열 겹침)만. 도로명(3)·반경(4)은
경로 좌표열(MIRI-9) 확보 후 확장 — Tier2(KBO·팝업 등) 대응 지점.
"""

import re 
from datetime import date

def _norm(s):
    # 매칭용 정규화: 소문자 + "노선" 제거 + 공백·"번" 제거. ("705번"↔"705", "B1 노선"↔"b1")
    s = (s or "").lower().replace("노선", "")
    return "".join(ch for ch in s if ch not in " 번")


def _hit(value, token):
    a, b = _norm(value), _norm(token)
    if not a or not b:
        return False
    return a == b or a in b or b in a   # 양방향 부분일치까지 허용

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
    """이 사건이 아직 안 끝났으면 True (진행 중 + 다가오는 것 포함).
    종료일을 못 정하면(열린 기간·형식 불명) 보수적으로 유지(True) — 놓치지 않게."""
    if not period:
        return True
    end = _event_end(period)
    if end is None:
        return True
    return end >= date.today()


def analyze(route, extraction):
    """route={'lines':[...], 'stops':[...]}, extraction={'events':[...]} → 판정 dict.

    반환: {'affected': bool, 'matched': [{'event_name', 'matched':[겹친 노선/정류장]}]}
    """
    mine = [*(route.get("lines") or []), *(route.get("stops") or [])]
    matched = []
    for ev in (extraction or {}).get("events", []):
        targets = [*(ev.get("affected_lines") or []), *(ev.get("affected_stops") or [])]
        hits = sorted({v for v in targets for t in mine if _hit(v, t)})
        if hits and _is_current(ev.get("period")):
            matched.append({"event_name": ev.get("event_name"), "matched": hits})
    return {"affected": len(matched) > 0, "matched": matched}


if __name__ == "__main__":
    # 간단 자기검증 (원촌육교 = 영향 / 302 시간표 = 영향 없음)
    route = {"lines": ["B1"], "stops": ["오정농수산시장"]}
    wonchon = {"events": [{"event_name": "원촌육교 통제", "affected_lines": ["B1"], "affected_stops": ["오정농수산시장"]}]}
    other = {"events": [{"event_name": "302 시간표 변경", "affected_lines": ["302", "42"], "affected_stops": []}]}
    print("원촌육교:", analyze(route, wonchon))
    print("302:", analyze(route, other))
