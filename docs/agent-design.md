# AI Agent 설계

## Summary

MVP v1에서는 규칙 기반 Agent 흐름을 기본값으로 유지하되, Hono 서버의 Manager LLM API를 통해 제한된 schema 출력만 선택적으로 받는다. 이후 확장 시 목표 해석, 퀘스트 생성, 실패 리밸런싱, 피드백 문장 생성을 더 넓은 LLM 또는 개인화 모델로 교체할 수 있게 한다.

중요한 원칙은 매니저의 성격, 기억, 사용자 목표 데이터를 LLM 안에 묻지 않고 앱 데이터로 분리하는 것이다.

## Agent 역할

### 1. 목표 해석 Agent

사용자의 장기 목표를 읽고 더 구체적인 실행 목표로 바꾼다.

예시:

```text
입력: 정보처리기사 따고 싶어
출력: 정보처리기사 필기 시험 대비를 위한 6주 학습 목표
```

목표가 추상적이면 바로 퀘스트를 만들지 않고 질문을 유도한다.

### 2. 퀘스트 생성 Agent

장기 목표를 주간/일일 퀘스트로 분해한다.

예시:

```json
{
  "goal": "정보처리기사 취득",
  "weeklyQuest": "데이터베이스 과목 1회독",
  "dailyQuest": "오늘 데이터베이스 개념 15분 공부",
  "questType": "time",
  "difficulty": "easy",
  "rewardExp": 20
}
```

### 3. 리밸런싱 Agent

완료/실패 기록과 실패 이유를 보고 다음 퀘스트의 분량을 조절한다.

예시:

```text
실패 이유: 시간이 부족했다
다음 제안: 공부 60분 -> 공부 20분 + 핵심 개념 3개 정리
```

### 4. 퀘스트 평가 Agent

퀘스트의 내용과 조정된 난이도를 보고 EXP와 능력치 분배를 제안한다. LLM은 값을 제안하지만 앱과 서버는 검증 규칙을 통과한 값만 저장한다.

평가 기준:

- easy/normal/hard는 서로 다른 EXP 구간을 가진다.
- 능력치 총합은 난이도별 budget과 같아야 한다.
- 주요 능력치는 총합의 60% 이상을 받아야 한다.
- 한 능력치에 몰아줄 수 있는 최대치는 총합의 80% 이하로 제한한다.
- 복구 퀘스트는 별도 보상 구간이 아니라 조정된 easy/normal/hard 난이도로 다시 평가한다.

예시:

```json
{
  "difficulty": "hard",
  "statBudget": 15,
  "primaryStats": ["stamina"],
  "statDeltas": [
    { "stat": "stamina", "amount": 12 },
    { "stat": "strength", "amount": 2 },
    { "stat": "persistence", "amount": 1 }
  ],
  "reason": "운동 퀘스트라 체력 중심으로 분배한다."
}
```

### 5. 피드백 Agent

매니저의 반응 문장을 생성한다. 말투는 사용자의 선택에 따라 차분함, 친구 같음, 단호한 페이스메이커 중 하나를 따른다.

피해야 할 반응:

- 비난
- 과한 감정적 압박
- 실패를 벌처럼 표현

좋은 반응:

```text
이번 기록을 보고 다음 분량을 다시 맞춰볼게.
끝까지 기다릴게. 네 속도로 해.
오늘은 더 작은 분량으로 다시 시작하자.
```

## MVP v1 LLM 연결 원칙

- React는 OpenAI나 다른 LLM provider를 직접 호출하지 않는다.
- React는 `/api/manager/*` Hono route만 호출한다.
- API key는 server env에만 둔다.
- prompt version은 `manager-api-v1`로 시작한다.
- 기본 모델은 비용과 latency를 우선해 `gpt-5-nano`를 사용하고, 품질 고도화가 필요한 route만 이후 `gpt-5-mini` 후보로 올린다.
- LLM 출력은 `managerLine`, `questSuggestion`, `difficultyEvaluation`, `statEvaluation`, `behaviorIntent` 중 하나의 제한 schema로만 받는다.
- React 연결 지점은 `managerLine`/`behaviorIntent`는 manager context 갱신, `questSuggestion`은 사용자가 새 퀘스트 추천을 누를 때, `difficultyEvaluation`은 사용자가 편집한 퀘스트를 수락하기 직전, `statEvaluation`은 Quest Event 저장 직전으로 제한한다.
- 비용 제한은 server-side daily cap과 output kind별 minimum interval로 적용한다.
- React client도 output kind별 60초 throttle을 적용해 dev remount, context sync 반복, 버튼 연타가 실제 provider 호출로 곧장 이어지지 않게 한다.
- 저장 성공 후 manager context 반영은 `managerLine`만 갱신하고, `behaviorIntent`는 초기 context load 같은 큰 맥락 갱신에서만 호출한다.
- 매니저 창 문구는 한두 줄만 사용하며 서버/도메인 정규화에서 최대 2줄, 줄당 48자 이내로 제한한다.
- `questSuggestion`은 장기 목표를 그대로 제목으로 쓰지 않고 오늘 할 수 있는 작은 다음 행동으로 분해한다.
- 추천 퀘스트의 `type`, `amount`, `difficulty`, `rewardExp`는 profile의 `questSize`, `dailyMinutes`, 최근 이벤트, 현재 퀘스트 상태에 맞춰 조정한다.
- `questSuggestion`의 EXP도 난이도별 범위를 통과해야 한다: `easy=5..15`, `normal=16..35`, `hard=36..60`.
- `difficultyEvaluation`의 EXP는 난이도별 범위로 검증한다: `easy=5..15`, `normal=16..35`, `hard=36..60`.
- schema 검증에 실패하거나 provider 호출이 실패하면 rule fallback을 사용한다.
- 실패해도 퀘스트 수락, 완료, 실패, 복구 flow는 중단되지 않아야 한다.
- raw prompt는 DB에 장기 저장하지 않는다. 필요하면 최종 출력, `promptVersion`, `source`, `fallbackReason`만 저장한다.

## MVP 규칙 기반 동작

- 목표가 너무 짧거나 추상적이면 구체화 질문을 보여준다.
- 하루 가능 시간이 작으면 퀘스트 분량을 낮춘다.
- 쉬운 난이도는 낮은 EXP를 지급한다.
- 어려운 난이도는 높은 EXP를 지급한다.
- 실패 후 복구 퀘스트는 기존 분량보다 작게 만든다.
- 실패 후 EXP는 감소하지 않는다.
- LLM API가 비활성화됐거나 실패하면 `rule_fallback` 평가로 stat budget과 능력치 분배를 만들고, LLM 출력도 같은 검증 규칙을 통과해야 한다.

## 확장 계획

- `LLMAgentAdapter`를 고도화해 LLM 기반 문장 생성, 퀘스트 제안, 능력치 평가를 route별로 점진 적용한다.
- `ManagerMemory`를 추가해 사용자의 선호 난이도, 실패 이유, 자주 가능한 시간대를 저장한다.
- 개인 LLM 또는 브라우저 모델은 MVP 이후 실험 모듈로 둔다.
- 음성 입력, 웹캠 제스처, 소셜 탐색 기능은 [MVP 이후 확장 계획](future-expansion-plan.md)에서 관리한다.

## Agent처럼 보이기 위한 기준

단순 입력 폼이 아니라 다음 행동을 해야 한다.

- 목표를 해석한다.
- 오늘 할 수 있는 퀘스트로 제안한다.
- 사용자의 수정을 허용한다.
- 성공/실패 결과를 기억한다.
- 실패 이유에 맞춰 다음 퀘스트를 조정한다.
- 매니저의 대사를 현재 상황에 맞게 바꾼다.

