# TeamFlow

대학생 팀플·공모전 프로젝트 관리 웹서비스. 역할·할 일·진행도·회의록·자료를 한 곳에 모아
팀 전체가 현재 상황과 다음 할 일을 한눈에 파악하게 한다. "AI 팀원"은 사람 팀원과 동일한
구조(역할·할 일 배정)로 다루는 팀원 타입이다.

## 기술 스택

- **web** (`apps/web`, `@teamflow/web`): React 19 + Vite. 언어는 JS(.jsx), TypeScript 안 씀.
- **api** (`apps/api`, `@teamflow/api`): Express 5. dotenv + cors.
- **shared** (`packages/shared`, `@teamflow/shared`): FE/BE 공용 상수·타입 (예: `TASK_STATUS`, `MEMBER_TYPES`).
- 모노레포: npm workspaces (`apps/*`, `packages/*`). 린트: oxlint.

## 명령어

- `npm run dev:web` / `npm run dev:api` — 각 앱 개발 서버
- `npm run build` — web 빌드
- `npm run lint` — oxlint (web/api/shared)
- `npm run check` — lint + build

## 컨벤션

- 컴포넌트: PascalCase. 파일도 컴포넌트명과 일치.
- 공용 상태 값(할 일 상태, 팀원 타입 등)은 새로 정의하지 말고 `@teamflow/shared`에서 가져온다.
- 커밋: **Conventional Commits, 제목은 영문.** `type: subject` 형식.
  - type: `feat` `fix` `refactor` `docs` `style` `test` `chore`
  - 예) `feat: add project creation screen`

## 하지 말 것

- 색·폰트·간격을 하드코딩하지 말 것 → `teamflow-design` 스킬의 토큰(`var(--...)`)을 쓴다.
- 외부 UI 컴포넌트 라이브러리 금지(별도 합의 전까지). 스타일은 디자인 스킬 기준.
- 그라데이션·블롭·과채도 등 "AI 스타트업" 비주얼 금지. 액센트는 슬레이트 네이비 `#3D4A63`.
- 요청 범위 밖의 폴더 구조 변경·라이브러리 추가를 임의로 하지 말 것. 먼저 제안하고 확인받는다.

## 참고

- 기획서: @docs/plan.md
- 디자인: `.claude/skills/teamflow-design/` (UI 작업 시 자동 적용되는 스킬)
