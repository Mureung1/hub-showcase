# 010 — Thread·turn concurrency 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md)

## Question

T0의 max-one/no-queue composite-operation admission과 native `ThreadId`별 semantic owner를 baseline으로 두고, 채택한 method의 pinned source/test legal transition을 보존하면서 같은 thread mutation admission과 서로 다른 thread의 ingress·RPC·semantic 진행을 어느 tracer부터 독립적으로 허용할 것인가? `turn/steer`·`turn/interrupt`는 해당 inventory row를 채택한 tracer에서만 추가하고, cross-thread scheduler artifact를 global causal order로 만들지 않는다.

Runtime admission과 AY-PLE의 reject·queue·steer UX를 분리하며 product policy는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)에 남긴다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## Answer

Ticket을 resolve할 때 작성한다.
