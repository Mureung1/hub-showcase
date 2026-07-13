# 009 — Identity authority와 product reference 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md

## Question

Native `ThreadId`, root·descendant가 공유하는 `SessionId`와 lineage, live·replay 경로별 turn/item identity를 어느 module이 authoritative하게 소유하고, persistence 상태별 lifetime·restart recoverability를 어떻게 구분하며, AY-PLE product/domain·browser에는 어떤 identity를 언제까지 노출할 것인가? 별도 opaque ref remapping과 connection generation invalidation은 실제 용례가 필요로 할 때 어느 adapter에서 도입해야 하는가?

## Answer

Ticket을 resolve할 때 작성한다.
