# 012 — Conversation Interface를 세 가지로 설계한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [Conversation catalog와 cold recovery capability를 확인한다](006-official-conversation-cold-recovery.md), [Live turn rejoin과 pending interaction capability를 확인한다](007-official-live-rejoin-pending-capabilities.md), [Conversation ownership과 client cardinality를 결정한다](011-conversation-ownership-cardinality.md)

## Question

확정한 ownership model과 official capability를 만족하면서 workspace-scoped list·start·read·resume, turn·interrupt, name·archive와 live activity를 raw protocol·process mechanics 없이 표현하는 Conversation Module의 Interface를 최소 세 가지로 설계하면 어느 Seam이 가장 높은 Depth, Leverage, Locality와 testability를 제공하는가?

## Resolution evidence

- Current `CodexChatRuntime` 확장, Server-owned Module과 다른 실질적 대안의 Interface sketch
- 각 caller가 알아야 할 identity, ordering, error, configuration과 lifecycle invariant
- Production Adapter와 deterministic Adapter가 같은 Seam을 만족하는지 검토
- Browser, Server, runtime과 official SDK change map 및 raw leakage deletion test
- `/codebase-design`·`/prototype` evidence와 사용자의 선택
