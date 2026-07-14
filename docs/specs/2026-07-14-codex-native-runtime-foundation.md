# Codex-native Runtime Foundation

## Agent triage

- State: ready-for-ticketing
- Surface: local-spec
- Next actor: /to-tickets

## Problem Statement

현재 `@ay-ple/runtime-codex`에는 developer-only Runtime Harness와, 모든 capability를 한곳에 모은 `HeadlessCodexClientHost` prototype이 함께 있다. Runtime Harness는 한 run의 진단과 parity 확인에는 유효하지만, 여러 native Codex conversation을 같은 process에서 독립적으로 진행하는 제품 runtime foundation은 아니다. 기존 Host는 child/process, JSON-RPC, conversation lifecycle, generation-scoped ref, global event publication과 제품 layout을 한 state machine에 결합한다. 이 Seam을 그대로 강화하면 pinned Codex의 method별 lifecycle보다 AY-PLE이 독자적으로 만든 Host 정책이 identity·ordering·failure 의미를 지배한다.

[ADR 0010](../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)은 기존 Host를 `CodexAppServerConnection → CodexConversationRuntime`으로 대체한다. 구현 기준은 protocol shape만 보고 새 TypeScript semantics를 만드는 것이 아니라, pinned `@openai/codex@0.144.0`과 exact upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`의 first-party external client·UI runtime·method source/tests가 이미 사용하는 responsibility와 observable behavior를 TypeScript external stdio Seam에 옮기는 것이다.

이 foundation은 장기적으로 Codex Chat Interface의 multi-turn, streaming, interrupt/steer, thread read/resume, activity와 추가 Server request를 source-guided tracer로 확장할 수 있어야 한다. 그러나 아직 채택하지 않은 method나 AY-PLE product/browser policy를 선제 구현해서는 안 된다. 첫 구현은 T0, T0-C와 T0.1만으로 Connection, per-thread Runtime과 command approval response lease가 실제 child Seam에서 성립함을 증명한다.

## Solution

`@ay-ple/runtime-codex`에 다음 세 Seam을 만든다.

```text
external preparation capability
        │
        ▼
CodexAppServerConnection        package-private
        │
        ▼
CodexConversationRuntime       public ./conversation surface
```

- External preparation은 [ADR 0006](../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 three-root 검증, package-owned binary와 runtime-home pair를 opaque process/workspace capability로 만든다. 이는 Codex protocol semantics가 아니다.
- `CodexAppServerConnection`은 child/process, sole JSONL reader, serialized writer, generated wire validation, direction-aware active exact `RequestId` routing, inbound Server request response lease와 disconnect/current-pending settlement만 소유한다.
- `CodexConversationRuntime`은 native thread/turn/item identity, native `ThreadId`별 projection, adopted method의 response/notification convergence, bounded early observation FIFO, semantic terminal과 active command approval만 소유한다.
- Public caller는 `runNewConversation()` 한 번으로 T0를 실행하고, 결과에 raw native ID를 노출하지 않는 opaque `CodexConversation` capability를 받는다. 이 capability는 native `ThreadId`를 remap한 durable catalog가 아니라 current Runtime이 native identity를 품은 object capability다. 후속 tracer는 같은 capability에 multi-turn/control/read 기능을 additive하게 연결할 수 있다.
- `AYPLE adapter`, browser transport, product approval policy와 `ModelingInvocation`/`ModelingRun` mapping은 foundation downstream이며 이 spec의 구현·readiness 조건이 아니다.

## User Stories

1. Runtime consumer로서, package-owned exact Codex pin을 명시적인 app data와 workspace에서 시작하고 싶다. 그래야 ambient `PATH`나 `process.cwd()`가 runtime identity와 작업 위치를 결정하지 않는다.
2. Runtime consumer로서, 한 process에서 서로 다른 native conversation을 동시에 실행하고 싶다. 그래야 Thread A의 지연이 unrelated Thread B의 완료를 막지 않는다.
3. Runtime consumer로서, response와 notification이 어느 순서로 도착해도 pinned method lifecycle에 따라 같은 turn으로 수렴하고 싶다. 그래야 scheduler interleaving을 global wire-order 정책으로 잘못 해석하지 않는다.
4. Runtime consumer로서, completed AgentMessage와 authoritative `turn/completed`가 모두 확인된 안전한 결과만 받고 싶다. 그래야 partial observation이나 non-terminal `error`가 성공으로 보이지 않는다.
5. Runtime consumer로서, regular command approval에 `approve_once | decline | cancel`을 정확히 한 번 답하고 submission과 command outcome을 구분하고 싶다. 그래야 response write를 command success로 오해하지 않는다.
6. Runtime maintainer로서, generated schema, exact-pin source evidence, fake/live conformance와 method ledger가 같은 adoption 사실을 설명하게 하고 싶다. 그래야 pin upgrade가 새 method를 자동 채택하거나 stale oracle을 보존하지 않는다.
7. Runtime Harness 사용자로서, 기존 `CodexRawClient`, `CodexRuntimeAdapter`, capability/status surface와 Inspector 진단 경로를 그대로 사용하고 싶다. 그래야 제품 runtime 교체가 developer tooling 회귀가 되지 않는다.

## Current State and Constraints

| 영역 | 현재 구현 | 이 spec의 채택 목표 | Deferred |
| --- | --- | --- | --- |
| Package pin | `package.json`, lock과 package-owned binary가 `0.144.0`에 맞는다. Exact source gitlink/provenance gate는 아직 없다. | npm attestation, lock, generated digest와 `references/openai-codex` exact commit을 dev-only provenance chain으로 검증한다. | 다음 pin의 method adoption 판단 |
| External client | `CodexStdioTransport`와 `CodexRawClient`가 일부 RPC/notification을 처리한다. | Python SDK/Rust client의 sole reader, serialized writer, active map, early FIFO와 disconnect settlement를 새 Connection owner 뒤에 port한다. | Rust sidecar 또는 Python production dependency |
| Conversation | `HeadlessCodexClientHost`가 generation ref/global event state를 소유한다. Durable consumer는 없다. | Native `ThreadId`별 Runtime projection과 opaque conversation capability로 교체한다. | Resume/read와 durable capability serialization |
| Layout | `ProductRuntimeLayout`이 세 root, binary pin과 runtime-home pair를 검증하지만 product-named result를 공개한다. | 검증 primitive를 `./preparation` opaque capability로 추출하고 launcher `cwd`와 thread workspace `cwd`를 분리한다. | OS default path, chooser와 registry |
| Generated artifacts | Generated protocol과 sparse v1 `codex-method-decisions.json`이 있다. Current generator는 tracked output을 먼저 바꿀 수 있다. | Ledger v2, read-only verify, deterministic A/B staging과 rollback 가능한 promotion을 먼저 구현한다. | Product tracer coverage |
| Runtime Harness | Server/Inspector가 root, `./capabilities`, `./testing`의 기존 surface를 사용한다. | 이 surface와 fake App Server를 developer Harness 전용으로 보존한다. | Harness를 ConversationRuntime으로 재작성 |
| Public runtime | `./conversation`과 `./preparation` export가 없다. | Development/types/default condition에서 동일한 explicit subpath를 제공한다. | Browser-safe adapter와 HTTP/SSE |

Generated schema는 wire direction과 shape만 소유한다. Python external stdio client는 child lifecycle·sole reader·serialized writer·active response routing·early turn staging·process loss settlement의 가장 가까운 first-party reference다. Rust `codex-app-server-client`는 typed active routing과 Server response facade를, TUI `ThreadEventStore`와 pending request 처리는 per-thread projection과 remove-on-resolution을, method source/tests와 live binary는 identity authority·legal ordering·terminal 의미를 소유한다. [`codex-method-decisions.json`](../../packages/runtime-codex/codex-method-decisions.json)과 generated [method inventory](../architecture/codex-app-server-method-inventory.md)는 adoption/coverage ledger일 뿐 lifecycle 의미의 근거가 아니다.

## Implementation Contract

### Module Responsibilities and Seams

| Module | 책임 | 책임이 아닌 것 |
| --- | --- | --- |
| `runtime-preparation` | Three-root canonicalization·overlap, package-owned binary/pin, `CODEX_HOME`·`CODEX_SQLITE_HOME` pair, launcher/workspace capability | Protocol lifecycle, native identity, product workspace registry |
| `CodexAppServerConnection` | Dedicated child, stdin/stdout/stderr task ownership, one JSONL ingress, one serialized writer, generated validator, exact active Client waiter, active Server response lease, process terminal·reap | Thread transcript, method terminal, product error wording |
| `CodexConversationRuntime` | Native `ThreadId`별 projection, T0/T0-C/T0.1 convergence·correlation, safe result, active approval lifecycle | Raw JSONL, process signals, global publication order, browser state |
| Runtime Harness | Existing raw client/adapter/status/capability, Runtime Diagnostic History와 Inspector path | Foundation conformance 또는 product conversation state |
| Future AYPLE adapter | 검증된 Runtime capability의 제품 mapping | Connection/Runtime lifecycle 재정의 |

Production dependency는 preparation에서 supplied capability를 받아 Connection을 열고, Runtime이 Connection의 typed internal event/command seam을 소비하는 한 방향이다. Connection concrete type, router, writer와 per-thread reducer는 package root·`./conversation`·`./preparation`에서 export하지 않는다. Unit test는 package internal file을 직접 검증할 수 있지만 downstream test double Interface로 만들지 않는다.

다음은 책임 위치를 설명하는 비규범적인 file 배치 예시다.

```text
packages/runtime-codex/src/
  preparation.ts
  conversation.ts
  internal/app-server-connection/
  internal/conversation-runtime/
  internal/codex-app-server-protocol/     # existing generated input
  testing/fake-codex-app-server.ts         # existing Harness fake, preserved
  testing/conformance/                     # new typed actual-child fake, not exported
```

### Interfaces and Invariants

#### Public Package Surface

##### `@ay-ple/runtime-codex/preparation`

```ts
export type CodexRuntimePreparationInput = Readonly<{
  packageRoot: string
  appDataRoot: string
  workspaceRoot: string
}>

export type CodexRuntimeRootName =
  | 'packageRoot'
  | 'appDataRoot'
  | 'workspaceRoot'

export type CodexRuntimePreparationFailureCode =
  | 'invalid_root'
  | 'root_not_directory'
  | 'root_overlap'
  | 'binary_not_found'
  | 'binary_not_executable'
  | 'binary_not_package_owned'
  | 'binary_version_unreadable'
  | 'package_pin_unreadable'
  | 'binary_pin_mismatch'
  | 'runtime_home_preparation_failed'

export class CodexRuntimePreparationError extends Error {
  readonly code: CodexRuntimePreparationFailureCode
  readonly root?: CodexRuntimeRootName
}

export type PreparedCodexProcess = OpaqueCapability
export type PreparedCodexWorkspace = OpaqueCapability

export type PreparedCodexRuntime = Readonly<{
  process: PreparedCodexProcess
  workspace: PreparedCodexWorkspace
}>

export function prepareCodexRuntime(
  input: CodexRuntimePreparationInput,
): Promise<PreparedCodexRuntime>
```

`OpaqueCapability`는 설명용 표기다. 실제 declaration은 caller가 필드를 구성·열람·직렬화할 수 없는 private/unique brand를 사용한다. `PreparedCodexProcess`는 package-owned `codex app-server` launch descriptor, canonical `appDataRoot` launcher `cwd`, `CODEX_HOME=<appDataRoot>/codex/home`과 `CODEX_SQLITE_HOME=<appDataRoot>/codex/sqlite`를 내부에 가진다. `PreparedCodexWorkspace`는 canonical `workspaceRoot`를 내부에 가지며 `thread/start.cwd`에만 사용된다. Capability나 error message는 실제 path·environment 값을 노출하지 않는다.

`packageRoot`와 `workspaceRoot`는 existing directory여야 하고 `appDataRoot`는 safely creatable directory target이어야 한다. 세 canonical root는 동일하거나 서로 ancestor/descendant일 수 없다. Binary는 `packageRoot` 아래 workspace install이 소유하고 executable이어야 하며 `codex --version`, exact package pin과 lock이 일치해야 한다. Runtime-home pair는 `appDataRoot`의 strict descendant이고 서로 겹치지 않아야 한다.

##### `@ay-ple/runtime-codex/conversation`

```ts
import type {
  PreparedCodexProcess,
  PreparedCodexWorkspace,
} from '@ay-ple/runtime-codex/preparation'

export type CodexConversation = OpaqueCapability

export type CodexConversationInput = Readonly<{
  type: 'text'
  text: string
}>

export type CodexAgentMessage = Readonly<{
  type: 'agent-message'
  text: string
}>

export type CodexConversationFailureCode =
  | 'invalid_input'
  | 'capacity_exhausted'
  | 'server_rejected'
  | 'turn_failed'
  | 'turn_interrupted'
  | 'projection_unavailable'
  | 'protocol_violation'
  | 'transport_lost'
  | 'operation_timeout'
  | 'approval_handler_failed'
  | 'runtime_closed'

export type CodexConversationFailureStage =
  | 'thread_start'
  | 'turn_start'
  | 'turn_execution'
  | 'command_approval'

export type CodexConversationFailureEffect =
  | 'known_not_sent'
  | 'known_rejected'
  | 'thread_created'
  | 'acceptance_unknown'
  | 'accepted_execution_unknown'
  | 'known_terminal'

export type CodexConversationFailure = Readonly<{
  code: CodexConversationFailureCode
  stage: CodexConversationFailureStage
  effect: CodexConversationFailureEffect
  message: string
}>

export type CodexNewConversationOutcome =
  | Readonly<{
      ok: true
      conversation: CodexConversation
      messages: readonly [CodexAgentMessage, ...CodexAgentMessage[]]
      finalMessage: string
    }>
  | Readonly<{
      ok: false
      conversation?: CodexConversation
      failure: CodexConversationFailure
    }>

export type CodexCommandApprovalDecision =
  | 'approve_once'
  | 'decline'
  | 'cancel'

export type CodexCommandApprovalSubmission =
  | Readonly<{ status: 'submitted' }>
  | Readonly<{ status: 'already_answered' }>
  | Readonly<{ status: 'stale' }>
  | Readonly<{ status: 'delivery_unknown' }>

export type CodexCommandApprovalRequest = Readonly<{
  kind: 'command-execution'
  respond(
    decision: CodexCommandApprovalDecision,
  ): Promise<CodexCommandApprovalSubmission>
}>

export type CodexCommandApprovalHandler = (
  request: CodexCommandApprovalRequest,
) => void | Promise<void>

export type CodexConversationRuntimeFailureCode =
  | 'invalid_prepared_capability'
  | 'runtime_open_failed'
  | 'runtime_close_failed'

export class CodexConversationRuntimeError extends Error {
  readonly code: CodexConversationRuntimeFailureCode
  readonly stage: 'spawn' | 'initialize' | 'initialized' | 'close'
}

export interface CodexConversationRuntime {
  runNewConversation(input: Readonly<{
    workspace: PreparedCodexWorkspace
    input: CodexConversationInput
    onCommandApproval?: CodexCommandApprovalHandler
  }>): Promise<CodexNewConversationOutcome>

  close(): Promise<void>
}

export function openCodexConversationRuntime(input: Readonly<{
  process: PreparedCodexProcess
}>): Promise<CodexConversationRuntime>
```

`openCodexConversationRuntime()`의 bootstrap/initialize 실패와 `close()`의 unproven cleanup만 safe `CodexConversationRuntimeError`로 reject한다. `runNewConversation()`의 expected protocol, server, transport와 semantic outcome은 discriminated result로 반환한다. 모든 public `message`는 code별 constant allowlist이며 raw server error, stderr, JSON, native ID, path, command, cwd와 reason을 포함하지 않는다.

`input.type`은 현재 `text` 하나만 허용한다. `text`는 빈 문자열이 아니어야 하며 normalization, trim과 truncation을 하지 않는다. Serialized outbound frame cap을 넘는 input은 `RequestId` allocation과 write 전에 `invalid_input`/`known_not_sent`로 끝난다.

`CodexConversation`은 native `ThreadId`를 별도 UUID로 remap하지 않는다. Current Runtime attachment를 통해 native identity를 품지만 public field, JSON serialization과 equality/persistence contract를 제공하지 않는다. Runtime close 뒤 새 operation을 할 수 없다는 사실은 native thread identity가 stale해졌다는 뜻이 아니다. Future `runTurn`, `read`, `resume`, activity와 control Interface는 owning tracer가 source contract를 채택할 때 이 capability 또는 Runtime Interface에 additive하게 추가한다.

기본 사용은 다음과 같다.

```ts
const prepared = await prepareCodexRuntime({
  packageRoot,
  appDataRoot,
  workspaceRoot,
})
const runtime = await openCodexConversationRuntime({
  process: prepared.process,
})

try {
  const outcome = await runtime.runNewConversation({
    workspace: prepared.workspace,
    input: { type: 'text', text: '이 자료를 요약해 줘' },
    onCommandApproval: async (request) => {
      await request.respond('decline')
    },
  })

  if (outcome.ok) {
    console.log(outcome.finalMessage)
  }
} finally {
  await runtime.close()
}
```

#### Connection Invariants

##### Bootstrap과 task ownership

1. `openCodexConversationRuntime()`은 supplied process capability로 dedicated `codex app-server` child를 한 번 spawn한다. stdin/stdout/stderr는 pipe로 소유하고 partial spawn failure도 kill/reap한다.
2. Stdout byte framing과 envelope dispatch를 소유하는 reader는 정확히 하나다. Individual request waiter는 stdout을 읽지 않는다.
3. Client request, `initialized`, unsupported/supported Server response는 하나의 serialized writer queue를 통과한다. JSONL frame은 한 번에 완성해 write하고 writer callback은 peer receipt나 semantic effect를 뜻하지 않는다.
4. `initialize`는 fixed client info `{ name: 'ay_ple_codex_conversation_runtime', title: 'AY-PLE Codex Conversation Runtime', version: '0.0.0' }`와 `capabilities: null`을 보낸다. Response를 generated schema로 확인한 뒤에만 `initialized`를 write하며, `initialized` writer settlement 전에는 Runtime을 caller에게 공개하지 않는다.
5. Initialize response 전 notification은 bounded validated dispatch에 stage할 수 있지만 inbound Server request는 same-ID fallback을 즉시 writer에 넣어 bootstrap deadlock을 만들지 않는다.
6. Child exit, stdout EOF/read fault, stdin write fault와 explicit close는 같은 terminal arbiter에서 admission stop, current-pending settlement와 cleanup을 한 번만 수행한다.

##### Exact `RequestId`

- Client `RequestId`는 Connection이 `1`부터 시작하는 positive safe integer monotonic allocator로 생성한다. Caller는 ID를 공급하지 않는다. Connection lifetime 안에서 재사용하지 않으며 `Number.MAX_SAFE_INTEGER` 소진은 새 admission의 `known_not_sent` capacity failure다. 이는 settled-ID tombstone이 아니다.
- Inbound ID는 direction과 primitive type을 보존한다. String은 decoded string value, number는 finite safe integer만 허용한다. Fraction, exponent로 표현된 non-integer, unsafe integer와 negative zero는 framing/envelope trust failure다.
- Parser는 `JSON.parse` 전에 top-level duplicate member를 탐지하고 거부한다. `id`, `method`, `params`, `result`, `error`, `trace`를 포함한 duplicate top-level key를 last-wins로 해석하지 않는다.
- Internal key는 `client:number:<canonical>`·`client:string:<utf8-length>:<value>`와 server-direction equivalent처럼 direction/type/value를 구분한다. String `"1"`과 number `1`, Client와 Server ID `1`은 서로 다른 route다.
- Active Client ID collision은 new frame을 write하기 전에 거부하고 기존 waiter를 유지한다. 첫 matching response/error는 active map에서 waiter를 remove한 뒤 settle한다. 이후 unknown·late response는 validation 가능한 envelope까지만 소비하고 public mutation 없는 map-miss no-op다.
- Active Server ID의 same method/safe native scope exact replay는 기존 lease로 coalesce하고 public handler를 다시 호출하지 않는다. Active ID가 다른 method 또는 safe scope와 충돌하면 response authority가 모호하므로 Connection terminal이다. Lease removal 뒤 same ID에 대한 process-lifetime 허용/금지 verdict나 tombstone은 만들지 않는다.

##### Validation tier와 Server request fallback

| Inbound | Validation | Disposition |
| --- | --- | --- |
| Active Client response/error | Exact envelope + stored method success schema 또는 generic error schema | First settlement remove-once; payload invalid는 해당 waiter만 failure |
| Adopted/tolerated T0 notification | Exact envelope + generated params + native scope | Runtime route 또는 operation-local validation failure |
| Unadopted known notification | Exact envelope와 method classification | Semantic projection 없이 sanitized no-op diagnostic |
| Stable-known Server request with valid params | Exact ID/method + generated params | T0.1 override 외 `-32601`, constant `Method not supported` same-ID error |
| Stable-known Server request with invalid params | Exact ID/method는 신뢰할 수 있으나 generated params가 invalid | `-32602`, constant `Invalid params` same-ID error; public handle 0회 |
| Experimental-only/future unknown Server request | Exact ID/method envelope | Typed params로 해석하지 않고 같은 `-32601` response |
| T0.1 regular command request | Full generated params + Runtime scope/variant projection | Active lease 또는 constant `-32000` variant/handler error |

Malformed JSONL, invalid UTF-8, top-level envelope direction을 분류할 수 없는 shape, invalid exact ID와 duplicate top-level member는 Connection terminal이다. Schema-valid envelope의 active response payload mismatch는 owning waiter만 실패시키고 unrelated request/thread를 계속 진행한다. Invalid adopted notification은 state를 mutate하지 않는다. Safe native scope가 신뢰되면 owning operation만 `protocol_violation`으로 끝내고, scope를 신뢰할 수 없으면 sanitized no-op 뒤 필요한 operation이 deadline으로 끝나게 한다. 이 두 경우를 permanent actor poison이나 connection-wide contradiction lattice로 확대하지 않는다. 단, 아직 어떤 authoritative `thread/start` response에도 결합되지 않은 `thread/started`는 RequestId가 없어 concurrent pending operation 중 하나에 안전하게 귀속할 수 없다. 이는 pinned response-first 계약과 routing trust 위반이므로 Connection terminal이며 모든 current pending을 stage에 맞춰 settle하고 public thread identity를 만들지 않는다.

### Data and State Flow

#### Runtime Lifecycle and Ordering

##### T0 new conversation

`runNewConversation()`은 다음 barrier를 순서대로 만족한다.

1. Active operation/projection capacity와 outbound request capacity를 pre-wire에 reserve한다.
2. `thread/start` request는 prepared workspace의 canonical root를 explicit `cwd`로 보내고, valid success response의 native `ThreadId`를 authority로 받는다.
3. Pinned `thread/start`는 response-first다. 어떤 authoritative response에도 아직 결합되지 않은 `thread/started`는 Connection-level `protocol_violation`이고 public `CodexConversation`을 만들지 않는다. Response 뒤 matching notification은 validate/correlate하지만 result barrier로 기다리지 않으며 생략도 허용한다.
4. Confirmed native thread에 `turn/start` text input을 write한다. Workspace `cwd` authority는 앞선 `thread/start`에만 있다.
5. `turn/start` response와 `turn/started` notification은 either-order다. Response 전 같은 pending thread에 온 turn/item/terminal/approval observation은 parse·generated validation·sanitization 뒤 turn-local FIFO에 stage한다.
6. Response가 같은 native `TurnId`를 authority로 confirm하면 FIFO를 ingress order로 replay한다. 다른 identity, provisional lifecycle 뒤 error response 또는 malformed response는 operation-local `protocol_violation`이며 staged public mutation을 만들지 않는다.
7. Matching AgentMessage `item/completed`를 ingress order로 모은다. Exact duplicate completion은 한 번만 반영한다. `item/started`는 validate-if-observed, `item/agentMessage/delta`는 validate·scope-check 뒤 discard한다.
8. Matching `turn/completed`가 authoritative semantic terminal이다. `error` notification은 terminal이 아니며 success/failure를 대체하지 않는다.
9. `status=completed`는 completed AgentMessage가 하나 이상일 때만 success다. `messages`는 unique completed AgentMessage의 ingress order이고 `finalMessage`는 마지막 text다. Completed terminal만 있고 AgentMessage가 없으면 `projection_unavailable`/`known_terminal`이다.
10. `status=failed | interrupted`는 AgentMessage 없이 각각 `turn_failed | turn_interrupted`/`known_terminal`로 끝난다.

Pre-response AgentMessage나 terminal은 legal provisional observation일 수 있지만 matching `turn/start` response 없이 acceptance나 native identity authority가 아니다. Response deadline을 잃으면 operation은 `acceptance_unknown`이며 staged terminal로 known success/failure를 합성하지 않는다. Response 뒤 terminal deadline을 잃으면 `accepted_execution_unknown`이다. Runtime은 자동 replay, rollback, `thread/read`, `thread/resume` 또는 `turn/interrupt`를 호출하지 않는다.

Public outcome이 settle된 뒤 operation projection은 safe terminal fingerprint만 필요한 synchronous cleanup까지 유지하고 해제한다. 이후 late response는 active map miss, late notification은 thread operation route miss로 no-op다. Process-lifetime actor, settled-ID tombstone, permanent poison/sink와 global causal journal을 유지하지 않는다.

##### T0-C per-thread independence

- 같은 Runtime의 `runNewConversation()`은 capacity 범위에서 concurrent 호출할 수 있다. Runtime-wide max-one slot이나 semantic mutex가 없다.
- 각 call은 native `ThreadId`별 projection과 operation route를 가진다. Sole ingress reader가 본 raw line order를 cross-thread causal/publication order로 바꾸지 않는다.
- A의 response/terminal/approval 지연과 A-local staging은 B의 Client response, Server fallback, notification validation과 outcome settlement를 막지 않는다.
- Required fake/live schedule은 `A turn pending → B completed success → A completed success`다. B 완료 뒤 새 A2 admission도 가능해야 하며 stale A state가 capacity를 누수하지 않아야 한다.
- Same-thread second turn, queue, reject와 steer는 현재 public Interface가 없으며 후속 tracer 전에는 정책을 발명하지 않는다.

##### T0.1 regular command approval

T0.1은 `item/commandExecution/requestApproval`의 regular variant만 지원한다.

- Regular은 `approvalId`와 `networkApprovalContext`가 null/absent이고 command/cwd가 generated schema상 유효한 variant다. Runtime은 variant 판별 직후 command, cwd, reason, actions, environment와 amendment payload를 폐기한다.
- Connection은 original server-direction `RequestId`와 response contract를 소유한다. Runtime은 native thread/turn/item scope와 actionable approval 1개를 소유한다. Original ID와 display payload는 public request에 없다.
- `turn/start` response 전 request는 sanitized staged lease로만 보존하고 handler를 호출하지 않는다. Matching response가 같은 turn을 confirm한 뒤에만 handler에 `CodexCommandApprovalRequest`를 한 번 전달한다.
- Handler가 없으면 same-ID `-32601` fallback이다. Non-regular variant 또는 invalid owning scope는 raw detail 없는 same-ID `-32000` error다. Handler throw/reject도 같은 error를 한 번 쓰고 owning operation을 `approval_handler_failed`로 immutable settle한다. 어느 경우도 generated approval decision을 자동 선택하지 않는다.
- `approve_once | decline | cancel`은 각각 generated `accept | decline | cancel` result로 mapping한다. `acceptForSession`, exec/network amendment와 임의 decision은 public type으로 구성할 수 없다.
- `respond()`는 Connection lease를 atomic claim한다. 먼저 claim한 call 하나만 writer admission을 만들고 duplicate는 `already_answered`, wire 0회다.
- Writer callback success는 `submitted`일 뿐 peer receipt, decision 적용, command success나 turn success가 아니다. Write attempt 뒤 callback settlement 전에 terminal cut이 닫히면 `delivery_unknown`이며 replay하지 않는다.
- Matching `serverRequest/resolved`, turn terminal/successor transition 또는 Connection terminal이 write attempt 전에 lease를 제거하면 late `respond()`는 `stale`, wire 0회다. Exact duplicate/late resolved는 no-op다.
- `serverRequest/resolved`는 server callback clear authority일 뿐 command/turn outcome이 아니다. Matching command `item/completed`와 `turn/completed`가 각각 command/turn authority다.
- Wall-clock approval expiry와 auto approve/decline/cancel은 없다. Actionable approval이 있는 동안 semantic turn deadline은 정지한다. Approval은 caller answer, resolved, turn transition 또는 disconnect로만 release한다.

### Finite Capacity and Deadlines

모든 default는 package-private named constant이며 production public option이나 environment override가 아니다. Unit/fake test만 internal dependency injection으로 tiny cap/deadline을 공급한다.

#### Capacity defaults

| Resource | Count cap | UTF-8 byte cap | Saturation disposition |
| --- | ---: | ---: | --- |
| One inbound or outbound JSONL payload, newline 제외 | 1 frame | 16 MiB | Oversize inbound는 Connection terminal; oversize outbound는 pre-wire local failure |
| Validated dispatch queue | Pause 768 / hard 1,024 observations | Pause 24 MiB / hard 32 MiB | 어느 pause threshold든 도달하면 reader pause, 512 observations와 16 MiB 아래에서 resume; hard cap을 넘으면 Connection terminal |
| Serialized writer queue | 256 frames | 16 MiB | Client frame은 pre-wire local failure; required Server response를 reserve하지 못하면 Connection terminal |
| Active Client RPC waiters | 256 | 1 MiB charged metadata | Pre-wire `capacity_exhausted`/`known_not_sent` |
| Active Server response leases | 256 | 1 MiB charged metadata | Exact response authority를 보존할 수 없으므로 Connection terminal |
| Active conversation operations/projections | 256 | 8 MiB charged safe state | New operation pre-wire `capacity_exhausted`; existing operations continue |
| One turn early/retained safe observation FIFO | 1,024 observations | 8 MiB | Owning operation `capacity_exhausted`; unrelated thread continues |
| One thread actionable regular command approval | 1 | Included in operation/Server lease caps | Extra variant gets same-ID `-32000`; first lease remains |

`1 MiB = 1,048,576` bytes, `8 MiB = 8,388,608`, `16 MiB = 16,777,216`, `32 MiB = 33,554,432`다. Frame cap은 actual UTF-8 bytes다. Internal observation charge는 fixed-key-order sanitized projection의 UTF-8 JSON bytes와 entry당 128-byte accounting overhead다. Registry charge는 direction/type-tagged ID, method/contract tag, allowlisted native scope UTF-8 bytes와 entry당 128-byte overhead다. Raw params, command, path, stderr와 raw error는 charge 계산을 위해 retained state에 복사하지 않는다.

Validated dispatch는 count 또는 byte pause threshold 중 하나에 도달하면 sole reader의 추가 read를 중단한다. Count가 512 미만이고 bytes가 16 MiB 미만일 때만 resume한다. 이미 read한 complete frame 하나를 validate한 결과 absolute count 또는 byte hard cap을 넘으면 해당 observation을 enqueue/drop하지 않고 Connection terminal로 전이한다.

#### Deadline defaults

| Phase | Default | Outcome |
| --- | ---: | --- |
| Spawn/pipes ready | 10 s | `runtime_open_failed`; partial child reap |
| `initialize` response | 10 s | Open failure, same child에 resend 없음 |
| Serialized writer backpressure admission | 10 s | Frame이 write되지 않았으면 local `known_not_sent`; write attempt 뒤면 stage별 unknown |
| `thread/start` 또는 `turn/start` response authority | 60 s | Write attempt 뒤 `acceptance_unknown`; active waiter 제거, late map miss |
| Response-confirmed turn semantic terminal | 30 min | `accepted_execution_unknown`; no replay/reconciliation |
| Explicit stdin-close graceful exit | 5 s | 초과 시 SIGTERM 단계 |
| SIGTERM grace | 5 s | 초과 시 SIGKILL 단계 |
| SIGKILL and reap | 5 s | Reap 미증명 시 `runtime_close_failed` |

Initialize의 10-second bound는 pinned Rust remote client precedent와 맞춘다. Post-initialize response/semantic deadlines와 finite byte bounds는 external TypeScript deployment hardening이며 upstream guarantee가 아니다. Timeout은 active route와 per-operation safe state를 release하고 outcome을 immutable하게 만든다. Late response/notification을 process-lifetime sink로 보존하지 않는다. Approval handler에 전달된 actionable lease에는 deadline을 적용하지 않고 semantic deadline clock도 정지한다.

### Failure Behaviour

#### Operation stage와 public effect

| Evidence at settlement | Public effect | 자동 동작 |
| --- | --- | --- |
| Capacity/input/runtime-closed before RequestId/write | `known_not_sent` | 없음 |
| Generated-valid JSON-RPC error response, provisional lifecycle 없음 | `known_rejected` | Replay 없음 |
| `thread/start` success 뒤 `turn/start` pre-wire reject | `thread_created` + `conversation` capability | Auto delete/retry 없음 |
| Mutation write attempt 뒤 matching response 없음 | `acceptance_unknown` | Replay/read/resume 없음 |
| Matching `turn/start` response 뒤 terminal 없음 | `accepted_execution_unknown` | Interrupt/reconciliation 없음 |
| Matching failed/interrupted/completed terminal | `known_terminal` | Terminal authority대로 settle |

`conversation`은 valid `thread/start` success response를 받은 뒤에만 success/failure outcome에 포함한다. Pre-response `thread/started`나 notification identity로 capability를 만들지 않는다. Settle된 outcome은 late wire, connection loss와 cleanup failure로 소급 변경하지 않는다.

Response settlement의 public mapping은 다음과 같다.

| Response case | `code` / `stage` / `effect` | `conversation` |
| --- | --- | --- |
| `thread/start` generated-valid error, pre-response lifecycle 없음 | `server_rejected` / `thread_start` / `known_rejected` | 없음 |
| `turn/start` generated-valid error, provisional lifecycle 없음 | `server_rejected` / `turn_start` / `known_rejected` | 있음 |
| `thread/start` matching envelope의 invalid success payload | `protocol_violation` / `thread_start` / `acceptance_unknown` | 없음 |
| `turn/start` matching envelope의 invalid success payload | `protocol_violation` / `turn_start` / `acceptance_unknown` | 있음 |
| Provisional turn lifecycle 뒤 `turn/start` error response | `protocol_violation` / `turn_start` / `acceptance_unknown` | 있음 |
| Valid turn response identity와 staged native scope 불일치 | `protocol_violation` / `turn_execution` / `accepted_execution_unknown` | 있음 |

위 invalid success payload는 owning active waiter를 remove하고 unrelated routing은 유지한다. Connection-level pre-response `thread/started` 위반은 current operations를 각 stage에 맞춰 `protocol_violation`으로 settle하되 어느 notification identity도 public `conversation`으로 승격하지 않는다.

#### Failure scope

| Failure | Scope |
| --- | --- |
| Malformed JSONL/UTF-8, duplicate top-level member, unclassifiable direction/ID, sole reader failure | Connection terminal; current pending settle, child cleanup |
| Active success response payload generated validation failure | Owning waiter/operation only; route remove |
| Adopted notification invalid with trusted native scope | Owning operation only, no state mutation |
| Adopted notification invalid without trusted scope | Sanitized no-op; required owner may timeout |
| Unbound pre-response `thread/started` | Connection terminal; current operations `protocol_violation`, no public identity |
| Turn identity mismatch, provisional lifecycle + error response | Owning operation `protocol_violation`; no alias/poison |
| Per-operation FIFO/result projection overflow | Owning operation only; unrelated thread continues |
| Global dispatch/writer/Server lease trust capacity exhaustion | Connection terminal |
| Child/process loss | Current waiter/operation settlement by stage; no restart/retry |
| `close()` reap/join failure | Safe close error; already settled semantic outcome unchanged |

Connection terminal은 admission을 막고 active Server lease를 revoke하며 current Client waiter와 Runtime operation을 한 번만 settle한다. `close()`는 idempotent coalesced Promise다. Admission stop → stdin once-close → stdout/stderr complete-frame drain → graceful wait → SIGTERM → SIGKILL → reap/task join 순서를 따른다. Protocol trust failure는 semantic ingress cut을 즉시 닫지만 resource reap은 생략하지 않는다. Runtime close는 `turn/interrupt`, `thread/unsubscribe`, `thread/read`, `thread/resume`를 보내지 않는다.

### Data Retention and Sanitization

- Public surface와 retained Runtime state에는 raw JSONL, generated params/result, native ID string, original `RequestId`, path, command, cwd, reason, environment, stderr, raw server error message/data와 auth/config secret을 두지 않는다.
- Connection active map은 routing에 필요한 exact typed ID, method/response contract와 safe stage만 pending 동안 보존하고 첫 settlement/disconnect에 제거한다.
- Early FIFO에는 generated validation을 통과하고 allowlist projection을 적용한 native-scope observation만 둔다. Delta text는 validation/scope check 뒤 discard하고 raw delta를 stage하지 않는다.
- T0 result에는 completed AgentMessage text만 보존한다. Safe result cap을 넘으면 success를 truncate하지 않고 owning operation을 explicit capacity failure로 끝낸다.
- Diagnostic log는 stable code, allowlisted method name, stage와 count만 남길 수 있다. ID/path/payload hash도 correlation fingerprint로 남기지 않는다.

### Coverage Ledger v2 and Generated Artifacts

`packages/runtime-codex/codex-method-decisions.json`을 versioned object로 바꾼다.

```json
{
  "schemaVersion": 2,
  "provenance": {
    "manifest": "codex-upstream-provenance.json"
  },
  "tracers": {},
  "evidence": {},
  "contracts": {},
  "methods": {}
}
```

TypeScript `parseCodexMethodDecisionsV2()`가 runtime validation의 단일 implementation owner다. 별도 hand-maintained JSON Schema는 만들지 않는다. Local test evidence selector는 unit/fake에 `path + exact testName`, live에 `workspace + npm script`를 사용한다. Last-run timestamp, branch SHA와 transient pass를 JSON에 기록하지 않는다.

| Field | Values / rule |
| --- | --- |
| `integrations[]` | Unique set of `runtime-harness | legacy-client-host | app-server-connection | conversation-runtime | ayple-adapter`; empty means generated `schema-only` |
| `adoption` | `unreviewed | baseline | later | case-driven | excluded` |
| `owner` | `app-server-connection | conversation-runtime | runtime-preparation | ayple-adapter`; Runtime method semantic owner는 singular `conversation-runtime` |
| `coverage` | `required | tolerated | unsupported | deferred` |
| verification requirement | `required | not-required` |
| verification implementation | `planned | implemented` |
| gates | `general-pr | runtime-tracer-pr | pin-upgrade` |

Validator는 unknown/removed method·tracer·case·evidence, generated direction/maturity mismatch, duplicate integration, missing required source evidence, empty implemented selector, deferred coverage promotion, illegal product prerequisite와 legacy allowlist 확대를 fail-closed한다. New upstream method는 `schema-only`/`unreviewed`이며 direction-wide unsupported fallback 외 semantic coverage를 자동 상속하지 않는다. `tolerated`도 parse·validate·scope oracle이 필요하며 silent drop을 implemented evidence로 인정하지 않는다.

Migration은 실제 current usage를 보존한다.

- Current `raw-wrapper` 8개 row는 `runtime-harness`로 이동한다.
- `initialize`와 `initialized`는 `CodexRawClient`와 legacy Host가 모두 사용하므로 Host 제거 전 `runtime-harness + legacy-client-host`를 가진다. Host 제거 뒤 `legacy-client-host`만 삭제하고 `runtime-harness`는 유지한다.
- Design checkpoint는 T0/T0-C/T0.1 coverage와 planned evidence를 먼저 기록하고 existing integration을 유지한다.
- Required unit/fake/live selector가 implemented이고 current gate가 green인 Result-producing checkpoint에서만 `app-server-connection`/`conversation-runtime` membership을 추가한다.
- Host 제거 checkpoint에서 `legacy-client-host` membership은 0이어야 한다.

### Provenance and Safe Generation

Implementation은 다음 tracked provenance를 추가한다.

- Dev-only git submodule `references/openai-codex` at exact commit `767822446c7a594caa19609ca435281a9ec67e0d`
- `packages/runtime-codex/codex-upstream-provenance.json` containing exact npm version, tag/ref, attested commit, package/platform integrity roster와 generated-tree digest
- Existing generated stable/experimental TypeScript·JSON Schema tree
- Generated `docs/architecture/codex-app-server-method-inventory.md`

Submodule은 ordinary `npm test`, typecheck, build와 Runtime의 dependency가 아니다. Structural verify는 committed manifest·package/lock·generated digest로 offline 동작하고 explicit source/pin-upgrade gate만 checked-out gitlink를 요구한다.

Package scripts는 다음 semantics를 제공한다.

| Script | Semantics |
| --- | --- |
| `verify:codex-methods` | Preflight → A/B staged generate → tracked tree/inventory compare; tracked write 0회 |
| `generate:codex-methods` | Same-pin manifest와 digest를 preflight하고 generated tree + inventory를 two-target backup/rollback promotion |
| `verify:codex-source` | npm attestation/lock/manifest/gitlink/exact commit과 generated digest를 explicit 검증 |
| `upgrade:codex-pin` | Updated package/lock/gitlink/attestation을 검증하고 provenance manifest + generated tree + inventory를 three-target staged promotion |

Preflight는 exact semver, lock의 root/platform package/version/resolved/integrity, package-owned launcher/native binary, `codex --version`, provenance와 ledger v2를 tracked mutation 전에 검증한다. Generation은 같은 filesystem staging root A/B에서 stable TS, stable JSON Schema와 experimental TS를 두 번 만들고 deterministic canonicalization 후 byte equality를 요구한다. Inventory는 staged generated roster와 ledger에서 render하고 tracked inventory를 semantic input으로 읽지 않는다.

`verify`는 write/delete/rename을 하지 않는다. Normal `generate`는 generated tree와 inventory 두 target을 모두 prevalidate한 뒤 backup/rollback한다. Pin upgrade는 generated digest owner인 provenance manifest도 같은 Result에 포함하므로 manifest, generated tree와 inventory 세 target을 모두 stage/prevalidate하고 failure injection에서 전부 원상복구해야 한다. Gitlink/package/lock은 upgrade command의 verified prerequisite이며 promotion helper가 임의로 reset/checkout하지 않는다.

### Compatibility and Migration

이 구현은 legacy Host 위에 layer를 쌓지 않고 병행 구현 후 forward-remove한다.

| Category | Current surface | Disposition |
| --- | --- | --- |
| Preserve | Generated protocol output | Wire validation input으로 유지; manual edit 금지 |
| Preserve for Harness | `CodexRawClient`, `CodexRuntimeAdapter`, status/smoke, capability slots, root의 해당 exports, `./capabilities` | Existing server/Inspector diagnostic consumer 유지 |
| Preserve for Harness | `testing/fake-codex-app-server.ts`, `withFakeCodexAppServer`, `./testing` consumer | RawClient/Adapter parity oracle로 유지; foundation integration으로 세지 않음 |
| Extract/adapt | `ProductRuntimeLayout` root/binary/runtime-home validation | New `./preparation` capability로 이동 |
| Extract/adapt | `CodexStdioTransport` parser, JSONL, generated validator, spawn/reap test intent | New package-private Connection에서 source-guided 재검증; class reuse/wrap 금지 |
| Extract/adapt | `fake-codex-stdio-transport` actual child/scenario/journal pattern | New typed conformance fake로 이동; production/testing export 아님 |
| Remove without compatibility | `HeadlessCodexClientHost`, types, tests, fake, root export | T0/T0-C/T0.1/full regression green checkpoint에서 삭제 |
| Remove without compatibility | Host generation/ref/global sequence/subscription/failure policy | 새 global state로 대체하지 않음 |
| Remove without compatibility | Product-named layout Interface/root export | `./preparation` consumer가 선 뒤 삭제 |
| Remove without compatibility | `CodexStdioTransport` class, observation Interface, old timeout/dismiss/settled-ID semantics, testing re-export | New Connection oracle가 green인 뒤 삭제 |

Implementation order는 ledger/provenance safe machinery → preparation → Connection → Runtime/T0 → sibling T0-C and T0.1 → legacy removal/documentation이다. Foundation conformance와 repository regression이 green이 되기 전에는 Host symbol을 제거하지 않는다. 반대로 gate 뒤에는 consumer가 없는 Host compatibility facade를 남기지 않는다.

Package `dist` cleanup은 caller-supplied path를 받지 않는 package-owned script만 수행한다. Resolved target이 exact `packages/runtime-codex/dist`인지 확인한 뒤 삭제하며 repository root `git clean -x/-X`, `.ay-ple`, external app data, Codex rollout/history와 다른 workspace output을 건드리지 않는다. Clean build 뒤 development/types/default condition으로 root, `./capabilities`, `./testing`, `./preparation`, `./conversation`을 import해 stale removed symbol이 없음을 확인한다.

기존 [Headless Codex Client Host spec](2026-07-12-headless-codex-client-host.md)은 역사적 `wontfix`로 유지하고 이 spec을 exact replacement로 연결한다. ADR 0008은 ADR 0010이 대체한 역사적 결정으로 유지한다. 최종 implementation Result에서 package README, Runtime Harness implementation map, development backlog와 generated inventory의 current implementation claim을 코드와 맞춘다.

## Implementation Decisions

### Source-guided port와 TypeScript hardening 구분

| 채택 | 근거 |
| --- | --- |
| Sole reader, serialized writer, active response map pop, per-turn early FIFO, current-pending disconnect settlement | Pinned Python external stdio client |
| Typed request facade, active collision check, same-ID Server response, disconnect settlement | Pinned Rust `codex-app-server-client` |
| Native `ThreadId`별 projection과 active pending remove-on-resolution | Pinned TUI source/tests |
| Method별 response/notification authority와 terminal | Pinned method source/tests + generated shape |
| Exact JS ID parser, byte/count caps, deadline, child reap, no-raw projection | Explicit TypeScript external stdio deployment hardening |
| Initialize 중 Server request 즉시 fallback, active Server lease/replay coalescing, active conflict terminal, `-32602`·`-32000` 선택 | Explicit TypeScript external-client liveness/safety hardening. Rust client의 unknown request `-32601`은 precedent일 뿐 이 전체 정책의 upstream guarantee가 아님 |

Global wire total order, process-lifetime ID tombstone, contradiction lattice, permanent actor poison/sink, process-lifetime actor retention과 automatic reconciliation은 채택하지 않는다. Active collision과 malformed transport처럼 current routing trust를 잃는 경우만 Connection terminal이다.

### Interface design comparison

`codebase-design`의 Design It Twice 절차로 세 Interface를 비교했다.

| 대안 | 장점 | 판정 |
| --- | --- | --- |
| 최소 `runNewConversation()` 단일 Interface | T0 caller에게 가장 작고 깊다. | Opaque continuation capability가 없어 one-shot ceiling 위험이 있다. |
| 공개 `Runtime → Thread → Turn`, streaming/control/read/resume | 장기 locality와 flexibility가 높다. | 아직 tracer가 없는 identity export, stream ordering과 control contract를 선제 고정한다. |
| 단일 호출 outcome + opaque `CodexConversation` | Current caller는 작고, native identity를 raw/ref로 노출하지 않으면서 future tracer extension point를 남긴다. | 채택 |

Public Connection과 generic responder는 만들지 않는다. `CodexConversation`은 continuation capability일 뿐 현재 method를 약속하지 않는다. 실제 후속 capability는 source evidence와 ledger coverage가 있는 tracer에서만 추가한다.

### 자동 복구를 하지 않는다

Runtime은 non-idempotent `thread/start`, `turn/start`와 approval response를 blind retry하지 않는다. Connection loss나 timeout 뒤 process를 자동 restart하지 않고 `thread/read`/`thread/resume`으로 결과를 합성하지 않는다. Future recovery tracer는 native Codex history를 authority로 사용하되 별도 source evidence와 unknown-outcome contract를 채택해야 한다.

## Testing Decisions

### Oracle 소유권

| Oracle | 증명하는 것 | 증명하지 않는 것 |
| --- | --- | --- |
| Unit | Exact ID/parser, router/writer, caps, reducer transition, sanitize/no-raw, ledger/generator rollback | Real pipe scheduling |
| Typed actual-child fake | JSONL chunking, response/notification interleaving, A/B schedule, process/write faults, approval races | Installed binary compatibility |
| Pinned live binary | Package-owned launcher/generated schema와 representative T0/T0-C/T0.1 path | Race completeness or new ordering guarantee |
| Source review | Port된 observable behavior와 method authority 정렬 | 실행 가능한 external Seam |

New fake child implementation, typed scenario table, journal과 fixtures는 runtime-codex main build/typecheck graph에 포함한다. Valid scenario는 generated schema validation을 통과해야 하며 manual `as unknown as` protocol fixture를 valid oracle로 인정하지 않는다. Fake child는 actual spawned process와 partial/multiple JSONL chunk를 사용하고 in-memory Connection replacement를 만들지 않는다.

### 필수 T0 fake case

- Initialize response 전 notification과 Server request, matching response 뒤 `initialized`, initialized writer failure
- `thread/start` response-first, matching `thread/started` present/absent, unbound pre-response notification의 Connection terminal과 no public capability
- `turn/start` response-first/notification-first, dependent item/terminal-before-response, matching replay FIFO
- Mismatched response identity, provisional lifecycle + error response, active response payload validation failure의 operation-local isolation
- `item/started`, delta validate-and-discard, one/multiple completed AgentMessage, exact duplicate no-op, last-message projection
- `turn/completed` completed/failed/interrupted, non-terminal `error`, terminal-only projection unavailable
- Raw frame/dispatch/RPC/operation/FIFO count와 byte tiny-cap, recursive no-raw inspection
- Numeric/string opposite-direction same raw ID, unsafe integer/negative zero/top-level duplicate, active collision, late map-miss
- Stable-known valid fallback의 same-ID `-32601`, invalid params의 same-ID `-32602`와 zero-or-one response, experimental/future envelope-only fallback
- Response timeout before/after write and process loss before/after response/terminal, no replay/reconciliation
- Graceful close, tail frame before cut, SIGTERM, SIGKILL+reap, unproven reap safe error and idempotent close

### 필수 T0-C case

- Deterministic `A pending → B completed → A completed`
- A-local early FIFO saturation/validation failure while B completes
- Host-scoped/unsupported Server response during A pending without B blocking
- A completion 뒤 A2 admission and no projection/capacity leak
- Two concurrent command-free threads with distinct native scope and no cross-delivery

### 필수 T0.1 case

- Numeric/string original Server ID and opposite-direction collision separation
- Pre-response sanitized staging and post-response handler activation
- `approve_once | decline | cancel` exact generated result, one frame only
- Concurrent duplicate respond: `submitted/already_answered`; resolved/turn-transition/disconnect late respond: `stale`
- Writer attempt before terminal cut: `delivery_unknown`; callback success 뒤 loss keeps `submitted`
- `serverRequest/resolved` before/after response write and exact duplicate no-op
- Handler absent `-32601`; handler failure, subcommand/network variant and scope mismatch constant `-32000`
- Actor approval cap 1 and unrelated Thread B progress
- No wall-clock auto decision; fake clock advancement produces no response/interrupt
- Raw command, cwd, reason, action, environment, amendments, error payload and original ID absent from public/retained state
- Matching command item terminal and turn terminal remain separate from submission/resolved

### Live conformance

Live probe는 격리된 임시 package/app-data/workspace root, package-owned `0.144.0` binary와 local mock Responses provider를 사용한다. 따라서 일반 auth/account 상태를 요구하거나 변경하지 않는다.

- T0는 deterministic text response 하나, completed AgentMessage와 completed terminal을 확인한다.
- T0-C는 provider barrier로 A/B/A schedule을 강제해 대표 independence를 확인한다.
- T0.1은 deterministic regular command request, caller의 `decline`, matching resolved, declined command item과 authoritative turn terminal을 확인한다.

Live probe는 각 tracer implementation checkpoint와 `pin-upgrade`에서 필요하지만 unrelated package test마다 실행하지 않는다. Race와 fault의 oracle은 계속 fake/unit이다. Checked-in Python client가 같은 binary를 실행한다고 가정하지 않고, Python reference CLI pin 차이는 package-owned binary/version/live gate로 명시적으로 검증한다.

### 명령과 완료 gate

Implementation ticket은 ledger와 conformance를 위한 stable package script/selector를 추가하고 다음 gate를 통과해야 한다.

```text
npm run verify:codex-methods -w @ay-ple/runtime-codex
npm run verify:codex-source -w @ay-ple/runtime-codex      # source/pin gate
npm run test:conformance:fake -w @ay-ple/runtime-codex
npm run test:conformance:live:t0 -w @ay-ple/runtime-codex
npm run test:conformance:live:t0-c -w @ay-ple/runtime-codex
npm run test:conformance:live:t0-1 -w @ay-ple/runtime-codex
npm test
npm run typecheck
npm run build
npm run lint -w @ay-ple/inspector
```

Each implementation slice receives independent Source, Standards and Spec review. A method/integration row is promoted only after its required selector exists, its current gate passes and review findings are returned to the owning artifact. Final completion also requires clean-tree generated verification, clean package build/default-condition import, removed Host symbol absence and current docs/code/ledger alignment.

## Out of Scope

- AY-PLE product adapter, browser HTTP/SSE, UI, approval display/audit/default policy
- `ModelingInvocation`, `ModelingRun`, Assignment, Recipe, StatePatch와 Review mapping
- Multi-turn, streaming, activity subscription, interrupt, steer, thread read/resume/fork/list/archive/rename
- `acceptForSession`, exec/network policy amendments, permissions, file approval, user input, MCP elicitation과 다른 supported Server request
- Automatic process restart, mutation replay, generic reconciliation와 browser disconnect policy
- TUI UI/key input/presentation, Exec-only policy, Python production dependency와 Rust sidecar
- ACP 또는 multi-engine abstraction
- Runtime Harness/Inspector/Runtime Diagnostic History redesign
- Native thread identity의 public serialization, durable AY-PLE catalog 또는 generation-scoped remap

## Open Questions

None.

## Further Notes

- Source Wayfinder: [Codex-native Client Redesign](../wayfinding/codex-native-client-redesign/map.md)
- Architecture decision: [ADR 0010](../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)
- Source authority and ledger evidence: [Ticket 013 asset](../wayfinding/codex-native-client-redesign/assets/013-source-conformance-and-ledger-evidence.md)
- Selective salvage/removal plan: [Ticket 014 asset](../wayfinding/codex-native-client-redesign/assets/014-host-removal-and-selective-salvage-plan.md)
- First-party port/reuse correction: [Ticket 019 asset](../wayfinding/codex-native-client-redesign/assets/019-first-party-client-port-and-reuse-audit.md)

이 spec은 target implementation contract다. Spec 작성 시점의 current package에는 `./preparation`, `./conversation`, ledger v2와 새 conformance runtime이 아직 없으며, 존재한다고 주장하지 않는다.
