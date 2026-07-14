# First-party client port와 현재 코드 재사용 감사

이 문서는 exact pin `767822446c7a594caa19609ca435281a9ec67e0d`의 first-party client와 UI projection을 기준으로 `CodexAppServerConnection → CodexConversationRuntime` 목표와 현재 `packages/runtime-codex` 구현의 처리 방침을 교정한다. 조사 입력인 `artifacts/pro-bridge/0714-chat/question.md`와 `artifacts/pro-bridge/0714-chat/answer.md`는 사용자 제공 원문으로 보존하고, 아래 판정은 exact source를 다시 대조해 기록했다.

## 판정

두 module과 그 사이 Seam은 유지하되 내부 알고리즘을 줄인다.

| 유지하는 module·Seam | Source를 따른 기준 동작 |
| --- | --- |
| `CodexAppServerConnection` | External child, serialized writer, sole stdout reader, generated wire validation, 방향을 구분한 active `RequestId` routing, inbound Server request 응답, disconnect 시 현재 pending settlement |
| `CodexConversationRuntime` | Backend authority가 아닌 native `ThreadId`별 client projection·orchestration, method-specific early-event FIFO, adopted turn/item correlation, authoritative terminal, active pending interaction lifecycle |

다음 항목은 기준선에서 제외한다.

- process-lifetime `RequestId` tombstone과 sequential reuse 금지
- global wire/publication ordering과 cross-thread causal convergence
- contradiction lattice, permanent actor poison·compact sink와 process 종료까지의 actor 보존
- 모든 transport anomaly를 조정하는 global semantic arbiter
- non-idempotent mutation의 blind retry와 automatic reconciliation

이 항목이 실제 AY-PLE 요구로 다시 필요해지면 upstream 기준선이 아니라 별도 deviation으로 근거·비용·oracle을 기록한다.

## Exact pin의 first-party 동작

| 근거 소유자 | 확인한 동작 | TypeScript port에 주는 제약 |
| --- | --- | --- |
| Python [`MessageRouter`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/_message_router.py#L17-L240) | Sole reader가 active response waiter와 per-turn queue를 분리한다. Response는 waiter를 `pop`하고 unknown·late repeat은 no-op이다. Registration 전 turn notification은 native `turn_id`별 FIFO에 넣고 registration 때 replay한다. Reader loss는 현재 waiter·queue를 모두 실패시킨다. Exact 구현은 terminal-before-registration에서 pending deque와 terminal을 함께 버리는 edge가 있다. | Active-only exact routing, method-specific early FIFO와 current-pending `fail_all`을 포팅한다. T0는 unresolved request의 terminal도 같은 bounded turn-local FIFO에 stage해 response 뒤 replay한다. 이는 Python의 responsibility를 따르면서 확인된 loss edge를 복제하지 않는 명시적 external-client hardening이며 lifetime history나 permanent poison을 만들지 않는다. |
| Python [`Client`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L196-L477), [turn/read-write loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L602-L860) | External stdio child, turn response 뒤 route registration, sole reader, direction classification과 lock으로 직렬화한 writer를 소유한다. | 현재 선택한 external stdio Seam의 가장 가까운 reference다. Python package를 production dependency로 채택하거나 Python의 unbounded queue를 복사한다는 뜻은 아니다. |
| Rust [`codex-app-server-client` remote](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L200-L477) | Active `pending_requests`만 중복 검사하고 첫 response/error에서 제거한다. Unknown·late response는 map miss로 무시하며 disconnect는 현재 pending만 실패시킨다. Typed Server request를 같은 ID로 resolve/reject한다. | Typed facade, active demux, disconnect settlement와 same-ID response를 포팅한다. Process-lifetime tombstone과 global conflict terminal은 도출하지 않는다. |
| Rust [`codex-app-server-client`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L1-L259) | TUI·exec용 shared facade와 bounded command channel을 제공하되 event path 전체의 global bound를 보장하지 않는다. | Connection channel을 유한하게 만들 수 있지만 특정 global saturation·poison policy를 upstream 보장으로 주장하지 않는다. Rust sidecar는 별도 대안이며 현재 blocker가 아니다. |
| TUI [`ThreadEventStore`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L41-L146), [thread routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L1-L132) | Native thread별 bounded FIFO, active-turn cache와 projection을 소유한다. Cache는 UI lifecycle에서 제거할 수 있고 terminal fingerprint tombstone이나 poison state가 없다. | Runtime을 native thread별 projection으로 partition하되 actor/mailbox와 process-lifetime retention을 공개 invariant로 만들지 않는다. |
| TUI [`PendingAppServerRequests`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L70-L330) | Active pending map에서 entry를 먼저 remove한 caller만 응답하고 `serverRequest/resolved`도 remove-only다. Unknown·duplicate resolved는 no-op이다. | T0.1은 original Server `RequestId`의 active lease를 answer·resolved·turn transition·disconnect 중 한 경로에서 제거한다. Lifetime tombstone은 필요 없다. |
| Method source/tests | `thread/start` response-first는 [exact-pin 구현 사실](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1363)이고 `turn/start` response와 event forwarding은 [독립 경로](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L442-L571)다. First-party test client도 [response 대기 중 notification을 FIFO로 보관](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1480-L2020)한다. | T0의 method-specific convergence와 notification-first tolerance를 유지하고 generation-wide journal을 만들지 않는다. |

Python SDK는 exact commit의 source behavior reference다. 같은 commit의 `pyproject.toml`은 `openai-codex-cli-bin==0.137.0a4`를 가리키므로 `@openai/codex@0.144.0` binary와의 호환성을 자동 보장하지 않는다. 현재 goal에서는 production dependency로 채택하지 않고 architecture evidence로 사용하며 exact npm pin의 외부 동작은 fake/live gate로 별도 검증한다. Generated TypeScript·JSON Schema는 계속 wire shape만 소유하고 ordering·identity·terminal 의미를 소유하지 않는다.

### 검증 실패 범위

| 실패 | 기준 처리 |
| --- | --- |
| Malformed JSONL 또는 방향/ID를 분류할 수 없는 envelope | Sole ingress와 active routing의 신뢰가 깨지므로 connection terminal과 current-pending settlement |
| Active Client request의 method response payload가 generated contract와 불일치 | First-party typed facade처럼 해당 waiter만 실패시키고 active entry를 제거한다. Connection과 unrelated request/thread는 계속 진행한다. |
| Adopted notification payload가 generated contract와 불일치 | State mutation을 만들지 않는다. Python의 unknown downgrade와 Rust의 typed drop을 최소 precedent로 두고, T0 critical route를 operation-local failure로 끝낼지는 spec이 명시한다. Connection-wide poison으로 선결정하지 않는다. |
| Inbound Server request의 adopted params가 invalid | Public handle을 만들지 않고 original ID에 deterministic error를 한 번 쓴다. 다른 request/thread를 막지 않는다. |

Generated validation 자체는 JavaScript external Seam의 hardening이지만 failure scope도 first-party active routing보다 강한 global policy로 자동 확대하지 않는다.

## 현재 코드 처리 방침

분류는 기존 class 단위의 재사용 여부가 아니라 새 deep Module의 책임과 맞는 code unit 단위로 적용한다.

| 현재 code unit | 분류 | 보존·이식할 근거 | 제거하거나 다시 도출할 것 |
| --- | --- | --- | --- |
| `src/internal/codex-app-server-protocol/generated/**` | 그대로 보존 | Exact-pin generated types/schema | Generated output을 수동 수정하거나 runtime 의미의 근거로 사용하지 않는다. 기존 provenance 문서는 implementation 전 evidence로 별도 보존한다. |
| `src/internal/codex-app-server-protocol/*-response-contract.ts`, `scripts/generate-codex-app-server-types.ts`와 tests | upstream behavior에 맞춰 추출·개조 | Typed result/error response contract와 exact-pin generation command | Initialize-only Client response roster를 T0 adopted method·notification까지 확장한다. Generator는 destructive replacement 전에 safe staging·verification을 둔다. |
| `scripts/render-codex-app-server-methods.ts`와 tests | upstream behavior에 맞춰 추출·개조 | Method extraction, direction collision과 pin check의 pure test intent | Legacy `raw-wrapper | client-host | web-adapter | product-ui` taxonomy와 direct output write를 ledger v2·safe promotion으로 교체한다. |
| `src/stdio-transport.ts` | upstream behavior에 맞춰 primitive를 추출·개조 | Child spawn, sole `readline` ingress, JSONL envelope classification, exact string/number identity key, generated validators, pending rejection과 kill/reap mechanics | 기존 class를 Connection 아래에 감싸지 않는다. Completed/timed-out identity retention, identity-limit terminal, unknown/duplicate global failure, count-only raw observation queue, silent `dismiss()`, Server ID reuse contract와 writer 비직렬화를 새 계약으로 승격하지 않는다. |
| `src/stdio-transport.test.ts` | test intent를 선별 이식 | Exact typed ID·direction, schema, malformed envelope, actual child loss와 cleanup fixture | Tombstone, unknown/late global failure, sequential Server ID reuse와 `dismiss()` oracle은 삭제·재작성한다. 새 test는 `CodexAppServerConnection` Interface와 package-private router/writer Seam을 검증한다. |
| `src/raw-client.ts`, `src/adapter.ts`, `src/status.ts`, `src/smoke.ts`와 각 package/server test | developer-only Runtime Harness에 보존 | 현재 server/Inspector의 single-run diagnostic path, parity regression과 live smoke. `resolvePackageCodexBinPath`는 generation script도 사용하는 developer tooling이다. | `String(id)` routing, raw/unbounded notification queue와 broad shallow wrappers를 production Connection/Runtime 적합성 근거로 승격하지 않는다. Foundation primitive를 이 class 위에 계층화하지 않는다. |
| `src/capability-slots.ts`와 `src/capability-slots.test.ts` | developer-only Runtime Harness에 보존 | Generated method type에 맞춘 engine-inspection metadata, `productized: false` 표시와 defensive-copy oracle | Capability slot의 method 존재·status를 foundation adoption, semantic owner나 ledger conformance 근거로 승격하지 않는다. |
| `src/testing/fake-codex-app-server.ts` 자체 fixture·scenario·debug helper와 이를 소비하는 package/server test | developer-only Runtime Harness에 보존 | 현재 raw-client/adapter/status/server parity test와 journal/temp cleanup | Response-first one-shot scenario를 T0/T0-C/T0.1 conformance oracle로 사용하지 않는다. 파일 상단의 기존 fake stdio re-export는 아래 export 처리 방침에 따라 별도로 제거한다. |
| `src/testing/fake-codex-stdio-transport.ts` | upstream behavior에 맞춰 scaffolding을 추출·개조 | Actual child spawn, journal, temp directory와 cleanup/fault injection pattern | Legacy transport scenario strings, tombstone/reuse/`dismiss()` 의미는 버린다. 새 fake는 TypeScript build/typecheck 범위 안의 typed T0/T0-C/T0.1 scenario table을 사용한다. |
| `src/product-runtime-layout.ts`와 tests | external preparation/harness로 추출·개조 | Root canonicalization·containment·overlap, package binary/pin 검증, runtime-home preparation과 깊은 filesystem oracle | Product-named root Interface를 Connection/Runtime protocol contract로 두지 않는다. 새 prepared process/workspace capability가 선 뒤 기존 root export를 제거한다. |
| `src/headless-codex-client-host.ts`, root Host exports, `src/testing/fake-headless-codex-client-host.ts`와 Host tests | compatibility 없이 제거 | Initialize→initialized handshake와 cleanup test intent만 새 owner test로 옮긴다. | Generation/ref/global sequence/subscriber/failure mapper, permanent Host failure, inbound request `dismiss()`와 Host self-oracle 전체를 제거한다. Durable consumer가 없으므로 compatibility facade를 만들지 않는다. |
| 무시된 `dist`와 stale build artifact | generated build output로만 취급 | Guarded clean build 결과 | Source owner나 compatibility evidence로 사용하지 않고 교체 뒤 removed symbol이 없는지 검사한다. |

### Root와 package export의 symbol별 처리

`src/index.ts`와 `package.json#exports`는 파일 전체를 한 분류로 묶지 않고 실제 export block과 subpath별로 처리한다.

| 현재 export | 분류 | 실제 처리 |
| --- | --- | --- |
| Root `.`의 `CodexRuntimeAdapter`와 options, `readCodexRuntimeStatus`·config/status types, `CodexRawClient`·runtime-home/smoke helper와 raw types | developer-only Runtime Harness에 보존 | `apps/server`와 package parity/status/raw tests가 계속 사용하는 Harness Interface다. 새 Connection/Runtime 구현 기반이나 제품 Interface로 확장하지 않는다. |
| Root `.`의 `listCodexCapabilitySlots`, `CodexCapabilitySlot`, `CodexCapabilitySlotStatus`와 `./capabilities` subpath | developer-only Runtime Harness에 보존 | Server의 capability endpoint와 Inspector의 type/UI가 사용하는 engine-inspection Interface다. Root와 explicit subpath를 모두 유지하되 foundation coverage로 세지 않는다. |
| Root `.`의 `prepareProductRuntimeLayout`, `ProductRuntimeLayoutError`와 layout types | compatibility 없이 제거 | `src/product-runtime-layout.ts`에서 검증된 primitive를 external preparation/harness로 추출·개조한 뒤 product-named symbol을 root에서 제거한다. |
| Root `.`의 `HeadlessCodexClientHost`, Host error와 snapshot/event/subscription/options/status types | compatibility 없이 제거 | T0·T0-C·T0.1과 full regression gate 뒤 source와 같은 checkpoint에서 root export block을 제거한다. |
| `./testing`의 `withFakeCodexAppServer`와 기존 fake App Server types/helpers | developer-only Runtime Harness에 보존 | Adapter/server parity 사용처가 계속 사용한다. |
| `./testing`이 현재 fake App Server file을 통해 재export하는 `withFakeCodexStdioTransport`와 관련 types | compatibility 없이 제거 | `src/testing/fake-codex-stdio-transport.ts`의 scaffolding을 새 typed conformance fake로 추출·개조한 뒤 기존 transport와 함께 re-export만 제거한다. `./testing` subpath 자체는 유지한다. |
| 아직 없는 `./conversation` subpath | 후속 implementation에서 새로 추가 | 현재 code unit의 재사용 분류가 아니다. 새 Runtime Interface가 gate를 통과한 checkpoint에 development/types/default export를 함께 추가한다. |

보호할 실제 사용처는 다음과 같다.

| 사용처 | 보존하는 경로 | 제한 |
| --- | --- | --- |
| `apps/server/src/server.ts`와 `server.test.ts` | Root `.`의 adapter/status/raw option/capability exports와 `/api/runtime/codex/capabilities` regression | Developer Runtime Harness로 유지하며 ConversationRuntime 사용처로 전환하지 않는다. |
| `apps/server/src/codex-parity.ts`·tests | Root `.`의 status/adapter와 `./testing` fake App Server | 기존 Harness parity oracle의 사용처로만 유지한다. |
| `apps/inspector/src/App.tsx` | `./capabilities`의 `CodexCapabilitySlot`, capability fetch/state/panel | Engine inspection UI로 유지하며 productized runtime state나 foundation readiness 표시로 해석하지 않는다. |
| `packages/runtime-codex`의 raw-client/adapter/status/capability tests | Root `.`와 `./testing`의 보호된 Harness symbol | Legacy Host/layout/transport 전용 oracle과 분리해 계속 실행한다. |

Inspector capability 사용처에는 별도 동작 test가 없으므로 현재 보호 gate는 Inspector build/typecheck다. Server endpoint의 동작은 `server.test.ts`가 고정한다.

현재 코드에 `CodexConversationRuntime`, `ThreadActor`, contradiction/poison 구현은 아직 없다. 따라서 해당 강화 정책은 code removal이 아니라 설계·spec으로 승격하지 않도록 문서를 교정하는 대상이다. 실제 code에서 제거할 과잉 정책은 주로 `CodexStdioTransport`의 settled Client identity retention과 이를 고정한 tests다.

## 기존 결정의 현재 처리 방침

| 기존 결정 | 보존 | 대체·축소 |
| --- | --- | --- |
| Ticket 005 | External stdio ownership, sole ingress, exact demux, request/event drain 분리 | “Production stdio child client가 없다”는 판정을 “Rust/npm reusable TS client는 없지만 Python first-party external stdio client가 있다”로 교정한다. Python behavior를 primary port reference로 추가한다. |
| Ticket 006 | Native identity, per-thread locality, backend authority와 client projection 분리 | TUI `ThreadEventStore`·pending request lifecycle 근거를 보완하고 actor/mailbox·장기 retention을 upstream 필연으로 추론하지 않는다. |
| Ticket 011 | Unresolved request의 terminal을 포함한 method-specific early FIFO, authoritative terminal, per-thread independence, bounded external-client resource와 settle된 public result의 local idempotence | Process-lifetime compact actor/tombstone, permanent actor poison/sink, no-eviction retention과 semantic contradiction lattice를 제거한다. Bound·overflow의 정확한 값과 local settlement는 spec이 명시하되 permanent poison이나 global total order를 만들지 않는다. |
| Ticket 012 | 현재 pending RPC의 disconnect settlement, request/turn-local outcome evidence, close/kill/reap, non-idempotent blind retry 금지 | Awaiting-late-response sink, lifetime response tombstone, never-issued/conflicting response global terminal, tail-aware global semantic lattice와 actor poison을 제거한다. `thread/read`·`thread/resume` reconciliation은 해당 future tracer가 명시적으로 채택할 수 있다. |
| Ticket 017 | Regular-only T0.1, original Server `RequestId`, active pending claim/remove-once, `serverRequest/resolved` cleanup, no automatic decision, raw wire shape 비공개 | Process-lifetime seen-ID/tombstone, sequential reuse 금지, conflicting reuse global fail-close, cross-owner permanent actor tombstone/poison을 제거한다. Active entry가 없어진 뒤의 local repeat은 no-op이다. |
| Ticket 013 | Evidence authority, ledger migration, safe generation, unit/fake/live selector와 planned/implemented promotion | Tombstone·poison·process-lifetime oracle을 active pending/remove-on-resolution, method-specific staging과 idempotent projection oracle로 바꾼다. Python/Rust/TUI selector를 source evidence에 포함한다. |
| Ticket 014 | Replace-don't-layer, Runtime Harness/native data 보호, generated/schema/layout/JSONL primitive 선별 이식과 T0·T0-C·T0.1 이후 legacy 제거 | Late sink, process-lifetime tombstone, actor poison/long-lived retention을 migration gate에서 제거한다. 이 문서의 code-unit 처리 방침이 현재 계획이다. |

## 교정된 구현 순서

1. Coverage ledger의 safe schema·generation과 first-party source selector를 먼저 구현한다.
2. Prepared process/workspace capability와 `CodexAppServerConnection`을 legacy 구현 옆에 새 owner로 구현한다. Legacy transport를 감싸지 않고 검증된 primitive와 test intent만 옮긴다.
3. `CodexConversationRuntime`을 backend source of truth가 아닌 native thread별 projection/orchestration으로 구현한다. Actor는 package-private 구현 선택이며 method-specific route는 active lifecycle이 끝나면 제거할 수 있다.
4. T0에서 initialize/initialized, native thread/start, 한 text turn, early-event FIFO, AgentMessage와 authoritative `turn/completed`, same-ID unsupported inbound request를 증명한다.
5. T0-C에서 A pending → B complete → A complete를, T0.1에서 original Server `RequestId` active lease와 remove-once lifecycle을 증명한다.
6. Required unit/fake/live gate와 repository regression이 green이 된 뒤에만 legacy Host/transport public surface와 self-oracle을 forward-remove한다. Runtime Harness는 별도 owner로 계속 동작하게 한다.
7. 제품 adapter와 browser UX는 foundation 뒤의 별도 goal/map에서 시작한다.

## Ticket 016이 확인할 Seam과 계약

- Resulting spec이 Python external stdio, Rust client facade, TUI projection/pending request와 method source/tests를 역할별로 인용하는가?
- Active-only request routing, method-specific bounded staging, per-thread projection과 remove-on-resolution을 구현 가능한 contract로 만들었는가?
- Lifetime tombstone, permanent poison, global causal ordering이나 automatic reconciliation을 기준선에 다시 넣지 않았는가?
- 현재 Runtime Harness와 native app-data를 보존하면서 legacy Host를 새 Runtime 위의 compatibility layer로 남기지 않는가?
- T0·T0-C·T0.1 Interface가 후속 multi-turn·streaming·control·read/resume·activity tracer를 막지 않는가?

이 감사는 source·현재 code·문서의 설계 처리 방침을 고정한다. Runtime 구현 완료나 integration 승격을 주장하지 않으며 `codex-method-decisions.json`과 generated inventory를 변경하지 않는다.
