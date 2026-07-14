# 009 — browser-safe Host command와 same-origin 경계를 제공한다

## Agent triage

- State: wontfix
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## Superseded

이 ticket의 browser-safe Host command 계약은 [ADR 0010](../../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)의 runtime foundation 범위가 아니다. AY-PLE 제품 adapter와 browser 계약은 foundation conformance를 통과한 뒤 별도 제품 goal에서 결정하며 아래 인수 조건은 당시 계획 근거로만 남긴다.

## What It Delivers

Browser caller가 dedicated HTTP JSON contract를 통해 Host lifecycle, persistent thread start, text turn start, native Skills discovery와 pending interaction response를 사용할 수 있다. Local companion은 input을 검증해 Host Interface의 product-safe command로 번역하고, validation, readiness, stale ref, conflict, transport와 protocol failure를 stable error envelope로 구분한다.

Product mutation은 same-origin local shell에서만 허용된다. Browser는 command별 `cwd`, binary, environment와 runtime-home을 바꿀 수 없고 raw protocol·secret·debug evidence를 request나 response로 받지 않는다.

## Spec Traceability

- User stories: 2, 3, 5, 6
- Implementation contract: `In-scope Host operations`, `Browser-safe adapter and product shell`의 command·error·same-origin 규칙, `Failure Behaviour`, `Implementation Decisions`의 HTTP+SSE·same-origin

## Slice-Specific Constraints

- Minimum stable error codes는 `invalid_request`, `host_not_ready`, `stale_reference`, `operation_conflict`, `request_timeout`, `operation_failed`, `transport_lost`와 `protocol_error`를 구분한다. Authoritative App Server error와 read-only request timeout은 각각 `operation_failed`, `request_timeout`으로 mapping하고 connection-scoped failure로 바꾸지 않는다.
- Lifecycle command의 idempotency와 interaction response의 one-shot semantics는 Host contract를 그대로 보존한다.
- `thread start`와 `turn start`는 non-idempotent이며 HTTP/client adapter가 timeout이나 connection loss 뒤 자동 retry하지 않는다. Mutation timeout의 initiating response는 `request_timeout`이지만 authoritative Host snapshot은 outcome unknown인 recoverable `failed`다. 그 뒤 같은 Host의 mutation은 explicit restart로 새 generation이 `ready`가 되기 전까지 `host_not_ready`로 거부한다.
- Command body에 `packageRoot`, `appDataRoot`, `workspaceRoot`, arbitrary `cwd`, binary path, environment, raw ID와 generated protocol shape를 받지 않는다.
- Product mutation route에는 현재 server의 wildcard `cors()` 허용을 그대로 적용하지 않는다. Configured local shell origin과 request host를 일관되게 검증한다.
- DTO validation과 mapping은 thin adapter여야 하며 Host lifecycle/state를 복제하거나 Runtime Inspector kernel을 호출하지 않는다.
- Thread list/read/resume, transcript, interrupt, account와 approval UI는 범위 밖이다.

## Acceptance Criteria

- [ ] Actual loopback HTTP에서 start/stop/restart, thread start, turn start, Skills read와 네 pending interaction answer command가 product-safe DTO로 동작한다.
- [ ] Missing/invalid body, unknown field와 잘못된 answer variant는 raw Host/transport call 전에 `invalid_request`로 거부된다.
- [ ] Host not-ready, stale generation ref, same-thread active-turn conflict와 transport/protocol failure가 각각 stable error envelope로 mapping된다.
- [ ] Skills read 같은 read-only request timeout과 authoritative App Server operation error가 각각 `request_timeout`과 `operation_failed` envelope로 mapping되고, 응답 뒤 snapshot은 같은 generation의 `ready`를 유지하며 `transport_lost`·`protocol_error` transition이 없다.
- [ ] `thread start`와 `turn start` timeout의 initiating HTTP response는 `request_timeout`으로 mapping되지만 Host snapshot은 outcome unknown인 recoverable `failed`로 수렴하고, explicit restart 전 후속 mutation은 raw write 없이 `host_not_ready`로 끝난다.
- [ ] Unknown 또는 duplicate interaction answer가 App Server response를 쓰지 않고 `stale_reference` 또는 `operation_conflict`로 끝난다.
- [ ] Non-idempotent thread/turn command의 timeout과 connection loss test가 늦은 response 뒤에도 자동 retry나 duplicate raw request가 없음을 fixture journal로 증명한다.
- [ ] Allowed local same-origin mutation은 성공하고 foreign/missing-invalid Origin 또는 host mismatch는 product mutation 전에 거부된다.
- [ ] Existing global CORS middleware가 product mutation namespace를 wildcard origin에 노출하지 않는다.
- [ ] Recursive request/response audit에서 raw IDs, generated type, auth, environment, roots, stderr와 debug/history field가 없다.
- [ ] 실제 command/event가 browser boundary까지 연결된 method만 sparse decision의 `web-adapter` 단계로 갱신하고 inventory를 재생성한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/server`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — actual loopback HTTP/SSE와 deterministic fake child가 command/security contract를 소유한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/007-native-discovery-and-live-parity.md` — native Skills discovery와 live Host parity를 증명한다
- `docs/tickets/2026-07-12-headless-codex-client-host/008-atomic-browser-state-stream.md` — atomic browser snapshot/SSE stream을 제공한다

## Starting Points

- Ticket 008의 product namespace, sanitized DTO와 Host composition
- Ticket 007의 native Skills Host operation
- `apps/server/src/server.ts`의 middleware ordering과 global `cors()`
- `apps/server/src/server.test.ts`의 validation/error integration tests
- Host public error taxonomy와 pending interaction answer union
