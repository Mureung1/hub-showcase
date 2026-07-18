# 002 — 현재 Chat capability와 state ownership을 기준선으로 고정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat application foundation의 완료 envelope를 확정한다](001-foundation-capability-envelope.md)

## Question

확정한 foundation envelope와 비교할 때 current runtime, Server와 Browser는 config, account, workspace, conversation, active turn, transcript, stream, process lifecycle, local security와 실행 entrypoint를 각각 어떻게 소유하며 어떤 observable contract와 gap을 실제 code·tests로 증명하는가?

## Resolution evidence

- Current Module·Interface·state owner·cardinality와 persistence matrix
- 네 `/api/codex-chat/*` route, process-global 1/1 state와 Browser tab-memory trace
- 보존할 runtime supervision, strict decoder, identity reducer와 deterministic E2E evidence
- Current limitation과 target decision을 섞지 않은 cited `assets/current-chat-baseline.md`
- 이후 research가 확인해야 할 exact official surface 목록
