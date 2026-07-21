# Run Report: TEST-001 refactor release verification

## Release candidate

Validation was repeated in the integrated local candidate after WEB-018 removed the remaining `ProductWorkspace` budget. The candidate includes the explicit English demo path without replacing the default Korean product API flow.

## Automated checks

```text
Web Vitest: 29 files, 86 tests passed
Web typecheck: passed
Web lint: passed
Web production build: passed
API pytest: 119 passed
API Ruff: passed
Code structure: passed (0 temporary Web budgets)
Task Packet check: 69 packets passed
```

## Public smoke

```text
Product Vercel URL: HTTP 200
Render catalog endpoint: HTTP 200 on retry after a cold-start timeout
Product Scene toolchain route: HTTP 404
```

## Completion gate

WEB-018 no longer has a temporary `ProductWorkspace` structure budget. Public endpoint smoke is repeated after the candidate is pushed and deployed; the product Scene route remains intentionally unavailable with HTTP 404 until its privacy, authorization, and quota gates are ready.
