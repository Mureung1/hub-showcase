---
name: tdd-test-writing
description: Bridge 프로젝트에서 순수 함수(조건 분기·계산·검증 로직)를 vitest로 테스트할 때 따르는 절차. TDD(red→green→refactor)로 새 함수를 만들거나, 기존 함수에 테스트를 붙일 때 이 스킬을 먼저 읽을 것. "테스트 써줘", "TDD로 만들어줘", "vitest 테스트 추가해줘" 같은 요청에 적용.
---

# Bridge 테스트 작성 절차 (TDD)

Bridge는 `frontend/`에 **vitest**를 사용한다 (`npm run test`, watch는 `npm run test:watch`).
백엔드(`backend/`)에는 아직 테스트 러너가 없음 — 도입 전에는 이 스킬을 backend에 적용하지 말 것.

## 0. 대상부터 고른다 — 아무 함수나 테스트하지 않는다

테스트하기 좋은 함수의 조건:
- **순수 함수**다 (같은 입력 → 항상 같은 출력, 외부 상태를 안 건드림)
- 조건 분기·경계값·계산·검증 로직이 있다
- `frontend/src/lib/`, `frontend/src/state/`(reducer 등) 위주로 찾는다

다음은 단위 테스트 대상에서 **제외**한다 (더 적합한 방법이 따로 있음):
- 로케일/시간대에 의존하는 함수 (예: `toLocaleDateString` 사용)
- Supabase·API 호출이 섞인 함수 (분리 후 테스트하거나 통합 테스트로)
- 컴포넌트 렌더링·UI 상호작용 (여기는 눈으로 확인이 더 빠름)

검증 로직이 이벤트 핸들러 안에 `navigate`/`dispatch`와 뒤섞여 있으면(예: 기존 `AppStateContext.jsx`
액션들), **먼저 순수 함수로 추출**한 뒤 그 추출된 함수를 테스트한다.

## 1. 케이스부터 목록으로 정한다 (코드 작성 전)

정상 케이스, 빈 값, 경계값, 실패하는 경우를 표로 정리한다.

| 입력 | 기대 결과 | 이유 |
|---|---|---|
| ... | ... | ... |

이 목록에서 **빠진 케이스가 없는지는 사람이 검토한다** (CLAUDE.md: 작업 방식 규칙과 동일하게,
Claude가 혼자 확정하지 않는다).

## 2. red — 실패하는 테스트부터 쓴다

- 파일 위치: 테스트 대상 소스 옆에 `이름.test.js` (예: `validateLetter.js` → `validateLetter.test.js`)
- `import { test, expect } from 'vitest'`
- 테스트 이름은 한국어로 "무엇이 어때야 한다" 형태
- 대상 함수 파일이 **아예 없으면** import 오류로 테스트가 실행조차 안 된다 → 먼저 **스텁**
  (아직 제대로 동작 안 하는 빈 껍데기, 예: `return false`)을 만들어 실행이 되게 한 뒤 실행해서
  **빨강을 확인**한다.

```js
// frontend/src/lib/example.test.js
import { test, expect } from 'vitest'
import { exampleFn } from './example'

test('정상 입력은 통과한다', () => {
  expect(exampleFn('값')).toBe(true)
})
```

## 3. green — 통과하는 최소한의 코드를 쓴다

케이스를 다 만족하는 가장 단순한 구현을 쓰고 실행한다.

```
cd frontend && npx vitest run <파일경로>
```

또는 전체: `npm run test`. 초록(모두 통과)을 확인한다.

## 4. refactor — 정리한다 (선택)

동작을 유지한 채 중복·복잡도를 정리한다. 정리할 게 없으면 생략해도 된다.
끝나면 다시 테스트를 돌려 여전히 초록인지 확인한다.

## 결과 읽는 법

- 🟢 초록(pass): 약속대로 동작
- 🔴 빨강(fail): 기대값·실제값이 나란히 출력됨 — 이 차이가 디버깅의 출발점
- 테스트 이름을 잘 지어두면 빨강 목록만 읽어도 무엇이 깨졌는지 보인다

## matcher 선택

- 원시값(숫자·문자열·불리언) 비교 → `toBe`
- 객체·배열 비교 → `toEqual` (`toBe`로 비교하면 틀림)

## 참고

- 실제 프로젝트 예시: `frontend/src/lib/validateLetter.js` + `validateLetter.test.js`
  (편지 본문 검증을 red→green으로 만든 사례)
- 기능이 요구사항대로 동작하는지는 `feature-verifier` agent로 별도 점검한다 (테스트 작성과는 역할이 다름:
  이 스킬은 테스트 코드를 "쓰는" 절차, feature-verifier는 완료된 기능을 "검증"만 함).
