# 003 — 초기화된 장기 실행 Host lifecycle을 연다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

Validated product layout에 bound된 one-workspace Headless Codex Client Host가 App Server child 하나를 시작하고 `initialize` response와 `initialized` notification을 완료한 뒤에만 `ready` snapshot을 공개한다. Caller는 raw process나 protocol을 보지 않고 `start`, `stop`, current snapshot과 normalized lifecycle subscription을 사용할 수 있다.

동시 start는 하나의 handshake로 수렴하고 반복 stop은 안전하다. Preflight, spawn과 initialize failure는 sanitized failure와 계약에 맞는 `recoverable` 값으로 표현되며, stop deadline 뒤에도 orphan child를 남기지 않는다.

## Spec Traceability

- User stories: 1, 4, 7
- Implementation contract: `Module Responsibilities and Seams`, `Host lifecycle`, `Data and State Flow` 1–3·8, `Failure Behaviour`의 startup·stop

## Slice-Specific Constraints

- Host는 `AgentRuntimeKernel`과 별도 deep module이며 Runtime Diagnostic History를 사용하지 않는다.
- Host instance는 validated `packageRoot`, `appDataRoot`, `workspaceRoot` 한 조합과 child process 하나를 소유한다.
- Child `cwd`는 exact `workspaceRoot`이고 runtime-home environment는 ticket 001의 pair만 사용한다.
- Lifecycle snapshot은 최소 `status`, monotonic `generation`, sanitized failure와 `recoverable`을 제공한다.
- `ready`는 matching `initialize` response 뒤 `initialized`를 전송한 다음에만 공개한다.
- Successful child spawn마다 generation을 한 번 발급한다. Explicit restart와 thread·turn은 후속 ticket 범위다.
- Generation은 Ticket 002 transport의 coalesced `start()` Promise가 actual child `spawn` event에서 resolve한 직후 발급한다. Request dispatch 시점이나 initialize response 시점으로 추측하지 않는다.
- Product Host는 raw stdio, child stderr, environment, root path와 Runtime Diagnostic History evidence를 공개하거나 축적하지 않는다.
- Host와 generated-schema-backed transport는 같은 Node-side Codex integration boundary 안에 둔다. 별도 package를 선택하더라도 generated/raw type을 public export해 두 module 사이의 seam으로 만들지 않는다.
- 기존 Runtime Harness의 `CodexRawClient`, `CodexRuntimeAdapter`와 Inspector contract를 Host contract로 바꾸지 않는다.

## Acceptance Criteria

- [ ] Public Host Interface로 `stopped → starting → ready`와 `ready → stopping → stopped` 전이를 관측할 수 있다.
- [ ] Concurrent `start` 호출은 child spawn, `initialize` request와 `initialized` notification을 각각 한 번만 수행한다.
- [ ] 이미 `ready`인 `start`와 반복 `stop`은 idempotent다.
- [ ] Invalid layout은 child spawn 전에 non-recoverable `failed` snapshot으로 수렴한다.
- [ ] Preflight 뒤 transient spawn failure와 initialize timeout/error는 recoverable `failed`로 수렴하고 child·pending operation을 정리한다.
- [ ] Async spawn error는 generation을 소비하지 않고, successful spawn 뒤 initialize timeout/error는 generation을 정확히 한 번 소비한다.
- [ ] Stop 중 신규 operation을 받지 않으며 graceful deadline이 끝나면 강제 종료해 orphan process를 남기지 않는다.
- [ ] Lifecycle event는 generation, monotonic sequence, timestamp와 allowlisted state만 포함한다.
- [ ] Host public snapshot/event를 재귀 검사했을 때 raw JSON-RPC, raw ID, token, environment, roots, stderr와 debug payload가 없다.
- [ ] `initialize`와 `initialized`만 실제 Host path에 연결된 단계로 method decision과 generated inventory를 갱신한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — public Host Interface + actual fake child + fixture journal로 spawn/handshake/cleanup을 검증한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md` — 제품 runtime layout을 spawn 전에 검증한다
- `docs/tickets/2026-07-12-headless-codex-client-host/002-bidirectional-stdio-transport.md` — stdio transport에서 네 protocol direction을 왕복한다

## Starting Points

- Ticket 001이 만든 product layout seam
- Ticket 002가 만든 bidirectional transport와 fixture journal
- `packages/runtime-codex/src/index.ts`의 product-safe export boundary
- `packages/runtime-codex/src/adapter.ts`는 호환성 기준일 뿐 Host 구현 기반이 아님
- `docs/adr/0008-separate-headless-codex-client-host-from-product-ui.md`
