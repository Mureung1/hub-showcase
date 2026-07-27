# 008 — Academic public surface contraction

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Joint cutover 뒤 더 이상 public authority가 아닌 Course, material registry·preview, First Assignment action·retry와 patch-bound Review surface를 Browser, Server route와 shared product contract에서 제거한다. Public AY-PLE은 workspace lifecycle, normal AY Chat과 inline Semantic Review만 표현하며 old academic workflow로 돌아가는 hidden compatibility path를 남기지 않는다.

## Spec Traceability

- User stories: 7, 8
- Implementation contract: `Compatibility and Migration`, `Module Responsibilities and Seams`, `AY-owned mutation boundary`

## Slice-Specific Constraints

- 이 ticket은 contract 단계다. Ticket 007에서 target public composition이 green인 상태를 유지하며 old surface를 다시 expand하거나 target과 병행 노출하지 않는다.
- Wide removal은 현재 `codex/...` working branch에서 Chat Shell consumers → Server public routes/action adapters → `@ay-ple/product-contract` academic exports 순으로 진행한다. 각 package-bounded checkpoint는 자체 tests와 typecheck를 통과해야 한다.
- Chat Shell에서 source workbench, Course creation, material refresh·preview·selection, First Assignment action·retry, durable Assignment/Run/patch/confirmation history와 replacement Review UI를 제거한다.
- Server에서 대응 public endpoints와 request/response projection을 제거한다. Removed route에 compatibility alias, redirect, tombstone success와 hidden feature flag를 만들지 않는다.
- Product contract에서 더 이상 consumer가 없는 Course/material/action/retry, `ProductStatePatch`, patch-bound Review request/response와 academic history frame을 마지막에 제거한다.
- Normal AY Chat, built-in general clarification, operation interrupt, target workspace lifecycle와 `ProductReviewFrame`/`ProductReviewResult`는 보존한다.
- Underlying legacy academic persistence와 old Runtime MCP override의 physical 제거는 ticket 009가 소유한다. 이 ticket에서 legacy on-disk bytes를 rewrite·delete하지 않는다.
- Removed surface를 generic event bus, raw Git diff UI 또는 arbitrary schema renderer로 대체하지 않는다.

## Acceptance Criteria

- [ ] Chat Shell에 Course/material selection·preview, First Assignment/retry와 durable academic history control 또는 target Review와 경쟁하는 replacement UI가 없다.
- [ ] Removed Course/material/action/retry 및 old patch Review endpoints가 public router에 mount되지 않고 request가 success나 compatibility response를 받지 않는다.
- [ ] `@ay-ple/product-contract` public root가 target workspace lifecycle, normal Chat/interaction와 Semantic Review에 필요한 Browser-safe contract만 export한다.
- [ ] Chat Shell, Server와 product-contract에서 old public academic 타입·decoder consumer가 0이고 각 package test·typecheck가 green이다.
- [ ] General clarification, Turn interrupt, target workspace recovery와 accept/revise/reject inline Review regression tests가 계속 통과한다.
- [ ] Browser bundle과 public network trace에 private Broker contract, credential, native identity 또는 removed store revision identity가 없다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/product-contract && npm test -w @ay-ple/server && npm test -w @ay-ple/chat-shell`
- Repository checks: `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e`
- Manual or live smoke: Target desktop App에서 workspace lifecycle, general Chat와 Semantic Review가 남고 old academic controls·routes가 없는지 Browser network panel과 UI로 확인한다.

## Blocked By

- `./007-joint-public-cutover.md` — Joint public cutover

## Starting Points

- `apps/chat-shell/src/App.tsx`
- `apps/chat-shell/src/use-source-workbench.ts`
- `apps/chat-shell/src/product-api.ts`
- `apps/chat-shell/src/product-chat-model.ts`
- `apps/chat-shell/src/product-chat-presentation.tsx`
- `apps/chat-shell/src/App.css`
- `apps/chat-shell/e2e/source-workbench.spec.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/server/src/product-http.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/semester-materials.test.ts`
- `apps/server/src/assignment-action.test.ts`
- `packages/product-contract/src/request.ts`
- `packages/product-contract/src/workspace.ts`
- `packages/product-contract/src/review.ts`
- `packages/product-contract/src/operation-frame.ts`
- `packages/product-contract/src/index.ts`
- `packages/product-contract/src/index.test.ts`
