# TeamFlow

대학생 팀 프로젝트의 프로젝트·할 일·팀원·회의록·자료를 한 공간에서 관리하는 웹 서비스입니다.

## 현재 구현 상태

- React 기반 프로젝트 목록과 프로젝트 대시보드
- Mock 데이터 기반 할 일 생성·조회·상태 관리
- 팀원, 공유 노트, 자료, AI 팀원 화면
- Express 서버와 `GET /health` 상태 확인 API
- 프론트엔드와 API가 공유하는 프로젝트·할 일 데이터 계약
- 요구사항 기반 기능 검증용 Codex Agent

현재 프론트엔드는 Mock 저장소를 사용합니다. Express–Supabase 연결과 실제 데이터 저장·조회 API는 아직 구현하지 않았습니다.

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

## 웹 데모 실행

프로젝트 루트에서 프론트엔드 개발 서버를 실행합니다.

```bash
npm run dev:web
```

터미널에 표시되는 주소를 브라우저에서 엽니다. 기본 주소는 다음과 같습니다.

```text
http://localhost:5173
```

현재 웹 화면은 Mock 데이터로 동작하므로 프론트엔드 데모만 볼 때는 API 서버를 함께 실행하지 않아도 됩니다.

## API 서버 실행

별도 터미널에서 다음 명령을 실행합니다.

```bash
npm run dev:api
```

API 상태 확인 주소:

```text
http://localhost:3000/health
```

정상 상태에서는 다음 JSON을 반환합니다.

```json
{
  "status": "ok",
  "service": "teamflow-api"
}
```

## 검증 명령

```bash
npm run lint
npm test
npm run build
```

## 프로젝트 문서

- [기획서](./docs/plan.md)
- [2주차 주간 개발 계획](https://github.com/connect-AIAgentChallenge-26-1/hub/issues/700)
