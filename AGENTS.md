# Repository Guidelines

## Project Structure & Module Organization

This repository is an npm workspace monorepo with apps under `apps/*` and packages under `packages/*`. App source lives under each app's `src/`, package source lives under each package's `src/`, and compiled output goes to each workspace's `dist/` when applicable. The root `package.json` only coordinates workspace scripts. For current runtime-harness topology, API surfaces, implementation gaps, and package responsibilities, read `docs/architecture/runtime-harness-implementation-map.md` and then verify against the live code.

## Build, Test, and Development Commands

- `npm install`: install root and workspace dependencies.
- `npm run dev`: start server and inspector together with `concurrently`.
- `npm test`: run configured workspace test suites.
- `npm run typecheck`: run TypeScript checks across configured workspaces.
- `npm run build`: build configured workspaces.
- `npm run lint -w @ay-ple/inspector`: run `oxlint` for the React inspector.
- `npm run start -w @ay-ple/server`: run the compiled server after `npm run build -w @ay-ple/server`.

Runtime-specific package commands, live smoke commands, and generated-artifact commands should be documented in the relevant package README or architecture note rather than expanded here.

## Coding Style & Naming Conventions

Use TypeScript ESM throughout. Match the existing style: two-space indentation, single quotes, no semicolons, and strict TypeScript settings. Use `PascalCase` for React components and exported types, `camelCase` for functions and variables, and kebab-case for CSS class names. Keep imports simple: external packages first, then local files. Avoid locking in routers, databases, auth, or state-management libraries until the project needs them.

Static throwaway presentation artifacts under `artifacts/` and `spikes/`, plus their root demo entrypoint, may use browser-native ESM JavaScript when they are not imported by production workspaces. Load those scripts with `type="module"`, document their standalone run path, and migrate them to TypeScript before promoting the code into `apps/*` or `packages/*`.

## Documentation Style

Before creating, moving, or materially editing a formal project document, read `docs/README.md` in full. It is the source of truth for document placement, status classification, and the responsibility of each document type.

Follow the normative ownership table in `docs/README.md`. Change a term, decision, mapping, implementation fact, or priority in its owning document first; consumer documents should state only the consequence needed for their audience and link to that owner instead of copying field lists, rationale, or backlog state. Keep current implementation, adopted target, and deferred work explicitly separate.

When writing Markdown planning, technical, or product documents, prefer tables for structured information and bullet points for scannable lists. Use prose for context and decisions, but model comparable items, options, tradeoffs, risks, and open questions in tables when practical. Update the root `README.md` whenever adding or moving a formal project document under `docs/`. Local Matt Pocock artifacts under `docs/prds/`, `docs/issues/`, and `docs/wayfinding/` are an exception and should not be indexed individually in the root `README.md`.

프로젝트 문서의 문장 구조와 일반 설명어는 한국어로 작성한다. 프로젝트에서 이미 정한 도메인 용어와 프로토콜 메서드·타입, 패키지명, 파일 경로, 코드 식별자 같은 고유 식별자는 원문 표기를 유지한다.

## Interface Scope

Mobile and small-screen responsive layout are deferred for this project unless the user explicitly asks for mobile work. Do not spend implementation, review, or verification time optimizing mobile breakpoints, raising mobile-only layout issues, or reshaping interfaces for phones. Use desktop workspaces as the validation target, especially widths around 1440px to 1920px.

## Runtime Harness Conventions

Runtime implementation details should live in primary docs, package README files, and the code itself, not in this agent instruction file. Before changing Runtime Harness behavior, read `docs/adr/0003-build-runtime-harness-before-product-layer.md`, `docs/architecture/runtime-harness-implementation-map.md`, the relevant package README, and the current code/tests.

Keep AGENTS.md limited to stable operating rules. If runtime topology, endpoints, adapter behavior, generated protocol details, or known gaps change, update the implementation map or package docs instead of expanding this section.

Do not leak raw engine protocol shapes into AY-PLE product-facing contracts without a deliberate architecture update. Keep app-managed runtime state and secrets out of git.

## Codex Client Conventions

Before changing Codex Client Host behavior, product UI adapters, or App Server method integration, read `docs/adr/0008-separate-headless-codex-client-host-from-product-ui.md`, `docs/architecture/codex-app-server-method-inventory.md`, `packages/runtime-codex/README.md`, and the current code/tests. Before changing product work order or completion state, read the operating rules in `docs/product/ay-ple-development-backlog.md`.

Treat `docs/architecture/codex-app-server-method-inventory.md` as generated. Record reviewed method-level integration and adoption decisions in `packages/runtime-codex/codex-method-decisions.json`, then follow the package README to regenerate and verify the inventory. When the Codex pin or generated schema changes, review added and removed methods without automatically adopting new capabilities.

Only explicit implementation along the product Codex Client path advances a method's integration status. Generic notification transport and developer-only Runtime Harness handling do not. Keep task order and completion status in the canonical development backlog; do not encode dates, milestones, or priority labels into its task structure, and manage external submission dates separately.

Keep current package pins, method counts, exact generation commands, method tables, and implementation gaps in their owning README, generated inventory, backlog, or implementation map rather than copying them into this file.

## Testing Guidelines

For PR-ready verification, run `npm test`, `npm run typecheck`, `npm run build`, and `npm run lint -w @ay-ple/inspector`. Run live smoke commands only when the relevant package docs say they are appropriate for the task.

When adding tests, place them near the code they cover, using names like `apps/server/src/health.test.ts`, `apps/inspector/src/App.test.tsx`, or `packages/runtime-core/src/runtime.test.ts`, and add the relevant workspace `test` script in the same change if the workspace does not already have one.

## Commit & Pull Request Guidelines

Create commits frequently at natural checkpoints so work is easy to review and recover. Use focused Conventional Commit-style prefixes such as `docs:`, `chore:`, `feat:`, `fix:`, `test:`, `refactor:`, and `build:`. Keep the subject short, imperative, and behavior-focused, for example `docs: organize project documentation`.

Use `codex/w<week>d<day>` as the default daily working branch, such as `codex/w1d4`. An explicitly chosen `codex/<work>` branch is also a working branch, not a separate integration level. Do not use `main` or `N180_하성욱` for normal implementation, documentation, or spike work.

`origin` is the read-only upstream repository and `fork` is the participant's writable fork. Publish working branches to `fork`. Use `/camp-pr` for every integration or submission PR involving `N180_하성욱`; that skill owns repository/branch mapping, PR bodies, labels, merge policy, readiness checks, and the upstream submission approval gate.

## Security & Configuration Tips

Keep secrets in local `.env` files and out of git. The server reads `PORT` through `dotenv` and defaults to `3000`; the inspector should call relative `/api/...` paths so Vite can proxy them during development.

## Agent skills

### Issue tracker

Matt Pocock specs, implementation tickets, and Wayfinder maps/tickets are tracked as local Markdown by default. The compatibility paths remain `docs/prds/` for specs and `docs/issues/` for implementation tickets; Wayfinder artifacts live under `docs/wayfinding/`. GitHub Issues are used only when the user explicitly requests GitHub publication and confirms the target repo/surface. External PRs, or PRs explicitly named for triage, can be treated as a request surface; collaborator in-flight PRs are review artifacts, and fork integration PRs are created through `/camp-pr`. See `docs/agents/issue-tracker.md`.

### Matt skill operation alerts

Matt Pocock skills use generic GitHub terms such as issue tracker, PR, label, publish, fetch, current branch, and merge. In this repo, translate those terms through the repo-specific rules before acting:

| Generic skill instruction | Repo-specific rule |
| --- | --- |
| Publish a spec or implementation ticket to the issue tracker | `/to-spec` writes local Markdown under `docs/prds/`; `/to-tickets` writes one local Markdown file per ticket under `docs/issues/`. Do not create GitHub Issues unless the user explicitly asks and confirms the target repo/surface. |
| Create or work a Wayfinder map | Store local artifacts under `docs/wayfinding/<effort>/` and follow `.agents/skills/wayfinder/SKILL.md` for lifecycle and ticket semantics. |
| Apply or read a triage label | Use the body/comment marker state in `docs/agents/triage-labels.md`; do not assume GitHub label permissions. |
| Treat PRs as request or triage surface | Only external PRs, or PRs explicitly named by the user, are triage input. Collaborator work PRs and fork integration PRs are not triage queues. |
| Commit to the current branch | Use the current `codex/w<week>d<day>` branch or another explicitly chosen `codex/<work>` branch. Keep `prototype/<slug>` evidence branches outside the `/camp-pr` integration path. Do not commit normal work on `N180_하성욱` or `main`. |
| Use a GitHub PR template | Delegate PRs involving `N180_하성욱` to `/camp-pr`. Matt skill templates remain spec, ticket, Wayfinder, agent brief, or review artifact shapes. |
| Run `/setup-matt-pocock-skills` | This repo is already configured. Do not regenerate `docs/agents/**` unless the user explicitly asks; preserve the local artifact paths, working-branch rules, `/camp-pr`, marker-based triage, and fork-based publication rules. |

### Triage labels

Triage state is recorded in PR/issue body markers, not GitHub labels, because contributors may not have label permissions. See `docs/agents/triage-labels.md`.

### Domain docs

This repo uses a single-context domain docs layout. See `docs/agents/domain.md`.
