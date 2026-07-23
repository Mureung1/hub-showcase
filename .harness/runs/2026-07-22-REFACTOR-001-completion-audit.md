# Run Report: REFACTOR-001 completion audit

## Scope

This audit checks whether the refactoring Epic can be closed without changing
product behavior. It covers the automated quality gate, deployed endpoints,
and the manual product entry and search flow.

## Automated checks

```text
powershell -ExecutionPolicy Bypass -File scripts/check.ps1: passed
Web Vitest: 32 files, 98 tests passed
API pytest: 119 passed
Web typecheck, lint, production build: passed
Web/API formatting: passed
Task Packet check: 71 packets passed
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
Public verification completed after deployment: the root URL stayed clean through
search-result selection and the 300 m radius state remained in memory.

## Completion checklist

- [x] All child Issues #62, #64 through #71 are closed.
- [x] Runtime demo data is explicitly separated from the product API flow.
- [x] Web/API/Data/Scene responsibility boundaries pass the structure checks.
- [x] Automated checks and deployed endpoint smoke pass.
- [x] Default product state can render while the root URL remains clean.
- [x] Search-result and radius changes keep the product URL clean in regression tests.
- [x] Search, selection, map, analysis, and evidence pass as one manual flow on the deployed candidate.
- [x] Mobile panels and keyboard dialogs are manually verified.
- [x] GitHub #63 acceptance checklist and REFACTOR-001 status are reconciled after the open manual items pass.

## Public manual verification (2026-07-23)

```text
Desktop root: https://localtwin-product.vercel.app/
Search: "홍대" -> select "홍대입구역(홍대)" -> map and analysis updated
Evidence: dialog opened and Escape closed it; browser console errors: 0
Mobile (390 x 844): analysis conditions and analysis results each opened and closed;
browser console errors: 0
```

The Korean product route now captures the Scene trigger through the workspace
panel ref before the lazy dialog mounts, then restores focus after the dialog
unmounts. The `/en` demo keeps its previous Scene focus behavior. The regression
test waits for the dialog close button before pressing Escape and verifies that
the trigger regains focus.
