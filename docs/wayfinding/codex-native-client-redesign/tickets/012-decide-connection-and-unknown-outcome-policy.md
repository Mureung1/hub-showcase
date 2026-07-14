# 012 — Connection loss와 unknown outcome 정책을 결정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)

## Question

`CodexAppServerConnection`의 child·stdio·single ingress·pending RPC·process terminal과 `CodexConversationRuntime`의 method별 in-flight semantic outcome·completion authority를 어떤 owner matrix와 precedence로 끝낼 것인가? Initialize·read-only request·non-idempotent mutation·active turn 도중 timeout/loss를 구분하고, unknown mutation outcome을 성공으로 합성하거나 자동 replay하지 않는다. `thread/unsubscribe`·resume·idle unload는 해당 inventory row의 tracer가 채택될 때만 확장한다.

Browser detach·restart UX는 `AYPLE adapter` 책임으로 남기고 connection cleanup과 섞지 않는다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## Ticket 019 교정

[First-party client port 감사](../assets/019-first-party-client-port-and-reuse-audit.md)가 이 ticket의 현재 처리 방침을 보완한다. Active pending RPC의 disconnect settlement, request/turn-local outcome 증거, close·kill·reap과 non-idempotent mutation의 blind retry 금지는 유지한다. 아래 진행 메모·Answer의 awaiting-late-response sink, process-lifetime response tombstone, never-issued·unknown·late response의 global terminal, contradiction category/lattice, permanent actor poison과 tail-aware global semantic arbiter는 supersede한다. Python과 Rust client처럼 first response에서 active waiter를 제거하고 이후 map miss는 public mutation 없는 no-op로 처리하는 것이 기준 동작이다. Malformed envelope/framing은 connection terminal이지만 matching response의 generated payload decode failure는 해당 request만 실패시키고 unrelated routing은 유지한다. Explicit `thread/read`·`thread/resume` reconciliation은 해당 future tracer가 source 근거와 함께 채택할 수 있으며 automatic reconciliation만 현재 범위 밖이다.

## 진행 메모

### Source-grounded terminal·outcome 제약

| 범위 | Exact-pin source/test 판독 | 설계 제약 |
| --- | --- | --- |
| External stdio client | Pinned production tree에는 child process를 spawn하는 재사용 가능한 client-side stdio owner가 없다. Test helper의 stdin close·poll·kill은 stdout tail drain과 실패 contract를 제공하지 않는다. [`connection architecture`](../assets/005-first-party-connection-ingress-architecture.md#test-전용-stdio-helper) | `close()`·tail drain·force-kill·reap은 Rust line-copy가 아니라 external child owner인 AY-PLE Connection의 correctness policy로 명시한다. |
| Pending Client RPC | First-party remote client는 한 worker가 pending map과 stream을 소유하고 matching response/error에서 waiter를 remove-once하며, EOF·stream error에서 나머지 waiter를 일괄 실패한다. Post-initialize request에는 일반 timeout·cancel·deregister contract가 없다. [`RemoteAppServerClient`](../assets/005-first-party-connection-ingress-architecture.md#remoteappserverclient-운영-경로) | Exact `RequestId`·single settlement은 채택하되, deadline·tombstone·unknown outcome은 external client가 명시적으로 보강한다. |
| `initialize` | Server는 connection session initialize를 commit한 뒤 response를 enqueue한다. First-party remote client는 bounded bootstrap response를 기다린 뒤에만 `initialized`를 보내고 같은 connection/stream에 retry하지 않는다. [`initialize` lifecycle](../assets/004-method-lifecycle-fact-table.md#1-initialize의-public-lifecycle과-response-barrier를-구분한다) | Response loss·timeout은 server-side commit이 unknown이다. AY-PLE의 one-child/one-connection external stdio policy는 같은 child에 resend하지 않고 startup을 실패한 뒤 drain·reap한다. |
| Non-idempotent mutation | `thread/start`는 request에 idempotency key가 없고 resend하면 다른 thread를 만들 수 있다. Idle `turn/start`는 submission을 생성하고 active branch는 steer로 동작한다. [`thread/start`](../assets/004-method-lifecycle-fact-table.md#2-threadstart의-matching-threadstarted는-response-first다) · [`turn/start`](../assets/004-method-lifecycle-fact-table.md#3-turnstart는-idle-create와-active-steer가-같은-method에-겹친다) | Write가 시작된 뒤 acceptance authority를 잃으면 unknown이다. Auto replay·read/list/resume reconciliation·rollback로 결과를 꾸며내지 않는다. |
| Turn completion | Matching `turn/completed`는 status authority이지 process·child-item drain이 아니다. `error`는 turn terminal을 대체하지 않는다. [`turn/completed`](../assets/004-method-lifecycle-fact-table.md#5-turncompleted와-child-item-drain은-다른-축이다) · [`error`](../assets/004-method-lifecycle-fact-table.md#8-error와-두-turninterrupt-branch의-authority를-구분한다) | Response acceptance, semantic terminal, T0 product projection delivery, process cleanup을 독립 축으로 보존한다. |
| Multi-thread lifetime | First-party architecture와 Ticket 010은 thread-local owner의 독립 진행을 baseline으로 둔다. Process terminal은 live actor attachment를 폐기하지만 native `ThreadId`를 stale로 만들지 않는다. [`conversation ownership`](../assets/006-first-party-conversation-ownership.md#event-전달-경로와-multi-thread-진행) · [Ticket 009](009-decide-identity-and-authority.md#answer) · [Ticket 010](010-decide-concurrency-policy.md#answer) | Individual request·actor deadline을 즉시 connection-wide failure로 확대하지 않고, 신뢰할 수 없는 ingress·process fault만 Connection terminal로 올린다. |

### Owner matrix

| Owner | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `CodexAppServerConnection` | Child spawn·stdio handle, serialized writer, single framed ingress, initialize/initialized handshake, direction-aware exact `RequestId`, pending Client RPC·observer deadline·connection-lifetime RequestId state, Server-request response capability, terminal arbiter, bounded tail drain, force-kill·reap, idempotent `close()` | Method mutation의 의미, T0 success gate, thread history reconciliation, browser retry UX |
| `CodexConversationRuntime` | T0 composite operation phase, native `ThreadId`별 `ThreadActor`, response/notification convergence, method authority, actor-local contradiction·semantic deadline, process-attachment sink, immutable caller settlement | Child signal·reap, raw JSONL, automatic process restart, browser detach policy |
| `AYPLE adapter` | 후속 tracer에서 safe product outcome mapping, user-visible retry/restart affordance, browser attachment·`ModelingRun` lifetime | Pending RPC, native identity authority, process cleanup, unknown outcome 추론 |
| Pinned Codex | Native thread identity와 source가 규정한 method response·notification authority, rollout/history가 존재하는 범위의 persistence | Response를 잃은 external client mutation이 성공·rollback되었다는 사후 증명 |

Connection은 wire fact를 알고 Runtime은 method fact를 안다. 따라서 Connection은 `write()` callback 성공을 mutation receipt로 해석하지 않고 request stage와 terminal cause를 Runtime에 전달한다. Runtime은 method class와 이미 받은 authority를 결합해 operation outcome을 한 번만 settle한다.

### Request stage와 outcome precedence

| Stage | 증명된 사실 | Non-idempotent operation outcome | 후속 동작 |
| --- | --- | --- | --- |
| `pre_admission` | Actor·Connection capacity를 reserve하지 않았고 `RequestId`·JSONL write가 없다. | `known_not_sent` | 현재 operation은 안전하게 종료할 수 있지만 Connection은 retry하지 않는다. |
| `registered_not_written` | Capacity와 `RequestId`를 reserve했지만 writer가 child stdin에 write call을 시작하지 않았다. | `known_not_sent`; 할당한 ID는 재사용하지 않는다. | Waiter를 once-only settle하고 compact tombstone으로 남긴다. |
| `write_attempted` | Serialized frame의 write call이 시작됐다. Callback failure·success 모두 peer receipt·apply를 증명하지 못한다. | Observer deadline·terminal cut까지 valid response가 없으면 `acceptance_unknown`. | Public waiter는 once-only settle하되 underlying request identity는 `awaiting_late_response` sink로 유지한다. Auto replay·rollback·reconciliation은 금지한다. |
| `response_accepted` | Exact ID의 envelope와 method-specific generated schema를 통과한 response를 받았다. `thread/start`·`turn/start`에서 acceptance와 native identity가 확정됐다. | Required live terminal이 없으면 `accepted_execution_unknown`. | 해당 actor의 신규 mutation을 막고 ingress를 계속 drain한다. Unrelated actor는 계속 진행한다. |
| `semantic_terminal` | Matching `turn/start` response로 acceptance·identity를 확정한 뒤, 그 identity의 `turn/completed`를 받았다. Pre-response terminal은 provisional observation이지 이 stage가 아니다. | `failed | interrupted`는 known terminal failure. `completed`이지만 required completed AgentMessage가 없으면 `known_completed_projection_unavailable`. 둘 다 모이면 T0 success. | Caller result를 불변으로 settle하고 compact actor만 남긴다. |

우선순위는 ingress·operation owner가 실제로 처리한 authority를 따른다.

1. Writer에 넘기기 전 거부는 `known_not_sent`다.
2. Write attempt 후 valid response 전 deadline·loss는 mutation acceptance unknown이다.
3. Valid response 후 semantic gate 전 deadline·loss는 accepted execution unknown이다.
4. Validated response와 Ticket 011 delivery gate가 terminal cut 전 모이면 known outcome이고 이후 connection loss·cleanup failure가 소급해 바꾸지 못한다.
5. Server error response는 transport loss가 아닌 `server_rejected` authority로 보존하되, Connection이 이를 side-effect-free나 retryable로 추론하지 않는다. Provisional lifecycle과 모순하면 method owner인 actor를 poison한다.

`error` notification은 source fact상 non-terminal이며 matching `turn/completed`를 대체하지 않는다. T0·T0-C는 이 row를 envelope boundary에서 validate·tolerate할 수 있지만 Runtime semantic coverage로 승격하지 않는다. Notification-first `turn/started`·item·terminal을 이미 받았더라도 `turn/start` response authority가 deadline 전 없으면 success나 known failure를 합성하지 않고 `acceptance_unknown`으로 settle한다. Late authority는 parse·validate·correlate해 sink의 native scope를 보강할 수는 있지만 이미 반환한 caller outcome을 다시 settle하지 않는다.

Response·provisional lifecycle의 contradiction은 authority loss와 구분한다.

- `turn/started(A)` 후 success response가 `B`를 authority로 제시하면 owning operation을 safe non-success `actor_protocol_contradiction`으로 settle한다. `A`를 `B`로 alias·rebind하지 않고 두 native scope의 sanitized fingerprint를 process-attachment sink에 보존하며, 해당 actor의 신규 mutation과 auto retry를 막는다. Unrelated actor는 계속 진행한다.
- Provisional `turn/started`·item·terminal 후 matching request가 Server error response로 끝나면 단순 `server_rejected`로 꾸며내지 않고 같은 `actor_protocol_contradiction`을 반환한다. Provisional lifecycle이 없는 generated-valid error response만 `server_rejected`다.
- `actor_protocol_contradiction`은 AY-PLE product error wording이 아니라 Runtime의 transport-neutral safe outcome category다. Adapter mapping은 Ticket 018이 소유하고, Connection terminal 시 sink attachment는 tail cut 후 폐기한다.

### Method class별 정책

| Class·method | Deadline·loss outcome | Retry·recovery | Owner |
| --- | --- | --- | --- |
| Bootstrap `initialize` | Response 전 loss는 dedicated-child connection commit unknown. Response 후 `initialized` write가 실패해도 ready Runtime을 공개하지 않는다. Matching response 전 notification은 bounded FIFO stage하고 Server request는 direction-level handler가 처리하되, startup 실패 시 public Runtime state로 승격하지 않는다. | 같은 child에 resend하지 않고 drain·reap한다. Cleanup 후 새 process를 여는 것은 상위 caller의 명시적 새 attempt이지 Connection auto-retry가 아니다. | Connection bootstrap |
| Future source-classified read-only query | Valid response 전 deadline은 result unavailable이며 mutation unknown으로 매핑하지 않는다. | 해당 method tracer가 source/test로 재조회를 허용한 경우에만 상위 owner가 새 ID로 explicit retry할 수 있다. Connection은 method 이름으로 read-only를 추측하지 않는다. | Future method tracer; `thread/read`·`thread/list`는 T0 recovery에서 deferred |
| `thread/start` | Response 전 write-attempted loss는 acceptance unknown. Response 후 native `ThreadId`는 known이다. | 재전송·`thread/list`·`thread/read`·resume reconciliation을 하지 않는다. Response가 없으면 `turn/start`를 보내지 않는다. | Connection response waiter → Runtime composite operation |
| Idle `turn/start` | `turn/started`는 provisional이며 response가 acceptance·identity authority다. Response 전 loss는 acceptance unknown, response 후 terminal 전 loss는 accepted execution unknown이다. | Auto replay·interrupt·resume·read backfill을 하지 않는다. Healthy Connection의 local deadline에서는 해당 actor를 sink로 남기고 신규 mutation을 받지 않지만, Connection terminal에서는 tail cut 후 live attachment를 폐기한다. | `ThreadActor` |
| Active `turn/start`·`turn/steer`·`turn/interrupt` | Pinned source의 branch와 side effect를 현재 T0 contract로 선결정하지 않는다. | 각 method tracer 전까지 deferred. Close primitive로 사용하지 않는다. | Future Runtime tracer |
| Active T0 turn observation | Matching response 후 terminal 전 semantic deadline·process loss는 accepted execution unknown. Completed terminal만 있고 AgentMessage가 없으면 projection unavailable이다. | Healthy Connection의 semantic deadline에서는 live-only sink로 drain하고, process terminal에서는 buffered tail cut 후 attachment를 폐기한다. 어느 경우도 public success를 꾸며내지 않는다. | `ThreadActor` |

T0 composite에서 `thread/start` response만 받은 뒤 `turn/start`가 pre-wire 실패하면 "native thread는 생성됐고 turn은 보내지 않음"이라는 partial known effect다. Runtime은 이 thread를 삭제·archive·unsubscribe하지 않고, adapter에 safe outcome만 제공한다. Thread response 자체를 잃은 경우에는 public native identity를 합성하지 않는다.

### Deadline·late response·cancellation

- Deadline은 `spawn/bootstrap`, `initialize response`, serialized writer admission, method response authority, semantic completion, explicit-close drain, SIGTERM grace, SIGKILL/reap을 별도의 named phase로 둔다. Exact default는 resulting spec·implementation ticket에서 package-private, test-injectable constant로 고정하고 Ticket 013이 tiny-deadline oracle을 소유한다.
- Response deadline은 writer write-attempt stage를 기준으로 시작하고, bounded pre-wire queue는 별도 admission deadline을 사용한다. Queue 대기 시간을 mutation unknown으로 잘못 분류하지 않는다.
- Response, observer deadline, child·stdio signal은 같은 Connection arbiter에서 순차 처리한다. Response가 먼저 처리되면 authority가 settle하고, deadline이 먼저면 public outcome은 immutable이며 후속 response는 sink에만 반영한다. Wall-clock timestamp나 나중 cleanup signal이 처리된 결과를 덮지 않는다.
- Request observer timeout은 wire cancel이 아니고 `turn/interrupt`도 아니다. Public waiter를 method-specific immutable outcome—mutation unknown 또는 future query unavailable—으로 settle해도 underlying request entry는 first matching response/error 또는 Connection terminal까지 `awaiting_late_response`로 남겨 exact demux를 유지한다. Caller의 Promise abandon·browser disconnect를 wire cancellation으로 번역하지 않는다. Explicit interrupt와 browser lifetime은 각 owning tracer에 남긴다.
- First matching response/error는 public observer가 이미 settle되었어도 envelope와 저장한 response contract—generic error envelope 또는 method success schema—로 검증하고 Runtime sink에 authority를 전달한 뒤 request entry를 settled tombstone으로 바꾸며 public caller를 재-settle하지 않는다. Tombstone은 response class와 current tracer가 소비한 native identity·allowlisted sanitized semantic field만 fingerprint로 보존하고 raw result·message·data를 남기지 않는다.
- Known settled ID의 후속 response는 같은 stored response contract로 검증한다. Response class·sanitized semantic fingerprint가 같은 exact semantic repeat만 no-op이고, success↔error 변경이나 다른 authoritative identity·consumed semantic field를 제시하면 Connection terminal이다. Pinned remote client는 first response 후 모든 duplicate/unknown을 조용히 무시하며 conflict contract이 없다. Response validation·lifetime tombstone·conflict fail-closed는 exact demux와 single-assignment authority를 위한 AY-PLE Connection strengthening이지 upstream 보장이 아니다.
- Never-issued ID, Client-issued ID와 Server-issued ID의 direction ambiguity, stored response contract-invalid late response는 exact demux를 신뢰할 수 없으므로 Connection terminal이다. Never-issued ID fail-closed는 upstream의 silent ignore보다 강한 AY-PLE Connection policy임을 명시한다.
- Individual response·semantic timeout은 해당 operation/actor만 settle·poison하고 Connection과 unrelated actor를 계속 진행시킨다. Scope를 알 수 없는 framing·schema·envelope·demux fault와 child·stdio terminal만 Connection-wide다.

`awaiting_late_response`와 settled tombstone을 Connection lifetime 동안 eviction하지 않는다. Registry는 RequestId count와 retained method-tag·sanitized-fingerprint bytes를 독립 package-private bound로 제한하고 Ticket 013이 exact default·tiny-cap oracle을 고정한다. 두 축 중 하나라도 다 쓰면 새 request를 wire에 보내지 않고 Connection을 terminal로 전환한다. 새 operation은 `known_not_sent`이고 이미 settle된 operation은 불변이며, Connection이 자동 rotate·restart하지 않는다.

### Terminal arbiter와 `close()`

Connection은 `active → closing → terminal → reaped` 상태를 한 번만 전이하고, 다음 정보를 서로 덮어쓰지 않는다.

| Record | 의미 | Precedence |
| --- | --- | --- |
| Primary correctness cause | Explicit local close, stdout EOF/read fault, stdin write fault, child error/exit, protocol/demux fault, bound exhaustion 중 closing을 처음 시작한 원인 | 첫 전이 후 불변 |
| Ingress terminal cut | 더 이상 complete frame을 semantic authority로 인정하지 않는 single-ingress 경계 | Cut 전 Runtime에 route된 authority만 operation settlement에 참여 |
| Process evidence | Exit code·signal, stdout/stderr EOF, force signal 전송 결과 | Primary cause를 대체하지 않음 |
| Cleanup outcome | Child reap·owned reader/writer task join의 성공 또는 stable cleanup failure | 이미 settle된 semantic outcome을 덮지 않고 `close()` 결과에 별도 보고 |

- Explicit close, child exit, stdin write fault를 관찰하면 새 admission·write를 즉시 막되, 별도 stdout pipe에 이미 쓰인 complete tail frame을 버리지 않는다. Existing single reader를 bounded하게 drain하고 frame을 parse·validate·route한 뒤 EOF·read fault·drain deadline에 cut을 닫는다. Child `exit`는 stdout pipe close와 같은 signal이 아니고 stdin write failure도 stdout read trust를 자동 폐기하는 증거가 아니므로, 이 신호들이 buffered tail보다 먼저 보였다는 이유만으로 pending을 즉시 실패하지 않는다. 이 precedence는 upstream contract가 아닌 AY-PLE external stdio policy다.
- Malformed frame·schema/envelope/demux fault에서는 offending ingress 위치가 즉시 cut이며 후속 buffered frame을 신뢰하지 않는다. Resource cleanup을 위해 pipe를 비울 수는 있지만 semantic dispatch는 하지 않는다.
- Cut에서 pending Client RPC와 Runtime actor를 각 stage에 따라 once-only settle한다. 이미 full success·known terminal gate를 닫은 result는 그대로 유지하고, write-attempted mutation에 authority가 없으면 unknown으로 남긴다.
- Idempotent `close()`는 coalesced promise를 반환하고 admission stop → stdin once-close → bounded stdout/stderr drain·graceful exit → SIGTERM grace → SIGKILL grace → child reap·owned task join을 수행한다. Protocol trust fault는 semantic drain을 즉시 끝내지만 resource reap은 생략하지 않는다.
- `close()` success는 graceful exit을 의미하지 않고 owned child·task가 남지 않았음을 의미한다. SIGKILL 후 reap했다면 cleanup은 완료될 수 있고, deadline 안에 reap을 증명하지 못하면 stable cleanup failure다.
- Runtime close는 `turn/interrupt`, `thread/unsubscribe`, `thread/read`, `thread/resume`, `thread/closed`를 보내지 않는다. Process terminal은 live actor attachment를 폐기하지만 native `ThreadId`를 remap·stale 처리하지 않고 process를 자동 재시작하지 않는다.

Connection terminal은 active Server-request response capability를 모두 revoke하고 late responder가 wire를 쓰지 못하게 한다. T0의 inbound request는 ingress에서 original ID의 deterministic unsupported response를 즉시 once-only로 쓴다. T0.1 approval의 semantic pending·expiry·`serverRequest/resolved`·terminal-vs-late-answer race는 [Ticket 017](017-decide-command-execution-approval-round-trip.md)이 소유한다.

### Connection-wide와 actor-local failure

| Connection-wide terminal | Actor·operation-local settlement |
| --- | --- |
| Invalid UTF-8/JSONL framing, generated-schema-invalid envelope·response, direction ambiguity, never-issued Client response ID, settled response authority의 conflicting reuse | Individual response authority deadline |
| Stdout EOF/read failure, stdin write failure, child error/exit | Response acceptance 후 required semantic observation deadline |
| Any pre-response `thread/started`: pinned response-first contract 위반이고 authoritative actor binding이 없음 | Notification-first `turn/start` provisional identity와 response identity mismatch |
| 해소할 수 없는 raw frame·dispatch·identity bound | Server error response와 이미 관찰한 provisional native lifecycle의 모순 |
| Single ingress·writer arbiter 자체의 invariant 손상 | Full native scope가 확정된 notification contradiction·actor retained-state saturation·response↔provisional lifecycle `actor_protocol_contradiction` |

Healthy Connection의 actor-local failure 후에도 exact response와 후속 observation을 sink로 drain하고 unrelated thread를 진행시킨다. Connection terminal이면 buffered tail을 cut까지 처리한 뒤 live actor attachment를 폐기한다. Public T0 result는 일단 settle되면 late authority·connection terminal·cleanup failure로 재작성하지 않는다.

### 현재 구현의 selective salvage

| 판정 | 현재 구현 상태 | Target |
| --- | --- | --- |
| 선별 재사용 | `CodexStdioTransport`의 typed identity key, direction-aware demux, timed-out ID tombstone, one-consumer ingress, coalesced spawn/close, SIGTERM→SIGKILL exit confirmation, generated validator, once-only Server response closure, actual-child journal oracle | 새 Connection owner 뒤에서 각 primitive와 oracle만 deepening한다. |
| Replacement 필요 | 현재 request는 `pending | completed | timed_out`만 보존하고 timeout을 write 전에 시작하며, close는 semantic owner에 알리기 전 registry를 비운다. Notification generated-schema validation, raw line·aggregate byte bound, terminal cancellation handoff가 없다. | Stage-aware settlement, tail-aware terminal arbiter, count+byte bounds, parsed·validated dispatch, Runtime terminal handoff로 교체한다. |
| 제거할 legacy policy | `HeadlessCodexClientHost`의 generation·sequence·global subscription, `recoverable`·`permanentlyFailed`, cleanup failure가 startup cause를 덮는 precedence, Server request `dismiss()` | Codex-native Connection·Runtime의 compatibility 제약으로 삼지 않고, 새 Runtime에서 cleanup failure가 startup·semantic outcome을 덮지 못하게 한다. |
| 별도 보호 | `CodexRawClient`, `CodexRuntimeAdapter`, Runtime Harness route·test | 새 Connection baseline으로 합치지 않고 Ticket 014 migration에서 회귀를 막는다. |

현재 `@ay-ple/runtime-codex` test 116개가 통과한 것은 salvage baseline의 현재 동작 증거이지 새 outcome contract의 conformance proof가 아니다. Wayfinder 결정만으로 code·package README·implementation map의 current-state claim을 바꾸지 않는다.

### Coverage ledger 초안

| Inventory row | 현재 integration / adoption | Target tracer·class·authority | Timeout·terminal·retry | Owner·evidence·oracle |
| --- | --- | --- | --- | --- |
| `initialize`, `initialized` | `client-host` / `baseline` | T0 bootstrap. Matching response 후 outbound `initialized`까지 ready gate | Same-child timeout/loss unknown, resend 금지, close·reap; explicit new-process attempt만 가능 | Connection; [`initialize` evidence](../assets/004-method-lifecycle-fact-table.md#1-initialize의-public-lifecycle과-response-barrier를-구분한다); response hang·initialized-write-failure oracle |
| `thread/start` | `raw-wrapper` / `baseline` | T0·T0-C non-idempotent mutation; response identity authority | Pre-wire known-not-sent, write-attempt 후 response loss unknown, replay·reconcile 금지 | Connection waiter → Runtime operation; [response-first evidence](../assets/004-method-lifecycle-fact-table.md#2-threadstart의-matching-threadstarted는-response-first다); exactly-one write·response-loss oracle |
| `thread/started` | `schema-only` / `baseline` | T0·T0-C validate-if-observed; result barrier 아님 | Response 후 matching observation은 같은 actor에 수렴하고 result를 바꾸지 않음; pre-response는 Connection terminal | Runtime + Connection; [Ticket 009 response-first authority](009-decide-identity-and-authority.md#coverage-ledger-영향); pre-response fault oracle |
| `turn/start` | `raw-wrapper` / `baseline` | T0·T0-C idle non-idempotent mutation; response acceptance/identity authority | Either-order provisional convergence, response loss acceptance unknown, terminal loss accepted execution unknown, mismatch는 `actor_protocol_contradiction`, replay 금지 | `ThreadActor`; [idle/active evidence](../assets/004-method-lifecycle-fact-table.md#3-turnstart는-idle-create와-active-steer가-같은-method에-겹친다); response-first·notification-first·loss-tier oracle |
| `turn/started` | `schema-only` / `baseline` | T0·T0-C required handling, response authority 아님 | Provisional scope mismatch는 actor-local poison; caller success 합성 금지 | `ThreadActor`; [Ticket 009 core start·listener evidence](009-decide-identity-and-authority.md#coverage-ledger-영향); either-order oracle |
| `item/started`, `item/agentMessage/delta` | `schema-only` / `baseline` | T0·T0-C tolerated validated / validate-and-discard observation | Terminal authority 아님; loss를 history로 복구하지 않음 | `ThreadActor`; [Ticket 011 delivery](011-decide-delivery-and-recovery-model.md#t0t0-ct01-delivery-class); no-raw-retention oracle |
| `item/completed` | `schema-only` / `baseline` | T0·T0-C completed-success AgentMessage conditional authority | `completed` terminal과 함께일 때만 success; missing은 projection unavailable | `ThreadActor`; [Ticket 011 delivery gate](011-decide-delivery-and-recovery-model.md#t0t0-ct01-delivery-class); partial-loss oracle |
| `turn/completed` | `schema-only` / `baseline` | T0·T0-C authoritative semantic terminal; matching start response 전에는 provisional | Response-confirmed `failed | interrupted`는 known terminal; response-confirmed `completed`는 AgentMessage를 추가로 요구; drain 아님 | `ThreadActor`; [terminal evidence](../assets/004-method-lifecycle-fact-table.md#5-turncompleted와-child-item-drain은-다른-축이다); settle-then-loss oracle |
| `error` | `schema-only` / `baseline` | T0·T0-C envelope-tolerated validation only; Runtime semantic coverage deferred | `turn/completed` 대체 authority로 사용하지 않음 | Connection validation boundary; [error authority](../assets/004-method-lifecycle-fact-table.md#8-error와-두-turninterrupt-branch의-authority를-구분한다) · [Ticket 011 deferred coverage](011-decide-delivery-and-recovery-model.md#t0t0-ct01-delivery-class); error-without-terminal oracle |
| All inbound Server request rows | 모두 `schema-only`; current adoption `baseline` 4 / `case-driven` 2 / `unreviewed` 5 | T0 direction-level same-ID deterministic unsupported; method semantic integration 아님; row별 adoption 유지 | Once-only response; terminal에 response capability revoke | Connection envelope owner; [generated Server request inventory](../../../architecture/codex-app-server-method-inventory.md#server-요청); unsupported·terminal-race oracle |
| `item/commandExecution/requestApproval` | `schema-only` / `baseline` | T0 unsupported → T0.1 required delivery-to-owner | Connection terminal handoff만 이 ticket에서 고정; pending·expiry·late answer는 Ticket 017 | Connection + `ThreadActor`; [variant evidence](../assets/008-server-request-variant-comparison.md); Ticket 017 oracle |
| `serverRequest/resolved` | `schema-only` / `baseline` | T0.1 candidate correlation observation | Required occurrence·ordering은 이 ticket에서 결정하지 않음 | Ticket 017·013; [variant evidence의 dedicated source/test gap](../assets/008-server-request-variant-comparison.md) |
| `thread/read`, `thread/list` | `raw-wrapper` / `baseline` | Future source-classified query; current Harness integration 유지 | T0 recovery·auto retry deferred; 해당 tracer에서만 explicit new-ID query 판단 | Future method owner; [`thread/read` availability](../assets/004-method-lifecycle-fact-table.md#7-threadreadincludeturnstrue는-모든-상태에서-turn-history를-제공하지-않는다) |
| `thread/resume`, `thread/unsubscribe`, `thread/closed` | `schema-only` / `baseline` | Current row 유지, T0·T0-C·T0.1 coverage deferred | Restart·cleanup·release primitive로 사용하지 않음 | Owning future tracer; [subscription·thread·process lifetime evidence](../assets/006-first-party-conversation-ownership.md#subscriptionthreadprocess-lifetime) |
| `turn/interrupt` | `raw-wrapper` / `baseline` | Normal-control tracer 전 deferred | Request timeout·Runtime close와 합치지 않음 | Future Runtime tracer; [`turn/interrupt` branch evidence](../assets/004-method-lifecycle-fact-table.md#8-error와-두-turninterrupt-branch의-authority를-구분한다) |
| `turn/steer` | `raw-wrapper` / `later` | Active-input tracer 전 deferred | Idle `turn/start` T0 outcome과 합치지 않고 auto-recovery·close에 사용하지 않음 | Future Runtime tracer; [Ticket 010 same-thread decision](010-decide-concurrency-policy.md#same-thread-start-admission과-adoption-선택지) |

Client response/error envelope, tombstone, process close는 method inventory row가 아니라 direction·Connection-level coverage다. 이 표는 coverage-schema 전 design checkpoint이므로 `codex-method-decisions.json`·generated inventory를 수정하거나 integration을 승격하지 않는다. Machine-readable field·taxonomy·verification state는 Ticket 013이 소유한다.

### Ticket 013으로 넘길 executable oracle

- Pre-admission·registered-not-written rejection이 fake-child journal에 JSONL request를 0회 남긴다.
- `thread/start`·`turn/start` write-attempt 후 response hang·loss는 unknown이고 같은 operation replay·`thread/read`·resume·interrupt를 0회 실행한다.
- `thread/start` response만 있는 partial effect, `turn/start` response 후 loss, AgentMessage만 있는 loss, terminal만 있는 projection unavailable, full gate 후 loss를 서로 구분한다.
- `turn/started(A) → turn/completed(failed|interrupted,A) → response timeout`은 `acceptance_unknown`이고, 같은 provisional trace 후 matching response `A`가 deadline 전 오면 known terminal failure다.
- `turn/started(A) → success response(B)`와 `turn/started(A) → Server error response`는 owning operation만 `actor_protocol_contradiction`으로 settle하고 `A`·`B` safe fingerprint를 alias하지 않으며, unrelated actor는 진행하고 auto retry는 0회다.
- `A timeout → B complete → A late response`에서 B는 성공하고 A outcome은 불변이며 late authority는 validated sink로 소비된다.
- Known settled ID의 exact semantic repeat은 schema validation 후 no-op, different authority·success/error reuse와 never-issued·direction-ambiguous·schema-invalid response는 fail-closed다.
- Child exit·stdin write fault signal보다 느리게 stdout tail response가 drain되면 cut 전 authority로 적용하고, malformed frame 뒤 buffered message는 Runtime에 publish하지 않는다.
- Pending RPC fan-out, actor terminal settlement, Server-request response capability revoke는 각각 once-only다.
- Request registry count·sanitized-fingerprint byte bound를 각각 tiny-cap으로 넘기면 새 mutation을 wire에 쓰지 않고 raw response payload를 retention하지 않는다.
- Healthy Connection의 response·semantic timeout은 actor/request sink를 유지하지만 process terminal은 buffered tail cut 후 live attachment를 폐기하고 native `ThreadId` value만 변경하지 않는다.
- Explicit close는 interrupt·unsubscribe·read·resume를 0회 쓰고 graceful reap, forced-and-reaped, unproven-reap cleanup failure를 구분한다.
- Semantic success·known terminal을 settle한 뒤 connection loss·cleanup failure는 이미 반환한 result를 덮지 않는다.
- `initialize` timeout·`initialized` write failure에서 ready Runtime을 공개하지 않고 같은 child에 initialize를 재전송하지 않는다.

### HITL audit

새로운 product decision은 없다.

- Mutation replay·reconciliation을 금지하는 것은 pinned method에 idempotency·recovery authority가 없다는 사실과 사용자의 source-guided baseline 승인의 직접 결과다.
- Actor-local deadline을 unrelated thread에 확대하지 않는 것은 Ticket 010의 cross-thread independence와 Ticket 011의 scope-local failure가 이미 결정한다.
- Tail drain·terminal cut·reap은 upstream 보장을 발명한 것이 아니라 upstream에 없는 external stdio child owner를 완결하기 위한 AY-PLE Connection policy다. Primary semantic cause와 cleanup outcome을 분리해 product UX를 선결정하지 않는다.
- Pinned client의 settled duplicate silent-ignore보다 강한 sanitized semantic fingerprint·conflict fail-closed는 raw retention 없이 exact `RequestId` single-assignment를 지키는 Connection safety policy다. Count+byte bound·no-eviction으로 판정 계약을 일관되게 하고 product retry 의미를 추가하지 않으므로 새 product 선택으로 올리지 않는다.
- Automatic restart, browser disconnect 시 process close, read-based reconciliation, user-visible retry wording을 추가할 때만 새 AY-PLE 선택이 필요하다. 현재는 Ticket 018과 future method tracer로 명시적으로 deferred한다.

따라서 standing approval을 그대로 적용하고 같은 seam·replay 선택을 다시 묻지 않는다.

## Answer

`CodexAppServerConnection`은 child·stdio·single ingress·exact direction-aware `RequestId`·wire stage·terminal cut·reap을 소유하고, `CodexConversationRuntime`은 method authority와 per-thread semantic outcome을 소유한다. Capacity는 pre-wire에 reserve하고 write call 전 거부만 `known_not_sent`다. Write attempt 후 response authority를 잃은 non-idempotent mutation은 `acceptance_unknown`, response 후 terminal을 잃은 turn은 `accepted_execution_unknown`이며 자동 replay·rollback·read/resume reconciliation을 하지 않는다.

T0 success는 valid `thread/start`·`turn/start` response, matching completed AgentMessage, authoritative `turn/completed(status=completed)`가 모두 terminal cut 전 Runtime에 전달되어야 한다. Matching `turn/start` response로 identity가 확정된 `failed | interrupted` terminal만 known failure이고, response-confirmed completed terminal만 있으면 execution은 known-completed이지만 product projection은 unavailable이다. Pre-response terminal·`error`·notification-first provisional lifecycle로 response authority를 대체하거나 known success·failure를 합성하지 않는다. Settle된 caller result는 late response·connection loss·cleanup failure로 소급 변경하지 않는다.

Connection은 individual deadline을 unrelated thread failure로 확대하지 않는다. Provisional identity와 success response identity가 다르거나 provisional lifecycle 후 error response가 오면 owning actor만 `actor_protocol_contradiction`으로 settle·poison하고 alias·retry하지 않는다. First late response는 stored response contract로 검증해 sink에 authority를 전달하되 caller를 다시 settle하지 않는다. Settled response의 sanitized semantic exact repeat만 no-op이고 conflicting reuse, never-issued·direction-ambiguous·schema-invalid response, raw framing·demux fault, child·stdio loss와 global bound exhaustion은 Connection terminal이다. Lifetime tombstone·conflict detection·never-issued fail-closed는 pinned client보다 강한 AY-PLE policy며 count+byte bound를 Ticket 013에서 검증한다. Initialize response loss는 dedicated child에 붙은 connection commit이 unknown이므로 같은 child에 resend하지 않고 startup을 실패한 뒤 drain·reap한다.

Idempotent `close()`는 admission을 막고 stdin을 한 번 닫은 뒤 trustworthy complete stdout tail frame을 bounded drain하며, graceful exit·SIGTERM·SIGKILL 단계 후 child reap과 owned task join을 증명한다. Child exit·stdin write fault는 admission을 막지만 buffered stdout authority를 즉시 버리지 않고, protocol trust fault는 그 ingress 위치에서 semantic cut을 닫는다. 첫 correctness cause, cut 전 semantic outcome, process evidence, cleanup outcome을 별도로 보존하며 cleanup failure가 이미 확정된 semantic cause·result를 덮지 않는다. Healthy Connection의 local timeout에서는 actor sink를 유지하지만 terminal cut에서는 buffered ingress 처리 후 live attachment를 폐기한다. Runtime close는 interrupt·unsubscribe·read·resume를 자동 호출하지 않는다.

[위 Coverage ledger 초안](#coverage-ledger-초안)을 coverage-schema 전 design record로 채택한다. 이 결정만으로 `codex-method-decisions.json`·generated inventory·integration 상태를 바꾸지 않는다. Ticket 017은 T0.1 approval pending·once-only·terminal race, Ticket 013은 machine-readable coverage schema와 outcome·tail·deadline oracle, Ticket 018은 browser detach·restart·safe product retry UX를 소유한다.

### Review checkpoint

- Source: 0 findings. Pre-response terminal과 matching response authority, healthy timeout sink·process-terminal disposal, same-connection initialize fact·one-child policy, stdin-write·child-exit tail precedence를 구분했다. Settled duplicate silent-ignore는 pinned fact로, stored-contract validation·sanitized fingerprint·conflict fail-closed·lifetime tombstone은 bounded AY-PLE Connection strengthening으로 투명하게 표시했다.
- Standards: 0 findings. `error`의 Runtime semantic coverage를 deferred로 유지하고, `turn/steer`·Server-request adoption 분포·selective-salvage current/target·source link를 live ledger와 정렬했다. Generated inventory와 decisions JSON은 변경하지 않았다.
- Spec: 0 findings. T0 success·known failure gate, `actor_protocol_contradiction`, immutable unknown outcome, partial thread effect, thread-local isolation, Connection terminal·cleanup precedence와 Ticket 013·017·018 ownership이 Ticket 008–011과 일치한다.

남은 risk는 exact deadline·count/byte cap, method별 sanitized response fingerprint allowlist, terminal-before-response·duplicate conflict·child-exit/stdout-tail scheduler가 아직 executable evidence를 갖지 않았다는 점이다. 이는 이 ticket의 미결정이 아니라 Ticket 013과 resulting spec·implementation ticket으로 명시적으로 넘긴 verification 범위다.
