---
name: tdd-test-writing-reference
description: Repository copy for writing small TDD specs, RED tests, GREEN implementation targets, and refactor checklists in the AIAgentChallenge hub project.
---

# TDD Test Writing

This is the repository copy of `.agents/skills/tdd-test-writing/SKILL.md`.

Use it when a repeated test-first workflow is needed for small domain logic, adapter logic, validation, or state transition rules.

## Workflow

1. Write a one-row spec table: input, expected result, reason.
2. Add the smallest test first.
3. Add a stub only when needed to avoid import errors.
4. Run the narrow test and confirm RED by assertion.
5. Implement the smallest GREEN code.
6. Run the narrow test, then broader tests and typecheck.
7. Record refactor notes and remaining integration work.

## Default Commands

```powershell
npm.cmd test -- src/domain/<target>.test.ts
npm.cmd test
npm.cmd run typecheck
powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
```
