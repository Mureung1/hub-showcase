---
name: test-code-generator
description: React + Vitest + Testing Library 환경에서 구현 전 테스트 대상을 정리하고, 정상 흐름과 실패 흐름을 테스트 시나리오로 만든 뒤 실패 테스트부터 작성하도록 안내할 때 사용하는 테스트코드 생성 Skill입니다.
---

# test-code-generator

Use this skill when a feature should be implemented with a small TDD loop in a React + Vite project.

## Goal
Guide the developer to:
1. Pick the smallest useful behavior to test before implementation.
2. Write normal, failure, and exception-flow scenarios.
3. Create a failing test first.
4. Implement only enough code to pass the test.
5. Refactor after the test passes.
6. Re-run the relevant tests and then the broader test suite.

## Files To Inspect First
- `package.json`: confirm `test` script and test dependencies.
- `vite.config.js`: confirm Vitest `jsdom` setup.
- `src/test/setup.js`: confirm Testing Library matcher setup.
- Target component or module file, for example `src/components/ProjectIntro.jsx`.
- Existing nearby test files, for example `*.test.jsx` or `*.test.js`.
- API contract files when the feature calls the server, for example `server/index.js` or helper modules.

## Test Writing Order
1. Restate the feature in one sentence.
2. Choose one small behavior that proves the feature works.
3. Decide what must be mocked, such as `fetch`, `localStorage`, timers, or browser APIs.
4. Write the first test so it fails before implementation.
5. Run only the new or relevant test file.
6. Implement the smallest code change needed to pass.
7. Add failure or exception-flow tests.
8. Re-run the focused tests.
9. Refactor only when the behavior is protected by tests.
10. Run the full test command and build command if the change affects runtime code.

## Test Case Checklist
Classify each candidate as `필수`, `후속`, or `제외`.

- Normal flow: the expected user action or function call succeeds.
- Failure flow: the server returns a 400, 404, or 500 response.
- Exception flow: `fetch` rejects, JSON is malformed, or browser storage is unavailable.
- State update: React state changes are visible through the rendered screen.
- API request: URL, method, headers, and request body match the API contract.
- Persistence: `localStorage` reads, writes, and cleanup happen at the right time.
- User message: success, loading, and error messages are visible when expected.
- Regression guard: existing navigation and unrelated UI still work when relevant.

## Commands
Use the repository scripts when available:

```bash
npm.cmd test -- --run path/to/file.test.jsx
npm.cmd test -- --run
npm.cmd run build
```

If PowerShell blocks `npm`, use `npm.cmd`.

## When A Test Fails
Check:
- The test is asserting user-visible behavior instead of implementation details.
- Async UI updates use `findBy*` or `waitFor`.
- `fetch`, `localStorage`, and other browser APIs are reset between tests.
- Mock responses match the real API shape.
- The component is rendered with the same props and providers used in the app.
- The failure is from the new behavior, not from unrelated setup or stale mocks.

## Output
Produce:
1. A short feature summary.
2. The selected first failing test target.
3. A scenario list grouped by normal, failure, and exception flow.
4. Files to create or edit.
5. Commands to run.
6. Test results, including the initial failing result when available.
7. Implementation notes and remaining manual checks.
