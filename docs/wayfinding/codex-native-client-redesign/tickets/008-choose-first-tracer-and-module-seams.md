# 008 — 첫 tracer와 module seam을 선택한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/002-audit-host-consumers-and-compatibility.md, tickets/007-review-source-evidence-alignment.md

## Question

“Codex 사용 용례 위에 AY-PLE 기능을 올린다”는 원칙을 가장 작은 end-to-end 행동으로 증명하는 첫 tracer는 무엇이며, 그 tracer를 위해 `ProductRuntimeLayout`, `CodexAppServerClient`, conversation use-case module과 local web adapter 사이의 Interface·seam을 어디에 두어야 하는가?

권고 출발점은 명시적 workspace에서 conversation 하나를 시작하고 text turn 하나의 agent message와 authoritative terminal을 browser-safe 결과로 관찰하는 vertical tracer다.

선택한 tracer가 Server request를 요구하는지, 요구하지 않는다면 first supported request variant를 어떤 실제 후속 tracer에서 선택할지도 명시한다. 구체 variant가 정해지기 전에는 generic responder admission·bound·expiry·once-only policy를 선결정하지 않고, variant를 선택한 시점에 필요한 decision ticket과 client-level owner를 만든다.

## Answer

Ticket을 resolve할 때 작성한다.
