# 016 — Source·runtime·repository 기준으로 architecture readiness를 리뷰한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [First-party client 근거로 port와 재사용 계획을 교정한다](019-correct-first-party-client-port-and-reuse.md)

## Question

해결한 결정과 superseding ADR이 pinned generated schema, Python external stdio client, Rust `codex-app-server-client`, TUI `ThreadEventStore`·pending request, method source/tests, ADR 0005·0006과 문서 소유권에 일치하며 implementation-ready runtime foundation spec으로 넘어갈 때 남은 blocking fog가 없는가? `CodexAppServerConnection → CodexConversationRuntime` Seam, external preparation capability와 기존 Runtime Harness 보호 Seam뿐 아니라 [Ticket 019의 code-unit 처리 방침](../assets/019-first-party-client-port-and-reuse-audit.md)이 보존·추출/개조·Harness 전용·제거의 네 범주로 완결됐는지 확인한다.

각 adopted T0·T0-C·T0.1 row의 wire shape, source/test 의미, intended unit/fake/live oracle와 singular owner가 resulting spec에 있고, decisions JSON에서 generated inventory를 deterministic하게 재생성하며 legacy `client-host` claim을 migration할 implementation gate가 빠지지 않았는지 확인한다. 기준선이 active-only exact request routing, method-specific early FIFO, per-thread projection, remove-on-resolution과 current-pending disconnect settlement인지, lifetime tombstone·permanent poison·global causal/semantic arbiter와 automatic reconciliation을 stale oracle에서 다시 끌어오지 않는지도 검토한다. Actor/mailbox와 retention은 필요한 method lifecycle을 구현하는 package-private 선택이지 공개 invariant로 고정하지 않는다.

현재 구현 사실과 채택한 target을 구분하고, foundation Interface가 multi-turn, streaming, interrupt/steer, `thread/read`·`thread/resume`, activity projection과 추가 Server request의 후속 source-guided tracer를 불필요하게 막지 않으며 `AYPLE adapter`나 product policy를 현재 readiness 조건으로 삼지 않는지도 확인한다.

Review는 Source·Standards·Spec을 독립적으로 수행하고, finding이 있으면 owning decision ticket을 다시 open한다.

## Answer

Ticket을 resolve할 때 작성한다.
