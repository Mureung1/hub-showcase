---
name: 테스트-작성
description: 이 프로젝트(밀라이즈)에서 테스트를 작성할 때 쓰는 스킬. "테스트 만들어줘", "테스트 추가해줘", "TDD로 만들어줘", "이 함수 검증해줘" 같은 요청이나, 새 순수 함수/계산 로직을 만들 때 사용한다. 도구·파일 위치·TDD 순서·좋은 테스트 조건·테스트하기 어려운 것 다루는 법을 담고 있다.
---

# 밀라이즈 테스트 작성 스킬

## 0. 시작하기 전에 — 이미 있는지부터 찾는다

**새 함수를 만들기 전에 반드시 검색한다.** 이 규칙이 1번인 이유: `formatNutrient` TDD 연습 때
같은 이름·같은 동작의 함수가 이미 `src/lib/nutrition.js`에 있고 5개 컴포넌트가 쓰고 있는데도
`src/utils/`에 중복을 새로 만든 적이 있다.

```bash
grep -rn "함수이름" src/          # 같은 이름이 있나
grep -n "^export" src/lib/nutrition.js src/utils/*.js   # 비슷한 게 있나
```

이미 있으면 **새로 만들지 말고 기존 것에 테스트를 붙인다.** 테스트 없는 기존 함수에
테스트를 붙이는 게 이 프로젝트에서 가장 가치 있는 작업이다.

---

## 1. 도구와 실행 방법

| 항목 | 값 |
|---|---|
| 러너 | **Vitest 4** (`vitest.config.js` — `vite.config.js`를 `mergeConfig`로 상속) |
| 환경 | **jsdom** (`document`/`window`/`localStorage` 사용 가능) |
| 매처 | `expect` 기본 + `@testing-library/jest-dom` (`toBeInTheDocument` 등) |
| 컴포넌트 | `@testing-library/react` |
| 공통 준비 | `vitest.setup.js` (jest-dom 등록 + 테스트마다 DOM `cleanup`) |

```bash
npm test                          # 전체 1회 실행
npm run test:watch                # 감시 모드 — TDD 작업 중엔 이걸 켜둔다
npm test -- src/lib/nutrition.test.js   # 특정 파일만
npm test -- -t "부족한 영양소"           # 테스트 이름으로 필터
```

`globals: true`라서 `describe`/`it`/`expect`를 import 없이 쓸 수 있지만,
**이 프로젝트는 명시적으로 import 한다** (에디터 자동완성과 lint가 잘 잡힌다).

### 기존 검증 스크립트와의 관계

`npm run check:ads`(`scripts/check-ad-recommendation.mjs`)와 `npm run check:csv`는
Vitest 도입 **이전에** 만든 노드 단언 스크립트다. 두 스크립트의 헤더 주석에 "이 저장소엔 테스트
러너가 없어서"라고 쓰여 있는데 이제는 사실이 아니다. 지금은 **둘 다 유지**한다 — 새 테스트는
Vitest로 쓰고, 기존 스크립트는 건드리지 않는다. 옮길 때는 사용자에게 먼저 확인한다.

---

## 2. 테스트 파일 위치와 이름

**규칙: 테스트할 파일 바로 옆에, 같은 이름 + `.test.js`**

```
src/lib/nutrition.js         →  src/lib/nutrition.test.js
src/utils/adRecommendation.js →  src/utils/adRecommendation.test.js
src/components/Foo.jsx       →  src/components/Foo.test.jsx   ← 컴포넌트는 .jsx
```

- `vitest.config.js`의 `include`가 `src/**/*.{test,spec}.{js,jsx}`라 **`src/` 밖은 잡히지 않는다**
  (`scripts/`, `server/` 테스트가 필요하면 `include`를 먼저 넓혀야 한다).
- `src/__tests__/` 폴더에는 환경 확인용 예시 테스트만 둔다. 실제 테스트는 옆에 붙인다.
- `android/`, `dist/`는 제외돼 있다.

---

## 3. 작성 순서 (TDD)

### RED → GREEN → REFACTOR

**1단계 RED — 실패하는 테스트 먼저**

기능 코드를 만들기 전에 테스트부터 쓰고, **반드시 실행해서 실패를 눈으로 확인한다.**
확인하지 않은 테스트는 "고장나도 조용히 통과하는" 테스트일 수 있다.

실패에는 두 종류가 있고, 구분해서 보고한다:

- `Failed to resolve import` / `Tests no tests` → 모듈이 아직 없음. **"만들 대상이 없다"만 증명됨**
- `expected undefined to be 25` → 함수는 있는데 동작이 틀림. **여기서부터 테스트가 명세 역할을 한다**

**2단계 GREEN — 최소 구현**

테스트를 통과시키는 **최소한의 코드만** 쓴다. 미래에 필요할 것 같은 처리, 스펙에 없는 방어 코드,
추상화는 넣지 않는다. `formatNutrient`은 2줄이면 충분했다.

**3단계 REFACTOR — 초록을 유지하며 정리**

테스트가 통과하는 상태에서만 구조를 손본다. 손볼 게 없으면 건너뛴다.

### 스펙에 없는 경우는 물어본다

요구사항에 없는 입력(`NaN`, 숫자 문자열 `"24.9"`, 음수, `Infinity`)은 **임의로 테스트에 넣지 않는다.**
사용자가 정하지 않은 동작을 테스트가 못 박아버리기 때문이다. 대신:

1. 스펙에 있는 것만 테스트한다
2. 답변에서 "이런 경우는 어떻게 할까요?"로 열어둔다
3. 사용자가 정하면 → 테스트를 먼저 추가하고 → 구현을 맞춘다

---

## 4. 좋은 테스트의 조건

요구사항 하나당 `describe` 하나, 그 안에 케이스를 나눈다. **한 `it`은 한 가지만 확인한다.**

세 종류를 모두 덮는다:

| 종류 | 무엇 | 예 (`formatNutrient`) |
|---|---|---|
| **정상** | 평범한 입력 | `24.9999 → 25` |
| **경계값** | 딱 걸치는 값, 0, 반올림 기준선 | `0 → 0`, `1100.5 → 1101`, `0.4 → 0` |
| **잘못된 입력** | null/undefined/누락 | `null → 0`, 인자 없음 `→ 0` |

경계값이 이 프로젝트에서 특히 중요하다. 영양 판정 로직이 **비율 기준선**으로 돌아가기 때문이다:
`NUTRIENT_SATISFY_RATIO = 0.8`, `NUTRIENT_EXCEED_RATIO = 1.5`, `DAY_STATUS_THRESHOLDS = {good: 5, normal: 2}`.
**정확히 0.8일 때, 0.79일 때, 1.5일 때**를 반드시 테스트한다.

### 지킬 것

- **테스트 이름은 한국어로, 동작을 문장으로 쓴다** — `'1100.5 -> 1101 (정확히 .5는 올린다)'`
- **기대값은 손으로 계산해서 직접 적는다.** 구현 로직을 테스트에 다시 쓰면(`expect(f(x)).toBe(Math.round(x))`)
  같이 틀리기 때문에 아무것도 검증하지 못한다. `check-csv-roundtrip.mjs`가 "절대 포맷을
  테스트 안에서 재구현하지 말라"고 경고하는 것과 같은 이유다.
- **실패 메시지만 보고 원인을 알 수 있게** — 한 `it`에 단언 5개를 몰아넣지 않는다
- 테스트끼리 순서에 의존하지 않는다 (DOM은 `vitest.setup.js`가 자동 정리)

---

## 5. 밀라이즈에서 자주 테스트할 것들

**순수 함수 우선.** 아래는 브라우저/네트워크에 의존하지 않아 그냥 import 해서 테스트하면 된다.

### 영양 계산 — `src/lib/nutrition.js`
| 함수 | 테스트 포인트 |
|---|---|
| `calcBMR` / `calcTDEE` / `calcRecommendedNutrients` | 성별·활동량별 값, 극단 입력(나이 0, 체중 300) |
| `scaleNutrients` | 100g 기준 → 실제 섭취량 비례 계산 |
| `resolveConsumedGrams` / `clampEstimatedGrams` | `PORTION_REFERENCE_G` 상·하한에 걸리는 값 |
| `clampToPlausibleNutrients` | 짜장면·비빔밥 등 키워드가 걸릴 때/안 걸릴 때 |
| `fillMissingNutrients` | 일부 키가 없을 때 fallback 병합 |

### 상태 판정 — `src/lib/nutrition.js`
| 함수 | 테스트 포인트 |
|---|---|
| `classifyNutrientStatus` | **0.8 / 1.5 경계**, 나트륨(상한형)이 반대 방향인지 |
| `calcDayStatus` / `countSatisfiedNutrients` | 충족 개수 5개·2개 경계에서 3단계 전환 |
| `calcAchievementPercent` | 권장량 0일 때 0으로 나누지 않는지 |

### 점수 — `src/lib/nutritionScore.js`
`calcNutritionScore` — 0~100 클램프, 나트륨 역방향, target이 전부 0이면 `null`.
**주의: 이 공식은 `supabase/schema.sql`의 SQL 버전과 반드시 같아야 한다.** 테스트에 이 제약을
주석으로 남긴다.

### 수치 포맷 — `src/lib/nutrition.js`
`formatNutrient`, `formatNutrientOrDash`(null이면 `'-'`), `formatExpectedIntake`(형식 어긋나면 `null`).

### 그 외
- `src/utils/adRecommendation.js` — `recommendAdProducts`가 **절대 빈 배열을 반환하지 않을 것**,
  나트륨은 광고에 안 나올 것, 같은 날엔 같은 결과일 것 (이미 `check:ads`가 검증 중)
- `src/lib/backupFormat.js` — CSV 왕복(직렬화 → 파싱 → 원본과 동일) (이미 `check:csv`가 검증 중)
- `src/lib/foodNameMap.js` — `normalizeFoodSearchName` (돌솥비빔밥→비빔밥)
- `src/lib/authId.js` — id 검증 규칙, 5회 실패 잠금 (`displayNameOf` 우선순위: 닉네임 > id > 이메일)
- `src/lib/mealType.js` — `getRecommendedMealType`은 **시각에 의존** → `new Date(...)`를 인자로 넘겨 고정
- `src/lib/tabs.js` — 탭 순서, 슬라이드 방향 계산

---

## 6. 테스트하기 어려운 것

### 원칙: 어려운 것을 억지로 테스트하지 말고, 순수 함수를 분리해서 그걸 테스트한다

이 프로젝트는 이미 그 구조로 되어 있다. `Analyze.jsx`(화면)와 `nutrition.js`(계산)가 나뉘어 있고,
**가치의 대부분은 `nutrition.js` 쪽에 있다.** 화면 테스트를 늘리기 전에 순수 함수 테스트를 채운다.

### 외부 API 호출 (`/api/gemini`, `/api/fooddb`, `/api/naver-places`)

**실제로 호출하지 않는다.** 돈이 들고, 느리고, 키가 필요하고, 결과가 매번 다르다.
이 호출들은 전부 `src/lib/fetchWithTimeout.js`를 지나가므로 `fetch`를 가로채면 된다:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchFoodDB } from './fooddb.js'

afterEach(() => vi.restoreAllMocks())

it('식약처 DB 응답을 파싱한다', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    json: async () => ({ items: [{ 식품명: '비빔밥', 에너지: 550 }] }),
  })
  const result = await searchFoodDB('비빔밥')
  expect(result[0].식품명).toBe('비빔밥')
})
```

**더 나은 방법:** 응답을 받은 뒤의 처리 로직만 순수 함수로 떼어 테스트한다.
`pickBestFoodMatch`(`fooddb.js`), `parseJsonLoose`(`gemini.js`), `toPlaceShape`(`MapPage.jsx`)가
그런 함수들이고, **네트워크 없이 그냥 부를 수 있으니 이쪽을 우선 테스트한다.**

### Supabase / 로그인

`dataStore.js`는 호출마다 `supabase.auth.getSession()`으로 게스트/로그인을 가른다.
`vi.mock('./supabase.js', ...)`로 모듈째 가짜를 넣거나, **게스트 경로만 테스트한다**
(localStorage는 jsdom에 있으니 그대로 돌아간다).

### localStorage를 쓰는 것 (`storage.js`, `dayStatus.js`, `mealStore.js`)

jsdom이 제공하므로 동작하지만 **테스트 간에 값이 남는다.** 반드시 비운다:

```js
beforeEach(() => localStorage.clear())
```

### 시간·날짜 의존

`new Date()`를 직접 부르는 코드는 테스트가 매일 다르게 돈다. 두 가지 방법:

```js
vi.useFakeTimers()
vi.setSystemTime(new Date('2026-07-23T12:00:00'))
// ... 테스트 ...
vi.useRealTimers()
```

또는 `getRecommendedMealType(date)`처럼 **날짜를 인자로 받는 함수는 그냥 넘긴다** (이쪽이 낫다).

### 화면(컴포넌트)

**모든 컴포넌트를 테스트하지 않는다.** 스타일·레이아웃은 테스트로 지킬 가치가 없다.
분기 로직이 있는 것만 고른다 — 예: `DeficientNutrientAds`가 어떤 상태에서도 배너를 비우지 않는지,
`COUPANG_DISCLOSURE`와 AD 배지가 **항상 렌더링되는지**(법정 고지라 생략 불가).

```jsx
import { render, screen } from '@testing-library/react'

it('부족 영양소가 없어도 배너와 고지 문구가 보인다', () => {
  render(<DeficientNutrientAds recommended={null} total={null} />)
  expect(screen.getByText(/파트너스/)).toBeInTheDocument()
})
```

`Context`(`UserContext`/`ToastContext`)가 필요한 컴포넌트는 렌더 시 provider로 감싸야 한다.
감쌀 게 많아지면 그건 **로직을 순수 함수로 빼라는 신호**다.

### 네이티브 (Capacitor)

`fileExport.js`, `externalLink.js`, `platform.js`는 `Capacitor.isNativePlatform()`으로 갈린다.
테스트 환경에서는 항상 `false`(웹)다. 네이티브 경로를 테스트하려면 `vi.mock('@capacitor/core', ...)`로
바꿔치기한다. 우선순위는 낮다.

---

## 7. 좋은 예시 — `formatNutrient` 테스트

RED 단계에서 작성한 실제 테스트. 요구사항별 `describe`, 정상/경계/잘못된 입력을 모두 덮고,
기대값을 직접 적었고, 테스트 이름만 읽어도 명세가 된다.

```js
import { describe, it, expect } from 'vitest'
import { formatNutrient } from './formatNutrient.js'

describe('formatNutrient', () => {
  describe('요구사항 1: 소수점이 있는 숫자를 정수로 반올림한다', () => {
    it('24.9999 -> 25 (올림쪽으로 반올림)', () => {
      expect(formatNutrient(24.9999)).toBe(25)
    })
    it('34.0000001 -> 34 (내림쪽으로 반올림)', () => {
      expect(formatNutrient(34.0000001)).toBe(34)
    })
    it('1100.5 -> 1101 (정확히 .5는 올린다)', () => {   // ← 경계값
      expect(formatNutrient(1100.5)).toBe(1101)
    })
    it('이미 정수인 값은 그대로 반환한다', () => {
      expect(formatNutrient(42)).toBe(42)
    })
  })

  describe('요구사항 2: 0은 0으로 반환한다', () => {
    it('0 -> 0', () => { expect(formatNutrient(0)).toBe(0) })
    it('0에 가까운 소수도 0이 된다', () => { expect(formatNutrient(0.4)).toBe(0) })
  })

  describe('요구사항 3: 숫자가 아닌 값은 0을 반환한다', () => {
    it('null -> 0', () => { expect(formatNutrient(null)).toBe(0) })
    it('undefined -> 0', () => { expect(formatNutrient(undefined)).toBe(0) })
    it('인자를 아예 넘기지 않으면 0', () => { expect(formatNutrient()).toBe(0) })
  })

  describe('반환 타입', () => {
    it('문자열이 아니라 숫자를 반환한다', () => {
      expect(typeof formatNutrient(24.9999)).toBe('number')
    })
  })
})
```

전체 파일: `src/utils/formatNutrient.test.js`

---

## 8. 작업 체크리스트

테스트를 요청받으면 이 순서로 진행한다.

1. [ ] **이미 있는지 검색** (`grep -rn`) — 있으면 새로 만들지 말고 기존 것에 테스트를 붙인다
2. [ ] 대상이 순수 함수인가? 아니면 순수 부분을 떼어낼 수 있는가?
3. [ ] 테스트 파일을 **대상 파일 옆에** `*.test.js`로 만든다
4. [ ] 요구사항별 `describe` + 정상/경계값/잘못된 입력 케이스
5. [ ] **실행해서 실패를 확인**하고, 실패 종류(import 에러 vs 단언 실패)를 구분해 보고
6. [ ] 최소 구현 → `npm test`로 통과 확인
7. [ ] **결과를 사실대로 보고** — 통과 개수를 실제 출력으로 확인하고, 안 되면 안 된다고 말한다
8. [ ] 스펙에 없어 테스트하지 않은 경우를 답변에서 열어둔다
9. [ ] `npm run lint` (기존 경고 5건은 원래 있던 것)
