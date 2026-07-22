"""MIRI-12: LangGraph 최소 추출 그래프 (노드 1개).

공지 원문(raw_text) -> [extract 노드] -> 구조화 JSON(extraction).
LangGraph 뼈대(State/노드/엣지/compile/invoke)를 익히기 위한 최소 버전.
노드 안에서는 Gemini 구조화 출력으로 추출한다.

실행:  agent-worker/.venv/bin/python graph.py
필요:  miricat/.env 에 GEMINI_API_KEY
"""

import json
import os
import pathlib
from typing import Optional, TypedDict
from scout import fetch_list, fetch_body
from sources import SOURCES

from dotenv import load_dotenv
from google import genai
from google.genai import types
from langgraph.graph import END, StateGraph

from prompt import SYSTEM_PROMPT
from schema import Extraction

# 이 파일 기준 ../.env = miricat/.env (backend/index.js 와 동일 위치)
ROOT = pathlib.Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=ROOT / ".env")

MODEL = "gemini-2.5-flash"  # 데모용 안정 flash 모델. (models.list 로 사용 가능 목록 확인 가능)


# ── State: 노드들 사이를 흐르는 공유 딕셔너리 ────────────────────────────
class State(TypedDict):
    raw_text: str                 # 입력: 공지 원문
    extraction: Optional[dict]    # 출력: 추출된 구조화 정보
    error: Optional[str]          # 실패 시 메시지
    
    
def scout_node(state: State) -> dict:
    # 첫 번째 active 소스에서 최신 공지 1건의 본문을 가져온다. (지금은 1건만)
    source = next(s for s in SOURCES if s["active"])   # active인 첫 소스
    items = fetch_list(source)                          # [(글번호, 제목), ...]
    first_seq = items[0][0]                             # 최신 글번호
    body = fetch_body(source, first_seq)                      # ① 그 글의 본문
    return {"raw_text": body}


# ── 노드: 그냥 파이썬 함수. State 읽고 -> State 업데이트(부분 dict) 반환 ──
def extract_node(state: State) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY가 없습니다. aistudio.google.com/apikey 에서 발급 후 miricat/.env 에 추가하세요."}
    try:
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(
            model=MODEL,
            contents=state["raw_text"],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                response_schema=Extraction,   # 구조화 출력: 이 스키마 모양으로만 응답
            ),
        )
        data: Extraction = resp.parsed         # 파싱된 Pydantic 인스턴스
        return {"extraction": data.model_dump()}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}


# ── 그래프 조립: 노드 1개, 시작 -> extract -> 끝 ───────────────────────
builder = StateGraph(State)
builder.add_node("extract", extract_node)
builder.add_node("scout", scout_node)  # MIRI-13: 보초 세우기 노드 추가)
builder.add_edge("scout", "extract")  
builder.set_entry_point("scout")
builder.add_edge("extract", END)
app = builder.compile()


def run(raw_text: str) -> dict:
    """공지 원문 하나를 그래프에 넣고 결과 State를 돌려준다."""
    return app.invoke({"raw_text": raw_text, "extraction": None, "error": None})


if __name__ == "__main__":
    # scout 노드가 raw_text를 채우므로, 시작할 때는 빈 값으로 넣는다.
    result = app.invoke({"raw_text": "", "extraction": None, "error": None})

    print("=== scout가 가져온 공지 ===")
    print(result["raw_text"])

    print("\n=== 그래프 출력: 추출 결과 ===")
    if result.get("error"):
        print("ERROR:", result["error"])
    else:
        print(json.dumps(result["extraction"], ensure_ascii=False, indent=2))

