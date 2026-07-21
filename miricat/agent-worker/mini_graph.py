"""LangGraph 없이, invoke의 원리를 직접 구현해본다.
add_node / add_edge = 딕셔너리 채우기, invoke = entry에서 엣지 따라 도는 while 루프.
(학습용 — 미리캣 기능 코드 아님)"""

END = "__END__"          # 끝 표시 (LangGraph의 END 흉내)

nodes = {}               # 이름 → 함수
edges = {}               # 이름 → 다음 이름
entry = None             # 시작 노드 이름


def add_node(name, fn):
    nodes[name] = fn


def add_edge(frm, to):
    edges[frm] = to


def set_entry(name):
    global entry
    entry = name


def invoke(start_state):
    현재 = entry
    state = start_state
    while 현재 != END:
        함수 = nodes[현재]
        변경분 = 함수(state)          # 노드는 '바뀐 칸'만 리턴
        state = {**state, **변경분}   # merge: 안 바뀐 칸은 남고, 바뀐 칸만 갱신
        현재 = edges[현재]            # 지금 노드에서 나가는 선을 따라 다음으로
    return state


# ── 실제로 써보기: scout → extract 2노드 ──────────────────
def scout(state):
    print("  [scout 실행]")
    return {"raw_text": "탄방역 B2 우회 (더미 공지)"}


def extract(state):
    print("  [extract 실행] raw_text 읽음:", state["raw_text"])
    return {"extraction": {"line": "B2"}}   # 진짜 추출 대신 더미


add_node("scout", scout)
add_node("extract", extract)
add_edge("scout", "extract")
add_edge("extract", END)
set_entry("scout")


if __name__ == "__main__":
    result = invoke({"raw_text": "", "extraction": None})
    print("최종 state:", result)
