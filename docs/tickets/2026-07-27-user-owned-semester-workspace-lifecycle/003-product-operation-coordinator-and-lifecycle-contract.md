# 003 — Product operation coordinator와 lifecycle contract

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

Browser와 Server가 bootstrap, candidate, active, transitioning, recovery를 같은 exact lifecycle contract로 이해하고, process-local coordinator가 workspace transition과 product Turn 중 하나만 atomic하게 허용한다. 사용자는 overlap 때문에 기존 작업이 preempt되거나 check-then-start race가 생기지 않는 예측 가능한 상태를 받는다.

## Spec Traceability

- User stories: 2, 4, 5
- Implementation contract: Browser workspace lifecycle, Module Responsibilities and Seams, Failure Behaviour

## Slice-Specific Constraints

- Target `ProductBootstrap`과 `ProductWorkspaceLifecycle` union은 current public product contract 옆에 expand하고 joint cutover 전 compatibility alias로 current meaning을 바꾸지 않는다.
- Product decoder는 exact keys뿐 아니라 lifecycle state, target, candidate, `activeOperation`과 init operation ID의 cross-field invariant를 검증한다.
- `candidateId`, `operationId`, workspace identity와 safe `label`은 Parent Spec의 exact format·byte bound를 사용하며 absolute path를 Browser에 보내지 않는다.
- `activeOperation`은 `chat | workspace_init` product Turn만 나타낸다. Transition lease는 lifecycle `state`와 coordinator 내부 authority다.
- Coordinator는 eligibility check와 `workspace_transition | product_turn` lease claim을 같은 critical section에서 수행한다.
- Existing operation overlap은 preemption 없이 `409`이며 Turn start failure, authoritative native terminal 또는 completed Runtime close 뒤에만 once-only release한다.
- Browser disconnect, interaction pending settlement와 interrupt 요청은 outer lease를 직접 release하지 않는다.
- 이 ticket은 target contract와 generic coordinator를 current product Turn에 expand한다. 실제 candidate endpoint와 UI는 Ticket 006이 소유한다.

## Acceptance Criteria

- [x] Product contract가 모든 lifecycle variant, safe summary/reference와 `activeOperation`을 exact decode하고 invalid cross-field 조합을 거절한다.
- [x] `workspace_unavailable`과 `runtime_unavailable`의 active reference conditionality가 distinct union으로 고정된다.
- [x] Generic coordinator가 transition과 product Turn의 concurrent start 중 하나만 admit하고 loser에게 non-preemptive `409`를 반환한다.
- [x] Chat은 active에서만, workspace init은 non-null candidate를 가진 bootstrap에서만 admit된다.
- [x] Start failure, terminal, interrupt, disconnect, Runtime close와 shutdown에서 lease가 너무 일찍 또는 두 번 release되지 않는다.
- [x] Current Chat·Assignment path가 target coordinator expansion 뒤에도 기존 observable behavior를 유지한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/product-contract` — 22개 test green
  - `npm test -w @ay-ple/server` — 154개 test green
  - `npm run typecheck -w @ay-ple/product-contract` — green
  - `npm run typecheck -w @ay-ple/server` — green
- Repository checks:
  - `npm test` — green
  - `npm run typecheck` — green
  - `npm run build` — green
  - `npm run lint -w @ay-ple/chat-shell` — green
  - `npm run check:docs-links` — active 28개와 historical banner 2개 green
  - `git diff --check` — green
- Manual or live smoke:
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/product-lifecycle-coordinator.test.ts`의 5개 deterministic test로 deferred Turn과 transition의 단일 non-preemptive lease, eligibility와 claim의 atomicity, exact `409`, terminal/Runtime-close authority, once-only release와 shutdown gating을 확인했다.
  - Unknown Turn의 Runtime close 실패를 주입한 Server 통합 test에서 첫 operation은 honest `unknown`으로 settle되고, 후속 operation은 exact `409 action_busy`를 받으며 두 번째 native Turn이 시작되지 않음을 확인했다.
  - `/code-review 36c28a5fdacb2a5d6b62411ac4346c15e14f72b8`의 Standards 축은 공용 operation ID validator 재사용 뒤 hard violation과 residual smell이 0개였다. Spec 축은 release authority, eligibility error mapping, candidate ID validation과 current Chat compatibility finding을 수정한 뒤 residual finding 0개를 확인했다.

## Result

`@ay-ple/product-contract`가 current `ProductBootstrap` 의미를 유지한 채 target bootstrap과 모든 `ProductWorkspaceLifecycle` variant를 exact decode한다. Safe workspace summary, candidate, init Turn, `activeOperation`은 bounded opaque ID와 cross-field invariant를 공유하며 `workspace_unavailable`과 `runtime_unavailable`은 서로 다른 active reference 조건을 가진다.

Server의 process-local `ProductLifecycleCoordinator`는 workspace transition과 product Turn을 하나의 non-preemptive lease로 serialize하고 eligibility check와 claim을 같은 critical section에서 수행한다. Current Chat과 Assignment가 이 outer lease를 사용하되 기존 public ID와 response behavior는 유지한다. Lease는 Turn start failure, authoritative native terminal 또는 성공한 Runtime close에만 release되며 interrupt, disconnect, unknown settlement와 shutdown은 release 권한을 만들지 않는다.

구현 commit은 `396b2505c` (`feat: add product lifecycle admission contract`), `5566dd1c1` (`fix: enforce product lifecycle release authority`), `74af9e919` (`fix: retain lifecycle lease through runtime close`)다.

## Subsequent Correction

후속 아키텍처 결정에 따라 App-owned candidate/bootstrap lifecycle union과 `workspace_init` operation은 obsolete다. Ticket 006이 이 surface와 candidate-specific eligibility를 prepared-workspace launch contract로 contract한다. Generic coordinator는 normal product Turn의 eligibility와 lease claim을 같은 critical section에서 수행하는 non-preemptive admission, once-only release authority와 active lease를 native terminal 또는 completed Runtime close까지 보존하는 경계만 재사용한다. Prepared-workspace startup은 operation lease를 claim하지 않으며 workspace transition eligibility도 재사용하지 않는다.

## Blocked By

- `002-v4-identity-and-workspace-registry.md` — V4 identity와 WorkspaceRegistry

## Starting Points

- `packages/product-contract/src/workspace.ts`
- `packages/product-contract/src/contract-values.ts`
- `packages/product-contract/src/index.ts`
- `packages/product-contract/src/index.test.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/product-chat-action.test.ts`
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/server/src/product-bootstrap.test.ts`
