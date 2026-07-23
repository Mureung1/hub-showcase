---
name: verify-result
description: Use after implementation to independently check diffs, project acceptance criteria, typecheck/build/test evidence, Wiki integrity, skill metadata, and documented completion rules.
---

# Verify Result

## Purpose

Verify that implementation satisfies the approved scope without weakening the acceptance criteria.

## Do Not Use When

- No implementation or document change has been completed yet.
- The user is asking for a plan before implementation; use `create-plan` instead.
- The task is adding or reorganizing Wiki content; use `wiki-ingest` or `wiki-lint` as appropriate.
- The verification requires credentials, external systems, or destructive actions that are not approved.

## Input

- Approved plan
- Changed file list
- Acceptance criteria
- Verification commands

## Preconditions

- Implementation step is complete.
- The verifier is independent from the implementer.

## Procedure

1. Inspect changed files and confirm they match the approved scope.
2. Check protected files were not modified.
3. Run or review the approved verification commands.
4. Confirm docs, skills, agents, and Wiki links are consistent.
5. Report pass/fail/needs-confirmation separately.

## Agent

- Use `verifier`.

## Tools

- `git status`
- `rg`
- `scripts/verify-harness.ps1`
- `npm.cmd run typecheck`
- `npm.cmd run build` when approved

## Output

- Passed checks
- Failed checks
- Evidence paths
- Reproduction steps
- Completion judgment

## Stop Conditions

- Required verification cannot run.
- Unapproved changes are discovered.
- Build/typecheck fails.
