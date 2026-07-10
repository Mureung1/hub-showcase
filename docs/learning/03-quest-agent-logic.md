# Quest Agent Logic

## 키워드

- rule-based agent
- quest generation
- quest type
- difficulty
- reward EXP
- failure reason
- rebalancing
- recovery quest
- state transition
- MVP contract

## 왜 공부하나

AI API를 붙이기 전에도 퀘스트 생성과 복구 흐름은 규칙 기반으로 설계되어야 한다.

## 코드 위치

- src/layers/agent/ruleBasedAgent.ts
- src/data/quests.ts
- src/domain/types.ts
- docs/agent-design.md
- docs/mvp-functional-spec.md

## 확인할 부분

- 장기 목표를 일일 퀘스트로 바꾸는 규칙
- 시간형 / 양적형 / 행동형
- EXP 계산 기준
- 실패 시 EXP 감소 없음
- 복구 퀘스트는 낮은 분량과 낮은 보상

## ChatGPT 질문 예시

- 규칙 기반 Agent와 LLM Agent의 차이를 이 프로젝트 기준으로 설명해줘.
- 실패 이유를 바탕으로 다음 퀘스트 분량을 줄이는 규칙을 어떻게 설계할까?
- 퀘스트 타입을 time, quantity, action으로 나누면 어떤 데이터 구조가 좋아?
