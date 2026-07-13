# 003 — 초기화된 장기 실행 Host lifecycle을 연다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

Immutable raw product layout input을 받은 one-workspace Headless Codex Client Host가 첫 `start()`에서 preflight를 수행·cache하고 App Server child 하나를 시작한다. `initialize` response와 `initialized` notification을 완료한 뒤에만 `ready` snapshot을 공개한다. Caller는 raw process나 protocol을 보지 않고 `start`, `stop`, current snapshot과 atomic normalized lifecycle subscription을 사용할 수 있다.

동시 start는 하나의 handshake로 수렴하고 반복 stop은 안전하다. Preflight, spawn과 initialize failure는 sanitized failure와 계약에 맞는 `recoverable` 값으로 표현된다. Stop은 child exit를 확인한 경우에만 `stopped`를 공개하며, force-kill 뒤에도 종료를 확인하지 못하면 non-recoverable cleanup failure로 fail closed해 orphan 가능성을 성공으로 숨기지 않는다.

## Spec Traceability

- User stories: 1, 4, 7
- Implementation contract: `Module Responsibilities and Seams`, `Host lifecycle`, `Data and State Flow` 1–3·8, `Failure Behaviour`의 startup·stop

## Slice-Specific Constraints

- Host는 `AgentRuntimeKernel`과 별도 deep module이며 Runtime Diagnostic History를 사용하지 않는다.
- Host constructor는 immutable `ProductRuntimeLayoutInput`을 받고, 첫 `start()`가 `prepareProductRuntimeLayout()`을 수행한다. 성공한 validated layout만 Host 수명 동안 cache하며 후속 explicit restart는 이 cache를 재사용한다. Preflight failure는 `starting → failed` lifecycle로 publish하고, non-recoverable layout failure인 같은 Host에서 restart하지 않는다.
- Host instance는 validated `packageRoot`, `appDataRoot`, `workspaceRoot` 한 조합과 child process 하나를 소유한다.
- Child `cwd`는 exact `workspaceRoot`이고 runtime-home environment는 ticket 001의 pair만 사용한다.
- Lifecycle snapshot은 최소 `status`, monotonic `generation`, sanitized failure와 `recoverable`을 제공한다.
- `ready`는 matching `initialize` response 뒤 `initialized`를 전송한 다음에만 공개한다.
- Successful child spawn마다 generation을 한 번 발급한다. Explicit restart와 thread·turn은 후속 ticket 범위다.
- Generation은 Ticket 002 transport의 coalesced `start()` Promise가 actual child `spawn` event에서 resolve한 직후 발급한다. Request dispatch 시점이나 initialize response 시점으로 추측하지 않는다.
- 각 start operation은 lifecycle epoch/token을 갖는다. `await transport.start()`와 각 handshake await 뒤 token이 아직 current인지 확인하고, `stop()`이 먼저 시작해 stale이 된 operation은 generation을 발급하거나 `initialize`를 보내거나 `ready`를 publish하지 않는다.
- Host는 Ticket 002 transport의 single-consumer observation stream을 request 전에 한 번 claim하고 pump의 첫 `next()`가 대기 중임을 보장한 다음 `initialize`를 dispatch한다. Pump의 terminal observation은 현재 lifecycle token을 통해 Host failure로 연결하고 pump `finally`가 transport `close()`를 완료한다.
- Ticket 002의 `observation_queue_limit`은 자유 형식 message가 아니라 stable code로 분류해 non-recoverable `protocol_error` Host failure로 mapping한다. 같은 Host에서 restart loop를 만들지 않는다.
- `initialize` success result는 Ticket 002의 package-internal generated response schema validation을 통과해야 한다. Malformed result는 `ready`를 publish하지 않고 non-recoverable `protocol_error`로 현재 connection을 닫는다.
- Public subscription은 subscriber 등록과 `{ snapshot, cursor }` capture를 원자적으로 수행하고, `cursor`는 snapshot에 반영된 마지막 sequence를 뜻한다. 같이 반환한 `events` AsyncIterable과 `unsubscribe()`를 제공하며 capture 중 발생한 `sequence > cursor` event는 subscriber-local buffer에 들어간다. 각 buffer는 fixed event-count cap으로 bounded한다. Pull이 멈춰 cap을 넘으면 해당 `events`만 stable typed `subscription_overflow`로 종료하고 buffer를 해제하며 Host lifecycle, child와 다른 subscriber는 유지한다. Connection loss로 subscription을 닫지 않고 explicit unsubscribe, Host stop 또는 자신의 overflow에서 종료한다. SSE framing과 별도 HTTP writer backpressure는 ticket 008이 소유한다.
- Product Host는 raw stdio, child stderr, environment, root path와 Runtime Diagnostic History evidence를 공개하거나 축적하지 않는다.
- Host와 generated-schema-backed transport는 같은 Node-side Codex integration boundary 안에 둔다. 별도 package를 선택하더라도 generated/raw type을 public export해 두 module 사이의 seam으로 만들지 않는다.
- 기존 Runtime Harness의 `CodexRawClient`, `CodexRuntimeAdapter`와 Inspector contract를 Host contract로 바꾸지 않는다.

## Acceptance Criteria

- [x] Public Host Interface로 `stopped → starting → ready`와 `ready → stopping → stopped` 전이를 관측할 수 있다.
- [x] `starting` 중 `stop()`이 시작하면 `starting → stopping → stopped`로 수렴하고 stale start completion이 generation, `initialize` 또는 `ready`를 추가하지 않는다.
- [x] Concurrent `start` 호출은 child spawn, `initialize` request와 `initialized` notification을 각각 한 번만 수행한다.
- [x] 이미 `ready`인 `start`와 반복 `stop`은 idempotent다.
- [x] Invalid layout은 child spawn 전에 non-recoverable `failed` snapshot으로 수렴한다.
- [x] Preflight 뒤 transient spawn failure와 initialize timeout/error는 recoverable `failed`로 수렴하고 child·pending operation을 정리한다.
- [x] Async spawn error는 generation을 소비하지 않고, successful spawn 뒤 initialize timeout/error는 generation을 정확히 한 번 소비한다.
- [x] Host가 immutable raw layout input을 보존하고 first-start preflight 성공만 Host-lifetime cache로 보존하며, 후속 explicit restart가 validated cache를 재사용할 seam을 남기고 non-recoverable preflight failure는 같은 Host에서 child를 시작하지 않는다.
- [x] Observation pump의 첫 `next()`가 `initialize` request 전에 single consumer로 대기하고 terminal에서 transport cleanup을 완료하며, malformed `initialize` success result는 `ready`를 공개하지 않은 채 non-recoverable `protocol_error`로 connection을 닫는다.
- [x] Injected tiny observation queue의 overflow가 bounded terminal `observation_queue_limit`을 만들고 Host는 이를 non-recoverable `protocol_error`로 한 번 publish한 뒤 child를 정리한다.
- [x] Stop 중 신규 operation을 받지 않으며 graceful deadline이 끝나면 강제 종료한다. Exit를 확인한 경우에만 `stopped`를 공개하고 `close_timeout`이면 non-recoverable cleanup failure로 fail closed해 orphan 가능성을 성공으로 숨기지 않는다.
- [x] Lifecycle event는 generation, monotonic sequence, timestamp와 allowlisted state만 포함한다.
- [x] Subscription 등록과 `{ snapshot, cursor }` capture가 원자적이고 capture 중 event가 유실되지 않으며, connection failure 후에도 같은 subscriber가 lifecycle event를 계속 받는다.
- [x] Injected small core subscriber cap에서 pull을 멈춘 subscriber의 `events`만 stable `subscription_overflow`로 종료되고 buffer가 해제되며, Host·child·다른 subscriber는 ordered event를 계속 받는다. 새 subscription은 최신 atomic `{ snapshot, cursor }`로 수렴한다.
- [x] Host public snapshot/event를 재귀 검사했을 때 raw JSON-RPC, raw ID, token, environment, roots, stderr와 debug payload가 없다.
- [x] `initialize`와 `initialized`만 실제 Host path에 연결된 단계로 method decision과 generated inventory를 갱신한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex` — 통과, 114개 test.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector` — 모두 통과. Runtime Core 50개, Runtime Codex 114개, Server 53개와 Inspector Playwright 6개 test를 포함한다.
- Generated artifacts: `npm run generate:codex-methods -w @ay-ple/runtime-codex` — 통과. `initialize`와 `initialized`의 `client-host` 승격 외 예상하지 않은 inventory diff가 없다.
- Code review: fixed point `b9d4a8199f6d63b25a4ab0a1a453c6f785f3af81` 기준 Standards finding 1건과 Spec finding 0건을 확인했고 Standards finding은 `af4362eb`에서 반영했다.
- Manual or live smoke: 없음 — public Host Interface + actual fake child + fixture journal로 spawn/handshake/cleanup을 검증한다.

## Result

`@ay-ple/runtime-codex`에 `HeadlessCodexClientHost` deep module과 product-safe lifecycle snapshot, event, subscription 및 stable error 타입을 추가했다. Host는 첫 `start()`에서 validated product layout을 cache하고 exact workspace `cwd`, allowlisted inherited environment와 exact runtime-home pair로 App Server child를 시작한다. Actual spawn 뒤에만 generation을 발급하고 generated schema로 검증한 `initialize` response와 `initialized` write가 모두 끝난 뒤 `ready`를 공개한다.

Lifecycle epoch가 preflight·spawn·handshake 중 stop race의 stale completion을 차단한다. Connection failure는 sanitized allowlist failure로 mapping하고 subscription은 유지하며, successful stop은 최종 `stopped` event를 drain한 뒤 subscription을 닫는다. Subscriber-local bounded buffer overflow, observation queue overflow, force-kill 종료 미관측과 non-recoverable layout failure는 각각 계약에 맞게 fail closed한다. Thread·turn, pending interaction, explicit restart, HTTP/SSE와 제품 UI는 후속 ticket 범위로 남겼고 parent spec과 canonical backlog는 완료 처리하지 않았다.

Actual fake package binary와 fixture journal은 exact cwd/runtime-home, single handshake, observation consumer ordering, process cleanup과 race를 검증한다. `initialize`와 `initialized`만 method decision의 `client-host` 단계로 승격했으며 package README, generated method inventory와 Runtime Harness 구현 지도를 현재 lifecycle에 맞게 갱신했다.

구현 커밋:

- `24386279` — `feat: add initialized Codex client host`
- `04ff65ab` — `fix: harden Codex client host lifecycle`
- `a29ead53` — `docs: record Codex client host integration`
- `8b8f5eac` — `test: stabilize Codex host fixture journal`
- `af4362eb` — `refactor: centralize Codex host spawn failure`

다음 frontier는 fresh session의 Ticket 004다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md` — 제품 runtime layout을 spawn 전에 검증한다
- `docs/tickets/2026-07-12-headless-codex-client-host/002-bidirectional-stdio-transport.md` — stdio transport에서 네 protocol direction을 왕복한다

## Starting Points

- Ticket 001이 만든 product layout seam
- Ticket 002가 만든 bidirectional transport와 fixture journal
- `packages/runtime-codex/src/index.ts`의 product-safe export boundary
- `packages/runtime-codex/src/adapter.ts`는 호환성 기준일 뿐 Host 구현 기반이 아님
- `docs/adr/0008-separate-headless-codex-client-host-from-product-ui.md`
