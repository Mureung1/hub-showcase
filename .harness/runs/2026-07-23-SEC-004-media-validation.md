# SEC-004 Run Report — media content validation

## Boundary

This validation runs before the Scene worker. It is content-based rather than extension-based. OS-level container sandboxing remains part of `SEC-007`; this report does not claim that an API process is a low-privilege parser sandbox.

## Implemented checks

- JPEG, PNG, HEIC, MP4/MOV and MKV signatures must match the filename type.
- Video input runs `ffprobe` with `shell=False` and a 10-second timeout.
- Gaussian PLY requires binary little-endian format, a bounded vertex count, required Gaussian properties, and enough payload for its declared vertices.
- Any validation failure removes the incomplete job directory and returns `422` from the API.

## Verification

```text
pytest tests/test_scene_pipeline.py tests/test_scene_asset_gate.py \
  tests/test_scene_resource_limits.py tests/test_scene_content_validation.py
22 passed

scripts/check.ps1
Task packet check, web tests, API tests, typecheck, lint and production build passed.
```
