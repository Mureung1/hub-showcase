---
name: tidenote-test-writer
description: TideNote 코드에 vitest 테스트를 새로 쓸 때 반드시 참고. 순수 함수(계산·검증·변환)나 조건 분기가 있는 로직을 테스트할 때, 코드부터 쓰지 않고 시나리오 표 → red → green → refactor 순서를 강제한다. TDD로 기능을 만들거나, "테스트 써줘" "test 추가해줘" 같은 요청을 받을 때 사용.
---

# TideNote 테스트 작성 Skill

## 언제 쓰나
- 순수 함수(계산, 검증, 변환)에 테스트를 붙일 때 — 제일 잘 맞는 대상
- 조건 분기가 있는 로직(빈 값/경계값/실패 케이스가 있는 함수)
- 이미 있는 함수에 "테스트 커버리지가 없다"고 코드 검증 Agent가 지적했을 때

## 언제 안 쓰나
- 화면(UI) 배치나 디자인 확인 — 눈으로 보는 게 더 빠르다 ([verify](../../skills) 스킬이나 브라우저 직접 확인)
- `server/db/supabaseClient.js`처럼 외부 서비스에 직접 연결하는 코드 — 지금 단계에서는 건너뛴다

## 절차 (반드시 이 순서로)

### 1. 스펙과 시나리오부터 — 코드보다 먼저
테스트할 함수의 입력·출력을 표로 먼저 정리한다. 코드는 아직 쓰지 않는다.

| 입력 | 기대 결과 | 이유 |
|---|---|---|
| 정상 케이스 | ... | ... |
| 빈 값 / null / undefined | ... | ... |
| 경계값 | ... | ... |
| 실패하는 경우 | ... | ... |

이 표를 사용자에게 먼저 보여주고, 빠진 케이스가 없는지 확인받은 다음에 넘어간다.
(`docs/agents/planning-agent.md`와 같은 원칙 — AI가 만든 목록을 그대로 밀어붙이지 않는다.)

### 2. RED — 실패하는 테스트부터
- 대상 함수 파일이 없으면 **스텁**(빈 껍데기, 항상 틀린 값 반환)을 먼저 만든다 — import 자체가
  깨지면 "실패"가 아니라 "실행 안 됨"이라 red를 볼 수 없다.
- 시나리오 표를 그대로 `test('설명', () => { expect(...).toBe(...) })`로 옮긴다.
- `npx vitest run <파일>`로 실행해서 **의도한 케이스들이 실패하는 것**을 직접 확인한다.
  (전부 통과하면 뭔가 잘못 짠 것 — 스텁이 우연히 맞는 답을 낸 건 아닌지 의심한다.)

### 3. GREEN — 통과하는 최소한의 코드
- 테스트를 통과시키는 데 필요한 만큼만 구현한다. 더 일반화하거나 최적화하지 않는다.
- `npx vitest run <파일>`로 전체 통과 확인.

### 4. REFACTOR — 필요할 때만
- 테스트가 있으니 안심하고 구조를 정리한다. 한두 줄짜리 단순 함수면 이 단계는 생략해도 된다.
- 리팩터링 후에도 테스트는 다시 돌려서 초록 유지 확인.

## 이 프로젝트의 테스트 컨벤션
- 파일명: `대상파일이름.test.js` — 대상 파일과 같은 폴더에 둔다 (예: `hasCheckedInToday.js` → `hasCheckedInToday.test.js`)
- `vitest.config`(`vite.config.js`의 `test` 옵션)에 `globals: true`가 켜져 있어서 `test`/`expect`를
  따로 import 안 해도 되지만, 이 프로젝트는 명시적 import(`import { test, expect } from 'vitest'`)를
  선호한다 — 어디서 온 함수인지 파일만 보고 알 수 있게.
- 원시값(숫자·문자열·불리언) 비교는 `toBe`, 객체·배열 비교는 `toEqual`.
- 날짜/시간처럼 "지금"에 의존하는 함수는 `now` 같은 인자로 현재 시각을 주입받게 만들어서,
  테스트에서 고정된 날짜를 넘길 수 있게 한다 (`hasCheckedInToday(lastCheck, now)` 참고).
- React 컴포넌트 테스트는 `@testing-library/react` + `@testing-library/jest-dom` 사용,
  `render()` → 화면에 보이는 텍스트/역할로 조회 → 사용자 행동(`fireEvent`/`userEvent`) 순서로 작성.

## 예시 (이번 주 실제로 한 것)
`src/hasCheckedInToday.js` / `src/hasCheckedInToday.test.js` 참고 — null/undefined,
오늘/어제, 자정 경계, 파싱 실패까지 7개 케이스를 시나리오 표로 먼저 정리한 뒤
red(스텁으로 3개 실패 확인) → green(구현 후 7/7 통과) 순서로 만들었다.
