# Run Report: SEC-002 privacy asset gate

## Security boundary

When the Scene API is explicitly enabled, a ready PLY must not be downloadable
until a trusted server-side review records both `approved` and `is_anonymized`.

## Validation

```text
Pending synthetic PLY job GET /api/v1/scenes/jobs/{id}/asset: HTTP 404
Approved anonymized synthetic PLY job GET /api/v1/scenes/jobs/{id}/asset: HTTP 200
Rejected job asset_url: null
```

```powershell
uv run --directory product/apps/api pytest tests/test_scene_pipeline.py tests/test_scene_asset_gate.py
uv run --directory product/apps/api ruff check .
```

## Result

`SceneJob` now stores review status, anonymization status, and review time. The
asset endpoint reads that server-side state before returning a file. The product
deployment keeps the whole Scene API disabled by default; SEC-001 B-stage user
authentication and reviewer identity remain separate work.
