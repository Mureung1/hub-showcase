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

이 실행은 same-key FIFO, different-key concurrency, idle steer rejection, matching active-ID steer와 interrupt lifecycle을 확인한다. Active `A` 중 두 번째 App Server `turn/start`의 `response B → lifecycle A`와 두 long-running thread의 end-to-end interleaving은 여전히 first-party external-boundary test가 없으며, 선택지 B를 채택하거나 `T0-C`를 구현할 때 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 executable oracle을 소유한다. 이 test 결과만으로 아래 A/B HITL을 선결정하지 않는다.

이 사실에서 결정 없이 따라오는 owner 경계는 다음과 같다.

| Owner | Concurrency 책임 | 소유하지 않는 것 |
| --- | --- | --- |
| `CodexAppServerConnection` | Concurrent pending RPC registry, exact direction-aware `RequestId` demux, single ingress drain, serialized writer | Thread active state, queue·steer 의미, cross-thread causal order |
| `CodexConversationRuntime` | Native `ThreadId`별 `ThreadActor`, method-specific semantic admission, provisional·active·terminal state에 따른 pre-wire validation | Browser busy copy, user queue UX, `ModelingRun` policy |
| `AYPLE adapter` | Runtime busy/conflict를 제품 행동으로 번역하고 실제 use case에서 queue·steer UX와 `ModelingRun` mapping 결정 | Raw method ordering이나 native identity authority 재정의 |

`ThreadActor`, admission과 `turn/steer`는 implementation·protocol vocabulary이므로 `CONTEXT.md`에는 새 제품 용어를 추가하지 않는다.

### Same-thread start admission 선택지

| 선택지 | 동작 | 판단 |
| --- | --- | --- |
| A. First-party routed operations | Idle `ThreadActor`의 새-turn operation만 `turn/start`를 사용한다. Active input은 해당 tracer가 채택될 때 별도 `turn/steer(expectedTurnId=A)` operation으로 보낸다. 그 전에는 reusable active-input surface를 노출하지 않으며, raw connection helper가 존재하더라도 active `turn/start`를 불법 wire라고 재정의하지 않는다. | 권고. Pinned TUI의 client routing과 matching active-ID response를 보존하며, intentional raw overload는 현재 tracer가 채택하지 않은 method branch로 정확히 남긴다. Queue·retry는 포함하지 않는다. |
| B. Native overloaded start | Active state에도 raw `turn/start`를 보낸다. Regular non-empty input·item·terminal은 active `A`에 귀속하지만 response `B`는 새 active turn authority가 아니다. Regular empty는 public `error(turnId=B)`를 만들 수 있고, review·compact는 typed `ActiveTurnNotSteerable(B)`를 drop하면서 thread-scoped `SystemError`를 남길 수 있다. Non-default settings override는 이 분기 전에 적용되고 그 observation도 thread-scoped다. | Intentional server branch를 직접 보존하는 선택이다. 채택하면 regular non-empty, regular empty, review·compact와 conditional settings를 각각 required tracer와 conformance matrix로 올리고, `B`를 turn handle로 노출하지 않는 Interface가 필요하다. |
| C. Runtime queue | Active state의 start를 terminal 뒤까지 보관했다가 새 `turn/start`로 보낸다. | 제외 권고. Pinned client/kernel의 필수 contract가 아니고 cancellation·bound·ordering을 선결정하며 product queue UX와 겹친다. |

이 첫 결정은 reusable same-thread surface의 method routing과 adoption boundary를 정한다. A는 protocol semantics를 부정하는 idle-only policy가 아니라 first-party external-client routing을 채택하는 선택이고, B는 intentional raw overload까지 semantic integration 범위에 넣는 선택이다. T0는 새 thread에 첫 turn만 시작하므로 어느 선택지도 현재 T0 wire path를 바꾸지 않는다.

### Public concurrency tracer 선택지

| 선택지 | 동작 | 판단 |
| --- | --- | --- |
| A. T0 유지 뒤 `T0-C` | T0의 runtime-wide `runNewConversation()` max-one/no-queue pre-admission은 유지한다. 내부 ingress·RPC·per-thread owner는 global lock 없이 구현하고, 다음 runtime conformance tracer `T0-C`가 public slot만 제거해 두 T0 operation의 `A pending → B completes → A completes`를 증명한다. | 권고. [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)의 T0 범위를 보존하면서 T0.1 approval 전에 cross-thread independence를 검증한다. |
| B. T0 자체를 확장 | 첫 T0 implementation부터 concurrent `runNewConversation()`을 허용한다. | 최종 source shape에는 가깝지만 이미 승인한 T0의 half-created-thread 방지 pre-admission과 첫 slice 범위를 다시 연다. |
| C. Product 필요까지 global max-one 유지 | T0 뒤에도 runtime-wide slot을 유지하다 첫 adapter가 요구할 때 제거한다. | 제외 권고. First-party의 per-thread locality를 제품 우선순위에 종속시키고 global actor·journal·pending-request 가정을 굳힐 위험이 있다. |

- T0의 composite operation slot은 첫 wire mutation 전에 획득해 `thread/start → turn/start` bootstrap 전체를 보호하며 ingress, response demux와 Server request 처리를 막지 않는다.
- Same-thread 선택지 A를 고르면 reusable thread surface는 idle 새-turn과 active input을 서로 다른 operation으로 두고, 후자는 exact `expectedTurnId`를 쓰는 `turn/steer` tracer에서 채택한다. 선택지 B를 고르면 active second-start와 선행 settings·error branch 전체가 별도 required tracer가 된다.
- Normal `turn/interrupt`는 known active `(ThreadId, TurnId)` control tracer에서만 채택한다. Empty-`turnId` startup interrupt는 normal interrupt와 합치지 않고 실제 startup-cancellation use case까지 defer한다. [`normal/startup interrupt branch`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408), [`first-party startup routing`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L560)
- 서로 다른 `ThreadActor`는 독립적으로 진행하며 한 actor의 pending turn·RPC·Server request가 다른 actor의 ingress routing이나 semantic progression을 막지 않는다. Count·byte bound와 saturation, timeout·unknown outcome은 각각 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md) ticket과 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md) ticket이 소유한다.

### Coverage ledger 초안

| Inventory row | 현재 integration / adoption | Ticket 010 target | Semantic owner와 evidence |
| --- | --- | --- | --- |
| `thread/start` | `raw-wrapper` / `baseline` | T0 bootstrap, `T0-C` concurrent bootstrap | `CodexConversationRuntime`; [`serialization: None`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L482-L486)과 request-correlated response identity |
| `turn/start` | `raw-wrapper` / `baseline` | T0·`T0-C` idle branch required; intentional active overload adoption은 Same-thread HITL 결과에 따름 | `ThreadActor`; active routing source·protocol classification·TUI explicit steer precedent |
| `turn/steer` | `raw-wrapper` / `later` | 별도 active-input tracer 전 deferred | `ThreadActor`; exact `expectedTurnId` validation과 active turn response |
| `turn/interrupt` | `raw-wrapper` / `baseline` | T0·`T0-C`에는 없음; normal control과 startup cancel을 별도 tracer로 분리 | `ThreadActor`; [`normal pending과 startup branch`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408), [`pending response drain`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1498-L1511) |
| `thread/started`, `turn/started`, `turn/completed` | `schema-only` / `baseline` | T0·`T0-C` scope-local correlation | `ThreadActor`; response/notification lifecycle와 authoritative terminal |
| `item/started`, `item/agentMessage/delta`, `item/completed` | `schema-only` / `baseline` | T0·`T0-C` scope-local observation | `ThreadActor`; native thread·turn·item scope mapping |
| `error`, `thread/status/changed`, `thread/settings/updated` | `schema-only` / `baseline` | Active second-start hazard evidence이며 T0 semantic integration 아님 | `ThreadActor`; branch별 error·thread-settings side effect evidence |

이 표는 design target이며 integration을 승격하지 않는다. Coverage schema와 executable A/B/active-second-start oracle은 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md) ticket이 소유하므로 이번 decision 전에는 `codex-method-decisions.json`과 generated inventory를 수정하지 않는다.

### HITL decision

첫 결정은 Same-thread 선택지 A처럼 first-party client의 idle `turn/start` / active `turn/steer` routing을 따를지, B처럼 intentional active `turn/start` overload까지 직접 채택할지다. 추천은 A다. 이는 raw branch를 오류로 재정의하지 않고 현재 semantic integration 밖에 두며, active input을 채택할 때 native expected-ID operation을 사용한다. B도 source-faithful하지만 response `B`와 running `A`, settings·error 세 branch를 runtime Interface와 required oracle에 함께 포함한다. C는 source에 없는 queue policy를 만든다. 이 결정을 받은 뒤 public cross-thread 선택지 A의 `T0-C` 시점을 다음 한 질문으로 확인한다. Product queue·steer UX는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md) ticket에 남긴다.

## Answer

Ticket을 resolve할 때 작성한다.
