# Agent Guidance

## Scope

- This file is the canonical Codex guidance for this repository.
- Keep local Codex-only supporting files under `.codex/`, but put rules that should apply every session here.

## Repository Boundaries

- Treat the `upstream` remote and `connect-AIAgentChallenge-26-1/hub` as strictly read-only.
- Never push to upstream or create, edit, close, reopen, comment on, label, merge, or otherwise mutate upstream issues, pull requests, releases, Wiki pages, branches, or repository settings.
- Perform all repository writes only against the personal repository `Tapha-K/hub` and its `origin` remote.
- Every mutating `gh` command must specify `--repo Tapha-K/hub`; never rely on GitHub CLI repository auto-detection.
- Push Git branches only with an explicit `origin` target.
- If a command's target repository is ambiguous, stop and resolve it with a read-only check before making changes.

## Branch Names

- Features: `feature/<short-topic>`
- Bug fixes: `fix/<short-topic>`
- Config, build, dependency, and ignore changes: `chore/<short-topic>`
- Documentation: `docs/<short-topic>`
- Refactors: `refactor/<short-topic>`

Examples:

- `feature/react-project-intro`
- `chore/ignore-local-agent-files`
- `docs/update-project-plan`

## Commit Messages

- Use this format:

```text
<type>: <summary>
```

- Use these types:
  - `feat`: feature additions
  - `fix`: bug fixes
  - `chore`: config, build, dependency, ignore, or maintenance work
  - `docs`: documentation changes
  - `style`: CSS, UI styling, or formatting changes
  - `refactor`: structural changes without behavior changes
  - `test`: test additions or updates

Examples:

- `feat: add project intro component`
- `chore: ignore local agent files`
- `docs: update reading platform plan`

## UI Work

- For UI design work, use `npx ui-skills start` as the default design reference workflow when feasible.
- Treat `ui-skills` as a temporary CLI/design assistant unless the project explicitly standardizes it as a dev dependency.
- Use `shadcn/ui` as the default component implementation source for React UI.
- Initialize shadcn/ui with `npx shadcn@latest init` when the project is not already configured.
- Add only the needed shadcn/ui components with `npx shadcn@latest add <component>`.
- Import and adapt generated components from the local project, typically under `components/ui/`, instead of depending on shadcn/ui as a runtime component package.
- Avoid generic AI-looking UI patterns: overused purple gradients, excessive rounded cards, decorative blobs, and low-density marketing layouts unless the task specifically calls for them.
- Match the existing application style first, then use shadcn/ui primitives to build practical, polished, product-like interfaces.

## Implementation Learnings

- When implementation exposes a real problem and the fix teaches a reusable lesson, record it as part of the same change.
- Keep frontend problems in `client/docs/frontend-implementation-notes.md`.
- Keep server problems in `server/docs/server-implementation-notes.md`.
- Record the symptom, root cause, fix, verification, and lesson. Do not add speculative issues or routine edits.

## Delivery Workflow

- Keep each branch scoped to one small, reviewable behavior or fix.
- Verify the affected client or server before committing.
- Use bisectable commits and the repository commit-message convention.
- Push the branch, open a personal PR targeting `main`, and use `.codex/pr_templates/personal.md`.
- Merge only after the PR is clean and required checks pass, then switch local work back to `main` and fast-forward it.
- Start the next unrelated change from a new appropriately named branch.

## Personal PRs

- Personal PRs target `main` as the base branch.
- For personal PR bodies, read and use `.codex/pr_templates/personal.md`.
- Before creating a personal PR, run `npm run build` when feasible.
- Personal PR bodies must include a concise product-level summary, grouped implementation changes, API·data migration impact, and verification results.
- State environment-variable, compatibility, deployment, or rollback concerns explicitly; write `없음` when none apply.
- Include review focus, known limitations, and the next tracked task or state that no follow-up is needed.
