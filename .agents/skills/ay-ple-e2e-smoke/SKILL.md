---
name: ay-ple-e2e-smoke
description: Run AY-PLE through an actual prepared SemesterWorkspace, live Codex Runtime, workspace Skill and Interaction MCP, and the in-app Browser. Use when smoke-testing SemesterModeling, reproducing a live product-path failure, or verifying that a runtime change survives a realistic browser session.
---

# AY-PLE E2E Smoke

Run this Skill only when the user explicitly requests a live smoke test. It
uses the configured provider and can incur real model work.

Default to `review-only` mode: exercise the complete product path through a
pending semantic Review, keep it alive through the lifecycle soak, then reject
the proposal and prove that the SemesterWorkspace did not change. Use
`apply` mode only when the user explicitly asks to accept and persist the
reviewed proposal in a disposable workspace.

## Inputs

- An explicit absolute prepared SemesterWorkspace path.
- A named scenario or explicit workspace-relative source paths.
- `review-only` or `apply`. Omit this input to use `review-only`.

For the repository's representative SemesterModeling scenario, read
[`references/semester-modeling-fixture.md`](references/semester-modeling-fixture.md).
Do not load that reference for an unrelated scenario.

## Workflow

### 1. Preserve the starting point

Before starting AY-PLE:

- Resolve the workspace to its real absolute path.
- Confirm it is a prepared Git SemesterWorkspace and that each selected source
  is a regular file inside it.
- Confirm `.agents/skills/ay-ple-semester-modeling/SKILL.md` exists.
- Capture `HEAD`, the complete Git status, and the SHA-256 of
  `workspace-state.json`. A dirty fixture is allowed; preserve its exact
  baseline rather than requiring a clean tree.
- Check whether AY-PLE already owns its development ports. Reuse an existing
  healthy process only when it targets this exact workspace. When that exact
  process is already unhealthy and the user requested a fresh smoke run,
  capture its failure and restart it gracefully. Do not kill or replace a
  different process.

If any preflight check fails, report `BLOCKED · preflight` with the concrete
evidence and stop.

### 2. Establish live readiness

Start AY-PLE from the hub when it is not already running:

```bash
npm run dev -- --workspace "<absolute-workspace>"
```

Keep the process interactive and retain its terminal output. Wait for
`/api/product/bootstrap` to report `workspaceLifecycle.state: "active"` and
record that observation as elapsed time zero. A listening port or rendered
shell alone is not readiness.

If readiness fails, collect the bootstrap payload and relevant terminal output,
report `RED · readiness`, and stop without attempting UI actions.

### 3. Drive the product through the in-app Browser

Use `browser:control-in-app-browser` and its supported browser-client setup.
Do not substitute standalone Playwright, Chrome, Computer Use, direct action
HTTP requests, or synthetic UI event dispatch.

Open or claim `http://127.0.0.1:4173/`, then use current DOM-backed locators to:

1. Verify the active semester label and source explorer.
2. Find each selected source exactly once by its full workspace-relative
   accessible name.
3. Optionally open each preview to prove that the actual PDF route renders.
4. Select every source through its checkbox.
5. Verify the action button count, then invoke
   `선택한 자료로 학기 정보 정리하기`.

Keep the chat tab open. Do not navigate or reload it while an operation or
Review is pending.

### 4. Observe AY rather than impersonating it

Wait for the real Runtime to process the action. The required E2E checkpoint is
a pending Browser Review produced by `propose_state_patch`; transcript text
alone is not enough.

If the operation completes without that Review, record `RED · review`. When it
is safe to leave the App idle, continue passive lifecycle sampling through the
330-second boundary so an independent Runtime-longevity failure is not hidden;
do not invoke the action a second time.

If AY asks a clarification that only determines how absent facts should be
represented, tell it to preserve them as `unknown` and continue without
inventing values. Do not answer a substantive academic ambiguity on the
student's behalf. Report such a case as `BLOCKED · clarification` if Review
cannot safely be reached.

Inspect the Review semantically. It must:

- concern the selected academic sources and the current SemesterModel;
- keep unrelated snapshot facts out of scope;
- make uncertainty visible instead of inventing missing dates, relationships,
  or course facts; and
- remain pending until the lifecycle soak finishes.

Do not require exact prose, field names, object counts, or evidence locators
unless the named scenario declares them. AY retains judgment within these
guardrails.

### 5. Prove runtime longevity

Keep the live session running until at least 330 seconds have elapsed since the
first active bootstrap observation. Sample `/api/product/bootstrap` and the
visible operation state at intervals no longer than 45 seconds; never hide the
soak behind one blocking wait longer than 60 seconds.

The Runtime must remain `active`, the Browser must remain usable, and the
pending Review must remain settleable throughout the soak. At the first
transition to `recovery_required`, capture elapsed time, bootstrap payload,
Browser state, console errors, and terminal output, then report
`RED · lifecycle`.

### 6. Settle and verify

In `review-only` mode, click `거절` after the soak. Verify the Review resolves
as rejected, the app remains active, `workspace-state.json` has the original
SHA-256, and Git status exactly matches the captured baseline.

In explicit `apply` mode, inspect the proposal before clicking `수락`. Then
verify that only the reviewed snapshot change was written, the
SemesterWorkspaceState envelope identity was preserved, and any Git checkpoint
contains only intended paths.

Stop only a development process started by this run. Follow the Browser Skill's
tab cleanup rules.

## Report

Lead with exactly one outcome:

- `PASS` when every required checkpoint and postcondition succeeds.
- `RED · <stage>` for a product failure.
- `BLOCKED · <stage>` for unavailable credentials, unsafe ambiguity, or an
  invalid test fixture.

Include the workspace, mode, sources, elapsed soak time, Review outcome,
before/after state digest, Git delta, and the smallest useful terminal and
Browser evidence. Separate product failures from test-harness failures. Do not
fix the product during the same smoke run unless the user separately requests
the fix.
