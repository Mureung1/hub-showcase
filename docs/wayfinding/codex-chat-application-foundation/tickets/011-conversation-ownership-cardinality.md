# 011 — Conversation ownership과 client cardinality를 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Conversation catalog와 cold recovery capability를 확인한다](006-official-conversation-cold-recovery.md), [Live turn rejoin과 pending interaction capability를 확인한다](007-official-live-rejoin-pending-capabilities.md), [Workspace activation과 chat-readiness state machine을 결정한다](010-workspace-readiness-state-machine.md)

## Question

Native durable thread, process-local live handle, selected conversation, active turn, reconstructed transcript와 runtime health의 authoritative owner·cardinality·lifetime은 무엇이며, 두 Browser client와 Server restart에서 한 client가 다른 client의 handle이나 선택 상태를 손상하지 않도록 어떤 ownership model을 채택해야 하는가?

## Resolution evidence

- Browser client, local companion owner, native thread·turn과 conversation의 canonical vocabulary
- Current process-global 1/1과 target owner·cardinality·persistence 비교표
- Tab A/B의 new conversation, active turn, disconnect, reload와 wrong-owner transition
- Durable, reconstructible, process-live와 tab-local state 분류
- Explicit single-client 제한과 isolated multi-client owner 대안의 사용자 판정
