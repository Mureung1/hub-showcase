# 010 — Thread·turn concurrency 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md)

## Question

T0의 max-one/no-queue composite-operation admission과 native `ThreadId`별 semantic owner를 baseline으로 두고, 채택한 method의 pinned source/test legal transition을 보존하면서 같은 thread mutation admission과 서로 다른 thread의 ingress·RPC·semantic 독립성을 어떤 runtime invariant와 conformance tracer로 고정할 것인가? `turn/steer`·`turn/interrupt`는 해당 inventory row를 채택한 tracer에서만 추가하고, cross-thread scheduler artifact를 global causal order로 만들지 않는다.

Runtime admission과 AY-PLE의 reject·queue·steer UX를 분리하며 product policy는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)에 남긴다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## 진행 메모

### Source-grounded concurrency 사실

| 범위 | Exact-pin source/test 판독 | 설계 압력 |
| --- | --- | --- |
| App Server RPC serialization | `turn/start`·`turn/steer`·`turn/interrupt`는 native `threadId`별 exclusive queue를 공유하고 같은 key에서 FIFO로 request future를 실행한다. 서로 다른 key는 별도 drain task에서 동시에 실행된다. `turn/start`·`turn/steer`는 이 future 안에서 response를 보내지만, matching active turn을 interrupt하는 normal success path는 pending request를 등록하고 response 없이 future를 끝내므로 다음 same-thread RPC가 interrupt response·terminal보다 먼저 시작할 수 있다. [`serialization scope`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L805-L820), [`queue drain`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L169-L200), [`interrupt deferred response`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408) | Server FIFO를 turn-lifetime lock이나 모든 method의 response barrier로 일반화하지 않는다. External serialized writer와 single ingress도 runtime-wide semantic mutex가 아니다. |
| Active turn의 두 번째 `turn/start` | Handler는 새 submission ID `B`를 성공 response로 돌려줄 수 있지만 core가 처리할 때 regular turn `A`가 active면 input은 `A`로 steer되고 `B`의 started·terminal이 없을 수 있다. Protocol의 `ActiveTurnNotSteerable` 설명은 `turn/start`와 `turn/steer`를 모두 same-turn steering 시도로 명시하고, core tests도 active `Op::UserInput`이 기존 turn ID에 queue되는 의미를 검증한다. 따라서 regular active-start는 우연한 edge가 아니라 intentional native overload다. Non-default settings override는 steer 가능 여부를 판단하기 전에 적용되고 thread-scoped observation을 만들 수 있다. Regular empty는 `error(turnId=B)`를 만들 수 있고, review·compact는 typed error를 drop하면서 thread-scoped `SystemError`를 남길 수 있어 branch별 scope와 `B` lifecycle이 갈라진다. 이 overload의 App Server response `B`와 observation `A` divergence를 직접 고정한 first-party external-boundary test는 없다. [`turn/start` response path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568), [`core active routing`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L285), [`ActiveTurnNotSteerable` contract](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/protocol.rs#L1764-L1768), [`same-turn queued input test`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/hooks.rs#L1783-L1936), [Pinned method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md) | Runtime은 intentional raw overload를 직접 채택할지, first-party client처럼 idle start와 active steer를 method별 operation으로 분리할지 결정해야 한다. 어느 경우에도 response `B`를 새 active turn이라고 추측하지 않는다. |
| First-party active input | TUI는 cached active turn이 있으면 `turn/steer(expectedTurnId)`, 없으면 `turn/start`를 사용한다. Missing·mismatch retry와 non-steerable queue는 TUI surface policy다. [`TUI method routing`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L677), [`turn/steer` validation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955) | Idle-only `startTurn`과 별도 explicit steer는 강한 first-party precedent지만 protocol이 강제하는 유일한 client policy는 아니다. TUI queue·retry는 복사하지 않는다. |
| Cross-thread progression | App Server는 thread마다 event listener를 하나씩 두고, request serialization도 native thread key별로 분리한다. 서로 다른 listener가 공용 outgoing channel에 넣는 상대 순서에 causal 의미가 없다는 것은 이 task graph에서 얻은 inference다. Distinct long-running A/B turn의 first-party end-to-end concurrency test는 없다. [`per-thread listener`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L240-L343), [`different-key concurrency test`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L274-L306) | Connection ingress와 exact RPC demux는 처음부터 global operation slot과 독립적으로 진행하고 semantic state는 native `ThreadId`별 owner에 둔다. Public A/B concurrency는 별도 conformance tracer로 증명한다. |

### Pinned test 실행 검증

Exact pin `767822446c7a594caa19609ca435281a9ec67e0d`와 repo-declared Rust `1.95.0`을 disposable worktree·별도 Cargo target에서 실행했다. Cargo 실행은 main repo와 evidence checkout을 변경하지 않았다.

| 검증 범위 | First-party test filter | 결과 |
| --- | --- | --- |
| Per-key request serialization | `codex-app-server --lib request_serialization::tests::` | 7 passed · 0 failed |
| Active input routing과 validation | `codex-app-server --test all suite::v2::turn_steer::` | 4 passed · 0 failed |
| Active·terminal·approval interrupt | `codex-app-server --test all suite::v2::turn_interrupt::` | 3 passed · 0 failed |
| Same-turn queued input | `hooks::blocked_queued_prompt_does_not_strand_earlier_accepted_prompt`, `pending_input::steered_user_input_waits_for_model_continuation_after_mid_turn_compact` | 2 passed · 0 failed. Hooks test는 default test-thread stack에서 overflow한 뒤 `RUST_MIN_STACK=33554432`로 재실행해 통과했으며 assertion failure는 없었다. |

이 실행은 same-key FIFO, different-key concurrency, idle steer rejection, matching active-ID steer와 interrupt lifecycle을 확인한다. Active `A` 중 두 번째 App Server `turn/start`의 `response B → lifecycle A`, response가 없는 start-in-flight actor에 두 번째 semantic mutation을 넣는 external-client admission, 두 long-running thread의 end-to-end interleaving은 여전히 first-party external-boundary test가 없다. Active overload tracer나 `T0-C`를 구현할 때 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 executable oracle을 소유한다. 이 test 결과 자체가 method adoption 결정을 대신하지 않으며, 채택 결과는 아래 결정과 Answer에 기록한다.

이 사실에서 결정 없이 따라오는 owner 경계는 다음과 같다.

| Owner | Concurrency 책임 | 소유하지 않는 것 |
| --- | --- | --- |
| `CodexAppServerConnection` | Concurrent pending RPC registry, exact direction-aware `RequestId` demux, single ingress drain, serialized writer | Thread active state, queue·steer 의미, cross-thread causal order |
| `CodexConversationRuntime` | Native `ThreadId`별 `ThreadActor`, method-specific semantic admission, provisional·active·terminal state에 따른 pre-wire validation | Browser busy copy, user queue UX, `ModelingRun` policy |
| `AYPLE adapter` | Runtime busy/conflict를 제품 행동으로 번역하고 실제 use case에서 queue·steer UX와 `ModelingRun` mapping 결정 | Raw method ordering이나 native identity authority 재정의 |

`ThreadActor`, admission과 `turn/steer`는 implementation·protocol vocabulary이므로 `CONTEXT.md`에는 새 제품 용어를 추가하지 않는다.

### Same-thread start admission과 adoption 선택지

T0의 runtime-wide composite-operation slot은 현재 public surface에서 start-in-flight 중복을 막지만, `T0-C`가 cross-thread global slot을 제거한 뒤에는 native `ThreadId`별 admission이 독립적으로 유지되어야 한다. Response 전 provisional actor가 notification-first `turn/started`에서 `TurnId`를 관찰했을 수는 있지만, request response와 수렴하기 전의 notification-only identity는 후속 operation admission authority로 노출하지 않는다. 따라서 이 상태를 `turn/steer(expectedTurnId)`로 안전하게 route했다고 간주하지 않는다. T0와 `T0-C`는 reusable same-thread mutation surface를 노출하지 않으므로 이 상태의 두 번째 public call은 현재 tracer에 존재하지 않는다. 후속 surface를 채택할 때는 actor-local pre-wire reservation과 method-specific tracer가 없이 중복 mutation을 silent queue하거나 raw overload로 보내지 않는다.

| 선택지 | 동작 | 판단 |
| --- | --- | --- |
| A. First-party routed operations | 후속 existing-thread surface는 actor-local reservation으로 start-in-flight의 두 번째 semantic mutation을 RequestId 할당·wire write·queue 없이 safe conflict로 거부한다. Idle의 새-turn operation만 `turn/start`를 사용하고, active input은 해당 tracer가 채택될 때 별도 `turn/steer(expectedTurnId=A)` operation으로 보낸다. Raw active `turn/start` overload는 불법 wire로 재정의하지 않고 미채택 branch로 남긴다. | 권고. Pinned TUI의 client routing과 matching active-ID response를 보존하며, source에 없는 runtime queue·retry를 만들지 않는다. Current T0/T0-C에 새 public same-thread API를 추가한다는 뜻은 아니다. |
| B. Active-input adoption defer | 이번 ticket은 T0/T0-C의 per-thread ownership과 start-in-flight silent queue 금지만 확정하고, idle start·active steer·active overload 중 어떤 reusable operation을 노출할지는 active-input tracer까지 전부 미룬다. | 현재 tracer 범위를 가장 엄격히 지키지만 first-party routed operation이라는 이후 baseline을 현재 architecture decision에서 고정하지 않는다. |
| C. Named active-overload tracer | Intentional active `turn/start` overload를 별도 tracer로 채택하되 regular non-empty text·empty·review·compact·settings 중 해당 tracer가 명시한 variant만 semantic integration으로 승격한다. 나머지 branch는 deferred로 유지한다. | Server의 intentional overload를 직접 사용할 실제 use case가 있을 때만 선택한다. `response B → lifecycle A`와 variant-specific side effect를 executable oracle로 같이 올려야 한다. |

이 첫 결정은 reusable same-thread surface의 method routing과 adoption boundary를 정한다. A는 protocol semantics를 부정하는 idle-only policy가 아니라 first-party external-client routing을 후속 tracer의 baseline으로 채택하는 선택이고, B는 그 baseline 자체를 owning tracer까지 미룬다. C는 intentional raw overload를 별도 named tracer로 채택하되 미채택 variant를 묶지 않는다. Source에 없는 runtime queue는 선택지가 아니며 product UX로 남긴다. T0는 새 thread에 첫 turn만 시작하므로 어느 선택지도 현재 T0 wire path를 바꾸지 않는다.

#### 결정 1 — First-party routed operations

상위 승인 원칙인 “채택한 method의 pinned implementation·first-party handling을 기본값으로 두고 실제 AY-PLE use case가 부족함을 증명할 때만 deviation을 추가한다”를 적용해 선택지 A를 채택한다. Pinned TUI처럼 idle new-turn과 active input을 method별로 분리하고, active input은 후속 `turn/steer(expectedTurnId)` tracer가 채택할 때만 semantic surface로 올린다. Response와 matching `turn/started`가 수렴하기 전의 actor-local reservation은 두 번째 semantic mutation을 RequestId 할당·wire write·queue 없는 safe conflict로 막는다. Raw active `turn/start` overload는 protocol error로 재정의하지 않고 실제 use case와 named tracer가 생기기 전까지 미채택으로 남긴다.

### Public concurrency tracer와 implementation graph 경계

`T0-C`는 T0와 분리된 required runtime conformance tracer다. T0의 public runtime-wide operation slot을 제거하고, 두 conversation operation의 `A pending → B completes → A completes`를 증명한다. `CodexAppServerConnection`의 single ingress·exact demux와 `CodexConversationRuntime`의 per-thread actor는 T0부터 global semantic mutex 없이 구현하되, public max-one slot은 `T0-C`가 gate를 통과한 뒤에만 제거한다.

`T0-C`와 T0.1의 original `RequestId` once-only approval lifecycle 사이에는 architecture dependency가 없다. 둘의 상대 순서는 concurrency contract가 아니다. Resulting spec은 두 tracer의 required behavior와 capability-specific runtime-before-product gate를 기록한다. `/to-tickets`는 live code에서 true blocker를 다시 확인해 graph를 작성하며, 상호 blocker가 없으면 두 ticket을 common foundation 뒤 sibling frontier로 둔다. `T0-C` 우선 구현은 risk-based recommendation일 수는 있지만 Wayfinder HITL decision이나 인위적인 `Blocked By` edge로 만들지 않는다. T0.1은 첫 AYPLE adapter가 command approval capability를 소비할 때만 그 adapter의 blocker가 되며, 정확한 readiness edge는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)가 소유한다.

- T0의 composite operation slot은 첫 wire mutation 전에 획득해 `thread/start → turn/start` bootstrap 전체를 보호하며 ingress, response demux와 Server request 처리를 막지 않는다.
- Same-thread reusable surface는 idle new turn과 active input을 서로 다른 operation으로 둔다. Idle new turn은 `turn/start`, active input은 해당 tracer가 채택할 때 exact `expectedTurnId`를 쓰는 `turn/steer`를 사용한다. Raw active `turn/start` overload는 named use-case tracer 전까지 deferred다.
- Normal `turn/interrupt`는 known active `(ThreadId, TurnId)` control tracer에서만 채택한다. Empty-`turnId` startup interrupt는 normal interrupt와 합치지 않고 실제 startup-cancellation use case까지 defer한다. [`normal/startup interrupt branch`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408), [`first-party startup routing`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L560)
- 서로 다른 `ThreadActor`는 독립적으로 진행하며 한 actor의 pending turn·RPC·Server request가 다른 actor의 ingress routing이나 semantic progression을 막지 않는다. Count·byte bound와 saturation, timeout·unknown outcome은 각각 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md) ticket과 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md) ticket이 소유한다.
- T0 자체에 concurrent public operation을 합치거나 `T0-C`를 첫 product adapter가 필요할 때까지 미루는 경로는 정상 선택지가 아니다. 전자는 이미 승인된 T0 slice scope를 다시 열고, 후자는 first-party per-thread locality를 product 우선순위에 종속시킨다.

### Coverage ledger 초안

| Inventory row | 현재 integration / adoption | Target tracer | Target coverage / adoption | Semantic owner와 evidence |
| --- | --- | --- | --- | --- |
| `thread/start` | `raw-wrapper` / `baseline` | T0, `T0-C` | required bootstrap; `T0-C`에서 cross-thread concurrent bootstrap | `CodexConversationRuntime`; [`serialization: None`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L482-L486)과 request-correlated response identity |
| `turn/start` | `raw-wrapper` / `baseline` | T0, `T0-C` | idle branch required; active overload는 named use-case tracer 전까지 deferred | `ThreadActor`; active routing source·protocol classification·TUI explicit steer precedent |
| `turn/steer` | `raw-wrapper` / `later` | 후속 active-input tracer | deferred; 채택 시 exact expected-ID behavior required | `ThreadActor`; exact `expectedTurnId` validation과 active turn response |
| `turn/interrupt` | `raw-wrapper` / `baseline` | 후속 normal-control tracer, 별도 startup-cancel tracer | T0·`T0-C` deferred | `ThreadActor`; [`normal pending과 startup branch`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408), [`pending response drain`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1498-L1511) |
| `thread/started` | `schema-only` / `baseline` | T0, `T0-C` | response-first validation required; completion wait condition은 아님 | `ThreadActor`; request-correlated `thread/start` response authority |
| `turn/started` | `schema-only` / `baseline` | T0, `T0-C` | legal either-order convergence required | `ThreadActor`; response/notification lifecycle |
| `turn/completed` | `schema-only` / `baseline` | T0, `T0-C` | matching authoritative terminal required | `ThreadActor`; native thread·turn scope terminal |
| `item/started` | `schema-only` / `baseline` | T0, `T0-C` | tolerated inbound coverage | `ThreadActor`; native thread·turn·item scope mapping |
| `item/agentMessage/delta` | `schema-only` / `baseline` | T0, `T0-C` | tolerated inbound coverage; streaming projection은 deferred | `ThreadActor`; native thread·turn·item scope mapping |
| `item/completed` | `schema-only` / `baseline` | T0, `T0-C` | matching completed AgentMessage required | `ThreadActor`; native thread·turn·item scope mapping |
| `error` | `schema-only` / `baseline` | 후속 active-overload tracer | T0 semantic integration deferred; hazard evidence only | `ThreadActor`; branch별 turn/thread error scope |
| `thread/status/changed` | `schema-only` / `baseline` | 후속 status tracer | T0 semantic integration deferred; hazard evidence only | `ThreadActor`; thread-scoped status observation |
| `thread/settings/updated` | `schema-only` / `baseline` | 후속 settings 또는 active-overload tracer | T0 semantic integration deferred; conditional side-effect evidence only | `ThreadActor`; pre-routing settings update evidence |

이 표는 design target이며 integration을 승격하지 않는다. Coverage schema와 executable A/B/active-second-start oracle은 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md) ticket이 소유한다. Coverage schema가 아직 구현되지 않았으므로 이번 design resolution에서는 `codex-method-decisions.json`과 generated inventory를 수정하거나 integration을 승격하지 않는다.

## Answer

`CodexAppServerConnection`은 concurrent pending RPC registry, exact direction-aware `RequestId` demux, single ingress drain과 serialized writer를 소유하되 runtime-wide semantic mutex를 두지 않는다. `CodexConversationRuntime`은 native `ThreadId`별 `ThreadActor`를 semantic owner로 두고 서로 다른 actor의 ingress·RPC·semantic progression을 독립적으로 허용한다. Cross-thread wire 상대 순서는 causal order나 publication contract로 승격하지 않는다.

Same-thread operation은 pinned first-party routed-operation baseline을 채택한다. Start-in-flight mutation은 actor-local pre-wire reservation으로 RequestId 할당·wire write·queue 없는 safe conflict로 처리한다. Idle new turn은 `turn/start`를 사용하고 active input은 해당 method tracer가 채택할 때 `turn/steer(expectedTurnId)`로 보낸다. Raw active `turn/start` overload는 named use case가 생기기 전까지 deferred며 protocol violation으로 재정의하지 않는다. Normal `turn/interrupt`와 empty-ID startup interrupt도 각각의 method tracer 전까지 deferred다.

Cross-thread public independence는 별도 required `T0-C` tracer가 `A pending → B completes → A completes`를 deterministic fake child와 필요한 live gate에서 증명한다. T0의 max-one/no-queue public slot은 이 gate 전까지만 유지하고, 이를 내부 Connection ingress·demux·actor progression의 global lock으로 구현하지 않는다. `T0-C`는 첫 runnable AYPLE adapter의 runtime readiness gate다.

`T0-C`와 T0.1은 서로를 대체하지 않는 independent conformance slice며 현재 semantic blocker가 없다. `/to-tickets`는 true code blocker가 발견되지 않으면 common foundation 뒤 sibling frontier로 두고, 단순한 risk preference로 인위적인 dependency edge를 만들지 않는다. T0.1이 첫 adapter의 blocker인지는 그 adapter가 command approval capability를 소비하는지에 따라 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)가 결정한다.

[위 Coverage ledger 초안](#coverage-ledger-초안)의 current integration·adoption, target tracer·coverage, semantic owner·source evidence를 이 decision checkpoint의 record로 채택한다. 이번은 design resolution이므로 `codex-method-decisions.json`과 generated inventory를 수정하거나 integration을 승격하지 않는다. Count·byte bound·saturation은 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), timeout·unknown outcome은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md), executable verification matrix는 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 소유한다.

### Review checkpoint

- Source: 0 findings. Pinned per-thread queue·listener locality, first-party `turn/steer(expectedTurnId)` routing과 command approval의 single-thread callback lifecycle을 보다 강하게 일반화하지 않았다. Upstream에 long-running two-thread external-boundary test가 없는 한계는 `T0-C` fake-child·live gate로 넘겼다.
- Standards: 0 findings. Resolved state, Answer, map gist, design-only ledger workflow과 Wayfinder→`/to-tickets` 책임 경계가 정렬되었다.
- Spec: 0 findings. T0 scope, same-thread admission, `T0-C`·T0.1·adapter partial order가 상위 goal과 resolved Ticket 008·009에 일치하며 허위 dependency를 만들지 않았다.
