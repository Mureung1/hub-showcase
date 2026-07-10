# AGENTS.md

## 프로젝트

사이사이는 같은 건물 또는 가까운 생활권 이웃을 연결하는 생활 커뮤니티 서비스입니다.


## 기술 스택

- Frontend: React + JavaScript (Vite, `src/`)
- Backend 예정: Express + JavaScript ESM (`server/`)
- Database 예정: Supabase(Postgres) (`supabase/`)

## 컨벤션

- 컴포넌트 이름은 PascalCase를 사용합니다.
- 커밋 타입은 `feat`, `fix`, `refactor`, `docs`를 우선 사용합니다.
- React 컴포넌트는 간결한 함수형 컴포넌트를 선호합니다.
- 반복 UI는 배열 데이터와 `map` 렌더링을 우선 사용합니다.
- CSS는 기존 전역 변수, 색상, 반응형 패턴을 먼저 재사용합니다.
- 프론트와 백엔드는 기능 중심 디렉터리를 사용하고, 기능 폴더 이름은 kebab-case를 사용합니다.
- 프론트 공통 UI만 `src/components/ui/`에 두고 기능 전용 UI는 해당 `src/features/` 아래에 둡니다.
- 백엔드의 route, controller, service, schema는 같은 `server/src/modules/<feature>/` 안에 둡니다.
- 한글 UI 문구는 자연스럽고 서비스 톤에 맞게 작성합니다.
- 새 문서와 한글 파일은 UTF-8로 작성합니다.

## 하지 말 것

- 별도 합의 전까지 외부 UI 라이브러리를 추가하지 않습니다.
- 사용자가 명시적으로 요청하지 않은 `.github/` 자동화 파일 수정은 하지 않습니다.
- 요청 범위를 벗어난 대규모 리팩터링, 파일 이동, 기술 스택 변경은 하지 않습니다.
- 현재 구현되지 않은 백엔드, 인증, 결제, 관리자 기능을 이미 있는 것처럼 작성하지 않습니다.
- `server/`, `supabase/`는 골격만 있으므로 구현 완료 상태로 표현하지 않습니다.

## 참고 문서

- 기획 의도: `docs/product-plan.md`
- 디자인: `docs/design.md`
- 디렉터리 구조: `docs/directory-structure.md`
- 일정 및 실행 Backlog: `docs/4-week-plan.md`
- 프론트 작업 분해: `docs/frontend-tasks.md`
- 백엔드 작업 분해: `docs/backend-tasks.md`
- DB 작업 분해: `docs/database-tasks.md`
- 실행/개요: `README.md`

## 문서 우선순위

1. 구현 상태: 실제 코드/디렉터리 구조
2. 작업 분해: `docs/frontend-tasks.md`, `docs/backend-tasks.md`, `docs/database-tasks.md`
3. 기획 의도: `docs/product-plan.md`
4. 실행/개요: `README.md`

세부 구현 스펙은 `docs/*-tasks.md`를 기준으로 합니다. `AGENTS.md`는 진입점 요약만 제공합니다.

## 작업 범위와 기준

- 프론트엔드: `src/{app,components,features,repositories,mocks,lib,styles}`
- 백엔드 골격: `server/src/{modules,middleware,lib,config,errors}`, `server/test`
- DB 골격: `supabase/migrations`, `supabase/tests`, `supabase/seed.sql`
- Auth 데모 seed 스크립트: `scripts/seed-demo.mjs`(DB 구현 시 추가)
- 루트 `package.json`과 `package-lock.json` 하나를 프론트·백엔드가 함께 사용합니다.
- `prototype/`은 기존 HTML/CSS/JS 프로토타입 참고용입니다.
- 문서와 실제 구현 상태가 충돌하면 현재 코드/디렉터리 구조를 먼저 확인합니다.
- 공동구매는 결제/송금을 직접 처리하지 않고, 모집, 참여, 1인 부담 금액 확인, 분배 안내를 중심으로 설계합니다.

### 제외 범위

- 결제/송금 직접 처리
- 푸시 알림
- 리뷰/신고
- 차단
- 관리자 페이지

## 개발 명령

- 의존성 설치: `npm install`
- 개발 서버 실행: `npm run dev`
- 프로덕션 빌드 확인: `npm run build`
- 린트 실행: `npm run lint`
- 빌드 결과 미리보기: `npm run preview`

백엔드 전용 명령(`dev:api` 등)은 `server/` 구현 후 추가합니다.
의존성을 추가하거나 변경할 때는 `package.json`과 `package-lock.json`을 함께 확인합니다.

## 검증 지침

- UI 또는 코드 변경 후에는 `npm run lint`를 실행합니다.
- 동작이나 번들에 영향이 있는 변경은 `npm run build`까지 확인합니다.
- 화면 변경 시 데스크톱과 모바일 폭에서 텍스트 줄바꿈, 요소 겹침, 주요 CTA 노출을 확인합니다.
- 문서만 변경한 경우에는 별도 빌드나 린트가 필수는 아니지만, 변경 범위가 문서에 한정되어 있음을 최종 응답에 명시합니다.
