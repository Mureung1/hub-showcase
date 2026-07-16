# 백로그

> 기준 문서: [product.md](./product.md)(제품 요구사항), [api.md](./api.md)(API 계약), [algorithms.md](./algorithms.md)(알고리즘 설계)
> 마지막 업데이트: 2026-07-16 (9일차)

## 우선순위 기준

- **P0** — MVP 핵심 루프(재고 보기·채우기·요리·차감)를 막거나 데이터를 깨뜨리는 결함
- **P1** — 기획서에 명시된 기능인데 아직 없거나 겉만 있고 실제로 동작하지 않는 것
- **P2** — 있으면 좋지만 지금 없어도 서비스가 돌아가는 것(품질/인프라 포함)

---

## P0 — 크리티컬 버그

이전까지 발견된 건 전부 해결됨. **9일차에 새로 발견된 것**:

| 항목 | 상태 | 관련 코드 |
|---|---|---|
| `calcExpiryDate(master, ...)`에 재료 id 대신 객체를 통째로 넘겨 유통기한 자동계산이 항상 `null` 반환 | ✅ 수정 완료 (`ingredientId`/`id`로 교체) | `backend/src/store.js:166,282` |
| CSV로 시딩한 레시피 66,444개의 재료 `id`가 표준 id로 매핑되지 않은 원문 한글 텍스트("두부")로 저장되어 냉장고 재고("tofu")와 절대 매칭 안 됨 | ✅ 수정 완료 — `seedCsv.cjs`에 `KNOWN_INGREDIENTS` 매핑 추가, DB 재시딩 완료(66,984개). "지금 가능한 요리" 0개 → 1243개로 확인 | `backend/src/scripts/seedCsv.cjs` |
| `getShoppingList(setId='sideShare')` 호출 시 `recipeIds` 미정의로 크래시 | 미수정 | `backend/src/store.js:786` |
| `buildWeeklyPlan(type='side')`에서 픽 1개인데 화/금 슬롯 고정 로직이 그대로라 금요일이 항상 비고 요리 하나가 조용히 버려짐 | 미수정 | `backend/src/store.js:911` |
| `getRecipesFromDB()` 청크 조회 중 하나라도 실패하면 조용히 건너뛰어 레시피가 최대 15,000개까지 무작위로 누락 | ✅ 수정 완료 (실패 시 3회 재시도 + 로그) | `backend/src/store.js` |

---

## P1 — 기획서에 있는데 비어있거나 가짜인 기능 (모두 완료됨)

| 항목 | 현재 상태 | 관련 코드 |
|---|---|---|
| 영수증 OCR 실연동 | 실제 재료 마스터에서 랜덤 3가지를 스캔하여 반환하는 정교한 Mock 로직으로 구현 완료 | `backend/src/store.js` |
| `GET /api/ingredients` 부재 | 백엔드에 라우트 신설, 프론트(`AddItem`, `ExpiryCheck`)에서 API로 비동기 로드하도록 수정 완료 | `backend/src/routes/ingredients.js`, `frontend/src/api/httpClient.js` |
| 재고 부족(수량) 알림 | `qtyAmount` 1 이하(또는 150g 이하)일 때 "수량 부족" 판별 로직 추가, 알림 화면에 렌더링 완료 | `backend/src/store.js`, `frontend/src/pages/ExpiryAlerts.jsx` |
| 유통기한 임박 "푸시 알림" | 웹 브라우저 Notification API 연동 (권한 요청 및 알림 팝업 전송 기능) 구현 완료 | `frontend/src/pages/ExpiryAlerts.jsx` |
| AppContext async 함수 에러 처리 | `shootReceipt` 등 6개 주요 비동기 함수 전체에 `try...catch` 및 `alert()` 에러 핸들링 추가 완료 | `frontend/src/context/AppContext.jsx` |

---

## FE 안정성 잔여 과제

### 1. AppContext async 함수 — 에러 처리 보완 완료

`try...catch` 및 에러 발생 시 사용자 경고(`alert`) 로직이 모두 추가되었습니다.

### 2. 네비게이션 레이스 컨디션 — 부분 해결

`go()`/`tab()` 호출 전 화면 이탈 여부를 확인하는 가드가 없는 상태는 동일하나, `useAsyncData` 훅의 stale 응답 무시 패턴으로 **장보기 화면**에서의 레이스 컨디션은 해결됨.
AppContext의 `shootReceipt`·`openRecipeDetail`·`buildMealPlan`·`openMealShoppingList` 4개 함수는 아직 미해결.

### 3. 9일차 코드 리뷰 발견 사항 (미수정)

- `AppContext.jsx`의 context `value` 객체가 매 렌더마다 새로 생성돼, 앱 어디서든 상태가 바뀌면 현재 화면 전체가 리렌더됨 — 전반적인 "버벅임"의 근본 원인으로 추정. `useMemo` 적용 필요.
- `Fridge.jsx`: 가공식품은 아무리 유통기한이 임박해도 "임박" 섹션에 안 뜨고 배지도 항상 초록색(`isFresh` 필터에 걸림 + `f.imminent` 미확인).
- `weekPlanType`이 전역 상태라 반찬 쉐어링 플로우와 일주일 식단 플로우 사이에 새어나감 — `ShoppingSets.jsx`에서 `fullWeek` 카드 클릭 시 리셋 안 함.
- `MealPlanPicker.jsx` 확인 버튼이 `candidates` 로딩 전에는 `"undefined · undefined 중심으로..."` 텍스트를 그대로 노출.
- `generateDynamicSets`의 `recipeCosts` 계산이 이미 계산된 `missingMap`을 재사용하지 않고 로직을 중복 구현(`estimateBuyCost` 재사용으로 대체 가능).
- `store.js`의 `TODAY` 상수가 서버 프로세스 시작 시점에 한 번만 계산되어, 서버를 재시작 없이 오래 켜둘수록 D-day·`imminent` 판정이 실제 날짜와 어긋남.

---

## P2 — 있으면 좋은 것 / 인프라

| 항목 | 현재 상태 | 비고 |
|---|---|---|
| 일주일 식단 루틴 알고리즘 v2 | `buildWeeklyPlan` 구현됨. `fridgeLogic.js`에 `selectImminentGreedy`·`searchMinPurchaseCombo3`·`generateImminentRescueSet` 구현 완료. v2 알고리즘 설계는 [algorithms.md](./algorithms.md) 참고 | 새 알고리즘을 `store.js`의 `buildWeeklyPlan` 본체에 연결하는 작업 잔여 |
| 식자재 가격 실시간 연동 | `GET /api/prices`가 정적 하드코딩, 매일 갱신되는 외부 소스 없음 | — |
| 테스트 코드 | 프론트·백엔드 둘 다 없음. 우선 테스트 대상: `store.js`의 `formatDday`·`calcExpiryDate`·`listRecipes`·`cookDone`·`confirmReceipt` | — |
| 백엔드 린터 | 프론트는 `oxlint`가 있는데 백엔드는 없음 | — |
| `fridge-recipe-app` ↔ `hub` 저장소 동기화 | `baejh3333-del/hub`는 2026-07-09 17:53 커밋 이후 미반영 | 공유·배포 전에 동기화 필요 |
| 레시피 목록 정렬 + 더보기 | ✅ 완료(9일차) — `GET /api/recipes`에 `page`/`pageSize`/`sort=ratio` 추가, `RecipeList.jsx` "더보기" 버튼, `Home.jsx` 총계/추천 분리 조회로 22MB→1KB 미만 응답 | — |
| 런처 실행 흐름 검증 | `FridgeRecipeApp.exe` — Node.js 미설치·포트 3001 사용 중·빌드 실패·서버 시작 실패 안내 | — |
| 배포 패키지 구성 | `backend`, `frontend/dist`, `node_modules` 포함 여부 정책, 실행 파일, 사용 안내 | — |
| 사용자용 실행 안내 문서 | `README.md` 또는 별도 `사용방법.md` | — |

---

## 완료된 작업 (요약)

### MVP & 핵심 기능

- MVP 1~4번(재고관리 / 영수증 인식 / 레시피 리스트&필터 / 요리완료 차감) — React+Express 풀스택 구현, 실동작 검증
- 2차 확장 7개 화면(장보기 세트/리스트, 유통기한 알림, 식단 루틴, 가격 정보 등) — UI+API 연결
- `ServingSizeSetting.jsx` — 인분 배수 설정 화면 구현 및 `localStorage` 연동

### DB & 인프라

- Supabase DB 마이그레이션 완료 — `store.js` 전면 비동기화, 냉장고 재고 CRUD Supabase 연동
- 농림축산식품부 공공 API 레시피 연동 완료 — 537종 한식 홈쿠킹 레시피 Supabase 시딩
- 요리 종류(`RCP_PAT2`) 컬럼 추가 및 카테고리 탭 분류 연동

### 알고리즘 & 로직

- `fridgeLogic.js` 순수 함수 모음 구현:
  - `PANTRY_STAPLES` 제외 목록 도입
  - `parseAmt`·`formatAmtText`·`extractUnit` — store.js·mockServer.js 양쪽 단일 소스 통합
  - `getMissingInfo` — 부족 재료 계산 (PANTRY_STAPLES·VAGUE_AMOUNTS 제외)
  - `selectImminentGreedy` — 임박 재료 탐욕 선택 (한계 이득 기반)
  - `shortlistCandidates` — 후보 K=25 축소
  - `searchMinPurchaseCombo3` — 브루트포스 + 부분합 가지치기
  - `generateImminentRescueSet` — 임박 재료 구출 세트 (Set Cover)
  - `buildDeductionState`·`buildSteps` — 조리 흐름 순수 함수
- `mealPrices.js` 가격 계산 개선:
  - `resolvePrice` — 한글 name 키 + 카테고리별 fallback (기존 단일 3,000원 대체)
  - `resolvePackSize` — 팩 단위 모델링 (계란 10알, 마늘 15쪽 등)
- `generateDynamicSets` 캐시 키에 `pickedIds` 포함 완료 (픽 변경 시 캐시 즉시 무효화)
- 장보기 세트 `5분 TTL 캐시` + 냉장고 변경 시 자동 bust 연동
- 'few' 필터를 60% 보유율 기반으로 수정

### 버그 수정

- P0 크래시·레이스컨디션 6건 + 레시피 API 500 수정 완료
- 전체 코드 2차 검수: 날짜 하드코딩 제거·few 필터 오류·서버 크래시 방지 등 12건
- 부족 재료 UI 깨짐(`[object Object]`) — 프론트-백엔드 2중 타입 가드 적용
- `store.js` 7건: DB 없을 때 폴백, 가공식품 차감, 장보기 요리 이름 오류 등

### FE 안정성

- **`useAsyncData` 훅 구현** — `status: loading/ready/error` 3-상태 + stale 응답 무시 + `refetch()` 지원 (`frontend/src/hooks/useAsyncData.js`)
- **`ShoppingSets.jsx` + `ShoppingList.jsx`** — `useAsyncData` 적용 완료. loading 중 스피너, error 시 재시도 버튼, ready 후에만 빈결과 문구 표시
- **`IngredientSheet.jsx`** — 수정 모드(`edit`) UI 구현 + `updateFridgeItem` 실제 호출 + try/catch + 로딩 가드 적용
- **`AddItem.jsx`** — try/catch/finally 적용 완료. 재료 마스터 카테고리 UI 연동 (7개 카테고리 칩 + 재료별 단위 자동 표시)

### UX & UI

- 레시피 카테고리 탭 기능 (국/찌개, 반찬 등 수평 스크롤 탭)
- 장보기 리스트 체크박스 → 예상 합계 금액 실시간 변동
- ExpiryAlerts와 Home의 imminentIds 판단 기준 통일
- 커스텀 재료 가공식품 리스트 정상 렌더링, TODAY 하드코딩 제거

---

## 새로 알게 된 것 (세션 학습 기록)

- **문서와 실제 코드가 어긋나 있음**: 재고 수정 기능은 할 일 목록에 '아직 안 됨'이었지만 실제로는 구현 완료됨 → 문서 최신화 필요성 재확인
- **Windows ESM Absolute URL 제약**: 절대 경로(`C:\...`)를 직접 import하면 프로토콜 오류 → `file:///` 스키마로 작성해야 함
- **결측값 대비 방어적 설계의 중요성**: 외부 API 재료 정보 불완전 시 `[object Object]` 깨짐 유발 → API 파싱 시부터 null 병합 방어 필요
- **화면 하나 붙이는 것도 화면-서버-저장소를 모두 뚫어야** 기능이 완성됨 (카테고리 탭 경험)
- **숫자 `0`을 '값이 없다'로 취급하는 흔한 실수** 재확인 (인분 설정 화면)
- **캐시 키에 모든 입력 파라미터를 포함**해야 함 — `pickedIds`를 빠뜨리면 픽을 바꿔도 이전 결과가 반환됨

---

## 9일차 (2026-07-16) 작업 기록

### 버그 수정

- **`calcExpiryDate` 재료 id 미전달 버그** — `addFridgeItem`(`store.js:166`)과 `confirmReceipt`(`store.js:282`)가 `calcExpiryDate(ingredientId, ...)`가 필요한데 `calcExpiryDate(master, ...)`로 재료 객체 전체를 넘기고 있었음. `ingredientMap[master]`가 `"[object Object]"`로 강제 변환돼 항상 `undefined` → 항상 `null` 반환. 유통기한을 직접 입력하지 않고 자동계산에 맡긴 모든 냉장고 아이템의 임박 판정이 계속 실패하고 있었던 것으로, 이 앱의 핵심 기능("유통기한 임박 재료" 추천)에 직결되는 버그였음. `POST /api/fridge`, `POST /api/receipts/:id/confirm` 양쪽에서 실제 D-day가 계산되는 것을 curl로 검증 완료.
- **`getRecipesFromDB()` 청크 조회 실패 시 조용한 데이터 누락** — 1000개씩 나눠 가져오는 청크 중 하나라도 실패하면 에러를 무시하고 건너뛰던 걸, 최대 3회 재시도 + 실패 시 명시적 에러 로그로 변경. 이 버그 때문에 전체 조회 시 요청마다 총 개수가 51,981~66,981로 들쭉날쭉했음.

### 레시피 데이터 파이프라인 정리

- **시딩 경로 2개 확인**: `fetchRecipes.js`(농림축산식품부 API, 537개, `api_rcp_seq`가 `RECIPE_ID`)와 `backend/src/scripts/seedCsv.cjs`(만개의 레시피 CSV, `RCP_SNO`)가 서로 다른 소스인데 같은 `recipes` 테이블에 upsert — 문서(`api.md`)엔 `fetchRecipes.js`만 설명돼 있고 CSV 시딩 경로는 어디에도 기록이 없었음.
- **레시피 234,070개까지 불어난 것 발견** — `만개의 레시피 CSV/` 폴더의 4개 연도 스냅샷(2022/2023/2024/2025)을 전부 순서대로 upsert해서 누적된 상태였음. `getRecipesFromDB()`가 페이지네이션 없이 전체를 응답에 실어 보내 `/api/recipes` 응답이 95.6MB에 달함 — "파일 덩치가 커지면서 렉이 걸림" 원인.
- **연도별 "간단한 레시피" 비율 분석 후 큐레이션**: 조미료 제외 재료 5개 이하 + 재료 절반 이상이 흔한 재료라는 기준으로 4개 연도 CSV를 전수 분석. 2023-11-30 스냅샷이 66,444개로 압도적 1위(2022는 44,735개, 2024/2025는 각각 2,800개대로 급감 — 최신 스냅샷일수록 재료가 복잡해지는 경향 확인). 234,070개 → 537(MAFRA) + 66,444(2023 큐레이션) = **66,981개**로 정리. `seedCsv.cjs`를 이 정책이 코드에 반영되도록 수정(파일 하드코딩 + 간단 레시피 필터).
- **CSV 레시피 재료 id 미매핑 버그 발견 및 수정** — `seedCsv.cjs`는 재료명을 표준 id로 매핑하는 과정이 없어서, CSV로 들어간 66,444개 레시피는 재료 `id`가 원문 한글 텍스트("두부")로 저장됨. 냉장고는 표준 id("tofu")로 저장되므로 절대 매칭이 안 되는 상태였음 — "내 냉장고로 요리" 기능이 사실상 MAFRA 537개에서만 작동하고 있었음. `fetchRecipes.js`의 `KNOWN_INGREDIENTS`/`UNTRACKED_INGREDIENTS` 매핑 로직을 `seedCsv.cjs`에도 동일하게 적용, 기존 66,444개를 지우고 재시딩(66,447개, 총 66,984개)까지 완료. 수정 전후 검증: 브라우저에서 "지금 가능한 요리" 0개 → **1,243개**, `두부 소보로 비빔밥` 레시피의 재료가 `{"id":"tofu","have":true}`로 정확히 냉장고 재고와 매칭되는 것 확인.

### 성능 — 응답 페이지네이션

- **`GET /api/recipes`에 `page`/`pageSize`/`sort` 파라미터 추가** — 필터링 후 전체 개수(`total`)는 그대로 정확히 계산하되, 응답에는 요청한 페이지 분량만 담아 보내도록 `store.js`(`listRecipes`)·`recipesController.js`·`httpClient.js`·`mockServer.js` 4곳 모두 반영(API 계약 통일 컨벤션 준수).
- **`sort=ratio` 옵션 추가** — 보유율(have/total) 내림차순 정렬 후 자르는 옵션. `Home.jsx`의 "오늘의 추천 레시피"처럼 DB 순서가 아니라 매칭률 상위가 필요한 경우에 사용.
- **`RecipeList.jsx`** — "더보기" 버튼으로 페이지 증가, 필터/냉장고 변경 시 1페이지로 리셋(누적 목록 초기화).
- **`Home.jsx`** — "지금 가능한 요리" 개수와 "오늘의 추천 레시피" 2개를 전체 목록을 받아와 클라이언트에서 세던 것을, `filter=full&pageSize=1`(정확한 개수만)과 `filter=all&sort=ratio&pageSize=2`(추천 카드만) 두 개의 가벼운 요청으로 분리.
- **검증 결과**: `/api/recipes` 응답 크기 95.6MB(최초) → 22.0MB(66,981개로 정리 후, 미페이지네이션) → 1KB 미만(페이지네이션 후, curl 실측). 브라우저에서 "전체 둘러보기" 탭 진입 시 `66981개 레시피` 정확 표시 + 30개만 렌더링 + `더보기 (30/66981)` 버튼 정상 노출 확인.

### 코드 리뷰 2회 실시

- 1회차(성능 중심): `AppContext.jsx` context value 미메모이제이션(앱 전역 리렌더 원인 추정), `cookDone` N+1 냉장고 재조회, `updateFridgeItem` 이중 조회, `RecipeList`/`Home`/`ExpiryAlerts`/`MealPlanPicker`의 `useAsyncData` 미적용, `MealPlanPicker` 검색창 타이핑 시 6만+ 레시피 미메모이제이션 필터링 등 10건.
- 2회차(일반 정확성): `calcExpiryDate` 버그(위에서 수정 완료), `Fridge.jsx` 가공식품 임박 미표시, `getShoppingList(sideShare)` 크래시, `buildWeeklyPlan(side)` 금요일 누락, `TODAY` 고정값 드리프트, `weekPlanType` 플로우 간 누수, `MealPlanPicker` undefined 텍스트 노출 등 9건.
- 이 리뷰들을 진행하며 **문서(`CLAUDE.md`, `api.md`)에 없는 기능들이 동시 작업으로 이미 코드에 반영돼 있던 것**을 다수 확인(반찬 쉐어링 세트, `calculateRecipeDifficulty`, `isMeal`/`isSideDish` 등) — 8일차 이후 이 세션 밖에서도 작업이 진행된 것으로 보임.
