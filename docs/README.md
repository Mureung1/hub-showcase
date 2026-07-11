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
| [../CONTEXT.md](../CONTEXT.md) | AY-PLE 핵심 용어와 피해야 할 표현 |

## 현재 문서

| 문서 | 위치 | 상태 |
| --- | --- | --- |
| AY-PLE는 어떤 앱인가 | [product/ay-ple-overview.md](product/ay-ple-overview.md) | 소개 문서 |
| AY-PLE Product Brief | [product/ay-ple-product-brief.md](product/ay-ple-product-brief.md) | 제출 준비 |
| AY-PLE Review Workspace Scenario | [product/ay-ple-review-workspace-scenario.md](product/ay-ple-review-workspace-scenario.md) | Draft |
| AY-PLE Design System Direction | [product/ay-ple-design-system.md](product/ay-ple-design-system.md) | Draft |
| AY-PLE 4주 개발 백로그 | [product/ay-ple-development-backlog.md](product/ay-ple-development-backlog.md) | 초안 v0.4 |
| Codex Runtime 격리 | [architecture/codex-runtime-isolation.md](architecture/codex-runtime-isolation.md) | 초안 |
| Runtime Harness 구현 지도 | [architecture/runtime-harness-implementation-map.md](architecture/runtime-harness-implementation-map.md) | 활성 |
| Runtime Harness and Codex Adapter Foundation PRD | [prds/2026-07-09-runtime-harness-codex-adapter-foundation.md](prds/2026-07-09-runtime-harness-codex-adapter-foundation.md) | 구현 완료 · 1주차 기록 |
| Runtime Harness Hardening PRD | [prds/2026-07-10-runtime-harness-hardening.md](prds/2026-07-10-runtime-harness-hardening.md) | 구현 완료 · 이슈 001–005 완료 |
| Runtime Ownership Spike Plan | [spikes/codex-runtime-ownership/plan.md](spikes/codex-runtime-ownership/plan.md) | Draft |
| 에이전트 실행 엔진 재사용 후보 조사 | [spikes/agent-runtime-reuse-landscape/research.md](spikes/agent-runtime-reuse-landscape/research.md) | 조사 완료 · 결정은 ADR 0005 |
| Runtime auth ADR | [adr/0001-use-file-auth-store-for-runtime-spike.md](adr/0001-use-file-auth-store-for-runtime-spike.md) | Accepted |
| Academic object model ADR | [adr/0002-use-first-class-academic-objects-with-derived-operational-views.md](adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Accepted |
| Runtime harness ADR | [adr/0003-build-runtime-harness-before-product-layer.md](adr/0003-build-runtime-harness-before-product-layer.md) | Accepted |
| Runtime history storage ADR | [adr/0004-split-runtime-history-semantics-from-workspace-storage.md](adr/0004-split-runtime-history-semantics-from-workspace-storage.md) | Accepted |
| 4주 제품 수직 흐름 Codex 우선 사용 ADR | [adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md](adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) | 채택 |
| 제품 실행 경로 분리 ADR | [adr/0006-separate-package-app-data-and-semester-workspace-roots.md](adr/0006-separate-package-app-data-and-semester-workspace-roots.md) | 채택 |
| Agent issue tracker rules | [agents/issue-tracker.md](agents/issue-tracker.md) | Active |
| Agent triage marker rules | [agents/triage-labels.md](agents/triage-labels.md) | Active |
| Agent domain docs layout | [agents/domain.md](agents/domain.md) | Active |

## 작성 규칙

- 문장 구조와 일반 설명어는 한국어로 작성한다. 프로젝트에서 이미 정한 도메인 용어와 프로토콜 메서드·타입, 패키지명, 파일 경로, 코드 식별자 같은 고유 식별자는 원문 표기를 유지한다.
- 비교 항목, 선택지, 장단점, 위험, 열린 질문, 정보 모델은 가능한 한 표로 정리한다.
- 빠르게 훑어볼 목록은 글머리표로 정리한다.
- 제품 문서는 사용자 문제, 흐름, 범위에 집중한다.
- 아키텍처 문서는 오래 유지될 기술 경계에 집중한다.
- 스파이크 문서는 질문, 성공 기준, 관찰 결과, 후속 결정에 집중한다.
- Matt Pocock PRD와 이슈 브리프는 사용자가 GitHub 게시를 명시적으로 요청하지 않는 한 `docs/prds/`와 `docs/issues/`에 로컬 문서로 둔다.
- `docs/` 아래 공식 프로젝트 문서를 추가하거나 옮기면 같은 변경에서 루트 README 링크 표도 갱신한다.
