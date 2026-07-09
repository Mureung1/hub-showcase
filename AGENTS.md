# Agent Instructions

- For any feature addition, UI change, layout change, component creation, style update, mock-mode UX work, profile/opportunity/task/saved-list work, or other visible React/Vite app change, use the `default-design` skill first.
- The skill is installed at `C:\Users\lyush\.codex\skills\default-design` and its reference guide is based on `DESIGN.md`.
- Keep UniRadar's dashboard-first product experience, mock-mode visibility, compact SaaS layout, category color accents, and local/mock MVP behavior aligned with that skill.
- Do not introduce frontend API keys or live provider calls unless the user explicitly asks for that integration.

## Default Development Stack

- Treat this repository as a React + Vite frontend and Express backend MVP.
- Use `npm` as the default command runner because `package.json`, `package-lock.json`, and `start-uniradar-dev.cmd` are npm-based. Do not switch package managers or remove lockfiles unless the user explicitly asks.
- Main local commands:
  - `npm run dev`: run React/Vite and Express together.
  - `npm run build`: verify the frontend production build.
  - `npm run preview`: preview the built frontend.
- The double-click development entrypoint is `start-uniradar-dev.cmd`; keep it aligned with `npm run dev` and the Vite URL.

## Directory Structure

- `src/main.jsx`: React app bootstrap only.
- `src/App.jsx`: current top-level MVP orchestration. Keep it stable, but split large visible features into components when a change becomes broad.
- `src/api.js`: frontend API client functions. All browser-to-server calls should go through this file or a similarly named API client module.
- `src/agents/`: client-side agent-like logic that does not need secrets, such as notice link extraction, scan comparison, and local brief generation.
- `src/data/`: static sample data, category metadata, and default source definitions.
- `src/storage/`: localStorage read/write helpers. Keep storage keys centralized here.
- `src/styles.css`: global UniRadar dashboard styles. Any visible style change must follow `default-design`.
- `server/index.js`: Express app entrypoint, middleware, route wiring, and server startup.
- `server/services/`: backend service logic, AI provider adapters, mock analysis, task creation, and other business logic.
- `server/schemas/`: Zod request/response schemas shared by backend routes and services.
- `README.md`: user-facing setup and demo instructions.
- `DESIGN.md`: product visual/design reference.
- `AGENTS.md`: contributor and agent operating rules.

## Libraries And Boundaries

- Frontend:
  - Use React and Vite patterns already present in the app.
  - Keep provider keys, secrets, and live AI SDK calls out of frontend code.
  - Use `fetch` through `src/api.js` for backend endpoints.
  - Keep local MVP persistence in localStorage helpers rather than scattering storage calls.
- Backend:
  - Use Express for `/api/*` routes.
  - Use `zod` for request validation and stable response shapes.
  - Use `dotenv` only on the server side.
  - Keep OpenAI/Gemini provider code inside `server/services/`.
  - Keep mock fallback behavior available so the app can demo without paid API access.
- Dependencies:
  - Prefer existing libraries before adding new ones.
  - Add a dependency only when it clearly reduces risk or complexity.
  - Update `package.json` and the relevant lockfile together when dependencies change.

## Code Conventions

- Use ES modules consistently.
- Use PascalCase for React components and camelCase for functions, variables, and service helpers.
- Keep functions focused: routes validate and delegate, services perform business logic, storage modules own persistence details.
- Keep API JSON contracts stable. When changing a response shape, update schemas, mock data, UI rendering, and README examples together.
- Use Korean UI copy that is concise, operational, and student-friendly.
- Keep user-facing errors clear and recoverable. Do not expose raw stack traces, API keys, or full environment variables in logs or UI.
- For external website scanning, prefer the Express HTML proxy path over direct browser fetches. Normalize links and handle relative URLs carefully.
- Before finalizing functional changes, run `npm run build` unless the task is documentation-only or the user explicitly asks to skip verification.

## Security And Environment Rules

- Never commit `.env`.
- Keep `.env.example` updated when environment variables change.
- Never hardcode API keys, tokens, or personal secrets.
- Never log API keys or dump all environment variables.
- Live provider calls must be gated by explicit environment configuration and must remain server-side.
- If live AI fails because of quota, auth, or rate limits, keep the app alive and fall back to mock or a friendly disabled state.

## UI And Design Rules

- For visible React/Vite changes, use the `default-design` skill first.
- Preserve the UniRadar dashboard-first experience: topbar, sidebar, compact cards, clear mode badge, category accents, and responsive layout.
- Do not replace the app with a marketing landing page.
- Avoid nested cards, oversized dashboard typography, hidden mock/live mode state, and frontend secrets.

## Commit Log Rules

- Use Conventional Commit-style messages:
  - `feat: add saved notice batch scan`
  - `fix: normalize KNU notice links`
  - `docs: update agent conventions`
  - `style: refine UniRadar dashboard layout`
  - `refactor: split analysis service helpers`
  - `test: add notice parser fixture`
  - `chore: update dependencies`
- Keep the subject short, imperative, and without a trailing period.
- Commit one logical change at a time when possible.
- Use the body when helpful to explain why the change was made, what risks remain, and what verification was run.
- Do not mention or include secrets in commit messages.
- Before committing, review `git status --short` and make sure generated files, `.env`, `node_modules`, and `dist` are not staged.