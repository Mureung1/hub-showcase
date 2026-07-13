# 011 — Event delivery와 transcript recovery model을 결정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md

## Question

Agent text·item·turn terminal과 progress notification 중 무엇을 lossless·best-effort로 다루고, Server request의 admission·queue/byte bound·saturation·expiry·once-only responder lifecycle을 notification delivery와 어떻게 분리할 것인가? Persistence/history 상태별 `thread/read` availability와 synthesized replay identity를 구분하면서 native history를 어떤 authoritative backfill·refresh source로 사용해 custom global journal 없이 live view와 복원을 조합할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
