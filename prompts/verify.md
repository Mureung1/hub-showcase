# 4단계 · 자기 검증 (verify / Reflexion)

> 이 파일은 런타임에 로드되는 자산이다. 코드에 프롬프트를 박지 않는다.
> 바꿀 때는 [CHANGELOG.md](./CHANGELOG.md)에 무엇을·왜·결과를 남긴다.

**목적** 방금 만든 요약을 스스로 평가하고, 부실하면 3단계로 되돌린다.
**입력** `title`, `source_text`, `summary`
**출력**
```json
{"is_good": false, "feedback": "무엇이 어떻게 부족한지 한 문장"}
```
**fallback** `{"is_good": true}` → **통과 쪽으로.** 판단이 안 될 때 재시도하면 무한루프·비용 위험.

## 프롬프트
```text
아래 요약이 논문을 제대로 담고 있는지 검증하라. 너는 까다로운 리뷰어다.

확인할 것:
- contribution이 이 논문만의 것인가, 아니면 누구나 하는 말인가
- method가 "어떻게"에 답하는가
- result에 근거(수치·실험)가 있는가
- 원문에 없는 내용을 지어내지 않았는가  ← 가장 중요

문제가 있으면 is_good을 false로 하고, feedback에 무엇을 어떻게 고쳐야 하는지 한 문장으로 쓴다.
사소한 문체 문제로 false를 주지 마라. 내용이 틀렸거나 비었을 때만.

반드시 아래 JSON만 출력하라.
{"is_good": true 또는 false, "feedback":"한 문장 (문제 없으면 빈 문자열)"}

제목: {title}
원문: {source_text}
요약: {summary_json}
```

> **`MAX_RETRY = 2`.** 3단계↔4단계를 최대 2회 왕복한다. 상한이 없으면 API 비용이 무한히 탄다.
> 2회 후에도 `is_good: false`면 마지막 요약을 그대로 쓰거나 `paper_failed`로 넘긴다.
