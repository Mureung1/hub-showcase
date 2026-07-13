# 012 — Connection loss와 unknown outcome 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)

## Question

`CodexAppServerConnection`의 child·stdio·single ingress·pending RPC·process terminal과 `CodexConversationRuntime`의 method별 in-flight semantic outcome·completion authority를 어떤 owner matrix와 precedence로 끝낼 것인가? Initialize·read-only request·non-idempotent mutation·active turn 도중 timeout/loss를 구분하고, unknown mutation outcome을 성공으로 합성하거나 자동 replay하지 않는다. `thread/unsubscribe`·resume·idle unload는 해당 inventory row의 tracer가 채택될 때만 확장한다.

Browser detach·restart UX는 `AYPLE adapter` 책임으로 남기고 connection cleanup과 섞지 않는다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## Answer

Ticket을 resolve할 때 작성한다.
