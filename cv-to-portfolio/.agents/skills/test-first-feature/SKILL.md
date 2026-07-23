---
name: test-first-feature
description: Implement and verify one small application feature with a strict Red-Green-Refactor cycle. Use when adding or changing behavior that can be expressed as unit or integration tests, when practicing TDD, or when a repeatable test-first development record is required.
---

# Test First Feature

Implement the smallest observable behavior first. Preserve evidence that the test failed for the
expected reason before changing production code.

## Workflow

1. Read the requirement, nearby production code, and existing test conventions.
2. Define one behavior as Given-When-Then and list the files expected to change.
3. Write the smallest focused test without editing production code.
4. Run the narrowest test command and confirm **Red**:
   - failure must describe the missing behavior;
   - fix test setup errors before continuing;
   - record the command and relevant failure.
5. Add only enough production code to satisfy the test.
6. Run the same command and confirm **Green**.
7. Add an integration test when the behavior crosses a boundary such as HTTP, database mapping,
   filesystem, or component-to-API communication.
8. Refactor only while tests remain green. Do not weaken assertions to obtain Green.
9. Run the full test suite, lint, and build commands available in the repository.
10. Report requirement-to-test evidence, commands, results, remaining gaps, and manual checks.

## Test selection

- Prefer a unit test for validation, mapping, state transformation, or query construction.
- Prefer an integration test for a route, controller-service boundary, persistence adapter, or
  frontend API client.
- Stub only the boundary outside the behavior being tested. Do not use a live production database
  for routine unit tests.
- Add a regression assertion for invalid input or failure behavior when it materially protects the
  feature.

## Integrity rules

- Do not edit production code before observing Red.
- Do not make unrelated cleanup part of the Green step.
- Do not replace meaningful assertions with snapshots or broad truthiness checks.
- Distinguish a real behavior failure from dependency, permission, or environment failures.
- Keep secrets and user data out of test fixtures and logs.

## Completion format

Return a concise record with:

- behavior and acceptance criteria;
- Red command and expected failure;
- Green implementation and passing focused tests;
- integration and full-suite results;
- refactor performed, if any;
- unresolved risks or untested boundaries.
