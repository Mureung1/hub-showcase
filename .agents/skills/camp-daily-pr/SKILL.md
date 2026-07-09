---
name: camp-daily-pr
description: Create, update, and merge an agent-written fork daily integration PR from the current codex/w<week>d<day> branch to N180_하성욱. Only create, update, or merge the upstream camp submission PR when the user explicitly asks for camp submission.
disable-model-invocation: true
---

# Fork Daily Integration PR

Create, update, and merge the fork-local daily integration PR from the current `codex/w<week>d<day>` branch to `N180_하성욱`. This daily PR is an internal integration/review artifact and can be created, updated, labelled, and merged without further approval.

Despite this skill's historical name, the daily integration PR is not the upstream camp submission PR. Everything from `codex/w<week>d<day>` through `swh3467:N180_하성욱` stays inside the participant's fork. Only the PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱` is the camp submission surface.

Do not create, update, or merge the upstream camp submission PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱` unless the user explicitly asks to submit to camp or continue to the upstream camp submission PR. The final camp submission surface is the upstream PR, but it is not part of the default daily PR action.

Use different body conventions for the two PRs:

| PR | Body convention |
| --- | --- |
| Daily integration PR | Local/Matt-style work brief: `Summary`, `Key Changes`, `Verification`, `Risks / Follow-ups`, and links to PRDs, issues, spike reports, or handoffs. Merge automatically after creation/update unless blocked. |
| Upstream camp submission PR | Only when explicitly requested: `.github/pull_request_template.md` exactly, including `주요 작업 리스트`, `내가 설명할 수 있는 부분`, `아직 이해 못 한 부분`, and `새로 알게 된 것`. |

Use the camp week/day as the daily branch identity:

| Concern | Convention |
| --- | --- |
| Daily work branch | Use `codex/w<week>d<day>`, for example `codex/w1d4`. This mirrors the camp mission day while keeping the branch ASCII and CLI-friendly. |
| Fork integration branch | Use `swh3467:N180_하성욱`. This is still inside the participant's fork. |
| Upstream camp submission branch | Use `connect-AIAgentChallenge-26-1/hub:N180_하성욱` as the base and `swh3467:N180_하성욱` as the head. |
| Camp mission labels | Use the camp-provided labels with the same week/day prefix, for example `[1-3] 기획완성`, `[1-3] 프로토타이핑`, or `[1-4] design-system`. Labels describe the submitted mission category on PRs. |

When creating or updating PRs, discover available labels before writing the PR and apply the relevant camp labels. Prefer labels whose bracket prefix matches the current daily branch, such as `[1-4]` for `codex/w1d4`. If multiple labels for that day are relevant, apply all of them. If the correct label is unclear and the user is not available, choose the smallest set that matches the changed work and state the assumption in the final report.

## Process

### 1. Ground the branch and repo

Read `AGENTS.md` and `docs/agents/issue-tracker.md`. Read `.github/pull_request_template.md` only before preparing or updating the upstream camp submission PR.

Determine the daily branch without asking for confirmation:

- Prefer the current branch when it matches `codex/w<week>d<day>`, such as `codex/w1d4`.
- Otherwise use the branch the user named.
- If neither is available, infer the most likely local `codex/w<week>d<day>` branch.
- If multiple branches are equally likely, stop and report the ambiguity instead of guessing.

Stop before PR work if:

- The daily branch is not found.
- The tracked working tree is dirty.
- `fork` remote is missing.
- `origin` remote is missing.
- `N180_하성욱` is not available locally or on `fork`.

Check the current camp labels:

- List labels on `origin`, because the upstream repo owns the official camp labels.
- List labels on `fork`, because the daily PR also needs matching labels if they exist there.
- Determine the relevant mission labels from the upstream label list before creating PRs.
- For the fork daily PR, create missing matching labels on `fork` only when the upstream label exists and local permissions allow it. If label creation or application fails, continue the PR flow and report the label failure.

### 2. Gather source material

Inspect the daily branch against `N180_하성욱`:

- `git log --oneline N180_하성욱..<daily-branch>`
- `git diff --name-status N180_하성욱...<daily-branch>`
- Relevant existing work PR bodies, spike reports, PRDs, issues, handoff docs, and ADRs referenced by the commits or changed files

Use this material to draft candidate PR content, but do not create the PR yet.

### 3. Draft the daily PR body

Use the local daily integration convention. The agent writes this PR body directly from the gathered material; do not interview section by section for the daily PR.

Use this structure:

1. PR title
2. `Summary`
3. `Key Changes`
4. `Verification`
5. `Risks / Follow-ups`

Link source material rather than forcing camp reflection content into the daily PR. If important context is genuinely missing, make a conservative assumption and note it under `Risks / Follow-ups`.

### 4. Create, update, and merge the daily PR

Do not ask the user to approve the daily PR body or merge. The daily PR is an agent-written internal integration artifact inside the user's fork.

Push the daily branch to `fork`.

Check for an existing open PR from `swh3467:<daily-branch>` to `swh3467:N180_하성욱`.

- If one exists, update its title and body with the agent-written daily PR content.
- If none exists, create a PR with base `N180_하성욱` and head `<daily-branch>`.

Apply the relevant camp labels to the daily PR after it exists. These labels are review metadata only; do not force camp reflection content into the daily PR body.

Merge the daily PR into `swh3467:N180_하성욱` after it exists and labels have been applied. Prefer a normal merge commit when available, preserve the daily branch unless the user explicitly asks to delete it, and continue without merging only when GitHub reports conflicts, branch protection, missing permissions, or another hard blocker. After merging, fetch `fork/N180_하성욱` again and keep the PR URL for the final report. Do not treat this fork PR as the final camp submission.

### 5. Report upstream submission readiness

Fetch `fork` and `origin`, then check whether the daily branch is already contained in `fork/N180_하성욱`.

- `git merge-base --is-ancestor <daily-branch> fork/N180_하성욱` succeeds.

Always report the upstream submission readiness status, but do not create, update, or merge the upstream camp submission PR unless the user explicitly asked for camp submission in this turn.

If the daily branch is not contained in `fork/N180_하성욱` after the daily PR merge step, do not claim that the latest daily work has been submitted. Report:

- The daily PR URL
- Whether an upstream submission PR already exists
- That the upstream submission PR cannot include the latest daily work until `fork/N180_하성욱` contains `<daily-branch>`

If the daily branch is contained in `fork/N180_하성욱`, check for an open upstream PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱` and report whether it exists.

### 6. Ensure the upstream submission PR, only when explicitly requested

Run this section only when the user explicitly asks to submit to camp or continue to the upstream camp submission PR.

Before creating or updating the upstream PR, read `.github/pull_request_template.md` and prepare a separate camp submission body. This is the only interview-based PR flow in this skill. Ask one question at a time for any missing or uncertain template section:

1. Upstream PR title
2. `주요 작업 리스트`
3. `내가 설명할 수 있는 부분`
4. `아직 이해 못 한 부분`
5. `새로 알게 된 것`

- If an upstream PR exists, update its title and body with the interview-confirmed camp submission content.
- If none exists, create it with base `N180_하성욱`, head `swh3467:N180_하성욱`, and the interview-confirmed camp submission content.

Apply the same relevant camp labels to the upstream submission PR. Use only labels that exist on the upstream repository. If label application fails because of permissions, report it explicitly.

Report both PR URLs when finished. The daily PR URL alone is not enough for camp submission.
