# 019 — First-party client 근거로 port와 재사용 계획을 교정한다

## Wayfinder ticket

- Type: task
- State: claimed
- Blocked by: [ADR 0008을 대체할 architecture decision을 기록한다](015-record-superseding-architecture-decision.md)

## Question

새로 확인한 `artifacts/pro-bridge/0714-chat/question.md`와 `artifacts/pro-bridge/0714-chat/answer.md`의 조사 결과, exact pinned source를 기준으로 현재 `CodexAppServerConnection → CodexConversationRuntime` 설계와 구현 재사용 계획을 어떻게 forward-correct할 것인가?

`sdk/python/openai_codex` external stdio client, Rust `codex-app-server-client`, TUI `ThreadEventStore`·pending App Server request 처리와 method source/tests의 owner를 현재 `CodexStdioTransport`, `CodexRawClient`, `HeadlessCodexClientHost`, generated protocol, fake child, layout/cleanup 및 관련 tests와 항목별로 대조한다. 각 code unit은 다음 중 하나로 분류한다.

1. 그대로 보존
2. upstream behavior에 맞춰 추출·개조
3. developer-only Runtime Harness에만 보존
4. compatibility 없이 제거

Completed Tickets 011·012·017과 ADR 0010의 process-lifetime tombstone, contradiction/poison, 장기 actor 보존 등 upstream 근거가 약한 강화 정책을 다시 열어 supersede 또는 축소한다. Tickets 005·006의 evidence에는 Python SDK, Rust client facade와 TUI projection 근거를 보완한다. ADR 0010은 protocol 기반 자체 설계가 아니라 first-party client behavior를 TypeScript external stdio seam에 source-guided port한다는 결정을 forward-amend한다.

기존 commit/history와 유효한 evidence는 reset/revert하지 않는다. 현재 하부 primitive를 이유 없이 폐기하거나 기존 자체 정책을 새 foundation contract로 자동 승격하지 않는다. 이 ticket에서 code replacement를 구현하지 않으며, Source·Standards·Spec 독립 review와 link/diff integrity를 통과한 뒤에만 Ticket 016을 다음 frontier로 둔다.

## Answer

Ticket을 resolve할 때 작성한다.
