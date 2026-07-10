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
date modified: 2026-07-10
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
  - "[[김규태]]"
  - "[[financial-order-latency-lab]]"
  - "[[Graduation-elasticsearch]]"
  - "[[cuee]]"
  - "[[harness]]"
  - "[[LLM Wiki Pattern]]"
  - "[[Ingest-Query-Lint Cycle]]"
  - "[[Human-AI Knowledge Boundary]]"
status: active
---

# MOC-Portfolio

> 이 Map of Content는 이 vault를 취업 포트폴리오 Evidence Wiki로 쓰기 위한 운영 허브다.

---

## Target Profile

- **Owner**: [[김규태]]
- **Current status**: 개발자 취업준비생, 대학교 3학년, 학부연구생
- **Portfolio objective**: 백엔드 개발자 취업, 장기적으로 풀스택 개발자로 성장
- **Preferred tone**: 열정과 성장가능성이 드러나되, 백엔드 성능·데이터 처리·설계·개발·팀 리딩 근거가 있는 취업준비생 톤
- **Primary language**: Python
- **GitHub-based stack**: Python, Java, Kotlin, TypeScript/React, JavaScript, C, Shell/PowerShell, Dockerfile, PLpgSQL
- **Public profiles**: [GitHub](https://github.com/gyutaetae), [Velog](https://velog.io/@gyutaetae/posts), [LinkedIn](https://www.linkedin.com/in/%EA%B7%9C%ED%83%9C-%EA%B9%80-90763b407/), [Instagram](https://www.instagram.com/kyu_tae_/)

---

## Portfolio Spine

현재 포트폴리오 spine은 아래 순서를 기본값으로 둔다.

| Priority | Project | Portfolio Role |
|----------|---------|----------------|
| 1 | [[financial-order-latency-lab]] | 백엔드 성능 실험, p99 latency, 부하 테스트, 병목 분석 |
| 2 | [[Graduation-elasticsearch]] | 학부연구생/연구 경험, JavaParser, Elasticsearch Java source-test traceability |
| 3 | [[cuee]] | 경남권 창업동아리 대상작, 노인 모빌리티 예약 길잡이 앱 |
| 4 | [[harness]] | 커서맛피아님 harness를 참고해 앱 개발에 맞게 개인화한 Codex 개발 workflow |

이 순서는 사용자가 명시적으로 바꾸기 전까지 유지한다. 새 자료를 ingest할 때는 이 세 프로젝트 중 어느 축을 강화하는지 먼저 판단한다.

---

## Project Evidence Map

| Project | What To Prove | Missing Evidence |
|---------|---------------|------------------|
| [[financial-order-latency-lab]] | 금융 주문 서버의 p99 latency를 CPU 계산, sync log, GPU scoring 경합 조건에서 측정하고 완화 전략을 해석했다 | 수업 요구사항, 본인 담당 범위, 실험 설계 이유, 발표자료, 추가 Linux 재측정 여부 |
| [[Graduation-elasticsearch]] | JavaParser AST/Symbol Solver로 Elasticsearch Java Client의 TEST FILE -> SOURCE FILE trace link를 추출·검증했다 | 연구실/졸업 연구 맥락, 논문 alignment, 본인 기여율, 실험 목적, 지도/피드백 |
| [[cuee]] | 노인 사용자의 모빌리티 예약 문제를 앱으로 풀었고, 팀장으로 제품 방향과 구현을 이끌었다 | 대상작 증빙, 팀 규모, 담당 기능, 앱 화면, 사용자 시나리오, 발표자료, 심사 피드백 |
| [[harness]] | 기존 harness를 그대로 쓰지 않고 앱 개발에 맞춰 개인화해 Codex 기반 개발 생산성을 높였다 | 원본 참고점, 수정한 구조, 자동화 흐름, 사용 예시, 실제 앱 개발에 준 효과, 한계와 개선 계획 |

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
- 창업동아리 대상 수상/평가 자료
- 연구실 활동 기록, 연구 주제 메모, 담당 업무 기록
- GitHub README, 주요 commit, issue, PR, release note

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

## Resume Positioning

현재 기본 포지셔닝:

> Codex를 적극 활용해 앱 개발과 프로젝트 증거화를 수행하는 개발자 취업준비생. 데이터베이스 수업 프로젝트, 창업동아리 대상작, 개인화된 개발 harness 경험을 통해 설계·성능·개발·팀 리딩 역량을 키워가고 있다.

백엔드 중심으로 다듬은 기본 포지셔닝:

> Python을 주 언어로 백엔드 성능 실험과 데이터 처리 프로젝트를 쌓아온 개발자 취업준비생. 금융 주문 서버의 p99 latency 실험, JavaParser 기반 Elasticsearch traceability 분석, Android 앱 제품화 경험을 통해 성능·데이터·사용자 문제를 함께 이해하는 풀스택 지향 백엔드 개발자로 성장하고 있다.

이 문장은 아직 초안이다. 실제 이력서에는 지원 직무와 회사 유형에 맞춰 더 날카롭게 다듬는다.

---

## Query Prompts

자주 쓸 query:

```text
/query 금융권 백엔드/시스템 직무에 맞게 내 프로젝트 3개를 STAR 형식으로 정리해줘
```

```text
/query 개발자 취업준비생 톤으로 financial-order-latency-lab을 면접에서 2분 안에 설명할 수 있게 정리해줘
```

```text
/query Graduation-elasticsearch를 학부연구생 연구 경험으로 백엔드/데이터 직무에 맞게 설명해줘
```

```text
/query 내 포트폴리오에서 가장 강한 증거와 약한 증거를 취업 관점으로 구분해줘
```

```text
/query 이력서 프로젝트 bullet 5개 만들어줘. 수치와 검증 중심으로.
```

```text
/query 내가 판단한 것과 에이전트에게 맡긴 것을 프로젝트별로 분리해서 정리해줘
```

```text
/query cuee를 노인 모빌리티 예약 문제 해결 앱으로 설명하는 자기소개서 문단을 만들어줘
```

```text
/query harness 프로젝트를 Codex 기반 개발 생산성 개선 경험으로 정리해줘
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
> `financial-order-latency-lab`, `Graduation-elasticsearch`, `cuee`, `harness`의 README, docs, 성능 결과, 회고를 아직 이 vault에 체계적으로 ingest하지 않았다.

> [!question] Resume output template
> 이력서 bullet, STAR 답변, 자기소개서 문단을 저장할 Query Result 템플릿을 별도로 만들지 않았다.

> [!question] Target role sharpening
> 목표 직무는 백엔드로 정했지만, API 서버 / 데이터베이스 / 검색·Elasticsearch / 성능·인프라 중 어느 축을 1순위로 밀지 정해야 이력서 문장이 강해진다.

> [!question] Quantified results
> 프로젝트별 성능 수치, 팀 규모, 기간, 수상 증빙, 사용자/테스트 결과가 아직 부족하다.

---

## Related

- [[Core Context]]
- [[김규태]]
- [[financial-order-latency-lab]]
- [[Graduation-elasticsearch]]
- [[cuee]]
- [[harness]]
- [[LLM Wiki Pattern]]
- [[Ingest-Query-Lint Cycle]]
- [[Human-AI Knowledge Boundary]]
