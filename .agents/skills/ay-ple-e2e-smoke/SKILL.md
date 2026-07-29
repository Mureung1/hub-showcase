---
name: ay-ple-e2e-smoke
description: Run Codex's repository-development AY-PLE smoke through the in-app Browser. Use when the user asks for a live smoke, dogfood run, or comprehensive Browser validation across AY, sources, Chat, SemesterModeling, Review, and retained workspace safety.
---

# AY-PLE E2E Smoke

Codex runs this repository-development harness. AY is the product Agent under
test inside AY-PLE; do not call the outer Codex runner AY. This Skill lives
under `hub/.agents/skills/` and is never installed as an AY-PLE built-in
Product Skill.

The smoke uses the configured provider and performs real model work through the
actual UI.

## Profiles

- **Repository dogfood** is the representative default. Reconcile its known
  generated SemesterWorkspace before starting AY-PLE, accept the Review, verify
  the resulting file and Git checkpoint, then retain the workspace, App
  process, and Browser tab for human inspection.
- **Arbitrary prepared SemesterWorkspace** is `review-only` by default. Never
  reconcile, recreate, clean, or bootstrap it. Reject the Review and prove that
  its state, Git history, and status stayed unchanged. Apply there only when the
  user separately and explicitly authorizes that mutation.

For repository dogfood, read
[`references/default-fixture.md`](references/default-fixture.md). Do not load
that reference for an unrelated workspace.

For one of the dogfood fixture's focused SemesterModeling scenarios, read
[`references/semester-modeling-scenarios.md`](references/semester-modeling-scenarios.md).
Do not load it for the default representative smoke or an unrelated workspace.

## Inputs

- The selected profile.
- An explicit absolute prepared SemesterWorkspace path for an arbitrary run.
- A named scenario or explicit workspace-relative source paths and read-only
  Chat prompt.

## Workflow

### 1. Reconcile the start and launch AY-PLE

For repository dogfood:

1. Resolve the seed, generated target, built-in Skill catalog, and semester
   identity exactly as declared in the default fixture reference.
2. Inspect and classify it through the reference's single
   `ready | reseedable | conflict` contract. Reuse `ready`. Fail closed and
   preserve every byte on `conflict`.
3. On `reseedable`, stop only a running AY-PLE process that targets this exact
   workspace, then run the helper's `stage` command. It must return a sibling
   `stagingRoot`, sorted `baselinePaths`, and the prior target fingerprint
   without changing the existing target.
4. Follow `$semester-workspace-init` against `stagingRoot`, passing every
   returned baseline path explicitly. Bootstrap owns Git initialization,
   workspace identity, `AGENTS.md`, complete Product Skill installation,
   Interaction MCP config, and checkpoints.
5. Require the prepared staging root to satisfy the reference's
   `staging-ready` facts and record its exact `HEAD`, then run the helper's
   `activate` command with that `HEAD`, the prior target fingerprint, and exact
   confirmation. Activation is the only cutover. Inspect the activated target
   again and require `ready` before launching the App.
6. Do not edit, archive, delete, or reset the normal persistent app-data
   registry. Launch the exact workspace through explicit `--workspace`; the App
   owns CAS replacement of a stale same-root binding after readiness. Treat a
   failed startup or mismatched post-start binding as Product RED and preserve
   the registry as evidence.

For an arbitrary prepared SemesterWorkspace, resolve its real absolute path,
confirm that it is an exact prepared Git root, and verify each scenario source
is a regular file inside it. Do not run the staging helper.

Before App startup, build the Interaction MCP and verify the normal persistent
production Runtime:

```bash
npm run build -w @ay-ple/interaction-mcp
npm run verify:production-runtime -w @ay-ple/codex-chat-runtime
```

Do not create an E2E-specific app-data root. If verification shows that the
canonical `../.ay-ple/` Runtime is absent or stale, materialize it with the
repository's documented command before continuing; do not rebuild it merely
because a new smoke started.

Capture the prepared workspace's `HEAD`, complete Git status,
`workspace-state.json` bytes, envelope identity, snapshot, and scenario source
bytes. Reuse a healthy AY-PLE process only when it targets this exact workspace.
For an unhealthy matching process, capture the failure and restart it
gracefully. Never replace a process for another workspace.

Otherwise start AY-PLE from the hub and retain its terminal output:

```bash
npm run dev -- --workspace "<absolute-workspace>"
```

Wait for `/api/product/bootstrap` to report
`workspaceLifecycle.state: "active"`. A listening port or rendered shell alone
is not readiness.

### 2. Exercise the Browser shell

Use `browser:control-in-app-browser` and its supported browser-client setup.
Drive the actual UI with fresh DOM-backed locators; do not replace a Browser
step with a direct product-action HTTP request or synthetic event.

Open or claim `http://127.0.0.1:4173/`, then verify:

- the active semester label and source explorer;
- the Chat panel can close and reopen through its labeled toggle;
- the message composer and Codex setting controls are present; and
- the Browser console has no product errors.

Restore Chat to its open state before continuing.

### 3. Exercise source browsing and selection

- Reload the source list through `자료 다시 불러오기`.
- Locate every scenario source exactly once by its full workspace-relative
  accessible name.
- Open representative previews and verify each expected preview kind renders.
- Select one source, verify the action count, clear that selection, and verify
  the count returns to zero.
- Select all scenario sources and verify the final action count.

Use visible controls for these transitions. Do not infer success only from the
source API.

### 4. Exercise read-only Chat

Clear the action selection so Chat is the only active intent. Send the
scenario's read-only prompt through the message composer and verify:

- the user message and a real AY response appear in the transcript;
- the operation reaches a terminal UI state without a transport error;
- AY answers the requested workspace question rather than returning only a
  generic plan; and
- no Review or workspace mutation is introduced.

Do not judge exact prose. Judge whether the response is grounded in the active
SemesterWorkspace and satisfies the prompt.

### 5. Exercise SemesterModeling and Review

Select all scenario sources again and invoke
`선택한 자료로 학기 정보 정리하기`. Verify the Action transcript contains
every selected path and wait for a pending Browser Review from
`propose_state_patch`; transcript-only advice is not that checkpoint.

If AY asks only how to represent an absent fact, direct it to preserve
`unknown` without inventing a value. Stop for user input when a substantive
academic ambiguity would change the proposal.

Inspect the Review semantically:

- it concerns the selected sources and current SemesterModel;
- it excludes unrelated snapshot facts; and
- it exposes uncertainty instead of inventing dates, relationships, or course
  facts.

Open one source citation when the Review supplies one and verify it opens the
relevant source preview. Do not require exact-text highlighting or a citation
when AY reasonably omitted one.

For repository dogfood, accept the Review and wait for the same Product Turn to
finish AY's native file write and meaningful Git checkpoint. Review acceptance
is not itself proof that the App or AY applied the change.

For an arbitrary prepared SemesterWorkspace in `review-only`, reject the Review
and verify that it resolves as rejected.

### 6. Verify and hand off

For repository dogfood, require:

- the `SemesterWorkspaceState` envelope identity is unchanged;
- only the reviewed SemesterModel snapshot facts changed;
- every fixture-backed source still has the seed's exact bytes;
- the installed Product Skill catalog still matches `hub/skills/`;
- AY left a meaningful checkpoint for the accepted state change and the Git
  working tree is clean;
- the App remains active and representative controls remain usable; and
- Browser console and retained terminal output contain no hidden product
  failure.

Retain the generated dogfood workspace, App process, and claimed Browser tab on
both PASS and product RED so the user can inspect the exact outcome. Mark the
tab as a handoff under the Browser Skill's cleanup rules. The next dogfood smoke
decides whether to reuse or reseed this state at its own start; do not clean it
at the end.

For an arbitrary `review-only` run, require the original state bytes, `HEAD`,
and complete Git status. Stop only a development process started by this run
and follow the Browser Skill's normal tab cleanup rules.

Move through journeys as soon as each real interaction settles. Treat any
unexpected recovery during the run as a product failure.

## Report

Lead with `PASS`, `RED · <stage>`, or `BLOCKED · <stage>`. Report coverage for
reconciliation, readiness, Browser shell, sources, Chat, SemesterModeling,
Review, and workspace postconditions. Include the smallest useful Browser and
terminal evidence and separate product failures from harness failures.

For retained dogfood, include the exact workspace path, final `HEAD`, Git
status, process state, and Browser handoff. After a failure, continue only
independent safe checks that add coverage. Preserve the first failure and do
not fix the product during the smoke unless the user separately requests it.
