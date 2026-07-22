# Run Report: WEB-015 API readiness and cold-start UX

## Scope

Render Free API가 idle sleep 뒤 다시 준비되는 동안에도 제품의 지원 범위와 지도 UI를
즉시 열고, `/ready`가 성공한 뒤에만 최신 분석·주변 점포·검색 요청을 시작한다.

## Behavior verified locally

```text
API not reachable:
- product workspace renders from the support catalog bootstrap
- analysis, nearby-store, and search requests do not start
- header shows an unavailable state and a retry action

API ready:
- /ready returns HTTP 200
- current market/category/radius requests start automatically
- header shows the official 2025 Q1 API result
- search becomes enabled
```

The production API intentionally rejects a localhost browser origin. Local
browser verification used a local API configured with the local development
origin; the public production origin remains limited to the Vercel URL.

## Automated checks

```text
API pytest: 119 passed
API Ruff: passed
Web Vitest: 32 files, 96 tests passed
Web typecheck: passed
Web lint: passed
Web production build: passed
Task Packet check: 69 packets passed
git diff --check: passed
```

## Public verification pending

- Deploy the exact commit to the Vercel production project.
- Open the clean product root URL directly.
- Confirm Render readiness and the subsequent real analysis, nearby-store, and
  search requests without a static analysis fallback.
