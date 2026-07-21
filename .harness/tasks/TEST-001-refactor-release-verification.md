# Task Packet: TEST-001

## 1. Summary

```text
Task: Full refactor regression and release verification
Backlog ID: TEST-001 / GitHub #71
Parent Epic: GitHub #63
Type: verification
Owner: HyunKN
Status: in_progress
```

## 2. Goal

Verify the committed refactor release candidate without mixing in unrelated uncommitted work.

## 3. Scope

Included: web and API checks, architecture checks, product and API smoke endpoints.

Excluded: uncommitted English-demo work and public Scene activation.

## 4. Related Documents

```text
GitHub #63
GitHub #65
GitHub #70
GitHub #71
```

## 5. Expected Changes

```text
verification evidence only
```

## 6. Acceptance Criteria

- [ ] Clean release candidate passes full automated checks.
- [ ] Product and API public endpoints respond successfully.
- [ ] Scene routes remain 404 in the product configuration.
- [ ] Run Report and issue evidence are recorded.

## 7. Verification Plan

```powershell
pnpm --dir product/apps/web test
pnpm --dir product/apps/web typecheck
pnpm --dir product/apps/web lint
pnpm --dir product/apps/web build
uv run --project product/apps/api pytest product/apps/api/tests
uv run --project product/apps/api ruff check product/apps/api/src product/apps/api/tests
python scripts/check_code_structure.py
python scripts/check_task_packet.py
```

## 8. Documentation Updates

- [ ] Record results after verification.

## 9. Commit Plan

```text
test: record refactor release verification
```

## 10. Self-check

- [ ] Do not claim validation for uncommitted work.
- [ ] Keep product Scene gate disabled.
