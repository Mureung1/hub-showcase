---
name: tdd-test-writing
description: Use when repeatedly writing small test-first specs for domain logic, adapters, state transition rules, validation, or bug fixes in the AIAgentChallenge hub project.
---

# TDD Test Writing

## Purpose

Convert one behavior requirement into a small RED test, a minimal GREEN implementation target, and a short refactor checklist.

## Do Not Use When

- The task is only visual polish with no testable rule.
- The user asked for analysis only.
- The change requires secrets, external accounts, package installation, deployment, commit, or push.
- The requested behavior is too broad to test in one file.

## Input

- Behavior name
- Target file or module
- Input values
- Expected result
- Reason
- Existing related tests

## Procedure

1. Write the spec table first.
2. Pick one smallest scenario.
3. Add a test that imports the intended API.
4. Add only a stub when needed so the test runs and fails by assertion, not by import error.
5. Run the narrow test and record the RED failure.
6. Implement the smallest code needed for GREEN.
7. Run the narrow test again.
8. Run the relevant broader tests and typecheck.
9. Note whether refactor is needed; skip refactor when the implementation is already simple.

## Output

- Spec scenario
- RED command and failure reason
- Changed files
- GREEN command and pass result
- Refactor note
- Remaining UI or integration work

## Project Defaults

Use these commands unless the task needs a narrower path:

```powershell
npm.cmd test -- src/domain/<target>.test.ts
npm.cmd test
npm.cmd run typecheck
```

For project rule changes, add:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-harness.ps1
```

## Good Targets

- Quest amount validation
- Stage unlock rules
- Stat delta mapping
- Interaction object resize rules
- Manager behavior intent normalization
- Weighted behavior selection
- Sound or blink policy

## Stop Conditions

- The test passes immediately.
- The test fails due to typo, import error, or broken setup.
- The implementation needs UI or server wiring beyond the approved target.
- Required verification cannot run.
