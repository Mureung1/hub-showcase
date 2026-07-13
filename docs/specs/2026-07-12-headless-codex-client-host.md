# Headless Codex Client Host Foundation

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

AY-PLE의 현재 Codex 통합은 개발자가 단일 run을 진단하는 Runtime Harness다. `CodexRuntimeAdapter`는 run마다 새 App Server process, thread와 turn을 만들고 terminal 상태에서 process를 닫는다. 이 경계는 Fake/Codex lifecycle parity와 진단에는 적합하지만, 여러 대화와 여러 turn을 오가며 계속 사용하는 제품 client의 기반으로 사용할 수 없다.

제품 React shell이 현재 raw client나 Runtime Harness를 직접 사용하면 다음 문제가 생긴다.

- App Server process와 연결 상태가 화면 요청의 수명에 종속된다.
- interleave되는 thread·turn·item·request identity를 정확히 보존하기 어렵다.
- App Server가 시작한 Server request를 원래 request에 typed response로 돌려보낼 수 없다.
- `process.cwd()`와 독립적인 runtime-home override가 제품의 package, app data와 workspace 경계를 대신하게 된다.
- raw JSON-RPC, generated type, 인증 정보와 debug evidence가 browser 계약으로 새기 쉽다.
- developer-only Runtime Inspector가 제품 transcript나 session state를 소유하는 잘못된 방향으로 확장될 수 있다.

[개발 백로그](../product/ay-ple-development-backlog.md)는 Runtime Harness와 raw method inventory 다음 작업으로 Headless Codex Client Host를 지정한다. [ADR 0008](../adr/0008-separate-headless-codex-client-host-from-product-ui.md)은 이 Host와 browser-safe adapter를 제품 실행 통합의 seam으로 채택하고, `AgentRuntimeKernel`과 Runtime Inspector를 multi-thread 제품 client로 확장하지 않도록 결정한다.

## Solution

명시적인 `packageRoot`, `appDataRoot`, `workspaceRoot`에 묶인 one-workspace Headless Codex Client Host를 만든다. Host instance는 App Server child process 하나를 시작해 한 번 initialize하고, 같은 process에서 여러 persistent thread와 순차 multi-turn을 실행한다.

Host는 process lifecycle, connection generation, exact identity routing, normalized event subscription, pending interaction과 native workspace discovery를 소유한다. Raw Codex protocol과 secret은 Host 내부에 남기고, local companion은 좁은 HTTP command + SSE state/event adapter를 제품 React shell에 제공한다.

이번 foundation은 Host와 browser 경계를 end-to-end로 세우지만 Account, 완성된 Conversation workspace와 AY-PLE 학업 layer를 구현하지 않는다. 이후 capability는 같은 Host Interface에 추가한다.

## User Stories

1. AY-PLE 제품 개발자로서, 명시적인 package, app data와 workspace root로 Codex를 시작하고 싶다. 그래야 실행 파일, runtime state와 사용자 자료의 수명이 섞이지 않는다.
2. AY-PLE 제품 개발자로서, 여러 thread와 turn을 App Server process 하나에서 실행하고 싶다. 그래야 일반적인 장기 실행 Codex client를 제품 기능의 기반으로 사용할 수 있다.
3. AY-PLE 제품 개발자로서, interleave되는 event와 Server request를 정확한 thread·turn·item에 연결하고 싶다. 그래야 다른 대화의 출력이나 승인 요청이 현재 화면에 잘못 표시되지 않는다.
4. AY-PLE 사용자로서, 연결이 끊기거나 App Server가 종료되면 성공한 것처럼 보이지 않고 복구 가능 여부를 알고 싶다. 그래야 불확실한 실행을 안전하게 다시 판단할 수 있다.
5. AY-PLE 제품 개발자로서, workspace의 native `AGENTS.md`와 Skills discovery를 그대로 사용하고 싶다. 그래야 Codex가 이미 제공하는 context 규칙을 별도 엔진으로 다시 만들지 않는다.
6. AY-PLE 제품 개발자로서, React shell이 raw JSON-RPC나 secret 없이 Host state와 command를 사용하게 하고 싶다. 그래야 protocol 변화와 민감 정보가 browser 코드에 퍼지지 않는다.
7. Runtime Harness 사용자로서, 제품 Host 구현 뒤에도 기존 단일-run Inspector와 진단 history를 그대로 사용하고 싶다. 그래야 검증된 developer tooling을 회귀 없이 유지할 수 있다.

## Current State and Constraints

| 영역 | 현재 구현 | 이번 spec의 채택 목표 | 후속 범위 |
| --- | --- | --- | --- |
| App Server 수명 | `CodexRuntimeAdapter`가 run마다 `CodexRawClient`를 만들고 terminal에서 닫는다. | Host instance당 child process 하나를 initialize하고 명시적으로 stop/restart할 때까지 재사용한다. | packaged entrypoint와 자동 restart 정책 |
| Runtime layout | repository-local Harness home과 `process.cwd()` fallback을 사용하며 `CODEX_HOME`·`CODEX_SQLITE_HOME`을 독립 override할 수 있다. | 세 root를 필수 입력으로 받아 product runtime-home pair와 workspace `cwd`를 한 seam에서 검증한다. | OS 기본 app data, workspace chooser·registry와 migration |
| Protocol transport | client request response와 Server notification을 처리하지만 `id`가 있는 Server request를 분리하거나 응답하지 못한다. | 네 message direction을 분리하고 generation·direction·ID type을 포함한 exact identity를 보존한다. | baseline 밖의 Server request와 experimental method |
| Thread/turn | raw wrapper 일부와 단일-run Adapter가 있다. | 새 persistent thread 여러 개와 thread별 순차 turn을 한 Host process에서 실행한다. | thread list/read/resume, rename/archive와 완성된 conversation lifecycle |
| Browser surface | `apps/inspector`가 `/api/runtime/*`를 사용하는 developer-only UI다. | 별도 제품 React shell이 dedicated browser-safe adapter로 Host snapshot과 event를 사용한다. | transcript, activity card, approval UX, account·toolbar UI |
| 기록 | Runtime Diagnostic History가 prompt와 raw/debug evidence를 저장할 수 있다. | Host connection state와 pending interaction은 memory에만 유지하고 Runtime Diagnostic History를 재사용하지 않는다. | 제품 transcript와 workspace product state 저장 |
| Native context | Codex가 `cwd`를 받지만 제품 workspace seam과 `skills/list` 연결은 없다. | 모든 workspace-scoped call이 bound `workspaceRoot`를 사용하고 discovery는 native Codex에 위임한다. | Memory opt-in, rollover와 inherited host discovery 정책 |

현재 package 동작과 정확한 pin은 [runtime-codex README](../../packages/runtime-codex/README.md), 횡단 구현 gap은 [Runtime Harness 구현 지도](../architecture/runtime-harness-implementation-map.md), method별 채택과 연결 단계는 generated [Codex App Server method 목록](../architecture/codex-app-server-method-inventory.md)이 소유한다. 이 spec의 파일 경로 언급은 현재 상태를 설명하는 비규범 참고다.

## Implementation Contract

### Module Responsibilities and Seams

| 모듈 역할 | 책임 | 책임이 아닌 것 |
| --- | --- | --- |
| Codex protocol transport | package-owned binary spawn, stdio JSONL framing, package-internal generated schema로 known Client success response와 Server request·response 검증, Server request·notification 분류, single-consumer bounded observation stream과 process exit 관측 | operation의 read-only·mutation 의미, product state, browser DTO, thread 선택 UX |
| Headless Codex Client Host | product layout, one-workspace lifecycle, connection generation, thread·turn·item·request correlation, normalized snapshot/event, pending interaction, native Skills discovery | HTTP, React state, Runtime Diagnostic History, 학업 상태 |
| Local companion composition | Host instance 수명, browser-safe HTTP command와 SSE stream, request validation, same-origin local boundary, process shutdown cleanup | raw protocol passthrough, transcript source of truth |
| 제품 React shell | browser DTO만 소비하고 Host connection 상태를 최소 제품 entrypoint에서 표현 | Node API, generated type, auth secret, raw/debug log와 Runtime Inspector state |
| Runtime Harness | 기존 `AgentRuntimeKernel`, adapters, `/api/runtime/*`, Inspector와 진단 history를 그대로 유지 | 제품 Host의 session·transcript·pending interaction 소유 |

ADR 0008에 따라 구현 역할 이름은 고정하지만 package, workspace와 endpoint의 정확한 이름은 implementation ticket에서 정한다. 어떤 배치를 선택해도 위 seam과 dependency 방향은 바뀌지 않는다.

### Interfaces and Invariants

#### Product runtime layout

Host는 다음 세 root를 필수 입력으로 받고 start 전에 한 번 검증한다.

| 입력 | 불변 조건 |
| --- | --- |
| `packageRoot` | absolute·normalized existing directory이며 package-owned pinned Codex binary를 찾을 수 있다. 제품 상태를 쓰지 않고 전역 `PATH` fallback을 사용하지 않는다. 명시적 binary override가 있으면 package pin과 version 일치를 검증한다. |
| `appDataRoot` | absolute·normalized directory path이며 아직 존재하지 않을 수 있다. `CODEX_HOME`과 `CODEX_SQLITE_HOME`을 이 root 아래에서 분리할 수 없는 pair로 계산하고, 한쪽만 override하는 product configuration은 거부한다. |
| `workspaceRoot` | 사용자가 선택한 것을 caller가 명시적으로 주입한 absolute·normalized existing directory다. `process.cwd()` fallback은 없다. Host instance는 수명 동안 이 workspace 하나에 bound된다. |

Canonical containment 검사 뒤 세 root는 pairwise distinct여야 하며 어느 root도 다른 root의 ancestor·descendant일 수 없다. `packageRoot`와 `workspaceRoot`는 existing canonical target을 사용한다. 아직 없는 `appDataRoot`는 가장 가까운 existing ancestor와 경로 중 existing symlink를 canonicalize해 생성될 exact target을 계산하고 root overlap을 먼저 검사한다. 그 뒤 exact directory와 runtime-home pair를 만들고 실제 target containment를 다시 검증한다. Missing `packageRoot`·`workspaceRoot`, app-data ancestor inspection 실패, non-directory component와 생성 실패는 child spawn 전에 거부하지만 안전하게 만들 수 있는 missing `appDataRoot` 자체는 failure가 아니다.

App Server child process의 `cwd`, 새 thread의 `thread/start.cwd`와 `skills/list.cwds`는 모두 bound `workspaceRoot`를 사용한다. Browser caller는 임의 `cwd`, `CODEX_HOME`, `CODEX_SQLITE_HOME`이나 binary path를 command별로 바꿀 수 없다.

이번 spec은 app data에 Codex native runtime/session/log만 추가한다. Host connection snapshot과 pending interaction은 memory에만 유지하며, RawMaterial, 확인된 학기 상태, 제품 transcript와 Runtime Diagnostic History를 `appDataRoot`에 새로 저장하지 않는다.

#### Host lifecycle

Host snapshot은 최소한 `status`, monotonic `generation`, 마지막 sanitized failure와 `recoverable` 여부를 제공한다.

| 상태 | 의미 | 허용 동작 |
| --- | --- | --- |
| `stopped` | 의도적으로 child process가 없다. | `start` |
| `starting` | immutable raw layout input의 preflight, spawn과 `initialize`/`initialized` handshake가 진행 중이다. | snapshot·subscription·`stop` |
| `ready` | 현재 generation의 handshake가 끝나 command와 event routing이 가능하다. | in-scope Host command·`stop`·`restart` |
| `restarting` | 명시적 restart가 이전 generation을 닫고 새 handshake를 수행 중이다. | snapshot·subscription·`stop` |
| `stopping` | 신규 command를 거부하고 child와 pending operation을 닫는 중이다. | snapshot·subscription |
| `failed` | start, transport, protocol safety 또는 unexpected exit 때문에 사용할 수 없다. | `recoverable`이면 명시적 `restart`, 항상 `stop` |

- 동시 `start`는 하나의 start operation으로 coalesce하며 handshake를 한 번만 수행한다. 이미 `ready`인 start와 반복 `stop`은 idempotent다.
- Host는 immutable `ProductRuntimeLayoutInput`을 받아 첫 `start()`의 `starting` 상태에서 preflight한다. 성공한 validated layout은 Host 수명 동안 cache하고 restart에서만 재사용한다. Non-recoverable preflight 실패는 generation을 소비하지 않고 `starting → failed`로 publish하며 같은 Host에서 restart하지 않는다.
- `initialize` matching response 뒤 `initialized`를 전송하기 전에는 `ready`를 공개하지 않는다.
- 각 start/restart operation은 lifecycle epoch를 가진다. `transport.start()`, `initialize` response와 `initialized` write의 각 await 뒤 epoch와 lifecycle state를 다시 확인하며 stale operation은 generation을 발급하거나 다음 handshake 단계로 진행하지 않는다.
- successful child spawn마다 현재 epoch가 유효함을 확인한 뒤 새 generation을 발급한다. event, pending client request와 pending interaction은 generation에 속한다. Spawn settlement 전에 `close()`가 시작되면 shared transport start는 `transport_closed`로 reject되고 늦은 `spawn` callback은 성공을 공개하지 않는다.
- 자동 restart와 mutating command replay는 하지 않는다. 사용자가 알지 못한 thread·turn·approval 중복을 피하기 위해 caller가 Host 상태를 확인한 뒤 `restart`를 명시적으로 요청한다.
- `restart`는 같은 validated layout을 재사용해 새 generation을 initialize한다. 이전 generation의 event, response와 pending interaction은 새 generation에 적용하지 않는다.
- Host는 child request를 보내기 전에 package-internal observation stream의 유일한 consumer pump를 시작하고 첫 `next()`가 대기 중임을 보장한다. Lower queue는 bounded하며 overflow를 안전 failure로 종료한다. Terminal observation 뒤 pump의 `finally`가 transport `close()`까지 수행한다.
- graceful stop은 child 종료 deadline 뒤 강제 종료하고 실제 exit를 관측해야 성공한다. Force-kill deadline 뒤에도 종료를 확인하지 못하면 `stopped`를 공개하지 않고 stable cleanup failure로 fail closed하며, Node server shutdown과 test cleanup이 orphan process를 성공으로 숨기지 않는다.

Host lifecycle subscription은 subscriber 등록과 current snapshot 및 snapshot이 포함한 마지막 sequence `cursor` 취득을 하나의 atomic operation으로 제공한다. 반환값은 최소 `{ snapshot, cursor, events, unsubscribe }` 의미를 가지며 capture 중 발생한 `sequence > cursor` event는 subscriber-local buffer에 보관한다. 각 core subscriber buffer는 fixed event-count cap으로 bounded하며 unread event가 cap을 넘으면 해당 `events` AsyncIterable만 stable typed `subscription_overflow`로 종료하고 buffer를 해제한다. Host lifecycle, child와 다른 subscriber는 유지한다. Subscriber는 connection loss로 닫히지 않고 명시적 unsubscribe, Host stop 또는 자신의 overflow 전까지 `failed → restarting → ready`를 계속 관측한다. Browser adapter는 이 core subscription을 재정의하지 않고 serialize한다.

`recoverable`은 다음 분류로 결정하며 자유 형식 error message에서 추론하지 않는다.

| Failure class | `recoverable` | 규칙 |
| --- | --- | --- |
| invalid layout, missing/non-executable binary, unreadable package pin metadata, pin mismatch, runtime-home preparation failure | `false` | 같은 Host configuration으로 restart하지 않는다. Caller가 configuration 또는 외부 filesystem 상태를 고쳐 새 Host를 구성해야 한다. |
| unsafe protocol/schema/identity failure | `false` | 같은 pinned contract에서 자동·명시적 restart loop를 만들지 않는다. Binary/schema를 다시 검증한 뒤 새 Host를 구성한다. |
| lower observation queue overflow | `false` | Host pump 불변 조건이나 protocol event volume의 안전 경계가 깨졌으므로 현재 generation을 닫고 같은 Host에서 restart loop를 만들지 않는다. |
| force-kill 뒤 child termination 미확인 | `false` | `close_timeout`을 stable cleanup failure로 공개하고 같은 Host에서 새 child를 시작하거나 `stopped`로 가장하지 않는다. External process 상태를 확인해 새 Host를 구성해야 한다. |
| transient spawn failure after successful preflight, initialize timeout/error | `true` | mutating product command가 시작되기 전이므로 같은 validated layout으로 명시적 restart할 수 있다. |
| unexpected child exit, stdout EOF, stdin/transport failure | `true` | 이전 generation을 fence한 뒤 명시적 restart할 수 있으나 in-flight operation은 replay하지 않는다. |
| bounded Client request identity registry exhaustion | `true` | Tombstone을 evict해 old response를 오연결하지 않고 generation을 닫는다. 새 generation에서만 명시적으로 다시 시작하며 mutation을 replay하지 않는다. |
| authoritative App Server command error, read-only request timeout, turn terminal failure, Skills discovery error | Host state 불변 | connection이 살아 있으면 `ready`를 유지하고 operation-scoped recovery만 제공한다. |
| `thread/start` 또는 `turn/start` timeout | `true` | Mutation 적용 여부를 알 수 없으므로 현재 generation과 transport를 닫고 같은 generation의 후속 mutation을 금지한다. 자동 replay하지 않고 explicit restart만 허용한다. |

`recoverable: false`인 `failed` state의 `restart` 요청은 raw process를 시작하지 않고 `operation_conflict`로 거부한다.

#### In-scope Host operations

구체적인 함수명은 비규범이지만 Host의 public Interface는 다음 capability를 제공해야 한다.

| Capability | 계약 |
| --- | --- |
| lifecycle | `start`, `stop`, 명시적 `restart`, current snapshot read와 subscription |
| thread start | bound `workspaceRoot`에서 persistent thread를 시작하고 opaque `threadRef`를 반환한다. ephemeral thread와 per-call workspace override는 허용하지 않는다. |
| turn start | Host가 발급하거나 검증한 `threadRef`에 최소 text input으로 turn을 시작하고 opaque `turnRef`를 반환한다. 같은 thread의 turn은 앞선 active turn이 terminal에 도달한 뒤 순차로 시작한다. Dispatch 전 per-thread reservation을 획득하므로 동시 `startTurn` 중 정확히 하나만 raw `turn/start`를 보내고 나머지는 `operation_conflict`가 된다. Non-idempotent command를 coalesce하지 않는다. |
| cross-thread execution | 서로 다른 thread의 active turn과 interleave되는 event를 지원한다. 선택된 UI thread나 가장 최근 turn을 기준으로 event를 추론하지 않는다. |
| native Skills | `skills/list`를 bound `workspaceRoot` 하나에 대해 호출하고 product-safe summary와 discovery error를 반환한다. Host는 filesystem을 직접 scan하거나 `SKILL.md` parser를 구현하지 않는다. |
| pending interaction response | Host가 공개한 current-generation opaque `interactionRef`와 variant에 맞는 typed answer를 받아 원래 Server request에 정확히 한 번 응답한다. |

`thread/list`, `thread/read`, `thread/resume`, rename/archive, `turn/interrupt`, transcript restoration과 account/context usage는 장기적으로 같은 Host Interface가 소유하지만 이번 foundation의 public capability에는 포함하지 않는다. 해당 method를 generic passthrough로 미리 노출하지 않는다.

`threadRef`, `turnRef`, `itemRef`, `interactionRef`는 Host가 발급하고 raw identifier와 내부에서 mapping하는 browser-safe value다. 모든 ref는 발급한 generation에서만 유효하다. Restart가 새 generation을 만들면 이전 ref는 모두 `stale_reference`가 되며, persistent native thread가 app data에 남아 있어도 이번 spec은 이를 자동 remap하거나 resume하지 않는다.

`thread start`와 `turn start`는 non-idempotent command다. Browser adapter는 timeout이나 connection loss 뒤 이를 자동 retry하지 않으며, 응답을 받지 못한 caller는 outcome을 unknown으로 취급한다. Lifecycle command와 pending interaction response의 idempotency는 위 lifecycle 및 one-shot state 규칙을 따른다.

`thread/start` 또는 `turn/start` timeout은 ordinary operation timeout으로 끝내지 않는다. Host는 mutation outcome unknown을 기록하고 current generation을 recoverable `failed`로 fence하며 transport를 닫는다. `thread/start` timeout은 native identity를 추측하거나 public `threadRef`를 발급하지 않는다. `turn/start` timeout은 dispatch 전에 얻은 execution-slot reservation을 idle로 되돌리지 않고 thread-scoped `{ status: 'unknown', reason: 'start_outcome_unknown' }` reconciliation marker로 전환한다. Validated native turn identity가 없으므로 이 marker에는 `turnRef`를 만들거나 보존하지 않는다. 늦은 response나 `thread/started`·`turn/started` notification은 폐기하고 같은 generation에서 후속 mutation을 wire에 쓰지 않는다.

#### Identity and event contract

- Raw `threadId`, `turnId`, `itemId`, `requestId`는 protocol integration 내부에서 exact value로 보존한다. 제품과 browser에는 의미를 추론할 수 없는 opaque refs와 normalized correlation만 제공한다.
- JSON-RPC `RequestId`의 `string | number` type과 value를 보존한다. 숫자 `1`과 문자열 `"1"`을 합치지 않는다.
- outbound Client request와 inbound Server request는 서로 다른 ID namespace다. correlation key는 최소 `(generation, direction, typeof id, id)`를 구분한다.
- inbound message는 `id + method` Server request, `method only` Server notification, `id + result/error` Client request response로 분류한다. `id` 존재 여부만으로 response라고 판단하지 않는다.
- `initialize`, `thread/start`, `turn/start`, `skills/list`처럼 Host가 사용하는 known Client request의 success result는 package-internal generated JSON Schema로 state 변경 전에 검증한다. Malformed result는 ordinary operation error로 낮추지 않고 ref·state를 만들기 전에 non-recoverable `protocol_error`로 connection을 닫는다. Generated Client response type과 schema는 public export하지 않는다.
- normalized event는 Host instance 안에서 monotonic sequence, generation, kind, timestamp와 variant에 필요한 opaque thread·turn·item·interaction refs를 가진다. raw method명과 raw params를 browser event로 전달하지 않는다.
- stdio에서 읽은 순서는 같은 generation의 publication 순서로 보존한다. 여러 thread의 event interleaving은 정상이며 subscriber는 correlation refs로 구분한다.
- terminal 성공은 matching native terminal notification이 있을 때만 공개한다. Transport loss나 parse failure를 turn 성공·실패로 꾸미지 않는다. 별도 `connection_lost` event를 추가하지 않고 authoritative `host_state_changed`의 `status: failed` snapshot으로 표현하며, 직전 active turn은 `{ status: 'unknown', reason: 'active_connection_lost', turnRef }` reconciliation marker로 남긴다.
- missing identity, orphan event, duplicate/conflicting response와 duplicate terminal을 현재 선택 thread에 임의 귀속하지 않는다. 상태를 안전하게 유지할 수 없으면 sanitized protocol failure로 connection을 닫는다.
- 지원하지 않는 well-formed notification은 internal diagnostic으로만 남기고 browser에 raw passthrough하지 않는다. method별 product 연결 상태는 실제 normalized mapping이 생긴 경우에만 승격한다.
- Product Host composition은 raw stdio payload를 기본 debug history로 축적하거나 저장하지 않는다. Transport diagnostic이 필요하면 method direction, generation과 sanitized error code 같은 allowlisted metadata만 bounded sink에 기록하고, 기존 Runtime Harness의 raw/debug evidence와 분리한다.

이번 foundation이 공개하는 최소 discriminated event와 state effect는 다음과 같다.

| Host event | 근거가 되는 native observation | 필수 correlation | State effect |
| --- | --- | --- | --- |
| `host_state_changed` | Host lifecycle transition과 connection loss | generation | current connection snapshot을 교체한다. Connection loss에서는 `status: failed`와 sanitized failure를 authoritative하게 전달하고 별도 loss event를 중복 발행하지 않는다. |
| `thread_started` | `thread/start` response와 `thread/started` | thread | opaque thread를 한 번 등록한다. 같은 native identity의 notification은 중복 thread를 만들지 않는다. |
| `thread_status_changed` | `thread/status/changed` | thread | 해당 thread의 ephemeral status만 갱신한다. |
| `turn_started` | `turn/start` response와 `turn/started` | thread, turn | 해당 thread의 active turn을 한 번 등록한다. |
| `agent_message_delta` | `item/agentMessage/delta` | thread, turn, item | live text delta를 exact scope에 publish한다. durable transcript를 만들지 않는다. |
| `activity_started` | `item/started` | thread, turn, item | raw item을 노출하지 않고 allowlisted activity category와 running 상태를 등록한다. |
| `activity_completed` | `item/completed` | thread, turn, item | matching activity를 terminal로 닫는다. turn 자체를 terminal로 만들지 않는다. |
| `turn_completed` | `turn/completed` | thread, turn | native status와 sanitized failure를 반영하고 해당 thread의 active-turn slot을 해제하는 authoritative terminal event다. |
| `pending_interaction_added` | 지원하는 Server request | thread, turn, item, interaction | current-generation pending set에 interaction을 추가한다. |
| `pending_interaction_resolved` | typed client response 또는 `serverRequest/resolved` | thread, interaction | pending set에서 정확히 한 interaction을 terminal로 닫는다. |
| `pending_interaction_expired` | generation 종료 | interaction | response할 수 없는 이전-generation interaction을 만료한다. |
| `host_warning` | `warning`, `configWarning`, `error` 또는 sanitized protocol anomaly | 가능한 경우 thread, turn | scope가 있으면 해당 operation, 없으면 Host에 warning/error를 기록한다. turn terminal을 합성하지 않는다. |

- Host snapshot은 connection state, known thread의 ephemeral status와 execution slot, pending interaction을 포함한다. Execution slot은 dispatch 전 `starting`, 실행 중 `active`, generation loss 뒤 reconciliation이 필요한 `unknown`을 구분한다. 이미 등록된 active turn의 connection loss는 `{ status: 'unknown', reason: 'active_connection_lost', turnRef }`로 원래 `turnRef`를 보존하되 active 또는 terminal로 표현하지 않는다. `turn/start` response 전 timeout은 `{ status: 'unknown', reason: 'start_outcome_unknown' }`인 thread-scoped marker이며 `turnRef`가 없다. Agent text delta, activity log와 completed transcript는 snapshot에 축적하지 않는다.
- `turn/start` response로 turn을 먼저 등록하고 같은 identity의 `turn/started`가 뒤따르면 하나의 `turn_started` 의미로 수렴한다. 같은 규칙을 `thread/start` response와 `thread/started`에 적용한다.
- `agent_message_delta`와 item event는 matching active turn에만 연결한다. `turn_completed` 뒤의 late delta/item event는 새 turn이나 현재 선택 thread에 붙이지 않는다.
- `item/completed`는 item terminal이고 `turn/completed`만 turn terminal이다. `error` notification만으로 native completion을 추정하지 않는다.

#### Pending interaction contract

이번 foundation은 채택된 command execution, file change, permission과 user-input Server request를 product-safe discriminated pending interaction으로 정규화할 수 있어야 한다. 실제 승인 UI와 정책은 후속이다.

- pending interaction은 opaque `interactionRef`, normalized kind, correlated thread·turn·item refs, 시작 시각과 variant별 allowlisted display data만 제공한다. raw request ID, raw JSON-RPC, token과 전체 debug payload는 제공하지 않는다.
- 같은 item에 여러 callback이 올 수 있으므로 `itemId`만으로 deduplicate하지 않는다. raw request identity와 필요한 경우 `approvalId`까지 내부 correlation에 보존한다.
- interaction response는 current generation의 pending 상태에서 정확히 한 번만 전송한다. unknown, stale, already resolved와 duplicate response는 typed conflict로 거부한다.
- `serverRequest/resolved`가 먼저 도착하면 interaction을 resolved로 닫고 이후 browser response를 전송하지 않는다.
- SSE나 browser tab 연결이 끊겨도 Host의 pending interaction은 유지하며 새 subscriber의 snapshot에 다시 나타난다. App Server generation이 끝나면 pending interaction은 expired가 된다.
- 지원하지 않는 well-formed Server request는 무시하거나 자동 승인하지 않는다. Protocol-level unsupported error response write가 성공하면 scoped `host_warning`만 publish하고 Host는 `ready`를 유지한다. Malformed request/schema violation 또는 error write failure일 때만 connection failure로 전환하며 raw payload를 conversation text로 대신 전달하지 않는다.

Public answer union과 generated response mapping은 다음 최소 범위로 제한한다.

| Pending interaction kind | 허용하는 product-safe answer | Generated response mapping |
| --- | --- | --- |
| `command_approval` | `accept_once`, `decline`, `cancel` | 각각 command decision `accept`, `decline`, `cancel`로 mapping한다. Session accept, execpolicy amendment와 network-policy amendment는 노출하지 않는다. |
| `file_change_approval` | `accept_once`, `decline`, `cancel` | 각각 file-change decision `accept`, `decline`, `cancel`로 mapping한다. Session accept는 노출하지 않는다. |
| `permission_approval` | `grant_requested_for_turn` | Server request가 요청한 non-null permission profile만 granted profile로 복사하고 scope를 `turn`으로 고정한다. Browser가 임의 permission, session scope나 `strictAutoReview`를 구성할 수 없다. Explicit decline/cancel semantics는 후속 approval policy가 정하기 전까지 만들지 않는다. |
| `user_input` | question별 opaque `questionRef`와 string value 목록 | Host가 current interaction의 raw question ID로 역mapping해 generated answers map을 만든다. Unknown·duplicate question과 허용 cardinality를 벗어난 answer는 response 전 거부한다. |

위 표에 없는 answer나 policy amendment는 `invalid_request`로 거부하며 가까운 raw variant로 추측하지 않는다. `permission_approval`에서 grant하지 않으려는 경우 foundation은 response를 합성하지 않고 pending 상태를 유지한다. 후속 approval UX가 explicit decline/cancel 또는 turn interruption의 제품 의미를 정한다.

#### Browser-safe adapter and product shell

- 첫 browser adapter는 기존 코드베이스의 외부 seam을 재사용해 dedicated HTTP JSON command와 SSE snapshot/event stream으로 구현한다. `/api/runtime/*`와 namespace, state와 lifecycle owner를 공유하지 않는다.
- Browser adapter는 Host lifecycle이 제공하는 atomic subscription의 `{ snapshot, cursor, events, unsubscribe }`를 소비한다. Core subscriber 등록, snapshot capture와 bounded buffer semantics를 HTTP layer에서 다시 구현하지 않는다.
- SSE 연결은 `{ snapshot, cursor }` initial event를 먼저 flush한 뒤 buffered event와 이후 live event를 sequence 순서로 전달한다. Snapshot 취득과 live subscription 사이에 event를 잃거나 snapshot보다 앞서 event를 보내지 않는다.
- Core `events`가 `subscription_overflow`로 종료되거나 HTTP writer pending queue의 backpressure가 해소되지 않거나 overflow되면 해당 subscriber만 unsubscribe하고 SSE를 닫는다. 중간 event를 버린 뒤 cursor가 연속인 것처럼 전달하지 않으며 reconnect는 최신 atomic snapshot으로 수렴한다. HTTP writer pending queue도 고정 event-count 또는 byte budget으로 별도 bounded한다.
- Reconnect는 같은 atomic subscription으로 최신 snapshot에 수렴하지만 disconnect 동안의 agent text delta나 completed activity를 durable replay한다고 약속하지 않는다. 후속 `thread/read` transcript restoration이 이 간극을 소유한다.
- command validation failure, stale ref, lifecycle conflict와 Host unavailable을 stable error envelope로 구분한다. 최소 error code는 `invalid_request`, `host_not_ready`, `stale_reference`, `operation_conflict`, `request_timeout`, `operation_failed`, `transport_lost`, `protocol_error`를 표현할 수 있어야 한다. Authoritative App Server error와 read-only `request_timeout`·`operation_failed`는 connection이 살아 있으면 같은 generation의 `ready` snapshot을 유지한다. `thread/start`·`turn/start` timeout의 initiating response는 `request_timeout`이어도 authoritative Host snapshot은 recoverable `failed`이며 이후 mutation은 `host_not_ready`다.
- product route는 same-origin local shell만 mutation할 수 있게 제한한다. wildcard CORS로 product command나 interaction response를 임의 웹 origin에 노출하지 않는다.
- Product HTTP/SSE listener는 explicit loopback 주소에만 bind하고 wildcard interface bind를 사용하지 않는다.
- Browser DTO와 network response에는 raw JSON-RPC, generated type, raw IDs, auth token, environment, `packageRoot`·`appDataRoot`, child stderr와 Runtime Diagnostic History debug evidence가 없어야 한다.
- 최소 제품 React shell은 browser-safe adapter만 import하고 Host connection/loading/error 상태를 렌더링한다. thread 목록, transcript, approval controls와 학업 UI는 후속이다.

### Data and State Flow

1. Local companion이 세 root의 immutable raw input을 명시적으로 구성해 Host를 만든다.
2. Host의 첫 `start()`가 layout과 package-owned binary를 검증하고 app-managed runtime-home pair를 준비해 cache한다.
3. Host가 bound `workspaceRoot`에서 App Server child를 spawn하고 `initialize` response와 `initialized` notification을 완료한 뒤 `ready` snapshot을 공개한다.
4. Host command가 새 persistent thread 또는 해당 thread의 다음 text turn을 시작한다. Raw identifier는 Host 내부 correlation table에 저장되고 caller에는 opaque ref가 반환된다.
5. Transport가 response, Server request와 Server notification을 방향별로 분리한다. Host는 generation과 exact identity로 normalized state/event 또는 pending interaction을 갱신한다.
6. Local companion은 sanitized snapshot과 event만 HTTP/SSE로 전달한다. React shell은 이를 browser state로 사용한다.
7. 사용자가 후속 UI 또는 adapter test를 통해 pending interaction에 답하면 opaque ref가 Host 내부의 exact Server request로 해석되고 typed response가 한 번 전송된다.
8. process loss가 발생하면 Host는 현재 generation을 `failed`로 닫고 pending operation을 종료한다. 명시적 restart만 새 generation을 만들며 이전 mutation이나 interaction response를 replay하지 않는다.

### Failure Behaviour

| 실패 | Host 동작 | Caller/browser 관측 |
| --- | --- | --- |
| invalid/overlapping root, missing `packageRoot`·`workspaceRoot`, app-data ancestor inspection·생성 실패, missing binary, unreadable package pin metadata, pin mismatch | child spawn 전에 fail closed. 안전하게 만들 수 있는 missing `appDataRoot`는 허용 | `failed`, non-recoverable until configuration changes |
| spawn 또는 initialize timeout/error | child를 정리하고 start를 실패 | sanitized failure와 명시적 restart 가능 여부 |
| command validation 또는 wrong workspace/thread ref | raw request를 보내지 않음 | `invalid_request` 또는 `stale_reference` |
| same-thread active turn 중 새 turn | queue나 steer로 바꾸지 않고 거부 | `operation_conflict` |
| authoritative App Server request error 또는 read-only request timeout | 해당 operation만 실패시키고 transport가 살아 있으면 Host는 `ready` 유지 | `operation_failed` 또는 `request_timeout`; 자동 retry 없음 |
| `thread/start`·`turn/start` timeout | mutation outcome을 unknown으로 기록하고 current generation과 transport를 recoverable failure로 닫음 | initiating `request_timeout`, authoritative `failed`; 후속 mutation은 `host_not_ready`, replay 없음 |
| known Client request의 malformed success result | ref나 Host state를 만들기 전에 generated schema validation으로 connection을 unsafe하게 닫음 | `protocol_error`, non-recoverable |
| malformed JSON, ID type 손실, 안전하게 route할 수 없는 protocol message | pending operation을 종료하고 connection을 unsafe로 닫음 | `protocol_error`, non-recoverable; binary/schema 재검증 뒤 새 Host 필요 |
| lower observation queue hard cap 도달 | queued raw observation을 무한 축적하지 않고 current generation을 안전하게 종료 | sanitized non-recoverable `protocol_error`; terminal 뒤 추가 publication 없음 |
| lower observation stream의 두 번째 consumer 시도 | observation을 consumer 사이에 나누지 않고 deterministic internal conflict로 거부 | 기존 single consumer와 connection state는 변경하지 않음 |
| unexpected exit, stdout EOF, stdin failure | generation을 종료하고 모든 pending Client request를 reject하며 pending interaction을 expire | `transport_lost` error와 authoritative `host_state_changed(status: failed)`; active turn은 snapshot의 unknown/reconciliation-needed marker로 남기고 terminal을 합성하지 않음 |
| Client request identity hard cap 도달 | 새 request를 wire에 쓰기 전에 generation을 종료하고 tombstone registry를 정리 | recoverable `transport_lost`; explicit restart만 허용하고 거부된 mutation을 자동 replay하지 않음 |
| stale/duplicate interaction response | App Server에 아무것도 보내지 않음 | `operation_conflict` 또는 `stale_reference` |
| unsupported well-formed Server request | 자동 승인·무시하지 않고 protocol-level unsupported error response | write 성공 시 scoped `host_warning`과 같은 generation `ready`; write 실패 시 generation failure, raw payload 비노출 |
| Skills discovery error | Host 연결을 끊지 않고 workspace-scoped discovery failure로 반환 | 빈 결과와 구분되는 typed error |
| browser/SSE disconnect | Host process와 pending interaction을 유지 | reconnect 후 current snapshot으로 수렴 |
| stop deadline 초과 | 강제 종료 뒤 exit를 관측하면 모든 connection-scoped state를 닫음. Force-kill deadline 뒤에도 미관측이면 fail closed | exit 확인 시 `stopped`; 미확인 시 non-recoverable cleanup failure이며 성공으로 보고하지 않음 |

### Compatibility and Migration

- 기존 `.ay-ple/runtime-codex/*`와 `.ay-ple/runtime-harness/*`는 developer-only 상태로 남기며 product `appDataRoot`로 자동 이전하거나 읽지 않는다.
- 기존 `CodexRawClient`, `CodexRuntimeAdapter`, `AgentRuntimeKernel`, `/api/runtime/*`와 Inspector 동작을 회귀 없이 유지한다. Host 구현을 위해 lower transport를 추출하거나 확장할 수 있지만 Runtime Harness public contract를 Host contract로 바꾸지 않는다.
- 이번 spec은 product database, transcript persistence, workspace-local 학업 state schema와 migration을 추가하지 않는다.
- Host 또는 browser adapter를 rollback해도 기존 Runtime Harness와 사용자 workspace 파일을 바꾸지 않아야 한다. Native Codex session이 app data에 남을 수 있으나 rollback 과정에서 임의 삭제하지 않는다.
- 실제 product path에 연결한 method만 `packages/runtime-codex/codex-method-decisions.json`의 integration을 `client-host`, `web-adapter` 또는 `product-ui`로 단계적으로 승격하고 generated inventory를 다시 검증한다. Generic transport가 message를 읽었다는 사실만으로 승격하지 않는다.

## Implementation Decisions

| 결정 | 적용 결과 |
| --- | --- |
| Host는 `AgentRuntimeKernel`과 별도 deep module이다. | developer-only run lifecycle과 multi-thread 제품 client의 상태·실패 semantics를 섞지 않는다. |
| Host instance는 one workspace, one App Server process를 소유한다. | workspace correlation과 native discovery가 명확하고 여러 thread는 같은 long-lived process를 공유한다. |
| product layout은 세 root의 필수 주입으로 시작한다. | OS default와 packaging을 기다리지 않고 채택한 root 불변 조건을 먼저 실행 가능하게 만든다. |
| restart는 명시적이고 mutation replay는 없다. | process loss 뒤 unknown side effect를 thread·turn·approval 중복으로 만들지 않는다. |
| Request timeout은 operation 의미로 분류한다. | Read-only timeout은 same-generation operation failure로 남기고, non-idempotent `thread/start`·`turn/start` timeout은 unknown outcome이므로 generation을 fence한다. |
| identity는 generation·direction·ID type까지 exact하게 보존한다. | interleaved thread와 양방향 JSON-RPC ID 충돌을 안전하게 처리한다. |
| public event와 pending interaction은 allowlisted discriminated union이다. | generic raw event bus를 만들지 않고 browser가 protocol 세부사항에 의존하지 않는다. |
| native `AGENTS.md`와 Skills를 재사용한다. | Host가 별도 instruction·Skill discovery engine을 만들지 않는다. |
| browser adapter는 HTTP command + SSE snapshot/event를 사용한다. | 기존 Express/SSE 검증 경험을 재사용하면서 raw stdio를 browser 밖에 둔다. |
| product mutation은 same-origin local boundary로 제한한다. | local companion의 command·interaction response를 임의 외부 웹 origin에 노출하지 않는다. |

## Testing Decisions

가장 높은 실용 Host core seam은 **public Headless Codex Client Host Interface + 실제 child process로 실행한 deterministic fake App Server + stdio JSONL**이다. Private parser나 `CodexRawClient` mock만으로 lifecycle, process generation과 양방향 identity를 증명하지 않는다. Browser adapter는 실제 loopback HTTP/SSE 한 단계 위에서 별도로 검증한다.

기존 `packages/runtime-codex/src/testing/fake-codex-app-server.ts` 패턴을 확장하되, raw debug log를 제품 Interface에 노출해 assertion하지 않는다. Fixture-owned journal로 spawn generation, child env/cwd, outbound protocol과 response를 관측한다.

| Seam | 필수 시나리오 |
| --- | --- |
| Layout unit/contract | three-root normalization, app data/workspace overlap, package binary pin, runtime-home pair, `process.cwd()` fallback 부재 |
| Transport lifecycle·pump | concurrent start coalescing, spawn settlement 전 close가 모든 start를 `transport_closed`로 reject, late spawn success 차단, child cleanup, force-kill 뒤 exit 미관측 시 `close_timeout`, single observation consumer, initialize dispatch 전 active pump, injected queue cap의 terminal safety failure와 terminal 뒤 close |
| Host + child fake | concurrent start coalescing, initialize 1회, `starting → stopping → stopped` lifecycle epoch fencing, 같은 process에서 thread A/B와 A1→A2 sequential turn, A1/B1 event interleaving, idempotent stop |
| Identity·response routing | Client request numeric ID와 동시 Server request의 같은 ID, numeric/string ID 구분, malformed `initialize`·`thread/start`·`turn/start` success result의 fail-closed, late/orphan event, duplicate response·terminal이 다른 scope를 바꾸지 않음 |
| Pending interaction | command/file/permission/user-input answer union과 generated mapping, 같은 item의 여러 callback, 역순 response, one-shot answer, policy amendment 거부, `serverRequest/resolved` race, browser disconnect 동안 pending 유지 |
| Failure/restart | failure class별 `recoverable` mapping, initialize 전·ready·active turns·pending interaction 중 process exit, mutation은 적용됐지만 response만 timeout된 `thread/start`·`turn/start`, timeout 직후 second mutation wire 차단, late response/started fencing, pending Promise 종료, active-loss의 `turnRef` 보존 marker와 response 전 start-timeout의 `turnRef` 없는 marker, old generation ref fencing, explicit restart 후 새 command 가능, 자동 replay 부재 |
| Native context | exact workspace child/thread/skills cwd, `instructionSources`와 sentinel Skill의 native result, Host-owned parser 부재, discovery error |
| Browser adapter | explicit loopback-only listener의 real command/SSE, subscribe-snapshot race 중 atomic `{ snapshot, cursor }`와 buffered sequence ordering, deterministic slow-subscriber overflow disconnect와 reconnect convergence, read-only operation error 뒤 같은 generation `ready` 유지와 mutation timeout 뒤 recoverable `failed`, stable error mapping, same-origin mutation, recursive DTO 검사로 raw IDs·protocol·secret·debug field 부재, product diagnostic sink의 raw payload 부재 |
| Product shell | desktop browser에서 loading→ready와 forced failure→recoverable error 상태를 adapter를 통해 표시하며 Runtime Inspector state를 import하지 않음 |

Host 전용 opt-in live parity는 package-owned pinned binary와 명시적 세 root를 사용한다. Login이나 OAuth를 시작하지 않고 기존 인증을 preflight한 뒤, 한 Host generation에서 thread 두 개와 같은 thread의 순차 turn 두 개, streaming/terminal correlation과 workspace sentinel Skill discovery를 확인한다. Model 응답 문구의 정확 일치, 실제 approval 유발과 process crash는 비결정적이므로 fake contract test가 소유한다. Live 명령과 안전한 실행 조건은 구현되는 package README가 소유한다.

PR-ready regression은 변경 범위에 맞는 targeted test와 함께 다음을 모두 통과해야 한다.

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint -w @ay-ple/inspector`
- 기존 Inspector desktop Playwright gate
- 새 제품 shell을 추가하거나 변경한 slice의 desktop browser gate

구현 완료 시 관련 package README, Runtime Harness 구현 지도와 sparse method decision을 실제 연결 단계에 맞게 갱신하고 generated method inventory가 결정적으로 재생성되는지 검증한다.

## Out of Scope

- Account status, ChatGPT managed login/cancel/logout와 auth UX
- workspace chooser·registry, 최근 workspace, OS별 app data default와 packaged entrypoint
- thread list/read/resume, rename/archive와 browser refresh 뒤 conversation 선택 복원
- 완성된 transcript, activity card, approval/user-input controls와 `turn/interrupt` UX
- model, reasoning effort, token usage, context window와 rate-limit toolbar
- `ModelingRecipe`, `ModelingInvocation`, `ModelingRun`, SourceSelection과 structured output translation
- RawMaterial, StatePatch, Review, UserConfirmation과 SemesterModel 저장
- automatic restart, mutating command replay와 active turn의 process-crash 후 실행 계속
- Host event·transcript·pending interaction의 durable persistence와 Runtime Diagnostic History 재사용
- 모든 raw method의 generic passthrough, 범용 event bus와 raw item 1:1 UI
- built-in Memories 활성화, 별도 instruction·Skill·memory engine, plugin·MCP 관리 UI
- sandbox·approval product policy, cloud threat model, remote browser access와 여러 account
- ACP 또는 두 번째 Agent engine abstraction
- mobile·small-screen 최적화

## Open Questions

None.

## Further Notes

- 이 spec은 대화에서 확인한 다음 canonical 작업을 [개발 백로그](../product/ay-ple-development-backlog.md)의 순서대로 구체화한다. 완료 상태와 후속 우선순위는 계속 backlog만 소유한다.
- Root ownership은 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)과 [Codex Runtime 격리](../architecture/codex-runtime-isolation.md), protocol isolation은 [ADR 0005](../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md), 후속 제품 작업 조합은 [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)을 따른다.
- Package, endpoint와 React app의 정확한 이름 및 파일 배치는 ticket-level non-blocking 결정이다. ADR 0008이 의도적으로 package명을 고정하지 않으므로 spec readiness에 영향을 주지 않는다.
