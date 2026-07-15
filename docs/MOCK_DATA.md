# Mock Data Guide

백엔드 API 연결 전 냉장고 화면과 추천 흐름에서 사용하는 mock data 구조를 설명합니다.

## 소스 파일

- 재료 기본값·분류: `src/data/ingredientDefaults.js`
- 냉장고 재료: `src/data/mockIngredients.js`
- 인스턴트 코치 규칙: `src/data/mockNaggingRules.js`
- 메뉴와 레시피: `src/App.jsx`의 `menusByFilter`
- 추천 mock 응답: `src/services/recommendations.js`
- 재료 등록 mock 응답: `src/services/ingredients.js`

## 재료 구조

```js
{
  id: "ramen",
  name: "라면",
  category: "instant",
  subcategory: null,
  tags: [],
  quantity: 3,
  unit: "개",
  quantityMode: "exact",
  storage: "room",
  expirationType: "relative",
  expirationDate: null,
  shelfLifeDays: 180,
  storedAt: "2026-07-15",
  recommendedUseBy: null,
  nextCheckDate: null,
  isStaple: true,
  isInstant: true,
  isPrepared: false,
  isLongTerm: false,
  icon: "🍜",
  memo: "",
}
```

수량은 계산 가능한 숫자와 단위로 분리합니다. `storage`는 `fridge`, `freezer`, `room` 중 하나이며, 분류와 보관 위치에 맞는 기본 보관 일수는 `DEFAULT_SHELF_LIFE_DAYS`에서 관리합니다.

## 소비기한 표시 규칙

- 일반 식품: 소비기한까지 남은 일수를 `D-N`으로 표시합니다.
- 냉동 식품: 냉동 보관 주차와 권장 사용 시점을 함께 표시합니다.
- 장기 보관 식품: 임의의 짧은 소비기한 대신 `장기 보관 식품`과 다음 보유 확인일을 표시합니다.
- 새 재료 등록: 분류·보관 위치와 입력한 남은 일수로 표준 구조를 생성합니다.

## 인스턴트 코치 흐름

1. 사용자가 재료 카드에서 요리 찾기를 선택합니다.
2. `flags.isInstant`가 `true`이면 추천 화면으로 바로 이동하지 않고 코치 메시지를 엽니다.
3. 현재 냉장고에서 계란, 대파, 부추, 양파, 만두, 치즈 순으로 보완 재료를 찾습니다.
4. 보완 재료가 있으면 해당 재료를 넣는 레시피와 기본 레시피 중 하나를 고를 수 있습니다.
5. 보완 재료가 없으면 선택을 막지 않는 기본 안내 문구와 기본 레시피 선택을 제공합니다.

메시지 문구와 우선순위는 `mockNaggingRules.js`에 분리되어 있어 향후 사용자별 말투 설정이나 서버 규칙으로 교체할 수 있습니다.

## 임시 오류 확인

- 이름이 `오류 테스트`인 재료를 등록하면 재료 등록 오류를 재현합니다.
- 같은 이름의 재료를 보유하면 추천 로딩 오류를 재현합니다.

이 동작은 React mock 단계에서만 사용하며 실제 API 연결 시 서비스 함수와 함께 교체합니다.
