# 003 — Conversation state ownership을 결정한다

## Wayfinder ticket

- Type: grilling
- State: out-of-scope
- Blocked by: None

## Question

확정한 extension envelope에서 browser client scope, selected conversation, native thread handle, active turn, transcript, pending interaction과 runtime health의 최소 owner·cardinality·persistence invariant는 무엇인가?

## Resolution evidence

- Browser client scope와 App Server protocol의 `sessionId`를 같은 뜻으로 사용하지 않는 canonical vocabulary
- 두 browser tab A/B와 Server restart scenario에서 owner가 바뀌거나 유지되는 state transition 표
- Single-client 제한을 명시할지 Server-issued isolated owner를 둘지에 대한 결정과 근거
- Live handle, durable native thread, selected conversation과 reconstructed transcript의 수명 구분
- 구현 타입이 아니라 사용자가 질문별로 확인한 target invariant

## Map reconciliation

- 분류: 병합
- 현재 1/1 cardinality와 transient transcript를 이번 삭제에서 재설계하지 않는 known limitation으로 기록하는 일은 [Codex Chat-only cutover contract와 non-goal을 고정한다](002-extension-envelope.md)에 흡수했다.
- Multi-client·resume를 위한 새 target ownership 설계는 legacy 삭제의 선행조건이 아니므로 별도 product evolution effort로 넘긴다.
