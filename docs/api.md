# 자취생 냉장고 레시피 앱 — API & 기술 명세

> 이 파일은 `api-design.md`, `Supabase-마이그레이션.md`, `레시피API-연동계획.md`를 하나로 합친 기술 명세 단일 소스입니다.
> 제품 명세는 [product.md](./product.md), 알고리즘 설계는 [algorithms.md](./algorithms.md) 참고.
> 마지막 업데이트: 2026-07-21 (12일차 — 레시피 데이터셋 규모 변경 반영, [backlog.md 12일차](./backlog.md#12일차-2026-07-21-작업-기록) 참고)

---

## 1. 기술 지도 (FE / BE / DB)

| 층 | 무엇을 둘까 | 어떤 기술 |
|---|---|---|
| FE | 냉장고 목록/상세, 영수증 촬영·확인 화면, 레시피 리스트·필터·상세·조리모드, 요리완료 차감 화면 | React (모바일 웹 기준) |
| BE | 재고 CRUD, 영수증 OCR 결과 파싱·매칭, 레시피-재고 매칭 알고리즘, 조리완료 시 재고 일괄 차감 로직 | Node.js + Express |
| DB | 재고(`fridge_items`)·레시피(`recipes`) 2개 테이블만 실제로 Supabase에 있음. 재료 마스터·영수증 이력은 DB가 아님(§5 참고) | PostgreSQL (Supabase) |
| 외부 API | 영수증 OCR(품목명·수량 추출) | Naver Clova OCR(General) — BE가 프록시(`backend/src/ocr/clovaOcr.js`). 크레덴셜 미설정 시 Mock 폴백 |

**설계 전제**
- MVP 4개 기능(나만의 냉장고 / 영수증 촬영 인식 / 레시피 리스트&필터 / 요리완료 재고차감)은 요청→응답 흐름표까지 상세 설계.
- 2차 확장 기능(추천 재료 세트, 유통기한 알림, 식단 루틴, 가격 정보)은 전부 실제로 구현·연동됨(§7) — "API 개요(안)"이 아니라 현재 동작하는 실제 계약.
- **인증/로그인은 범위 밖** — 단일 사용자 기준. `user_id` 같은 확장 대비 컬럼은 실제로 쓰이지 않음.
- **외부 연동 1곳**: 영수증 OCR(Naver Clova). 식자재 시세(`GET /api/prices`)는 외부 API 연동 없이 정적 하드코딩(백로그 P2, 미착수).

---

## 2. 화면별 API 사용 지점

기획서의 화면 흐름을 기준으로, 실제 서버 통신이 필요한 지점만 추림(단순 화면 전환·로컬 상태 토글은 제외).

| 화면 | 사용자 동작 | API 필요? | 비고 |
|---|---|---|---|
| 홈 | 화면 진입 | ✅ | 재고 요약 + 임박 알림 + 추천 레시피 미리보기 조회 |
| 나만의 냉장고 | 화면 진입 | ✅ | 전체 재고 목록 조회 |
| 재고 직접 추가 | 저장 클릭 | ✅ | 재고 아이템 생성 |
| 재고 직접 추가/재료 상세 | 수정·삭제 | ✅ | 재고 아이템 수정/삭제 |
| 재료 상세 바텀시트 | 열기 | ⛔ | 목록 조회 응답에 role/tip 이미 포함 → 추가 호출 불필요 |
| 영수증 촬영 | 촬영 완료 | ✅ | 이미지 업로드 + OCR 인식 요청 (외부 API 경유) |
| 인식 결과 확인 | 재촬영 | ✅ | OCR 재요청(위와 동일 엔드포인트) |
| 유통기한 확인·보정 | 확정 클릭 | ✅ | 인식 결과 확정 → 재고 일괄 반영(생성/수량 증가) |
| 레시피 리스트 | 필터 변경/화면 진입 | ✅ | 재고 매칭 기반 레시피 목록 조회(쿼리 파라미터로 필터) |
| 레시피 상세 | 카드 클릭 | ✅ | 레시피 상세(재료·애드온·스텝) 조회 |
| 조리모드 | 스텝 진행 | ⛔ | 상세 조회 시 스텝 데이터 이미 받음 → 로컬 진행 |
| 요리 완료 | "요리 완료" 클릭 | ✅ | 레시피 기준 재고 일괄 차감 |
| 요리 완료 | 사용량 수정 후 확정 | ✅ | 보정된 사용량으로 차감 요청 재전송 |
| 추천 재료 세트 [2차] | 필터 변경 | ✅ | §7.1 |
| 유통기한 임박 알림 [2차] | 화면 진입 | ✅(§7.2) | 홈 요약과 동일 데이터 재사용 가능 |
| 일주일 식단 루틴 [2차] | 화면 진입 | ✅ | §7.3 |
| 식자재 가격 정보 [2차] | 화면 진입 | ✅(외부연동) | §7.4 |

---

## 3. API 엔드포인트 목록 (MVP)

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/fridge` | 냉장고 재고 전체 조회 (홈 요약도 이 응답을 축약해서 사용) |
| `GET` | `/api/fridge/alerts` | 유통기한 임박 + 수량 부족 알림 조회(`expiry-alerts` 화면) — `/:id`보다 라우트 등록 순서가 먼저여야 함 |
| `POST` | `/api/fridge` | 재고 아이템 수동 추가 (`ingredientId` 또는 `name` 중 하나 필수) |
| `PATCH` | `/api/fridge/:id` | 재고 한 항목의 "구매 배치" 1건을 수정(`itemIndex`+`qtyAmount`/`qtyUnit`/`qtyLabel`/`expiryDate`) 또는 삭제(`deleteItemIndex`) — §5 참고 |
| `DELETE` | `/api/fridge/:id` | 재료 하나(모든 구매 배치 포함)를 통째로 삭제 |
| `GET` | `/api/ingredients` | 재료 마스터 목록 조회 — 재고 직접 추가·유통기한 확인 화면이 단위/카테고리 칩을 그리는 데 사용 |
| `POST` | `/api/receipts` | 영수증 이미지 업로드(`multipart/form-data`, 필드명 `photo`) → OCR 인식 결과 반환. 사진이 없거나 OCR 크레덴셜 미설정 시 Mock 결과로 폴백 |
| `POST` | `/api/receipts/:id/confirm` | 인식 결과(유통기한 보정 포함) 확정 → 냉장고에 일괄 반영 |
| `GET` | `/api/recipes` | 냉장고 재고 매칭 기반 레시피 목록. 쿼리: `filter=all\|full\|few`, `level=all\|beginner\|mid\|expert`, `category=all\|반찬\|...`, `search`(요리명 부분 일치, 대소문자 무시), `page`, `pageSize`(최대 100), `sort=default\|ratio\|time\|level` |
| `GET` | `/api/recipes/:id` | 레시피 상세(재료·애드온·조리 스텝). 쿼리: `multiplier`(인분 배수) |
| `POST` | `/api/recipes/:id/cook-done` | 조리 완료 → 재고 일괄 차감. body: `{ deductions: [{ id, use }, ...] }` |

---

## 4. 기능별 요청→응답 흐름표

### 4.1 나만의 냉장고 (재고관리)

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| 앱 최초 로드(홈이 아니라 `AppProvider` 마운트 시 1회) | `GET /api/fridge` | 전체 재고를 재료별로 그룹핑(같은 재료의 여러 "구매 배치"를 `items[]`로 합산) | `fridge_items` 전체 SELECT | 재고 객체(`{ [ingredientId]: {...} }`) | 전역 `fridge` 상태로 저장, 홈·냉장고 화면이 공유해서 씀(홈이 별도로 재조회하지 않음) |
| 유통기한 임박·수량 부족 알림 화면 진입 | `GET /api/fridge/alerts` | `imminent` 항목 + 수량(`qtyAmount`) 1 이하(또는 150g 이하) 항목 계산 | 위 응답을 서버에서 가공(별도 SELECT 없음, `getFridge`와 동일 데이터 재사용) | 임박 리스트 + 수량 부족 리스트 | "유통기한 임박" 화면 렌더 |
| 냉장고 화면 진입 | (없음, 전역 `fridge` 상태 재사용) | — | — | — | 신선/가공 그룹핑은 프론트(`Fridge.jsx`)가 담당 |
| 재료 직접 추가 저장 | `POST /api/fridge` | `ingredientId`+`quantityLabel`+`purchasedAt` 필수. 신선식품은 유통기한 자동 계산(`calcExpiryDate`), 가공식품은 `qtyLabel`만 저장 | `fridge_items` INSERT | 생성된 아이템(201) | 냉장고 재조회 후 목록에 한 줄 추가 |
| 재고 수정(수량) | `PATCH /api/fridge/:id` body `{ itemIndex, qtyAmount?, qtyUnit?, qtyLabel?, expiryDate? }` | 해당 재료의 `items[itemIndex]`(구매 배치 1건)만 수정 | `fridge_items` UPDATE(`id`=해당 배치의 PK) | 갱신된 재료 뷰(200) | 해당 줄 갱신 |
| 구매 배치 1건 삭제 | `PATCH /api/fridge/:id` body `{ deleteItemIndex }` | 재료는 남기고 구매 배치 하나만 제거 | `fridge_items` DELETE(배치 1건) | 갱신된 재료 뷰(200) | 배치 하나만 목록에서 사라짐 |
| 재료 전체 삭제 | `DELETE /api/fridge/:id` | 해당 `ingredient_id`의 모든 구매 배치 삭제 | `fridge_items` DELETE(`ingredient_id` 일치 전부) | 없음(204) | 재료 자체가 목록에서 사라짐 |

### 4.2 영수증 촬영 인식

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| 영수증 촬영 완료(기기 기본 카메라 앱으로 찍은 사진 선택) | `POST /api/receipts` (`multipart/form-data`, 필드명 `photo`) | Naver Clova OCR(General) 호출 → 텍스트 줄 재구성(`lineBreak` 기준) → 재료 마스터와 이름 대조 매칭(`backend/src/ocr/matchReceiptLines.js`). 크레덴셜 미설정 시 랜덤 3종 Mock으로 폴백 | (인메모리 `receipts` — 별도 `receipts`/`receipt_items` 테이블은 아직 없음) | 인식된 품목 리스트(일부 실패 항목엔 `matched:false`, 최대 5개까지만 표시) | 인식 결과 확인 화면으로 이동 |
| 인식 실패/일부만 인식 → 재촬영 | `POST /api/receipts` (재요청) | 위와 동일 | — | 새 인식 결과 | 인식 결과 화면 갱신 |
| OCR 크레덴셜은 있는데 호출 자체가 실패/타임아웃(15초) | `POST /api/receipts` | 에러를 그대로 던짐(Mock으로 감추지 않음 — 가짜 인식 결과를 진짜로 착각하는 걸 방지) | — | 에러 응답(4xx/5xx, 한국어 메시지) | `alert()`로 에러 표시, 화면은 그대로(재촬영 유도) |
| 유통기한 확인·보정 후 확정 | `POST /api/receipts/:id/confirm` body `{ expiryOverrides: { [ingredientId]: "YYYY-MM-DD", ... } }` | `matched:true`인 품목만 반영. 신선식품은 재료·구매월 기준 평균 유통기한 자동 계산(`expiryOverrides`에 있으면 그 값 우선), 가공식품은 유통기한 없이 저장 | `fridge_items` INSERT(품목마다, 기존 재료여도 새 구매 배치로 추가 — 수량을 합치지 않음) | 최신 냉장고 전체 뷰(200) | "나만의 냉장고"로 이동, 최신 재고 표시 |

### 4.3 레시피 리스트 & 필터

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| "내 냉장고로 요리" 탭 진입(기본) | `GET /api/recipes?filter=full&level=all` | 현재 재고와 레시피 `ingredients_json`을 대조해 보유율(`recipeRatio`) 계산, 매칭 안 되는 건 제외 | `recipes` 전체 SELECT(캐시됨) + 현재 재고 뷰 대조 | 레시피 배열(보유율·임박재료 소진 뱃지 포함) + `total`(페이지네이션 전 전체 개수) | 레시피 카드 리스트 렌더 |
| 필터 전환(바로 가능/재료 몇 개만 더) | `GET /api/recipes?filter=full\|few&level=beginner\|mid` | 조건에 맞는 레시피만 필터링 | 동일 | 필터링된 배열 | 리스트 갱신, 페이지 1로 리셋 |
| "전체 둘러보기" 탭 + 카테고리 칩 | `GET /api/recipes?filter=all&category=반찬\|국&찌개\|...` | 냉장고 매칭 없이 카테고리·난이도만 필터링 | 동일 | 필터링된 배열 | 카테고리별 레시피 렌더 |
| "더보기" 버튼 | `GET /api/recipes?...&page=N` | 다음 페이지(기본 30개) 조회 | 동일 | 다음 페이지 배열 | 기존 목록 뒤에 이어붙임 |
| 레시피 카드 클릭 | `GET /api/recipes/:id?multiplier=` | 재료·애드온·조리 스텝 조회, 인분 배수 적용 | `recipes` 단일 SELECT(id=`api_rcp_seq`, 재료·스텝은 같은 행의 `ingredients_json`/`steps_json` 컬럼 — 별도 정규화 테이블 아님) | 레시피 상세 객체 | 레시피 상세 화면 렌더 |

### 4.4 요리완료 재고차감

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| "요리 완료" 클릭 | `POST /api/recipes/:id/cook-done` body `{ deductions: [{ id, use }, ...] }` | id별로 `use`만큼 차감. 여러 구매 배치가 있으면 유통기한이 빠른 것부터 소진(FIFO), `untracked` 재료는 애초에 `deductions`에 없음 | `fridge_items` UPDATE/DELETE(다건, 배치 단위) | 차감 전/후 요약 목록 | "맛있게 드세요" 화면 + 차감 결과 표시 |
| "사용량 수정" 후 재확정 | `POST /api/recipes/:id/cook-done` (body의 `deductions[].use` 값을 사용자가 조정) | 서버는 넘어온 `use` 값 그대로 차감(기본값과 보정값을 구분하지 않음 — 프론트가 조정된 값을 그대로 담아 보냄) | 위와 동일 | 갱신된 차감 결과 | 차감 결과 뷰 갱신 |

---

## 5. DB 테이블 설계 (실제 Supabase 스키마 — `backend/src/store.js`가 읽고 쓰는 컬럼 기준)

> 애초 설계는 `ingredients`/`recipe_ingredients`/`recipe_addons`/`recipe_steps`/`receipts`/`receipt_items` 6개 테이블로 정규화할 계획이었지만, 실제로는 **`fridge_items`·`recipes` 2개 테이블만** Supabase에 있고 나머지는 각각 다른 방식으로 처리된다:
> - **재료 마스터**는 DB가 아니라 정적 파일(`backend/src/data/ingredients.js`)의 `ingredientMap` — 100종 하드코딩.
> - **레시피의 재료/애드온/스텝**은 별도 테이블이 아니라 `recipes` 테이블 한 행 안의 JSON 컬럼(`ingredients_json`, `steps_json`).
> - **영수증 인식 이력**은 DB에 남기지 않고 서버 메모리(`receipts` 객체, 재시작 시 초기화)에만 있음.

```
fridge_items (사용자 냉장고 재고 — 재료 하나가 "구매 배치" 여러 행으로 쌓임)
  id (PK, uuid — 프론트/응답에선 dbId로 부름),
  ingredient_id (재료 마스터 id, 예: 'pork'. 커스텀 재료는 'custom_<timestamp>'),
  qty_amount (numeric, nullable — 신선식품 수량),
  qty_unit (text, nullable — 신선식품 단위: g, 개, 모 등),
  qty_label (text, nullable — 가공식품 자유 단위: '1병', '1개'),
  purchased (text, 'M/D' 형식 표시용 문자열 — 원본 날짜 아님, 표시 전용),
  expiry ('D-N'/'D+N' 형식 표시용 문자열),
  imminent (bool, D-2 이하일 때 true — 저장 시점에 계산해서 같이 넣음)
  ※ 같은 ingredient_id로 여러 행이 있으면 조회 시(enrichFridgeItem) qty_amount 합산·
    가장 이른 expiry를 대표값으로 묶어서 내려준다.

recipes (레시피 — MAFRA 공공 API 출처 533종만 유지, 단일 테이블. 12일차에 CSV 큐레이션
  출처(만개의 레시피, 최대 66,447종)를 조리순서 데이터가 없다는 이유로 전량 삭제함 —
  자세한 경위는 backlog.md 12일차 참고)
  api_rcp_seq (PK, 응답에선 id로 사용),
  title (레시피명), category (예: '반찬','밑반찬','국/탕','찌개'...),
  level ('beginner'|'mid'|'high' — 없으면 재료 수·스텝 수로 동적 계산),
  time (조리 시간, 분), image_url (nullable — 프론트에서 아직 안 씀),
  ingredients_json (배열 — [{ id?, name?, amt, untracked? }, ...]),
  steps_json (배열 — [{ desc }, ...], 없는 레시피도 있음)
```

**DB에 없는 것들**
- 재료 마스터(`ingredients`): `backend/src/data/ingredients.js`의 `ingredientMap`(정적 파일)
- 영수증 인식 이력(`receipts`/`receipt_items`): 서버 메모리(`backend/src/store.js`의 `receipts` 객체) — 재시작하면 사라짐, 확정된 것도 DB엔 흔적이 남지 않고 `fridge_items`에 반영된 결과만 남음
- 커스텀(직접 입력) 재료의 이름/이모지: `customIngredientMeta`(서버 메모리)

---

## 6. JSON 스키마 예시

**`GET /api/fridge` 응답** — 배열이 아니라 **재료 id를 키로 하는 객체**. `items[]`는 재료 하나의 구매 배치들.
```json
{
  "pork": {
    "id": "pork",
    "name": "돼지고기 앞다리",
    "emoji": "🥩",
    "category": "fresh",
    "isFresh": true,
    "items": [
      { "dbId": "39f3...", "qtyAmount": 300, "qtyUnit": "g", "qtyLabel": null, "purchased": "7/14", "expiry": "D-2", "imminent": true }
    ],
    "qtyLabel": "300g",
    "purchased": "7/14",
    "expiry": "D-2",
    "imminent": true,
    "role": "...",
    "tip": "..."
  }
}
```

**`POST /api/receipts` 응답**
```json
{
  "id": "r_1",
  "store": "이마트 신촌점",
  "date": "2026.07.20",
  "status": "partial",
  "items": [
    { "rawText": "돼지고기 앞다리 300g", "matchedIngredientId": "pork", "quantityLabel": "300g", "category": "fresh", "matched": true, "isNew": false },
    { "rawText": "OO마트 봉투대", "matchedIngredientId": null, "quantityLabel": null, "category": null, "matched": false }
  ]
}
```

**`POST /api/receipts/:id/confirm` 요청** — 품목 배열이 아니라 **재료 id → 보정 유통기한 맵**. 값을 안 넘긴 품목은 자동 계산값을 그대로 씀.
```json
{
  "expiryOverrides": {
    "pork": "2026-07-11"
  }
}
```

**`POST /api/recipes/:id/cook-done` 요청** — `adjustments`가 아니라 `deductions`, 필드명도 `ingredientId`/`consumedLevels`가 아니라 `id`/`use`.
```json
{
  "deductions": [
    { "id": "tofu", "use": 0.5 },
    { "id": "pa", "use": 2 }
  ]
}
```

---

## 7. 2차 확장 기능 — 실제 구현된 API

원래는 "안(案)"으로만 정리했던 항목들인데, 전부 실제로 구현·배포돼 있다. 경로·파라미터가 초안과 크게 달라졌다.

| 기능 | 엔드포인트 | 핵심 로직 |
|---|---|---|
| 7.1 추천 재료 세트 목록 | `GET /api/shopping/sets?match=all\|imminentRescue\|minCost\|ingredientShare\|sideShare\|fullWeek&level=all\|beginner\|mid&pickedIds=&multiplier=&shareMealCount=` | 5종의 세트(임박 재료 구출/최소 지출/식자재 쉐어링/밑반찬 쉐어링/일주일 전체 식단)를 동시에 계산해 반환. 알고리즘 상세는 [algorithms.md](./algorithms.md) 참고 |
| 7.1b 추천 세트 → 장보기 리스트 | `GET /api/shopping/list?setId=&pickedIds=&multiplier=&shareMealCount=` | 세트 하나를 골랐을 때 실제 구매 목록·예상 금액 계산 |
| 7.2 유통기한 임박 + 수량 부족 알림 | `GET /api/fridge/alerts` (서버 푸시는 미구현 — 브라우저 `Notification` API로 클라이언트에서만 처리) | `imminent` 항목 + 수량 부족 항목 계산. 크론/FCM 같은 서버 푸시는 없음 |
| 7.3 일주일 식단 루틴 추천 | `POST /api/meal-plan/weekly` body `{ pickedIds, difficulty: 'any'\|'beginner'\|'mid'\|'high', type: 'meal'\|'side' }` (문서 초안은 `GET`이었지만 실제는 `POST`) | §6(algorithms.md) 설계대로 임박 재료 한계이득 탐욕(월·수) + 최소구매 3-조합 탐색(목·토·일)으로 7일 식단 구성. `type='side'`는 반찬 쉐어링용(픽 1개) |
| 7.3b 식단 후보 목록 | `GET /api/meal-plan/candidates` | `meal-plan-picker` 화면의 레시피 검색 후보 전체 조회 |
| 7.3c 식단 → 장보기 리스트 | `POST /api/meal-plan/shopping-list` body `{ weekPlanIds, multiplier }` | 확정된 7일 식단 기준 누적 장보기 리스트 계산 |
| 7.4 식자재 가격 정보 | `GET /api/prices` | 외부 시세 API 연동 없이 정적 하드코딩 값 반환(`backend/src/store.js`의 `getPrices`) — 백로그 P2, 미착수 |

---

## 8. 주의사항

- **CORS**: FE 개발 서버(`:5174`)와 BE(`:3001`) 포트가 달라 브라우저가 기본 차단 → `backend/src/app.js`가 `cors()`로 전체 허용. 프로덕션 빌드(`express.static`으로 같은 서버가 FE도 서빙)에서는 포트가 같아 애초에 문제되지 않음.
- **상태코드**: 조회 200 / 생성 201 / 삭제 204, 실패는 400(입력값 오류)·404(id 없음)·413(파일 용량 초과)·500(그 외)으로 구분.
- **외부 OCR 의존성**: `POST /api/receipts`는 15초 타임아웃(`AbortSignal.timeout`)을 두고, 크레덴셜이 아예 없을 때만 Mock으로 폴백한다. 크레덴셜이 있는데 호출이 실패/타임아웃되면 **에러를 그대로 반환**해 프론트가 "다시 촬영해 주세요" 알림을 띄우게 한다(가짜 인식 결과를 진짜로 보여주지 않기 위한 설계 결정).
- **재고 차감의 원자성**: `cook-done`(`store.js`의 `cookDone`)은 1패스에서 모든 `deductions`가 어떤 `fridge_items` 행을 얼마나 update/delete할지 읽기 전용으로 전부 계산해두고, 2패스에서만 실제로 쓴다 — 계산 오류가 이미 다른 항목을 쓴 *이후*에 터지는 상황은 막았다. 다만 Supabase 클라이언트가 다건 트랜잭션을 지원하지 않아 2패스 쓰기 도중 실패하면 여전히 일부만 반영될 수 있음(완전한 원자성은 아님 — 진짜 트랜잭션을 보장하려면 Postgres RPC로 묶어야 하는데 아직 미착수). 대신 실패 시 에러 응답에 `partiallyApplied`(이미 반영된 id)·`failed`(실패한 id)·`notAttempted`(시도조차 안 한 id)를 담아 최소한 어디까지 반영됐는지는 추적 가능하게 함.
- **재고 데이터 모델**: `fridge_items`는 재료당 1행이 아니라 "구매 배치"마다 1행이다. 같은 재료를 두 번 사면 두 행이 쌓이고, 화면에는 합산해서 보여준다(§5 참고) — API를 새로 만들 때 이 전제를 깨지 않아야 한다.

---

## 부록: 외부 연동 완료 이력

### A. Supabase 데이터베이스 마이그레이션 ✅ 완료 (2026-07-10)

백엔드 메모리 상에 임시 저장되던 데이터(냉장고 재고 등)를 Supabase로 이관하여 데이터를 영구 보존.

**마이그레이션 순서**
1. `@supabase/supabase-js`, `dotenv` 설치 및 `.env`, `supabaseClient.js` 셋팅
2. DDL 쿼리문 작성 및 잘못된 초기 데이터 수정 완료
3. `store.js` 비동기화 및 쿼리 연동 (인메모리 로직을 DB 쿼리로 교체)
4. 컨트롤러 비동기(async/await) 수정
5. Vite 서버 프록시 설정 및 `httpClient.js` URL 변경으로 스마트폰 등 로컬 네트워크 접속 테스트 완료

**접근법**: 1단계로 사용자의 냉장고 재고(동적 데이터)만 Supabase로 우선 이관. 레시피나 기본 가격 정보 등 정적 마스터 데이터는 추후 사용자별 커스텀 기능이 생기면 그때 이전 권장.

### B. 공공데이터(농림축산식품부) 레시피 API 연동 ✅ 완료 (2026-07-10)

식품안전나라(COOKRCP01) 데이터를 걷어내고, 농림축산식품부 공공데이터포털 API 키를 활용해 537종의 표준 한식 홈쿠킹 레시피를 병렬 청크 다운로드 기법으로 수집하여 Supabase DB에 마이그레이션 완료.

**구현 상세**
- `fetchRecipes.js`: 공공데이터 API 호출 → 정제 → Supabase `recipes` 테이블 일괄 insert
- `recipesController.js`: `listRecipes` 및 `getRecipeDetail`을 정적 파일이 아닌 Supabase 테이블에서 데이터를 가져오도록 수정
- 재료 파싱: 줄글 형태의 재료 데이터(`RCP_PARTS_DTLS`)를 정규식으로 추출하여 표준 재료 ID(`pork`, `onion`, `pa` 등) 배열로 자동 변환
- 요리 종류(`RCP_PAT2`) 컬럼 추가 및 카테고리 탭 분류(`국/찌개`, `반찬`, `일품요리`, `면/만두`, `밥/죽`) 연동
