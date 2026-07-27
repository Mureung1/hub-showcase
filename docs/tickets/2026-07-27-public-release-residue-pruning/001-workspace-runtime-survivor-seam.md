# 001 — Workspace Runtime survivor seam을 확장하고 current caller를 이관한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

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

- [ ] Account lifecycle이나 Runtime role을 포함하지 않는 workspace/product survivor Runtime interface가 명시된다.
- [ ] Workspace-only production factory call의 반환 계약이 survivor interface로 좁혀진다.
- [ ] `apps/server`의 canonical composition, live product trace와 cross-package process fixture를 포함한 current product caller가 survivor seam만 사용한다.
- [ ] `readAccountReadiness()`의 `ready | not_ready(authentication_required)` projection과 failure settlement가 기존 behavior를 유지한다.
- [ ] Existing product Turn, model catalog, native-context와 bounded close tests가 새 seam에서 통과한다.
- [ ] Transitional managed surface는 current product consumer가 없다는 것을 import/type test 또는 equivalent static evidence로 확인한다.

## Verification

- Targeted test or command:
  - `npm run test:node-unit -w @ay-ple/codex-chat-runtime`
  - `npm run typecheck -w @ay-ple/codex-chat-runtime`
  - `npm test -w @ay-ple/server`
  - `npm run typecheck -w @ay-ple/server`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
- Manual or live smoke:
  - 없음. External credential이나 live provider를 사용하지 않는다.

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
