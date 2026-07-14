# Source conformance verification와 coverage ledger 근거

분류: 기술 참고

성숙도: 채택

조사 기준: `@openai/codex@0.144.0`, exact upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`, 2026-07-14 현재 checkout

## 판정

T0·T0-C·T0.1의 conformance는 한 oracle로 증명할 수 없다. Pinned generated schema는 wire shape, exact Rust source와 first-party tests는 legal lifecycle과 identity authority, deterministic unit test는 pure state transition, spawned fake child는 external stdio interleaving·fault·no-raw invariant, package-owned live binary는 실제 배포 artifact와 happy-path compatibility를 각각 맡아야 한다. 이 다섯 authority를 섞거나 live scheduler로 race completeness를 증명하면 검증 범위를 과장한다.

권고하는 merge gate는 다음과 같다.

- 이 redesign의 모든 resolved decision·후속 spec·implementation slice는 Source·Standards·Spec 독립 review를 요구한다. Source semantic이 바뀌지 않은 checkpoint도 “영향 없음”을 독립적으로 판정하고, lifecycle·identity·ordering·recovery를 바꾸면 exact-pin source/test를 다시 읽는다. 구현 slice는 committed generated artifact와 ledger structural check, 영향받은 unit·fake-child oracle를 실행하고 Runtime tracer를 구현하거나 semantic을 바꾸면 영향받은 hermetic package-binary live tracer도 실행한다. 일반 build/test는 Git submodule checkout이나 외부 network를 요구하지 않지만 live job은 local mock Responses provider를 위한 loopback socket capability를 preflight하고 사용할 수 없으면 skip하지 않고 실패한다.
- Codex pin upgrade는 provenance·gitlink·package-owned binary preflight, 두 번의 staged generation, stable·experimental method diff, 영향받은 exact source/test 재검토, full unit·fake-child suite, hermetic T0·T0-C representative path·T0.1 live probe, Source·Standards·Spec review를 모두 요구한다.
- T0-C의 race-completeness oracle은 deterministic fake child다. 다만 local mock Responses provider가 A response를 gate하고 B를 먼저 끝낸 뒤 A를 release하는 한 경로는 package-binary pin-upgrade live gate로도 실행한다. Live 한 run은 actual binary path를 증명하지만 forced-race 전체를 증명하지 않는다.
- T0.1 live probe는 isolated three-root·`CODEX_HOME`과 local mock Responses provider가 regular command 하나를 deterministic하게 유도하므로 pin-upgrade required gate로 둔다. Unit·fake child는 여전히 duplicate·loss·cap·no-raw completeness를 소유한다.

[`codex-method-decisions.json`](../../../../packages/runtime-codex/codex-method-decisions.json)은 flat sparse overlay에서 versioned coverage ledger로 확장하는 편이 맞다. Method가 아닌 Connection·Runtime invariant도 T0 acceptance의 일부이므로 `methods` 외에 `contracts` registry가 필요하다. Committed ledger에는 transient test pass/fail을 기록하지 않고 `planned | implemented`만 기록한다. 실제 pass/fail은 CI 또는 implementation ticket Result가 소유해야 한다.

## 현재 local surface의 정확한 동작

### Method decisions와 generated inventory

현재 [`codex-method-decisions.json`](../../../../packages/runtime-codex/codex-method-decisions.json)은 69개 method의 sparse object다. 현재 값은 `client-host` 2개, `raw-wrapper` 8개, integration 미기록 59개이며 adoption은 `baseline` 47개, `later` 11개, `case-driven` 10개, `excluded` 1개다. 이 수치는 현재 file을 parse해 확인했다.

Renderer는 각 row에 아래 세 field만 허용한다.

| Field | 현재 enum 또는 type | 한계 |
| --- | --- | --- |
| `integration` | `schema-only | raw-wrapper | client-host | web-adapter | product-ui` | 한 “가장 먼 단계” scalar라서 Runtime Harness와 새 ConversationRuntime, migration 중 legacy Host의 공존을 표현하지 못한다. |
| `adoption` | `unreviewed | baseline | later | case-driven | excluded` | 채택 의도는 표현하지만 named tracer, variant와 구현 상태를 표현하지 못한다. |
| `note` | string | 사람이 읽는 설명이며 gate input으로 사용할 수 없다. |

Unknown field·invalid enum은 fail-closed하고, schema에 없는 method decision과 서로 다른 message direction에 같은 method가 나타나는 경우도 거부한다. Stable·experimental generated TypeScript에서 literal `method` property를 regex로 추출하며, 발견한 `method:` 수와 literal capture 수가 다르면 실패한다. 현재 renderer와 test가 보장하는 범위는 여기까지다. ([renderer](../../../../packages/runtime-codex/scripts/render-codex-app-server-methods.ts#L13-L175), [renderer tests](../../../../packages/runtime-codex/scripts/render-codex-app-server-methods.test.ts#L9-L169))

Generated [method inventory](../../../architecture/codex-app-server-method-inventory.md)는 stable 170개, experimental-only 36개, 전체 206개 method를 표시한다. JSON에 없는 row는 `schema-only`·`unreviewed`로 채운다. Renderer는 package dependency가 exact semver인지 확인하고 package-owned binary의 `--version`을 비교한 뒤 experimental schema를 temporary directory에 생성하지만, 최종 Markdown은 tracked path에 `writeFileSync`로 바로 쓴다. ([inventory generation](../../../../packages/runtime-codex/scripts/render-codex-app-server-methods.ts#L297-L346), [version preflight](../../../../packages/runtime-codex/scripts/render-codex-app-server-methods.ts#L358-L430))

Server request roster는 stable 10개이고 experimental generation에서 `currentTime/read` 하나가 추가된다. Stable-known request는 committed generated schema로 params까지 검증할 수 있지만 experimental-only 또는 future unknown method는 stable typed union으로 거부해 버리지 말고 exact ID·method를 가진 envelope까지만 검증한 뒤 same-ID unsupported error로 끝내야 한다. Typed semantic owner에게 전달하지 않는 것과 Connection이 ingress를 매달지 않는 것은 동시에 지켜야 한다. ([stable `ServerRequest`](../../../../packages/runtime-codex/src/internal/codex-app-server-protocol/generated/ServerRequest.ts))

Inventory는 method presence, direction, maturity와 AY-PLE coverage 판단을 보여 주는 projection이다. Response/notification ordering, native identity authority와 terminal state는 generated schema에도 inventory에도 없으므로 [lifecycle fact table](004-method-lifecycle-fact-table.md)과 exact source/tests만 소유해야 한다.

### Generation의 destructive-before-preflight gap

현재 `generate:codex-methods`는 먼저 `generate:codex-types`를 실행한다. Type generator는 binary path를 resolve한 직후 tracked `generated/` directory를 재귀 삭제하고, 그 다음에야 `generate-ts`를 실행한다. 이 script 자체에는 package pin·lock·`codex --version` preflight가 없다. Method renderer의 version check는 stable generation이 이미 끝난 뒤 실행된다. ([package scripts](../../../../packages/runtime-codex/package.json#L25-L32), [destructive generation](../../../../packages/runtime-codex/scripts/generate-codex-app-server-types.ts#L19-L42))

따라서 missing·wrong binary, generation failure 또는 malformed ledger가 tracked generated tree를 이미 지운 뒤에 발견될 수 있다. 현재 renderer unit tests도 generation transaction, tracked-output non-mutation, two-run determinism이나 rollback을 검증하지 않는다. 이 gap은 이전 [provenance 조사](003-upstream-source-provenance.md#generated-protocol-digest)에서 확인한 것과 일치한다.

Upstream fixture도 raw JSON byte order를 semantic equality로 보지 않는다. JSON object key를 정렬하고, schema comparison에서 모든 element에 safe sort key를 만들 수 있는 배열만 정렬하며, 그 밖의 배열 순서는 보존한다. TypeScript는 newline과 generated header 차이를 normalize한다. 무조건적인 recursive array sort는 tuple/prefix ordering의 의미를 바꿀 수 있으므로 사용하면 안 된다. ([pinned schema fixture canonicalization](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/schema_fixtures.rs#L124-L207))

2026-07-14 local read-only check에서 package-owned `0.144.0` binary로 stable `generate-json-schema`를 두 번 실행했을 때 `codex_app_server_protocol.v2.schemas.json`만 raw byte diff가 있었고, 그 두 file은 `jq -S` object-key normalization 뒤 같았다. 이 sample은 현재 차이가 object order뿐임을 확인하지만 cross-platform array 안정성까지 증명하지 않으므로 구현은 upstream full canonicalization rule을 따라야 한다.

### 현재 fake와 live surface는 새 runtime proof가 아니다

현재 spawned fake stdio fixture는 actual child process, JSONL journal, timeout·kill·temporary cleanup primitive를 제공하므로 선별 재사용 가치가 있다. 그러나 scenario table과 assertions는 기존 `CodexStdioTransport` 계약을 증명한다. 특히 response 또는 `dismiss()` 뒤 같은 Server `RequestId`를 새 request에 순차 재사용할 수 있다고 명시적으로 test한다. ([fake scenario roster](../../../../packages/runtime-codex/src/testing/fake-codex-stdio-transport.ts#L16-L53), [response 뒤 ID reuse test](../../../../packages/runtime-codex/src/stdio-transport.test.ts#L830-L872), [`dismiss()` 뒤 ID reuse test](../../../../packages/runtime-codex/src/stdio-transport.test.ts#L874-L932))

이것은 Ticket 017이 채택한 Connection process-lifetime lease/tombstone과 conflicting reuse fail-closed 계약과 다르다. 따라서 child spawn·journal·cleanup primitive는 재사용할 수 있지만 old scenario semantics와 test result를 T0.1 implemented evidence로 승격할 수 없다.

별도 [`fake-codex-app-server.ts`](../../../../packages/runtime-codex/src/testing/fake-codex-app-server.ts#L346-L580)는 `thread/start` response와 response-first `turn/start → turn/started → delta → turn/completed`를 만들지만 completed AgentMessage `item/completed`, notification-first turn, native multi-thread interleaving과 Server request lifecycle을 제공하지 않는다. Raw adapter debug-log fixture이므로 safe `CodexConversationRuntime` proof로도 충분하지 않다.

현재 [`smoke.ts`](../../../../packages/runtime-codex/src/smoke.ts#L1-L86)는 package-owned binary로 `initialize/initialized`만 확인한다. T0 semantic result, T0-C와 T0.1 live conformance는 새 narrow command가 필요하다.

## Oracle별 authority와 한계

| Oracle | 반드시 증명할 것 | 이 oracle만으로 증명하지 못하는 것 |
| --- | --- | --- |
| Pinned generated TypeScript·JSON Schema | Message direction, method discriminant, required/optional field, exact `RequestId` union, request/response/notification payload shape와 enum | Ordering, authoritative identity, duplicate/late semantics, terminal transition, product policy |
| Exact Rust source·first-party tests | Pinned implementation의 task ownership, legal response/notification order, identity authority, per-thread lifecycle, callback cleanup과 first-party handling | AY-PLE external stdio port가 같은 의미를 보존했다는 사실, child process fault behavior |
| Deterministic unit test | Envelope classification, exact typed ID key, pure actor transition, duplicate/tombstone table, cap accounting, sanitization/no-raw recursive assertion | JSONL chunking, real child lifecycle, writer callback와 process cut interleaving |
| Spawned fake child | Single ingress, real pipe framing, response/notification/Server request interleaving, stdout tail·EOF·exit·stdin fault, serialized journal의 zero/one frame, A/B independence | Upstream binary가 실제로 같은 schema와 lifecycle을 구현한다는 artifact compatibility |
| Package-owned live binary | Installed launcher/native artifact의 version, initialize와 selected happy path, actual external stdio compatibility, source에서 추론한 ordering이 현실적으로 가능한지 | Exhaustive race, deterministic cross-thread schedule, duplicate/conflict injection, timeout·partial-write completeness |

Official App Server 문서는 CLI가 실행한 Codex version에 specific한 TypeScript와 JSON Schema를 생성한다고 규정한다. 따라서 public shape의 owner는 package-owned pinned binary output이고 Rust private type을 generated schema 대신 wire authority로 쓰지 않는다. ([official message schema](https://developers.openai.com/codex/app-server/#message-schema), [pinned CLI generation entrypoint](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/cli/src/main.rs#L659-L681), [generation dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/cli/src/main.rs#L1198-L1213))

Source/test와 external-port oracle을 분리해야 하는 핵심 근거는 다음과 같다.

- `thread/start`는 같은 task에서 response enqueue를 await한 뒤 `thread/started`를 enqueue한다. Pre-response `thread/started` fail-closed는 exact-pin source fact다. ([thread/start response-first path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1360))
- `turn/start`는 core submission ID를 response로 만들지만 common request handler가 response를 쓰는 task와 per-thread event listener가 `turn/started`를 forward하는 task가 분리된다. First-party test client도 response wait 중 먼저 받은 notification을 FIFO에 보존하고 Server request를 처리한다. 따라서 notification-first correlation은 정상 client primitive다. ([turn/start response construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568), [common response dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/message_processor.rs#L1424-L1434), [first-party FIFO client](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1964-L2011))
- App Server stdio는 bounded outgoing writer 하나를 통해 newline-delimited message를 쓴다. 이 wire order 자체가 cross-thread causal order는 아니다. External client는 한 reader로 exact direction과 ID를 demux해야 한다. ([pinned stdio reader/writer](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-transport/src/transport/stdio.rs#L24-L100), [pinned `RequestId`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/rpc.rs#L13-L42))
- App Server의 thread별 listener와 request serialization은 different native `ThreadId`를 별도 task/key로 진행시킨다. Long-running A/B의 exact relative scheduler order를 first-party E2E가 보장하지 않으므로 T0-C는 fake child에서 A pending → B complete → A complete를 강제해야 한다. ([per-thread listener](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L240-L343), [different-key concurrency test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_serialization.rs#L274-L306))
- Regular command approval response는 exact generated decision을 core `ReviewDecision`으로 mapping하고 listener pending callback을 resolve한다. First-party tests는 original ID response 뒤 matching `serverRequest/resolved`, declined command `item/completed`, authoritative `turn/completed`를 각각 관찰한다. 이것은 resolved가 command 또는 turn success가 아님을 보여 준다. ([decision mapping](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1908-L1971), [accept/resolved test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L2281-L2348), [decline item/turn test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L2440-L2530))
- Pinned first-party integration fixture는 isolated `CODEX_HOME`·managed-config path를 설정하고 실제 App Server program을 piped stdio child로 spawn한다. Turn tests는 local mock Responses HTTP provider를 `config.toml`에 주입해 external auth·hosted model·외부 network access 없이 deterministic AgentMessage·command request를 만든다. 이 fixture와 AY-PLE package-binary probe는 loopback socket capability를 요구하므로 required live job이 이를 preflight하고 unavailable 환경에서 silent skip을 허용하지 않는다. ([actual child fixture](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/common/test_app_server.rs#L225-L296), [local mock provider config](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L4606-L4668), [hermetic approval decline path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L2383-L2530))

## T0·T0-C·T0.1 oracle assignment

### Method coverage

아래 표와 ledger의 machine field는 `coverage: required | tolerated | unsupported | deferred`를 사용한다. `required`는 tracer success에 반드시 필요함, `tolerated`는 발생할 필요는 없지만 보이면 parse·generated validation·native scope routing을 deterministic하게 통과하고 authority나 completion condition으로 사용하지 않음, `unsupported`는 same-ID deterministic error로 종결하고 semantic adoption하지 않음, `deferred`는 해당 tracer가 의도적으로 소유하지 않음을 뜻한다. `tolerated`는 silent ignore 허용이 아니다.

| Method 또는 direction rule | T0 | T0-C | T0.1 | Required evidence |
| --- | --- | --- | --- | --- |
| `initialize` | required | required | inherited T0 bootstrap | generated schema, initialize source/test, unit validation, fake child, T0 live |
| `initialized` | required outbound | required outbound | inherited T0 bootstrap | generated schema, unit exact frame, fake journal, T0 live |
| `thread/start` | required | required concurrent bootstrap | inherited T0 bootstrap | response-first source, unit authority, fake response/pre-response fault, T0 live |
| `thread/started` | tolerated; pre-response는 fault | same | same | source ordering, unit fault transition, fake present/absent/pre-response cases |
| `turn/start` | required idle branch | required per actor | required approval-bearing turn | source task graph, unit provisional state, fake either-order·timeout·loss, T0 live |
| `turn/started` | required matching convergence | required per actor | required activation/convergence | source/listener, unit correlation, fake notification-first·response-first |
| `item/started` | tolerated | tolerated | tolerated; approval activation barrier 아님 | schema, unit category/scope, fake omission/presence |
| `item/agentMessage/delta` | tolerated | tolerated | tolerated validate-and-discard; streaming·approval semantics deferred | schema, unit no-result-authority, fake omission/presence |
| `item/completed` AgentMessage | required, 하나 이상 | required per actor | inherited T0 result plus command category | schema/event mapping, unit category/tombstone, fake exact/duplicate/conflict, T0 live |
| `turn/completed` | required authoritative terminal | required per actor | required authoritative terminal·pending release | schema/source, unit terminal table, fake duplicate/late/conflict, live |
| `error` | tolerated generated-envelope validation; terminal authority 아님 | same | same; approval·turn terminal 대체 아님 | schema, unit `error`-without-terminal non-authority, fake omission/presence; Runtime semantic coverage deferred |
| `item/commandExecution/requestApproval` regular | unsupported by generic T0 fallback | unsupported by generic T0-C fallback | required supported variant | generated request/response, source mapping, unit lease/actor, fake full race matrix, live |
| `serverRequest/resolved` | tolerated cleanup | tolerated per actor | normal round-trip required; transition cleanup에서는 tolerated | schema/source/test, unit original scope, fake both order families, live |
| 그 밖의 stable-known `serverRequest` | generated params validation 뒤 unsupported same-ID error | same | same, named T0.1 variant만 override | Stable roster 10개, Connection unit, fake typed roster/journal; live 불필요 |
| Experimental-only `currentTime/read`와 future unknown Server method | exact envelope validation 뒤 unsupported same-ID error, typed params로 해석하지 않음 | same | same | Experimental roster와 unknown-envelope unit/fake journal; semantic integration 없음 |
| `turn/steer`, `turn/interrupt`, resume/read/replay | deferred | deferred | deferred | Ledger가 명시적으로 deferred를 보존하며 관련 후속 tracer가 채택할 때만 source/oracle 추가 |

T0의 basic upstream happy path는 `thread/start` response identity, matching `turn/started`, matching `turn/completed(completed)`를 first-party test로 확인할 수 있다. 다만 T0가 요구하는 completed AgentMessage selection과 safe result는 AY-PLE projection이므로 unit·fake-child에서 별도로 증명해야 한다. ([thread start test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/thread_start.rs#L380-L465), [turn start/terminal test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L224-L296))

### Non-method contract coverage

Method row만으로 아래 acceptance를 표현할 수 없다. `contracts` registry가 없으면 `initialize` row에 process terminal, RequestId demux와 safe retention을 억지로 매달거나 아예 ledger 밖에 남기게 된다.

| Contract ID 권고 | Owner | Tracer | Required oracle |
| --- | --- | --- | --- |
| `connection.single-jsonl-ingress` | `app-server-connection` | T0, T0-C, T0.1 | unit parser + spawned fake child chunk/tail/fault |
| `connection.direction-aware-request-id` | `app-server-connection` | T0, T0.1 | unit string/number/opposite direction + fake journal |
| `connection.pending-rpc-settlement` | `app-server-connection` | T0, T0-C | unit timeout/late/terminal + fake exit/stdout/stdin races |
| `connection.server-response-lease` | `app-server-connection` | T0 unsupported, T0.1 supported | unit once-only/tombstone + fake zero/one frame and delivery unknown |
| `connection.process-terminal-and-reap` | `app-server-connection` | 전 runtime tracer | fake child exit/EOF/write fault/SIGTERM/SIGKILL; live normal close |
| `connection.bounded-retention` | `app-server-connection` | T0, T0.1 | unit tiny count/byte cap + fake saturation/no-raw |
| `runtime.native-identity-authority` | `conversation-runtime` | T0, T0-C, T0.1 | unit authority/mismatch + fake response/notification convergence |
| `runtime.thread-actor-isolation` | `thread-actor` | T0-C, T0.1 | unit routing + fake A pending → B complete → A complete |
| `runtime.safe-observation-retention` | `thread-actor` | 전 runtime tracer | recursive no-raw unit + fake sentinel payload |
| `runtime.semantic-result-gate` | `conversation-runtime` | T0, T0-C | unit completed AgentMessage + authoritative terminal, fake full success/failure |
| `connection.mutation-outcome` | `app-server-connection` | T0, T0-C, T0.1 | unit pre-wire·write-attempted·response-confirmed table + fake timeout/response-loss/terminal cut |
| `runtime.semantic-outcome` | `thread-actor` | T0, T0-C, T0.1 | unit accepted-execution·semantic-settled table + fake partial observation·actor-local sink |
| `layout.explicit-three-root` | `runtime-preparation` | T0 bootstrap | existing layout unit + public runtime fake/live launch; Rust source evidence 대상 아님 |

`layout.explicit-three-root`는 T0 prerequisite지만 Codex-native protocol semantic은 아니다. Ledger owner를 별도로 두면 product policy를 Rust source에서 유도했다고 잘못 표시하지 않는다.

### Live gate의 정확한 위치

| Live probe | 일반 PR | Pin upgrade | 판정 |
| --- | --- | --- | --- |
| T0 initialize → new thread → text turn → AgentMessage → authoritative terminal | T0 implementation/semantic-change PR에서 required; 다른 PR은 실행하지 않음 | required | Package binary·generated schema·external stdio happy path의 최소 cross-check다. Isolated three-root, isolated `CODEX_HOME`과 loopback local mock Responses provider로 auth-free·외부-network-independent하게 만든다. Loopback preflight 실패는 skip이 아니라 gate failure다. |
| T0-C A/B/A2 schedule | T0-C implementation/semantic-change PR에서 required representative path; 다른 PR은 실행하지 않음 | required representative path | Local mock provider barrier로 A pending → B complete → A complete 한 경로를 강제한다. 그 path의 actual binary compatibility는 증명하지만 alternative scheduler/race completeness는 fake child가 소유한다. |
| T0.1 regular command approval decline | T0.1 implementation/semantic-change PR에서 required; 다른 PR은 실행하지 않음 | required | Pinned first-party test와 같은 local mock Responses sequence로 regular command를 deterministic하게 만들 수 있다. Original ID response, resolved, declined command item과 authoritative terminal을 확인한다. |
| Duplicate/conflict/partial-write/cap/no-raw race | 실행하지 않음 | 실행하지 않음 | Live binary에 fault injection을 기대하지 않는다. Unit·fake child가 소유한다. |

## 일반 PR과 pin upgrade gate

| Gate | 일반 PR | Codex pin upgrade |
| --- | --- | --- |
| Package/lock/binary structural check | Exact dependency, lock presence, package-owned binary version과 committed provenance mirror를 offline cross-check | Target root/platform package roster·integrity·attestation·exact source commit까지 검증 |
| Generated artifact | Committed schema parse, ledger validation, inventory render-to-temp drift check. Generator/roster/decision 변경 시 staged two-run generation도 필수 | Stable·experimental staged generation을 두 번 수행하고 canonical equality, tracked diff와 method add/remove review 필수 |
| Source review | 이 redesign의 모든 decision·spec·implementation checkpoint에서 독립 review 필수. Source semantic이 바뀌지 않으면 영향 없음과 evidence drift를 판정하고, lifecycle·identity·ordering·recovery가 바뀌면 exact-pin source/test를 재검토 | 모든 changed adopted row와 reviewed source path를 old/new exact commit으로 재검토 |
| Standards review | 필수 | 필수 |
| Spec review | 필수 | 필수 |
| Unit oracle | 영향받은 tracer·contract 필수 | Full runtime-codex unit suite 필수 |
| Fake-child oracle | 영향받은 tracer·contract 필수 | Full T0/T0-C/T0.1 conformance suite 필수 |
| Live binary | Runtime tracer implementation/semantic-change PR은 affected hermetic tracer 필수. Runtime과 무관한 PR은 없음 | Full hermetic T0·T0-C representative path·T0.1 필수 |
| Rust submodule | initialize하지 않음 | Source/provenance gate에서만 exact gitlink checkout |
| External network | 요구하지 않음. Hermetic live job은 loopback HTTP capability를 preflight하며 silent skip 금지 | Hermetic live의 loopback은 필수. Registry provenance 또는 target source fetch가 필요한 explicit upgrade job만 외부 network 사용 |

Source·Standards·Spec은 서로 대체하지 않는다. Source review는 upstream meaning 보존 또는 source semantic 무영향, Standards는 repo 규칙·boundary·security, Spec은 owning tracer acceptance와 scope를 각각 검사한다. Goal checkpoint가 아닌 단순 formatter·typo maintenance는 이 matrix의 implementation slice가 아니다. Runtime semantic change에는 exact source/test 재판독을 생략할 수 없다.

## `codex-method-decisions.json` v2 권고

### Top-level shape

Flat map을 다음 versioned object로 바꾼다.

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

`provenance.manifest`는 version selector가 아니라 cross-check 대상 path다. Package version owner는 계속 `package.json`, artifact integrity owner는 lock, source commit owner는 provenance manifest·gitlink다. Ledger에 `0.144.0`과 commit을 또 복사해 독립 pin처럼 만들지 않는다.

### Vocabulary

| Field | 권고 enum | 의미 |
| --- | --- | --- |
| `integrations[]` | `runtime-harness | legacy-client-host | app-server-connection | conversation-runtime | ayple-adapter` | 현재 실제로 구현된 surface의 set. Omitted/empty면 generated inventory가 `schema-only`로 표시한다. |
| `adoption` | 기존 `unreviewed | baseline | later | case-driven | excluded` 유지 | 이번 ticket은 adoption 의미를 불필요하게 재정의하지 않는다. Named tracer coverage가 broad baseline intent와 실제 채택 slice를 구분한다. |
| `owner` | `app-server-connection | conversation-runtime | thread-actor | runtime-preparation | ayple-adapter` | 해당 coverage의 semantic authority |
| `coverage` | `required | tolerated | unsupported | deferred` | Tracer case별 wire/semantic 의무. `tolerated`도 parse·validate·route oracle이 필요하며 occurrence나 authority는 요구하지 않는다. |
| `verification.*.requirement` | `required | not-required` | 해당 oracle이 이 coverage의 증명에 필요한지 나타낸다. 실행 시점은 `gates[]`가 구분하므로 별도 conditional 상태를 만들지 않는다. |
| `verification.*.implementation` | `planned | implemented` | Test/probe가 존재하는지. `required`일 때 필수이고 `not-required`일 때는 생략한다. 최근 run이 pass했는지는 뜻하지 않는다. |
| `verification.*.gates[]` | `general-pr | runtime-tracer-pr | pin-upgrade` | Unit·fake의 일반 gate, affected tracer의 hermetic live gate, full pin-upgrade gate를 구분한다. |

Integration은 linear ladder가 아니다. 현재 Runtime Harness wrapper와 새 `CodexConversationRuntime`은 migration 중 또는 developer-only path로 계속 공존할 수 있고, old Host도 제거 ticket 전까지 잠시 함께 존재한다. 따라서 set이 현재 executable fact를 가장 정확히 표현한다. 목표는 별도 scalar로 복제하지 않고 tracer coverage의 `owner`, `coverage`와 `verification.implementation=planned`가 설계 목표를 표현한다. Implementation gate를 통과할 때만 해당 surface를 `integrations` set에 추가한다.

현재 8개 `raw-wrapper` row는 v2 migration에서 `runtime-harness`, 2개 `client-host` row는 transitional `legacy-client-host`로 옮긴다. `web-adapter`·`product-ui`는 method integration taxonomy에서 제거하고 실제 product boundary 하나인 `ayple-adapter`만 둔다. Ticket 014가 old Host를 제거하면 `legacy-client-host` membership만 삭제한다. 새 runtime surface가 이미 구현된 row라면 다른 membership을 유지하며, 아무 surface도 남지 않을 때만 generated inventory가 `schema-only`를 표시한다.

### Example shape

아래 예시는 field 관계를 보여 주며 T0/T0.1 전체 row를 복제한 최종 JSON은 아니다.

```json
{
  "schemaVersion": 2,
  "provenance": {
    "manifest": "codex-upstream-provenance.json"
  },
  "tracers": {
    "T0": {
      "kind": "runtime",
      "cases": ["success", "unsupported-server-request"]
    },
    "T0-C": {
      "kind": "runtime",
      "cases": ["a-pending-b-complete-a-complete"]
    },
    "T0.1": {
      "kind": "runtime",
      "cases": [
        "normal-round-trip",
        "turn-transition-cleanup",
        "delivery-unknown"
      ]
    }
  },
  "evidence": {
    "source.thread-start.response-first": {
      "kind": "upstream-source",
      "path": "codex-rs/app-server/src/request_processors/thread_processor.rs",
      "lines": [1328, 1360]
    },
    "test.command-approval.decline": {
      "kind": "upstream-test",
      "path": "codex-rs/app-server/tests/suite/v2/turn_start.rs",
      "lines": [2440, 2530]
    }
  },
  "contracts": {
    "connection.stable-server-request-fallback": {
      "owner": "app-server-connection",
      "appliesTo": {
        "direction": "serverRequest",
        "maturity": "stable"
      },
      "coverage": {
        "T0": {
          "cases": {
            "unsupported-server-request": {
              "coverage": "unsupported",
              "validation": "generated-schema",
              "disposition": "same-id-error"
            }
          },
          "sourceEvidence": [],
          "verification": {
            "unit": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "fakeChild": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "liveBinary": {
              "requirement": "not-required",
              "gates": [],
              "evidence": []
            }
          }
        }
      }
    },
    "connection.untyped-server-request-fallback": {
      "owner": "app-server-connection",
      "appliesTo": {
        "direction": "serverRequest",
        "maturity": ["experimental", "unknown"]
      },
      "coverage": {
        "T0": {
          "cases": {
            "unsupported-server-request": {
              "coverage": "unsupported",
              "validation": "exact-envelope",
              "disposition": "same-id-error"
            }
          },
          "sourceEvidence": [],
          "verification": {
            "unit": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "fakeChild": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "liveBinary": {
              "requirement": "not-required",
              "gates": [],
              "evidence": []
            }
          }
        }
      }
    }
  },
  "methods": {
    "thread/start": {
      "integrations": ["runtime-harness"],
      "adoption": "baseline",
      "note": "T0와 T0-C의 새 native thread bootstrap",
      "coverage": {
        "T0": {
          "owner": "conversation-runtime",
          "cases": {
            "success": {
              "coverage": "required"
            }
          },
          "sourceEvidence": ["source.thread-start.response-first"],
          "verification": {
            "unit": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "fakeChild": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "liveBinary": {
              "requirement": "required",
              "gates": ["runtime-tracer-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            }
          }
        }
      }
    },
    "serverRequest/resolved": {
      "integrations": [],
      "adoption": "baseline",
      "coverage": {
        "T0.1": {
          "owner": "thread-actor",
          "cases": {
            "normal-round-trip": {
              "coverage": "required"
            },
            "turn-transition-cleanup": {
              "coverage": "tolerated"
            }
          },
          "sourceEvidence": ["test.command-approval.decline"],
          "verification": {
            "unit": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "fakeChild": {
              "requirement": "required",
              "gates": ["general-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            },
            "liveBinary": {
              "requirement": "required",
              "gates": ["runtime-tracer-pr", "pin-upgrade"],
              "implementation": "planned",
              "evidence": []
            }
          }
        }
      }
    }
  }
}
```

`sourceEvidence: []`가 허용되는 경우는 generated direction rule처럼 source lifecycle claim이 없는 Connection fallback contract뿐이다. Method의 `required`·`tolerated` semantic coverage에는 generated schema reference와 하나 이상의 owning decision 또는 exact source/test evidence가 있어야 한다.

### Validator가 강제할 invariant

1. 모든 tracer, case, evidence ID와 method는 존재해야 한다. Removed method decision은 fail-closed한다.
2. Generated schema가 method direction과 maturity를 소유한다. JSON이 이를 다시 적어 drift source를 만들지 않는다.
3. 새 generated method는 자동으로 `schema-only`·`unreviewed`·coverage 없음이 된다. Pin upgrade가 add/remove diff를 review하기 전에는 baseline이나 unsupported rule 외 semantic adoption으로 자동 승격하지 않는다.
4. `integrations`는 unique set이어야 하고 empty가 `schema-only`를 뜻한다. `schema-only` 자체는 set value가 아니다.
5. `app-server-connection`, `conversation-runtime` 또는 `ayple-adapter` membership을 추가하려면 그 surface가 소유하는 모든 `required` verification이 `implemented`이고 non-empty local selector를 가져야 한다. Membership을 추가하는 Result-producing checkpoint는 해당 unit·fake-child·live gate의 현재 pass도 확인한다.
6. `runtime-harness` membership은 새 runtime integration을 암시하지 않는다. `legacy-client-host`는 initial migration allowlist 밖의 새 row에 추가할 수 없고 Ticket 014 완료 뒤에는 0개여야 한다.
7. `verification.implementation=implemented`는 test/probe file과 stable test name이 존재함을 뜻한다. `required` verification에는 `implementation`이 필수다. `not-required` verification은 `implementation`을 생략하고 empty `gates`·`evidence`만 허용한다. Last-run pass, timestamp, branch SHA는 JSON에 기록하지 않는다.
8. `unsupported` Server request coverage는 known stable request의 generated params validation과 experimental/unknown request의 exact envelope validation을 구분하고 둘 다 `disposition=same-id-error`를 요구한다. Generic fallback은 individual method의 semantic integration membership을 추가하지 않는다.
9. `tolerated`는 occurrence나 authority를 요구하지 않지만 schema validation·scope correlation test를 요구한다. Silent drop을 implemented evidence로 인정하지 않는다.
10. `deferred` row는 executable oracle을 요구하지 않으며 해당 coverage owner의 integration membership을 추가할 수 없다.
11. `thread-actor` owner의 implemented coverage는 `conversation-runtime` membership으로 계산한다. Internal class를 public integration taxonomy로 만들지 않는다.
12. Direction selector와 explicit method coverage가 겹치면 explicit supported variant가 generic unsupported fallback을 좁게 override한다. Variant/case 밖의 나머지는 fallback을 유지한다.
13. Product tracer는 runtime prerequisite를 method/contract ID와 tracer case로 참조해야 하며 자유 형식 note로 readiness를 주장할 수 없다.

### Design checkpoint와 implementation checkpoint

| 시점 | Ledger update | 금지 |
| --- | --- | --- |
| Design decision resolved | Tracer/case, owner, coverage, source evidence, planned oracle를 먼저 기록하고 inventory regenerate | 구현 전 `integrations` membership 추가, 빈 implemented evidence, generated inventory 직접 수정 |
| Implementation PR ready | 적용되는 required unit/fake/live probe를 `implemented`로 바꾸고 selector를 기록하며 현재 gate가 모두 pass한 Result-producing checkpoint에서 해당 surface membership 추가 | Product E2E test만으로 runtime oracle 대체, transient “passed” 기록 |
| Pin upgrade | Evidence path/line과 generated method diff를 새로운 exact commit으로 재검토하고 required live gate 실행 | 기존 line number 기계 이동, 새 method 자동 adoption, submodule을 일상 build dependency로 추가 |

## Safe deterministic generation과 drift check

Generator는 mutation mode와 verification mode가 같은 pure pipeline을 공유해야 한다.

### 1. Preflight — tracked output에 손대기 전

1. `packages/runtime-codex/package.json`의 `@openai/codex`가 exact semver인지 확인한다.
2. Root lock의 umbrella package, 현재 platform package, version·resolved URL·integrity와 accepted platform roster를 확인한다.
3. Workspace에서 resolve한 package-owned launcher와 native package가 expected `node_modules` tree에 속하는지 확인하고 global `PATH` fallback을 거부한다.
4. `codex --version`이 exact package pin과 같은지 확인한다.
5. Default structural mode에서는 committed provenance manifest·snapshot digest·generated manifest를 offline cross-check한다. Source mode에서만 gitlink와 checked-out exact commit을 요구한다.
6. Decisions v2 JSON 자체를 schema-validate하고 known tracer/enum/evidence reference를 먼저 확인한다.

이 중 하나라도 실패하면 tracked generated directory와 inventory의 byte가 하나도 바뀌지 않아야 한다.

### 2. Staged generation

1. Tracked target과 같은 filesystem의 새 staging root A에 stable `generate-ts`와 `generate-json-schema`, experimental `generate-ts --experimental`을 실행한다.
2. Stable output에 AY-PLE response-schema selection과 NodeNext `.js` import rewrite를 적용한다.
3. JSON은 pinned upstream fixture와 동등한 semantic canonicalization을 적용한다. Object key는 정렬하고, 모든 element에 safe schema sort key를 만들 수 있는 array만 정렬하며, 그 밖의 array order는 보존한다. TypeScript는 LF를 사용하고 deterministic rewrite를 적용한다.
4. Staged stable·experimental schema에서 direction별 method roster를 만들고 decisions v2를 validate한다.
5. 같은 staged source로 method inventory를 memory 또는 staging file에 render한다. Tracked inventory를 읽어 semantic input으로 사용하지 않는다.
6. 별도 새 staging root B에서 1–5를 반복하고 A/B normalized tree, roster와 inventory가 byte-identical인지 확인한다.

Raw generator가 nondeterministic해도 canonical output이 같으면 통과할 수 있다. Canonicalization 뒤에도 A/B가 다르면 tracked output을 갱신하지 않고 generator drift로 실패한다.

### 3. Verify mode와 mutation mode

| Mode | 동작 |
| --- | --- |
| `verify` | A/B 검증 뒤 staged stable tree·inventory를 tracked counterpart와 비교하고 diff가 있으면 non-zero로 종료한다. Tracked file write·delete·rename은 0회다. |
| `generate` | A/B와 모든 validator가 통과한 뒤에만 sibling temporary target과 backup을 사용해 stable tree와 inventory를 promote한다. 두 target 중 하나의 replace가 실패하면 backup에서 rollback하고 partial success를 남기지 않는다. |

Generated directory와 `docs/architecture` inventory가 서로 다른 parent에 있어 단일 POSIX rename으로 둘을 transaction 처리할 수 없다. 따라서 “atomic”이라는 이름만 붙이지 말고, prevalidated two-target promotion + explicit backup/rollback을 구현하고 failure injection test로 증명해야 한다.

### 4. Required generator tests

- Wrong package pin, missing lock entry, wrong binary version, malformed ledger에서 tracked sentinel tree가 byte-identical하게 남는다.
- Stable·experimental generation A/B가 normalized equality를 통과한다.
- JSON object/known schema-set order 차이는 canonicalize되고 tuple-like unsortable array order는 보존된다.
- Unknown/removed method, direction collision, unknown tracer/case/evidence, invalid enum과 illegal integration promotion은 fail-closed한다.
- Verification mode는 clean tree에서 zero diff, deliberate generated/ledger/inventory drift에서 non-zero이며 tracked file을 고치지 않는다.
- Mutation promotion의 first/second target replace failure를 주입하면 원래 두 target이 복구된다.
- New upstream method는 `schema-only`·`unreviewed`로 나타나며 semantic coverage를 자동 상속하지 않는다. 단, direction-wide unsupported Connection rule은 inherited handling으로 표시할 수 있다.

## Product tracer와 runtime proof 분리

실행 가능한 AYPLE adapter는 다음 readiness predicate를 통과한 runtime capability만 소비해야 한다.

1. Adapter가 요구하는 method와 non-method contract를 named runtime tracer case로 열거한다.
2. 각 prerequisite의 `integrations` set에 required runtime surface가 존재한다.
3. 각 prerequisite의 required unit·fake-child·live oracle가 `implemented`이고 현재 gate run이 pass한다.
4. Generated/ledger/inventory drift check와 필요한 Source·Standards·Spec review가 pass한다.
5. 해당 capability가 pin-upgrade live-required이면 initial implementation checkpoint와 pin upgrade에서 live probe Result를 남긴다.

Product adapter test는 `CodexConversationRuntime`의 public surface를 통해 safe result를 `ModelingInvocation`·`ModelingRun`으로 mapping한다. Protocol actor를 직접 호출하거나 fake runtime implementation으로 success를 합성하면 안 된다. Spawned fake child를 runtime 아래에 두는 것은 허용되지만, adapter test는 protocol race matrix를 반복하지 않고 제품 mapping만 검증한다.

[첫 AYPLE adapter tracer Ticket 018](../tickets/018-decide-first-ayple-adapter-tracer.md)이 선택한 adapter가 소비하는 runtime prerequisite를 선언한다. 실행 가능한 contract가 concurrent/multi-thread independence를 가정할 때만 T0-C가 prerequisite이고, command approval을 소비할 때만 T0.1이 prerequisite다. Ticket 013은 이 machine-checkable predicate만 정의하며 첫 product tracer나 dependency를 선결정하지 않는다.

## 구현 전 남은 구체화

이 조사로 추가 제품 결정을 만들 필요는 없다. 후속 spec/ticket이 아래 implementation detail만 고정하면 된다.

- Decisions v2를 TypeScript parser로 직접 검증할지 별도 JSON Schema도 commit할지
- Generator promotion backup naming, crash recovery와 cleanup deadline
- Evidence registry의 local test selector를 `path + exact test name`으로 둘지 stable explicit test ID를 추가할지
- T0 live controlled model fixture와 T0.1 command trigger가 CI 환경에서 재현 가능한지
- Ticket 011·012·017이 넘긴 count/UTF-8 byte cap의 exact numeric default와 test injection surface

어느 선택도 inventory를 ordering·identity authority로 승격하거나 submodule을 runtime dependency로 만드는 이유가 되지 않는다.
