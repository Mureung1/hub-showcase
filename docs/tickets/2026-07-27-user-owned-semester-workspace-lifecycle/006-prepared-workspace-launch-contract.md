# 006 — Prepared workspace launch contract

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Explicit absolute `--workspace`가 registry pointer보다 우선하고 no-argument startup은 fresh-valid active registry root만 선택한다.
- [x] Explicit root와 registry pointer가 모두 없으면 `prepared_workspace_required`이며 listener, Runtime child, registry write와 workspace mutation이 0이다.
- [x] Invalid explicit root와 missing/moved/reused/mismatched registry root가 deterministic safe failure를 반환하고 malformed/future registry bytes를 보존한다.
- [x] Dirty prepared root는 valid selection이고 canonical path, exact Git root와 v4 identity failure만 admission을 막는다.
- [x] Product contract와 Server consumer에서 candidate union, `workspace_init`, init operation ID와 candidate routes가 제거되고 compatibility alias가 남지 않는다.
- [x] Generic coordinator가 normal product Turn의 atomic non-preemptive admission, once-only terminal release와 current Chat behavior를 유지하며 prepared-workspace startup은 operation lease를 만들지 않는다.
- [x] Browser-safe startup/recovery projection에 absolute path, registry entry list, candidate와 private Runtime detail이 포함되지 않는다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/product-contract` — 21개 test green
  - `npm test -w @ay-ple/server` — 158개 test green
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/prepared-workspace-launch.test.ts` — explicit precedence, registry reopen, no-root zero-write, invalid Git/root/v4, malformed·future byte preservation과 dirty-tree 6개 test green
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/product-turn-coordinator.test.ts` — atomic eligibility/claim, non-preemption, terminal-only once release와 shutdown 3개 test green
  - `rg -n "BootstrapCandidate|workspace_init|candidateId|candidate_|bootstrap_candidate|candidate_activation|product-lifecycle-coordinator|ProductLifecycle" packages/product-contract/src apps/server/src scripts --glob '!**/dist/**'` — production consumer 0개, obsolete `workspace_init` decoder rejection test 1개
- Repository checks:
  - `npm test` — green
  - `npm run typecheck` — green
  - `npm run build` — green
  - `npm run lint -w @ay-ple/chat-shell` — green
  - `npm run check:docs-links` — active 28개와 historical banner 2개 green
  - `git diff --check` — green
- Manual or live smoke:
  - Temporary real Git roots 두 개와 real `WorkspaceRegistry` bytes를 사용하는 focused test에서 explicit selection, no-argument reopen, no-root failure, dirty-tree acceptance, moved/reused root와 malformed/future registry original-byte 보존을 확인했다.
  - `/code-review e3a9bdafb7fb421ed9d7f2d37bf7a823040a172b`의 Standards와 Spec 축 모두 finding 0개였다.

## Result

Canonical root command는 explicit prepared root를 registry active pointer보다 우선하고, 인자가 없을 때 compatible registry의 active root를 fresh 검증한다. Resolver는 filesystem mutation 전에 canonical non-symlink directory, exact Git root와 strict v4 identity를 확인하며 no-root, invalid explicit root, missing·moved·reused registry root와 incompatible registry를 deterministic failure로 닫는다.

`@ay-ple/product-contract`의 target lifecycle은 `starting | active | recovery_required`와 active normal `product_turn`만 Browser-safe하게 표현한다. Candidate/init union과 ID validator를 제거했고 Server의 survivor coordinator는 `product-turn-coordinator`로 축소해 current Assignment·Chat의 atomic non-preemptive admission과 terminal-only release를 유지한다. 구현 commit은 `4122ef721` (`feat: enforce prepared workspace launch contract`)이다.

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
