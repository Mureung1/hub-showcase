# CLAUDE.md

## 기본 규칙
- 커밋하지 말 것

## 언어 규칙
- 모든 결과값과 설명은 반드시 한글로 작성한다.
- 코드 주석, 커밋 메시지, 사용자 응답 등 모든 텍스트 출력은 한글을 기본으로 한다.

## Project Overview

4-week MVP: college student information curation + scheduling dashboard.
Filters opportunities (competitions, external activities, policies) by student profile (major/year/residence/income bracket) and recommends based on calendar availability.

**Vertical slice first:** complete one category (competitions/activities) end-to-end before expanding to policies/subsidies.

## Directory Structure
/frontend       React + Vite app
/backend        Express API server
/crawler        Python crawler (separate service)
/shared         Shared Zod schemas & types (imported by both frontend and backend)
/prisma         Schema & migrations
/docs           plan.md, checklist.md

> Update this section when structure changes. Stale directory docs are worse than none.

## Commands

```bash
cd frontend && npm run dev
cd backend && npm run dev
cd backend && npx prisma migrate dev    # after schema changes
cd backend && npx prisma generate       # after schema changes, always
cd crawler && python main.py
cd backend && npm test
cd frontend && npm run typecheck
```

## Tech Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind + shadcn/ui, Zustand, React Hook Form + Zod, React Query, FullCalendar.js, React Router
- **Backend:** Node.js + Express + TypeScript, Prisma, Zod, JWT, node-cron
- **DB:** PostgreSQL (Supabase)
- **Crawler:** Python + BeautifulSoup / Playwright
- **Deploy:** Vercel / Railway / Supabase

## Architecture Rules

**Scoring/filtering logic:**
- Never inline scoring logic in route handlers
- Always: `scoringService.calculateScore(user, posting)` — fixed interface, swappable internals
- Reason: rule-based → LLM-based swap later without touching routers

**Data:**
- Raw crawled data and normalized data in separate tables
- Store only: title, qualification text, deadline, source URL. Never full HTML
- On crawler failure: preserve existing DB data, log error, retry next cycle. Never delete or zero-fill
- New categories (policies etc.) reuse the same pipeline — no duplicate logic per category

**Shared types:**
- All Zod schemas shared via `/shared` package. Both frontend and backend import from there
- Never copy-paste Zod schemas between frontend and backend

**Calendar:**
- Event schema: `uid`, `dtstart`, `dtend` (iCalendar standard) — for future Google/Apple Calendar sync

**Privacy:**
- Never log raw profile values (residence, income bracket, major) anywhere — console, files, error tracking
- Use anonymized user IDs or derived codes for debugging

**Frontend Page Routing (중요):**
- 인증 후 페이지들(Dashboard, Calendar, Scraps, Settings, GitHub 등)은 App.tsx에서 독립적으로 렌더링됨
- **문제:** 각 페이지가 독립적인 레이아웃 구조(사이드바 포함)를 가지면, 페이지 전환 시 사이드바가 매번 재렌더링되어 상태가 유지되지 않음
- **해결책:** 새 페이지 추가 시 다음 두 가지 패턴 중 선택
  1. **권장:** 기존 페이지처럼 App.tsx의 currentPage 타입에만 추가하고, 페이지는 내용만 담당. 사이드바는 각 페이지에 포함되지만, 동일한 구조 유지
  2. **선택:** 향후 BaseLayout 컴포넌트를 만들어서 사이드바를 한 곳에서 관리하고, 각 페이지는 메인 컨텐츠만 제공
- **현재 상태:** 모든 페이지(Dashboard, Calendar, Scraps, GitHub)가 각각 사이드바 코드를 포함하고 있음
- **주의:** 사이드바의 네비게이션 항목 추가 시 DashboardLayout과 GithubReposPage 등 모든 페이지 파일에서 동일하게 업데이트해야 함. 누락하면 일부 페이지에서만 새 항목이 보임

## Implementation Sequence

1. Crawling survey — confirm robots.txt, ToS, login walls, static vs JS rendering
2. Data model (Prisma schema) — informed by crawling findings
3. Crawler + seed data — 50–100 real postings before any UI work
4. User profiles + auth (Supabase Auth)
5. Filtering logic + dashboard card view — first complete vertical slice
6. Calendar integration (FullCalendar.js) — deadline auto-sync on scrapping
7. Smart matching — surface "you have 12hrs/week free" based on schedule gaps
8. Scrapping + D-Day alerts (D-3, D-1)
9. Policy/subsidy category expansion (optional)

## Before Every Commit

```bash
cd backend && npm test && npm run lint && npm run typecheck
cd frontend && npm run typecheck && npm run lint
```

Commit format: `feat(scope): description` / `fix(scope): description` / `chore(scope): description`

**Minimum test coverage:** `scoringService` and eligibility parsing logic require unit tests. CRUD routes recommended but not required.

## Never Do These

- Violate robots.txt or ToS when crawling
- Commit `schema.prisma` changes without running `npx prisma migrate dev`
- Hardcode real secrets in `.env` — only update `.env.example`
- Log raw user profile values (residence, income bracket) anywhere
- Commit scoring/filtering logic changes without corresponding tests
- Delete or zero-fill crawled data on crawler failure
- Duplicate Zod schemas — use `/shared` package
- Change code style without agreement — follow ESLint/Prettier config

## When Unsure

- Schema or API structure changes: explain plan first, get confirmation before proceeding
- State assumptions explicitly before acting
- Validate only at system boundaries (user input, external APIs) — don't add defensive checks for impossible states

## Checklist Management

- **Immediate Update:** As soon as a task from `docs/checklist.md` is completed, you **must immediately** update the corresponding item to checked (`[x]`) before proceeding to the next task or committing.
- **Verification First:** Never check off an item based on guesswork. Only mark it as complete after confirming that tests, typechecks, and the actual implementation are fully verified.
- **Granular Progress:** If a task is partially done, update the sub-items in `docs/checklist.md` right away to keep the current progress synchronized in real-time.

## Conventions

### Naming
- **Components & Pages:** PascalCase — `UserProfileCard.tsx`, `DashboardPage.tsx`
- **Hooks:** camelCase with `use` prefix — `useCalendarEvents.ts`, `usePostingFilter.ts`
- **Utilities / Services:** camelCase — `scoringService.ts`, `formatDate.ts`
- **Types & Interfaces:** PascalCase — `UserProfile`, `PostingCard`
- **Constants:** UPPER_SNAKE_CASE — `MAX_IDLE_HOURS`, `DEFAULT_PAGE_SIZE`
- **Boolean variables/props:** `is` / `has` / `should` prefix — `isLoading`, `hasError`, `shouldShowModal`
- **Event handlers:** `handle` prefix — `handleSubmit`, `handleCardClick`

### Commit messages
Format: `type(scope): description`

| Type | When to use |
|------|-------------|
| `feat` | New feature visible to user |
| `fix` | Bug fix |
| `refactor` | Code change with no behavior change |
| `perf` | Performance improvement |
| `test` | Add or fix tests |
| `docs` | Documentation only |
| `chore` | Config, deps, tooling — no src change |
| `style` | Formatting only (whitespace, semicolons) |
| `revert` | Revert a previous commit |

Examples:
feat(dashboard): add posting card grid view
fix(crawler): prevent blank-fill on fetch timeout
refactor(scoring): extract deadline overlap into pure function
chore(deps): bump prisma to 5.14

## Reference Docs

- `docs/plan.md` — full feature breakdown & rationale
- `docs/checklist.md` — stage-by-stage tasks
- `docs/design.md` - **design system (colors, typography, layout, components). Read this before writing any UI code.**

---

## 11단계: GitHub 인기 저장소 요약 페이지

### 아키텍처 (독립적 서비스)

```
GitHub Trending Repos
      ↓
LLM Abstraction Layer (llmService.ts)
      ↓
GitHub Service (githubService.ts)
      ↓
Database (GithubRepo, UserGithubStar)
```

**특징:**
- ✅ Posting/Eligibility 스키마와 무관
- ✅ 완전히 분리된 테이블 (GithubRepo, UserGithubStar)
- ✅ 별도 라우터 (`/api/github/...`)
- ✅ LLM 제공자 쉽게 전환 가능

### LLM 추상화 계층 (llmService.ts)

**지원하는 제공자:**
1. **Ollama** (기본값, 로컬)
   - 모델: `qwen2.5:7b`
   - 실행: `ollama serve` (localhost:11434)
   - 속도: 3-5초/요청

2. **Claude** (API)
   - 모델: `claude-3-5-sonnet-20241022`
   - 환경변수: `CLAUDE_API_KEY`
   - 비용: 유료

3. **LlamaCPP** (로컬)
   - URL: `localhost:8000`
   - 가벼움

4. **OpenAI** (API)
   - 모델: `gpt-4o-mini`
   - 환경변수: `OPENAI_API_KEY`

**제공자 전환 방법:**
```bash
# .env에서 한 줄만 변경
LLM_PROVIDER="ollama"  # 또는 claude, llamacpp, openai
```

**새 제공자 추가:**
1. llmService.ts에서 `callYourProvider()` 메서드 추가
2. switch문에 케이스 추가
3. `.env` 예시 업데이트
끝! (5분 작업)

### GitHub Service (githubService.ts)

**핵심 메서드:**
- `fetchTrendingRepos(language?, limit)` — GitHub API에서 검색
- `fetchReadme(owner, repo)` — README 파일 추출
- `summarizeRepo(repo)` — LLM으로 한국어 요약 + 핵심 포인트
- `saveRepo()` — DB 저장 (요약 포함)
- `collectAndSummarizeRepos()` — 일괄 수집 (백그라운드)

**데이터 흐름:**
```
GitHub API
  ↓ (별, 설명, 주언어)
GitHub Service
  ↓ (fetchReadme)
README 파일 가져오기
  ↓ (LLM 처리)
한국어 요약 생성
summaryBullets 추출 (3-5개)
  ↓
DB 저장 (GithubRepo)
```

### API 엔드포인트 (/api/github)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/trending` | 인기 저장소 (기본 20개) |
| GET | `/language/:lang` | 언어별 저장소 |
| GET | `/search?q=...` | 저장소 검색 |
| GET | `/:githubId` | 저장소 상세 |
| POST | `/collect` | 수집 및 요약 (백그라운드) |
| GET | `/llm/status` | LLM 상태 확인 |
| POST | `/summarize` | 텍스트 요약 테스트 |

**쿼리 파라미터:**
```
/api/github/trending?limit=50&language=python
/api/github/language/javascript?limit=10
/api/github/search?q=react&limit=20
```

### 로컬 LLM 설정 (Ollama)

**설치 (Mac M2):**
```bash
# 1. 다운로드: https://ollama.ai
# 2. 모델 다운로드 (첫 실행 시 3-5분)
ollama pull qwen2.5:7b

# 3. 서버 실행 (항상 켜져있어야 함)
ollama serve

# 4. 확인
curl http://localhost:11434/api/tags
```

**메모리 사용:**
- Qwen2.5 7B: ~8GB RAM (M2 16GB에서 충분)
- 다른 모델: 3B (~3GB), 32B (~32GB 불가)

### 환경 변수 설정

```bash
# LLM 제공자 선택
LLM_PROVIDER="ollama"  # ollama | claude | llamacpp | openai

# Ollama (로컬)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="qwen2.5:7b"

# Claude (API)
CLAUDE_API_KEY="sk-..."

# LlamaCPP (로컬)
LLAMACPP_BASE_URL="http://localhost:8000"

# OpenAI (API)
OPENAI_API_KEY="sk-..."

# GitHub API (토큰 선택, 없어도 작동하지만 rate limit 60/hr)
GITHUB_TOKEN="ghp_..."
```

### 프로젝트 구조

```
backend/
├─ src/
│  ├─ services/
│  │  ├─ llmService.ts (★ 핵심: LLM 추상화)
│  │  ├─ githubService.ts (★ GitHub API + LLM)
│  │  └─ ...
│  ├─ routes/
│  │  ├─ github.ts (★ API 엔드포인트)
│  │  └─ ...
│  └─ index.ts (github 라우터 등록됨)
└─ prisma/
   └─ schema.prisma (GithubRepo, UserGithubStar 모델 추가됨)

frontend/
├─ src/
│  ├─ pages/
│  │  └─ GithubReposPage.tsx (★ 새로 만들기)
│  ├─ components/
│  │  └─ RepoCard.tsx (★ 새로 만들기)
│  └─ utils/
│     └─ githubApi.ts (★ API 클라이언트)
└─ App.tsx (라우터에 /github 경로 추가)
```

### 확장성 고려사항

**LLM 추상화:**
- ✅ 제공자 전환이 한 줄 변경 (.env)
- ✅ 새 제공자 추가가 5분 (메서드 추가)
- ✅ 비즈니스 로직은 LLM과 무관

**데이터 모델:**
- ✅ GithubRepo는 독립적 (기존 Posting과 무관)
- ✅ summaryBullets는 배열 (확장 가능)
- ✅ UserGithubStar로 향후 사용자 상호작용 추가 가능

**API:**
- ✅ 카테고리/필터링 자유 (기존 postings API와 동일 패턴)
- ✅ 검색/정렬 기본 제공

### 주의사항

**절대 하지 말 것:**
- ❌ LLM 제공자를 라우터에 하드코딩 (llmService.ts에서만 관리)
- ❌ README를 그대로 DB에 저장 (용량 초과) — 최소 크기로 자르기
- ❌ GitHub API 토큰 .env에 하드코딩 (보안 위험)
- ❌ LLM 응답을 캐싱 없이 매번 생성 (속도 저하)

**성능 최적화:**
- ✅ GithubRepo에 `lastFetchedAt` 인덱스 추가됨
- ✅ 배치 수집은 백그라운드 실행 (POST /api/github/collect)
- ✅ 요약은 저장 시 생성 (조회 시 아님)
- ✅ Rate Limit 고려: GitHub API는 60/hr (토큰 없음) → 1000/hr (토큰 있음)