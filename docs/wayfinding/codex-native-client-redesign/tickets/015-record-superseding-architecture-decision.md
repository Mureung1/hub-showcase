# 015 — ADR 0008을 대체할 architecture decision을 기록한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [기존 Host 제거와 선별 재사용 계획을 확정한다](014-plan-host-removal-and-selective-salvage.md)

## Question

Pinned generated schema의 wire shape와 Rust source/tests의 method별 observable semantics를 TypeScript external client로 source-guided port하는 원칙과 `CodexAppServerConnection → CodexConversationRuntime` production dependency direction을 어떤 ADR로 기록할 것인가? 기존 all-capability `HeadlessCodexClientHost`를 compatibility target 없이 supersede하고, future chat tracer를 막는 generic Host state machine이나 one-shot product abstraction을 foundation에 넣지 않는다.

ADR은 decisions JSON/generated inventory coverage ledger, lifecycle fact/source-test authority와 fake/live external conformance의 역할을 분리하고, T0·T0-C·T0.1 뒤 multi-turn·streaming·control·resume·activity tracer를 확장할 수 있는 경계를 포함한다. Three-root preparation은 external capability로만 다루고 TUI·Exec surface policy, 사용하지 않는 method와 `AYPLE adapter`를 foundation에 포팅하지 않는다. Product composition correction은 out-of-scope [첫 AY-PLE adapter tracer와 runtime readiness gate](018-decide-first-ayple-adapter-tracer.md)의 future evidence이며 이 ADR의 blocker나 책임이 아니다.

## Answer

Ticket을 resolve할 때 작성한다.
