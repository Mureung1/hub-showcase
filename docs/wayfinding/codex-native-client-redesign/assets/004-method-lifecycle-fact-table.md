# Pinned Codex App Server method lifecycle 근거표

- 분류: 기술 참고
- 성숙도: 채택
- 대상 pin: `@openai/codex@0.144.0`, upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`
- 범위: `initialize`, thread lifecycle, `turn/start`, active edge의 source-shaped `turn/steer`, `turn/interrupt`, streamed lifecycle event

이 문서는 [Pinned method lifecycle 근거표를 만든다](../tickets/004-build-method-lifecycle-fact-table.md)의 설계 근거다. 현재 제품 계약이나 retry UX를 결정하지 않고, pinned Codex App Server가 실제로 제공하는 관찰·상관관계 사실과 그로부터 바로 따라오는 client integration 설계 입력만 기록한다.

## 근거 범위와 증거 등급

| 등급 | 근거 | 이 문서에서의 사용 |
| --- | --- | --- |
| 현재 공식 문서 | [공식 App Server 문서](https://developers.openai.com/codex/app-server/) | 현재 public lifecycle 설명. moving 문서이므로 `0.144.0` ordering 근거로 쓰지 않음 |
| 고정 버전 shape | repo의 checked-in generated protocol | package-owned `0.144.0` binary가 생성한 method·field·identity shape |
| 고정 버전 구현 | exact commit의 Rust source | `0.144.0`의 ordering, task 경계와 serialization 동작 |
| 고정 버전 test | exact commit의 first-party tests와 test client | source 해석과 documented edge를 검증하는 version-specific evidence |
| 실행 관찰 | pinned package binary를 실행한 단일 live probe | source 해석의 sanity check. normative contract로 격상하지 않음 |
| 추론 | 위 구조에서 도출한 가능한 interleaving·제약 | 반드시 inference로 표시하고 product decision과 구분 |
| 제품 결정 | AY-PLE의 API, buffering, retention, recovery 선택 | 이 fact asset이 소유하지 않고 후속 Wayfinder ticket에 남김 |

공식 문서는 모든 response/notification 상대 순서, notification sequence, duplicate 처리, timeout reconciliation을 정의하지 않는다. 최신 문서의 experimental field도 checked-in stable generated type에 없으면 이 baseline에 포함하지 않는다.

### 저장소에 보존한 generated shape 색인

아래 파일은 package pin으로 생성해 repo에 보존한 public wire shape의 직접 근거다. Method/event 이름과 params mapping은 aggregate union에서, response와 notification payload는 개별 generated type에서 확인한다.

| 범위 | generated shape 근거 |
| --- | --- |
| request method와 params mapping | [`ClientRequest`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/ClientRequest.ts), [`InitializeParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/InitializeParams.ts), [`ThreadStartParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStartParams.ts), [`ThreadListParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadListParams.ts), [`ThreadLoadedListParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadLoadedListParams.ts), [`ThreadReadParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadReadParams.ts), [`ThreadResumeParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadResumeParams.ts), [`TurnStartParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnStartParams.ts), [`TurnSteerParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnSteerParams.ts), [`TurnInterruptParams`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnInterruptParams.ts) |
| response payload | [`InitializeResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/InitializeResponse.ts), [`ThreadStartResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStartResponse.ts), [`ThreadListResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadListResponse.ts), [`ThreadLoadedListResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadLoadedListResponse.ts), [`ThreadReadResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadReadResponse.ts), [`ThreadResumeResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadResumeResponse.ts), [`TurnStartResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnStartResponse.ts), [`TurnSteerResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnSteerResponse.ts), [`TurnInterruptResponse`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnInterruptResponse.ts) |
| notification method와 payload | [`ServerNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/ServerNotification.ts), [`ThreadStartedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStartedNotification.ts), [`ThreadStatusChangedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadStatusChangedNotification.ts), [`ThreadSettingsUpdatedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadSettingsUpdatedNotification.ts), [`TurnStartedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnStartedNotification.ts), [`ItemStartedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ItemStartedNotification.ts), [`ItemCompletedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ItemCompletedNotification.ts), [`ErrorNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ErrorNotification.ts), [`TurnCompletedNotification`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/TurnCompletedNotification.ts) |
| native lifecycle model | [`Thread`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/Thread.ts), [`Turn`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/Turn.ts), [`ThreadItem`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/ThreadItem.ts) |

## 메서드별 lifecycle 근거표

| 메서드 | response와 identity authority | 연관 observation과 합법적 순서 | duplicate·retry·timeout | 고정 버전 근거 |
| --- | --- | --- | --- | --- |
| `initialize` | exact request ID의 성공 response가 typed request outcome이며 connection metadata를 돌려준다. domain identity는 없다. | 현재 공식 문서는 `initialize` 뒤 `initialized`를 요구하지만 response barrier를 규정하지 않는다. exact pin의 server는 session commit 뒤 response를 enqueue하고, first-party test client는 그 response를 기다린 뒤 `initialized`를 보낸다. pinned server는 client notification을 상태 전이 없이 log한다. | 같은 connection의 재호출은 commit 뒤 `Already initialized`. timeout이면 server-side commit 여부가 unknown이다. Response-first sequencing은 보수적인 first-party client precedent이지 public ordering guarantee가 아니다. | [현재 공식 예제](https://developers.openai.com/codex/app-server/#getting-started) · [server source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/initialize_processor.rs#L44-L155) · [first-party test client](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1647-L1687) |
| `thread/start` | response의 native `thread.id`가 유일한 request-correlated identity authority다. | matching `thread/started`만 pinned source에서 response 뒤다. listener는 response 전에 attach되므로 `configWarning`, unrelated notification과 같은 새 thread의 startup observation이 response 전에 올 수 있다는 것은 task graph inference다. capability opt-out이면 `thread/started`가 없을 수 있다. | idempotency key가 없다. 추론: response-lost success는 첫 input 전 storage-backed `thread/list`에 없지만 `thread/loaded/list` 후보에는 보일 수 있다. 후보 shape에는 request correlation이 없으므로 failed start와 해당 request의 success를 정확히 구분할 수 없다. 재호출은 두 번째 thread를 만들 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1212-L1360) · [rollout test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_start.rs#L339-L375) · [state DB test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/sqlite_state.rs#L55-L108) · [loaded list](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2183-L2227) |
| `thread/list` | response의 각 native `Thread.id`; related notification은 없다. | 다른 list 및 mutation과 concurrent다. storage page 뒤 live status를 overlay하므로 transactional snapshot으로 보지 않는다. | 새 request ID 재조회는 가능하지만 결과와 opaque cursor가 달라질 수 있다. `useStateDbOnly=false`는 metadata scan-and-repair를 수행할 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1956-L2055) · [repair test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_list.rs#L873-L999) |
| `thread/read` | input `threadId`와 이를 확인하는 response `thread.id`; related notification은 없다. | same-thread RPC는 serialize되지만 listener event는 interleave할 수 있어 response는 즉시 stale해질 수 있다. `includeTurns=true`는 materialized inline-history persistent thread에서만 turn history를 반환한다. Fresh unmaterialized persistent, ephemeral과 paginated history는 모두 실패한다. read 자체는 resume/subscription이 아니다. | timeout 뒤 새 request ID로 다시 읽을 수 있다. 늦은 첫 response도 ingress가 request ID로 소비해야 한다. Ephemeral·unmaterialized·paginated turn history는 이 method에서 얻을 수 없으며, 어느 history source를 authoritative backfill로 쓸지는 후속 결정이다. | [read path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2230-L2320) · [ephemeral guard](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2366-L2394) · [unmaterialized error](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L4199-L4223) · [persistence skip](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/session.rs#L579-L667) |
| `thread/resume` | Stable generated `threadId` branch의 성공 response는 resume/load outcome과 returned native identity authority다. Running rejoin은 connection attach 뒤 response를 보내지만 cold auto-attach는 best-effort라 성공 response가 subscription을 보장하지 않는다. Exact-pin experimental history·path branch는 input `threadId`를 무시할 수 있으므로 response `thread.id`만 identity authority다. | Cold resume는 attach가 성공하면 `thread/status/changed`를 response보다 먼저 만들 수 있다. response 뒤 token usage, goal, pending request replay가 올 수 있다. running resume 중 기존 subscriber에는 live event가 계속 온다. Exact pin의 paginated stored history는 resume 자체가 unsupported다. | Same-ID resume는 identity는 수렴하지만 replay/client-info side effect 때문에 strict idempotency가 아니다. Timeout 때 attach·replay 여부는 unknown이다. Stable branch는 known native ID를 유지하지만 experimental history·path branch는 response를 잃으면 resulting ID도 unknown일 수 있다. | [params shape](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L305-L344) · [cold path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2664-L2972) · [best-effort attach](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L189-L210) · [running rejoin](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L594-L661) · [paginated rejection test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_read.rs#L208-L324) |
| idle `turn/start` | response `turn.id`와 matching `turn/started.turn.id`는 같은 core-generated native identity를 전달한다. response는 request acceptance를, notification은 실제 execution start를 관찰한다. | response dispatch와 core listener가 다른 async task여서 어느 쪽도 먼저 올 수 있다. Source task graph상 `turn/started` 뒤 item/error/terminal까지 response를 앞설 수 있다. 각 observation은 native scope로 상관할 수 있으며 notification-first가 generation-wide holdback을 요구하지 않는다. | mutation 결과는 timeout 시 unknown이다. 반복 요청은 새 submission을 만들고 active 상태라면 steer될 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568) · 추론 |
| active regular-turn + non-empty `turn/start` | 두 번째 response가 `turn.id=B`를 보고해도 별도 active turn B가 시작되었다는 authority가 아니다. Non-default override가 있으면 future thread settings는 이미 바뀔 수 있다. | Settings override는 steer 판정 전에 적용된다. Experimental capability를 켠 opted-in client에는 effective change일 때 turn ID 없는 `thread/settings/updated`가 올 수 있다. 이후 input은 active A로 steer되며 `turn/started(B)`·`turn/completed(B)`가 없고 item event는 A에 귀속된다. | `turn/start response → 반드시 matching started`라는 일반 규칙은 성립하지 않는다. Timeout/retry 시 input뿐 아니라 thread settings mutation의 적용 여부도 unknown이며 notification 부재는 미적용 증거가 아니다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L283) · [관찰](#실행-관찰) |
| active regular-turn + empty `turn/start` | response B는 성공하고 public `error(turnId=B, willRetry=false)`가 올 수 있으며 둘의 상대 순서는 보장되지 않는다. Non-default override가 있으면 B lifecycle과 무관한 thread settings mutation은 먼저 끝날 수 있다. | Settings update와 optional experimental `thread/settings/updated` 뒤 B의 started/terminal은 없다. Error handler는 typed error보다 먼저 thread를 `SystemError`로 publish한다. Thread-scoped shared error summary 때문에 A terminal도 failed로 투영될 가능성이 source상 있다. 마지막 절은 아직 deterministic test가 없는 inference다. | B error와 A terminal을 한 lifecycle로 잘못 수렴하면 안 된다. Response와 optional thread settings/status notification의 상대 순서는 task 경합상 either-order다. | [active turn source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L283) · [error path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3874-L3946) · [error handler](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919) · 추론 |
| active review/compact + `turn/start` | response B는 성공하지만 별도 B turn authority가 아니다. Non-default override가 있으면 future thread settings는 먼저 바뀔 수 있다. | Settings update와 optional experimental `thread/settings/updated` 뒤 internal `ActiveTurnNotSteerable(B)`는 `affects_turn_status=false`라 typed App Server error가 drop되고 B started/error/terminal이 모두 없을 수 있다. 그러나 filter 전에 thread-scoped `SystemError`가 publish된다. | Success response만으로 B lifecycle 존재를 추론할 수 없다. Response와 optional thread settings/status notification은 task 경합상 either-order다. | [active turn source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L283) · [classification](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/protocol.rs#L1764-L1789) · [filter and status side effect](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919) |
| `turn/steer` | request의 `expectedTurnId`가 active turn precondition이고 성공 response는 actual active `turnId`를 돌려준다. 새 turn identity를 만들지 않는다. | active regular turn에 input을 queue하며 새 `turn/started`를 emit하지 않는다. no-active, mismatch, review/compact와 empty input은 success response 전 JSON-RPC error다. | accepted request를 반복하면 input을 다시 queue할 수 있고 dedup contract가 없다. timeout 때 queue 적용 여부는 unknown이다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955) |
| normal `turn/interrupt(turnId=A)` | response는 listener가 same-thread terminal core event를 보고 pending RPC를 resolve했다는 barrier이며 terminal status authority가 아니다. Active snapshot이 아직 없지만 thread가 running인 race에서는 supplied ID도 확인하지 않는다. | response가 terminal notification보다 먼저다. Interrupted 또는 자연 completed terminal이 뒤따를 수 있다. | Active snapshot이 있을 때만 mismatch를 거절한다. 복수 pending request는 함께 `{}`로 resolve될 수 있다. timeout은 적용 여부가 unknown이고 response `{}`만으로 exact target이나 terminal status를 알 수 없다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408) |
| startup `turn/interrupt(turnId="")` | Empty `turnId`는 exact-pin source가 해석하는 startup-cancellation sentinel이다. 성공 response는 native turn과 상관되지 않은 `Op::Interrupt` submission acknowledgement이며 turn status authority가 아니다. | active turn ID가 아직 client cache에 없을 때 first-party TUI가 사용한다. No-active startup이면 terminal이 없고, active-turn race이면 별도 native terminal이 뒤따를 수 있다. Response는 어느 쪽도 기다리지 않는다. | Generated shape는 `turnId: string`이라 empty를 막지 않지만 public docs는 sentinel 의미를 설명하지 않는다. timeout이면 cancellation 적용 여부가 unknown이다. | [server source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408) · [core race](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3960-L3966) · [TUI routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L560) · [TUI request](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L822-L845) |

## 이벤트별 lifecycle 근거표

| 이벤트 | 의미와 authority | ordering·중복 제약 | 고정 버전 근거 |
| --- | --- | --- | --- |
| `thread/started` | `thread/start` lifecycle publication. request ID가 없으므로 start response를 대신하는 identity authority가 아니다. | pinned start에서는 matching response 뒤다. opt-out으로 생략될 수 있다. exact duplicate semantics는 upstream이 정의하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1360) |
| `thread/status/changed` | native thread의 live status observation | cold `thread/resume` response 전에 올 수 있고 unrelated thread/host work와 interleave한다. 모든 `EventMsg::Error`는 typed error filtering 전에 thread runtime을 `SystemError`로 바꾸므로 non-turn-affecting error도 이 observation을 남길 수 있다. | [publication](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L221-L243) · [system-error transition](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L172-L179) |
| `thread/settings/updated` | Experimental native thread settings snapshot. Payload는 `threadId`와 full `threadSettings`를 싣고 `turnId`는 싣지 않으므로 correlation scope는 thread only이며, notification은 mutation 자체의 필수 authority가 아니다. | Non-default `turn/start` override는 active-turn steer/error 판정보다 먼저 internal event를 만든다. Public notification은 effective value가 바뀌고 connection이 experimental API를 enable하고 opt-out하지 않았을 때만 전달된다. Notification이 없어도 future thread settings mutation은 남을 수 있다. | [payload shape](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L297-L303) · [core apply order](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L239) · [session mutation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/turn_context.rs#L586-L652) · [effective-change filter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_state.rs#L157-L160) · [App Server projection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1138-L1154) · [experimental marker](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L1613-L1628) · [transport filter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/transport.rs#L98-L118) |
| `turn/started` | 실제 turn lifecycle 시작 observation | idle start response와 either-order다. active-turn steer에는 새로운 B event가 없을 수 있다. capability opt-out으로 selected lifecycle event가 생략될 수 있다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/regular.rs#L47-L63) |
| `item/started → delta* → item/completed` | 일반 streamed item의 scope-local lifecycle | 보통 같은 item에서 이 순서를 따르지만 global wire order를 다른 thread/item의 causal order로 해석하지 않는다. | [start/delta path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/turn.rs#L2144-L2337) · [`ItemCompleted` emission](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L1999-L2014) |
| completion-only `SubAgentActivity` | 완료 시점에 처음 materialize될 수 있는 activity item | 모든 item에 `item/started`가 선행한다는 invariant를 두지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tools/handlers/multi_agents_v2.rs#L44-L51) |
| `error` with `willRetry=true` | transient turn error observation | terminal이 아니며 이후 같은 turn의 진행을 허용한다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L921-L936) |
| `error` with `willRetry=false` | app-server가 자동 retry하지 않는 turn-affecting error observation | 정상 turn에서는 failed `turn/completed`보다 먼저 올 수 있다. active-turn second-start edge에서는 matching B terminal이 보장되지 않는다. error 자체만으로 public turn terminal을 합성하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919) |
| `turn/completed` | turn status의 authoritative terminal publication. pinned notification의 `items`는 empty/`notLoaded`이므로 transcript item authority가 아니다. | terminal 뒤에도 original turn에 귀속된 background unified-exec item completion이 도착할 수 있다. turn terminal과 모든 child item 관측 종료를 동일시하지 않는다. | [source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1216-L1245) |
| late background command completion | 이미 terminal인 original turn의 background command 정리 | event는 original `threadId`/`turnId`/`itemId`를 싣고 turn terminal 뒤에도 올 수 있다. live retention과 history recovery 중 어떤 방식으로 처리할지는 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)가 소유한다. | [test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/thread_history.rs#L3134-L3229) |

Protocol notification에는 global sequence나 normative dedup contract가 없다. duplicate/late/conflicting reuse 처리, tombstone retention과 bounded staging은 client robustness policy이며 upstream fact로 표현하지 않는다.

## 핵심 edge 설명

### 1. `initialize`의 public lifecycle과 response barrier를 구분한다

현재 공식 문서는 `initialize` 뒤 `initialized`를 보내라고 설명하지만 response를 barrier로 규정하지 않는다. 공식 Node.js 예제도 response를 기다리지 않고 `initialized`와 `thread/start`를 연속 전송한다. Exact pin의 server는 session을 response enqueue 전에 commit하고 repeated initialize를 거절하며, 수신한 `initialized` notification은 상태 전이 없이 log한다. 반면 pinned first-party test client는 typed response를 기다린 뒤 `initialized`를 보낸다. 따라서 response-first는 후속 client가 채택할 수 있는 보수적인 first-party precedent지만 public ordering guarantee는 아니다.

- [현재 공식 getting started](https://developers.openai.com/codex/app-server/#getting-started)
- [exact-pin lifecycle README L74-L85](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L74-L85)
- [initialize_processor.rs L44-L155](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/initialize_processor.rs#L44-L155)
- [message_processor.rs L608-L619](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L608-L619)
- [first-party test client L1647-L1687](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1647-L1687)

### 2. `thread/start`의 matching `thread/started`는 response-first다

Pinned start task는 response send를 await한 뒤 matching `thread/started`를 send한다. 이 invariant는 `thread/started`에만 적용한다. Per-thread listener는 response 전에 attach되므로 pre-response `configWarning`, unrelated observation뿐 아니라 같은 새 thread의 MCP startup 같은 observation도 합법적으로 앞설 수 있다는 것이 source task graph상 inference다. First-party integration test의 response waiter는 그 사이 notification을 FIFO에 보관하므로 response-first evidence가 아니다. 이 wider interleaving도 generation-wide holdback의 근거가 아니며, opt-out은 `thread/started`를 억제할 수 있으므로 response가 request-correlated native identity authority다.

Fresh persistent thread는 첫 user input 전 rollout file과 state DB record가 모두 없다. 따라서 timeout 뒤 `thread/list` 조회가 첫 `thread/start`의 존재를 증명하지 못한다고 해서 server-side creation이 없었다고 결론내릴 수 없다.

두 unknown-outcome 후보도 구분해야 한다. Required MCP 같은 pre-registration initialization failure는 exact-pin source상 `LiveThreadInitGuard`를 discard하고 manager 등록 전에 끝나지만, 직접 cleanup을 assert하는 App Server E2E test는 없다. 반대로 성공했으나 response만 유실된 fresh thread는 manager에 남아 `thread/loaded/list`에 나타나고 native ID를 안다면 metadata-only `thread/read`도 가능하다. 하지만 loaded-list candidate에는 original request ID가 없다. 따라서 response를 잃은 caller가 여러 후보 중 해당 mutation을 확정할 수 없고 storage-backed list 부재나 loaded candidate 존재만으로 failure와 success를 정확히 reconcile할 수 없다는 마지막 판정은 public shape와 source를 합성한 추론이다.

- [thread_processor.rs L1176-L1188](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1176-L1188)
- [listener attach L1280-L1296](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1280-L1296)
- [thread_processor.rs L1212-L1360](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1212-L1360)
- [thread-start opt-out test L212-L275](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/initialize.rs#L212-L275)
- [integration response waiter L1639-L1665](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/common/test_app_server.rs#L1639-L1665)
- [rollout materialization test L339-L375](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_start.rs#L339-L375)
- [state DB materialization test L55-L108](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/sqlite_state.rs#L55-L108)
- [failed initialization discard L1199-L1279](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/session.rs#L1199-L1279)
- [`LiveThreadInitGuard` discard contract L42-L88](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/thread-store/src/live_thread.rs#L42-L88)
- [manager registration after successful spawn L1587-L1667](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L1587-L1667)
- [unmaterialized writer discard test L809-L843](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/thread-store/src/local/mod.rs#L809-L843)
- [`thread/loaded/list` first-turn-before test L18-L48](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_loaded_list.rs#L18-L48)
- [metadata-only read before materialization L980-L1029](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_read.rs#L980-L1029)

### 3. `turn/start`는 idle create와 active steer가 같은 method에 겹친다

`turn_start_inner`가 core submission 뒤 response payload를 반환하는 경로와 core `TurnStarted`를 listener가 전달하는 경로가 다른 task라 idle start는 either-order다. Core task가 계속 진행할 수 있으므로 source task graph상 started뿐 아니라 subsequent item/error/terminal도 response dispatch를 앞설 수 있다. notification-first 자체는 provisional public mutation이나 holdback을 요구하지 않는다. native scope로 상관한 뒤 request response와 일치 여부를 확인할 수 있다.

Active turn에서 같은 method를 다시 호출하면 response B는 새 submission ID를 보고하지만 실제 lifecycle은 세 갈래다.

세 갈래 모두에 앞서는 별도 side effect가 있다. 두 번째 request가 non-default model, cwd, sandbox, approval 또는 다른 thread settings override를 포함하면 core는 active-turn steer 가능 여부를 판단하기 전에 session configuration을 바꾸고 `ThreadSettingsApplied(B)`를 emit한다. App Server는 effective change를 turn ID 없는 `thread/settings/updated(threadId, threadSettings)`로 projection하지만 이 notification은 experimental API를 enable하고 opt-out하지 않은 connection에만 전달된다. 따라서 B started/error/terminal이나 settings notification이 없더라도 future thread settings mutation은 남을 수 있고, response·optional notification의 상대 순서는 request handler와 listener task 경합상 either-order다.

- Regular + non-empty input: settings mutation 뒤 A에 steer되고 B started/terminal이 없다.
- Regular + empty input: settings mutation 뒤 public BadRequest error B가 오지만 B terminal은 없다. Typed error보다 먼저 thread status가 `SystemError`로 publish된다. error summary가 turn ID로 partition되지 않아 A terminal을 failed로 바꿀 가능성이 있다는 것은 source inference다.
- Review/compact: settings mutation 뒤 internal `ActiveTurnNotSteerable(B)`는 non-turn-affecting으로 분류되어 typed error가 drop되고 B에는 typed lifecycle notification이 없을 수 있다. 하지만 filter 전에 thread status는 `SystemError`로 publish된다.

두 error branch에서 status publication은 typed error filtering보다 먼저지만, request response와는 별 task라 상대 순서가 either-order라는 것이 source task graph inference다.

아래 live probe는 첫 branch만 관찰했고 settings override를 넣지 않았다. 세 branch와 선행 settings mutation의 deterministic oracle 필요 여부와 형태는 [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md)가 소유한다.

Pinned stable protocol에는 active input을 위한 별도 `turn/steer`가 있다. `expectedTurnId`를 precondition으로 받아 actual active turn ID를 response하고, no-active·mismatch·non-steerable·empty input을 JSON-RPC error로 돌려준다. 따라서 custom create-vs-steer state machine이 유일한 해법은 아니다. 이 native method와 settings mutation을 baseline에서 어떻게 노출할지는 [Thread·turn concurrency 정책을 결정한다](../tickets/010-decide-concurrency-policy.md)가 소유한다.

- [turn_processor.rs L521-L568](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568)
- [response dispatch L1424-L1434](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L1424-L1434)
- [core regular turn start L47-L63](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/regular.rs#L47-L63)
- [새 submission ID 생성 L765-L780](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L765-L780)
- [`turn/start` override construction L500-L528](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L500-L528)
- [active turn shared handler L218-L283](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L218-L283)
- [settings mutation before steer L194-L239](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L239)
- [session configuration replacement L586-L652](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/turn_context.rs#L586-L652)
- [`thread/settings/updated` projection L1138-L1154](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1138-L1154)
- [experimental notification marker L1613-L1628](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L1613-L1628)
- [effective-change filter L157-L160](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_state.rs#L157-L160)
- [per-connection delivery filter L98-L118](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/transport.rs#L98-L118)
- [`turn/start` settings notification test L309-L359](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_settings_update.rs#L309-L359)
- [active regular turn steer L3874-L3946](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3874-L3946)
- [`ActiveTurnNotSteerable` status classification L1764-L1789](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/protocol.rs#L1764-L1789)
- [typed error filtering L879-L919](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L919)
- [`note_system_error` L172-L179](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L172-L179)
- [thread status publication L221-L243](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L221-L243)
- [thread-scoped error summary L1542-L1566](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1542-L1566)
- [`turn/steer` validation과 actual turn response L849-L955](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955)
- [`turn/steer` serialization scope L811-L815](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L811-L815)

### 4. `thread/resume`의 load identity와 subscription attach를 구분한다

Stable generated branch는 known `threadId`로 resume하고 성공 response의 `thread.id`로 load outcome과 identity를 확인한다. Exact-pin experimental history 또는 non-empty path branch는 non-running input `threadId`를 무시할 수 있으므로 이때는 response `thread.id`만 identity authority다.

Cold resume는 listener auto-attach를 먼저 시도하지만 실패를 warning으로만 남기고 성공 response를 계속 보낸다. Attach가 성공하면 watch status가 response보다 먼저 올 수 있으나 response 자체는 subscription confirmation이 아니다. Running resume는 connection attach 성공 뒤 listener command에서 response를 보내지만, command를 enqueue하면 request serialization 작업이 끝나므로 response 전에 다음 same-thread RPC가 시작될 수도 있다는 것은 pinned task 구조의 추론이다. 따라서 server의 same-thread serialization만으로 resume response, subscription과 후속 dependent call 사이 ordering을 추론할 수 없다. Caller sequencing과 recovery 정책은 후속 설계가 정한다.

- [resume params의 stable·experimental identity branch L305-L344](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L305-L344)
- [history·path precedence L2726-L2760](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2726-L2760)
- [cold best-effort listener attach L2843-L2854](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2843-L2854)
- [attach failure logging L189-L210](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L189-L210)
- [cold resume L2843-L2972](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2843-L2972)
- [status publication L221-L243](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_status.rs#L221-L243)
- [running resume enqueue L3152-L3186](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L3152-L3186)
- [running attach, response와 replay L594-L697](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L594-L697)

### 5. `turn/completed`와 child item drain은 다른 축이다

`turn/completed`가 turn status authority여도 background unified-exec completion은 original turn으로 늦게 도착할 수 있다. 정상 item은 start/delta/complete를 주로 따르지만 `SubAgentActivity`처럼 completion-only item도 존재한다. Exact-tag README의 “항상 start → delta → complete” 설명보다 실제 event mapping이 더 넓은 관찰 집합을 만든다. 따라서 turn terminal만으로 original turn의 child observation이 모두 끝났다고 결론낼 수 없다. Live metadata retention과 history recovery 중 무엇을 사용할지는 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)가 소유한다.

- [README의 per-item 설명 L1351-L1390](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L1351-L1390)
- [core canonical `SubAgentActivity` completion-only emission L44-L51](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tools/handlers/multi_agents_v2.rs#L44-L51)
- [canonical `ItemCompleted` App Server forwarding L980-L994](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L980-L994)
- [background exit watcher L104-L156](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/async_watcher.rs#L104-L156)
- [late completion의 original turn routing L650-L663](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/thread_history.rs#L650-L663)
- [late completion test L3134-L3229](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/thread_history.rs#L3134-L3229)
- [background terminal과 interrupt 경계 L923-L935](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L923-L935)

### 6. response 대기와 notification ingress를 분리한다

First-party test client는 exact request ID response를 기다리는 동안 먼저 읽은 notification을 FIFO로 보관한다. 이는 notification-first를 정상 transport condition으로 다룬다는 pinned evidence다. 이 synchronous test helper의 FIFO는 production kernel이 notification publication을 response까지 보류해야 한다는 근거가 아니며, cross-thread causal total order도 의미하지 않는다.

- [first-party wait loop L1964-L2005](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1964-L2005)
- [per-scope serialization L19-L103](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L19-L103)

### 7. `thread/read(includeTurns=true)`는 모든 상태에서 turn history를 제공하지 않는다

현재 공식 문서는 `includeTurns`가 full turn history를 반환한다고 일반적으로 설명한다. Exact pin에서 `thread/list`와 metadata-only `thread/read(includeTurns=false)`는 response-only snapshot method지만 turn history availability는 persistence state와 history mode에 따라 달라진다.

- Loaded ephemeral thread는 metadata-only live snapshot을 만들 수 있지만 `includeTurns=true`는 `InvalidRequest`다. Ephemeral thread는 persistence와 state DB를 만들지 않으므로 unload 뒤 transcript fallback도 없다.
- Fresh loaded persistent thread도 첫 user input 전 rollout이 materialize되지 않았으면 `includeTurns=true`가 `InvalidRequest`다.
- Materialized loaded persistent thread는 persisted metadata와 live history를 결합하고, unloaded stored thread는 `ThreadStore` history로 복구한다.
- Exact pin의 paginated stored history는 metadata discovery만 가능하고 legacy `includeTurns=true`, `thread/turns/list`, `thread/resume`가 모두 `paginated_threads is not supported yet`로 실패한다.

First-party Exec도 ephemeral primary thread의 terminal backfill을 의도적으로 생략한다. 이 availability matrix만으로 authoritative backfill·refresh source를 정하지 않으며, 후속 delivery/recovery 설계가 live retention, fresh-unmaterialized metadata, persisted inline history와 unsupported paginated history의 역할을 결정한다.

- [현재 공식 API overview](https://developers.openai.com/codex/app-server/#api-overview)
- [`thread/list` implementation L1956-L2055](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1956-L2055)
- [`thread/read` state matrix L2230-L2320](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2230-L2320)
- [ephemeral guard L2366-L2394](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2366-L2394)
- [unmaterialized history error L4199-L4223](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L4199-L4223)
- [ephemeral persistence skip L579-L667](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/session.rs#L579-L667)
- [stored inline history test L142-L205](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_read.rs#L142-L205)
- [paginated history rejection test L208-L324](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_read.rs#L208-L324)
- [fresh unmaterialized rejection test L1195-L1247](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_read.rs#L1195-L1247)
- [Exec ephemeral no-backfill L1347-L1400](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1347-L1400)

### 8. `error`와 두 `turn/interrupt` branch의 authority를 구분한다

현재 공식 문서와 exact-tag README는 성공한 normal interrupt 뒤 turn이 `interrupted` terminal로 끝난다고 설명한다. 그러나 exact-pin listener는 자연 `TurnComplete`에서도 pending interrupt response를 resolve하므로 natural `completed`가 관찰될 수 있다. 이는 documented contract와 pinned implementation race의 divergence이며, authoritative status는 실제 `turn/completed`가 정한다.

`error`는 turn 중간 observation이다. Normal `turn/interrupt(turnId=A)`는 active snapshot이 있을 때만 exact ID mismatch를 거절한다. Snapshot이 아직 없지만 thread가 running이면 supplied ID를 확인하지 않고 pending queue에 넣으며, listener는 이후 same-thread `TurnComplete` 또는 `TurnAborted`에서 pending response를 먼저 보내고 terminal notification을 뒤이어 보낸다. 따라서 `{}`는 exact target-ID confirmation도 status authority도 아니며 자연 completion이 interrupt보다 이길 수 있다.

Empty `turnId` startup branch는 active-ID validation, pending queue와 request-to-turn binding을 모두 건너뛰고 `Op::Interrupt` submission 직후 `{}`를 반환한다. Active task가 없으면 MCP startup만 cancel되어 turn terminal이 없지만, client cache/listener race 중 실제 active task가 이미 생겼다면 같은 operation이 그 turn을 abort하고 별도 native terminal이 뒤따를 수 있다. First-party TUI는 cached active ID가 없을 때 이 branch를 사용한다. Public shape는 empty string을 막지 않지만 sentinel 의미는 pinned source와 TUI usage에서만 확인된다.

- [현재 공식 API overview](https://developers.openai.com/codex/app-server/#api-overview)
- [exact-tag documented interrupt contract L923-L935](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L923-L935)
- [retryable/non-retryable error mapping L879-L936](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L879-L936)
- [terminal status와 empty item projection L1216-L1245](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1216-L1245)
- [`turn/interrupt` branch와 pending response L1346-L1408](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L1346-L1408)
- [natural completion response drain L182-L197](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L182-L197)
- [aborted response 뒤 terminal emission L1045-L1061](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1045-L1061)
- [pending interrupt response drain L1498-L1511](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1498-L1511)
- [core interrupt race L3960-L3966](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3960-L3966)
- [active task abort emission L492-L520](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/mod.rs#L492-L520)
- [TUI cached-ID routing L517-L560](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L560)
- [TUI empty-string request L822-L845](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L822-L845)

## 실행 관찰

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

2.5초 관찰 구간에 `turn/started(B)`는 없었다. 이 trace는 active-turn steer 해석과 맞지만 한 번의 no-auth 관찰일 뿐이며 scheduler·환경 전반의 contract 증거가 아니다. 이 관찰을 어떤 재현 oracle과 gate로 보존할지는 [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md)가 소유한다.

## 후속 설계가 답해야 할 source 제약

- Response waiter와 notification ingress는 서로를 막지 않아야 하고 response는 exact request ID로 상관해야 한다. Connection ownership은 [Connection·App Server ingress architecture pattern을 지도화한다](../tickets/005-map-first-party-rust-architecture-patterns.md), 최종 module 배치는 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md)가 소유한다.
- Pinned protocol은 native `threadId`/`turnId`/`itemId`를 제공하지만 remapping·branding·semantic owner는 정하지 않는다. [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md)와 [Identity authority와 product reference 정책을 결정한다](../tickets/009-decide-identity-and-authority.md)가 선택한다.
- Cross-thread wire order에는 causal 의미가 없고 notification-first는 generation-wide holdback을 요구하지 않는다. Publication, ephemeral live retention과 persisted transcript recovery policy는 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)가 소유한다.
- Active turn의 두 번째 `turn/start`는 response B와 actual active A를 갈라놓거나 B typed lifecycle을 전혀 만들지 않을 수 있고, B lifecycle 전에 future thread settings를 바꿀 수 있으며, error branch는 thread-scoped `SystemError`도 만들 수 있다. Pinned `turn/steer`와 startup interrupt는 서로 다른 native precondition을 제공한다. Reject·native steer·startup cancellation contract는 [Thread·turn concurrency 정책을 결정한다](../tickets/010-decide-concurrency-policy.md)가 소유한다.
- `turn/completed` 뒤 original turn의 background command completion이 합법적이다. live state retention, snapshot/UI와 drain 기준은 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)가 소유한다.
- 이 표의 mutation method는 공통된 general idempotency contract를 제공하지 않으며 timeout 결과는 method별로 unknown일 수 있다. 추론상 response-lost `thread/start`도 loaded candidate와 original request를 exact-correlate할 수 없다. Reconnect·retry·reconciliation은 [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.
- Notification opt-out은 method별 observation 부재를 합법적으로 만들 수 있다. 첫 tracer가 요구할 stable·experimental capability set은 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), observation의 lossless·best-effort 분류와 recovery 영향은 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)가 소유한다.

## 후속 결정으로 남기는 항목

- exact duplicate, late duplicate, conflicting identity reuse의 fail/no-op 정책과 tombstone retention bound — [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)
- active-turn steer를 public API에서 별도 operation/result로 노출할지 여부 — [Thread·turn concurrency 정책을 결정한다](../tickets/010-decide-concurrency-policy.md)
- late background command completion을 snapshot/UI에 어떻게 표현할지와 drain 완료 기준 — [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)
- ephemeral·fresh unmaterialized·persisted inline·unsupported paginated transcript의 recovery와 live retention 차이 — [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)
- method별 timeout UX, reconnect와 reconciliation 정책 — [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md)
- native ID의 product ref remapping 및 generation invalidation 필요 여부 — [Identity authority와 product reference 정책을 결정한다](../tickets/009-decide-identity-and-authority.md)
- Normal interrupt와 startup interrupt를 별도 semantic operation으로 노출할지, empty sentinel을 어느 boundary에서 감출지 — [Thread·turn concurrency 정책을 결정한다](../tickets/010-decide-concurrency-policy.md)
- Stable·experimental notification capability와 opt-out baseline — [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)
- Active regular non-empty, active regular empty, active review/compact의 second-start matrix(settings mutation, optional experimental notification과 thread-scoped `SystemError` 포함), interrupt race와 completion-only item을 재현할 oracle 종류·fixture·assertion 범위 — [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md)

## 근거 목록

- [Codex App Server 공식 문서](https://developers.openai.com/codex/app-server/)
- checked-in generated protocol: `packages/runtime-codex/src/internal/codex-app-server-protocol/generated/`
- [pinned upstream commit](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d)
- [pinned first-party app-server test client](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs)
- [pinned v2 app-server test suite](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2)
