---
name: tdd-feature-loop
description: Red→Green→Refactor 순서로 기능을 구현하고 커밋을 test:/feat: 로 분리하는 이 레포의 TDD 관행을 따른다. "TDD로 만들어줘", "테스트 먼저 짜줘", "순수 함수 구현해줘" 같은 요청에 사용한다.
---

# TDD 기능 구현 루프 (Red → Green → Refactor)

4주차 계획서(`README/plan/Week4_Implementation_Plan.md`) Task 28 이하 모든 테스트 Task의 공통 규칙을 스킬로 고정한 것. 기존 `backend/src/lib/responseValidation.test.ts` 스타일을 그대로 따른다.

## 1. Red — 실패하는 테스트를 먼저 쓴다

- 대상 함수의 시그니처만 정하고(또는 아직 없는 상태로) 기대 동작을 테스트로 적는다.
- `vitest`(BE/FE 공통), `describe`/`it`/`expect`를 명시적으로 `import` 한다 (`import { describe, it, expect } from 'vitest'`).
- `it` 설명은 한글로, 무엇을 검증하는지 행동 기준으로 쓴다 (예: `it('전언 근거만 있으면 유력함을 주지 않는다', ...)`）.
- **테스트를 실행해 실패 출력을 실제로 확인한다.** 이 단계를 건너뛰고 통과하는 테스트만 쓰면 그건 검증이 아니라 기록이다.
  ```bash
  npm test --prefix backend -- <파일명>
  npm test --prefix frontend -- <파일명>
  ```
- 이 상태로 `test: <설명> (Task N)` 커밋을 만든다. 구현 코드는 아직 커밋하지 않는다.

## 2. Green — 테스트를 통과시키는 최소 구현

- 테스트를 통과시키는 데 필요한 만큼만 구현한다. 아직 요구되지 않은 기능을 미리 만들지 않는다.
- 순수 함수 우선: 대상 로직에 Gemini 호출·DB 접근이 섞여 있으면 순수 함수로 먼저 분리하고 그 분리된 함수를 테스트한다 (예: `metrics.ts`, `buildUserPrompt()` 패턴).
- `feat: <설명> (Task N)` 커밋으로 분리한다 — `test:` 커밋과 섞지 않는다.

## 3. Refactor — 구조만 바꾼다

- 리팩터 전후 동작이 같아야 한다. 프롬프트/로직 분리 같은 순수 구조 변경이면, **eval 지표가 리팩터 전후 동일**해야 한다(다르면 버그).
- 구조 변경만 있는 커밋은 `refactor:` 또는 상황에 따라 `chore:`로 분리한다(이 레포 관행상 `refactor:`는 흔치 않으므로 실제 git log 접두사 표를 `branch-commit-push` 스킬에서 재확인).

## 4. 커밋 분리 확인

이 루프가 지켜졌다는 유일한 증거는 커밋 이력에서 `test:` 커밋 뒤에 같은 대상의 `feat:` 커밋이 온다는 것이다. 구현을 먼저 하고 테스트를 나중에 맞춰 쓰면 이 순서가 나오지 않는다 — 커밋하기 전에 `git log --oneline`으로 순서를 스스로 점검한다.

## 5. Task 39 실사용 트레일러

이 스킬로 진행한 커밋에는 `branch-commit-push` 스킬 2-1절 규약에 따라 트레일러를 추가한다:
```
test: 근거 강도 가중합 함수 테스트 작성 (Task 26)

Skill: tdd-feature-loop
```
