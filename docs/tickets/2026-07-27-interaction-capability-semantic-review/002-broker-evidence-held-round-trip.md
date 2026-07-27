# 002 — Broker·Evidence held round trip

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Authenticated active product Turn에서 들어온 한 `propose_state_patch` call을 exact workspace evidence와 함께 atomic preflight하고, in-memory UI Adapter의 한 사용자 결정이 같은 held HTTP response와 MCP call에 정확히 한 번 돌아가는 Server-side Interaction Broker를 제공한다. Busy, invalid evidence와 모든 continuity loss는 사용자 result가 아닌 bounded failure로 끝난다.

## Spec Traceability

- User stories: 2, 3, 5, 9, 10
- Implementation contract: `Evidence resolution`, `Private Adapter↔Broker wire와 Turn binding`, `Failure Behaviour`

## Slice-Specific Constraints

- Browser API와 같은 pre-bound loopback listener의 exact `POST /api/_private/interaction-mcp` route를 사용한다. 별도 port, daemon, WebSocket, Unix socket과 durable outbox를 만들지 않는다.
- Runtime generation마다 random token·binding과 pending slot 하나만 둔다. Raw peer loopback, constant-time Bearer token match, exact active binding과 coordinator가 이미 발급한 active `product_turn` lease를 모두 통과해야 한다.
- Broker는 완료된 blocker ticket의 `ProductOperationCoordinator`가 관리하는 active product Turn admission만 소비한다. Candidate, Bootstrap, prepared-workspace startup을 위한 lease나 별도 outer Turn lock, caller-supplied operation identity를 만들면 안 된다.
- Evidence authority는 authenticated Runtime binding의 exact workspace root다. 모든 relative path·realpath·regular-file·size·digest·fatal UTF-8·BOM·quote occurrence와 aggregate projection bound가 통과한 뒤에만 UI Adapter에 card 하나를 publish한다.
- 같은 file의 locator는 한 byte snapshot에서 검증하고, invalid ref 하나라도 있으면 partial projection이나 evidence-free fallback 없이 whole call을 실패시킨다.
- Held response settlement는 once-only다. 두 번째 call은 immediate `busy`, duplicate·late answer는 conflict이며 기존 pending call이나 card를 바꾸지 않는다.
- HTTP abort, UI disconnect, Turn interrupt, Runtime terminal·replacement, STDIO Adapter loss와 App shutdown은 normal `accept | revise | reject`를 합성하지 않는다. Intake close, pending failure, credential revoke와 Runtime teardown ordering을 Parent Spec대로 지킨다.
- Token, binding, raw path와 native identity는 Browser projection, config, registry, logs와 safe error에 나타나지 않는다.

## Acceptance Criteria

- [ ] Valid handshake와 active Turn lease에서 한 capability call이 in-memory UI projection 하나를 만들고 한 user result를 held response에 정확히 한 번 반환한다.
- [ ] No active product Turn lease, invalid/stale token·binding, second call과 malformed private envelope가 Browser projection 없이 각각 closed safe failure로 끝나며 Broker가 startup·candidate lease를 대신 만들지 않는다.
- [ ] Contained regular text evidence는 exact digest·occurrence·bounded context로 투영되고 traversal, symlink escape, missing/non-regular/oversized file, invalid UTF-8, digest·quote drift가 card 생성 전에 whole-call failure가 된다.
- [ ] Duplicate·late settlement, response delivery ambiguity와 concurrent close race가 두 번째 result, replay나 leaked pending slot을 만들지 않는다.
- [ ] Adapter HTTP abort, UI disconnect, Turn interrupt, Runtime terminal·replacement, STDIO EOF와 App shutdown의 intake·credential·outer lease ordering이 deterministic tests로 고정된다.
- [ ] Private request·response와 Browser projection 어디에도 credential, absolute path, workspace·native identity가 노출되지 않는다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/server -- --test-name-pattern='Interaction Broker|evidence'`
- Repository checks: `npm run typecheck && npm run build && npm test`
- Manual or live smoke: In-memory UI Adapter와 temporary workspace로 valid call, busy call, invalid evidence 및 interrupt settlement를 순서대로 관찰한다.

## Blocked By

- `./001-interaction-contract-and-built-adapter-foundation.md` — Interaction contract와 Built Adapter foundation
- `../2026-07-27-user-owned-semester-workspace-lifecycle/003-product-operation-coordinator-and-lifecycle-contract.md` — Product operation coordinator와 lifecycle contract

## Starting Points

- `apps/server/src/assignment-mcp-host.ts`
- `apps/server/src/assignment-mcp-host.test.ts`
- `apps/server/src/server-application.ts`
- `apps/server/src/server-listener.ts`
- `apps/server/src/server-listener.test.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/http-ndjson.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-materials.test.ts`
