# Task Packet: SCENE-008

## 1. Summary

```text
Task: Scene job UI, polling, and pipeline responsibility boundaries
Backlog ID: SCENE-008 / GitHub #70
Parent Epic: GitHub #63
Type: refactor
Owner: HyunKN
Status: done
```

## 2. Goal

Keep the Scene dialog focused on presentation while isolating API requests, polling cleanup, and server pipeline stages.

## 3. Scope

Included: Scene client, React hooks, pipeline stage helpers, regression coverage.

Excluded: public Scene activation, authentication, privacy-gate removal, and new 3DGS functionality.

## 4. Related Documents

```text
GitHub #70
GitHub #29
docs/development/architecture.md
```

## 5. Expected Changes

```text
web: sceneApi, useSceneToolchain, useSceneJob, SceneWorkspace
api: scene_pipeline stage orchestration
tests: polling cleanup and existing Scene pipeline regression
```

## 6. Acceptance Criteria

- [x] Polling cleanup is independently tested.
- [x] Scene UI does not call fetch directly.
- [x] Scene API client and hook responsibilities are separated.
- [x] Server block, stage execution, and export responsibilities are separated.
- [x] Product Scene routes remain disabled by default.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web test -- useSceneJob
uv run --project product/apps/api pytest product/apps/api/tests/test_scene_pipeline.py product/apps/api/tests/test_health.py
```

## 8. Documentation Updates

- [x] Task Packet and Run Report added.
- [x] GitHub Issue updated with commit and verification evidence.

## 9. Commit Plan

```text
refactor(scene): isolate scene job client and pipeline stages
```

## 10. Self-check

- [x] Existing API response contract is preserved.
- [x] Scene feature gate remains a 404 in the product environment.
- [x] No Scene implementation files are included in the static web artifact by this change.
