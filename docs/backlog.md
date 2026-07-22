# 백로그

> 기준 문서: [product.md](./product.md)(제품 요구사항), [api.md](./api.md)(API 계약), [algorithms.md](./algorithms.md)(알고리즘 설계)
> 마지막 업데이트: 2026-07-21 (12일차)

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
| `getShoppingList(setId='sideShare')` 호출 시 `recipeIds` 미정의로 크래시 | ✅ 수정 완료(11일차) — `ingredientShare`와 동일하게 `sideShare`도 `isSideDish` 풀로 `recipeIds`를 채우도록 분기 추가. `backend/src/store.js`·`frontend/src/api/mockServer.js` 양쪽 반영, curl로 정상 응답 확인 | `backend/src/store.js:816` |
| `buildWeeklyPlan(type='side')`에서 픽 1개인데 화/금 슬롯 고정 로직이 그대로라 금요일이 항상 비고 요리 하나가 조용히 버려짐 | ✅ 수정 완료(11일차) — 픽 개수(`actualPicks.length`)에 따라 예약 슬롯을 `[1,4]`/`[1]`로 분기. `backend/src/store.js`·`frontend/src/api/mockServer.js` 양쪽 반영, curl로 월~일 전부 채워지는 것 확인 | `backend/src/store.js:947` |
| `getRecipesFromDB()` 청크 조회 중 하나라도 실패하면 조용히 건너뛰어 레시피가 최대 15,000개까지 무작위로 누락 | ✅ 수정 완료 (실패 시 3회 재시도 + 로그) | `backend/src/store.js` |

**12일차에 새로 발견된 것**:

| 항목 | 상태 | 관련 코드 |
|---|---|---|
| 만개의 레시피 CSV가 사용자 제출 데이터라 같은 요리가 수백 건씩 중복 등록됨("소고기미역국" 361건 등) — 화면에 같은 요리가 여러 장 뜸 | ✅ 수정 완료 — `RCP_TTL`(제목 문장)이 아니라 `CKG_NM`(요리명 전용 컬럼)을 그룹 키로 재정의해 66,447건→20,692건으로 정리, MAFRA↔CSV 교차 중복까지 처리. 대표 레시피는 재료 가짓수 최소 기준으로 선정. `dedupeCsv.cjs`(신규) | `backend/src/scripts/dedupeCsv.cjs`, `backend/src/scripts/seedCsv.cjs` |
| CSV 출처 레시피에 애초에 조리순서가 없음(`TB_RECIPE_SEARCH` 데이터셋 자체에 단계별 설명 컬럼이 없음, `steps_json:[]` 고정) | ✅ 사용자 결정으로 CSV 출처 20,430건 전량 삭제, MAFRA 출처(조리순서 있음) 533건만 유지 | — |
| `buildWeeklyPlan`에 프론트가 "전체 난이도"를 `'all'`로 보내는데 백엔드는 `'any'`만 필터 없음으로 인식 — 기본 경로로 식단을 만들면 항상 `{days:[]}` 반환, 장보기 리스트도 조용히 아무 반응 없음 | ✅ 수정 완료 — `difficulty==='all'`이면 `'any'`로 정규화 | `backend/src/store.js:944`, `frontend/src/api/mockServer.js` |
| `calculateCumulativeNeeds`가 재료 수량을 합칠 때 원문 계량 단위(뿌리/컵/공기/g 등)를 무시하고 숫자만 그대로 더함 — "즉석밥 1047컵" 같은 결과 발생. 대파는 팩 사이즈 오버라이드(`pa:1`)가 "1뿌리=1팩"으로 잘못 고정돼 있어 7뿌리 필요 시 22,800원(8팩) 청구 | ✅ 수정 완료 — 재료+단위 조합별로 나눠 누적하고 가격도 단위별로 계산 후 합산(화면엔 "800g + 4공기 + 5컵"처럼 표기). `pa` 오버라이드 제거. 이후 533개 레시피 전수 감사로 같은 유형의 팩 사이즈 오류 27건 추가 발견·수정(새우·멸치·쪽파 등) | `backend/src/store.js`(`calculateCumulativeNeeds`), `backend/src/data/mealPrices.js`, `frontend/src/api/mockServer.js`, `frontend/src/data/mealPrices.js` |
| `AddItem.jsx`가 `calcExpiryDate(master, purchasedAt)`을 호출 — 함수는 `ingredientId`(문자열)를 받게 돼 있는데 재료 객체 전체를 넘김. 9일차에 백엔드(`store.js`)에서 발견·수정됐던 것과 똑같은 버그 패턴이 프론트 호출부엔 안 고쳐진 채 남아있었음. 화면엔 "신선식품은 구매일 기준 평균 유통기한이 자동 입력돼요" 안내가 뜨지만 실제로는 항상 빈 값 | ✅ 수정 완료(12일차) — `calcExpiryDate(master.id, purchasedAt)`으로 교체. 브라우저에서 당근 선택 시 구매일(7/22)+여름철 평균 유통기한(10일)=8/1로 정상 자동 계산되는 것 확인 | `frontend/src/pages/AddItem.jsx:107,114` |

---

## 편의성 개선점 (12일차 정리)

실제 코드를 다시 훑으며 찾은 것(1, 5)과 기존에 이미 알려져 있던 것(2, 3, 6)을 합쳐 진행 순서를 정했다. **순서 기준**: 약속한 기능이 실제로 안 되는 버그 → 이미 있는 재료/컴포넌트로 바로 되는 것 → 새 로직·데이터 모델이 필요한 것.

| 순서 | 항목 | 왜 이 순서인가 | 근거/난이도 |
|---|---|---|---|
| 1 | **`AddItem` 유통기한 자동계산 버그 수정** | 편의 기능이 아니라 이미 "된다"고 안내 문구까지 띄워놓고 실제로 안 되는 상태 — 가장 먼저. 원인 파악 끝났고 한 줄 수정(`master` → `master.id`)으로 끝남 | `frontend/src/pages/AddItem.jsx:107,114`. `calcExpiryDate` 시그니처는 `frontend/src/data/ingredients.js:125` 참고 |
| 2 | **재료 직접 추가 화면에 검색/필터 추가** | ✅ 완료(12일차) — 검색어 입력 시 카테고리 무관하게 전체 재료에서 이름으로 필터링(예: "채소류" 선택 중에도 "두부" 검색 가능), 결과 없음 안내 문구도 추가. 브라우저에서 대파/두부/존재하지 않는 이름 3가지 케이스 확인 | `frontend/src/pages/AddItem.jsx` |
| 3 | **레시피 썸네일 이미지 노출** | ✅ 완료(12일차) — 실제로는 목록 API(`listRecipes`)가 `image_url`을 아예 안 내려주고 있었음(상세 조회용 캐시엔 있었지만 목록 응답 매핑에서 빠짐, `mockServer.js`도 동일). 목록 응답에 `image_url` 추가 + `RecipeCard.jsx`에 `<img loading="lazy">` 렌더링(없으면 이모지 폴백) 추가. **검증 한계**: 이 세션 Browser pane은 `loading="lazy"`가 있으면 이미지 요청 자체가 안 나가는 걸 확인(`loading="eager"`로 바꾸면 즉시 정상 로드, naturalWidth=600) — 무한스크롤 때와 같은 이 환경의 IntersectionObserver 미작동 이슈로 추정, 실제 사용자 브라우저에서 재확인 필요 | `backend/src/store.js`(`listRecipes`), `frontend/src/api/mockServer.js`, `frontend/src/components/RecipeCard.jsx`, `frontend/src/styles.css` |
| 4 | **`RecipeList`/`Home` 로딩·에러 상태 통일** | ✅ 완료(12일차) — `Home.jsx`는 두 fetch에 에러 처리가 전혀 없었던 걸(`.then()`만 있고 `.catch()` 없음, 실패해도 조용히 빈 상태로 남음) `useAsyncData`로 통합해 에러 시 "다시 시도" 노출. `RecipeList.jsx`는 무한스크롤 누적 로직이 있어 `useAsyncData`(매 요청마다 데이터 전체 교체)를 그대로 못 씀 — 같은 `status`(loading/ready/error) 패턴을 직접 구현해 "로딩 중인데 결과 없음 카드가 잠깐 뜨는" 문제와 에러 무처리를 해결(1페이지 에러는 카드로, 추가 페이지 에러는 "더보기" 자리에 인라인 재시도로 구분). 브라우저에서 "전체 둘러보기" 탭 전환·필터 변경 정상 동작 확인 | `frontend/src/pages/Home.jsx`, `frontend/src/pages/RecipeList.jsx` |
| 5 | **북마크(찜) 기능** | ✅ 완료(12일차) — DB 스키마 변경 없이 `localStorage`에 저장(이 앱은 로그인 없는 단일 사용자 기준이라 서버 동기화가 애초에 필요 없음, `servingMultiplier`와 같은 기존 패턴 재사용). `RecipeDetail.jsx`에 하트 토글 버튼 추가, "기타" 탭에 "찜한 레시피" 진입점 + 전용 화면(`BookmarkedRecipes.jsx`) 신규. 브라우저에서 찜하기→목록 반영→상세 재진입→해제까지 전체 흐름 확인 | `frontend/src/context/AppContext.jsx`, `frontend/src/pages/RecipeDetail.jsx`, `frontend/src/pages/BookmarkedRecipes.jsx`(신규), `frontend/src/pages/EtcMenu.jsx`, `frontend/src/App.jsx` |
| 6 | **일주일 식단 일요일 "냉장고 털이" 특수 슬롯** | `algorithms.md` 설계 범위 밖이라 알고리즘을 새로 설계해야 함 — 가장 큰 작업이라 마지막 | `backend/src/store.js`(`buildWeeklyPlan`), 설계는 `algorithms.md` §6 확장 필요 |

---

## P1 — 기획서에 있는데 비어있거나 가짜인 기능 (모두 완료됨)

| 항목 | 현재 상태 | 관련 코드 |
|---|---|---|
| 영수증 OCR 실연동 | ✅ 11일차 — 기기 기본 카메라 앱 호출 + Naver Clova OCR 실연동. `CLOVA_OCR_INVOKE_URL`/`CLOVA_OCR_SECRET_KEY` 미설정 시에만 기존 랜덤 3가지 Mock으로 폴백(자격증명 있는데 호출 실패 시엔 에러를 그대로 보여줌) | `backend/src/ocr/`, `backend/src/store.js`, `frontend/src/pages/ReceiptCamera.jsx` |
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

### 3. 9일차 코드 리뷰 발견 사항 — 전부 수정 완료

- ~~`AppContext.jsx`의 context `value` 객체가 매 렌더마다 새로 생성돼, 앱 어디서든 상태가 바뀌면 현재 화면 전체가 리렌더됨~~ ✅ 수정 완료(11일차) — `value`를 `useMemo`로 감쌈. (`frontend/src/context/AppContext.jsx:232`)
- ~~`Fridge.jsx`: 가공식품은 아무리 유통기한이 임박해도 "임박" 섹션에 안 뜨고 배지도 항상 초록색~~ ✅ 수정 완료(11일차) — `imminentIds` 필터에서 `isFresh` 조건 제거(임박이면 가공식품도 포함), `processedIds`에서는 반대로 `imminent`인 것을 제외해 중복 표시 방지. 브라우저에서 유통기한 D-1짜리 가공식품(어묵)을 추가해 실제로 "임박 🔥" 섹션에 빨간 배지로 뜨는 것 확인 후 테스트 데이터 삭제. (`frontend/src/pages/Fridge.jsx:8`)
- ~~`weekPlanType`이 전역 상태라 반찬 쉐어링 플로우와 일주일 식단 플로우 사이에 새어나감~~ ✅ 수정 완료(11일차) — `ShoppingSets.jsx`의 `fullWeek` 카드 클릭 시 `setWeekPlanType('meal')` 호출 추가. 브라우저에서 밑반찬 세트 클릭(→`side`) 후 취소하고 바로 일주일 전체 식단 클릭 시 `MealPlanPicker`가 "이번 주 뭐 먹지?"(2가지 픽)로 정상 표시되는 것 확인 — 수정 전이었다면 "무슨 반찬을 할까요?"(1가지 픽)로 새어나갔을 상황. (`frontend/src/pages/ShoppingSets.jsx:66`)
- ~~`MealPlanPicker.jsx` 확인 버튼이 `candidates` 로딩 전에는 `"undefined · undefined 중심으로..."` 텍스트를 그대로 노출~~ ✅ 수정 완료(11일차) — `candidatesLoaded` 상태를 추가해 로딩 완료 전에는 "레시피를 불러오는 중..."을 보여주고 버튼도 비활성화. 브라우저에서 실제로 2개 선택 시 정상적으로 레시피 이름이 채워지는 것 확인. (`frontend/src/pages/MealPlanPicker.jsx:32`)
- ~~`generateDynamicSets`의 `recipeCosts` 계산이 이미 계산된 `missingMap`을 재사용하지 않고 로직을 중복 구현~~ ✅ 수정 완료(11일차) — `estimateBuyCost([missingMap.get(id)])`로 교체(`backend/src/logic/fridgeLogic.js`의 기존 헬퍼 재사용). curl로 `/api/shopping/sets` 응답이 리팩터 전과 동일한 값(예상 비용) 나오는 것 확인. (`backend/src/store.js:709`)
- ~~`store.js`의 `TODAY` 상수가 서버 프로세스 시작 시점에 한 번만 계산되어...~~ ✅ 수정 완료(11일차) — `today()` 함수로 전환해 호출 시점마다 재계산하도록 변경 (`backend/src/store.js:15`, `frontend/src/api/mockServer.js:15`)
- 위 항목 중 프론트엔드 로직(`recipeCosts`)은 `frontend/src/api/mockServer.js`에도 동일 반영, 그 외 순수 화면 버그 4건은 화면 컴포넌트 자체 수정이라 mockServer.js와는 무관.

### 4. 11일차 코드 리뷰 발견 사항 (`/code-review`) — 전부 수정 완료

11일차 P0 수정 2건(`getShoppingList('sideShare')`, `buildWeeklyPlan(side)`)에 대해 `/code-review`를 돌려서 나온 4건. 원본 리뷰는 이 세션 기록 참고. 우선순위순으로 전부 처리 완료.

1. ~~**[P1] `getShoppingList('sideShare')`·`buildWeeklyPlan(type='side')`가 Supabase 미설정 시 조용히 빈 결과를 반환**~~ ✅ 수정 완료 — 폴백 레시피(`backend/src/data/recipes.js`, `frontend/src/data/recipes.js` 양쪽 10개)에 `category`가 아예 없어서 `isSideDish`/`isMeal` 필터가 항상 빈 배열이 됐던 것을, 실제 DB에서 쓰는 카테고리 taxonomy(`반찬`/`밑반찬`/`찌개`/`메인반찬`/`밥·죽·떡` 등)에 맞춰 10개 전부에 `category`를 채움(밑반찬 4개·식사류 6개로 분배). node 스크립트로 `sidePool`/`mealPool`이 각각 4개/6개로 비지 않는 것 확인.
2. ~~**[P2] `getShoppingList`의 `sideShare`/`ingredientShare` 풀 필터가 이미 계산된 것을 중복 계산**~~ ✅ 수정 완료 — `mealPool`/`sidePool`을 `recipesData` 참조 단위로 메모이즈하는 `getTypedPools()` 헬퍼를 추가해, `generateDynamicSets`와 `getShoppingList` 양쪽이 같은 캐시를 공유하도록 통합(`backend/src/store.js`, `frontend/src/api/mockServer.js` 양쪽 반영). curl로 `sideShare`/`ingredientShare`/`getShoppingSets` 전부 회귀 없음 확인.
3. ~~**[P2] 요일 슬롯 배정이 `actualPicks.length`로 분기**~~ ✅ 수정 완료 — `pickSlots` 분기 기준을 이미 있는 `targetPickCount`로 교체(값은 항상 동일하지만 의도를 드러내는 쪽으로). (`backend/src/store.js:961`, mockServer.js 동일 반영)
4. ~~**[P2] 주석 컨벤션 위반**~~ ✅ 수정 완료 — "무엇을 하는지" 서술하던 첫 문장을 지우고 "왜"만 남기도록 주석 재작성.

---

## 11일차 추가 — 기획서(product.md)·API 계약(api.md) 대비 코드 정합성 감사 ✅ 문서 갱신 완료

11일차 작업이 원래 기획에서 벗어난 게 없는지 점검하다가, **대부분 이 세션 이전부터 있던** 문서-코드 괴리를 다수 발견. 오늘 작업(P0/FE 안정성/영수증 OCR/식단 v2)은 이 감사에서 새로운 이탈을 만들지 않았음(영수증 촬영 UI 변경은 사용자와 상의 후 `product.md` 9.4에 이미 반영). 아래 발견 항목 중 **문서 쪽은 전부 `product.md`·`api.md`를 코드에 맞춰 재작성해 해소**, **미구현 기능은 새 백로그로 남김**(다음 순서로 구현 예정).

### API 계약 불일치 → `api.md` 전면 재작성으로 해소 (§3~§8)

- `GET /api/shopping-sets?filter=` → 실제 경로 `GET /api/shopping/sets`, 파라미터명 `match`(값도 `imminentRescue/minCost/ingredientShare/sideShare/fullWeek`)로 반영
- `GET /api/meal-plan/weekly` → 실제 `POST` + `difficulty`/`type` 바디로 반영
- `POST /api/receipts/:id/confirm` 요청 스키마 → `{expiryOverrides:{재료id: 날짜}}`로 반영, 응답도 200 + 전체 냉장고 뷰로 정정
- `PATCH /api/fridge/:id` → "구매 배치" 단위 수정/삭제(`itemIndex`/`deleteItemIndex`) 모델로 §5 DB 스키마까지 다시 씀
- DB 스키마 → 실제로 Supabase에 있는 건 `fridge_items`·`recipes` 2개 테이블뿐이고 재료 마스터·영수증 이력은 DB가 아님을 명시
- `POST /api/recipes/:id/cook-done` → `deductions:[{id,use}]`로 정정(문서는 `adjustments`였음)
- `Home.jsx`의 2회 분리 요청(`pageSize=1`/`sort=ratio&pageSize=2`) 반영

### 기획서엔 있는데 실제로 없음 (미구현 — 순차 구현 진행 중, `product.md` §11에도 반영)

- ~~레시피 검색바(디바운스) + `GET /api/recipes?search=`~~ ✅ 완료(11일차)
- ~~정렬 드롭다운 UI(추천순/조리시간순/난이도순)~~ ✅ 완료(11일차) — `sort=default|ratio|time|level`. 겸사겸사 "🔴 상급자" 필터가 `level=high`로 보내서 실제 계산값(`expert`)과 안 맞아 항상 0건이던 버그도 발견해 수정(`RecipeList.jsx`, `data/recipes.js` 양쪽)
- ~~무한 스크롤(`IntersectionObserver`)~~ ✅ 완료(11일차) — sentinel div를 관찰해 자동 로드 + "더보기" 버튼을 안전망으로 병행. **검증 한계**: 이 세션의 Browser pane에서 `IntersectionObserver`가 아예 콜백을 발생시키지 않는 현상을 발견(화면에 확실히 보이는 `<h1>`에 직접 옵저버를 붙여도 재현) — 스크린샷 도구가 이 세션 내내 타임아웃 나던 것과 같은 원인(렌더러 컴포지터 문제)으로 추정, 코드 자체의 버그는 아닌 것으로 판단. 자동 트리거는 실제 브라우저에서 사용자가 직접 확인 필요. 안전망 버튼으로 30→60개 증가는 확인 완료
- 레시피 썸네일 이미지 표시(`image_url` 필드는 API가 내려주는데 프론트 어디서도 안 씀) + 레이지 로딩
- 북마크(찜) 기능
- 일주일 식단의 일요일 "냉장고 털이 요리 🧹" 특수 슬롯 — 문서에만 있고 코드엔 대응 로직 자체가 없음

### 문서 자체 오류(실제와 반대로 적혀 있었음) → 발견 즉시 수정 완료

- ~~"수량 부족 알림은 미구현"~~ → 실제로는 이미 구현·렌더링됨. `product.md` 78행 수정.
- ~~"임박 알림 푸시는 문구뿐"~~ → 실제로는 브라우저 `Notification` API 권한 요청 + 1회성 확인 알림까지는 동작(단, D-2 자동 트리거는 없음 — 이 부분은 여전히 한계로 남겨둠). `product.md` §9.14 수정.

### 기획서에 없는데 코드엔 있음 → `product.md` 각 화면 절에 반영 완료

- `RecipeList.jsx`의 "내 냉장고로 요리/전체 둘러보기" 2탭 구조 → §9.7 반영
- `shopping-sets`에 `fullWeek`·`sideShare` 2종 추가(문서는 3종만) → §9.11 반영, 세트 클릭 시 시트가 하나 더 끼는 흐름도 반영
- `add-item` 화면의 카테고리별 재료 선택 UI → §9.3 반영
- `meal-plan-picker`의 반찬(side) 모드 + 검색창 → §9.15 반영
- `GET /api/ingredients` → `api.md` §3 엔드포인트 표에 추가
- 레시피 카테고리 탭 라벨(`전체메뉴/반찬/국&찌개/일품/밥죽스프/디저트`) → §9.7 반영

---

## P2 — 있으면 좋은 것 / 인프라

| 항목 | 현재 상태 | 비고 |
|---|---|---|
| 일주일 식단 루틴 알고리즘 v2 | ✅ 11일차 완료 — `selectImminentGreedy`·`shortlistCandidates`·`searchMinPurchaseCombo3`을 `buildWeeklyPlan(type='meal')`에 연결(임박 재료가 적어 3슬롯이 안 나오면 기존 탐욕으로 폴백). v2 알고리즘 설계는 [algorithms.md](./algorithms.md) 참고 | `type='side'`는 설계 문서 범위 밖이라 기존 탐욕 유지 |
| 식자재 가격 실시간 연동 | `GET /api/prices`가 정적 하드코딩, 매일 갱신되는 외부 소스 없음 | — |
| 테스트 코드 | ✅ 12일차 일부 완료 — `node:test`로 순수 함수(`store.js`의 `formatDday`/`ddayValue`, `data/ingredients.js`의 `calcExpiryDate`, `logic/fridgeLogic.js`의 `parseAmt`/`formatAmtText`/`extractUnit`/`ingHave`/`getMissingInfo`) 20건 커버. `backend/package.json`의 `test` 스크립트를 `node --test`로 교체 | `listRecipes`/`cookDone`/`confirmReceipt`는 Supabase 의존이라 아직 미커버(다음 순서) |
| 백엔드 린터 | ✅ 12일차 완료 — `backend/.oxlintrc.json` 신설(`oxc` 플러그인), `npm run lint` 추가. 기존 코드에서 걸린 미사용 파라미터(`app.js` 에러 핸들러의 `next`→`_next`) 1건 수정 | — |
| cook-done 원자성 한계 | ✅ 12일차 코드 레벨 완화 — 계산(1패스)/쓰기(2패스) 분리로 계산 오류가 이미 쓴 항목 *이후*에 터지는 상황 방지, 쓰기 실패 시 `partiallyApplied`/`failed`/`notAttempted`를 에러 응답에 포함해 반영 범위를 추적 가능하게 함(api.md §8) | 완전한 트랜잭션은 아님 — Postgres RPC 도입은 여전히 미착수 |
| 컨트롤러 입력 검증 강화 | ✅ 12일차 완료 — `purchasedAt`/`expiryDate`/`expiryOverrides` 날짜 형식, `deductions` 원소 형태, `multiplier` 범위(0 초과) 검증 추가(fridge/recipes/mealPlan/receipts 컨트롤러) | — |
| `fridge-recipe-app` ↔ `hub` 저장소 동기화 | `baejh3333-del/hub`는 2026-07-09 17:53 커밋 이후 미반영 | 공유·배포 전에 동기화 필요 |
| 레시피 커버리지 대폭 축소(20,963 → 533개) | 12일차에 조리순서 없는 레시피를 전량 삭제하기로 결정하면서, "지금 가능한 요리" 매칭 풀이 CSV 66,447건 없이 MAFRA 533건으로만 좁아짐 | 매칭률 체감 저하 가능성 — 필요시 CSV를 조리순서 있는 것만 선별 재도입하거나 별도 소스로 조리순서를 보강하는 방안 검토 |
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

---

## 11일차 (2026-07-20) 작업 기록 — P0 버그 수정 & 코드 리뷰

[3주차 계획수립.md](./3주차%20계획수립.md) Day 11 항목 진행.

### 버그 수정

- **`getShoppingList(setId='sideShare')` 크래시 수정** — `ingredientShare`만 처리하던 분기를 `sideShare`까지 확장. `setId`에 따라 `isSideDish`/`isMeal`로 필터링한 풀로 `generateIngredientShareSet`을 호출해 `def.recipeIds`를 채움. curl로 정상 응답(`{"setName":"반찬 3가지 쉐어링 세트", ...}`) 확인. (`backend/src/store.js:816`)
- **`buildWeeklyPlan(type='side')` 금요일 누락 수정** — 픽이 1개(반찬형)일 때도 화/금 슬롯을 둘 다 예약해서 `actualPicks[1]`이 항상 `undefined`였던 것을, 픽 개수에 따라 예약 슬롯을 `[1,4]`(식사)/`[1]`(반찬)로 분기. curl로 월~일 7일이 전부 채워지는 것 확인. (`backend/src/store.js:947`)
- **`TODAY` 날짜 드리프트 수정** — 서버 시작 시점에 한 번만 계산되던 모듈 전역 `const TODAY`를, 호출 시점마다 재계산하는 `today()` 함수로 전환. `formatDday`가 이를 사용하도록 변경. (`backend/src/store.js:15`)
- 위 3건 모두 `frontend/src/api/mockServer.js`(오프라인 폴백 API 구현체)에도 동일하게 반영 — `CLAUDE.md`의 "frontend ↔ backend 데이터 중복" 컨벤션대로 두 곳을 맞춰 유지.

### `/code-review` 실시 (수정한 3건에 대해)

- 가장 심각한 발견: **`frontend/src/api/mockServer.js`가 처음엔 동기화되지 않아 방금 고친 버그 3건을 그대로 재현**하고 있었음 — 리뷰 직후 바로 동기화 완료(위 항목 참고). `api/index.js`가 지금은 `httpClient`를 쓰고 있어 당장 라이브 버그는 아니었지만, 두 구현체가 어긋난 채로 방치되면 나중에 mockServer로 되돌릴 때 조용히 재발했을 사안.
- 그 외 4건은 "FE 안정성 잔여 과제 > 4. 11일차 코드 리뷰 발견 사항"으로 백로그에 등록 후 우선순위(사용자 영향 → 수정 난이도 → 유지보수 영향 순)를 매겨 **같은 세션에서 4건 전부 처리 완료**:
  1. Supabase 미설정 시 sideShare/side 폴백이 조용히 빈 결과를 반환하던 것 — 폴백 레시피 10개에 `category` 채움
  2. `getShoppingList`의 풀 필터 중복 계산 — `getTypedPools()` 헬퍼로 `generateDynamicSets`와 캐시 공유
  3. 요일 슬롯 배정을 `actualPicks.length`가 아닌 `targetPickCount` 기준으로 변경
  4. "왜"가 아니라 "무엇"을 설명하던 주석 정리 (CLAUDE.md 컨벤션 위반 해소)
  - 4건 모두 `backend/src/store.js`·`frontend/src/api/mockServer.js` 양쪽에 반영, curl로 `sideShare`/`ingredientShare`/`getShoppingSets`/반찬형 주간계획 전부 회귀 없음 재확인.

---

## 11일차 (2026-07-20) 작업 기록 — FE 안정성

[3주차 계획수립.md](./3주차%20계획수립.md) Day 12 항목(FE 안정성) 진행. 9일차 코드 리뷰에서 남아있던 5건을 전부 처리.

- **`AppContext.jsx` context `value` 미메모이제이션** — `useMemo`로 감싸 앱 전역 리렌더 원인 제거.
- **`Fridge.jsx` 가공식품 임박 미표시** — `imminentIds`가 `isFresh`인 것만 보던 걸 고쳐 가공식품도 임박하면 "임박 🔥" 섹션에 뜨도록 수정, `processedIds`에서는 임박 항목을 제외해 중복 표시 방지. 브라우저에서 D-1짜리 가공식품(어묵)을 직접 추가해 임박 섹션에 빨간 배지로 뜨는 것 확인 후 정리.
- **`weekPlanType` 플로우 간 누수** — `ShoppingSets.jsx`의 `fullWeek` 카드 클릭 시 `weekPlanType`을 `'meal'`로 리셋. 브라우저에서 밑반찬 세트→취소→일주일 전체 식단 순으로 클릭해 `MealPlanPicker`가 정상적으로 "이번 주 뭐 먹지?"(2가지 픽)를 보여주는 것 확인.
- **`MealPlanPicker.jsx` undefined 텍스트 노출** — `candidatesLoaded` 상태 추가, 로딩 완료 전엔 "레시피를 불러오는 중..."을 보여주고 버튼도 비활성화.
- **`generateDynamicSets`의 `recipeCosts` 중복 구현** — `fridgeLogic.js`의 기존 `estimateBuyCost` 헬퍼를 재사용하도록 교체, `backend/src/store.js`·`frontend/src/api/mockServer.js` 양쪽 반영. curl로 `/api/shopping/sets` 응답 값이 리팩터 전후 동일한 것 확인.
- 5건 모두 브라우저에서 실제 화면 조작으로 검증(스크린샷 대신 `get_page_text`/`read_page`/`javascript_tool`로 텍스트·스타일 확인 — Browser pane 스크린샷 도구가 세션 중 응답 없음 이슈가 있었음), 콘솔 에러 없음 확인. frontend 전체 `oxlint` 통과.

---

## 11일차 (2026-07-20) 작업 기록 — 영수증 촬영/OCR 실연동

원래 3주차 계획엔 없던 항목(Day 13은 원래 "일주일 식단 v2 알고리즘 연결" 예정이었으나, 우선순위가 바뀌어 영수증 촬영 실기능을 먼저 진행). 사용자가 OCR 제공자로 **Naver Clova OCR**, 촬영 UI로 **기기 기본 카메라 앱 호출**(`<input type="file" capture>`)을 직접 선택.

### 백엔드

- **`backend/src/ocr/clovaOcr.js`(신규)** — Clova OCR General API 호출. JSON+base64 방식(멀티파트 대신) 사용, `AbortSignal.timeout(15s)`로 타임아웃 처리(`docs/api.md`가 요구하는 "타임아웃 반드시 처리" 반영). `CLOVA_OCR_INVOKE_URL`/`CLOVA_OCR_SECRET_KEY` 환경변수가 없으면 `null`을 반환해 호출부가 폴백하도록 설계. Clova가 단어 단위 `field`를 반환하고 `lineBreak` 플래그로 줄 끝을 표시한다는 점을 반영해, 공백 포함 재료명("돼지고기 앞다리")도 놓치지 않도록 줄 단위로 재조립하는 `fieldsToLines()` 포함.
- **`backend/src/ocr/matchReceiptLines.js`(신규)** — OCR 텍스트 줄을 재료 마스터와 대조. 날짜·전화번호·합계·카드승인 등 잡음 줄을 정규식으로 먼저 제거하고, 남은 줄은 재료명 포함 여부(양방향 — OCR이 이름을 잘라 찍는 경우 대비)로 매칭. 매칭 안 된 줄은 최대 5개까지 `matched:false`로 보여줌(전부 보여주면 목록이 지저분해짐).
- **`backend/src/store.js`의 `createReceipt(file)`** — 사진(`multer`가 채운 `req.file`)이 있으면 실제 OCR을 시도. **크레덴셜이 아예 없을 때만** 기존 랜덤 Mock으로 조용히 폴백하고, **크레덴셜이 있는데 호출이 실패/타임아웃되면 에러를 그대로 위로 던진다** — 그 경우까지 Mock으로 감추면 사용자가 가짜 인식 결과를 진짜로 착각해 냉장고에 엉뚱한 재료가 등록될 수 있기 때문(설계 결정, 코드 주석에도 남김).
- **`backend/src/routes/receipts.js`** — `multer`(메모리 저장, 8MB 제한, `image/*`만) 미들웨어를 `POST /` 앞에 추가.
- **`backend/src/app.js`** — 라우트에서 `next(err)`로 넘어온 에러를 Express 기본 HTML 에러 페이지 대신 JSON으로 응답하는 에러 핸들러 추가(프론트가 `err.message`를 그대로 `alert()`하므로 multer의 영문 에러는 한국어로 치환).
- **`backend/package.json`** — `multer` 의존성 추가.

### 프론트엔드

- **`ReceiptCamera.jsx`** — 셔터 버튼이 더 이상 인식을 직접 트리거하지 않고, 숨겨진 `<input type="file" accept="image/*" capture="environment">`를 클릭 — 모바일에서 기기 기본 카메라 앱이 뜬다. 사진 선택 시 `shootReceipt(file)` 호출.
- **`AppContext.jsx`의 `shootReceipt`** — 인자 없던 시그니처를 `(file)`로 변경.
- **`httpClient.js`의 `uploadReceipt(file)`** — `FormData`로 멀티파트 업로드. 공용 `request()` 헬퍼가 `FormData`일 땐 JSON 직렬화·`Content-Type` 지정을 건너뛰도록 수정(브라우저가 boundary를 직접 붙여야 하므로).
- **`mockServer.js`의 `createReceipt(_file)`** — 오프라인 폴백은 실제 서버가 없어 OCR을 돌릴 수 없으므로 시그니처만 맞추고 기존 랜덤 로직 유지.

### 검증

- curl로 멀티파트 업로드 → 크레덴셜 없음 → Mock 폴백 정상 동작, 8MB 초과 파일 → `413` + 한국어 에러 메시지, `confirmReceipt`까지 이어지는 전체 흐름 확인(테스트로 추가된 재료는 삭제해 정리).
- 브라우저에서 `영수증 촬영` 화면 진입 → 숨겨진 file input이 `accept="image/*" capture="environment"`로 정확히 렌더링되는 것 확인. **실제 카메라로 찍은 사진으로 Clova OCR이 진짜 잘 인식하는지는 이 세션에서 검증하지 못함** — Naver Cloud Platform에서 발급받은 Clova OCR 크레덴셜이 없기 때문(자세한 내용은 아래 참고).

### 남은 일 / 사용자가 해야 할 것

- `backend/.env`에 `CLOVA_OCR_INVOKE_URL`, `CLOVA_OCR_SECRET_KEY`를 추가해야 실제 OCR이 동작한다(Naver Cloud Platform 콘솔에서 CLOVA OCR → General 템플릿으로 발급). 두 값이 없으면 지금처럼 랜덤 Mock으로 계속 동작(로컬 개발엔 문제 없음).
- 크레덴셜을 넣은 뒤 실제 영수증으로 한 번 테스트해 매칭 정확도(`matchReceiptLines.js`의 잡음 필터·이름 대조 규칙)를 다듬어야 할 가능성이 높음 — 실제 Clova 응답 형태(특히 `lineBreak` 필드 존재 여부)를 이 세션에선 본 적이 없어 방어적으로만 작성함.
- (추가) Naver Cloud Platform 콘솔 가입 절차가 번거롭다는 사용자 피드백으로 OCR 제공자를 재검토 중 — OCR.space/Upstage Document AI/Google Cloud Vision/Tesseract.js 후보 제시, 아직 미결정. 제공자를 바꾸더라도 `backend/src/ocr/clovaOcr.js`의 `recognizeReceiptText(buffer, mimeType) → string[] | null` 계약만 유지한 새 모듈로 교체하면 `store.js`·`matchReceiptLines.js`는 그대로 재사용 가능.

## 11일차 (2026-07-20) 작업 기록 — 일주일 식단 v2 알고리즘 연결

[3주차 계획수립.md](./3주차%20계획수립.md) Day 13 원래 항목. 영수증 OCR 작업 다음으로 이어서 진행.

- **`backend/src/logic/fridgeLogic.js`(+ `frontend/src/logic/fridgeLogic.js` 동일 반영)** — `estimateBuyCost`가 내부에서 하던 Map 병합을 `mergeMissingMaps()`로 분리해 export. `searchMinPurchaseCombo3`에 넘길 `fixedNeeds` 계산과 공유하기 위함.
- **`buildWeeklyPlan(type='meal')`** — 기존엔 픽 2개를 제외한 나머지 5슬롯을 전부 단일 탐욕 루프(합집합 최소화)로 채우고, 임박 재료 사용 여부는 다 채운 뒤 "월·수에 가깝게 정렬"만 하는 후처리였음. 이걸 `algorithms.md` §6 설계대로 2단계로 분리:
  1. `selectImminentGreedy(..., slots=2, ...)`로 임박 재료 한계 이득 기준 최대 2개를 월·수에 먼저 배치
  2. 남은 슬롯이 정확히 3개(=임박 재료가 2개 다 채워졌을 때)면 `shortlistCandidates`(K=25 축소) → `searchMinPurchaseCombo3`(C(25,3) 브루트포스 + 부분합 가지치기)로 목·토·일을 "부족 품목 종류 수·예상 비용" 사전식 최소가 되도록 탐색
  3. 임박 재료가 적어(0~1개) 남은 슬롯이 3개가 아니면(4~5개), `searchMinPurchaseCombo3`는 정확히 3-조합만 지원하므로 기존 단계별 탐욕(`greedyFillSlots`로 이름 붙여 분리)으로 안전하게 폴백
- **`type='side'`** — 그대로 기존 탐욕 배치 유지. v2 설계 문서(`algorithms.md`)가 "픽 2개·7일 식단" 케이스만 다루고 있어 반찬형(픽 1개)은 범위 밖.
- **검증**: curl로 `type=meal`(전체/`beginner` 난이도 필터), `type=side`, 유효하지 않은 `pickedIds` 케이스까지 확인 — 전부 7일 채워짐, 크래시 없음, "추가 구매 품목 N개로 압축" 요약 정상 출력. frontend 전체 `oxlint` 통과, 양쪽 `fridgeLogic.js` diff로 동일함 재확인.
- **한계**: `selectImminentGreedy`가 실제로 몇 개 슬롯을 채우는지(즉 어느 분기를 타는지)는 현재 fridge 데이터(임박 재료 2개: 돼지고기·두부)로는 로그 없이 curl 응답만으론 명확히 구분 못 함 — 두 재료를 한 레시피가 동시에 커버하면 1개만 채우고 조기 종료해 폴백 분기를 탈 가능성이 있음. 필요하면 다음 세션에서 임박 재료 개수를 조정해 두 분기를 각각 강제로 재현/확인할 수 있음.

---

## 12일차 (2026-07-21) 작업 기록

### 1. 백엔드 검증 기준 정리 & 품질 개선

"백엔드 API의 필수/권장 검증 기준이 뭔지" 질문에서 출발해, 계획을 먼저 세우고(plan mode) 순차적으로 진행.

- **`backend/.oxlintrc.json` 신설** — 프론트(`oxc`+`react` 플러그인)와 달리 JSX가 없으므로 `oxc`만. `npm run lint` 스크립트 추가. 기존 코드에서 걸린 미사용 파라미터 1건(`app.js` 에러 핸들러 `next`→`_next`) 수정.
- **`node:test` 도입** — `store.js`의 `formatDday`/`ddayValue`를 `export`로 전환, `data/ingredients.js`의 `calcExpiryDate`, `logic/fridgeLogic.js`의 `parseAmt`/`formatAmtText`/`extractUnit`/`ingHave`/`getMissingInfo`까지 순수 함수 20건 테스트 작성. `backend/package.json`의 `test` 스크립트를 `node --test`로 교체(기존엔 `npm init` placeholder뿐이었음).
- **컨트롤러 입력 검증 강화** — `purchasedAt`/`expiryDate`/`expiryOverrides` 날짜 형식, `deductions` 원소 형태(`{id:string, use:0이상 숫자}`), `multiplier` 범위(0 초과)를 fridge/recipes/mealPlan/receipts 컨트롤러에 추가. curl로 정상/실패 케이스 각각 확인.
- **`cook-done` 부분 실패 완화** — Supabase 클라이언트가 다건 트랜잭션을 지원하지 않아 완전한 원자성은 불가능하지만, 계산(1패스)/쓰기(2패스)로 분리해 계산 오류가 이미 쓴 항목 *이후*에 터지는 상황을 방지하고, 쓰기 실패 시 `partiallyApplied`/`failed`/`notAttempted`를 에러 응답에 담아 최소한 반영 범위는 추적 가능하게 함. 실제 Supabase에 테스트용 재료를 만들어 부분 차감·완전 소진 케이스 둘 다 검증 후 정리.
- 4건 모두 `npm run lint`+`npm test` 통과 확인하며 진행.

### 2. 레시피 데이터 대규모 정리 — CSV 중복 제거 (66,984 → 20,963개)

사용자가 "레시피 리스트에 같은 요리가 여러 개 뜬다"고 보고. 원인 조사 → 전략 논의(그룹핑 드릴다운 vs 단순 dedup vs CSV 사전 정리) → 실행까지 여러 라운드로 진행.

- **1차 진단**: `RCP_TTL`(제목) 기준으로 실제 DB를 조회해 정규화 중복(문장부호·공백 차이) 1,412~1,991그룹, 최대 2,955~4,574건 발견("오이지무침" 25건 등).
- **전략 확정**: 사용자가 "대표 1건만 남기고, 재료 가짓수 적은 레시피로 남겨라"로 결정. `backend/src/scripts/dedupeCsv.cjs`(신규) 작성 — 원본 CSV를 읽어 `isSimpleRecipe` 통과분(66,447건) 중 정규화된 제목으로 그룹핑, 재료 가짓수(조미료 제외) 최소인 레시피를 내용으로, 그룹 내 최빈/최단 표기를 제목으로 선정해 새 CSV(`TB_RECIPE_SEARCH-231130-clean.csv`) 생성.
- **더 큰 문제 발견**: 원본 CSV에 `RCP_TTL`(제목 문장, 홍보 문구 섞임) 말고 `CKG_NM`(요리명 전용 컬럼)이 따로 있다는 걸 발견 — 이 필드로 재검수하니 진짜 중복이 66,447건 중 52,330건(79%)에 달함("소고기미역국" 361건, "콩나물무침" 343건 등). `dedupeCsv.cjs`를 `CKG_NM` 기준 그룹핑으로 재작성 → 66,447건 → **20,692건**으로 정리.
- **재시딩 & 버그 수정**: `seedCsv.cjs`에 재시딩 전 기존 CSV 출처 레시피 선삭제 로직 추가(원래 upsert만 해서 정리 전 중복이 안 지워지던 구조적 문제). 이 삭제 로직도 대량 변경 직후 `.order()` 없는 `range()` 페이지네이션이 불안정해서 일부(16,328건) 못 지우고 남는 버그를 발견해 `.order('api_rcp_seq')` 추가로 수정 — 검증 스크립트 자체도 같은 버그로 한 번 잘못된 결과를 낸 걸 재확인 과정에서 발견.
- **교차 중복 정리**: MAFRA(537건, 조리순서 있음)와 CSV 사이에도 같은 요리명 263그룹 존재 — 조리순서 있는 쪽을 우선 남기는 기준으로 정리(그중 4그룹은 MAFRA끼리도 중복이어서 같이 정리됨). 최종 **20,963건**, 중복 그룹 0건.

### 3. 조리순서 없는 레시피 전량 삭제 (20,963 → 533개)

사용자가 "레시피들에 조리순서가 없다"고 지적. 원본 CSV(`TB_RECIPE_SEARCH`) 18개 컬럼을 전부 확인했으나 단계별 설명 컬럼 자체가 없음(4개 연도 스냅샷 전부 동일 스키마) — `CKG_IPDC`(요리소개)는 홍보 문구라 대체 불가. 즉 CSV 출처 레시피는 애초에 조리순서를 만들 수 없는 데이터. 사용자가 "조리순서 없는 거 다 지워"로 결정 → CSV 출처 20,430건 전량 삭제, MAFRA 출처(실제 조리순서 있음) **533건**만 남김. 브라우저로 실제 앱 확인(백엔드·프론트 dev 서버 기동) — 홈/레시피 리스트(`total:533`)/상세 화면의 조리 순서까지 정상 표시 확인.

### 4. 버그 — 일주일 식단 루틴에서 장보기 리스트가 항상 비어있음

사용자 보고: "식단 루틴에서 구매해야할 재료들 안뜨는 버그". 브라우저로 재현 — 식단 화면엔 일자별 목록이 아예 안 뜨고, "장보기 리스트 만들기" 버튼도 무반응.

- **원인**: `AppContext.jsx`의 `weekPlanDifficulty` 기본값이 `'all'`인데(난이도 선택 시트 옵션 id도 `'all'`), `backend/src/store.js`의 `buildWeeklyPlan`은 `'any'`만 "필터 없음"으로 인식(`difficulty !== 'any' && r.level !== difficulty`) — `'all'`을 넘기면 모든 레시피가 걸러져 후보 풀이 0개가 되고 `{days:[]}`를 반환. 특정 난이도를 직접 고르지 않는 한(기본 경로 포함) 항상 재현되던 버그.
- **수정**: `buildWeeklyPlan` 진입 시 `difficulty === 'all'`이면 `'any'`로 정규화 — `backend/src/store.js`, `frontend/src/api/mockServer.js` 양쪽.
- **검증**: 브라우저에서 냉이된장찌개·나물비빔밥 선택 → 7일 전부 채워짐 → 장보기 리스트(부족 재료 23개, 예상 합계 118,940원)까지 정상 표시 확인.

### 5. 버그 — 식단 장보기 리스트 재료 가격/수량 오류

사용자가 스크린샷으로 지적: "대파 부족 7뿌리 1/8 → 22,800원", "즉석밥 부족 1047컵 3/4 → 393,000원"이 말이 안 된다고("대파도 한단 가격을 한개로 착각하는듯").

- **원인 1(대파)**: `mealPrices.js`의 `INGREDIENT_PACK_OVERRIDES`에 `pa: 1`이 있어 "1뿌리=1팩"으로 고정 — 몇 뿌리를 사든 매번 한 단(2,850원) 전체 가격이 매겨짐. 오버라이드 제거, 단위별 기본표(`'뿌리': 5`)로 폴백하도록 수정.
- **원인 2(즉석밥, 더 근본적)**: `calculateCumulativeNeeds`(`store.js`)가 재료 수량을 합칠 때 원문 단위(뿌리/컵/공기/g)를 무시하고 숫자만 그대로 더함 — "800g"+"2공기"+"4컵"+"1컵"을 전부 같은 단위처럼 합산해 "1047컵" 같은 결과가 나옴. `${key}::${단위}`로 나눠 단위가 같은 것끼리만 누적하고, 가격도 단위 그룹별로 계산 후 합산, 화면엔 "800g + 4공기 + 5컵"처럼 단위별로 표기하도록 재작성. `backend/src/store.js`(`calculateCumulativeNeeds`/`getMealShoppingList`), `frontend/src/api/mockServer.js` 양쪽 반영.
- **추가 감사**: "다른 재료도 이런 문제가 있는지" 요청으로 533개 레시피의 재료 단위를 전수 스캔해 팩 크기가 레시피 1개의 일반적인 필요량보다도 작은 조합을 찾아냄 — 27개 재료(멸치·새우·대하·홍합·쪽파·밤·미나리·상추 등, "여러 개를 봉지째 사는" 재료들이 "낱개=1팩"으로 잘못 잡혀 있었음)에 실제 판매 단위 기준 오버라이드 추가, 반대로 과소 청구되던 라면사리·브로콜리("1개=정찰가"인데 4개 단위 팩으로 잡혀 있던 것)도 수정. `mealPrices.js` 양쪽(`backend`/`frontend`) 반영, 재감사 스크립트로 잔여 문제 0건(설명 가능한 예외 4건 제외) 확인.

### 검증 방식

이번 세션 전체에 걸쳐 라이브 DB(Supabase)를 직접 수정하는 작업이 많아, 매 단계 진단 스크립트(임시 `.cjs`, 작업 후 삭제)로 실제 수치를 먼저 확인한 뒤에만 실행하는 방식으로 진행 — 특히 대량 삭제/재시딩처럼 되돌리기 어려운 단계는 사용자에게 영향 범위를 먼저 보고하고 명시적 승인을 받은 뒤 진행함.
