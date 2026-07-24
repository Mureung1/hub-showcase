# Mock Data Guide

현재 냉장고 재료와 레시피는 Mock 데이터를 사용하지 않습니다.

## 실제 데이터 연결

- 냉장고 재료: Supabase `ingredients` 테이블과 `/api/ingredients`
- 레시피 추천: Gemini 기반 `POST /api/recommendations`
- 추천 캐시: Supabase `recipe_recommendation_cache` 테이블

프런트엔드는 추천 탭에 진입하면 실제 API를 호출합니다. 최초 3개를 표시하고 `다른 추천 보기`마다 기존 fingerprint를 제외한 3개를 누적하여 최대 15개까지 제공합니다.

## 남아 있는 규칙형 데이터

`frontend/src/data/mockNaggingRules.js`는 레시피나 재고 데이터가 아니라 인스턴트 식품 선택 시 표시할 코칭 문구와 보완 재료 우선순위를 담고 있습니다. 향후 사용자별 말투 설정이나 서버 규칙으로 이전할 수 있습니다.

## 기본 양념 정책

소금, 후추, 식용유, 고춧가루, 간장, 설탕, 식초, 다진 마늘은 추천 시스템에서 항상 보유한 것으로 가정합니다. 프런트엔드에서는 이 항목을 일반 냉장고 재료 목록에서 분리합니다.
