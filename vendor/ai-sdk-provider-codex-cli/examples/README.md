# App Server regression examples

이 directory의 runnable example은 현재 private fork가 보존하는 App Server AI SDK regression
surface를 검증한다.

- [`examples/app-server`](./app-server/README.md): persistent `codex app-server` JSON-RPC flow
- [`examples/assets`](./assets): image example용 fixture

Process-per-call `codex exec` examples는 `FP-0007a`에서 source와 함께 제거했다. 과거 donor example은
immutable [`references/ai-sdk-provider-codex-cli`](../../../references/ai-sdk-provider-codex-cli)에서
확인할 수 있다.

## Prerequisites

- exact package-local dependency install: `npm ci`
- Codex authentication: `codex login` 또는 `OPENAI_API_KEY`
- package build: `npm run build`

## Run

```bash
node examples/app-server/basic-usage.mjs
node examples/app-server/list-models.mjs
node examples/app-server/abort.mjs
node examples/app-server/raw-chunks.mjs
node examples/app-server/usage-metadata.mjs
```

Persistent provider를 만든 example은 종료 전에 `await provider.close()`를 호출해야 한다.

## Validate

```bash
npm run validate:docs
npm run validate:examples:app-server
```

`validate:examples:app-server`는 package-local Codex child를 실제로 시작하는 opt-in live gate다.
Non-live package gate인 `npm run validate`에는 포함되지 않는다.
