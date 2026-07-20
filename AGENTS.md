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

- `src/app`: router, shell, app-level providers, and app-wide model state.
- `src/pages`: route-level pages.
- `src/features`: product feature areas such as `curriculum`, `today-learning`, `learning-workspace`, `learning-progress`, `mistake-notes`, `profile`, and `git-lab`.
- `src/features/*/api`: frontend API clients for that feature.
- `src/features/*/model`: feature state, store, types, and state helpers.
- `src/features/*/data`: feature-owned mock or static data.
- `src/features/*/lib`: feature-owned pure helpers.
- `src/components`: shared UI components.
- `src/styles`: global CSS and theme tokens.
- `backend`: Node.js API server and server-side agent modules.
- `shared/curriculum`: curriculum catalog JSON shared by React mock generation and backend agents.

## File Convention

- React components: `PascalCase.tsx`.
- Hooks and utilities: `camelCase.ts`.
- CSS Modules: `ComponentName.module.css`.
- Tests: colocate near the unit under test as `*.test.ts` or `*.test.tsx`.
- Keep feature-specific types inside the feature unless they are shared across multiple features.

## Ponytail Working Principle

Before writing code, choose the first rung that solves the task:

1. If the change does not need to exist, skip it.
2. If the codebase already has the pattern, reuse it.
3. If the platform, standard library, or installed dependency already solves it, use that.
4. If a one-line or configuration-only change is enough, prefer it.
5. Only then write the minimum new code that works.

This is laziness about implementation size, not laziness about reading or safety. Always inspect the touched flow first, and never remove validation, data-loss handling, security, accessibility, or required user feedback to make a change smaller.

## Design Workflow Requirement

When designing, redesigning, auditing, or implementing any user-facing screen, always consult the ICU design workflow skill before making changes:

- Read `skills/design/SKILL.md` together with the relevant feature docs.
- Preserve the existing ICU product direction: practical learning workflow, beginner-friendly hierarchy, readable Korean copy, clear next action, accessible controls, and calm IDE-like density.
- When the user explicitly invokes a Product Design skill such as `product-design:design-qa`, follow that skill in addition to the local ICU design workflow skill.
- Do not add Tailwind, icon libraries, Monaco, Electron, Express, RAG, Notion API integration, or other new dependencies unless the user explicitly asks or the task requires it.
- Design and generated code must be user-friendly and easy to learn, especially for beginner developers using the app repeatedly.
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
- ICU design workflow skill: `skills/design/SKILL.md`.
- Feature specs: `docs/features`.
- Static prototype: `prototype.html` and `prototype.css`.

## Guardrails

- Do not modify unrelated untracked folders such as `skills/` unless the user explicitly asks.
- Do not introduce Express, Electron, Monaco, RAG, or Notion API implementation during React mock screen work.
- Prefer small, typed mock data over hardcoded screen-only strings once a UI surface becomes part of the app.
- Keep implementation aligned with the existing ICU design direction: practical IDE structure, beginner-friendly Today Hub entry, light/dark readiness, and restrained Workday-inspired orange/cyan/deep-blue accents.
