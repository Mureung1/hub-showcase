# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요
- `FirstPR`: 사용자의 GitHub 활동과 선호 조건을 분석해 첫 오픈소스 기여에 적합한 레포/이슈를 추천하는 서비스
- 현재는 프론트엔드만 존재하며, 추후 백엔드(API 서버)를 추가할 예정
- 기획 문서: [docs/plan.md](docs/plan.md)
- 작업 체크리스트: [docs/checklist.md](docs/checklist.md)
- 아키텍처: [docs/architecture.md](docs/architecture.md)
- 의사결정 기록: [docs/decisions.md](docs/decisions.md)
- 작업 로그: [docs/log.md](docs/log.md)
- 디자인 시스템: [docs/design.md](docs/design.md)
- 코드 컨벤션: [docs/conventions.md](docs/conventions.md)

## 기술 스택

### Frontend
- React 19 + Vite
- Lint: oxlint

### Backend (예정, 미착수)
- Node.js + Express
- DB: Supabase (PostgreSQL) + Prisma ORM ([decisions.md](docs/decisions.md) 2026-07-13 전환 기록 참조)

## 명령어 (루트에서 실행, frontend/backend로 프록시됨)
- `npm run dev` — 프론트 개발 서버 실행
- `npm run build` — 빌드
- `npm run preview` — 빌드 결과 미리보기
- `npm run lint` — 린트 검사 (frontend/backend 전체)
- `npm run dev:backend` — 백엔드 개발 서버 실행 (`/health`, `/api-docs`)

## 디렉토리 구조
- `frontend/` — 프론트엔드 (React 19 + Vite, 독립 패키지)
  - `src/App.jsx` — 앱 엔트리 컴포넌트
  - `src/components/` — UI 컴포넌트 (`ProjectIntro`, `HeroIllustration`, `icons` 등)
  - `public/prototype/` — 화면 프로토타입 (정적 산출물)
- `backend/` — 백엔드 (Express, 독립 패키지). `app.js`(앱 조립)/`server.js`(부팅) + `src/`의 `routes → controllers → services` 레이어
- `docs/` — 기획서, 체크리스트 등 프로젝트 문서 (`openapi.yaml`은 `/api-docs`로 서빙됨)

## 디자인 / UI
- UI 작업(랜딩·화면·컴포넌트 제작 및 정리)은 [docs/design.md](docs/design.md)의 CSS 변수(색·폰트·모서리·여백·카드)를 단일 진실 소스로 따를 것
- `firstpr-ui` 스킬(`.claude/skills/firstpr-ui/`)이 이 디자인 규칙을 적용하도록 구성되어 있음

## 코드 작성 규칙
- 코드 작성·수정·리뷰는 [docs/conventions.md](docs/conventions.md)의 규칙(파일 구조·네이밍·레이어 패턴·에러 처리·스타일)을 따를 것
- `code-convention` 스킬(`.claude/skills/code-convention/`)이 이 규칙을 적용하도록 구성되어 있음
- 백엔드(Node.js + Express + Prisma)는 `routes → controllers → services` 레이어드 구조로 시작하고, DB 스키마는 `prisma/schema.prisma`에 정의할 것

## 작업 규칙
- 작은 단위로 주기적으로 커밋을 해야한다.
- 기능별로 브랜치를 나누고 dev브랜치에 머지한뒤 하루에 한번 dev -> main으로 푸쉬한다.
- 커밋단위당 항상 코드 리뷰를 진행한다.

## 작업 시 참고사항
- 백엔드가 추가되면 이 파일에 백엔드 스택/명령어/디렉토리 구조를 함께 갱신할 것
- 새 컴포넌트는 `frontend/src/components/`에 추가하고 필요한 경우에만 분리
- 색상/여백 등 디자인 값은 하드코딩하지 말고 `docs/design.md`의 CSS 변수를 사용할 것