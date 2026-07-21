# 01. LangGraph invoke의 원리 — 프레임워크 없이 직접 만들어보기

> 한 줄 요약: **LangGraph의 `invoke()`는 마법이 아니라, entry에서 시작해 엣지를 따라 다음 노드로 이동하고 END를 만나면 멈추는 while 루프다.** `add_node`/`add_edge`는 그냥 딕셔너리 두 개를 채우는 것.

## 왜 이걸 팠나
멘토 피드백: "LangGraph를 *쓸 줄 아는* 데서 멈추지 말고, *내부에서 뭘 하는지* 알아서 결국 프레임워크 없이도 만들 수 있게 돼라." → 그래야 나중에 프레임워크 없는 에이전트(자비스 같은 내 클론)를 만들 수 있다.

## 3대 원리

1. **add_node / add_edge = 딕셔너리 채우기**
   - `add_node(이름, 함수)` → `nodes[이름] = 함수`
   - `add_edge(A, B)` → `edges[A] = B` ("A 다음은 B")
   - 그래프를 "짠다"는 건 이 두 딕셔너리를 채우는 것뿐이다.

2. **노드는 '바뀐 칸'만 리턴하고, invoke가 merge한다**
   - 노드는 State 전체가 아니라 자기가 바꾼 칸만 dict로 리턴.
   - `state = {**state, **변경분}` → 안 바뀐 칸은 남고, 바뀐 칸만 갱신.
   - 그래서 앞 노드가 채운 값이 뒤 노드에서 안 사라진다. (노드끼리 직접 값을
     주고받는 게 아니라, 공유 State에 하나는 쓰고 하나는 읽는다.)

3. **END는 특별한 객체가 아니라 그냥 '끝' 표식**
   - `END = "__END__"` 같은 약속된 값. "다음 노드가 이거면 멈춰라"를 while 조건에 박은 것.

## LangGraph ↔ 직접 구현(mini_graph) 대응표

| LangGraph | 사실은 이거였다 |
|---|---|
| `StateGraph`, `add_node`, `add_edge` | `nodes`, `edges` 딕셔너리 채우기 |
| `set_entry_point` | `entry` 변수에 시작 노드 이름 저장 |
| `compile()` → `app` | (없어도 됨 — 함수들이 그냥 등록돼 있으면 됨) |
| `app.invoke(state)` | entry에서 시작 → edges 따라 이동 → END서 멈추는 while 루프 |
| State가 안 사라지는 것 | `{**state, **변경분}` merge |
| `END` | "끝"을 뜻하는 문자열 |

## invoke의 심장 (직접 채운 로직)

```python
def invoke(start_state):
    현재 = entry                     # 어디서 시작? → set_entry로 정한 곳
    state = start_state
    while 현재 != END:               # END면 멈춤
        함수 = nodes[현재]            # 지금 노드의 함수
        변경분 = 함수(state)          # 실행 → 바뀐 칸만 리턴
        state = {**state, **변경분}   # merge
        현재 = edges[현재]            # 지금 노드에서 나가는 선 따라 다음으로
    return state
```

실행 흐름 (scout → extract 예시):
```
현재="scout"   → scout!=END(T)   → 실행 → 현재=edges["scout"]="extract"
현재="extract" → extract!=END(T) → 실행 → 현재=edges["extract"]=END
현재=END       → END!=END(F)     → while 탈출 → return state
```
→ **루프가 스스로 멈추는 이유:** 마지막 노드의 엣지가 END를 가리키기 때문.

## 실행 결과 (mini_graph.py)
```
  [scout 실행]
  [extract 실행] raw_text 읽음: 탄방역 B2 우회 (더미 공지)
최종 state: {'raw_text': '탄방역 B2 우회 (더미 공지)', 'extraction': {'line': 'B2'}}
```
- scout이 빈 `raw_text`를 "탄방역..."으로 채움 → extract이 그 갱신된 값을 읽음 → 원리 2(merge) 눈으로 확인.
- 최종 state에 두 노드가 채운 칸이 모두 살아있음.

전체 코드: `agent-worker/mini_graph.py`

## 직접 겪은 것 (실수에서 배운 것)
- **상자(add_node)만 놓으면 안 되고, 선(add_edge)까지 이어야 실행된다.** 선을 안 이으면 노드가 붕 뜬다. (graph.py에서 `scout→END`로 잘못 이어서 extract를 건너뛴 적 있음 — 돌려보고서야 앎.)
- 노드 추가 = **상자 + 선** 세트.

## 다음 계단 (아직 안 함)
지금 `현재 = edges[현재]`는 다음 노드가 **딱 하나로 고정**돼 있다. 진짜 에이전트는 "상태를 보고 다음을 스스로 정해야" 한다 (예: Verifier가 틀렸다고 하면 scout로 되돌아가고, 맞으면 END로).
→ 이 한 줄을 "상태를 보고 다음을 고르는 함수"로 바꾸면 **조건부 엣지**(LangGraph의 `add_conditional_edges`)가 된다. 이게 순환·재시도 루프(MIRI-14)이자, 자비스로 가는 다음 문.
