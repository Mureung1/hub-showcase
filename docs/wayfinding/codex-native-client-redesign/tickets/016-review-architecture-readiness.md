# 016 — Source·runtime·repository 기준으로 architecture readiness를 리뷰한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [ADR 0008을 대체할 architecture decision을 기록한다](015-record-superseding-architecture-decision.md)

## Question

해결한 결정과 superseding ADR이 pinned schema·Rust source/tests, ADR 0005·0006, 문서 소유권, `CodexAppServerConnection → CodexConversationRuntime` seam, external preparation capability와 기존 Runtime Harness 보호 경계에 일치하며 implementation-ready runtime foundation spec으로 넘어갈 때 남은 blocking fog가 없는가? 각 adopted T0·T0-C·T0.1 row의 wire shape, source/test 의미, intended unit/fake/live oracle와 singular owner가 resulting spec에 있고, decisions JSON에서 generated inventory를 deterministic하게 재생성하며 legacy `client-host` claim을 migration할 implementation gate가 빠지지 않았는지 확인한다. 현재 구현 사실과 채택한 target을 구분하고, foundation Interface가 multi-turn·streaming·control·resume·activity의 후속 source-guided tracer를 불필요하게 막지 않으며 `AYPLE adapter`나 product policy를 현재 readiness 조건으로 삼지 않는지도 확인한다.

Review는 Source·Standards·Spec을 독립적으로 수행하고, finding이 있으면 owning decision ticket을 다시 open한다.

## Answer

Ticket을 resolve할 때 작성한다.
