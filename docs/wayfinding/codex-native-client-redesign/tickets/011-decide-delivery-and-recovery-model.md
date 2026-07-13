# 011 — Event delivery와 transcript recovery model을 결정한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md)

## Question

`CodexAppServerConnection`은 raw JSONL·envelope work를 bounded하게 처리하고 transport terminal을 보고하며, `CodexConversationRuntime`은 채택한 row의 pinned source/test 근거에 따라 same-thread late·duplicate·terminal observation을 처리한다. 이 경계에서 T0/T0.1 observation의 delivery class·bound·saturation outcome과 terminal 반환 뒤 ingress drain·per-thread owner retention을 어떻게 정할 것인가? Upstream이 정의하지 않은 duplicate 의미는 AY-PLE deviation으로 명시하고 runtime에 product/global ordered journal을 만들지 않는다.

Native history와 `thread/read` recovery는 그 row의 tracer를 채택할 때만 설계하고, browser retention·replay는 `AYPLE adapter`에 남긴다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## Answer

Ticket을 resolve할 때 작성한다.
