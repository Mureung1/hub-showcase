# @ay-ple/codex-chat-runtime

Official OpenAI Codex Python SDK를 재사용하는 Codex-native Chat Shell runtime package다. 현재 Ticket 005 기준으로 exact SDK source·generated contract·provenance, response-last correction·bounded notification routing·initialize notification opt-out의 ordered patch stack, macOS arm64용 standalone production bundle과 그 안에서 실행하는 persistent Python bridge를 재현한다. Node supervisor와 public `CodexChatRuntime`은 아직 구현하지 않는다.

기존 `@ay-ple/runtime-codex`, `HeadlessCodexClientHost`, Server와 Inspector는 이 package에 의존하지 않는다. 새 Chat Shell의 채택 경계와 legacy 보존 결정은 [ADR 0011](../../docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), 첫 수직 흐름은 [Chat Shell spec](../../docs/specs/2026-07-16-codex-native-chat-shell.md)이 소유한다.

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
| `src/index.ts` | future Node-only `CodexChatRuntime` export boundary; 현재 empty module |
| `src/contract.ts` | future browser-safe contract boundary; 현재 empty module |
| `src/testing.ts` | future deterministic fake boundary; 현재 empty module |
| `python/bridge/` | public `AsyncCodex`를 소유하고 private NDJSON command를 처리하는 package-private persistent worker source |
| `python/openai-codex/` | exact commit에서 materialize하고 `0.144.4`로 regenerate한 immutable unpatched SDK snapshot |
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

Tracked unpatched snapshot, 세 manifest와 patch series는 review 대상이다. Behavioral patch는 test·verification temporary copy에만 적용한다. Wheel, installed environment, CPython/native binary와 cache는 git에 넣지 않는다. `.artifacts/exact-sdk/wheels`의 SDK wheel은 unpatched reproduction evidence이고 production bundle의 SDK wheel은 `0001 → 0002 → 0003 → 0004`를 적용한 뒤 source epoch에서 두 번 build한 별도 artifact다. 0004는 Rust first-party client와 같은 initialize notification opt-out config만 Python public config에 추가한다.

## Standalone production bundle

첫 production target은 `darwin-arm64` 하나뿐이다. Materializer는 Astral `python-build-standalone`의 `cpython-3.10.18+20250818-aarch64-apple-darwin-install_only_stripped.tar.gz`, exact lock이 고른 6개 runtime/dependency wheel, `pyproject.toml`이 요구하는 reviewed `uv_build==0.11.19` wheel과 locally built patched SDK wheel을 SHA-256과 byte size로 검증한다. Network access는 materialization이 이 hash-pinned input을 package-local cache에 받는 download phase에서만 허용한다. Patched SDK wheel 두 build는 reviewed build-backend wheelhouse만 사용하는 `--no-index --offline` 환경에서 수행한다. 그 뒤 두 clean tree에서 bundled Python의 `pip --no-index --no-deps --no-compile`로 같은 7개 production wheel을 설치하고 manifest, installed distribution과 file-roster digest가 동일한지 확인한다.

Canonical manifest는 다음을 서로 연결한다.

- exact source commit, immutable unpatched manifest와 complete ordered patch stack
- reviewed macOS arm64 `uv_build==0.11.19` build-backend wheel과 offline wheel build
- patched SDK wheel `7f32c7cf1a1c8272b83257fffbc8f88d5310157a5ec88a18904f3ebe5d56b61b`
- standalone CPython `3.10.18` build `20250818`와 exact archive digest
- `openai-codex-cli-bin==0.144.4` 및 Pydantic dependency closure의 complete wheel roster
- installed `_message_router.py`와 final patched-source digest
- tracked `python/bridge` 5-file roster와 installed `bundle/bridge` roster·entrypoint
- bundle-local import path, native executable, `codex-cli 0.144.4`와 complete tree-roster digest

`verify:production-runtime`은 download, build, submodule access 또는 artifact repair를 하지 않는다. Canonical manifest와 이미 materialize된 ignored tree가 없거나 한 파일이라도 missing, extra, renamed, truncated 또는 digest-mismatched 상태면 fail closed한다. Verified bundle이 없을 때 system Python이나 ambient `PATH`로 fallback하는 startup API도 아직 없다. Worker actual-child gate는 canonical manifest가 검증한 bundled Python, `-B`, site-packages와 entrypoint만 사용해 verified tree에 bytecode를 쓰지 않는다. Windows, Linux와 macOS x86_64는 지원하지 않는다.

## Persistent Python bridge

Worker는 official public `AsyncCodex`, `AsyncThread`, `AsyncTurnHandle`만 conversation baseline으로 사용한다. Process-local live handle을 native `threadId`·`turnId`로 보관할 뿐 native thread를 archive/delete하거나 AY-PLE ID로 remap하지 않는다. `thread/start`와 `turn/start`마다 `ApprovalMode.deny_all`, `Sandbox.read_only`와 준비된 workspace를 explicit하게 전달한다. 이는 expected approval을 `never`로 보내는 첫 slice policy이며, unexpected schema-valid approval request까지 client-side에서 차단한다고 주장하지 않는다.

입력 command는 compact JSON 한 line이며 extra field를 허용하지 않는다.

| `command` | Required fields | 결과 |
| --- | --- | --- |
| `start_thread` | `bridgeRequestId` | response-native `{ threadId }` result |
| `start_turn` | `bridgeRequestId`, `threadId`, `text` | `{ threadId, turnId }` acceptance 뒤 같은 bridge request에 FIFO event |
| `interrupt` | `bridgeRequestId`, `threadId`, `turnId` | native interrupt RPC acknowledgement; stream terminal은 별도 authoritative event |
| `release_thread` | `bridgeRequestId`, `threadId` | idle local handle만 제거 |
| `close` | `bridgeRequestId` | accepted work와 SDK close를 정산한 뒤 마지막 `close_ack` |

출력은 `result`, `event`, correlated `error`, uncorrelated process-wide `fatal`, `close_ack` 중 하나다. `bridgeRequestId`는 이 private transport correlation에만 존재하며 projected event 내부나 browser contract로 이동하지 않는다.

| Event | 공개 field |
| --- | --- |
| `agent_message.delta` | `threadId`, `turnId`, `itemId`, `delta` |
| `agent_message.completed` | `threadId`, `turnId`, `itemId`, final `text` |
| `turn.error` | `threadId`, `turnId`, `willRetry`, typed safe `code`, fixed `displayMessage` |
| `turn.completed` | `threadId`, `turnId`, native `status`, failed일 때 safe `failure` |

Raw JSON-RPC envelope, generated Pydantic payload, `RequestId`, raw error/detail/path와 다른 notification/item은 stdout에 쓰지 않는다. `turn.error`는 nonterminal이고 첫 matching `turn/completed`만 semantic terminal이다. `start_turn` acceptance를 stdout queue에 먼저 넣은 뒤 stream consumer를 시작하므로 response-last staged event도 acceptance 뒤 official SDK FIFO로 나온다. Exact generated notification roster는 adopted 네 method와 sorted 64-method initialize opt-out complement로 나뉘므로 정상 `thread/started`·`thread/status/changed`가 unconsumed global route에 누적되지 않는다. Cross-thread total order는 정의하지 않는다.

Private input/output frame은 newline을 포함해 최대 1 MiB다. Stdout은 sole writer와 4,096-frame/16 MiB non-blocking queue를 쓰고 terminal 전용 lane을 둔다. Live thread/active turn default cap은 32/32다. Idle handle만 exact LRU로 local release하며 active handle은 evict하지 않는다. Active request lease는 최대 64개이며 application command는 8개 control reserve를 남긴다. `close`는 capacity만 우회하고 active duplicate ID는 여전히 fatal이다. One-shot ID는 result/error enqueue, turn ID는 semantic terminal enqueue까지 active하며 그 뒤 재사용할 수 있다. Caller는 terminal frame을 관찰하기 전에 ID를 재사용하지 않는다. Normal close는 이미 admitted된 operation을 result/error로 정산한 뒤 SDK를 닫고 마지막 `close_ack`를 보낸다.

Identity/resource/admission conflict와 request-phase SDK rejection은 correlated error다. Malformed/unknown/oversized input, 동시에 active인 duplicate bridge ID, SDK transport/router/accepted-stream terminal, event serialization과 stdout queue overflow는 once-only fatal이다. Acceptance 후 SDK stream terminal은 이미 enqueue된 acceptance/event를 지우지 않고 fatal을 마지막으로 추가하며, stdout queue 자체의 overflow만 bounded settlement를 위해 pending frame을 버리고 reserved fatal로 대체한다. Stdout pipe 자체가 실패하면 fatal frame을 보낼 수 없으므로 worker는 unconditional SDK cleanup 뒤 nonzero exit하며 Node가 EOF/exit로 판정한다. Python은 모든 exit path에서 `AsyncCodex.close()`를 시도하지만 Node environment scrub, deadline, stderr capture와 process-group terminate/kill/reap은 Ticket 006–007 범위다.

## 명령

모든 명령은 repository root 또는 이 package directory에서 npm workspace command로 실행한다.

| 명령 | 동작과 mutation 경계 |
| --- | --- |
| `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime` | Clean exact source와 wheel을 재생성한다. 기존 unpatched manifest와 다르면 재작성하지 않고 실패하며, 같으면 unpatched snapshot과 patched-source derivation manifest를 갱신한다. 의도적인 mutation command다. |
| `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime` | 두 clean unpatched build, deterministic patch derivation, 두 manifest, patch digest, SDK wheel과 provenance를 non-mutating하게 확인한다. |
| `npm run test:router -w @ay-ple/codex-chat-runtime` | Response-last RED/GREEN actual-child, default 4,096-item A boundary 중 unrelated B completion과 4,097번째 overflow, 14개 injected item·byte·route-count actual-child matrix, response·turn·login·global waiter settlement, child/process-group reap 및 patch-owned router unit suite를 검증한다. |
| `npm run test:exact-sdk -w @ay-ple/codex-chat-runtime` | Temporary copy에 ordered patch를 적용한 뒤 aligned official Python unit suite와 Ruff check/format gate를 실행한다. Real provider test는 실행하지 않는다. |
| `npm run test:provenance -w @ay-ple/codex-chat-runtime` | Dirty/untracked source, provenance drift, patch preimage와 patched-source manifest derivation을 검사한다. |
| `npm run test:production-runtime -w @ay-ple/codex-chat-runtime` | Artifact roster, ordered patch, safe archive와 verify-only fail-closed semantics를 작은 synthetic fixture로 검사한다. Download나 bundle 존재를 요구하지 않는다. |
| `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime` | Bundle 없이 strict command decode, inclusive 1 MiB framing, canonical encoding, reserved fatal lane과 active request lease/control reserve를 검사한다. |
| `npm run test:bridge -w @ay-ple/codex-chat-runtime` | Verified bundle worker가 official patched SDK와 purpose-built App Server child를 통과해 response-last streaming, exact notification opt-out, policy, interrupt, local release/LRU, admission/caps, stream·stdout failure, fatal과 close를 검증한다. 먼저 production runtime을 materialize해야 한다. |
| `npm run check:bridge -w @ay-ple/codex-chat-runtime` | Bridge, fake, bridge test와 touched production materializer를 locked Ruff `0.15.12`로 check/format 검증한다. |
| `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` | Verify, response-last·bounded router gate, patched official suite와 provenance test를 순서대로 실행한다. |
| `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime` | Network-capable command. Patched wheel 두 build, reviewed download, 두 clean offline install을 수행하고 canonical manifest와 일치하는 ignored bundle을 publish한다. |
| `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Existing ignored bundle을 canonical manifest에 대해 non-mutating하게 검증하고 bundled Python/import/native version을 probe한다. Network와 build를 사용하지 않는다. |
| `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime` | Synthetic unit, bundle verification, bundled bridge actual-child, post-run non-mutation verification과 Ruff gate를 순서대로 실행한다. 먼저 materialize된 macOS arm64 artifact가 필요하다. |
| `npm run typecheck -w @ay-ple/codex-chat-runtime` | Empty future TypeScript export boundary를 검사한다. Network나 Python artifact를 사용하지 않는다. |
| `npm run build -w @ay-ple/codex-chat-runtime` | TypeScript boundary만 `dist/`로 compile한다. Download나 SDK generation을 실행하지 않는다. |

Exact commands는 `uv 0.8.13`과 사전 설치된 CPython `3.10.12`를 요구한다. `--no-python-downloads`로 interpreter fallback을 금지하고, script가 tool/source pin과 occurrence guard를 검증한다. Inner generation은 controlled `HOME`, Codex homes, temporary/cache roots와 PyPI default index만 사용하며 caller의 `UV_*`, `PIP_*`, Python path와 `.env` 설정을 계승하지 않는다. Manifest는 CPython build identity와 normalized system/machine도 기록한다. Shared tracked snapshot을 교체하는 `generate` 명령은 다른 exact command와 병렬로 실행하지 않는다. `verify`, `test:router`와 `test:exact-sdk`는 command-local environment와 source copy를 사용한다.

일반 `build`와 `typecheck`는 offline이며 `uv`, source submodule, system Python 또는 network를 호출하지 않는다. 이 package의 일반 `test`는 provenance, synthetic production verifier와 bridge protocol unit만 실행하며 ignored bundle이나 network를 요구하지 않는다. Exact generation·wheel reproduction은 `validate:exact-sdk`, binary download·offline install은 `materialize:production-runtime`, bundled worker actual-child는 `validate:production-runtime`에서만 명시적으로 실행한다.

## License와 live gate

Materializer는 exact source root의 Apache-2.0 `LICENSE`와 `NOTICE`를 `upstream/`과 production bundle의 `bundle/licenses/openai-codex/`에 보존한다. 이 파일은 AY-PLE 자체 licensing과 합치지 않으며 source SHA와 digest를 [UPSTREAM.md](upstream/UPSTREAM.md)에 기록한다. Standalone CPython archive가 제공하는 PSF와 bundled dependency license tree도 pruning하지 않는다. Native runtime wheel 안의 `rg`, `zsh` 등 third-party payload에 대한 최종 배포 notice audit, signing/notarization과 platform 확장은 후속 packaging work다.

현재 명령은 provider, user credential, ambient workspace 또는 live Codex conversation을 사용하지 않는다. Response-last, bounded-router와 bridge gate는 `CodexConfig.launch_args_override`로 시작한 purpose-built OS child다. Bridge fake journal은 initialize/initialized, explicit `never + readOnly`, native identity, acceptance-first replay, interrupt와 no archive/delete를 확인한다. Response-last와 default 4,096-item A/B 흐름은 official public async thread·turn·login API를 통과한다. Injected-limit matrix는 package-private budget을 검증하기 위해 SDK startup 전 router 교체, active route registration, usage snapshot과 public global notification API가 없는 read seam을 test oracle로만 사용한다. Login tracer의 URL도 inert test value이며 browser를 열지 않는다. Exact local-provider와 disposable live-provider gate는 후속 conformance ticket이 별도로 기록하며, live 미실행을 deterministic fake green과 혼동하지 않는다.
