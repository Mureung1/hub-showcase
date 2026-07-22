Parent: #43

## 변경 배경

기존 식품안전나라 COOKRCP01 레시피 동기화 방식은 외부 데이터 의존성과 정규화 부담이 커서 제외한다. 보유 재료를 기준으로 Gemini 무료 API가 레시피를 생성하고, 서버가 입출력과 추천 정책을 검증하는 방식으로 전환한다.

## 목표

Supabase의 실제 보유 재료와 사용자가 선택한 추천 상태를 이용해, 현재 조리 가능한 레시피 3개를 구조화된 JSON으로 제공한다. 프런트는 mock 레시피 없이 이 API 결과를 사용한다.

엔드포인트: `POST /api/recommendations`

## 모델·보안

- 모델: `gemini-3.1-flash-lite`
- Gemini API 키는 서버 환경변수에서만 사용하고 프런트에 노출하지 않는다.
- 로그에는 성공 여부, 모델, 소요 시간, 생성 개수, 오류 코드만 기록한다.
- 전체 재료 목록, 전체 Gemini 응답, API 키는 로그에 기록하지 않는다.

## 입력 규격

### 데이터 출처

- 서버가 Supabase에서 보유 재료를 직접 조회한다.
- DB 전체를 그대로 전달하지 않고 업무 필드 허용 목록을 적용한다.

### Gemini 전달 허용 필드

- `name`, `category`, `subcategory`, `tags`
- `quantity`, `unit`, `quantityMode`
- `storage`, `expirationType`, `expirationDate`, `storedAt`, `daysRemaining`
- `isStaple`, `isInstant`, `isPrepared`
- 서버가 계산한 `priorityScore`

### 제외 필드

- DB 내부 ID
- 생성·수정 시각
- 표시용 아이콘
- 사용자 메모
- Supabase 연결 정보

### 요청 옵션

```json
{
  "mode": "noFire | quick | balanced",
  "maxMissingIngredients": 0,
  "batchSize": 3,
  "excludedRecipeFingerprints": [],
  "allergens": [],
  "excludedIngredients": [],
  "dietaryPreferences": []
}
```

- 기본 양념(소금, 후추, 식용유, 고춧가루, 간장, 설탕, 식초, 다진 마늘)은 항상 보유한 것으로 가정한다.
- `allergens`, `excludedIngredients`, `dietaryPreferences`는 향후 확장을 위한 선택 필드이며 현재 UI에서는 빈 배열을 전달한다.

## 출력 규격

```json
{
  "recipes": [
    {
      "id": "server-generated-id",
      "fingerprint": "sha256-fingerprint",
      "name": "삼겹살 대파 볶음",
      "servings": 1,
      "requiredIngredients": [
        { "name": "삼겹살", "amount": 200, "unit": "g" }
      ],
      "optionalIngredients": [
        { "name": "대파", "amount": 0.5, "unit": "대" }
      ],
      "cookingTime": 20,
      "difficulty": "easy | normal",
      "cookingMethod": "noFire | fire",
      "dishType": "stirFry | riceBowl | soup | stew | noodle | salad | sandwich | other",
      "effortLevel": "low | medium",
      "recommendationReasons": ["소비 우선순위가 높은 삼겹살을 사용할 수 있어요"],
      "nutritionTags": ["nutrition:protein", "nutrition:vegetable"],
      "nutritionSummary": "단백질과 채소를 함께 사용하는 메뉴",
      "steps": ["재료를 손질해요", "충분히 익혀요"],
      "safetyNotes": [],
      "missingIngredients": []
    }
  ],
  "meta": {
    "source": "gemini | cache",
    "model": "gemini-3.1-flash-lite",
    "batchNumber": 1,
    "maxBatches": 5,
    "maxRecipes": 15,
    "generatedAt": "2026-07-22T07:15:19.911Z",
    "expiresAt": "2026-07-22T15:00:00.000Z"
  }
}
```

- 한 번에 현재 선택 상태에 맞는 레시피 3개만 반환한다.
- 숫자형 열량·탄수화물·단백질·지방 추정치는 제공하지 않는다.
- 재료는 이름·사용량·단위를 가진 객체로 반환한다.

## 추천·검증 정책

- 부족 재료는 요청 설정에 따라 0개 또는 최대 1개까지 허용한다.
- 소비기한 임박 재료는 점수 가중치만 적용하며 특정 개수의 레시피에 강제 포함하지 않는다.
- 소비기한이 지난 재료는 추천에서 제외하고 D-day 0 재료는 경고와 함께 허용한다.
- 서로 다른 레시피명과 `dishType`을 반환한다.
- 동일 재료, 주재료, 재료 조합의 반복은 허용한다.
- 서버가 재료 별칭과 공백을 정규화한다. 일치하지 않는 재료는 부족 재료로 계산한다.
- 중복은 정규화한 레시피명 + 핵심 재료 조합 + `dishType` fingerprint로 판정한다.
- Gemini의 JSON은 Zod 스키마와 서버 정책을 모두 통과해야 한다.
- Gemini에 전달하는 JSON Schema는 공급자가 지원하는 타입·필수 필드·enum을 강제하고, 개수·길이·범위 같은 세부 제약은 Zod가 강제한다.

## 추가 추천·캐시

- 최초 3개를 반환한다.
- `다른 추천 보기` 요청마다 기존 fingerprint를 제외하고 3개를 추가 생성한다.
- 동일 조건에서 최대 5회, 총 15개까지 제공한다.
- 재료, 추천 상태, 부족 재료 설정이 같으면 Supabase 캐시를 재사용한다.
- 재료 등록·수정·삭제 또는 추천 조건 변경 시 기존 캐시를 무효화한다.
- 캐시는 한국 시간(`Asia/Seoul`) 기준 같은 날짜에만 유효하다.
- 한국 시간 기준 자정이 지나면 소비기한 잔여일과 우선순위를 다시 계산하고 기존 캐시를 만료한다.

## 오류 처리

- 마지막 성공 결과가 있으면 유지하고 오류 안내와 재시도 버튼을 제공한다.
- 마지막 성공 결과가 없으면 빈 오류 상태와 재시도 버튼을 제공한다.
- mock 레시피로 대체하지 않는다.

### 오류 코드

- `400 INVALID_RECOMMENDATION_REQUEST`: 요청 옵션 형식 오류
- `422 NO_AVAILABLE_INGREDIENTS`: 만료 제외 후 추천 가능한 재료 없음
- `502 GEMINI_REQUEST_FAILED`: Gemini 요청 실패
- `502 GEMINI_INVALID_RESPONSE`: Gemini 응답의 JSON 또는 Zod 형식 오류
- `502 INVALID_RECOMMENDATION`: 생성 결과가 부족 재료·중복·모드 정책 위반
- `503 INGREDIENTS_UNAVAILABLE`: Supabase 재료 조회 실패
- `503 GEMINI_RATE_LIMITED`: Gemini 무료 사용 한도 초과
- `503 GEMINI_TIMEOUT`: Gemini 생성 시간 초과
- `503 GEMINI_UNAVAILABLE`: Gemini 네트워크 연결 실패

캐시 읽기·쓰기 실패는 서버에 경고 로그를 남기고, 가능한 경우 Gemini 생성 결과를 계속 반환한다.

## 이번 작업 범위에서 제외

- 특별 메뉴 생성 및 특별 메뉴 전용 화면
- 알레르기·채식·특정 식품 제외 설정 UI
- AI가 추정한 숫자형 영양 정보
- 실제 재고 자동 차감

레시피는 기본 1인분 사용량을 반환한다. 실제 재고 차감은 후속 작업에서 `조리 완료` 확인 후 처리한다.

## 작업

- [x] Gemini 환경변수 검증 및 서버 전용 클라이언트 구성
- [x] 요청·응답 Zod 스키마 구현
- [x] 재료 허용 목록 변환, 소비기한·태그 가중치 계산
- [x] Gemini 구조화 출력 프롬프트 구현
- [x] `POST /api/recommendations` 구현
- [x] 재료명 별칭 정규화와 부족 재료 검증
- [x] recipe fingerprint 중복 제거
- [x] Supabase 추천 캐시 테이블과 무효화 정책 구현
- [x] 프런트 추천 상태·추가 추천·오류 UI 연동
- [x] 특별 메뉴 UI와 mock 레시피 의존성 제거
- [x] 단위 테스트와 실제 API 통합 테스트
- [x] 화면 검증

## 완료 기준

- 실제 Supabase 보유 재료로 현재 상태에 맞는 레시피 3개가 반환된다.
- 응답은 Zod 스키마를 통과하고 허용된 부족 재료 개수를 넘지 않는다.
- 소비기한이 지난 재료가 추천에 포함되지 않는다.
- 추가 추천은 기존 fingerprint와 중복되지 않으며 최대 15개까지 제공된다.
- 같은 재료와 조건에서는 유효한 Supabase 캐시를 재사용한다.
- 한국 시간 기준 날짜가 바뀌면 같은 재료와 조건이어도 기존 캐시를 사용하지 않는다.
- Gemini 장애 시 마지막 성공 결과 또는 재시도 가능한 오류 상태를 제공한다.
- 프런트에서 mock 레시피와 특별 메뉴 영역을 사용하지 않는다.
- API 키와 전체 재료·응답 데이터가 로그 또는 프런트 번들에 노출되지 않는다.

예상 작업량: 명세 확정 후 재산정
