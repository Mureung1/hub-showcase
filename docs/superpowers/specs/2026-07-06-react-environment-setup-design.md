# React Environment Setup — Design

## Purpose
Bootstrap a basic React development environment in the (currently empty) `hub` repository so future feature work has a runnable frontend to build on.

## Decisions
- **Tooling**: Vite (`react` template) — fast dev server, minimal config, no backend needed.
- **Language**: JavaScript (not TypeScript).
- **Location**: Repository root — `hub` itself becomes the React project (no `app/`/`web/` subfolder).
- **Package manager**: npm.
- **Scope**: Default Vite React template only. No router, no CSS framework, no state management library added at this stage.

## Steps
1. Run `npm create vite@latest . -- --template react` at the repo root to scaffold the project (`src/App.jsx`, `src/main.jsx`, `index.html`, `vite.config.js`, default ESLint config, etc.).
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to confirm the dev server starts and the default page renders, then stop it.
4. Verify `npm run build` and `npm run lint` succeed (both ship in the default template's `package.json` scripts).

## Out of scope
- Routing (React Router), styling frameworks (Tailwind), state management, testing setup, TypeScript migration, CI changes — can be added later as separate, focused pieces of work.

## Success criteria
- `npm run dev` serves the default Vite + React starter page without errors.
- `npm run build` and `npm run lint` both exit successfully.
- Repo root contains a working Vite React project committed to git.
