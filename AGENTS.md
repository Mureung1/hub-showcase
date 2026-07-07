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

When writing Markdown planning, technical, or product documents, prefer tables for structured information and bullet points for scannable lists. Use prose for context and decisions, but model comparable items, options, tradeoffs, risks, and open questions in tables when practical. Follow `docs/README.md` for formal project document placement, and update the root `README.md` whenever adding or moving a formal project document under `docs/`.

## Testing Guidelines

No test framework or coverage threshold is configured yet. For now, run `npm run typecheck`, `npm run build`, and client linting before opening a PR. When adding tests, place them near the code they cover, using names like `server/src/health.test.ts` or `client/src/App.test.tsx`, and add the relevant workspace `test` script in the same change.

## Commit & Pull Request Guidelines

Create commits frequently at natural checkpoints so work is easy to review and recover. Use focused Conventional Commit-style prefixes such as `docs:`, `chore:`, `feat:`, `fix:`, `test:`, `refactor:`, and `build:`. Keep the subject short, imperative, and behavior-focused, for example `docs: organize project documentation`. Camp-facing PRs should follow `.github/pull_request_template.md`: summarize the work, include screenshots for UI changes, explain one implementation choice, note anything still unclear, and list what you learned. Use the requested PR title pattern, for example `[N100_Name] Add health status UI`, and link related issues when applicable.

For this participant, do not use `main` as a working branch or PR target. The default working branch is the current daily branch, named `codex/MMDD` such as `codex/0707`. `N180_하성욱` is the camp-facing personal integration branch, not a normal working branch.

In PRs, `base` is the destination branch that will receive changes, and `head` is the source branch that contains the changes. Use this branch model:

| Branch level | Example | Role |
| --- | --- | --- |
| Daily work branch | `codex/0707` | Default branch for the day's implementation, docs, spikes, and internal merges. |
| Individual work branch | `codex/runtime-ownership-spike-poc` | Optional branch for one feature, spike, fix, or document change before merging back to `codex/MMDD`. |
| Camp-facing personal branch | `N180_하성욱` | The participant's official branch for camp submission. |
| Upstream target branch | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | The final upstream branch that receives submitted work. |

Use this PR flow:

| Purpose | Base | Head |
| --- | --- | --- |
| Work-scoped review | `swh3467:codex/MMDD` | `swh3467:codex/<work>` |
| Camp daily PR | `swh3467:N180_하성욱` | `swh3467:codex/MMDD` |
| Camp-facing submission PR | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | `swh3467:N180_하성욱` |

The upstream `origin` repository is read-only for this contributor, so publish branches by pushing to the personal fork remote (`fork`). Open upstream PRs only for camp-facing submission, not for every work-in-progress feature branch. Do not target `main`; the auto-merge workflow explicitly skips PRs whose base branch is `main`.

The PR template in `.github/pull_request_template.md` is the camp submission template. Use its sections (`주요 작업 리스트`, `내가 설명할 수 있는 부분`, `아직 이해 못 한 부분`, `새로 알게 된 것`) for camp-facing daily PRs only. Internal work PRs do not use a separate GitHub PR template; link the source PRD, issue, agent brief, spike report, or handoff document instead. Create a `codex/MMDD` to `N180_하성욱` daily PR only when the user invokes `/camp-daily-pr`; that skill interviews the user section by section and creates or updates the fork PR. The fork daily PR is not the final submission surface. `/camp-daily-pr` must also verify or create the upstream submission PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱` when `fork/N180_하성욱` contains the daily work, or clearly report that the latest daily work is not yet present in the submission branch. When a Matt Pocock skill refers to a template, treat it as the skill's own PRD, issue, agent brief, or review artifact shape, not as `.github/pull_request_template.md`. When a Matt Pocock skill refers to PRs as an issue-tracker or triage surface, follow the agent workflow in `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md` instead; do not treat the camp reflection sections as the skill's triage state or PRD format.

## Security & Configuration Tips

Keep secrets in local `.env` files and out of git. The server reads `PORT` through `dotenv` and defaults to `3000`; the client should call relative `/api/...` paths so Vite can proxy them during development.

## Agent skills

### Issue tracker

Issues and PRDs are tracked in GitHub Issues. External PRs, or PRs explicitly named for triage, can be treated as a request surface; collaborator in-flight PRs are review artifacts, and camp daily PRs are created through `/camp-daily-pr`. See `docs/agents/issue-tracker.md`.

### Matt skill operation alerts

Matt Pocock skills use generic GitHub terms such as issue tracker, PR, label, publish, fetch, current branch, and merge. In this repo, translate those terms through the repo-specific rules before acting:

| Generic skill instruction | Repo-specific rule |
| --- | --- |
| Publish a PRD or issue to the issue tracker | Prefer GitHub Issues if permissions allow; otherwise use the PR body or a PR comment with the marker format in `docs/agents/triage-labels.md`. |
| Apply or read a triage label | Use the body/comment marker state in `docs/agents/triage-labels.md`; do not assume GitHub label permissions. |
| Treat PRs as request or triage surface | Only external PRs, or PRs explicitly named by the user, are triage input. Collaborator work PRs and camp daily PRs are not triage queues. |
| Commit to the current branch | The default current branch should be `codex/MMDD`; optional `codex/<work>` branches must merge back to `codex/MMDD`. Do not commit normal work on `N180_하성욱` or `main`. |
| Use a GitHub PR template | `.github/pull_request_template.md` is only for `/camp-daily-pr` camp daily PRs. Matt skill templates are their own PRD, issue, agent brief, or review artifact shapes. |
| Merge a PR | Do not merge PRs created or checked by `/camp-daily-pr` unless the user gives a separate explicit merge instruction. |
| Run `/setup-matt-pocock-skills` | This repo is already configured. Do not regenerate `docs/agents/**` unless the user explicitly asks; preserve the `codex/MMDD`, `/camp-daily-pr`, marker-based triage, and fork-based PR rules. |

### Triage labels

Triage state is recorded in PR/issue body markers, not GitHub labels, because contributors may not have label permissions. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
