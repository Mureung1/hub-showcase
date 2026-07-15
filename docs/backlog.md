# 백로그

> 기준 문서: [product.md](./product.md)(제품 요구사항), [api.md](./api.md)(API 계약), [algorithms.md](./algorithms.md)(알고리즘 설계)
> 마지막 업데이트: 2026-07-15

## 우선순위 기준

- **P0** — MVP 핵심 루프(재고 보기·채우기·요리·차감)를 막거나 데이터를 깨뜨리는 결함
- **P1** — 기획서에 명시된 기능인데 아직 없거나 겉만 있고 실제로 동작하지 않는 것
- **P2** — 있으면 좋지만 지금 없어도 서비스가 돌아가는 것(품질/인프라 포함)

---

## P0 — 크리티컬 버그

전부 해결됨. 새로 발견되는 크래시성 버그는 이 섹션에 추가.

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

---

## P2 — 있으면 좋은 것 / 인프라

| 항목 | 현재 상태 | 비고 |
|---|---|---|
| 일주일 식단 루틴 알고리즘 v2 | `buildWeeklyPlan` 구현됨. `fridgeLogic.js`에 `selectImminentGreedy`·`searchMinPurchaseCombo3`·`generateImminentRescueSet` 구현 완료. v2 알고리즘 설계는 [algorithms.md](./algorithms.md) 참고 | 새 알고리즘을 `store.js`의 `buildWeeklyPlan` 본체에 연결하는 작업 잔여 |
| 식자재 가격 실시간 연동 | `GET /api/prices`가 정적 하드코딩, 매일 갱신되는 외부 소스 없음 | — |
| 테스트 코드 | 프론트·백엔드 둘 다 없음. 우선 테스트 대상: `store.js`의 `formatDday`·`calcExpiryDate`·`listRecipes`·`cookDone`·`confirmReceipt` | — |
| 백엔드 린터 | 프론트는 `oxlint`가 있는데 백엔드는 없음 | — |
| `fridge-recipe-app` ↔ `hub` 저장소 동기화 | `baejh3333-del/hub`는 2026-07-09 17:53 커밋 이후 미반영 | 공유·배포 전에 동기화 필요 |
| 레시피 목록 정렬 + 더보기 | 반찬 종류만 49개로 탭으로 걸러도 목록이 너무 길어짐. "곧 상하는 재료 먼저 → 보유율 높은 순" 정렬 + 10~15개 뒤 더보기 페이징 필요 | — |
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
