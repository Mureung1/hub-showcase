# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 서비스 목적
"식비구조대" — 자취생·1인 가구가 재료 최저가를 찾느라 시간을 쓰지 않도록, 공공데이터포털(KAMIS) 시세를 기반으로 가성비 좋은 요리를 추천하고 네이버/쿠팡 구매 링크를 바로 제공한다. 상세 기획은 `plan.md`, 작업 순서는 `checklist.md` 참고.

## 자주 쓰는 명령어
- `npm install` — 의존성 설치
- `npm run dev` — 개발 서버 실행 (Vite, 저장 시 자동 반영)
- `npm run build` — 프로덕션 빌드
- `npm run preview` — 빌드 결과 로컬 미리보기
- `npm run lint` — oxlint로 코드 검사
- 테스트 명령어는 아직 없음 (테스트 도구 미도입, 추후 필요해지면 추가)

## 코드 구조
- 진입점: `src/main.jsx`(라우터 세팅) → `src/App.jsx`(라우트 정의) → `src/pages/*`(화면 단위: Home, CategoryPage, RecipeDetailPage).
- `src/components/*`: 여러 화면에서 재사용하는 작은 UI 조각 (예: `MenuCard` — 홈의 카테고리 카드와 카테고리 상세의 레시피 카드가 똑같이 생겨서 하나로 합침, `Thumbnail` — 사진 로드 실패 시 이모지로 대체하는 로직을 한 곳에 모음).
- `src/data/*`: 목업 데이터(`mockRecipes.js`, `categories.js`)와 그 데이터를 가공하는 순수 함수(`selectors.js`). 정렬·필터링 로직은 컴포넌트 안에 두지 않고 여기 모아둔다.
- `src/utils/*`: 특정 화면에 종속되지 않는 순수 함수 (예: `purchaseLinks.js`의 검색 URL 생성 함수).
- 전역 스타일은 `src/index.css` 하나만 사용.
- 코드 검사는 `.oxlintrc.json` 설정의 oxlint만 사용, Prettier 등 별도 포맷터는 아직 없음.

## 커밋 규칙
- 커밋은 작은 단위로 자주 나눠서 한다 (예: "KAMIS 시세 조회 함수 추가", "Top10 카드 UI 추가" 처럼 기능 하나씩).
- 커밋 메시지는 한글로 간단하고 명확하게 작성한다. 접두사(feat/fix 등)는 붙이지 않는다.
- 하나의 커밋에 관련 없는 변경을 섞지 않는다.

## 개발 원칙
- API 키(KAMIS 등)는 절대 프론트엔드 코드나 커밋에 노출하지 않고 서버(Vercel 서버리스 함수) 환경변수로만 관리한다.
- 가계부 저장 로직은 나중에 로그인+DB로 교체할 수 있도록 별도 모듈로 분리해서 작성한다.
- 코드 작성 전 `checklist.md`에서 해당 작업 항목을 확인하고, 완료되면 체크 표시한다.
- **같은 모양의 UI가 두 군데 이상 필요하면 새로 복사·붙여넣기 하지 말고 `src/components`에 컴포넌트로 만들어서 재사용한다.** 나중에 디자인을 하나 바꿀 때 파일 하나만 고치면 되게 하기 위함 (예: `MenuCard`, `Thumbnail`). 컴포넌트 props는 화면마다 다른 부분만 받도록 최소한으로 설계한다.
- 정렬·필터링 같은 데이터 가공 로직은 컴포넌트 안에 직접 쓰지 않고 `src/data/selectors.js`처럼 별도 함수로 뽑아서 여러 화면에서 재사용한다.
