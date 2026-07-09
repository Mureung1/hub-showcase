# AY-PLE

AI Agent Challenge 4주 동안의 활동을 진행할 메인 작업 저장소입니다.

현재 프로젝트 아이템은 **AY-PLE(에이플)**입니다. AY-PLE는 사용자의 컴퓨터에 학기 작업환경을 만들고, 시간표·자료·과제·시험 준비를 AY와 함께 운영하는 local-first 학업 에이전트 앱을 목표로 합니다.

## 문서

기획서를 포함한 formal project docs는 이 README에서 링크로 접근할 수 있게 관리합니다. 문서 추가 위치와 분류 기준은 [docs/README.md](docs/README.md)를 따릅니다.

| 구분 | 문서 | 용도 |
| --- | --- | --- |
| 문서 컨벤션 | [docs/README.md](docs/README.md) | 프로젝트 문서 위치와 관리 규칙 |
| 제품 기획 | [AY-PLE Product Brief](docs/product/ay-ple-product-brief.md) | 문제 정의, 제품 테제, MVP 방향 |
| 제품 기획 | [Review Workspace Scenario](docs/product/ay-ple-review-workspace-scenario.md) | 사용자 시나리오와 화면 단위 prototype 구조 |
| 제품 기획 | [AY-PLE Design System Direction](docs/product/ay-ple-design-system.md) | 밝은 학업 워크스페이스 중심의 브랜드/UI 기준 |
| 기술 구조 | [Codex Runtime Isolation](docs/architecture/codex-runtime-isolation.md) | Codex runtime 격리와 실행 경계 |
| 기술 구조 | [Runtime Harness 구현 지도](docs/architecture/runtime-harness-implementation-map.md) | Runtime Harness 구현 이후의 모듈 지도와 parity/gap 정리 |
| Spike 계획 | [Runtime Ownership Spike Plan](docs/spikes/codex-runtime-ownership/plan.md) | Codex 실행환경 소유권 PoC 계획 |
| ADR | [0001. Use file auth store for runtime spike](docs/adr/0001-use-file-auth-store-for-runtime-spike.md) | runtime spike의 인증 저장소 결정 |
| ADR | [0002. Use first-class academic objects](docs/adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Assignment/Exam canonical model과 derived operational view 결정 |
| ADR | [0003. Build runtime harness before product layer](docs/adr/0003-build-runtime-harness-before-product-layer.md) | Runtime Harness 선행과 CodexRuntimeAdapter parity gate 결정 |
| ADR | [0004. Split runtime history semantics from workspace storage](docs/adr/0004-split-runtime-history-semantics-from-workspace-storage.md) | Runtime Diagnostic History의 lifecycle 의미와 workspace storage 구현 책임 분리 |
| Agent 운영 | [Issue Tracker](docs/agents/issue-tracker.md) | issue, PRD, PR 요청 표면 규칙 |
| Agent 운영 | [Triage Labels](docs/agents/triage-labels.md) | triage 상태 마커 규칙 |
| Agent 운영 | [Domain Docs](docs/agents/domain.md) | domain docs와 ADR 위치 규칙 |
| Root companion | [AGENTS.md](AGENTS.md) | Codex 작업 규칙과 브랜치/PR 컨벤션 |
| Root companion | [CONTEXT.md](CONTEXT.md) | AY-PLE 핵심 용어와 피해야 할 표현 |

## 문서 구조

```text
.
├── README.md
├── AGENTS.md
├── CONTEXT.md
├── apps/
│   ├── server/
│   └── inspector/
├── docs/
│   ├── README.md
│   ├── product/
│   ├── architecture/
│   ├── prds/
│   ├── issues/
│   ├── spikes/
│   ├── adr/
│   └── agents/
├── packages/
│   ├── runtime-core/
│   ├── runtime-fake/
│   └── runtime-codex/
└── spikes/
    └── codex-runtime-ownership/
```

## 현재 스택

| 영역 | 위치 | 설명 |
| --- | --- | --- |
| Server app | `apps/server/` | Express companion API, runtime kernel 소유자, SSE event stream host |
| Inspector app | `apps/inspector/` | prompt run, events, logs, history, Codex status, capability slots를 보는 Vite React Runtime Inspector |
| Runtime core | `packages/runtime-core/` | `AgentRuntimeKernel`, 정규화된 run 생명주기, adapter 계약, run logs/history |
| Fake runtime | `packages/runtime-fake/` | happy path, cancellation, failure scenario를 위한 결정적 adapter |
| Codex runtime | `packages/runtime-codex/` | Codex app-server raw client, adapter, 생성된 internal protocol type, status/smoke helper |
| Runtime API | `/api/runtime/*` | 브라우저에 안전한 runtime run, cancel, history, SSE, Codex status, capability metadata endpoint |
| Health check | `/api/health` | 서버와 Inspector 연결 확인용 엔드포인트 |

## 명령어

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run build
npm run lint -w @ay-ple/inspector
```

Codex app-server initialize smoke는 live runtime 상태를 건드릴 수 있으므로 필요할 때 명시적으로 실행합니다.

```bash
npm run smoke:codex -w @ay-ple/runtime-codex
```

아직 라우터, DB, 제품 인증, 상태관리 선택지는 고정하지 않습니다. Runtime Harness는 developer-facing 기반이며, SourceSelection, StatePatch, Review, TrustedState 같은 AY-PLE product behavior는 runtime parity 이후 별도 product layer에서 구현합니다.
