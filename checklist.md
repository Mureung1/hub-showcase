# 작업 체크리스트

> 우선순위·주차별 일정은 [task.md](task.md) 참고 — 이 문서는 영역별 세부 작업과 완료 여부만 추적한다.

## 리브랜딩 (식비구조대 → 끼니픽)
- [x] 기니 캐릭터 일러스트 리소스 정리 — 빈 냉장고 씬(`src/assets/fridge-empty.png`) 확보 (제공된 시트 기준 — 계속 수정될 예정이라 확정본 나올 때까지 임시 리소스로 취급)
- [x] 홈 화면을 "원룸 + 문 열린 냉장고 + 냉장고를 들여다보는 기니" 씬으로 재설계 (`Home.jsx` 상단 히어로 이미지로 적용)
- [x] `DESIGN_SYSTEM.md` 공식 토큰(`@theme` 블록)을 `src/index.css`에 적용
- [x] 재료 선택 UI — 자유 입력(`IngredientTagInput`) 방식으로 만들었다가, 레시피 재료명과 매칭이 안 되는 문제로 **미리 준비된 재료 칩 탭 방식**(`IngredientChipPicker` + `src/data/fridgeIngredients.js`)으로 교체. 냉장고 일러스트 아래 말풍선 대답 구도의 카드에 배치, 완료 버튼 포함
- [x] 고른 재료가 들어가는 요리를 저렴한 순으로 추천하는 매칭 로직 (`getRecipesByOwnedIngredients` 셀렉터) — 완료 시 localStorage(`src/data/fridgeStorage.js`, 모듈 분리)에 저장하고 `/home` 상단 "냉장고 재료로 만들 수 있는 요리" 섹션에 표시
- [ ] 폰트를 Pretendard 기본에서 좀 더 귀여운 느낌의 폰트로 교체 (마스코트 톤에 맞는 폰트 후보 조사 필요)
- [x] 기존 컴포넌트(`MenuCard`, `IngredientList`, `PurchaseLinkPanel`, `Thumbnail` 등)의 오렌지 톤을 `DESIGN_SYSTEM.md` 공식 토큰(`primary` 등)으로 전체 교체 — `CategoryPage`/`TypePage`/`RecipeDetailPage`까지 포함해서 `orange-*`/`gray-*` 잔여 클래스 전수 제거 확인
- [ ] 레시피 상세 화면에 재료별 "보유"/"구매 필요" 배지 추가, "구매 필요" 재료만 구매 링크 노출
- [x] 화면에 보이는 "식비구조대" 로고(이미지 로고 → 텍스트 로고 "끼니픽"으로 교체 후 전부 삭제) 제거 — `README.md`·`package.json` name은 아직 남음. `src/assets/logo-*.png`는 미사용이지만 파일은 그대로 있음(삭제 여부는 나중에 결정)
- [x] `prototype/`을 냉장고 씬 + 재료 칩 선택 + 추천 흐름으로 재구성 — 옛 필터+랭킹 홈(`index-warm.html`, `filter.js`)은 제거하고 `index.html`(냉장고 화면, `fridge.js`) → `home.html`(추천+둘러보기, `home.js`)로 재구축, React `FridgePage`/`Home`과 동일한 흐름
- [x] `prototype/recipe-*.html` 6개를 옛 `style.css`(식비구조대 브랜드·검색바 남아있던 버전)에서 `style-warm.css`로 이전하고, `recipe.js`로 localStorage 냉장고 선택 기반 보유/구매 필요 배지·체크박스·정렬 구현 — `style.css`는 이제 프로토타입 어디서도 안 쓰임(삭제는 아직 안 함)
- [x] `Home.jsx`를 프로토타입 `home.html` 구조(네비바+프로모 배너+전체 둘러보기 평면 리스트)로 재구축, 카테고리별 미리보기 섹션 제거 (`TypePage`/`CategoryPage` 파일은 유지하되 홈에서 링크 안 함)
- [ ] `src/assets/fridge-empty.png` 용량 최적화 (현재 5MB대로 너무 큼 — 압축·WebP 변환 검토)

## 냉장고→추천 API 연동 (Supabase)
- [x] `@supabase/supabase-js` 설치, `server/lib/supabaseClient.js`(service_role 키는 서버에만) 작성
- [x] `scripts/seedRecipes.js` — `mockRecipes.js`를 `recipes` 테이블 스키마로 변환해 1회 시딩하는 스크립트 작성
- [x] `server/routes/recipes.js` — `GET /api/recipes?matchNames=...`, 기존 `selectors.js`의 `getRecipesByOwnedIngredients` 재사용해 Supabase 조회 결과를 필터·정렬
- [x] `Home.jsx`를 로컬 계산 대신 `/api/recipes` fetch로 교체 (`useEffect` + `useState`)
- [x] Supabase 프로젝트 생성, `recipes` 테이블 SQL 실행, `.env.local`에 `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` 채우기
- [x] `npm run seed:recipes` 실행해 36개 레시피 시딩 확인
- [x] `GET /api/recipes?matchNames=...` 실제 호출로 Supabase 조회·필터·정렬 동작 확인 (curl로 검증 — 계란/밥/대파 → 17개 매칭, 가격순 정렬 정상)
- [ ] 브라우저에서 냉장고 선택→홈 화면까지 실제 UI로 최종 확인 (지금까진 curl로만 검증)
- [ ] 공공데이터포털 레시피로 데이터 소스 교체 (나중에 — `recipes` 테이블 내용만 바꾸면 됨, 코드 변경 최소화)

## 프론트엔드 (화면)
- [x] 홈 화면: 카테고리 카드 목록 UI (메인음식/반찬/간식 3단 구성) — 끼니픽 냉장고 씬으로 교체 예정, 위 리브랜딩 항목 참고
- [x] 카테고리 상세 화면: 레시피 목록 (가격순, 라면처럼 하위그룹 있는 경우 구분 표시)
- [x] 레시피 상세 화면: 재료 목록 + 총 재료비 + 재료 클릭 시 네이버/쿠팡 구매 링크 패널
- [ ] 모바일 반응형 레이아웃 점검
- [ ] 카테고리가 10개 이상으로 늘어나면 "더보기" 페이지네이션 추가 검토

## 네이버쇼핑 검색 오픈API (우선순위 상향 — 승인 불필요, 바로 시작 가능)
- [x] developers.naver.com 개발자 등록 + 애플리케이션 생성, Client ID/Secret 발급 (`.env.local`에 저장, gitignore 확인 완료)
- [x] 네이버쇼핑 검색 API 테스트 호출로 응답 구조 확인 (상품명·가격·링크·이미지 — `title`, `lprice`, `link`, `image`, `mallName` 등 확인 완료)
- [x] Client Secret을 가리는 백엔드 라우트 작성, Express로 마이그레이션 완료 (`server/routes/naver.js` + `/api/index.js`, 경로는 `/api/naver/search`) — 브라우저에서 직접 호출 시 CORS·키 노출 문제라 반드시 서버 경유. 400(query 누락)·200(정상) 케이스 검증 완료
- [x] `src/utils/purchaseLinks.js`에 `fetchNaverProducts`·`estimateCoupangPrice` 추가, `PurchaseLinkPanel`을 "최저가" 강조 바 + "쇼핑몰별 최저가"(네이버 실제/쿠팡 추정) 비교 UI로 개편. `npm run dev` + `npm run dev:api` 두 서버로 **실제 네이버 응답까지 로컬에서 완전히 확인 완료** (예: "쌀" → 24,900원 밥선생, 쿠팡 추정 25,400원 정상 렌더링)
- [x] **버그 수정**: 최저가가 100원 미만이면(`estimateCoupangPrice`가 반올림으로 0원 반환) `0`이 falsy라서 최저가 섹션 전체가 안 보이던 문제 → `!= null` 체크로 수정
- [x] **데이터 품질 이슈 발견 및 수정**: 네이버 API `sort=asc`(가격순 정렬)를 쓰면 관련도 무시하고 스티커·문의용 상품(1~120원)이 최저가로 잡힘 ("쌀", "돼지고기"로 실측 확인). 기본 관련도순(sim) 정렬로 20개를 받아온 뒤 우리가 직접 가격순 재정렬하는 방식으로 변경 (`server/lib/naverClient.js`)
- [ ] 요리별 1인분 총 재료비 계산에 네이버 검색 결과 가격을 참고 구매가로 반영할지 검토 (지금은 수동 관리 값 사용 중)

## 데이터
- [x] 레시피·카테고리 목업 데이터 구성 (12개 카테고리, 36개 레시피, `src/data/`)
- [x] 위키미디어 커먼즈 사진 채우기 (계란토스트·즉석밥·도라지나물은 적절한 사진을 못 찾아 이모지로 남음 — 재검색 필요)
- [ ] KAMIS 오픈API 회원가입 및 인증키 발급
- [ ] KAMIS API 테스트 호출로 필요한 품목(채소·과일·곡물) 가격 데이터 구조 확인
- [ ] 비농산물 재료(고기·수산물·조미료 등) 참고 고정가 데이터 정리
- [ ] 목업 데이터를 실제 KAMIS/네이버 데이터로 교체 (쿠팡은 쿠팡파트너스 승인 전까지 검색 링크 유지)

## 이번 달 식비 예상치 (구 "가계부" — 수동 입력 없이 자동 계산으로 컨셉 변경됨)
- [ ] 사용자가 확인한 요리의 총 재료비를 localStorage에 자동 누적하는 로직 구현 (수동 지출 입력 UI는 불필요)
- [ ] 저장 로직을 별도 모듈로 분리 (추후 로그인+DB 전환 대비)

## 백엔드 · 배포 (우선순위 최하위로 미룸 — 다른 항목 다 끝난 뒤 진행)
- [x] React + Express 개발 환경 구성 (팀장 지시, 2주차 개발 전 준비) — `server/`(Express 앱) + `api/index.js`(Vercel 진입점) + `scripts/dev-server.js`(로컬 실행기) 구조, `npm run dev:api`로 로컬 3001 포트 실행, Vite 프록시로 `/api/*` 연결. 라우트 컨벤션(`/api/<서비스>/<동작>`)·환경변수 관리 규칙·커밋 규칙은 `CLAUDE.md` "개발 환경" 섹션에 기록
- [ ] Vercel 프로젝트 연결 + 배포 세팅
- [ ] KAMIS 시세를 가져오는 라우트 작성 (`server/routes/kamis.js` → `/api/kamis/prices`), API 키는 환경변수로 서버에만 보관
- [ ] Vercel Cron Job으로 하루 1회 시세 갱신 배치 구성
- [ ] Vercel에 배포하고 환경변수(KAMIS 키, 네이버 Client ID/Secret) 설정 (React Router BrowserRouter 쓰므로 SPA 리라이트 설정 필요)
- [x] 로컬에서 `/api/naver/search` 실제 응답 확인 (`npm run dev:api` + Vite 프록시로 완전히 동작 확인됨)
- [ ] 배포 환경(Vercel)에서도 `/api/naver/search` 동일하게 동작하는지 별도 확인 필요

## 다음 단계 (선택)
- [ ] 쿠팡파트너스 신청 및 승인 후 실제 구매 링크(수수료 딥링크)로 교체 — 네이버는 오픈API로 이미 우선 진행 중이라 제외
- [ ] 회원가입/로그인 + 서버 DB로 이번 달 식비 예상치 데이터 이전
- [ ] 레시피 가짓수 확대, 재료 자동 매칭 정확도 개선
- [ ] 전체 플로우 테스트: 홈(냉장고 씬, 재료 선택) → 추천 리스트 → 레시피 상세(보유/구매 필요 구분) → 구매 링크 → 식비 예상치 반영
