---
name: simple-tdd
description: 잔소리봇 레포(C:\Users\LG\hub) 전용 TDD 절차. src/lib/**, server/src/lib/** 같은 순수 함수(단위 테스트 대상)를 새로 만들 때 스펙 표 승인 → Red(스텁+실행되는 빨간불) → Green(최소 구현) → Refactor(정리할 것 없으면 없다고 확인) 순서로 진행한다. "TDD로 하자", "테스트 먼저 짜고", "simple-tdd 써서" 같은 요청에 적용. 컴포넌트/UI나 통합 테스트(routes/**)는 이 Skill 대상이 아니다 — 전자는 Playwright, 후자는 test-writer Skill을 따른다.
---

> **재사용 방법**: "TDD로 하자" / "simple-tdd 써서 만들어줘"라고 말하면 이 문서의 절차를 순서대로 따른다.

## 적용 대상

**`src/lib/**`, `server/src/lib/**` 같은 순수 함수(단위 테스트 대상)에만 적용한다.**

- 라우트(`server/src/routes/**`) 통합 테스트나, 테스트를 어떻게 짜는지(단위/통합 구분, 케이스 3분류, DB 안전장치 등)는 이 Skill이 아니라 **test-writer Skill**을 그대로 따른다. 이 Skill은 test-writer의 규칙을 대체하지 않고, 그 위에 "어떤 순서로 만드는가"만 얹는다.
- 컴포넌트/UI 테스트는 이 Skill 대상이 아니다 — 이 프로젝트는 컴포넌트 테스트를 Playwright(E2E)로 검증하기로 이미 판단했다(4주 해커톤 규모, `@testing-library/react`+jsdom 도입 비용 대비 실익 낮음).
  - **예외(2026-07-23)**: `src/components/CompletionMessage.test.jsx`는 위 원칙과 별개로, 마스터클래스 실습 미션("UI 중심 간단한 테스트 실습")으로 학습 목적에서 RTL(`@testing-library/react`)+`jsdom`을 의도적으로 도입해 만든 것이다(`src/setupTests.js`, `vite.config.js`의 `test.environment: "jsdom"`/`setupFiles`, `package.json`의 관련 devDependencies도 이 실습을 위해 함께 추가됨). 이건 프로젝트 전체의 컴포넌트 테스트 방향을 RTL로 바꾼 것이 아니다 — **기본 방향은 여전히 Playwright**이며, 새 컴포넌트 테스트를 앞으로도 RTL 방식으로 계속 늘릴지는 이 예외와 별개로 그때그때 판단한다. 새 컴포넌트 테스트를 만들 때 이 예외를 근거로 자동으로 RTL을 골라 쓰지 말 것 — 기본값은 여전히 Playwright다.

## 절차

0~3은 사이클마다 필수, 4(최종 점검)는 선택, 5(시나리오 확장)는 스코프 밖으로 미뤄둔 케이스를 나중에 다룰 때만 쓴다.

### 0. 스펙/시나리오 표 먼저 — 코드 작성 전에 승인받는다

함수 시그니처(입력 타입, 반환 타입)와 "입력 / 기대 결과 / 이유" 표를 먼저 정리해 보여주고, **사용자가 승인한 뒤에만** 다음 단계로 넘어간다. 표에는 test-writer §3의 케이스 3분류(happy path / 경계 / 회귀)를 최소 기준으로 쓴다. 스코프를 임의로 넓히지 않는다 — 지금 근거 없는 조건(예: 근거 없는 최대 길이 제한)을 추측해서 넣지 말고, 애매하면 사용자에게 확인한다.

표는 한 번 승인받으면 끝이 아니라, Red/Green 진행 중 새로 발견한 케이스(예: `taskTitle`에서 찾은 제로폭 공백 같은 것)가 있으면 그 자리에서 추가 제안하고 사용자 확인을 받는다 — 표 자체를 매번 처음부터 다시 만들 필요는 없다.

### 1. Red — 스텁도 없이 시작해서, 실제로 실행되는 빨간불을 확인한다

승인된 표의 케이스를 전부 한 번에 테스트 파일로 옮겨서 쓴다(케이스 하나씩 순차로 만들지 않는다 — 이유는 아래 "웹 리서치와 비교해 반영한 것" 참고). 이 시점엔 구현 파일이 아예 없으므로 `import`가 깨져 테스트가 "실행조차 안 되는" 상태가 된다(`Failed to resolve import`류 에러) — 이것도 Red의 일종이지만, 실제로 vitest를 돌려서 그 에러 메시지를 사용자에게 보여준다. 여기서 **멈춘다** — 사용자가 진행하라고 확인하기 전까지 구현 파일을 만들지 않는다.

```
npx vitest run <path/to/new.test.ts>
```

Red나 Green 어느 한쪽에서 막혀서 계속 헤매고 있다면(대략 체감상 몇 분 이상), 표에 담은 케이스 자체가 한 번에 다루기엔 너무 크다는 신호다 — 표를 더 작은 케이스로 쪼개고 사용자에게 다시 확인받는다.

### 2. Green — 최소한의 코드로만 통과시킨다

테스트를 통과시키는 데 필요한 만큼만 구현한다. 미래에 필요할 것 같은 옵션·분기·에러 처리를 미리 넣지 않는다(CLAUDE.md "하지 말 것" 원칙과 동일). 구현 후 전체 스위트를 돌려 새 테스트뿐 아니라 기존 테스트도 깨지지 않았는지 확인한다.

```
npx vitest run
```

### 3. Refactor — 정리할 게 없으면 "없다"고 말하고 넘어간다

중복 제거, 네이밍 정리, 조건 단순화 등을 검토한다. **항상 뭔가 고쳐야 하는 건 아니다** — 구현이 이미 한두 줄로 충분히 단순하면 "리팩터할 것 없음"이라고 확인만 하고 다음으로 넘어간다. 억지로 추상화를 만들지 않는다.

### 4. 최종 점검 (선택) — code-review + 전체 테스트로 마무리

Refactor까지 끝난 뒤, 이 함수가 이번 작업의 마지막 조각이거나 규모가 있어서 한 번 더 확인하고 싶을 때 선택적으로 진행한다. 사소한 한두 줄짜리 함수까지 매번 돌릴 필요는 없다 — 스코프에 안 맞으면 생략하고 3단계(Refactor)에서 끝내도 된다.

1. `code-review` 에이전트로 네이밍/컨벤션/이 저장소 패턴과의 일관성을 점검한다(코드를 고치지 않고 점검만 하는 에이전트 — CLAUDE.md 컨벤션, test-writer §2의 배치 규칙 등을 기준으로 본다).
2. `npm test`(또는 `npm run test:all`, `server/` 쪽도 건드렸다면)로 전체 스위트가 여전히 통과하는지 최종 확인한다.

두 결과 다 사용자에게 보여주고, code-review가 지적한 게 있으면 반영할지 사용자와 함께 판단한다(자동으로 고쳐서 다시 커밋하지 않는다).

### 5. 시나리오 확장 — 스코프 밖으로 미뤄둔 케이스를 나중에 다룰 때

0단계에서 "예외 케이스를 스코프에 넣을지 판단하는 기준"(아래 참고)에 따라 스코프 밖으로 미뤄둔 케이스가 있고, 나중에 그걸 실제로 다뤄야 하는 시점이 오면 처음부터 다시 크게 벌이지 않는다. **같은 4단계(0~3)를 그 케이스 하나(또는 몇 개)만 대상으로 작게 다시 돈다**:

0. 미뤄뒀던 케이스를 표에 새 행으로 추가 → 승인
1. 그 케이스만 겨냥한 테스트를 기존 테스트 파일에 추가 → Red 확인
2. 기존 구현을 최소한으로 확장해 Green
3. Refactor(역시 "없으면 없다"도 정상)

예: `taskTitle.ts`는 처음 사이클에서 비-문자열 입력과 제로폭 공백을 "발견은 했지만 스코프 밖"으로 명시적으로 남겼다(아래 실행 예시 참고). 나중에 `RegisterPage.jsx`에 실제로 연동하면서 제로폭 공백이 실사용 버그로 확인되면, 그때 이 5단계 절차로 `validateTaskTitle`에 케이스 하나만 추가하는 작은 사이클을 새로 돈다 — 처음부터 함수를 다시 설계하지 않는다.

## 예외 케이스를 스코프에 넣을지 판단하는 기준

0단계(스펙 표)나 진행 중에 새로운 예외/엣지 케이스를 발견했을 때, **무조건 다 넣거나 무조건 다 빼지 않는다.** 핵심은 넣든 빼든 판단 근거를 표(또는 대화)에 남기는 것이다 — 근거 없이 스코프를 정하면 나중에 왜 그렇게 정했는지 아무도 모른다.

스코프 밖으로 미뤄도 되는 경우(둘 다 있으면 특히 안전):
- **다른 방어 수단이 이미 있다** — 예: 비-문자열 입력을 이 함수가 굳이 막지 않아도, TypeScript 타입 경계(CLAUDE.md의 "any 금지" 방침)가 컴파일 타임에 이미 막아준다.
- **실사용 위험이 낮다** — 예: 제로폭 공백은 이론적으로는 가능하지만, 사용자가 실제로 입력할 가능성이 희박하고 지금은 TDD 사이클 경험 자체가 목적이라 우선순위가 낮다.

반대로, 아래에 해당하면 스코프 밖으로 미루지 말고 지금 표에 넣는 걸 검토한다:
- 실제로 이 프로젝트에서 이미 한 번 터진 버그와 같은 종류다(test-writer §3의 "회귀 케이스"와 동일한 기준).
- 방치하면 데이터 정합성이나 보안에 영향을 준다(단순 UX 문제가 아니라).

판단이 애매하면 사용자에게 직접 확인한다 — 임의로 결정하지 않는다. `taskTitle.ts`에서 실제로 이 판단을 거쳤다: 비-문자열 입력은 "타입 경계 방어" 근거로, 제로폭 공백은 "실사용 위험 낮음 + 지금은 TDD 경험이 목적" 근거로 각각 스코프 밖에 남기기로 사용자와 합의했다.

## 이 프로젝트에서의 실행 예시

`src/lib/taskTitle.ts`(`validateTaskTitle`)로 이 4단계를 실제로 거쳤다:

0. 표 승인: `title.trim().length > 0` 기준으로 "빈 문자열 / 공백만 / 정상 문자열 / 앞뒤공백+정상 문자열" 4케이스 표를 먼저 보여주고 승인받음(비-문자열 입력, 제로폭 공백 같은 스펙 밖 케이스는 발견은 했지만 위 "예외 케이스를 스코프에 넣을지 판단하는 기준"에 따라 범위 밖으로 명시적으로 남김)
1. Red: `src/lib/taskTitle.test.ts` 4개 케이스 작성 → `taskTitle.ts`가 없어 `Failed to resolve import "./taskTitle.js"`로 전부 실패하는 걸 실행해서 확인
2. Green: `export function validateTaskTitle(title: string): boolean { return title.trim().length > 0; }` 한 줄로 4개 전부 통과
3. Refactor: 한 줄짜리 구현이라 정리할 게 없다고 확인하고 종료

스코프 밖으로 남긴 비-문자열 입력/제로폭 공백은 그걸로 끝이 아니다 — 나중에 실제로 다뤄야 할 시점이 오면, 위 "5. 시나리오 확장" 절차로 이 함수에 케이스만 추가하는 작은 사이클을 새로 돌면 된다.

`src/lib/historyGrouping.ts`, `src/lib/nudgeInterval.ts`도 같은 패턴(happy path/경계 케이스를 먼저 표로 정리하고, 순수 함수 하나당 좁은 범위의 테스트 여러 개)을 따른다 — 테스트 코드 스타일 자체(설명 문구에 "(happy path)"/"(경계)" 태그를 붙이는 관례, 파일 배치, `any` 금지 등)는 test-writer Skill §2, §4를 그대로 따른다.

## 웹 리서치와 비교해 반영한 것

Kent Beck의 원전(Red-Green-Refactor)과 React 진영 TDD 아티클들을 조사해 우리 실전 경험과 비교했다. 그대로 유지한 것, 새로 얹은 것, 의도적으로 안 따른 것을 구분해서 남긴다.

**그대로 유지(이미 일치)**
- Red-Green-Refactor 3단계 자체, "순수 함수가 TDD에 가장 잘 맞는 대상"이라는 원칙, Refactor가 "매번 뭔가 고쳐야 하는 단계"가 아니라 "중복/불필요한 것만 없앤다"는 원칙 — 전부 이미 이 Skill의 뼈대와 일치해서 손대지 않았다.

**새로 추가**
- **작은 단위로 쪼개기**: Beck은 Red/Green 어느 단계에서든 오래 헤매면 스텝이 너무 크다는 신호로 본다. 이번 Skill의 "실전 경험"만으로는 이 실패 신호가 빠져 있어서, 1단계에 "헤매면 표를 더 쪼개서 재확인" 문구로 추가했다.
- **표는 고정이 아니라 진행하며 늘어날 수 있다**는 것(Beck의 "test list"와 같은 발상): 이미 `taskTitle`에서 실제로 겪은 패턴(제로폭 공백을 진행 중에 발견)이라 원칙으로 명문화했다.

**검색 결과 중 의도적으로 안 따른 것(우리 프로젝트엔 안 맞음)**
- Beck 원전은 **테스트를 한 케이스씩 추가하며(one test at a time), 처음엔 하드코딩값을 리턴해서라도 일단 통과시키고("fake it"), 테스트를 더 추가해 일반화를 강제(triangulate)하는** 흐름을 권장한다. 이 Skill은 그 대신 **승인된 표의 케이스를 한 번에 Red로 옮기고, Green에서 바로 일반해를 구현**하는 배치(batch) 방식을 그대로 유지하기로 했다. 이유: (1) 이 프로젝트는 사람이 표를 보고 한 번에 승인하는 리듬으로 이미 잘 동작 중이고(`taskTitle` 실습에서 확인), 케이스마다 매번 승인을 받는 건 4주 단기 프로젝트에 비해 과도한 오버헤드다. (2) `title.trim().length > 0`처럼 함수가 단순할수록 "가짜 구현 → 삼각측량으로 일반화"라는 절차 자체가 실익 없이 단계만 늘린다. 함수가 실제로 복잡해져서 한 번에 일반해를 못 찾겠다면, 그때는 표를 쪼개는 위 "작은 단위로 쪼개기" 원칙으로 자연스럽게 흡수된다.
- React 컴포넌트 테스트 관련 조언("behavior not implementation", RTL/Enzyme 비교, "presentational vs container 컴포넌트" 등)은 전부 걸렀다 — 이 Skill은 `lib/**` 순수 함수 전용이라 컴포넌트 렌더링 자체가 스코프 밖이다(적용 대상 참고).

**Sources**: [Toptal – Test-driven React.js Development](https://www.toptal.com/developers/react/tdd-react-unit-testing-enzyme-jest) · [Ratul Hasan – TDD for Modern React Applications](https://www.ratulhasan.com/blog/test-driven-development-react) · [Testim – TDD in React: Red-Green-Refactor](https://www.testim.io/blog/tdd-react/) · [jonbeckett.com – The Red-Green-Refactor Rhythm](https://jonbeckett.com/2025/11/20/test-driven-development/) · [Stanislaw – Notes on "Test-Driven Development by Example" (Kent Beck)](https://stanislaw.github.io/2016-01-25-notes-on-test-driven-development-by-example-by-kent-beck.html) · [Martin Fowler – Test Driven Development](https://www.martinfowler.com/bliki/TestDrivenDevelopment.html)
