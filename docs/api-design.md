# 자취생 냉장고 레시피 앱 — API 설계 기획안

> 기반 문서: [../기획서.md](../기획서.md), 프로토타입: [../index.html](../index.html)
> 방법론: `web-service-dev` 스킬의 7단계 중 1~4단계(설계 단계)를 적용. 5~7단계(BE 구현·FE 연동·검증)는 실제 개발 착수 시 진행.

## 0. 설계 범위와 전제

- **MVP 4개 기능**(나만의 냉장고 / 영수증 촬영 인식 / 레시피 리스트&필터 / 요리완료 재고차감)은 요청→응답 흐름표까지 상세 설계.
- **2차 확장 기능**(추천 재료 세트, 레시피 상세 조리모드, 유통기한 알림, 식단 루틴, 가격 정보)은 API 개요만 정리(§7).
- **인증/로그인은 범위 밖으로 가정** — 기획서에 로그인 시나리오가 없어 단일 사용자 기준으로 설계. DB에는 확장 대비로 `user_id`만 예비 컬럼으로 남김.
- **외부 연동 2곳**을 전제로 함: ① 영수증 OCR(자체 구현 대신 외부 OCR API 호출), ② 식자재 시세(2차 확장, 외부 가격 데이터 소스). 둘 다 우리 BE가 중계자 역할.

## 1. 기술 지도 (FE / BE / DB)

| 층 | 무엇을 둘까 | 어떤 기술(제안) |
|---|---|---|
| FE | 냉장고 목록/상세, 영수증 촬영·확인 화면, 레시피 리스트·필터·상세·조리모드, 요리완료 차감 화면 | React (모바일 웹 기준, 현재 프로토타입은 정적 HTML/CSS/JS) |
| BE | 재고 CRUD, 영수증 OCR 결과 파싱·매칭, 레시피-재고 매칭 알고리즘, 조리완료 시 재고 일괄 차감 로직 | Node.js + Express |
| DB | 재고(fridge_items), 재료 마스터(ingredients), 레시피(recipes 등), 영수증 인식 이력(receipts) | PostgreSQL (Supabase) |
| 외부 API | 영수증 OCR(품목명·수량 추출), (확장)식자재 시세 | 예: Naver Clova OCR / Google Vision 등 — BE가 프록시 |

## 2. 화면별 API 사용 지점 전수 조사

기획서의 "화면 흐름" 3종 + IA를 기준으로, 실제 서버 통신이 필요한 지점만 추림(단순 화면 전환·로컬 상태 토글은 제외).

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

## 3. API 엔드포인트 목록 (MVP)

| 메서드 | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/fridge` | 냉장고 재고 전체 조회 (홈 요약도 이 응답을 축약해서 사용) |
| `POST` | `/api/fridge` | 재고 아이템 수동 추가 |
| `PATCH` | `/api/fridge/:id` | 재고 아이템 수정 (수량/유통기한) |
| `DELETE` | `/api/fridge/:id` | 재고 아이템 삭제 |
| `POST` | `/api/receipts` | 영수증 이미지 업로드 → OCR 인식 결과 반환 |
| `POST` | `/api/receipts/:id/confirm` | 인식 결과(보정 포함) 확정 → 냉장고에 일괄 반영 |
| `GET` | `/api/recipes?filter=maxUse\|complete100&level=beginner` | 냉장고 재고 매칭 기반 레시피 목록 |
| `GET` | `/api/recipes/:id` | 레시피 상세(재료·애드온·조리 스텝) |
| `POST` | `/api/recipes/:id/cook-done` | 조리 완료 → 재고 일괄 차감(사용량 보정 값 포함 가능) |

## 4. 기능별 요청→응답 흐름표

### 4.1 나만의 냉장고 (재고관리)

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| 홈 진입 | `GET /api/fridge?summary=true` | 임박(`imminent`) 아이템·부족 여부 계산 | `fridge_items` JOIN `ingredients` SELECT | 임박 리스트 + 요약 카운트 | "오늘의 냉장고" 카드 렌더 |
| 냉장고 화면 진입 | `GET /api/fridge` | 전체 재고 조회, 신선/가공 그룹핑 | `fridge_items` 전체 SELECT | 재고 배열 | 재고 목록 렌더 |
| 재료 직접 추가 저장 | `POST /api/fridge` | 입력값 검증(수량 단위·유통기한) 후 저장 | `fridge_items` INSERT | 생성된 아이템(201) | 목록에 한 줄 추가 |
| 재고 수정(수량/유통기한) | `PATCH /api/fridge/:id` | id 존재 확인 후 필드 업데이트 | `fridge_items` UPDATE | 수정된 아이템(200) | 해당 줄 갱신 |
| 재고 삭제 | `DELETE /api/fridge/:id` | id 존재 확인 후 삭제 | `fridge_items` DELETE | 없음(204) | 해당 줄 사라짐 |

### 4.2 영수증 촬영 인식

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| 영수증 촬영 완료 | `POST /api/receipts` (multipart, 이미지) | 이미지 저장 → 외부 OCR API 호출 → 품목명 매칭(`ingredients` 마스터와 유사도 매칭) | `receipts` INSERT, `receipt_items` INSERT(매칭 결과) | 인식된 품목 리스트(일부 실패 항목엔 `matched:false`) | 인식 결과 확인 화면으로 이동 |
| 인식 실패/일부만 인식 → 재촬영 | `POST /api/receipts` (재요청) | 위와 동일 | 새 `receipts` 레코드 | 새 인식 결과 | 인식 결과 화면 갱신 |
| 유통기한 확인·보정 후 확정 | `POST /api/receipts/:id/confirm` | 신선식품은 재료·구매월 기준 평균 유통기한 자동 계산(사용자 보정값 우선), 가공식품은 사용자 입력값 사용 → 냉장고에 반영(기존 재료면 수량 가산, 신규면 생성) | `fridge_items` UPSERT, `receipt_items.confirmed=true` UPDATE | 반영된 재고 요약(201) | "나만의 냉장고"로 이동, 최신 재고 표시 |

### 4.3 레시피 리스트 & 필터

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| 레시피 화면 진입(기본 필터) | `GET /api/recipes?filter=maxUse` | 현재 재고와 `recipe_ingredients` 대조해 보유율(`recipeRatio`) 계산, 정렬 | `recipes` JOIN `recipe_ingredients` + 현재 `fridge_items` 대조 | 레시피 배열(보유율·임박재료 소진 뱃지 포함) | 레시피 카드 리스트 렌더 |
| 필터 전환(100% 완성/난이도) | `GET /api/recipes?filter=complete100&level=beginner` | 조건에 맞는 레시피만 필터링 | 동일 | 필터링된 배열 | 리스트 갱신 |
| 레시피 카드 클릭 | `GET /api/recipes/:id` | 재료·애드온·조리 스텝 조회 | `recipes`, `recipe_ingredients`, `recipe_addons`, `recipe_steps` SELECT | 레시피 상세 객체 | 레시피 상세 화면 렌더 |

### 4.4 요리완료 재고차감

| 화면 동작 | 요청(메서드+경로) | 서버 처리 | DB | 응답 | 화면 변화 |
|---|---|---|---|---|---|
| "요리 완료" 클릭 | `POST /api/recipes/:id/cook-done` | 레시피 기준 재료별 소비량만큼 `fridge_items` 차감(`untracked` 재료 제외) | `fridge_items` UPDATE(다건) | 차감 결과 목록(차감 전/후 수량) | "맛있게 드세요" 화면 + 차감 결과 표시 |
| "사용량 수정" 후 재확정 | `POST /api/recipes/:id/cook-done` (body에 보정된 `adjustments` 포함) | 서버는 기본값 대신 보정값으로 차감 재계산 | `fridge_items` UPDATE(보정값) | 갱신된 차감 결과 | 차감 결과 뷰 갱신 |

## 5. DB 테이블 설계

```
ingredients (재료 마스터)
  id (PK), name, emoji, category('fresh'|'processed'),
  default_unit_labels (json, 예: ['한단','반단','1/4단','소진']),
  avg_shelf_life_days (json, 계절별 평균 유통기한),
  role_desc, storage_tip

fridge_items (사용자 냉장고 재고)
  id (PK), user_id (nullable, 확장 대비),
  ingredient_id (FK -> ingredients),
  quantity_label (예: '반모', '300g'),
  quantity_level_index (levels 배열 내 현재 위치, 신선식품용),
  purchased_at, expiry_date,
  category ('fresh'|'processed', ingredients와 동일하지만 조회 편의상 비정규화)

recipes (레시피)
  id (PK), name, emoji, level ('beginner'|'intermediate'|'advanced'),
  time_minutes, note

recipe_ingredients (레시피 필요 재료)
  id (PK), recipe_id (FK), ingredient_id (FK, nullable if untracked),
  amount_label, is_untracked (양념류 등 재고 추적 제외)

recipe_addons (레시피 응용 옵션)
  id (PK), recipe_id (FK), ingredient_id (FK),
  label, description, order_after (몇 번째 스텝 뒤에 추가할지), step_json

recipe_steps (레시피 조리 스텝)
  id (PK), recipe_id (FK), step_order,
  emoji, text, tip

receipts (영수증 인식 이력)
  id (PK), user_id (nullable), image_url,
  ocr_status ('success'|'partial'|'failed'), created_at

receipt_items (영수증 인식 품목)
  id (PK), receipt_id (FK), raw_text,
  matched_ingredient_id (FK, nullable),
  quantity_label, category_guess, expiry_date_guess,
  confirmed (bool, 사용자 확정 여부)
```

## 6. JSON 스키마 예시

**`GET /api/fridge` 응답**
```json
{
  "items": [
    {
      "id": "pork",
      "name": "돼지고기 앞다리",
      "emoji": "🥩",
      "category": "fresh",
      "quantityLabel": "300g",
      "expiry": "D-2",
      "imminent": true
    }
  ]
}
```

**`POST /api/receipts` 응답**
```json
{
  "receiptId": "r_20260709_01",
  "status": "partial",
  "items": [
    { "rawText": "돼지고기 앞다리 300g", "matchedIngredientId": "pork", "quantityLabel": "300g", "matched": true },
    { "rawText": "OO마트 봉투대", "matchedIngredientId": null, "matched": false }
  ]
}
```

**`POST /api/receipts/:id/confirm` 요청**
```json
{
  "items": [
    { "matchedIngredientId": "pork", "quantityLabel": "300g", "expiryDate": "2026-07-11" },
    { "matchedIngredientId": null, "skip": true }
  ]
}
```

**`POST /api/recipes/:id/cook-done` 요청(사용량 보정 포함)**
```json
{
  "adjustments": [
    { "ingredientId": "tofu", "consumedLevels": 1 },
    { "ingredientId": "pa", "consumedLevels": 2 }
  ]
}
```

## 7. 2차 확장 기능 — API 개요

| 기능 | 엔드포인트(안) | 핵심 로직 |
|---|---|---|
| 7.1 추천 재료 세트 | `GET /api/shopping-sets?filter=maxVariety\|complete100&level=` | 현재 재고 + 목표 레시피 수를 최대화하는 최소 구매 조합 계산(장바구니 최적화) |
| 7.2 유통기한 임박 알림 | `GET /api/fridge/alerts` (+ 서버 푸시: 예 FCM) | `expiry_date` 임박 항목 조회 후 크론으로 푸시 발송 |
| 7.3 일주일 식단 루틴 추천 | `GET /api/meal-plan/weekly` | 레시피 매칭 결과가 없을 때 대체 루틴(일반 식단 템플릿) 반환 |
| 7.4 식자재 가격 정보 | `GET /api/prices?ingredientId=` | 외부 시세 API를 주기적으로 수집해 `price_snapshots`에 캐싱 후 서빙(실시간 직접 호출은 비용/속도상 비권장) |

## 8. 주의사항

- **CORS**: FE(예 `:5173`)와 BE(예 `:3000`) 포트가 다르면 브라우저가 기본 차단 → BE에서 CORS 허용 필요.
- **상태코드**: 조회 200 / 생성 201 / 삭제 204, 실패는 400(입력값 오류)·404(id 없음)로 구분.
- **외부 OCR 의존성**: `/api/receipts`는 외부 API 응답 지연·실패에 대비해 타임아웃과 "재촬영 요청" 폴백을 반드시 처리(기획서의 "인식 실패 시 재촬영" 시나리오와 일치).
- **재고 차감의 원자성**: `cook-done`은 여러 `fridge_items`를 한 번에 갱신하므로 트랜잭션으로 묶어 일부만 반영되는 상황을 방지.
