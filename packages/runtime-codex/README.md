# @ay-ple/runtime-codex

Runtime package for Codex app-server integration experiments. This package owns
raw Codex protocol details so `runtime-core`, the server, and product code do not
depend on Codex-specific message shapes.

## Pinned Contract

| Item | Value |
| --- | --- |
| Codex package | `@openai/codex@0.144.0` |
| Model selection | Codex default; AY-PLE does not pin a model yet |
| Transport | `stdio` JSONL |
| Startup | `codex app-server --listen stdio://` |
| Generated protocol path | `src/internal/codex-app-server-protocol/generated/` |

Regenerate the internal Codex app-server TypeScript protocol files with:

```bash
npm run generate:codex-types -w @ay-ple/runtime-codex
```

The generator runs the package-owned Codex binary, then rewrites generated
relative imports to `.js` specifiers so the package compiles under `NodeNext`
ESM. Generated files are internal and must not be re-exported as AY-PLE product
contracts.

The package pin fixes the app-server binary and generated protocol contract. It
does not force a model such as `gpt-5.6-sol`; thread creation currently follows
the configured Codex default model.

## 현재 Harness 범위

현재 어댑터는 단일 실행 Runtime Harness 통합이며, AY-PLE 제품의 전체 상호작용 호스트가 아니다.

- 각 실행은 새 `app-server` 프로세스, `thread`, `turn`을 시작하고 작업이 끝나면 종료한다.
- 정규화한 어댑터 출력은 세부 작업 활동이 아니라 텍스트와 실행 종료 생명주기를 다룬다.
- `turn/steer`는 원본 호출만 가능하며 제품의 충돌·제어 정책은 아직 없다.
- `CodexRawClient`는 App Server가 시작한 `request`를 아직 전달하거나 형식이 지정된 `response`로 응답하지 못한다. `approval`, Codex 사용자 입력, `elicitation`, 동적 도구 왕복보다 App Server 요청 왕복 경로가 먼저 필요하다.
- 작업공간 내부 `.ay-ple/runtime-codex/*` 기본 경로는 개발자용 Harness를 위한 것이다. 제품에서는 실행 엔진 인증과 세션 상태를 학기 작업공간 밖의 운영체제 앱 데이터 디렉터리로 옮긴다.

4주 제품 연결에서는 Codex App Server를 우선 지원하면서 같은 `thread`를 이어 쓰는 생명주기, `thread`/`turn`/`item`/`request` 식별자를 보존하는 이벤트 관측, App Server 요청 왕복, `turn/steer`, `turn/interrupt`, AY-PLE 제품 의미로의 변환을 추가한다. 자세한 결정은 [ADR 0005](../../docs/adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)와 [Runtime Harness 구현 지도](../../docs/architecture/runtime-harness-implementation-map.md)를 따른다.

## Raw Initialize Smoke

Run the opt-in app-server initialize smoke with:

```bash
npm run smoke:codex -w @ay-ple/runtime-codex
```

Without overrides, the runtime home is workspace-local:

| Path | Purpose |
| --- | --- |
| `.ay-ple/runtime-codex/codex-home` | App-managed `CODEX_HOME`, including file-based auth config. |
| `.ay-ple/runtime-codex/sqlite` | App-managed `CODEX_SQLITE_HOME`. |

Supported environment overrides:

| Variable | Purpose |
| --- | --- |
| `CODEX_BIN_PATH` | Use a specific Codex binary instead of the package-owned binary. |
| `CODEX_HOME` | Use a specific app-owned Codex home. |
| `CODEX_SQLITE_HOME` | Use a specific app-owned SQLite home. |
| `CODEX_SMOKE_CWD` | Working directory for the app-server child process. |
| `CODEX_SMOKE_TIMEOUT_MS` | Initialize timeout in milliseconds. |

The smoke command sends `initialize`, waits for the matching response, then sends
the generated-contract `initialized` notification. It never runs `codex login`
and never starts OAuth. If auth is missing or Codex reports that login is needed,
stop and handle auth explicitly before retrying.

## Live HTTP/SSE Parity

Run the opt-in prompt and cancellation gate through the same server API consumed
by Runtime Inspector:

```bash
npm run verify:codex-parity -w @ay-ple/server
```

The command starts the Express server on an ephemeral loopback port, requires the
running binary to match the package pin, then verifies a completed prompt and an
adapter-confirmed cancellation over HTTP and SSE. It uses the runtime-home and
binary environment variables listed above plus `CODEX_RUNTIME_CWD`. Set
`CODEX_PARITY_TIMEOUT_MS` to a positive integer to override the 60-second overall
timeout. The command never starts login or OAuth and does not print raw debug log
contents.

When reusing the local ownership spike auth, point the smoke at the spike-owned
runtime directories without reading or copying credential contents:

```bash
CODEX_HOME="$PWD/spikes/codex-runtime-ownership/runtime/codex-home" \
CODEX_SQLITE_HOME="$PWD/spikes/codex-runtime-ownership/runtime/sqlite" \
npm run smoke:codex -w @ay-ple/runtime-codex
```
