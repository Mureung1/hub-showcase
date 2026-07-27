"""데모용: 원촌육교 통제 공지(실사례)를 실제 extract_node로 추출해 notices에 저장.
크롤링 대신 알려진 원문을 그래프의 추출 노드에 직접 통과시킨다 (Gemini 실제 추출)."""

from graph import extract_node
from db import save_notice

RAW = ("갑천도시고속도로 원촌육교 구간, 지반침하 긴급보수로 2026년 3월 30일(월)부터 "
       "4월 3일(금)까지 전면 통제됩니다. 해당 구간을 경유하는 B1 노선은 우회 운행하며, "
       "오정농수산시장 정류장은 미정차합니다. (대전광역시 공지, 2026-03-27)")

SOURCE = "daejeon_city"
SOURCE_URL = "https://www.daejeon.go.kr/drh/board/notice/wonchon-2026-0330"
TITLE = "갑천도시고속도로 원촌육교 전면 통제 (B1 우회)"

result = extract_node({"raw_text": RAW})   # ← 실제 Gemini 추출
if result.get("error"):
    print("추출 실패:", result["error"]); raise SystemExit(1)

extraction = result["extraction"]
print("추출된 events:", len(extraction.get("events", [])))
for e in extraction["events"]:
    print("  ·", e.get("event_name"), "| 노선", e.get("affected_lines"), "| 정류장", e.get("affected_stops"))

save_notice(SOURCE, SOURCE_URL, TITLE, RAW, extraction)
print("저장 완료 →", TITLE)
