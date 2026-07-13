# 002 — 기존 Host consumer와 compatibility constraint를 감사한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/001-preserve-evidence-and-establish-fixed-point.md

## Question

Repository의 imports·package exports·HTTP routes·stored state·tests·method inventory·backlog·문서 claim 중 기존 `HeadlessCodexClientHost` Interface와 ref/event semantics에 실제로 의존하는 durable consumer는 무엇이며, clean-slate replacement가 보존해야 할 compatibility constraint와 단순 prototype oracle을 어떻게 구분할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
