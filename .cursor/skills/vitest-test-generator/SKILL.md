---
name: vitest-test-generator
description: >-
  Generates Vitest unit tests for FitCheck frontend-web pure functions.
  Use when adding tests, doing TDD, or when the user asks for test code generation
  in fitcheck-project/frontend-web.
---

# Vitest Test Generator (FitCheck)

FitCheck `frontend-web` 순수 함수·유틸에 Vitest 단위 테스트를 작성할 때 이 Skill을 따릅니다.

## 대상

- ✅ `src/utils/*.ts` — DOM·API·React hook 없는 순수 함수
- ✅ `src/constants` — 계산·변환 로직이 있는 경우
- ❌ 컴포넌트, hook, API 클라이언트 (Testing Library E2E는 별도)

## 워크플로

1. **소스 읽기** — 함수 시그니처, 분기, 경계값 파악
2. **기존 패턴 참고** — `src/utils/signal.test.ts` (정상·경계·실패 케이스)
3. **테스트 파일 생성** — `src/utils/<name>.test.ts` (소스와 같은 폴더)
4. **실행** — `cd fitcheck-project/frontend-web && npm run test:run`
5. **기능 코드는 수정하지 않음** — 테스트가 실패하면 먼저 사용자에게 보고

## 파일 템플릿

```typescript
import { targetFn } from './targetModule'

describe('targetFn', () => {
  describe('정상 케이스', () => {
    it('…', () => {
      expect(targetFn(/* input */)).toBe(/* expected */)
    })
  })

  describe('경계값', () => {
    it('…', () => { /* … */ })
  })

  describe('실패/엣지 케이스', () => {
    it('…', () => { /* … */ })
  })
})
```

## 케이스 체크리스트

각 함수마다 가능하면 아래를 포함합니다.

| 구분 | 예시 |
|------|------|
| 정상 | 대표 입력 → 기대 출력 |
| 경계 | 0, 빈 배열, 100% 도달, 임계값 직전/직후 |
| 엣지 | null/undefined coalesce, goal=0, 중복 키 합산 |
| 실패 방지 | 잘못된 status/타입이 나오면 안 되는 경우 (`not.toBe`) |

## 컨벤션

- `describe` / `it` 설명은 **한국어**
- import 경로: 상대 경로 (`./module`)
- mock 데이터는 테스트 파일 안에 **최소 factory**로 정의
- `npm run test:run` 통과까지 확인

## 참고 예시

- `src/utils/signal.test.ts` — 경계값·실패 케이스 패턴
- `src/utils/date.test.ts` — 짧은 유틸 테스트
- `src/utils/todayMealSummary.test.ts` — 배열 reduce·집계 함수
