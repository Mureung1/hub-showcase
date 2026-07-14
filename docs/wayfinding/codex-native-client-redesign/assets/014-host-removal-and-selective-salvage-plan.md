# 기존 Host 제거와 선별 재사용 이행 계획

이 문서는 [first-party client port·재사용 감사](019-first-party-client-port-and-reuse-audit.md)의 code-unit 네 분류와 [ADR 0010](../../../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)을 실행 순서에 투영한다. 현재 기준은 direction-aware active exact routing, first settlement remove-once와 이후 map-miss no-op, method-specific bounded early FIFO와 cleanup, native `ThreadId`별 projection, active Server request lifecycle과 disconnect 시 current-pending settlement이다. 교정 전 정책을 상단 예외 문구로 덮지 않고 아래 표·단계·gate 자체에 이 기준을 적용한다.

## 결정 요약

기존 `HeadlessCodexClientHost`를 새 runtime의 implementation base나 compatibility facade로 사용하지 않는다. 새 `CodexAppServerConnection`과 `CodexConversationRuntime`을 legacy 경로와 나란히 구현하고 T0·T0-C·T0.1 conformance를 통과시킨 뒤, consumer가 없는 Host Interface·root export·전용 fake/test와 그 policy를 한 방향으로 제거한다. 자세한 consumer 근거는 [기존 Host consumer 감사](002-host-consumer-audit.md)가 소유한다.

선별 재사용 단위는 기존 class가 아니라 source-guided 새 owner의 contract와 일치하는 좁은 primitive다. `ProductRuntimeLayout`에서는 root canonicalization·containment·overlap·package binary/pin·runtime-home 준비를, `CodexStdioTransport`에서는 generated validator wiring·exact typed `RequestId` parser·JSONL framing·child spawn/reap 같은 후보를 추출해 새 contract로 다시 검증한다. 기존 Host의 generation/ref/global sequence/subscription policy와 기존 transport의 observation queue/request lifecycle/terminal policy는 재사용하지 않는다.

이 계획은 repository code나 current implementation claim을 지금 바꾸지 않는다. Ticket 014는 이행 순서와 gate만 확정한다. ADR 변경은 이미 완료된 Ticket 015가 소유하고, architecture readiness는 Ticket 016, 새 spec과 implementation ticket은 그 뒤 `/to-spec`과 `/to-tickets`가 소유한다.

## 보호할 invariant

| Invariant | 이행 제약 |
| --- | --- |
| Native Codex state | External layout의 `appDataRoot/codex/home`·`appDataRoot/codex/sqlite`와 current Harness의 `.ay-ple/runtime-codex/codex-home`·`.ay-ple/runtime-codex/sqlite`, rollout/history와 native `ThreadId`를 삭제·이동·reset·remap하지 않는다. Source removal과 build-output clean은 이 경로를 입력으로 받지 않는다. |
| Existing Runtime Harness | `CodexRawClient`, `CodexRuntimeAdapter`, `AgentRuntimeKernel`, `/api/runtime/*`, Runtime Diagnostic History, Inspector와 현재 `@ay-ple/runtime-codex/testing` fake App Server 경로를 유지한다. 새 conversation runtime을 이 경로의 replacement라고 주장하지 않는다. |
| Runtime ownership | Production module direction은 `CodexAppServerConnection` → `CodexConversationRuntime`까지만이다. External AY-PLE preparation/harness boundary가 composition 시점에 prepared process/workspace capability를 공급하며, `AYPLE adapter`와 browser/product policy는 dependency나 readiness gate가 아니다. |
| Native identity와 lifetime | Runtime은 native thread/turn/item identity를 보존하고 native `ThreadId`별 projection을 사용한다. Host-generated ref와 connection generation invalidation을 이전 shim으로 만들지 않는다. Actor/mailbox는 선택 가능한 package-private 구현일 뿐 공개 invariant·semantic owner·retention 계약이 아니다. |
| Cross-thread independence | Single ingress wire order를 generation-wide causal/publication order로 바꾸지 않는다. Connection에 global semantic mutex를 두지 않고 Runtime은 처음부터 native `ThreadId`별 독립 projection과 operation route를 둔다. |
| Unknown outcome | Non-idempotent mutation의 wire stage와 semantic terminal을 분리하고 `acceptance_unknown`·`accepted_execution_unknown`을 성공이나 자동 retry로 바꾸지 않는다. Close 때 deferred read/resume/reconciliation method를 몰래 호출하지 않는다. |
| Active Client request routing | Connection은 direction-aware exact active `RequestId` map을 소유한다. 첫 response/error가 waiter를 제거하고, active entry가 없는 unknown·late response는 public mutation 없이 map-miss no-op로 끝난다. Disconnect는 현재 pending waiter만 한 번 settle한다. |
| Active Server request lifecycle | Connection은 original Server `RequestId`의 active response lease와 serialized writer outcome을, Runtime은 validated·sanitized native scope와 typed decision projection을 소유한다. Answer·`serverRequest/resolved`·turn transition·disconnect 중 먼저 active entry를 제거한 경로만 효력을 만들며 이후 반복은 no-op다. |
| Finite capacity와 cleanup | Connection의 raw frame·validated dispatch·pending Client RPC·active Server-request bookkeeping, Runtime의 parse·validate·sanitize된 method-specific early FIFO를 count+UTF-8 byte bound로 제한한다. FIFO는 response 뒤 ingress 순서로 replay하고 terminal·unregister·disconnect에서 정리한다. Exact cap과 overflow failure scope는 spec에서 명시하되 unrelated thread를 막거나 영구 상태를 만들지 않는다. |
| Future Chat Interface growth | T0의 text-turn convenience surface를 sole internal model로 고정하지 않는다. Native `ThreadId`별 projection과 method-specific lifecycle owner가 multi-turn, streaming, steer/interrupt, read/resume, activity tracer를 뒤에 추가할 수 있어야 한다. |

## 현재 surface 처리 방침

[First-party client port·재사용 감사](019-first-party-client-port-and-reuse-audit.md)의 code-unit 네 분류가 현재 판정을 소유한다. 이 표는 그 판정을 제거·이식 순서로 옮기며 class 전체를 새 owner로 승격하지 않는다.

| 현재 surface | 분류 | 새 owner 또는 처리 | 제거 gate |
| --- | --- | --- | --- |
| Exact-pin generated protocol output | 그대로 보존 | Generated TypeScript·JSON Schema를 wire-shape validation input으로 유지한다. 수동 수정하거나 lifecycle 의미의 근거로 사용하지 않는다. | 항상 보존 |
| Response/notification validator·contract, generator와 method renderer | upstream behavior에 맞춰 추출·개조 | T0 adopted response·notification roster, ledger v2와 safe staged generation을 새 owner에서 검증한다. | 새 validator·generator gate 뒤 legacy helper를 정리 |
| `CodexRawClient`, `CodexRuntimeAdapter`, status/smoke와 tests | Runtime Harness 전용 보존 | Server·Inspector의 single-run diagnostic/parity 경로로 유지하되 새 Connection/Runtime 적합성 근거로 승격하지 않는다. | 계속 보호 |
| `capability-slots.ts`·test, root 해당 export와 `./capabilities` | Runtime Harness 전용 보존 | Engine-inspection metadata와 server/Inspector consumer를 유지한다. Foundation adoption·semantic owner·coverage로 세지 않는다. | 계속 보호 |
| Existing `fake-codex-app-server.ts`와 Runtime Harness tests | Runtime Harness 전용 보존 | 현재 RawClient/Adapter/server parity oracle와 `withFakeCodexAppServer`를 유지한다. Old fake stdio re-export만 제거한다. | 계속 보호 |
| `HeadlessCodexClientHost` class, error·snapshot·event·subscription types | 호환성 없이 제거 | 대체하지 않는다. Connection process state와 Runtime conversation state를 한 global Host state machine으로 다시 합치지 않는다. | T0·T0-C·T0.1 required gates와 full regression이 green인 checkpoint |
| Package root의 Host export block | 호환성 없이 제거 | Explicit `@ay-ple/runtime-codex/conversation` subpath를 development/types/default condition에 추가한다. Exact exported symbol은 resulting spec이 정하되 package-private reducer·Connection test Seam은 root나 subpath에 노출하지 않는다. | Host source 제거와 같은 checkpoint |
| Host generation, global sequence, atomic subscription, permanent-failure mapping | 호환성 없이 제거 | Active exact routing과 method별 Runtime projection으로 필요한 lifecycle만 새 owner에서 구현한다. 별도 global Host failure state로 대체하지 않는다. | Host 제거와 함께 |
| `headless-codex-client-host.test.ts`와 Host 전용 fake/child | 호환성 없이 제거 | 새 public Runtime/Connection 경계를 통과하는 unit·spawned fake-child·live tracer로 교체한다. Initialize handshake와 child journal/temp cleanup test intent만 선별 이식한다. | 대체 oracle가 required matrix를 통과한 뒤 |
| `ProductRuntimeLayout`의 root 검증·runtime-home preparation primitive와 tests | upstream behavior에 맞춰 추출·개조 | Absolute/canonical root·containment·overlap, package binary/pin과 runtime-home 준비 primitive를 external AY-PLE `runtime-preparation`/harness capability로 옮긴다. 이는 Codex-native production module이 아니며 exact public 이름과 input/output은 spec이 정한다. | 새 preparation contract와 tests가 green인 checkpoint |
| Product-named layout Interface와 package root export | 호환성 없이 제거 | 새 preparation capability의 compatibility facade로 남기지 않는다. | 새 preparation consumer가 서고 Host caller가 제거된 뒤 |
| `cwd = workspaceRoot` 결합에서 검증된 path intent | upstream behavior에 맞춰 추출·개조 | Prepared process launcher `cwd`와 `thread/start.cwd` workspace capability를 분리한다. `CODEX_HOME` 등 launcher environment는 preparation/launcher policy이며 Runtime protocol semantics가 아니다. | 새 preparation/Connection composition gate |
| Host의 결합된 `cwd`·environment policy | 호환성 없이 제거 | 분리된 prepared process/workspace capability를 사용하고 Host 정책 surface는 남기지 않는다. | 새 preparation/Connection composition gate |
| `CodexStdioTransport`의 primitive와 test intent | upstream behavior에 맞춰 추출·개조 | 새 Connection을 병행 구현한다. 기존 class를 wrap/subclass하지 않고 child·sole ingress·exact typed ID·generated validator·serialized writer·cleanup primitive와 test intent만 새 contract로 옮긴다. | 새 Connection + T0/T0-C/T0.1이 old transport의 유효 evidence를 대체한 뒤 |
| `CodexStdioTransport` class와 observation Interface | 호환성 없이 제거 | 새 Connection의 compatibility facade로 남기지 않는다. | 위 primitive가 새 owner에 이식된 뒤 |
| Exact string/number ID key, unsafe-number/top-level duplicate parser | upstream behavior에 맞춰 추출·개조 | Unit test를 붙인 Connection parser primitive. Client/Server direction을 key와 lease registry에서 분리한다. | 새 exact demux contract 통과 시 |
| Child spawn, JSONL reader/write, close/kill/reap mechanics | upstream behavior에 맞춰 추출·개조 | Prepared process를 소비하는 Connection internal primitive. Sole reader, single serialized outbound writer, active pending settlement와 deterministic reap을 새 contract로 검증한다. | Unit·fake terminal/fault cases 통과 시 |
| Old count-only observation queue, timeout Promise, `dismiss()`와 settled-ID tests | 호환성 없이 제거 | Active waiter/lease remove-once, late map-miss no-op, method-specific bounded early FIFO·cleanup과 operation-local unknown outcome evidence로 교체한다. Sequential ID reuse·`dismiss()` 결과는 새 conformance proof로 승격하지 않는다. | 재사용하지 않음 |
| `fake-codex-stdio-transport.ts` scaffolding | upstream behavior에 맞춰 추출·개조 | Actual child, typed scenario table, journal, temp cleanup과 fault injection pattern을 새 conformance fake로 옮긴다. Legacy policy scenario는 버린다. | 새 fake가 build/typecheck와 required matrix를 통과한 뒤 old re-export 제거 |
| Ignored `packages/runtime-codex/dist/**` | package build output만 clean | Caller target을 받지 않고 resolved target이 exact `<packageRoot>/dist`인지 검사하는 package-owned clean command를 만든다. Source removal 뒤 clean-build해 removed output이 남지 않게 하며 repository root의 `git clean -x/-X`, native app-data와 다른 workspace `dist`는 금지한다. | Host removal checkpoint |
| Old spec, Tickets 001–010, ADR 0008과 current-doc claims | 역사 보존 + staged supersede | 아래 documentation matrix를 따른다. 완료된 구현 evidence를 삭제하거나 current Runtime conformance로 승격하지 않는다. | Owning document checkpoint별 |

## 기존 transport에서 그대로 이식하지 않을 semantic

현재 `CodexStdioTransport`는 useful low-level evidence를 포함하지만 다음 contract 때문에 새 Connection의 foundation으로 그대로 승격할 수 없다.

| 기존 동작 | 필요한 교체 동작 |
| --- | --- |
| Admission 뒤 단일 pending/timed-out 상태와 request 시작 시점 timeout | Operation-local `pre-wire → write-attempted → response-confirmed` evidence를 관찰하고 Runtime semantic terminal과 분리한다. Timeout은 success나 blind retry로 바꾸지 않되 process lifetime history를 만들지 않는다. |
| Timeout·close 뒤 request contract와 registry 즉시 제거 | Active waiter는 first response/error 또는 disconnect settlement에서 remove-once한다. Active entry가 없어진 뒤 도착한 response는 map-miss no-op이며 unknown outcome은 해당 operation 결과에만 남긴다. |
| Server response·`dismiss()` 뒤 같은 typed ID를 다시 받는 기존 test | 새 기준은 active collision·first answer/remove-once·post-removal repeat no-op다. 기존 sequential reuse 관찰에서 lifetime 허용이나 금지 verdict를 도출하지 않고 T0.1의 answer·resolved·turn transition·disconnect lifecycle을 별도로 증명한다. |
| Notification을 raw params와 함께 count-only queue에 보관 | Generated validation과 sanitization 뒤 method owner가 소비할 internal observation만 turn-local count+UTF-8 byte bound FIFO에 둔다. Response 뒤 ingress 순서로 replay하고 terminal·unregister·disconnect에서 정리한다. |
| Active response payload나 adopted notification의 generated validation 실패를 모두 connection failure로 확대 | 유효한 envelope의 active Client response payload 불일치는 해당 waiter를 실패시키고 active entry만 제거한다. Adopted notification 불일치는 state mutation을 만들지 않으며 T0 critical route의 affected operation outcome은 spec이 명시한다. Framing·direction·ID classification trust를 잃은 경우에만 connection terminal로 확대한다. |
| stdout read, writer와 exit/close signal이 독립적으로 registry를 정리 | Sole ingress와 serialized writer가 first settlement를 결정하고 EOF·exit·write failure에서 현재 pending RPC·Server request route를 한 번 settle한 뒤 child를 reap한다. |
| 한 observation consumer의 전역 순서 | Exact RPC routing과 thread-local causal ownership을 분리한다. A pending은 B progress를 막지 않는다. |

## 구현 순서와 승격 gate

### Stage 0 — ledger engine과 safe generation을 먼저 만든다

1. Ticket 013의 coverage ledger v2 parser·validator·renderer와 fail-safe `verify`/`generate` pipeline을 구현한다.
2. Exact pin·lock/platform artifact·binary version·provenance·ledger를 tracked mutation 전에 preflight한다.
3. 별도 staging A/B에서 generated types와 inventory를 두 번 생성해 deterministic output을 확인한다.
4. `verify`는 tracked file을 변경하지 않고 drift만 검사한다. `generate`는 두 target을 모두 prevalidate한 뒤 backup/rollback 가능한 promotion을 수행한다.
5. Parser/generator failure injection tests가 green이 되기 전에는 현재 destructive `generate:codex-methods`로 tracked tree를 갱신하지 않는다.

Stage 0은 wire/runtime integration을 구현하지 않는다. Safe machinery가 준비된 뒤에만 current 8개 `raw-wrapper` membership을 `runtime-harness`, 2개 `client-host` membership을 transitional `legacy-client-host`로 이전하고 T0·T0-C·T0.1 method/non-method coverage를 `planned`로 기록한다. 모든 기존 sparse row의 adoption·note도 row별로 감사해 resolved evidence에 따른 유지/변경 사유를 남긴다. Adoption vocabulary를 일괄 reset하지 않으며 T0·T0-C·T0.1 밖 method와 product-driven row를 foundation integration이나 readiness prerequisite로 해석하지 않는다. 이 design checkpoint에서는 `app-server-connection`·`conversation-runtime` integration을 추가하지 않는다.

### Stage 1 — preparation과 Connection을 legacy 옆에 세운다

1. `ProductRuntimeLayout`의 검증·preparation primitive를 protocol-independent external AY-PLE `runtime-preparation`/harness capability 뒤로 옮긴다. Prepared process는 launcher `cwd=appDataRoot`, prepared workspace는 `thread/start.cwd=workspaceRoot`를 공급하며 Connection/Runtime이 filesystem root를 추론하지 않게 한다.
2. `CodexAppServerConnection`을 기존 Host/transport와 병행 구현한다. Connection은 prepared process, single JSONL ingress, direction-aware exact active demux, single serialized outbound JSONL writer, inbound Server request fallback, process terminal과 current-pending settlement만 소유한다. Client RPC·`initialized`·unsupported/supported Server response, active lease claim/remove와 writer callback을 한 writer path에서 직렬화하고 Runtime decision은 typed command로만 진입한다.
3. Stable-known Server request는 full generated params를 검증한 뒤 same-ID unsupported response를 쓰고, experimental-only/future unknown request는 exact ID·method envelope까지만 검증한 뒤 same-ID unsupported response를 쓴다. T0.1 regular command variant만 generic fallback을 좁게 override한다. Current initialize-only response map은 T0 response roster와 adopted/tolerated notification validator까지 확장한다. 유효한 envelope의 active response payload 불일치는 해당 waiter만 실패·제거하고, adopted notification 불일치는 state mutation 없이 affected operation disposition으로 넘기며 unrelated request/thread를 막지 않는다.
4. Raw JSONL frame bytes, queued validated dispatch count+bytes, pending Client RPC contract count+bytes와 active Server-request bookkeeping count+bytes/backpressure를 각각 bounded contract로 구현한다. Malformed framing이나 방향·ID를 분류할 수 없는 envelope는 connection terminal과 current-pending settlement로 끝내고, 그 밖의 overflow failure scope는 spec이 명시해 unrelated request/thread에 자동 확대하지 않는다.
5. Pure active-router/writer unit tests와 actual-child fault/interleaving fake를 새 Connection Interface를 통해 작성한다. Conformance fake child implementation, typed scenario table과 journal 자체를 runtime-codex build/typecheck input에 넣고 generated-valid fixture만 valid scenario로 인정한다. 기존 transport는 compatibility layer가 아니라 extraction evidence로만 남긴다.
6. Stage 1은 통과한 개별 verification selector만 `implemented`로 기록하고 integration membership은 승격하지 않는다. 별도로 승인되지 않은 Stage-1 live oracle을 새로 만들지 않는다.

### Stage 2 — ConversationRuntime과 T0를 구현한다

1. Native branded thread/turn/item identity와 native `ThreadId`별 projection·active operation route를 가진 `CodexConversationRuntime`을 추가한다. Package-private reducer 구조를 공개 Interface·ledger owner·lifetime gate로 승격하지 않는다.
2. T0의 operation/thread-local route와 필요한 bounded capacity를 첫 wire mutation 전에 확보한다. Runtime-wide admission gate나 나중에 per-thread 구조로 갈아타는 과도기 구조를 만들지 않는다. `thread/start` response-first, `thread/started` matching present/absent와 pre-response violation, `turn/start` response/notification either-order, tolerated `item/started`, validate-and-discard `item/agentMessage/delta`, non-authoritative `error`, matching completed AgentMessage와 authoritative `turn/completed`를 Ticket 013 matrix 그대로 검증한다. Tolerated observation을 silent-ignore하지 않는다.
3. 모든 inbound Server request의 validation tier별 same-ID deterministic unsupported response는 Connection lease를 통해 처리한다. T0.1 regular command 외에는 semantic override하지 않으며 raw params·command·path·error payload를 retained Runtime state나 public result에 남기지 않는다.
4. Parse·validate·sanitize된 early observation은 도착할 때 해당 turn route의 local count+byte budget에 charge하고 ingress FIFO로 보존한다. Matching response 뒤 replay한 다음 terminal·unregister·disconnect에서 active route와 FIFO를 정리한다. Overflow는 spec이 정한 affected operation outcome으로 끝내고 unrelated native thread와 exact RPC drain은 계속한다.
5. T0 convenience operation은 native `ThreadId`별 projection 구조 위의 첫 one-turn slice일 뿐 public model의 ceiling이 아니다. Active route는 lifecycle 종료에 맞춰 제거할 수 있고 Codex-owned identity/history가 persistence authority다. 후속 tracer는 같은 Runtime Interface에 multi-turn/method projection을 추가한다.
6. Stage 2도 통과한 개별 verification selector만 `implemented`로 기록한다. Integration membership은 해당 row/surface의 모든 required verification selector가 implemented이고 현재 applicable gate가 통과했다는 ledger predicate 전에는 추가하지 않는다.

### Stage 3 — T0-C와 T0.1을 sibling tracer로 완성한다

공통 T0 foundation 뒤 T0-C와 T0.1은 서로를 불필요하게 block하지 않는 sibling implementation frontier다.

- T0-C fake는 package-private reducer를 직접 호출하지 않고 explicit `./conversation` public Runtime surface에서 처음부터 존재하는 native `ThreadId`별 projection을 통해 Thread A pending → B complete → A complete schedule을 강제한다. B가 A의 holdback·failure·global lock에 종속되지 않음을 증명하고, live는 representative A/B/A2 path만 확인하며 race completeness를 주장하지 않는다.
- T0.1은 regular `item/commandExecution/requestApproval` 하나만 typed override한다. Original Server `RequestId` active collision, answer·resolved·turn transition·connection loss 중 first remove-once, writer callback race, post-removal repeat no-op, validated/sanitized native scope와 recursive no-raw retention을 unit/fake/live로 검증한다.
- 각 tracer checkpoint는 통과한 selector를 먼저 기록한다. Integration membership은 row/surface별 모든 required selector가 implemented이고 현재 applicable gate가 통과했다는 ledger predicate를 만족할 때만 row별로 추가하며, tracer 하나의 부분 통과를 surface-wide promotion으로 바꾸지 않는다.

### Stage 4 — legacy를 한 방향으로 제거한다

Ticket 013 matrix의 모든 required·tolerated selector를 포함한 T0·T0-C·T0.1과 full repository regression이 green이면 다음 순서로 같은 implementation series 안에서 제거한다.

1. Package root에서 Host와 product-named layout export를 제거하고 explicit `./conversation`의 development/types/default export edge를 추가한다.
2. Host source, error/type surface, Host 전용 test/fake/child와 generation/global-event oracle을 제거한다.
3. 새 preparation/Connection에 유효 evidence가 이관된 것을 확인한 뒤 old `ProductRuntimeLayout`/`CodexStdioTransport` class, self-test와 fake-only scenario를 제거한다. `fake-codex-app-server.ts`의 old stdio re-export만 같은 checkpoint에서 제거하고 `withFakeCodexAppServer`는 보존한다. 특히 sequential Server ID reuse·dismiss scenario를 새 oracle로 승격하지 않는다.
4. Decisions JSON에서 `legacy-client-host` membership을 0으로 만들고 safe generator로 inventory를 재생성한다. `runtime-harness`와 이미 gate를 통과한 새 integration만 유지한다.
5. Guarded package command로 `packages/runtime-codex/dist`만 clean-build하고 Host, old transport/layout, removed ref/event symbol이 `.js`·`.d.ts`·source map에 남지 않는지 검사한다. Development condition 없이 package root·`./testing`·`./capabilities`·`./conversation`을 import해 default production export graph도 검증한다.

Removal이 실패하면 source code를 destructive reset하거나 native state를 rollback하지 않는다. Legacy code가 아직 있는 마지막 green commit으로 구현 patch를 고치며, compatibility shim이나 dual-write를 추가하지 않는다.

### Stage 5 — current-state 문서를 구현과 함께 정리한다

Owning artifact를 먼저 바꾸고 consumer 문서는 consequence만 반영한다. Product adapter/browser 정책은 정리 범위가 아니다. Ticket 015의 ADR 0010 채택과 ADR 0008 역사화, old spec·미구현 ticket의 terminalization은 이미 완료된 계획 prerequisite이며 앞으로 다시 수행할 Stage 5 작업이 아니다.

| 상태·checkpoint | Owning artifact와 조치 | 하지 않을 일 |
| --- | --- | --- |
| Ticket 014 | 이 이행 계획과 map의 한 줄 decision만 기록 | Code, ADR, spec, ledger, README, backlog를 미리 변경하지 않음 |
| 완료된 prerequisite — Ticket 015·019 | ADR 0010 채택, ADR 0008의 역사적·대체됨 표시, first-party port correction과 `docs/README.md`·root `README.md` 정렬을 현재 근거로 사용한다. | 완료된 ADR/history 작업을 구현 closeout처럼 다시 실행하거나 ADR 0008 본문을 새 결정으로 재작성하지 않음 |
| 완료된 prerequisite — old artifact 처리 | Old spec은 실행 source of truth가 아님을 표시했고 미구현 Tickets 004–010은 `wontfix`, `Next actor: none`으로 끝냈다. Tickets 001–003의 `completed` evidence는 보존한다. | Old ticket 본문을 새 runtime contract로 개조하거나 삭제·이동하지 않음 |
| `/to-spec`·`/to-tickets` | Connection → Runtime, T0/T0-C/T0.1와 이행 단계를 새 spec/tracer tickets로 만들고 old artifacts에 exact superseding link를 보강한다. | AY-PLE adapter/product tracer를 foundation ticket으로 추가하지 않음 |
| 각 implementation slice | Decisions JSON을 먼저 바꾸고 safe inventory를 regenerate한다. Package README와 implementation map에는 실제 공존/구현 상태와 commands만 기록한다. | Inventory 직접 수정, planned capability를 current로 기술, transient SHA/pass time 기록 금지 |
| Work-order checkpoint | Development backlog의 Host/browser 결합 todo를 runtime foundation과 future product adapter todo로 분리하고 foundation 완료 표시는 전체 gate 뒤에만 한다. 필요한 Product Brief/ADR 0009/runtime-isolation 문서는 downstream 관계만 최소 정렬한다. | Product mapping·sandbox·approval·browser UX를 현재 runtime semantic으로 결정하지 않음 |
| 최종 정리 | Package README, implementation map, backlog, root/docs index와 old artifact 처리가 실제 code/export/ledger에 맞는지 검증한다. | Runtime Harness를 새 conversation path로 교체하거나 product work를 완료로 표시하지 않음 |

Old spec/ticket은 archive directory로 옮기지 않는다. Stable local path와 archive ref provenance를 보존하면서 terminal marker와 superseding link를 추가한다. 기존 evidence archive ref는 변경하거나 active tree로 복원하지 않는다.

## 검증과 제거 증거

| Gate | 필수 증거 |
| --- | --- |
| Consumer boundary | Repository-wide import/export search가 Host/layout/transport의 durable external consumer 0과 protected Runtime Harness consumer 목록을 재확인한다. |
| Ledger safety | Malformed/unknown ledger, pin mismatch, A/B nondeterminism, first/second target promotion failure에서 tracked output이 원복되거나 무변경이며 `verify`가 read-only임을 증명한다. |
| Connection | Exact string/number active ID collision, unsafe numeric ID, response/request/notification direction, first response/error remove-once와 late map-miss no-op, active response payload failure의 waiter-local settlement, adopted notification validation 실패의 no-mutation, stable-known full params와 experimental/future envelope-only validation tier, partial/multi-line JSONL, single serialized writer fault, stdout tail/EOF/exit, current-pending settlement, raw-frame·dispatch·Client-RPC·active Server-bookkeeping count+byte bounds와 no-raw state를 unit/fake로 증명한다. |
| Fake build boundary | Conformance child implementation, typed scenario table과 journal이 runtime-codex TypeScript build/typecheck graph 안에 있고 generated validator에 맞지 않는 valid fixture를 compile/test gate가 거부한다. |
| T0 | `thread/start` response-first, `thread/started` present/absent/pre-response violation, `turn/start` either-order, tolerated `item/started`, validate-and-discard AgentMessage delta, non-authoritative `error`, matching AgentMessage, duplicate terminal local no-op, mismatched active operation failure, authoritative terminal, validation-tier별 generic unsupported Server request, operation/thread-local pre-wire route, bounded early FIFO replay·cleanup과 safe result를 fake에서 강제하고 pinned binary happy path를 좁게 확인한다. |
| T0-C | `./conversation` public surface의 처음부터 native `ThreadId`별인 projection에서 A pending → B complete → A complete를 강제한다. A의 operation-local timeout·cap·protocol failure가 unrelated B, ingress·Server request·exact RPC drain을 막지 않음을 deterministic fake로 증명한다. |
| T0.1 | Original `RequestId` active collision, zero-or-one response frame, answer·resolved·turn transition·close·write-loss 중 remove-once, duplicate/late post-removal no-op, recursive no-raw retention과 current-pending disconnect settlement을 증명한다. Sequential ID reuse의 lifetime verdict는 이 gate에 넣지 않는다. |
| Legacy removal | `rg`가 tracked source/export/test/docs current-state claim에서 removed production symbol을 허용된 historical artifact 밖에서는 찾지 못한다. Clean package build 뒤 ignored `dist`에도 removed `.js`·`.d.ts`·map이 없고, development condition 없는 root·`./testing`·`./capabilities`·`./conversation` import가 성공하며 removed export는 없다. |
| Native state safety | Clean command는 caller-supplied target을 받지 않고 resolved exact package `dist` 밖이면 거부한다. Temporary repository fixture의 sibling `.ay-ple` sentinel과 external appData sentinel이 clean 뒤 그대로 남음을 검증하며 existing native app-data를 fixture나 cleanup 대상으로 사용하지 않는다. Root `git clean -x/-X`는 사용하지 않는다. |
| Repository regression | `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`, required runtime-codex unit/fake/live conformance와 generated inventory verify가 green이다. |
| Documentation integrity | Local links, `git diff --check`, ledger→inventory drift, ADR/spec/ticket state, README/map/backlog current-state claim과 package export를 대조한다. |

## 결정 종결

- Durable Host consumer가 없으므로 compatibility adapter, deprecation window, ref 이관이나 persisted schema 이관은 필요 없다.
- Native app-data와 Runtime Harness는 removal 대상이 아니며 explicit non-destructive boundary다.
- 새 Connection/Runtime은 legacy transport 위에 layer하지 않고 source-required semantics를 새 owner에서 구현한다.
- Ledger 이행은 safe generator가 먼저이며, planned record와 implemented integration promotion을 분리한다.
- T0-C와 T0.1까지 green이 된 뒤 legacy Host/transport/layout surface와 stale package output을 제거한다.
- AY-PLE adapter와 product policy는 이 구현 순서의 node나 completion condition이 아니다.
- 추가 HITL 결정은 없다. Exact exported type/function name, file split, cap default와 implementation ticket granularity는 resulting spec이 이 plan 안에서 정할 package-private 세부사항이다.

## 근거 연결

- Module seam과 T0는 [Ticket 008](../tickets/008-choose-first-tracer-and-module-seams.md), native identity/lifetime은 [Ticket 009](../tickets/009-decide-identity-and-authority.md), per-thread concurrency와 T0-C는 [Ticket 010](../tickets/010-decide-concurrency-policy.md)가 소유한다.
- Delivery/bounds는 [Ticket 011](../tickets/011-decide-delivery-and-recovery-model.md), unknown outcome·terminal cut은 [Ticket 012](../tickets/012-decide-connection-and-unknown-outcome-policy.md), Server request lease와 T0.1은 [Ticket 017](../tickets/017-decide-command-execution-approval-round-trip.md)가 소유한다.
- Oracle와 coverage ledger promotion은 [Ticket 013](../tickets/013-decide-source-conformance-verification.md)과 [source conformance evidence](013-source-conformance-and-ledger-evidence.md)가 소유한다. 이 plan은 그 semantic을 다시 정의하지 않고 이행 순서에 투영한다.
