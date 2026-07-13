# 백로그

> 기준 문서: [기획서.md](./기획서.md)(제품 요구사항), [api-design.md](./api-design.md)(API 계약)
> 마지막 업데이트: 2026-07-10

## 우선순위 기준

- **P0** — MVP 핵심 루프(재고 보기·채우기·요리·차감)를 막거나 데이터를 깨뜨리는 결함
- **P1** — 기획서에 명시된 기능인데 아직 없거나 겉만 있고 실제로 동작하지 않는 것
- **P2** — 있으면 좋지만 지금 없어도 서비스가 돌아가는 것(품질/인프라 포함)

---

## P0 — 크리티컬 버그

전부 해결됨. (2026-07-10 세션에서 수정·검증 완료: `cook-done` 잘못된/가공식품 id 크래시,
`POST /api/fridge`·`POST /api/receipts/:id/confirm` body 없을 때 크래시, 요리완료·영수증 확정
버튼 더블탭 시 중복 반영, 삭제 중 다른 재료 시트가 닫히는 문제, 재료 삭제 후 레시피 API 500.)
새로 발견되는 크래시성 버그는 이 섹션에 추가.

---

## P1 — 기획서에 있는데 비어있거나 가짜인 기능

| 항목 | 현재 상태 | 관련 코드 |
|---|---|---|
| 영수증 OCR 실연동 | `POST /api/receipts`가 외부 OCR API 대신 하드코딩된 데모 결과 고정 반환 | `backend/src/controllers/receiptsController.js` |
| 재고 "수량·기한 수정" | 버튼은 있지만 `onClick`이 그냥 시트를 닫기만 함. `PATCH /api/fridge/:id`는 이미 있는데 호출하는 화면이 없음 | `frontend/src/components/IngredientSheet.jsx` |
| 재료 직접 추가 시 기존 재고 매칭 안 됨 | 이름이 "양파"여도 기존 `onion`을 찾지 않고 매번 `custom_<timestamp>`로 새 항목 생성 → 같은 재료가 중복으로 쌓임 | `backend/src/store.js`(`addFridgeItem`), `frontend/src/pages/AddItem.jsx` |
| 재고 부족(수량) 알림 | 유통기한 임박 알림만 있고, "이 재료 거의 다 썼어요" 같은 수량 기반 알림은 없음 | (미구현) |
| 유통기한 임박 "푸시 알림" | 기획서에 "빨간 글자 표시 + 푸시 알람"이라 되어 있으나 빨간 글자만 구현, 푸시는 문구뿐 | `frontend/src/pages/ExpiryAlerts.jsx` |
| `GET /api/ingredients` 부재 | 재료 마스터(`ingredients.js`)를 조회하는 엔드포인트가 없어서 `AddItem`/`ExpiryCheck`가 마스터와 연동 못 하고 값 하드코딩에 의존 | `backend/src/data/ingredients.js` |

---

## FE 안정성 (Day 1 진단, 2026-07-10)

1주차 "FE 완전 구축" Day 1에서 `frontend/src` 전체를 다시 훑어 확인한 내용. 오늘은 진단만 하고
코드는 건드리지 않았음 — Day 2부터 아래 내용을 기준으로 수정 시작.

### 1. 네비게이션 레이스 컨디션 — 6개 함수

`context/AppContext.jsx`에서 `await` 이후 `go()`/`tab()`을 호출하면서, 그 사이 사용자가 다른
화면으로 이동했는지 확인하지 않는 함수들. 응답이 늦게 오면 사용자가 이미 떠난 화면으로 강제로
되돌려진다.

| 함수 | 위치 | 비고 |
|---|---|---|
| `shootReceipt` | L84, `go('receipt-result')` | `screen` 클로저를 baking하는 `go` 사용 — 가장 심각(스택도 오염) |
| `openRecipeDetail` | L107, `go('recipe-detail')` | 동일. 진입점 3곳(`Home.jsx`:59, `ExpiryAlerts.jsx`:32, `RecipeList.jsx`:59)에서 가드 없이 호출됨 |
| `buildMealPlan` | L168, `go('meal-plan')` | 동일 |
| `openMealShoppingList` | L173, `go('meal-shopping-list')` | 동일 |
| `confirmReceipt` | L92, `tab('fridge')` | `tab`은 stable이라 스택 오염은 없지만 화면 강제 이동은 동일하게 발생 |
| `finishCooking` | L152, `tab('fridge')` | 동일 |

### 2. 에러 처리 — async 컨텍스트 함수 9개 전부 없음

`refreshFridge`/`addFridgeItem`/`updateFridgeItem`/`deleteFridgeItem`/`shootReceipt`/
`confirmReceipt`/`openRecipeDetail`/`finishCooking`/`buildMealPlan`/`openMealShoppingList` —
try/catch 있는 함수 0개. 페이지 레벨에서 제대로 된 건 `ReceiptCamera.jsx`(try/catch/finally +
alert + 로딩가드) 하나뿐. `CookDone.jsx`/`ExpiryCheck.jsx`는 `try{}finally{}`만 있고 `catch`가
없어 에러가 사용자에게 안 보임(로딩 상태는 정상적으로 풀림).

**최악 사례 4곳** (에러 처리 없음 + 로딩 가드 없음/깨짐 + 사용자가 쉽게 유발 가능) — Day 2 처리 순서:
1. `frontend/src/pages/AddItem.jsx`의 `handleSave` — try/catch/finally 자체가 없어서, 실패하면
   "추가하는 중…" 버튼이 **영구히 비활성화된 채 멈춤**(리로드 전까진 복구 불가). 가장 심각.
2. `frontend/src/components/IngredientSheet.jsx`의 `handleDelete` — 삭제 액션인데 try/catch도
   로딩 가드도 없음, 연타 가능.
3. `Home.jsx`/`ExpiryAlerts.jsx`/`RecipeList.jsx`의 `RecipeCard onClick={() => openRecipeDetail(id)}`
   — 레이스 컨디션 진입점 3곳, 가드 전무.
4. `MealPlanPicker.jsx`의 `buildMealPlan`, `MealPlan.jsx`의 `openMealShoppingList` — `onClick={asyncFn}`
   직결, 가드 전무.

### 3. 로딩 가드 불일치 — 2그룹 + 애매한 예외

- **A그룹** (데이터 없으면 `return null`로 빈 화면): `ShoppingList`, `Prices`, `RecipeDetail`,
  `ReceiptResult`, `ExpiryCheck`, `MealPlan`, `MealShoppingList`, `Cooking`
- **B그룹** (빈 기본값으로 프레임 즉시 렌더): `Home`, `RecipeList`, `ExpiryAlerts`, `ShoppingSets`,
  `MealPlanPicker`, `Fridge`, `CookDone`
- **구조적 예외**: `Fridge`/`RecipeDetail`/`ReceiptResult`/`MealPlan`/`MealShoppingList`/`Cooking`/
  `CookDone` 7개는 페이지 자체에 `useEffect` fetch가 없고 `AppContext`의 액션 핸들러가 미리 채워둔
  상태만 읽음 — 나머지 8개(페이지 자체 `useEffect`+API 호출)와 아키텍처가 다름. `CookDone`은 이
  그룹에 속하면서도 가드가 아예 없어(`deductionState` 기본값 `[]`) B그룹처럼 동작하는 애매한 위치.

---

## P2 — 있으면 좋은 것 / 인프라

| 항목 | 비고 |
|---|---|
| 일주일 식단 루틴 고도화 | 지금은 냉장고 재고·난이도 반영 없이 나머지 요일을 단순 순환 배정 (`buildWeeklyPlan`) |
| 식자재 가격 실시간 연동 | `GET /api/prices`가 정적 하드코딩, 매일 갱신되는 외부 소스 없음 |
| 테스트 코드 | 프론트·백엔드 둘 다 없음. `store.js`의 `formatDday`/`ddayValue`처럼 순수 함수부터 시작 권장 |
| 백엔드 린터 | 프론트는 `oxlint`가 있는데 백엔드는 아무 것도 없음 |
| `fridge-recipe-app` ↔ `hub` 저장소 동기화 | 실제 GitHub 저장소(`baejh3333-del/hub`)는 2026-07-09 17:53 커밋에서 멈춰 있어 이후의 버그 수정·기능 추가(이 문서 포함)가 반영돼 있지 않음. 공유·배포 전에 최신 코드를 `hub`로 옮기거나 푸시해야 함 |

---

## 완료된 작업 (요약)

- MVP 1~4번(재고관리 / 영수증 인식 / 레시피 리스트&필터 / 요리완료 차감) — React+Express로 풀스택 구현, 실동작 검증 완료
- 2차 확장 7개 화면(장보기 세트/리스트, 유통기한 알림, 식단 루틴, 가격 정보 등) — UI+API 연결
- 상급자(🔴) 레시피 부재 → `돼지고기 김치찜` 추가로 해소
- `ShoppingSets` 필터(재료 최대활용/100% 완성, 난이도) → 실제 쿼리 파라미터로 필터링되도록 수정
- `getShoppingList` → 세트별로 실제 냉장고 재고 기준 동적 계산되도록 재작성 (하드코딩 제거)
- P0 크래시/레이스컨디션 6건 + 추가 발견 1건(삭제된 재료 참조 시 레시피 API 500) 수정
- 존재하지 않는 요리를 언급하던 `RecipeList.jsx`의 안내 문구 정리
- 저장소 루트 정리: 웹사이트 구동에 불필요한 파일(발표자료, 런처, 구버전 정적 프로토타입)을 저장소 밖으로 분리
