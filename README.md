# 소상공인 정부 지원금 큐레이터

정부 지원금 정보가 여러 기관 사이트에 흩어져 있어, 소상공인이 자신에게 맞는
지원금을 한눈에 파악하기 어려운 문제를 해결하는 서비스입니다.

## 문서 지도

| 파일 | 역할 |
|------|------|
| [`CONTEXT.md`](./CONTEXT.md) | 제품 언어·현재 기술스택/제약을 빠르게 파악 |
| [`AGENTS.md`](./AGENTS.md) | 작업 유형별 확인할 문서, 코딩·커밋·PR 규칙 (`CLAUDE.md`는 이 파일의 심볼릭 링크) |
| [`docs/plan.md`](./docs/plan.md) | 기획서 — 문제 정의, MVP 범위, 화면 흐름 (제품 스펙 단일 소스) |
| [`docs/user-stories.md`](./docs/user-stories.md) | Epic·유저 스토리·인수 조건 |
| [`docs/week2_plan.md`](./docs/week2_plan.md) / [`docs/week3_plan.md`](./docs/week3_plan.md) | 주차별 계획·이슈 진행 현황 (유일한 상태 소스) |
| [`prototype/gov_subsidy_home_wireframe.html`](./prototype/gov_subsidy_home_wireframe.html) | UI/UX 와이어프레임 |
| [`.cursor/skills/gov-subsidy-design/`](./.cursor/skills/gov-subsidy-design/) | 디자인 구현 Skill |
| [`.cursor/skills/issue-workflow/`](./.cursor/skills/issue-workflow/) | 이슈 계획→구현→PR 워크플로우 Skill |

## 로컬 실행

```bash
git clone <repo-url>
cd hub
npm install
cp .env.example .env
npm run dev          # client + server 동시 실행
```

- API 헬스체크: `GET http://localhost:3001/api/health`
- 지원금 목록: `GET http://localhost:3001/api/subsidies`

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 클라이언트 + 서버 동시 실행 |
| `npm run dev:client` / `npm run dev:server` | 각각 단독 실행 |
| `npm run build` | 서버 + 클라이언트 빌드 |
| `npm test` | 전체 워크스페이스 테스트 |
| `npm run lint` | oxlint |
| `npm run run -w @hub/crawler` | 기업마당 크롤러 수동 실행 |
