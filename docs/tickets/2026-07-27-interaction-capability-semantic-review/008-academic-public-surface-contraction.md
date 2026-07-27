# 008 — Academic public surface contraction

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Chat Shell에 Course/material selection·preview, First Assignment/retry와 durable academic history control 또는 target Review와 경쟁하는 replacement UI가 없다.
- [x] Removed Course/material/action/retry 및 old patch Review endpoints가 public router에 mount되지 않고 request가 success나 compatibility response를 받지 않는다.
- [x] `@ay-ple/product-contract` public root가 target workspace lifecycle, normal Chat/interaction와 Semantic Review에 필요한 Browser-safe contract만 export한다.
- [x] Chat Shell, Server와 product-contract에서 old public academic 타입·decoder consumer가 0이고 각 package test·typecheck가 green이다.
- [x] General clarification, Turn interrupt, target workspace recovery와 accept/revise/reject inline Review regression tests가 계속 통과한다.
- [x] Browser bundle과 public network trace에 private Broker contract, credential, native identity 또는 removed store revision identity가 없다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/product-contract && npm test -w @ay-ple/server && npm test -w @ay-ple/chat-shell`
- Repository checks: `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e`
- Manual or live smoke: Target desktop App에서 workspace lifecycle, general Chat와 Semantic Review가 남고 old academic controls·routes가 없는지 Browser network panel과 UI로 확인한다.

## Verification result

| 구분 | 결과 |
| --- | --- |
| Package checkpoint | Chat Shell consumer 제거 뒤 test/typecheck/lint/build, Server public route/action adapter 제거 뒤 147개 test와 typecheck/build, product-contract export 제거 뒤 11개 test와 typecheck/build를 각 checkpoint에서 통과 |
| Targeted gate | `npm test -w @ay-ple/product-contract && npm test -w @ay-ple/server && npm test -w @ay-ple/chat-shell` 통과. Public root exact inventory와 old academic ID/frame 거절도 포함 |
| Desktop Browser smoke | Chromium desktop에서 prepared lifecycle, normal Chat, general clarification, one public operation binding, Turn interrupt와 inline Review accept·revise·reject를 확인했다. Old Course/material control은 없고 removed route는 success 없이 닫힘 |
| Browser exclusion | Production bundle에서 private Broker env/credential, native thread·Turn identity, `confirmedRevision`, `ProductStatePatch`, RawMaterial·First Assignment와 removed academic route 문자열이 0건 |
| Repository gate | `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e` 최종 통과. Chat Shell E2E 3개와 camp demo E2E 8개 통과 |
| Documentation | `npm run check:docs-links` 통과. Root README, package README와 implementation map을 target-only public surface와 I-009 physical boundary에 맞춤 |
| Code review | Fixed point `f49a1b75ad018403a5e4de7848936729f10bbf3d` 기준 Standards·Spec 병렬 review에서 문서 drift와 split operation binding을 수정했고, 재검토 결과 남은 finding 0건 |

## Result

Default Chat Shell에서 source workbench와 Course/material/First Assignment·retry·academic history UI를 제거하고 prepared lifecycle, normal AY Chat, general clarification·interrupt와 inline Semantic Review만 남겼다. Server는 대응 academic public Router/action adapter와 compatibility response를 제거했으며, `@ay-ple/product-contract` public root는 target Browser-safe contract만 export한다. Public operation ID는 bootstrap, Chat, clarification, Semantic Review와 interrupt 전 구간에서 하나의 `operation_*` binding을 사용한다. Legacy persistence, private patch MCP, managed Recipe와 old Runtime override source·bytes는 I-009 경계로 보존했다.

구현 commit:

- `3a676c2bdad9b36a2ffa8828a8adee2c35939dfc` — `refactor: remove academic chat shell surface`
- `b4300ca7957a2720ac36ce84f32679b815c103e7` — `refactor: remove academic server routes`
- `11f00f42f61e25aebfedbdcd5110b52a483e8f8f` — `refactor: contract product browser surface`
- `cf54aec987be5dfacaf74c7db91c3cdbac59c7e4` — `fix: emit target product operation ids`
- `39cceac17f4ae4cbc300d0179b61dc8540ae5aee` — `test: preserve clarification and interrupt flow`
- `55fdd8af4fc77ab1447d4032bdd5a4b2ab7e2798` — `fix: unify product operation binding`
- `9a2aaa17e9fbc725ad2e672dc4ef1a10498dd55a` — `refactor: address contraction review`

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
