# AGENTS.md

## Project Context

- User-facing product name: `ICU`.
- Meaning: `I CODE U`.
- Repository/planning name: `DevChat`.
- Product goal: an AI coding tutor desktop app that connects today's learning plan, curriculum, code practice, execution feedback, review scheduling, and Notion learning records.

## Current Priority

Build the React mock product screens before adding desktop/backend complexity.

1. Today Learning Hub
2. Learning Workspace IDE
3. Mock learning data and screen state
4. Monaco Editor, code execution, Electron Main Process, RAG, and Notion sync later

## Tech Decisions

- Frontend: React + TypeScript + TSX.
- Build tool: Vite.
- Routing: React Router.
- State management: Zustand.
- Styling: CSS Modules for new component-scoped styles.
- Global styling: keep only app-wide reset, typography, and tokens in `src/styles`.
- Express: do not install or add yet. Add it later only when RAG/code-runner APIs need a backend layer.
- Electron: add after React screens and mock data flows are stable.
- Monaco: add when implementing the Workspace editor surface.

## Directory Convention

- `src/app`: router, shell, app-level providers.
- `src/pages`: route-level pages.
- `src/features`: product feature areas such as `today-learning`, `learning-workspace`, and `review`.
- `src/components`: shared UI components.
- `src/data`: mock data and static presets.
- `src/stores`: Zustand stores.
- `src/styles`: global CSS and theme tokens.
- `src/types`: shared TypeScript types.

## File Convention

- React components: `PascalCase.tsx`.
- Hooks and utilities: `camelCase.ts`.
- CSS Modules: `ComponentName.module.css`.
- Tests: colocate near the unit under test as `*.test.ts` or `*.test.tsx`.
- Keep feature-specific types inside the feature unless they are shared across multiple features.

## Commit Convention

Use Korean Conventional Commit messages:

- `feat: ...` for product features.
- `docs: ...` for documentation and planning.
- `style: ...` for UI/CSS-only changes.
- `refactor: ...` for behavior-preserving code structure changes.
- `test: ...` for test additions or changes.
- `chore: ...` for tooling, package, config, or maintenance.

## Source Of Truth

- Product plan: `docs/notion/icu-product-plan-notion.md`.
- Main MVP plan: `docs/plan.md`.
- User flow: `docs/user-flow.md`.
- Design and handoff: `docs/design`.
- Feature specs: `docs/features`.
- Static prototype: `prototype.html` and `prototype.css`.

## Guardrails

- Do not modify unrelated untracked folders such as `skills/` unless the user explicitly asks.
- Do not introduce Express, Electron, Monaco, RAG, or Notion API implementation during React mock screen work.
- Prefer small, typed mock data over hardcoded screen-only strings once a UI surface becomes part of the app.
- Keep implementation aligned with the existing ICU design direction: practical IDE structure, beginner-friendly Today Hub entry, light/dark readiness, and restrained Workday-inspired orange/cyan/deep-blue accents.
