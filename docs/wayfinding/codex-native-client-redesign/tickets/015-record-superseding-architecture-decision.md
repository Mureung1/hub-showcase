# 015 — ADR 0008을 대체할 architecture decision을 기록한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [기존 Host 제거와 선별 재사용 계획을 확정한다](014-plan-host-removal-and-selective-salvage.md)

## Question

Pinned generated schema의 wire shape와 Rust source/tests의 method별 observable semantics를 TypeScript external client로 source-guided port하는 원칙, `CodexAppServerConnection → CodexConversationRuntime → AYPLE adapter`의 dependency direction과 runtime-before-product gate를 어떤 ADR로 기록할 것인가? 기존 all-capability `HeadlessCodexClientHost`를 compatibility target 없이 supersede하고, upstream보다 강한 제품 behavior는 adapter-owned deviation으로 남긴다.

ADR은 decisions JSON/generated inventory coverage ledger, lifecycle fact/source-test authority와 fake/live external conformance의 역할을 분리하고, TUI·Exec surface policy와 사용하지 않는 method를 포팅하지 않는 경계를 포함한다.

## Answer

Ticket을 resolve할 때 작성한다.
