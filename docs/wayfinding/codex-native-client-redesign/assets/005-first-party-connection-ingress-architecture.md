# First-party Connection·App Server ingress architecture 근거 지도

- 분류: 기술 참고
- 성숙도: 채택
- 대상 pin: `@openai/codex@0.144.0`, upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`
- 범위: Python external stdio client, Rust production `app-server-client`, App Server ingress·stdio transport, test client, TUI·exec consumer Seam

이 문서는 [Connection·App Server ingress architecture pattern을 지도화한다](../tickets/005-map-first-party-rust-architecture-patterns.md)의 설계 근거다. Exact-pin source의 소유 구조와 검증된 동작, source graph에서 도출한 추론, AY-PLE이 후속 ticket에서 내려야 할 선택을 분리한다.

## 판정

Pinned Rust `codex-app-server-client`에는 external stdio child adapter가 없고 npm package에도 reusable TypeScript client가 없다. 그러나 exact pin의 Python `sdk/python/openai_codex`에는 실제 external stdio App Server client가 있다. 따라서 AY-PLE은 upstream client를 그대로 import할 수는 없지만 protocol shape에서 client semantics를 새로 발명하지 않고 Python client의 child lifecycle·sole reader·serialized writer·active response routing·early turn staging·disconnect settlement을 가장 가까운 port reference로 사용한다. Rust facade와 TUI projection은 typed routing과 consumer ownership을 보완한다.

가져갈 핵심은 다음과 같다.

- connection마다 transport I/O와 pending request registry의 owner를 하나로 둔다.
- response waiter가 ingress reader를 소유하거나 막지 않게 하고, notification과 Server request를 계속 drain한다.
- response는 direction과 exact `RequestId`로 demultiplex하고, connection terminal은 남은 waiter 전체에 한 번 전파한다.
- request 호출 surface와 single-consumer event surface를 분리하고, initialize와 shutdown을 명시적 lifecycle로 둔다.
- generated protocol validation, queue bound, timeout·unknown outcome과 anomaly 정책은 pinned external Seam에 맞게 별도로 결정한다.

가져오지 않을 것은 Python의 unbounded early queue, remote의 unbounded event queue, transport마다 다른 lossless tier, test helper의 synchronous reader와 embedded Rust ambient state를 노출하는 거대한 start arguments다. Active map miss인 unknown·late response no-op와 remove-on-response는 first-party 기준선이므로 process-lifetime tombstone·global contradiction terminal로 강화하지 않는다. Exact timeout·overflow·invalid notification과 JavaScript lossless ID parsing은 TypeScript deployment adaptation으로 후속 spec이 명시한다.

### Ticket 019 first-party client 보완

- Python [`MessageRouter`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/_message_router.py#L17-L240)는 active waiter를 response에서 `pop`하고 turn registration 전 notification을 native `turn_id`별 FIFO에 보관하며 reader loss 때 current pending을 모두 실패시킨다.
- Python [`Client`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L196-L477)는 child lifecycle을, [reader/writer loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L795-L860)는 sole reader와 serialized writer를 소유한다.
- Rust [`RemoteAppServerClient`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L200-L477)는 active pending request만 검사·제거하고 disconnect에서 current pending만 settle한다.

현재 기준 동작과 코드 처리 방침은 [Ticket 019 감사](019-first-party-client-port-and-reuse-audit.md)가 소유한다. 아래 Rust·server-side 조사는 유효한 보완 근거지만 “Python external stdio client가 없다”는 옛 전제에는 더 이상 권위가 없다.

## 조사 범위와 근거 권위

조사 기준은 npm pin과 provenance가 연결한 exact commit [`767822446c7a594caa19609ca435281a9ec67e0d`](https://github.com/openai/codex/commit/767822446c7a594caa19609ca435281a9ec67e0d)다. Source checkout, artifact와 generated protocol의 관계는 [Upstream source provenance 근거](003-upstream-source-provenance.md)가 소유한다.

| 근거 등급 | 이 문서에서 소유하는 사실 | 소유하지 않는 것 |
| --- | --- | --- |
| [현재 공식 App Server 문서](https://developers.openai.com/codex/app-server/) | App Server가 rich client surface이고 stdio가 JSONL인 공개 lifecycle·message model, generated schema가 실행 version에 specific하다는 사실 | `0.144.0`의 task scheduling, queue와 notification/response 상대 순서 |
| 고정 버전 generated protocol | AY-PLE이 받아야 할 public method·payload shape | Rust task ownership과 buffering behavior |
| 고정 버전 production source·test | Exact version의 module/task/channel ownership과 검증된 구현 동작 | 앞으로의 OpenAI 호환성 보장, AY-PLE product policy |
| 고정 버전 test client | 실제 binary를 stdio로 부르는 argv·framing·EOF cleanup precedent | Production concurrency·backpressure architecture |
| 이 문서의 추론 | Source task graph에서 도출한 위험과 design constraint | Protocol guarantee 또는 이미 채택한 AY-PLE 결정 |
| 후속 Wayfinder 결정 | AY-PLE seam, identity, delivery, recovery와 verification policy | Upstream fact의 재정의 |

현재 공식 문서는 wire를 **`jsonrpc` header를 생략한 JSON-RPC 2.0 message**로 설명한다. 반면 exact-pin `rpc.rs`는 그 member를 보내지도 기대하지도 않으므로 **true JSON-RPC 2.0을 하지 않는다**고 명시한다. 이는 서로 다른 근거 등급의 명명이고, 두 근거가 지시하는 실제 wire shape가 충돌한다는 뜻은 아니다. 이 문서는 모호함을 피해 **Codex App Server RPC envelope**라고 부른다. ([현재 공식 protocol](https://developers.openai.com/codex/app-server/#protocol), [exact-pin protocol note와 네 envelope](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/rpc.rs#L1-L42))

Generic JSON-RPC library를 쓸지 여부는 여기서 결정하지 않는다. 채택하려면 `jsonrpc` member를 강제하지 않고, headerless request·notification·response·error 네 shape, `string | integer` ID와 request의 optional `trace`를 손실 없이 보존하는지 검증해야 한다. Library·module 선택은 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), source conformance gate는 [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md)가 소유한다.

## 운영 구성

```text
embedded TUI/exec
  -> InProcessAppServerClient facade worker
     -> InProcessClientHandle runtime worker
        -> MessageProcessor -> per-thread listener -> facade event stream

remote TUI
  -> RemoteAppServerClient worker
     <-> WebSocket or Unix socket App Server
     -> pending response oneshots + one event receiver

Python SDK
  -> external stdio child + MessageRouter
     <-> codex app-server --listen stdio://
     -> sole reader + serialized writer + active waiters + per-turn early FIFO

AY-PLE target Seam
  -> AY-PLE-owned child/process connection
     <-> codex app-server --listen stdio://
     -> generated-schema-backed request/event interface
```

AY-PLE target은 Python SDK와 같은 external stdio topology지만 reusable TypeScript implementation은 없다. Python client를 responsibility와 observable behavior의 primary reference로 사용하고, Rust facade·TUI·server method source와 test helper를 보완 evidence로 사용한다.

이 external process owner는 package binary 선택과 argv뿐 아니라 partial-spawn cleanup, stderr 처리, child-exit watcher, serialized stdin writer, single stdout reader와 force-kill 뒤 reap까지 하나의 lifecycle로 묶어야 한다. Sole reader·serialized writer·active waiter settlement은 Python client에서 port하고 exact package pin, cleanup·reap와 finite capacity는 AY-PLE TypeScript deployment adaptation으로 명시한다. Exact task split은 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), deadline·terminal policy는 [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

### `InProcessAppServerClient` 운영 경로

`app-server-client` README는 이 crate가 `codex-exec`과 `codex-tui`가 공유하는 in-process bootstrap·initialize·lifecycle facade라고 설명한다. Typed channel을 쓰지만 response는 여전히 App Server RPC result envelope를 거친다. ([purpose와 transport model](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/README.md#L3-L43)) 실제 exec도 이 facade를 시작하고 event stream을 drain한다. ([exec startup](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L795-L820), [event loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L960-L997))

Facade는 다음 ownership을 갖는다.

- `InProcessAppServerClient`가 bounded command sender, single event receiver와 worker `JoinHandle`을 소유하고, clone 가능한 `InProcessAppServerRequestHandle`은 command sender만 가진다. ([client와 handle](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L452-L472))
- Worker 하나가 command와 lower runtime event를 `select!`로 drain한다. Request response 대기는 별도 spawned task에 맡겨 lower response가 Server request 입력을 기다리는 동안에도 worker가 event를 읽을 수 있게 한다. ([worker와 detached waiter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L474-L590))
- Command channel의 count bound는 **누적 in-flight request bound가 아니다**. Worker가 request를 받을 때마다 detached waiter를 만들고, lower runtime의 pending response `HashMap`도 live request 수에 대한 별도 cap을 두지 않는다. ([detached waiter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L488-L503), [lower pending registry](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/in_process.rs#L533-L580))
- `next_event(&mut self)`는 한 event consumer를 강제하지만 request handle은 clone할 수 있다. 즉 concurrent request submission과 ordered event consumption의 권한이 interface에서 분리된다. ([event receiver와 shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L739-L784), [request handle](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L787-L829))
- Typed request error는 transport, server-declared RPC error, response deserialize failure를 구분한다. 이 error layering은 product recovery policy를 transport string parsing으로 대체하지 않게 한다. ([`TypedRequestError`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L261-L313))
- Shutdown은 event receiver를 먼저 drop해 must-deliver send를 풀고 runtime shutdown을 요청한다. Shutdown acknowledgement를 최대 5초 기다린 뒤 worker completion을 별도로 최대 5초 기다리므로 총 wait는 약 10초가 될 수 있고, 두 번째 deadline 뒤 worker를 abort한다. 다만 ack timeout과 completed worker의 `JoinError`는 성공 return과 구별되지 않고, shutdown command가 error를 돌려주면 worker join 전에 early return한다. 따라서 이는 bounded-attempt 순서의 precedent이지 graceful close proof가 아니다. ([shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L748-L784))

`InProcessClientStartArgs`는 config, auth, telemetry, state DB와 environment manager 같은 Rust process ambient state를 열다섯 개가 넘는 field로 전달한다. 이는 same-process embedding용 assembly surface이지 external App Server client나 AY-PLE product Interface의 모델이 아니다. ([start arguments](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L316-L410))

#### `lossless`는 end-to-end guarantee가 아니다

Facade forwarding helper는 agent text·plan·reasoning delta, `ItemCompleted`, `TurnCompleted` 등을 blocking delivery tier로 분류하고 나머지를 best-effort drop + `Lagged`로 처리한다. Checked-in test는 facade helper의 이 분류가 saturated channel에서 transcript event를 보존하는지 고정한다. ([facade classifier](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L136-L171), [forwarding behavior](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L183-L258), [backpressure test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L1361-L1446))

그러나 한 층 아래 `app-server::in_process`는 `TurnCompleted`, `ThreadSettingsUpdated`, `ExternalAgentConfigImportCompleted`만 blocking delivery로 분류한다. Queue가 먼저 찼다면 `AgentMessageDelta`나 `ItemCompleted`는 facade에 도달하기 전에 drop될 수 있다. ([lower classifier](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/in_process.rs#L98-L112), [lower delivery](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/in_process.rs#L638-L690)) 따라서 이 목록은 protocol contract도, pinned production path 전체의 lossless proof도 아니다. Delivery와 transcript recovery는 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md)가 소유한다.

### `RemoteAppServerClient` 운영 경로

Remote client endpoint는 WebSocket URL 또는 Unix domain socket뿐이다. `stdio`나 child process variant는 없다. ([endpoint enum](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L65-L81), [connect dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L151-L184)) TUI는 embedded, local daemon과 remote target을 나누고 remote target만 이 client로 연결한다. ([TUI target와 connect](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/lib.rs#L260-L278), [remote construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/lib.rs#L394-L409))

Initialize는 worker를 만들기 전에 같은 stream을 읽는 loop가 소유한다. Matching initialize response 전 notification과 known Server request는 arrival FIFO `Vec`에 보관하고, response를 받은 뒤 `initialized`를 쓴 다음 client를 반환한다. Unrelated response/error는 무시한다. ([initialize loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L794-L935)) 이 구현은 request wait 중 notification arrival이 정상임을 보여 주지만 `Vec`에는 bound가 없고, staged Server request는 `connect()`가 반환되기 전 caller가 응답할 수 없다. 후자가 initialize response의 선행 조건인 hypothetical server에서는 deadlock할 수 있다는 것은 source에서 도출한 위험이지 pinned server가 그런 순서를 낸다는 관찰이 아니다.

Initialize 뒤에는 worker 하나가 command receiver와 stream read를 함께 `select!`하고 pending request `HashMap<RequestId, oneshot>`을 소유한다.

- 같은 ID가 **현재 pending일 때만** duplicate submission을 거부한다.
- matching response/error는 exact ID waiter 하나를 resolve한다.
- notification은 typed `ServerNotification`, request는 typed `ServerRequest`로 변환해 event channel로 보낸다.
- unknown Server request는 `-32601`로 reject한다.
- malformed generic envelope, close, transport error와 EOF는 `Disconnected` event를 내고 loop를 끝낸다.
- loop terminal은 남은 pending waiter를 같은 terminal error로 모두 실패시킨다.

([worker와 pending registry](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L213-L320), [ingress routing과 terminal](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L319-L475)) Live duplicate ID가 original waiter를 보존하는 것, initialize 중 Server request staging, unknown request 거절과 disconnect event는 checked-in production client test에서도 고정된다. ([duplicate test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L1669-L1754), [initialize staging test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L1944-L2019), [unknown request·disconnect tests](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L2022-L2072))

이 task shape에서 caller의 response waiter는 ingress를 읽지 않는다. 반면 worker가 socket write를 await하는 동안에는 같은 worker의 read branch가 진행하지 않으므로, “single owner”를 곧 “read/write가 항상 독립적으로 진행한다”로 해석하면 안 된다.

#### Remote의 bound·validation 누락

`channel_capacity`는 command `mpsc`에만 적용된다. Event channel은 명시적인 `unbounded_channel`이고 initialize pending event도 unbounded `Vec`다. Worker가 command를 계속 꺼내 pending request `HashMap`에 넣으므로 command queue bound는 누적 in-flight request 수를 제한하지 않는다. ([client fields와 channels](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L151-L157), [channel·registry construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L195-L249)) WebSocket·UDS framing은 frame·message당 128 MiB cap을 두지만 event·pending storage의 count/aggregate byte bound는 아니다. ([WebSocket limit](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L65-L68), [endpoint config](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L710-L792)) 그러므로 README의 bounded queue 설명을 remote path 전체에 일반화할 수 없다.

Remote는 각 connect/upgrade 단계와 initialize에 10초 deadline을 두며, UDS bootstrap은 socket connect와 WebSocket upgrade가 각각 별도 10초 단계다. 아래 누락은 **initialize 뒤 개별 request lifecycle**과 validation에 관한 것이다. ([WebSocket connect](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L714-L737), [UDS connect·upgrade](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L739-L786), [initialize timeout](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L819-L924))

Pinned remote implementation은 다음을 client-owned safety로 제공하지 않는다.

- API caller가 ID를 포함한 `ClientRequest`를 만들고, client는 completed/timed-out tombstone을 남기지 않는다. ID를 다시 쓴 동안 old duplicate response가 오면 새 waiter와 match할 수 있다는 것은 이 source에서 도출한 inference다. ([pending-only duplicate check](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L227-L249), [response match](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L319-L331))
- Post-initialize request waiter에는 timeout·cancel command·pending deregistration가 없다. Caller future를 취소해도 queued mutation의 outcome은 정해지지 않는다. ([request waiter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L629-L655))
- Initialize success result를 generated `InitializeResponse` 전체로 validate하지 않고 `userAgent`와 `codexHome`만 선택적으로 읽는다. ([initialize result handling](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L819-L850))
- `request_typed<T>`는 method와 response type을 결합하지 않고 caller가 고른 arbitrary `T`로 result를 deserialize한다. 그러므로 layered error는 유용하지만 generated method-response conformance의 충분한 oracle은 아니다. ([InProcess generic request](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L810-L847), [Remote generic request](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L657-L675))
- Unmatched response/error와 typed conversion에 실패한 notification은 terminal이 아니라 silent drop이다. ([routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L319-L407), [notification conversion](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L938-L943))
- Server-origin request에는 client-side pending·once-only registry가 없다. `resolve_server_request`와 `reject_server_request`는 caller가 준 임의 ID를 그대로 command로 보내므로 duplicate·stale response를 client가 막아 준다고 볼 수 없다. ([public responders](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L539-L590), [write commands](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L272-L303))

Request ID allocation에도 하나의 first-party default는 없다. Remote initialize는 connection-local fixed string을 쓰고, test helper는 UUID string을 내부 생성하며, TUI session·exec는 integer sequencer를, clone request handle을 받는 TUI bootstrap은 prefixed UUID를 쓴다. ([Remote initialize ID](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L803-L817), [test helper UUID](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L2032-L2034), [TUI sequencer·handle UUID](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L1169-L1194), [exec sequencer](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L188-L201)) AY-PLE allocator surface는 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), timeout·late reuse lifecycle은 [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

Write failure도 command 종류에 따라 다르다. Client request write failure는 `Disconnected`를 내고 worker를 끝내지만, notification과 Server request resolve/reject write failure는 해당 command에 error만 돌려주고 worker를 계속 실행한다. 이 비대칭은 upstream이 uniform write-failure terminal classification을 제공하지 않는다는 근거다. AY-PLE은 각 signal을 하나의 arbiter로 보내되 어느 failure가 closing을 시작할지는 후속 policy로 남긴다. ([command write paths](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L227-L303))

Remote shutdown도 close acknowledgement를 최대 5초 기다린 뒤 worker completion을 별도로 최대 5초 기다려 총 wait가 약 10초가 될 수 있고, 두 번째 deadline 뒤 abort한다. Close-command send failure·ack timeout/cancel과 completed worker의 `JoinError`는 success return과 구별되지 않으며, `close_result` error는 worker join 전에 early return한다. Production client에는 child reaping이나 `Drop` supervisor가 없다. 따라서 이 역시 bounded-attempt precedent이지 successful graceful close의 oracle이 아니다. ([remote shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L600-L625))

### 운영 App Server의 stdio ingress·output

이 부분은 **server side** ownership이다. External AY-PLE client의 child·stdin·stdout lifecycle을 대신 구현하지 않는다.

`start_stdio_connection`은 connection별 bounded writer queue를 만들고 stdout writer task와 stdin reader task를 각각 spawn한다. Reader 하나가 `BufReader::lines()`로 JSONL을 순서대로 읽어 central `TransportEvent` channel에 보낸다. Writer 하나가 queued envelope를 JSON 한 줄로 serialize해 `stdout.write_all()`한다. ([stdio task construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L24-L100))

이 topology에서 확인되는 경계는 다음과 같다.

- Internal channel capacity `128`은 **message count** bound다. `lines()`가 읽는 inbound raw line뿐 아니라 parsed RPC message, central `OutgoingEnvelope`와 per-connection queued payload에도 이 경로의 explicit byte cap이 없다. Serialization은 queue 뒤 writer에서 일어난다. ([capacity](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/mod.rs#L21-L24), [line reader](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L43-L67), [writer serialization](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L82-L98))
- Malformed JSON은 log하고 connection을 계속 읽는다. Queue가 full일 때 Client request만 `-32001` overload response를 `try_send`하며, outbound queue도 full이면 그 error조차 drop한다. Response·error·notification은 ingress queue 자리가 날 때까지 await한다. ([parse와 overflow](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/mod.rs#L200-L255))
- Main processor loop 하나가 inbound envelope를 request, response, notification, error로 분류하지만 request execution은 여기서 직렬로 끝나지 않는다. Initialized request는 method scope별 FIFO/shared-read queue로 가거나 detached task로 실행된다. ([main ingress dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L1018-L1106), [request dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L787-L849), [scope queues](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L18-L103))
- Scope queue는 `HashMap<Key, VecDeque>`이며 이 implementation에는 explicit length cap이 없다. Per-thread listener command도 unbounded channel이다. ([serialization storage](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L133-L200), [listener command channel](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_state.rs#L101-L117))
- Response와 notification send API는 보통 bounded `OutgoingEnvelope` queue에 enqueue될 때 return한다. 일부 `...and_wait` path는 successful `write_all`에서만 completion signal을 보내지만, enqueue·filter·serialization·write failure로 oneshot이 취소된 결과를 caller가 버린다. 따라서 API의 normal return 자체는 physical write·flush·peer receipt proof가 아니다. ([normal send와 special wait](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/outgoing_message.rs#L503-L650), [write completion](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L82-L98))
- 한 stdout writer는 JSONL byte가 서로 섞이지 않게 한다. 하지만 queue에 들어온 inter-thread order는 scheduler artifact이며, cross-thread causal order나 generation-wide product publication order가 아니다.

#### stdio terminal과 task ownership은 비대칭이다

Stdin EOF·read error는 `ConnectionClosed`를 main loop에 보내고, loop는 해당 RPC gate를 닫은 뒤 connection cleanup task를 등록한다. 그러나 stdio mode도 persisted·explicit Remote Control connection이 공존할 수 있어 **stdin EOF가 항상 process exit인 것은 아니다**. `shutdown_when_no_connections` 조건은 전체 connection map이 비어야만 processor를 종료한다. ([reader close event](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L43-L80), [stdio mode·connection condition](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L715-L721), [connection cleanup dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L996-L1016), [Remote Control startup](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L784-L824), [stdio 공존 test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/remote_control/tests.rs#L1789-L1867))

반면 stdout `write_all` failure는 writer task만 끝내고 `ConnectionClosed`를 보내지 않는다. ([writer failure](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L82-L98)) 따라서 external client는 stdout EOF, stdin write failure와 child exit signal을 하나의 arbiter로 보내야 한다. 후속 policy가 terminal로 분류한 signal이 도착하면 closing transition과 waiter fan-out을 한 번만 시작하되, 어느 signal을 terminal로 분류할지와 최종 error·shutdown result가 later child exit·force·reap evidence를 어떻게 합칠지는 이 source가 결정하지 않는다.

Main App Server는 processor-side connection cleanup task를 `JoinSet`으로 reap·drain·abort한다. Stdio reader/writer `JoinHandle`은 별도 `Vec`에 보관하지만 active loop에서 failure를 poll하지 않고 processor·outbound router가 끝난 뒤에야 result를 버린 채 join한다. ([cleanup task owner](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/connection_cleanup.rs#L8-L40), [transport handle join](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L1178-L1186)) Normal teardown은 connection RPC drain 30초, background task 10초, thread shutdown 10초 deadline이 순차적으로 올 수 있고 이후 outer handle join에는 별도 global deadline이 없다. ([RPC drain](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L695-L721), [background·thread shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1037-L1061)) Per-thread listener도 detached `tokio::spawn`과 unbounded command queue를 쓴다. ([listener task](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L213-L385)) 따라서 server 전체를 “모든 queue가 bounded·task가 actively supervised·teardown이 globally bounded”라고 요약하면 틀린다.

Stdio mode는 signal 기반 graceful restart handler를 설치하지 않는다. Client가 stdin을 닫아 EOF를 주는 것은 source로 확인되는 **stdio connection** close trigger이지, 앞서 본 공존 connection까지 종료하는 process-shutdown RPC가 아니다. AY-PLE bootstrap에서 Remote Control ambient state를 차단·격리할지는 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), 남은 process의 force·reap은 [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md)가 소유한다. ([stdio mode switch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L715-L721))

Stdio connection은 disconnect token이 없어서 full outbound writer queue에서 central router가 `send().await`하고 writer는 `stdout.write_all()`을 기다린다. Client가 **pipe read end를 열어 둔 채** consumption만 멈추면 server cleanup이 pipe backpressure에 막혀 끝나지 않을 수 있다. Graceful tail drain을 선택하면 stdout reader를 child exit 또는 force deadline까지 유지해야 하지만, tail loss를 감수하고 read end를 명시적으로 닫는 terminal·force 전략도 source가 배제하지 않는다. AY-PLE이 stderr를 pipe한다면 열린 pipe를 drain하거나 명시적으로 닫아야 한다. ([non-disconnectable writer backpressure](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/transport.rs#L134-L171), [stdio writer](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L82-L98), [outer task join](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/lib.rs#L1178-L1192)) Exact byte·message saturation은 [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md), drain·terminal·force policy는 [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

### Test 전용 stdio helper

`app-server-test-client`는 `Command`로 package binary에 `app-server`를 붙이고 piped stdin/stdout, inherited stderr로 child를 spawn한다. Binary parent를 `PATH` 앞에 넣고 `--config`를 subcommand 앞에 두는 argv 조립은 test convenience이지 package contract가 아니다. Spawn 뒤 stdin/stdout handle 중 하나를 얻지 못하면 explicit kill/reap 없이 error return하는 점도 partial-spawn cleanup을 따라 하지 않을 근거다. ([spawn·argv·pipe extraction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1526-L1595)) 이 코드는 stdio invocation과 shutdown precedent를 제공하지만 production `app-server-client` crate의 adapter가 아니다.

Helper는 background reader나 concurrent pending map을 두지 않는다. Request call stack이 한 줄씩 읽어 matching response를 찾고, 그 사이 notification은 unbounded `VecDeque`에 FIFO로 넣으며 일부 Server request도 같은 blocking loop에서 처리한다. 다른 ID의 response/error는 버린다. ([response wait와 notification queue](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1930-L2011), [JSONL read/write](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L2182-L2235))

Server request handler는 command approval, file approval, `requestUserInput`만 알고, user input은 ingress를 동기적으로 막으며, unsupported variant는 response 없이 caller error로 끝난다. ([inline handling](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1983-L1988), [supported request set](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L2036-L2053)) 따라서 helper는 generic Server-request liveness·ordering oracle가 아니다.

이 FIFO는 “response를 기다리는 동안 notification이 먼저 올 수 있고 잃지 않아야 한다”는 integration evidence다. Unified event total order, 여러 concurrent request와 long-lived consumer를 위한 task architecture 증거는 아니다.

Drop은 stdin을 닫고 최대 5초 child exit를 poll한 뒤 `kill()`하고 `wait()`해 reap한다. 이 동안 stdout을 더 drain하지 않으며 full stdout pipe·Remote Control 공존·partial-spawn failure를 검증하는 test도 없다. ([Drop cleanup](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L2324-L2353)) `close stdin → bounded wait → force kill → reap` 순서는 bounded-attempt precedent로 가져갈 수 있지만, 5초·blocking Drop·non-draining·error swallowing을 production contract로 복사하지 않는다.

## 책임 소유 표

| 관심사 | 운영 `InProcess` client | 운영 `Remote` client | 운영 App Server stdio | Test 전용 stdio helper | AY-PLE에 주는 제약 |
| --- | --- | --- | --- | --- | --- |
| Bootstrap | Facade가 embedded runtime start와 initialize 완료 | Connect loop가 socket과 initialize/initialized 소유 | Server process가 stdio connection task를 생성하고 Remote Control connection이 공존할 수 있음 | Helper가 child spawn 후 initialize call | External stdio child supervisor와 handshake, ambient Remote Control 격리를 AY-PLE Connection Seam 내부에 둔다. |
| Transport 소유자 | Typed channel facade worker + lower runtime | Worker 하나가 WebSocket/UDS stream 소유 | Reader task와 writer task, central processor | Caller stack이 stdin/stdout 소유 | stdin writer와 stdout reader의 authority를 중복시키지 않는다. |
| Response demux | Lower runtime pending map + oneshot | Worker pending map, exact live ID | Server가 direction별 envelope를 processor로 전달 | Matching response를 synchronous scan | Pending registry는 connection owner가 소유하고 caller에 ingress를 넘기지 않는다. |
| Notification·Server request drain | Worker가 lower event를 계속 읽음 | 같은 worker read branch가 event로 변환 | Per-thread listener가 central outgoing path로 보냄 | Response wait loop가 일부 variant를 inline 처리 | Request wait와 event drain은 독립적으로 진행돼야 한다. |
| Buffering | Command·event는 count-bounded, selective drop; detached waiter·pending registry는 uncapped | Command·frame만 bounded; event·init staging·in-flight registry는 uncapped | 일부 count-bounded; payload byte·scope queue·listener command는 uncapped | Notification deque·line byte uncapped | Queue capacity와 별도로 byte/message/scope/in-flight bound와 saturation outcome을 AY-PLE이 정의한다. |
| Terminal | Channel closure 또는 explicit nested shutdown | `Disconnected` 후 pending 전체 실패 | stdin close는 해당 connection만 coordinated; stdout failure는 비대칭·unsupervised | I/O error 또는 Drop cleanup | 여러 signal이 closing·waiter fan-out을 한 번만 시작하되 최종 cause merge는 후속 policy로 남긴다. |
| Shutdown | Receiver drop → shutdown command → ack 5초 + worker 5초/abort, 일부 실패가 success와 합쳐짐 | Close command → ack 5초 + worker 5초/abort, 일부 실패가 success와 합쳐짐 | EOF 후 다단계 drain, outer join은 global deadline 없음; 다른 connection이 남으면 process 유지 | stdin close → 5초 → kill/wait, stdout non-draining | Open pipe를 방치하지 않고 graceful drain 또는 explicit close를 선택하며 deadline, force, reap와 실패 result를 명시한다. |
| Task 소유 | Facade worker는 owned, request waiter는 detached | Worker는 owned, clone handle은 sender 보유 | Cleanup JoinSet, teardown-only stdio handle join, detached listener가 혼재 | Background task 없음 | 모든 AY-PLE-owned task와 child의 completion authority를 한 lifecycle에 묶는다. |

## Source에 근거해 AY-PLE로 옮길 제약

| 제약 | 근거와 적용 의미 |
| --- | --- |
| Single connection authority | Remote worker와 App Server connection state처럼 pending map과 transport terminal을 한 owner가 바꾼다. Reader와 caller가 서로 terminal을 따로 publish하지 않는다. |
| Single ingress reader | Connection당 inbound stream parser는 하나다. 이는 byte/envelope classification의 결정성을 위한 것이며 sequential request execution이나 global causal order를 뜻하지 않는다. |
| Waiter-independent drain | Response await와 graceful shutdown 중에도 notification·Server request와 stdout bytes가 도착할 수 있다. Waiter는 oneshot만 기다리고 ingress pump는 독립적으로 진행한다. Shutdown에서는 pipe를 열어 둔 채 방치하지 않고 drain 또는 explicit close로 끝낸다. |
| Exact, direction-aware correlation | Client request response와 server-origin request response는 반대 방향 namespace다. Envelope kind와 exact `string | number` ID를 함께 보존한다. Server-origin request responder의 once-only authority는 upstream remote client가 제공하지 않는다. 이를 설계할지는 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md)가 concrete supported variant와 후속 owner를 정한 뒤에만 결정한다. |
| Request/event surface separation | Clone 가능한 request capability와 single-consumer event capability를 분리해 event를 여러 consumer가 경쟁적으로 나눠 갖지 않게 한다. |
| Explicit in-flight admission | Queue capacity와 pending request 수는 다른 bound다. Interface의 admission surface와 max in-flight·pre-admission saturation outcome을 별도로 정의한다. Accepted request의 timeout·cancel·tombstone은 또 다른 lifecycle이다. |
| One closing transition·fan-out | Invalid external stream, EOF, write failure와 child exit는 하나의 arbiter에 report한다. 후속 policy가 terminal로 분류한 signal이 closing과 in-flight waiter·event stream 종료를 한 번만 시작한다. Trigger set, final cause·close result의 precedence·merge rule은 후속 결정이다. |
| Explicit lifecycle | `initialize → initialized → active → close/terminal → reap`을 숨긴다. Caller가 child, raw stdin/stdout나 initialize staging을 조립하지 않는다. |
| Layered errors | Transport/process failure, server-declared error와 response validation failure를 type 수준에서 구분한다. Product adapter가 raw payload를 받지 않아도 recovery를 결정할 수 있어야 한다. |
| Scope-local semantics | stdout의 한 writer가 만든 line order를 native thread/turn/item lifecycle보다 강한 cross-thread publication contract로 승격하지 않는다. |

이 제약들은 final module 이름이나 public method roster를 아직 고정하지 않는다. Interface는 첫 tracer가 요구하는 behavior를 기준으로 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md)에서 결정한다.

## 따라 하지 않을 구현 편의·누락

| Upstream 동작 | 그대로 복사하지 않는 이유 | 결정 소유자 |
| --- | --- | --- |
| Remote unbounded event channel와 init `Vec` | Slow consumer·pre-response flood가 memory bound를 무력화한다. | [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md) |
| Command queue밖의 uncapped in-flight registry·detached waiter | Queue capacity를 낮춰도 response가 지연되면 live request와 waiter가 누적될 수 있다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) · [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| InProcess transport별 lossless/best-effort 목록 | Lower/upper classifier가 달라 end-to-end proof가 아니고 product recovery source도 없다. | [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md) |
| Remote API의 caller-owned ID와 live-only duplicate check | First-party consumer도 integer·UUID·fixed ID를 다르게 쓴다. Timeout/late duplicate 뒤 reuse가 새 waiter와 충돌할 수 있어 allocator interface와 late lifecycle을 별도로 결정해야 한다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) · [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| Post-initialize request timeout·cancel·tombstone 없음 | Connect/initialize timeout과 달리 caller cancellation은 wire mutation 취소나 known outcome을 뜻하지 않는다. | [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| Unmatched response와 typed-invalid notification silent drop | Pinned external binary skew·bug를 숨길 수 있다. 더 강한 fail-closed behavior는 AY-PLE decision으로 명시해야 한다. | [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) · [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md) |
| Partial initialize parsing과 generic `request_typed<T>` | Caller-chosen `T`와 permissive deserialize는 generated method-response conformance를 증명하지 않는다. | [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md) |
| Pre-initialize Server request unbounded staging | Caller가 아직 응답 surface를 받지 못한 상태의 liveness와 memory risk가 있다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) |
| Request별 detached task와 server detached listener | Source의 cancellation·join ownership을 AY-PLE task graph에 자동으로 이식할 수 없다. InProcess detached request task가 later synchronous notification보다 lower submission을 늦출 수 있어 command receipt FIFO를 downstream execution order로 간주할 수 없다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) · [Thread·turn concurrency 정책을 결정한다](../tickets/010-decide-concurrency-policy.md) · [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| Remote command별 write-failure 비대칭 | Request write failure만 connection terminal이고 notify·resolve·reject failure는 worker를 유지한다. AY-PLE은 이 convenience를 자동 채택하지 않고 terminal trigger set을 별도로 결정한다. | [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| Remote Server request reply registry 없음 | Arbitrary ID의 duplicate·stale resolve/reject를 client가 막지 않는다. Concrete supported variant와 follow-up owner가 정해지기 전에는 responder capability와 once-only lifecycle을 선결정하지 않는다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) |
| Remote Control connection이 공존할 수 있는 stdio mode | Stdin EOF를 dedicated child process exit로 간주하면 남은 connection과 child를 leak할 수 있다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) · [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| Shutdown failure를 success와 합치거나 stdio task를 live-supervise하지 않는 path | Ack timeout·JoinError·forced abort와 successful close를 구별하지 못하고 server outer join에 global deadline도 없다. AY-PLE은 close outcome과 child reap completion을 별도로 증명해야 한다. | [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) |
| Huge `InProcessClientStartArgs`와 `legacy_core` escape hatch | Rust embedding ambient state와 migration compatibility이지 external client Interface가 아니다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) |
| Server의 malformed-input log-and-continue와 overload response drop | Server 방어 behavior이지 client가 malformed output을 신뢰해 계속해야 한다는 contract가 아니다. | [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) · [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md) |
| Test helper의 argv·partial-spawn gap·synchronous scan·blocking Drop | Package invocation contract이 아니고 concurrent long-lived client의 cleanup·drain·shutdown semantics를 제공하지 않는다. | [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) · [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) · [기존 Host 제거와 선별 재사용 계획을 확정한다](../tickets/014-plan-host-removal-and-selective-salvage.md) |

## AY-PLE 제품 adapter와의 경계

Upstream production TUI는 connection facade 위에 TUI-specific `AppServerSession`을 두어 request ID sequencing, bootstrap requests와 method-specific parameters를 조합한다. ([TUI session state](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L175-L230), [event·request handle delegation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L443-L450), [shutdown과 ID sequencing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L1145-L1173)) 반면 exec는 `InProcessAppServerClient`를 직접 조합하며, upstream에 local-web adapter precedent는 없다. ([exec composition](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L795-L820), [exec event loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L956-L1053)) 따라서 source가 지지하는 것은 low-level client와 consumer-specific RPC/config composition을 분리할 수 있다는 점까지다. 공유 conversation layer와 local-web adapter가 각각 필요한지는 첫 product tracer로 검증해야 한다.

아래 표는 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md)에서 검증할 후보 가설이며 final Interface가 아니다.

| 후보 경계 | 첫 tracer에서 검증할 가설 | 이 근거가 배제하는 책임 혼합 |
| --- | --- | --- |
| App Server connection/client 내부 | Package binary child, initialize, single ingress/writer, exact response demux, typed notification·Server request, explicit admission·delivery policy, terminal과 shutdown/reap | SemesterWorkspace, `ModelingInvocation`, browser DTO, SSE publication sequence, product retry UX |
| Conversation use-case layer | Typed native lifecycle을 connection facade 위에서 소비하는 공유 seam이 필요한지 [Core·TUI·exec conversation ownership pattern을 지도화한다](../tickets/006-map-first-party-conversation-ownership.md)의 근거와 첫 tracer로 검증 | Raw child/stdin/stdout와 generic transport anomaly parsing을 이 층에 다시 노출하는 설계 |
| AY-PLE/local web adapter | 필요한 browser-safe translation의 최소 범위를 첫 tracer로 검증 | Raw generated payload, native protocol envelope, connection pending map과 child signal 처리 |

기존 `ProductRuntimeLayout`은 package-owned binary와 root를 connection bootstrap에 제공할 후보일 수 있지만, 기존 `HeadlessCodexClientHost` Interface와 global generation/ref/event state machine을 보존해야 한다는 결론은 나오지 않는다. 실제 seam은 [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md), selective salvage는 [기존 Host 제거와 선별 재사용 계획을 확정한다](../tickets/014-plan-host-removal-and-selective-salvage.md)가 소유한다.

## 후속 ticket에 넘기는 결정

| 후속 ticket | 이 문서가 고정한 입력 | 아직 결정하지 않은 것 |
| --- | --- | --- |
| [Core·TUI·exec conversation ownership pattern을 지도화한다](../tickets/006-map-first-party-conversation-ownership.md) | TUI는 client 위 wrapper를 두지만 exec는 client를 직접 조합하고, native event source에 per-thread listener가 있다. | Core·TUI·exec의 thread/turn/item authority, history/backfill과 multi-thread ownership pattern |
| [Protocol·Rust source evidence의 정렬 상태를 리뷰한다](../tickets/007-review-source-evidence-alignment.md) | Production client/server/test helper와 사실·추론·deviation을 분리한 architecture evidence | Method lifecycle·architecture asset의 누락·모순 여부 |
| [첫 tracer와 module seam을 선택한다](../tickets/008-choose-first-tracer-and-module-seams.md) | External stdio process owner가 필요하고 connection interface는 child/protocol lifecycle을 숨겨야 한다. First-party request ID allocator는 하나의 pattern으로 수렴하지 않는다. | Exact package/module names, public methods·request ID allocator·max-in-flight·pre-admission surface, task split, browser tracer boundary와 first supported Server request variant·후속 owner |
| [Identity authority와 product reference 정책을 결정한다](../tickets/009-decide-identity-and-authority.md) | Connection layer가 RPC ID를 direction-aware하게 소유하면 native lifecycle identity는 별도 scope로 전달할 수 있다. | Native thread/turn/item identity exposure와 product reference policy |
| [Thread·turn concurrency 정책을 결정한다](../tickets/010-decide-concurrency-policy.md) | Single ingress가 sequential execution을 뜻하지 않고 method scope queue·detached task·inter-thread scheduler가 execution order를 나눈다. | Same-thread reject/queue/steer와 cross-thread 독립성을 제품 API에서 어떻게 드러낼지 |
| [Event delivery와 transcript recovery model을 결정한다](../tickets/011-decide-delivery-and-recovery-model.md) | Upstream에 universal bounded/lossless contract가 없고 raw wire order는 global causality가 아니다. Queue count bound는 payload byte·scope bound를 의미하지 않는다. | Notification byte/message/scope bounds, delivery class·retention·saturation outcome와 `thread/read` backfill |
| [Connection loss와 unknown outcome 정책을 결정한다](../tickets/012-decide-connection-and-unknown-outcome-policy.md) | One closing transition·waiter fan-out과 bounded-attempt precedent는 있으나 RequestId late lifecycle, terminal trigger set·final cause merge, Remote Control 공존·accepted request timeout/cancel·mutation outcome은 정의되지 않았다. | Timeout taxonomy, retry 금지, trigger·cause precedence, reconnect/resume와 product restart UX |
| [Source conformance verification matrix를 결정한다](../tickets/013-decide-source-conformance-verification.md) | Pinned client의 partial initialize·generic `T`·permissive validation은 generated external boundary의 충분한 oracle이 아니다. | Schema/unit/fake child/live probe와 pin-upgrade gate matrix |
| [기존 Host 제거와 선별 재사용 계획을 확정한다](../tickets/014-plan-host-removal-and-selective-salvage.md) | Existing Host compatibility는 architecture constraint가 아니고 lower stdio/layout primitive만 후보다. Test helper의 argv·partial-spawn 편의는 재사용 oracle가 아니다. | 실제 삭제·재사용 file inventory와 migration order |

## 검토한 source 원장

| 경로 | 확인한 책임·동작 |
| --- | --- |
| `sdk/python/src/openai_codex/{client.py,_message_router.py}`와 tests | External stdio child, sole reader, serialized writer, active response routing, early per-turn FIFO, interleaved turn isolation과 disconnect `fail_all` |
| `codex-rs/app-server-client/{README.md,src/lib.rs,src/remote.rs}` | Public client facade, request/event split, in-process·remote worker, initialize, demux, buffering, terminal, shutdown |
| `codex-rs/app-server-client/src/{lib.rs,remote.rs}` checked-in tests | Live duplicate ID, notification delivery, initialize 중 Server request staging, unknown request rejection, disconnect·backpressure·shutdown |
| `codex-rs/app-server/src/in_process.rs` | Embedded lower queues, pending response demux, notification delivery와 teardown |
| `codex-rs/app-server-transport/src/transport/{mod.rs,stdio.rs}` | JSONL reader/writer, count capacity, parse·overload와 close behavior |
| `codex-rs/app-server-transport/src/transport/remote_control/{client_tracker.rs,tests.rs}` | Stdio mode와 공존할 수 있는 Remote Control connection의 open·tracking 및 test evidence |
| `codex-rs/app-server/src/{lib.rs,transport.rs,outgoing_message.rs,request_serialization.rs,thread_state.rs,connection_cleanup.rs}` | Central ingress/outbound routing, execution concurrency, queue/task ownership와 shutdown |
| `codex-rs/app-server/src/request_processors/thread_lifecycle.rs` | Per-thread listener task와 command ownership |
| `codex-rs/app-server-test-client/src/lib.rs` | Test-only stdio spawn, response-wait FIFO와 child cleanup |
| `codex-rs/tui/src/app_server_session.rs` | TUI-specific typed RPC/config wrapper, request ID sequencing와 bootstrap helper |
| `codex-rs/exec/src/lib.rs` | Connection facade를 직접 조합하는 production consumer와 별도 request ID sequencer |

이 원장은 architecture interpretation의 traceability다. Public protocol shape의 owner는 계속 pinned generated schema이고, AY-PLE의 최종 seam·policy owner는 후속 ADR/spec이다.
