# TeamFlow

대학생 팀 프로젝트의 프로젝트·할 일·팀원·회의록·자료를 한 공간에서 관리하는 웹 서비스입니다.

## 현재 구현 상태

- React 기반 프로젝트 목록과 프로젝트 대시보드
- Supabase 기반 할 일 생성·조회와 Mock 기반 상태 관리
- 팀원, 공유 노트, 자료, AI 팀원 화면
- Express 서버의 `GET /health`, `GET /api/tasks`, `POST /api/tasks`
- 프론트엔드와 API가 공유하는 프로젝트·할 일 데이터 계약
- 요구사항 기반 기능 검증용 Codex Agent

프로젝트·팀원·노트·자료는 Mock 저장소를 사용하고, 새로 생성한 할 일은 Express를 거쳐 TeamFlow 전용 Supabase 프로젝트에 저장됩니다.

## Workspace

- `apps/web`: React + Vite 프론트엔드
- `apps/api`: Node.js + Express API
- `packages/shared`: 프론트엔드와 API가 공유하는 JavaScript 계약
- `references/figma-ai-prototype`: Figma AI 생성 코드 참고본
- `.codex/agents/verification_agent.toml`: 기능 검증 Agent

## 실행 준비

Node.js 24.14.0 이상 25 미만을 사용합니다. `.nvmrc`가 동일 버전을 고정합니다.

```bash
nvm use
npm install
```

## TeamFlow Supabase 설정

API 환경변수 예시 파일을 복사합니다.

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

`apps/api/.env`의 `TEAMFLOW_SUPABASE_SECRET_KEY`를 TeamFlow 프로젝트의 `sb_secret_...` 키로 교체합니다.

- TeamFlow 프로젝트 ref: `lmmeuoeuiouyowpthxwg`
- TimeBox 프로젝트의 URL이나 키는 사용할 수 없으며 API 시작 단계에서 거부됩니다.
- 실제 `.env` 파일은 Git에서 제외되므로 커밋하지 않습니다.

## 로컬 실행

첫 번째 터미널에서 API 서버를 실행합니다.

```bash
npm.cmd run dev:api
```

두 번째 터미널에서 웹 개발 서버를 실행합니다.

```bash
npm.cmd run dev:web
```

브라우저에서 `http://localhost:5173`을 엽니다. Vite가 `/api` 요청을 `http://127.0.0.1:3000`으로 전달합니다.

- 상태 확인: `GET http://localhost:3000/health`
- 할 일 조회: `GET http://localhost:3000/api/tasks`
- 할 일 생성: `POST http://localhost:3000/api/tasks`

프로젝트·팀원 등 기존 Mock 데이터는 유지됩니다. 새로 등록한 할 일은 목록에 즉시 표시되고 새로고침 후에도 Supabase에서 다시 조회됩니다. 상태 변경과 삭제는 이번 단계의 영속화 범위가 아니므로 새로고침하면 DB에 저장된 상태로 돌아옵니다.

## 검증 명령

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

## 프로젝트 문서

- [기획서](./docs/plan.md)
- [2주차 주간 개발 계획](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/700)
