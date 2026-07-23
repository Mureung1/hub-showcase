---
name: tdd-workflow
description: Use this skill when writing a new pure function or small isolated piece of logic test-first in this repo — red(실패하는 테스트)→green(통과)→refactor 순서로 Vitest 테스트를 먼저 작성하고 나서 구현할 때 사용한다. 예: "이 함수 TDD로 만들어줘", "테스트부터 써줘", "이 로직에 테스트 커버리지 추가해줘".
---

# TDD Workflow (Briefy)

이 저장소에서 순수 함수(비즈니스 로직)를 만들 때 테스트를 먼저 쓰고 구현하는 절차. **비즈니스 로직과 UI를 분리한다**(CLAUDE.md 원칙)는 이 저장소 원칙과 맞물려, `server/services/`나 `src/lib/`의 순수 함수는 전부 이 흐름으로 만든다.

## 이 저장소의 Vitest 컨벤션

- 테스트는 소스 파일과 **같은 디렉토리에 colocate**한다: `foo.ts` 옆에 `foo.test.ts`. 별도 `__tests__/` 폴더를 만들지 않는다.
- 설정은 루트 `vitest.config.ts` 하나. `@shared` alias가 이미 설정되어 있어 `shared/schemas.ts`의 타입을 테스트에서 바로 import할 수 있다. `environment: 'node'` — 아직 브라우저/DOM 대상 테스트는 없다(필요해지면 `environment: 'jsdom'`으로 확장을 검토할 것, 지금은 추가하지 않는다).
- 실행: `npm run test` (1회, CI/커밋 전 검증용), `npm run test:watch` (감시 모드, 개발 중).

## Red → Green → Refactor 체크리스트

1. **함수 시그니처만 먼저 정한다.** 구현은 아직 쓰지 않는다 — 입력/출력 타입과 이름만 확정.
2. **테스트 파일을 먼저 작성한다.** 정상 케이스 1~2개 + 경계값(boundary) 케이스 + 빈 입력(empty) 케이스를 반드시 포함한다. 날짜 관련 로직이면 "오늘"을 고정된 문자열로 넘겨서(예: `'2026-07-21'`) 테스트가 실행 시점에 따라 흔들리지 않게 한다 — `new Date()`를 테스트 안에서 직접 쓰지 않는다.
3. **`npm run test`로 실패를 실제로 확인한다.** 모듈이 없어서 나는 실패든 assertion 실패든 상관없다 — 이 단계를 건너뛰지 않는 것 자체가 TDD의 핵심이다.
4. **테스트를 통과시키는 최소 구현을 작성한다.** 아직 존재하지 않는 요구사항을 미리 구현하지 않는다(YAGNI) — 지금 쓴 테스트를 통과시키는 데 필요한 만큼만.
5. **다시 `npm run test`로 통과(green)를 확인한다.**
6. **`npm run typecheck && npm run lint && npm run format:check`까지 전부 통과해야 완료다.** `any` 타입은 쓰지 않는다(CLAUDE.md) — 제네릭이나 정확한 유니온 타입으로 대체한다.
7. 필요하면 리팩터링하되, 이 시점에 새로운 추상화나 미래를 대비한 확장 포인트를 추가하지 않는다 — 통과하는 테스트가 그대로 통과하는 선에서만 정리한다.

## 완성된 예시

`server/services/queryService.ts` + `server/services/queryService.test.ts` (`filterByThisWeek`) — 이 절차 그대로 만들어진 첫 사례. 새 순수 함수를 TDD할 때 이 두 파일을 템플릿으로 참고할 것: 제네릭으로 항목 타입에 의존하지 않게 작성, `date-fns`로 날짜 계산(신규 날짜 라이브러리 추가 금지), 경계값·빈 배열·기간이 걸치는 케이스까지 포함한 테스트 구성.
