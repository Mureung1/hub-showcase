# SemesterOps

AI Agent Challenge 4주 동안의 활동을 진행할 메인 작업 저장소입니다.

현재 프로젝트 아이템은 **SemesterOps**입니다. SemesterOps는 사용자의 컴퓨터에 학기 작업환경을 만들고, 시간표·자료·과제·시험 준비를 AI와 함께 운영하는 local-first 학업 에이전트 앱을 목표로 합니다.

## 문서

기획서를 포함한 formal project docs는 이 README에서 링크로 접근할 수 있게 관리합니다. 문서 추가 위치와 분류 기준은 [docs/README.md](docs/README.md)를 따릅니다.

| 구분 | 문서 | 용도 |
| --- | --- | --- |
| 문서 컨벤션 | [docs/README.md](docs/README.md) | 프로젝트 문서 위치와 관리 규칙 |
| 제품 기획 | [SemesterOps Product Brief](docs/product/semesterops-product-brief.md) | 문제 정의, 제품 테제, MVP 방향 |
| 제품 기획 | [Review Workspace Scenario](docs/product/semesterops-review-workspace-scenario.md) | 사용자 시나리오와 화면 단위 prototype 구조 |
| 기술 구조 | [Codex Runtime Isolation](docs/architecture/codex-runtime-isolation.md) | Codex runtime 격리와 실행 경계 |
| Spike 계획 | [Runtime Ownership Spike Plan](docs/spikes/codex-runtime-ownership/plan.md) | Codex 실행환경 소유권 PoC 계획 |
| ADR | [0001. Use file auth store for runtime spike](docs/adr/0001-use-file-auth-store-for-runtime-spike.md) | runtime spike의 인증 저장소 결정 |
| ADR | [0002. Use first-class academic objects](docs/adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Assignment/Exam canonical model과 derived operational view 결정 |
| Agent 운영 | [Issue Tracker](docs/agents/issue-tracker.md) | issue, PRD, PR 요청 표면 규칙 |
| Agent 운영 | [Triage Labels](docs/agents/triage-labels.md) | triage 상태 마커 규칙 |
| Agent 운영 | [Domain Docs](docs/agents/domain.md) | domain docs와 ADR 위치 규칙 |
| Root companion | [AGENTS.md](AGENTS.md) | Codex 작업 규칙과 브랜치/PR 컨벤션 |
| Root companion | [CONTEXT.md](CONTEXT.md) | SemesterOps 핵심 용어와 피해야 할 표현 |

## 문서 구조

```text
.
├── README.md
├── AGENTS.md
├── CONTEXT.md
├── docs/
│   ├── README.md
│   ├── product/
│   ├── architecture/
│   ├── spikes/
│   ├── adr/
│   └── agents/
└── spikes/
    └── codex-runtime-ownership/
```

## 현재 스택

| 영역 | 위치 | 설명 |
| --- | --- | --- |
| Server | `server/` | Express API 서버 |
| Client | `client/` | Vite React 클라이언트 |
| Health check | `/api/health` | 서버와 클라이언트 연결 확인용 엔드포인트 |

## 명령어

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

아직 라우터, DB, 인증, 상태관리 선택지는 고정하지 않습니다. 제품 specification과 runtime adapter 경계를 먼저 확정한 뒤 필요한 의존성을 추가합니다.
