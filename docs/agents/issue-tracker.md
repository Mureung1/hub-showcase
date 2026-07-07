# Issue Tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues. Pull requests are also a limited request and triage surface.

This repo is PR-based, but implementation work should use the layered branch model in `AGENTS.md`, not a single long-lived working branch. Do not use `main` as a working branch or PR target.

| Branch level | Example | Role |
| --- | --- | --- |
| Individual work branch | `codex/runtime-ownership-spike-poc` | One feature, spike, fix, or document change. |
| Daily aggregation branch | `codex/0707` | Collects several individual work branches for one day or one focused batch. |
| Camp-facing personal branch | `N180_하성욱` | The participant's official branch for camp submission. |
| Upstream target branch | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | The final upstream branch that receives submitted work. |

For PRs, `base` is the destination branch that receives changes, and `head` is the source branch that contains the changes.

## Permissions

Do not assume the current contributor can create labels, apply labels, push to the upstream repo, or administer the repository. If a GitHub write operation fails because of permissions, leave a clear PR/issue comment or local summary instead.

## Pull Requests

PRs as a request surface: yes, limited to external PRs or PRs explicitly named for triage.

Collaborator in-flight PRs for this participant are review or aggregation artifacts, not triage input. For those PRs, connect the work to the source PRD, issue, agent brief, spike report, or handoff document rather than forcing the camp submission template into the PR body.

Internal work PRs should follow the branch flow in `AGENTS.md`:

| Purpose | Base | Head |
| --- | --- | --- |
| Work-scoped review | `swh3467:codex/MMDD` | `swh3467:codex/<work>` |
| Small work without a daily branch | `swh3467:N180_하성욱` | `swh3467:codex/<work>` |
| Daily aggregation into the personal branch | `swh3467:N180_하성욱` | `swh3467:codex/MMDD` |
| Camp-facing submission | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | `swh3467:N180_하성욱` |

When triaging PRs, read the PR body, comments, and diff. Use `gh pr view <number> --comments` and `gh pr diff <number>`.

The workflow `.github/workflows/auto-merge.yml` is template-provided but active in the repo. It attempts scheduled PR merges, skips PRs targeting `main`, skips PRs with the GitHub `review` label, defers changes-requested PRs, and closes conflicting PRs. Treat the GitHub `review` label as an auto-merge control, not as an agent triage state.

The PR template in `.github/pull_request_template.md` is the camp-facing submission template only. Matt Pocock skill templates are the PRD, issue, agent brief, and two-axis review artifact shapes described by the skills; they are not GitHub PR templates.

## When a skill says "publish to the issue tracker"

Prefer creating a GitHub issue if permissions allow. If issue creation is unavailable, publish the content in the relevant PR body or PR comment using the marker format in `docs/agents/triage-labels.md`.

## When a skill says "fetch the relevant ticket"

For internal work PRs, prefer the linked PRD, issue, agent brief, spike report, handoff document, or other spec source before treating the PR body as the source of truth.

Resolve bare numbers carefully: GitHub shares one number space across issues and PRs. Try `gh pr view <number> --comments` first for PR-based work, then fall back to `gh issue view <number> --comments`.
