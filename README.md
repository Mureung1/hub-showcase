<h1 align="center">
  <img src="assets/brand/ay-ple-logo.png" width="560" alt="AY-PLE">
</h1>

<p align="center">
  <strong>흩어진 학업 자료를, 근거와 함께 확인 가능한 학기 정보로.</strong>
</p>

<p align="center">
  Local-first 학업 Agent · Codex App Server · TypeScript 기반 npm workspace
</p>

<p align="center">
  <a href="docs/product/ay-ple-overview.md">제품 소개</a> ·
  <a href="spikes/ay-ple-ui-prototype/guided-demo.html">동적 prototype</a> ·
  <a href="docs/architecture/runtime-harness-implementation-map.md">구현 지도</a> ·
  <a href="docs/product/ay-ple-development-backlog.md">개발 백로그</a>
</p>

## AY-PLE는 무엇인가

AY-PLE(에이플)는 학생이 한 학기 작업공간에서 공지, 강의계획서, 수업 자료를 고르면 AY가 필요한 정보를 찾고, 원본 근거가 연결된 변경안을 제시하는 local-first 학업 Agent 앱입니다. 학생이 확인한 내용만 학기 상태에 반영합니다.

현재 코드베이스에는 Codex App Server를 앱 전용 환경에서 실행하고 관찰하는 Runtime Harness가 구현되어 있습니다. 학생용 화면은 Review Workspace prototype 단계이며, 선택한 자료부터 AY의 제안, 사용자의 결정까지 이어지는 실제 실행 경로는 아직 구현되지 않았습니다. 세부 우선순위와 완료 조건은 [개발 백로그](docs/product/ay-ple-development-backlog.md)를 따릅니다.

| 둘러볼 곳 | 무엇을 볼 수 있나 |
| --- | --- |
| [AY-PLE는 어떤 앱인가](docs/product/ay-ple-overview.md) | AI Agent가 앱 안에서 학생을 위해 일하는 대표 사용 흐름 |
| [Review Workspace Scenario](docs/product/ay-ple-review-workspace-scenario.md) | 자료 선택, 원본 근거, 변경 제안과 수락으로 이어지는 화면 경험 |
| [Runtime Harness 구현 지도](docs/architecture/runtime-harness-implementation-map.md) | 현재 구현된 앱·패키지 topology와 남은 연결 지점 |
| [Codex-native product composition](docs/architecture/codex-native-product-composition.md) | 제품 action과 Codex primitive 사이의 구조적 mapping |

## 빠른 시작

```bash
npm install
npm run dev
```

`npm run dev`는 Express server와 Vite 기반 Runtime Inspector를 함께 실행합니다. 현재 개발자용 실행 화면의 자세한 사용법은 [Inspector README](apps/inspector/README.md)와 [Server README](apps/server/README.md)에서 확인할 수 있습니다.

## 1주차 발표 기록

아래 발표와 prototype은 1주차 당시의 산출물로 보존한다. 현재 제품·아키텍처 기준은 활성 문서를 우선하며, 내부 아키텍처가 안정된 뒤 발표 서사를 별도로 갱신한다.

```bash
npm run demo:week1
```

- [Week 1 발표 자료와 실행 안내](artifacts/week1-demo/README.md)
- [동적 제품 prototype](spikes/ay-ple-ui-prototype/guided-demo.html)

## 프로젝트 문서

기획서를 포함한 formal project docs는 이 README에서 링크로 접근할 수 있게 관리합니다. 이 목록은 탐색을 위한 mirror이며, 문서의 분류·역할·배치 기준은 [docs/README.md](docs/README.md)가 소유합니다.

### 활성 문서

| 구분 | 문서 | 용도 |
| --- | --- | --- |
| 제품 소개 | [AY-PLE는 어떤 앱인가](docs/product/ay-ple-overview.md) | 처음 보는 사람을 위한 제품 소개와 대표 사용 흐름 |
| 제품 기획 | [AY-PLE Product Brief](docs/product/ay-ple-product-brief.md) | 문제 정의, 제품 테제, MVP 경계 |
| 제품 시나리오 | [Review Workspace Scenario](docs/product/ay-ple-review-workspace-scenario.md) | 자료 선택부터 Review까지의 사용자 시나리오 |
| 제품 디자인 | [AY-PLE Design System Direction](docs/product/ay-ple-design-system.md) | 밝은 학업 워크스페이스 중심의 브랜드/UI 기준 |
| 개발 계획 | [AY-PLE 개발 백로그](docs/product/ay-ple-development-backlog.md) | 날짜 없는 계층형 task list와 작업 순서·완료 조건 |
| 제품↔Codex 구조 | [Codex-native product composition](docs/architecture/codex-native-product-composition.md) | `ModelingRecipe → ModelingInvocation → ModelingRun`과 native Codex의 mapping |
| Runtime 구조 | [Codex Runtime 격리](docs/architecture/codex-runtime-isolation.md) | Codex runtime, app data, 사용자 workspace의 실행 경계 |
| 구현 현황 | [Runtime Harness 구현 지도](docs/architecture/runtime-harness-implementation-map.md) | 개발자용 Harness의 현재 모듈 지도와 구현 gap |
| Capability 현황 | [Codex App Server method 목록](docs/architecture/codex-app-server-method-inventory.md) | pinned stable·experimental raw method와 AY-PLE 연결·채택 현황 |
| ADR | [0002. First-class academic objects](docs/adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Assignment/Exam canonical model과 derived view 결정 |
| ADR | [0004. Runtime history와 workspace storage 분리](docs/adr/0004-split-runtime-history-semantics-from-workspace-storage.md) | 개발자 진단 이력과 제품 저장 책임 분리 |
| ADR | [0005. Codex App Server 우선 사용](docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) | 4주 MVP의 실행 엔진과 protocol isolation 결정 |
| ADR | [0006. 제품 실행 경로 소유권 분리](docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | package, app data, SemesterWorkspace 경로와 수명 분리 |
| ADR | [0007. Native Codex composition으로 제품 작업 실행](docs/adr/0007-use-native-codex-composition-for-product-actions.md) | Recipe·Invocation·Run의 제품 실행 경계를 나누는 결정 |
| ADR | [0008. Headless Codex Client Host와 제품 UI adapter 분리](docs/adr/0008-separate-headless-codex-client-host-from-product-ui.md) | headless module과 제품 UI adapter의 seam을 나누는 결정 |
| ADR | [0009. macOS-first local web app 제품 경로](docs/adr/0009-use-a-macos-first-local-web-app-product-path.md) | 첫 제품 실행·지원 환경과 후속 Desktop App 경계 결정 |

### 기술 참고 문서

| 문서 | 용도 |
| --- | --- |
| [Codex App Server context delivery capability 조사](docs/spikes/codex-app-server-context-delivery/research.md) | context·request·tool·Hook 전달 경로와 case별 선택 근거 |
| [Codex session topology 조사](docs/spikes/codex-session-topology/research.md) | thread·turn·item·compaction·resume의 저수준 의미와 topology 위험 |
| [Codex local Memories 아키텍처 조사](docs/spikes/codex-memory-architecture/research.md) | built-in memory pipeline, personalization surface, scope·privacy 제약 |
| [에이전트 실행 엔진 재사용 후보 조사](docs/spikes/agent-runtime-reuse-landscape/research.md) | Codex 직접 사용과 ACP·대체 실행 엔진 비교 근거 |

### 완료·역사 기록

| 문서 | 용도 |
| --- | --- |
| [Week 1 발표 자료](artifacts/week1-demo/README.md) | 1주차 당시 발표 서사와 실행 안내 |
| [동적 제품 prototype](spikes/ay-ple-ui-prototype/guided-demo.html) | 1주차 Review Workspace UI 검증 기록 |
| [AY-PLE 4주 제출 백로그](docs/archive/2026-07-ay-ple-4-week-submission-backlog.md) | 최초 캠프 제출 일정과 당시 우선순위 보존 |
| [Runtime Ownership Spike Plan](docs/spikes/codex-runtime-ownership/plan.md) | 완료된 실행환경 소유권 Spike의 당시 계획 |
| [0001. Runtime Spike file auth store](docs/adr/0001-use-file-auth-store-for-runtime-spike.md) | Runtime Ownership Spike의 인증 저장 결정 |
| [0003. Runtime Harness 선행](docs/adr/0003-build-runtime-harness-before-product-layer.md) | 1주차 Runtime Harness 선행 결정과 구현 기준선 |

### 문서·Agent 운영

| 문서 | 용도 |
| --- | --- |
| [docs/README.md](docs/README.md) | 프로젝트 문서 위치, 상태 분류와 관리 규칙 |
| [Issue Tracker](docs/agents/issue-tracker.md) | spec, implementation ticket, PR 요청 표면 규칙 |
| [Triage Labels](docs/agents/triage-labels.md) | triage 상태 마커 규칙 |
| [Domain Docs](docs/agents/domain.md) | domain docs와 ADR 위치 규칙 |
| [AGENTS.md](AGENTS.md) | Codex 작업 규칙과 브랜치/PR 컨벤션 |
| [CONTEXT.md](CONTEXT.md) | AY-PLE의 현재 domain glossary |

## 코드베이스 구성

| 영역 | 위치 | 설명 |
| --- | --- | --- |
| Brand assets | `assets/brand/` | AY-PLE 로고, 마크, AY 프로필 이미지의 프로젝트 공용 원본 |
| Server app | `apps/server/` | Express companion API, runtime kernel 소유자, SSE event stream host |
| Inspector app | `apps/inspector/` | prompt run, events, logs, history, Codex status, capability slots를 보는 Vite React Runtime Inspector |
| Runtime core | `packages/runtime-core/` | Runtime Harness용 `AgentRuntimeKernel`, 단일 실행 생명주기, 어댑터 계약, 실행 기록·이력 |
| Fake runtime | `packages/runtime-fake/` | happy path, cancellation, failure scenario를 위한 결정적 adapter |
| Codex runtime | `packages/runtime-codex/` | Codex app-server raw client, adapter, 생성된 internal protocol type, status/smoke helper |
| Runtime API | `/api/runtime/*` | 브라우저에 안전한 runtime run, cancel, history, SSE, Codex status, capability metadata endpoint |
| Health check | `/api/health` | 서버와 Inspector 연결 확인용 엔드포인트 |

## 개발 명령어

```bash
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

아직 DB, 제품 인증, 상태관리 선택지는 고정하지 않습니다. Runtime Harness의 여섯 가지 이벤트 생명주기는 개발자용 단일 실행 진단 기반이며 제품 전체 상호작용 계약이 아닙니다. 4주 제품 경로는 Codex App Server를 우선 사용하고 [`ModelingRecipe → ModelingInvocation → ModelingRun`](docs/architecture/codex-native-product-composition.md)으로 재사용 정의, 일회성 요청과 실행 receipt를 구분합니다. AY-PLE는 `RawMaterial`, `EvidenceRef`, `StatePatch`, `UserConfirmation`, `SemesterModel` 같은 학업 상태와 Review 경험을 소유합니다. 현재 구현 gap은 [Runtime Harness 구현 지도](docs/architecture/runtime-harness-implementation-map.md)를 따릅니다.
