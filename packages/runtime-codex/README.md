# @ay-ple/runtime-codex

Codex App Server 통합 실험을 담당하는 runtime package다. raw Codex protocol을 이 package 안에 가두어 `runtime-core`, server와 제품 코드가 Codex-specific message shape에 의존하지 않게 한다.

> **설계 전환:** 아래 `CodexStdioTransport`, `ProductRuntimeLayout`과 `HeadlessCodexClientHost` 절은 아직 코드에 남아 있는 기존 구현을 설명한다. [ADR 0010](../../docs/adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)이 채택한 `CodexAppServerConnection → CodexConversationRuntime` 교체 목표는 아직 구현되지 않았으며, [이전 계획](../../docs/wayfinding/codex-native-client-redesign/tickets/014-plan-host-removal-and-selective-salvage.md)의 적합성 gate를 통과한 뒤에만 이 기존 surface를 제거한다.

## 고정 계약

| 항목 | 값 |
| --- | --- |
| Codex package | `@openai/codex@0.144.0` |
| Model 선택 | Codex 기본값; AY-PLE는 아직 model을 고정하지 않음 |
| Transport | `stdio` JSONL |
| 시작 명령 | `codex app-server --listen stdio://` |
| 생성 protocol 경로 | `src/internal/codex-app-server-protocol/generated/` |

내부 Codex App Server TypeScript protocol 파일과 transport가 사용하는 Server request·method별 success response 및 adopted Client success response runtime-validation JSON Schema는 다음 명령으로 다시 생성한다.

```bash
npm run generate:codex-types -w @ay-ple/runtime-codex
```

Generator는 package-owned Codex binary의 `generate-ts`와 `generate-json-schema`를 실행하고, `NodeNext` ESM compile을 위해 생성된 relative import에 `.js` 확장자를 붙인다. 전체 JSON Schema output 중 transport가 사용하는 `ServerRequest.schema.json`, method별 Server response schema를 모은 `ServerRequestResponses.schema.json`과 채택한 Client success response schema를 모은 `ClientRequestResponses.schema.json`을 같은 generated directory에 둔다. 현재 Client roster는 `initialize`만 포함하며 source 기반 runtime tracer가 실제로 채택한 response·notification을 연결할 때 package 내부 validator coverage를 확장한다. 생성 파일은 내부용이며 AY-PLE 제품 계약으로 다시 export하지 않는다.

## Raw method 목록

Pinned stable schema와 별도로 생성한 experimental schema의 모든 client request·notification과 server request·notification method는 다음 명령으로 Markdown 목록을 다시 만든다.

```bash
npm run generate:codex-methods -w @ay-ple/runtime-codex
```

| 위치 | 역할 |
| --- | --- |
| [`codex-method-decisions.json`](codex-method-decisions.json) | 검토한 method의 연결 단계, 채택 판단과 비고만 기록하는 sparse overlay |
| [`scripts/render-codex-app-server-methods.ts`](scripts/render-codex-app-server-methods.ts) | Stable·experimental schema와 decision JSON을 합치는 renderer |
| [Codex App Server 전체 raw method 목록](../../docs/architecture/codex-app-server-method-inventory.md) | 미기록 method까지 `schema-only`·`unreviewed`로 표시하는 generated 문서 |

Generated Markdown은 직접 수정하지 않는다. Decision JSON에 없는 method도 raw schema에서 자동으로 나타나며, 존재하지 않는 method를 decision에 적거나 허용하지 않은 값을 사용하면 renderer가 실패한다. 이 목록은 method 존재와 AY-PLE의 현재 판단을 보여주지만 raw protocol을 제품 Interface로 승격하지 않는다.

Package pin은 App Server binary와 생성 protocol 계약을 고정한다. `gpt-5.6-sol` 같은 model까지 고정하지 않으며 thread 생성은 현재 Codex 기본 model 설정을 따른다.

## Bidirectional stdio transport

Package 내부 `CodexStdioTransport`는 Headless Codex Client Host가 사용하는 generated-schema-backed lower transport다. Client request·notification, Server request·notification을 stdio JSONL에서 방향별로 분류하고 `RequestId`의 `string | number` type과 exact value를 보존한다. Outbound Client request와 inbound Server request는 별도 namespace이므로 반대 방향의 같은 numeric ID가 동시에 존재해도 서로 resolve하지 않는다.

Known Server request는 pinned generated JSON Schema로 nested params를 검증하고 method별 generated response schema로 success result를 검증한 뒤에만 wire에 쓴다. Generated response type에 맞는 `respond`와 protocol-level `respondError`는 한 request에 한 번만 쓸 수 있고, invalid success result는 one-shot 상태를 소비하지 않는다. Response write 또는 internal-only `dismiss()`가 끝나면 active Server request identity를 해제하며, 같은 ID의 동시 request는 거부하고 순차 reuse는 허용한다.

Raw numeric ID는 parse 전에 수학적으로 exact safe integer value인지 확인하므로 `1.0`과 `1e3` 같은 유효 표기는 각각 `1`과 `1000`으로 보존하고 precision loss, underflow와 모든 negative-zero 표기는 거부한다. 중복 top-level protocol key는 ambiguous message로 거부한다. Unknown·duplicate·ambiguous response, adopted Client method의 malformed success result와 malformed message는 다른 pending request에 귀속하지 않고 sanitized `protocol_error` observation으로 connection을 닫으며 terminal observation 뒤의 buffered stdout message는 publish하지 않는다. Individual Client request timeout은 connection loss와 구분된 request-scoped error이며, timed-out identity의 known late response는 폐기해 다른 pending request와 connection을 유지한다. Read-only와 mutation timeout을 구분해 Host generation을 유지하거나 fence하는 의미는 lower transport가 아니라 후속 Host가 소유한다.

Client request lifecycle은 `pending | completed | timed_out` registry 하나가 소유한다. Routing tombstone을 evict해 old response를 새 request에 오연결하지 않으며 connection당 기본 65,536개 identity hard cap에 도달하면 새 request를 wire에 쓰기 전에 `request_identity_limit` transport failure로 안전하게 닫는다. Package-internal `start()`는 실제 child `spawn` event를 기다리는 coalesced Promise를 제공하고, concurrent `close()`도 같은 cleanup Promise를 기다린다. Spawn settlement 전에 close가 시작되면 모든 coalesced start caller는 `transport_closed`로 reject되고 늦은 spawn callback은 start 성공을 공개하지 않으며 cleanup Promise는 child 종료까지 기다린다. SIGTERM과 SIGKILL deadline 뒤에도 exit를 관측하지 못하면 성공으로 가장하지 않고 stable `close_timeout`으로 reject한다. Spawn error, child exit, stdout EOF, stdout failure와 stdin write failure는 구분된 `transport_lost` observation이다. 이 observation에는 raw stdio line, child environment, stderr와 debug payload를 넣지 않는다.

Observation stream은 package-internal single-consumer contract다. 두 번째 consumer는 observation을 나눠 갖지 않고 deterministic conflict로 거부되며 기존 consumer와 connection은 유지된다. Consumer가 아직 기다리지 않는 동안의 queue는 기본 1,024개 observation으로 bounded되고, hard cap을 넘으면 queued message를 무한 축적하지 않고 `observation_queue_limit` terminal failure로 connection을 닫는다. Host는 첫 request 전에 유일한 observation pump를 시작하고 terminal observation 뒤 transport cleanup을 완료한다.

Actual-child contract fixture는 별도 JSONL journal로 spawn과 Client outbound protocol·Server response를 확인하며 success, assertion failure와 transport failure에서 child 종료 deadline, force-kill과 temporary directory cleanup을 소유한다. 이 lower transport를 읽는 것만으로 raw method가 제품 Host에 연결된 것은 아니므로 method inventory의 integration 단계는 바꾸지 않는다.

## 제품 runtime layout

`prepareProductRuntimeLayout()`은 Headless Codex Client Host가 사용할 spawn 전 제품 layout seam이다. 호출자는 `packageRoot`, `appDataRoot`, `workspaceRoot`를 모두 absolute·normalized path로 전달해야 하며, API는 symlink를 포함한 실제 대상 기준으로 세 root가 서로 같거나 포함 관계가 아닌지 확인한다.

| 결과 | 현재 동작 |
| --- | --- |
| `packageRoot`·`codexBinPath`·`codexVersion` | 존재하는 `packageRoot` 디렉터리의 `node_modules/.bin/codex`만 사용한다. Codex 실행 파일의 실제 대상이 `packageRoot` 밖으로 빠지는 경우, 누락·실행 불가능 상태와 package pin 불일치를 거부하며 전역 `PATH`를 대체 경로로 사용하지 않는다. |
| `appDataRoot`·`codexHome`·`codexSqliteHome` | `appDataRoot`는 아직 존재하지 않아도 된다. 가장 가까운 existing ancestor와 existing symlink를 canonicalize해 overlap을 먼저 검사하고 exact root를 만든 뒤 actual target containment를 다시 확인한다. Canonical root 아래 `codex/home`과 `codex/sqlite`를 하나의 pair로 준비하며 내부 symlink escape와 두 home의 overlap을 거부하고 한쪽만 바꾸는 product override는 없다. |
| `workspaceRoot`·`cwd` | 호출자가 명시한 기존 디렉터리의 canonical 대상을 그대로 반환한다. `process.cwd()`를 대체값으로 사용하거나 호출별 workspace override를 만들지 않는다. |

모든 layout 실패는 `ProductRuntimeLayoutError`이며 안정적인 `code`와 `recoverable: false`를 제공한다. Root·binary filesystem inspection과 package metadata read/parse 또는 pin 누락도 각각 기존 root/binary code와 `package_pin_unreadable`로 wrapping한다. 같은 구성으로 재시도할 수 없는 root·binary·pin·runtime-home 준비 실패를 이후 Host lifecycle이 자유 형식 message 대신 이 type으로 분류할 수 있다.

이 API는 layout과 runtime-home pair 준비를 소유하고 `HeadlessCodexClientHost`의 첫 `start()`가 이를 호출해 성공 결과를 Host 수명 동안 cache한다. 아래 Runtime Harness resolver와 default/override 동작은 바꾸지 않는다.

제품 경로는 [macOS-first local web app 결정](../../docs/adr/0009-use-a-macos-first-local-web-app-product-path.md)에 따라 package-owned `node_modules/.bin/codex`만 사용하고 Windows launcher branch를 제공하지 않는다. Shared package 자체에는 platform guard를 두지 않으며, platform validation이 필요해지면 실제 제품 local companion entrypoint가 소유한다.

## Headless Codex Client Host lifecycle

`HeadlessCodexClientHost`는 immutable `ProductRuntimeLayoutInput` 한 조합과 App Server child 하나를 소유한다. Caller는 raw process나 generated protocol 대신 `start()`, `stop()`, `getSnapshot()`과 atomic `subscribe()`를 사용한다.

| 계약 | 현재 동작 |
| --- | --- |
| 시작 | `stopped → starting → ready`를 publish한다. Concurrent start는 actual child spawn과 `initialize`/`initialized` handshake 하나로 수렴하고, `ready`는 generated-schema-validated response와 notification write 뒤에만 공개한다. |
| generation | Actual child `spawn` event가 성공하고 lifecycle epoch가 current일 때만 한 번 증가한다. Preflight·async spawn failure와 stop이 이긴 stale start는 generation을 소비하지 않는다. |
| 종료 | `ready/starting/failed → stopping` 뒤 child exit를 확인한 경우에만 `stopped`를 공개한다. Graceful deadline 뒤 force-kill하며 exit를 확인하지 못한 `close_timeout`은 non-recoverable `failed`로 남는다. |
| 실패 | Layout·protocol·observation overflow·cleanup failure는 non-recoverable, spawn·initialize와 일반 transport loss는 recoverable allowlist failure로 표현한다. Raw error, stderr, environment와 root는 snapshot/event에 포함하지 않는다. |
| subscription | 등록과 `{ snapshot, cursor }` capture가 동기적으로 원자적이며 event마다 monotonic sequence와 ISO timestamp를 제공한다. Subscriber별 기본 1,024-event buffer를 넘으면 해당 stream만 `subscription_overflow`로 종료한다. Connection failure는 stream을 닫지 않고 successful Host stop이 마지막 `stopped` event 뒤 닫는다. |

Child `cwd`는 validated `workspaceRoot`이고 `CODEX_HOME`·`CODEX_SQLITE_HOME`은 validated product pair다. Inherited child environment는 실행에 필요한 path, home, shell, temporary-directory와 locale key allowlist만 전달하며 caller override와 credential-like environment를 받지 않는다.

현재 기존 Host는 lifecycle과 `initialize`/`initialized` 연결만 구현한다. 명시적 `restart`, thread·turn, 정규화된 activity, pending interaction, native Skills discovery와 browser adapter는 이 Interface의 후속 목표가 아니다. 새 runtime method는 ADR 0010과 후속 spec이 정한 source 기반 tracer로만 채택하며, terminal이 아닌 protocol observation은 현재 제품 상태나 Runtime Diagnostic History에 공개·저장하지 않는다.

## 현재 Harness 범위

현재 Adapter는 단일 실행 Runtime Harness 통합이며 AY-PLE 제품 전체의 상호작용 호스트가 아니다.

- 기본 binary는 이 package에서 시작해 가장 가까운 조상 `node_modules/.bin/codex`를 찾는다. `CODEX_BIN_PATH` override의 version 일치는 status에서 관측하고 live parity gate에서 검증한다.
- 각 실행은 새 `app-server` process와 fresh persistent `thread`·`turn`을 시작한다.
- 실행 종료 시 `CodexRawClient.close()`는 process를 닫지만 `thread/archive`, `thread/delete` 또는 `thread/unsubscribe`를 보내지 않는다. 생성된 thread와 rollout은 Codex state에 남을 수 있다.
- `thread/start`에는 `cwd`를 보내고, 반환된 필수 `threadId`와 text input으로 `turn/start`를 호출한다. `CodexRawClient`의 기본 `cwd`는 `process.cwd()`이며 server는 `CODEX_RUNTIME_CWD`로 바꿀 수 있다.
- 공개 raw wrapper의 `CodexRawTurnInput`은 현재 text만 지원한다. 생성 protocol에 존재하는 `skill`, `mention`, `outputSchema`는 아직 wrapper와 제품 composer에 연결되지 않았다.
- 정규화한 Adapter 출력은 세부 작업 활동이 아니라 text와 실행 종료 lifecycle을 다룬다.
- `turn/steer`는 raw 호출만 가능하며 제품의 target·conflict 정책은 아직 없다.
- 기존 Harness의 `CodexRawClient`는 App Server가 시작한 `request`를 아직 전달하거나 typed `response`로 응답하지 않는다. 별도 `CodexStdioTransport`는 Headless Host lifecycle에 연결됐지만 product-safe pending interaction mapping은 아직 없다.
- repository-root `.ay-ple/runtime-codex/*` 기본 경로는 developer-only Harness용이다. `CODEX_HOME`과 `CODEX_SQLITE_HOME`은 현재 각각 독립 override되며 product runtime-home pair validation은 없다.
- Runtime-home 초기화는 `CODEX_HOME`과 `CODEX_SQLITE_HOME` directory를 만든다. File auth config는 기본 repository-local Harness pair 또는 `ensureFileAuthConfig: true`를 명시한 경우에만 보장하며, built-in Memories는 켜지 않는다.

현재 package는 ModelingInvocation을 Skill·text·mention·`outputSchema`로 번역하거나 ModelingRun을 생성하지 않는다. 현재 구현 gap은 [Runtime Harness 구현 지도](../../docs/architecture/runtime-harness-implementation-map.md), 채택한 mapping과 product runtime layout은 각각 [Codex-native 제품 작업 조합](../../docs/architecture/codex-native-product-composition.md)과 [Codex Runtime 격리](../../docs/architecture/codex-runtime-isolation.md)를 따른다.

## Raw initialize smoke

App Server initialize smoke는 명시적으로 실행한다.

```bash
npm run smoke:codex -w @ay-ple/runtime-codex
```

Override가 없으면 developer-only runtime home은 repository-root 경로를 사용한다.

| 경로 | 역할 |
| --- | --- |
| `.ay-ple/runtime-codex/codex-home` | file auth config를 포함하는 Harness-managed `CODEX_HOME` |
| `.ay-ple/runtime-codex/sqlite` | Harness-managed `CODEX_SQLITE_HOME` |

지원하는 환경 변수:

| 변수 | 역할 |
| --- | --- |
| `CODEX_BIN_PATH` | package-owned binary 대신 지정한 Codex binary 사용 |
| `CODEX_HOME` | 지정한 Codex home override 사용 |
| `CODEX_SQLITE_HOME` | 지정한 SQLite home override 사용 |
| `CODEX_SMOKE_CWD` | App Server child process의 working directory |
| `CODEX_SMOKE_TIMEOUT_MS` | initialize timeout milliseconds |

Smoke 명령은 `initialize`를 보내 matching response를 기다린 뒤 generated-contract `initialized` notification을 보낸다. `codex login`이나 OAuth를 시작하지 않는다. 인증이 없거나 Codex가 로그인을 요구하면 중단하고 인증을 명시적으로 처리한 뒤 다시 실행한다.

## Live HTTP/SSE parity

Runtime Inspector와 같은 server API를 통과하는 opt-in prompt/cancellation gate는 다음 명령으로 실행한다.

```bash
npm run verify:codex-parity -w @ay-ple/server
```

이 명령은 ephemeral loopback port에서 Express server를 시작하고, 실행 binary가 package pin과 같은지 확인한 뒤 HTTP/SSE를 통한 prompt 완료와 adapter-confirmed cancellation을 검증한다. 위 runtime-home·binary 환경 변수와 `CODEX_RUNTIME_CWD`를 사용하며, 전체 60초 timeout은 `CODEX_PARITY_TIMEOUT_MS`의 positive integer로 바꿀 수 있다. Login이나 OAuth를 시작하지 않고 raw debug log 내용도 출력하지 않는다.

Local ownership spike auth를 재사용할 때는 credential 내용을 읽거나 복사하지 않고 spike-owned runtime directory를 지정한다.

```bash
CODEX_HOME="$PWD/spikes/codex-runtime-ownership/runtime/codex-home" \
CODEX_SQLITE_HOME="$PWD/spikes/codex-runtime-ownership/runtime/sqlite" \
npm run smoke:codex -w @ay-ple/runtime-codex
```
