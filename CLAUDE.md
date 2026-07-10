# CLAUDE.md

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