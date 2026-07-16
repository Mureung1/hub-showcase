# @ay-ple/codex-chat-runtime

Official OpenAI Codex Python SDK를 재사용하는 Codex-native Chat Shell runtime package다. 현재 Ticket 004 기준으로 exact SDK source·generated contract·provenance, response-last correction과 bounded notification routing의 ordered patch stack, macOS arm64용 standalone production bundle을 재현한다. Production Python bridge와 Node runtime은 아직 구현하지 않는다.

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
| `.artifacts/production-runtime-darwin-arm64/` | verified standalone Python, wheelhouse와 offline-installed package-private runtime |

Tracked unpatched snapshot, 세 manifest와 patch series는 review 대상이다. Behavioral patch는 test·verification temporary copy에만 적용한다. Wheel, installed environment, CPython/native binary와 cache는 git에 넣지 않는다. `.artifacts/exact-sdk/wheels`의 SDK wheel은 unpatched reproduction evidence이고 production bundle의 SDK wheel은 `0001 → 0002 → 0003`을 적용한 뒤 source epoch에서 두 번 build한 별도 artifact다.

## Standalone production bundle

첫 production target은 `darwin-arm64` 하나뿐이다. Materializer는 Astral `python-build-standalone`의 `cpython-3.10.18+20250818-aarch64-apple-darwin-install_only_stripped.tar.gz`, exact lock이 고른 6개 runtime/dependency wheel, `pyproject.toml`이 요구하는 reviewed `uv_build==0.11.19` wheel과 locally built patched SDK wheel을 SHA-256과 byte size로 검증한다. Network access는 materialization이 이 hash-pinned input을 package-local cache에 받는 download phase에서만 허용한다. Patched SDK wheel 두 build는 reviewed build-backend wheelhouse만 사용하는 `--no-index --offline` 환경에서 수행한다. 그 뒤 두 clean tree에서 bundled Python의 `pip --no-index --no-deps --no-compile`로 같은 7개 production wheel을 설치하고 manifest, installed distribution과 file-roster digest가 동일한지 확인한다.

Canonical manifest는 다음을 서로 연결한다.

- exact source commit, immutable unpatched manifest와 complete ordered patch stack
- reviewed macOS arm64 `uv_build==0.11.19` build-backend wheel과 offline wheel build
- patched SDK wheel `efdaf676590c9ad7e5b374360ceaeb7cc49c61218b84d028802058002717edd7`
- standalone CPython `3.10.18` build `20250818`와 exact archive digest
- `openai-codex-cli-bin==0.144.4` 및 Pydantic dependency closure의 complete wheel roster
- installed `_message_router.py`와 final patched-source digest
- bundle-local import path, native executable, `codex-cli 0.144.4`와 complete tree-roster digest

`verify:production-runtime`은 download, build, submodule access 또는 artifact repair를 하지 않는다. Canonical manifest와 이미 materialize된 ignored tree가 없거나 한 파일이라도 missing, extra, renamed, truncated 또는 digest-mismatched 상태면 fail closed한다. Verified bundle이 없을 때 system Python이나 ambient `PATH`로 fallback하는 startup API도 아직 없다. Windows, Linux와 macOS x86_64는 지원하지 않는다.

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
| `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` | Verify, response-last·bounded router gate, patched official suite와 provenance test를 순서대로 실행한다. |
| `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime` | Network-capable command. Patched wheel 두 build, reviewed download, 두 clean offline install을 수행하고 canonical manifest와 일치하는 ignored bundle을 publish한다. |
| `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | Existing ignored bundle을 canonical manifest에 대해 non-mutating하게 검증하고 bundled Python/import/native version을 probe한다. Network와 build를 사용하지 않는다. |
| `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime` | Synthetic production-runtime unit gate 뒤 non-mutating bundle verification을 실행한다. 먼저 materialize된 macOS arm64 artifact가 필요하다. |
| `npm run typecheck -w @ay-ple/codex-chat-runtime` | Empty future TypeScript export boundary를 검사한다. Network나 Python artifact를 사용하지 않는다. |
| `npm run build -w @ay-ple/codex-chat-runtime` | TypeScript boundary만 `dist/`로 compile한다. Download나 SDK generation을 실행하지 않는다. |

Exact commands는 `uv 0.8.13`과 사전 설치된 CPython `3.10.12`를 요구한다. `--no-python-downloads`로 interpreter fallback을 금지하고, script가 tool/source pin과 occurrence guard를 검증한다. Inner generation은 controlled `HOME`, Codex homes, temporary/cache roots와 PyPI default index만 사용하며 caller의 `UV_*`, `PIP_*`, Python path와 `.env` 설정을 계승하지 않는다. Manifest는 CPython build identity와 normalized system/machine도 기록한다. Shared tracked snapshot을 교체하는 `generate` 명령은 다른 exact command와 병렬로 실행하지 않는다. `verify`, `test:router`와 `test:exact-sdk`는 command-local environment와 source copy를 사용한다.

일반 `build`와 `typecheck`는 offline이며 `uv`, source submodule, system Python 또는 network를 호출하지 않는다. 이 package의 `test`도 provenance와 synthetic production verifier만 실행하며 ignored bundle이나 network를 요구하지 않는다. Exact generation·wheel reproduction은 `validate:exact-sdk`, binary download·offline install은 `materialize:production-runtime`에서만 명시적으로 실행한다.

## License와 live gate

Materializer는 exact source root의 Apache-2.0 `LICENSE`와 `NOTICE`를 `upstream/`과 production bundle의 `bundle/licenses/openai-codex/`에 보존한다. 이 파일은 AY-PLE 자체 licensing과 합치지 않으며 source SHA와 digest를 [UPSTREAM.md](upstream/UPSTREAM.md)에 기록한다. Standalone CPython archive가 제공하는 PSF와 bundled dependency license tree도 pruning하지 않는다. Native runtime wheel 안의 `rg`, `zsh` 등 third-party payload에 대한 최종 배포 notice audit, signing/notarization과 platform 확장은 후속 packaging work다.

현재 명령은 provider, user credential, ambient workspace 또는 live Codex conversation을 사용하지 않는다. Response-last와 bounded-router gate는 `CodexConfig.launch_args_override`로 시작한 purpose-built OS child다. Response-last와 default 4,096-item A/B 흐름은 official public async thread·turn·login API를 통과한다. Injected-limit matrix는 package-private budget을 검증하기 위해 SDK startup 전 router 교체, active route registration, usage snapshot과 public global notification API가 없는 read seam을 test oracle로만 사용한다. Login tracer의 URL도 inert test value이며 browser를 열지 않는다. Exact local-provider와 disposable live-provider gate는 후속 conformance ticket이 별도로 기록하며, live 미실행을 deterministic fake green과 혼동하지 않는다.
