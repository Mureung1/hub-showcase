---
type: moc
aliases:
  - Portfolio MOC
  - 취업 포트폴리오
  - Portfolio Evidence Wiki
description: Map of Content for using this LLM Wiki as a job-search portfolio evidence backend, centered on project proof, interview stories, resume bullets, and reusable career artifacts.
author:
  - Codex
date created: 2026-07-07
date modified: 2026-07-07
tags:
  - moc
  - portfolio
  - career
  - evidence
topic:
  - portfolio
  - career
  - project-evidence
related:
  - "[[Core Context]]"
  - "[[LLM Wiki Pattern]]"
  - "[[Ingest-Query-Lint Cycle]]"
  - "[[Human-AI Knowledge Boundary]]"
status: active
---

# MOC-Portfolio

> 이 Map of Content는 이 vault를 취업 포트폴리오 Evidence Wiki로 쓰기 위한 운영 허브다.

---

## Portfolio Spine

현재 포트폴리오 spine은 아래 순서를 기본값으로 둔다.

| Priority | Project | Portfolio Role |
|----------|---------|----------------|
| 1 | `financial-order-latency-lab` | 시스템/성능/금융 도메인 강점 |
| 2 | `cuee` | 사용자 문제 정의, 접근성, 제품화 경험 |
| 3 | `harness` | 에이전트 워크플로, 자동화, 개발 생산성 |

이 순서는 사용자가 명시적으로 바꾸기 전까지 유지한다. 새 자료를 ingest할 때는 이 세 프로젝트 중 어느 축을 강화하는지 먼저 판단한다.

---

## Evidence To Ingest

`00. Inbox/`에 넣고 `/ingest`할 우선 자료:

- 프로젝트 README, docs, architecture note
- 성능 측정 결과, 그래프, before/after 수치
- 트러블슈팅 로그와 실패 기록
- GitHub issue, PR, commit 설명
- 발표자료, 회고, TIL
- 자기소개서 초안, 이력서 초안, 면접 답변 초안
- Codex와 같이 작업한 대화 중 중요한 기술 판단

권장 `collectionPurpose`:

```text
취업/포트폴리오 - 이 자료를 프로젝트 증거로 보존하고 이력서/면접 답변에 재사용하기 위해 수집
```

---

## Evidence Page Shape

프로젝트 관련 Wiki page나 Query result는 가능한 한 아래 구조로 정리한다.

| Field | Question |
|-------|----------|
| Problem | 어떤 문제를 풀었나? |
| My Judgment | 내가 직접 판단한 것은 무엇인가? |
| Agent Work | 에이전트에게 맡긴 것은 무엇인가? |
| Implementation | 무엇을 만들었나? |
| Verification | 어떻게 검증했나? |
| Metric | 전후 수치나 결과는 무엇인가? |
| Failure | 실패와 수정은 무엇이었나? |
| Interview Line | 면접에서 1문장으로 어떻게 말할 것인가? |
| Evidence | Raw Source, GitHub, log, graph 등 근거는 어디인가? |

---

## Query Prompts

자주 쓸 query:

```text
/query 금융권 백엔드/시스템 직무에 맞게 내 프로젝트 3개를 STAR 형식으로 정리해줘
```

```text
/query financial-order-latency-lab을 면접에서 2분 안에 설명할 수 있게 정리해줘
```

```text
/query 내 포트폴리오에서 가장 강한 증거와 약한 증거를 구분해줘
```

```text
/query 이력서 프로젝트 bullet 5개 만들어줘. 수치와 검증 중심으로.
```

```text
/query 내가 판단한 것과 에이전트에게 맡긴 것을 프로젝트별로 분리해서 정리해줘
```

---

## Quality Gate

포트폴리오에 쓰기 전에 확인할 기준:

- 수치가 있는가?
- 검증 명령이나 재현 방법이 있는가?
- 내가 직접 판단한 내용이 분리되어 있는가?
- 에이전트가 한 작업을 과장하지 않았는가?
- 실패 기록이 삭제되지 않고 설명되어 있는가?
- GitHub/Raw Source/Query Result 근거가 연결되어 있는가?
- 면접에서 2분 안에 설명 가능한가?

---

## Current Gaps

> [!question] Project evidence ingest
> `financial-order-latency-lab`, `cuee`, `harness`의 README, docs, 성능 결과, 회고를 아직 이 vault에 체계적으로 ingest하지 않았다.

> [!question] Resume output template
> 이력서 bullet, STAR 답변, 자기소개서 문단을 저장할 Query Result 템플릿을 별도로 만들지 않았다.

---

## Related

- [[Core Context]]
- [[LLM Wiki Pattern]]
- [[Ingest-Query-Lint Cycle]]
- [[Human-AI Knowledge Boundary]]
