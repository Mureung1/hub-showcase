# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SpecFit (스펙핏) — a service that lets job-seeking students compare their own qualifications (education, experience, certifications, major, language scores) against job postings, showing what fraction of postings they can currently apply to and which qualifications would unlock the most additional postings ("gap analysis").

The differentiating features (per `docs/plan_3.md`) are the gap-analysis engine (AND-matching against 5 requirement categories, with "what-if I improve X" simulation) and the visualization result screen (donut chart, priority bar chart, insight popup, filterable job list, per-job checklist modal). Computer literacy (컴퓨터활용능력) is collected but excluded from pass/fail judgment — it's a "nice to have" signal only.

Stack: React + Vite frontend, Express backend (`server/`), SQLite via `better-sqlite3`. Charts are hand-rolled SVG (ported from the prototype), **not** Recharts — the README's mention of Recharts is stale and should be corrected/ignored.

**Current state: scaffolding plus raw seed data, no feature logic yet.** Routing, the Express skeleton, and the dev-server wiring all work end-to-end, and the real seed CSV now lives in the repo (`server/data/jobs_data.csv`), but the gap-analysis engine, DB schema, real forms, and charts have not been ported from `prototype/demo_13.html` yet. Real development starts in week 2 per the team's plan — don't assume any business logic exists beyond what's described below.

## Commands

Frontend (repo root):
```bash
npm run dev       # start Vite dev server (localhost:5173), proxies /api/* to localhost:4000
npm run build     # production build
npm run preview   # preview the production build
npm run lint      # oxlint (see .oxlintrc.json — react + oxc plugins)
npm run test      # vitest run (jsdom environment, src/setupTests.js loads jest-dom)
```

Backend (`server/` — separate `package.json`, run from inside `server/`):
```bash
npm run dev        # nodemon src/index.js (localhost:4000)
npm run start      # node src/index.js
npm run test       # vitest run (supertest against the Express app)
```

To develop with both running: two terminals, `npm run dev` at root and `npm run dev` inside `server/`. The frontend dev server proxies `/api/*` to the backend, so frontend code should call relative paths like `fetch('/api/jobs')`, never a hardcoded `localhost:4000`.

Backend needs a local `.env` (copy `server/.env.example` → `server/.env`, gitignored). Defaults: `PORT=4000`, `DB_PATH=./data/specfit.db`.

## Architecture

### Frontend (`src/`)
- `src/main.jsx` wraps `App` in `<BrowserRouter>` (strict mode).
- `src/App.jsx` defines the route table: `/` (landing), `/filter`, `/spec`, `/result` — matching the prototype's step flow. `loading` is not a route; it's meant to be a transient UI state during the analysis request, not a URL.
- `src/pages/` — one component per route. `LandingPage.jsx` renders the existing `AboutProject.jsx`; `FilterPage.jsx`, `SpecPage.jsx`, `ResultPage.jsx` are currently placeholder stubs with a `TODO` pointing at the matching `render*Screen()` function in `prototype/demo_13.html` — that's where the real markup/behavior should come from.
- `src/components/` — reusable UI components. `AboutProject.jsx` is the only real one so far. Planned subfolders (not yet created — create them as needed in week 2): `layout/` (header/stepper/footer), `charts/` (donut + bar, ported from the prototype's inline SVG), `result/` (job card, job detail modal, insight modal, empty states).
- `src/lib/`, `src/constants/`, `src/data/`, `src/api/`, `src/styles/` — not created yet. Intended homes: pure gap-analysis functions (`evaluateJob`/`runGapAnalysis`/`describeRequirement`, ported from the prototype), shared option lists and style maps (`STATUS_STYLE`, `JOBTYPE_STYLE`, etc.), temporary mock job data until the backend serves real data, a fetch wrapper for `/api/*`, and the prototype's CSS custom-property tokens, respectively.
- `src/setupTests.js` — vitest setup, imports `@testing-library/jest-dom/vitest`. Root `vite.config.js` has a `test` block (jsdom env) and excludes `server/**` so root `vitest` never picks up the backend's tests.

### Backend (`server/`)
- Its own `package.json` (ESM, `"type": "module"`) — deliberately not an npm workspace, kept simple as a sibling directory.
- `src/index.js` — loads `.env`, starts `app.listen()`.
- `src/app.js` — assembles the Express app: `cors()`, `express.json()`, routers mounted under `/api`, `errorHandler` last.
- `src/routes/health.routes.js` — `GET /api/health`, does a trivial `SELECT 1` through `better-sqlite3` to prove the DB connection is alive. This is the only real endpoint so far; `jobs`/`gap-analysis` routes described in `docs/checklist_2.md` don't exist yet.
- `src/db/connection.js` — opens `better-sqlite3` at `DB_PATH` (WAL mode). No schema/migrations yet. `server/data/jobs_data.csv` (862 real JOB-ALIO postings + rule-synthesized spec fields — see `docs/checklist_2.md`'s "확정 사항") is the real seed source; a `jobs` table (single table mirroring the CSV columns directly, per the week-2 issue plan) plus an `analysis_results` table and a seed script to load the CSV still need to be written. `src/services/` is the intended home for `gapAnalysisService.js` but is currently empty.
- `src/middleware/errorHandler.js` — generic 4-arg Express error handler (last param must stay in the signature — named `_next` only to satisfy the lint rule about unused params, Express still dispatches by arity).
- DB file (`server/data/specfit.db*`) and `.env` are gitignored (`server/data/*.db*` only); `.env.example` documents the required vars. `server/data/jobs_data.csv` is **not** gitignored and should be committed — it's the source data every developer's seed script reads from, not a generated artifact. Nobody should commit the actual `.db` file — regenerate it locally via a future seed script instead, since SQLite files are binary and unmergeable.

### Docs and prototype
- `docs/plan_3.md` is the authoritative product spec: user flow (landing → filter → spec input → loading → insight popup → results), the 5-step screen table, and the branching insight-popup copy by scenario (gap exists / all requirements met / zero matching postings). Read this before building new screens so flows match the intended state machine.
- `docs/checklist_2.md` is a granular, numbered (0–4) task breakdown covering DB schema, scraping/collection scripts, filter API, gap-analysis functions, and deployment, plus a "확정 사항" block (data source, AND-matching rule, single-item-gap-only improvement counting, no weighting, no region/salary filter) that should be treated as settled — don't re-litigate these. Note its 2-table schema sketch (`jobs` + `job_requirements`, camelCase fields) predates the current plan; the actual week-2 issue breakdown uses a single `jobs` table with the CSV's own snake_case column names instead (see below).
- `docs/개발_Task.md` is the team's actual week-by-week roadmap (2주차: DB 스키마/시드 + 레이아웃 + 스펙 입력 폼 / 3주차: 상태공유 + 필터 API + 갭분석 로직 착수 / 4주차: 시각화 + 결과 화면 + 배포) — cross-check any "this week" issue list against it, since a given week's issue doc can compress multiple planned weeks into one.
- `prototype/demo_13.html` is a **static, self-contained HTML/CSS/JS mockup** of the full app (filters, spec form, donut/bar charts, job cards, modal) — not wired to React, and the primary reference for porting real UI/logic. Supersedes `prototype/demo_12.html`, which was removed 2026-07-21 after a color/dark-mode revision (see below; `demo_11.html` was removed earlier, 2026-07-20, after the original design pivot). Highlights:
  - `MOCK_JOBS` (20 records) and `CERT_OPTIONS` (IT-focused: 정보처리기사/SQLD/GTQ/etc.) are the prototype's own inline placeholder data — **not** what the real DB gets seeded from. The real seed source is `server/data/jobs_data.csv` (862 real JOB-ALIO postings + synthesized spec fields); `CERT_OPTIONS` needs to be rebuilt from the certificates that actually appear in that CSV (간호사/물리치료사/방사선사/전기기사/etc.) before shipping the real spec form.
  - `evaluateJob`/`runGapAnalysis`/`pickPrimaryStatus`/`describeRequirement` — the complete gap-analysis logic, framework-agnostic, directly portable to `src/lib/gapAnalysis.js`. A comment in the prototype explicitly calls out `gapAnalysisService.js` as the intended backend filename — `server/src/services/gapAnalysisService.js` should mirror this.
  - `:root` CSS variables (`--gray-900`, `--green-bg`/`--green-text` per status tag, etc.) are read by name as strings from JS (`STATUS_STYLE`, `JOBTYPE_STYLE`, `donutSvg`) — **keep variable names identical** when porting into `src/styles/tokens.css`; only values are free to change (this held across the demo_12→demo_13 revision too: no existing variable was renamed, only 7 new ones were added for dark-mode tokenization — see below). Structurally: the landing hero is a 2-column split (copy + a donut-chart result preview card), and there's no floating boxed `.site-frame` "window" card — pages are full-bleed. Design tokens still haven't been ported into React — every screen built so far, including the landing/home screen (#14), still uses a temporary dark+violet placeholder hardcoded in `src/App.css` (an unrelated placeholder purple, not the prototype's real token values) — issue #22 is the tracked work to port demo_13's actual tokens over this placeholder.
  - **Color/dark-mode revision (2026-07-21)**: replaced demo_12's indigo/violet-on-lavender tone with a cream/dusty-rose light palette + cool dark navy text (`--accent: #2b3480` on `--gray-50: #fbf5f8`), and added a full dark mode via a `:root[data-theme="dark"]` override block ("pink-navy inversion" — dark navy background, bright rose accent `#db2777`) toggled by a new header button, persisted to its own `localStorage` key (`specfit_theme_v1`, separate from the `specfit_state_v1` app-state key) with a `prefers-color-scheme` fallback. 7 previously-hardcoded colors (header background, hero gradient start, secondary-button hover, card border hover, modal overlay, check/x mark colors) were pulled out into new CSS variables so dark mode could override them too — these are additions, not renames, so the "keep variable names identical" porting rule is unaffected. When #22 ports tokens, port **both** the light and dark variable sets and the toggle mechanism, not just light-mode values.
  - Uses Pretendard Variable (CDN) and JetBrains Mono (Google Fonts) — not yet wired into `index.html`.
  - `localStorage`-based state persistence (survives refresh) — the real app will need an equivalent; see "Planned: cross-route state sharing" below.
  - Older numbered `demo_N.html` prototypes may be superseded/removed — check `git status`/`git log` before assuming a given prototype file is current.

## Planned: cross-route state sharing (week 2, not yet implemented)

Now that steps are real routes (`/filter`, `/spec`, `/result`) instead of the prototype's single in-memory `state` object, `filters`/`spec`/`result` need an explicit place to live that survives navigating between pages. Decided approach:

1. **`src/context/AppStateContext.jsx`** — a Context + provider holding `filters`, `spec`, `result` (and their setters), modeled directly on the prototype's `state` object and its `setFilters(patch)`/`setSpec(patch)` mutators.
2. **Mount point matters**: the provider must wrap `<Routes>` in `App.jsx` (not live inside individual page components), so it doesn't unmount/reset when the route changes.
3. **`useAppState()`** — a hook (`useContext` wrapper) that pages call to read/update the shared state, replacing the prototype's direct `state.x` access.
4. **localStorage sync** — mirrors the prototype's `saveState()`/`loadState()`: lazy-init the Context's state by reading `localStorage` on first render, and `useEffect` to write back on every change. Reuse the same storage key convention (prototype used `specfit_state_v1`).
5. **`/result` guard** — if `ResultPage` is reached with no `result` computed yet (e.g. direct URL entry), redirect via `<Navigate to="/filter" />`, mirroring the prototype's `render()` safety check ("`state.step === 'result' && !state.result` → back to landing").

Rejected for this scope: Redux/Zustand/Jotai (only 3 pieces of state, Context is sufficient) and query-string-encoded state (too unwieldy for a nested `spec` object with certifications arrays etc.).

## Conventions

- **Commits**: Conventional Commits with Korean descriptions — `type: 설명`, e.g. `feat(server): GET /api/jobs 엔드포인트 추가`. Types: `feat`, `fix`, `docs`, `style` (formatting, no logic change), `refactor`, `test`, `chore`. (Existing history mixes this with free-form Korean messages like `기획서 수정` — use Conventional Commits going forward.)
- **Branches**: `type/설명`, e.g. `feature/spec-form`, `fix/donut-color`.
- **Files**: React components PascalCase.jsx; hooks/utils camelCase.js.
- Commit messages, docs, and product-facing copy are written in Korean.
- PRs must follow `.github/pull_request_template.md`: title format `[루카스아이디_실명] - 작업 요약`, plus sections for what you can explain about your own code, what you don't yet understand, and what you newly learned — a learning-cohort convention, not a typical OSS template.
- `.github/workflows/auto-merge.yml` runs daily (cron) and auto-merges any open PR targeting a non-`main` base branch unless it has a `review` label, has a last review of `CHANGES_REQUESTED`, or is conflicting (in which case it's closed). PRs targeting `main` are always skipped. Be aware of this when opening PRs against branches other than `main` — they can merge unattended.

## Environment decisions

Decided while scaffolding, kept here so they aren't re-litigated:
- **Backend port**: `4000` (frontend stays on Vite's default `5173`).
- **Frontend↔backend connection**: Vite dev-server proxy (`vite.config.js` `server.proxy['/api']`) is the dev-time default — frontend code calls relative `/api/...` paths. `cors()` is also enabled on the Express side for when frontend/backend are deployed to different origins in production.
- **DB file**: never committed. `server/data/specfit.db` (+ WAL/SHM sidecar files) is gitignored; each developer's copy is expected to be created locally from the committed `server/data/jobs_data.csv` (a seed script to do this is still TODO — CSV parsing isn't in `server/package.json` dependencies yet, so that's part of the seed-script task, not just SQL).
- **Charts**: custom SVG (as in the prototype), not Recharts — avoids adding a charting dependency for two chart types that are already fully implemented as plain SVG.
- **Routing**: React Router with real per-step URLs (`/filter`, `/spec`, `/result`), not the prototype's single in-memory state machine — chosen for shareable/bookmarkable URLs and back-button support.
- **DB access**: `better-sqlite3` (synchronous API, raw SQL) over an ORM like Prisma — matches the checklist's schema/insert/filter-query tasks directly without an extra abstraction layer.
- **Testing**: `vitest` on both sides (frontend: jsdom + Testing Library; backend: supertest against the Express app), chosen so the whole repo uses one test runner.
