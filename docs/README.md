# Project Documentation

이 디렉터리는 AY-PLE의 제품 기획, 기술 구조, 의사결정, agent 운영 문서를 보관합니다. 캠프 제출 조건에 맞춰 기획서를 포함한 formal project docs는 루트 [README.md](../README.md)에서도 링크로 접근 가능해야 합니다.

## 디렉터리 컨벤션

| 위치 | 역할 | 예시 |
| --- | --- | --- |
| `docs/product/` | 제품 문제정의, 사용자, MVP 범위, UX 원칙 | `ay-ple-product-brief.md` |
| `docs/architecture/` | 오래 유지될 기술 구조와 시스템 경계 | `codex-runtime-isolation.md` |
| `docs/prds/` | Matt Pocock `/to-prd`가 생성하는 local PRD artifact | `2026-07-09-runtime-harness.md` |
| `docs/issues/` | Matt Pocock `/to-issues`가 생성하는 local issue brief 묶음 | `runtime-harness/001-runtime-core.md` |
| `docs/spikes/<slug>/` | spike 계획, 질문, 성공 기준, handoff 가능한 조사 기록 | `codex-runtime-ownership/plan.md` |
| `docs/adr/` | 되돌리기 어려운 기술/제품 결정 | `0001-use-file-auth-store-for-runtime-spike.md` |
| `docs/agents/` | agent 작업 규칙, issue tracker, triage, branch/PR 운영 | `issue-tracker.md` |
| `docs/archive/` | stale 되었지만 삭제하지 않을 과거 문서 | 필요할 때 생성 |

실행 가능한 spike 코드와 생성된 보고서는 `spikes/<slug>/` 아래에 둘 수 있습니다. 이 산출물은 formal docs index의 기본 범위에 넣지 않고, 필요한 경우 `docs/spikes/<slug>/` 문서에서 연결합니다.

## 문서 트리

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

Root companion docs:

| 문서 | 역할 |
| --- | --- |
| [../AGENTS.md](../AGENTS.md) | Codex 작업 규칙과 브랜치/PR 컨벤션 |
| [../CONTEXT.md](../CONTEXT.md) | AY-PLE의 현재 domain glossary |

## 현재 문서

문서 상태는 다음 세 범주로 구분한다.

| 상태 | 의미 |
| --- | --- |
| 활성 | 현재 제품·아키텍처·개발 판단의 기준으로 사용한다. |
| 기술 참고 | 조사 시점의 저수준 사실과 대안을 보존한다. 상단의 현재 판정을 우선하고 본문을 현재 제품 우선순위로 해석하지 않는다. |
| 완료·역사 기록 | 당시의 계획, 구현, prototype, 의사결정을 보존한다. 새 설계의 기준으로 사용할 때는 활성 문서와 교차 확인한다. |

### 활성 제품·아키텍처

| 문서 | 위치 | 역할 |
| --- | --- | --- |
| AY-PLE는 어떤 앱인가 | [product/ay-ple-overview.md](product/ay-ple-overview.md) | 제품 소개와 대표 사용 흐름 |
| AY-PLE Product Brief | [product/ay-ple-product-brief.md](product/ay-ple-product-brief.md) | 문제 정의, 제품 테제, MVP 경계 |
| Review Workspace Scenario | [product/ay-ple-review-workspace-scenario.md](product/ay-ple-review-workspace-scenario.md) | 자료 선택부터 Review까지의 사용자 시나리오 |
| AY-PLE Design System Direction | [product/ay-ple-design-system.md](product/ay-ple-design-system.md) | 브랜드와 데스크톱 UI 기준 |
| AY-PLE 4주 개발 백로그 | [product/ay-ple-development-backlog.md](product/ay-ple-development-backlog.md) | 초안 v0.5 · composition과 Review 수직 흐름 중심 계획 |
| Codex-native product composition | [architecture/codex-native-product-composition.md](architecture/codex-native-product-composition.md) | 제품 Action을 native Codex input으로 조합하는 현재 mapping |
| Codex Runtime 격리 | [architecture/codex-runtime-isolation.md](architecture/codex-runtime-isolation.md) | runtime, app data, SemesterWorkspace 실행 경계 |
| Runtime Harness 구현 지도 | [architecture/runtime-harness-implementation-map.md](architecture/runtime-harness-implementation-map.md) | developer-only Harness의 구현 현황과 gap |
| Academic object model ADR | [adr/0002-use-first-class-academic-objects-with-derived-operational-views.md](adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Assignment/Exam과 derived view 결정 |
| Runtime history storage ADR | [adr/0004-split-runtime-history-semantics-from-workspace-storage.md](adr/0004-split-runtime-history-semantics-from-workspace-storage.md) | 진단 이력과 제품 저장 책임 분리 |
| Codex 우선 사용 ADR | [adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md](adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) | 4주 MVP 실행 엔진과 protocol isolation 결정 |
| 제품 실행 경로 분리 ADR | [adr/0006-separate-package-app-data-and-semester-workspace-roots.md](adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | package, app data, SemesterWorkspace 경계 |
| Native Codex composition ADR | [adr/0007-use-native-codex-composition-for-product-actions.md](adr/0007-use-native-codex-composition-for-product-actions.md) | ModelingRecipe를 native turn input으로 실행하는 결정 |

### 기술 참고

| 문서 | 위치 | 현재 쓰임 |
| --- | --- | --- |
| Codex App Server context delivery capability 조사 | [spikes/codex-app-server-context-delivery/research.md](spikes/codex-app-server-context-delivery/research.md) | case별 전달 capability를 고를 때의 protocol 근거 |
| Codex session topology 조사 | [spikes/codex-session-topology/research.md](spikes/codex-session-topology/research.md) | 고정 topology를 피하면서 lifecycle 특성을 확인하는 근거 |
| Codex local Memories 아키텍처 조사 | [spikes/codex-memory-architecture/research.md](spikes/codex-memory-architecture/research.md) | built-in Memories의 scope·privacy·수명 근거 |
| 에이전트 실행 엔진 재사용 후보 조사 | [spikes/agent-runtime-reuse-landscape/research.md](spikes/agent-runtime-reuse-landscape/research.md) | ACP 또는 두 번째 엔진 요구가 생길 때의 비교 기준 |

### 완료·역사 기록

| 문서 | 위치 | 기록 |
| --- | --- | --- |
| Runtime Harness Foundation PRD | [prds/2026-07-09-runtime-harness-codex-adapter-foundation.md](prds/2026-07-09-runtime-harness-codex-adapter-foundation.md) | 구현 완료 · 1주차 기준선 |
| Runtime Harness Hardening PRD | [prds/2026-07-10-runtime-harness-hardening.md](prds/2026-07-10-runtime-harness-hardening.md) | 구현 완료 · issues 001–005 완료 |
| Runtime Ownership Spike Plan | [spikes/codex-runtime-ownership/plan.md](spikes/codex-runtime-ownership/plan.md) | 실행 완료 · 당시 범위와 성공 기준 |
| Runtime auth ADR | [adr/0001-use-file-auth-store-for-runtime-spike.md](adr/0001-use-file-auth-store-for-runtime-spike.md) | Runtime Ownership Spike의 인증 저장 결정 |
| Runtime Harness ADR | [adr/0003-build-runtime-harness-before-product-layer.md](adr/0003-build-runtime-harness-before-product-layer.md) | 1주차 선행 구현 결정과 기준선 |

### Agent 운영

| 문서 | 위치 | 상태 |
| --- | --- | --- |
| Agent issue tracker rules | [agents/issue-tracker.md](agents/issue-tracker.md) | 활성 |
| Agent triage marker rules | [agents/triage-labels.md](agents/triage-labels.md) | 활성 |
| Agent domain docs layout | [agents/domain.md](agents/domain.md) | 활성 |

## 문서 유형별 책임

문서를 작성하거나 변경할 때 적용하는 공통 언어·형식, 루트 README 인덱스와 로컬 산출물 운영 규칙은 [AGENTS.md의 Documentation Style](../AGENTS.md#documentation-style)을 따른다. 이 문서는 문서 배치, 상태 분류와 문서 유형별 책임을 정의한다.

- 제품 문서는 사용자 문제, 흐름, 범위에 집중한다.
- 아키텍처 문서는 오래 유지될 기술 경계에 집중한다.
- 스파이크 문서는 질문, 성공 기준, 관찰 결과, 후속 결정에 집중한다.
