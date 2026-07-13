# First-party Connection·App Server ingress architecture 근거 지도

## 판정

Pinned `openai/codex`의 production `app-server-client`에는 AY-PLE이 사용하는 **stdio child client가 없다**. Production surface는 embedded `InProcessAppServerClient`와 WebSocket·Unix domain socket용 `RemoteAppServerClient`이고, `codex app-server` child를 spawn하는 client-side stdio 구현은 동기식 `app-server-test-client`에만 있다. 따라서 AY-PLE은 upstream production client를 import하거나 client-side stdio task graph를 그대로 복사할 수 없다. 대신 production source에서 검증한 connection invariant를 가져오고, 외부 child supervision과 bounded stdio boundary는 AY-PLE이 소유해야 한다.

가져갈 핵심은 다음과 같다.

- connection마다 transport I/O와 pending request registry의 owner를 하나로 둔다.
- response waiter가 ingress reader를 소유하거나 막지 않게 하고, notification과 Server request를 계속 drain한다.
- response는 direction과 exact `RequestId`로 demultiplex하고, connection terminal은 남은 waiter 전체에 한 번 전파한다.
- request 호출 surface와 single-consumer event surface를 분리하고, initialize와 shutdown을 명시적 lifecycle로 둔다.
- generated protocol validation, queue bound, timeout·unknown outcome과 anomaly 정책은 pinned external boundary에 맞게 별도로 결정한다.

가져오지 않을 것은 remote의 unbounded event queue, caller-owned reusable request ID, silent anomaly drop, post-initialize request waiter의 timeout·cancel·deregister 부재, transport마다 다른 lossless tier, test helper의 synchronous reader, embedded Rust ambient state를 노출하는 거대한 start arguments다. 이들은 protocol contract가 아니라 pinned implementation의 편의·gap이다.

## 조사 범위와 evidence authority

조사 기준은 npm pin과 provenance가 연결한 exact commit [`767822446c7a594caa19609ca435281a9ec67e0d`](https://github.com/openai/codex/commit/767822446c7a594caa19609ca435281a9ec67e0d)다. Source checkout, artifact와 generated protocol의 관계는 [Ticket 003 evidence](003-upstream-source-provenance.md)가 소유한다.

| Evidence tier | 이 문서에서 소유하는 사실 | 소유하지 않는 것 |
| --- | --- | --- |
| [Official App Server docs](https://developers.openai.com/codex/app-server/) | App Server가 rich client surface이고 stdio가 JSONL인 공개 lifecycle·message model, generated schema가 실행 version에 specific하다는 사실 | `0.144.0`의 task scheduling, queue와 notification/response 상대 순서 |
| Pinned generated protocol | AY-PLE이 받아야 할 public method·payload shape | Rust task ownership과 buffering behavior |
| Pinned production source·tests | Exact version의 module/task/channel ownership과 검증된 구현 동작 | 앞으로의 OpenAI 호환성 보장, AY-PLE product policy |
| Pinned test client | 실제 binary를 stdio로 부르는 argv·framing·EOF cleanup precedent | Production concurrency·backpressure architecture |
| 이 문서의 inference | Source task graph에서 도출한 위험과 design constraint | Protocol guarantee 또는 이미 채택한 AY-PLE 결정 |
| 후속 Wayfinder decision | AY-PLE seam, identity, delivery, recovery와 verification policy | Upstream fact의 재정의 |

이 protocol은 이름과 shape가 JSON-RPC에 가깝지만 `jsonrpc: "2.0"` member를 두지 않는 자체 envelope다. 그러므로 이 문서는 이를 `JSON-RPC-like`라고 부르고 generic JSON-RPC library behavior를 자동 전제하지 않는다. ([protocol note와 네 envelope](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/rpc.rs#L1-L42))

## Production topology

```text
embedded TUI/exec
  -> InProcessAppServerClient facade worker
     -> InProcessClientHandle runtime worker
        -> MessageProcessor -> per-thread listener -> facade event stream

remote TUI
  -> RemoteAppServerClient worker
     <-> WebSocket or Unix socket App Server
     -> pending response oneshots + one event receiver

AY-PLE target boundary
  -> AY-PLE-owned child/process connection
     <-> codex app-server --listen stdio://
     -> generated-schema-backed request/event interface
```

위 세 번째 경로는 upstream production client에 존재하는 topology가 아니라 AY-PLE이 구현해야 할 external boundary다. Upstream의 stdio server 쪽과 test helper는 그 경계의 evidence일 뿐이다.

이 external process owner는 package binary 선택과 argv뿐 아니라 partial-spawn cleanup, stderr 처리, child-exit watcher, serialized stdin writer, single stdout reader와 force-kill 뒤 reap까지 하나의 lifecycle로 묶어야 한다. 이는 upstream production stdio client에서 복사한 동작이 아니라, server-side terminal 비대칭과 test helper cleanup precedent를 함께 대조해 얻은 AY-PLE design constraint다. Exact task split과 deadline은 Tickets 008과 012가 결정한다.

### Production `InProcessAppServerClient`

`app-server-client` README는 이 crate가 `codex-exec`과 `codex-tui`가 공유하는 in-process bootstrap·initialize·lifecycle facade라고 설명한다. Typed channel을 쓰지만 response는 여전히 App Server의 JSON-RPC result envelope를 거친다. ([purpose와 transport model](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/README.md#L3-L43)) 실제 exec도 이 facade를 시작하고 event stream을 drain한다. ([exec startup](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L795-L820), [event loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L960-L997))

Facade는 다음 ownership을 갖는다.

- `InProcessAppServerClient`가 bounded command sender, single event receiver와 worker `JoinHandle`을 소유하고, clone 가능한 `InProcessAppServerRequestHandle`은 command sender만 가진다. ([client와 handle](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L452-L472))
- Worker 하나가 command와 lower runtime event를 `select!`로 drain한다. Request response 대기는 별도 spawned task에 맡겨 lower response가 Server request 입력을 기다리는 동안에도 worker가 event를 읽을 수 있게 한다. ([worker와 detached waiter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L474-L590))
- `next_event(&mut self)`는 한 event consumer를 강제하지만 request handle은 clone할 수 있다. 즉 concurrent request submission과 ordered event consumption의 권한이 interface에서 분리된다. ([event receiver와 shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L739-L784), [request handle](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L787-L829))
- Typed request error는 transport, server JSON-RPC error, response deserialize failure를 구분한다. 이 error layering은 product recovery policy를 transport string parsing으로 대체하지 않게 한다. ([`TypedRequestError`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L261-L313))
- Shutdown은 event receiver를 먼저 drop해 must-deliver send를 풀고 runtime shutdown을 요청한다. Shutdown acknowledgement를 최대 5초 기다린 뒤 worker completion을 별도로 최대 5초 기다리므로 총 wait는 약 10초가 될 수 있고, 두 번째 deadline 뒤 worker를 abort한다. 다만 ack timeout과 completed worker의 `JoinError`는 성공 return과 구별되지 않고, shutdown command가 error를 돌려주면 worker join 전에 early return한다. 따라서 이는 bounded-attempt 순서의 precedent이지 graceful close proof가 아니다. ([shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L748-L784))

`InProcessClientStartArgs`는 config, auth, telemetry, state DB와 environment manager 같은 Rust process ambient state를 열다섯 개가 넘는 field로 전달한다. 이는 same-process embedding용 assembly surface이지 external App Server client나 AY-PLE product Interface의 모델이 아니다. ([start arguments](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L316-L410))

#### `lossless`는 end-to-end guarantee가 아니다

Facade forwarding helper는 agent text·plan·reasoning delta, `ItemCompleted`, `TurnCompleted` 등을 blocking delivery tier로 분류하고 나머지를 best-effort drop + `Lagged`로 처리한다. ([facade classifier](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L136-L171), [forwarding behavior](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L183-L258))

그러나 한 층 아래 `app-server::in_process`는 `TurnCompleted`, `ThreadSettingsUpdated`, `ExternalAgentConfigImportCompleted`만 blocking delivery로 분류한다. Queue가 먼저 찼다면 `AgentMessageDelta`나 `ItemCompleted`는 facade에 도달하기 전에 drop될 수 있다. ([lower classifier](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/in_process.rs#L98-L112), [lower delivery](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/in_process.rs#L638-L690)) 따라서 이 목록은 protocol contract도, pinned production path 전체의 lossless proof도 아니다. Delivery와 transcript recovery는 Ticket 011에서 별도 결정해야 한다.

### Production `RemoteAppServerClient`

Remote client endpoint는 WebSocket URL 또는 Unix domain socket뿐이다. `stdio`나 child process variant는 없다. ([endpoint enum](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L65-L81), [connect dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L151-L184)) TUI는 embedded, local daemon과 remote target을 나누고 remote target만 이 client로 연결한다. ([TUI target와 connect](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/lib.rs#L260-L278), [remote construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/lib.rs#L394-L409))

Initialize는 worker를 만들기 전에 같은 stream을 읽는 loop가 소유한다. Matching initialize response 전 notification과 known Server request는 arrival FIFO `Vec`에 보관하고, response를 받은 뒤 `initialized`를 쓴 다음 client를 반환한다. Unrelated response/error는 무시한다. ([initialize loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L794-L935)) 이 구현은 request wait 중 notification arrival이 정상임을 보여 주지만 `Vec`에는 bound가 없고, staged Server request는 `connect()`가 반환되기 전 caller가 응답할 수 없다. 후자가 initialize response의 선행 조건인 hypothetical server에서는 deadlock할 수 있다는 것은 source에서 도출한 위험이지 pinned server가 그런 순서를 낸다는 관찰이 아니다.

Initialize 뒤에는 worker 하나가 command receiver와 stream read를 함께 `select!`하고 pending request `HashMap<RequestId, oneshot>`을 소유한다.

- 같은 ID가 **현재 pending일 때만** duplicate submission을 거부한다.
- matching response/error는 exact ID waiter 하나를 resolve한다.
- notification은 typed `ServerNotification`, request는 typed `ServerRequest`로 변환해 event channel로 보낸다.
- unknown Server request는 `-32601`로 reject한다.
- malformed generic envelope, close, transport error와 EOF는 `Disconnected` event를 내고 loop를 끝낸다.
- loop terminal은 남은 pending waiter를 같은 terminal error로 모두 실패시킨다.

([worker와 pending registry](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L213-L320), [ingress routing과 terminal](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L319-L475))

이 task shape에서 caller의 response waiter는 ingress를 읽지 않는다. 반면 worker가 socket write를 await하는 동안에는 같은 worker의 read branch가 진행하지 않으므로, “single owner”를 곧 “read/write가 항상 독립적으로 진행한다”로 해석하면 안 된다.

#### Remote의 boundedness와 validation gap

`channel_capacity`는 command `mpsc`에만 적용된다. Event channel은 명시적인 `unbounded_channel`이고 initialize pending event도 unbounded `Vec`다. ([client fields와 channels](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L151-L157), [channel construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L195-L217)) 그러므로 README의 bounded queue 설명을 remote path 전체에 일반화할 수 없다.

Remote connect와 initialize 자체에는 각각 10초 timeout이 있다. 아래 gap은 **initialize 뒤 개별 request lifecycle**과 validation에 관한 것이다. ([connect timeout](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L714-L737), [initialize timeout](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L819-L924))

Pinned remote implementation은 다음을 client-owned safety로 제공하지 않는다.

- API caller가 ID를 포함한 `ClientRequest`를 만들고, client는 completed/timed-out tombstone을 남기지 않는다. ID를 다시 쓴 동안 old duplicate response가 오면 새 waiter와 match할 수 있다는 것은 이 source에서 도출한 inference다. ([pending-only duplicate check](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L227-L249), [response match](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L319-L331))
- Post-initialize request waiter에는 timeout·cancel command·pending deregistration가 없다. Caller future를 취소해도 queued mutation의 outcome은 정해지지 않는다. ([request waiter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L629-L655))
- Initialize success result를 generated `InitializeResponse` 전체로 validate하지 않고 `userAgent`와 `codexHome`만 선택적으로 읽는다. ([initialize result handling](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L819-L850))
- Unmatched response/error와 typed conversion에 실패한 notification은 terminal이 아니라 silent drop이다. ([routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L319-L407), [notification conversion](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L938-L943))
- Server-origin request에는 client-side pending·once-only registry가 없다. `resolve_server_request`와 `reject_server_request`는 caller가 준 임의 ID를 그대로 command로 보내므로 duplicate·stale response를 client가 막아 준다고 볼 수 없다. ([public responders](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L539-L590), [write commands](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L272-L303))

Write failure도 command 종류에 따라 다르다. Client request write failure는 `Disconnected`를 내고 worker를 끝내지만, notification과 Server request resolve/reject write failure는 해당 command에 error만 돌려주고 worker를 계속 실행한다. 이 비대칭은 모든 transport write failure를 one-shot terminal로 수렴시키려는 AY-PLE constraint와 다른 pinned convenience다. ([command write paths](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L227-L303))

Remote shutdown도 close acknowledgement를 최대 5초 기다린 뒤 worker completion을 별도로 최대 5초 기다려 총 wait가 약 10초가 될 수 있고, 두 번째 deadline 뒤 abort한다. Close-command send failure·ack timeout/cancel과 completed worker의 `JoinError`는 success return과 구별되지 않으며, `close_result` error는 worker join 전에 early return한다. Production client에는 child reaping이나 `Drop` supervisor가 없다. 따라서 이 역시 bounded-attempt precedent이지 successful graceful close의 oracle이 아니다. ([remote shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L600-L625))

### Production App Server의 stdio ingress·output

이 부분은 **server side** ownership이다. External AY-PLE client의 child·stdin·stdout lifecycle을 대신 구현하지 않는다.

`start_stdio_connection`은 connection별 bounded writer queue를 만들고 stdout writer task와 stdin reader task를 각각 spawn한다. Reader 하나가 `BufReader::lines()`로 JSONL을 순서대로 읽어 central `TransportEvent` channel에 보낸다. Writer 하나가 queued envelope를 JSON 한 줄로 serialize해 `stdout.write_all()`한다. ([stdio task construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L24-L100))

이 topology에서 확인되는 경계는 다음과 같다.

- Internal channel capacity `128`은 **message count** bound다. `lines()`가 읽는 한 line의 byte size에는 이 코드의 cap이 없다. ([capacity](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/mod.rs#L21-L24), [line reader](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L43-L67))
- Malformed JSON은 log하고 connection을 계속 읽는다. Queue가 full일 때 Client request만 `-32001` overload response를 `try_send`하며, outbound queue도 full이면 그 error조차 drop한다. Response·error·notification은 ingress queue 자리가 날 때까지 await한다. ([parse와 overflow](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/mod.rs#L200-L255))
- Main processor loop 하나가 inbound envelope를 request, response, notification, error로 분류하지만 request execution은 여기서 직렬로 끝나지 않는다. Initialized request는 method scope별 FIFO/shared-read queue로 가거나 detached task로 실행된다. ([main ingress dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L1018-L1106), [request dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L787-L849), [scope queues](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L18-L103))
- Scope queue는 `HashMap<Key, VecDeque>`이며 이 implementation에는 explicit length cap이 없다. Per-thread listener command도 unbounded channel이다. ([serialization storage](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L133-L200), [listener command channel](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_state.rs#L101-L117))
- Response와 notification send API는 보통 bounded `OutgoingEnvelope` queue에 enqueue될 때 return한다. Physical stdout write acknowledgement는 일부 `...and_wait` path만 요청한다. ([normal send와 special wait](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/outgoing_message.rs#L503-L650))
- 한 stdout writer는 JSONL byte가 서로 섞이지 않게 한다. 하지만 queue에 들어온 inter-thread order는 scheduler artifact이며, cross-thread causal order나 generation-wide product publication order가 아니다.

#### stdio terminal과 task ownership은 비대칭이다

Stdin EOF·read error는 `ConnectionClosed`를 main loop에 보낸다. Main loop는 RPC gate를 닫고 connection cleanup task를 등록한 뒤 single-client stdio의 마지막 connection이므로 종료한다. ([reader close event](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L43-L80), [connection cleanup dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L996-L1016))

반면 stdout `write_all` failure는 writer task만 끝내고 `ConnectionClosed`를 보내지 않는다. ([writer failure](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L82-L98)) 따라서 external client는 stdout EOF, stdin write failure와 child exit를 스스로 race해 하나의 connection terminal로 수렴시켜야 한다.

Main App Server는 connection cleanup task를 `JoinSet`으로 reap·drain·abort하고 정상 종료에서 background tasks와 thread shutdown을 기다린다. ([cleanup task owner](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/connection_cleanup.rs#L8-L40), [server teardown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L1156-L1186)) 그러나 per-thread listener는 cancel/generation cleanup을 가진 detached `tokio::spawn`이고 command queue는 unbounded다. ([listener task](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L213-L385)) 따라서 server 전체를 “모든 queue가 bounded이고 모든 task가 structured ownership 아래 있다”고 요약하면 틀린다.

Stdio single-client mode는 signal 기반 graceful restart handler를 설치하지 않는다. Client가 stdin을 닫아 EOF를 주는 것이 source로 확인되는 graceful connection-close trigger다. ([stdio mode switch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L715-L721))

그 EOF를 보낸 뒤에도 client의 stdout reader는 child가 실제로 exit하거나 force deadline에 도달할 때까지 살아 있어야 한다. Stdio connection은 disconnect token이 없어서 full outbound writer queue에서 central router가 `send().await`하고 writer는 `stdout.write_all()`을 기다린다. Client가 graceful wait에 들어가며 stdout drain을 먼저 멈추면 server cleanup이 pipe backpressure에 막혀 끝나지 않을 수 있다. ([non-disconnectable writer backpressure](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/transport.rs#L134-L171), [stdio writer](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L82-L98), [outer task join](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L1178-L1192)) AY-PLE이 stderr를 pipe한다면 같은 이유로 별도 drain을 유지해야 한다. Exact saturation deadline은 Ticket 011, terminal·force policy는 Ticket 012가 결정한다.

### Test-only stdio helper

`app-server-test-client`는 `Command`로 package binary에 `app-server`를 붙이고 piped stdin/stdout, inherited stderr로 child를 spawn한다. ([spawn](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1526-L1595)) 이 코드는 stdio invocation과 shutdown precedent를 제공하지만 production `app-server-client` crate의 adapter가 아니다.

Helper는 background reader나 concurrent pending map을 두지 않는다. Request call stack이 한 줄씩 읽어 matching response를 찾고, 그 사이 notification은 unbounded `VecDeque`에 FIFO로 넣으며 Server request도 같은 blocking loop에서 처리한다. 다른 ID의 response/error는 버린다. ([response wait와 notification queue](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1930-L2011), [JSONL read/write](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L2182-L2235))

이 FIFO는 “response를 기다리는 동안 notification이 먼저 올 수 있고 잃지 않아야 한다”는 integration evidence다. 여러 concurrent request와 long-lived consumer를 위한 task architecture 증거는 아니다.

Drop은 stdin을 닫고 최대 5초 child exit를 poll한 뒤 `kill()`하고 `wait()`해 reap한다. ([Drop cleanup](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L2324-L2353)) `close stdin → bounded wait → force kill → reap` 순서는 가져갈 수 있지만, synchronous blocking Drop와 error를 삼키는 behavior는 production contract로 복사하지 않는다.

## Ownership matrix

| Concern | Production InProcess client | Production Remote client | Production App Server stdio | Test-only stdio helper | AY-PLE에 주는 제약 |
| --- | --- | --- | --- | --- | --- |
| Bootstrap | Facade가 embedded runtime start와 initialize 완료 | Connect loop가 socket과 initialize/initialized 소유 | Server process가 stdio connection tasks 생성 | Helper가 child spawn 후 initialize call | External stdio child supervisor와 handshake를 AY-PLE client 내부에 둔다. |
| Transport owner | Typed channel facade worker + lower runtime | Worker 하나가 WebSocket/UDS stream 소유 | Reader task와 writer task, central processor | Caller stack이 stdin/stdout 소유 | stdin writer와 stdout reader의 authority를 중복시키지 않는다. |
| Response demux | Lower runtime pending map + oneshot | Worker pending map, exact live ID | Server가 direction별 envelope를 processor로 전달 | Matching response를 synchronous scan | Pending registry는 connection owner가 소유하고 caller에 ingress를 넘기지 않는다. |
| Notification·Server request drain | Worker가 lower event를 계속 읽음 | 같은 worker read branch가 event로 변환 | Per-thread listener가 central outgoing path로 보냄 | Response wait loop가 임시 drain | Request wait와 event drain은 독립적으로 진행돼야 한다. |
| Buffering | 여러 count-bounded queues, selective drop | Command만 bounded; event·init staging unbounded | 일부 count-bounded, line·scope queue·listener command는 unbounded | Notification deque unbounded | 각 byte/message/scope bound와 saturation outcome을 AY-PLE이 직접 정의한다. |
| Terminal | Channel closure 또는 explicit nested shutdown | `Disconnected` 후 pending 전체 실패 | stdin close만 coordinated; stdout failure는 비대칭 | I/O error 또는 Drop cleanup | stdout EOF·stdin failure·child exit를 one-shot terminal로 collapse한다. |
| Shutdown | Receiver drop → shutdown command → ack 5초 + worker 5초/abort, 일부 실패가 success와 합쳐짐 | Close command → ack 5초 + worker 5초/abort, 일부 실패가 success와 합쳐짐 | EOF 후 cleanup/background/thread drain | stdin close → 5초 → kill/wait | Stdout·piped stderr drain을 유지하며 graceful request, deadline, force, reap와 실패 result를 명시한다. |
| Task ownership | Facade worker는 owned, request waiters는 detached | Worker는 owned, clone handle은 sender 보유 | Cleanup JoinSet과 detached listeners가 혼재 | Background task 없음 | 모든 AY-PLE-owned task와 child의 completion authority를 한 lifecycle에 묶는다. |

## AY-PLE로 옮길 source-grounded constraints

| Constraint | 근거와 적용 의미 |
| --- | --- |
| Single connection authority | Remote worker와 App Server connection state처럼 pending map과 transport terminal을 한 owner가 바꾼다. Reader와 caller가 서로 terminal을 따로 publish하지 않는다. |
| Single ingress reader | Connection당 inbound stream parser는 하나다. 이는 byte/envelope classification의 결정성을 위한 것이며 sequential request execution이나 global causal order를 뜻하지 않는다. |
| Waiter-independent drain | Response await와 graceful shutdown 중에도 notification·Server request와 stdout bytes가 도착할 수 있다. Waiter는 oneshot만 기다리고 ingress pump는 child exit 또는 force deadline까지 계속 drain한다. |
| Exact, direction-aware correlation | Client request response와 server-origin request response는 반대 방향 namespace다. Envelope kind와 exact `string | number` ID를 함께 보존한다. Server-origin request responder의 once-only authority는 upstream remote client가 제공하지 않으므로 별도 결정한다. |
| Request/event surface separation | Clone 가능한 request capability와 single-consumer event capability를 분리해 event를 여러 consumer가 경쟁적으로 나눠 갖지 않게 한다. |
| One terminal fan-out | Invalid external stream, EOF, write failure와 child exit 중 첫 authority가 terminal을 정하고 모든 in-flight waiter와 event stream을 같은 connection outcome으로 끝낸다. |
| Explicit lifecycle | `initialize → initialized → active → close/terminal → reap`을 숨긴다. Caller가 child, raw stdin/stdout나 initialize staging을 조립하지 않는다. |
| Layered errors | Transport/process failure, server-declared error와 response validation failure를 type 수준에서 구분한다. Product adapter가 raw payload를 받지 않아도 recovery를 결정할 수 있어야 한다. |
| Scope-local semantics | stdout의 한 writer가 만든 line order를 native thread/turn/item lifecycle보다 강한 cross-thread publication contract로 승격하지 않는다. |

이 constraint들은 final module 이름이나 public method roster를 아직 고정하지 않는다. Interface는 첫 tracer가 요구하는 behavior를 기준으로 Ticket 008에서 결정한다.

## 따라 하지 않을 implementation convenience와 gap

| Upstream behavior | 그대로 복사하지 않는 이유 | Decision owner |
| --- | --- | --- |
| Remote unbounded event channel와 init `Vec` | Slow consumer·pre-response flood가 memory bound를 무력화한다. | Ticket 011 |
| InProcess transport별 lossless/best-effort 목록 | Lower/upper classifier가 달라 end-to-end proof가 아니고 product recovery source도 없다. | Ticket 011 |
| Caller-owned request ID와 live-only duplicate check | Timeout/late duplicate 뒤 ID reuse가 새 waiter와 충돌할 수 있다. | Ticket 009·012 |
| Post-initialize request timeout·cancel·tombstone 없음 | Connect/initialize timeout과 달리 caller cancellation은 wire mutation 취소나 known outcome을 뜻하지 않는다. | Ticket 012 |
| Unmatched response와 typed-invalid notification silent drop | Pinned external binary skew·bug를 숨길 수 있다. 더 강한 fail-closed behavior는 AY-PLE decision으로 명시해야 한다. | Ticket 012·013 |
| Partial initialize result parsing | Generated public response shape conformance를 증명하지 않는다. | Ticket 013 |
| Pre-initialize Server request unbounded staging | Caller가 아직 응답 surface를 받지 못한 상태의 liveness와 memory risk가 있다. | Ticket 008·011·012 |
| Request별 detached task와 server detached listeners | Source의 cancellation·join ownership을 AY-PLE task graph에 자동으로 이식할 수 없다. InProcess facade의 detached request task가 later synchronous notification보다 lower submission을 늦출 수 있다는 source-graph inference도 있어 command receipt FIFO를 downstream write order로 간주할 수 없다. | Ticket 008·012 |
| Remote command별 write-failure 비대칭 | Request write failure만 connection terminal이고 notify·resolve·reject failure는 worker를 유지한다. AY-PLE의 terminal authority는 이 convenience를 의도적으로 따를지 별도 결정해야 한다. | Ticket 012 |
| Remote Server request reply registry 없음 | Arbitrary ID의 duplicate·stale resolve/reject를 client가 막지 않는다. Responder capability와 once-only lifecycle을 raw ID method로 둘지 결정해야 한다. | Ticket 008·009·012 |
| Shutdown failure를 success와 합치는 path | Ack timeout·JoinError·forced abort를 successful graceful close와 구별하지 못하거나 error에서 join 전 return한다. AY-PLE은 close outcome과 child reap completion을 별도로 증명해야 한다. | Ticket 012 |
| Huge `InProcessClientStartArgs`와 `legacy_core` escape hatch | Rust embedding ambient state와 migration compatibility이지 external client Interface가 아니다. | Ticket 008 |
| Server의 malformed-input log-and-continue와 overload response drop | Server 방어 behavior이지 client가 malformed output을 신뢰해 계속해야 한다는 contract가 아니다. | Ticket 012·013 |
| Test helper의 synchronous scan와 blocking Drop | Concurrent long-lived product client의 drain·shutdown semantics를 제공하지 않는다. | Ticket 008·012 |

## AY-PLE product adapter와의 경계

Upstream production TUI도 connection facade 위에 `AppServerSession`을 두어 request ID sequencing, bootstrap requests와 method-specific parameters를 조합한다. ([TUI session state](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L175-L230), [event·request handle delegation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L443-L450), [shutdown과 ID sequencing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L1145-L1173)) 이는 low-level client 하나가 UI·conversation policy까지 모두 소유하지 않는다는 production precedent다. TUI의 session method roster와 UI state 자체를 AY-PLE에 복사하라는 뜻은 아니다. 아래 표는 Ticket 008에서 검증할 candidate ownership이며 final Interface가 아니다.

| Candidate boundary | Ticket 008에서 검증할 hypothesis | 이 evidence가 배제하는 책임 혼합 |
| --- | --- | --- |
| App Server connection/client 내부 | Package binary child, initialize, single ingress/writer, exact response demux, typed notification·Server request, bounded internal delivery, terminal과 shutdown/reap | SemesterWorkspace, `ModelingInvocation`, browser DTO, SSE publication sequence, product retry UX |
| Conversation use-case layer | Typed native lifecycle을 connection facade 위에서 소비하는 seam이 필요한지 첫 tracer와 Ticket 006 evidence로 검증 | Raw child/stdin/stdout와 generic transport anomaly parsing을 이 층에 다시 노출하는 설계 |
| AY-PLE/local web adapter | 필요한 browser-safe translation의 최소 범위를 첫 tracer로 검증 | Raw generated payload, native protocol envelope, connection pending map과 child signal 처리 |

기존 `ProductRuntimeLayout`은 package-owned binary와 root를 connection bootstrap에 제공할 candidate일 수 있지만, 기존 `HeadlessCodexClientHost` Interface와 global generation/ref/event state machine을 보존해야 한다는 결론은 나오지 않는다. 실제 seam과 selective salvage는 Tickets 008과 014가 결정한다.

## 후속 ticket으로 넘기는 결정

| Ticket | 이 문서가 고정한 입력 | 아직 결정하지 않은 것 |
| --- | --- | --- |
| 006 — conversation ownership | Connection client와 TUI/exec use-case layer가 별도이고 native events가 per-thread listener에서 나온다. | Core·TUI·exec의 thread/turn/item authority, history/backfill과 multi-thread ownership pattern |
| 007 — source alignment review | Production client/server/test helper와 fact/inference/deviation을 분리한 architecture evidence | 두 evidence asset의 누락·모순 여부 |
| 008 — first tracer와 seams | External stdio supervisor가 필요하고 connection interface는 child/protocol lifecycle을 숨겨야 한다. | Exact package/module names, public methods, task split과 browser tracer boundary |
| 009 — identity | Exact direction-aware ID correlation이 필요하고 upstream caller-owned ID에는 late-response safety가 없다. | Client-generated request ID, native identity exposure와 product reference policy |
| 011 — delivery·recovery | Upstream에는 universal bounded/lossless contract가 없고 raw wire order는 global causality가 아니다. | Byte/message bounds, lossless set, saturation outcome와 `thread/read` backfill |
| 012 — connection·unknown outcome | Terminal fan-out과 explicit shutdown precedent는 있으나 timeout/cancel·mutation outcome은 정의되지 않았다. | Timeout taxonomy, retry 금지, reconnect/resume와 product restart UX |
| 013 — source conformance | Pinned remote client의 validation은 generated external boundary의 충분한 oracle이 아니다. | Schema/unit/fake child/live probe와 pin-upgrade gate matrix |
| 014 — removal·salvage | Existing Host compatibility는 architecture constraint가 아니고 lower stdio/layout primitive만 candidate다. | 실제 삭제·재사용 file inventory와 migration order |

## Reviewed source ledger

| Path | 확인한 ownership |
| --- | --- |
| `codex-rs/app-server-client/{README.md,src/lib.rs,src/remote.rs}` | Public client facade, request/event split, in-process·remote worker, initialize, demux, buffering, terminal, shutdown |
| `codex-rs/app-server/src/in_process.rs` | Embedded lower queues, pending response demux, notification delivery와 teardown |
| `codex-rs/app-server-transport/src/transport/{mod.rs,stdio.rs}` | JSONL reader/writer, count capacity, parse·overload와 close behavior |
| `codex-rs/app-server/src/{lib.rs,transport.rs,outgoing_message.rs,request_serialization.rs,thread_state.rs,connection_cleanup.rs}` | Central ingress/outbound routing, execution concurrency, queue/task ownership와 shutdown |
| `codex-rs/app-server/src/request_processors/thread_lifecycle.rs` | Per-thread listener task와 command ownership |
| `codex-rs/app-server-test-client/src/lib.rs` | Test-only stdio spawn, response-wait FIFO와 child cleanup |
| `codex-rs/{tui,exec}/src/**` | Production client consumers와 connection facade 위 use-case layer |

이 ledger는 architecture interpretation의 traceability다. Public protocol shape의 owner는 계속 pinned generated schema이고, AY-PLE의 최종 seam·policy owner는 후속 ADR/spec이다.
