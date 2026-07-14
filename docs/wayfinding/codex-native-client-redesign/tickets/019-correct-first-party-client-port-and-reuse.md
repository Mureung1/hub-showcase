# 019 — First-party client 근거로 port와 재사용 계획을 교정한다

## Wayfinder ticket

- Type: task
- State: resolved
- Blocked by: [ADR 0008을 대체할 architecture decision을 기록한다](015-record-superseding-architecture-decision.md)

## Question

새로 확인한 `artifacts/pro-bridge/0714-chat/question.md`와 `artifacts/pro-bridge/0714-chat/answer.md`의 조사 결과, exact pinned source를 기준으로 현재 `CodexAppServerConnection → CodexConversationRuntime` 설계와 구현 재사용 계획을 어떻게 forward-correct할 것인가?

`sdk/python/openai_codex` external stdio client, Rust `codex-app-server-client`, TUI `ThreadEventStore`·pending App Server request 처리와 method source/tests의 owner를 현재 `CodexStdioTransport`, `CodexRawClient`, `HeadlessCodexClientHost`, generated protocol, fake child, layout/cleanup 및 관련 tests와 항목별로 대조한다. 각 code unit은 다음 중 하나로 분류한다.

1. 그대로 보존
2. upstream behavior에 맞춰 추출·개조
3. developer-only Runtime Harness에만 보존
4. compatibility 없이 제거

Completed Tickets 011·012·017과 ADR 0010의 process-lifetime tombstone, contradiction/poison, 장기 actor 보존 등 upstream 근거가 약한 강화 정책을 다시 열어 supersede 또는 축소한다. Tickets 005·006의 evidence에는 Python SDK, Rust client facade와 TUI projection 근거를 보완한다. ADR 0010은 protocol 기반 자체 설계가 아니라 first-party client behavior를 TypeScript external stdio Seam에 source-guided port한다는 결정을 기존 이력을 보존해 개정한다.

기존 commit/history와 유효한 evidence는 reset/revert하지 않는다. 현재 하부 primitive를 이유 없이 폐기하거나 기존 자체 정책을 새 foundation contract로 자동 승격하지 않는다. 이 ticket에서 code replacement를 구현하지 않으며, Source·Standards·Spec 독립 review와 link/diff integrity를 통과한 뒤에만 Ticket 016을 다음 frontier로 둔다.

## Ticket 016에서 재개한 범위

아키텍처 준비 상태 검토에서 Source는 0 findings였지만 code-unit 네 분류가 완결되지 않았다는 Spec P2와 문서 Standards findings가 발견되어 이 ticket을 다시 열었다. 아래 기존 Answer와 review checkpoint는 당시 결과로 보존하고, 다음 session은 다음 항목을 교정한 뒤 전체 범위를 재리뷰한다.

- `capability-slots.ts`·test와 관련 root/package export를 실제 Runtime Harness consumer까지 추적해 네 범주 중 하나로 명시한다. `capability-slots`는 Runtime Harness 전용 보존 대상이며 `src/index.ts`와 package export는 symbol별 보존·제거 결과를 기록한다.
- ADR 0010을 먼저 고쳐 Host와 external preparation의 Interface 위치를 `Seam`으로 통일하고 Ticket 015, development backlog와 map 소비 문구에 파급한다.
- Tickets 005·006의 `Blocked by`를 읽을 수 있는 title과 relative link 조합으로 고친다.
- Ticket 014의 일반 설명어 `Disposition`·`Migration`을 한국어로 교정한다.

## Answer

[First-party client port와 현재 코드 재사용 감사](../assets/019-first-party-client-port-and-reuse-audit.md)를 현재 교정 정본으로 채택한다.

### 설계 판정

`CodexAppServerConnection → CodexConversationRuntime` Seam과 T0·T0-C·T0.1의 사용자-visible 목적은 유지한다. 다만 Runtime은 App Server backend state를 재구현하는 authority가 아니라 native identity를 보존하는 client-side per-thread projection·orchestration이다. Actor/mailbox는 package-private 구현 선택이며 process-lifetime retention invariant가 아니다.

Port 기준선은 exact-pin Python external stdio client의 sole reader·serialized writer·active response map·per-turn early FIFO·disconnect `fail_all`, Rust `codex-app-server-client`의 typed active routing·same-ID Server response와 TUI `ThreadEventStore`·pending request의 per-thread projection·remove-on-resolution이다. Generated schema는 wire shape, method source/tests는 method별 ordering·identity·terminal을 소유한다. Python이 registration 전 `turn/completed`를 pending deque와 함께 버리는 edge는 복제하지 않고, unresolved T0 request의 terminal까지 같은 bounded turn-local FIFO에 stage해 response 뒤 replay하는 external-client hardening을 명시한다.

Process-lifetime `RequestId` tombstone, global causal ordering, contradiction lattice·permanent actor poison/sink, process 종료까지의 actor 보존과 automatic reconciliation은 기준선에서 제외한다. Explicit future `thread/read`·`thread/resume` tracer는 막지 않는다.

### 현재 코드 처리 방침

| 분류 | Code unit과 처리 |
| --- | --- |
| 그대로 보존 | Exact-pin generated protocol output. 기존 provenance 문서는 implementation 전 evidence로 별도 보존하며 validator·contract·generator implementation은 이 분류에 포함하지 않는다. |
| 추출·개조 | Response/notification validator·contract와 safe generator, method ledger renderer의 pure extraction/pin check, `CodexStdioTransport`의 child·sole ingress·JSONL envelope·exact typed ID·pending settlement·cleanup primitive, `ProductRuntimeLayout`의 root/pin/runtime-home preparation, fake stdio의 process/journal/temp cleanup scaffolding과 test intent |
| Runtime Harness 전용 보존 | `CodexRawClient`, `CodexRuntimeAdapter`, status/smoke, `capability-slots.ts`·test와 root `.`의 해당 export block, `./capabilities`, 기존 fake App Server와 `./testing` subpath, 이를 소비하는 server/Inspector diagnostic path. Foundation conformance나 ledger integration 근거로 승격하지 않는다. |
| Compatibility 없이 제거 | 새 gate 이후 `HeadlessCodexClientHost` Interface/state machine/root export/fake/tests, generation/ref/global subscriber policy, product-named layout root export, legacy transport의 settled identity retention·global observation queue·`dismiss()`/reuse semantics, `./testing`의 기존 stdio re-export와 이를 고정한 oracle |

새 Connection은 old transport나 RawClient를 감싸지 않는다. Verified primitive와 test intent만 새 owner로 옮기는 replace-don't-layer migration을 사용한다.

### 기존 이력을 보존한 교정

- Tickets 005·006과 evidence assets에 Python external stdio client, Rust facade, TUI projection/pending lifecycle을 보완했다.
- Tickets 011·012·017의 active routing·method-specific staging·per-thread independence·current-pending loss settlement·regular approval original-ID lifecycle은 유지하고 lifetime tombstone·permanent poison·global semantic lattice를 supersede했다.
- Ticket 013의 authority·ledger·safe generation은 유지하되 future oracle을 active remove-on-response, early FIFO cleanup, disconnect settlement와 per-thread projection으로 교정했다.
- Ticket 014의 replace-don't-layer와 보호 Seam은 유지하되 late sink/tombstone/poison gate를 제거하고 code-unit 처리 방침을 구체화했다.
- ADR 0010과 map을 first-party client behavior의 source-guided TypeScript port로 기존 이력을 보존해 개정했다. 현재 사실을 기록하는 package README와 implementation map은 legacy code가 아직 존재함을 그대로 기록한다.

### 후속 spec이 정할 package-private 항목

First-party surface가 하나의 답을 주지 않는 request timeout, early/dispatch overflow outcome, adopted notification validation의 operation-local diagnostic·settlement, JavaScript에서 exact numeric ID를 보존하는 parser와 RequestId allocator는 기존 정책을 자동 승격하지 않는다. Ticket 016은 이 항목이 implementation-ready spec에서 source evidence 또는 명시적 TypeScript deployment deviation으로 좁혀질 수 있는지 검토한다. Response payload validation failure는 해당 active request만 실패시키고 envelope/framing trust failure만 connection terminal로 두는 실패 범위는 이미 확정한다.

### Review checkpoint

Fixed point `1ee4c3e3` 이후 draft `0e39117f`를 검토하고, findings를 `19454e35`와 `f8b34220`에 반영한 뒤 전체 diff를 다시 검토했다.

| 축 | 초기 판정과 반영 | 최종 판정 |
| --- | --- | --- |
| Source | 0 findings. Exact-pin Python·Rust·TUI 근거와 TypeScript hardening을 구분했다. | 0 findings. 후속 spec은 `RequestId` allocator/reuse와 Python source의 CLI pin 차이를 fake/live gate로 검증해야 한다. |
| Standards | Ticket state/map 정합성, `Seam` 어휘, 한국어 일반 설명어 3건과 후속 표현 P2 1건을 교정했다. | 0 findings. Wayfinder lifecycle·문서 ownership·현재 구현과 채택 목표 분리가 일치한다. |
| Spec | Generated output/provenance, validators/generator/renderer와 관련 tests가 한 분류에 섞인 1건을 code-unit별 네 범주로 분리했다. | 0 findings. Ticket 019 범위와 one-ticket-per-session을 지키며 runtime code·ledger·generated inventory는 변경하지 않았다. |

`git diff --check`와 변경한 Markdown의 local link·zero-width 검사를 통과했다. Repository 전체 runtime gate는 코드 변경이 없는 이 Wayfinder correction에서 실행하지 않고 후속 implementation checkpoint에 남긴다.

`src/index.ts`와 package export map은 파일 전체가 아니라 symbol/subpath별로 분류했다. Root `.`는 보호된 Runtime Harness symbol만 남기고, `./capabilities`와 fake App Server를 제공하는 `./testing`은 유지한다. Product-named layout과 Host root block, `./testing`의 기존 stdio re-export는 각 교체 gate 뒤 제거하며 새 `./conversation`은 Runtime Interface가 구현된 checkpoint에 별도로 추가한다. 실제 보호 사용처는 server capability/status/adapter path와 Inspector capability panel이고 새 foundation 사용처가 아니다.

### Ticket 016에서 재개한 review checkpoint

Fixed point `8a6ce96c5ea11294cba0fb7de4cd3bbd374b86c0` 이후 draft `d2306371`, review finding 반영 `2f5a938d`와 표현 교정 `92089576`을 포함한 aggregate diff를 독립 재검토했다.

| 축 | Finding과 반영 | 최종 판정 |
| --- | --- | --- |
| Source | Ticket 014에 남아 있던 `bounded late sink`·필수 actor replacement P2를 active/current-pending settlement, method-specific FIFO와 per-thread projection으로 교정했다. | 0 findings. Capability/export 처리 방침도 현재 code graph와 first-party client ownership에 일치한다. |
| Standards | ADR 정본부터 소비 문서·index까지 `Seam`을 파급하고 readable blocking link, 한국어 일반 설명어와 새 감사 표의 `old`·`consumer` 표현을 교정했다. | 0 findings. 문서 ownership, Wayfinder lifecycle과 current/target 분리가 일치한다. |
| Spec | Layout root와 기존 fake stdio re-export가 primitive 추출과 export 제거 두 범주에 걸쳐 보이던 P2를 현재 export edge의 compatibility 없는 제거로 분리했다. | 0 findings. Capability slots/test, symbol/subpath와 실제 사용처를 상호배타적 네 분류로 완결했다. |

변경한 Markdown의 local link·zero-width 검사와 `git diff --check`를 통과했다. Runtime code, decisions JSON과 generated inventory는 변경하지 않았고 repository runtime gate는 후속 implementation checkpoint에 남겼다. 사용자 제공 `artifacts/pro-bridge/0714-chat/`은 untracked 상태로 보존했다.

이 ticket은 문서와 migration 처리 방침만 교정했으며 runtime code, decisions JSON과 generated inventory의 integration status를 변경하지 않았다. 다음 frontier는 Ticket 016 architecture readiness review다.
