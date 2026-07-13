# 011 — Event delivery와 transcript recovery model을 결정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md

## Question

Agent text·item·turn terminal과 progress notification 중 무엇을 lossless·best-effort로 다루고, bounded queue saturation을 어떻게 관찰하며, `thread/read`·native history를 어떤 authoritative backfill·refresh source로 사용해 custom global journal 없이 live view와 복원을 조합할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
