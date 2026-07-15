# 데이터 모델 정리

## 테이블

| 테이블 | 무엇을 저장하나 |
|---|---|
| `users` | 회원 계정 (이메일, 비밀번호, 이름) |
| `symptoms` | "피로감", "안구건조" 같은 증상 이름 목록 |
| `ingredients` | "루테인", "비타민 B군" 같은 성분 이름 + 1일 상한 섭취량 |
| `products` | 판매 중인 건강기능식품 (이름, 회사, 가격, 인증 여부) |
| `diagnoses` | 사용자가 "진단 시작하기"를 누른 기록 1건 |
| `diagnosis_symptoms` | 그 진단에서 어떤 증상들을 골랐는지 (다대다 연결) |
| `diagnosis_ingredients` | 그 진단에서 어떤 성분을 추천받았는지 (다대다 연결) |
| `product_ingredients` | 어떤 제품에 어떤 성분이 몇 mg 들어있는지 |
| `user_supplements` | 사용자가 "지금 먹고 있다"고 입력한 영양제 |

## 화면 → 테이블

| 화면 | 필요한 데이터 | 담당 테이블/컬럼 |
|---|---|---|
| 홈 (증상 체크) | 증상 목록, 고른 증상 저장 | `symptoms`, `diagnoses` + `diagnosis_symptoms` |
| 성분 분석 | 추천 성분, 복용 중 영양제 입력 | `ingredients`, `diagnosis_ingredients`, `user_supplements` |
| 성분 중복 체크 | 추천 성분 vs 복용 중 영양제 비교, 상한 섭취량 | `ingredients.upper_limit_mg`, `user_supplements`, `diagnosis_ingredients` |
| 제품 추천 | 추천 성분을 담은 제품 목록 | `products`, `product_ingredients` |
| 상세 | 인증 정보, 가격, 구매 링크 | `products.haccp_certified`, `test_report_url`, `smartstore_url` |
