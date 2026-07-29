---
name: ay-ple-e2e-smoke
description: Run a short, comprehensive AY-PLE product smoke across source browsing, Chat, SemesterModeling, Review, and workspace safety in the in-app Browser.
---

# AY-PLE E2E Smoke

This smoke uses the configured provider and performs real model work.

Default to `review-only`: exercise state-changing intent through Review, then
reject it and prove that the SemesterWorkspace stayed unchanged. Use `apply`
only when the user explicitly requests persistence in a disposable workspace.

## Inputs

- An explicit absolute prepared SemesterWorkspace path.
- A named scenario or explicit workspace-relative source paths and read-only
  Chat prompt.
- `review-only` or `apply`; default to `review-only`.

For the repository's representative smoke, read
[`references/default-fixture.md`](references/default-fixture.md). Do not load
that reference for an unrelated workspace.

## Workflow

### 1. Fix the starting point and launch AY-PLE

- Resolve the workspace to its real absolute path.
- Confirm it is a prepared Git SemesterWorkspace, every scenario source is a
  regular file inside it, and
  `.agents/skills/ay-ple-semester-modeling/SKILL.md` exists.
- Capture its `HEAD`, complete Git status, and `workspace-state.json` SHA-256.
  Preserve a dirty fixture as-is.
- Reuse a healthy AY-PLE process only when it targets this exact workspace.
  For an unhealthy matching process, capture the failure and restart it
  gracefully. Never replace a process for another workspace.
- Otherwise start the App from the hub and retain its terminal output:

  ```bash
  npm run dev -- --workspace "<absolute-workspace>"
  ```

Wait for `/api/product/bootstrap` to report
`workspaceLifecycle.state: "active"`. A listening port or rendered shell alone
is not readiness.

### 2. Exercise the Browser shell

Use `browser:control-in-app-browser` and its supported browser-client setup.
Drive the actual UI with fresh DOM-backed locators; do not replace a browser
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

Use the visible controls for these transitions. Do not infer success only from
the source API.

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

Open one evidence target when the Review supplies one and verify it navigates
back to the relevant source. Do not require evidence when AY reasonably omitted
it.

In `review-only`, click `거절` and verify the Review resolves as rejected. In
explicit `apply`, click `수락`, then verify only the reviewed snapshot change
was written and the SemesterWorkspaceState envelope identity stayed intact.

### 6. Verify postconditions

- Confirm the App is still active and representative controls remain usable.
- In `review-only`, require the original state SHA-256, `HEAD`, and complete Git
  status.
- In `apply`, inspect the exact diff and any resulting checkpoint.
- Inspect Browser console and terminal output for hidden failures.
- Stop only a development process started by this run and follow the Browser
  Skill's tab cleanup rules.

Move through the journeys as soon as each real interaction settles. Treat any
unexpected recovery during the run as a product failure.

## Report

Lead with `PASS`, `RED · <stage>`, or `BLOCKED · <stage>`. Report coverage for
readiness, Browser shell, sources, Chat, SemesterModeling, Review, and workspace
postconditions. Include the smallest useful Browser and terminal evidence and
separate product failures from harness failures.

After a failure, continue only independent, safe checks that add coverage.
Preserve the first failure and do not fix the product during the smoke run
unless the user separately requests it.
