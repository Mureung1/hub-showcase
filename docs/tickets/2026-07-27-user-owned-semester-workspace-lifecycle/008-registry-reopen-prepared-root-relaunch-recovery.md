# 008 — Registry reopen·prepared-root relaunch·recovery

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

AY-PLE 재시작은 registry의 active SemesterWorkspace를 fresh 검증해 같은 Git root에서 새 Runtime으로 다시 연다. 다른 학기는 App 밖에서 Bootstrap한 뒤 old process를 종료하고 explicit `--workspace`로 relaunch하며, missing workspace, incompatible registry, failed switch와 Runtime failure는 기존 pointer와 user bytes를 보존하는 honest recovery로 수렴한다.

## Spec Traceability

- User stories: 2, 4, 5
- Implementation contract: Startup selection과 public lifecycle, Data and State Flow, Failure Behaviour

## 완료 당시 Slice-Specific Constraints

- Startup과 reopen은 registry entry의 canonical root에서 root v4 identity를 fresh read한다. Missing, moved, reused와 identity mismatch면 Workspace Runtime을 시작하지 않는다.
- Missing registry 또는 null active pointer는 explicit prepared root 없이 `prepared_workspace_required`다. Malformed/future bytes는 original bytes를 보존한 `registry_incompatible`이며 empty fallback이나 reset을 하지 않는다.
- Valid active pointer의 no-argument relaunch는 W-007 readiness sequence로 fresh Runtime·thread를 만든다. Process 간 Runtime, thread, Interaction generation과 transcript를 재사용하지 않는다.
- 학기 변경은 old App process와 Runtime을 먼저 종료하고 pre-App Bootstrap이 끝난 새 root를 explicit `--workspace`로 relaunch한다. App 내부 chooser, candidate, hot switch, Runtime cwd mutation과 cross-workspace thread resume은 없다.
- Explicit relaunch의 root validation·Runtime·MCP readiness·registry commit 중 어느 단계가 실패해도 previous active pointer를 보존한다. 이후 no-argument relaunch는 이전 학기를 다시 열 수 있다.
- Missing/moved/reused/mismatched active root는 `workspace_unavailable`, valid root의 Runtime·Interaction failure는 `runtime_unavailable` 또는 equivalent safe recovery로 구분한다. First open에는 false active reference를 만들지 않는다.
- Active 이후 Runtime terminal 또는 required MCP continuity loss는 new Chat admission을 닫고 pending Interaction을 settle하며 Browser에 honest recovery를 투영한다. Automatic hidden restart나 degraded normal Chat은 없다.
- Browser에는 safe active summary와 recovery reason만 보내며 absolute path, registry known list, token·binding과 native process detail을 보내지 않는다.
- Desktop UI는 `starting | active | recovery_required`만 표시한다. Bootstrap progress, candidate controls, in-App activate/restart/change button과 one-click recent workspace switch는 포함하지 않는다.

## 완료 당시 Acceptance Criteria

- [x] App restart가 valid registry와 v4 identity를 사용해 same workspace의 fresh Runtime·thread를 열고 active lifecycle을 복구한다.
- [x] Missing/moved/reused/mismatched root가 no Runtime start와 `workspace_unavailable` recovery로 수렴하며 path를 노출하지 않는다.
- [x] Malformed/future registry가 byte-for-byte 보존되고 reset 또는 empty fallback 없이 `registry_incompatible`로 표시된다.
- [x] No-root/null-pointer startup이 `prepared_workspace_required`이고 Browser chooser나 hub Runtime을 만들지 않는다.
- [x] Prepared-root relaunch 실패가 previous registry pointer를 보존하며 뒤이은 no-argument relaunch가 previous workspace를 정상 reopen한다.
- [x] Reopen과 relaunch 뒤 native thread cwd, Skill, MCP credential과 transcript가 previous process 또는 다른 workspace에서 교차하지 않는다.
- [x] Active Runtime terminal과 required MCP loss가 new Turn admission을 닫고 bounded settlement 뒤 honest recovery로 수렴한다.
- [x] Browser E2E가 starting, active, workspace unavailable, runtime unavailable, registry incompatible와 failed-switch recovery를 desktop width에서 검증하고 candidate/change controls가 없음을 확인한다.

## 완료 당시 Verification

- Targeted test or command:
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/prepared-workspace-startup.test.ts` — registry reopen, fresh generation, failed explicit relaunch, previous-root recovery, terminal·Adapter loss를 포함한 24개 test green
  - `npm test -w @ay-ple/server` — 194개 test green
  - `npm test -w @ay-ple/product-contract` — 21개 test green
  - `npm test -w @ay-ple/chat-shell` — 47개 test green
  - `npm run test:e2e -w @ay-ple/chat-shell` — 35개 Chromium desktop test green
- Repository checks:
  - `npm test` — green
  - `npm run typecheck` — green
  - `npm run build` — green
  - `npm run lint -w @ay-ple/chat-shell` — green
  - `npm run check:docs-links` — active 28개와 historical banner 2개 green
  - `git diff --check` — green
- Manual or live smoke:
  - `npm run test:runtime-local-provider` — exact local provider bridge와 prepared Git root trust를 사용하는 4개 actual test green
  - Chromium E2E에서 두 temporary prepared Git SemesterWorkspace를 실제 shared listener와 deterministic Runtime/Broker에 연결해 explicit first open → no-argument reopen → failed explicit relaunch → previous-root reopen → successful relaunch를 실행했다. Registry와 user file bytes, fresh thread·credential, exact Git root, 1440px·1920px UI와 path-free recovery를 함께 확인했다.
  - `/code-review 618e0adba996d777b78e054a73945b06b02e691e`의 Standards와 Spec 축 모두 final finding 0개였다.

## 완료 당시 Result

`PreparedWorkspaceStartupCoordinator`는 no-argument launch마다 registry active pointer와 v4 root identity를 fresh 검증하고 새 Runtime·thread·Interaction generation을 만든다. Explicit prepared-root relaunch가 root, Runtime, MCP readiness 또는 registry transaction에서 실패하면 prior registry authority와 user-owned bytes를 그대로 보존하므로 다음 no-argument process가 previous SemesterWorkspace를 정상 reopen한다. Registered root 불일치와 Runtime continuity loss는 각각 path-free `workspace_unavailable`과 `runtime_unavailable` lifecycle로 구분된다.

Target `WorkspaceLifecycleView`는 `starting | active | recovery_required`의 safe projection만 표시하며 candidate, chooser, restart 또는 change control을 제공하지 않는다. 실제 public App composition 전환은 downstream joint cutover가 소유하지만, W-008 Browser harness는 Vite → shared listener → prepared startup seam을 통과해 relaunch와 failed-switch recovery를 검증한다. 주요 구현 commit은 `a8c78e611`, `a0f121ada`, `731b68279`, `e08a710db`, `40707ddb3`이다.

## 검토 후 정정 (현재 결과)

Registry reopen·failed-switch recovery와 user-owned bytes 보존 결과는 유지된다. 다만 current relaunch gate는 Runtime의 MCP status/readiness port가 아니라 full effective project declaration과 actual Adapter의 Broker lifecycle channel을 사용한다. No-argument reopen과 explicit relaunch는 매 process마다 fresh Runtime·Broker credential·Adapter lifecycle·native thread를 만들고, readiness를 통과한 그 thread를 Product Turn에도 재사용한다. Process나 workspace 사이에서 status channel, thread와 transcript를 재사용하지 않는다.

Explicit target의 root validation, thread start, declaration validation, Adapter lifecycle readiness, fresh context 또는 registry transaction 중 하나라도 실패하면 previous pointer를 보존한다. Registry final acceptance 직전 lifecycle loss도 Broker의 synchronous `isLost()`가 거절한다. Active 뒤 unexpected lifecycle EOF는 새 Turn admission을 닫고 pending Interaction을 `transport_failed`로 정산한 다음 listener-backed `runtime_unavailable` recovery로 수렴하며 automatic hidden restart나 degraded Chat을 열지 않는다. 위 commit·검증 수치는 기존 reopen/CAS와 Browser recovery evidence로 보존하고 current lifecycle tests가 교정된 Adapter authority를 추가로 검증한다.

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
