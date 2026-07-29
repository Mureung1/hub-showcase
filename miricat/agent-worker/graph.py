"""MIRI-12: LangGraph 최소 추출 그래프 (노드 1개).

공지 원문(raw_text) -> [extract 노드] -> 구조화 JSON(extraction).
LangGraph 뼈대(State/노드/엣지/compile/invoke)를 익히기 위한 최소 버전.
노드 안에서는 Gemini 구조화 출력으로 추출한다.

실행:  agent-worker/.venv/bin/python graph.py
필요:  miricat/.env 에 GEMINI_API_KEY
"""

import requests
import os
import pathlib
from urllib.parse import quote
from db import find_notice
from typing import Optional, TypedDict
from scout import fetch_list, fetch_body
from sources import SOURCES


from dotenv import load_dotenv
from google import genai
from google.genai import types
from langgraph.graph import END, StateGraph

from prompt import SYSTEM_PROMPT
from schema import Extraction
from analyst import analyze

# 이 파일 기준 ../.env = miricat/.env (backend/index.js 와 동일 위치)
ROOT = pathlib.Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=ROOT / ".env")

MODEL = "gemini-2.5-flash"  # 데모용 안정 flash 모델. (models.list 로 사용 가능 목록 확인 가능)
MAX_TRIES = 2               # MIRI-14: Verifier 재시도 상한 (무한루프 방지)


# ── State: 노드들 사이를 흐르는 공유 딕셔너리 ────────────────────────────
class State(TypedDict):
    report: Optional[dict]
    raw_text: str                 # 입력: 공지 원문
    extraction: Optional[dict]    # 출력: 추출된 구조화 정보
    error: Optional[str]          # 실패 시 메시지
    source: dict
    seq: str
    tries: int                    # MIRI-14: Verifier 재시도 횟수 (상한 MAX_TRIES)
    route: Optional[dict]         # MIRI-19: 매칭 대상 내 경로 {lines, stops}
    analysis: Optional[dict]      # MIRI-19: Analyst 판정 {affected, matched}
    title: Optional[str]          # 공지 제목 — 날짜가 제목에만 있는 공지가 많아 추출 입력에 함께 준다


def scout_node(state: State) -> dict:
    # 러너가 넘겨준 (source, seq)로 그 글 한 건의 본문만 긁는다.
    source = state["source"]  # 받은 소스
    seq = state["seq"]        # 받은 글번호
    body = fetch_body(source, seq)  # 그 글의 본문
    return {"raw_text": body}


# ── 노드: 그냥 파이썬 함수. State 읽고 -> State 업데이트(부분 dict) 반환 ──
def extract_node(state: State) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY가 없습니다. aistudio.google.com/apikey 에서 발급 후 miricat/.env 에 추가하세요."}
    try:
        client = genai.Client(api_key=api_key)
        # 제목에만 날짜가 있는 공지가 많다("...알림(2026.7.9)") — 추출 입력에는 제목을 합쳐 주되,
        # DB에 저장되는 raw_text(원문)는 건드리지 않는다.
        title = state.get("title")
        contents = f"제목: {title}\n\n{state['raw_text']}" if title else state["raw_text"]
        resp = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=Extraction,   # 구조화 출력: 이 스키마 모양으로만 응답
                temperature=0,                # 추출은 창의성 불필요 — 같은 입력엔 같은 출력에 가깝게 (변동성 완화)
            ),
        )
        data: Extraction = resp.parsed         # 파싱된 Pydantic 인스턴스
        return {"extraction": data.model_dump()}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


def verify_node(state: State) -> dict:
    # MIRI-14: 추출 결과를 검사 관문에 세운다. 여기선 tries만 올리고,
    # 통과/재시도 판정은 route_after_verify(라우터)가 맡는다.
    return {"tries": state["tries"] + 1}


def route_after_verify(state: State) -> str:
    # State 보고 다음 선만 고른다(값 변경 X, 판단만). "retry"=extract로 되돌림 / "ok"=END.
    if state["tries"] >= MAX_TRIES:
        return "ok"                      # 상한 도달 → 포기하고 끝 (무한루프 방지)
    ext = state.get("extraction")
    if state.get("error") or not ext or not ext.get("events"):
        return "retry"                   # 실패/빈 추출 → 다시 추출
    return "ok"                          # 정상 → 끝


def analyst_node(state: State) -> dict:
    # MIRI-19: 추출된 사건이 '내 경로'에 영향 주는지 결정론적 판정 (LLM 아님).
    route = state.get("route")
    if not route:
        return {}                        # 경로 없으면 판정 생략 (러너 기존 호출 호환)
    return {"analysis": analyze(route, state.get("extraction") or {})}


def reporter_node(state: State) -> dict:
    # MIRI-20: 부작용 노드 — 내 경로에 영향 있으면 디스코드로 경보를 '실제로 전송'한다.
    analysis = state.get("analysis")
    if not analysis or not analysis.get("affected"):
        return {}                        # 영향 없음 → 아무것도 안 보냄 (알림 남발 금지)

    # 경로에 개인 웹훅이 연결돼 있으면 그리로, 없으면 기본(데모) 채널로
    webhook = (state.get("route") or {}).get("webhook_url") or os.environ.get("DISCORD_WEBHOOK_URL")
    if not webhook:
        return {"report": {"sent": False, "error": "웹훅 없음"}}

    # 메시지 재료: 원문 URL + 내 경로와 겹친 사건들
    source_url = state["source"]["view_url"].format(id=state["seq"])
    found = find_notice(source_url)
    matched_names = {m["event_name"] for m in analysis.get("matched", [])}
    fields = []
    for ev in (state.get("extraction") or {}).get("events", []):
        if ev.get("event_name") not in matched_names:
            continue                     # 내 경로에 안 걸린 사건은 뺀다
        lines = ", ".join(ev.get("affected_lines") or []) or "-"
        stops = ", ".join(ev.get("affected_stops") or []) or "-"
        fields.append({
            "name": ev.get("event_name", "(사건)"),
            "value": f"기간: {ev.get('period') or '-'}\n영향 노선: {lines}\n정류장: {stops}",
        })

    fields.append({"name": "원문 공지", "value": source_url})
    report_base = os.environ.get("REPORT_BASE_URL", "http://localhost:5173")
    embed = {
        "title": (f"🚨 경보 — {state['route']['name']}에 영향 공지"
                  if (state.get("route") or {}).get("name")
                  else "🚨 경보 — 내 출근 경로에 영향 공지"),   # 경로가 여럿이면 어느 경로인지 밝힌다
        "url": f"{report_base}/report/{found['id']}" if found else source_url,             # 제목 클릭 = 원문으로 (출처 원칙)
        "color": 0xE4572E,            # 미리캣 경보 빨강
        "fields": fields,
        "footer": {"text": "제목을 눌러 미리캣 리포트를 확인하세요"},
    }
    # 경보에 실지도 이미지 — 경로 id가 있을 때만 (백엔드의 Static Map 프록시가 그려준다)
    route_id = (state.get("route") or {}).get("id")
    if route_id:
        api_base = os.environ.get("API_BASE_URL", "https://miricat-api.onrender.com")
        hit_values = sorted({v for m in analysis.get("matched", []) for v in m.get("matched", [])})
        embed["image"] = {"url": f"{api_base}/api/routes/{route_id}/map.png?hits={quote(','.join(hit_values))}"}
    try:
        r = requests.post(webhook, json={"embeds": [embed]}, timeout=10)
        return {"report": {"sent": r.status_code in (200, 204), "status": r.status_code}}
    except Exception as e:
        return {"report": {"sent": False, "error": f"{type(e).__name__}: {e}"}}


# ── 그래프 조립: scout → extract ⇄ verify → analyst → reporter → 끝 ────
builder = StateGraph(State)
builder.add_node("extract", extract_node)
builder.add_node("scout", scout_node)        # MIRI-13: 보초 세우기 노드
builder.add_node("verify", verify_node)      # MIRI-14: 추출 검증 관문
builder.add_node("analyst", analyst_node)    # MIRI-19: 내 경로 영향 판정
builder.add_node("reporter", reporter_node)  # MIRI-20: 경보 전송(디스코드)
builder.add_edge("scout", "extract")
builder.add_edge("extract", "verify")        # 추출 결과는 항상 검증으로
builder.add_conditional_edges("verify", route_after_verify, {"retry": "extract", "ok": "analyst"})
builder.add_edge("analyst", "reporter")      # 판정 뒤 → 경보 전송
builder.add_edge("reporter", END)
builder.set_entry_point("scout")
app = builder.compile()


def run(source, seq, route=None, title=None) -> dict:
    """공지 1건을 그래프에 넣고 결과 State를 돌려준다. route 주면 Analyst가 영향 판정."""
    return app.invoke({
        "raw_text": "", "extraction": None, "error": None,
        "source": source, "seq": seq, "tries": 0,
        "route": route, "analysis": None, "report": None,
        "title": title,
    })
