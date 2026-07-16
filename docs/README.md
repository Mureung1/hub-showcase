# Project Documentation

이 디렉터리는 AY-PLE의 제품 기획, 기술 구조, 의사결정, agent 운영 문서를 보관합니다. 캠프 제출 조건에 맞춰 기획서를 포함한 formal project docs는 루트 [README.md](../README.md)에서도 링크로 접근 가능해야 합니다.

## 디렉터리 컨벤션

| 위치 | 역할 | 예시 |
| --- | --- | --- |
| `docs/product/` | 제품 문제정의, 사용자, MVP 범위, UX 원칙과 제품 계획 | `ay-ple-product-brief.md` |
| `docs/architecture/` | 오래 유지될 기술 구조와 시스템 경계 | `codex-runtime-isolation.md` |
| `docs/specs/` | Matt Pocock `/to-spec`이 생성하는 local spec artifact | `2026-07-09-runtime-harness.md` |
| `docs/tickets/` | Matt Pocock `/to-tickets`가 생성하는 local implementation ticket 묶음 | `runtime-harness/001-runtime-core.md` |
| `docs/wayfinding/<effort>/` | Matt Pocock `/wayfinder`의 map, decision ticket과 evidence asset | `runtime-client/map.md` |
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
│   ├── inspector/
│   └── chat-shell/
├── docs/
│   ├── README.md
│   ├── product/
│   ├── architecture/
│   ├── specs/
│   ├── tickets/
│   ├── wayfinding/
│   ├── spikes/
│   ├── adr/
│   ├── archive/
│   └── agents/
├── packages/
│   ├── runtime-core/
│   ├── runtime-fake/
│   ├── runtime-codex/
│   └── codex-chat-runtime/
└── spikes/
    └── codex-runtime-ownership/
```

Root companion docs:

| 문서 | 역할 |
| --- | --- |
| [../AGENTS.md](../AGENTS.md) | Codex 작업 규칙과 브랜치/PR 컨벤션 |
| [../CONTEXT.md](../CONTEXT.md) | AY-PLE의 현재 domain glossary |

## 문서 상태 모델

문서의 현재성과 성숙도를 한 `상태` 값에 섞지 않는다.

| 축 | 값 | 의미 |
| --- | --- | --- |
| 분류 | 활성 | 현재 제품·아키텍처·개발 판단의 기준으로 유지한다. |
| 분류 | 기술 참고 | 조사 시점의 저수준 사실과 대안을 보존한다. 상단의 현재 판정을 우선하고 본문을 현재 제품 우선순위로 해석하지 않는다. |
| 분류 | 완료·역사 기록 | 당시의 계획, 구현, prototype, 의사결정을 보존한다. 새 설계의 기준으로 사용할 때는 활성 문서와 교차 확인한다. |
| 성숙도 | 초안 | 검토 중이며 채택된 기준으로 사용하지 않는다. |
| 성숙도 | 채택 | 현재 의도와 경계를 표현하는 기준으로 사용한다. |
| 성숙도 | 구현됨 | 코드와 검증 표면까지 현재 설명과 일치한다. |

`소개 문서`, `기술 메모`, `백로그` 같은 값은 문서 역할이지 상태가 아니다. 활성 문서가 초안일 수는 있지만, 이 경우 소비 문서는 해당 내용을 채택된 결정처럼 인용하지 않는다. 문서 상단에 상태를 표시할 때는 `분류`와 필요한 경우 `성숙도`를 별도 필드로 쓴다.

## 현재 문서

### 활성 제품·아키텍처

| 문서 | 위치 | 역할 |
| --- | --- | --- |
| AY-PLE는 어떤 앱인가 | [product/ay-ple-overview.md](product/ay-ple-overview.md) | 제품 소개와 대표 사용 흐름 |
| AY-PLE Product Brief | [product/ay-ple-product-brief.md](product/ay-ple-product-brief.md) | 문제 정의, 제품 테제, MVP 경계 |
| Review Workspace Scenario | [product/ay-ple-review-workspace-scenario.md](product/ay-ple-review-workspace-scenario.md) | 자료 선택부터 Review까지의 사용자 시나리오 |
| AY-PLE Design System Direction | [product/ay-ple-design-system.md](product/ay-ple-design-system.md) | 브랜드와 데스크톱 UI 기준 |
| AY-PLE 개발 백로그 | [product/ay-ple-development-backlog.md](product/ay-ple-development-backlog.md) | 날짜 없는 계층형 task list와 작업 순서·완료 조건 |
| Codex-native product composition | [architecture/codex-native-product-composition.md](architecture/codex-native-product-composition.md) | `ModelingRecipe → ModelingInvocation → ModelingRun`과 native Codex의 mapping |
| Codex Runtime 격리 | [architecture/codex-runtime-isolation.md](architecture/codex-runtime-isolation.md) | runtime, app data, SemesterWorkspace 실행 경계 |
| Runtime Harness 구현 지도 | [architecture/runtime-harness-implementation-map.md](architecture/runtime-harness-implementation-map.md) | developer-only Harness의 구현 현황과 gap |
| Codex App Server method 목록 | [architecture/codex-app-server-method-inventory.md](architecture/codex-app-server-method-inventory.md) | pinned stable·experimental raw method와 AY-PLE 연결·채택 현황 |
| Academic object model ADR | [adr/0002-use-first-class-academic-objects-with-derived-operational-views.md](adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Assignment/Exam과 derived view 결정 |
| Runtime history storage ADR | [adr/0004-split-runtime-history-semantics-from-workspace-storage.md](adr/0004-split-runtime-history-semantics-from-workspace-storage.md) | 진단 이력과 제품 저장 책임 분리 |
| Codex 우선 사용 ADR | [adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md](adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) | 4주 MVP 실행 엔진과 protocol isolation 결정 |
| 제품 실행 경로 분리 ADR | [adr/0006-separate-package-app-data-and-semester-workspace-roots.md](adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | package, app data, SemesterWorkspace 경계 |
| Native Codex composition ADR | [adr/0007-use-native-codex-composition-for-product-actions.md](adr/0007-use-native-codex-composition-for-product-actions.md) | Recipe·Invocation·Run의 제품 실행 경계를 나누는 결정 |
| macOS-first local web app ADR | [adr/0009-use-a-macos-first-local-web-app-product-path.md](adr/0009-use-a-macos-first-local-web-app-product-path.md) | 첫 제품 실행·지원 환경과 후속 Desktop App 경계 결정 |
| Codex Chat Shell runtime ADR | [adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md](adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md) | Official Python SDK direct reuse와 supervised Node bridge 결정 |

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
| Runtime Harness Foundation Spec | [specs/2026-07-09-runtime-harness-codex-adapter-foundation.md](specs/2026-07-09-runtime-harness-codex-adapter-foundation.md) | 구현 완료 · 1주차 기준선 |
| Runtime Harness Hardening Spec | [specs/2026-07-10-runtime-harness-hardening.md](specs/2026-07-10-runtime-harness-hardening.md) | 구현 완료 · tickets 001–005 완료 |
| AY-PLE 4주 제출 백로그 | [archive/2026-07-ay-ple-4-week-submission-backlog.md](archive/2026-07-ay-ple-4-week-submission-backlog.md) | 최초 캠프 제출 일정과 당시 우선순위 보존 |
| Runtime Ownership Spike Plan | [spikes/codex-runtime-ownership/plan.md](spikes/codex-runtime-ownership/plan.md) | 실행 완료 · 당시 범위와 성공 기준 |
| Runtime auth ADR | [adr/0001-use-file-auth-store-for-runtime-spike.md](adr/0001-use-file-auth-store-for-runtime-spike.md) | Runtime Ownership Spike의 인증 저장 결정 |
| Runtime Harness ADR | [adr/0003-build-runtime-harness-before-product-layer.md](adr/0003-build-runtime-harness-before-product-layer.md) | 1주차 선행 구현 결정과 기준선 |
| Headless Codex Client Host ADR | [adr/0008-separate-headless-codex-client-host-from-product-ui.md](adr/0008-separate-headless-codex-client-host-from-product-ui.md) | ADR 0011이 대체한 모든 capability를 한곳에 둔 Host Seam의 당시 결정 |

### Agent 운영

| 문서 | 위치 | 분류 |
| --- | --- | --- |
| Agent issue tracker rules | [agents/issue-tracker.md](agents/issue-tracker.md) | 활성 |
| Agent triage marker rules | [agents/triage-labels.md](agents/triage-labels.md) | 활성 |
| Agent domain docs layout | [agents/domain.md](agents/domain.md) | 활성 |

## 문서 유형별 책임

문서를 작성하거나 변경할 때 적용하는 공통 언어·형식, 루트 README 인덱스와 로컬 산출물 운영 규칙은 [AGENTS.md의 Documentation Style](../AGENTS.md#documentation-style)을 따른다. 이 문서는 문서 배치, 상태 분류와 문서 유형별 책임을 정의한다.

| 문서 유형 | 소유하는 내용 | 소유하지 않는 내용 |
| --- | --- | --- |
| `CONTEXT.md` | AY-PLE 고유 도메인 용어의 짧은 정의와 피해야 할 해석 | protocol mapping, 저장 schema, 구현 계획 |
| 제품 Overview | 처음 보는 독자를 위한 제품 서사, 대표 경험과 현재 진행 요약 | 도메인·실행 계약의 신규 정의, 상세 MVP와 구현 현황 |
| Product Brief | 사용자 문제, 제품 가치, MVP 범위와 제품이 소유하는 상태 | protocol field, runtime path 상세, 실행 backlog |
| 제품 Scenario | 사용자 흐름, 화면 의미와 UI copy | 도메인 정의 재작성, runtime 계약과 시각 token |
| Design System | 브랜드, 시각 원칙, token과 component 표현 기준 | 제품 범위, 사용자 흐름과 runtime 계약 |
| ADR | 되돌리기 어렵고 대안 비교가 필요한 결정과 결과 | 현재 구현 현황, 우선순위, 상세 사용 안내 |
| 아키텍처 문서 | 채택된 결정이 만드는 오래 유지될 시스템 경계와 기술 mapping | 결정의 재논증, 작업 순서와 완료 상태 |
| 구현 지도 | 여러 package를 가로지르는 현재 topology, 구현 gap과 검증 표면 | package별 사용 안내, 미래 제품 계약과 우선순위 |
| package README | 해당 package의 현재 책임, API·설정·명령과 제약 | 시스템 전체 topology, 미래 제품 계약과 우선순위 |
| Development Backlog | 작업 순서, 상태와 완료 조건 | 도메인·아키텍처 정의의 독립적인 정본 |
| Spike | 질문, 성공 기준, 관찰 결과와 저수준 근거 | 현재 제품 우선순위와 채택된 결정 |
| Spec·implementation ticket·Wayfinder artifact | 특정 구현 slice의 범위, 기술 contract, acceptance criteria, 또는 구현 전 결정 탐색 | 완료 이후의 현재 아키텍처와 제품 source of truth |

## 정본 위계

같은 주제를 여러 문서가 언급할 수 있지만 normative information은 아래 책임 주체가 나눠 소유한다.

| 정보 | 정본 | 소비 문서의 허용 범위 |
| --- | --- | --- |
| 도메인 용어와 의미 | [CONTEXT.md](../CONTEXT.md) | 사용자 맥락에 필요한 한 줄 요약과 glossary 링크 |
| 제품 문제, 가치와 MVP 범위 | [AY-PLE Product Brief](product/ay-ple-product-brief.md) | 소개·Scenario·Backlog에서 필요한 범위만 요약 |
| 사용자 흐름과 화면 의미 | [Review Workspace Scenario](product/ay-ple-review-workspace-scenario.md) | 구현 문서에서는 UI 결과만 참조 |
| 브랜드와 시각 표현 기준 | [Design System](product/ay-ple-design-system.md) | Scenario·구현 문서에서는 필요한 표현 결과만 참조 |
| 채택한 기술·제품 결정 | 해당 [ADR](adr/) | architecture·제품 문서는 결정의 결과만 설명하고 ADR을 연결 |
| 제품 작업의 Codex mapping | [Codex-native product composition](architecture/codex-native-product-composition.md) | 제품 문서는 사용자 의미, 구현 문서는 현재 지원 여부만 설명 |
| runtime root의 소유권 불변 조건 | [ADR 0006](adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | 다른 문서는 결정 결과만 요약하고 ADR을 연결 |
| runtime 격리의 현재·목표·후속 기술 배치 | [Codex Runtime 격리](architecture/codex-runtime-isolation.md) | 구현 문서는 현재 동작만, Backlog는 후속 일정만 설명 |
| Runtime Harness의 횡단 topology와 gap | [Runtime Harness 구현 지도](architecture/runtime-harness-implementation-map.md) | 제품 문서는 구현 여부만 짧게 요약 |
| package별 현재 동작과 명령 | 관련 package README, 코드와 테스트 | 구현 지도와 소비 문서는 필요한 사실만 요약하고 package 문서를 연결 |
| App Server raw method 존재와 method별 연결·채택 판단 | [Codex App Server method 목록](architecture/codex-app-server-method-inventory.md) | 백로그는 필요한 method를 완료 조건의 근거로만 연결하고 method 표를 복제하지 않음 |
| 작업 순서, 상태와 완료 조건 | [AY-PLE 개발 백로그](product/ay-ple-development-backlog.md) | 다른 문서는 `구현됨` 또는 `미구현`만 표현하고 작업 순서를 두지 않음 |
| protocol·runtime 저수준 근거 | 관련 기술 참고 Spike | 활성 문서는 채택한 결론만 사용하고 조사 본문을 현재 계획으로 재해석하지 않음 |

실제 코드 동작과 구현 문서가 다르면 코드와 테스트를 현재 사실로 보고 구현 문서를 즉시 갱신한다. 반대로 아직 구현되지 않은 채택 목표는 코드의 현재 동작처럼 쓰지 않는다.

## 서술과 변경 규칙

- 정본을 먼저 변경하고 `정본 → 기술 설명 → 사용자·구현 소비 문서 → 인덱스` 순서로 파급한다.
- 소비 문서는 독자가 현재 문맥을 이해하는 데 필요한 결과만 요약하고 정본을 직접 연결한다.
- 구성 필드, cardinality, persistence 계약, 결정 근거와 우선순위 표를 여러 문서에 복사하지 않는다.
- architecture 문서는 `현재 구현`, `채택한 제품 목표`, `후속 결정`을 구분한다. 구현되지 않은 목표에 현재형을 쓰지 않는다.
- 작업 순서와 완료 상태는 Development Backlog만 소유한다. architecture와 구현 지도는 gap을 설명할 수 있지만 별도 우선순위를 부여하지 않는다.
- 새 AY-PLE 도메인 용어는 `CONTEXT.md`에서 먼저 정의한다. protocol 및 구현 식별자는 glossary에 추가하지 않는다.
- 문서 역할상 필요한 반복은 허용한다. Overview의 입문 요약, Scenario의 UI 번역, package README의 현재 지원 여부, Backlog의 acceptance criteria는 정본을 바꾸지 않는 범위에서 유지한다.
- 문서를 새로 만들기 전에 기존 정본의 섹션으로 책임을 수용할 수 있는지 먼저 확인한다.
