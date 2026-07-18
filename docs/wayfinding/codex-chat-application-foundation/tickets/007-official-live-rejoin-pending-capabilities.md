# 007 — Live turn rejoin과 pending interaction capability를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md), [현재 Chat capability와 state ownership을 기준선으로 고정한다](002-current-chat-baseline.md)

## Question

Browser HTTP disconnect, Server와 SDK connection 유지·종료, SDK·App Server restart 각각에서 accepted turn은 어떻게 계속되거나 중단되며, running `thread/resume`, notification replay와 official pending-interaction surface가 late client에게 무엇을 관찰·응답하게 하는가?

## Resolution evidence

- Exact connection, in-flight resume, notification routing과 pending request primary tests
- Browser disconnect, Server transport disconnect, process failure별 turn lifetime matrix
- Rejoin 시 replay·snapshot·live-only detail과 terminal authority
- Original `RequestId`, reader responsiveness와 approval/user-input response capability
- Target reconnect·approval 정책을 결정하지 않은 `assets/official-live-rejoin-pending-capabilities.md`
