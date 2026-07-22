# Run Report: REFACTOR-001 completion audit

## Scope

This audit checks whether the refactoring Epic can be closed without changing
product behavior. It covers the automated quality gate, deployed endpoints,
and the manual product entry and search flow.

## Automated checks

```text
powershell -ExecutionPolicy Bypass -File scripts/check.ps1: passed
Web Vitest: 29 files, 86 tests passed
API pytest: 119 passed
Web typecheck, lint, production build: passed
Web/API formatting: passed
Task Packet check: 69 packets passed
Code structure: passed (0 temporary Web budgets)
git diff --check: passed
```

## Deployed endpoint smoke

```text
https://localtwin-product.vercel.app/: HTTP 200
https://localtwin-product.vercel.app/en: HTTP 200
https://localtwin-api.onrender.com/api/v1/catalog: HTTP 200
https://localtwin-api.onrender.com/api/v1/scenes/toolchain: HTTP 404
```

The Scene route result is expected: the product environment deliberately keeps
the Scene toolchain route blocked until privacy, authorization, and quota gates
are complete.

## Product URL behavior

```text
Entry URL: https://localtwin-product.vercel.app/
Default market, category, and radius are allowed as in-memory product defaults.
The root URL must remain clean while those defaults and ordinary filter changes are used.
Legacy analysis query URLs are read once, then replaced with the clean product path.
```

The previous audit incorrectly treated the default Yeonnam, cafe, and 300 m
selection as a neutral-entry failure. The actual product requirement is that
ordinary interaction must not serialize the full analysis state into the browser
address bar. The deployed root URL was clean. Local regression tests now cover
search-result and radius changes while keeping `window.location.search` empty.
Public verification after deployment is still required.

## Completion checklist

- [x] All child Issues #62, #64 through #71 are closed.
- [x] Runtime demo data is explicitly separated from the product API flow.
- [x] Web/API/Data/Scene responsibility boundaries pass the structure checks.
- [x] Automated checks and deployed endpoint smoke pass.
- [x] Default product state can render while the root URL remains clean.
- [x] Search-result and radius changes keep the product URL clean in regression tests.
- [ ] Search, selection, map, analysis, and evidence pass as one manual flow on the deployed candidate.
- [ ] Mobile panels and keyboard dialogs are manually verified.
- [ ] GitHub #63 acceptance checklist and REFACTOR-001 status are reconciled after the open manual items pass.
