---
name: to-tickets
description: Break a local spec, plan, or conversation into one local Markdown implementation ticket per tracer-bullet slice, with explicit blocking edges and fresh-context sizing. Publish to GitHub only when explicitly requested.
disable-model-invocation: true
---

# To Tickets

Break an approved plan or implementation-ready spec into **tickets**: tracer-bullet vertical slices, each small enough for one fresh agent context and explicit about what blocks it.

This repository uses local Markdown by default. Do not create GitHub Issues or PRs unless the user explicitly asks for GitHub publication and confirms the target repository or request surface.

Write generated ticket content in Korean. Preserve established domain terms, protocol names, package names, file paths, and code identifiers in their original form.

## Process

### 1. Gather context and enforce the execution gate

Read `AGENTS.md`, `docs/README.md`, `docs/agents/issue-tracker.md`, and the source artifact in full.

Resolve the source reference exactly as `docs/agents/issue-tracker.md` defines; do not reinterpret a local path, URL, or bare number with a different tracker convention.

The source must be implementation-ready before ticket files can be created:

- A local spec must have `State: ready-for-ticketing`.
- A plan or conversation must contain no unresolved implementation-blocking question. Its proposed graph still requires the explicit approval in step 4 before publication.
- A `draft` spec or any source with a blocking open question must stop here. Route back to `/to-spec`, `/grill-with-docs`, `/wayfinder`, or the user; do not create executable or placeholder implementation tickets.

Read the relevant owning documents, ADRs, linked Wayfinder decisions, and prototype verdicts instead of copying their detail into every ticket.

### 2. Explore the codebase

Inspect the live code and tests when they are not already understood. Use the project's domain vocabulary and respect the current architecture decisions.

Look for prefactoring that makes the change easy. A prefactor ticket must still leave the repository green and must be genuinely required by later slices.

### 3. Draft tracer-bullet slices

Each normal ticket must:

- deliver a narrow but complete end-to-end behavior across the layers it touches,
- be demoable or independently verifiable,
- fit in one fresh context window,
- expose its external result rather than list horizontal layer work,
- declare only blockers that truly gate starting it.

A ticket with no blockers is on the initial **frontier**.

**Wide refactors are the exception.** When one mechanical change has a blast radius too broad for a green vertical slice, use expand–migrate–contract:

1. expand by adding the new form beside the old,
2. migrate callers in independently green batches sized by package or directory,
3. contract by removing the old form after every migration ticket completes.

If migration batches cannot remain green independently, use the already selected current `codex/...` working branch as the shared migration branch; do not create another branch layer. Mark the affected tickets as one integration sequence, let them all block a final integrate-and-verify ticket, and state that repository-wide PR-ready checks are promised only by that final ticket.

### 4. Review the graph with the user

Present the proposed tickets as a numbered list. For each ticket show:

- **Title**
- **What it delivers**
- **Blocked by**
- **Spec traceability**

Ask whether the granularity and blocking edges are correct and whether any ticket should be split or merged. Iterate until approved.

Approval in this step is required before publishing. It does not override the readiness gate from step 1.

### 5. Publish local ticket files

Write one file per approved ticket, in dependency order (blockers first):

```text
docs/issues/<spec-slug>/001-<ticket-slug>.md
docs/issues/<spec-slug>/002-<ticket-slug>.md
```

When there is no obvious spec slug, use `docs/issues/YYYY-MM-DD-<short-plan-slug>/`.

Never combine tickets into one file. Use exact relative paths and titles for local blocking references, not bare numbers alone. Do not modify or close the parent spec.

After writing, report:

- every created path,
- the initial frontier,
- the exact `/implement <ticket-path>` command for the first ticket.

<local-ticket-template>

# <NNN> — <Ticket title>

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

The exact local spec path, when one exists.

## What It Delivers

The end-to-end user- or caller-visible behavior this slice makes work. Avoid a layer-by-layer implementation list.

## Spec Traceability

- User stories: <numbers or `Not applicable`>
- Implementation contract: <relevant subsection names>

## Slice-Specific Constraints

Contracts, edge cases, compatibility rules, integration-sequence rules, and decisions that apply specifically to this slice.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Verification

- Targeted test or command:
- Repository checks:
- Manual or live smoke:

## Blocked By

- `<relative-path>` — <ticket title>

Or `None — can start immediately`.

## Starting Points

Current modules, packages, tests, or files worth inspecting first. These are non-normative hints and must be revalidated against the live code at implementation time.

</local-ticket-template>

Avoid implementation snippets and prescriptive file plans that will age quickly. A compact prototype-derived state machine, reducer, schema, or type shape may be included when it is itself an adopted contract.

Work the frontier one ticket at a time with `/implement`, clearing context between tickets.
