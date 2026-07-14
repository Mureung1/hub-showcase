# 011 — Event delivery와 transcript recovery model을 결정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)

## Question

`CodexAppServerConnection`은 raw JSONL·envelope work를 bounded하게 처리하고 transport terminal을 보고하며, `CodexConversationRuntime`은 채택한 row의 pinned source/test 근거에 따라 same-thread late·duplicate·terminal observation을 처리한다. 이 경계에서 T0/T0.1 observation의 delivery class·bound·saturation outcome과 terminal 반환 뒤 ingress drain·per-thread owner retention을 어떻게 정할 것인가? Upstream이 정의하지 않은 duplicate 의미는 AY-PLE deviation으로 명시하고 runtime에 product/global ordered journal을 만들지 않는다.

Native history와 `thread/read` recovery는 그 row의 tracer를 채택할 때만 설계하고, browser retention·replay는 `AYPLE adapter`에 남긴다. Answer는 영향받는 row·tracer·owner·source/test evidence와 구현 전 integration 상태를 함께 기록한다.

## 진행 메모

### Source-grounded delivery·lifetime 사실

| 범위 | Exact-pin source/test 판독 | 설계 제약 |
| --- | --- | --- |
| Single drain owner | Core event stream은 한 receiver를 가지고 App Server가 thread당 한 listener로 drain한 뒤 connection에 fanout한다. [`conversation ownership`](../assets/006-first-party-conversation-ownership.md#단일-drain-owner) | External stdio에도 ingress owner는 하나다. Response waiter, Runtime actor, product subscriber가 transport reader를 경쟁하지 않는다. |
| Upstream delivery class | First-party facade·in-process transport는 서로 다른 required event set을 사용하고 remote event channel은 unbounded다. Stdio channel의 128, core submission 512, TUI store 32,768과 unbounded replay는 각 surface 구현값이다. [`lossless` 경계](../assets/005-first-party-connection-ingress-architecture.md#lossless는-end-to-end-guarantee가-아니다) · [`복사하지 않을 편의`](../assets/006-first-party-conversation-ownership.md#채택할-제약과-따라-하지-않을-편의) | Protocol-wide lossless class나 범용 cap으로 승격하지 않고 T0/T0.1이 소비하는 row만 method-specific으로 분류한다. |
| Backpressure | Pinned stdio writer·central queue는 capacity에서 await하지만 overload response도 outbound saturation에서 유실될 수 있다. [`connection architecture`](../assets/005-first-party-connection-ingress-architecture.md) | Backpressure를 사용하되 hard bound를 lossless guarantee로 오해하지 않는다. 임의 drop 대신 explicit failure를 사용한다. |
| Turn terminal | `turn/completed`는 status authority이지 child drain이 아니다. Background command completion은 terminal 뒤에도 original `(thread, turn, item)` scope로 올 수 있고 source에 finite late bound가 없다. [`method lifecycle`](../assets/004-method-lifecycle-fact-table.md#5-turncompleted와-child-item-drain은-다른-축이다) · [`background ownership`](../assets/006-first-party-conversation-ownership.md#background-process-소유권) | Terminal을 actor delete, transcript completeness, quiet timer 또는 drain watermark로 사용하지 않는다. |
| Subscription lifetime | `thread/unsubscribe`는 subscriber만 제거하고 active turn을 중단하지 않는다. Subscriber가 0이어도 listener는 drain하며 unload·`thread/closed`는 지연되고 partial outcome이다. [`subscription lifetime`](../assets/006-first-party-conversation-ownership.md#subscriptionthreadprocess-lifetime) | T0/T0.1 actor release barrier로 `thread/unsubscribe`·`thread/closed`를 선제 채택하지 않는다. |
| Duplicate·recovery | Notification에는 normative sequence·dedup contract가 없고 `turn/completed.items`는 transcript authority가 아니다. `thread/read(includeTurns=true)`는 ephemeral·fresh unmaterialized·paginated state에서 unavailable할 수 있다. [`duplicate constraint`](../assets/004-method-lifecycle-fact-table.md#후속-설계가-답해야-할-source-제약) | Duplicate/tombstone은 AY-PLE client robustness policy로 표시하고 T0/T0.1 delivery gap을 history로 자동 복구하지 않는다. |

### Owner별 delivery·retention 경계

| Owner | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| `CodexAppServerConnection` | Single byte-framed JSONL ingress, exact direction-aware demux, generated-schema validation, pending Client RPC와 short-lived Server-request envelope·write bookkeeping, frame·dispatch·identity count+byte bounds, backpressure와 connection terminal | Supported Server request의 semantic pending lifecycle, native transcript, `ThreadActor` terminal, browser cursor·replay, product subscriber queue |
| `CodexConversationRuntime` | Parsed·validated native-scope routing, adopted row의 provisional·completed·terminal semantic state, process-lifetime compact actor/tombstone, scope-local count+byte bounds | Raw JSONL·params·command·path·raw error retention, global ordered journal, product publication sequence |
| `AYPLE adapter` | 실제 product tracer가 요구할 때 safe DTO, subscriber queue, HTTP/SSE, cursor, replay·retention과 `ModelingRun` projection | Connection drain, native identity authority, protocol duplicate·terminal 의미 |

Ticket 008의 “011 전에 browser transport를 고정하지 않는다”는 이 ticket이 SSE·cursor·replay를 소유한다는 뜻이 아니다. 이 ticket은 Runtime이 product delivery를 암묵적으로 구현하지 않는 경계를 고정하고, exact adapter delivery는 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)에 남긴다.

### T0/T0-C/T0.1 delivery class

| Observation | Target delivery class | Runtime 동작 |
| --- | --- | --- |
| `thread/start`, `turn/start` response | required settlement | Exact `RequestId`로 lossless-to-waiter-or-explicit-failure. Response payload는 parse·validate한 native identity로만 소비한다. |
| `thread/started` | validate-if-observed | Pinned response-first를 검증하고 matching에 수렴하되 T0 result barrier로 기다리지 않는다. |
| `turn/started` | required handling, non-result barrier | Notification-first를 포함한 legal either-order를 provisional actor에서 수렴하되 이 observation 하나만을 위해 public result를 지연하지 않는다. |
| `item/started` | tolerated validated observation | Full scope와 category를 검증하고 필요한 minimal lifecycle fingerprint만 남긴다. Start 없는 completion을 위반으로 만들지 않는다. |
| `item/agentMessage/delta` | tolerated validate-and-discard | Parse·validate·scope-check 후 보존하지 않는다. Streaming·transcript projection으로 승격하지 않는다. |
| Matching AgentMessage `item/completed` | completed-success에 conditional required | T0 completed final content authority로 lossless-to-owner-or-explicit-failure다. Successful result settle 후에는 raw content 대신 allowlisted sanitized semantic fingerprint만 compact state에 남긴다. Failed·interrupted terminal은 AgentMessage를 요구하지 않는다. |
| Matching `turn/completed` | required terminal observation | Authoritative status로 lossless-to-owner-or-explicit-failure다. `completed`는 AgentMessage와 함께 success delivery gate를 닫고, `failed | interrupted`는 AgentMessage 없이 terminal delivery gate를 닫는다. 어느 쪽도 drain·actor release를 뜻하지 않는다. |
| 다른 adopted/tolerated item completion과 legal late background observation | scope-local compact handling | 이미 반환한 result를 다시 쓰지 않고 grace timer로 기다리지 않는다. Full scope로 compact actor에 분류한다. |
| T0 inbound Server request | required direction-level handling | Method semantic integration으로 승격하지 않고 same-ID deterministic unsupported response를 즉시 쓴다. |
| T0.1 `item/commandExecution/requestApproval` | required delivery-to-owner | Connection은 original `RequestId`를, actor는 native thread·turn·item scope를 보존하되 pending bound·expiry·once-only·terminal race는 [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)가 소유한다. |

`error`, `thread/status/changed`, `thread/settings/updated`, command output streaming과 기타 unadopted notification은 envelope ingress를 막지 않도록 parse·validate·tolerate할 수는 있지만 이번 결정으로 Runtime semantic coverage로 승격하지 않는다.

Delivery gate와 caller outcome은 구분한다. Matching `turn/completed(status=completed)`와 completed AgentMessage 하나 이상이 모여야 successful T0 projection의 delivery 조건을 충족하고, `failed | interrupted`는 matching authoritative terminal만 필요하다. Status별 caller settlement, response·notification contradiction precedence와 retry 가능성은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

### Bound·saturation·retention 계약

- Connection ingress는 raw line/frame bytes, queued dispatch count+bytes, pending Client RPC count와 short-lived Server-request envelope·write bookkeeping count+bytes를 finite package-owned bound로 제한한다. Pull-based drain·pause/resume로 backpressure를 먼저 적용하되 frame 초과, 해소할 수 없는 global dispatch saturation, framing·schema·envelope·demux fault는 connection terminal이다. Adopted observation을 조용히 drop하지 않는다. Supported approval의 semantic pending count·saturation·expiry·release는 [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md), exact pending outcome은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.
- Runtime은 actor registry count+bytes와 actor별 retained semantic count+bytes를 finite bound로 제한한다. 새 actor를 만들 operation은 capacity slot을 원자적으로 reserve하고, capacity가 없으면 RequestId 할당과 첫 wire mutation 전에 safe capacity outcome으로 거부한다.
- Authoritative identity binding 뒤 validated full native scope가 있는 actor의 retained state가 bound를 넘거나 notification-only lifecycle contradiction이 발생하면 해당 actor의 delivery/projection을 poisoned로 만들고 성공 결과를 합성하지 않는다. Exact RPC settlement는 계속 drain하고 actor는 후속 wire를 분류하는 compact sink로 남으며 새 mutation을 보내지 않는다. Mutation outcome, caller settlement·retry 가능성, response↔notification mismatch precedence는 Ticket 012가 결정한다. Unrelated actor와 Connection ingress는 계속 진행한다.
- Live actor는 public result settle 후 native scope, terminal category·status와 adopted semantic fingerprint만 남긴 compact state로 축소하고 현재 Codex process attachment가 살아 있는 동안 유지한다. Source에 finite late bound가 없으므로 TTL·LRU eviction·quiet timer를 두지 않고, current tracer에 없는 `thread/unsubscribe`·`thread/closed`·`thread/read`를 release/recovery barrier로 사용하지 않는다. Process terminal 뒤 attachment disposal과 pending settlement의 정확한 precedence는 Ticket 012가 소유한다.
- Exact numeric defaults는 product 계약이 아닌 package-private named engineering constants로 두고 test injection을 허용한다. Resulting spec과 implementation ticket은 count·byte 두 축의 default를 명시하고 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)에서 tiny-cap saturation oracle을 요구한다. 기존 `CodexStdioTransport` 1,024 observation count bound는 salvage evidence일 뿐 raw line·aggregate byte cap이 없으므로 최종 Connection contract를 충족하지 않는다.

### Duplicate·late·conflict policy

- Conflict는 full native `(thread, turn, item?)` scope의 method-specific lifecycle phase와 single-assignment authority별로 판정한다. `item/started → delta* → item/completed`, `turn/started → turn/completed`와 completion-only item은 정상 transition이며 category 변화 자체는 conflict가 아니다.
- Delta는 같은 payload가 반복돼도 별개의 stream fragment일 수 있으므로 dedup·fingerprint·tombstone 대상이 아니다. T0의 `item/agentMessage/delta`는 매번 parse·validate·scope-check한 뒤 discard한다.
- Exact-repeat no-op은 matching AgentMessage `item/completed`와 `turn/completed`처럼 현재 tracer가 single-assignment authority로 채택한 observation에만 적용한다. 비교 fingerprint는 method별 allowlist를 적용한 parsed·validated·sanitized internal semantic projection에서만 만들며 raw payload·command·path·raw error text를 입력하거나 보존하지 않는다. T0.1의 safe 비교 field와 once-only response는 Ticket 017이 결정한다.
- 같은 single-assignment authority가 다른 sanitized semantic fingerprint나 contradictory terminal status로 재사용되거나 authoritative completion 뒤 같은 authority의 started가 오면 notification-only actor-local poison으로 처리한다. Source가 허용하는 terminal 뒤 background category는 contradiction이 아니다.
- Public T0 result는 settle 후 immutable이다. Legal late observation은 compact actor에만 반영하고, 이미 반환한 final AgentMessage나 terminal을 재작성하지 않는다. Conflicting late observation은 actor를 poison하되 완료된 caller result를 소급해 변경하지 않는다.
- Duplicate Client response, unknown response, unsafe envelope 정책은 Connection settlement과 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)의 소유며 이 notification policy와 합치지 않는다.

### Live-only recovery 경계

T0/T0-C/T0.1은 required live observation을 받지 못한 경우 `turn/completed.items`, legacy history reducer의 synthesized identity, Exec의 best-effort terminal backfill로 성공을 합성하지 않는다. Operation은 live authority로만 완료하고 missing observation의 timeout·connection-loss outcome은 Ticket 012로 넘긴다. `thread/read`, `thread/resume`, replay identity·history availability는 해당 method tracer에서만 채택한다.

### Coverage ledger 초안

| Inventory row | 현재 integration / adoption | Target tracer·coverage·adoption | Owner·source/test evidence |
| --- | --- | --- | --- |
| `initialize`, `initialized` | `client-host` / `baseline` | T0 required Connection bootstrap; retention row 아님; `baseline` 유지 | `CodexAppServerConnection`; [method lifecycle](../assets/004-method-lifecycle-fact-table.md#메서드별-lifecycle-근거표) |
| `thread/start` | `raw-wrapper` / `baseline` | T0·T0-C required response settlement; `baseline` 유지 | Connection exact RPC + `ThreadActor` identity; [Ticket 009 ledger](009-decide-identity-and-authority.md#coverage-ledger-영향) |
| `thread/started` | `schema-only` / `baseline` | T0·T0-C validate-if-observed, no result wait; `baseline` 유지 | `ThreadActor`; [response-first authority evidence](009-decide-identity-and-authority.md#coverage-ledger-영향) |
| `turn/start` | `raw-wrapper` / `baseline` | T0·T0-C idle branch required; `baseline` 유지 | Connection exact RPC + `ThreadActor`; [Ticket 009 identity](009-decide-identity-and-authority.md#coverage-ledger-영향) · [Ticket 010 routing](010-decide-concurrency-policy.md#coverage-ledger-초안) |
| `turn/started` | `schema-only` / `baseline` | T0·T0-C required handling, non-result barrier; `baseline` 유지 | `ThreadActor`; [core start·listener evidence](009-decide-identity-and-authority.md#coverage-ledger-영향) |
| `item/started` | `schema-only` / `baseline` | T0·T0-C tolerated validated coverage; `baseline` 유지 | `ThreadActor`; [item mapping·completion-only evidence](009-decide-identity-and-authority.md#coverage-ledger-영향) |
| `item/agentMessage/delta` | `schema-only` / `baseline` | T0·T0-C validate-and-discard, streaming deferred; `baseline` 유지 | `ThreadActor`; [delta mapping·identity test](009-decide-identity-and-authority.md#coverage-ledger-영향) |
| `item/completed` | `schema-only` / `baseline` | T0·T0-C completed-success AgentMessage conditional required, failed·interrupted optional; `baseline` 유지 | `ThreadActor`; [completion forwarding·AgentMessage identity test](009-decide-identity-and-authority.md#coverage-ledger-영향) |
| `turn/completed` | `schema-only` / `baseline` | T0·T0-C authoritative terminal required, drain 아님; `baseline` 유지 | `ThreadActor`; [terminal forwarding](009-decide-identity-and-authority.md#coverage-ledger-영향) · [late background evidence](../assets/006-first-party-conversation-ownership.md#background-process-소유권) |
| [all inbound Server request rows](../../../architecture/codex-app-server-method-inventory.md#server-요청) | 모두 `schema-only`; `baseline` 4, `case-driven` 2, `unreviewed` 5 | T0 direction-level same-ID unsupported, per-method semantic integration 아님; row별 current adoption 유지 | Connection envelope owner; T0 contract와 generated inventory presence |
| `item/commandExecution/requestApproval` | `schema-only` / `baseline` | T0 unsupported → T0.1 required delivery-to-owner; `baseline` 유지 | Connection original `RequestId` + `ThreadActor` native scope; [variant comparison](../assets/008-server-request-variant-comparison.md) |
| `serverRequest/resolved` | `schema-only` / `baseline` | T0.1 correlate-if-observed; required occurrence semantics는 Ticket 017, oracle·ledger는 Ticket 013; `baseline` 유지 | `ThreadActor`; generated `{threadId, requestId}` shape와 [dedicated source/test gap](../assets/008-server-request-variant-comparison.md) |
| `thread/read`, `thread/resume` | `raw-wrapper` / `baseline`, `schema-only` / `baseline` | Current integration/adoption 유지; T0·T0-C·T0.1 coverage는 recovery tracer 전까지 deferred | Future method owner; [availability·identity provenance](../assets/004-method-lifecycle-fact-table.md#7-threadreadincludeturnstrue는-모든-상태에서-turn-history를-제공하지-않는다) |

이 표는 coverage schema 전 design checkpoint다. `codex-method-decisions.json`의 현재 `integration/adoption/note` 외 field는 renderer가 거부하므로 JSON과 generated inventory를 수정하거나 integration을 승격하지 않는다. Coverage schema, direction-level unsupported 표현과 tiny-cap·duplicate·late oracle은 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 소유한다.

### HITL audit

상위 승인 원칙인 pinned first-party ownership·per-thread locality·method-by-method adoption을 그대로 적용하면 새 product decision은 남지 않는다.

- Known full native scope의 saturation·contradiction을 connection-wide terminal로 확대하면 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)의 independent actor 계약을 깨뜨린다. 따라서 actor-local isolation은 새 선택이 아니라 기존 승인의 직접 결과다.
- Single-assignment authority의 exact semantic repeat no-op는 새 state를 만들지 않는 최소 robustness policy다. All-repeat failure, ID-only dedup·last-wins는 각각 semantically identical repeat와 conflicting reuse를 구분하지 못하므로 채택하지 않는다. Repeatable delta에는 이 규칙을 적용하지 않는다.
- TTL·LRU eviction, terminal 즉시 actor removal, history backfill은 source에 없는 late bound·recovery authority를 발명한다. 실제 product use case가 이 loss를 요구하지 않으므로 채택하지 않는다.

따라서 권고안을 standing approval의 직접 적용으로 기록하고 같은 선택을 다시 묻지 않는다. 후속 adapter tracer가 bounded live-only Runtime으로 충족되지 않는 실제 증거를 제공할 때만 durable replay·retention deviation을 별도로 연다.

## Answer

T0/T0-C/T0.1 Runtime delivery는 `lossless-to-owner-or-explicit-failure`로 정한다. Exact response, completed-success에 필요한 matching AgentMessage `item/completed`, authoritative `turn/completed`와 T0.1 Server request를 임의로 drop하지 않는다. Tolerated `item/started`는 minimal lifecycle state만 남기고 delta는 매번 parse·validate·scope-check 후 discard하되, 이를 saturation drop tier로 표현하지 않는다. Completed-success delivery gate는 AgentMessage 하나 이상과 `turn/completed(status=completed)`, failed·interrupted gate는 matching authoritative terminal만 요구한다. Exact caller outcome은 Ticket 012가 정하며 settle된 public result는 immutable하다. Terminal·return·drain·actor lifetime은 서로 다른 경계다.

Connection은 raw frame, dispatch work, pending Client RPC와 short-lived Server-request envelope·write bookkeeping을 count+byte로 bound하고 backpressure를 먼저 적용한다. Scope를 신뢰할 수 없는 framing·schema·envelope·demux fault와 해소 불가능한 global dispatch saturation은 connection terminal이다. Runtime은 actor registry·actor semantic state를 count+byte로 bound하고 actor capacity를 pre-wire에 원자적으로 reserve한다. Authoritative binding 뒤 scope-local saturation·notification contradiction은 해당 actor의 delivery/projection만 poison하고 성공을 합성하지 않은 채 exact RPC를 계속 drain한다. Mutation outcome·retry와 response mismatch precedence는 Ticket 012, supported approval pending bound는 Ticket 017이 소유한다.

Actor는 result settle 후 raw transcript를 폐기하고 native scope·terminal·allowlisted sanitized semantic fingerprint만 남긴 compact state로 현재 Codex process attachment lifetime 동안 유지한다. Source에 late-event 상한이 없으므로 TTL·LRU·quiet-timer eviction을 사용하지 않고 finite registry cap으로 메모리를 제한한다. Allowed lifecycle transition과 repeatable delta는 dedup하지 않는다. Single-assignment authority의 exact semantic repeat만 no-op이고 conflicting sanitized authority reuse는 actor-local poison이다. Legal late background observation은 original full scope로 compact state에 분류하되 이미 반환한 result를 재작성하지 않는다.

T0/T0-C/T0.1은 live observation만으로 완료한다. `thread/read`, `thread/resume`, `turn/completed.items`, synthesized replay identity나 Exec의 backfill로 missing delivery를 성공으로 꾸미지 않는다. Browser event stream·sequence·cursor·replay·durable retention은 Runtime contract가 아니며 실제 product use case를 소유한 `AYPLE adapter`에서만 채택한다.

[위 Coverage ledger 초안](#coverage-ledger-초안)을 coverage-schema 전 design record로 채택한다. 이 결정만으로 `codex-method-decisions.json`·generated inventory를 수정하거나 integration을 승격하지 않는다. Exact package-private cap defaults는 resulting spec·implementation ticket이 명시하고 Ticket 013은 tiny-cap·duplicate·late·saturation oracle와 ledger schema를 소유한다. T0.1 pending lifecycle·`serverRequest/resolved` semantics는 Ticket 017, browser/product readiness는 Ticket 018이 소유한다.

### Review checkpoint

- Source: 0 findings. Method-specific lifecycle과 single-assignment authority를 repeatable delta에서 분리했고, `lossless-to-owner-or-explicit-failure`·process-attachment retention·duplicate no-op를 upstream guarantee가 아닌 AY-PLE Runtime policy로 명시했다. Upstream에 end-to-end lossless·late bound·numeric cap 근거가 없는 한계는 Ticket 013 oracle과 resulting spec의 named defaults로 넘겼다.
- Standards: 0 findings. Ticket 010 dependency, current/target adoption, Server request 4/2/5 grouping, row별 evidence와 Ticket 013·017 ownership이 정렬되었고 `codex-method-decisions.json`·generated inventory는 변경하지 않았다.
- Spec: 0 findings. Completed-success와 failed·interrupted gate, actor-local delivery poison과 exact RPC drain, Ticket 012 unknown-outcome precedence, Ticket 017 approval pending, Ticket 018 browser delivery 경계가 resolved Ticket 008–010과 상위 goal에 일치한다.

남은 risk는 exact cap defaults, Connection terminal·unknown-outcome precedence와 `serverRequest/resolved` emission contract가 각각 resulting spec·Ticket 012·Ticket 017/013에 의도적으로 남아 있다는 점이다. 이는 이번 ticket의 미결정이 아니라 명시된 후속 owner다.
