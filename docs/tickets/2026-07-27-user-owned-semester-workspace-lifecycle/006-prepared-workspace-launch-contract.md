# 006 — Prepared workspace launch contract

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

AY-PLE startup이 explicit absolute `--workspace` 또는 durable `WorkspaceRegistry.activeWorkspaceId`에서 prepared SemesterWorkspace 하나를 결정한다. Read-only canonical/Git/v4 validation과 deterministic precedence를 고정하고, completed W-003의 candidate/bootstrap contract와 `workspace_init` eligibility는 제거하되 generic non-preemptive coordinator를 보존한다.

## Spec Traceability

- User stories: 1, 4, 5, 8
- Implementation contract: Startup selection과 public lifecycle, Interfaces and Invariants, Compatibility and Migration

## Slice-Specific Constraints

- First open 또는 학기 변경은 explicit absolute `--workspace <prepared-root>`를 사용한다. Explicit root는 registry pointer보다 우선하는 requested target이지만 readiness 전에는 registry를 변경하지 않는다.
- No-argument startup은 compatible registry의 non-null active pointer를 fresh reopen한다. Explicit root와 valid active pointer가 모두 없으면 `prepared_workspace_required`로 fail closed한다.
- Requested root는 canonical existing non-symlink directory, exact independent Git root와 strict v4 identity여야 한다. Dirty working tree는 admission failure가 아니다.
- Explicit invalid root, missing/moved/reused registry root, v4 identity mismatch와 malformed/future registry는 Runtime spawn이나 filesystem mutation 없이 exact startup failure로 수렴한다.
- App은 directory chooser, `BootstrapCandidate`, candidate binding, init operation과 activation command를 만들지 않는다. Candidate select/init/delete/activate routes와 Browser projection은 target public contract에서 제거한다.
- Target Browser lifecycle이 startup 상태를 투영해야 할 때 `starting | active | recovery_required`만 사용하며 absolute root, registry bytes와 native identity를 노출하지 않는다.
- `activeOperation`은 normal product Turn만 표현한다. W-003 generic coordinator의 atomic eligibility/claim, non-preemption과 terminal-only release를 유지하고 `workspace_init` 및 candidate-specific eligibility를 contract한다.
- 이 ticket은 root resolution, public lifecycle codec과 operation admission을 deterministic fixtures로 고정한다. Shared listener, Workspace Runtime, required MCP readiness와 registry commit ordering은 Ticket 007이 소유한다.
- Current public behavior와 나란히 target contract를 expand해야 하는 경우 joint cutover 전 current route 의미를 몰래 바꾸지 않는다. 최종 source에는 obsolete candidate consumer를 compatibility alias로 남기지 않는다.

## Acceptance Criteria

- [ ] Explicit absolute `--workspace`가 registry pointer보다 우선하고 no-argument startup은 fresh-valid active registry root만 선택한다.
- [ ] Explicit root와 registry pointer가 모두 없으면 `prepared_workspace_required`이며 listener, Runtime child, registry write와 workspace mutation이 0이다.
- [ ] Invalid explicit root와 missing/moved/reused/mismatched registry root가 deterministic safe failure를 반환하고 malformed/future registry bytes를 보존한다.
- [ ] Dirty prepared root는 valid selection이고 canonical path, exact Git root와 v4 identity failure만 admission을 막는다.
- [ ] Product contract와 Server consumer에서 candidate union, `workspace_init`, init operation ID와 candidate routes가 제거되고 compatibility alias가 남지 않는다.
- [ ] Generic coordinator가 normal product Turn의 atomic non-preemptive admission, once-only terminal release와 current Chat behavior를 유지하며 prepared-workspace startup은 operation lease를 만들지 않는다.
- [ ] Browser-safe startup/recovery projection에 absolute path, registry entry list, candidate와 private Runtime detail이 포함되지 않는다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/product-contract`
  - `npm test -w @ay-ple/server`
  - Startup resolver precedence·no-root·invalid-root focused tests
  - Product lifecycle candidate consumer inventory
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Temporary prepared Git roots와 real registry bytes로 explicit selection, no-argument reopen, no-root failure와 dirty-tree acceptance를 확인한다.

## Blocked By

- `002-v4-identity-and-workspace-registry.md` — V4 identity와 WorkspaceRegistry
- `003-product-operation-coordinator-and-lifecycle-contract.md` — Product operation coordinator와 lifecycle contract

## Starting Points

- `scripts/product-development-bootstrap.mts`
- `apps/server/src/product-development.ts`
- `apps/server/src/root-isolation.ts`
- `apps/server/src/workspace-registry.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/codex-chat-service.ts`
- `packages/product-contract/src/workspace.ts`
- `packages/product-contract/src/index.ts`
- `packages/product-contract/src/index.test.ts`
