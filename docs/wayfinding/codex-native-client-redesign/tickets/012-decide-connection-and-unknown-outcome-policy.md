# 012 — Connection loss와 unknown outcome 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md, tickets/010-decide-concurrency-policy.md, tickets/011-decide-delivery-and-recovery-model.md

## Question

Initialize·read-only·non-idempotent mutation·active turn 도중 connection loss와 timeout을 어떻게 구분하고, transport terminal·unknown outcome·product restart UX·native thread resume의 책임을 어느 module이 소유하며, 어떤 경우에만 자동 행동을 금지할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
