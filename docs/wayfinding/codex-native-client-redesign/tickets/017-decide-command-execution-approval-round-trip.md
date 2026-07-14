# 017 — commandExecution approval의 첫 round-trip을 결정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)

## Question

`T0.1` tracer에서 matching active turn의 fake child가 `item/commandExecution/requestApproval`을 보낼 때, `CodexAppServerConnection`은 original `RequestId`의 direction-aware same-ID routing, result/error write-once와 terminal release를 어떻게 소유하고, `CodexConversationRuntime`의 per-thread owner는 native thread·turn·item과 optional approval identity를 어떤 최소 safe pending command approval로 상관할 것인가?

Caller의 `approve_once | decline | cancel`을 generated `accept | decline | cancel` typed response로 original `RequestId`에 한 번만 쓰고, response write·`serverRequest/resolved`·turn terminal·connection close와 late caller answer가 경합할 때 variant-specific pending lifecycle을 어떻게 끝낼 것인가?

[첫 Server request variant 비교](../assets/008-server-request-variant-comparison.md)의 근거를 사용하되 `acceptForSession`, exec·network policy amendment, additional permissions, remembered·automatic approval, 실제 browser UI·audit record와 다른 Server request variant는 포함하지 않는다. Package-private source-guided envelope lifecycle은 재사용하지만 public generic responder와 product approval policy는 만들지 않는다. Answer는 command approval inventory row, source/test evidence, deterministic fake-child oracle과 필요한 narrow live probe를 연결하되 구현 gate 전 integration status를 승격하지 않는다.

## Ticket 019 교정

[First-party client port 감사](../assets/019-first-party-client-port-and-reuse-audit.md)가 이 ticket의 현재 T0.1 처리 방침을 보완한다. Regular-only scope, original Server `RequestId`, native thread·turn·item correlation, active pending의 atomic claim/remove-once, `serverRequest/resolved`·turn transition·disconnect cleanup, no automatic decision과 raw wire shape 비공개는 유지한다. 아래 Answer의 process-lifetime seen-ID/actor tombstone, sequential reuse 금지, conflicting reuse global fail-close, cross-owner permanent actor poison·compact sink는 supersede한다. TUI처럼 active entry를 answer 또는 resolution에서 먼저 remove하고 이후 local answer/resolved repeat은 stale/no-op로 끝낸다. Connection write 성공은 command outcome이 아니며 command `item/completed`와 `turn/completed` authority 분리는 유지한다.

## Answer

### Source-grounded lifecycle 제약

| 범위 | Exact-pin source/test 판독 | T0.1 설계 제약 |
| --- | --- | --- |
| Server-owned request authority | App Server는 process-global monotonic integer `RequestId`를 만들고 callback을 map에 등록한 뒤 request를 보낸다. Matching result/error와 thread cleanup 중 먼저 map entry를 remove한 경로만 waiter를 끝내며, duplicate·late client response는 unknown callback warning으로 끝난다. Pending request replay는 original ID와 payload를 그대로 사용한다. ([registration·resolution·replay](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/outgoing_message.rs#L280-L501)) | Wire response authority는 `approvalId`·`itemId`가 아니라 original server-direction `RequestId`다. Same-ID exact replay는 기존 pending/tombstone에 수렴하고 conflicting reuse는 fail-closed한다. Sequential reuse를 새 request로 허용하지 않는다. |
| Command response handling | Command waiter는 client result/error 또는 turn-transition cancellation로 끝난 직후 thread listener에 `serverRequest/resolved` emission을 요청하고, 그 뒤에야 response를 parse해 core `ReviewDecision`을 submit한다. Malformed result도 pending resolution 뒤 `Decline`으로 fallback한다. ([response handler](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1908-L2029), [resolved emission](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L748-L770)) | `serverRequest/resolved`는 server callback이 더 이상 pending이 아니라는 관찰이지 우리 decision의 ACK, command effect, item terminal 또는 turn terminal이 아니다. Caller answer 결과도 `decision_applied`가 아니라 최대 local response submission 사실만 말한다. |
| Normal direct response | Client result를 받은 경로는 resolved notification enqueue 뒤에 response-derived command completion을 만들거나 core approval을 submit한다. Raw next-message integration test는 별도로 matching resolved가 `turn/completed`보다 먼저임을 assert한다. ([response handler](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1921-L2025), [normal accept test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L2324-L2348)) | Deterministic normal-path oracle은 `response frame → matching resolved → later item/turn observation`을 증명한다. Production completion은 resolved 하나만을 unconditional barrier로 기다리지 않는다. |
| Turn transition cleanup | `TurnStarted`, `TurnComplete`, `TurnAborted`는 해당 thread의 pending Server request를 `turnTransition` error로 cancel한다. Same listener가 event handler를 await하는 동안 waiter는 `ResolveServerRequest` command만 enqueue할 수 있으므로 pure cancellation trace에서 transition notification이 resolved보다 먼저다. ([listener loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L277-L343), [start·complete](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L151-L195), [abort](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1045-L1061), [queued resolution](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/thread_state.rs#L164-L193)) | Pure cleanup은 `turn transition → resolved`로 검증한다. 전체 production에서는 client response가 callback을 먼저 remove하고 listener command가 terminal event보다 먼저 처리되는 별도 `resolved → terminal` race도 수용한다. 어느 쪽이든 matching transition만으로 approval pending을 닫고 resolved를 기다리지 않는다. |
| Connection lifetime | App Server는 multi-client owner라 한 connection close만으로 thread-owned Server request를 cancel하지 않으며 `thread/resume`에서 exact request를 replay할 수 있다. TUI는 App Server disconnect를 fatal로 처리한다. ([resume replay test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_resume.rs#L3480-L3528), [TUI disconnect](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_events.rs#L35-L57)) | Dedicated-child external client에서는 [Connection loss와 unknown outcome 정책](012-decide-connection-and-unknown-outcome-policy.md)의 terminal cut이 response capability를 revoke한다. Resolved를 기다리거나 새 process에 response를 replay하지 않고, write attempt 뒤 writer callback settlement를 얻지 못한 loss만 delivery unknown으로 남긴다. |
| Local presentation key | First-party TUI는 `approvalId ?? itemId`로 local pending UI를 찾지만 original `RequestId`에 response를 쓴다. Regular shell/unified-exec는 `approvalId`가 null이고 zsh subcommand는 parent `itemId`와 별도 opaque `approvalId`를 가진다. ([TUI pending·once-only take](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L88-L204), [protocol shape](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1431-L1508)) | `approvalId`는 UUID로 재검증하지 않는 opaque optional discriminator다. 다만 T0.1은 이미 regular-only이므로 non-null subcommand와 network-only presentation은 validated unsupported branch로 끝내고 semantic pending으로 승격하지 않는다. |

Pinned README의 approval sequence는 `serverRequest/resolved`를 “pending request has been resolved or cleared”로 설명하고 command `item/completed`를 authoritative result로 지정한다. ([approval protocol](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/README.md#L1448-L1475)) Cleanup interrupt test는 resolved와 interrupted terminal을 모두 관찰하지만 method-targeted reader가 건너뛴 message를 buffer하므로 그 test 자체는 raw ordering oracle이 아니다. Pure cleanup ordering은 위 listener task graph에서 도출한다. ([interrupt test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_interrupt.rs#L300-L345), [test reader buffering](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/common/test_app_server.rs#L1639-L1665))

### Owner와 safe projection

| Owner | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `CodexAppServerConnection` | Generated Server-request validation, direction-aware exact typed `RequestId`, response-contract tag, atomic result/error lease, fixed frame reservation, serialized write stage, write-once, terminal revoke, connection-lifetime seen-ID/tombstone count+bytes와 Runtime이 건넨 opaque correlation fingerprint | Native turn/item 의미, command approval variant·policy, `serverRequest/resolved`의 method 의미, browser UI |
| `CodexConversationRuntime.ThreadActor` | Native `(threadId, turnId, itemId)` correlation, provisional-turn staging, regular-only admission, actor당 actionable approval 하나, variant-specific caller handle, resolved·turn-transition release, compact safe tombstone | Raw JSONL·params, original `RequestId` 공개, generic responder, command/cwd/reason/path display, process terminal |
| T0.1 caller port | Opaque command-approval handle의 `approve_once | decline | cancel` 한 번과 transport-neutral submission outcome | Default decision, timeout, session grant, policy amendment, browser disconnect, command success 추론 |
| `AYPLE adapter` | 실제 product tracer가 요구할 때 safe display projection, browser lifetime, UI·audit·product policy | Wire responder와 native lifecycle 재정의 |

Connection과 Runtime의 package-private ingress seam은 schema-valid request를 raw retained state로 넘기지 않고 다음 순서로 projection한다.

1. Connection이 generated stable schema로 method와 params를 parse·validate하고 original ID의 response lease를 reserve한다.
2. Runtime의 method-specific projector가 `approvalId`, `networkApprovalContext`, `command`, `cwd`의 presence를 transient하게 검사해 regular command, subcommand, network-only를 분류한다. T0.1 regular admission은 `approvalId == null | absent`, `networkApprovalContext == null | absent`, non-null `command`와 `cwd`다.
3. Regular pending에는 typed server-direction response capability와 branded native thread·turn·item, normalized `approvalId: null`, lifecycle category와 byte charge만 남긴다.
4. `startedAtMs`, `environmentId`, command, cwd, reason, commandActions, network context와 proposed exec/network amendment는 projection 직후 폐기한다. 이 값을 fingerprint, error text, debug outcome 또는 compact tombstone에도 넣지 않는다. Amendment hint가 존재해도 session/amendment decision을 노출하지 않고 basic regular decision만 제공한다.
5. Matching actor/turn의 subcommand·network-only는 Runtime이 unsupported variant로 분류하고, raw field를 보간하지 않은 constant `-32000` error 선택을 Connection에 돌려 original ID에 한 번 쓰며 public pending을 만들지 않는다. `-32000`은 pinned Exec의 unsupported Server-request precedent다. ([Exec rejection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1618-L1645))
6. Owning actor가 없는 unknown thread/scope는 T0.1 밖 request로 같은 constant error를 쓰되 unrelated actor를 poison하지 않는다.
7. Known actor의 confirmed active turn과 다른 `turnId`, 같은 `itemId`가 이미 다른 adopted category로 bound된 경우, 또는 compact approval tombstone과 충돌하는 callback scope는 unsupported variant가 아니라 `actor_protocol_contradiction`이다. Actionable lease에 same-ID error를 한 번 쓰고 owning actor의 delivery/projection을 poison한 compact sink로 전이해 healthy success를 합성하지 않는다.

현재 generated `CommandExecutionRequestApprovalParams`와 response union은 exact stable wire shape의 authority다. (`packages/runtime-codex/src/internal/codex-app-server-protocol/generated/v2/CommandExecutionRequestApprovalParams.ts`, `CommandExecutionApprovalDecision.ts`, `CommandExecutionRequestApprovalResponse.ts`) `serverRequest/resolved`는 `{threadId, requestId}`만 가지며 현재 transport의 generic notification path는 이를 runtime schema로 validate하지 않는다. (`ServerRequestResolvedNotification.ts`, `packages/runtime-codex/src/stdio-transport.ts`) T0.1 implementation gate는 이 notification의 pinned generated/schema-derived validator를 추가하기 전 semantic authority로 소비할 수 없다.

### Provisional turn과 admission

`turn/start` response와 `turn/started`의 either-order뿐 아니라 dependent Server request도 response를 앞설 수 있다. Matching response 전 request는 parsed·validated·sanitized `staged_unconfirmed` pending으로 actor cap을 reserve하되 caller에게 공개하거나 응답하지 않는다.

- Matching `turn/start` response가 같은 native `TurnId`를 confirm하면 `awaiting_caller`로 활성화한다. `item/started`는 validate-if-observed이며 approval activation barrier가 아니다.
- Provisional lifecycle 뒤 response가 다른 ID를 권위로 제시하거나 Server error로 끝나면 [Connection loss와 unknown outcome 정책](012-decide-connection-and-unknown-outcome-policy.md)의 `actor_protocol_contradiction`이다. 아직 actionable한 response lease에는 constant same-ID error를 한 번 쓰고 actor를 compact sink로 만든다.
- Response observer deadline이 먼저면 acceptance는 unknown이다. Approval을 자동 decline/cancel/error 처리하지 않고 non-public sink로 유지해 matching resolved, turn transition 또는 connection terminal까지 drain한다.
- Provisional terminal·resolved가 먼저 pending을 닫았다면 late matching response가 이를 되살리거나 caller handle을 만들지 않는다.

이 staging은 같은 scope의 parsed safe observation 하나만 보존한다. Pending Thread A 때문에 unrelated Thread B request·response·notification을 holdback하지 않는다.

### Decision mapping과 authority

| Caller choice | Generated result | Exact-pin core mapping | Caller가 추론하면 안 되는 것 |
| --- | --- | --- | --- |
| `approve_once` | `{ "decision": "accept" }` | `ReviewDecision::Approved` | Command success, resolved 또는 turn completion |
| `decline` | `{ "decision": "decline" }` | `ReviewDecision::Denied`; command item은 `declined`가 될 수 있음 | Turn terminal |
| `cancel` | `{ "decision": "cancel" }` | `ReviewDecision::Abort`; command item `declined` 뒤 turn interruption이 이어질 수 있음 | JSON-RPC error, caller Promise cancel 또는 별도 `turn/interrupt` RPC |

Mapping 근거는 exact response handler다. ([decision mapping](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1934-L1971)) `acceptForSession`, amendment object와 임의 string은 caller type으로 만들 수 없다. Connection은 fixed mapping 결과를 generated response validator로 검증한 뒤에만 lease를 claim한다.

Caller submission outcome은 command result와 분리한다.

| Outcome | 뜻 |
| --- | --- |
| `submitted` | Serialized writer callback이 성공했다. Peer receipt, selected decision 적용과 command 결과는 아직 증명하지 않는다. |
| `already_answered` | 같은 handle의 다른 caller가 먼저 response lease를 claim했다. 현재 호출은 wire 0회다. |
| `stale` | Matching resolved, turn transition 또는 connection terminal이 response write attempt 전에 lease를 revoke했다. 현재 호출은 wire 0회다. Safe internal reason은 보존할 수 있지만 product wording은 아니다. |
| `delivery_unknown` | Response write call이 시작됐지만 writer callback settlement를 얻기 전에 Connection terminal cut이 닫혔다. Replay·두 번째 response는 금지한다. |

Command result authority는 matching command `item/completed`, turn result authority는 `turn/completed`다. 이 두 observation을 `submitted`나 resolved가 대체하지 않는다.

### Linearized pending lifecycle

Actor state와 Connection response lease는 한 ingress/writer arbiter에서 다음 사건 순서로 linearize한다.

| 먼저 처리된 사건 | 후속 사건 | 결과 |
| --- | --- | --- |
| Caller decision이 actor pending과 Connection lease를 claim | Duplicate/conflicting caller answer | Fixed generated result 하나만 writer에 admission한다. 뒤 answer는 `already_answered`, wire 0회다. |
| Matching resolved가 `awaiting_caller` 또는 claimed-but-not-written lease보다 먼저 처리 | Late caller answer | Capability를 revoke하고 `server_resolved` tombstone으로 pending charge를 release한다. Late answer는 `stale`, wire 0회다. |
| Matching terminal 또는 같은 thread의 successor `turn/started`가 write attempt보다 먼저 처리 | Late caller answer, later matching resolved | `ended_by_turn_transition`으로 release하며 자동 `decline`·`cancel`·`turn/interrupt`를 보내지 않는다. Resolved exact repeat은 no-op다. |
| Response write attempt가 먼저 시작 | Resolved·turn terminal | Physical write는 취소할 수 없다. Semantic pending은 먼저 온 matching release observation으로 한 번만 닫고, writer completion은 별도 `submitted | delivery_unknown`으로 settle한다. 두 번째 frame은 없다. |
| Response write callback success | Matching resolved | Caller result는 `submitted`, actor pending은 resolved까지 유지한다. Resolved는 callback clear만 증명한다. |
| Connection terminal이 write attempt 전 처리 | Late answer | Lease revoke, known zero local response frame, `stale`다. |
| Connection terminal이 write attempt 뒤 writer callback 전 처리 | Late answer | `delivery_unknown`; replay·auto decision·새 process response가 없다. |
| Connection terminal이 writer callback success 뒤·resolved 전 처리 | Late answer | Caller의 `submitted`는 불변이다. Semantic pending만 `connection_terminal_after_submit`으로 release하며 decision effect는 합성하지 않는다. |
| Connection terminal이 matching resolved 뒤 처리 | — | 알려진 server-request resolution과 이미 settle된 caller result를 소급 변경하지 않는다. Command/turn outcome은 별도 authority를 따른다. |
| Known server ID의 resolved가 다른 `threadId`를 제시 | — | Original actor의 `actor_protocol_contradiction`; unrelated actor는 계속 진행한다. |
| Never-seen schema-valid resolved | — | Tolerate/no-op한다. Multi-client·replay·unsupported cleanup 때문에 이 notification만으로 ingress fault를 증명할 수 없다. |
| Same server ID·method·allowlisted safe scope exact replay | — | 기존 pending 또는 tombstone에 coalesce하고 caller redelivery·second response를 만들지 않는다. |
| Same server ID가 method 또는 allowlisted native scope를 바꿔 재사용 | — | Original response authority가 모호하므로 Connection terminal이다. |

Connection tombstone은 direction, exact typed ID, method/response-contract tag, allowlisted native-scope fingerprint와 final write stage만 보존한다. Actor tombstone은 native scope, optional approval discriminator, first release category와 adopted semantic flags만 보존한다. 둘 다 current process attachment lifetime 동안 TTL·LRU 없이 count+UTF-8 byte bound 아래 유지한다. Raw command/path/reason/error payload는 fingerprint input이 아니다. Pinned server의 monotonic ID와 exact replay를 따르므로 기존 `CodexStdioTransport`의 “settle 뒤 같은 Server ID를 새 request로 재사용” contract는 선별 재사용하지 않는다.

### Pending bound·saturation·expiry

- 한 `ThreadActor`의 staged/actionable regular command approval cap은 **1**이다. 서로 다른 native thread의 actor는 독립적으로 하나씩 진행한다.
- Connection response lease·seen-ID registry와 Runtime pending/tombstone은 count와 retained UTF-8 bytes를 각각 reserve한다. String `RequestId`, native IDs, optional approval discriminator와 fixed state overhead만 semantic charge에 포함하고 raw display payload는 포함하지 않는다.
- Connection registry cap을 reserve하지 못하면 direction demux·once-only authority를 더 보존할 수 없으므로 [Event delivery와 transcript recovery model](011-decide-delivery-and-recovery-model.md)과 [Connection loss와 unknown outcome 정책](012-decide-connection-and-unknown-outcome-policy.md)의 global saturation terminal이다. Frame을 drop하거나 untracked error를 쓰지 않는다.
- Full native scope를 얻은 뒤 actor pending count/byte cap이 부족하면 새 request에 constant same-ID error를 한 번 쓰고 public handle을 만들지 않으며 owning actor의 T0.1 delivery를 explicit non-success로 표시한다. 이미 delivery된 첫 pending은 기존 once-only drain lifecycle을 유지하고 unrelated actor는 진행한다.
- Wall-clock expiry, approval timer와 fake-clock auto decision은 없다. Pending은 caller response 뒤 matching resolved, turn start/complete/interrupt cleanup, 또는 Connection terminal에서만 release한다. Browser detach와 user-visible default는 [첫 AY-PLE adapter tracer와 runtime readiness gate](018-decide-first-ayple-adapter-tracer.md) 또는 실제 approval product tracer의 결정이다.
- Exact numeric global byte/count defaults와 test injection은 resulting spec·implementation ticket이 고정하고 [Source conformance verification matrix](013-decide-source-conformance-verification.md)가 tiny-cap gate를 기록한다.

### Coverage ledger 초안

| Inventory row | 현재 integration / adoption | Target tracer·coverage·owner | 근거·구현 전 상태 |
| --- | --- | --- | --- |
| `item/commandExecution/requestApproval` | `schema-only` / `baseline` | T0.1 regular-only required delivery-to-owner, original-ID typed result/error write-once; Connection lease + `ThreadActor` native scope | Generated request/response, App Server callback, TUI pending, asset 008; design-only, current row 유지 |
| `serverRequest/resolved` | `schema-only` / `baseline` | T0.1 required parse·validate·correlate-if-observed; normal direct-response oracle에서는 required, terminal cleanup에서는 conditional occurrence; `ThreadActor` release | Generated `{threadId,requestId}`, response handler·turn cleanup; design-only, current row 유지 |
| `turn/start`, `turn/started` | `raw-wrapper` / `baseline`, `schema-only` / `baseline` | T0.1 pre-response safe staging과 matching activation; existing T0 authority 유지 | 앞선 [identity](009-decide-identity-and-authority.md)·[concurrency](010-decide-concurrency-policy.md)·[delivery](011-decide-delivery-and-recovery-model.md)·[connection outcome](012-decide-connection-and-unknown-outcome-policy.md) 결정 + response/event task graph; integration 승격 없음 |
| `item/completed` | `schema-only` / `baseline` | T0.1 matching command terminal validate·correlate; approval-resolution authority 아님 | Pinned README·decision tests; current row 유지 |
| `turn/completed` | `schema-only` / `baseline` | T0.1 pending release + existing authoritative turn terminal; approval ACK 아님 | Turn cleanup source; current row 유지 |
| `item/commandExecution/outputDelta` | `schema-only` / `baseline` | T0.1 deferred | Current row 유지 |

이 표는 coverage-schema 전 design checkpoint다. 현재 decisions parser는 `integration/adoption/note` 밖 field를 거부하므로 이 ticket은 `codex-method-decisions.json`이나 generated inventory를 수정하지 않고 integration도 승격하지 않는다. [Source conformance verification matrix](013-decide-source-conformance-verification.md)가 tracer·coverage·semantic owner·source evidence·unit/fake/live oracle·verification field를 만든 뒤 이 target을 decisions JSON에 옮기고 inventory를 재생성한다. Implementation gate가 통과한 row만 새 Runtime taxonomy와 implemented verification으로 승격한다.

### [Source conformance verification matrix](013-decide-source-conformance-verification.md)로 넘길 executable oracle

- `approve_once`, `decline`, `cancel` table이 numeric·string original Server `RequestId`에 각각 exact generated result를 한 번 쓰고 opposite-direction same raw ID와 섞이지 않는다.
- Concurrent duplicate caller answer는 atomic claim 하나, `already_answered` 하나, response frame 하나다. Invalid/unconstructable session·amendment decision은 frame 0개다.
- Pre-response request는 raw payload 없이 stage되고 matching response 뒤에만 handle이 활성화된다. Mismatched/error response는 actor contradiction과 same-ID error, unrelated Thread B progress를 보존한다.
- Resolved-before-answer, resolved-before-write-attempt, write-attempt-before-resolved를 각각 재현해 zero/one frame, immutable caller outcome과 no-second-settlement을 검증한다.
- Pure cleanup fixture는 turn terminal·successor turn start가 resolved보다 먼저임을 assert한다. 별도 client-response-vs-transition race는 resolved-before-terminal을 만들며 두 경로 모두 pending을 한 번만 끝낸다. Terminal 뒤 resolved 미관찰 + connection close도 timer 없이 닫힌다.
- Close-before-answer는 capability를 실제 revoke해 late handle이 writer에 도달하지 않는다. Write attempt 뒤 writer callback 전 stdin fault·child loss는 delivery unknown이고 response replay는 0회다. Callback success 뒤 loss는 `submitted`를 바꾸지 않는다.
- Same-ID exact replay는 Connection의 source-shape/robustness oracle로 coalesce하고 conflicting method/scope reuse는 fail-closed한다. 이는 deferred `thread/resume` integration coverage가 아니다. Settled Server ID를 새 request로 순차 재사용하지 않으며 old handle/resolved가 다른 pending을 끝내지 못한다.
- Non-null `approvalId` subcommand와 network-only presentation은 independent original ID의 deterministic unsupported error이며 public pending이 없다. Same parent item의 distinct approval IDs를 `itemId` 하나로 합치지 않는다.
- Actor pending count와 retained-byte tiny cap을 따로 넘겨 scoped same-ID error와 unrelated Thread B progress를 검증하고, Connection seen-ID count/byte cap은 explicit terminal을 만든다.
- Command, cwd, reason, environment, actions, network context와 amendment sentinel을 safe pending·error·submission outcome·tombstone 전체에서 재귀 검사해 비보존을 증명한다. Huge raw display payload는 frame/dispatch cap만 소비하고 semantic pending bytes를 키우지 않는다.
- Unknown valid resolved는 no-op, known ID + wrong thread는 original actor poison, exact duplicate resolved는 no-op다.
- Fake clock을 진행해도 auto-decline·cancel·error·`turn/interrupt`가 0회다.
- Normal fake-child round trip은 `response → matching resolved → authoritative matching command/turn observation`을 raw journal 순서로 증명하되 resolved를 command success로 사용하지 않는다.

Fake child가 race와 no-raw invariant의 normative oracle다. Narrow live candidate는 isolated three-root와 controlled model fixture에서 regular command 하나를 유도하고 `decline`을 original ID에 써 matching resolved, declined command item과 이후 authoritative turn terminal을 관찰하는 opt-in pin/conformance probe다. Live probe가 재현 가능한 fixture를 갖추는지와 일반 PR·pin upgrade 중 어느 gate에 둘지는 [Source conformance verification matrix](013-decide-source-conformance-verification.md)가 결정하며, live scheduler로 duplicate·terminal race를 증명하지 않는다.

### HITL audit

새로운 product decision은 없다.

- Regular-only T0.1, safe three-decision mapping, no timeout·auto-resolution·session/amendment와 product UI deferred는 [첫 tracer와 module seam](008-choose-first-tracer-and-module-seams.md)과 [첫 Server request variant 비교](../assets/008-server-request-variant-comparison.md)에서 이미 승인됐다.
- Native identity·per-thread isolation·lossless-to-owner-or-explicit-failure·terminal capability revoke와 unknown outcome은 앞선 [identity](009-decide-identity-and-authority.md)·[concurrency](010-decide-concurrency-policy.md)·[delivery](011-decide-delivery-and-recovery-model.md)·[connection outcome](012-decide-connection-and-unknown-outcome-policy.md) 결정의 직접 적용이다.
- Source가 non-null `approvalId`를 subcommand callback, network context를 별도 presentation으로 규정하므로 이를 T0.1에 포함하지 않는 것은 기존 regular-only scope의 명료화다.
- Connection tombstone·conflicting reuse fail-closed와 no-raw safe projection은 pinned server의 monotonic ID·exact replay와 repo의 bounded/sanitized runtime 계약을 외부 stdio에서 보존하는 strengthening이며 product UX를 추가하지 않는다.

`acceptForSession`, amendments, additional permissions, subcommand concurrency, command/cwd/reason browser projection, browser detach/default, remembered approval, audit와 actual UI를 채택할 때만 별도 AY-PLE 선택이 필요하다. Standing approval을 적용하고 같은 결정을 다시 묻지 않는다.

### 결정

T0.1은 matching active native turn에서 **regular command approval 하나**만 지원한다. Connection은 generated validation 뒤 original server-direction `RequestId`의 atomic result/error lease, serialized writer stage, terminal revoke와 process-lifetime tombstone을 소유한다. `ThreadActor`는 response-authority 전 sanitized staging, native thread·turn·item correlation, caller decision claim, resolved·turn-transition release와 compact safe tombstone을 소유한다. Raw command/path/reason/policy payload와 original ID는 caller·product contract에 노출하거나 semantic state에 보존하지 않는다.

`approve_once | decline | cancel`만 각각 generated `accept | decline | cancel` result로 한 번 쓴다. Writer success는 `submitted`일 뿐 decision 적용이 아니며 matching `serverRequest/resolved`도 server callback clear만 증명한다. Matching command `item/completed`와 `turn/completed`가 각각 command·turn outcome authority다. Resolved, turn transition, connection cut과 caller answer는 한 arbiter에서 선착순으로 response lease와 semantic pending을 닫고, write attempt 뒤 writer callback settlement를 잃은 경우만 `delivery_unknown`으로 남긴다. 이미 settle된 `submitted`는 후속 loss로 바꾸지 않는다. Late answer, duplicate resolved, exact replay는 두 번째 response를 만들지 않으며 conflicting same-ID reuse만 fail-closed한다.

Actor pending cap은 1이고 wall-clock expiry가 없다. Actor-local saturation·unsupported variant는 constant same-ID error와 explicit scoped non-success로 끝나며 unrelated thread를 막지 않는다. Connection registry saturation은 exact demux를 보존할 수 없으므로 terminal이다. Coverage ledger는 design-only로 유지하고 JSON/inventory/integration은 [Source conformance verification matrix](013-decide-source-conformance-verification.md)의 schema와 implementation gate 전까지 승격하지 않는다.

### Review checkpoint

- Source: 0 findings. Pure turn-transition cleanup의 `transition → resolved`와 client-response-vs-transition의 `resolved → terminal` race를 분리했고, normal direct response의 command/turn ordering 근거를 source와 test가 각각 실제로 증명하는 범위에 맞췄다. Regular·subcommand·network 분류, decision mapping, process-lifetime ID/tombstone, dedicated-child terminal과 conditional live probe도 exact pin에 맞는다.
- Standards: 0 findings. 읽을 수 있는 linked ticket title, 한국어 일반 설명, current row와 target design 분리, generated inventory 비수정과 one-ticket scope를 지켰다. 새 local Markdown link target과 `git diff --check`가 유효하다.
- Spec: 0 findings. Runtime-owned method projection과 Connection-owned validation/lease/write seam, immutable `submitted`, known-scope contradiction poison, provisional staging, cap·no-expiry·no-raw 계약이 앞선 identity·concurrency·delivery·connection outcome 결정과 일치한다.

남은 risk는 exact numeric cap, cross-owner arbiter 구현과 race/no-raw oracle이 아직 executable evidence를 갖지 않았다는 점이다. 이는 이 ticket의 미결정이 아니라 [Source conformance verification matrix](013-decide-source-conformance-verification.md)와 resulting spec·implementation ticket으로 넘긴 검증 범위다.
