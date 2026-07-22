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

## Regression coverage

- `MarketSearch` remains disabled until the API readiness signal is `ready`.
- Nearby-store requests do not start before that signal, then use the active
  selection once it is ready.

## Public verification

2026-07-22 KST에 `develop`의 `1425de6`까지 포함한 Vercel production 배포를
수동으로 수행했다. Alias는 `https://localtwin-product.vercel.app`이다.

- root URL HTTP 200, 브라우저 주소는 query 없이 `/`로 유지
- Render `/ready` HTTP 200, catalog HTTP 200
- 두 API 응답의 CORS origin은 Vercel production URL로 제한됨
- 브라우저에서 `서울 상권분석 2025년 1분기 API 결과입니다.` 문구 확인
- 초기 실제 분석 요청 뒤 주변 점포가 `33개`로 갱신되고 오류 문구 없음

Render가 실제로 sleep한 cold-start 상황은 이번 공개 검증 시점에 재현하지
않았다. 그 대기 상태와 retry 전환은 unit test로 검증했으며, 실제 sleep 뒤
동작은 다음 장시간 idle 검증에서 별도로 확인한다.
