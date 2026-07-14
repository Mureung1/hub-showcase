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

[First-party client port와 현재 코드 재사용 감사](../assets/019-first-party-client-port-and-reuse-audit.md)를 current correction 정본으로 채택한다.

### Architecture verdict

`CodexAppServerConnection → CodexConversationRuntime` 경계와 T0·T0-C·T0.1의 사용자-visible 목적은 유지한다. 다만 Runtime은 App Server backend state를 재구현하는 authority가 아니라 native identity를 보존하는 client-side per-thread projection·orchestration이다. Actor/mailbox는 package-private 구현 선택이며 process-lifetime retention invariant가 아니다.

Port baseline은 exact-pin Python external stdio client의 sole reader·serialized writer·active response map·per-turn early FIFO·disconnect `fail_all`, Rust `codex-app-server-client`의 typed active routing·same-ID Server response와 TUI `ThreadEventStore`·pending request의 per-thread projection·remove-on-resolution이다. Generated schema는 wire shape, method source/tests는 method별 ordering·identity·terminal을 소유한다. Python이 registration 전 `turn/completed`를 pending deque와 함께 버리는 edge는 복제하지 않고, unresolved T0 request의 terminal까지 같은 bounded turn-local FIFO에 stage해 response 뒤 replay하는 external-client hardening을 명시한다.

Process-lifetime `RequestId` tombstone, global causal ordering, contradiction lattice·permanent actor poison/sink, process 종료까지의 actor 보존과 automatic reconciliation은 baseline에서 제외한다. Explicit future `thread/read`·`thread/resume` tracer는 막지 않는다.

### Current code disposition

| 분류 | Code unit과 처리 |
| --- | --- |
| 그대로 보존 | Exact-pin generated protocol artifacts와 provenance. Response-contract/validator roster와 generator safety는 새 adopted method·safe promotion에 맞춰 확장한다. |
| 추출·개조 | `CodexStdioTransport`의 child·sole ingress·JSONL envelope·exact typed ID·generated validator·pending settlement·cleanup primitive, `ProductRuntimeLayout`의 root/pin/runtime-home preparation, fake stdio의 process/journal/temp cleanup scaffolding과 test intent |
| Runtime Harness 전용 보존 | `CodexRawClient`, `CodexRuntimeAdapter`, status/smoke, 기존 fake App Server와 server/Inspector diagnostic tests. Foundation conformance나 ledger integration 근거로 승격하지 않는다. |
| Compatibility 없이 제거 | 새 gate 이후 `HeadlessCodexClientHost` Interface/state machine/root export/fake/tests, generation/ref/global subscriber policy, legacy transport의 settled identity retention·global observation queue·`dismiss()`/reuse semantics와 이를 고정한 oracle |

새 Connection은 old transport나 RawClient를 감싸지 않는다. Verified primitive와 test intent만 새 owner로 옮기는 replace-don't-layer migration을 사용한다.

### Forward correction

- Tickets 005·006과 evidence assets에 Python external stdio client, Rust facade, TUI projection/pending lifecycle을 보완했다.
- Tickets 011·012·017의 active routing·method-specific staging·per-thread independence·current-pending loss settlement·regular approval original-ID lifecycle은 유지하고 lifetime tombstone·permanent poison·global semantic lattice를 supersede했다.
- Ticket 013의 authority·ledger·safe generation은 유지하되 future oracle을 active remove-on-response, early FIFO cleanup, disconnect settlement와 per-thread projection으로 교정했다.
- Ticket 014의 replace-don't-layer와 보호 경계는 유지하되 late sink/tombstone/poison gate를 제거하고 code-unit disposition을 구체화했다.
- ADR 0010과 map을 first-party client behavior의 source-guided TypeScript port로 forward-amend했다. Current-fact package README와 implementation map은 legacy code가 아직 존재함을 그대로 기록한다.

### Resulting spec이 정할 package-private 항목

First-party surface가 하나의 답을 주지 않는 request timeout, early/dispatch overflow outcome, adopted notification validation의 operation-local diagnostic·settlement, JavaScript에서 exact numeric ID를 보존하는 parser와 RequestId allocator는 기존 정책을 자동 승격하지 않는다. Ticket 016은 이 항목이 implementation-ready spec에서 source evidence 또는 명시적 TypeScript deployment deviation으로 좁혀질 수 있는지 검토한다. Response payload validation failure는 해당 active request만 실패시키고 envelope/framing trust failure만 connection terminal로 두는 경계는 이미 확정한다.

이 ticket은 문서와 migration disposition만 교정했으며 runtime code, decisions JSON과 generated inventory의 integration status를 변경하지 않았다. 다음 frontier는 Ticket 016 architecture readiness review다.
