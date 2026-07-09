---
name: to-issues
description: Break a local Markdown plan, spec, or PRD into independently-grabbable local Markdown issue briefs using tracer-bullet vertical slices. Publish to GitHub only when explicitly requested.
disable-model-invocation: true
---

# To Issues

Break a plan into independently-grabbable issues using vertical slices (tracer bullets).

This repo's Matt Pocock flow uses local Markdown issue briefs by default. Do not create GitHub Issues or PRs unless the user explicitly asks for GitHub publication and confirms the target repo/surface.

Write generated issue brief content in Korean; leave the template and examples below unchanged.

## Process

### 1. Gather context

Work from whatever is already in the conversation context. If the user passes a local Markdown path, read it fully. If the user passes a GitHub URL, fetch that exact URL. Do not resolve bare numbers as GitHub issues unless the user explicitly says they are GitHub issue or PR numbers.

### 2. Explore the codebase (optional)

If you have not already explored the codebase, do so to understand the current state of the code. Issue titles and descriptions should use the project's domain glossary vocabulary, and respect ADRs in the area you're touching.

Look for opportunities to prefactor the code to make the implementation easier. "Make the change easy, then make the easy change."

### 3. Draft vertical slices

Break the plan into **tracer bullet** issues. Each issue is a thin vertical slice that cuts through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

<vertical-slice-rules>

- Each slice delivers a narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Any prefactoring should be done first

</vertical-slice-rules>

### 4. Quiz the user

Present the proposed breakdown as a numbered list. For each slice, show:

- **Title**: short descriptive name
- **Blocked by**: which other slices (if any) must complete first
- **User stories covered**: which user stories this addresses (if the source material has them)

Ask the user:

- Does the granularity feel right? (too coarse / too fine)
- Are the dependency relationships correct?
- Should any slices be merged or split further?

Iterate until the user approves the breakdown.

### 5. Publish the issues as local Markdown

For each approved slice, publish a new local Markdown issue brief. These issues are considered ready for AFK agents, so include the local `Agent triage` block unless instructed otherwise.

Publish issues in dependency order (blockers first) so you can reference earlier local issue files in the "Blocked by" field.

If the source is a PRD file, create grouped issue files under:

```text
docs/issues/<prd-slug>/001-<slice-slug>.md
docs/issues/<prd-slug>/002-<slice-slug>.md
```

If there is no obvious PRD slug, use `docs/issues/<YYYY-MM-DD>-<short-plan-slug>/`.

After writing the files, report the created local paths. Do not create, edit, close, or delete GitHub Issues.

<issue-template>
## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

A reference to the parent local PRD or issue path (if the source was an existing artifact, otherwise omit this section).

## What to build

A concise description of this vertical slice. Describe the end-to-end behavior, not layer-by-layer implementation.

Avoid specific file paths or code snippets — they go stale fast. Exception: if a prototype produced a snippet that encodes a decision more precisely than prose can (state machine, reducer, schema, type shape), inline it here and note briefly that it came from a prototype. Trim to the decision-rich parts — not a working demo, just the important bits.

## Acceptance criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by

- A reference to the blocking local issue file (if any)

Or "None - can start immediately" if no blockers.

</issue-template>

Do NOT close or modify any parent issue or PRD.
