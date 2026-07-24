"""Analyst — 제품의 '영향 판정' 로직 (MIRI-19, 결정론적 매칭).

추출된 공지 사건(events)이 '내 경로'와 겹치는지 규칙으로 판정한다. LLM 아님.
지금은 4단계 매칭의 1·2단계(노선·정류장 문자열 겹침)만. 도로명(3)·반경(4)은
경로 좌표열(MIRI-9) 확보 후 확장 — Tier2(KBO·팝업 등) 대응 지점.
"""


def _norm(s):
    # 매칭용 정규화: 소문자 + "노선" 제거 + 공백·"번" 제거. ("705번"↔"705", "B1 노선"↔"b1")
    s = (s or "").lower().replace("노선", "")
    return "".join(ch for ch in s if ch not in " 번")


def _hit(value, token):
    a, b = _norm(value), _norm(token)
    if not a or not b:
        return False
    return a == b or a in b or b in a   # 양방향 부분일치까지 허용


def analyze(route, extraction):
    """route={'lines':[...], 'stops':[...]}, extraction={'events':[...]} → 판정 dict.

    반환: {'affected': bool, 'matched': [{'event_name', 'matched':[겹친 노선/정류장]}]}
    """
    mine = [*(route.get("lines") or []), *(route.get("stops") or [])]
    matched = []
    for ev in (extraction or {}).get("events", []):
        targets = [*(ev.get("affected_lines") or []), *(ev.get("affected_stops") or [])]
        hits = sorted({v for v in targets for t in mine if _hit(v, t)})
        if hits:
            matched.append({"event_name": ev.get("event_name"), "matched": hits})
    return {"affected": len(matched) > 0, "matched": matched}


if __name__ == "__main__":
    # 간단 자기검증 (원촌육교 = 영향 / 302 시간표 = 영향 없음)
    route = {"lines": ["B1"], "stops": ["오정농수산시장"]}
    wonchon = {"events": [{"event_name": "원촌육교 통제", "affected_lines": ["B1"], "affected_stops": ["오정농수산시장"]}]}
    other = {"events": [{"event_name": "302 시간표 변경", "affected_lines": ["302", "42"], "affected_stops": []}]}
    print("원촌육교:", analyze(route, wonchon))
    print("302:", analyze(route, other))
