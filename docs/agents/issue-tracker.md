# Issue Tracker: GitHub

Issues and PRDs for this repo live in GitHub Issues. Pull requests are also a limited request and triage surface.

This repo is PR-based, but implementation work should use the layered branch model in `AGENTS.md`, not `main` or the camp-facing branch as a working branch. The default working branch is the current daily branch, named `codex/MMDD` such as `codex/0707`.

| Branch level | Example | Role |
| --- | --- | --- |
| Daily work branch | `codex/0707` | Default branch for the day's implementation, docs, spikes, and internal merges. |
| Individual work branch | `codex/runtime-ownership-spike-poc` | Optional branch for one feature, spike, fix, or document change before merging back to `codex/MMDD`. |
| Camp-facing personal branch | `N180_하성욱` | The participant's official branch for camp submission. |
| Upstream target branch | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | The final upstream branch that receives submitted work. |

For PRs, `base` is the destination branch that receives changes, and `head` is the source branch that contains the changes.

## Permissions

Do not assume the current contributor can create labels, apply labels, push to the upstream repo, or administer the repository. If a GitHub write operation fails because of permissions, leave a clear PR/issue comment or local summary instead.

## Pull Requests

PRs as a request surface: yes, limited to external PRs or PRs explicitly named for triage.

Collaborator in-flight PRs for this participant are review artifacts, not triage input. For those PRs, connect the work to the source PRD, issue, agent brief, spike report, or handoff document rather than forcing the camp submission template into the PR body.

Internal work PRs should follow the branch flow in `AGENTS.md`:

| Purpose | Base | Head |
| --- | --- | --- |
| Work-scoped review | `swh3467:codex/MMDD` | `swh3467:codex/<work>` |
| Camp daily PR | `swh3467:N180_하성욱` | `swh3467:codex/MMDD` |
| Camp-facing submission PR | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | `swh3467:N180_하성욱` |

When triaging PRs, read the PR body, comments, and diff. Use `gh pr view <number> --comments` and `gh pr diff <number>`.

The workflow `.github/workflows/auto-merge.yml` is template-provided but active in the repo. It attempts scheduled PR merges, skips PRs targeting `main`, skips PRs with the GitHub `review` label, defers changes-requested PRs, and closes conflicting PRs. Treat the GitHub `review` label as an auto-merge control, not as an agent triage state.

The PR template in `.github/pull_request_template.md` is the upstream camp submission template only. Create a `codex/MMDD` to `N180_하성욱` daily PR only through `/camp-daily-pr`; that skill writes the fork PR body directly with a local/Matt-style work brief, not the camp reflection template. The fork daily PR is not the final submission surface, and section-by-section interview is reserved for the upstream camp submission PR. `/camp-daily-pr` must also verify or create the upstream submission PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱` when `fork/N180_하성욱` contains the daily work, or clearly report that the latest daily work is not yet present in the submission branch. Matt Pocock skill templates are the PRD, issue, agent brief, and two-axis review artifact shapes described by the skills; they are not GitHub PR templates.

## When a skill says "publish to the issue tracker"

Prefer creating a GitHub issue if permissions allow. If issue creation is unavailable, publish the content in the relevant PR body or PR comment using the marker format in `docs/agents/triage-labels.md`.

## When a skill says "fetch the relevant ticket"

For internal work PRs, prefer the linked PRD, issue, agent brief, spike report, handoff document, or other spec source before treating the PR body as the source of truth.

Resolve bare numbers carefully: GitHub shares one number space across issues and PRs. Try `gh pr view <number> --comments` first for PR-based work, then fall back to `gh issue view <number> --comments`.
