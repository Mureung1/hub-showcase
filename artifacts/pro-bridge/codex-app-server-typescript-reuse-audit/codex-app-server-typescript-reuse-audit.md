# Codex App Server TypeScript client 재사용 가능성 심층 조사

- 조사 기준일: 2026-07-14 (Asia/Seoul)
- AY-PLE 기준: [`swh3467/hub@f462ae7`](https://github.com/swh3467/hub/tree/f462ae747a0dfa4b8da51cc1708b9e54083feca4)
- Codex npm pin: `@openai/codex@0.144.0`
- exact upstream oracle: [`openai/codex@7678224`](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d)
- 조사 방식: source, tests, package exports, dependency metadata, commit/version history를 immutable SHA에 고정해 읽었다. 이 조사에서 외부 프로젝트의 테스트를 실행하지 않았으므로, “tests inspect됨”과 “tests pass함”을 구분한다.

## 판정 규칙

- **implemented**: 해당 계약을 수행하는 source와 그 동작을 검증하는 test를 모두 확인했다. 매트릭스의 `I(E…)`는 아래 evidence ledger에 source/test 쌍이 있다.
- **partial**: source는 있으나 계약 일부가 빠졌거나, test가 없거나, AY-PLE 요구보다 약하다.
- **absent**: 해당 메커니즘이 없다.
- **conflicting**: 후보의 공개 abstraction 또는 lifecycle이 AY-PLE canonical contract와 구조적으로 충돌한다.
- **not verified**: 접근 가능한 source/test만으로 판정할 수 없다.

---

# 1. Executive verdict

**`extract/fork existing core`**를 선택한다. `ai-sdk-provider-codex-cli@fc4a97f`의 package-private App Server core는 persistent child, initialize handshake, sole reader, serialized writer, per-thread routing, notification-first staging, authoritative `turn/completed`를 실제 source와 tests로 입증해 greenfield 대비 상당한 재사용 가치가 있다. 그러나 npm public API는 AI SDK `LanguageModelV4` provider만 안정적으로 노출하고 native thread/turn/item lifecycle을 generic stream으로 축약하므로 그대로 채택할 수 없다. 또한 exact `RequestId`, inbound once-only authority, timeout 후 queued-write 취소, raw-byte framing, bounded state, exact 0.144 generated schema, close/reap가 빠져 있어 좁은 hardening fork가 필요하다. AY-PLE은 ADR 0010의 `Connection → Runtime` 계약을 계속 소유하되, 그 아래에 provenance가 고정된 extracted core를 숨기고 1–2일 compatibility spike를 통과시킨 뒤 구현 ticket을 재편해야 한다.

---

# 2. Candidate screening table

| Candidate | Actual integration type | Language | Codex version policy | Reusable surface | License | Maintenance at audit | Deep-dive? |
|---|---|---:|---|---|---|---|---|
| OpenAI App Server + Rust client/test client/TUI [`7678224`](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs) | official protocol/source oracle; Rust in-process/remote clients and stdio test harness | Rust | exact AY-PLE upstream commit | semantics/tests can be ported; not a TS dependency | Apache-2.0 | official active monorepo | Yes, baseline |
| OpenAI Python SDK exact pin [`7678224`](https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python) | external stdio App Server client | Python | package pins `openai-codex-cli-bin==0.137.0a4`, not 0.144.0 | sidecar or semantic port | Apache-2.0 | official, but runtime pin lags | Yes |
| OpenAI Python SDK current main [`4aa950d`](https://github.com/openai/codex/tree/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/python) | richer official external client | Python | still pins `0.137.0a4` in inspected main | sidecar or semantic port | Apache-2.0 | active | Yes, upgrade observation |
| OpenAI TypeScript SDK current main [`4aa950d`](https://github.com/openai/codex/tree/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/typescript) | `codex exec --experimental-json` wrapper | TypeScript | SDK/bundled CLI policy, not an App Server contract | no bidirectional core | Apache-2.0 | active | Screened; rejected |
| `ai-sdk-provider-codex-cli` [`fc4a97f`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/tree/fc4a97f518af6eb380e9ecd67fa78940bffdf155) | AI SDK v7 provider backed by real persistent App Server | TypeScript | optional `@openai/codex ^0.144.0`, minimum 0.144; not exact | strong package-private App Server core; public API is provider only | MIT | v2.1.1 released 2026-07-10; rapid recent protocol work | **Yes, deepest** |
| `slopus/happy` [`3f161de`](https://github.com/slopus/happy/tree/3f161de70541b1cedaf0b7547ed70889d8dae22d) | application-local mobile/remote-control bridge | TypeScript | probes CLI; accepts recent `codex` on PATH | private monolithic client in large CLI package | MIT | active HEAD | Yes |
| `K9i-0/ccpocket` [`159153b`](https://github.com/K9i-0/ccpocket/tree/159153bdfcd89694180e28b2134afb627f9aae14) | application-local bridge plus optional WebSocket/shared server | TypeScript | unpinned `codex` on PATH | bridge-local transport/process classes | MIT | active; audited HEAD dated 2026-07-14 | Yes |
| `jakemor/kanna` [`775a1b6`](https://github.com/jakemor/kanna/tree/775a1b6bc3bb87557bd15bf83ba30c657fdf861c) | Bun application-local App Server harness | TypeScript | unpinned CLI | single-session app code; no library export | MIT | active snapshot | No |
| `Gan-Xing/CodexBridge` / `codex-native-api` [`92166e0`](https://github.com/Gan-Xing/CodexBridge/tree/92166e02f4c7c8fcc0d223e894dd33664db754ea) | provider bridge/API daemon with real App Server client | TypeScript | unpinned CLI | root package does not export `CodexAppClient`; monolithic private implementation | **NOT VERIFIED** | active snapshot | Yes |
| `0xcaff/codex-web` [`888692f`](https://github.com/0xcaff/codex-web/tree/888692f7d885118c6a92bbaf60cf2121f5947adf) | patched/repackaged desktop/browser frontend and proxy | TypeScript | product-bundled/current | not a reusable native client library | MIT | active snapshot | No |
| `nshkrdotcom/codex_sdk` [`3d46c1a`](https://github.com/nshkrdotcom/codex_sdk/tree/3d46c1a078e2f65728043afd321d505e8415fed2) | reusable App Server SDK, but Hex/BEAM ecosystem | Elixir | source-defined/unverified against 0.144 | reusable in Elixir, not TS | MIT | active snapshot | No; language mismatch |
| GitHub `codex-app-server` topic | mixed gateways, adapters, harnesses and SDKs | mixed | mixed | no additional TS core stronger than Tier 1 was found in screening | mixed | mixed | Screen only |

## Screening conclusion

The existence of many “Codex” integrations does not imply that they solve AY-PLE’s problem. The structurally relevant subset is the set that owns a persistent bidirectional App Server channel, tracks native thread/turn scope, and answers inbound Server requests; most topic entries are gateways, application-local bridges, `exec --json` wrappers, PTY wrappers, or product frontends. Among TypeScript candidates, only `ai-sdk-provider-codex-cli` separates enough RPC/session/router machinery to justify extraction; the product candidates contain useful race/process ideas but are not better cores.

---

# 3. AY-PLE canonical baseline

AY-PLE’s target must not be confused with the current legacy classes. ADR 0010 assigns child process, sole ingress, request routing, serialized writing and pending settlement to Connection, while Runtime owns native thread/turn/item convergence and bounded per-conversation state; it explicitly rejects extending the legacy transport/host as the target architecture ([ADR 0010, lines 15–36](https://github.com/swh3467/hub/blob/f462ae747a0dfa4b8da51cc1708b9e54083feca4/docs/adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md#L15-L36)). The active spec keeps `CodexConversationRuntime` public and `CodexAppServerConnection` package-private behind a one-way dependency ([spec, lines 11–37](https://github.com/swh3467/hub/blob/f462ae747a0dfa4b8da51cc1708b9e54083feca4/docs/specs/2026-07-14-codex-native-runtime-foundation.md#L11-L37)).

This seam remains valid independently of who supplies the implementation. The reuse decision changes **implementation ownership below the seam**, not the direction of the seam.

---

# 4. Deep source audit

## 4.1 Tier 0 — exact official baseline

### 4.1.1 App Server and first-party Rust clients

The exact-pin protocol represents `RequestId` as a true tagged union of string or signed integer, rather than JavaScript’s undifferentiated `number` ([`rpc.rs`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/rpc.rs#L1-L110)). The official test client starts a real stdio child, owns its stdin/stdout, keeps a pending-notification deque while a response is awaited, and completes `initialize` with `initialized` ([test client spawn/queue, lines 1540–1597](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1540-L1597), [handshake, lines 1647–1690](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client/src/lib.rs#L1647-L1690)). The TUI keeps per-thread event stores and pending App Server requests, resolves a pending request by removing it once, and separately removes it when `serverRequest/resolved` arrives ([thread event storage](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L35-L150), [request resolution](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L65-L215)).

The App Server responds to `thread/start` and also emits `thread/started`; the client must not choose one as the sole truth source. `turn/start` admits input and returns a native turn, while subsequent items and `turn/completed` arrive asynchronously ([thread processor](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1310-L1380), [turn processor](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L380-L520)).

**Reuse implication:** Rust is the correctness oracle and test-source donor, not a direct TS dependency. Reusing it through FFI or a Rust sidecar would introduce another process/binary boundary without reducing AY-PLE’s TypeScript integration work.

### 4.1.2 Official TypeScript SDK current main

The official TS SDK is not a stateful App Server client. `Codex` creates executions/threads around an `Exec` runner, and the runner spawns `codex exec --experimental-json`, writes the prompt, closes stdin, and consumes one execution stream ([`codex.ts`](https://github.com/openai/codex/blob/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/typescript/src/codex.ts#L1-L170), [`exec.ts`](https://github.com/openai/codex/blob/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/typescript/src/exec.ts#L1-L210)). It does not own inbound Server requests, same-ID replies, persistent multi-thread demultiplexing, or App Server initialize/initialized.

**Verdict:** structurally conflicting with the target. Its name “SDK” is not evidence of App Server equivalence.

### 4.1.3 Official Python SDK at the exact commit

The exact-commit Python package is a real external stdio App Server client, with a reader thread, a writer lock, request waiters, per-thread locks and early notification staging. However, its package metadata pins `openai-codex-cli-bin==0.137.0a4`, not AY-PLE’s 0.144.0 ([`pyproject.toml`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/pyproject.toml#L1-L55)). Its router keys waiters with `str(id)`, which collapses JSON-RPC string ID `"1"` and numeric ID `1`, and its pending notification collections are not bounded ([`_message_router.py`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/_message_router.py#L1-L250)).

The client uses text-mode stdio, a single reader thread, a lock around writes, and terminate/wait/kill close logic ([`client.py`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L1-L220), [`client.py` lifecycle](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/src/openai_codex/client.py#L380-L865)). The critical T0-C conflict is that inbound approval handling is invoked synchronously from the reader path; a blocked handler prevents unrelated thread ingress from being dispatched. Router tests cover interleaved registered turns and early replay, but not AY-PLE’s nonblocking A/B approval scenario ([`test_message_router.py`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python/tests/test_message_router.py#L1-L320)).

### 4.1.4 Official Python SDK current main — upgrade observation

Current inspected main adds a richer generated method/type registry and keeps early-turn routing, but the package still pins runtime `0.137.0a4` and the reader still synchronously calls the Server request handler ([current `pyproject.toml`](https://github.com/openai/codex/blob/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/python/pyproject.toml#L1-L55), [current router](https://github.com/openai/codex/blob/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/python/src/openai_codex/_message_router.py#L1-L260), [current client handler path](https://github.com/openai/codex/blob/4aa950d456c6c90174d3269d7eaab4a2823e5889/sdk/python/src/openai_codex/client.py#L620-L940)).

**Sidecar conclusion:** it is useful semantic source, but not a production dependency for this pin. Overriding its binary pin and making handlers nonblocking would itself be a fork, while retaining Python/Pydantic/wheel supply-chain and operations cost.

---

## 4.2 Tier 1 — `ai-sdk-provider-codex-cli`

### Immutable audit point

- Commit: [`fc4a97f518af6eb380e9ecd67fa78940bffdf155`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/commit/fc4a97f518af6eb380e9ecd67fa78940bffdf155)
- `package.json` version: `2.1.1`
- Release change recorded at 2026-07-10 in that commit.
- Tests were inspected, not executed in this audit.

### Package exports and dependency graph

The package is ESM, requires Node `>=22`, declares MIT, depends on AI SDK provider/util packages and `jsonc-parser`, has Zod 4 as a peer, and treats `@openai/codex ^0.144.0` as optional rather than exact ([`package.json`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/package.json#L1-L90)). The public root exports the provider-facing surface; the build has a root entry, while `src/app-server/index.ts` exposes core classes only inside the source tree ([public `src/index.ts`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/index.ts#L1-L100), [`tsup.config.ts`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/tsup.config.ts#L1-L50), [private app-server index](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/index.ts#L1-L80)).

Consequences:

1. **Public dependency adoption cannot import `AppServerRpcClient` through a supported subpath.** Deep-importing source/dist internals is outside the exports contract and may fail because the build bundles from the root entry.
2. The RPC core can be made independent of Vercel AI SDK only by extraction or upstream refactoring. The present source imports AI SDK error/types/utilities in the RPC and stream layers.
3. AY-PLE’s ES2022/NodeNext ESM setup is technically compatible with Node 22, but adopting the public package would add AI SDK/Zod semantics and version coupling that AY-PLE does not otherwise need.

### Module topology

```text
public createCodex/provider
  └─ app-server/language-model.ts         AI SDK LanguageModelV4 projection
       ├─ rpc/client.ts                    child, JSON-RPC, writer, request contexts
       ├─ session.ts                       thread session convenience state
       └─ stream/turn-stream-controller.ts lifecycle orchestration
            └─ stream/router.ts            scope filtering + early staging
                 ├─ router-notification-handlers.ts
                 └─ router-server-request-handlers.ts
       └─ protocol/types.ts + validators.ts manual/adapted protocol model
```

### Lifecycle flow

1. `ensureReady()` coalesces concurrent initialization.
2. `startAndInitialize()` spawns `codex app-server --listen stdio://`, installs one `readline.Interface`, sends `initialize`, then sends `initialized` ([RPC client spawn/handshake](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L444-L572)).
3. Client requests enter a pending map and a promise-based write queue ([request path](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L234-L273), [writer](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L1038-L1070)).
4. `TurnStreamController` subscribes its router and registers request context before `turn/start`; after the response it binds the context and router to the native turn ID ([controller](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/turn-stream-controller.ts#L143-L249), [context-before-start](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/turn-stream-controller.ts#L291-L307)).
5. The router stages turn-scoped notifications and Server requests that arrive before the turn response, then flushes only matching events after binding ([router](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/router.ts#L88-L194)).
6. `turn/completed` resolves the controller’s turn promise and closes the stream; AgentMessage delta/completion is accumulated separately ([notification handlers](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/router-notification-handlers.ts#L87-L214)).

### What source and tests establish

- Persistent child, initialize/initialized, thread RPCs: source plus fake-child tests ([test initialization](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L163-L176)).
- Same original Server request ID is used for approval/fallback responses: source dispatch and tests ([server request dispatch](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L861-L1025), [same-ID tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L267-L346)).
- Writer calls are serialized and await `drain`: source plus backpressure test ([writer](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L1038-L1070), [backpressure test](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L1375-L1405)).
- Per-thread locks are independent and cleaned: source plus tests ([lock](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L392-L412), [lock tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L740-L860)).
- Notification-first staging and scope filtering are explicitly tested with fake events ([router tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-notification-router.test.ts#L166-L281)).
- AgentMessage/item projection and `turn/completed` finalization are tested, but through AI SDK stream parts ([router tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-notification-router.test.ts#L20-L160), [controller test](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-turn-stream-controller.test.ts#L138-L156)).
- Crash/reconnect and stderr-tail behavior have extensive fake-process tests; the optional integration smoke test starts a real Codex child but does not force the AY-PLE race matrix ([RPC crash tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L1018-L1374), [integration smoke](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-integration.smoke.test.ts#L1-L260)).

### Detailed answers to the Tier 1 questions

| Question | Finding |
|---|---|
| Public exports | App Server core is not a supported package export; public root is provider-facing. |
| Core without Vercel AI SDK | Not by dependency alone. Extraction can retain RPC/session/router ideas, but AI SDK imports/projection must be removed or shimmed. |
| AI SDK v7 lifecycle distortion | Yes for AY-PLE’s canonical layer. Native IDs are placed in provider metadata/options and native items become generic content/tool parts; this is acceptable as a product adapter, not as Runtime truth. |
| Node/ESM/peers | Node 22 and ESM are compatible with AY-PLE; AI SDK, Zod and provider utility coupling are unnecessary dependency surface. |
| Native identity | Thread and turn IDs are preserved internally. Item IDs are preserved when present, but handlers call `generateId()` as a fallback, so strict native identity is only partial. |
| One active turn per thread | **Not enforced for the full active lifetime.** The per-thread lock serializes `turn/start` calls only until the response; `AppServerSession` tracks an `active` flag but `injectMessage()` does not reject a second active turn. It relies on upstream behavior or caller discipline. |
| Multiple thread concurrency | Yes at core level: thread-specific locks and contexts allow A/B independence over one process. |
| Notification-first | Implemented: subscription/context registration occurs before request, and early events are staged until turn ID binding. |
| Early staging bounded | No. The router arrays/maps are not byte/count bounded. |
| Process loss and pending RPC | Pending RPCs are rejected after exit/close or a 120 ms stderr-tail cap. **Inference:** a turn whose `turn/start` response already arrived may still wait forever for `turn/completed`, because crash cleanup does not visibly settle the controller’s independent completion promise. |
| Same-ID Server response | Yes. String or number IDs are echoed. |
| Exactly once authority | No. There is no active inbound-ID lease/map; a duplicate Server request can invoke the handler and emit another response. |
| Approval before `turn/start` response | Supported when thread scope selects a unique pending request context; router also stages the request. |
| Duplicate/late `serverRequest/resolved` | Absent; method is not registered for cleanup. |
| Terminal/response race | Partially handled by bounded `completedTurnIds` and bind-time completed check. Duplicate/late lifecycle idempotence is not a complete native runtime contract. |
| Timeout then late queued write | **Bug-shaped gap:** timeout removes the pending map entry but does not cancel a frame already queued on `writeQueue`; that frame can be written later after backpressure clears. |
| Serialized stdin | Yes, one promise chain, with `drain` handling. |
| Sole stdout reader | Yes, one `readline.Interface`. |
| Framing | String/readline framing, not raw bytes; replacement UTF-8 decoding and unbounded pre-LF accumulation remain possible. |
| Bounded queues/state | `completedTurnIds` is bounded; writer chain, early staging and most retained protocol state are not byte/count bounded. |
| Close/reap | Explicit close closes readline and sends SIGTERM but does not wait for direct-child exit, escalate, or prove reap. Unexpected exit waits briefly for stderr `close`, not a bounded stdout/dispatch drain. |
| Long-term raw retention | Early staging retains raw params; optional raw chunks can surface protocol payloads through the AI SDK stream. Stderr tail is length-limited/sanitized but not secret-redacted. |
| Tests force child interleaving | Unit tests use PassThrough fake children and do force some event order/backpressure. The real-child smoke test is opt-in and does not force A/B approval, duplicate, EOF, descendant-held-pipe or timeout-after-queue races. |

### Protocol/schema fidelity

The project’s protocol types and Zod validators are manually adapted and contain compatibility comments for older protocol shapes; the compatibility fixture targets 0.142.5 rather than exact 0.144.0 ([types](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/protocol/types.ts#L1-L260), [validators](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/protocol/validators.ts#L1-L260), [compat test](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-protocol-compat.test.ts#L1-L260)). This is the most important reason not to treat it as a conformance authority.

### Dependency/fork feasibility

MIT permits extraction/forking subject to notice. The core is small enough to preserve upstream file ancestry and periodically diff, while AY-PLE can replace protocol types, public projection, process owner and tests. A fork should be a source snapshot with an upstream manifest, not an npm deep import.

**Tier 1 verdict:** best extraction seed, not a direct dependency.

---

## 4.3 Tier 2 deep dives

### 4.3.1 `slopus/happy`

The client is a real App Server implementation, but it is embedded in a large CLI/mobile product package and is not a public subpath export ([package](https://github.com/slopus/happy/blob/3f161de70541b1cedaf0b7547ed70889d8dae22d/packages/happy-cli/package.json#L1-L130)). It owns one `_threadId`, one `_turnId`, one pending turn and application-specific event/permission joins ([client state](https://github.com/slopus/happy/blob/3f161de70541b1cedaf0b7547ed70889d8dae22d/packages/happy-cli/src/codex/codexAppServerClient.ts#L215-L260)).

Strengths:

- initialize/initialized, pending-request rejection on exit, same-ID approval responses and deterministic unknown request response.
- practical reconnect/resume and SIGTERM→SIGKILL fallback.
- product tests cover mapping, resume/restart and approval IDs.

Conflicts/gaps:

- direct `stdin.write`, no serialized/backpressure-aware writer, numeric client IDs only and readline/string framing ([transport/request path](https://github.com/slopus/happy/blob/3f161de70541b1cedaf0b7547ed70889d8dae22d/packages/happy-cli/src/codex/codexAppServerClient.ts#L640-L760), [request path](https://github.com/slopus/happy/blob/3f161de70541b1cedaf0b7547ed70889d8dae22d/packages/happy-cli/src/codex/codexAppServerClient.ts#L1240-L1360)).
- singleton thread/turn state makes T0-C multi-thread independence structurally incompatible without a rewrite.
- `item/completed` with `final_answer` can synthesize turn completion before authoritative `turn/completed`, conflicting with AY-PLE’s terminal authority ([notification handling](https://github.com/slopus/happy/blob/3f161de70541b1cedaf0b7547ed70889d8dae22d/packages/happy-cli/src/codex/codexAppServerClient.ts#L260-L590)).
- same-ID response exists, but there is no once-only lease; close does not await/reap.
- tests are mocked and do not cover writer races, duplicate/late Server request races or A/B progression ([tests](https://github.com/slopus/happy/blob/3f161de70541b1cedaf0b7547ed70889d8dae22d/packages/happy-cli/src/codex/codexAppServerClient.test.ts#L1-L1773)).

**Verdict:** useful implementation anecdotes only; not a better extraction seed.

### 4.3.2 `K9i-0/ccpocket`

`ccpocket` separates a `CodexTransport` from `CodexProcess`, supports local stdio and shared/external WebSocket modes, and retains original Server request IDs ([transport](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-transport.ts#L1-L317), [process state](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L243-L320)). It implements initialize, same-ID approvals/user input and `serverRequest/resolved` cleanup ([initialize](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L1379-L1391), [server requests](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L1816-L1995), [resolved cleanup](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L2743-L2776)).

Critical gaps:

- stdio writes are direct; WebSocket offline queue is unbounded; stop sends SIGTERM and drops the child reference without wait/reap.
- client requests have no intrinsic timeout. Some callers use `Promise.race`, which abandons the waiter while leaving the underlying pending RPC alive ([request](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L2664-L2679), [caller-side race](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L1488-L1518)).
- in shared-server mode, an explicit thread notification received before the `thread/start` response is deliberately classified as foreign and dropped. That directly conflicts with notification-first convergence ([early-drop policy](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L2191-L2205)).
- each `CodexProcess` is a singleton thread projection; a shared server may host many instances, but there is no reusable one-connection/multi-thread Runtime boundary.
- tests use fake transports and verify same-ID and cleanup, but do not force duplicate/late, backpressure, reap or T0-C handler blocking ([tests](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.test.ts#L1-L2726)).

**Verdict:** transport abstraction and `serverRequest/resolved` cleanup are useful references; the early-drop and singleton design make it inferior to Tier 1 for extraction.

### 4.3.3 `Gan-Xing/CodexBridge` / `codex-native-api`

The repository contains a substantial real App Server client and a separately named `codex-native-api` package. However, the package root does not export `CodexAppClient`; the tests import the sibling application implementation rather than the package copy ([package](https://github.com/Gan-Xing/CodexBridge/blob/92166e02f4c7c8fcc0d223e894dd33664db754ea/packages/codex-native-api/package.json#L1-L80), [root index](https://github.com/Gan-Xing/CodexBridge/blob/92166e02f4c7c8fcc0d223e894dd33664db754ea/packages/codex-native-api/src/index.ts#L1-L100), [test import](https://github.com/Gan-Xing/CodexBridge/blob/92166e02f4c7c8fcc0d223e894dd33664db754ea/test/providers/codex/app_client.test.ts#L1-L15)). The package requires Node 24 and TypeScript 6 and carries a broad API-daemon dependency surface. A repository license file was not found in the audited snapshot, so vendoring permission is **not verified**.

Strengths:

- real stdio/WebSocket client, initialize, multiple thread IDs passed as method arguments, original approval response ID, turn polling/fallback logic.
- strongest explicit process termination helper among Tier 2, including TERM, bounded wait, KILL and Windows tree handling.

Gaps/conflicts:

- direct `stdin.write`, string buffering, manual large protocol model and `String(message.id)` pending lookup, which collapses string/numeric ID identity ([transport/RPC](https://github.com/Gan-Xing/CodexBridge/blob/92166e02f4c7c8fcc0d223e894dd33664db754ea/packages/codex-native-api/src/codex_app_client.ts#L1080-L1275)).
- `startTurn()` attaches its result wait after `turn/start` response; it relies heavily on `thread/read` polling/session recovery instead of a clean notification-first convergence boundary ([turn flow](https://github.com/Gan-Xing/CodexBridge/blob/92166e02f4c7c8fcc0d223e894dd33664db754ea/packages/codex-native-api/src/codex_app_client.ts#L500-L710)).
- known approvals are retained, but unknown Server requests are emitted without an immediate deterministic same-ID fallback.
- unexpected exit does not clearly reject every pending RPC at the exit edge; tests do not import the package implementation itself.

**Verdict:** process cleanup and polling diagnostics are references only. Export, license, protocol and test-authority gaps disqualify it as a fork base.

### 4.3.4 Remaining screened products

- **Kanna:** real App Server, but a Bun app-local single-session server module; no reusable package seam ([source](https://github.com/jakemor/kanna/blob/775a1b6bc3bb87557bd15bf83ba30c657fdf861c/src/server/codex-app-server.ts#L1-L500)).
- **codex-web:** product frontend/proxy/repackaging rather than a native client library ([README](https://github.com/0xcaff/codex-web/blob/888692f7d885118c6a92bbaf60cf2121f5947adf/README.md#L1-L200)).
- **codex_sdk:** reusable directionally, but Elixir/BEAM and therefore not a TypeScript extraction candidate ([`mix.exs`](https://github.com/nshkrdotcom/codex_sdk/blob/3d46c1a078e2f65728043afd321d505e8415fed2/mix.exs#L1-L100)).


---

# 5. Contract comparison matrix

## 5.1 Evidence ledger for `implemented`

The matrix deliberately under-claims. A source-only feature is `partial`, even when it likely works.

| Evidence | Source | Test |
|---|---|---|
| **O1** exact official ID and once resolution | [`RequestId` string/integer union](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/rpc.rs#L1-L110); [TUI pending request remove-and-respond](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L65-L215) | [same-ID approval/user/MCP request tests in the same module](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_requests.rs#L570-L900) |
| **B1** spawn and handshake | [`startAndInitialize`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L444-L572) | [`initializes and performs requests`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L163-L176) |
| **B2** sole reader, response pop-once | [`handleLine`, response/error handlers](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L709-L801) | [request and notification routing tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L163-L231) |
| **B3** serialized writer/backpressure | [`writeMessage`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L1029-L1070) | [backpressure/drain test](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L1375-L1405) |
| **B4** inbound classification and same-ID fallback | [`handleServerRequest`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L861-L1025) | [same-ID approval/fallback tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L267-L346) |
| **B5** pending settlement on close/crash | [close, exit, crash settlement](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L414-L438), [crash state/settlement](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L479-L674) | [close/crash/reconnect tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L1018-L1374) |
| **B6** per-thread admission independence | [`withThreadLock`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L392-L412) | [thread-lock cleanup/independence tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L740-L860) |
| **B7** response/notification either-order convergence | [context-before-start and bind-after-response](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/turn-stream-controller.ts#L143-L249); [early staging](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/router.ts#L88-L194) | [early, foreign and matching event tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-notification-router.test.ts#L166-L281) |
| **B8** scope-local routing/per-thread behavior | [router scope logic](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/router.ts#L88-L194); [request context selection](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/rpc/client.ts#L804-L856) | [thread filtering/context tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-notification-router.test.ts#L166-L281), [RPC context tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-rpc-client.test.ts#L360-L740) |
| **B9** AgentMessage projection and authoritative terminal | [item/AgentMessage and `turn/completed`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/stream/router-notification-handlers.ts#L87-L214) | [notification projection tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-notification-router.test.ts#L20-L160); [controller completion test](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-turn-stream-controller.test.ts#L138-L156) |
| **B10** reusable session/multi-turn shape | [`AppServerSession`](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/app-server/session.ts#L50-L155) | [session/controller lifecycle tests](https://github.com/ben-vargas/ai-sdk-provider-codex-cli/blob/fc4a97f518af6eb380e9ecd67fa78940bffdf155/src/__tests__/app-server-turn-stream-controller.test.ts#L1-L250) |
| **C1** `serverRequest/resolved` cleanup | [`handleServerRequestResolved`](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.ts#L2743-L2776) | [resolved cleanup tests](https://github.com/K9i-0/ccpocket/blob/159153bdfcd89694180e28b2134afb627f9aae14/packages/bridge/src/codex-process.test.ts#L2150-L2300) |

Abbreviations: `OR` official Rust/TUI exact-pin oracle; `OP` official Python exact commit; `OT` official TS current SDK; `BV` ben-vargas private core; `H` happy; `CP` ccpocket; `CB` CodexBridge. `I` implemented, `P` partial, `A` absent, `C` conflicting, `NV` not verified.

## 5.2 Connection responsibility

| # | Contract | OR | OP | OT | BV | H | CP | CB |
|---:|---|---|---|---|---|---|---|---|
| 1 | Spawn + initialize/initialized | P | P | C | **I(B1)** | P | P | P |
| 2 | Sole stdout reader | P | P | C | **I(B2)** | P | P | P |
| 3 | Serialized stdin writer | P | P | A | **I(B3)** | A | A | A |
| 4 | Direction-aware exact RequestId routing | **I(O1)** | C | A | P | P | P | C |
| 5 | Preserve `string | number` type/value | **I(O1)** | C | A | P | C | P | C |
| 6 | Client active map; first response remove-once | P | P | A | **I(B2)** | P | P | P |
| 7 | Unknown/late response disposition | P | P | A | P | P | P | P |
| 8 | Inbound Server request classification | **I(O1)** | P | A | **I(B4)** | P | P | P |
| 9 | Same-ID Server response | **I(O1)** | P | A | **I(B4)** | P | P | P |
| 10 | Once-only response authority | **I(O1)** | A | A | A | A | A | A |
| 11 | Disconnect current pending settlement | P | P | A | **I(B5)** | P | P | P |
| 12 | Unexpected exit / stdout EOF / stdin failure | P | P | A | P | P | P | P |
| 13 | Close, signal, direct-child reap | P | P | A | P | P | A | P |
| 14 | Generated schema/runtime validation | P | P | A | C | A | A | A |
| 15 | Multiple concurrent native threads | P | P | A | **I(B6/B8)** | C | C | NV |

### Connection matrix interpretation

- `BV` is the only TypeScript candidate with source+test evidence for the central reusable mechanics: process/handshake, one reader, serialized writer, request maps, same-ID fallback, crash settlement and per-thread routing.
- Its `RequestId` handling is only partial because JSON numbers are parsed into JS `number`; exact i64 lexical/value preservation is not established.
- `OR` is the only inspected implementation with a true string/integer ID type and explicit remove-once Server request authority.
- None of the community TS clients meets AY-PLE’s complete close/reap, raw framing, exact generated schema or inbound once-lease contract.

## 5.3 Conversation Runtime responsibility

| # | Contract | OR | OP | OT | BV | H | CP | CB |
|---:|---|---|---|---|---|---|---|---|
| 1 | Native ThreadId/TurnId/ItemId | P | P | C | P | P | P | P |
| 2 | `thread/start` response authority | P | P | C | **I(B2/B10)** | P | P | P |
| 3 | `turn/start` response/notification either-order | P | P | C | **I(B7)** | P | C | P |
| 4 | Notification-first early staging | P | P | A | **I(B7)** | A | C | A |
| 5 | Thread/turn/item scope-local routing | P | P | C | **I(B8)** | C | P | P |
| 6 | AgentMessage accumulation/completion | P | P | P | **I(B9)** | P | P | P |
| 7 | Authoritative `turn/completed` | P | P | C | **I(B9)** | C | P | P |
| 8 | Per-thread independence | P | C | A | **I(B6/B8)** | C | C | NV |
| 9 | Duplicate/late notification idempotence | P | P | A | P | P | P | P |
| 10 | Thread persistence/read/resume | P | P | P | P | P | P | P |
| 11 | Approval request native scope projection | **I(O1)** | P | A | **I(B4/B8)** | P | P | P |
| 12 | `serverRequest/resolved` cleanup | **I(O1)** | A | A | A | A | **I(C1)** | A |
| 13 | Multi-turn extensibility | P | P | P | **I(B10)** | P | P | P |
| 14 | Streaming activity projection | P | P | P | **I(B9)** | P | P | P |

### Runtime matrix interpretation

`BV` already solves the hardest event-ordering shape, but its public AI SDK projection is not AY-PLE Runtime. The fork should retain router/controller ordering mechanics while replacing the output model with native `ThreadId`, `TurnId`, `ItemId`, approval scope and transport-neutral AY-PLE results. `ccpocket` contributes one missing idea—explicit `serverRequest/resolved` cleanup—but its early-notification policy conflicts with the target.

## 5.4 Screen-only candidate disposition

| Candidate | Overall connection fit | Runtime fit | Reason not promoted |
|---|---|---|---|
| Kanna | partial | conflicting/single-session | Bun app-local module; no package seam or race evidence |
| codex-web | conflicting | conflicting | product frontend/proxy, not a native client core |
| codex_sdk | not verified for AY-PLE | potentially capable, wrong language | Elixir dependency/operations boundary outweighs TS reuse |
| remaining topic projects | not verified | not verified | screening found gateways/adapters/harnesses, not a stronger exported TS core |

---

# 6. AY-PLE hardening comparison and policy review

## 6.1 Candidate support

| # | Hardening | OR | OP | BV | H | CP | CB |
|---:|---|---|---|---|---|---|---|
| 1 | LF-before-16 MiB raw-byte cap | A | A | A | A | A | A |
| 2 | Strict/fatal UTF-8 | A | A | A | A | A | A |
| 3 | Duplicate top-level member rejection | A | A | A | A | A | A |
| 4 | Exact numeric RequestId parser | P | C | A | A | A | C |
| 5 | `application` / `control` writer lanes | P | A | A | A | A | A |
| 6 | exact `control 1 → application 1` fairness | A | A | A | A | A | A |
| 7 | `queued_cancelable → handed → callback_settled` | P | A | A | A | A | A |
| 8 | Server response exact-byte reservation | A | A | A | A | A | A |
| 9 | Owner-local timeout control marker | A | A | A | A | A | A |
| 10 | Unexpected-exit bounded stdout/dispatch drain | P | P | P | A | A | P |
| 11 | Separate count/byte caps | P | A | A | A | A | A |
| 12 | Recursive no-raw retained-state checks | A | A | A | A | A | A |
| 13 | Generator A/B deterministic generation + rollback | P | P | A | A | A | A |
| 14 | Full fake-child race matrix | P | P | P | A | A | A |

## 6.2 Policy classification and recommendation

| # | Classification | Evidence-based assessment | Recommendation |
|---:|---|---|---|
| 1 | **AY-PLE deployment boundary에서는 필요하지만 일반 client에는 드문 hardening** | Every candidate uses string/readline framing; a child or descendant can retain a pipe and produce unbounded bytes before LF. | Keep a configurable default cap. Do not make exactly 16 MiB part of the semantic API; keep it as an operational default. Add to the forked Connection reader. |
| 2 | **AY-PLE deployment boundary에서는 필요하지만 일반 client에는 드문 hardening** | Node/Python text decoding silently substitutes malformed UTF-8. That can alter JSON string/ID content before validation. | Keep fatal decoding in the Connection parser. No greenfield client is required; replace the extracted reader. |
| 3 | **기존 후보를 wrapper로 보강하면 되는 항목** | Ordinary `JSON.parse` accepts duplicate members and silently chooses a value, which is dangerous when `id`, `method`, `result` or `error` is duplicated. | Keep top-level rejection in the raw parser wrapper; do not recursively reject all nested duplicates unless a failure trace demands it. |
| 4 | **existing implementations에서도 공통적인 필수 안전성** | Official `RequestId` is string or i64. Python and CodexBridge collapse types; JS number cannot exactly represent all i64 values. | Keep exact lexical numeric handling and typed keying. This is a core patch, not optional polish. |
| 5 | **기존 후보를 wrapper로 보강하면 되는 항목** | Tier 1 proves one serialized queue is workable, but an approval response can sit behind application traffic. | Keep two logical classes or an equivalent priority mechanism inside the forked writer. |
| 6 | **구현 전에 실제 failure trace가 더 필요한 speculative policy** | Non-starvation is justified; the exact 1:1 ratio is not established by official clients or observed failures. | Forward-amend the spec to require bounded control latency and application non-starvation, not a fixed 1:1 algorithm. |
| 7 | **existing implementations에서도 공통적인 필수 안전성** | Tier 1’s timeout deletes the callback while its queued frame may later be written. This is a concrete source trace, not speculation. | Keep explicit pre-handoff cancellation and post-handoff delivery-unknown state. Names may change; observable lifecycle must remain. |
| 8 | **AY-PLE deployment boundary에서는 필요하지만 일반 client에는 드문 hardening** | Same-ID Server replies must not be starved by user traffic, but exact byte reservation is one implementation technique. | Preserve guaranteed response capacity/latency; allow a reserved lane or bounded emergency slot rather than mandating one data structure. |
| 9 | **구현 전에 실제 failure trace가 더 필요한 speculative policy** | Owner-local timeout serialization can make races deterministic, but the exact “control marker” representation is not externally observable. | Keep single-owner timeout ordering; remove the marker’s name/shape from normative contract. |
| 10 | **existing implementations에서도 공통적인 필수 안전성** | Tier 1 waits briefly for stderr but not a complete stdout/dispatch tail; product clients commonly drop tail events on exit. | Keep a bounded tail drain followed by deterministic settlement and reap. |
| 11 | **AY-PLE deployment boundary에서는 필요하지만 일반 client에는 드문 hardening** | Count alone misses one huge frame; bytes alone misses many tiny retained entries. | Keep separate count and byte limits for writer, early staging and retained runtime state. |
| 12 | **기존 후보를 wrapper로 보강하면 되는 항목** | Community providers retain raw params or optionally emit raw chunks. AY-PLE has a browser/product adapter boundary where raw command/path/error data can escape. | Keep recursive no-raw checks at the Runtime→product adapter boundary and in retained-state tests, not in every transient parser object. |
| 13 | **AY-PLE deployment boundary에서는 필요하지만 일반 client에는 드문 hardening** | Community projects manually chase protocol changes; Tier 1’s 0.142.5 fixture while claiming 0.144 compatibility shows the cost. | Keep deterministic A/B generation, diff review and rollback as the pin-upgrade authority. |
| 14 | **existing implementations에서도 공통적인 필수 안전성** | Existing tests cover happy paths and selected races, but none covers timeout-after-queue, duplicate inbound ID, A-blocked/B-progress and descendant-held EOF together. | Keep AY-PLE’s fake-child matrix and add upstream-regression fixtures from the extracted core. |

### Hardening that can be relaxed

- Replace exact `control 1 → application 1` with observable non-starvation and a bounded response-latency invariant.
- Treat 16 MiB as a configurable default, not a protocol constant.
- Keep the semantics of owner-local timeouts and response reservation while allowing simpler internal representations.
- Continue to reject tombstone-heavy/global-total-order/permanent-poison designs already removed by the active spec; the reuse audit does not revive them.

### Hardening that must remain

Exact directional/type-preserving IDs, once-only inbound response authority, no late write before handoff, bounded early/writer/runtime state, fatal connection loss settlement, direct-child reap, per-thread nonblocking ingress, exact generated 0.144 validation, and no raw product retention remain non-negotiable.

---

# 7. T0, T0-C and T0.1 comparison

The labels below use the user-requested decision categories, not generic feature scores.

| Candidate | T0 | T0-C | T0.1 | Explanation |
|---|---|---|---|---|
| Official Rust/test client/TUI | internal/reference implementation으로 가능 | internal/reference implementation으로 가능 | internal/reference implementation으로 가능 | Correct oracle and test donor, but not a TS dependency surface. |
| Official Python exact/current | 현재 Python API/sidecar로 기본 T0 가능, pin patch 필요 | **구조적으로 충돌** | 좁은 patch/fork 필요 | Reader-thread synchronous handler blocks B while A approval waits; runtime pin is 0.137.0a4. |
| Official TS SDK | **구조적으로 충돌** | **구조적으로 충돌** | **구조적으로 충돌** | `exec` wrapper has no bidirectional Server request channel. |
| `ai-sdk-provider-codex-cli` public API | native AY-PLE T0에는 불충분 | native AY-PLE T0-C에는 불충분 | 불충분 | Generic `LanguageModelV4` stream hides the canonical Connection/Runtime authority. |
| `ai-sdk-provider-codex-cli` internal core | **internal module을 사용하면 가능** | **internal module을 사용하면 가능** | **좁은 patch/fork가 필요** | Early staging and A/B routing exist; add once lease, resolved cleanup and handoff-aware response race handling. |
| `happy` | 좁은 patch/fork 필요 | **구조적으로 충돌** | 좁은 patch/fork 필요 | Singleton thread/turn and non-authoritative completion fallback. |
| `ccpocket` | 좁은 patch/fork 필요 | **구조적으로 충돌** | 좁은 patch/fork 필요 | Early explicit-thread notifications are dropped before binding; singleton process projection. |
| `CodexBridge` | 좁은 patch/fork 필요 | evidence 없음 | 좁은 patch/fork 필요 | Listener-after-response/polling architecture and no tested per-thread independence. |
| Kanna / codex-web | 구조적으로 충돌 또는 evidence 없음 | 구조적으로 충돌 또는 evidence 없음 | evidence 없음 | Application/product shape is not the target library boundary. |
| Elixir `codex_sdk` | language-local API라면 가능할 수 있으나 AY-PLE evidence 없음 | evidence 없음 | evidence 없음 | Wrong runtime/dependency boundary for this decision. |

### T0-specific observations

- Tier 1 can return the matching AgentMessage and terminate on `turn/completed`, but AY-PLE must strip AI SDK-specific finish/content projection.
- Unsupported inbound Server requests already receive deterministic same-ID `-32601` in Tier 1; the fork must add a once lease.

### T0-C-specific observations

- Tier 1’s async Server request handler does not block the single stdout callback, and its context/locks are keyed by thread/turn. This is the strongest source evidence for A pending while B progresses.
- Python fails this criterion despite per-thread locks because handler invocation is synchronous in the reader path.
- Product-local singleton clients cannot demonstrate one shared Connection demultiplexing A and B.

### T0.1-specific observations

- Same-ID approval response exists in Tier 1, happy, ccpocket and CodexBridge.
- None of the TypeScript candidates has a complete `answer | serverRequest/resolved | turn terminal | disconnect` once-only state machine.
- Only ccpocket explicitly cleans on `serverRequest/resolved`; only the official TUI has source/test evidence for remove-once response authority.
- No TS candidate distinguishes pre-handoff stale from post-handoff delivery unknown. That distinction must be added to the fork.

---

# 8. Dependency, maintenance and security evaluation

| Candidate | Packaging / exports | Required dependencies | Version/schema strategy | Test/CI quality observed | Supply-chain & operational notes | Fork feasibility |
|---|---|---|---|---|---|---|
| Official Rust oracle | monorepo crates, not npm | Rust workspace | source-of-truth generated protocol | strongest official integration/TUI tests | extra Rust/FFI boundary if adopted | semantic/test port only |
| Official Python | PyPI package + binary wheel + Pydantic | Python ≥3.10, Pydantic, binary wheel | generated registry, but binary pin 0.137.0a4 | good router/method tests; T0-C missing | second runtime, wheel supply chain, cross-process serialization; handler can block reader | Apache source can be ported; sidecar unattractive |
| Official TS SDK | npm SDK | bundled/located Codex CLI | follows `exec` protocol | good for exec, irrelevant to App Server | no approvals channel | no useful App Server fork surface |
| Tier 1 `BV` | published npm, root export only; core private | AI SDK provider/utils, Zod peer, optional Codex range | manual types/Zod; 0.142.5 fixture; min 0.144 | substantial fake-child tests, optional real smoke; inspected SHA had no independently verified run in this audit | inherits full process env; stores/logs bounded stderr tail but does not redact secrets; optional raw chunks may propagate protocol data; explicit close lacks reap | **MIT; best source extraction candidate** |
| happy | large CLI/mobile product package | broad product/mobile/sandbox stack | manual version probes/types | many product tests, weak transport race coverage | inherits env, logs stderr, maps events toward remote/mobile product; no writer bounds/reap | MIT, but extraction would discard most code |
| ccpocket | bridge package/bin, no focused App Server export | bridge/WebSocket/product deps | manual, unpinned CLI | extensive fake transport/process tests | raw WebSocket path and unbounded offline queue; managed mode logs App Server output; inherits env | MIT; small ideas only |
| CodexBridge | preview API package; client not root-exported | Node 24, TS6, API daemon stack | huge manual types, unpinned CLI | tests target sibling source, not package copy | API/gateway exposure, summarized RPC logging, auth-state access; strongest TERM/KILL helper | license not verified; do not vendor without clarification |

## Maintenance implications

- Tier 1’s rapid progression through Codex 0.130/0.142/0.144 is evidence of active maintenance, but also evidence that a caret dependency and manual protocol types are insufficient for AY-PLE’s exact-pin policy.
- A fork must retain an upstream commit manifest and a mechanical diff path. It should not become an untraceable copy-paste.
- AY-PLE’s generated schema and conformance gate remain the upgrade authority; community package release cadence is an input, not authority.

## Security/operational conclusions

1. Do not expose Tier 1 raw chunks or provider metadata directly to a browser/product adapter.
2. Build an explicit environment allow/deny policy around the spawned child rather than blindly treating inherited `process.env` as harmless; authentication variables required by Codex must remain available, but errors/logs need redaction policy.
3. Keep stderr diagnostic tails bounded and sanitized, but do not assume truncation equals secret redaction.
4. Make close/reap observable in tests; a successful `kill()` call is not proof that the direct child was reaped or stdout descendants released.


---

# 9. Adopt vs fork vs build decision matrix

Scoring is 1–5, where 5 is best. For implementation and maintenance cost, 5 means **lower cost**.

| Option | Correctness evidence | Reuse value | Upgrade alignment | Implementation cost | Maintenance cost | Extensibility | Security / operational fit | Total |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **A. Community public package directly** | 3 | 4 | 4 | 5 | 3 | 2 | 2 | 23/35 |
| **B. Extract/fork community App Server core** | **4** | **5** | **4** | **4** | 3 | **5** | **4** | **29/35** |
| **C. Official Python sidecar** | 3 | 4 | 1 | 3 | 2 | 3 | 1 | 17/35 |
| **D. Custom TypeScript from scratch** | 2 | 1 | 4 | 1 | 2 | 5 | 5 | 20/35 |

## A. Community package directly

**Why it scores:** Tier 1 has real source/test evidence and tracks 0.144, so a direct dependency minimizes immediate coding. However, its supported public surface is an AI SDK provider, not a native Connection/Runtime API. Native lifecycle truth is transformed into generic stream parts and metadata, the core is not exported, optional Codex dependency uses a caret range, and AY-PLE cannot insert exact framing/ID/writer/once/reap guarantees without unsupported internals.

**Exit strategy:** poor. Replacing the provider later requires unwinding AI SDK semantics from AY-PLE Runtime and product adapters.

**Decision:** reject.

## B. Community core extract/fork

**Why it scores:** Tier 1 provides the most difficult reusable mechanics—process initialization, one reader, serialized backpressure-aware writer, request contexts, per-thread locks, early staging, scope routing, stream completion—and tests them. AY-PLE can delete the provider projection, preserve upstream ancestry, replace protocol/schema and harden a small number of modules. The remaining upgrade burden is manageable if the fork has a provenance manifest and exact-pin conformance gate.

**Expected patch surface:**

- `rpc/client.ts`: replace line reader/parser, ID model, writer ownership, inbound once lease, close/reap and loss settlement.
- `protocol/*`: replace manual model with AY-PLE exact 0.144 generated types/validators.
- `stream/router.ts`: bound early state and expose native envelopes rather than AI SDK chunks.
- `stream/turn-stream-controller.ts`/`session.ts`: adapt to `CodexConversationRuntime`, settle on connection loss, enforce admission policy.
- delete `language-model.ts` and AI SDK emitter/projection from the canonical layer.

**Exit strategy:** good. AY-PLE’s public seam remains independent, so it can later replace the fork with an official TS App Server client without changing product adapters.

**Decision:** recommend.

## C. Official Python sidecar

**Why it scores:** official source and generated semantics are valuable. But both exact commit and inspected current main pin binary 0.137.0a4, so using AY-PLE’s 0.144 binary requires overriding official packaging and retesting protocol compatibility. Synchronous Server request handling blocks reader progress, and Python/Pydantic/wheel/runtime supervision add supply-chain and operational surfaces.

**Exit strategy:** medium-to-poor. The sidecar protocol becomes another API to maintain, and moving back to TS later requires replacing both processes and their serialization contract.

**Decision:** reject as production architecture; keep as semantic oracle.

## D. Custom TypeScript from scratch

**Why it scores:** it offers maximal design control and operational fit, but discards the best source/test evidence and recreates several already-solved ordering mechanisms. Correctness evidence would initially be lower than a provenance-preserving fork, while implementation time is highest. It remains the fallback if the spike reveals that Tier 1 extraction is not localized.

**Exit strategy:** good at the public seam, but all protocol upgrade work remains AY-PLE-owned.

**Decision:** do not start greenfield before the spike.

---

# 10. Recommended target architecture

```text
AY-PLE product adapters / Hub protocol
                 |
                 v
+----------------------------------------------------+
| CodexConversationRuntime                           |
| AY-PLE-owned canonical public contract             |
| - native ThreadId / TurnId / ItemId                |
| - T0 / T0-C / T0.1 convergence                    |
| - bounded retained state                           |
| - no-raw product projection                        |
+---------------------------+------------------------+
                            |
                            v
+----------------------------------------------------+
| CodexAppServerConnection                           |
| AY-PLE-owned package-private interface/invariants  |
| - typed directional RequestId                      |
| - one reader / one owner / cancel-aware writer     |
| - inbound once lease                               |
| - disconnect settlement + close/reap               |
+---------------------------+------------------------+
                            |
                            v
+----------------------------------------------------+
| internal/codex-app-server-core                     |
| provenance: ben-vargas/ai-sdk-provider-codex-cli   |
|             @ fc4a97f...                           |
|                                                    |
| retain/adapt:                                      |
| - RPC state machine and request contexts           |
| - per-thread lock/context topology                 |
| - early-event router                               |
| - turn controller/session lifecycle ideas          |
|                                                    |
| replace/delete:                                    |
| - AI SDK LanguageModelV4 projection                |
| - manual protocol types/validators                 |
| - readline/string parser                           |
| - single unbounded promise queue                   |
|                                                    |
| AY-PLE patches:                                    |
| - exact 0.144 generated schema                     |
| - raw-byte framing + exact IDs                     |
| - bounded non-starving writer                      |
| - queued/handed/callback-settled lifecycle         |
| - same-ID once-only Server response authority      |
| - bounded staging + resolved cleanup               |
| - exit/EOF drain, kill escalation, direct reap     |
+---------------------------+------------------------+
                            |
                            v
          @openai/codex@0.144.0 app-server
          upstream commit 767822446c7a...
```

## Dependency direction

- Product adapters depend on Runtime only.
- Runtime depends on the AY-PLE Connection interface, not on AI SDK or a community package API.
- Connection may use the internal extracted core, but that core is not exported from `@ay-ple/runtime-codex`.
- Generated protocol types are a lower-level shared input to Connection and Runtime; community manual schemas are not canonical.
- Keep an `UPSTREAM.md`/manifest containing repository, SHA, imported paths, local patch list and license notice.

## Why ADR 0010 survives

The audit strengthens the seam: every product candidate that entangles process, one-session state and product projection becomes hard to reuse, while Tier 1’s reusable value is precisely the separable RPC/router machinery. The seam should therefore remain canonical even though the first implementation is partially extracted.

---

# 11. Current AY-PLE spec and ticket impact

## 11.1 Direct answers

### 1. Is ADR 0010’s `Connection → Runtime` seam still valid?

**Yes.** It is the stable exit strategy that allows an internal fork today and an official client tomorrow without changing Hub/product adapters.

### 2. Should AY-PLE own Connection?

AY-PLE should own the **Connection contract, invariants, exported types and tests**. The first implementation should hide an extracted/forked Tier 1 core behind that contract. AY-PLE should not expose the community provider or its classes as canonical API.

### 3. Which contracts are already solved in open source?

- child spawn and initialize/initialized basics;
- one stdout reader;
- pending client request map and remove-once response;
- serialized writer with Node backpressure;
- per-thread request contexts/locks;
- notification-first staging and turn-ID binding;
- AgentMessage/item projection and authoritative `turn/completed` mechanics;
- same-ID approval/fallback response;
- basic crash pending settlement and reconnect;
- `serverRequest/resolved` cleanup pattern in ccpocket;
- original-ID once authority pattern in the official TUI.

These should be extracted or ported with tests, not rediscovered.

### 4. Which current spec contracts are stronger than candidates?

Raw-byte framing, fatal UTF-8, duplicate-member rejection, exact numeric IDs, cancelable queued frames, logical writer classes, response capacity, bounded tail drain, count+byte caps, recursive no-raw retained-state checking, deterministic dual generation and the complete fake-child race matrix.

### 5. What can be removed or relaxed?

- fixed 1:1 writer scheduling algorithm;
- immutable 16 MiB protocol constant;
- mandatory internal names/shapes for timeout markers and capacity reservation;
- any ticket wording that assumes a wholly new parser/router/session implementation;
- any revived tombstone/global-order/permanent-poison design.

Keep the observable guarantees while allowing the extracted implementation to choose simpler internals.

### 6. Which AY-PLE-specific hardening must remain?

- exact direction-aware string/i64 ID preservation;
- no response after an inbound request lease has been resolved once;
- no queued frame sent after a pre-handoff timeout/cancel;
- post-handoff delivery-unknown distinction;
- bounded framing, writer, early staging and retained runtime state;
- unrelated-thread ingress while one approval handler is unresolved;
- connection-loss settlement of both RPC and active-turn waiters;
- direct child termination/reap and bounded pipe-tail behavior;
- exact generated 0.144 validation and upgrade ledger;
- no raw command/path/error payload retained or exposed past the canonical adapter boundary.

### 7. Which implementation tickets should change?

The current wayfinding audit groups transport/schema work around tickets 005/006/011/012, Runtime around 017, and T0/T0-C/T0.1 around 013/014. Forward-amend them as follows; no ticket file is created by this audit.

| Current responsibility | Impact |
|---|---|
| 005/006 parser/writer foundation | **Merge/reframe** as “extract core + replace Connection boundary.” Do not write a greenfield RPC client first. |
| schema/type generation work | **Keep separate and earlier.** It replaces Tier 1 manual types and is a precondition to conformance. |
| 011/012 lifecycle/close/race | **Merge around hardening delta:** cancelable write lifecycle, once lease, loss settlement, bounded drain and reap. |
| 017 Conversation Runtime | **Reframe** as adaptation of router/controller/session semantics to native AY-PLE results, not a greenfield event router. |
| 013/014 T0/T0-C/T0.1 | **Keep.** Add extracted-core regression fixtures plus adversarial delta tests. |
| tickets extending `HeadlessCodexClientHost` or treating `CodexRawClient` as target | **Stale/delete or mark migration-only.** They remain legacy provenance, not target architecture. |
| any ticket prescribing exact 1:1 fairness/marker structure | **Forward-amend** to observable latency/non-starvation and race semantics. |

### 8. Is a compatibility spike required?

**Yes.** Source evidence is strong enough to choose the candidate, but not strong enough to skip an exact-binary interleaving run. The spike is a decision gate, not an excuse to defer architecture indefinitely.

## 11.2 New tickets to add before implementation

1. **Reuse provenance and extraction spike** — snapshot paths, MIT notice, upstream SHA, compile the core without public AI SDK projection.
2. **Exact 0.144 compatibility spike** — scenarios in section 12.
3. **Upstream diff and pin-upgrade gate** — mechanically compare extracted files, generated schemas and official oracle at every Codex pin change.

## 11.3 Revised minimal ticket graph

```text
R0  Exact @openai/codex@0.144.0 compatibility spike
 |
 +--> R1  Provenance/license manifest + extracted core compile
 |      |
 |      +--> R2  Exact 0.144 generated schema/runtime validation
 |                |
 |                +--> R3  Connection hardening delta
 |                |        - raw framer/exact IDs
 |                |        - cancel-aware bounded writer
 |                |        - inbound once lease
 |                |        - disconnect/EOF/reap
 |                |
 |                +--> R4  Native ConversationRuntime adaptation
 |                         - bounded early staging
 |                         - native item/message projection
 |                         - resolved/terminal idempotence
 |
 +-----------------------> R5  T0 conformance
                            |
                            +--> R6  T0-C A/B nonblocking conformance
                                   |
                                   +--> R7  T0.1 approval race conformance
                                          |
                                          +--> R8 pin-upgrade/upstream-diff gate
```

---

# 12. Required compatibility spike

## 12.1 Scope and timebox

Maximum 1–2 engineering days. It is a throwaway or isolated test harness, not production implementation and not a reason to edit the canonical tickets yet.

Build two adapters in the spike workspace:

1. a minimally extracted Tier 1 core at `fc4a97f`, with only imports/build shims needed to run;
2. a deterministic fake child that can block writes, reorder response/notifications, emit string or large numeric IDs, hold stdout open and terminate at selected points.

Use the **installed workspace binary from `@openai/codex@0.144.0`**, not a globally installed or caret-resolved CLI. Log `codex --version` and resolved binary path in the test artifact.

## 12.2 Scenarios, expected observations and gates

| Scenario | Required stimulus | Expected observation | Pass | Fail |
|---|---|---|---|---|
| Binary resolution | resolve installed npm pin and start `app-server` | binary reports 0.144.0 and corresponds to the pinned package | exact workspace binary used | global/path or other version used |
| Initialize | send `initialize`, receive response, send `initialized` | one child, one stdout reader, valid 0.144 response | handshake completes and no leaked pending entry | method/schema mismatch, duplicate reader, leak |
| `thread/start` | native start request | response yields native ThreadId; legal `thread/started` notification is accepted in either order | one converged thread | event dropped or creates duplicate thread |
| `turn/start`: response first | response then `turn/started`/items | bind native TurnId and route items | no loss/duplication | wrong scope or premature finish |
| `turn/start`: notification first | `turn/started`, AgentMessage delta/item before response | early state stages, binds and flushes in source order for matching turn | matching item/message preserved | early event dropped, foreign event flushed |
| AgentMessage terminal | delta and/or completed AgentMessage, then `turn/completed` | message text/item identity retained; result resolves only from `turn/completed` | exactly one terminal result | item completion ends turn or duplicate finish |
| T0 unsupported Server request | unknown request with string ID and numeric ID | deterministic same-ID error/result | exact type/value echoed once | coercion, missing response or duplicate response |
| T0-C A/B | A active with unresolved approval handler; start/complete B; complete A; admit A2 | B ingress and terminal progress while A handler is unresolved; A2 waits only on A policy | no global blocking; per-thread ordering intact | B blocked, A2 admitted illegally, cross-routing |
| T0.1 approval before response | approval arrives before `turn/start` response | request is associated by native thread/turn scope and answered with original ID | one response after chosen answer | fallback misroutes, duplicate answer |
| `serverRequest/resolved` race | resolved before/after user answer and terminal | lease cleanup is idempotent; late answer becomes stale before handoff | no second write; state cleared | duplicate write or leaked approval |
| Timeout under backpressure | block stdin drain, queue application request, expire timeout, then release drain | timed-out pre-handoff frame is removed and never written | no frame observed by fake child | frame appears after caller timeout |
| Post-handoff loss | allow write handoff, kill child before response | caller receives delivery-unknown/disconnect, not stale-unsent | correct distinction and one settlement | reports unsent, retries blindly, double settles |
| Exit/EOF settlement | exit, stdout EOF, stdin error at different phases | all pending RPCs and active-turn waiters settle; bounded tail processed | no pending maps/listeners; child reaped | hanging turn/RPC, late callback, unreaped child |
| Descendant-held pipe | direct child exits while descendant holds stdout | bounded drain expires, settlement proceeds, direct child is reaped | bounded completion | indefinite close/hang |

## 12.3 Expected outcome

Based on source, the extracted Tier 1 core is expected to pass basic handshake, thread/turn calls, ordinary AgentMessage streaming, same-ID fallback and A/B thread-scoped routing. It is expected to fail or require patches for exact large numeric IDs, timeout-after-queue cancellation, duplicate inbound once authority, `serverRequest/resolved`, bounded early staging, active-turn settlement on crash, and direct-child reap.

## 12.4 Decision rule after spike

Proceed with the fork when all failures are confined to the known delta and can be localized to approximately four areas: Connection parser/writer, inbound request lease, bounded Runtime staging, and close/loss settlement. Switch to custom TypeScript implementation only if exact 0.144 behavior invalidates the router/context topology itself—for example, if legal events cannot be associated before response without product-specific AI SDK state, or if core extraction requires retaining the public provider lifecycle throughout AY-PLE.

---

# 13. Residual risks and unknowns

Only evidence gaps remain here; source-verifiable facts are not escalated as human decisions.

1. External project tests were inspected but not run in this environment. Their current pass status and platform matrix are not claimed.
2. Tier 1 `fc4a97f` has not yet been executed against AY-PLE’s installed `@openai/codex@0.144.0` binary, so exact wire compatibility remains the central spike question.
3. The exact legal license of the audited CodexBridge snapshot was not verified; do not vendor it absent a license file or explicit grant.
4. Platform-specific descendant-held-pipe, Windows process-tree and direct-child reap behavior needs executable observation.
5. The operational defaults for frame/queue/retained byte caps need AY-PLE deployment traces; the need for bounds is established, but the final numbers are not.
6. The inferred Tier 1 active-turn-on-crash hang must be confirmed by the spike because the controller and connection error paths were not executed together.

---

# 14. Final recommendation

Do not adopt the `ai-sdk-provider-codex-cli` public API and do not begin a wholly new client. Extract its private App Server RPC/session/router/controller core at `fc4a97f`, preserve provenance, remove AI SDK projection, replace manual protocol types and transport ownership with AY-PLE’s exact-pin Connection hardening, and expose only ADR 0010’s native Runtime. Run the bounded compatibility spike first; if it confirms the source-derived patch delta, forward-amend the spec and ticket graph as described above.
