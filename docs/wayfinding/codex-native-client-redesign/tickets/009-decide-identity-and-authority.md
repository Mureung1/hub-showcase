# 009 — Native identity authority와 lifetime을 결정한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)

## Question

`CodexAppServerConnection`이 exact opaque wire identity를 보존하고 `CodexConversationRuntime`의 per-thread owner가 T0에 채택된 response·notification의 native `ThreadId`·`TurnId`·item identity를 상관한다는 baseline에서, type branding·authority convergence·lifetime과 terminal 뒤 identity 보존 범위를 어떻게 정할 것인가? `thread/resume`·`thread/read`·replay identity는 해당 method tracer가 채택될 때만 확장하고, upstream이 정의하지 않은 duplicate·lineage 의미를 일반화하지 않는다.

Product/browser ref remapping과 connection generation은 runtime identity를 재정의하지 않으며 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)가 실제 use case 증거로 결정한다. Answer는 영향받는 inventory row, tracer, semantic owner, lifecycle fact/source-test evidence와 아직 구현 integration 승격이 아닌지를 함께 기록한다.

## 진행 메모

[첫 tracer와 module seam](008-choose-first-tracer-and-module-seams.md)에서 이미 승인한 native identity와 per-thread ownership은 다시 선택지로 열지 않는다. 남은 결정은 native identity value와 현재 process에 붙은 live projection의 lifetime을 분리할지, 별도 durable identity catalog를 둘지다.

### Source-grounded identity와 authority

| 범위 | Exact-pin 근거 | T0 설계 입력 |
| --- | --- | --- |
| Thread | Core `ThreadId`는 UUIDv7을 생성하고 `ThreadManager`는 이를 registry key로 쓰지만 generated App Server shape는 `Thread.id: string`이다. [`ThreadId`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/thread_id.rs#L11-L31), [`ThreadManagerState`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L236-L241) | Generated-schema validation 뒤 exact string을 distinct package-private opaque `CodexThreadId` brand로 보존한다. Runtime이 UUID를 다시 생성·remap하거나 connection generation을 붙이지 않는다. |
| Turn | Idle `turn/start` response의 `turn.id`는 core submission ID이며 Codex가 생성하는 normal submission ID는 UUIDv7이다. Public `Turn.id`와 lifecycle notification의 `turnId`는 string이다. [`turn/start`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568), [`new_submission_id`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L903-L910) | Exact string을 distinct package-private opaque `CodexTurnId` brand로 보존하고 T0 live turn은 `(CodexThreadId, CodexTurnId)`로 소유한다. UUID 형식이나 global uniqueness를 client invariant로 승격하지 않는다. |
| Item | Core가 만드는 item은 흔히 UUIDv7이지만 public item과 delta identity는 string이고 history·tool path에는 다른 생성·복원 경로가 있다. [`new_item_id`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/items.rs#L407-L433), [`ItemStartedNotification`](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1230-L1245) | Exact string을 distinct package-private opaque `CodexItemId` brand로 보존하고 item은 `(CodexThreadId, CodexTurnId, CodexItemId)` full scope로 소유한다. Item ID 단독 global map과 UUID validation은 사용하지 않는다. |

- `thread/start` exact response의 `thread.id`가 request-correlated identity authority다. Exact pin은 response를 enqueue한 뒤 `thread/started`를 보내며, matching notification은 대체 authority가 아니고 T0가 기다리는 completion condition도 아니다. [`thread/start` response-first path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1360)
- Idle `turn/start` response는 request acceptance authority이고 `turn/started`는 execution-start observation이다. 두 경로는 either-order일 수 있으므로 `ThreadActor`가 notification-first turn과 그 item observation을 provisional state로 소유하고, response의 exact same ID로 confirmed state에 수렴시킨다. Mismatch를 alias·rebind로 감추지 않으며 failure settlement는 [Connection loss와 unknown outcome 정책](012-decide-connection-and-unknown-outcome-policy.md)이 정한다. [Method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md)
- T0의 completed AgentMessage content는 matching `item/completed`가 제공한다. `item/started`와 `item/agentMessage/delta`는 허용된 observation이지 final content authority가 아니다. `turn/completed`는 terminal status authority일 뿐 transcript나 observation drain authority가 아니다.
- Request ID는 `CodexAppServerConnection`이 소유하는 direction-aware RPC namespace이며 conversation identity hierarchy에 넣지 않는다. Native thread·turn·item identity는 `CodexConversationRuntime`의 semantic owner가 소유한다.

### Lifetime 대안 비교

| 대안 | 동작 | 판단 |
| --- | --- | --- |
| A. Actor-owned live projection | Process-scoped `ThreadActor`가 provisional·confirmed·terminal turn과 item scope를 일관되게 소유한다. Process가 끝나면 live projection을 폐기하되 native `ThreadId` value를 stale·remap하지 않는다. | 권고. Canonical owner가 하나이고 Codex가 persistent identity의 source of truth로 남는다. |
| B. Pending lease 뒤 actor promotion | Response 전 state를 operation lease가 소유하고 response 뒤 actor로 atomic promotion한다. | 제외 권고. Notification/item/terminal-before-response와 promotion이 겹치면 routing owner가 바뀌고 새 handoff race가 생긴다. |
| C. Durable identity catalog | `appDataRoot`에 actor identity와 provisional/terminal state를 별도로 보존한다. | 제외 권고. Codex persistence와 이중 source of truth, schema migration, live/replay authority 병합을 만들고 [product ref 결정](018-decide-first-ayple-adapter-tracer.md)을 선점한다. |

권고안에서 native `ThreadId` value는 process·connection generation에 종속되지 않지만 live actor attachment는 현재 process에 종속된다. Process terminal 뒤 actor를 재사용하지 않는다. Persisted identity를 어떤 response와 provenance로 새 live actor에 bind할지는 `thread/resume`·`thread/read` tracer가 채택될 때 결정한다. Turn terminal 뒤에도 actor가 late observation을 같은 full scope로 route할 수 있어야 하며 exact retention bound, duplicate/conflict와 history provenance는 [Event delivery와 transcript recovery model](011-decide-delivery-and-recovery-model.md)이 정한다.

### Coverage ledger 영향

| Inventory row | 현재 integration / adoption | Target tracer와 semantic owner | Lifecycle source/test evidence |
| --- | --- | --- | --- |
| `thread/start` | `raw-wrapper` / `baseline` | T0 / `CodexConversationRuntime` | [`thread/start` response-first source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1360), [method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md) |
| `thread/started` | `schema-only` / `baseline` | T0 / `CodexConversationRuntime` | [`thread/start` response 뒤 notification source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1343-L1360), [method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md) |
| `turn/start` | `raw-wrapper` / `baseline` | T0 / `CodexConversationRuntime` | [`turn/start` response identity source](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568), [matching terminal integration test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L3651-L3666) |
| `turn/started` | `schema-only` / `baseline` | T0 / `CodexConversationRuntime` | [Core inline start emission](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/regular.rs#L47-L63), [App Server forwarding](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L152-L180) |
| `item/started` | `schema-only` / `baseline` | T0 / `CodexConversationRuntime` | [Canonical item start forwarding](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L939-L969), [start/completion identity test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L3567-L3633) |
| `item/agentMessage/delta` | `schema-only` / `baseline` | T0 tolerated / `CodexConversationRuntime` | [Delta scope mapping](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-protocol/src/protocol/event_mapping.rs#L359-L367), [method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md) |
| `item/completed` | `schema-only` / `baseline` | T0 / `CodexConversationRuntime` | [Canonical item completion forwarding](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L980-L994), [start/completion identity test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L3567-L3633) |
| `turn/completed` | `schema-only` / `baseline` | T0 / `CodexConversationRuntime` | [Empty-items terminal projection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/bespoke_event_handling.rs#L1216-L1245), [matching terminal integration test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/tests/suite/v2/turn_start.rs#L3651-L3666) |

이 table은 design target을 기록할 뿐 현재 integration을 승격하지 않는다. `thread/resume`·`thread/read`와 replay identity도 해당 tracer가 채택될 때까지 현재 상태를 유지한다. Coverage schema가 결정되기 전이므로 generated inventory와 `codex-method-decisions.json`은 이 ticket에서 수정하지 않는다.

## Answer

Ticket을 resolve할 때 작성한다.
