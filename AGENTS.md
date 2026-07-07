# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace monorepo with two apps. `server/` contains the Express API; source lives in `server/src/` and compiled output goes to `server/dist/`. `client/` contains the Vite React app; source lives in `client/src/`, static assets in `client/public/`, and the app entry point is `client/src/main.tsx`. The root `package.json` only coordinates workspace scripts. The current API surface is intentionally small: `/api/health` verifies the client-server connection through the Vite proxy.

## Build, Test, and Development Commands

- `npm install`: install root and workspace dependencies.
- `npm run dev`: start server and client together with `concurrently`.
- `npm run typecheck`: run TypeScript checks for both workspaces.
- `npm run build`: build `server` first, then `client`.
- `npm run lint -w client`: run `oxlint` for the React client.
- `npm run start -w server`: run the compiled server after `npm run build -w server`.

## Coding Style & Naming Conventions

Use TypeScript ESM throughout. Match the existing style: two-space indentation, single quotes, no semicolons, and strict TypeScript settings. Use `PascalCase` for React components and exported types, `camelCase` for functions and variables, and kebab-case for CSS class names. Keep imports simple: external packages first, then local files. Avoid locking in routers, databases, auth, or state-management libraries until the project needs them.

## Documentation Style

When writing Markdown planning, technical, or product documents, prefer tables for structured information and bullet points for scannable lists. Use prose for context and decisions, but model comparable items, options, tradeoffs, risks, and open questions in tables when practical.

## Testing Guidelines

No test framework or coverage threshold is configured yet. For now, run `npm run typecheck`, `npm run build`, and client linting before opening a PR. When adding tests, place them near the code they cover, using names like `server/src/health.test.ts` or `client/src/App.test.tsx`, and add the relevant workspace `test` script in the same change.

## Commit & Pull Request Guidelines

Recent commits use short, imperative subjects such as `Add auto-merge workflow for pull requests`. Keep commits focused and describe the behavior changed. PRs should follow `.github/pull_request_template.md`: summarize the work, include screenshots for UI changes, explain one implementation choice, note anything still unclear, and list what you learned. Use the requested PR title pattern, for example `[N100_Name] Add health status UI`, and link related issues when applicable.

For this participant, do not use `main` as a working branch or PR target. `N180_하성욱` is the camp-facing personal integration branch, and feature/spike branches should flow toward it through the personal fork before anything is submitted upstream.

In PRs, `base` is the destination branch that will receive changes, and `head` is the source branch that contains the changes. Use this branch model:

| Branch level | Example | Role |
| --- | --- | --- |
| Individual work branch | `codex/runtime-ownership-spike-poc` | One feature, spike, fix, or document change. |
| Daily aggregation branch | `codex/0707` | Collects several individual work branches for one day or one focused batch. |
| Camp-facing personal branch | `N180_하성욱` | The participant's official branch for camp submission. |
| Upstream target branch | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | The final upstream branch that receives submitted work. |

Use this PR flow:

| Purpose | Base | Head |
| --- | --- | --- |
| Work-scoped review | `swh3467:codex/MMDD` | `swh3467:codex/<work>` |
| Small work without a daily branch | `swh3467:N180_하성욱` | `swh3467:codex/<work>` |
| Daily aggregation into the personal branch | `swh3467:N180_하성욱` | `swh3467:codex/MMDD` |
| Camp-facing submission | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | `swh3467:N180_하성욱` |

The upstream `origin` repository is read-only for this contributor, so publish branches by pushing to the personal fork remote (`fork`). Open upstream PRs only for camp-facing aggregation/submission, not for every work-in-progress feature branch. Do not target `main`; the auto-merge workflow explicitly skips PRs whose base branch is `main`.

The PR template in `.github/pull_request_template.md` is the camp submission template. Use its sections (`주요 작업 리스트`, `내가 설명할 수 있는 부분`, `아직 이해 못 한 부분`, `새로 알게 된 것`) for camp-facing PRs only. When a Matt Pocock skill refers to PRs as an issue-tracker or triage surface, follow the agent workflow in `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` instead; do not treat the camp reflection sections as the skill's triage state or PRD format.

## Security & Configuration Tips

Keep secrets in local `.env` files and out of git. The server reads `PORT` through `dotenv` and defaults to `3000`; the client should call relative `/api/...` paths so Vite can proxy them during development.

## Agent skills

### Issue tracker

Issues are tracked in GitHub, and pull requests are also a request/triage surface for this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage state is recorded in PR/issue body markers, not GitHub labels, because contributors may not have label permissions. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
