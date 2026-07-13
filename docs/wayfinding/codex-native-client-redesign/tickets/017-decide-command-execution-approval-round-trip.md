# 017 — commandExecution approval의 첫 round-trip을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/009-decide-identity-and-authority.md, tickets/010-decide-concurrency-policy.md, tickets/011-decide-delivery-and-recovery-model.md, tickets/012-decide-connection-and-unknown-outcome-policy.md

## Question

`T0.1` tracer에서 matching active turn의 fake child가 `item/commandExecution/requestApproval`을 보낼 때, native request·thread·turn·item과 optional approval identity를 어느 client-level owner가 보존하고 어떤 최소 safe pending command approval로 투영할 것인가?

Caller의 `accept | decline | cancel`을 generated typed response로 original `RequestId`에 한 번만 쓰고, response write·`serverRequest/resolved`·turn terminal·connection close와 late caller answer가 경합할 때 variant-specific pending lifecycle을 어떻게 끝낼 것인가?

[첫 Server request variant 비교](../assets/008-server-request-variant-comparison.md)의 근거를 사용하되 `acceptForSession`, exec·network policy amendment, additional permissions, remembered·automatic approval, 실제 browser UI·audit record와 다른 Server request variant는 포함하지 않는다. Generic responder Interface나 variant-independent admission·expiry 정책도 만들지 않고, deterministic fake-child oracle과 필요한 narrow live probe만 결정한다.

## Answer

Ticket을 resolve할 때 작성한다.
