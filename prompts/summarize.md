# 3단계 · 요약 (summarize)

> 이 파일은 런타임에 로드되는 자산이다. 코드에 프롬프트를 박지 않는다.
> 바꿀 때는 [CHANGELOG.md](./CHANGELOG.md)에 무엇을·왜·결과를 남긴다.

**목적** 고정된 3키 요약을 만든다. **자유 문단 금지** — 여러 카드를 세로로 훑을 때 같은 위치에 같은 정보가 있어야 비교된다.
**입력** `title`, `source_text`(초록 또는 본문), `feedback`(4단계 재시도 시)
**출력**
```json
{"contribution": "...", "method": "...", "result": "..."}
```
**fallback** 3회 파싱 실패 시 `paper_failed`로 처리

## 프롬프트
```text
아래 논문을 AI 연구자용으로 요약하라.

- 한국어로 쓰되 전문 용어는 영어 그대로 둔다 (예: planning, reflexion, WebArena).
  독자는 연구자다. 풀어쓰면 오히려 정보가 준다.
- 각 항목은 1~2문장.
- 원문에 없는 내용을 지어내지 마라. 모르면 "원문에 명시되지 않음"이라고 쓴다.
- result에는 가능하면 수치를 넣는다. 한계나 트레이드오프를 저자가 밝혔다면 함께 적는다.

contribution: 이 논문이 새로 제시한 것
method: 그것을 어떻게 했는가
result: 무엇이 나왔는가 (수치·한계 포함)

반드시 아래 JSON만 출력하라.
{"contribution":"...","method":"...","result":"..."}

제목: {title}
본문: {source_text}
{feedback_block}
```

### `{feedback_block}` — 재시도일 때만 붙인다
```text

이전 요약에 아래 문제가 지적되었다. 이 점을 반드시 보완하라:
{feedback}
```
