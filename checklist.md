# 작업 체크리스트

이번 주(3주차) 목표:
1. **음식종류·시간 필터 구현** — 메인 작업
2. **기니 마스코트를 "재료 조금만 사면 돼요" 섹션에도 추가** — 메인 작업과 독립적, 짬날 때 병행
3. **네이버 최저가 링크 실제 동작 확인** — 메인 작업과 독립적, 짬날 때 병행 (구현은 돼 있지만 브라우저에서 실제로 확인한 적 없음)
4. **홈 화면 추천 0건일 때 빈 화면 대신 기니 카드 보여주기** — 메인 작업과 독립적, 짬날 때 병행

## 1. 음식종류·시간 필터 구현
- [x] 레시피 데이터에 조리 시간 필드 추가 (`src/data/mockRecipes.js`) — 지금은 `categoryId`(음식종류)만 있고 시간 데이터가 없어서 UI보다 먼저 해야 함
- [x] 음식종류 필터 UI (기존 `categories.js` 기반) — `TYPE_LABELS`(메인음식/반찬/간식) 기준
- [x] 시간 필터 UI
- [x] 필터 적용 시 추천 리스트(`Home.jsx`)에 반영되는지 확인 — playwright로 실제 브라우저 동작 확인 완료

## 2. 기니 마스코트 — "재료 조금만 사면 돼요" 섹션에도 추가
- [ ] `Home.jsx`의 "재료 조금만 사면 돼요" 섹션에 `mascotWave` 이미지 추가 (현재 "지금 바로 만들 수 있어요" 섹션에만 있음)

## 3. 네이버 최저가 링크 실제 동작 확인
- [x] 백엔드 서버 켜고(`npm run dev:api`) 레시피 상세 페이지에서 부족한 재료 클릭 → `PurchaseLinkPanel`에 뜨는 네이버 최저가가 실제 상품·가격인지 확인 — 브라우저로 확인 완료
- [x] 문제 있으면 버그 수정 — 확인 중 발견한 문제 수정: (1) 라면 4종 세트 같은 묶음상품이 최저가로 잡히는 문제 → `naverClient.js`에 `isBundleCandidate` 필터 추가(단일상품 우선, 부족하면 묶음상품으로 채움), (2) 상품명이 화면에 아예 안 보여서 묶음상품인지 클릭 전엔 알 수 없던 문제 → `PurchaseLinkPanel`에 원본 상품명(1줄 truncate) 표시 추가, (3) 개당/100g당/100ml당 단가 계산(`parseUnitPrice`) 추가해서 가격 옆에 캡션으로 표시
- [x] "네이버에서 더 보기" 링크(`buildNaverSearchUrl`)가 실제 네이버 쇼핑 검색 결과로 연결되는지 확인 — `href`가 `search.shopping.naver.com/search/all?query=...` 형태로 정상 생성됨을 확인

## 4. 홈 화면 추천 0건일 때 빈 화면 대신 기니 카드 보여주기
- [x] `src/data/selectors.js`에 `getQuickRecipes(recipes, limit=3)` 추가 — `cookTimeMinutes` 오름차순, 동률이면 `totalCost` 오름차순
- [x] `src/components/MenuCard.jsx`에 `timeLabel` prop 추가 — `missingCount`와 같은 배지 스타일로 렌더링
- [x] `Home.jsx` — `!hasAnyMatch && closestRecipes.length === 0`일 때 기존 회색 안내 문구 대신 기니 카드(`끼니캐릭터.png` + 말풍선 톤 카피 + "재료 고르러 가기" CTA) + "그래도 빨리 만들 수 있는 요리" 3개(`getQuickRecipes`) 렌더링
- [x] `FridgePage.jsx` — "완료" 클릭 시 선택한 재료가 전부 조미료(또는 0개)면 `window.confirm`으로 한 번 더 확인 후 진행, 취소하면 그대로 FridgePage에 머무름
- [x] `DESIGN_SYSTEM.md` 컴포넌트 패턴 카탈로그에 `empty-state-card` 행 추가
- [x] playwright로 Home.jsx 빈 카드 노출 + FridgePage confirm 취소/확인 두 경로 모두 브라우저에서 확인

## 백로그 (이번 주 범위 아님)
- [ ] `끼니캐릭터.png`(`src/assets/`, git 미추적)는 임시 목업 일러스트 — 홈 화면 빈 추천 카드(`Home.jsx`)에 자리만 잡아둔 것이고 나중에 최종본으로 교체 필요. 최종본은 캐릭터에 요리사 모자 씌운 버전으로 제작
- [x] 홈 화면 로딩 중 표시(`Home.jsx`)의 마스코트를 정적 이미지 대신 영상(`src/assets/로딩-애니메이션.mp4`, 냉장고를 들여다보는 끼니)으로 교체, 헤더에 개발용 "로딩" 링크(`/home?loading=1`)도 추가해 재료 선택 없이 바로 확인 가능. fetch가 너무 빨리 끝나 로딩 문구가 안 보이던 문제도 최소 노출 시간(1.2초)을 둬서 해결
- [ ] 앱 전체 카피/마이크로카피를 끼니 1인칭 말투로 통일하는 아이디어 — 이번에 홈 빈 상태 카드와 FridgePage confirm 문구에 끼니 톤을 부분 적용해봤는데, 에러 메시지·빈 목록 문구 등 다른 화면도 전부 통일하면 좋을 것 같음. 범위가 커서 이번 주 범위 밖, 나중에 별도 작업으로 검토
- [ ] 컴포넌트(사진/이미지 포함)를 더 잘게 쪼개서 만들기 — 지금 `Home.jsx`처럼 로딩 화면 같은 마크업이 큰 컴포넌트 안에 인라인으로 여러 번 반복되는 경우가 있음, 재사용 단위로 분리
- [ ] if문 안에 if문(중첩 조건문) 없애기 — 조건 분기를 평평하게(early return 등으로) 정리해서 가독성 높이기
- [ ] "재료 조금만 사면 돼요" 카드 — 부족 1개인 레시피가 눈에 더 잘 띄도록 개선
  - [x] `groupRecipesByMissingIngredients`(`src/data/selectors.js:72`)의 `shopping` 배열을 가격순 대신 부족 개수 오름차순(그 안에서 가격순)으로 정렬 — TDD(red→green→refactor)로 구현, `getClosestRecipes`와 정렬 비교 로직(`byMissingCountThenCost`) 공유하도록 리팩토링. 테스트: `src/data/selectors.groupRecipesByMissingIngredients.test.js`
  - [ ] `MenuCard.jsx`의 부족 개수 뱃지 — `missingCount === 1`일 때 포인트 컬러로 강조, 문구도 더 눈에 띄게 (예: "1개만 더 있으면 완성!")
  - 계기: 레시피 추천이 0건일 때 "빈 화면"으로 보이는 문제에 대해 제미나이한테 물어봤고, 그중 "부족 1개 카드 가시성 강화" 아이디어가 적은 공수로 바로 적용할 만해서 기록해둠
  - 참고: "0건일 때 대체 후보 보여주기"는 아래 항목으로 먼저 구현됨 — 이 항목은 그와 별개로, "조금만 사면 돼요" 섹션 안에서 1개 부족 카드를 더 눈에 띄게 하는 것
- [x] "0건일 때 그나마 가까운 후보 보여주기" — `groupRecipesByMissingIngredients`가 부족 3개 이상인 레시피를 `others`로 따로 반환하고, `ready`/`shopping`이 둘 다 0건일 때만 `getClosestRecipes`로 부족 개수가 가장 적은 상위 3개를 "이 재료도 있으면 만들 수 있어요" 섹션으로 보여줌 (`Home.jsx`)
- [x] "레시피"라 부르기 애매한 즉석식품 항목 정리 (`src/data/mockRecipes.js`) — 단품 즉석식품(육개장사발면, 신라면, 즉석밥, 흰쌀밥)은 제거, 두 제품을 섞어 조리하는 짜파구리는 "레시피"로 보고 유지. `rice`(밥·즉석식품) 카테고리는 통째로 삭제, `ramyeon` 카테고리는 컵/봉지 subgroups 없이 단일 목록으로 단순화. Supabase `recipes` 테이블의 옛 행 4개도 삭제 완료
