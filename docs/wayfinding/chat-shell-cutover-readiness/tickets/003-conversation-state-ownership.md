# 003 — Conversation state ownership을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 runtime capability와 ownership을 한 장에 고정한다](001-current-runtime-capability-ownership.md), [확장 가능성의 최소 범위를 결정한다](002-extension-envelope.md)

## Question

확정한 extension envelope에서 browser client scope, selected conversation, native thread handle, active turn, transcript, pending interaction과 runtime health의 최소 owner·cardinality·persistence invariant는 무엇인가?

## Resolution evidence

- Browser client scope와 App Server protocol의 `sessionId`를 같은 뜻으로 사용하지 않는 canonical vocabulary
- 두 browser tab A/B와 Server restart scenario에서 owner가 바뀌거나 유지되는 state transition 표
- Single-client 제한을 명시할지 Server-issued isolated owner를 둘지에 대한 결정과 근거
- Live handle, durable native thread, selected conversation과 reconstructed transcript의 수명 구분
- 구현 타입이 아니라 사용자가 질문별로 확인한 target invariant
