# AI 협업 요청 템플릿

AI에게 작업을 맡길 때 쓰는 기본 템플릿. 복사해서 빈칸을 채워 해당 AI에게 붙여넣는다.

역할 분리는 `AGENTS.md`의 "AI 협업 운영 방식"을 따른다. 핵심은 **한 AI에게 설계와 검증을 동시에 맡기지 않는 것**이다.

## 사이클

```
1. design-request.md          설계 요청     사람 → Codex
2. design-review.md           설계 검증     사람 → Claude Code
   └ 지적 사항을 사람이 결정해 설계에 반영
3. implementation-request.md  구현 요청     사람 → Claude Code
4. implementation-verification.md  구현 검증  사람 → Codex
   └ 실패 항목은 3으로 되돌아간다
```

## 원칙

- 설계를 만든 AI가 그 설계를 검증하지 않는다.
- 구현한 AI가 자기 코드를 검증하지 않는다.
- AI가 작성한 코드는 AI의 설명이 아니라 **검증 결과**로 판단한다.
- 결정이 필요한 지점은 AI가 임의로 정하지 않는다. 사람이 정하고 기록한다.

## 관련 문서

- `AGENTS.md` — 역할 분리와 공통 작업 규칙
- `docs/plan/06-agent-strategy.md` — 판단 기준 상세
- `docs/quality/` — 검증 기준 (2번, 4번 단계에서 참조)
