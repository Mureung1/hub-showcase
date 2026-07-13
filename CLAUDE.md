# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 서비스 목적
"끼니픽" (구 "식비구조대") — 자취생·1인 가구가 냉장고에 있는 재료로 뭘 해먹을지 고민할 때, 가진 재료가 들어가는 가성비 좋은 요리를 추천하고 부족한 재료는 네이버/쿠팡 구매 링크로 바로 연결한다. 상세 기획은 `plan.md`, 작업 순서는 `checklist.md`, 우선순위·일정은 `task.md` 참고.

## 자주 쓰는 명령어
- `npm install` — 의존성 설치
- `npm run dev` — 프론트엔드 개발 서버 실행 (Vite, 저장 시 자동 반영)
- `npm run dev:api` — 백엔드(Express) 로컬 서버 실행 (포트 3001). 백엔드 관련 작업할 땐 `npm run dev`와 같이 터미널 2개로 띄운다
- `npm run build` — 프로덕션 빌드
- `npm run preview` — 빌드 결과 로컬 미리보기
- `npm run lint` — oxlint로 코드 검사 (`server/`, `scripts/`도 자동으로 대상에 포함됨)
- 테스트 명령어는 아직 없음 (테스트 도구 미도입, 추후 필요해지면 추가)

## 코드 구조
- 진입점: `src/main.jsx`(라우터 세팅) → `src/App.jsx`(라우트 정의) → `src/pages/*`(화면 단위: Home, CategoryPage, RecipeDetailPage).
- `src/components/*`: 여러 화면에서 재사용하는 작은 UI 조각 (예: `MenuCard` — 홈의 카테고리 카드와 카테고리 상세의 레시피 카드가 똑같이 생겨서 하나로 합침, `Thumbnail` — 사진 로드 실패 시 이모지로 대체하는 로직을 한 곳에 모음).
- `src/data/*`: 목업 데이터(`mockRecipes.js`, `categories.js`)와 그 데이터를 가공하는 순수 함수(`selectors.js`). 정렬·필터링 로직은 컴포넌트 안에 두지 않고 여기 모아둔다.
- `src/utils/*`: 특정 화면에 종속되지 않는 순수 함수 (예: `purchaseLinks.js`의 검색 URL 생성 함수).
- 전역 스타일은 `src/index.css` 하나만 사용.
- 코드 검사는 `.oxlintrc.json` 설정의 oxlint만 사용, Prettier 등 별도 포맷터는 아직 없음.
- 백엔드는 `server/`(Express 앱 본체) + `api/index.js`(Vercel 진입점, `server/app.js`를 그대로 export) + `scripts/dev-server.js`(로컬 전용 `app.listen()`)로 구성 — 자세한 내용은 "개발 환경" 섹션 참고.

## 개발 환경
- **백엔드는 Express를 Vercel 서버리스 함수 안에 래핑하는 구조다.** `server/app.js`가 실제 Express 앱(라우터 마운트)이고, `api/index.js`는 이 앱을 그대로 `export default`하기만 한다 — Vercel Node 런타임이 Express 인스턴스를 자동으로 인식해서 별도 어댑터(`serverless-http` 등) 없이 동작한다.
- **라우트 네이밍 컨벤션**: `/api/<서비스>/<동작>` (예: `/api/naver/search`, 앞으로 KAMIS 붙이면 `/api/kamis/prices`). 서비스별로 `server/routes/<서비스>.js` 파일 하나, 외부 API 호출은 `server/lib/<서비스>Client.js`로 분리한다 (예: `naverClient.js`).
- **로컬 개발**: 프론트(Vite, 5173)와 백엔드(Express, 3001)를 각각 `npm run dev` / `npm run dev:api`로 따로 띄운다. `vite.config.js`의 `server.proxy`가 `/api/*` 요청을 자동으로 3001 포트로 넘겨주므로, 프론트 코드에서는 `/api/naver/search`처럼 상대경로로만 호출하면 된다 (CORS 설정 불필요 — 브라우저 입장에서는 항상 같은 오리진).
- **환경변수**: 로컬은 `.env.local`(gitignore 처리됨, `*.local` 규칙)에 두고 `node --env-file=.env.local`로 로드한다 (Node 24 내장 기능이라 `dotenv` 패키지 불필요). 배포본(Vercel)은 Vercel 대시보드의 환경변수에 동일한 키를 등록해야 한다 — 새 API 키를 추가하면 이 두 곳 모두에 등록할 것.
- **에러 응답 형식**: 모든 API 라우트는 실패 시 `{ error: string }` JSON + 적절한 status 코드(400=요청값 문제, 502=외부 API 연결 실패, 그 외 외부 API가 준 status 그대로 전달)를 따른다.
- **Node 버전**: `package.json`의 `engines.node`가 `>=24`로 고정돼 있다 (`--env-file` 의존).

## 디자인 시스템
- 색상·폰트·radius·spacing 토큰과 컴포넌트 패턴은 `DESIGN_SYSTEM.md`에 정의되어 있다. UI를 새로 만들거나 스타일을 고칠 때는 이 문서의 토큰을 따르고 임의의 hex/px 값을 하드코딩하지 않는다.
- `src/`(Tailwind v4 `@theme` 토큰)와 `prototype/`(CSS 커스텀 프로퍼티)는 구현 방식이 다르므로, 작업 대상에 맞는 방식을 `DESIGN_SYSTEM.md`의 "구현 매핑" 섹션에서 확인한다.
- 새 컴포넌트 패턴을 만들면 `DESIGN_SYSTEM.md`의 "컴포넌트 패턴 카탈로그"에 한 줄 추가해서 최신 상태로 유지한다.
- 이 원칙은 `.claude/skills/design-system/SKILL.md` 스킬이 UI 작업 시 자동으로 적용한다.

## 커밋 규칙
- 커밋은 작은 단위로 자주 나눠서 한다 (예: "KAMIS 시세 조회 함수 추가", "Top10 카드 UI 추가" 처럼 기능 하나씩).
- 커밋 메시지는 한글로 간단하고 명확하게 작성한다. 접두사(feat/fix 등)는 붙이지 않는다.
- 하나의 커밋에 관련 없는 변경을 섞지 않는다.

## 개발 원칙
- **UI·플로우를 새로 만들거나 크게 바꿀 땐 `prototype/`(정적 HTML)에 먼저 반영하고, 검증된 뒤에 실제 앱(`src/`)으로 옮긴다.** 프로토타입은 빌드·라우팅 없이 브라우저로 바로 열어볼 수 있어서 디자인·흐름을 빠르게 확인하고 고치기 좋다. 순서를 반대로(실제 앱 먼저) 하면 프로토타입이 계속 뒤처져서 실제 앱과 따로 노는 문서가 되어버린다.
- API 키(KAMIS 등)는 절대 프론트엔드 코드나 커밋에 노출하지 않고 서버(`server/`, Express) 환경변수로만 관리한다.
- 가계부 저장 로직은 나중에 로그인+DB로 교체할 수 있도록 별도 모듈로 분리해서 작성한다.
- 코드 작성 전 `checklist.md`에서 해당 작업 항목을 확인하고, 완료되면 체크 표시한다.
- **같은 모양의 UI가 두 군데 이상 필요하면 새로 복사·붙여넣기 하지 말고 `src/components`에 컴포넌트로 만들어서 재사용한다.** 나중에 디자인을 하나 바꿀 때 파일 하나만 고치면 되게 하기 위함 (예: `MenuCard`, `Thumbnail`). 컴포넌트 props는 화면마다 다른 부분만 받도록 최소한으로 설계한다.
- 정렬·필터링 같은 데이터 가공 로직은 컴포넌트 안에 직접 쓰지 않고 `src/data/selectors.js`처럼 별도 함수로 뽑아서 여러 화면에서 재사용한다.
