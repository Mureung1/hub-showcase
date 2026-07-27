# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

자취생 냉장고 레시피 앱. 서로 독립된 npm 프로젝트 두 개(`frontend/` React+Vite, `backend/` Express)로 구성된 웹 서비스 저장소입니다. 개발 참고 문서는 `docs/`에 있습니다:

- [docs/product.md](docs/product.md) — 페르소나·문제정의·MVP 범위 등 제품 요구사항 원본
- [docs/api.md](docs/api.md) — 엔드포인트별 요청/응답 계약, DB 스키마 설계
- [docs/algorithms.md](docs/algorithms.md) — 일주일 식단 v2 / 최소 구매 / 임박 구출 세트 알고리즘 단일 소스
- [docs/backlog.md](docs/backlog.md) — 남은 작업 목록(우선순위별), 완료된 작업 요약 및 12일차 세부 작업 기록
- [docs/3주차 계획수립.md](docs/3주차%20계획수립.md) — Day 11~15 진행 계획 및 완료 현황
- [docs/4주차 계획수립.md](docs/4주차%20계획수립.md) — Day 16~20 진행 계획(코드 검토·OCR 실연동·농산물 API 보강·배포)

> 발표자료·Windows 런처·구버전 정적 프로토타입처럼 웹 서비스 코드도 개발 문서도 아닌 것들은
> 저장소 밖(`C:\Users\user\Desktop\에이전트 실습 관련 자료 파일\`)에 따로 있습니다.

**참고**: 이 폴더(`fridge-recipe-app`)는 이제 자체 GitHub 저장소(`baejh3333-del/fridge-recipe-app`)를 가진
git 저장소입니다(16일차부터 — 이전엔 git 저장소가 아니었음). 별도로 `baejh3333-del/hub`
(로컬 경로: `Desktop\깃허브 공유 파일\hub`)에도 이 프로젝트의 미러가 있으며, 2026-07-09 이후
이 폴더에서 진행된 버그 수정·기능 추가가 그쪽엔 아직 반영되지 않았습니다 — 공유/배포 전에
동기화가 필요합니다([docs/backlog.md](docs/backlog.md) P2, [docs/4주차 계획수립.md](docs/4주차%20계획수립.md) Day20 참고).

## 커맨드

### Frontend (`frontend/`)
```
npm install
npm run dev       # Vite dev 서버 (.claude/launch.json의 frontend-dev 설정은 --port 5174로 띄움)
npm run build     # 프로덕션 빌드 → frontend/dist
npm run lint      # oxlint
npm run preview
```

### Backend (`backend/`)
```
npm install
npm run dev       # nodemon src/server.js — 자동 재시작, 기본 포트 3001 ($PORT로 재정의 가능)
npm start         # node src/server.js — watch 없이 1회 실행
npm run lint      # oxlint (backend/.oxlintrc.json 기반)
npm test          # node --test (pure functions 단위 테스트 20건 수행)
```

### 로컬에서 FE+BE 같이 띄우기
frontend-dev(5174)와 backend-dev(3001)를 각각 별도 터미널로 띄웁니다(`.claude/launch.json`에 두 설정 모두 등록됨). 포트가 다르므로 브라우저가 기본적으로 CORS를 막는데, `backend/src/app.js`에서 `cors()`를 전체 허용으로 열어뒀습니다.

### 프로덕션 실행
`frontend/`에서 `npm run build` → `backend/`에서 `node src/server.js`(`PORT` 환경변수로 포트 지정). `backend/src/app.js`가 `express.static(frontend/dist)`로 빌드된 프론트를 직접 서빙합니다 — 이 모드에는 CORS도, 5174 포트도 관여하지 않습니다. (이 흐름을 자동화한 Windows 런처는 저장소 밖 `런처_배포도구/`로 옮겨뒀습니다.)

## 아키텍처

### 모노레포 도구 없는 독립 npm 패키지 두 개
`frontend/`와 `backend/`는 각자 별도의 `package.json`/`node_modules`를 가지며 워크스페이스로 연결돼 있지 않습니다. 그래서 아래 "데이터 중복" 항목처럼 일부 코드를 의도적으로 양쪽에 복사해 둔 상태입니다.

### 백엔드: routes → controllers → store (인메모리 DB)
`backend/src/routes/*.js`가 메서드+경로를 `controllers/*.js`에 매핑하고, 컨트롤러는 요청 검증과 상태 코드 결정만 담당합니다. 실제 비즈니스 로직과 상태는 전부 `store.js`에 있습니다 — 나중에 실DB로 바꿀 때 `store.js` 함수 내부만 SQL 호출로 교체하면 되고 컨트롤러/라우트는 그대로 둘 수 있게 설계돼 있습니다. `store.js`의 `fridge` 맵은 메모리에만 있어 서버 재시작 시 초기화됩니다.

라우트 등록 순서에 유의: `routes/fridge.js`는 `GET /alerts`를 `GET /:id` 계열보다 먼저 등록해서 Express가 `alerts`를 `:id` 파라미터로 삼켜버리지 않게 합니다.

### 재료 마스터 / 재고(stock) 분리
`backend/src/data/ingredients.js`가 재료의 불변 속성(emoji, name, category, defaultUnitLabels, avgShelfLifeDays, role/tip)을 담는 "마스터"이고, `backend/src/data/initialFridge.js`는 시점에 따라 변하는 "재고" 상태만(level 인덱스, 구매일, 유통기한, imminent 플래그) 담습니다. `store.js`의 `enrichFridgeItem()`/`buildFridgeView()`가 이 둘을 합쳐 프론트가 기대하는 평평한 모양(`{id, emoji, name, levels, level, purchased, expiry, imminent, role, tip, ...}`)을 만듭니다. `fridge[id].emoji`처럼 raw `fridge` 맵을 직접 읽는 코드를 새로 추가하지 말고 반드시 `buildFridgeView()`를 거쳐야 합니다.

### frontend ↔ backend 데이터 중복
`frontend/src/data/*.js`와 `frontend/src/logic/fridgeLogic.js`는 `backend/src/` 아래 동명 파일의 복사본입니다(모노레포 공유 패키지가 아직 없어서 의도적으로 그렇게 함). frontend 쪽 복사본은 `AppContext.jsx`·`Fridge.jsx`·`Home.jsx`·`AddItem.jsx`·`ExpiryCheck.jsx`가 클라이언트 쪽 필터링/표시 계산(`fridgeAvailable` 등)에 직접 쓰고, backend 쪽 복사본은 실제 API(`store.js`)가 씁니다. 레시피/재료 데이터나 공용 순수 로직을 고칠 때는 두 곳 다 수정해야 합니다.

> 이전엔 프론트 복사본을 `mockServer.js`(백엔드 없이 UI만 보는 인메모리 폴백)가 썼지만, 그 파일은 이제 저장소에 없습니다 — 프론트는 항상 실제 백엔드(`httpClient.js`)가 필요합니다.

### 프론트엔드 API 호출은 `api/index.js`를 통해서만
`frontend/src/api/index.js`가 `httpClient.js`(실제 Express 백엔드에 fetch, `VITE_API_BASE_URL` 환경변수 사용·기본값 `http://localhost:3001`)를 재export합니다. 다른 프론트 코드는 전부 `httpClient.js`를 직접 import하지 않고 `api/index.js`를 통해서만 호출합니다. `httpClient.js`와 실제 백엔드 컨트롤러는 "같은 API 계약"을 각자 독립적으로 구현한 것이라 타입 체크 없이 조용히 어긋날 수 있습니다 — 함수 시그니처(이름·인자·응답 모양)를 맞춰 유지하세요.

### 단일 전역 React 컨텍스트 + 커스텀 네비게이션 스택
`frontend/src/context/AppContext.jsx` 하나가 화면을 넘나드는 모든 상태(냉장고, 현재 화면+백스택, 조리 흐름, 영수증 흐름, 식단 흐름)를 들고 있습니다 — 화면 대부분이 같은 진행 중 상태를 여러 스크린에 걸쳐 공유해야 하기 때문입니다. 네비게이션은 react-router가 아니라 직접 만든 `go(id)`/`back()`/`tab(id)` 스택입니다: `go()`는 현재 화면을 스택에 쌓고 전환, `tab()`은 스택을 비우고 전환(하단 탭 5개가 사용), `back()`은 스택에서 pop. 화면은 URL이 아니라 문자열 id이며 `App.jsx`의 `SCREENS` 객체에서 컴포넌트로 매핑됩니다.

## 코딩 컨벤션

- **모듈 시스템**: 프론트·백엔드 모두 ESM(`"type": "module"`). `require`/`module.exports` 쓰지 않습니다.
- **컴포넌트**: 함수형 컴포넌트 + hooks만 사용, default export 하나씩.
- **주석은 "왜"만**: 코드가 무엇을 하는지 설명하는 주석은 쓰지 않고, 자명하지 않은 이유(설계 결정, 함정, TODO)만 남깁니다. 기존 파일(`store.js`, `AppContext.jsx` 등)의 주석 스타일을 참고하세요.
- **공용 로직은 `logic/`·공용 UI는 `components/`로**: 화면 2곳 이상에서 같은 계산이나 마크업이 반복되면 페이지에 두지 말고 `fridgeLogic.js`나 `components/`의 기존 조각(`Row`, `Badge`, `RecipeCard`)으로 옮기거나 재사용하세요.
- **백엔드 상태 변경은 항상 `store.js`를 거쳐서**: 컨트롤러에서 직접 `fridge` 객체를 만지지 않습니다.

## 라이브러리 현황 / 정리가 필요한 부분

- Frontend: `react`/`react-dom` 19, 빌드는 Vite 8, 린트는 `oxlint`(`.oxlintrc.json`) — ESLint/Prettier는 없음.
- Backend: `express` 5, `cors`, dev 전용 `nodemon` — **린터가 아예 없음**(frontend는 oxlint가 있는데 backend는 무방비). 백엔드에도 동일하게 `oxlint`를 붙이거나 최소한 `eslint` 기본 설정을 넣는 걸 권장합니다.
- 테스트 러너가 프론트·백엔드 둘 다 없습니다(`backend/package.json`의 `test` 스크립트는 `npm init` placeholder). store.js의 날짜 계산(`formatDday`/`ddayValue`)처럼 순수 함수부터 최소한의 단위 테스트(예: `vitest`/`node:test`)를 붙일 만합니다.

## 커밋 메시지 규칙

아직 git 저장소가 없어(이 폴더는 `git init` 전 상태) 확립된 히스토리가 없습니다. 저장소를 만들 때부터 아래 규칙을 적용하세요.

**형식**: [Conventional Commits](https://www.conventionalcommits.org/) 기반, 제목은 한국어로 작성.
```
<type>(<scope>): <한국어 요약, 명령형·현재형, 마침표 없이>

<본문 — 무엇을 왜 바꿨는지, 필요할 때만>
```

- **type**: `feat`(기능 추가) · `fix`(버그 수정) · `refactor`(동작 변화 없는 구조 개선) · `docs`(문서만) · `chore`(빌드/의존성/설정) · `style`(포맷팅만, 로직 무변화)
- **scope**: `frontend` · `backend` 중 변경이 걸친 쪽. 양쪽 다면 생략.
- 제목 50자 내외, 본문은 필요할 때만 한 줄 띄우고 작성.
- 예시:
  - `fix(backend): cook-done에서 존재하지 않는 재료 id 방어`
  - `feat(frontend): 재고 직접 추가 폼을 실제 API 호출로 연결`
  - `chore(backend): oxlint 설정 추가`
