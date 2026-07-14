# 조사 기준

이번 판정은 다음 세 기준점을 섞지 않고 분리했습니다.

| 구분                 | 기준                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PIN**            | `@openai/codex@0.144.0`, exact commit [`767822446c7a594caa19609ca435281a9ec67e0d`](https://github.com/openai/codex/commit/767822446c7a594caa19609ca435281a9ec67e0d)               |
| **LATEST RELEASE** | `0.144.3`, commit [`78ad6e6bfd1d3b6a209acd3ef82172a96b25179c`](https://github.com/openai/codex/commit/78ad6e6bfd1d3b6a209acd3ef82172a96b25179c), 2026-07-13 release ([GitHub][1]) |
| **CURRENT MAIN**   | 조사 시점인 2026-07-14의 `main`, commit [`b24aa20107f365a1d0f06de9e0b28df5c516c7dd`](https://github.com/openai/codex/commit/b24aa20107f365a1d0f06de9e0b28df5c516c7dd)                   |

공식 App Server 문서는 현재 계약을 설명하는 문서이므로, **PIN의 실제 동작 판정에는 exact-commit source를 우선**했습니다. 아래에서:

* **계약**: 공식 문서나 exact-pin README가 명시하는 사항
* **구현 관찰**: exact source가 실제로 수행하는 동작
* **추론**: task/channel 구조로부터 가능한 ordering 등을 도출한 사항

으로 구분합니다.

---

# 1. Executive verdict

## 최종 판정

| 질문                                             | 판정                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| “App Server 위에 바로 제품 기능을 올릴 수 있다”는 원래 가정       | **절반 이상 맞습니다.** App Server는 thread/turn/item, persistence, execution, approvals, streaming을 authoritative하게 소유합니다. 그러나 rich client에 필요한 transport router와 local projection까지 제공하지는 않습니다.                                            |
| 우리가 Codex CLI를 불필요하게 복제하고 있는가                  | **Codex core나 CLI 전체를 복제하는 것은 아닙니다.** 다만 first-party client도 구현하는 일부 client runtime을 재현하고 있습니다. 동시에 global ordering, process-lifetime tombstone, 강한 contradiction state machine 등은 과설계 가능성이 큽니다.                                    |
| 놓친 공식 client/reuse path가 있는가                   | **있습니다.** PIN에는 `codex-app-server-client` Rust crate, 실제 stdio App Server client인 Python SDK, experimental `app-server-daemon`이 이미 있습니다. 다만 reusable TypeScript App Server client는 없습니다.                                            |
| 현재 직접 구현 범위는 본질적인가, PIN 한계인가, 과설계인가            | 세 가지가 섞여 있습니다. **ID demux·early-event staging·per-thread projection·server-request lifecycle은 본질적**, bounded queue·loss settlement는 production 항목, global causal state machine·영구 tombstone·자동 reconciliation은 과설계 또는 AY-PLE 정책입니다. |
| 지금 architecture를 유지·축소·교체·upgrade 중 무엇을 해야 하는가 | **유지 + 축소**가 기본 권고입니다. Rust를 허용할 수 있다면 connection 계층만 Rust sidecar로 교체하는 선택지가 있습니다. Upgrade는 client layer를 없애지 않으므로 별도 결정입니다.                                                                                                       |

한 문장으로 요약하면:

> **원래의 “App Server가 Codex backend primitives를 제공한다”는 가정은 맞았지만, “외부 TypeScript rich client에 필요한 client runtime까지 제공한다”는 가정은 틀렸습니다.**

그리고 중요한 수정 사항이 있습니다.

> **PIN의 일반 `codex` TUI는 App Server를 우회하여 core를 직접 호출하는 구조가 아닙니다.** 기본 모드는 App Server를 같은 process에 embed하고, remote mode에서는 동일한 client facade를 WebSocket/Unix socket으로 연결합니다. 따라서 선택지로는 **D: embedded/remote App Server hybrid**가 가장 정확합니다.

공식 문서 역시 App Server를 VS Code 같은 rich client를 구동하는 인터페이스로 설명하며, thread/turn/item과 streaming/approval을 제공한다고 명시합니다. 다만 IDE extension 자체는 공개 오픈소스 대상이 아닙니다. ([ChatGPT 학습][2])

---

# 2. Exact-pin architecture diagram

## 2.1 실제 call path

```text
@openai/codex@0.144.0
└── bin/codex.js
    └── platform-specific native "codex" binary
        └── codex-rs/cli/src/main.rs
            │
            ├── no subcommand
            │   └── codex_tui::run_main(...)
            │       └── AppServerSession
            │           └── AppServerClient
            │               │
            │               ├── Embedded — 기본값
            │               │   └── InProcessAppServerClient
            │               │       └── codex_app_server::in_process::start(...)
            │               │           └── MessageProcessor
            │               │               ├── ThreadManager / ThreadStateManager
            │               │               ├── ThreadRequestProcessor
            │               │               ├── TurnRequestProcessor
            │               │               └── codex-core / CodexThread
            │               │
            │               └── Remote / LocalDaemon
            │                   └── RemoteAppServerClient
            │                       └── WebSocket over TCP or Unix socket
            │                           └── external codex app-server
            │                               └── same MessageProcessor/core path
            │
            ├── codex exec
            │   └── codex_exec::run_main(...)
            │       └── InProcessAppServerClient
            │           └── embedded app-server
            │               └── MessageProcessor/core
            │
            └── codex app-server
                ├── stdio JSONL
                ├── WebSocket — experimental/unsupported
                └── Unix socket/WebSocket framing

External test/reference clients
├── app-server-test-client
│   ├── spawns "codex app-server" over stdio JSONL
│   └── or connects over WebSocket
│
└── sdk/python
    └── spawns "codex app-server --listen stdio://"
        └── sole stdout reader + request/turn routers

Protocol boundary
├── codex-rs/app-server-protocol
│   └── public JSON-RPC methods/types
│
├── codex-rs/app-server
│   └── public App Server protocol ↔ core operation/event adaptation
│
└── codex-rs/protocol
    └── internal core Op/EventMsg/ThreadId protocol
```

근거: CLI entry point [E3], TUI dependencies [E4], embedded/remote selection [E5], shared App Server facade [E6·E7], App Server state manager [E9].

## 2.2 A/B/C/D 판정

### 판정: **D. Embedded App Server와 remote App Server를 같은 facade로 추상화한 구조**

* **A가 아닌 이유**: 기본 TUI는 `codex app-server` child process를 띄우고 stdio JSONL로 통신하지 않습니다. `InProcessAppServerClient`로 App Server를 같은 process에 embed합니다.
* **B가 아닌 이유**: TUI conversation flow는 `codex-core`를 직접 호출하여 App Server protocol을 우회하지 않습니다. `ClientRequest`, `ServerNotification`, `ServerRequest` 기반 App Server model을 유지합니다.
* **C와 다른 이유**: local/remote에 따라 transport는 다르지만, 일반 chat flow 자체가 한쪽은 App Server, 다른 쪽은 direct core로 갈리는 것은 아닙니다.
* **D가 맞는 이유**: default는 embedded App Server, `--remote` 또는 local daemon은 `RemoteAppServerClient`이며, 둘 다 `AppServerClient` abstraction으로 노출됩니다.

`codex-app-server-client`의 source comment도 이 crate를 “TUI and exec를 위한 shared in-process app-server client facade”라고 명시하고, 새 TUI 동작은 direct core보다 App Server protocol을 선호해야 한다고 적고 있습니다. [E6]

## 2.3 이것이 “CLI 구현을 그대로 TS client로 사용”할 수 있다는 뜻은 아니다

TUI가 App Server를 사용한다는 사실은 source-guided port에 유리하지만, 외부 TypeScript client의 drop-in 정답은 아닙니다.

첫째, default TUI에는 다음이 없습니다.

* child process lifecycle
* stdio JSONL framing
* external wire schema skew
* stdout sole-reader 문제

같은 process의 bounded channel과 oneshot으로 통신하기 때문입니다.

둘째, `RemoteAppServerClient`가 외부 transport 문제를 해결하지만, 지원하는 경로는 PIN에서 WebSocket/Unix socket입니다. stdio child client가 아닙니다. [E8]

셋째, TUI의 conversation projection은 `ThreadEventStore`, `PendingAppServerRequests`, widget replay 같은 TUI-specific 코드입니다. Rust 라이브러리로 일반화되어 있지 않습니다. [E22·E23·E24]

따라서:

> CLI/TUI는 **observable behavior의 가장 좋은 first-party reference 중 하나**이지만, TypeScript에서 직접 import할 수 있는 production App Server client는 아닙니다.

---

# 3. Server vs client responsibility matrix

## 3.1 “App Server가 thread와 turn을 관리한다”의 정확한 의미

App Server가 관리한다는 것은 다음을 뜻합니다.

1. native identity를 생성하고 authoritative하게 소유한다.
2. core execution을 시작·중단·진행한다.
3. persisted history와 loaded thread를 관리한다.
4. turn/item 상태 및 terminal 결과를 생성한다.
5. pending approval callback을 보유한다.
6. client에게 projection 재료인 responses와 notifications를 보낸다.

반대로 App Server는 다음을 제공하지 않습니다.

1. React/TypeScript UI에 바로 사용할 transcript store
2. 여러 notification을 UI component state로 병합하는 reducer
3. client-side pending RPC map
4. product-specific retry/recovery UX
5. client가 선택한 buffer/backpressure 정책
6. product UUID나 AY-PLE event model

## 3.2 책임 분리

| 책임                                     | Authoritative owner                     | Client에 필요한 local projection                      | 판정                                    |
| -------------------------------------- | --------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| thread identity                        | App Server/core                         | `Map<threadId, ThreadProjection>`의 key            | native ID를 그대로 authority로 사용          |
| thread persistence/history             | App Server rollout/state DB             | 화면에 표시할 snapshot/cache                            | 별도 conversation DB를 authority로 만들지 않음 |
| `thread/list/read/resume/fork/archive` | App Server                              | loading/error/UI selection state                  | client는 command orchestration만        |
| turn identity                          | App Server가 `turn/start` response로 반환   | 해당 turn용 local projection 생성                      | client-generated turn ID 금지           |
| turn lifecycle                         | App Server/core                         | active/in-progress 표시                             | `turn/started`, `turn/completed`를 반영  |
| item identity/lifecycle                | App Server                              | `Map<itemId, ItemProjection>`와 display order      | delta는 item projection에 누적            |
| command/tool execution                 | App Server/core                         | 진행률·output·terminal 표시                            | client가 command engine을 재구현하지 않음      |
| approval pending 여부                    | **서버가 pending callback의 authority**     | client는 approval UI와 local pending request map 보유 | dual ownership이지만 authority는 서버       |
| approval decision                      | 사용자/client                              | 응답이 전송되었다는 local one-shot 상태                      | exactly-once local guard 필요           |
| streaming delta                        | App Server가 생성                          | client가 text/output buffer에 누적                    | transcript projection 필요              |
| active turn                            | 서버 상태가 authoritative                    | 빠른 UI를 위한 cached `activeTurnId`                   | reconnect 후 `thread/read`로 교정 가능      |
| terminal state                         | `turn/completed`의 `Turn.status`         | UI terminal 표시                                    | item completion만 보고 turn 종료 추론 금지     |
| duplicate/late notification            | 서버가 stream을 생성하지만 dedup contract는 없음    | reducer가 idempotent하게 적용                          | 거대한 contradiction FSM은 불필요            |
| response/notification ordering         | transport에는 수신 순서가 존재                   | method별 targeted staging                          | cross-thread causal order는 아님         |
| reconnect/recovery                     | server가 persisted thread를 보유            | reconnect, initialize, read/resume, projection 교체 | 자동 reconnect orchestration은 client    |
| transcript projection                  | 없음                                      | rich UI가 전적으로 소유                                  | 명백한 client 책임                         |
| 여러 thread의 동시 진행                       | App Server는 thread별 execution/state를 관리 | per-thread router/store                           | client UI isolation은 client 책임        |
| process/transport loss                 | OS/host/client                          | 모든 pending waiter settlement, UX 상태               | server가 client의 promise를 settle할 수 없음 |
| Server-initiated request               | 서버가 ID와 pending callback 소유             | client가 UI pending entry와 one-shot response 소유    | 양쪽 모두 lifecycle 일부를 가짐                |
| safe result projection                 | 없음                                      | raw protocol → 안전한 product event 변환               | product/client boundary               |
| cross-thread product ordering          | 없음                                      | 보통 필요하지 않음                                        | global total-order reducer는 과도        |

App Server의 core primitives와 lifecycle은 exact-pin README에도 명확히 기술되어 있습니다. `thread/start`와 `thread/resume`, `turn/start`, streamed item notifications, `turn/completed`가 각각 backend state transition을 담당합니다. [E10]

## 3.3 authoritative backend state와 local projection의 차이

다음 local 구조는 backend state의 중복 구현이 아닙니다.

```text
ThreadProjection
├── native threadId
├── displayed turns
├── activeTurnId cache
├── items by native itemId
├── accumulated deltas
├── pending approval UI state
└── last authoritative turn/completed
```

이것은 **server state의 read model**입니다.

반면 다음은 backend state를 다시 발명하는 방향입니다.

```text
GlobalConversationStateMachine
├── independently invented thread IDs
├── inferred canonical turn terminal
├── global causal sequence across threads
├── contradictory event arbitration rules
└── retries that create new native operations
```

특히 `turn/completed`보다 client inference를 우선하거나, native IDs를 product UUID로 교체한 뒤 그것을 protocol authority처럼 사용하면 App Server state와 충돌할 수 있습니다.

---

# 4. Reuse candidates

## 4.1 npm tarball 직접 검증

`@openai/codex@0.144.0`에 대해 직접 다음을 실행했습니다.

```bash
npm pack @openai/codex@0.144.0 --silent
tar -tzf openai-codex-0.144.0.tgz
sha256sum openai-codex-0.144.0.tgz
```

tarball content:

```text
package/README.md
package/bin/codex.js
package/package.json
```

SHA-256:

```text
eeac09ee8bcfca22ea3c3b368b7f44924456bbaa2e0ae12cd9461e9b12901743
```

`package.json`에는 다음만 있습니다.

* `"bin": { "codex": "bin/codex.js" }`
* `"files": ["bin/codex.js"]`
* `main` 없음
* `exports` 없음
* reusable JS/TS client module 없음

따라서 가설 1은 **verified**입니다. Source: [E16·E17].

## 4.2 PIN에서 실제로 재사용 가능한 것

| Surface                        | 실제 abstraction             | 제공하는 것                                                                                                                                            | 제공하지 않는 것                                                            | 재사용 판정                         |
| ------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------ |
| `codex-app-server-client`      | Rust App Server facade     | in-process startup, initialize, typed requests, remote ID demux, disconnect settlement, bounded queue, server request resolve/reject              | stdio child client, TS bindings, transcript reducer                  | **Rust sidecar에서 강력한 후보**      |
| `sdk/python/openai_codex`      | 실제 stdio App Server client | child spawn, sole stdout reader, exact response routing, per-turn queue, early notification staging, Pydantic validation, process-loss settlement | TypeScript API, full rich transcript reducer                         | **가장 가까운 외부-client reference** |
| `sdk/typescript`               | `codex exec` wrapper       | simplified streamed events, sequential multi-turn via resume                                                                                      | App Server JSON-RPC, interactive approval client, concurrent threads | rich client foundation에는 부적합   |
| `app-server-test-client`       | test/demo client           | stdio/WS transport, FIFO notification staging, server request handling                                                                            | concurrent multi-inflight production router                          | behavior reference만            |
| generated TypeScript           | wire types                 | request/response/request/notification unions와 indexes                                                                                             | transport, dispatcher, reducer, store                                | compile-time schema source     |
| generated JSON Schema          | runtime schema material    | JSON-RPC envelopes와 method payload schemas                                                                                                        | validator runtime 자체                                                 | 사용 method만 Ajv 등으로 검증 가능       |
| `app-server-daemon`            | experimental Unix daemon   | App Server process ownership, start/stop/restart/socket                                                                                           | conversation projection, JSON-RPC client                             | Unix lifecycle 분리에만 유용         |
| TUI `ThreadEventStore`         | TUI-local projection       | per-thread buffering, active turn, replay, bounded capacity                                                                                       | generic published library                                            | source-guided port             |
| TUI `PendingAppServerRequests` | TUI-local request registry | pending approvals, remove-on-response, resolved notification 처리                                                                                   | standalone crate                                                     | source-guided port             |

### 중요한 Python SDK caveat

Exact commit의 Python SDK source는 유용하지만, 같은 commit의 `pyproject.toml`은 다음을 가리킵니다.

```toml
version = "0.0.0-dev"
dependencies = [
  "pydantic>=2.12",
  "openai-codex-cli-bin==0.137.0a4"
]
```

즉 PyPI package를 그대로 설치하는 것이 `@openai/codex@0.144.0`과 같은 runtime이라는 뜻은 아닙니다. [E21]

PIN에 맞춰 활용하려면 Python SDK의 `CodexConfig.codex_bin` 또는 launch override로 **정확히 pinned native binary를 주입**하고 compatibility test를 해야 합니다. 현재 PyPI surface도 Beta로 표시됩니다. ([PyPI][3])

## 4.3 `generate-ts`의 정확한 범위

Exact source에서 `generate_ts`는 다음을 export합니다. [E15]

* `ClientRequest`
* 각 client response type
* `ClientNotification`
* `ServerRequest`
* 각 server response type
* `ServerNotification`
* index files

다음은 생성하지 않습니다.

| 기능                                | 생성 여부 |
| --------------------------------- | ----- |
| wire types/schema                 | **예** |
| typed request/response method 함수  | 아니오   |
| request ID allocator              | 아니오   |
| concurrent response dispatcher    | 아니오   |
| notification dispatcher runtime   | 아니오   |
| server-request response lifecycle | 아니오   |
| thread/turn/item reducer          | 아니오   |
| conversation state store          | 아니오   |
| reconnect/recovery client         | 아니오   |

따라서 가설 2도 **verified**입니다.

## 4.4 LATEST RELEASE와 CURRENT MAIN에서 추가된 것

### Latest release `0.144.3`

* npm package 구조는 여전히 launcher-only입니다. [E31]
* reusable TS App Server client가 추가되지 않았습니다.
* exact PIN의 기본 architectural verdict를 바꾸는 client SDK 변화는 확인되지 않았습니다.

### Current main `b24aa201...`

두 가지 관련 변화가 확인됩니다.

1. generated `ServerNotificationEnvelope.ts`

   * notification tagged union
   * optional `emittedAtMs`
   * wire decode와 diagnostics에는 유용
   * client dispatcher나 reducer는 아님
   * `emittedAtMs`는 causal sequence number가 아님
     [E29]

2. internal `thread_history_projection.rs`

   * durable rollout line을 thread-history change set으로 투영
   * server-side persisted history materialization에 유용
   * live TypeScript conversation projection을 대체하지 않음
     [E30]

이 두 구조는 **CURRENT MAIN의 기능이지 PIN의 기능이 아닙니다.** 또한 조사 시점의 latest release `0.144.3`과 main도 동일한 시점이 아닙니다.

결론:

> Upgrade는 history/read 성능이나 envelope typing을 개선할 수 있지만, 직접 구현 중인 TS connection/projection layer를 제거하지는 않습니다.

## 4.5 First-party surface 비교

| Surface                  | App Server 사용                       | Correlation 담당                                        | Conversation projection 담당                     | 공개·재사용성                         | Custom rich client 적합성        |
| ------------------------ | ----------------------------------- | ----------------------------------------------------- | ---------------------------------------------- | ------------------------------- | ----------------------------- |
| Codex TUI                | **예. 기본 embedded, remote는 WS/Unix** | `InProcessAppServerClient` 또는 `RemoteAppServerClient` | TUI `ThreadEventStore` 및 widget layer          | Rust source 공개, TUI-specific    | reference로 높음, 직접 재사용은 낮음     |
| VS Code extension        | 공식 문서상 **예**                        | 비공개                                                   | 비공개                                            | extension source가 공식 OSS 대상이 아님 | 재사용 불가                        |
| Codex desktop/App        | 공개 source에서 확인 불가                   | 불명                                                    | 불명                                             | 핵심 client source 발견되지 않음        | **insufficient evidence**     |
| `app-server-test-client` | 외부 stdio/WS                         | sequential wait loop                                  | 거의 없음                                          | 공개                              | test/reference                |
| `codex exec`             | embedded App Server                 | Rust client facade                                    | single active job용 event processor             | 공개                              | automation에 적합, rich UI에는 부적합 |
| TypeScript SDK           | 직접 App Server가 아니라 `codex exec`     | exec process 단위                                       | simplified event aggregation                   | npm SDK                         | 단순 programmatic runs          |
| Python SDK               | **외부 stdio App Server**             | `MessageRouter`                                       | per-turn stream queue, full transcript는 caller | 공개, Beta/dev caveat             | sidecar/reference로 유용         |
| Remote TUI               | remote App Server WS/Unix           | `RemoteAppServerClient`                               | TUI                                            | 공개 Rust                         | remote terminal UI에는 적합       |
| `app-server-daemon`      | App Server host                     | 없음                                                    | 없음                                             | experimental                    | process sharing/control plane |

공식 문서는 App Server가 VS Code extension 같은 rich interface를 구동한다고 명시하지만, OpenAI의 OSS 범위 설명에서는 IDE extension이 공개 대상이 아니라고 구분합니다. 따라서 VS Code 내부 client를 reusable reference로 간주해서는 안 됩니다. ([ChatGPT 학습][2])

## 4.6 열 가지 통합 후보 판정

|  # | 후보                                    | Abstraction 수준                           | Rich UI 적합성           | Multi-turn / stream / approval              | Upstream 비용          | TS 통합 난이도      | 공식 지원 상태                           | 남는 직접 구현                     | 판정                           |
| -: | ------------------------------------- | ---------------------------------------- | --------------------- | ------------------------------------------- | -------------------- | -------------- | ---------------------------------- | ---------------------------- | ---------------------------- |
|  1 | `codex app-server` + thin TS JSON-RPC | App Server primitives                    | **높음**                | 전부 지원                                       | 중간                   | **낮음~중간**      | stdio는 공식                          | router, projection, recovery | **기본 권고**                    |
|  2 | 공개 App Server client 재사용              | Rust/Python은 높은 수준                       | 높음                    | 전부 또는 대부분                                   | 중간                   | sidecar 필요     | Rust는 workspace API, Python은 Beta  | UI projection                | **조건부 권고**                   |
|  3 | Rust helper/sidecar                   | typed App Server client                  | **높음**                | 전부 지원                                       | crate 변화 대응 필요       | 중간             | custom sidecar 자체는 비공식             | sidecar IPC, UI projection   | **Rust 허용 시 강한 후보**          |
|  4 | remote TUI 위에 기능 추가                   | 완성 terminal app                          | 낮음                    | 내부적으로 지원                                    | 낮아 보이나 UI patch 비용 큼 | 높음             | CLI surface                        | TUI wrapping/patching        | **비추천**                      |
|  5 | Codex SDK                             | TS는 exec abstraction, Python은 App Server | TS: 중간 이하, Python: 중간 | TS approval/concurrency 제한                  | 낮음~중간                | TS SDK는 쉬움     | 공식 SDK                             | rich state/approval          | prototype만 조건부               |
|  6 | `codex exec`                          | turn/job stream                          | 낮음                    | resume/stream은 가능, interactive approval 부적합 | 낮음                   | 쉬움             | 공식 CLI                             | rich lifecycle 대부분           | **비추천**                      |
|  7 | CLI output/session files wrapping     | private output/storage                   | 매우 낮음                 | live control 불완전                            | 매우 높음                | 중간             | 계약 아님                              | 거의 전부                        | **강한 비추천**                   |
|  8 | WS/Unix transport                     | transport만 변경                            | 동일                    | protocol 기능은 동일                             | 중간                   | 중간             | WS unsupported, Unix control-plane | router/projection 모두         | Unix만 조건부                    |
|  9 | 최신 version upgrade                    | abstraction 변화 없음                        | 동일                    | feature/bugfix 증가 가능                        | migration test 필요    | 낮음~중간          | release는 공식                        | client layer 그대로             | **별도 upgrade option**        |
| 10 | workspace crate 직접 dependency         | typed Rust API                           | 높음                    | 전부 지원                                       | **높음**               | sidecar/FFI 필요 | stable SDK 계약 아님                   | projection, facade           | exact rev + local facade 조건부 |

공식 문서상 stdio는 default supported transport이고, WebSocket은 experimental/unsupported입니다. Unix socket은 local App Server control-plane 용도입니다. ([ChatGPT 학습][2])

---

# 5. Missing-client-layer verdict

## 5.1 OpenAI가 제공하는 것

PIN에서 OpenAI는 다음을 제공합니다.

```text
Codex backend/runtime
├── authoritative thread state
├── persisted history
├── authoritative turn/item identities
├── command/tool execution
├── approval callbacks
├── streaming notifications
└── read/list/resume/fork/archive APIs

Protocol material
├── generated TS types
├── generated JSON Schema
├── Rust protocol types
└── exact method registries

Reference/first-party implementations
├── Rust in-process/remote App Server client
├── Python stdio App Server client
├── TUI per-thread projection
└── test-client stdio staging
```

## 5.2 OpenAI가 TypeScript package로 제공하지 않는 것

정확히 빠진 계층은 다음 두 가지입니다.

### A. Production-grade TypeScript App Server connection client

```text
TypeScriptAppServerClient
├── child lifecycle or socket lifecycle
├── sole ingress reader
├── serialized writer
├── JSONL framing
├── RequestId → pending promise demux
├── notification/server-request dispatch
├── initialize handshake
├── disconnect settlement
├── backpressure
└── server request response API
```

### B. Reusable rich-conversation projection library

```text
ConversationProjection
├── per-thread routing
├── per-turn/item maps
├── early-event staging
├── delta accumulation
├── active-turn cache
├── terminal projection
├── approval UI state
└── snapshot replacement after thread/read
```

이 중 A는 언어별로 상당 부분 공통입니다. B는 UI 요구에 따라 달라지므로 OpenAI가 일반-purpose store로 제공하지 않는 것이 자연스럽습니다.

따라서 “missing client layer”는 다음처럼 정의하는 것이 가장 정확합니다.

> **OpenAI가 제공하지 않는 것은 Codex runtime이 아니라, 외부 TypeScript process에서 App Server protocol을 안전하게 소비하고 rich UI용 read model로 투영하는 production client layer입니다.**

## 5.3 여러분이 CLI를 다시 만드는 것처럼 느껴지는 이유

first-party complexity가 실제로 여러 곳에 나뉘어 있기 때문입니다.

| 복잡성                        | First-party source의 위치                          |
| -------------------------- | ----------------------------------------------- |
| request/response demux     | `RemoteAppServerClient`, Python `MessageRouter` |
| disconnect settlement      | remote Rust client, Python `fail_all`           |
| early notification staging | Python SDK, test client                         |
| bounded queue/backpressure | Rust `app-server-client`, App Server itself     |
| per-thread state           | TUI `ThreadEventStore`                          |
| pending approvals          | TUI `PendingAppServerRequests`                  |
| authoritative terminal     | App Server notifications, TUI/exec consumers    |
| stdio child lifecycle      | Python SDK, test client                         |
| transcript/UI projection   | TUI widget/application code                     |

즉 complexity 자체가 허구는 아닙니다. 다만 그 모든 구현을 하나의 거대한 `CodexConversationRuntime` global state machine으로 합치는 것은 first-party 구조보다 강합니다.

---

# 6. Recommended minimal architecture

## 6.1 Source-guided port 판정

사용자가 제안한 observable behavior port 범위:

* exact request ID demux
* native identity authority
* per-thread ownership
* notification-first correlation
* duplicate/late/terminal handling
* Server request pending/once-only lifecycle

에 대한 판정은 **C. 일부는 반드시 필요하지만 현재 범위 일부가 과도하다**입니다.

| 항목                                 | 판정                                            |
| ---------------------------------- | --------------------------------------------- |
| exact request ID demux             | 필수                                            |
| native identity authority          | 필수                                            |
| per-thread ownership               | 필수에 가까움. actor 구현 자체는 선택                      |
| notification-first correlation     | 필수. 단, bounded targeted staging이면 충분          |
| duplicate/late/terminal handling   | 단순 idempotence는 필요, contradiction lattice는 과도 |
| Server request pending/once-only   | 필수                                            |
| global causal ordering             | 불필요                                           |
| process-lifetime request tombstone | 불필요                                           |
| automatic retry/reconciliation     | foundation이 아니라 product/reliability 정책        |

따라서 A는 너무 넓고, B는 틀렸으며, D는 TypeScript에서 사용할 reusable client가 없어서 성립하지 않습니다.

## 6.2 현재 항목별 분류

분류 코드:

* **I**: App Server 외부 rich client라면 본질적으로 필요
* **P**: production reliability에는 필요하지만 prototype에는 생략 가능
* **Y**: AY-PLE 또는 deployment 정책
* **O**: 현재 설계가 과도하게 강화
* **U**: upstream authoritative 기능을 다시 구현
* **?**: 판단 근거 부족

| 항목                                     |    분류 | 판정 이유                                                                  |
| -------------------------------------- | ----: | ---------------------------------------------------------------------- |
| child process lifecycle                | **Y** | stdio child를 직접 소유할 때만 필요. daemon/socket이면 제거 가능                       |
| JSONL framing                          | **Y** | stdio transport 선택의 결과. Unix/WS에서는 다른 framing                          |
| RequestId demux                        | **I** | 여러 in-flight request를 지원하려면 필수                                         |
| generated-schema validation            | **P** | TS types만으로 runtime wire skew를 막을 수 없음. 사용 method만 검증 권고               |
| response/notification convergence      | **I** | `turn/start`의 early event staging은 필요. generic global convergence는 불필요 |
| native identity correlation            | **I** | server-authoritative thread/turn/item에 연결하기 위해 필수                      |
| per-thread actor/state owner           | **P** | per-thread partition은 필요. actor mailbox 구현은 선택                         |
| global state machine                   | **O** | App Server와 per-thread projection이 있는 상황에서 global FSM은 과도              |
| global event ordering                  | **O** | wire order는 있으나 cross-thread causal/product order가 아님                  |
| notification staging                   | **I** | response 전에 올 수 있는 turn event를 잃지 않기 위해 필요                             |
| duplicate/late notification handling   | **P** | idempotent reducer는 production에서 필요                                    |
| process-lifetime RequestId tombstone   | **O** | first-party client도 active pending ID만 중복 검사                           |
| connection loss outcome classification | **P** | pending settlement는 필수. 세밀한 acceptance/execution taxonomy는 AY-PLE 정책   |
| automatic retry/reconciliation         | **Y** | non-idempotent `thread/start`/`turn/start`에는 blind retry가 위험           |
| bounded queue/backpressure             | **P** | first-party Rust client와 서버도 bounded queue 사용                          |
| raw protocol sanitization              | **P** | 안전한 logging/UI projection을 위해 production에서 권고                          |
| product-specific UUID remapping        | **Y** | Codex protocol foundation에는 불필요                                        |
| transcript/event projection            | **I** | rich UI가 존재하려면 반드시 필요                                                  |
| Server request once-only lifecycle     | **I** | approval이 중복 응답되거나 영구 대기하지 않도록 필요                                      |

목록에는 없지만, 다음을 별도의 authoritative state machine으로 구현한다면 **U**에 해당합니다.

* canonical thread state
* canonical turn terminal
* command execution engine
* approval callback authority
* persisted Codex history

이들은 이미 App Server가 제공합니다.

## 6.3 first-party도 실제로 처리하는 복잡성

### First-party와 같은 수준

* single ingress reader
* exact active RequestId demux
* notifications arriving before consumer registration
* per-thread event routing
* bounded event buffering
* active-turn local cache
* pending approval lookup
* remove-on-response once-only behavior
* `serverRequest/resolved` 처리
* disconnect 시 waiter settlement

### AY-PLE이 추가한 강한 policy

* process lifetime 전체의 RequestId tombstone
* 모든 event를 위한 global total ordering
* cross-thread causal convergence
* contradictory identity/terminal arbitration lattice
* blind automatic retry
* product UUID를 protocol identity보다 우선
* 모든 transport failure를 자동 reconciliation하는 global FSM

## 6.4 권고 module 구조

현재의 두 계층 경계는 맞습니다. 다만 이름과 책임을 더 얇게 정의하는 편이 좋습니다.

```text
CodexAppServerConnection
├── Transport
│   ├── StdioChildTransport
│   └── optional UnixDaemonTransport
│
├── JsonRpcRouter
│   ├── pendingOutgoing: Map<RequestId, Deferred>
│   ├── pendingServerRequests: Map<RequestId, ServerRequestLease>
│   ├── one reader
│   ├── serialized writer
│   └── settleAllOnClose(error)
│
├── ProtocolDecoder
│   ├── envelope classification
│   └── runtime validation for used methods only
│
└── BoundedEventSink
    ├── lossless: terminal/transcript-critical
    └── best-effort: cosmetic/progress if desired


CodexConversationProjection
└── threads: Map<ThreadId, ThreadProjection>
    ├── snapshot from thread/start/read/resume
    ├── activeTurnId
    ├── turns: Map<TurnId, TurnProjection>
    ├── items: Map<ItemId, ItemProjection>
    ├── pendingApprovals
    └── boundedEarlyEvents: Map<TurnId, Deque<Notification>>


AY-PLE Product Adapter
├── product status
├── UX policy
├── persistence references
├── redaction
└── product-specific events
```

`CodexConversationRuntime`라는 이름은 backend runtime의 authority처럼 들립니다. 가능하다면 다음처럼 바꾸는 편이 경계를 더 잘 나타냅니다.

```text
CodexConversationProjection
CodexConversationStore
CodexThreadProjectionManager
```

## 6.5 Connection 계층에서 유지할 것

* 한 개의 stdout reader
* writer serialization
* pending RPC map
* exact active request ID demux
* initialize/initialized handshake
* server-request registry
* disconnect 시 모든 waiter 종료
* bounded queue
* malformed envelope 처리
* 사용 method의 runtime validation

## 6.6 Projection 계층에서 유지할 것

* native thread/turn/item ID
* per-thread partition
* response 전에 온 turn notification의 bounded staging
* item delta aggregation
* `turn/completed` authoritative terminal
* `thread/read` snapshot replacement
* duplicate completion에 대한 idempotent no-op
* pending approval remove-on-response
* `serverRequest/resolved`에 의한 local cancellation

## 6.7 제거하거나 나중으로 미룰 것

* process-lifetime RequestId tombstone
* global event orderer
* global thread/turn/item FSM
* 모든 method 선제 구현
* product UUID remapping
* automatic retry of non-idempotent calls
* contradiction escalation framework
* 무제한 orphan notification buffering
* raw protocol 전체를 product public API로 노출

## 6.8 transport loss 상태는 작은 request-level 모델이면 충분하다

다음 네 상태만으로도 production UX에 충분합니다.

```text
NotSent
  └── write 자체가 실패: server가 수락하지 않았다고 판단 가능

AcceptanceUnknown
  └── write는 끝났지만 response를 받기 전에 연결 손실

AcceptedButOutcomeUnknown
  └── turn/start response는 받았지만 turn/completed 전에 연결 손실

TerminalKnown
  └── authoritative turn/completed 수신
```

이 상태는 request/turn handle의 metadata이지 global state machine일 필요가 없습니다.

자동 정책은 다음처럼 제한해야 합니다.

* explicit `-32001 Server overloaded` 응답: backoff 후 retry 가능
* `thread/list`, `thread/read`: 일반적으로 retry 가능
* transport loss 후 `thread/start`, `turn/start`: blind retry 금지
* native thread ID를 알고 있으면 `thread/read`/`thread/resume`로 reconciliation
* accepted turn ID를 알고 있으면 그 turn을 history에서 확인

공식 문서도 server ingress overload에 대해 `-32001`과 backoff를 설명하지만, 이는 transport-loss unknown outcome에 대한 idempotency 보장은 아닙니다. ([ChatGPT 학습][2])

## 6.9 Rust sidecar 선택 시 제거 가능한 것

`codex-app-server-client`를 exact git revision으로 감싼 Rust sidecar를 사용하면 TS에서 다음을 제거할 수 있습니다.

* App Server child/in-process startup
* request ID pending map
* remote disconnect settlement
* typed protocol deserialization
* backpressure tier
* server request resolve/reject transport logic

하지만 다음은 여전히 TS 제품에 남습니다.

* per-thread UI projection
* item/delta aggregation
* approval UI
* product state
* reconnect UX
* safe event projection

Rust sidecar는 “conversation runtime 제거”가 아니라 **connection runtime의 upstream reuse**입니다.

---

# 7. Incremental implementation roadmap

## 7.1 단계 1 — 반드시 먼저 구현할 foundation

### 목표

* 새 thread
* text turn
* multi-turn
* streaming AgentMessage
* authoritative completion
* future multi-thread를 막지 않는 routing

### Method inventory

| 방향                  | Method         |
| ------------------- | -------------- |
| client request      | `initialize`   |
| client notification | `initialized`  |
| client request      | `thread/start` |
| client request      | `turn/start`   |

### Notification inventory

| Notification              | 용도                          |
| ------------------------- | --------------------------- |
| `thread/started`          | thread snapshot/ID          |
| `turn/started`            | actual execution start      |
| `item/started`            | item identity/type          |
| `item/agentMessage/delta` | assistant text streaming    |
| `item/completed`          | final item snapshot         |
| `turn/completed`          | authoritative turn terminal |
| `error`                   | server/runtime error        |
| `warning`                 | 사용자 표시 가능한 warning          |

### Server-request 정책

아직 approval UI를 구현하지 않더라도 server request를 무시해서는 안 됩니다.

* 지원하지 않는 request는 즉시 JSON-RPC error로 reject
* 또는 초기 설정에서 approval이 발생하지 않는 policy를 명시적으로 사용
* unresolved request를 방치하지 않음

### Foundation acceptance tests

1. `thread/start` response의 native thread ID를 사용한다.
2. `turn/started` 또는 delta가 `turn/start` response 소비 전에 들어와도 보존된다.
3. `turn/completed`가 terminal authority다.
4. process EOF 시 모든 pending RPC가 즉시 실패한다.
5. unknown server request는 즉시 reject된다.
6. 두 thread의 interleaved notification이 서로 다른 projection으로 간다.
7. duplicate `turn/completed`는 idempotent no-op이다.

## 7.2 단계 2 — 첫 usable Chat Interface

### 목표

* thread history/read/resume
* command/tool activity
* command/file approval
* interrupt/steer
* 여러 thread의 독립 진행

### 추가 client methods

| Method                   | 기능                            |
| ------------------------ | ----------------------------- |
| `thread/list`            | history picker                |
| `thread/read`            | persisted transcript snapshot |
| `thread/resume`          | existing thread를 active하게 로드  |
| `turn/interrupt`         | running turn 중단               |
| `turn/steer`             | active turn에 추가 사용자 입력        |
| 선택적 `thread/unsubscribe` | 더 이상 관찰하지 않는 thread 해제        |

### 추가 server requests

| Server request                          | 기능                   |
| --------------------------------------- | -------------------- |
| `item/commandExecution/requestApproval` | command execution 승인 |
| `item/fileChange/requestApproval`       | file change 승인       |

### 추가 notifications

| Notification                                | 기능                                     |
| ------------------------------------------- | -------------------------------------- |
| `thread/status/changed`                     | loaded/active 상태 표시                    |
| `item/commandExecution/outputDelta`         | command output stream                  |
| `item/commandExecution/terminalInteraction` | stdin/terminal activity                |
| `item/fileChange/outputDelta`               | file-change output                     |
| `item/fileChange/patchUpdated`              | live patch update                      |
| `serverRequest/resolved`                    | 다른 흐름에서 resolution된 pending request 제거 |
| `item/mcpToolCall/progress`                 | MCP tool 진행 표시가 필요한 경우                 |

### Usable chat acceptance tests

1. 한 thread의 approval 때문에 다른 thread stream이 block되지 않는다.
2. approval response 함수는 pending map에서 먼저 remove한 뒤 전송한다.
3. `serverRequest/resolved`가 먼저 오면 UI approval을 취소한다.
4. 이미 resolved된 approval click은 no-op 또는 명시적 stale error가 된다.
5. `thread/read` 결과로 local projection을 안전하게 replace/rebase한다.
6. interrupt response와 `turn/completed: interrupted`를 별개로 처리한다.
7. command output delta가 유실돼도 `item/completed` final snapshot으로 수렴한다.
8. transcript-critical event queue가 overflow로 버려지지 않는다.

## 7.3 단계 3 — 나중에 추가해도 되는 extended chat

### 필요할 때만 추가할 methods

| 기능                           | Method/server request                                 |
| ---------------------------- | ----------------------------------------------------- |
| fork                         | `thread/fork`                                         |
| archive management           | `thread/archive`, `thread/unarchive`                  |
| loaded thread diagnostics    | `thread/loaded/list`                                  |
| paged history                | experimental `thread/turns/list`, `thread/items/list` |
| permission escalation        | `item/permissions/requestApproval`                    |
| tool user input              | `item/tool/requestUserInput`                          |
| MCP elicitation              | `mcpServer/elicitation/request`                       |
| client-executed dynamic tool | `item/tool/call`                                      |
| naming                       | `thread/name/set`                                     |
| compaction                   | `thread/compact/start`                                |
| daemon lifecycle             | `app-server-daemon`/Unix socket                       |

### 나중에 추가할 reliability 기능

* reconnect orchestration
* persisted projection cache
* `thread/read` reconciliation
* lag/overflow telemetry
* schema version negotiation policy
* daemon restart
* crash recovery UX
* advanced log redaction
* orphan event TTL과 capacity metrics

### 구현하지 않을 선제 기능

* 사용하지 않는 account/plugin/fs/realtime methods
* 모든 experimental method의 generic reducer
* 모든 notification을 보존하는 unbounded event log
* cross-thread global sequence
* automatic mutation retry

---

# 8. Evidence appendix

## 8.1 검증 대상 가설 최종 판정

|  # | 가설                                                                                                     | 판정                                 | 근거                                                                                                                     |
| -: | ------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
|  1 | pinned npm package는 launcher만 제공하고 reusable TS client가 없다                                              | **Verified**                       | tarball에 `README.md`, `bin/codex.js`, `package.json`만 존재. `main`/`exports` 없음. [E16·E17]                               |
|  2 | generated TypeScript는 schema/types만 제공한다                                                               | **Verified**                       | export source는 request/response/notification type을 생성할 뿐 client runtime을 생성하지 않음. [E15]                                |
|  3 | pinned CLI/TUI는 App Server를 통하지 않고 core를 직접 사용한다                                                       | **Contradicted**                   | TUI는 `codex-app-server-client`를 사용하고 기본 embedded App Server, remote App Server를 선택함. [E4·E5·E6]                        |
|  4 | `thread/start`는 exact pin에서 response-first다                                                            | **Verified — 구현 사실**               | response send를 await한 뒤 `thread/started`를 보냄. 프로토콜 영구 계약으로 승격하면 안 됨. [E11]                                             |
|  5 | `turn/start` response와 `turn/started` forwarding은 다른 async path이며 notification-first가 가능하다             | **Partially true**                 | 별도 path는 verified. Python SDK도 early-event staging을 명시. notification-first 가능성은 source-backed inference. [E12·E13·E19] |
|  6 | test client는 response 대기 중 notification을 FIFO로 보관한다                                                    | **Verified**                       | `VecDeque`, `push_back`, `pop_front`. [E14]                                                                            |
|  7 | App Server wire order는 cross-thread causal/product order가 아니다                                          | **Partially true / inference**     | 한 connection에 수신 순서는 있으나 source는 per-thread routing을 사용하며 cross-thread causal contract는 없음. [E8·E23]                   |
|  8 | custom rich client는 backend thread/turn을 재구현하는 것이 아니라 local projection과 transport correlation만 구현해야 한다 | **Verified architectural reading** | App Server가 managers/execution/persistence를 소유하고 TUI는 별도 per-thread projection을 유지. [E9·E10·E22]                       |

## 8.2 핵심 exact source permalinks

### Repository, entry points, dependencies

* **E1 — Exact PIN commit**
  [`767822446c7a594caa19609ca435281a9ec67e0d`](https://github.com/openai/codex/commit/767822446c7a594caa19609ca435281a9ec67e0d)

* **E2 — Workspace members and versioned crates**
  [`codex-rs/Cargo.toml`, PIN](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/Cargo.toml#L1-L250)

* **E3 — CLI entry: TUI vs `codex exec`**
  [`codex-rs/cli/src/main.rs` L958–1019](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/cli/src/main.rs#L958-L1019)

* **E4 — TUI depends on `codex-app-server-client` and protocol**
  [`codex-rs/tui/Cargo.toml` L26–122](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/Cargo.toml#L26-L122)

* **E5 — Embedded vs remote/local-daemon selection**
  [`codex-rs/tui/src/lib.rs` L448–575](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/lib.rs#L448-L575)
  [`codex-rs/tui/src/lib.rs` L585–816](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/lib.rs#L585-L816)

### Rust App Server client

* **E6 — `codex-app-server-client` 역할, bounded queue, protocol preference**
  [`codex-rs/app-server-client/src/lib.rs` L1–195](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L1-L195)

* **E7 — In-process client worker, request/event concurrency, resolve/reject**
  [`codex-rs/app-server-client/src/lib.rs` L416–743](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/lib.rs#L416-L743)

* **E8 — Remote request ID demux and disconnect settlement**
  [`codex-rs/app-server-client/src/remote.rs` L200–477](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client/src/remote.rs#L200-L477)

### App Server authority and ordering

* **E9 — Process-scoped managers and request processors**
  [`codex-rs/app-server/src/message_processor.rs` L248–430](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L248-L430)

* **E10 — App Server protocol, primitives, lifecycle, thread APIs**
  [`codex-rs/app-server/README.md` L22–87](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L22-L87)
  [`codex-rs/app-server/README.md` L140–166](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L140-L166)

* **E11 — `thread/start`: response then `thread/started`**
  [`thread_processor.rs` L1328–1363](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1363)

* **E12 — `turn/start`: submit to core, obtain turn ID, return response**
  [`turn_processor.rs` L442–571](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L442-L571)

* **E13 — Generic response dispatch and independent `TurnStarted` event forwarding**
  [`message_processor.rs` L1424–1437](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L1424-L1437)
  [`bespoke_event_handling.rs` L149–183](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L149-L183)

### Test client and generated schemas

* **E14 — stdio test client, `pending_notifications`, FIFO staging**
  [`app-server-test-client/src/lib.rs` L1480–2020](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1480-L2020)

* **E15 — `generate-ts` exports types only**
  [`app-server-protocol/src/export.rs` L44–191](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/export.rs#L44-L191)

### npm and SDKs

* **E16 — `@openai/codex` package metadata**
  [`codex-cli/package.json` L1–24](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-cli/package.json#L1-L24)

* **E17 — npm launcher implementation**
  [`codex-cli/bin/codex.js` L1–200](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-cli/bin/codex.js#L1-L200)

* **E18 — TypeScript SDK wraps `codex exec`**
  [`sdk/typescript/src/exec.ts` L65–245](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/typescript/src/exec.ts#L65-L245)
  [`sdk/typescript/src/thread.ts` L42–140](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/typescript/src/thread.ts#L42-L140)

* **E19 — Python sole-reader router, exact response demux, early turn staging, `fail_all`**
  [`sdk/python/src/openai_codex/_message_router.py` L19–242](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/_message_router.py#L19-L242)

* **E20 — Python stdio App Server client, turn lock, approvals, reader loop**
  [`sdk/python/src/openai_codex/client.py` L196–477](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L196-L477)
  [`sdk/python/src/openai_codex/client.py` L604–863](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L604-L863)

* **E21 — Python SDK package/runtime pin caveat**
  [`sdk/python/pyproject.toml` L7–22](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/pyproject.toml#L7-L22)

### TUI projection and server-request lifecycle

* **E22 — TUI per-thread event store, active turn, bounded buffer**
  [`tui/src/app/thread_events.rs` L1–148](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L1-L148)
  [`tui/src/app/thread_events.rs` L203–230](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L203-L230)

* **E23 — TUI per-thread routing and replay**
  [`tui/src/app/thread_routing.rs` L1–132](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L1-L132)
  [`tui/src/app/thread_routing.rs` L878–1065](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L878-L1065)

* **E24 — TUI pending approval/user-input registry and remove-on-resolution**
  [`tui/src/app/app_server_requests.rs` L72–178](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L72-L178)
  [`tui/src/app/app_server_requests.rs` L181–332](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L181-L332)

* **E25 — Server-side pending callback ownership, replay, once-only removal**
  [`app-server/src/outgoing_message.rs` L97–120](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/outgoing_message.rs#L97-L120)
  [`app-server/src/outgoing_message.rs` L274–454](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/outgoing_message.rs#L274-L454)

### Exec and protocol registry

* **E26 — `codex exec` uses embedded App Server methods and event loop**
  [`exec/src/lib.rs` L678–925](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L678-L925)
  [`exec/src/lib.rs` L927–1066](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L927-L1066)

* **E27 — Exact method/request/notification inventory**
  [`common.rs` thread methods L475–645](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L475-L645)
  [`common.rs` turn methods L808–824](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L808-L824)
  [`common.rs` server requests L1461–1532](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L1461-L1532)
  [`common.rs` notifications L1615–1712](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/common.rs#L1615-L1712)

### Daemon and post-PIN additions

* **E28 — Exact PIN의 experimental App Server daemon**
  [`app-server-daemon/README.md` L1–110](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-daemon/README.md#L1-L110)

* **E29 — CURRENT MAIN generated notification envelope and `emittedAtMs`**
  [`ServerNotificationEnvelope.ts` L1–89](https://github.com/openai/codex/blob/b24aa20107f365a1d0f06de9e0b28df5c516c7dd/codex-rs/app-server-protocol/schema/typescript/ServerNotificationEnvelope.ts#L1-L89)

* **E30 — CURRENT MAIN server-side thread history projection**
  [`thread_history_projection.rs` L1–91](https://github.com/openai/codex/blob/b24aa20107f365a1d0f06de9e0b28df5c516c7dd/codex-rs/app-server-protocol/src/protocol/thread_history_projection.rs#L1-L91)

* **E31 — Latest release npm package remains launcher-only**
  [`0.144.3 codex-cli/package.json` L1–24](https://github.com/openai/codex/blob/78ad6e6bfd1d3b6a209acd3ef82172a96b25179c/codex-cli/package.json#L1-L24)

---

## 최종 architecture 결정

가장 근거가 강한 선택은 다음입니다.

```text
유지:
  CodexAppServerConnection
  per-thread ConversationProjection
  separate AY-PLE adapter

축소:
  method-specific staging
  simple idempotent reducer
  active-only RequestId uniqueness
  used-method schema validation

제거/연기:
  global state machine
  global causal ordering
  process-lifetime tombstones
  automatic mutation retry
  product UUID remapping

선택적 교체:
  connection layer만 Rust sidecar + codex-app-server-client

upgrade:
  별도 compatibility project
  client-layer 제거를 목적으로 하지는 않음
```

즉 현재 설계는 **전면 교체할 설계가 아니라, authoritative backend와 local projection의 경계를 더 명확히 하면서 강한 correctness policy를 덜어내야 하는 설계**입니다.

[1]: https://github.com/openai/codex/releases/tag/rust-v0.144.3?utm_source=chatgpt.com "Release 0.144.3 · openai/codex · GitHub"
[2]: https://learn.chatgpt.com/docs/app-server "https://learn.chatgpt.com/docs/app-server"
[3]: https://pypi.org/project/openai-codex/ "https://pypi.org/project/openai-codex/"
