# 011 — Event delivery와 transcript recovery model을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md

## Question

첫 tracer가 관찰하는 agent text·item·turn terminal과 progress notification을 어떤 delivery class와 bounded retention으로 다루고, saturation을 어떤 explicit outcome으로 드러낼 것인가? Persistence/history 상태별 `thread/read` availability와 synthesized replay identity를 구분하면서 native history를 어떤 authoritative backfill·refresh source로 사용해 custom global journal 없이 live view와 복원을 조합할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
