## 프로젝트
PlaceSync — 소상공인 사장님이 네이버 플레이스·카카오맵·배달앱에 등록한 매장 정보(영업시간·메뉴·가격·공지)를
한 곳에서 수정하면 플랫폼별로 자동 반영해 주는 B2B SaaS 대시보드.

## 기술 스택
- `react/` — React 19 + Vite, JavaScript(JSX). TypeScript 아님. 라우팅은 `react-router-dom`, 아이콘은 `lucide-react`.
- `server/` — Node.js + Express + TypeScript(ESM, `"type": "module"`). 실행은 `tsx watch`(dev) / `tsc`(build).
- `prototype/` — 순수 HTML5 + CSS3. JS·프레임워크·외부 CDN 사용 안 함(README에 명시된 원칙).

## 개발 환경
- `react/`와 `server/`는 형제 폴더이며 각자 독립된 `package.json`을 가진다(npm workspaces 미사용). 루트에서 각각 `cd react` / `cd server` 후 `npm install`.
- 포트: 프론트엔드 `5173`(Vite 기본), 백엔드 `3000`.
- 환경변수: `server/.env.example`(`PORT`, `CORS_ORIGIN`), `react/.env.example`(`VITE_API_BASE_URL`) — 각 앱이 자기 `.env`를 소유한다. `.env`는 루트 `.gitignore`에서 제외, `.env.example`만 커밋한다.
- 데이터 저장: 1차 MVP는 실제 DB 없이 `server/src/repositories/`의 인메모리 배열/객체로 매장 정보를 관리한다. 서버 재시작 시 초기 Mock 상태로 리셋되어도 무방하다. 지금 목표는 편집→미리보기→승인→결과 확인 흐름을 완성하는 것이며, PostgreSQL/Supabase 등 실 DB 연동은 향후 확장 단계에서 검토한다.
- FE→BE 통신은 axios 없이 `react/src/services/apiClient.js`의 fetch 래퍼를 사용한다.
- 날짜 계산은 별도 라이브러리 없이 네이티브 `Date` + 유틸 함수로 처리한다.
- 백엔드 요청 로깅은 morgan 같은 패키지 대신 `server/src/middleware/requestLogger.ts`의 커스텀 미들웨어를 쓴다.
- `server/src/` 폴더 구조: `routes/`(엔드포인트) · `services/`(비즈니스 로직) · `repositories/`(인메모리 데이터 접근) · `adapters/`(플랫폼별 연동, 3주차 대상) · `jobs/`(예약 작업) · `types/`(공유 타입) · `middleware/`.
- `react/src/` 폴더 구조: `pages/` · `components/` · `services/` · `hooks/` · `utils/`.

## 컨벤션
- 커밋 메시지: `feat` / `fix` / `docs` / `refactor` (기존 `git log` 스타일 따름)
- 예시 데이터는 항상 "카페 하루" 세트 재사용: 메뉴 3종(아메리카노/카페라테/치즈케이크), 플랫폼 3개(네이버 플레이스/카카오맵/배달앱)

## UI 작업 시 반드시 지킬 것
- 색상·타이포·간격·radius·카드/버튼/배지/입력 스타일은 항상 `@docs/design.md` 토큰을 그대로 쓴다. 화면마다 임의의 헥스값이나 수치를 새로 만들지 않는다.
- 새 화면·컴포넌트를 만들거나 기존 화면의 스타일을 고칠 때는 `design-skill-default`(Skill)을 적용한다.

## 하지 말 것
- `docs/design.md`에 없는 색상·radius·spacing 값을 임의로 추가하지 않는다.
- 상태(완료/검토중/실패/대기)를 색상만으로 표현하지 않는다 — 아이콘/텍스트 병기 필수.
- `prototype/`에 JS나 외부 라이브러리를 추가하지 않는다.
- 화면 하나에 primary 버튼을 2개 이상 두지 않는다.
- `any` 성격의 임의 타입·구조 추정 금지 — 애매하면 먼저 물어본다.

## 참고
- 기획서: @docs/plan.md
- 보조 자료: @docs/feature-spec.md
- 개발 체크리스트: @docs/checklist.md
- 디자인 시스템: @docs/design.md
