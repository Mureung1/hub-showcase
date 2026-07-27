# 001 — Workspace Runtime survivor seam을 확장하고 current caller를 이관한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-public-release-residue-pruning.md`

## What It Delivers

Current Server와 product conformance caller가 managed account lifecycle과 무관한 workspace-only Runtime contract를 사용한다. 사용자가 보는 Account Readiness, Chat·Assignment, model 설정과 native-context behavior는 바뀌지 않지만, 후속 hard contraction이 current product caller를 건드리지 않고 obsolete account seam만 제거할 수 있는 expand–migrate 기반을 만든다.

## Spec Traceability

- User stories: 1, 2, 3
- Implementation contract: Module Responsibilities and Seams, Interfaces and Invariants, Data and State Flow

## Slice-Specific Constraints

- 이 ticket은 expand–migrate–contract sequence의 expand·current-caller migration 단계다. Managed account type·method와 `auth-only` role은 아직 제거하지 않는다.
- Survivor contract는 native conversation·close, `readAccountReadiness()`, model catalog, product Turn·user-input answer/cancel과 effective config·Skill observation만 조합한다.
- Workspace input을 사용하는 existing production factory call은 survivor contract를 반환해야 한다. Role-aware overload와 managed contract가 이 ticket 동안 남더라도 current Server·product fixture의 compile-time dependency가 되어서는 안 된다.
- Account Readiness는 fresh `account/read(refreshToken: true)` 결과를 계속 사용하고 login·logout mutation을 시작하지 않는다.
- Browser contract, `/api/product/*`, persisted workspace bytes와 Runtime wire behavior를 바꾸지 않는다.
- 새 compatibility package, Browser export 또는 generic engine abstraction을 만들지 않는다.

## Acceptance Criteria

- [x] Account lifecycle이나 Runtime role을 포함하지 않는 workspace/product survivor Runtime interface가 명시된다.
- [x] Workspace-only production factory call의 반환 계약이 survivor interface로 좁혀진다.
- [x] `apps/server`의 canonical composition, live product trace와 cross-package process fixture를 포함한 current product caller가 survivor seam만 사용한다.
- [x] `readAccountReadiness()`의 `ready | not_ready(authentication_required)` projection과 failure settlement가 기존 behavior를 유지한다.
- [x] Existing product Turn, model catalog, native-context와 bounded close tests가 새 seam에서 통과한다.
- [x] Transitional managed surface는 current product consumer가 없다는 것을 import/type test 또는 equivalent static evidence로 확인한다.

## Verification

- Targeted test or command:
  - `npm run test:node-unit -w @ay-ple/codex-chat-runtime` — 통과, 138 assertions
  - `npm run typecheck -w @ay-ple/codex-chat-runtime` — 통과
  - `npm test -w @ay-ple/server` — 통과, 133 tests
  - `npm run typecheck -w @ay-ple/server` — 통과
- Repository checks:
  - `npm test` — 통과
  - `npm run typecheck` — 통과
  - `npm run build` — 통과
  - `npm run lint -w @ay-ple/chat-shell` — 통과
  - `npm run check:docs-links` — 통과
- Manual or live smoke:
  - `npm run test:product-shutdown-actual -w @ay-ple/server` — 통과, supervised Runtime 종료와 workspace activation 이후 readiness 복구 2개 시나리오
  - External credential이나 live provider는 사용하지 않았다.

## Result

`CodexWorkspaceRuntime` survivor seam을 추가하고 workspace-only factory 반환 계약, Server composition, product trace, process fixture와 Browser E2E harness를 새 seam으로 이관했다. Compile-time type test로 managed account lifecycle과 `role`이 survivor contract에 들어오지 못하도록 고정했으며, Account Readiness projection·failure settlement와 product Turn/model/native-context/close behavior를 기존대로 보존했다. Transitional `CodexManagedRuntime`과 role-aware overload는 후속 contraction ticket을 위해 남겼다. 구현 체크포인트는 `059db5fce`, `8f69d4c12`, `e4030f932`, `124b6bb65`이다.

## Blocked By

None — can start immediately.

## Starting Points

- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `packages/codex-chat-runtime/type-tests/browser-contract.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/testing/first-assignment-product.live.ts`
