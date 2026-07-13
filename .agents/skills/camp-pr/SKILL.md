---
name: camp-pr
description: Integrate a codex working branch into the participant fork's N180_하성욱 branch, report upstream readiness, and create, update, or merge the camp submission PR only when explicitly requested. Use when the user invokes /camp-pr, asks to collect completed work in the fork, prepare or submit camp work, or manage the N180_하성욱 submission PR.
---

# Camp PR

Move production changes through one path:

```text
swh3467/hub의 codex/... working branch
→ 같은 repository의 N180_하성욱 fork integration branch
→ connect-AIAgentChallenge-26-1/hub의 N180_하성욱 upstream target
```

Use `origin` and `fork` only as local Git remote names:

| Role | GitHub repository and branch | Local Git ref |
| --- | --- | --- |
| Working branch | `swh3467/hub`의 `codex/w<week>d<day>` 또는 명시적으로 선택한 `codex/<work>` | `codex/...`, 게시 후 `fork/codex/...` |
| Fork integration | `swh3467/hub`의 `N180_하성욱` | `fork/N180_하성욱` |
| Upstream target | `connect-AIAgentChallenge-26-1/hub`의 `N180_하성욱` | `origin/N180_하성욱` |

Do not combine repository owners with remote names. Use `swh3467/hub` plus branch `N180_하성욱` when describing GitHub, or `fork/N180_하성욱` when describing a local remote-tracking ref.

Prototype evidence branches such as `prototype/<slug>` are primary-source archives, not production working branches. Never select or merge them through this flow unless the user explicitly reclassifies their contents as production work on a `codex/...` branch.

## Authorization

- On a normal `/camp-pr` invocation, integrate the selected working branch into `fork/N180_하성욱` and report upstream readiness.
- Create or update the upstream camp submission PR only when the user explicitly asks to submit to camp or continue the upstream submission.
- Merge the upstream camp submission PR only when the user explicitly asks to merge it. A request to submit authorizes PR creation or update, not merge.
- Create, update, and merge the fork-local integration PR without another approval. It is an internal review artifact in the participant's fork.

## Process

### 1. Ground the refs

Read `AGENTS.md`. Read `docs/agents/issue-tracker.md` when linked Matt artifacts or PR triage rules matter. Read `.github/pull_request_template.md` only for an upstream submission.

Fetch both remotes before comparisons or PR operations. Treat `fork/N180_하성욱` as the fork integration source of truth and `origin/N180_하성욱` as the upstream target.

Select the source branch as follows:

1. Use the user-named `codex/...` branch when provided.
2. Otherwise use the current branch when it matches `codex/w<week>d<day>` or another explicit `codex/<work>` name.
3. Stop on ambiguity, a detached HEAD, `main`, either `N180_하성욱`, or a `prototype/...` evidence branch; do not invent another branch layer.

Stop before PR work when the tracked working tree is dirty, either remote is missing, the source branch is unavailable, or `fork/N180_하성욱` cannot be fetched.

### 2. Integrate the working branch into the fork

Inspect the source branch against the fetched integration branch:

- `git log --oneline fork/N180_하성욱..<source-branch>`
- `git diff --name-status fork/N180_하성욱...<source-branch>`
- Relevant specs, implementation tickets, Wayfinder decisions, ADRs, spike reports, handoffs, and verification results referenced by the commits or changed files

If the source branch is already contained in `fork/N180_하성욱`, skip PR creation and continue to readiness reporting.

Otherwise:

1. Draft an integration PR with `Summary`, `Key Changes`, `Verification`, and `Risks / Follow-ups`.
2. Push the source branch to `fork`.
3. Create or update the PR in `swh3467/hub` with base `N180_하성욱` and head `<source-branch>`.
4. Do not copy camp mission labels to this fork-local PR.
5. Merge the PR with a normal merge commit unless conflicts, branch protection, permissions, or another hard blocker prevent it. Preserve the source branch.
6. Fetch `fork` again and verify `git merge-base --is-ancestor <source-branch> fork/N180_하성욱`.

### 3. Report upstream readiness

Compare fetched `fork/N180_하성욱` with `origin/N180_하성욱` and check for an existing upstream PR. Report:

- The fork integration PR URL, or that the source branch was already integrated
- Whether `fork/N180_하성욱` contains the selected source branch
- Whether the fork integration branch has changes not yet in the upstream target
- Whether an upstream submission PR already exists

Do not equate the fork integration PR with camp submission.

### 4. Submit upstream only when requested

When the user explicitly asks to submit to camp:

1. Read `.github/pull_request_template.md`.
2. Summarize the accumulated diff from `origin/N180_하성욱` to `fork/N180_하성욱`, not only the latest working branch.
3. Ask one question at a time for any missing template content.
4. Create or update the PR in `connect-AIAgentChallenge-26-1/hub` with base `N180_하성욱` and head `swh3467:N180_하성욱`.
5. Apply only upstream camp labels that the user named or that are unambiguous from the submission. Ask when multiple plausible labels remain.
6. Leave the upstream PR open unless the user separately asks to merge it.

After an explicitly requested upstream merge, fetch both remotes and report the upstream PR URL and final branch containment state.
