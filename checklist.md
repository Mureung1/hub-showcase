# 작업 체크리스트

이번 주(2주차) 목표: **냉장고 재료를 고르면 그 재료로 만들 수 있는 레시피가 뜨는 것** — 이 기능 하나만 완성한다. 그 외 작업(레시피 상세, 디자인 다듬기, KAMIS, 리브랜딩 텍스트 등)은 이번 주 범위가 아니다.

## 냉장고 재료 선택 → 레시피 추천
- [x] 냉장고 화면(`FridgePage.jsx`)에서 재료 칩 선택 → `localStorage`에 저장
- [x] Supabase `recipes` 테이블에 레시피 데이터 저장 (`scripts/seedRecipes.js`로 시딩)
- [x] Express API(`GET /api/recipes?matchNames=...`)로 Supabase 조회 (`server/routes/recipes.js`)
- [x] 홈 화면(`Home.jsx`)이 이 API를 호출해서 추천 리스트 표시
- [ ] 브라우저에서 실제로 재료 선택 → 완료 → 추천 리스트까지 처음부터 끝까지 확인
- [ ] 확인 중 발견되는 버그 수정
