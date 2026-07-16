# @ay-ple/codex-chat-runtime

Official OpenAI Codex Python SDK를 재사용하는 Codex-native Chat Shell runtime package다. 현재 Ticket 001 기준으로는 exact SDK source·generated contract·provenance를 재현하는 package baseline만 제공하며, production Python bridge와 Node runtime은 아직 구현하지 않는다.

기존 `@ay-ple/runtime-codex`, `HeadlessCodexClientHost`, Server와 Inspector는 이 package에 의존하지 않는다. 새 Chat Shell의 채택 경계와 legacy 보존 결정은 [ADR 0011](../../docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md), 첫 수직 흐름은 [Chat Shell spec](../../docs/specs/2026-07-16-codex-native-chat-shell.md)이 소유한다.

## 고정 기준

| 항목 | 값 |
| --- | --- |
| Official source | `references/openai-codex` |
| Source commit | `8c68d4c87dc54d38861f5114e920c3de2efa5876` |
| Source tag | `rust-v0.144.4` |
| Native runtime contract | `openai-codex-cli-bin==0.144.4` |
| SDK distribution version | upstream `0.0.0.dev0` 유지 |
| Python | 사전 설치된 exact CPython `3.10.12`; implicit download 금지 |
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
| `python/openai-codex/` | exact commit에서 materialize하고 `0.144.4`로 regenerate한 tracked SDK snapshot |
| `manifests/unpatched.json` | behavioral patch 전 canonical source/generated/lock/wheel provenance |
| `upstream/UPSTREAM.md` | source, pin, adaptation과 재현 근거 |
| `upstream/PATCHES.md` | ordered behavioral patch ledger; Ticket 001에는 behavioral patch 없음 |
| `upstream/LICENSE`, `upstream/NOTICE` | materializer가 exact source root에서 보존하고 verifier가 digest를 확인하는 Apache-2.0 파일 |
| `.artifacts/exact-sdk/` | ignored wheel, frozen install, build output와 cache |

Tracked snapshot과 manifest는 review 대상이다. Wheel, installed environment, CPython/native binary와 cache는 git에 넣지 않는다. Standalone Python/native runtime bundle은 후속 Ticket 004가 소유한다.

## 명령

모든 명령은 repository root 또는 이 package directory에서 npm workspace command로 실행한다.

| 명령 | 동작과 mutation 경계 |
| --- | --- |
| `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime` | Clean exact source를 export하고 generated authority 세 곳과 lock을 재생성한 뒤 tracked snapshot·unpatched manifest를 갱신한다. 의도적인 mutation command다. |
| `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime` | Tracked source, generated output, lock, SDK wheel과 provenance가 clean reproduction과 일치하는지 non-mutating하게 확인한다. |
| `npm run test:exact-sdk -w @ay-ple/codex-chat-runtime` | Tracked snapshot의 temporary copy에서 aligned official Python unit suite와 Ruff check/format gate를 실행한다. Real provider test는 실행하지 않는다. |
| `npm run test:provenance -w @ay-ple/codex-chat-runtime` | Dirty ref, untracked source와 provenance drift를 거부하고 ignored source가 export에서 제외되는지 검사하는 unit test를 실행한다. |
| `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` | Verify, exact SDK test와 provenance test를 순서대로 실행한다. |
| `npm run typecheck -w @ay-ple/codex-chat-runtime` | Empty future TypeScript export boundary를 검사한다. Network나 Python artifact를 사용하지 않는다. |
| `npm run build -w @ay-ple/codex-chat-runtime` | TypeScript boundary만 `dist/`로 compile한다. Download나 SDK generation을 실행하지 않는다. |

Exact commands는 `uv 0.8.13`과 사전 설치된 CPython `3.10.12`를 요구한다. `--no-python-downloads`로 interpreter fallback을 금지하고, script가 tool/source pin과 occurrence guard를 검증한다. Inner generation은 controlled `HOME`, Codex homes, temporary/cache roots와 PyPI default index만 사용하며 caller의 `UV_*`, `PIP_*`, Python path와 `.env` 설정을 계승하지 않는다. Manifest는 CPython build identity와 normalized system/machine도 기록한다. Shared tracked snapshot을 교체하는 `generate` 명령은 다른 exact command와 병렬로 실행하지 않는다. `verify`와 `test`는 command-local environment와 source copy를 사용한다.

일반 `build`와 `typecheck`는 offline이며 `uv`, source submodule, system Python 또는 network를 호출하지 않는다. `test`는 좁은 provenance unit gate의 alias이고 exact generation·wheel reproduction은 명시적인 `validate:exact-sdk`에서만 실행한다.

## License와 live gate

Materializer는 exact source root의 Apache-2.0 `LICENSE`와 `NOTICE`를 `upstream/`에 보존한다. 이 파일은 AY-PLE 자체 licensing과 합치지 않으며 source SHA와 digest를 [UPSTREAM.md](upstream/UPSTREAM.md)에 기록한다.

Ticket 001 명령은 provider, user credential, ambient workspace 또는 live Codex conversation을 사용하지 않는다. Official fake/unit suite만 실행한다. Exact local-provider와 disposable live-provider gate는 후속 conformance ticket이 별도로 기록하며, safe provider가 없을 때 live 미실행을 deterministic green과 혼동하지 않는다.
