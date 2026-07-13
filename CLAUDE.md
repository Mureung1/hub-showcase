# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI 분리배출 도우미 (AI Recycling Assistant for Korea) — a photo-based service that identifies an object via Vision AI and returns official Korean waste-sorting rules. **Government data (공공데이터포털) is the Source of Truth; AI never invents disposal rules.** The AI layer (Vision AI + LLM) only recognizes objects and explains/translates official data into easy, multilingual guidance. See `README.md` for full feature/architecture details (photo recognition flow, item search, region-based rules, multilingual support, bulky-waste reporting, nearby collection points, today's disposal schedule).

## Repo layout

npm workspaces monorepo: `frontend/` (React) + `backend/` (Express), managed from the root `package.json`.

- `frontend/` — React 19 + TypeScript + Vite + Tailwind CSS v4 + TanStack Query + react-router-dom + axios + zod. PWA via `vite-plugin-pwa`.
- `backend/` — Express 5 + TypeScript + Prisma (PostgreSQL). Currently scaffolded (routes/controllers/services/middlewares/config/types folders + tsconfig + deps) but **has no entry point yet** — `src/server.ts` / `src/app.ts` don't exist, so `npm run dev -w backend` will fail until they're created.
- `prototype/` — static HTML/CSS mockups (`home.html`, `search.html`, `result.html`, `rules.html`, `bulky.html`, `confirm.html`, `points.html`) sharing `prototype/style.css`. These are the visual source of truth the React screens in `frontend/src/pages/` should match.
- `docs/skill.md` — the "ecobot-design-system" skill: color tokens, typography, radius, spacing, and component rules for the green EcoBot visual identity. Consult it (and reuse `prototype/style.css` classes / `frontend/src/styles/index.css` tokens) before styling any screen or prototype page — don't invent new colors/shadows/radii.

## Commands

Run from repo root unless noted.

- `npm run dev` — runs frontend and backend dev servers concurrently (`concurrently`).
- `npm run build` — builds frontend then backend (`tsc -b && vite build` / `tsc`).
- `npm run lint` — lints frontend (`oxlint`) then backend.
- Target a single workspace with `-w`, e.g. `npm run dev -w frontend`, `npm run build -w backend`.
- Frontend dev server proxies `/api/*` to `http://localhost:4000` (see `frontend/vite.config.ts`) — the backend must listen on port 4000.
- Backend: `npm run dev -w backend` → `tsx watch src/server.ts`; `npm run build -w backend` → `tsc`; `npm run start -w backend` → `node dist/server.js`.

## Backend architecture (per `docs/CONTRIBUTING.md`)

Strict layering — route handlers must not contain business logic:

```
routes/        → path definitions only
controllers/   → request/response handling, calls services
services/      → business logic, external API calls (OpenAI, 공공데이터포털, etc.)
middlewares/   → e.g. errorHandler
```

- Validate request bodies/queries with `zod`; on failure, throw so the shared `middlewares/errorHandler` handles it — controllers must not build error responses with `res.status().json()` directly.
- DB access only through Prisma Client; avoid raw SQL unless required.

## Frontend architecture (per `docs/CONTRIBUTING.md`)

- Screen-level components live in `pages/`; shared UI in `components/`; domain logic (recognition/region/bulky-waste/points) in `features/<도메인>/`.
- Components are `export default function ComponentName() {}` — no anonymous arrow-function exports.
- All server state goes through `@tanstack/react-query` via `frontend/src/lib/apiClient.ts` (axios) — no direct `useEffect` + `fetch`.
- Styling uses Tailwind utilities + the design tokens in `frontend/src/styles/index.css` (e.g. `--green-600`) — no ad-hoc colors/shadows/radii.

## Conventions

- **TypeScript strict mode everywhere; `any` is banned** — narrow `unknown` with type guards instead.
- No semicolons, single quotes, 2-space indent (Vite template default).
- Filenames: components/classes `PascalCase.tsx`; everything else `camelCase.ts`.
- Import order: external libraries → internal paths → types. No unused imports.
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) format with a Korean subject: `<type>(<scope>): <한글 설명>` (types: feat/fix/docs/style/refactor/test/chore/perf; scope e.g. `frontend`/`backend`/`ui`/`api`/`db`). One logical change per commit.
- Branches: work happens on personal branches (e.g. `N144_인민에이`) with PRs into `main`; new branches follow `기능/설명`.
- PR title format: `[루카스아이디_실명] - 작업 요약`. PR body must fill in the template sections (주요 작업 리스트 / 내가 설명할 수 있는 부분 / 아직 이해 못 한 부분 / 새로 알게 된 것) per `.github/pull_request_template.md`.
- A scheduled workflow (`.github/workflows/auto-merge.yml`, daily) auto-merges open PRs unless they target `main`, carry a `review` label, have changes-requested reviews, or conflict (conflicting ones get auto-closed).
