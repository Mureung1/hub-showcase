# Issue Tracker

Matt Pocock PRDs and implementation issue briefs for this repo live in local Markdown by default. GitHub Issues are used only when the user explicitly requests GitHub publication and confirms the target repository/surface. Pull requests are also a limited request and triage surface.

This repo is PR-based, but implementation work should use the layered branch model in `AGENTS.md`, not `main` or the fork personal integration branch as a working branch. The default working branch is the current daily branch, named by camp week/day as `codex/w<week>d<day>`, such as `codex/w1d4`.

| Branch level | Example | Role |
| --- | --- | --- |
| Daily work branch | `codex/w1d4` | Default branch for the camp day's implementation, docs, spikes, and internal merges. |
| Individual work branch | `codex/runtime-ownership-spike-poc` | Optional branch for one feature, spike, fix, or document change before merging back to the current daily branch. |
| Fork personal integration branch | `N180_하성욱` | The participant's fork-owned integration branch; this is the head branch for upstream camp submission. |
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
| Work-scoped review | `swh3467:<daily-branch>` | `swh3467:codex/<work>` |
| Fork daily integration PR | `swh3467:N180_하성욱` | `swh3467:<daily-branch>` |
| Upstream camp submission PR | `connect-AIAgentChallenge-26-1/hub:N180_하성욱` | `swh3467:N180_하성욱` |

Daily branches use the camp week/day identity (`codex/w<week>d<day>`). Camp labels use the matching upstream week/day mission names, for example `[1-3] 기획완성`, `[1-3] 프로토타이핑`, or `[1-4] design-system`.

Use `fork/N180_하성욱` as the source of truth for the fork personal integration branch. Do not compare daily work or report upstream submission readiness from a stale local `N180_하성욱` branch.

When triaging PRs, read the PR body, comments, and diff. Use `gh pr view <number> --comments` and `gh pr diff <number>`.

The workflow `.github/workflows/auto-merge.yml` is template-provided but active in the repo. It attempts scheduled PR merges, skips PRs targeting `main`, skips PRs with the GitHub `review` label, defers changes-requested PRs, and closes conflicting PRs. Treat the GitHub `review` label as an auto-merge control, not as an agent triage state.

The PR template in `.github/pull_request_template.md` is the upstream camp submission template only. Create the fork daily integration PR from the daily branch to `swh3467:N180_하성욱` only through `/camp-pr`; that skill writes and creates or updates the fork-local PR directly with a local/Matt-style work brief, not the camp reflection template. The fork daily integration PR is not the camp submission surface and should be merged automatically into `swh3467:N180_하성욱` unless blocked by conflicts, branch protection, missing permissions, or another hard blocker. Section-by-section interview is reserved for the upstream camp submission PR. `/camp-pr` reports whether the daily work is ready for upstream submission, but it must not create, update, or merge the upstream camp submission PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱` unless the user explicitly asks to submit to camp or continue to the upstream camp submission PR. Matt Pocock skill templates are the PRD, issue, agent brief, and two-axis review artifact shapes described by the skills; they are not GitHub PR templates.

## Local Matt artifacts

| Artifact | Default location | Notes |
| --- | --- | --- |
| PRD from `/to-prd` | `docs/prds/YYYY-MM-DD-<slug>.md` | Include an `Agent triage` block with `State: ready-for-agent`. |
| Issue brief from `/to-issues` | `docs/issues/<prd-slug>/NNN-<slug>.md` | Reference local parent/blocking files instead of GitHub issue numbers. |

Local Matt PRDs and issue briefs are agent workflow artifacts. They do not create upstream camp-visible GitHub noise and do not use `.github/pull_request_template.md`.

## Closing local Matt artifacts

When implementation and review are complete, close the existing local artifacts
instead of creating a separate completion document:

1. Mark verified acceptance criteria as checked.
2. Set `State: completed` and `Next actor: none`.
3. Add a concise implementation outcome with the relevant commits and final verification.
4. Update the primary architecture note or package README when the live implementation map changed.

Keep the original problem statement and design decisions as historical context.
Completion evidence records what shipped, while primary architecture documents
and the current code/tests remain the source of truth for live behavior.

## When a skill says "publish to the issue tracker"

For `/to-prd` and `/to-issues`, publish local Markdown as described above. Do not create GitHub Issues unless the user explicitly asks for GitHub publication and confirms the target repo/surface.

For other skills, prefer local Markdown when the artifact is an internal Matt planning artifact. If a GitHub write is explicitly requested but unavailable, publish the content in the relevant PR body or PR comment using the marker format in `docs/agents/triage-labels.md`.

## When a skill says "fetch the relevant ticket"

For internal work PRs, prefer the linked local PRD, local issue brief, agent brief, spike report, handoff document, or other spec source before treating the PR body as the source of truth.

Resolve bare numbers carefully: GitHub shares one number space across issues and PRs. Try `gh pr view <number> --comments` first for PR-based work, then fall back to `gh issue view <number> --comments`.
