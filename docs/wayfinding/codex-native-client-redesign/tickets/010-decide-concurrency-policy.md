# 010 — Thread·turn concurrency 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md

## Question

같은 thread의 active turn 중 새 input을 reject·queue·steer 중 무엇으로 처리하고, 서로 다른 thread의 product-level 진행을 어느 tracer부터 독립적으로 보장하며, single consumer response barrier에서 native `ThreadId`별 semantic owner로 넘어갈 구체적 필요 조건은 무엇인가?

## Answer

Ticket을 resolve할 때 작성한다.
