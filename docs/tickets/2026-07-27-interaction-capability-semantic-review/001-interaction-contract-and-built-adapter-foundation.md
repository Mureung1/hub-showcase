# 001 — Interaction contract와 Built Adapter foundation

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Current First Assignment round trip에서 보존할 interaction semantics를 characterization test로 고정하고, App 학업 객체와 무관한 exact `propose_state_patch` contract를 제공한다. Built `@ay-ple/interaction-mcp` STDIO Adapter는 유효한 Runtime environment, authenticated Broker handshake와 held lifecycle channel acceptance를 확인한 뒤에만 MCP를 열고, 한 tool call을 한 held Broker POST의 terminal result 또는 safe MCP failure로 돌려준다.

## Spec Traceability

- User stories: 3, 8, 9, 10
- Implementation contract: `Module Responsibilities and Seams`, `Project declaration과 capability-neutral Runtime seam`, `propose_state_patch public MCP contract`, `Private Adapter↔Broker wire와 Turn binding`

## Slice-Specific Constraints

- Current `requestKey`·workspace·Course·revision·durable apply round trip은 donor로만 유지한다. 같은 Turn의 interaction, exact result 전달과 continuity failure는 보존하고, durable patch/apply·replacement와 built-in `request_user_input` 이중 확인은 target assertion으로 승격하지 않는다.
- `@ay-ple/interaction-mcp`가 public MCP request/result codec, private Adapter↔Broker wire, safe error mapping과 built executable을 소유한다. Runtime package를 import하거나 Browser UI와 active workspace 선택을 소유하지 않는다.
- `@ay-ple/product-contract`에는 Browser-safe semantic Review/result/frame codec을 old contract 옆에 expand한다. Raw MCP request, private token·binding이나 native identity가 Browser contract로 새면 안 된다.
- Request/result, handshake, capability call/result와 error envelope는 Parent Spec의 exact field, additional-field rejection, cardinality·UTF-8 byte bound와 `2 MiB` outer body bound를 지킨다.
- Built entrypoint는 `packages/interaction-mcp/dist/stdio.js`이며 Node shebang과 executable mode를 가진다. Environment의 Broker URL·token·binding을 검증하고 exact handshake와 held lifecycle channel acceptance가 성공하기 전에는 MCP initialize를 성공시키지 않는다.
- Adapter는 capability call당 authenticated HTTP POST 하나만 열고 terminal response를 같은 MCP call에 반환한다. `202`, poll, callback, automatic retry, result replay와 Browser interaction ID 합성을 만들지 않는다.
- 이 expand slice는 current public `/api/product-mcp`와 old First Assignment composition을 제거하거나 전환하지 않는다.

## 완료 당시 Acceptance Criteria

- [x] Characterization tests가 current round trip에서 보존할 same-Turn interaction·failure semantics와 폐기할 academic durability·double-confirmation semantics를 명시적으로 구분한다.
- [x] Public MCP, private wire와 Browser-safe Review codec이 valid exact value를 decode하고 모든 additional field, malformed union, byte·cardinality 초과와 forbidden identity field를 거절한다.
- [x] Built STDIO executable이 valid environment와 authenticated handshake에서 `propose_state_patch` 하나만 광고하고, invalid environment·handshake·Broker error를 bounded safe MCP failure로 반환한다.
- [x] 한 valid tool call이 정확히 한 held POST와 한 structured result를 만들며 timeout·abort·transport loss에서 normal result나 automatic retry를 만들지 않는다.
- [x] Package root export, build output, shebang·mode와 workspace scripts가 clean checkout에서 반복 검증된다.
- [x] Current public product composition과 기존 characterization suite는 이 slice 뒤에도 green이다.

## 완료 당시 Verification

- Targeted: `npm test -w @ay-ple/interaction-mcp && npm test -w @ay-ple/product-contract` — green. Built process 9개 test와 Browser contract 17개 test가 exact codec, handshake, held result, `202` 거절, cancellation·transport failure를 검증했다.
- Current donor: `npm test -w @ay-ple/server` — 140 tests green. Same-Turn·failure survivor와 academic apply·replacement·built-in Plan question의 donor-only 경계를 명시적으로 유지했다.
- Repository: `npm run typecheck && npm run build && npm test` — green.
- Additional: `npm run lint -w @ay-ple/chat-shell`, `npx oxlint packages/interaction-mcp/src packages/product-contract/src/semantic-review.ts packages/product-contract/src/semantic-review.test.ts`, `npm run check:docs-links` — green.
- Built smoke: Mock loopback Broker와 real `packages/interaction-mcp/dist/stdio.js`를 실행해 initialize → tools/list → held call → structured result, invalid environment·handshake 거절, Broker error·transport loss·MCP cancellation과 no-retry를 관찰했다. Package-root verifier가 반복 build 뒤 default export, Node shebang과 executable mode를 확인했다.
- Review: Fixed point `3fcf7c2fab1ed6622d705c1b0c0576059b61e4aa` 기준 Standards finding 0건. Spec finding 2건(`202` admission, donor-only 분류)을 `836631bb0`에서 수정했고 재검토에서 남은 finding 0건을 확인했다.

## 완료 당시 Result

`@ay-ple/interaction-mcp` package에 domain-neutral `propose_state_patch` request/result codec, strict private Broker wire와 built STDIO Adapter를 추가했다. Adapter는 exact loopback environment와 authenticated handshake 뒤에만 initialize하고, capability call 하나를 held POST 하나의 terminal structured result 또는 bounded MCP failure로 정산한다. `@ay-ple/product-contract`에는 old contract를 유지한 채 Browser-safe semantic Review/result/frame codec을 확장했고, current academic composition은 donor characterization으로 그대로 green이다.

Implementation commits:

- `1f0993c78` — `feat: add interaction MCP adapter foundation`
- `836631bb0` — `fix: reject nonterminal broker acknowledgements`

## 검토 후 정정 (현재 결과)

완료 당시의 짧은 handshake는 generation credential을 검증했지만 실제 Product Adapter가 계속 살아 있는지를 나타내는 lifecycle authority는 아니었다. 현재 built Adapter는 handshake 직후 `lifecycle_open` held POST를 추가로 열고 Broker의 `lifecycle_accepted`를 읽은 뒤에만 MCP initialize를 성공시킨다. Broker는 이 channel의 unexpected EOF를 동기적으로 Adapter loss로 latch하며, expected Runtime replacement·App shutdown close는 loss로 기록하지 않는다. Capability call 하나당 held POST 하나와 no-poll·no-retry 계약은 그대로 유지된다.

현재 acceptance는 invalid environment·handshake뿐 아니라 lifecycle rejection·premature EOF에서도 initialize가 fail closed하고, initialize 이후 lifecycle loss가 새 call admission과 pending call을 `transport_failed`로 닫는 것을 포함한다. 위 commit 목록과 완료 당시 검증 수치는 역사적 구현 증거로 보존하며, 이 정정의 current verification은 Interaction package·Server lifecycle test와 canonical repository gate가 소유한다.

## Blocked By

None — can start immediately.

## Starting Points

- `apps/server/src/assignment-mcp-host.ts`
- `apps/server/src/assignment-mcp-host.test.ts`
- `apps/server/src/product-chat-action.test.ts`
- `apps/chat-shell/src/product-chat-model.test.ts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `packages/product-contract/src/contract-values.ts`
- `packages/product-contract/src/review.ts`
- `packages/product-contract/src/operation-frame.ts`
- `packages/product-contract/src/index.test.ts`
- `docs/wayfinding/codex-chat-application-foundation/assets/state-patch-review-interaction-donor.md`
