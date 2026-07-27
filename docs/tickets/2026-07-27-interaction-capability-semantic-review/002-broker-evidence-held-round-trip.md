# 002 — Broker·Evidence held round trip

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Valid handshake와 active Turn lease에서 한 capability call이 in-memory UI projection 하나를 만들고 한 user result를 held response에 정확히 한 번 반환한다.
- [x] No active product Turn lease, invalid/stale token·binding, second call과 malformed private envelope가 Browser projection 없이 각각 closed safe failure로 끝나며 Broker가 startup·candidate lease를 대신 만들지 않는다.
- [x] Contained regular text evidence는 exact digest·occurrence·bounded context로 투영되고 traversal, symlink escape, missing/non-regular/oversized file, invalid UTF-8, digest·quote drift가 card 생성 전에 whole-call failure가 된다.
- [x] Duplicate·late settlement, response delivery ambiguity와 concurrent close race가 두 번째 result, replay나 leaked pending slot을 만들지 않는다.
- [x] Adapter HTTP abort, UI disconnect, Turn interrupt, Runtime terminal·replacement, STDIO EOF와 App shutdown의 intake·credential·outer lease ordering이 deterministic tests로 고정된다.
- [x] Private request·response와 Browser projection 어디에도 credential, absolute path, workspace·native identity가 노출되지 않는다.

## Verification

- Targeted: `npm test -w @ay-ple/server -- --test-name-pattern='Interaction Broker|evidence'` — green. Server suite 163개 test가 통과했고 Broker의 valid held result, evidence failure matrix, authentication·handshake·lease·busy·late failure를 포함했다.
- Broker regression: `node --test apps/server/dist/interaction-broker.test.js` — 8/8 green. Stalled UI publish, 모든 continuity source, settle-close race와 pending slot 회수를 deterministic하게 검증했다.
- Repository: `npm run typecheck && npm run build && npm test && npm run lint -w @ay-ple/chat-shell && npm run check:docs-links` — 최종 코드 기준 전체 green.
- Manual trace: In-memory UI Adapter와 temporary workspace를 사용하는 HTTP trace에서 valid call의 exact evidence projection과 held settlement, concurrent busy, invalid evidence의 pre-publish failure, interrupt·Adapter loss cleanup을 관찰했다.
- Review: Fixed point `72d4367b5319d27d98b879393a2afcea28079fe3` 기준 Standards 위반 0건, Spec finding 3건이었다. Stalled UI callback의 bounded cleanup과 handshake gate를 `74f95d96b`에서, settle-close arbitration을 `0296efeed`에서 수정했다. Spec 재검토는 남은 finding과 scope creep 0건이었다. Standards 재검토는 documented violation 0건이었고, mutable pending state의 primitive-obsession 가능성만 non-blocking judgment call로 남겼다.

## Result

Server-side Interaction Broker를 추가해 active `product_turn` admission과 runtime generation credential에 결속된 `propose_state_patch` call 하나를 exact workspace evidence로 preflight하고, 한 in-memory Review card의 사용자 결정을 같은 held HTTP response에 once-only로 반환한다. Evidence 검증은 root containment, realpath, regular file, size, fatal UTF-8, digest, occurrence와 aggregate projection bound를 모두 통과한 뒤에만 atomic publish하며, busy·malformed·continuity loss·close race는 normal user result 없이 bounded safe failure로 닫는다.

Implementation commits:

- `9c4d38898` — `feat: add held interaction broker`
- `74f95d96b` — `fix: bound broker continuity cleanup`
- `0296efeed` — `fix: arbitrate broker close races`

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
