from db import find_notice
from analyst import analyze
from graph import reporter_node


DEMO_ROUTE = {"lines": ["107"], "stops": []}

SOURCE_URL = "https://www.daejeonbus.or.kr/sub0501view.do?boardSeq=6385"
found = find_notice(SOURCE_URL)
if not found:
    print("공지가 DB에 없어요 - run_scout.py를 먼저 실행해주세요"); raise SystemExit(1)

analysis = analyze(DEMO_ROUTE, found.get("extraction") or {}) 
result = reporter_node({
    "source": {"view_url": "https://www.daejeonbus.or.kr/sub0501view.do?boardSeq={id}"},
    "seq": "6385",
    "extraction": found.get("extraction"),
    "analysis": analysis,
})

print(result)