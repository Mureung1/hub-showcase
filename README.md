# TeamFlow

팀 프로젝트의 프로젝트·할 일·팀원·자료를 한 공간에서 관리하는 웹 서비스입니다.

## Workspace

- `apps/web`: React + Vite 프론트엔드
- `apps/api`: Node.js + Express API
- `packages/shared`: 프론트엔드와 API가 공유하는 JavaScript 계약
- `references/figma-ai-prototype`: Figma AI 생성 코드 참고본

## Commands

Node.js 24.14.0 이상 25 미만을 사용합니다. `.nvmrc`가 동일 버전을 고정합니다.

```bash
nvm use
npm install
npm run dev:web
npm run dev:api
npm run lint
npm test
npm run build
```

현재 1차 구현은 `/projects`의 프로젝트 목록 화면만 다룹니다. Supabase 연결과 프로젝트 내부 화면은 첫 화면 검수 이후에 진행합니다.

## 프로젝트 문서

- [기획서](./docs/plan.md)
