---
name: camp-daily-pr
description: Create a camp-facing daily PR from codex/MMDD to N180_하성욱 through an interview, then verify or create the upstream submission PR.
disable-model-invocation: true
---

# Camp Daily PR

Create the camp-facing daily PR from `codex/MMDD` to `N180_하성욱`, then verify or create the upstream submission PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱`.

Do not stop after creating the fork daily PR. The final camp submission surface is the upstream PR. Do not merge PRs as part of this skill unless the user gives a separate explicit merge instruction.

## Process

### 1. Ground the branch and repo

Read `AGENTS.md`, `docs/agents/issue-tracker.md`, and `.github/pull_request_template.md`.

Confirm the daily branch:

- Prefer the current branch when it matches `codex/MMDD`.
- Otherwise use the branch the user named.
- If neither is available, infer the most likely local `codex/MMDD` branch and confirm before continuing.

Stop before PR work if:

- The daily branch is not found.
- The tracked working tree is dirty.
- `fork` remote is missing.
- `origin` remote is missing.
- `N180_하성욱` is not available locally or on `fork`.

### 2. Gather source material

Inspect the daily branch against `N180_하성욱`:

- `git log --oneline N180_하성욱..codex/MMDD`
- `git diff --name-status N180_하성욱...codex/MMDD`
- Relevant existing work PR bodies, spike reports, PRDs, issues, handoff docs, and ADRs referenced by the commits or changed files

Use this material to draft candidate PR content, but do not create the PR yet.

### 3. Interview one section at a time

Use the `.github/pull_request_template.md` sections as the source of truth. Ask exactly one question at a time and wait for the user before moving on. For each question, provide a recommended answer based on the gathered material.

Ask in this order:

1. PR title
2. `주요 작업 리스트`
3. `내가 설명할 수 있는 부분`
4. `아직 이해 못 한 부분`
5. `새로 알게 된 것`

Preserve the user's wording when they revise a section. Keep unresolved or uncertain details in `아직 이해 못 한 부분` instead of inventing confidence.

### 4. Confirm the final PR body

Show the complete PR title and body. Do not create or update the PR until the user explicitly approves the final body.

Completion criterion: the user has approved every template section and the full body.

### 5. Create or update the daily PR

Push the daily branch to `fork`.

Check for an existing open PR from `swh3467:codex/MMDD` to `swh3467:N180_하성욱`.

- If one exists, ask whether to update that PR body.
- If none exists, create a PR with base `N180_하성욱` and head `codex/MMDD`.

After the PR exists, keep its URL for the final report. Do not treat this fork PR as the final camp submission.

### 6. Ensure the upstream submission PR

Fetch `fork` and `origin`, then check whether the daily branch is already contained in `fork/N180_하성욱`.

- `git merge-base --is-ancestor codex/MMDD fork/N180_하성욱` succeeds.

If the daily branch is not contained in `fork/N180_하성욱`, do not claim that the latest daily work has been submitted. Report:

- The daily PR URL
- Whether an upstream submission PR already exists
- That the upstream submission PR cannot include the latest daily work until `fork/N180_하성욱` contains `codex/MMDD`

If the daily branch is contained in `fork/N180_하성욱`, check for an open upstream PR from `swh3467:N180_하성욱` to `connect-AIAgentChallenge-26-1/hub:N180_하성욱`.

- If one exists, confirm whether its title and body should be updated to the approved daily PR title and body.
- If none exists, create it with base `N180_하성욱`, head `swh3467:N180_하성욱`, and the approved title and body.

Report both PR URLs when finished. The daily PR URL alone is not enough for camp submission.
