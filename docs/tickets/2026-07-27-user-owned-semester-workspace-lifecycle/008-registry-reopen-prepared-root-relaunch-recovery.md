# 008 — Registry reopen·prepared-root relaunch·recovery

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

AY-PLE 재시작은 registry의 active SemesterWorkspace를 fresh 검증해 같은 Git root에서 새 Runtime으로 다시 연다. 다른 학기는 App 밖에서 Bootstrap한 뒤 old process를 종료하고 explicit `--workspace`로 relaunch하며, missing workspace, incompatible registry, failed switch와 Runtime failure는 기존 pointer와 user bytes를 보존하는 honest recovery로 수렴한다.

## Spec Traceability

- User stories: 2, 4, 5
- Implementation contract: Startup selection과 public lifecycle, Data and State Flow, Failure Behaviour

## Slice-Specific Constraints

- Startup과 reopen은 registry entry의 canonical root에서 root v4 identity를 fresh read한다. Missing, moved, reused와 identity mismatch면 Workspace Runtime을 시작하지 않는다.
- Missing registry 또는 null active pointer는 explicit prepared root 없이 `prepared_workspace_required`다. Malformed/future bytes는 original bytes를 보존한 `registry_incompatible`이며 empty fallback이나 reset을 하지 않는다.
- Valid active pointer의 no-argument relaunch는 W-007 readiness sequence로 fresh Runtime·thread를 만든다. Process 간 Runtime, thread, Interaction generation과 transcript를 재사용하지 않는다.
- 학기 변경은 old App process와 Runtime을 먼저 종료하고 pre-App Bootstrap이 끝난 새 root를 explicit `--workspace`로 relaunch한다. App 내부 chooser, candidate, hot switch, Runtime cwd mutation과 cross-workspace thread resume은 없다.
- Explicit relaunch의 root validation·Runtime·MCP readiness·registry commit 중 어느 단계가 실패해도 previous active pointer를 보존한다. 이후 no-argument relaunch는 이전 학기를 다시 열 수 있다.
- Missing/moved/reused/mismatched active root는 `workspace_unavailable`, valid root의 Runtime·Interaction failure는 `runtime_unavailable` 또는 equivalent safe recovery로 구분한다. First open에는 false active reference를 만들지 않는다.
- Active 이후 Runtime terminal 또는 required MCP continuity loss는 new Chat admission을 닫고 pending Interaction을 settle하며 Browser에 honest recovery를 투영한다. Automatic hidden restart나 degraded normal Chat은 없다.
- Browser에는 safe active summary와 recovery reason만 보내며 absolute path, registry known list, token·binding과 native process detail을 보내지 않는다.
- Desktop UI는 `starting | active | recovery_required`만 표시한다. Bootstrap progress, candidate controls, in-App activate/restart/change button과 one-click recent workspace switch는 포함하지 않는다.

## Acceptance Criteria

- [ ] App restart가 valid registry와 v4 identity를 사용해 same workspace의 fresh Runtime·thread를 열고 active lifecycle을 복구한다.
- [ ] Missing/moved/reused/mismatched root가 no Runtime start와 `workspace_unavailable` recovery로 수렴하며 path를 노출하지 않는다.
- [ ] Malformed/future registry가 byte-for-byte 보존되고 reset 또는 empty fallback 없이 `registry_incompatible`로 표시된다.
- [ ] No-root/null-pointer startup이 `prepared_workspace_required`이고 Browser chooser나 hub Runtime을 만들지 않는다.
- [ ] Prepared-root relaunch 실패가 previous registry pointer를 보존하며 뒤이은 no-argument relaunch가 previous workspace를 정상 reopen한다.
- [ ] Reopen과 relaunch 뒤 native thread cwd, Skill, MCP credential과 transcript가 previous process 또는 다른 workspace에서 교차하지 않는다.
- [ ] Active Runtime terminal과 required MCP loss가 new Turn admission을 닫고 bounded settlement 뒤 honest recovery로 수렴한다.
- [ ] Browser E2E가 starting, active, workspace unavailable, runtime unavailable, registry incompatible와 failed-switch recovery를 desktop width에서 검증하고 candidate/change controls가 없음을 확인한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/server`
  - `npm test -w @ay-ple/chat-shell`
  - `npm run test:e2e -w @ay-ple/chat-shell`
  - Registry reopen, failed prepared-root relaunch와 cross-workspace deterministic Runtime focused tests
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - 두 temporary prepared Git SemesterWorkspace에서 explicit first open→no-argument reopen→failed explicit relaunch→previous-root reopen→successful relaunch를 수행하고 registry, process tree, exact cwd와 UI recovery를 확인한다.

## Blocked By

- `007-required-prepared-workspace-startup.md` — Required prepared-workspace startup

## Starting Points

- `apps/server/src/product-development.ts`
- `apps/server/src/server-application.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/server-process-lifecycle.ts`
- `apps/server/src/workspace-registry.ts`
- `apps/server/src/workspace-registry.test.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/e2e/workspace-recovery.spec.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `scripts/test-product-entrypoint.mts`
