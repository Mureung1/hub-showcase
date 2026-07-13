---
name: to-spec
description: Turn the current conversation or a ready Wayfinder map into an implementation-ready local Markdown spec. Use before /to-tickets; publish to GitHub only when explicitly requested.
disable-model-invocation: true
---

# To Spec

Synthesize the current conversation and codebase understanding into a spec (historically called a PRD in this repository). Do **not** add an interview step: use decisions already made, inspect the codebase for facts, and make unresolved decision points explicit.

This repository uses local Markdown by default. Do not create GitHub Issues or PRs unless the user explicitly asks for GitHub publication and confirms the target repository or request surface.

Write generated spec content in Korean. Preserve established domain terms, protocol names, package names, file paths, and code identifiers in their original form.

## Process

### 1. Read the operating context

Read `AGENTS.md`, `docs/README.md`, `docs/agents/issue-tracker.md`, the relevant owning documents, ADRs, package READMEs, and live code/tests.

Work from the conversation unless the user passes a reference. Resolve that reference exactly as `docs/agents/issue-tracker.md` defines; do not reinterpret a local path, URL, or bare number with a different tracker convention.

When the reference is a Wayfinder map:

1. Require the map to be `ready-for-spec`, unless the user explicitly asks for a draft.
2. Read the map first as an index.
3. Follow the linked resolved ticket answers needed to reconstruct the decisions; do not ask the user to repeat them.
4. Treat the ticket answer as the detailed source and the map's one-line gist only as navigation.

### 2. Establish current state and testing seams

Explore the repository when the current implementation is not already known. Separate:

- current implementation and constraints,
- adopted target behavior,
- deferred or out-of-scope work.

Record the highest practical testing seam. Prefer an existing external-behavior seam over adding a new one. If the seam was not settled in prior discussion, choose the strongest evidence-backed proposal and list any genuinely blocking uncertainty under `Open Questions` rather than starting a new interview.

### 3. Write an implementation-ready contract

Capture behavior and technical contracts, not a brittle file-by-file edit list. Include module responsibilities, interfaces, invariants, data/state flow, failure behavior, compatibility or migration rules, and testing decisions when they matter.

Specific file paths are allowed only as non-normative current-state references. Avoid code snippets unless a prototype produced a compact state machine, reducer, schema, or type shape that expresses an adopted decision more precisely than prose.

### 4. Determine readiness

- With no unresolved implementation-blocking question, set `State: ready-for-ticketing` and `Next actor: /to-tickets`.
- With a blocking decision still open, set `State: draft` and name the next actor (`/grill-with-docs`, `/wayfinder`, or the user). Do not represent a draft as implementation-ready.

A spec is not an implementation ticket and must not use `ready-for-agent`.

### 5. Save locally and reconcile a source map

Write the spec under the repository's canonical spec path:

```text
docs/specs/YYYY-MM-DD-<short-slug>.md
```

If the path exists, append a short numeric suffix. Report the path and the readiness state. In the default local flow, do not create, edit, close, or delete GitHub Issues. If the user explicitly requests GitHub publication, preserve the local spec and follow `docs/agents/issue-tracker.md` for the confirmed target.

When the source was a Wayfinder map, link the written spec from the map and reconcile the map state with the actual spec readiness:

- If the spec is `ready-for-ticketing`, set the map to `State: complete`, set `Next actor: /to-tickets`, and retain the final spec link under `Resulting spec`.
- If the spec is `draft`, do **not** complete the map. Set the map back to `State: active` and `Next actor: /wayfinder`; record each newly discovered blocking uncertainty as an `open` Wayfinder ticket when it is precise, or under `Not yet specified` when it is still fog. Link the draft spec as evidence and report the next Wayfinder action.

<spec-template>

# <Spec title>

## Agent triage

- State: <draft | ready-for-ticketing>
- Surface: local-spec
- Next actor: </grill-with-docs | /wayfinder | /to-tickets | user>

## Problem Statement

The problem from the user's perspective.

## Solution

The intended result from the user's perspective.

## User Stories

A comprehensive numbered list in this form:

1. As an <actor>, I want a <feature>, so that <benefit>.

## Current State and Constraints

The relevant current implementation, owning documents, constraints, and adopted decisions. Keep current behavior, target behavior, and deferred work distinct.

## Implementation Contract

### Module Responsibilities and Seams

The responsibilities each module owns and the stable external or internal seams between them.

### Interfaces and Invariants

Interface shapes, ordering constraints, invariants, authorization rules, idempotency expectations, and other contracts callers may rely on.

### Data and State Flow

The end-to-end data path, state transitions, lifecycle, and observable outcomes.

### Failure Behaviour

Timeout, cancellation, retry, partial failure, invalid state, and degraded-mode behavior visible to callers or users.

### Compatibility and Migration

Compatibility requirements, rollout sequence, stored-data migration, expand–migrate–contract needs, and rollback conditions. Omit when irrelevant.

## Implementation Decisions

The adopted technical and architectural decisions, including prototype-derived decisions when applicable.

## Testing Decisions

- The external behavior to test.
- The highest agreed testing seam.
- Relevant prior art in the repository.
- Required targeted, integration, and live/manual verification.

## Out of Scope

Explicit exclusions for this spec.

## Open Questions

Unresolved questions and whether each blocks ticketing. Write `None` when there are no open questions.

## Further Notes

Any additional context that does not belong in an owning document.

</spec-template>
