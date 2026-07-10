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
date modified: 2026-07-10
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
