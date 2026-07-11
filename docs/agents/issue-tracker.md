# Issue Tracker

Matt Pocock PRDs and implementation issue briefs for this repo live in local Markdown by default. GitHub Issues are used only when the user explicitly requests GitHub publication and confirms the target repository/surface. Pull requests are also a limited request and triage surface.

This repo is PR-based, but normal work happens on a `codex/...` branch rather than `main` or either `N180_하성욱` branch. The default name is the current camp day, `codex/w<week>d<day>`, such as `codex/w1d4`. An explicitly chosen `codex/<work>` name is still just a working branch; it does not introduce another required merge level.

| Role | GitHub repository and branch | Local Git ref | Purpose |
| --- | --- | --- | --- |
| Working branch | `swh3467/hub`의 `codex/w1d4` 또는 `codex/<work>` | `codex/...`, 게시 후 `fork/codex/...` | 구현, 문서, spike 작업 |
| Fork integration | `swh3467/hub`의 `N180_하성욱` | `fork/N180_하성욱` | 완료한 working branch를 모으는 개인 통합 브랜치 |
| Upstream target | `connect-AIAgentChallenge-26-1/hub`의 `N180_하성욱` | `origin/N180_하성욱` | 캠프 제출을 받는 최종 브랜치 |

For PRs, `base` is the destination branch that receives changes, and `head` is the source branch that contains the changes.

## Permissions

Do not assume the current contributor can create labels, apply labels, push to the upstream repo, or administer the repository. If a GitHub write operation fails because of permissions, leave a clear PR/issue comment or local summary instead.

## Pull Requests

PRs as a request surface: yes, limited to external PRs or PRs explicitly named for triage.

Collaborator in-flight PRs for this participant are review artifacts, not triage input. For those PRs, connect the work to the source PRD, issue, agent brief, spike report, or handoff document rather than forcing the camp submission template into the PR body.

PR 흐름은 두 단계뿐이다. `/camp-pr`가 두 단계를 모두 소유한다.

| Purpose | PR repository | Base | Head |
| --- | --- | --- | --- |
| Working branch integration | `swh3467/hub` | `N180_하성욱` | 현재 `codex/...` working branch |
| Upstream camp submission | `connect-AIAgentChallenge-26-1/hub` | `N180_하성욱` | `swh3467:N180_하성욱` |

Daily branch names keep the camp week/day identity. Camp labels are upstream submission metadata and do not create another branch level or need to be copied to fork-local integration PRs.

Use `fork/N180_하성욱` as the source of truth for the fork integration branch and `origin/N180_하성욱` as the fetched upstream target. Do not calculate readiness from a stale local `N180_하성욱` checkout.

When triaging PRs, read the PR body, comments, and diff. Use `gh pr view <number> --comments` and `gh pr diff <number>`.

The workflow `.github/workflows/auto-merge.yml` is template-provided but active in the repo. It attempts scheduled PR merges, skips PRs targeting `main`, skips PRs with the GitHub `review` label, defers changes-requested PRs, and closes conflicting PRs. Treat the GitHub `review` label as an auto-merge control, not as an agent triage state.

The PR template in `.github/pull_request_template.md` is only for the upstream camp submission PR. `/camp-pr` writes and merges the fork-local integration PR with a concise work brief, then reports upstream readiness. It creates or updates the upstream submission PR only when the user explicitly asks to submit to camp, and merges that PR only on a separate explicit merge request. Matt Pocock skill templates remain PRD, issue, agent brief, and review artifact shapes rather than GitHub PR templates.

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
