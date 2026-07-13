# 017 — commandExecution approval의 첫 round-trip을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)

## Question

`T0.1` tracer에서 matching active turn의 fake child가 `item/commandExecution/requestApproval`을 보낼 때, `CodexAppServerConnection`은 original `RequestId`의 direction-aware same-ID routing, result/error write-once와 terminal release를 어떻게 소유하고, `CodexConversationRuntime`의 per-thread owner는 native thread·turn·item과 optional approval identity를 어떤 최소 safe pending command approval로 상관할 것인가?

Caller의 `approve_once | decline | cancel`을 generated `accept | decline | cancel` typed response로 original `RequestId`에 한 번만 쓰고, response write·`serverRequest/resolved`·turn terminal·connection close와 late caller answer가 경합할 때 variant-specific pending lifecycle을 어떻게 끝낼 것인가?

[첫 Server request variant 비교](../assets/008-server-request-variant-comparison.md)의 근거를 사용하되 `acceptForSession`, exec·network policy amendment, additional permissions, remembered·automatic approval, 실제 browser UI·audit record와 다른 Server request variant는 포함하지 않는다. Package-private source-guided envelope lifecycle은 재사용하지만 public generic responder와 product approval policy는 만들지 않는다. Answer는 command approval inventory row, source/test evidence, deterministic fake-child oracle과 필요한 narrow live probe를 연결하되 구현 gate 전 integration status를 승격하지 않는다.

## Answer

Ticket을 resolve할 때 작성한다.
