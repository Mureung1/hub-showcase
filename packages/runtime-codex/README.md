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
