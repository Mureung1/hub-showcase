# @ay-ple/codex-chat-runtime

Official OpenAI Codex Python SDK를 재사용하는 Codex-native Chat Shell runtime package다. Exact SDK source·generated contract·provenance, response-last correction·bounded notification routing·initialize notification opt-out·strict correlated response classification·Plan user-input seam의 ordered patch stack, macOS arm64용 standalone production bundle과 persistent Python bridge에 더해 hardened Node supervisor와 additive `CodexProductCapableRuntime`을 구현한다. Node runtime은 verified bundle만 시작하고 native thread·turn·item identity, FIFO event stream, interrupt, live-handle release와 bounded process-tree lifecycle을 private bridge 위에 보존한다.

Node supervisor는 explicit environment root, item·UTF-8 byte bound, operation·stream·cleanup deadline, safe error projection과 macOS process-group `SIGTERM -> SIGKILL` escalation을 적용한다. Malformed·oversized·duplicate frame, pending EOF, stalled stdin/consumer와 cleanup failure는 pending operation과 active stream을 한 번만 terminal settlement하고 process group disappearance까지 bounded하게 확인한다. `apps/server`는 Chat-only `/api/codex-chat/*` composition에서 이 package의 public factory·contract·testing seam을 소비하고, `apps/chat-shell` production source는 browser-safe `./contract` subpath만 소비한다. Maintained runtime graph의 채택 경계는 [ADR 0011](../../docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)과 [ADR 0012](../../docs/adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md), 현재 횡단 topology는 [Codex Chat 구현 지도](../../docs/architecture/codex-chat-implementation-map.md), 첫 수직 흐름의 구현 기록은 [Chat Shell spec](../../docs/specs/2026-07-16-codex-native-chat-shell.md)이 소유한다.

## 고정 기준

| 항목 | 값 |
| --- | --- |
| Official source | `references/openai-codex` |
| Source commit | `8c68d4c87dc54d38861f5114e920c3de2efa5876` |
| Source tag | `rust-v0.144.4` |
| Native runtime contract | `openai-codex-cli-bin==0.144.4` |
| SDK distribution version | upstream `0.0.0.dev0` 유지 |
| Generation Python | 사전 설치된 exact CPython `3.10.12`; implicit download 금지 |
| Bundled Python | standalone CPython `3.10.18`, build `20250818`, macOS arm64 |
| Reproduction tool | `uv 0.8.13` |
| Generated toolchain | `pydantic==2.13.4`, `datamodel-code-generator==0.31.2`, `ruff==0.15.8` |
| Official suite | locked `pytest==9.0.3`, `ruff==0.15.12`와 dependency set |
| Build backend | `uv_build==0.11.19` |

`0.144.4`는 generated App Server contract와 native runtime pin이다. 이를 Python SDK distribution version으로 다시 표기하지 않는다. `references/openai-codex`는 source oracle이며 production runtime dependency가 아니다.

## Package 경계

| 경로 | 역할과 상태 |
| --- | --- |
| `src/index.ts` | Node-only `CodexChatRuntime`·`CodexProductCapableRuntime`, production factory, path-free verified bundle evidence와 stable lifecycle error export boundary |
| `src/contract.ts` | Native ID, allowlisted event, operation/result, closed Chat status와 acceptance-first stream frame의 browser-safe boundary 및 status/thread/frame exact decoder. Public runtime의 `terminal` error type은 type-only로 참조해 browser runtime import를 추가하지 않는다. |
| `src/runtime-contract.ts` | Node product caller가 쓰는 structured Skill·Text·Plan input, Account Readiness와 opaque user-input answer/cancel operation boundary. Managed absolute Skill path는 이 Node-only boundary에만 있고 browser-safe event에는 포함되지 않는다. |
| `src/testing.ts` | Product-capable interface, pending interaction과 sticky terminal 계약을 구현하는 deterministic fake와 opt-in Server actual-child process-tree fixture boundary |
| `src/runtime.ts` | Controlled-environment Python worker spawn, bounded serialized stdin, sole stdout ingress, exact private correlation, bounded turn stream·deadline과 full process-group cleanup을 소유하는 package-private supervisor |
| `src/production-bundle.ts` | Spawn 전에 canonical manifest와 complete bundle tree를 검증하고 absolute executable·entrypoint만 반환하는 package-private verifier |
| `python/bridge/` | public `AsyncCodex`를 소유하고 private NDJSON command를 처리하는 package-private persistent worker source |
| `python/openai-codex/` | exact commit에서 materialize하고 `0.144.4`로 regenerate한 immutable unpatched SDK snapshot |
| `scripts/official_local_provider.py` | Tracked official SDK test harness의 local Responses server를 재사용하고 same-home native policy state를 읽는 test-only controller |
| `manifests/unpatched.json` | behavioral patch 전 canonical source/generated/lock/wheel provenance |
| `manifests/patched-source.json` | unpatched manifest와 ordered patch에서 파생한 source-only roster·digest; production wheel manifest가 아님 |
| `manifests/production-runtime-darwin-arm64.json` | Patched SDK wheel, complete dependency/runtime wheel roster, standalone CPython과 installed bundle roster를 고정한 canonical production manifest |
| `upstream/UPSTREAM.md` | source, pin, adaptation과 재현 근거 |
| `upstream/PATCHES.md` | exact base, changed source와 regression oracle을 기록한 ordered behavioral patch ledger |
| `upstream/patches/` | immutable unpatched snapshot에서 시작해 직전 patch postimage에 순서대로 적용되는 reviewed unified diff series |
| `upstream/LICENSE`, `upstream/NOTICE` | materializer가 exact source root에서 보존하고 verifier가 digest를 확인하는 Apache-2.0 파일 |
| `.artifacts/exact-sdk/` | ignored wheel, frozen install, build output와 cache |
| `.artifacts/production-runtime-cache/` | reviewed external artifact의 package-local ignored download cache |
| `.artifacts/production-runtime-darwin-arm64/` | verified standalone Python, wheelhouse, offline-installed SDK/runtime과 digest-pinned `bundle/bridge/worker.py` |

Tracked unpatched snapshot, 세 manifest와 patch series는 review 대상이다. Behavioral patch는 test·verification temporary copy에만 적용한다. Wheel, installed environment, CPython/native binary와 cache는 git에 넣지 않는다. `.artifacts/exact-sdk/wheels`의 SDK wheel은 unpatched reproduction evidence이고 production bundle의 SDK wheel은 `0001 → 0002 → 0003 → 0004 → 0005 → 0006`을 적용한 뒤 source epoch에서 두 번 build한 별도 artifact다. 0004는 Rust first-party client와 같은 initialize notification opt-out config를 Python public config에 추가하고, 0005는 malformed correlated response를 waiter release 전에 검증한다. 0006은 typed Plan `collaborationMode`와 deferred `request_user_input`을 public async high-level API에 추가하되 raw request ID와 generic server-request surface는 숨긴다. Request-local answer/cancel은 response write 뒤 matching native `serverRequest/resolved`까지 기다린다. Patch는 내부 처리한 모든 server request ID를 bounded acknowledgement tracker에 보존하고 approval과 user-input cleanup 뒤 acknowledgement까지 내부에서 소비하므로 global notification route에 중복 적재하지 않는다. Native cleanup이 먼저면 `interaction_not_pending`으로 끝난다. Bridge는 well-formed `JsonRpcError`만 known `sdk_request_failed`로 분류하며, malformed response와 result schema validation failure는 process-fatal `sdk_operation_failed`로 수렴한다.

## Standalone production bundle

첫 production target은 `darwin-arm64` 하나뿐이다. Materializer는 Astral `python-build-standalone`의 `cpython-3.10.18+20250818-aarch64-apple-darwin-install_only_stripped.tar.gz`, exact lock이 고른 6개 runtime/dependency wheel, `pyproject.toml`이 요구하는 reviewed `uv_build==0.11.19` wheel과 locally built patched SDK wheel을 SHA-256과 byte size로 검증한다. Network access는 materialization이 이 hash-pinned input을 package-local cache에 받는 download phase에서만 허용한다. Patched SDK wheel 두 build는 reviewed build-backend wheelhouse만 사용하는 `--no-index --offline` 환경에서 수행한다. 그 뒤 두 clean tree에서 bundled Python의 `pip --no-index --no-deps --no-compile`로 같은 7개 production wheel을 설치하고 manifest, installed distribution과 file-roster digest가 동일한지 확인한다.

Canonical manifest는 다음을 서로 연결한다.

- exact source commit, immutable unpatched manifest와 complete ordered patch stack
- reviewed macOS arm64 `uv_build==0.11.19` build-backend wheel과 offline wheel build
- patched SDK wheel `d5d5ed3b9824932ea5ad4e3aed099d1fe2264b5ee8e96560e2264bbc348db325`
- standalone CPython `3.10.18` build `20250818`와 exact archive digest
- `openai-codex-cli-bin==0.144.4` 및 Pydantic dependency closure의 complete wheel roster
- installed `_message_router.py`와 final patched-source digest
- tracked `python/bridge` 5-file roster와 installed `bundle/bridge` roster·entrypoint
- bundle-local import path, native executable, `codex-cli 0.144.4`와 complete tree-roster digest

`verify:production-runtime`은 download, build, submodule access 또는 artifact repair를 하지 않는다. Canonical manifest와 이미 materialize된 ignored tree가 없거나 한 파일이라도 missing, extra, renamed, truncated 또는 digest-mismatched 상태면 fail closed한다. Production factory도 absolute artifact root를 요구하고, tracked canonical manifest와 local manifest의 byte equality, exact source·runtime·Python·ordered patch identity, complete bundle tree roster와 symlink containment을 검증한 뒤 그 tree의 absolute Python·bridge·site-packages·native executable만 사용한다. System Python, ambient `PATH` 또는 source submodule로 fallback하지 않는다. Worker actual-child gate는 verified bundled Python, `-B`, site-packages와 entrypoint만 사용해 tree에 bytecode를 쓰지 않는다. Windows, Linux와 macOS x86_64는 지원하지 않는다.

## Persistent Python bridge

Ordered SDK surface는 `Thread.run/turn(..., collaboration_mode=...)`, `AsyncCodex.next_user_input()`과 request-local `answer()`·`cancel()`을 제공한다. Sole reader는 pending answer 동안 ingress를 계속 drain하며 global 32개·Turn당 1개 bound, 단일 bounded writer를 통한 overflow·동일 Turn 충돌의 affected-Turn interrupt, waiter 없는 fire-and-forget control과 direct settlement reserve를 소유한다. Async waiter는 하나의 in-flight collector reservation을 공유하므로 cancellation 뒤에도 exact request를 보존하고 반복 cancellation이 shared executor worker를 누적하지 않는다. Reserved token의 sync claim이 terminal settlement와 같은 condition lock에서 경쟁하므로 terminal이 먼저 정산한 collector result는 public request로 전달되지 않는다. Explicit interrupt admission과 answer/cancel은 첫 wire write까지 one-settlement로 경쟁한다. Duplicate·late conflict, resolved·terminal·close·transport cleanup과 internal control/response write half-close도 current/future waiter를 fail closed한다. Private Python bridge와 Node runtime은 이 seam을 opaque `interactionId`와 typed product activity로 projection한다. Server HTTP와 Browser의 product Review binding은 후속 제품 계층이다.

Worker는 official public `AsyncCodex`, `AsyncThread`, `AsyncTurnHandle`만 conversation baseline으로 사용한다. Process-local live handle을 native `threadId`·`turnId`로 보관할 뿐 native thread를 archive/delete하거나 AY-PLE ID로 remap하지 않는다. Existing `thread/start`·`turn/start` tracer는 `ApprovalMode.deny_all + Sandbox.read_only`를 유지한다. Additive product Turn만 exact `SkillInput` 하나와 bounded `TextInput` 하나, Plan `collaborationMode`, `ApprovalMode.auto_review + Sandbox.workspace_write`를 explicit하게 전달한다. Codex permission은 AY-PLE Review·`UserConfirmation`과 별도 상태다.

입력 command는 compact JSON 한 line이며 extra field를 허용하지 않는다.

| `command` | Required fields | 결과 |
| --- | --- | --- |
| `read_account` | `bridgeRequestId` | native work를 시작하지 않는 `ready | not_ready(authentication_required)` result |
| `start_thread` | `bridgeRequestId` | response-native `{ threadId }` result |
| `start_turn` | `bridgeRequestId`, `threadId`, `text` | `{ threadId, turnId }` acceptance 뒤 같은 bridge request에 FIFO event |
| `start_product_turn` | `bridgeRequestId`, `threadId`, bounded Skill·Text·Plan fields | `{ threadId, turnId }` acceptance 뒤 curated product activity |
| `answer_user_input` | `bridgeRequestId`, `interactionId`, bounded answers | pending interaction을 한 번 answer |
| `cancel_user_input` | `bridgeRequestId`, `interactionId` | pending interaction을 explicit empty-answer로 한 번 cancel |
| `interrupt` | `bridgeRequestId`, `threadId`, `turnId` | native interrupt RPC acknowledgement; stream terminal은 별도 authoritative event |
| `release_thread` | `bridgeRequestId`, `threadId` | idle local handle만 제거 |
| `close` | `bridgeRequestId` | accepted work와 SDK close를 정산한 뒤 마지막 `close_ack` |

SDK initialize가 끝나면 worker가 첫 private `ready` frame을 한 번 보낸다. 그 뒤 출력은 `result`, `event`, correlated `error`, uncorrelated process-wide `fatal`, `close_ack` 중 하나다. `bridgeRequestId`는 이 private transport correlation에만 존재하며 projected event 내부나 browser contract로 이동하지 않는다.

| Event | 공개 field |
| --- | --- |
| `agent_message.delta` | `threadId`, `turnId`, `itemId`, `delta` |
| `agent_message.completed` | `threadId`, `turnId`, `itemId`, final `text` |
| `turn.error` | `threadId`, `turnId`, `willRetry`, typed safe `code`, fixed `displayMessage` |
| `turn.completed` | `threadId`, `turnId`, native `status`, failed일 때 safe `failure` |
| Product activity | requested Skill name, Plan delta/completed, allowlisted `propose_state_patch` MCP lifecycle, opaque user-input requested/resolved와 interrupt acknowledgement |

Raw JSON-RPC envelope, generated Pydantic payload, `RequestId`, raw MCP arguments/result/server, source path, secret, error detail과 다른 notification/item은 stdout에 쓰지 않는다. `turn.error`는 nonterminal이고 첫 matching `turn.completed`만 semantic terminal이다. Turn acceptance를 stdout queue에 먼저 넣은 뒤 stream consumer를 시작하므로 response-last staged event와 request-before-acceptance interaction도 public acceptance 뒤에 나온다. Exact generated notification roster는 request-local acknowledgement를 포함한 adopted 일곱 method와 sorted 61-method initialize opt-out complement로 나뉜다. SDK patch는 내부 처리한 approval·user-input acknowledgement를 global route 전에 소비하고 정상 `thread/started`·`thread/status/changed`는 native opt-out하므로 persistent bridge의 undrained global route에 누적하지 않는다. Cross-thread total order는 정의하지 않는다.

`user_input.resolved`는 local response write를 success로 바꾼 synthetic acknowledgement가 아니다. Worker는 exact native `serverRequest/resolved`가 SDK의 opaque request-local barrier를 해제한 뒤 한 번만 projection하며, 같은 Turn의 continued Agent activity와 terminal consumer는 이 projection barrier를 통과한 뒤 진행한다. Native terminal·interrupt·close·transport loss가 먼저 이기면 pending operation을 stable error로 정산하고 resolved event를 만들지 않는다.

Private input/output frame은 newline을 포함해 최대 1 MiB다. Stdout은 sole writer와 4,096-frame/16 MiB non-blocking queue를 쓰고 terminal 전용 lane을 둔다. Live thread/active turn default cap은 32/32다. Idle handle만 exact LRU로 local release하며 active handle은 evict하지 않는다. Active request lease는 최대 64개이며 application command는 8개 control reserve를 남긴다. `close`는 capacity만 우회하고 active duplicate ID는 여전히 fatal이다. One-shot ID는 result/error enqueue, turn ID는 semantic terminal enqueue까지 active하며 그 뒤 재사용할 수 있다. Caller는 terminal frame을 관찰하기 전에 ID를 재사용하지 않는다. Normal close는 이미 admitted된 operation을 result/error로 정산한 뒤 SDK를 닫고 마지막 `close_ack`를 보낸다.

Identity/resource/admission conflict와 request-phase SDK rejection은 correlated error다. Malformed/unknown/oversized input, 동시에 active인 duplicate bridge ID, SDK transport/router/accepted-stream terminal, event serialization과 stdout queue overflow는 once-only fatal이다. Acceptance 후 SDK stream terminal은 이미 enqueue된 acceptance/event를 지우지 않고 fatal을 마지막으로 추가하며, stdout queue 자체의 overflow만 bounded settlement를 위해 pending frame을 버리고 reserved fatal로 대체한다. Stdout pipe 자체가 실패하면 fatal frame을 보낼 수 없으므로 worker는 unconditional SDK cleanup 뒤 nonzero exit하며 Node가 EOF/exit로 판정한다. Python은 모든 exit path에서 `AsyncCodex.close()`를 시도한다.

## Node runtime supervisor

`verifyCodexChatRuntimeBundle(runtimeRoot)`는 full canonical manifest·tree verification을 수행하고 path 없이 `{ sourceCommit, runtimeVersion }`만 반환한다. Server status preflight가 이 evidence를 사용하며 실제 spawn의 `createCodexChatRuntime()`은 TOCTOU 변경을 막기 위해 bundle을 다시 검증한다.

`createCodexChatRuntime({ runtimeRoot, workspace, environment })`는 verified full bundle 외의 실행 경로를 갖지 않는다. `environment`는 `home`, `codexHome`, `codexSqliteHome`, `tempDirectory` 네 absolute·writable·서로 다른 directory를 명시한다. Workspace와 각 final path의 symlink를 거부하고 canonical path로 고정한 뒤 bundled Python worker를 시작하며, private `ready`로 SDK initialize 완료를 확인해야 public runtime을 반환한다. 기존 `CodexChatRuntime` 다섯 operation은 그대로 유지된다. 반환하는 additive `CodexProductCapableRuntime`은 `readAccountReadiness`, `startProductTurn`, `answerUserInput`, `cancelUserInput`을 더 제공하며 native identity를 다시 만들거나 browser/product state를 소유하지 않는다. `terminal`은 첫 process-wide failure에서 한 번 resolve하고 reject하지 않으며 late subscriber도 같은 error를 받는다. 정상 `close()`만으로는 settle하지 않는다.

Child environment는 inherited `process.env`를 복사하지 않는다. Controlled `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME`·`TMPDIR`, UTF-8/Python isolation variable과 bundle의 `codex-path`, bundled Python directory, 필수 OS directory만 포함한 fixed `PATH`를 새로 만든다. Ambient credential, provider/base URL, `PYTHONPATH`와 dynamic-loader variable은 전달하지 않으며 Python bridge가 이 sanitized copy를 `CodexConfig.env`에 명시한다.

Node는 stdout의 유일한 byte framer다. 1 MiB inclusive NDJSON line을 chunk 경계와 UTF-8 byte 경계에서 조립하고, known output frame을 exact field set으로 decode한다. Stdin command는 bounded serialized writer를 거치며 pending operation과 turn stream은 private `bridgeRequestId`로 exact correlation한다. `startTurn` acceptance 뒤에는 같은 route의 allowlisted event를 official SDK FIFO 순서로 전달하고 첫 `turn.completed`에서 stream을 닫는다. Iterator consumer가 일찍 멈춘다고 native turn을 interrupt하지 않는다. Child가 제공하는 turn error code는 exact generated `CodexErrorInfo` 기반 allowlist와 fixed display message만 통과하며 path, credential, stderr와 traceback은 public error로 이동하지 않는다.

Response 전에 dispatch된 mutation에서 process를 잃으면 `CodexChatRuntimeError.unknownOutcome`이 `true`다. Acceptance 뒤 process loss는 active stream마다 `runtime.failed` 하나를 보내며 synthetic `turn.completed`를 만들거나 mutation을 retry하지 않는다. 정상 `close()`는 한 promise로 수렴하고 exact `close_ack`, child exit, stdout/stderr pipe end와 process-group disappearance를 모두 요구한다. Valid bridge `fatal`에는 Python의 `AsyncCodex.close()`를 위한 bounded self-shutdown window를 주고, dead·stalled·invalid child는 group `SIGTERM -> SIGKILL`로 올린다. Cleanup 자체가 실패해도 pending operation, stream과 runtime terminal을 남기지 않는다. `./testing`의 `DeterministicCodexProductRuntime`은 product-capable 이름이고 기존 `DeterministicCodexChatRuntime` export와 같은 호환 class를 가리킨다. Caller가 준 native thread/turn ID와 event script를 그대로 쓰되 `user_input.resolved` 이후 continuation은 실제 answer/cancel settlement 전까지 진행하지 않고 operation call log를 보존하므로, 후속 Server test가 production process 없이 같은 interface를 주입할 수 있다. 같은 subpath의 opt-in process-tree fixture는 materialized bundle과 provider-free fake native child를 사용해 Server가 실제 Python/native group 종료를 관찰해야 하는 cross-package gate에만 사용한다.

Package-private default는 operation queue당 4,096 frame/16 MiB, Node aggregate 8,192 frame/32 MiB, bounded stderr 4,096 chunk/16 MiB다. Spawn+initialize와 operation response는 30초, stream idle은 15분, total은 60분, graceful close·terminate·post-kill은 각각 2초이며 test에서만 작은 값을 주입한다. Bound나 deadline 초과, malformed·invalid UTF-8·oversized·duplicate correlation과 pending EOF는 one process-wide terminal로 수렴한다. Queue accounting은 consume, iterator return, terminal clear와 writer callback에서 반환되고 `runtime.failed`는 reserved terminal lane으로 전달된다.

## 명령

모든 명령은 repository root 또는 이 package directory에서 npm workspace command로 실행한다.

| 명령 | 동작과 mutation 경계 |
| --- | --- |
| `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime` | Clean exact source와 wheel을 재생성한다. 기존 unpatched manifest와 다르면 재작성하지 않고 실패하며, 같으면 unpatched snapshot과 patched-source derivation manifest를 갱신한다. 의도적인 mutation command다. |
| `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime` | 두 clean unpatched build, deterministic patch derivation, 두 manifest, patch digest, SDK wheel과 provenance를 non-mutating하게 확인한다. |
| `npm run test:router -w @ay-ple/codex-chat-runtime` | Response-last RED/GREEN actual-child, default 4,096-item A boundary 중 unrelated B completion과 4,097번째 overflow, 14개 injected item·byte·route-count matrix에 더해 public Plan request의 delayed native resolve, answer·cancel·liveness·32개 bound·cleanup, cancelled waiter 재전달·executor completion barrier를 둔 terminal-settled stale request 비전달과 64회 연속 cancellation 뒤 executor·public close liveness, in-flight terminal·interrupt·close·transport settlement와 half-close fail-closed actual-child를 검증한다. Response·turn·login·global waiter settlement, child/process-group reap 및 patch-owned router unit suite도 함께 검증한다. |
| `npm run test:exact-sdk -w @ay-ple/codex-chat-runtime` | Temporary copy에 ordered patch를 적용한 뒤 aligned official Python unit suite와 Ruff check/format gate를 실행한다. Real provider test는 실행하지 않는다. |
| `npm run test:provenance -w @ay-ple/codex-chat-runtime` | Dirty/untracked source, provenance drift, patch preimage와 patched-source manifest derivation을 검사한다. |
| `npm run test:production-runtime -w @ay-ple/codex-chat-runtime` | Artifact roster, ordered patch, safe archive와 verify-only fail-closed semantics를 작은 synthetic fixture로 검사한다. Download나 bundle 존재를 요구하지 않는다. |
| `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime` | Bundle 없이 strict command decode, inclusive 1 MiB framing, canonical encoding, reserved fatal lane과 active request lease/control reserve를 검사한다. |
| `npm run test:bridge -w @ay-ple/codex-chat-runtime` | Verified bundle worker가 official patched SDK와 purpose-built App Server child를 통과해 response-last streaming, exact notification opt-out, text tracer policy, product Account·structured input·Plan interaction, interrupt, local release/LRU, admission/caps, stream·stdout failure, fatal과 close를 검증한다. 먼저 production runtime을 materialize해야 한다. |
| `npm run test:node-unit -w @ay-ple/codex-chat-runtime` | Bundle 없이 full-manifest verifier fixture, private output byte-framing·strict decode, per-route/aggregate queue와 writer accounting, bounded stderr, browser-safe status/thread/stream parser와 deterministic fake lifecycle을 검사한다. |
| `npm run test:node-actual -w @ay-ple/codex-chat-runtime` | Verified bundle의 bundled Python worker와 purpose-built child를 Node supervisor로 시작해 nominal·response-last T0, Account Readiness, exact product permission·Plan/MCP·user-input answer/cancel, native resolved 전 pending과 resolved→continuation→terminal 순서, duplicate·interrupt·in-flight close settlement, controlled environment, queue/deadline/failure와 full process-group cleanup을 검사한다. Ambient provider/auth를 사용하지 않는다. |
| `npm run test:local-provider -w @ay-ple/codex-chat-runtime` | Official `MockResponsesServer`와 exact native `0.144.4`를 production Node→bundled Python bridge로 연결한다. Native T0, AgentMessage item identity/FIFO, authoritative terminal, interrupt, same-thread follow-up, process-group reap과 같은 home의 authoritative `never + readOnly` state를 provider/auth 없이 검증한다. |
| `npm run check:bridge -w @ay-ple/codex-chat-runtime` | Bridge, App Server/Node process fake, official local-provider controller, bridge test와 touched production materializer를 locked Ruff `0.15.12`로 check/format 검증한다. |
| `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` | Verify, response-last·bounded router gate, patched official suite와 provenance test를 순서대로 실행한다. |
| `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime` | Network-capable command. Patched wheel 두 build, reviewed download와 두 clean offline install을 수행하고 canonical manifest와 일치할 때만 ignored bundle을 publish한다. Tracked bridge 변경을 의도적으로 채택할 때만 `-- --write-manifest`를 붙여 canonical manifest와 ignored bundle을 함께 갱신한다. |
| `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Existing ignored bundle을 canonical manifest에 대해 non-mutating하게 검증하고 bundled Python/import/native version을 probe한다. Network와 build를 사용하지 않는다. |
| `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime` | Synthetic unit, bundle verification, bundled bridge actual-child, post-run non-mutation verification과 Ruff gate를 순서대로 실행한다. 먼저 materialize된 macOS arm64 artifact가 필요하다. |
| `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime` | Bundle을 검증한 뒤 hardened Node-supervised actual-child matrix와 exact local-provider conformance를 실행하고 post-run bundle non-mutation을 다시 검증한다. 먼저 materialize된 macOS arm64 artifact가 필요하다. |
| `npm run typecheck -w @ay-ple/codex-chat-runtime` | Public contract, production factory, package-private supervisor·decoder·bundle verifier와 deterministic fake의 TypeScript 계약을 검사한다. Network나 Python artifact를 사용하지 않는다. |
| `npm run build -w @ay-ple/codex-chat-runtime` | 같은 TypeScript runtime boundary를 `dist/`로 compile한다. Download나 SDK generation을 실행하지 않는다. |

Exact commands는 `uv 0.8.13`과 사전 설치된 CPython `3.10.12`를 요구한다. `--no-python-downloads`로 interpreter fallback을 금지하고, script가 tool/source pin과 occurrence guard를 검증한다. Inner generation은 controlled `HOME`, Codex homes, temporary/cache roots와 PyPI default index만 사용하며 caller의 `UV_*`, `PIP_*`, Python path와 `.env` 설정을 계승하지 않는다. Manifest는 CPython build identity와 normalized system/machine도 기록한다. Shared tracked snapshot을 교체하는 `generate` 명령은 다른 exact command와 병렬로 실행하지 않는다. `verify`, `test:router`와 `test:exact-sdk`는 command-local environment와 source copy를 사용한다.

일반 `build`와 `typecheck`는 offline이며 `uv`, source submodule, system Python 또는 network를 호출하지 않는다. 이 package의 일반 `test`는 provenance, synthetic production verifier, Python bridge protocol unit과 Node unit test만 실행하며 ignored bundle이나 network를 요구하지 않는다. Exact generation·wheel reproduction은 `validate:exact-sdk`, binary download·offline install은 `materialize:production-runtime`, bundled worker actual-child는 `validate:production-runtime`과 `validate:node-runtime`에서만 명시적으로 실행한다.

## License와 live gate

Materializer는 exact source root의 Apache-2.0 `LICENSE`와 `NOTICE`를 `upstream/`과 production bundle의 `bundle/licenses/openai-codex/`에 보존한다. 이 파일은 AY-PLE 자체 licensing과 합치지 않으며 source SHA와 digest를 [UPSTREAM.md](upstream/UPSTREAM.md)에 기록한다. Standalone CPython archive가 제공하는 PSF와 bundled dependency license tree도 pruning하지 않는다. Native runtime wheel 안의 `rg`, `zsh` 등 third-party payload에 대한 최종 배포 notice audit, signing/notarization과 platform 확장은 후속 packaging work다.

Provider-free gate는 세 층으로 구분한다. Response-last, bounded-router, bridge와 Node adversarial gate는 `CodexConfig.launch_args_override`로 시작한 purpose-built OS child를 사용한다. Bridge fake journal은 initialize/initialized, explicit `never + readOnly`, native identity, acceptance-first replay, interrupt와 no archive/delete를 확인한다. Exact local-provider gate는 tracked official `MockResponsesServer`·SSE helper와 verified native `0.144.4`를 production Node→bundled Python→official SDK 경로로 연결하고, managed config를 test-only opt-in으로 차단한 격리 home에서 T0, interrupt, same-thread follow-up과 full process-group reap을 확인한다. 종료 뒤 같은 native thread를 exact `thread/resume`으로 읽어 persisted `approvalPolicy: never`와 `sandbox: { type: readOnly, networkAccess: false }`도 검증한다. Synthetic schema-valid approval에 대한 low-level default `accept`는 current pin의 관찰 사실이지만, 그 자체로 AY-PLE 제품 확인 실패나 반드시 추가할 fail-closed layer를 뜻하지 않는다.

Ticket 011 완료 시점의 기록은 `fake: green`, `exact local-provider: green`, `disposable live provider: blocked`였다. 이후 cutover 전에 사용자가 명시적으로 승인한 repository-local 격리 인증 상태와 새로 격리한 workspace·`HOME`·SQLite·temp를 사용한 manual live T0가 Server→Node→bundled Python→official SDK→exact native `0.144.4`→provider 경로에서 green이었다. Native AgentMessage delta가 하나의 completed item과 authoritative completed terminal로 수렴했고, 정상 Server shutdown 뒤 Node·Python·App Server PID와 listening port가 모두 사라졌다. 이 point-in-time 증거는 실제 provider path를 확인했지만 현재 setup 지침이나 전용 disposable auth 자동화 gate를 대체하지 않는다. Local legacy residue의 current-clone outcome은 [completed Ticket 004](../../docs/tickets/2026-07-17-codex-chat-only-cutover/004-delete-legacy-residue-and-handoff.md)가 소유한다. 이 package의 runtime·build·test·materialize command는 legacy data를 탐색·이관·삭제하지 않으며 다른 clone·external data의 cleanup도 소유하지 않는다. Response-last와 default 4,096-item A/B 흐름은 official public async thread·turn·login API를 통과한다. Injected-limit matrix는 package-private budget을 검증하기 위해 SDK startup 전 router 교체, active route registration, usage snapshot과 public global notification API가 없는 read seam을 test oracle로만 사용한다. Login tracer의 URL도 inert test value이며 browser를 열지 않는다.
