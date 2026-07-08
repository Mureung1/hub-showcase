# Project Documentation

이 디렉터리는 SemesterOps의 제품 기획, 기술 구조, 의사결정, agent 운영 문서를 보관합니다. 캠프 제출 조건에 맞춰 기획서를 포함한 formal project docs는 루트 [README.md](../README.md)에서도 링크로 접근 가능해야 합니다.

## 디렉터리 컨벤션

| 위치 | 역할 | 예시 |
| --- | --- | --- |
| `docs/product/` | 제품 문제정의, 사용자, MVP 범위, UX 원칙 | `semesterops-product-brief.md` |
| `docs/architecture/` | 오래 유지될 기술 구조와 시스템 경계 | `codex-runtime-isolation.md` |
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

Root companion docs:

| 문서 | 역할 |
| --- | --- |
| [../AGENTS.md](../AGENTS.md) | Codex 작업 규칙과 브랜치/PR 컨벤션 |
| [../CONTEXT.md](../CONTEXT.md) | SemesterOps 핵심 용어와 피해야 할 표현 |

## 현재 문서

| 문서 | 위치 | 상태 |
| --- | --- | --- |
| SemesterOps Product Brief | [product/semesterops-product-brief.md](product/semesterops-product-brief.md) | Draft |
| SemesterOps Review Workspace Scenario | [product/semesterops-review-workspace-scenario.md](product/semesterops-review-workspace-scenario.md) | Draft |
| Codex Runtime Isolation | [architecture/codex-runtime-isolation.md](architecture/codex-runtime-isolation.md) | Draft |
| Runtime Ownership Spike Plan | [spikes/codex-runtime-ownership/plan.md](spikes/codex-runtime-ownership/plan.md) | Draft |
| Runtime auth ADR | [adr/0001-use-file-auth-store-for-runtime-spike.md](adr/0001-use-file-auth-store-for-runtime-spike.md) | Accepted |
| Academic object model ADR | [adr/0002-use-first-class-academic-objects-with-derived-operational-views.md](adr/0002-use-first-class-academic-objects-with-derived-operational-views.md) | Accepted |
| Agent issue tracker rules | [agents/issue-tracker.md](agents/issue-tracker.md) | Active |
| Agent triage marker rules | [agents/triage-labels.md](agents/triage-labels.md) | Active |
| Agent domain docs layout | [agents/domain.md](agents/domain.md) | Active |

## 작성 규칙

- Prefer tables for comparable items, tradeoffs, risks, open questions, and information models.
- Prefer bullet points for scannable lists.
- Keep product docs focused on user problems, workflows, and scope.
- Keep architecture docs focused on durable technical boundaries.
- Keep spike docs focused on the question, success criteria, observations, and follow-up decisions.
- When moving or adding a formal project document under `docs/`, update the root README link table in the same change.
