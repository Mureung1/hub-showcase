# 008 — 첫 tracer와 module seam을 선택한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/002-audit-host-consumers-and-compatibility.md, tickets/007-review-source-evidence-alignment.md

## Question

“Codex 사용 용례 위에 AY-PLE 기능을 올린다”는 원칙을 가장 작은 end-to-end 행동으로 증명하는 첫 tracer는 무엇이며, 그 tracer를 위해 `ProductRuntimeLayout`, `CodexAppServerClient`, conversation use-case module과 local web adapter 사이의 Interface·seam을 어디에 두어야 하는가?

권고 출발점은 명시적 workspace에서 conversation 하나를 시작하고 text turn 하나의 agent message와 authoritative terminal을 browser-safe 결과로 관찰하는 vertical tracer다.

## Answer

Ticket을 resolve할 때 작성한다.
