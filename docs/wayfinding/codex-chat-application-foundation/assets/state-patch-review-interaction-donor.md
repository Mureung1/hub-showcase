# StatePatch Review interaction donor

이 문서는 Wayfinder ticket `023`의 bounded research 결과다. Exact pin과 2026-07-19 시점 current official source·manual을 기준으로, `StatePatch` Review를 열린 MCP call·같은 native `Turn`에 둘지 durable product decision·후속 `Turn`으로 분리할지 판정한다. 제품 schema나 완성 UI를 설계하지 않고 first vertical이 흡수할 interaction semantics와 남는 product responsibility만 고정한다.

## 결론

- First vertical은 **App-owned durable `StatePatch` decision lifecycle + `UserConfirmation` + 필요 시 별도 follow-up native `Turn`**을 채택한다. `propose_state_patch` MCP call과 origin `Turn`은 product Review를 기다리지 않고, durable pending proposal과 stable patch identity를 반환한 뒤 끝난다.
- 열린 call·같은 `Turn`은 실제로 동작하는 donor다. `request_user_input` answer는 원래 function call output으로 모델에 돌아간다. MCP elicitation response는 downstream MCP server로 돌아가 열린 call을 재개하고, 그 MCP call의 최종 result가 다음 sampling의 tool output이 된다. 두 경로 모두 같은 `Turn`이 후속 sampling 뒤 완료되지만 pending waiter, App Server callback과 TUI replay는 process memory에 있으며 cold resume은 stale `inProgress` turn을 `interrupted`로 바꾼다. 따라서 Server/runtime restart를 넘는 product confirmation contract가 아니다.
- Plan mode, `request_user_input`, MCP elicitation과 Codex approval에서 재사용할 것은 **Chat 안의 blocking prompt, pending-only replay, resolved prompt dismissal, decision history, `NeedsInput`과 `NeedsApproval` 구분**이다. 이들의 authority를 AY-PLE `UserConfirmation`으로 재사용하지 않는다.
- Exact local official Python SDK의 curated `Codex`/`AsyncCodex` public API에는 server-initiated request handler를 주입하거나 pending request를 stream하는 seam이 없다. Private low-level `CodexClient`는 동기 handler를 가지지만 unknown request에 즉시 `{}`를 반환한다. Current bridge도 이 high-level API와 네 notification만 채택하므로 열린 native prompt를 Browser에 연결하는 seam이 없다.
- Source와 primary tests가 서로 모순되지 않으므로 023 후속 prototype은 만들지 않는다. 같은 native call·`Turn` identity를 runtime restart 뒤에도 반드시 복구해야 한다는 새 requirement가 생길 때만 prototype을 재-admission한다.

## Source와 조사 경계

| 조사 층 | 고정점 | 이번 판정에서의 용도 |
| --- | --- | --- |
| Exact first-party source | `openai/codex@8c68d4c87dc54d38861f5114e920c3de2efa5876`, `rust-v0.144.4` ([provenance](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L3-L16)) | Native owner·identity·lifecycle와 primary tests의 authority |
| Package-owned official Python SDK | 같은 commit을 exact `0.144.4` schema로 regenerate한 immutable source와 ordered patch `0001`–`0005` ([baseline](../../../../packages/codex-chat-runtime/upstream/UPSTREAM.md#L18-L45)) | Adopted high-level public seam과 current bridge gap |
| Current official source comparator | 2026-07-19 `openai/codex` `main` 관찰 SHA [`0fb559f0f6e231a88ac02ea002d3ecd248e2b515`](https://github.com/openai/codex/tree/0fb559f0f6e231a88ac02ea002d3ecd248e2b515) | Exact pin 이후 assumption delta만 확인. 제품 pin이나 dependency가 아님 |
| Current official manual | [Best practices](https://learn.chatgpt.com/guides/best-practices), [Codex App Server](https://learn.chatgpt.com/docs/app-server) | Current public 설명이 exact restart guarantee를 추가하는지 확인 |

Latest source는 위 SHA로만 읽었다. Exact pin이 native contract authority이고 current source·manual은 같은 결론을 강화하거나 assumption delta를 드러내는 데만 사용한다. Live provider, 실제 credential, custom MCP server 구현, Browser UI, persistence DB와 prototype은 실행하지 않았다.

## Authority semantics는 공유하지 않는다

| Interaction | 실제로 결정하는 것 | 응답의 목적지·효과 | 재사용할 pattern | AY-PLE에서 재사용하지 않을 것 |
| --- | --- | --- | --- | --- |
| Plan mode plan item | 한 model response가 제안한 실행 계획 | Plan text를 native `Item`으로 streaming한다. Per-response state는 명시적으로 ephemeral이며 session state에 저장하지 않는다 ([ephemeral state](../../../../references/openai-codex/codex-rs/core/src/session/turn.rs#L1358-L1389), [plan item lifecycle](../../../../references/openai-codex/codex-rs/core/src/session/turn.rs#L1443-L1496)). | 계획과 질문을 Chat 문맥 안에서 보여주는 presentation | Product proposal persistence·확인 권한 |
| `request_user_input` | Agent가 다음 reasoning에 필요한 짧은 답 | Answer를 원래 function call output으로 모델에 돌려주고 같은 `Turn` sampling을 계속한다 ([handler](../../../../references/openai-codex/codex-rs/core/src/tools/handlers/request_user_input.rs#L37-L91), [round trip](../../../../references/openai-codex/codex-rs/core/tests/suite/request_user_input.rs#L172-L228)). | Focused prompt, option+notes, unanswered 확인, resolved dismissal | `SemesterModel` apply 권한, durable patch decision identity |
| MCP elicitation | Downstream MCP server의 `elicitation/create` 요청에 `Accept`·`Decline`·`Cancel`로 답함 | 열린 MCP call에 structured content를 반환한다 ([wire action](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L254-L291), [response](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L704-L717)). | Typed form·URL prompt와 open-call continuation | AY-PLE 학업 사실 확인·apply 권한 |
| Codex approval·permission | Command, file change, permission 같은 native 실행을 허용할지 | Native tool execution을 accept·decline·cancel한다. `request_user_input`은 TUI 상태에서도 approval과 별도다 ([separate status](../../../../references/openai-codex/codex-rs/tui/src/app/pending_interactive_replay.rs#L378-L387), [test](../../../../references/openai-codex/codex-rs/tui/src/app/pending_interactive_replay.rs#L921-L927)). | `NeedsApproval`과 다른 pending 상태를 분리하는 taxonomy | `StatePatch` confirmation |
| AY-PLE `UserConfirmation` | Exact `StatePatch`를 confirmed `SemesterModel`에 반영할지 | App-owned decision을 durable하게 기록하고 product apply를 허용하거나 거절함 | 위 presentation pattern의 product adaptation | Model tool output, MCP action 또는 native approval 자체 |

Current manual도 Plan mode를 context를 모으고 clarifying question을 한 뒤 stronger plan을 만드는 surface로 설명한다 ([Best practices](https://learn.chatgpt.com/guides/best-practices)). Product mutation admission이나 durable confirmation이라는 설명은 없다.

## Exact donor semantics

### Plan mode와 `request_user_input`: 같은 Turn continuation은 검증됐다

`run_turn`은 model function call을 실행하고 그 output을 다음 sampling request에 넣으며, assistant-only response에서만 `Turn`을 마친다 ([turn loop contract](../../../../references/openai-codex/codex-rs/core/src/session/turn.rs#L128-L140), [follow-up loop](../../../../references/openai-codex/codex-rs/core/src/session/turn.rs#L297-L318)). `request_user_input`은 default로 Plan mode에서만 available하고 feature가 켜질 때 Default mode에도 나타난다. Execute와 Pair Programming에는 제공되지 않는다 ([mode policy](../../../../references/openai-codex/codex-rs/tools/src/tool_config.rs#L38-L46), [primary test](../../../../references/openai-codex/codex-rs/tools/src/tool_config_tests.rs#L165-L178)). 따라서 first vertical의 일반 Chat workflow가 Plan mode를 전제하면 exact default와 충돌한다.

Tool schema는 1–3개의 짧은 질문과 선택지, optional `autoResolutionMs`를 제공한다. Auto-resolution은 답이 없어도 best judgment로 계속해도 되는 non-blocking 질문에만 쓰라고 명시하고, explicit input이 필요하면 생략한다 ([schema](../../../../references/openai-codex/codex-rs/core/src/tools/handlers/request_user_input_spec.rs#L8-L91), [normalization](../../../../references/openai-codex/codex-rs/core/src/tools/handlers/request_user_input_spec.rs#L108-L143)). `UserConfirmation`에는 silent timeout을 적용하지 않는다는 직접 donor가 된다.

Core primary test는 다음 sequence를 한 native `Turn`에서 고정한다.

1. Model이 `call_id=user-input-call`로 `request_user_input`을 호출한다.
2. Core가 기다리는 동안 `TokenCount` progress도 내보내지 않는다.
3. Client는 **call ID가 아니라 `turn_id`**로 `Op::UserInputAnswer`를 보낸다.
4. Answer는 원래 `call_id`의 `function_call_output`으로 두 번째 model request에 들어간다.
5. 같은 `Turn`이 `TurnComplete`로 끝난다.

이는 [round-trip test](../../../../references/openai-codex/codex-rs/core/tests/suite/request_user_input.rs#L69-L228)와 App Server의 two-sampling·positive blocking-time test([profile test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/turn_start.rs#L1006-L1111))가 함께 증명한다. 반대로 interrupt는 pending answer를 만들지 않고 deferred token count 뒤 `TurnAborted`로 끝난다 ([interrupt test](../../../../references/openai-codex/codex-rs/core/tests/suite/request_user_input.rs#L251-L338)).

Identity에는 product workflow에 중요한 제약이 있다. Request event는 `call_id`와 `turn_id`를 모두 싣지만 ([event type](../../../../references/openai-codex/codex-rs/protocol/src/request_user_input.rs#L49-L60)), core pending map과 answer operation은 `turn_id`를 key로 쓴다 ([pending registration](../../../../references/openai-codex/codex-rs/core/src/session/mod.rs#L2498-L2532), [answer operation](../../../../references/openai-codex/codex-rs/protocol/src/protocol.rs#L616-L622)). 같은 `Turn`에서 두 pending request가 겹치면 이전 sender를 overwrite한다 ([overwrite path](../../../../references/openai-codex/codex-rs/core/src/session/mod.rs#L2505-L2520)). TUI replay bookkeeping은 answer가 `turn_id`만 가지므로 oldest visible prompt를 FIFO로 제거하지만 ([FIFO removal](../../../../references/openai-codex/codex-rs/tui/src/app/pending_interactive_replay.rs#L144-L165), [tests](../../../../references/openai-codex/codex-rs/tui/src/app/pending_interactive_replay.rs#L797-L840)), 이미 overwrite된 core sender를 복구하거나 독립 request identity를 제공하지 않는다. 따라서 여러 독립 `StatePatch`의 durable identity로 사용할 수 없다.

### App Server와 TUI: replay pattern은 강하지만 process-durable하지 않다

App Server request params는 `threadId`, `turnId`, tool `itemId`와 questions를 보존한다 ([protocol](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1594-L1645)). Core event를 server-initiated JSON-RPC request로 바꾸고 별도의 App Server `request_id`와 callback을 만든다 ([translation](../../../../references/openai-codex/codex-rs/app-server/src/bespoke_event_handling.rs#L681-L725)). Primary test는 response 후 `serverRequest/resolved`가 `turn/completed`보다 먼저 오며 thread·turn·item identity가 유지됨을 검증한다 ([App Server round trip](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/request_user_input.rs#L53-L163)). 이 ordering은 stale Review surface를 닫고 terminal을 보여주는 behavior donor다.

하지만 pending callback은 `OutgoingMessageSender`의 in-memory `HashMap<RequestId, PendingCallbackEntry>`와 oneshot sender다 ([owner](../../../../references/openai-codex/codex-rs/app-server/src/outgoing_message.rs#L95-L118), [registration](../../../../references/openai-codex/codex-rs/app-server/src/outgoing_message.rs#L282-L350)). Loaded thread에 새 connection이 `thread/resume`하면 아직 같은 App Server process에 남은 request를 replay한다 ([replay implementation](../../../../references/openai-codex/codex-rs/app-server/src/outgoing_message.rs#L352-L371), [resume call](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L643-L699)). 이는 **same-process reconnect** 근거이지 restart recovery 근거가 아니다. Exact suite에는 `request_user_input` reconnect 전용 end-to-end test를 확인하지 못했으므로 Browser reload 보장으로 확대하지 않는다.

Cold resume은 live task가 없는 persisted `inProgress` turn을 `interrupted`로 바꾼다 ([stale conversion](../../../../references/openai-codex/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L778-L791), [primary test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/thread_resume.rs#L2177-L2247)). Core의 pending user input·elicitation도 `TurnState`의 oneshot map이고 abort가 이를 clear한다 ([in-memory state](../../../../references/openai-codex/codex-rs/core/src/state/turn.rs#L85-L100), [clear](../../../../references/openai-codex/codex-rs/core/src/state/turn.rs#L124-L130), [abort](../../../../references/openai-codex/codex-rs/core/src/tasks/mod.rs#L492-L560)). Process restart 뒤 같은 waiter를 복원하는 source는 없다.

TUI는 이 제한 안에서 좋은 presentation behavior를 제공한다.

- Server request를 raw transcript text로 다루지 않고 dedicated handler로 보낸다 ([dispatch](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/protocol_requests.rs#L8-L57)).
- Answer stream을 flush한 뒤 focused overlay와 `PlanModePrompt` notification을 띄운다 ([presentation](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/tool_requests.rs#L422-L438), [notification tests](../../../../references/openai-codex/codex-rs/tui/src/chatwidget/tests/plan_mode.rs#L624-L682)).
- Option과 per-question notes를 answer history cell로 남기고 FIFO queue를 진행한다 ([submit](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/request_user_input/mod.rs#L864-L927), [queue test](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/request_user_input/mod.rs#L1732-L1756)).
- `serverRequest/resolved`가 오면 stale prompt를 call ID로 닫되 answer나 interrupt를 다시 보내지 않는다 ([dismissal](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/request_user_input/mod.rs#L2030-L2055)).
- Thread switch snapshot은 still-pending request만 replay하고 answer·resolved·turn completion 후 제거한다 ([pending model](../../../../references/openai-codex/codex-rs/tui/src/app/pending_interactive_replay.rs#L24-L49), [filter](../../../../references/openai-codex/codex-rs/tui/src/app/pending_interactive_replay.rs#L354-L375), [thread snapshot](../../../../references/openai-codex/codex-rs/tui/src/app/thread_events.rs#L208-L228)).
- Side-conversation state도 `NeedsInput`과 `NeedsApproval`을 분리한다 ([status](../../../../references/openai-codex/codex-rs/tui/src/app/thread_events.rs#L245-L263)).

이 store와 buffer 역시 TUI struct의 memory state다 ([store](../../../../references/openai-codex/codex-rs/tui/src/app/thread_events.rs#L40-L74)). Interrupt path의 TODO는 committed answer조차 follow-up 문제 없이 reliably persist하지 못한다고 명시한다 ([interrupt TODO](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/request_user_input/mod.rs#L1218-L1223)). 따라서 UI behavior는 adaptation하되 durability는 App-owned product state가 소유해야 한다.

### MCP elicitation: open-call continuation은 검증됐지만 tool-call correlation이 없다

In-turn MCP elicitation은 core가 `(server_name, MCP request_id)` keyed oneshot을 등록하고 optional `turn_id`를 실은 event를 보낸 뒤 response를 기다린다 ([core request](../../../../references/openai-codex/codex-rs/core/src/session/mcp.rs#L194-L282), [resolve](../../../../references/openai-codex/codex-rs/core/src/session/mcp.rs#L289-L309)). App Server protocol은 `threadId`, optional `turnId`, `serverName`, form/`openai/form`/URL request를 제공하지만, **elicitation과 `McpToolCall` item ID의 연관은 아직 없다는 TODO**를 직접 남긴다 ([identity and TODO](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L294-L312), [request variants](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L631-L664)).

Primary test는 agent-invoked MCP call에서 `turnId=Some(origin turn)`인 elicitation을 accept하면 원래 `TOOL_CALL_ID`의 function output이 다음 sampling에 들어가고, `serverRequest/resolved` 뒤 같은 `Turn`이 completed됨을 증명한다 ([in-turn request](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/mcp_server_elicitation.rs#L102-L168), [settlement](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/mcp_server_elicitation.rs#L545-L607)). 반면 client가 직접 호출한 out-of-band `mcpServer/tool/call`의 elicitation은 `turnId=None`이며 outer RPC만 기다린다 ([out-of-band test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/mcp_tool.rs#L210-L320)). `turnId` 존재만으로 어떤 native tool item 또는 어떤 product patch를 결정하는지 추정하면 안 된다.

Native `McpToolCall` item 자체는 stable item `id`, server, tool, arguments, `InProgress | Completed | Failed`, result/error와 duration을 제공한다 ([item](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L299-L318), [mapping](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L944-L968), [status](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1090-L1117)). 이 lifecycle은 `propose_state_patch` activity projection에 직접 재사용할 수 있다. Elicitation request identity를 product patch identity로 재사용할 수 있다는 뜻은 아니다.

Native `call_id`는 `McpToolCall Item.id`를 만들지만 ([item emission](../../../../references/openai-codex/codex-rs/core/src/tools/handlers/mcp_resource.rs#L202-L220)), 실제 MCP `call_tool`에는 rewritten arguments와 request metadata가 전달되고 `call_id` 자체는 tool input이 아니다 ([dispatch](../../../../references/openai-codex/codex-rs/core/src/mcp_tool_call.rs#L566-L600)). Rollout tracing이 켜졌을 때 request metadata에 넣는 값도 native `toolCallId`와 분리된 bridge-private UUID다 ([trace correlation](../../../../references/openai-codex/codex-rs/rollout-trace/src/thread.rs#L398-L415), [metadata](../../../../references/openai-codex/codex-rs/rollout-trace/src/mcp.rs#L14-L57)). 따라서 native item ID를 server-side idempotency key로 가정하지 않는다. Proposal dedupe가 필요하면 MCP server가 실제 받는 explicit App-generated key와 returned stable patch identity가 product reconciliation을 소유해야 한다.

### Adopted Python SDK: pending response의 supported public seam이 없다

Package-owned official SDK의 curated constructors는 `CodexConfig`만 받고, `Codex`와 `AsyncCodex` 어느 쪽도 server-request handler를 받지 않는다 ([sync constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L75-L102), [async constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L289-L301)). `AsyncCodexClient`도 handler 없이 private sync client를 만든다 ([wrapper](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/async_client.py#L52-L58)). Root export test는 `CodexClient`와 `AsyncCodexClient`가 supported package surface가 아님을 고정한다 ([public API test](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/tests/test_public_api_signatures.py#L247-L269)).

내부 `CodexClient`만 `ApprovalHandler = Callable[[method, params], JsonObject]`를 주입받는다 ([private constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L65-L66), [handler injection](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L212-L221)). Sole reader는 모든 server request를 이 동기 callback으로 즉시 처리하고 result를 write하며, default는 command/file approval만 accept하고 나머지는 `{}`다 ([reader](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L773-L834)). 즉 high-level caller가 request를 event로 받아 durable pending 상태를 만든 뒤 나중에 response하는 supported seam이 아니다.

Current AY-PLE bridge는 `AsyncCodex(config)`를 사용하고 `error`, agent-message delta, `item/completed`, `turn/completed` 네 notification만 남긴다 ([construction](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L89-L121), [projection](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L87-L162)). MCP item과 server-initiated request는 Browser contract에 나오지 않는다. Ordered patch `0001`–`0005`는 routing·bound·notification opt-out·response classification만 바꾸고 handler/public interaction API는 추가하지 않는다 ([patch ledger](../../../../packages/codex-chat-runtime/upstream/PATCHES.md#L17-L47)).

이 gap은 **열린 native prompt 경로를 first vertical에서 쓰지 않는 이유**이지, durable product Review를 막는 blocker가 아니다. Follow-up `Turn`은 adopted public `AsyncThread.turn()`으로 명시적으로 시작할 수 있다 ([public turn seam](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L625-L703)).

## Current official assumption delta

2026-07-19 current manual은 App Server의 primitives를 `Thread → Turn → Item`으로 설명하고 `thread/resume`, active `turn/steer`, `turn/interrupt`, `turn/completed` lifecycle과 `mcpServerOpenaiFormElicitation` client capability를 문서화한다 ([App Server manual](https://learn.chatgpt.com/docs/app-server)). 이 문서는 in-flight server request가 process restart를 넘어 복구된다고 약속하지 않는다.

같은 날 관찰한 current `main` SHA `0fb559f0…`도 핵심 assumption을 바꾸지 않았다.

| Exact pin finding | Current SHA evidence | Delta |
| --- | --- | --- |
| Pending user input·elicitation은 `TurnState` oneshot map | [current state](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/codex-rs/core/src/state/turn.rs#L85-L130) | 없음 |
| Same-process loaded-thread resume만 pending request replay | [current replay](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L740-L746) | 없음 |
| MCP elicitation에는 tool-call item correlation TODO | [current TODO](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L294-L312) | 없음 |
| High-level Python SDK constructor에는 request handler 없음 | [current AsyncCodex](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/src/openai_codex/api.py#L287-L299), [current low-level handler](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/sdk/python/src/openai_codex/client.py#L773-L834) | 없음 |

Pin 이후에는 lifecycle 결론을 바꾸지 않는 인접 presentation·replay 변화가 있었다.

| Current change | Evidence | 023 영향 |
| --- | --- | --- |
| Interrupt된 prompt를 history에 남기고 composer를 비움 | [`70a0b1e`](https://github.com/openai/codex/commit/70a0b1eef87c4fd1398ffc77776033e5efafa645), [current tests](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/codex-rs/tui/src/chatwidget/tests/composer_submission.rs#L1142-L1201) | Cancel 뒤 명시적 follow-up instruction을 돕는 UI donor지만 pending call durability는 추가하지 않는다. |
| TUI thread switch에서 running·queued input state를 보존 | [`77a3f4e`](https://github.com/openai/codex/commit/77a3f4e80f4bda601e3a204089bd13479001ea7d), [restore path](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/codex-rs/tui/src/app/thread_routing.rs#L1421-L1428) | 같은 TUI process 안의 snapshot 범위가 넓어졌지만 restart recovery가 아니다. |
| `turn/start` event보다 먼저 새 prompt를 optimistic render | [`38b064c`](https://github.com/openai/codex/commit/38b064c31b1f7464b281006316ec878ed23fea77), [current source](https://github.com/openai/codex/blob/0fb559f0f6e231a88ac02ea002d3ecd248e2b515/codex-rs/tui/src/chatwidget/input_submission.rs#L353-L377) | 별도 follow-up `Turn`을 같은 Chat에 즉시 보여 주는 presentation donor다. |

Current source는 future adoption evidence가 아니라 조사 시점 comparison이다. Exact package pin을 upgrade하지 않고 current behavior에 기대지 않는다.

## 두 lifecycle 비교

| 관점 | Open MCP call 또는 `request_user_input` + 같은 native `Turn` | Durable `StatePatch` decision + `UserConfirmation` + follow-up native `Turn` |
| --- | --- | --- |
| Owner | Core active task, MCP server call, App Server pending callback과 live client가 함께 open lifetime을 소유한다. | App이 pending `StatePatch`와 decision을 소유하고 Codex는 origin/follow-up `Turn` execution만 소유한다. |
| Native identity | `request_user_input`은 prompt call ID를 표시하지만 answer는 `turnId` keyed다. MCP elicitation은 `(serverName, MCP requestId)`와 App Server request ID, optional `turnId`뿐이고 tool item correlation이 없다. | Origin·follow-up native Thread/Turn/Item은 optional execution provenance다. Product decision은 stable patch identity와 decision 대상 revision/version으로 식별한다. |
| 같은 Chat | 한 `Turn` 안에서 자연스럽게 이어지고 model이 answer를 즉시 받는다. | 같은 native Thread의 transcript에 MCP activity·product Review receipt·follow-up Turn을 함께 projection한다. 별도 job dashboard는 필요 없다. |
| Client reload·reconnect | Raw App Server는 같은 process에 callback이 살아 있고 loaded thread를 resume할 때 request를 replay할 수 있다. Current Browser→Server→Python SDK path에는 그 request seam이 없고 dedicated reconnect test도 없다. | App-owned durable state를 hydrate해 Review를 다시 그린다. Native open waiter 복구에 의존하지 않는다. |
| TUI thread switch | In-memory buffer가 still-pending request만 FIFO replay한다. | 같은 pending-only/filter·resolved dismissal behavior를 product store 위에 adaptation한다. |
| App Server/runtime restart | Pending oneshot·callback은 사라지고 cold resume의 stale `inProgress` turn은 `interrupted`다. 같은 call/Turn continuation을 보장할 수 없다. | Product decision은 살아 있고, continuation이 필요하면 새 native `Turn`을 명시적으로 시작한다. |
| Stale decision | Native `serverRequest/resolved`와 turn terminal은 stale overlay를 닫지만 `SemesterModel` base-state freshness를 검증하지 않는다. | Exact patch target과 current base state를 decision/apply 직전에 검증하고 stale decision은 apply하지 않는다. 구체 schema는 009/spec이 소유한다. |
| Duplicate·late response | App Server callback은 first response에서 take되고 late duplicate는 unknown callback warning으로 끝난다. Same-turn `request_user_input`은 core overwrite/FIFO assumption이 있다. | MCP server가 실제 받는 explicit App-generated request/idempotency key와 returned stable patch identity로 proposal create를 reconcile하고 decision을 one-settlement한다. Native `toolCallId`나 product cardinality에 dedupe를 맡기지 않는다. |
| Cancel·reject | Interrupt가 native `Turn`과 pending waiter를 취소한다. MCP `Cancel`/`Decline`은 server request disposition이다. 이미 proposal persistence side effect가 있었다면 tool result loss와 product outcome은 별도다. | Native interrupt, product Review 취소, patch reject와 apply를 별도 event로 정산한다. 한 결정이 다른 authority를 암묵적으로 행사하지 않는다. |
| Unknown outcome | MCP server가 proposal을 저장한 뒤 response/Turn을 잃으면 native terminal만으로 proposal 존재를 판정할 수 없다. | Stable patch identity·idempotency scope로 proposal을 reconcile하고, decision/apply도 durable one-settlement한다. Origin Turn failure를 patch rejection으로 추정하지 않는다. |
| 한 Turn의 여러 StatePatch | `request_user_input`의 turn-key/FIFO와 MCP elicitation의 missing tool-item correlation이 독립 patch 다수를 product identity로 안전하게 표현하지 못한다. | 각 `StatePatch`가 `ModelingRun`과 독립된 product interaction으로 자기 identity·decision을 가진다. Optional origin provenance만 공유할 수 있다. |
| Authority | Model reasoning 또는 MCP server interaction을 계속할 수 있게 하는 answer다. | `UserConfirmation`만 confirmed `SemesterModel` apply를 승인한다. Follow-up model input은 decision receipt이지 apply authority가 아니다. |
| Current public SDK fit | Unsupported high-level seam을 새로 열거나 private sync callback을 포트해야 한다. | Existing public `AsyncThread.turn()`으로 새 continuation을 시작할 수 있다. |

Durable column의 persistence·stale·idempotency는 native donor가 이미 제공한다는 주장이 아니다. Standing product boundary를 restart-safe하게 만들기 위해 AY-PLE가 소유해야 하는 최소 behavior이며, exact source가 그 책임을 native open interaction으로 넘길 수 없음을 증명한다.

## Disposition

| Disposition | First-vertical 판정 | 근거·경계 |
| --- | --- | --- |
| `direct reuse` | Native `Thread`·`Turn`·`McpToolCall Item` identity와 `InProgress`·`Completed`·`Failed`, result/error lifecycle, `turn/completed` terminal, explicit follow-up `Turn`과 native interrupt | MCP activity와 execution provenance는 이미 exact App Server가 소유한다. Product decision identity로 승격하지 않는다. |
| `behavior adaptation` | 같은 Chat의 inline Review surface, blocking focus, option·notes/feedback, pending-only replay, `serverRequest/resolved`에 해당하는 stale dismissal, decision receipt history, `NeedsInput`과 `NeedsApproval` 분리 | TUI pattern은 재사용하되 App-owned durable state에서 재구현한다. Plan mode를 workflow prerequisite로 만들지 않는다. |
| `confirmed residual` | Pending `StatePatch` persistence·reload/restart hydration, decision/apply idempotency·unknown-outcome reconciliation, exact target stale check, `UserConfirmation` apply authority, current bridge의 MCP item projection과 follow-up decision receipt mapping | AY-PLE product authority와 current adapter gap이다. Generic workflow engine이나 generic transcript DB를 먼저 만들라는 뜻이 아니다. |
| `deferred` | Product confirmation을 open MCP elicitation 또는 `request_user_input`으로 되돌리는 경로, private Python handler port, same-call restart recovery, auto-resolution, generic approval center, multi-client decision arbitration | 실제 product need와 supported public seam이 생기기 전에는 구현하지 않는다. Codex technical approval이 실제 발생하면 별도 UX로 admission한다. |

`request_user_input` high-level response seam 부재는 open-call design에는 capability gap이지만, 선택한 durable first vertical에는 구현 residual이 아니다. Current bridge의 `McpToolCall` started/completed/result projection은 같은 Chat에서 proposal activity를 보여주는 standing requirement이므로 confirmed residual이다.

## 009가 승인할 precise premise

009에는 다음 premise를 그대로 반영할 수 있다.

> First vertical은 `propose_state_patch` MCP call 또는 origin native `Turn`을 product Review 동안 열어 두지 않는다. Tool은 validated pending `StatePatch`를 durable하게 만들고 stable patch identity를 반환하는 데서 끝난다. App은 같은 Chat에 App-owned Review를 projection하고, reload·Server/runtime restart 뒤에도 product state에서 다시 hydrate한다. 사용자의 accept·reject·수정·feedback은 exact patch identity와 decision 대상 revision/version에 대해 idempotent하게 기록하며 stale target에는 apply하지 않는다. `UserConfirmation`만 confirmed `SemesterModel` apply를 승인한다. Agent continuation이 필요하면 decision settlement 뒤 같은 native Thread에 **새 follow-up Turn**을 시작해 patch identity와 decision receipt를 전달한다. 그 input은 product authority가 아니라 context다. 수정·feedback이 replacement proposal을 요구하면 follow-up Turn이 `propose_state_patch`를 다시 호출해 명시적인 새 proposal을 만들며, 이전 proposal을 같은 native prompt identity로 덮어쓰지 않는다. Origin native Thread·Turn과 optional `ModelingRun`은 provenance일 뿐 product decision identity가 아니다. Native interrupt, MCP `Cancel | Decline`, Codex approval과 patch reject·apply는 서로 독립적으로 정산한다.

이 premise는 모든 decision이 반드시 model call을 하나 더 소비한다고 정하지 않는다. **Agent continuation이 존재한다면 항상 별도 follow-up `Turn`**이라는 lifecycle만 고정한다. Accept/reject 뒤 product receipt만으로 끝낼 수 있는지, direct edit와 replacement proposal의 exact UX·domain transition은 009/spec이 first-vertical scope에 맞게 정한다.

## Prototype과 verification disposition

별도 prototype을 권고하지 않는다. Same-turn continuation, pending-only replay, cancellation과 cold-resume interruption은 primary tests와 source가 같은 방향이고 current `main`도 핵심 구조를 유지한다. 다음 중 하나가 새 requirement가 될 때만 throwaway prototype ticket을 만든다.

- App Server/runtime process restart 뒤에도 원래 MCP call·tool item·native `Turn` identity를 그대로 resume해야 한다.
- Supported high-level Python SDK가 durable server-request callback/replay API를 새로 제공해 open-call assumption을 바꾼다.
- Two Browser client가 같은 product decision을 동시에 처리해야 하며 App-owned idempotency만으로 UX가 불명확하다.

이번 조사는 source와 tests를 읽는 non-mutating research였다. Runtime build, provider trace, Browser E2E와 prototype은 실행하지 않았다. `request_user_input` reconnect 전용 App Server test가 없다는 점은 same-process replay source보다 강한 보장으로 주장하지 않았다.
