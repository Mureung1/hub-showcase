# 02. Structured Output — 스키마로 LLM 출력을 강제하기

> 한 줄 요약: **LLM이 아무 형식으로나 답하지 않게, 스키마(그릇 모양)를 API에 넘겨 "이 모양의 JSON만" 내도록 강제하는 것.** 프롬프트로 "잘 부탁해"가 아니라, 스키마로 "이 틀 밖으론 못 나와"로 못 박는다.

## LLM(Gemini)의 자리 = 딱 한 구간
미리캣 전체 흐름에서 AI가 손대는 건 한 곳뿐. 나머지는 평범한 파이썬.
```
① scout: 게시판 긁기        → 파이썬(requests/BeautifulSoup)   AI 아님
② 본문 텍스트 확보          → 파이썬                            AI 아님
③ 본문 → 구조화 JSON 추출   → ★ Gemini ★  (자연어→구조 "번역")   여기만 AI
④ 저장/매칭                 → 파이썬                            AI 아님
```
- ③은 파이썬으로 못 짬: "이 문장 어디가 노선이고 몇 개 사건인지"는 공지마다 달라서 규칙(정규식)으로 못 잡음 → 자연어 이해는 LLM만.

## 코드에서 structured output이 켜지는 곳
`graph.py`의 extract_node:
```python
config=types.GenerateContentConfig(
    response_mime_type="application/json",   # JSON으로
    response_schema=Extraction,              # ★ 이 Pydantic 스키마 모양으로만 ★
)
data = resp.parsed   # 파싱 실패 걱정 없이 바로 Pydantic 객체
```

## 없으면 왜 불안정한가
스키마 없이 프롬프트로만 "JSON 줘" 하면:
- 앞에 설명 붙임("네, 정리해드릴게요! ```json ...")
- 필드 이름 멋대로(`lines` vs `affected_lines`)
- 가끔 JSON이 아니라 문장으로 답함
→ `json.loads()` 터지거나 기대한 필드가 없음. structured output은 이걸 API 레벨에서 막는다.

## 스키마 ↔ 프롬프트 = 짝 (역할 분담)
| | 담당 | 강제력 |
|---|---|---|
| 스키마(response_schema) | 출력 **모양** (필드·타입·구조) | 어길 수 없음 (API 보장) |
| 프롬프트(SYSTEM_PROMPT) | 채우는 **내용/규칙** (예측 금지, 사건 나눠 담기) | 지침일 뿐 (강제 아님) |
- 스키마가 "빈 그릇(events 배열)"을 만들고, 프롬프트가 "그 그릇을 어떻게 채울지" 안내. 둘 다 있어야 함.
- **주의:** structured output이 보장하는 건 *모양*이지 *내용의 정확성*이 아니다. 그릇 모양은 맞아도 값이 틀릴 수 있음 → 그건 프롬프트·평가셋(회귀 테스트)의 몫.

## 실전에서 겪은 것 — "공지 1건 = 사건 N개"
문제: 실제 버스조합 공지(6357 강우)엔 107·704·B1·M1 여러 노선이 다 통제인데, **107번 하나만** 추출됨.
원인: 스키마가 "사건 1개"짜리 그릇이라 나머지를 담을 데가 없었음. (프롬프트 문제 X, 스키마 문제)

수술 (schema.py):
```python
# 전: 필드 5개가 통째로 = 사건 1개
class Extraction(BaseModel):
    event_name: str; period: str; affected_lines: list[str]; ...

# 후: 사건(Event)을 정의하고, Extraction은 그 '리스트'
class Event(BaseModel):
    event_name: str; location: str; period: str
    affected_lines: list[str]; affected_stops: list[str]

class Extraction(BaseModel):
    events: list[Event]      # ★ 공지 1건에 사건 여러 개
```
+ 프롬프트에 "사건 여러 개면 events 배열에 각각 나눠 담아라" 한 줄 추가.

결과: 같은 공지에서 5개 사건 전부 추출(노선·정류장 다 채워짐). **Gemini 실력은 그대로, 그릇을 현실에 맞춘 게 해법.**

## 걸린 함정 (기록)
- 노선/정류장 필드를 `str`로 두면 "한 사건당 하나"만 담겨 같은 실수 반복 → `list[str]`.
- 필드명 `affected_stations`로 바꾸면 평가셋(`affected_stops`)과 조용히 어긋남(에러도 안 남) → 이름 일관성 중요.
- **그래프 전체(run)로 테스트하면 scout이 최신글로 덮어써서 원하는 공지가 안 들어감** → 특정 공지 테스트는 `extract_node`만 직접 호출.

## 파급 (다음 할 일)
스키마를 `list[Event]`로 바꾸면 뒷단도 "여러 개" 전제로 바뀌어야 함:
- 평가셋 ground_truth도 events 리스트 모양으로 (MIRI-6/7)
- 매칭(MIRI-19)은 "사건마다 내 경로와 겹치나"를 for로 돌아야 함 (내가 B1 이용자면 5개 중 B1 사건만 경보)
- 경보도 "관련된 사건만 골라 보여주기"

→ 그래서 스키마·매칭·경보를 따로 두 번 고치지 말고, 평가셋 만들 때 한 번에 설계.
