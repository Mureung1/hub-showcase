"""LangGraph 없이, invoke의 원리를 직접 구현해본다.
add_node / add_edge = 딕셔너리 채우기, invoke = entry에서 엣지 따라 도는 while 루프.
(학습용 — 미리캣 기능 코드 아님)"""

END = "__END__"          # 끝 표시 (LangGraph의 END 흉내)

nodes = {}               # 이름 → 함수
cond_edges = {}          # 이름 → 조건부 다음 이름
edges = {}               # 이름 → 다음 이름
entry = None             # 시작 노드 이름


def add_node(name, fn):
    nodes[name] = fn


def add_edge(frm, to):
    edges[frm] = to
    
def add_conditional_edges(frm, router, mapping):
    """조건부 엣지: frm 노드에서 router(state) 결과값에 따라 다음 노드 선택"""
    cond_edges[frm] = (router, mapping)


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
        if cond_edges.get(현재):
            router, mapping = cond_edges[현재]
            현재 = mapping[router(state)]
        else:
            현재 = edges[현재]
       
    return state


# ── 실제로 써보기: scout → extract 2노드 ──────────────────
def scout(state):
    print("  [scout 실행]")
    return {"raw_text": "탄방역 B2 우회 (더미 공지)"}

def verify(state):
    print("  [verify 실행] tries:", state["tries"])
    return {}
    

def extract(state):
    print("  [extract 실행] raw_text 읽음:", state["raw_text"])
    return {"extraction": {"line": "B2"}, "tries": state["tries"] + 1 }   # 진짜 추출 대신 더미

def route_after_verify(state):
    # tries가 상한 도달 -> "ok"(포기하고 끝), 아니면 "retry"(다시 extract)
    if state["tries"] >= 3:
        return "ok"
    return "retry"


add_node("scout", scout)
add_node("extract", extract)
add_node("verify", verify)
add_edge("scout", "extract")
add_edge("extract", "verify")
add_conditional_edges("verify", route_after_verify, {"ok": END, "retry": "extract"})
set_entry("scout")


if __name__ == "__main__":
    result = invoke({"raw_text": "", "extraction": None, "tries": 0})
    print("최종 state:", result)
