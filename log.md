---
type: log
aliases:
  - Change Log
  - Wiki Log
  - Ingest Log
description: Chronological log of all wiki operations — ingests, queries, lint fixes, and structural changes. Append-only; entries use `## [YYYY-MM-DD] operation | title` prefix for grep-based parsing.
author:
  - "[[김규태]]"
date created: 2026-07-07
date modified: 2026-07-12
tags:
  - system
  - log
status: active
---

# 📝 LLM Wiki — Change Log

> 모든 wiki 변경사항을 시간순으로 기록합니다. **Append-only** — 기존 항목을 수정하지 마세요.
>
> **Entry format (Karpathy-style)**: `## [YYYY-MM-DD] operation | title`
>
> **Quick scan**:
>
> ```bash
> grep "^## \[" log.md | tail -10   # 최근 10개 operation
> grep "^## \[.*\] ingest" log.md   # ingest만 필터
> ```
>
> **Operations**: `ingest`, `update`, `create`, `lint`, `query`, `restructure`, `cleanup`

---

## [2026-04-12] ingest | Karpathy LLM Wiki Gist (example)

- Source: [[2026-04-12-Karpathy-LLM-Wiki]]
- Origin: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- Raw Source 저장: `10. Raw Sources/11. Articles/`
- Wiki 페이지 생성 (10):
	- Concepts (4): [[LLM Wiki Pattern]], [[RAG vs Compiled Wiki]], [[3-Layer Architecture]], [[Ingest-Query-Lint Cycle]]
	- Entities (3): [[Andrej Karpathy]], [[Vannevar Bush]], [[Memex]]
	- Guides (1): [[Obsidian Tooling for LLM Wiki]]
	- Maps (2): [[MOC-Knowledge Management]], [[MOC-LLM Wiki Guide]]
- **예시 ingest** — 이 볼트가 어떻게 성장하는지 보여주기 위한 샘플. 본인 소스 ingest 시작 시 이 entry 아래에 append.

## [2026-07-07] create | Vault initialized

- Cloned from [cmds-llm-wiki template](https://github.com/johnfkoo951/cmds-llm-wiki)
- Core Context 채움 완료 (§1 정체성, §2 재활용 축, ...)
- 첫 ingest 진행 예정

## [2026-07-07] ingest | 에이전트를 위한 지식 베이스 : LLM Wiki 활용

- Source: [[2026-07-07-에이전트를-위한-지식-베이스-LLM-Wiki-활용]]
- Origin: https://www.youtube.com/watch?v=MRTQwBFURJs&t=1317s
- Collection purpose: 학술/CMDS 시스템 — 내가 앞으로 LLM Wiki를 공부하기 위한 학습 자료
- Raw Source 저장: `10. Raw Sources/11. Articles/`
- Mode: A standalone — mothership search skipped, `mainVaultRelated` / `mainVaultCmds` left empty
- Wiki 페이지 생성 (7):
	- Concepts (4): [[LLM Wiki as Learning Base]], [[Mothership-Satellite Vault Pattern]], [[Agent-Readable Metadata]], [[Human-AI Knowledge Boundary]]
	- Entities (2): source-specific lecture entities later removed during local owner cleanup
	- Guides (1): [[Web Clipper to Inbox Workflow]]
- Wiki 페이지 업데이트 (6):
	- Concepts (3): [[LLM Wiki Pattern]], [[3-Layer Architecture]], [[Ingest-Query-Lint Cycle]]
	- Guides (1): [[Obsidian Tooling for LLM Wiki]]
	- Maps (2): [[MOC-Knowledge Management]], [[MOC-LLM Wiki Guide]]
	- Index (1): [[index]]

## [2026-07-07] query | LLM Wiki 볼트의 학술적 가치

- Query: LLM Wiki 볼트의 학술적 가치와 Zotero/Bookends 서지정보 인용 연동 가능성
- Saved: [[2026-07-07-Q-LLM-Wiki-vault-academic-value]]
- Source pages: [[LLM Wiki Pattern]], [[RAG vs Compiled Wiki]], [[3-Layer Architecture]], [[Ingest-Query-Lint Cycle]], [[LLM Wiki as Learning Base]], [[Agent-Readable Metadata]], [[Human-AI Knowledge Boundary]], [[Idea Generation Pipeline]], [[Track Classification and Research Gap Detection]], [[Obsidian Tooling for LLM Wiki]]
- Durable gap captured: [[Citation Manager Integration for LLM Wiki]] guide stub created
- Reuse axis: PhD / 학술 / CMDS 시스템

## [2026-07-07] update | Portfolio Evidence Wiki setup

- Updated: [[Core Context]]
- Created: [[MOC-Portfolio]]
- Purpose: 이 vault를 취업 포트폴리오 관리용 Evidence Wiki로 운영하기 위한 재활용 축, 프로젝트 spine, ingest/query 기준 정렬
- Portfolio spine: `financial-order-latency-lab -> cuee -> harness`
- Reuse axis: 취업/포트폴리오

## [2026-07-10] update | Local setup placeholders filled

- Updated: [[Core Context]], [[AGENTS]], [[CLAUDE]], [[index]], settings templates
- Replaced author placeholder with `김규태`
- Replaced local vault path placeholders with `C:\Users\kym70\OneDrive\Desktop\cmds-llm-wiki-work\cmds-llm-wiki`
- Copied qmd config to `C:\Users\kym70\.config\qmd\index.yml`
- Mode: A standalone — mothership placeholders intentionally left only in optional Mode B documentation/examples

## [2026-07-10] cleanup | Owner identity and inherited entities corrected

- Restored owner display name to [[김규태]]
- Removed inherited lecture/source entity pages from active Wiki
- Created [[김규태]] owner entity draft
- Updated [[index]] and [[MOC-Knowledge Management]] to point to [[김규태]]
- Left raw source transcripts intact unless a separate purge is requested

## [2026-07-10] update | 김규태 취업 포트폴리오 맥락 고도화

- Updated: [[Core Context]], [[김규태]], [[MOC-Portfolio]]
- Added current profile: 개발자 취업준비생, 대학교 3학년, 학부연구생, 경남 진주시 거주
- Added public profiles: GitHub, Velog, LinkedIn, Instagram
- Clarified portfolio purpose: 개발자 취업
- Expanded project spine:
	- `financial-order-latency-lab`: 데이터베이스 수업 프로젝트, 설계·성능 개발
	- `cuee`: 경남권 창업동아리 대상작, 노인 모빌리티 예약 길잡이 앱
	- `harness`: 커서맛피아님 harness를 참고해 앱 개발용으로 개인화한 Codex workflow
- Added positioning tone: 취업준비생 입장에서 열정과 성장가능성이 드러나되, 설계·성능·개발·팀 리딩 근거를 우선

## [2026-07-10] update | GitHub 기반 백엔드 포트폴리오 재정렬

- Updated: [[Core Context]], [[김규태]], [[MOC-Portfolio]], [[index]]
- Created project pages: [[financial-order-latency-lab]], [[Graduation-elasticsearch]], [[cuee]], [[harness]]
- Source reviewed: GitHub profile `gyutaetae` public repositories and README files
- Repositioned target role: 백엔드 개발자 취업, 장기적으로 풀스택 개발자로 성장
- Clarified primary language: Python
- GitHub-based stack: Python, Java, Kotlin, TypeScript/React, JavaScript, C, Shell/PowerShell, Dockerfile, PLpgSQL
- Added `Graduation-elasticsearch` as research/backend evidence between `financial-order-latency-lab` and `cuee`

## [2026-07-11] ingest | 김규태 Personal Raw Context v1

- Source: [[2026-07-11-Kim-Gyutae-Personal-Raw-Context-v1]]
- Origin: User-provided raw terminal/chat text in Codex session
- Collection purpose: 나에 대한 장기 컨텍스트를 축적해 이력서, 면접, 포트폴리오, 블로그, 프로젝트 설명에 반복 재사용하기 위한 개인 원본 프로필
- Raw Source 저장: `10. Raw Sources/15. Clippings/`
- Mode: A standalone — mothership search skipped, `mainVaultRelated` / `mainVaultCmds` left empty
- Wiki 페이지 생성 (2):
	- Concepts (1): [[AI-Augmented Developer Positioning]]
	- Guides (1): [[김규태 Career Narrative]]
- Wiki 페이지 업데이트 (5):
	- [[Core Context]]
	- [[김규태]]
	- [[MOC-Portfolio]]
	- [[financial-order-latency-lab]]
	- [[harness]]
- Key context captured:
	- 목표 직무는 아직 단일 확정이 아니며 백엔드 / 금융 / 드론 / 반도체 도메인 탐색 중
	- 경상국립대학교 소프트웨어공학과 3학년, SEALAB 학부연구생
	- AI 의존 개발자가 아니라 AI를 개발 역량의 증폭기로 활용하는 개발자로 포지셔닝
	- `financial-order-latency-lab`의 시작 동기: 운영체제 수업 CPU latency와 금융 주문 처리 관심
	- Codex 기반 Threads 자동 리서치/업로드 workflow와 팔로워 약 400명 성과는 추가 증빙 필요
- Reuse axis: 취업/포트폴리오, 프로젝트 증거, Codex 개발 워크플로, 에세이/블로그

## [2026-07-12] ingest | 김규태 Leadership Product Context v2

- Source: [[2026-07-12-Kim-Gyutae-Leadership-Product-Context-v2]]
- Origin: User-provided raw chat text in Codex session, plus public Velog/GitHub links
- Collection purpose: 취업/포트폴리오 — 리더십, 교육, 창업/제품 문제정의, 해커톤 템플릿, 향후 보강할 증거를 원본 맥락으로 보존해 이력서와 면접 답변에 재사용
- Raw Source 저장: `10. Raw Sources/15. Clippings/`
- Mode: A standalone — mothership search skipped, `mainVaultRelated` / `mainVaultCmds` left empty
- Wiki 페이지 생성 (1):
	- Guides (1): [[김규태 Leadership and Teaching Evidence]]
- Wiki 페이지 업데이트 (5):
	- [[Core Context]]
	- [[김규태]]
	- [[cuee]]
	- [[MOC-Portfolio]]
	- [[index]]
- Key context captured:
	- `cuee`는 `배우담`의 후속 방향이며, 학습 과정 자체가 고통스럽다는 문제를 보고 현재 화면의 다음 버튼을 마스킹/안내하는 접근성 오버레이로 전환
	- `cuee` 팀 규모는 5명: 디자이너 2명, 기획 2명, 김규태 1명(개발자/팀장)
	- 김규태는 2026년 `실리콘밸리` 취업동아리 대표(20명: 학부생 15명, 교수 5명)
	- 김규태는 2026년 경상국립대학교 멋쟁이사자처럼 14기 부대표
	- GNU 해커톤 템플릿은 다음 달 대회에서 사용할 예정이며, 실제 결과/피드백은 추후 보강
	- 회의록, 예산/지원금 자료, 책 수요조사, 교수 피드백, 백엔드 세션 자료는 추후 Raw Source로 보강 예정
- Reuse axis: 취업/포트폴리오, 프로젝트 증거, 강의/수업/교육, 제품/창업

## [2026-07-12] ingest | Velog Leadership Product Hackathon Bundle

- Source: [[2026-07-12-Velog-Leadership-Product-Hackathon-Bundle]]
- Origin: Public Velog posts and GitHub README
- Collection purpose: 취업/포트폴리오 — 리더십, 제품 문제정의, 해커톤 준비, 백엔드 교육, 실제 고객 문제 해결 경험을 원문 증거로 보존해 이력서와 면접 답변에 재사용
- Raw Source 저장: `10. Raw Sources/15. Clippings/`
- Included sources:
	- `what is leadership?`
	- `실리콘밸리 1주차`
	- `실리콘밸리2`
	- `week2. silicon valley`
	- `멋쟁이사자 아이디어톤(1)`
	- `배우담 개발일지1`
	- `크몽 외주 일지`
	- `GNU_hackathon_templete` README
- Wiki 페이지 업데이트 (4):
	- [[김규태 Leadership and Teaching Evidence]]
	- [[cuee]]
	- [[MOC-Portfolio]]
	- [[index]]
- Reuse axis: 취업/포트폴리오, 강의/수업/교육, 제품/창업, 프로젝트 증거

## [2026-07-23] ingest | 김규태 Personal Operating Manual and Self-Understanding Interview

- Sources:
	- [[2026-07-23-Kim-Gyutae-Personal-Operating-Manual-v1]]
	- [[2026-07-23-Kim-Gyutae-Romantic-Self-Reflection-v1]]
	- [[2026-07-23-Kim-Gyutae-Self-Understanding-Interview-v1]]
- Origin:
	- 사용자가 약 한 달 동안 직접 작성한 `규태 사용설명서`
	- 특정인을 좋아하며 작성한 `새로 태어나기`에서 제3자 정보를 제거한 자기관찰 발췌
	- Codex 인제스트 목적·모호성 질문에 대한 사용자 직접 답변
- Collection purpose: 자기이해와 메타인지를 심화하고, 미래의 AI 에이전트가 김규태에 관한 질문에 빈말보다 사실 기반 멘토링과 행동 개선안을 제공하도록 개인화 지식으로 재사용
- Raw Source 저장: `10. Raw Sources/15. Clippings/`
- Privacy handling:
	- `규태 사용설명서` 원문 전체를 `## Original Content` 아래 보존
	- MBTI 비하 문장은 Raw Source에만 보존하고 Wiki에는 승격하지 않음
	- `새로 태어나기` 원본의 제3자 개인정보와 구체적인 성행위 지침은 저장소에 복사하지 않음
	- 사용자 관련 문장 47개를 원문 그대로 발췌하고 `redacted: true`로 표시
- Mode: A standalone — mothership search skipped, `mainVaultRelated` / `mainVaultCmds` left empty
- Wiki 페이지 생성 (12):
	- Concepts (6): [[김규태 Motivation and Execution Pattern]], [[김규태 Breadth-to-Depth Development Pattern]], [[김규태 Stress and Recovery Pattern]], [[김규태 Leadership Pattern]], [[김규태 Attachment and Romantic Pacing Pattern]], [[김규태 Taste and Intellectual Intimacy]]
	- Guides (5): [[김규태 Personal Operating Manual]], [[김규태 Work and Learning Operating Guide]], [[김규태 Career Values and Success Vision]], [[김규태 Relationship Values]], [[김규태 AI Mentor Response Contract]]
	- Maps (1): [[MOC-김규태 Self Knowledge]]
- Wiki 페이지 업데이트 (3):
	- [[김규태]]
	- [[harness]]
	- [[김규태 Leadership and Teaching Evidence]]
- System pages updated:
	- [[Core Context]]
	- [[index]]
- Key context captured:
	- 빠르게 시작하는 실행력은 강하지만 깊이, 유지보수, 마감 관리가 보완 과제
	- 성장, 돈, 인정, 가시적 사용자 반응이 강한 동기이며 지식 축적과 개발자 정체성도 독립 동기로 존재
	- Threads 자동화는 포맷 실험, 사용자 반응 선택, 템플릿화, GitHub Actions 반복 운영으로 이어졌고 2026-07-23 사용자 자기보고 기준 팔로워 500명
	- AI 에이전트 개발은 T자형 세로축 후보지만 아직 구체 분야가 확정되지 않음
	- 비전·제품 방향·최종 결정은 선호하지만 일정·행정·타인 결과 관리는 보완 과제
	- 관계에서는 솔직함, 자율성, 신뢰, 지적 친밀감을 중시하며 빠른 감정 속도와 장기 반추가 반복 패턴
	- 동의는 자유로운 명시적 긍정과 지속적 확인을 기준으로 정규화
	- AI는 사실, 자기보고, 해석, 본인 책임, 타인 영역, 재발 방지 행동을 분리하는 멘토 역할을 우선
- Open question:
	- T자형 개발 전문성의 세로축은 `AI 에이전트를 이용한 개발`로 탐색 중이며 세부 문제 영역은 미정
- Reuse axis: 자기이해, AI 개인화, 취업/포트폴리오, Codex 개발 워크플로, 관계 메타인지
