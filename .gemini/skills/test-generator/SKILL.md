---
name: test-generator
description: Provides standard guidelines and procedures for writing automated tests (Unit & Integration) in a Node.js/Express environment using Jest. Activate this skill when creating, modifying, or reviewing test cases to ensure they adhere to project standards.
---

# Test Generator Skill: Node.js (Jest)

This skill provides the standard procedures and patterns for writing robust tests in our Node.js (Express) codebase. Follow these instructions strictly when generating tests.

## 1. Testing Framework & Setup
- **Framework:** Jest (`jest`, `supertest` for API testing)
- **Directory Structure:** Tests should be placed in a `__tests__` folder adjacent to the file being tested or in the root `tests/` directory. Use the `.test.js` extension.

## 2. Mocking Guidelines
Always mock external dependencies to keep unit tests isolated, fast, and deterministic.

### Network Requests (Axios)
Do not make actual network requests in tests. Use Jest to mock `axios`.
```javascript
jest.mock('axios');
const axios = require('axios');

// Success case
axios.post.mockResolvedValue({ data: { success: true, ...mockData } });
// Failure case
axios.post.mockRejectedValue(new Error('Network error'));
```

### File System & Database
- Mock `fs` or database models (e.g., Mongoose models) unless running an explicitly configured integration test with an in-memory DB.
- Use `jest.spyOn()` to mock object methods when necessary and remember to `mockRestore()` in `afterEach()`.

## 3. Test Structure & Naming
Use the `describe` and `it` block pattern. Titles should clearly state what is being tested and the expected outcome.
```javascript
describe('API: POST /api/schedule/sync/everytime', () => {
  it('should return 400 if everytimeUrl is missing', async () => { ... });
  it('should return successfully parsed free slots given a valid URL', async () => { ... });
});
```

## 4. Test Coverage Requirements
Every test suite must cover:
1. **Happy Path:** The primary success scenario with typical inputs.
2. **Missing/Invalid Inputs:** What happens when required parameters are omitted or malformed.
3. **External Failures:** How the code handles failures from external APIs or databases (e.g., 500 error from an upstream service).
4. **Edge Cases:** Boundary conditions (e.g., empty arrays, zero values).

## 5. Execution
After writing the tests, ensure they are placed correctly and run the test suite using `npm test` or `npx jest <filename>`. If errors occur, analyze the output and fix either the test or the underlying code.
