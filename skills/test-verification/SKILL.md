---
name: test-verification
description: Add or change a small feature with red-green TDD and repeatable regression checks. Use when Codex must write a failing test before implementation, verify the failure reason, make the smallest production change, run focused and full tests, or report evidence that a requirement works.
---

# Test Verification

## Workflow

1. Read the requirement, affected production code, existing tests, and test configuration.
2. State one observable behavior and its completion criterion.
3. Add the smallest test that proves that behavior.
4. Run only the new test and record the expected failure as red.
5. Confirm the failure is caused by the missing behavior, not a broken test or environment.
6. Change the minimum production code needed to satisfy the test.
7. Run the focused test again and record green.
8. Run the relevant test suite and build or verification scripts in proportion to risk.
9. Report the changed files, red evidence, green evidence, regression results, and anything not tested.

## Guardrails

- Do not change production code before observing red.
- Do not weaken assertions merely to obtain green.
- Test user-visible behavior or a stable public interface.
- Keep one TDD cycle focused on one behavior.
- Preserve unrelated user changes.
- Do not claim a test passed unless its command completed successfully.
- Distinguish Vitest tests, verification scripts, builds, and manual checks.
- Stop and fix the test setup when red is caused by configuration or syntax rather than the requirement.

## Project Commands

Select only the commands relevant to the change:

```text
npm run test:run -- <test-file>
npm run test:run
npm run test:analysis
npm run test:api
npm run test:supabase
npm run build
```

Do not run API or Supabase checks unless the required server and environment variables are available.

## Result Format

Report:

- Requirement and completion criterion
- Red command and expected failure
- Minimal implementation
- Green command and result
- Regression commands and results
- Changed files
- Untested or externally blocked checks
