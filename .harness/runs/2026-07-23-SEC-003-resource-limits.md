# SEC-003 Run Report — Scene resource limits

## Boundary

Scene API is still disabled in the product by default. This change protects the API when it is deliberately enabled for a trusted test environment. It does not claim user-specific quota before `SEC-001 B` provides an authenticated owner identity.

## Implemented limits

- `SCENE_UPLOAD_MAX_BYTES`: upload body written by the API; overflow returns `413` and removes the partial job directory.
- `SCENE_STORAGE_QUOTA_BYTES`, rate window, creation count and active-job count: service-level admission limits returning `429`.
- `SCENE_WORKER_CONCURRENCY`: process-local worker execution gate; a duplicate/capacity run becomes a blocked job.
- retry cooldown and terminal-job cleanup helper.

## Verification

```text
pytest tests/test_scene_pipeline.py tests/test_scene_asset_gate.py tests/test_scene_resource_limits.py
17 passed

scripts/check.ps1
Task packet check, web tests, API tests, typecheck, lint and production build passed.
```

## Follow-up boundary

After `SEC-001 B`, replace the anonymous shared counters with durable `owner_id`-scoped quota. Configure an upstream reverse-proxy request-body limit as part of the production runtime deployment.
