# 공공데이터(식품안전나라) 레시피 API 연동 계획

식품안전나라의 **조리식품 레시피 API (COOKRCP01)**를 연동하여 앱의 레시피 데이터를 대폭 확장하기 위한 구현 계획입니다.

## 1. 저장 방식: Supabase DB (채택)
식품안전나라 API에서 제공하는 1,000개 이상의 레시피를 Supabase의 `recipes` 테이블에 저장합니다.
- 검색 및 필터링 속도 향상
- 추후 사용자 레시피 추가 기능 등의 확장성 확보

## 2. 재료 파싱(Parsing) 수준: 자동 파싱 매칭 (채택)
API에서 제공하는 줄글 형태의 재료 데이터(`RCP_PARTS_DTLS`)를 정규식(Regex)을 돌려 추출하고, 저희 표준 재료(pork, onion, pa 등) 배열로 자동 변환(Mapping)하는 파서를 작성합니다.

---

## 3. 구현 상세 사항

### 3.1 Supabase 레시피 테이블 생성
- **테이블명**: `recipes`
- **컬럼**:
  - `id` (UUID 또는 원본 일련번호)
  - `title` (요리명)
  - `image_url` (대표 이미지)
  - `ingredients` (파싱된 재료 ID 배열 혹은 원본 텍스트 혼합)
  - `steps` (조리 순서 및 이미지 배열)
  - `level` (난이도 - 임의 지정 혹은 분석)
  - `time` (조리시간 - 임의 지정 혹은 분석)

### 3.2 백엔드 데이터 수집/파싱 스크립트 작성
- **`fetchRecipes.js`**: 식품안전나라 API(`http://openapi.foodsafetykorea.go.kr/api/sample/COOKRCP01/json/1/1000`)를 호출하여 데이터를 다운받고, 정제 후 Supabase에 일괄 `insert` 하는 스크립트 작성

### 3.3 백엔드 컨트롤러 수정
- **`recipesController.js`**: `listRecipes` 및 `getRecipeDetail` 함수를 수정하여 기존 정적 파일이 아닌 Supabase `recipes` 테이블에서 데이터를 가져오도록 변경
