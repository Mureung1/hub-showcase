# Run Report: SCENE-008 scene boundaries

## Result

- `SceneWorkspace` now renders data and delegates toolchain loading, job creation, retry, and polling to focused hooks.
- A single Scene API client owns endpoint and response handling.
- The server pipeline separates blocked-worker handling, command-stage execution, and export finalization.

## Verification

```text
Web typecheck: passed
useSceneJob polling cleanup test: 1 passed
Scene pipeline and feature-gate API tests: 18 passed
Ruff: passed
```

## Safety boundary

`SCENE_API_ENABLED=false` still produces 404 responses for Scene routes in the product configuration. This refactor does not make Scene upload or assets public.
