# React Environment Setup — Design

## Purpose
Bootstrap a basic React development environment in the (currently empty) `hub` repository so future feature work has a runnable frontend to build on.

## Decisions
- **Tooling**: Vite (`react` template) — fast dev server, minimal config, no backend needed.
- **Language**: JavaScript (not TypeScript).
- **Location**: `hub/소개/` subfolder — the Vite project (`index.html`, `package.json`, `vite.config.js`, `src/`, etc.) lives under `소개/`, not at the repo root. `README.md`, `docs/`, `.github/` stay at the repo root. (Supersedes the original decision to scaffold at the repo root — moved into a subfolder so the repo root can hold multiple feature/screen folders going forward.)
- **Package manager**: npm.
- **Linting**: ESLint (pass `--eslint` explicitly) — recent `create-vite` versions default to Oxlint instead.
- **Scope**: Default Vite React template only. No router, no CSS framework, no state management library added at this stage.

## Steps
1. Scaffold with `npm create vite@latest . -- --template react --eslint` **inside `hub/소개/`** (create the folder first). If scaffolding at a location that already has files in it (e.g. running at the repo root instead), `create-vite`'s non-empty-directory prompt can't be answered non-interactively — scaffold into an empty temp directory instead and merge the generated files in, rather than passing `--overwrite` (which deletes existing files).
2. Run `npm install` inside `소개/` to install dependencies.
3. Run `npm run dev` to confirm the dev server starts and the default page renders, then stop it.
4. Verify `npm run build` and `npm run lint` succeed (both ship in the default template's `package.json` scripts).

## Out of scope
- Routing (React Router), styling frameworks (Tailwind), state management, testing setup, TypeScript migration, CI changes — can be added later as separate, focused pieces of work.

## Success criteria
- `npm run dev` (run from `hub/소개/`) serves the app without errors.
- `npm run build` and `npm run lint` both exit successfully.
- `hub/소개/` contains a working Vite React project committed to git, with the repo-root files (`README.md`, `docs/`, `.github/`) untouched.
