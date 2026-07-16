# Codex-native Chat Shell 첫 수직 흐름

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

AY-PLE에는 일반적인 Codex 대화를 제품에서 직접 실행하는 경로가 아직 없다. 현재 Server와 Inspector가 사용하는 `CodexRuntimeAdapter -> CodexRawClient`는 developer Runtime Harness이고, 별도로 export된 `HeadlessCodexClientHost`는 Server나 Inspector에 연결되지 않은 legacy 구현이다. 둘 중 어느 쪽도 새 제품 Chat Shell의 target architecture가 아니다.

격리 prototype은 official `openai/codex` Python SDK가 native thread·turn identity, AgentMessage streaming, interrupt, same-thread follow-up과 process close를 이미 제공함을 확인했다. 그러나 exact source commit `8c68d4c87dc54d38861f5114e920c3de2efa5876`의 Python package는 과거 runtime `0.137.0a4`를 가리키며, exact runtime `0.144.4`에서 generated model과 public method block을 다시 만들어야 한다. 또한 `turn/start` response 전에 matching AgentMessage와 `turn/completed`가 오면 terminal을 잃는 router 결함과 unbounded notification queue가 확인됐다.

새 generic App Server client나 legacy Host state machine을 다시 설계하면 first-party client lifecycle을 재발명하게 된다. 반대로 official SDK를 검증 없이 그대로 연결하면 합법적인 response-last interleaving에서 영구 대기하고, 느린 consumer나 burst에서 memory가 무제한 증가할 수 있다. 첫 제품 tracer는 official SDK의 public conversation API를 기준선으로 재사용하되, 실행 증거가 확인한 두 blocker만 좁고 upstream-followable하게 보정해야 한다.

## Solution

새 workspace package `@ay-ple/codex-chat-runtime`이 exact official Python SDK와 Codex App Server를 package-private artifact로 소유하고, `CodexChatRuntime`이라는 작은 Node interface 뒤에서 Python bridge process와 native child process를 함께 감독한다. 기존 AY-PLE Server에는 `/api/codex-chat/*` router를 additive하게 붙이고, 별도 `@ay-ple/chat-shell` desktop web app이 그 route만 사용한다. Inspector와 `/api/runtime/*`는 그대로 유지한다.

첫 Chat Shell은 Server가 명시적으로 준비한 workspace에서 `ApprovalMode.deny_all`과 `Sandbox.read_only`를 thread와 turn마다 적용한다. 사용자는 native thread를 만들고 text turn의 AgentMessage를 실시간으로 보며, authoritative `turn/completed` 결과, 오류와 interrupted 상태를 구분한다. 같은 native thread에서 다음 turn을 이어가고 active turn을 중단할 수 있다. Server 종료나 fatal bridge failure는 Python과 App Server process tree를 bounded하게 종료하고 reap한다.

Production runtime은 `references/openai-codex` working tree나 system `python`, ambient `PATH`, browser가 보낸 `cwd`에 의존하지 않는다. Exact source에서 materialize한 SDK snapshot, reviewed local patch, locked wheel set과 standalone Python runtime manifest를 package artifact로 만든다. Safe disposable auth/provider가 없는 환경에서는 deterministic fake와 exact local-provider gate를 green으로 만들고 live provider gate는 명시적으로 `blocked`로 기록한다.

## User Stories

1. 사용자로서 AY-PLE 고유 작업을 추가하기 전에 일반적인 Codex 대화를 쓸 수 있도록 간단한 desktop Chat Shell에서 native conversation을 시작하고 싶다.
2. 사용자로서 진행과 최종 상태를 혼동하지 않도록 AgentMessage가 생성되는 동안 text를 보고 authoritative `turn/completed`에서만 terminal로 수렴시키고 싶다.
3. 사용자로서 중단 결과를 native 상태로 확인할 수 있도록 active turn을 interrupt하고 `interrupted` terminal을 보고 싶다.
4. 사용자로서 AY-PLE identity remapping 없이 대화 문맥을 유지하도록 terminal 뒤 같은 native thread에 follow-up을 보내고 싶다.
5. 운영자로서 Server restart와 test teardown이 orphan process를 남기지 않도록 Python bridge와 native App Server child를 결정적으로 닫고 싶다.
6. 유지보수자로서 다음 Codex pin upgrade의 delta를 검토할 수 있도록 official SDK source, generated contract, runtime, local patch와 license를 exact provenance에서 재현하고 싶다.

## Current State and Constraints

### Current implementation

- `apps/server`와 `apps/inspector`는 현재 developer Runtime Harness를 구현한다. 이들의 endpoint, persistence semantics와 browser test는 현재 구현이며 이번 slice에서 바꾸지 않는다.
- `packages/runtime-codex`는 계속 `@openai/codex@0.144.0`에 pin한다. 그 안의 `CodexRuntimeAdapter`와 package-exported `HeadlessCodexClientHost`는 legacy/current implementation이며 새 Chat Shell의 dependency가 아니다.
- `references/openai-codex`는 commit `8c68d4c87dc54d38861f5114e920c3de2efa5876` (`rust-v0.144.4`)에 pin한 source, schema, test oracle이다.
- Prototype evidence는 `prototype/codex-python-sdk-reuse@3b3fa9e0`에 남긴다. Production code는 검증된 mechanics만 선택적으로 재구현하고 prototype tree를 merge하거나 cherry-pick하지 않는다.
- [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)이 baseline decision과 확인된 router, queue, approval, packaging residual을 소유한다. [Development backlog](../product/ay-ple-development-backlog.md)가 task order와 completion status를 소유한다.

### Adopted target

```text
apps/chat-shell
    -> POST streaming /api/codex-chat/*
apps/server
    -> @ay-ple/codex-chat-runtime
packages/codex-chat-runtime
    -> supervised persistent Python bridge
    -> exact official openai-codex Python SDK + reviewed minimal patches
    -> exact openai-codex-cli-bin 0.144.4 App Server

apps/inspector -> existing /api/runtime/* (unchanged)
```

### Constraints

- macOS arm64 desktop이 첫 packaging과 UI validation target이다. Mobile과 small-screen behavior는 deferred다.
- Official SDK의 public `AsyncCodex`, `AsyncThread`, `AsyncTurnHandle`을 conversation API baseline으로 사용한다. Node에서 raw JSON-RPC를 재구현하지 않는다.
- Native `threadId`, `turnId`, `itemId`는 authoritative string으로 유지한다. AY-PLE UUID remapping, connection generation ref 또는 global publication sequence를 도입하지 않는다.
- Interactive approval은 deferred다. `deny_all`은 `never`로 mapping되지만 예상 밖의 schema-valid approval request는 `accept`를 반환하는 official low-level default handler에 도달한다. 첫 slice는 trusted exact App Server에 의존하고 effective outgoing policy를 검증하며, client-side fail-closed approval defense를 제공한다고 주장하지 않는다.
- Process loss 전에 response를 관찰하지 못한 mutation은 outcome을 알 수 없다. Thread나 turn 생성을 자동 retry하지 않는다.

## Implementation Contract

### Module Responsibilities and Seams

#### `@ay-ple/codex-chat-runtime`

첫 tracer에서 이 package는 하나의 deep Node module이며 다음 책임을 소유한다.

- exact Python/runtime artifact discovery와 manifest verification;
- Python bridge spawn, serialized stdin write, sole stdout frame reader와 bounded stderr capture;
- bridge request correlation, per-turn event delivery, deadline과 fatal settlement;
- process-group close, terminate, kill, stdout/stderr drain과 reap;
- browser-safe Codex chat contract와 deterministic fake implementation.

이 package는 `AgentRuntimeAdapter`를 구현하지 않고, AY-PLE domain object를 소유하지 않으며, raw JSON-RPC나 generated Pydantic model을 노출하거나 제품 conversation state를 영속화하지 않는다.

export 경계는 다음과 같다.

| Export | Responsibility |
| --- | --- |
| `.` | Node-only `CodexChatRuntime`, production factory와 lifecycle error |
| `./contract` | Browser-safe native ID, event, command, result type와 runtime parser |
| `./testing` | 같은 `CodexChatRuntime` interface를 구현하는 deterministic fake |

#### Python bridge

지속되는 Python process는 public `AsyncCodex` instance 하나와 native ID에서 live `AsyncThread`·`AsyncTurnHandle`로 가는 process-local projection을 소유한다. initialize/initialized, request routing, thread/turn API, streaming과 interrupt는 official SDK를 사용한다. turn stream을 소비하는 동안에도 asyncio command reader는 새 control command를 받을 수 있고, bounded stdout writer 하나만 frame을 직렬화한다.

Bridge는 첫 slice에 고정된 `deny_all + read_only`, allowlisted event projection, 운영 bound와 cleanup 이외의 AY-PLE policy를 담지 않는다. Runtime에서는 `references/`를 import하지 않는다.

#### AY-PLE Server

기존 Server는 격리된 `/api/codex-chat` router와 composition module을 추가한다. Environment validation, 준비된 workspace와 homes, HTTP input validation, loopback/origin protection, NDJSON backpressure와 application shutdown ordering을 소유한다. Chat 설정이 완전할 때만 Server process당 `CodexChatRuntime` 하나를 lazy start하고, 새 HTTP work를 막은 뒤 정확히 한 번 닫는다.

기존 `/api/runtime/*`, health, persistence와 Inspector behavior는 migrate하거나 재해석하지 않는다.

#### Chat Shell app

`apps/chat-shell`은 별도 React/Vite desktop app이다. Transient view state, fetch-stream parsing, transcript rendering과 user control을 소유한다. `runtime-core`나 `runtime-codex`를 import하지 않고, 이번 slice에서는 thread를 영속화하거나 재구성하지 않는다.

### Interfaces and Invariants

안정적인 Node seam은 다섯 operation으로 제한한다.

| Operation | 결과와 invariant |
| --- | --- |
| `startThread()` | Official `thread/start` response의 native `threadId`로만 resolve한다. Configured workspace, `deny_all`, `read_only`를 항상 명시한다. |
| `startTurn({ threadId, text })` | Native `threadId`, authoritative response `turnId`, `AsyncIterable<CodexChatEvent>`로 resolve한다. Early matching event는 FIFO로 replay한다. |
| `interrupt({ threadId, turnId })` | `turn/interrupt`가 반환됐다는 사실만 acknowledge한다. Authoritative `turn/completed`가 `interrupted`, `completed`, `failed` 중 하나를 보고할 때까지 stream은 active다. |
| `releaseThread({ threadId })` | Active turn이 없을 때 live Python handle만 해제한다. Native Codex thread를 archive하거나 삭제하지 않는다. |
| `close()` | 새 work를 idempotent하게 거부하고 모든 pending operation을 settle한 뒤 bounded deadline 안에서 SDK를 닫고 Python/App Server process group을 reap한다. |

첫 Server slice는 process 전체에서 transient native thread 하나와 active turn 하나만 노출한다. 새 conversation은 기존 thread가 idle일 때 `releaseThread`로 live handle을 해제한 뒤 시작하며, active turn이 있으면 `409 active_turn`을 반환한다. 이 제한은 reconnect/read/resume 없는 첫 HTTP stream lease의 자원 소유 계약일 뿐 App Server의 일반 concurrency 의미가 아니다. `@ay-ple/codex-chat-runtime` 내부 live thread projection은 32개로 제한하고 idle terminal handle만 least-recently-used 순서로 해제하며, active handle은 자동 해제하지 않는다. Active turn projection도 32개를 넘지 않는다. Server의 단일-thread tracer가 이 cap에 도달해서는 안 되며 작은 injected cap으로 eviction/rejection을 검증한다.

`CodexChatEvent`는 allowlist다.

| Browser event | Exact source method/model | Browser-visible fields |
| --- | --- | --- |
| `agent_message.delta` | `item/agentMessage/delta` / `AgentMessageDeltaNotification` | `threadId`, `turnId`, `itemId`, `delta` |
| `agent_message.completed` | `item/completed` / `ItemCompletedNotification`에서 `item`을 `AgentMessageThreadItem`으로 narrow | `threadId`, `turnId`, `itemId`, final `text` |
| `turn.error` | `error` / `ErrorNotification` | `threadId`, `turnId`, `willRetry`, stable safe `code`와 display message |
| `turn.completed` | `turn/completed` / `TurnCompletedNotification` | `threadId`, `turnId`, native `status` (`completed`, `interrupted`, `failed`)와 필요한 safe failure summary |
| `runtime.failed` | Bridge/runtime 자체 failure이며 App Server notification이 아님 | stable failure `code`, safe display message와 mutation outcome을 아는지 여부 |

AgentMessage text는 의도된 사용자 output이다. Raw error `additionalDetails`, command/path payload, stderr, Python traceback, JSON-RPC envelope, App Server `RequestId`와 채택하지 않은 notification method는 `./contract`를 넘지 않는다. 다른 종류의 `item/completed`도 internal에 남긴다. `turn.error`는 observation일 뿐이다. 첫 matching `turn.completed`가 semantic turn terminal이고 public `AsyncTurnHandle.stream()` iterator가 그 지점에서 닫힌다. Iterator가 닫힌 뒤 notification을 관찰하기 위한 별도 tombstone이나 contradiction policy는 만들지 않는다. `runtime.failed`는 transport terminal이며 성공 또는 interrupted Codex turn을 합성하지 않는다.

한 turn stream 안의 publication order는 official SDK replay/arrival FIFO다. Cross-thread 또는 generation-wide total order는 정의하지 않는다.

### Exact Official SDK Artifact

Tracked package snapshot은 exact submodule commit에 포함된 committed file만으로 materialize한다. Generation은 dirty oracle을 거부하고 untracked, ignored, secret file을 제외한다. Production artifact에는 채택한 API에 필요한 official SDK source와 test, official generated output, bridge source와 다음 provenance file을 포함한다.

| Artifact | 필수 내용 |
| --- | --- |
| source manifest | source commit/tag, runtime version, Python version/build, platform, generated digests and lock digest; no timestamp or absolute path |
| `LICENSE` and `NOTICE` | exact root Apache-2.0 files from `openai/codex`, separate from AY-PLE licensing |
| patch ledger | exact base, patch order, rationale, changed source paths, regression oracle and upstream issue/PR link when one exists |
| unpatched manifest | regenerated exact baseline digests before handwritten patches |
| production manifest | patched wheel and complete offline wheel-set names, sizes and SHA-256 digests |

Materializer는 stale runtime dependency를 exact `openai-codex-cli-bin==0.144.4`로 바꾸고 dependency resolution을 고정한다. 이어 official `update_sdk_artifacts.py generate-types`를 실행하고 다음 generated authority를 모두 검토한다.

- `generated/v2_all.py`;
- `generated/notification_registry.py`;
- the generated convenience-method blocks in `api.py`.

Behavioral source patch를 적용하기 전에 unpatched baseline은 두 번의 build에서 identical output을 만들고 aligned official test suite를 통과해야 한다. macOS arm64 runtime bundle은 standalone CPython `3.10.18` build `20250818`과 검토한 SHA-256, exact SDK wheel, dependency와 native runtime wheel을 pin한다. Generated/binary payload는 build artifact이며 committed secret이 아니다. Verified bundle이 없을 때 production startup은 system Python이나 `PATH`로 fallback하지 않는다.

### Source-Guided Router Corrections

Correction은 dependency 순서로 나누며 각각 독립적으로 review할 수 있어야 한다.

1. Deterministic actual-child fake가 `turn/start` response보다 먼저 matching AgentMessage event와 `turn/completed`를 보낸다. Unpatched exact baseline은 terminal loss를 bounded expected failure로 재현해야 하며 outer deadline이 process tree를 kill하고 reap한다.
2. Minimal `MessageRouter` patch는 early terminal을 보존하고 live delivery가 보이기 전에 staged notification을 FIFO로 replay하며 terminal을 한 번 전달한다. Public conversation API는 바꾸지 않는다.
3. 별도 bounds patch가 login, active turn, pending turn, global route를 finite하게 만든다. Sole App Server reader는 full consumer queue에서 block하거나 silent eviction하지 않고 한 scope가 unrelated scope를 head-of-line block하게 두지 않는다. Enqueue 또는 route registration의 limit 초과는 모든 outstanding response waiter와 채택한 notification route의 현재·미래 waiter를 process-wide sticky terminal로 깨운다. 같은 route의 여러 waiter도 동일한 typed `buffer_overflow`를 관찰하며 caller가 bounded bridge cleanup을 호출할 수 있다.

Package-private default budget은 test에서 주입할 수 있지만 product setting은 아니다.

| Budget | Default |
| --- | ---: |
| one turn route | 4,096 items and 16 MiB UTF-8 serialized payload |
| active + pending turn route count | 64 each |
| one login route | 256 items and 1 MiB |
| active / pending login route count | 8 each |
| global route | 1,024 items and 4 MiB |
| adopted login + turn + global router aggregate | 8,192 items and 64 MiB |
| live thread / active turn projections | 32 / 32 |
| Python bridge stdout queue | 4,096 frames and 16 MiB |
| one Node operation queue | 4,096 frames and 16 MiB |
| all Node operation queues | 8,192 frames and 32 MiB |

`MessageRouter`는 raw JSONL frame이 아니라 검증된 typed notification을 받으므로 payload accounting은 queue가 보존하는 notification의 canonical compact JSON envelope를 사용한다. Envelope는 `method`와 `params`만 포함하고, typed Pydantic payload는 `model_dump(mode="json", by_alias=True, exclude_none=False)`, `UnknownNotification`은 보존한 `params`를 사용한다. `json.dumps(..., ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)` 결과의 UTF-8 byte 수를 계산하며 newline은 포함하지 않는다. Pending event를 active queue로 옮길 때 중복 계산하지 않고, event를 consume하거나 clear하면 budget을 반환한다. Package-private read-only usage snapshot을 test seam으로 허용하며 terminal transition 뒤 retained notification과 usage는 모두 0이어야 한다. Test는 작은 injected value로 모든 overflow path와 canonical byte 경계를 검증한다.

이 aggregate는 첫 Chat Shell이 사용하는 login, turn과 global routing만 소유한다. Official SDK의 private goal-operation notification queue는 현재 bridge capability가 아니며 이 accounting에 포함하지 않는다. Goal operation을 후속 bridge surface로 채택하기 전에는 그 source topology에 맞는 별도 bound와 overflow settlement를 먼저 정의하고 검증한다.

### Bridge Protocol and Lifecycle

Node와 Python은 private NDJSON protocol을 사용한다. 각 line은 newline을 포함해 최대 1 MiB다. Command는 transport-only `bridgeRequestId`를 가지며 output은 `result`, `event`, `error`, process-wide `fatal` 또는 `close_ack`다. `start_turn`은 staged/live event frame보다 native identity를 먼저 반환한다. Stream command가 active인 동안 별도 bridge ID의 `interrupt`를 처리할 수 있다. 이 ID는 Codex `RequestId`가 아니며 HTTP contract를 넘지 않는다.

Malformed JSON, duplicate correlated response, unknown bridge command, oversized frame 또는 pending work가 있는 process EOF는 fatal이다. Runtime은 모든 operation을 한 번만 settle하고 mutation을 자동 retry하지 않으며, bounded stderr는 operator diagnostic으로만 기록한다.

Node supervisor는 inherited environment를 복사하지 않고 reviewed allowlist에서 Python environment를 새로 만든다. Absolute bundled Python path, controlled `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·temporary root, package runtime과 필수 OS directory만 포함한 fixed `PATH`, locale 등 실행에 필요한 비밀이 아닌 variable만 전달한다. Ambient API key/token, provider/base URL, organization/project, `PYTHONPATH`, dynamic-loader variable은 제거하며, 향후 provider/auth input이 필요하면 Server configuration에서 명시적으로 공급해야 한다. Python bridge는 같은 sanitized base를 `CodexConfig.env`에 전달하고 child가 effective homes, binary와 policy를 확인한다. Path나 credential value는 status, browser error 또는 일반 log에 넣지 않는다.

운영 default는 test에서 주입할 수 있다.

| Deadline | Default |
| --- | ---: |
| Python spawn + SDK initialize | 30 s |
| thread/start, turn/start response and interrupt control | 30 s |
| turn stream idle | 15 min |
| total turn stream | 60 min |
| graceful close before process-group terminate | 2 s |
| terminate before process-group kill | 2 s |
| HTTP disconnect interrupt/drain | 5 s |

Python은 항상 `finally`에서 `AsyncCodex.close()`를 시도한다. macOS에서 Node는 Python을 별도 process group으로 시작하고 정상 close와 stdout/stderr 완전 drain을 기다린다. 이후 필요하면 group `SIGTERM -> SIGKILL`로 단계적으로 올리고 Python과 native child가 남지 않았음을 검증한다. Crash, timeout과 Server shutdown은 같은 settlement path를 따른다. 첫 macOS target 밖의 cross-platform containment는 deferred이며 지원한다고 주장하지 않는다.

### HTTP Contract and Data Flow

Additive route contract는 다음과 같다.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/codex-chat/status` | Path나 secret 없이 closed status state, exact source/runtime version과 고정 approval/sandbox mode를 보고한다. |
| `POST /api/codex-chat/threads` | Native thread 하나를 시작하고 `201`과 `{ threadId }`를 반환한다. Browser는 `cwd`, homes, approval, sandbox를 제공할 수 없다. |
| `POST /api/codex-chat/threads/:threadId/turns` | `{ text }`를 받고 `application/x-ndjson`을 반환한다. 첫 line은 native turn acceptance이고, 이후 ordered allowlisted event를 보내며, 마지막 line은 authoritative terminal 또는 `runtime.failed`다. |
| `POST /api/codex-chat/threads/:threadId/turns/:turnId/interrupt` | Native interrupt response 뒤 `202`를 반환하며 stream terminal이 계속 authoritative하다. |

`text.trim()`은 비어 있지 않아야 하지만 전송할 때는 원래 text를 바꾸지 않는다. `text` 자체는 최대 131,072 UTF-8 bytes다. Chat router는 기존 global `express.json()`보다 먼저 충분한 envelope headroom이 있는 격리 parser를 mount하고 field의 exact UTF-8 byte limit을 적용한다. `/api/runtime/*` parser limit은 바꾸지 않는다. ID는 비어 있지 않은 native string이며 exact 비교한다. Server는 `res.write()` backpressure를 지킨다. 생성과 streaming이 한 HTTP request를 공유하므로 post-response event journal은 만들지 않는다.

Browser abort는 mutation phase에 따라 처리한다. Dispatch 전이면 local request만 취소한다. `turn/start` dispatch 뒤 response 전이면 Server가 operation ownership을 유지해 bounded response를 기다리고, response가 오면 즉시 interrupt한 뒤 terminal까지 drain한다. Response deadline 또는 process loss이면 outcome을 unknown으로 기록하고 shared bridge를 bounded cleanup한다. Turn acceptance 뒤 disconnect는 interrupt 후 최대 5초 terminal까지 drain하고, 도착하지 않으면 bridge를 같은 cleanup path로 닫는다. `thread/start` response 전 disconnect도 bounded response까지 소유하고, 성공하면 live handle을 release하며, outcome을 알 수 없으면 bridge를 닫는다. 첫 Server slice에는 active turn이 하나뿐이므로 이 process-wide cleanup이 unrelated active stream을 중단시키지 않는다. Transparent reconnect와 background continuation은 암시하지 않는다.

새 chat mutation은 loopback client와, 없거나 명시적으로 설정한 local Chat Shell `Origin`만 허용한다. 다른 origin은 `403`을 받는다. 이 규칙은 `/api/codex-chat`에만 적용하며 기존 Runtime Harness CORS behavior는 바꾸지 않는다.

Chat runtime을 enable하려면 explicit absolute workspace, Codex home, SQLite home과 verified runtime-bundle path가 모두 필요하다. 설정이 전부 없으면 기존 Server와 Inspector는 정상 시작하고 Chat status만 `unavailable`이다. 일부만 있거나 invalid하면 Chat composition이 이유를 안전하게 기록하되 Server 전체 startup을 막지 않는다. Test는 disposable directory를 만든다. Browser input, `process.cwd()`와 ambient API key/token/base URL variable은 workspace/auth fallback이 아니다. Runtime bundle 또는 설정이 없거나 invalid하면 mutation endpoint는 legacy Host를 시도하지 않고 stable `503 codex_chat_unavailable`을 반환한다.

Browser-safe status는 `unavailable | configured | starting | ready | failed` closed union이다. 모든 variant는 `state`, fixed `approvalMode: deny_all`, `sandbox: read_only`를 갖는다. Verified manifest가 있으면 `sourceCommit`과 `runtimeVersion`을 함께 보낸다. `unavailable`은 safe `reason: not_configured | invalid_configuration | runtime_missing`, `failed`는 stable `failureCode`만 추가한다. Complete configuration을 아직 spawn하지 않은 상태가 `configured`, lazy initialization 중이 `starting`, initialize/initialized가 끝난 상태가 `ready`다. Fake, Server와 UI는 이 union 하나를 공유한다.

### Chat Shell Behavior

별도 desktop app은 1440-1920 px workspace를 target으로 하고 mobile work 없이 현재 design-system direction을 따른다. 다음 기능을 제공한다.

- configured runtime/policy status와 명시적인 new-conversation action;
- 한 번에 transient native thread 하나와 diagnostic metadata로 보이는 native ID;
- user/Agent transcript row, native `itemId`별 delta streaming과 final AgentMessage reconciliation;
- 구분되는 running, completed, interrupted, turn-failed, runtime-failed state;
- native turn이 active일 때만 보이는 Interrupt control;
- terminal 뒤 같은 `threadId`로 second turn을 보낼 수 있게 다시 enable되는 composer;
- safe loading, empty, unavailable state.

App은 thread selection이나 transcript를 persist하지 않는다. Reload는 새 transient shell에서 시작하고 `thread/read`와 `thread/resume`은 별도 future slice로 남긴다. 기존 root `npm run dev`는 계속 Server + Inspector를 시작한다. 새 `npm run dev:chat-shell`은 Inspector를 product UI로 바꾸지 않고 Server + Chat Shell을 시작한다.

### Failure Behaviour

| Failure | Observable result |
| --- | --- |
| Validation 또는 forbidden origin | HTTP `400` 또는 `403`; runtime을 호출하지 않는다. |
| Missing/invalid runtime configuration | `503 codex_chat_unavailable`; ambient fallback하지 않는다. |
| Unknown thread 또는 turn | `404`; remapping하거나 auto-resume하지 않는다. |
| Same-thread active turn conflict | `409 active_turn`; existing stream은 계속된다. |
| `thread/start` 또는 `turn/start`가 response 전 실패 | HTTP `502` 또는 deadline `504`와 stable JSON error envelope `{ code, displayMessage, unknownOutcome }`; NDJSON header는 아직 commit하지 않고 자동 retry하지 않는다. |
| Acceptance 뒤 terminal 전 transport loss | `runtime.failed`; synthetic `turn.completed`를 만들지 않는다. |
| SDK/bridge/HTTP buffer overflow | `buffer_overflow` fatal 하나로 모든 pending operation을 settle하고 process group을 cleanup한다. |
| Interrupt request 성공 | HTTP `202`; native terminal 전까지 UI는 stopping 상태다. |
| Interrupt request 실패 | Safe control error를 보이고 runtime 자체가 fatal이 아니면 existing stream은 계속된다. |
| Browser disconnect | Best-effort interrupt와 bounded drain 뒤 terminal이 없으면 bridge를 닫는다. |
| Server shutdown | 새 chat work를 막고 listener를 닫은 뒤 runtime `close()`를 한 번 호출하며 exit 전에 drain/reap한다. |

`startTurn()`이 resolve한 뒤에만 Server는 `200 application/x-ndjson` header와 acceptance line을 commit한다. 그 전 failure는 JSON HTTP error이고, 그 뒤 failure만 final NDJSON `runtime.failed`다. Process-wide fatal 뒤 첫 slice는 bridge를 자동 restart하거나 native thread를 resume하지 않는다. Server restart가 explicit recovery action이다. Diagnostic은 bounded stderr와 traceback을 process memory/log에 보존할 수 있지만 browser contract에는 stable code와 safe fixed display text만 전달한다.

### Compatibility and Migration

이번 변경은 additive expand step이다.

- 기존 workspace 옆에 `@ay-ple/codex-chat-runtime`, `/api/codex-chat/*`, `apps/chat-shell`을 추가한다.
- 현재 Runtime Harness endpoint, Inspector, `packages/runtime-codex`, 그 package의 `0.144.0` pin과 `HeadlessCodexClientHost` behavior를 바꾸지 않는다.
- Root `npm run dev` behavior를 유지하고 별도 Chat Shell command를 추가한다.
- Legacy path와 새 path 사이에 persisted data나 native identity map을 공유하지 않는다.
- 이 tracer가 green이고 별도 cutover checkpoint가 승인될 때까지 legacy Host contraction과 pin unification을 미룬다.

Stored-data migration은 필요하지 않다. Rollback은 현재 Harness를 operational하게 둔 채 additive route/app/package만 제거한다.

## Implementation Decisions

| Decision | 근거 |
| --- | --- |
| Node에 App Server JSON-RPC를 구현하지 않고 public `AsyncCodex`를 재사용 | Official external client가 conversation lifecycle을 이미 소유하고 streaming 중에도 Python command reader를 responsive하게 유지할 수 있다. |
| Source submodule을 실행하지 않고 package artifact를 materialize | Production을 재현할 수 있고 developer checkout에 의존하지 않는다. |
| 재현한 router/bounds blocker만 patch | First-party mechanics를 upgrade-followable하게 유지하고 theoretical hardening이 compatibility constraint가 되지 않게 한다. |
| `Connection -> ConversationRuntime` 대신 deep runtime package 하나 사용 | Public seam이 product tracer와 맞고 generic client architecture를 발명하지 않으면서 Python/process complexity를 숨긴다. |
| Turn POST에서 NDJSON stream | Start-response/subscription gap을 없애고 새 Server journal을 피한다. |
| 별도 Chat Shell app 생성 | Inspector를 제거 가능한 developer Harness로 유지하고 새 product path가 legacy state model을 상속하지 않게 한다. |
| Approval을 non-interactive로 유지 | Approval policy/UI는 later product slice가 소유하며 확인된 default-handler residual을 명시한다. |
| Mutation을 auto-restart/retry하지 않음 | Process loss 뒤 native mutation outcome을 모를 수 있다. |

## Testing Decisions

가장 높은 deterministic seam은 real Node-supervised Python process다. 그 안의 official SDK는 purpose-built fake App Server child 또는 official local fake-provider harness를 쓰는 exact Codex `0.144.4`를 시작한다. Pure router/unit test는 이 경계를 보완하지만 대체하지 않는다.

필수 gate는 다음과 같다.

1. Exact source materialization이 dirty/drifted ref를 거부하고 `LICENSE`/`NOTICE`를 포함하며 세 authority 위치를 모두 regenerate한 뒤 deterministic unpatched/production manifest와 wheel을 만든다.
2. Unpatched response-last actual-child test는 deadline 안에서 실패하고 process tree를 reap한다.
3. Minimal router patch 뒤 early AgentMessage FIFO와 once-only `turn/completed`가 green이며 complete aligned official Python suite와 Ruff가 통과한다.
4. Login, active/pending turn, global, aggregate item/byte limit은 burst와 stalled-consumer actual-child test에서 unrelated scope를 block하지 않고 fail closed한다.
5. Bridge contract test는 nominal T0, response-last T0, response 전후 crash, malformed/oversized frame, deadline, idempotent close와 grandchild reap을 검증한다. Ambient credential/provider/HOME/PATH에 conflicting sentinel을 넣어도 Python과 App Server child가 이를 관찰하거나 사용하지 않는지도 검증한다.
6. Exact native child + local fake provider가 ambient auth 없이 `deny_all + read_only`, native ID, AgentMessage delta/completion, authoritative terminal, interrupt와 same-thread second turn을 검증한다.
7. Server test는 `./testing` fake를 주입해 validation, origin/loopback guard, NDJSON ordering/backpressure, disconnect cleanup, error mapping과 shutdown close-once를 검증한다.
8. `1440x900` Chat Shell Playwright는 real Server + deterministic fake runtime을 통해 unavailable, nominal streaming, terminal failure, interrupt와 same-thread follow-up을 검증한다.
9. root `test`, `typecheck`, `build`와 필요한 `test:e2e` orchestration이 두 새 workspace를 실제로 호출하고, package validation, Python verification, Inspector lint와 Chat Shell lint까지 green이다;
10. Disposable configured provider가 있을 때 opt-in live smoke를 실행한다. 없으면 blocked를 green으로 취급하거나 deterministic suite를 실패시키지 않고 `fake: green`, `exact local-provider: green`, `live provider: blocked`로 기록한다.

각 semantic implementation ticket/checkpoint마다 Source, Standards와 Spec review를 독립 실행한다. Finding은 다음 dependency layer로 넘어가기 전에 owning artifact에서 고친다.

## Out of Scope

- Community AI SDK donor/fork, generated TypeScript fork와 FP patch ledger.
- 새 generic App Server `Connection`, `ConversationRuntime`, global event bus 또는 generation-ref state machine.
- AY-PLE `Assignment`, `ModelingInvocation`, `ModelingRun`, Review Workspace 또는 browser product adapter behavior.
- Interactive command/file approval, approval UI 또는 prototype approval lease patch의 production 사용.
- `thread/list`, `thread/read`, `thread/resume`, archive, rename, fork, steer, multi-thread sidebar와 browser persistence.
- Command/file/tool activity card, plan rendering, token/rate-limit toolbar와 model selection.
- Legacy Host 제거, Runtime Harness migration 또는 기존 Codex `0.144.0` pin upgrade.
- Automatic bridge restart, mutation retry, reconnect journal 또는 browser disconnect 뒤 background turn continuation.
- Windows/Linux production process containment, signing, notarization과 final Desktop App distribution packaging.
- Mobile과 small-screen responsive behavior.

## Open Questions

없다. Live provider availability는 verification environment condition이며 ticketing blocker가 아니다.

## Further Notes

- 이 spec은 [ADR 0011](../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)을 첫 implementation slice로 구체화한다. Archived community fork나 theoretical runtime plan을 다시 열지 않는다.
- Package-private numeric bound와 deadline은 이 tracer의 operational default다. 이후 measurement에 따라 같은 overflow/cleanup invariant를 유지하며 조정할 수 있고 App Server protocol constant는 아니다.
- Prototype branch는 evidence이며 import source가 아니다. 유용한 algorithm과 test는 wholesale copy하지 않고 exact provenance와 함께 새 owner에 다시 작성한다.
