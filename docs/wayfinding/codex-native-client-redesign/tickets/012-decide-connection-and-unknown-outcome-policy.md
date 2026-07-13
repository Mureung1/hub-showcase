# 012 — Connection loss와 unknown outcome 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md, tickets/010-decide-concurrency-policy.md, tickets/011-decide-delivery-and-recovery-model.md

## Question

정상 browser detach·graceful connection close·`thread/unsubscribe`·idle unload·process reap과 Initialize·read-only·non-idempotent mutation·active turn 도중 connection loss·timeout을 어떻게 구분할 것인가? Child·ingress·pending RPC·Server request responder·projection task의 cleanup owner와 completion authority, transport terminal·unknown outcome·product restart UX·persistence 상태별 native thread resume 책임을 어느 module이 소유하며, 어떤 경우에만 자동 행동을 금지할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
