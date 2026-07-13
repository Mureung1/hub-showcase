# Pinned Codex App Server method lifecycle fact table

- 분류: 기술 참고
- 성숙도: 초안
- 대상 pin: `@openai/codex@0.144.0`, upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`
- 범위: `initialize`, thread lifecycle, `turn/start`, active edge의 source-shaped `turn/steer`, `turn/interrupt`, streamed lifecycle event

이 문서는 Wayfinder Ticket 004의 설계 근거다. 현재 제품 계약이나 retry UX를 결정하지 않고, pinned Codex App Server가 실제로 제공하는 관찰·상관관계 사실과 그로부터 바로 따라오는 kernel 제약만 기록한다.

## 근거 범위와 증거 등급

| 등급 | 근거 | 이 문서에서의 사용 |
| --- | --- | --- |
| Current docs | [공식 App Server 문서](https://developers.openai.com/codex/app-server/) | 현재 public lifecycle 설명. moving 문서이므로 `0.144.0` ordering 근거로 쓰지 않음 |
| Pinned shape | repo의 checked-in generated protocol | package-owned `0.144.0` binary가 생성한 method·field·identity shape |
| Pinned implementation | exact commit의 Rust source | `0.144.0`의 ordering, task 경계와 serialization 동작 |
| Pinned test | exact commit의 first-party tests와 test client | source 해석과 documented edge를 검증하는 version-specific evidence |
| Observed | pinned package binary를 실행한 단일 live probe | source 해석의 sanity check. normative contract로 격상하지 않음 |
| Inference | 위 구조에서 도출한 가능한 interleaving·제약 | 반드시 inference로 표시하고 product decision과 구분 |
| Product decision | AY-PLE의 API, buffering, retention, recovery 선택 | 이 fact asset이 소유하지 않고 후속 Wayfinder ticket에 남김 |

공식 문서는 모든 response/notification 상대 순서, notification sequence, duplicate 처리, timeout reconciliation을 정의하지 않는다. 최신 문서의 experimental field도 checked-in stable generated type에 없으면 이 baseline에 포함하지 않는다.

### Checked-in generated shape index

아래 파일은 package pin으로 생성해 repo에 보존한 public wire shape의 직접 근거다. Method/event 이름과 params mapping은 aggregate union에서, response와 notification payload는 개별 generated type에서 확인한다.

| 범위 | Generated shape evidence |
| --- | --- |
| request method와 params mapping | [`ClientRequest`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/ClientRequest.ts), [`InitializeParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/InitializeParams.ts), [`ThreadStartParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStartParams.ts), [`ThreadListParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadListParams.ts), [`ThreadReadParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadReadParams.ts), [`ThreadResumeParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadResumeParams.ts), [`TurnStartParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnStartParams.ts), [`TurnSteerParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnSteerParams.ts), [`TurnInterruptParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnInterruptParams.ts) |
| response payload | [`InitializeResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/InitializeResponse.ts), [`ThreadStartResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStartResponse.ts), [`ThreadListResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadListResponse.ts), [`ThreadReadResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadReadResponse.ts), [`ThreadResumeResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadResumeResponse.ts), [`TurnStartResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnStartResponse.ts), [`TurnSteerResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnSteerResponse.ts), [`TurnInterruptResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnInterruptResponse.ts) |
| notification method와 payload | [`ServerNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/ServerNotification.ts), [`ThreadStartedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStartedNotification.ts), [`ThreadStatusChangedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStatusChangedNotification.ts), [`TurnStartedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnStartedNotification.ts), [`ItemStartedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ItemStartedNotification.ts), [`ItemCompletedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ItemCompletedNotification.ts), [`ErrorNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ErrorNotification.ts), [`TurnCompletedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnCompletedNotification.ts) |
| native lifecycle model | [`Thread`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/Thread.ts), [`Turn`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/Turn.ts), [`ThreadItem`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadItem.ts) |

## Method lifecycle table

| Method | Response와 identity authority | 연관 observation과 합법적 순서 | duplicate·retry·timeout | Pinned evidence |
| --- | --- | --- | --- | --- |
| `initialize` | exact JSON-RPC request ID의 성공 response가 connection handshake authority다. domain identity는 없다. | server session commit 뒤 response가 enqueue된다. client는 response 뒤 `initialized`를 보낸다. connection-scoped warning/status는 ingress에서 독립적으로 처리한다. | 같은 connection의 재호출은 `Already initialized`. timeout이면 server-side commit 여부가 unknown이다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/initialize_processor.rs#L44-L155) |
| `thread/start` | response의 native `thread.id`가 유일한 request-correlated identity authority다. | matching `thread/started`만 pinned source에서 response 뒤다. listener는 response 전에 attach되므로 `configWarning`, unrelated notification과 같은 새 thread의 startup observation이 response 전에 올 수 있다는 것은 task graph inference다. capability opt-out이면 `thread/started`가 없을 수 있다. | idempotency key가 없다. timeout 뒤 재호출하면 두 번째 thread가 생길 수 있고, 첫 user input 전 thread는 storage/list로 조회되지 않을 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1212-L1360) · [materialization test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_start.rs#L339-L375) |
| `thread/list` | response의 각 native `Thread.id`; related notification은 없다. | 다른 list 및 mutation과 concurrent다. storage page 뒤 live status를 overlay하므로 transactional snapshot으로 보지 않는다. | 새 request ID 재조회는 가능하지만 결과와 opaque cursor가 달라질 수 있다. `useStateDbOnly=false`는 metadata scan-and-repair를 수행할 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1956-L2055) · [repair test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_list.rs#L873-L999) |
| `thread/read` | input `threadId`와 이를 확인하는 response `thread.id`; related notification은 없다. | same-thread RPC는 serialize되지만 listener event는 interleave할 수 있어 response는 즉시 stale해질 수 있다. read 자체는 resume/subscription이 아니다. | timeout 뒤 새 request ID로 다시 읽을 수 있다. 늦은 첫 response도 ingress가 request ID로 소비해야 하며, caller 전달·폐기 정책은 후속 recovery 결정에 남긴다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2230-L2320) |
| `thread/resume` | known native `threadId`를 확인하는 성공 response가 resume/subscription authority다. `thread/started`는 emit하지 않는다. | cold resume는 listener attach와 `thread/status/changed`를 response보다 먼저 만들 수 있다. response 뒤 token usage, goal, pending request replay가 올 수 있다. running resume 중 기존 subscriber에는 live event가 계속 온다. | same-ID resume는 identity는 수렴하지만 replay/client-info side effect 때문에 strict idempotency가 아니다. timeout 때 listener attach·replay 여부는 unknown이고 known native ID는 유지된다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2664-L2972) |
| idle `turn/start` | response `turn.id`와 matching `turn/started.turn.id`는 같은 core-generated native identity를 전달한다. response는 request acceptance를, notification은 실제 execution start를 관찰한다. | response dispatch와 core listener가 다른 async task여서 어느 쪽도 먼저 올 수 있다. Source task graph상 `turn/started` 뒤 item/error/terminal까지 response를 앞설 수 있다. 각 observation은 native scope로 상관할 수 있으며 notification-first가 generation-wide holdback을 요구하지 않는다. | mutation 결과는 timeout 시 unknown이다. 반복 요청은 새 submission을 만들고 active 상태라면 steer될 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568) · Inference |
| active regular-turn + non-empty `turn/start` | 두 번째 response가 `turn.id=B`를 보고해도 별도 active turn B가 시작되었다는 authority가 아니다. | input은 이미 active인 A로 steer되고 `turn/started(B)`·`turn/completed(B)`가 없다. 이후 item event는 A에 귀속된다. | `turn/start response → 반드시 matching started`라는 일반 규칙은 성립하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L218-L283) · [observed](#live-probe) |
| active regular-turn + empty `turn/start` | response B는 성공하고 public `error(turnId=B, willRetry=false)`가 올 수 있으며 둘의 상대 순서는 보장되지 않는다. | B의 started/terminal은 없다. Error handler는 typed error보다 먼저 thread를 `SystemError`로 publish한다. Thread-scoped shared error summary 때문에 A terminal도 failed로 투영될 가능성이 source상 있다. 마지막 절은 아직 deterministic test가 없는 inference다. | B error와 A terminal을 한 lifecycle로 잘못 수렴하면 안 된다. Response와 thread status의 상대 순서는 task 경합상 either-order다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3874-L3946) · [error handler](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919) · Inference |
| active review/compact + `turn/start` | response B는 성공하지만 별도 B turn authority가 아니다. | internal `ActiveTurnNotSteerable(B)`는 `affects_turn_status=false`라 typed App Server error가 drop되고 B started/error/terminal이 모두 없을 수 있다. 그러나 filter 전에 thread-scoped `SystemError`가 publish된다. | Success response만으로 B lifecycle 존재를 추론할 수 없다. Response와 thread status는 task 경합상 either-order다. | [classification](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/protocol.rs#L1764-L1789) · [filter and status side effect](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919) |
| `turn/steer` | request의 `expectedTurnId`가 active turn precondition이고 성공 response는 actual active `turnId`를 돌려준다. 새 turn identity를 만들지 않는다. | active regular turn에 input을 queue하며 새 `turn/started`를 emit하지 않는다. no-active, mismatch, review/compact와 empty input은 success response 전 JSON-RPC error다. | accepted request를 반복하면 input을 다시 queue할 수 있고 dedup contract가 없다. timeout 때 queue 적용 여부는 unknown이다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955) |
| `turn/interrupt` | normal-turn response는 listener가 pending interrupt RPC를 resolve했다는 뜻이며 terminal status authority가 아니다. | 정상 경로에서 response가 terminal notification보다 먼저다. 자연 완료와 경합하면 completed terminal이 이길 수 있다. | Active 동안 들어온 복수 요청은 함께 `{}`로 resolve될 수 있다. post-terminal이나 active ID mismatch는 invalid request다. timeout은 적용 여부가 unknown이고 response `{}`만으로 terminal status를 알 수 없다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408) |

## Event lifecycle table

| Event | 의미와 authority | ordering·중복 제약 | Pinned evidence |
| --- | --- | --- | --- |
| `thread/started` | `thread/start` lifecycle publication. request ID가 없으므로 start response를 대신하는 identity authority가 아니다. | pinned start에서는 matching response 뒤다. opt-out으로 생략될 수 있다. exact duplicate semantics는 upstream이 정의하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1360) |
| `thread/status/changed` | native thread의 live status observation | cold `thread/resume` response 전에 올 수 있고 unrelated thread/host work와 interleave한다. 모든 `EventMsg::Error`는 typed error filtering 전에 thread runtime을 `SystemError`로 바꾸므로 non-turn-affecting error도 이 observation을 남길 수 있다. | [publication](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L221-L243) · [system-error transition](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L172-L179) |
| `turn/started` | 실제 turn lifecycle 시작 observation | idle start response와 either-order다. active-turn steer에는 새로운 B event가 없을 수 있다. capability opt-out으로 selected lifecycle event가 생략될 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/regular.rs#L47-L63) |
| `item/started → delta* → item/completed` | 일반 streamed item의 scope-local lifecycle | 보통 같은 item에서 이 순서를 따르지만 global wire order를 다른 thread/item의 causal order로 해석하지 않는다. | [start/delta path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/turn.rs#L2144-L2337) · [`ItemCompleted` emission](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L1999-L2014) |
| completion-only `SubAgentActivity` | 완료 시점에 처음 materialize될 수 있는 activity item | 모든 item에 `item/started`가 선행한다는 invariant를 두지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tools/handlers/multi_agents_v2.rs#L44-L51) |
| `error` with `willRetry=true` | transient turn error observation | terminal이 아니며 이후 같은 turn의 진행을 허용한다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L921-L936) |
| `error` with `willRetry=false` | app-server가 자동 retry하지 않는 turn-affecting error observation | 정상 turn에서는 failed `turn/completed`보다 먼저 올 수 있다. active-turn second-start edge에서는 matching B terminal이 보장되지 않는다. error 자체만으로 public turn terminal을 합성하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919) |
| `turn/completed` | turn status의 authoritative terminal publication. pinned notification의 `items`는 empty/`notLoaded`이므로 transcript item authority가 아니다. | terminal 뒤에도 original turn에 귀속된 background unified-exec item completion이 도착할 수 있다. turn terminal과 모든 child item 관측 종료를 동일시하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1216-L1245) |
| late background command completion | 이미 terminal인 original turn의 background command 정리 | event는 original `threadId`/`turnId`/`itemId`를 싣고 turn terminal 뒤에도 올 수 있다. live retention과 history recovery 중 어떤 방식으로 처리할지는 Ticket 011이 결정한다. | [test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/thread_history.rs#L3134-L3229) |

Protocol notification에는 global sequence나 normative dedup contract가 없다. duplicate/late/conflicting reuse 처리, tombstone retention과 bounded staging은 client robustness policy이며 upstream fact로 표현하지 않는다.

## Critical edge explanations

### 1. Handshake는 response barrier로 사용한다

Pinned server는 session을 response enqueue 전에 commit하고, repeated initialize를 거절한다. client는 내부 commit timing을 이용해 request를 pipeline하지 않고 public handshake대로 성공 response 뒤 `initialized`를 보낸다.

- [initialize_processor.rs L44-L155](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/initialize_processor.rs#L44-L155)
- [message_processor.rs L608-L619](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L608-L619)
- [first-party test client L1647-L1687](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1647-L1687)

### 2. `thread/start`의 matching `thread/started`는 response-first다

Pinned start task는 response send를 await한 뒤 matching `thread/started`를 send한다. 이 invariant는 `thread/started`에만 적용한다. Per-thread listener는 response 전에 attach되므로 pre-response `configWarning`, unrelated observation뿐 아니라 같은 새 thread의 MCP startup 같은 observation도 합법적으로 앞설 수 있다는 것이 source task graph상 inference다. First-party integration test의 response waiter는 그 사이 notification을 FIFO에 보관하므로 response-first evidence가 아니다. 이 wider interleaving도 generation-wide holdback의 근거가 아니며, opt-out은 `thread/started`를 억제할 수 있으므로 response가 request-correlated native identity authority다.

- [thread_processor.rs L1176-L1188](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1176-L1188)
- [listener attach L1280-L1296](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1280-L1296)
- [thread_processor.rs L1212-L1360](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1212-L1360)
- [thread-start opt-out test L212-L275](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/initialize.rs#L212-L275)
- [integration response waiter L1639-L1665](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/common/test_app_server.rs#L1639-L1665)

### 3. `turn/start`는 idle create와 active steer가 같은 method에 겹친다

`turn_start_inner`가 core submission 뒤 response payload를 반환하는 경로와 core `TurnStarted`를 listener가 전달하는 경로가 다른 task라 idle start는 either-order다. Core task가 계속 진행할 수 있으므로 source task graph상 started뿐 아니라 subsequent item/error/terminal도 response dispatch를 앞설 수 있다. notification-first 자체는 provisional public mutation이나 holdback을 요구하지 않는다. native scope로 상관한 뒤 request response와 일치 여부를 확인할 수 있다.

Active turn에서 같은 method를 다시 호출하면 response B는 새 submission ID를 보고하지만 실제 lifecycle은 세 갈래다.

- Regular + non-empty input: A에 steer되고 B started/terminal이 없다.
- Regular + empty input: public BadRequest error B가 오지만 B terminal은 없다. Typed error보다 먼저 thread status가 `SystemError`로 publish된다. error summary가 turn ID로 partition되지 않아 A terminal을 failed로 바꿀 가능성이 있다는 것은 source inference다.
- Review/compact: internal `ActiveTurnNotSteerable(B)`는 non-turn-affecting으로 분류되어 typed error가 drop되고 B에는 typed lifecycle notification이 없을 수 있다. 하지만 filter 전에 thread status는 `SystemError`로 publish된다.

두 error branch에서 status publication은 typed error filtering보다 먼저지만, request response와는 별 task라 상대 순서가 either-order라는 것이 source task graph inference다.

아래 live probe는 첫 branch만 관찰했다. 세 branch의 deterministic oracle 필요 여부와 형태는 Ticket 013이 결정한다.

Pinned stable protocol에는 active input을 위한 별도 `turn/steer`가 있다. `expectedTurnId`를 precondition으로 받아 actual active turn ID를 response하고, no-active·mismatch·non-steerable·empty input을 JSON-RPC error로 돌려준다. 따라서 custom create-vs-steer state machine이 유일한 해법은 아니다. 이 native method를 baseline에서 언제 채택할지는 Ticket 010이 결정한다.

- [turn_processor.rs L521-L568](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568)
- [response dispatch L1424-L1434](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L1424-L1434)
- [core regular turn start L47-L63](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/regular.rs#L47-L63)
- [새 submission ID 생성 L765-L780](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L765-L780)
- [active turn shared handler L218-L283](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L218-L283)
- [active regular turn steer L3874-L3946](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3874-L3946)
- [`ActiveTurnNotSteerable` status classification L1764-L1789](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/protocol.rs#L1764-L1789)
- [typed error filtering L879-L919](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919)
- [`note_system_error` L172-L179](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L172-L179)
- [thread status publication L221-L243](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L221-L243)
- [thread-scoped error summary L1542-L1566](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1542-L1566)
- [`turn/steer` validation과 actual turn response L849-L955](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955)
- [`turn/steer` serialization scope L811-L815](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L811-L815)

### 4. `thread/resume`은 response-first method가 아니다

Cold resume는 listener를 attach하고 watch status를 publish한 뒤 response를 보낸다. Running resume는 listener command를 enqueue하면 request serialization 작업이 끝나므로, listener가 response를 보내기 전에 다음 same-thread RPC가 시작될 수도 있다. 이는 pinned task 구조에 따른 inference다. 따라서 server의 same-thread serialization만으로 resume response와 후속 dependent call 사이의 ordering을 추론할 수 없다. Caller sequencing과 recovery 정책은 후속 설계가 정한다.

- [cold resume L2843-L2972](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2843-L2972)
- [status publication L221-L243](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L221-L243)
- [running resume enqueue L3152-L3186](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L3152-L3186)
- [resume response와 replay L594-L697](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L594-L697)

### 5. Turn terminal과 child item drain은 다른 축이다

`turn/completed`가 turn status authority여도 background unified-exec completion은 original turn으로 늦게 도착할 수 있다. 정상 item은 start/delta/complete를 주로 따르지만 `SubAgentActivity`처럼 completion-only item도 존재한다. Exact-tag README의 “항상 start → delta → complete” 설명보다 실제 event mapping이 더 넓은 관찰 집합을 만든다. 따라서 turn terminal만으로 original turn의 child observation이 모두 끝났다고 결론낼 수 없다. Live metadata retention과 history recovery 중 무엇을 사용할지는 Ticket 011이 정한다.

- [README의 per-item 설명 L1351-L1390](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L1351-L1390)
- [core canonical `SubAgentActivity` completion-only emission L44-L51](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tools/handlers/multi_agents_v2.rs#L44-L51)
- [canonical `ItemCompleted` App Server forwarding L980-L994](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L980-L994)
- [background exit watcher L104-L156](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/async_watcher.rs#L104-L156)
- [late completion의 original turn routing L650-L663](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/thread_history.rs#L650-L663)
- [late completion test L3134-L3229](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/thread_history.rs#L3134-L3229)
- [background terminal과 interrupt 경계 L923-L935](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L923-L935)

### 6. Response wait와 notification ingress를 분리한다

First-party test client는 exact request ID response를 기다리는 동안 먼저 읽은 notification을 FIFO로 보관한다. 이는 notification-first를 정상 transport condition으로 다룬다는 pinned evidence다. 이 synchronous test helper의 FIFO는 production kernel이 notification publication을 response까지 보류해야 한다는 근거가 아니며, cross-thread causal total order도 의미하지 않는다.

- [first-party wait loop L1964-L2005](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1964-L2005)
- [per-scope serialization L19-L103](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L19-L103)

### 7. Read, error와 interrupt는 서로 다른 authority를 가진다

`thread/list`와 `thread/read`는 response-only snapshot method다. `error`는 turn 중간 observation이고, 최종 status는 `turn/completed`가 정한다. Normal `turn/interrupt`는 terminal core event를 본 listener가 pending response를 먼저 보내고 이어 terminal notification을 내보내므로 `{}`만으로 interrupted status를 합성할 수 없다. Active 동안 들어온 복수 interrupt request는 pending queue에 함께 쌓여 모두 `{}`로 resolve될 수 있고, terminal 뒤 요청이나 active ID mismatch는 invalid request다. Pinned terminal notification은 item 목록을 싣지 않는다.

- [`thread/list` implementation L1956-L2055](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1956-L2055)
- [`thread/list` serialization scope L621-L625](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L621-L625)
- [`thread/read` implementation L2230-L2320](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2230-L2320)
- [`thread/read` serialization scope L638-L642](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L638-L642)
- [retryable/non-retryable error mapping L879-L936](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L936)
- [terminal status와 empty item projection L1216-L1245](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1216-L1245)
- [`turn/interrupt` validation과 pending response L1346-L1408](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408)
- [interrupt response 뒤 terminal emission L1045-L1061](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1045-L1061)
- [pending interrupt response drain L1498-L1511](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1498-L1511)

## Live probe

환경은 pinned package binary `@openai/codex@0.144.0`, 임시 `CODEX_HOME`, no auth였다. `initialize → thread/start → turn/start(A)`를 보낸 뒤 `turn/started(A)`를 확인하자마자 두 번째 `turn/start(B)`를 보냈다.

관찰된 축약 순서는 다음과 같다.

```text
response(initialize)
unrelated remoteControl/status/changed
response(thread/start, T)
thread/started(T)
response(turn/start, A)
thread/status/changed(T)
turn/started(A)
response(turn/start, B)
item/started(A)
item/completed(A)
```

2.5초 관찰 구간에 `turn/started(B)`는 없었다. 이 trace는 active-turn steer 해석과 맞지만 한 번의 no-auth 관찰일 뿐이며 scheduler·환경 전반의 contract 증거가 아니다. 이 관찰을 어떤 재현 oracle과 gate로 보존할지는 Ticket 013이 결정한다.

## 후속 설계가 답해야 할 source constraints

- Response waiter와 notification ingress는 서로를 막지 않아야 하고 response는 exact request ID로 상관해야 한다. 이를 어느 module이 소유하는지는 Tickets 005와 008이 결정한다.
- Pinned protocol은 native `threadId`/`turnId`/`itemId`를 제공하지만 remapping·branding·semantic owner는 정하지 않는다. Tickets 008과 009가 선택한다.
- Cross-thread wire order에는 causal 의미가 없고 notification-first는 generation-wide holdback을 요구하지 않는다. Publication과 buffering policy는 Ticket 011이 정한다.
- Active turn의 두 번째 `turn/start`는 response B와 actual active A를 갈라놓거나 B typed lifecycle을 전혀 만들지 않을 수 있으며, error branch는 B lifecycle과 별개인 thread-scoped `SystemError`를 만들 수 있다. Pinned `turn/steer`는 actual active ID precondition을 제공하며, reject·native steer 채택 등 concurrency contract는 Ticket 010이 정한다.
- `turn/completed` 뒤 original turn의 background command completion이 합법적이다. live state retention, snapshot/UI와 drain 기준은 Ticket 011이 정한다.
- 이 표의 mutation method는 공통된 general idempotency contract를 제공하지 않으며 timeout 결과는 method별로 unknown일 수 있다. reconnect·retry·reconciliation은 Ticket 012가 정한다.
- Notification opt-out은 method별 observation 부재를 합법적으로 만들 수 있다. baseline capability 선택과 필수 observation은 resulting spec이 명시한다.

## 후속 결정으로 남기는 항목

- exact duplicate, late duplicate, conflicting identity reuse의 fail/no-op 정책과 tombstone retention bound
- active-turn steer를 public API에서 별도 operation/result로 노출할지 여부
- late background command completion을 snapshot/UI에 어떻게 표현할지와 drain 완료 기준
- method별 timeout UX, reconnect와 reconciliation 정책
- native ID의 product ref remapping 및 generation invalidation 필요 여부
- Active regular non-empty, active regular empty, active review/compact의 second-start matrix(typed B lifecycle뿐 아니라 thread-scoped `SystemError` 포함)와 completion-only item을 재현할 oracle 종류·fixture·assertion 범위

## Sources

- [Codex App Server 공식 문서](https://developers.openai.com/codex/app-server/)
- checked-in generated protocol: `packages/runtime-codex/src/internal/codex-app-server-protocol/generated/`
- [pinned upstream commit](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d)
- [pinned first-party app-server test client](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs)
- [pinned v2 app-server test suite](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2)
