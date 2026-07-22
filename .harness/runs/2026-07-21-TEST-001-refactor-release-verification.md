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
Candidate: f2783d5884c6697b1b62e67b0930804f6bd6191a
Product Vercel URL (/): HTTP 200
Product Vercel English demo route (/en): HTTP 200; deployed bundle contains the English-demo marker
Render catalog endpoint: first request timed out during cold start; retry returned HTTP 200
Product Scene toolchain route: HTTP 404 (intentional product gate)
```

## Completion gate

WEB-018 no longer has a temporary `ProductWorkspace` structure budget, and the pushed candidate passed the public endpoint smoke. The product Scene route remains intentionally unavailable with HTTP 404 until its privacy, authorization, and quota gates are ready.
