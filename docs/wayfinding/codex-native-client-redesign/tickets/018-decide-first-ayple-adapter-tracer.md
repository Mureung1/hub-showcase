# 018 — 첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)

## Question

ADR 0007과 [Codex-native 제품 작업 조합](../../../architecture/codex-native-product-composition.md)이 정의한 `ModelingInvocation → ModelingRun` mapping 중 어떤 가장 작은 end-to-end behavior를 첫 `AYPLE adapter` tracer로 선택할 것인가? Adapter가 product input과 safe result를 번역하되 raw method·native identity·path·prompt·protocol error를 제품 계약으로 노출하지 않는 Interface는 무엇인가?

이 tracer의 구현 ticket은 소비하는 `CodexConversationRuntime` capability가 decisions JSON/generated inventory에 method roster·owner·source/test evidence·fake/live verification을 완료한 뒤에만 runnable해야 한다. T0/T0.1 전체를 제품 Interface로 복제하거나 browser transport·approval UI·범용 interaction framework를 함께 고정하지 않고, 실제 use case가 요구하는 runtime capability만 dependency로 삼는다. Product ref remapping, ModelingRun correlation과 runtime admission을 제품 UX로 번역하는 정책도 이 ticket이 실제 tracer 증거로 결정한다.

## Answer

Ticket을 resolve할 때 작성한다.
