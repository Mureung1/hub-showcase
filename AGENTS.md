# AGENTS.md

## Project Context

- User-facing product name: `ICU`.
- Meaning: `I CODE U`.
- Repository/planning name: `DevChat`.
- Product goal: an AI coding tutor desktop app that connects today's learning plan, curriculum, code practice, execution feedback, review scheduling, and Notion learning records.

## Current Priority

Build the React product screens and the minimum local backend needed for the learning workflow before adding desktop packaging or RAG complexity.

1. Today Learning Hub
2. Learning Workspace IDE with Monaco Editor
3. Mock learning data and screen state
4. Express-backed curriculum, progress, mistake-note, Git Lab attempt, and code-runner APIs
5. Electron Main Process, RAG, and Notion sync later

## Tech Decisions

- Frontend: React + TypeScript + TSX.
- Build tool: Vite.
- Routing: React Router.
- State management: Zustand.
- Styling: CSS Modules for new component-scoped styles.
- Global styling: keep only app-wide reset, typography, and tokens in `src/styles`.
- Express: use the existing lightweight local backend for curriculum, progress, mistake notes, Git Lab attempts, and code execution boundaries.
- Electron: add after React screens and mock data flows are stable.
- Monaco: use `@monaco-editor/react` for the Workspace editor surface.

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
- Do not add Tailwind, icon libraries, Electron, RAG, Notion API integration, or other new dependencies unless the user explicitly asks or the task requires it. Monaco and Express are approved project dependencies.
- Design and generated code must be user-friendly and easy to learn, especially for beginner developers using the app repeatedly.

## Commit Convention

- **Pre-Commit Report Rule**: `git commit`을 실행하기 전에 **반드시 사용자에게 무엇이 어떻게 변경되었는지(수정된 파일 및 변경 핵심 내역) 사전 보고**합니다.
- Use Korean Conventional Commit messages:

- `feat: ...` for product features.
- `docs: ...` for documentation and planning.
- `style: ...` for UI/CSS-only changes.
- `refactor: ...` for behavior-preserving code structure changes.
- `test: ...` for test additions or changes.
- `chore: ...` for tooling, package, config, or maintenance.

## Issue Tracking Documents

- `docs/issues/**` files are the user's local working notes. Read and update them whenever task progress or completion status changes.
- These files are editable; the restriction is only on Git inclusion. Do not stage, commit, push, or include them in pull requests unless the user explicitly asks to publish a specific issue document.
- When staging other work, explicitly exclude `docs/issues/**` even if an issue file was updated during the task.

## Source Of Truth

- Repository-wide enforcement: `AGENTS.md`.
- Product plan: `docs/notion/icu-product-plan-notion.md`.
- Main MVP plan: `docs/plan.md`.
- User flow: `docs/user-flow.md`.
- Shared UI principles and tokens: `docs/design/design-brief.md`.
- Screen behavior and API contracts: `docs/features`.
- Design workflow and document routing: `skills/design/SKILL.md`.
- Figma handoff: `docs/design/figma-handoff.md`.
- Static prototype: `prototype.html` and `prototype.css`.

## Guardrails

- Do not modify unrelated untracked folders such as `skills/` unless the user explicitly asks.
- Do not introduce Electron, RAG, or Notion API implementation during React screen work.
- Monaco and Express are already approved for the Workspace editor and local API boundary; keep their usage scoped to those flows.
- Prefer small, typed mock data over hardcoded screen-only strings once a UI surface becomes part of the app.
- Keep implementation aligned with the existing ICU design direction: practical IDE structure, beginner-friendly Today Hub entry, light/dark readiness, and restrained Workday-inspired orange/cyan/deep-blue accents.
