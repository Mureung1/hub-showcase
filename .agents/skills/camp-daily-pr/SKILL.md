---
name: camp-daily-pr
description: Create an agent-written local daily integration PR from codex/MMDD to N180_하성욱, then interview only for the camp submission PR that uses .github/pull_request_template.md.
disable-model-invocation: true
---

# Camp Daily PR

Create the local daily integration PR from `codex/MMDD` to `N180_하성욱`, then verify or create the upstream camp submission PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱`.

Do not stop after creating the fork daily PR. The final camp submission surface is the upstream PR. Do not merge PRs as part of this skill unless the user gives a separate explicit merge instruction.

Use different body conventions for the two PRs:

| PR | Body convention |
| --- | --- |
| Daily integration PR | Local/Matt-style work brief: `Summary`, `Key Changes`, `Verification`, `Risks / Follow-ups`, and links to PRDs, issues, spike reports, or handoffs. |
| Upstream camp submission PR | `.github/pull_request_template.md` exactly, including `주요 작업 리스트`, `내가 설명할 수 있는 부분`, `아직 이해 못 한 부분`, and `새로 알게 된 것`. |

Keep branch names and camp labels separate:

| Concern | Convention |
| --- | --- |
| Daily work branch | Keep using date-based `codex/MMDD`, for example `codex/0709`. This is the operational branch and should remain easy to match to the calendar day and local history. |
| Camp mission labels | Use the camp-provided week/day labels, for example `[1-3] 기획완성`, `[1-3] 프로토타이핑`, or `[1-4] design-system`. Labels describe the submitted mission category, not the branch identity. |

When creating or updating PRs, discover available labels before writing the PR and apply the relevant camp labels. Prefer labels whose bracket prefix matches the current mission day, such as `[1-4]` for week 1 day 4. If multiple labels for that day are relevant, apply all of them. If the correct label is unclear and the user is not available, choose the smallest set that matches the changed work and state the assumption in the final report.

## Process

### 1. Ground the branch and repo

Read `AGENTS.md` and `docs/agents/issue-tracker.md`. Read `.github/pull_request_template.md` only before preparing or updating the upstream camp submission PR.

Determine the daily branch without asking for confirmation:

- Prefer the current branch when it matches `codex/MMDD`.
- Otherwise use the branch the user named.
- If neither is available, infer the most likely local `codex/MMDD` branch.
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

- `git log --oneline N180_하성욱..codex/MMDD`
- `git diff --name-status N180_하성욱...codex/MMDD`
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

### 4. Create or update the daily PR

Do not ask the user to approve the daily PR body. The daily PR is an agent-written internal integration artifact.

Push the daily branch to `fork`.

Check for an existing open PR from `swh3467:codex/MMDD` to `swh3467:N180_하성욱`.

- If one exists, update its title and body with the agent-written daily PR content.
- If none exists, create a PR with base `N180_하성욱` and head `codex/MMDD`.

Apply the relevant camp labels to the daily PR after it exists. These labels are review metadata only; do not force camp reflection content into the daily PR body.

After the PR exists, keep its URL for the final report. Do not treat this fork PR as the final camp submission.

### 5. Ensure the upstream submission PR

Fetch `fork` and `origin`, then check whether the daily branch is already contained in `fork/N180_하성욱`.

- `git merge-base --is-ancestor codex/MMDD fork/N180_하성욱` succeeds.

If the daily branch is not contained in `fork/N180_하성욱`, do not claim that the latest daily work has been submitted. Report:

- The daily PR URL
- Whether an upstream submission PR already exists
- That the upstream submission PR cannot include the latest daily work until `fork/N180_하성욱` contains `codex/MMDD`

If the daily branch is contained in `fork/N180_하성욱`, check for an open upstream PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱`.

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
