---
name: simple-tdd
description: Strict red-green-refactor TDD cycle for a single small function in this repo (SpecFit) — agree on scenarios in words first, write one failing test, confirm the failure, implement the minimal code to pass, confirm green, then refactor only if warranted. Use when the user says "TDD로 만들어줘", "테스트부터 짜줘", "red-green-refactor로", or asks to build one function test-first.
---

# simple-tdd

한 번에 하나의 작은 함수(또는 아주 작은 단위)를 red → green → refactor 순서로만 진행한다. 절대 순서를 건너뛰거나 여러 단계를 한 번에 처리하지 않는다 — 각 단계가 끝나면 다음 단계로 넘어가도 되는지 사용자에게 확인받는다.

## 진행 순서

### 1. 스펙과 시나리오 정하기 (코드 없음)
- 대상 함수의 이름, 위치(어느 파일에 둘지), 입력/출력 타입을 먼저 말로 정한다.
- 입력 → 기대 결과 → 이유, 3열 표로 시나리오를 나열한다. 코드는 아직 한 줄도 쓰지 않는다.
- **이 프로젝트의 컨벤션을 그대로 따른다**: 구조적으로 발생할 수 없는 입력(예: 체크박스가 항상 boolean만 만드는 경우의 `undefined`/`null`)은 방어 시나리오로 넣지 않는다 — CLAUDE.md의 "일어날 수 없는 상황에 방어 코드 넣지 않는다" 원칙과 동일.
- 함수가 실제로 쓰이는 모든 호출부를 확인해서, 시나리오가 실제 입력 범위와 맞는지 점검한다 (예: 이 함수를 부르는 컴포넌트/페이지가 항상 어떤 모양의 데이터를 넘기는지 grep/코드 리딩으로 확인).
- 목록을 사용자에게 보여주고 빠진 케이스가 없는지, 반환 타입(단일 값 vs 객체)이 맞는지 확인받는다. **확인받기 전엔 2단계로 넘어가지 않는다.**

### 2. Red — 실패하는 테스트부터 쓴다
- 테스트 파일만 작성한다. 대상 함수는 아직 구현하지 않는다(이미 파일이 존재하면 export만 없는 상태로 둔다).
- 파일 위치 컨벤션: 순수 함수(JSX 렌더링 없음)는 `*.test.js`, React 컴포넌트 렌더링이 필요하면 `*.test.jsx`. 같은 디렉터리에 대상 파일과 나란히 둔다 (예: `src/lib/gapAnalysis.js` → `src/lib/gapAnalysis.test.js`).
- 실행해서 실제로 빨간 화면(실패)이 뜨는 것을 보여준다:
  - 프론트: `npx vitest run <파일 경로>` (단일 파일) 또는 `npm run test` (전체)
  - 백엔드(`server/`): `cd server && npm run test`
- 사용자가 직접 자기 터미널에서 재현해보고 싶어하면 정확한 명령어를 알려준다. **빨강을 확인(또는 사용자가 확인했다고 말)하기 전엔 3단계로 넘어가지 않는다.**

### 3. Green — 통과하는 최소한의 코드
- 테스트를 통과시키는 데 필요한 가장 단순한 구현만 작성한다. 시나리오에 없는 케이스에 대한 처리(예: 안 물어본 방어 코드)는 추가하지 않는다.
- 같은 명령어로 재실행해서 초록(전부 통과)인지 확인한다.

### 4. Refactor — 필요할 때만
- 구현이 한두 줄이라 정리할 게 없으면 "정리할 것 없음"이라고 명시하고 스킵한다. 없는 중복/복잡도를 억지로 만들어 리팩토링하지 않는다.
- 리팩토링했다면 반드시 같은 테스트를 다시 돌려서 여전히 초록인지 확인한 뒤에만 다음으로 넘어간다.

### 5. 실제 기능에 연결
- 방금 만든 함수를 실제로 호출하는 곳(컴포넌트/라우트 등)에 연결한다. 이 단계는 순수 함수 자체의 TDD 범위 밖이므로 필요하면 별도로 유닛 테스트를 추가할지 사용자에게 물어봐도 되지만, 강요하지 않는다.
- 연결 후 이 프로젝트의 표준 검증 세트를 돌린다: `npm run test` + `npm run lint` (+ 프론트 변경이면 build 확인). 실제 화면 동작은 이 환경에 headless 브라우저가 없으므로 사용자가 브라우저에서 직접 확인해야 한다 — 이 사실을 명시적으로 알린다.

## 이 프로젝트에서 자주 걸리는 함정

- **자동 cleanup 없음**: `vite.config.js`에 `test.globals: true`가 없고 `src/setupTests.js`도 `afterEach(cleanup)`을 등록하지 않는다. 한 테스트 파일 안에서 `render()`를 여러 번 호출하고 결과 텍스트가 겹치면(`"0%"`, `"NaN%"` 같은 짧은 문자열) "Found multiple elements" 에러가 난다. **고칠 때는 그 테스트 파일 안에서만** `afterEach(() => cleanup())`을 추가한다 — `setupTests.js`나 다른 기존 테스트 파일은 건드리지 않는다(프로젝트 공통 인프라라 영향 범위가 커짐).
- **커밋 타이밍**: 구현+테스트가 끝났다고 바로 커밋하지 않는다. 사용자가 브라우저에서 확인하고 "커밋해줘"라고 말할 때까지 기다린다.
- **체크리스트 문서**: 이슈 번호가 있는 작업이면 `docs/checklist_4_week3_4_issues.md` 같은 완료 기준 문서의 체크박스도 갱신 대상인지 확인한다(있다면 갱신 후 별도로 커밋해도 되는지 물어본다).
