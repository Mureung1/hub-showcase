# 008 — atomic browser snapshot/SSE stream을 제공한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

Local companion이 Runtime Harness와 분리된 product namespace에서 Host instance를 소유하고, browser는 actual loopback SSE를 통해 sanitized current snapshot과 normalized live event를 받는다. 연결의 첫 event는 atomic subscription에서 얻은 `{ snapshot, cursor }`이며, 등록 중 발생한 event는 cursor 이후 sequence로 buffer되어 snapshot과 live stream 사이에서 유실되지 않는다.

Reconnect는 최신 snapshot과 pending interaction에 수렴하지만 disconnect 동안의 agent text delta나 completed activity를 durable replay한다고 약속하지 않는다. Server/test shutdown은 소유한 Host와 child를 정리하며 기존 `/api/runtime/*`와 Inspector lifecycle은 그대로 유지된다.

Core atomic subscription의 등록·snapshot capture·buffer 의미는 ticket 003이 소유한다. 이 ticket은 그 public Host contract를 소비해 SSE framing, browser DTO, writer backpressure와 subscriber cleanup만 구현한다.

## Spec Traceability

- User stories: 4, 6, 7
- Implementation contract: `Module Responsibilities and Seams`의 Local companion composition, `Browser-safe adapter and product shell`의 subscription·SSE·DTO, `Compatibility and Migration`, `Testing Decisions`의 Browser adapter

## Slice-Specific Constraints

- Product route는 dedicated namespace를 사용하고 `/api/runtime/*`의 lifecycle owner, state와 diagnostic history를 공유하지 않는다.
- Server composition은 injected Host 또는 ticket 001의 validated `packageRoot`, `appDataRoot`, `workspaceRoot` product configuration을 명시적으로 받는다. Harness의 `CodexRawClientOptions`, `CODEX_RUNTIME_CWD`, 독립 `CODEX_HOME`/`CODEX_SQLITE_HOME` override와 repository-local default를 product Host 구성에 재사용하지 않는다.
- Local companion은 ticket 003의 atomic Host subscription `{ snapshot, cursor, events, unsubscribe }`를 그대로 소비한다. Subscriber 등록과 snapshot capture semantics를 HTTP layer에서 복제하거나 별도 event cursor를 만들지 않는다.
- SSE는 initial `{ snapshot, cursor }`를 먼저 flush한 뒤 buffered `sequence > cursor` event와 live event를 순서대로 보낸다.
- SSE writer로 넘기는 subscriber-local pending queue는 fixed event-count 또는 byte budget으로 bounded한다. Slow writer의 backpressure가 해소되지 않거나 overflow되면 해당 Host subscriber만 unsubscribe하고 SSE를 닫으며, event를 건너뛰고 cursor가 연속인 것처럼 보이지 않는다. Reconnect는 새 atomic Host subscription의 최신 snapshot으로 수렴한다.
- Basic HTTP/SSE integration은 actual Host + fake child를 통과한다. Snapshot flush 직전 event를 삽입하는 race는 timing에 의존하지 않도록 ticket 003 public subscription contract를 구현한 deterministic test double로 제어하며, core atomicity를 이 ticket에서 다시 구현하지 않는다.
- Snapshot과 event는 product-safe DTO만 사용한다. Raw JSON-RPC, generated type, raw IDs, token, environment, roots, stderr와 debug history를 포함하지 않는다.
- Opaque Host refs는 허용하지만 browser가 그 값에서 native identity나 filesystem 정보를 유추할 수 없어야 한다.
- Product Host diagnostic은 allowlisted bounded metadata만 사용하며 Runtime Diagnostic History를 재사용하지 않는다.
- Product snapshot/SSE read route도 wildcard CORS 대상이 아니다. Middleware/mount ordering은 foreign origin에 pending interaction display state와 Host state를 공개하지 않는다.
- Product listener는 explicit loopback address에만 bind한다. Host를 생략하거나 `0.0.0.0`·`::` wildcard interface에 bind하지 않는다.
- Browser contract/client는 browser-compatible dependency boundary에 두고 server module이나 `@ay-ple/runtime-codex` Node entry에 의존하지 않는다.
- 이 ticket은 read-only state/event stream만 만든다. Mutation command와 React shell은 후속 ticket이다.
- 기존 `createServerApp(): Express` seam을 불필요한 repository-wide migration으로 바꾸지 않되 composition owner가 Host cleanup을 호출할 수 있어야 한다.

## Acceptance Criteria

- [ ] Actual loopback listener와 deterministic Host/fake child를 통과하는 product SSE integration test가 있다.
- [ ] Server test가 injected Host 또는 validated three-root product configuration만으로 Host를 구성하고 Harness env/default를 product child cwd/home/binary resolution에 사용하지 않음을 증명한다.
- [ ] Initial SSE event가 항상 `{ snapshot, cursor }`이고 어떤 live event보다 먼저 전달된다.
- [ ] Ticket 003 subscription contract의 deterministic test double이 snapshot flush 직전 event를 주입하고 adapter가 cursor 이후 event를 빠짐없이 sequence 순서로 frame하는지 timing 의존 없이 증명한다.
- [ ] Injected small queue budget과 deterministic slow writer가 overflow 시 해당 SSE subscriber만 끊고 Host·다른 subscriber는 유지하며, reconnect가 최신 snapshot/cursor로 수렴함을 증명한다.
- [ ] Reconnect가 최신 connection/thread/active-turn/pending-interaction snapshot으로 수렴한다.
- [ ] Disconnect 동안 text delta와 completed activity를 durable replay하지 않는 계약이 test와 adapter 문서에 명확하다.
- [ ] Recursive DTO audit가 raw protocol, raw IDs, secret, environment, roots, stderr와 debug/history field 부재를 검증한다.
- [ ] Same-origin local read stream은 연결되고 foreign-origin request에는 wildcard CORS header나 readable product snapshot/SSE payload를 제공하지 않는다.
- [ ] Actual listener의 `server.address()`와 접속 test가 explicit loopback bind를 확인하고 wildcard/non-loopback interface 노출을 허용하지 않는다.
- [ ] SSE disconnect는 Host process와 pending interaction을 종료하지 않으며 server/test shutdown은 child를 정리한다.
- [ ] Existing `/api/runtime/*` server tests와 Inspector desktop gate가 회귀하지 않는다.
- [ ] 실제 stream에 연결된 normalized method만 sparse decision의 `web-adapter` 단계로 승격하고 inventory를 재생성한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/server`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — actual loopback HTTP/SSE + deterministic fake Host integration이 소유한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/006-connection-loss-and-restart-fencing.md` — connection loss를 generation fencing과 명시적 restart로 처리한다

## Starting Points

- Ticket 003에서 정의되고 Ticket 006까지 restart 연속성이 검증된 Host atomic snapshot/event/subscription contract
- `apps/server/src/server.ts`의 current Express composition과 Runtime SSE route
- `apps/server/src/server.test.ts`의 actual HTTP/SSE test pattern
- `apps/server/src/testing/test-server.ts`
- `apps/inspector/e2e/inspector-harness.ts`의 process cleanup 선례
