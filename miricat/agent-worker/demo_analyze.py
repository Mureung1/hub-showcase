"""데모용 백필: 저장된 notices를 '내 경로'와 대조(Analyst)해 판정을 각 공지에 얹는다.
추출은 이미 끝났으니 재추출 없이 매칭만 — analyst.analyze()를 그대로 사용.
(실제 제품에선 판정이 경로별이라 공지에 얹지 않지만, 데모 편의로 extraction.match에 저장.)"""

from analyst import analyze
from db import _sb

DEMO_ROUTE = {"lines": ["B1"], "stops": ["오정농수산시장"]}  # 데모 경로 = 갑천/B1

rows = _sb.table("notices").select("id, title, extraction").execute().data
for r in rows:
    ext = dict(r.get("extraction") or {})
    verdict = analyze(DEMO_ROUTE, ext)      # ← Analyst 판정
    ext["match"] = verdict                  # 판정을 공지에 얹어 화면으로 전달
    _sb.table("notices").update({"extraction": ext}).eq("id", r["id"]).execute()
    flag = "🚨 영향" if verdict["affected"] else "·  없음"
    print(f"  {flag}  {(r.get('title') or '')[:34]}")
print("백필 완료. 내 경로:", DEMO_ROUTE)
