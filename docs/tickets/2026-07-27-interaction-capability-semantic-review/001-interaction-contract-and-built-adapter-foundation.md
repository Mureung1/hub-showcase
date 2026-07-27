# 001 — Interaction contract와 Built Adapter foundation

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Current First Assignment round trip에서 보존할 interaction semantics를 characterization test로 고정하고, App 학업 객체와 무관한 exact `propose_state_patch` contract를 제공한다. Built `@ay-ple/interaction-mcp` STDIO Adapter는 유효한 Runtime environment와 authenticated Broker handshake를 확인한 뒤에만 MCP를 열고, 한 tool call을 한 held Broker POST의 terminal result 또는 safe MCP failure로 돌려준다.

## Spec Traceability

- User stories: 3, 8, 9, 10
- Implementation contract: `Module Responsibilities and Seams`, `Project declaration과 capability-neutral Runtime seam`, `propose_state_patch public MCP contract`, `Private Adapter↔Broker wire와 Turn binding`

## Slice-Specific Constraints

- Current `requestKey`·workspace·Course·revision·durable apply round trip은 donor로만 유지한다. 같은 Turn의 interaction, exact result 전달과 continuity failure는 보존하고, durable patch/apply·replacement와 built-in `request_user_input` 이중 확인은 target assertion으로 승격하지 않는다.
- `@ay-ple/interaction-mcp`가 public MCP request/result codec, private Adapter↔Broker wire, safe error mapping과 built executable을 소유한다. Runtime package를 import하거나 Browser UI와 active workspace 선택을 소유하지 않는다.
- `@ay-ple/product-contract`에는 Browser-safe semantic Review/result/frame codec을 old contract 옆에 expand한다. Raw MCP request, private token·binding이나 native identity가 Browser contract로 새면 안 된다.
- Request/result, handshake, capability call/result와 error envelope는 Parent Spec의 exact field, additional-field rejection, cardinality·UTF-8 byte bound와 `2 MiB` outer body bound를 지킨다.
- Built entrypoint는 `packages/interaction-mcp/dist/stdio.js`이며 Node shebang과 executable mode를 가진다. Environment의 Broker URL·token·binding을 검증하고 exact handshake가 성공하기 전에는 MCP initialize를 성공시키지 않는다.
- Adapter는 capability call당 authenticated HTTP POST 하나만 열고 terminal response를 같은 MCP call에 반환한다. `202`, poll, callback, automatic retry, result replay와 Browser interaction ID 합성을 만들지 않는다.
- 이 expand slice는 current public `/api/product-mcp`와 old First Assignment composition을 제거하거나 전환하지 않는다.

## Acceptance Criteria

- [ ] Characterization tests가 current round trip에서 보존할 same-Turn interaction·failure semantics와 폐기할 academic durability·double-confirmation semantics를 명시적으로 구분한다.
- [ ] Public MCP, private wire와 Browser-safe Review codec이 valid exact value를 decode하고 모든 additional field, malformed union, byte·cardinality 초과와 forbidden identity field를 거절한다.
- [ ] Built STDIO executable이 valid environment와 authenticated handshake에서 `propose_state_patch` 하나만 광고하고, invalid environment·handshake·Broker error를 bounded safe MCP failure로 반환한다.
- [ ] 한 valid tool call이 정확히 한 held POST와 한 structured result를 만들며 timeout·abort·transport loss에서 normal result나 automatic retry를 만들지 않는다.
- [ ] Package root export, build output, shebang·mode와 workspace scripts가 clean checkout에서 반복 검증된다.
- [ ] Current public product composition과 기존 characterization suite는 이 slice 뒤에도 green이다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/interaction-mcp && npm test -w @ay-ple/product-contract`
- Repository checks: `npm run typecheck && npm run build && npm test`
- Manual or live smoke: Built STDIO Adapter를 mock loopback Broker와 실행해 initialize → tools/list → held call → result 및 handshake 거절을 관찰한다.

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
