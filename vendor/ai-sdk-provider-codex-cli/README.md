# AY-PLE Codex App Server client fork

이 directory는 MIT `ai-sdk-provider-codex-cli@2.1.1`을 기반으로 만든 AY-PLE의 private,
isolated development fork다. Published community package도, root npm workspace나 AY-PLE production
dependency도 아니다.

현재 목표는 exact `@openai/codex@0.144.4` App Server와 대화하는 external stdio client foundation을
fork 내부에서 먼저 완성하고 검증하는 것이다. Donor의 process-per-call `codex exec` mode는
`FP-0007a`에서 제거했다. 남아 있는 App Server `LanguageModelV4` provider는 최종 public API가 아니라,
native facade가 같은 lifecycle을 인수할 때까지 유지하는 executable regression adapter다.

| Authority                                    | Owner                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| Donor tree, MIT license, exact donor commit  | [UPSTREAM.md](UPSTREAM.md)                                                     |
| Local semantic patch와 verification evidence | [upstream/PATCHES.md](upstream/PATCHES.md)                                     |
| Exact Codex package/source pin               | [upstream/codex-pin.json](upstream/codex-pin.json)                             |
| Generated protocol manifest                  | [generated manifest](src/app-server/protocol/generated/manifest.json)          |
| Current package API, commands, limits        | 이 README                                                                      |
| Product work order와 completion state        | [AY-PLE development backlog](../../docs/product/ay-ple-development-backlog.md) |

## Current boundary

Fork가 현재 보존하는 실행 graph는 다음과 같다.

```text
createCodexAppServer / listModels (temporary regression surface)
                    ↓
AppServerLanguageModel / AppServerSession / TurnStreamController
                    ↓
AppServerTurnEventRouter → AppServerTurnResultCollector
                    ↓
AppServerRpcClient
                    ↓
persistent codex app-server child over stdio JSONL
```

Package root는 다음 runtime value만 export한다.

- `createCodexAppServer`, `codexAppServer`, `listModels`
- `tool`, `createLocalMcpServer`, `createSdkMcpServer`
- `UnsupportedFeatureError`, `isAuthenticationError`, `isUnsupportedFeatureError`

`AppServerRpcClient`, generated protocol tree, decoder, request builders, response decoders,
native event router와 result collector는 package-private다. Package `exports`에는 root `.`와
`./package.json`만 존재한다.

다음은 이 checkpoint의 경계 밖이다.

- root workspace, `packages/runtime-codex`, Server, Inspector와 production integration
- 기존 `HeadlessCodexClientHost` 변경 또는 제거
- AY-PLE product adapter와 browser contract
- bounded writer/staging, raw-byte framing, hardened RequestId/Server-request lease
- T0, T0-C, T0.1 actual-child/live conformance 완료

## Current App Server API

이 절은 fork에 현재 남아 있는 temporary App Server regression API의 source of truth다. 이 API는
아직 AY-PLE production contract가 아니지만, native facade가 동일한 behavior를 인수할 때까지
실행 가능한 compatibility oracle로 유지한다.

### Quick start

`createCodexAppServer()`는 client pool을 만들고 첫 `provider.listModels()` 또는 model request에서
persistent child를 lazy-start한다. `codexPath`, `cwd`, `env`, logger와 timeout/version settings가
같은 call은 child를 재사용하고, client-scoped settings가 다르면 별도 child를 가질 수 있다. Model
slug를 고정해 추측하기보다 현재 binary의 model을 조회하고, 사용이 끝나면 성공·실패와 무관하게
provider를 닫는다.

```ts
import { streamText } from 'ai';
import { createCodexAppServer } from 'ai-sdk-provider-codex-cli';

const provider = createCodexAppServer();

try {
  const { defaultModel, models } = await provider.listModels();
  const modelId = defaultModel?.id ?? models[0]?.id;
  if (!modelId) throw new Error('Codex did not report an available model');

  const result = streamText({
    model: provider(modelId),
    prompt: 'Summarize this workspace in three bullets.',
  });

  for await (const text of result.textStream) {
    process.stdout.write(text);
  }
} finally {
  await provider.close();
}
```

Provider는 callable `provider(modelId, settings?)`와 `languageModel()` / `chat()` alias,
`provider.listModels()`, `close()` / `dispose()`를 제공한다. Standalone `listModels()`는 임시 child를
사용하고, provider method는 pool의 compatible child를 lazy-start하거나 재사용한다. Embedding과
image model factory는 지원하지 않는다.

### Settings

`createCodexAppServer({ defaultSettings })`의 factory default 위에
`provider(modelId, settings)`의 model settings가 올라간다. 아래 설정은 둘 다
`CodexAppServerSettings`를 사용한다.

| Group          | Setting                                     | Current behavior                                                                                          |
| -------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Process        | `codexPath`                                 | 실행할 Codex binary 또는 JS entry를 지정한다. Package-local exact-pin 검증 범위를 벗어난다.               |
| Process        | `cwd`, `env`                                | child working directory와 추가 environment를 지정한다.                                                    |
| Process        | `logger`, `verbose`                         | custom logger, logging disable, verbose level을 제어한다.                                                 |
| Lifecycle      | `connectionTimeoutMs`                       | `initialize` handshake deadline을 지정한다.                                                               |
| Lifecycle      | `requestTimeoutMs`                          | outbound JSON-RPC request의 기본 deadline을 지정한다.                                                     |
| Lifecycle      | `idleTimeoutMs`                             | ready child가 idle일 때 닫히는 시간을 지정한다.                                                           |
| Compatibility  | `minCodexVersion`                           | version floor만 확인한다. Exact generated-contract conformance 검증을 대신하지 않는다.                    |
| Turn           | `personality`                               | `'none'`, `'friendly'`, `'pragmatic'` 중 하나를 전달한다.                                                 |
| Turn           | `effort`                                    | `'none'`, `'minimal'`, `'low'`, `'medium'`, `'high'`, `'xhigh'` 중 지원되는 reasoning effort를 전달한다.  |
| Turn           | `summary`                                   | `'auto'`, `'concise'`, `'detailed'`, `'none'` 중 reasoning summary mode를 전달한다.                       |
| Turn           | `approvalPolicy`, `sandboxPolicy`           | Exact generated Codex policy shape 또는 보존된 string shorthand를 thread/turn에 전달한다.                 |
| Instructions   | `baseInstructions`, `developerInstructions` | Thread instruction override를 전달한다.                                                                   |
| Thread         | `threadMode`                                | `'stateless'`가 default이며, `'persistent'`는 같은 model instance의 native thread를 재사용한다.           |
| Thread         | `resume`                                    | Existing native thread id를 resume하는 shorthand다.                                                       |
| Stream         | `includeRawChunks`                          | Raw App Server notification을 AI SDK `raw` stream part로 함께 노출한다.                                   |
| MCP            | `mcpServers`, `rmcpClient`                  | Stdio/HTTP MCP config와 `createSdkMcpServer()` instance를 연결한다.                                       |
| Config         | `configOverrides`                           | Codex config override를 전달하며 model/per-call map은 key 단위로 merge된다.                               |
| Approval       | `autoApprove`                               | Method-specific handler가 값을 반환하지 않을 때 command/file approval 등의 built-in decision에 사용된다.  |
| Server request | `serverRequests`                            | Server-initiated JSON-RPC request의 typed handler를 설정한다.                                             |
| Live session   | `onSessionCreated`                          | Native thread와 current-turn state를 가진 `injectMessage()`, `interrupt()`, `isActive()` handle을 받는다. |

Per-call override는 AI SDK의 `providerOptions['codex-app-server']`에 둔다. 지원 key는
`threadId`, `resume`, `threadMode`, `includeRawChunks`, `personality`, `effort`, `summary`,
`approvalPolicy`, `sandboxPolicy`, `baseInstructions`, `developerInstructions`, `mcpServers`,
`rmcpClient`, `configOverrides`, `autoApprove`, `serverRequests`, `onSessionCreated`다.

```ts
const result = streamText({
  model: provider('gpt-5.5', { effort: 'medium' }),
  prompt: 'Continue the review.',
  providerOptions: {
    'codex-app-server': {
      threadId: 'thr_existing',
      effort: 'high',
      personality: 'pragmatic',
    },
  },
});
```

일반 precedence는 per-call option > model settings > factory default > Codex default다.
AI SDK top-level `reasoning`은 per-call `effort`보다 낮고 model/factory `effort`보다 높다.
`reasoning: 'provider-default'`는 configured App Server effort 또는 Codex default로 통과시킨다.

### Thread and session lifecycle

| Invocation                                   | Native thread behavior                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `threadId`/`resume` 없이 default `stateless` | Call마다 새 ephemeral thread를 시작하고 반환 metadata에 native `threadId`를 포함한다. |
| `threadMode: 'persistent'`                   | 같은 persistent model instance가 native thread를 기억해 다음 call에서 resume한다.     |
| Per-call `threadId`                          | 해당 native thread를 명시적으로 resume한다.                                           |
| Settings/per-call `resume`                   | `threadId`와 같은 explicit resume target으로 사용한다.                                |

AI SDK v7의 최종 native identity는 `result.finalStep.providerMetadata['codex-app-server'].threadId`
에서 읽는다. `streamText()`는 먼저 `await result.finalStep`을 기다린다. Resume 가능 여부와 history
availability는 Codex가 판정하며 fork는 별도 identity를 만들거나 실패한 native id를 remap하지 않는다.

`onSessionCreated` callback은 native thread에 결합된 `CodexAppServerSession`을 받는다.
`injectMessage()`는 같은 thread에 follow-up turn을 시작하고, `interrupt()`는 active turn이 있을 때
중단을 요청하며 없으면 no-op이다. `isActive()`와 `turnId`는 current turn 상태를 나타낸다. Persistent
mode는 같은 thread의 session을 재사용한다. Provider scope를 끝낼 때는 `await provider.close()` 또는
`dispose()`를 반드시 호출한다.

### Server-initiated requests

Per-call `serverRequests`의 각 handler가 provider/model default의 같은 handler를 덮어쓴다. Handler가
throw하거나 `undefined`를 반환하면 아래 현재 fallback을 사용한다.

| Method                                  | Handler                      | Current fallback                                                                      |
| --------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------- |
| `item/commandExecution/requestApproval` | `onCommandExecutionApproval` | `autoApprove`에 따라 `accept` 또는 `decline`                                          |
| `item/fileChange/requestApproval`       | `onFileChangeApproval`       | `autoApprove`에 따라 `accept` 또는 `decline`                                          |
| `mcpServer/elicitation/request`         | `onMcpElicitation`           | 먼저 `onUnhandled`; 이후 MCP tool approval이고 `autoApprove`면 accept, 아니면 decline |
| `item/tool/requestUserInput`            | `onToolRequestUserInput`     | Empty `answers`                                                                       |
| `item/tool/call`                        | `onDynamicToolCall`          | Empty content와 `success: false`                                                      |
| `account/chatgptAuthTokens/refresh`     | `onAuthRefresh`              | JSON-RPC `-32603`                                                                     |
| Unknown method                          | `onUnhandled`                | JSON-RPC `-32601`                                                                     |

Generated schema에서 method는 알지만 params가 invalid한 request는 original id로 `-32602`를 한 번
보내는 ingress 경로를 사용한다. 다만 once-only active lease, late completion fencing과
`serverRequest/resolved` cleanup은 아직 hardening frontier이므로 현재 handler lifecycle을 최종
concurrency contract로 간주하지 않는다.

### Inputs, outputs, and constraints

- `streamText()`는 `item/agentMessage/delta`를 incremental text로 투영하고, `generateText()`와
  structured output은 같은 App Server lifecycle을 사용한다.
- Image file part는 inline bytes/data URL을 temporary local image로 변환한다. Non-image file,
  `custom`, `reasoning-file` part는 지원하지 않으며 warning 후 skip한다.
- AI SDK-defined tool implementation은 Codex에 전달하지 않는다. Codex-native tool과 MCP server를
  사용하며 in-process tool은 `tool()` + `createSdkMcpServer()`로 노출한다.
- `temperature`, `topP`, `topK`, `maxOutputTokens`, penalties, stop sequence, seed와 meaningful
  `toolChoice`는 Codex turn option이 아니므로 unsupported warning을 낸다.
- JSON response schema는 `turn/start.outputSchema`로 보내지만 OpenAI strict mode는 object의
  모든 property가 `required`에 포함되기를 요구한다. Zod `.optional()` field는 지원되지 않으며
  runtime 400을 만들 수 있다. Sanitizer는 `$schema`, `$id`, `$ref`, `$defs`, `definitions`,
  `title`, `examples`, `default`, `format`, `pattern`을 제거하므로 format/pattern constraint도
  enforcement되지 않는다. Caller는 반환 object를 application boundary에서 다시 validate해야 한다.
- `includeRawChunks`는 raw protocol을 노출하는 debugging option이다. AY-PLE product contract나
  stable event DTO가 아니다.

현재 fork는 Node.js 22+ ESM과 local child process를 전제로 한다. Root package는 temporary
AI SDK `LanguageModelV4` regression surface이며, public compatibility나 semver stability를
약속하지 않는다. `codexPath`, global binary와 caller environment는 tracked exact pin 보증 밖이고,
App Server live gate는 opt-in이다. Production integration, hardened transport terminal,
T0/T0-C/T0.1 conformance는 아직 완료되지 않았다. Runnable cases와 live 환경 변수는
[App Server examples](examples/app-server/README.md)에 둔다.

## Exact Codex pin and generated contract

Package-local default는 `@openai/codex@0.144.4`, official source oracle은 commit
`8c68d4c87dc54d38861f5114e920c3de2efa5876`이다. Global `codex`, `PATH`, `npx`와 caller가
지정한 `codexPath`는 exact-pin verifier가 보증하지 않는다.

Complete experimental generated TypeScript 671개와 JSON Schema 337개를
[`src/app-server/protocol/generated`](src/app-server/protocol/generated)에 package-private로 보존한다.
Generated TypeScript는 upstream byte를 그대로 유지하고 JSON Schema는 object key만 재귀 정렬한다.

```bash
npm run verify:codex-pin
npm run verify:codex-generated

# 의도적으로 tracked snapshot을 다시 생성할 때만 사용
npm run generate:codex-protocol
```

`FP-0003` 이후 sole stdout ingress는 generated schema로 response/error, exact known,
invalid-known, unknown Server request와 notification을 구분한다. `FP-0004a`–`FP-0004c`는 현재
donor graph가 호출하는 여섯 Client method의 outbound request와 successful response를 method별
generated contract로 검증한다. `FP-0005`는 exact pin 밖의 legacy wire overlay와 handwritten
validator를 제거했다. 상세 범위와 supersede 관계는 [patch ledger](upstream/PATCHES.md)가 소유한다.

## Native lifecycle extraction status

`FP-0006a`–`FP-0006f`는 donor의 App Server mechanics를 다시 발명하지 않고 다음 native seam을
추출·축소했다.

| Seam                           | Current guarantee                                                                                           | 아직 보장하지 않는 것                      |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `AppServerTurnEventRouter`     | thread filter, notification-first staging, matching FIFO replay, original Server `RequestId` 전달           | bounded staging, once-only response lease  |
| generated lifecycle views      | schema-valid original response identity와 native `thread.id` / `turn.id`                                    | public native facade                       |
| `AppServerTurnResultCollector` | matching completed item, latest usage, authoritative `turn/completed`, first-party final response selection | failed-turn public policy, actual-child T0 |
| generated item view            | exact discriminator/identity와 original item object 보존                                                    | 모든 item의 product projection             |

`FP-0007a`는 이 App Server graph를 건드리지 않고 별도의 process-per-call Exec source, aliases,
validation, tests와 runnable examples만 제거했다. App Server AI SDK adapter는 native
`client → thread → turn handle → result` facade가 같은 orchestration regression을 인수하기 전까지
남긴다.

## Development commands

Fork는 root workspace와 분리되어 있으므로 vendor directory에서 별도로 dependency를 설치하고
검증한다.

```bash
npm ci --prefix vendor/ai-sdk-provider-codex-cli

npm run validate --prefix vendor/ai-sdk-provider-codex-cli
npm run validate:docs --prefix vendor/ai-sdk-provider-codex-cli
```

`validate`는 다음 non-live gate를 순서대로 실행한다.

1. exact Codex pin과 generated snapshot verification
2. build와 private root/package boundary verification
3. strict TypeScript typecheck
4. Prettier와 ESLint
5. Vitest unit/fake regression

현재 `FP-0007a` checkpoint의 non-live suite는 24개 test file에서 357개 test가 통과하고,
real Codex child를 시작하는 smoke test 1개는 opt-in 상태로 skip된다. Live example gate는 별도다.

```bash
# package-local Codex child를 실제로 시작한다.
npm run validate:examples:app-server --prefix vendor/ai-sdk-provider-codex-cli

# non-live gate와 live example gate를 함께 실행한다.
npm run validate:full --prefix vendor/ai-sdk-provider-codex-cli
```

Live gate는 해당 semantic patch가 live behavior를 바꾸거나 conformance evidence가 필요할 때만
실행하고, 결과 또는 비실행 이유를 [UPSTREAM.md](UPSTREAM.md)에 기록한다.

## App Server regression examples

[`examples/app-server`](examples/app-server/README.md)는 현재 App Server AI SDK adapter를 통과하는
runnable regression/example set다. Fork의 production API 약속이 아니며 native facade가 생기면
같은 observable lifecycle을 보존하는 쪽으로 이관하거나 제거한다.

```bash
npm run build --prefix vendor/ai-sdk-provider-codex-cli
node vendor/ai-sdk-provider-codex-cli/examples/app-server/basic-usage.mjs
```

실행하려면 Codex authentication이 준비되어 있어야 한다. Persistent provider를 사용하는 script는
반드시 `await provider.close()`로 child lifecycle을 끝내야 한다.

## Next frontier

다음 semantic checkpoint는 first-party Python external client의
`CodexClient → Thread → TurnHandle → TurnResult` 책임 분리를 참고해 package-private native App Server
facade를 만들고, 현재 controller/request-context/result lifecycle을 그 facade 뒤로 옮기는 것이다.
Native facade-level fake regression이 현재 App Server orchestration oracle을 대체한 뒤에만
App Server provider/emitter/projection과 남은 `@ai-sdk/*`, `ai`, Zod surface를 제거한다. 이 gate는
full T0가 아니다.

그 뒤 transport hardening은 safe directional `RequestId`, raw-byte framing, cancel-aware bounded
writer, Server request once-only lease, disconnect settlement와 close/kill/reap 순서로 진행한다.
T0/T0-C/T0.1 unit·actual-child fake와 필요한 live conformance는 hardened transport 위에서 별도로
완료한다.

## License and provenance

Donor source와 AY-PLE fork code는 원본 [MIT license](LICENSE)를 유지한다. Generated App Server
artifact는 OpenAI Codex에서 파생되며 별도의 [Apache License 2.0](upstream/openai-codex/LICENSE)과
[NOTICE](upstream/openai-codex/NOTICE)를 보존하고 package roster에도 포함한다.

Donor release의 과거 public behavior와 release note는 [CHANGELOG.md](CHANGELOG.md)와 immutable
[`references/ai-sdk-provider-codex-cli`](../../references/ai-sdk-provider-codex-cli)에 남아 있다.
