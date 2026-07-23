---
name: execute-plan
description: Use only after a file-level plan is approved for the AIAgentChallenge hub. Executes one small step at a time and avoids unrelated refactors, package installs, commits, pushes, merges, or deployments.
---

# Execute Plan

## Purpose

Implement one approved plan step with minimal changes.

## Do Not Use When

- The implementation scope is not explicitly approved.
- The task is only analysis, planning, or answering a question.
- The requested change would touch files outside the approved file scope.
- The next required action is independent verification; use `verify-result` instead.

## Input

- Approved plan
- File scope
- Acceptance criteria

## Preconditions

- User has approved the implementation scope.
- Current git status has been checked.
- Existing user changes are understood and preserved.

## Procedure

1. Re-read the approved step.
2. Inspect target files before editing.
3. Make the smallest change that satisfies the step.
4. Run the narrowest relevant verification.
5. Record failures immediately.
6. Stop for verifier review when the step is complete.

## Agent

- Use `implementer`.
- Use `verifier` after implementation.

## Tools

- `apply_patch` for manual edits
- repository scripts
- npm scripts only when verification is requested or approved

## Output

- Changed files
- Reason for each change
- Verification command and result
- Remaining risks

## Stop Conditions

- The step needs a package install, external credential, MCP setup, or unapproved file scope.
- Verification fails and the cause is outside the approved step.
