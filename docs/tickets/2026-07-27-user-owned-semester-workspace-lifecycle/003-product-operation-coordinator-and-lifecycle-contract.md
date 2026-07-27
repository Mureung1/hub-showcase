# 003 — Product operation coordinator와 lifecycle contract

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

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

- [ ] Product contract가 모든 lifecycle variant, safe summary/reference와 `activeOperation`을 exact decode하고 invalid cross-field 조합을 거절한다.
- [ ] `workspace_unavailable`과 `runtime_unavailable`의 active reference conditionality가 distinct union으로 고정된다.
- [ ] Generic coordinator가 transition과 product Turn의 concurrent start 중 하나만 admit하고 loser에게 non-preemptive `409`를 반환한다.
- [ ] Chat은 active에서만, workspace init은 non-null candidate를 가진 bootstrap에서만 admit된다.
- [ ] Start failure, terminal, interrupt, disconnect, Runtime close와 shutdown에서 lease가 너무 일찍 또는 두 번 release되지 않는다.
- [ ] Current Chat·Assignment path가 target coordinator expansion 뒤에도 기존 observable behavior를 유지한다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/product-contract`
  - `npm test -w @ay-ple/server`
  - `npm run typecheck -w @ay-ple/product-contract`
  - `npm run typecheck -w @ay-ple/server`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Deterministic deferred Turn과 transition을 경쟁시켜 기존 operation 유지, exact `409`, terminal-only release와 settled bootstrap projection을 확인한다.

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
