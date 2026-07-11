# AY-PLE

AI Agent Challenge 4주 동안의 활동을 진행할 메인 작업 저장소입니다.

현재 프로젝트 아이템은 **AY-PLE(에이플)**입니다. 학생이 공지, 강의계획서, 수업 자료를 고르면 AY가 필요한 정보를 찾아 원본 근거와 함께 변경안을 제시하고, 학생이 확인한 내용만 과제·일정·할 일로 이어주는 local-first 학업 Agent 앱을 만들고 있습니다.

## 처음 보는 분은 여기부터

> **[AY-PLE는 어떤 앱인가](docs/product/ay-ple-overview.md)** — AI Agent가 앱 안에서 학생을 위해 어떻게 일하는지, 실제 사용 장면을 따라 이해하는 소개입니다.

## 발표와 동적 데모

```bash
npm run demo:week1
```

- [Week 1 발표 자료와 실행 안내](artifacts/week1-demo/README.md)
- [동적 제품 prototype](spikes/ay-ple-ui-prototype/guided-demo.html)

## 문서

기획서를 포함한 formal project docs는 이 README에서 링크로 접근할 수 있게 관리합니다. 문서 추가 위치와 분류 기준은 [docs/README.md](docs/README.md)를 따릅니다.

| 구분 | 문서 | 용도 |
| --- | --- | --- |
| 제품 소개 | [AY-PLE는 어떤 앱인가](docs/product/ay-ple-overview.md) | 처음 보는 사람을 위한 제품 소개와 동작 시나리오 |
| 문서 컨벤션 | [docs/README.md](docs/README.md) | 프로젝트 문서 위치와 관리 규칙 |
| 제품 기획 | [AY-PLE Product Brief](docs/product/ay-ple-product-brief.md) | 문제 정의, 제품 테제, MVP 방향 |
| 제품 기획 | [Review Workspace Scenario](docs/product/ay-ple-review-workspace-scenario.md) | 사용자 시나리오와 화면 단위 prototype 구조 |
| 제품 기획 | [AY-PLE Design System Direction](docs/product/ay-ple-design-system.md) | 밝은 학업 워크스페이스 중심의 브랜드/UI 기준 |
| 개발 계획 | [AY-PLE 4주 개발 백로그](docs/product/ay-ple-development-backlog.md) | 4주 개발 로드맵, 우선순위, 다음 주 확정 Task와 기능 후보 |
| 기술 구조 | [Codex Runtime 격리](docs/architecture/codex-runtime-isolation.md) | Codex runtime 격리와 실행 경계 |
| 기술 구조 | [Runtime Harness 구현 지도](docs/architecture/runtime-harness-implementation-map.md) | Runtime Harness 구현 이후의 모듈 지도와 parity/gap 정리 |
| Spike 계획 | [Runtime Ownership Spike Plan](docs/spikes/codex-runtime-ownership/plan.md) | Codex 실행환경 소유권 PoC 계획 |
| 스파이크 조사 | [에이전트 실행 엔진 재사용 후보 조사](docs/spikes/agent-runtime-reuse-landscape/research.md) | 실행 엔진 재사용 후보 조사와 Codex 우선 사용 후속 판단 |
| ADR | [0001. Use file auth store for runtime spike](docs/adr/0001-use-file-auth-store-for-runtime-spike.md) | runtime spike의 인증 저장소 결정 |
| ADR | [0002. Use first-class academic objects](docs/adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Assignment/Exam canonical model과 derived operational view 결정 |
| ADR | [0003. Build runtime harness before product layer](docs/adr/0003-build-runtime-harness-before-product-layer.md) | Runtime Harness 선행과 CodexRuntimeAdapter parity gate 결정 |
| ADR | [0004. Split runtime history semantics from workspace storage](docs/adr/0004-split-runtime-history-semantics-from-workspace-storage.md) | Runtime Diagnostic History의 lifecycle 의미와 workspace storage 구현 책임 분리 |
| ADR | [0005. 4주 제품 수직 흐름에 Codex App Server 우선 사용](docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) | 4주 동안 Codex의 제어 기능과 CoControl 구현을 우선하고 다중 엔진 중립화를 미루는 결정 |
| ADR | [0006. 제품 실행 경로의 소유권 분리](docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | 패키지, 기기별 앱 데이터, 사용자가 소유한 학기 작업공간의 경로와 수명 분리 |
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
| Runtime core | `packages/runtime-core/` | Runtime Harness용 `AgentRuntimeKernel`, 단일 실행 생명주기, 어댑터 계약, 실행 기록·이력 |
| Fake runtime | `packages/runtime-fake/` | happy path, cancellation, failure scenario를 위한 결정적 adapter |
| Codex runtime | `packages/runtime-codex/` | Codex app-server raw client, adapter, 생성된 internal protocol type, status/smoke helper |
| Runtime API | `/api/runtime/*` | 브라우저에 안전한 runtime run, cancel, history, SSE, Codex status, capability metadata endpoint |
| Health check | `/api/health` | 서버와 Inspector 연결 확인용 엔드포인트 |

## 명령어

```bash
npm install
npm run dev
npm run demo:week1
npm test
npm run typecheck
npm run build
npm run lint -w @ay-ple/inspector
```

Codex app-server initialize smoke는 live runtime 상태를 건드릴 수 있으므로 필요할 때 명시적으로 실행합니다.

```bash
npm run smoke:codex -w @ay-ple/runtime-codex
```

아직 라우터, DB, 제품 인증, 상태관리 선택지는 고정하지 않습니다. Runtime Harness의 여섯 가지 이벤트 생명주기는 개발자용 단일 실행 진단 기반이며 제품 전체 상호작용 계약이 아닙니다. 4주 제품 경로는 Codex App Server를 우선 지원하고, SourceSelection, CoControl, StatePatch, Review, TrustedState를 별도 제품 계층에서 구현합니다.
