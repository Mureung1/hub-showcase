# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Antigravity, etc.) when working with code in this repository.

## Repository Overview

A collection of skills for Claude.ai and Claude Code for senior software engineers. Skills are packaged instructions and scripts that extend Claude and your coding agents capabilities.

## OpenCode Integration

OpenCode uses a **skill-driven execution model** powered by the `skill` tool and this repository's `/skills` directory.

### Core Rules

- If a task matches a skill, you MUST invoke it
- Skills are located in `skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)

### Intent → Skill Mapping

The agent should automatically map user intent to skills:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation`, `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`

### Lifecycle Mapping (Implicit Commands)

OpenCode does not support slash commands like `/spec` or `/plan`.

Instead, the agent must internally follow this lifecycle:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Invoke the appropriate skill using the `skill` tool
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

### Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I’ll gather context first"

Correct behavior:

- Always check for and use skills first

This ensures OpenCode behaves similarly to Claude Code with full workflow enforcement.

## Orchestration: Personas, Skills, and Commands

This repo has three composable layers. They have different jobs and should not be confused:

- **Skills** (`skills/<name>/SKILL.md`) — workflows with steps and exit criteria. The *how*. Mandatory hops when an intent matches.
- **Personas** (`agents/<role>.md`) — roles with a perspective and an output format. The *who*.
- **Slash commands** (`.claude/commands/*.md`) — user-facing entry points. The *when*. The orchestration layer.

Composition rule: **the user (or a slash command) is the orchestrator. Personas do not invoke other personas.** A persona may invoke skills.

The only multi-persona orchestration pattern this repo endorses is **parallel fan-out with a merge step** — used by `/ship` to run `code-reviewer`, `security-auditor`, and `test-engineer` concurrently and synthesize their reports. Do not build a "router" persona that decides which other persona to call; that's the job of slash commands and intent mapping.

See [docs/agents.md](docs/agents.md) for the decision matrix and [references/orchestration-patterns.md](references/orchestration-patterns.md) for the full pattern catalog.

**Claude Code interop:** the personas in `agents/` work as Claude Code subagents (auto-discovered from this plugin's `agents/` directory) and as Agent Teams teammates (referenced by name when spawning). Two platform constraints align with our rules: subagents cannot spawn other subagents, and teams cannot nest. Plugin agents silently ignore the `hooks`, `mcpServers`, and `permissionMode` frontmatter fields.

## Creating a New Skill

> **Before you start:** run the pre-flight checks in [CONTRIBUTING.md](CONTRIBUTING.md#before-proposing-a-new-skill), search the catalog, check open PRs (`gh pr list --state open`), confirm the idea fits [docs/skill-anatomy.md](docs/skill-anatomy.md), and justify the gap in your PR description. Most new-skill ideas overlap an existing skill or an open PR; prefer extending an existing skill over adding a near-duplicate. CONTRIBUTING.md is the single source of truth for this workflow.

Skills in this repo are markdown-first: each lives at `skills/<kebab-case-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and follows the section anatomy (Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification). Add a `scripts/` directory only when the skill ships runnable helpers; most skills are markdown only, and there are no per-skill zip packages.

For the full format, naming conventions, frontmatter rules, supporting-file thresholds, and writing principles, see [docs/skill-anatomy.md](docs/skill-anatomy.md), the single source of truth for skill structure. Do not restate that guidance here, link to it.

---

## Development Environment & Conventions (개발 환경 및 컨벤션)

이 프로젝트는 대안 자산 예측 마켓 **DropCast**의 실제 구현을 위한 개발 환경 및 코딩 컨벤션을 정의합니다.

### 1. 기술 스택 (Core Tech Stack)
* **Frontend**: React.js (Vite 기반 개발 환경 구성 권장)
* **Backend**: Express.js + Node.js
* **Database**: PostgreSQL (추천 - 사용자 포인트, 예측 레코드, 랭킹 및 이력 관리를 위한 관계형 스키마에 적합) + Prisma ORM
* **실시간 통신**: Socket.io (실시간 버블 예측가 동기화 및 제보용)
* **크롤링 및 스케줄러**: Puppeteer (KREAM 종가 크롤링) + Node-cron (일요일 23:59 주간 자동 정산 배치)

### 2. 코딩 컨벤션 및 커밋 로그 규칙 (Coding Conventions & Commit Rules)

#### 코딩 규칙 (Coding Style)
- **프론트엔드 스타일**: `August*` 디자인 가이드라인에 맞춘 Brutalist Dark Monochromatic 스타일 적용. 헤드라인 및 로고 등 주요 텍스트는 철저한 **소문자(`lowercase`)** 정책을 유지합니다. 모서리는 완전한 직각을 기본으로 삼습니다.
- **포맷팅**: ESLint + Prettier 설정을 준수합니다.
- **비동기 처리**: `async/await` 패턴을 일관되게 사용합니다.

#### 커밋 로그 규칙 (Commit Message Convention)
커밋 메시지는 Angular Git Commit Guidelines를 준수하며, 한글 작성을 표준으로 합니다.
* 형식: `<type>: <description>` (예: `feat: 주간 랭킹 대시보드 추가`)
* **Type 종류**:
  - `feat`: 새로운 기능 추가
  - `fix`: 버그 수정
  - `docs`: 문서 수정 (README.md, AGENTS.md 등)
  - `style`: 코드 포맷팅, 세미콜론 누락 등 (비즈니스 로직 변경 없음)
  - `refactor`: 코드 리팩토링
  - `chore`: 빌드 설정, 패키지 매니저 설정 등
  - `test`: 테스트 코드 추가 및 수정

### 3. 디렉토리 구조 및 필수 라이브러리 (Directory Structure & Libraries)

#### 권장 디렉토리 구조 (Recommended Structure)
```text
/hub (Root)
├── backend/                  # 백엔드 (Express)
│   ├── src/
│   │   ├── controllers/      # API 컨트롤러 (인증, 투표, 랭킹)
│   │   ├── models/           # Prisma DB 스키마 및 쿼리
│   │   ├── cron/             # Node-cron 정산 스케줄러
│   │   ├── crawler/          # Puppeteer 크롤러
│   │   └── app.js            # Express 진입점
│   ├── package.json
│   └── .env
│
├── frontend/                 # 프론트엔드 (React + Vite)
│   ├── src/
│   │   ├── assets/           # 이미지 (artist_bw.png, tunnel_green.png)
│   │   ├── components/       # 공통 UI 컴포넌트
│   │   ├── views/            # 페이지 뷰 (대시보드, 랭킹, 상세)
│   │   ├── styles/           # CSS 파일 (style.css 기반)
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
```

#### 필수 설치 라이브러리 (Required Dependencies)
* **Backend**:
  - `express`, `cors`, `dotenv` (기본 API 환경)
  - `puppeteer`, `puppeteer-extra` (크롤링 모듈)
  - `node-cron` (주간 정산 자동화 스케줄러)
  - `socket.io` (실시간 소켓 데이터 동기화)
  - `@prisma/client`, `prisma` (DB ORM)
* **Frontend**:
  - `react`, `react-dom`
  - `socket.io-client`
  - `canvas-confetti` (주간 정산 팝업 시 상위 랭커 축하 효과용)

### 4. 에이전트 추가 권장 사항 (Agent Recommendations)

AI 코더 및 에이전트는 DropCast 프로젝트를 구현할 때 다음 사항을 특별히 점검하고 설계해야 합니다.
1. **크롤링 장애 내성 (Crawling Fallback)**: Puppeteer를 통한 리셀 플랫폼 크롤링은 IP 차단이나 사이트 레이아웃 변경에 취약합니다. 이를 대비해 **[수동 가격 덤프 어드민 페이지]**를 백엔드에 반드시 확보하여, 크롤링 실패 시 관리자가 수동으로 이번 주 종가를 입력해 배칭을 강제 실행할 수 있도록 설계해야 합니다.
2. **어뷰징 방지 보안 (Anti-Abuse System)**: 무료 가상 포인트를 사용한 랭킹 리워드 지급 플랫폼 특성상 중복 회원 가입 및 다계정 예측 난사를 막아야 합니다. 회원가입 시 소셜 로그인(Kakao/Google) 필수 연동 및 IP/Device 단위의 예측 제출 제한(Rate Limit)을 적용해야 합니다.
3. **투표 마감 데드라인 (Lock-in Policy)**: 일요일 23:59 정산 직전 투표가 몰려 정답률이 100%에 수렴하는 불공정 어뷰징을 막기 위해, **매주 금요일 09:00(실제 발매일 개시 시점)에 해당 주의 투표를 완전히 잠금(Lock)** 처리하고, 그 이후의 투표 제출은 금지하도록 정산 로직을 철저히 검증해야 합니다.
