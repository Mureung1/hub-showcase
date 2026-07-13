# 010 — Thread·turn concurrency 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md)

## Question

T0의 max-one/no-queue composite-operation admission과 native `ThreadId`별 semantic owner를 baseline으로 두고, 채택한 method의 pinned source/test legal transition을 보존하면서 같은 thread mutation admission과 서로 다른 thread의 ingress·RPC·semantic 진행을 어느 tracer부터 독립적으로 허용할 것인가? `turn/steer`·`turn/interrupt`는 해당 inventory row를 채택한 tracer에서만 추가하고, cross-thread scheduler artifact를 global causal order로 만들지 않는다.

Runtime admission과 AY-PLE의 reject·queue·steer UX를 분리하며 product policy는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)에 남긴다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## 진행 메모

### Source-grounded concurrency 사실

| 범위 | Exact-pin source/test 판독 | 설계 압력 |
| --- | --- | --- |
| App Server RPC serialization | `turn/start`·`turn/steer`·`turn/interrupt`는 native `threadId`별 exclusive queue를 공유하고 같은 key에서 FIFO로 handler를 실행한다. 서로 다른 key는 별도 drain task에서 동시에 실행된다. 이 queue는 handler response까지의 ordering이지 turn terminal까지 유지되는 lock이 아니다. [`serialization scope`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L805-L820), [`same-key FIFO와 different-key concurrency test`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L231-L306) | External client의 serialized writer나 single ingress를 runtime-wide semantic mutex로 해석하지 않는다. |
| Active turn의 두 번째 `turn/start` | Handler는 새 submission ID `B`를 성공 response로 돌려줄 수 있지만 core가 처리할 때 regular turn `A`가 active면 input은 `A`로 steer되고 `B`의 started·terminal이 없을 수 있다. Review·compact 또는 empty input에서는 settings·error side effect와 `B` lifecycle도 갈라진다. 이 active overlap을 직접 고정한 first-party external-boundary test는 없다. [`turn/start` response path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568), [`core active routing`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L285), [Pinned method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md) | Semantic `startTurn`은 idle thread에서만 wire로 보낸다. Starting·active state의 두 번째 start를 implicit steer나 새 turn으로 추측하지 않는다. |
| First-party active input | TUI는 cached active turn이 있으면 `turn/steer(expectedTurnId)`, 없으면 `turn/start`를 사용한다. Missing·mismatch retry와 non-steerable queue는 TUI surface policy다. [`TUI method routing`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L677), [`turn/steer` validation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955) | Runtime은 active second-start를 pre-wire typed conflict로 끝낸다. Explicit steer는 해당 method tracer가 채택할 때만 추가하고 TUI queue·retry를 복사하지 않는다. |
| Cross-thread progression | App Server는 thread마다 event listener를 하나씩 두고, request serialization도 native thread key별로 분리한다. 서로 다른 listener가 공용 outgoing channel에 enqueue하는 상대 순서는 scheduler artifact이며 cross-thread causal order가 아니다. Distinct long-running A/B turn의 first-party end-to-end concurrency test는 없다. [`per-thread listener`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L240-L343), [`different-key concurrency test`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L274-L306) | Connection ingress와 exact RPC demux는 처음부터 global operation slot과 독립적으로 진행하고 semantic state는 native `ThreadId`별 owner에 둔다. Public A/B concurrency는 별도 conformance tracer로 증명한다. |

이 사실에서 결정 없이 따라오는 owner 경계는 다음과 같다.

| Owner | Concurrency 책임 | 소유하지 않는 것 |
| --- | --- | --- |
| `CodexAppServerConnection` | Concurrent pending RPC registry, exact direction-aware `RequestId` demux, single ingress drain, serialized writer | Thread active state, queue·steer 의미, cross-thread causal order |
| `CodexConversationRuntime` | Native `ThreadId`별 `ThreadActor`, method-specific semantic admission, provisional·active·terminal state에 따른 pre-wire validation | Browser busy copy, user queue UX, `ModelingRun` policy |
| `AYPLE adapter` | Runtime busy/conflict를 제품 행동으로 번역하고 실제 use case에서 queue·steer UX와 `ModelingRun` mapping 결정 | Raw method ordering이나 native identity authority 재정의 |

`ThreadActor`, admission과 `turn/steer`는 implementation·protocol vocabulary이므로 `CONTEXT.md`에는 새 제품 용어를 추가하지 않는다.

### Public concurrency tracer 선택지

| 선택지 | 동작 | 판단 |
| --- | --- | --- |
| A. T0 유지 뒤 `T0-C` | T0의 runtime-wide `runNewConversation()` max-one/no-queue pre-admission은 유지한다. 내부 ingress·RPC·per-thread owner는 global lock 없이 구현하고, 다음 runtime conformance tracer `T0-C`가 public slot만 제거해 두 T0 operation의 `A pending → B completes → A completes`를 증명한다. | 권고. [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)의 T0 범위를 보존하면서 T0.1 approval 전에 cross-thread independence를 검증한다. |
| B. T0 자체를 확장 | 첫 T0 implementation부터 concurrent `runNewConversation()`을 허용한다. | 최종 source shape에는 가깝지만 이미 승인한 T0의 half-created-thread 방지 pre-admission과 첫 slice 범위를 다시 연다. |
| C. Product 필요까지 global max-one 유지 | T0 뒤에도 runtime-wide slot을 유지하다 첫 adapter가 요구할 때 제거한다. | 제외 권고. First-party의 per-thread locality를 제품 우선순위에 종속시키고 global actor·journal·pending-request 가정을 굳힐 위험이 있다. |

권고안 A에서 same-thread rule은 tracer timing과 무관하게 method-specific하다.

- T0의 composite operation slot은 첫 wire mutation 전에 획득해 `thread/start → turn/start` bootstrap 전체를 보호하며 ingress, response demux와 Server request 처리를 막지 않는다.
- Reusable thread surface가 추가되면 idle `ThreadActor`만 `turn/start`를 admit한다. Starting·active state의 두 번째 start는 RequestId 할당과 wire write 전에 typed conflict로 끝내고 runtime queue나 implicit steer를 만들지 않는다.
- `turn/steer`는 exact `expectedTurnId`를 쓰는 별도 active-input tracer, normal `turn/interrupt`는 known active `(ThreadId, TurnId)` control tracer에서만 채택한다. Empty-`turnId` startup interrupt는 normal interrupt와 합치지 않고 실제 startup-cancellation use case까지 defer한다.
- 서로 다른 `ThreadActor`는 독립적으로 진행하며 한 actor의 pending turn·RPC·Server request가 다른 actor의 ingress routing이나 semantic progression을 막지 않는다. Count·byte bound와 saturation, timeout·unknown outcome은 각각 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md) ticket과 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md) ticket이 소유한다.

### Coverage ledger 초안

| Inventory row | 현재 integration / adoption | Ticket 010 target | Semantic owner와 evidence |
| --- | --- | --- | --- |
| `thread/start` | `raw-wrapper` / `baseline` | T0 bootstrap, `T0-C` concurrent bootstrap | `CodexConversationRuntime`; no serialization scope와 request-correlated response identity |
| `turn/start` | `raw-wrapper` / `baseline` | T0·`T0-C`의 idle branch만 required; active second-start unsupported | `ThreadActor`; active routing source와 TUI explicit steer precedent |
| `turn/steer` | `raw-wrapper` / `later` | 별도 active-input tracer 전 deferred | `ThreadActor`; exact `expectedTurnId` validation과 active turn response |
| `turn/interrupt` | `raw-wrapper` / `baseline` | T0·`T0-C`에는 없음; normal control과 startup cancel을 별도 tracer로 분리 | `ThreadActor`; normal pending-response barrier와 empty sentinel source |
| `thread/started`, `turn/started`, `turn/completed` | `schema-only` / `baseline` | T0·`T0-C` scope-local correlation | `ThreadActor`; response/notification lifecycle와 authoritative terminal |
| `item/started`, `item/agentMessage/delta`, `item/completed` | `schema-only` / `baseline` | T0·`T0-C` scope-local observation | `ThreadActor`; native thread·turn·item scope mapping |
| `error`, `thread/status/changed`, `thread/settings/updated` | `schema-only` / `baseline` | Active second-start hazard evidence이며 T0 semantic integration 아님 | `ThreadActor`; branch별 error·thread-settings side effect evidence |

이 표는 design target이며 integration을 승격하지 않는다. Coverage schema와 executable A/B/active-second-start oracle은 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md) ticket이 소유하므로 이번 decision 전에는 `codex-method-decisions.json`과 generated inventory를 수정하지 않는다.

### HITL decision

권고안 A처럼 T0의 public max-one을 유지하고 바로 다음 runtime conformance tracer를 `T0-C`로 두어 public cross-thread independence를 연 뒤 T0.1 approval로 갈지 결정해야 한다. Same-thread start의 idle-only admission과 explicit steer·normal interrupt·startup cancellation의 method별 분리는 source baseline으로 고정하며 product queue·steer UX는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md) ticket에 남긴다.

## Answer

Ticket을 resolve할 때 작성한다.
