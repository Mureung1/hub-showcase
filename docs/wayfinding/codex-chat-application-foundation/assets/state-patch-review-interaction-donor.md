# StatePatch Review interaction donor

이 문서는 Wayfinder ticket `023`의 bounded research 결과다. Exact pin과 2026-07-19 시점 current official source·manual을 기준으로, Codex Plan mode와 built-in `request_user_input`을 first vertical의 live `StatePatch` Review에 직접 쓸 수 있는지 판정한다. 최초 조사는 unanswered Review가 reload·Server/runtime restart를 넘어야 한다는 전제에서 durable product decision·후속 `Turn`을 선택했지만, 사용자는 후속 결정에서 그 전제를 철회했다. 이 revision은 source fact를 보존하면서 restart limitation을 blocker가 아니라 accepted failure contract로 재분류한다.

## 결론

- First vertical은 **exact Plan mode + built-in `request_user_input` + same native `Turn` continuation**을 채택한다. `propose_state_patch`가 App이 검증한 proposal과 stable patch identity를 반환한 뒤 Agent가 built-in 질문을 열고 Browser 답변을 같은 `Turn`의 function call output으로 받는다. MCP elicitation은 이 경로에 사용하지 않는다.
- Unanswered prompt와 active `Turn`은 ephemeral이다. 답변 전 Browser·Server/runtime continuity를 잃으면 native `Turn`을 `interrupted`로 끝내고 confirmed `SemesterModel`을 바꾸지 않은 채 다시 실행한다. Pending `StatePatch`를 receipt로 저장할 수는 있지만 first vertical은 original call resume나 며칠 뒤 Review를 보장하지 않는다.
- `request_user_input`은 conversation carrier이지 product apply authority가 아니다. Browser가 App-validated exact patch를 보여 주고, App-owned `StatePatch` persistence와 decision reconciliation이 active patch binding을 검증해 settled `UserConfirmation`과 apply outcome을 기록한 뒤에만 confirmed `SemesterModel`을 바꾼다. 일반 Plan clarification은 학업 상태를 변경하지 않는다.
- Exact local official Python SDK에는 Plan `collaborationMode`, non-blocking deferred server-request response와 Browser projection seam이 없다. 이 repository는 exact SDK를 ordered patch로 유지하므로 gap은 기각 사유가 아니라 bounded next patch candidate다. Private sync handler에서 기다리지 않고 sole reader를 계속 drain하는 queue·later-response interface가 필요하다.
- Native semantics는 source와 primary tests로 충분히 고정돼 있어 별도 research prototype은 만들지 않는다. Resulting implementation은 actual-child same-Turn round trip, pending 중 reader liveness, interrupt·close·duplicate·overflow, Plan item projection과 Browser E2E를 검증해야 한다. Restart-durable unanswered Review는 실제 requirement가 생길 때 별도로 admission한다.

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

`run_turn`은 model function call을 실행하고 그 output을 다음 sampling request에 넣으며, assistant-only response에서만 `Turn`을 마친다 ([turn loop contract](../../../../references/openai-codex/codex-rs/core/src/session/turn.rs#L128-L140), [follow-up loop](../../../../references/openai-codex/codex-rs/core/src/session/turn.rs#L297-L318)). `request_user_input`은 default로 Plan mode에서만 available하고 feature가 켜질 때 Default mode에도 나타난다. Execute와 Pair Programming에는 제공되지 않는다 ([mode policy](../../../../references/openai-codex/codex-rs/tools/src/tool_config.rs#L38-L46), [primary test](../../../../references/openai-codex/codex-rs/tools/src/tool_config_tests.rs#L165-L178)). First vertical이 **Plan mode 그대로**를 가져오려면 under-development Default-mode flag로 우회하지 않고 `turn/start.collaborationMode`와 Plan item presentation을 함께 port해야 한다.

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

이 store와 buffer 역시 TUI struct의 memory state다 ([store](../../../../references/openai-codex/codex-rs/tui/src/app/thread_events.rs#L40-L74)). Interrupt path의 TODO는 committed answer조차 follow-up 문제 없이 reliably persist하지 못한다고 명시한다 ([interrupt TODO](../../../../references/openai-codex/codex-rs/tui/src/bottom_pane/request_user_input/mod.rs#L1218-L1223)). Revised first-vertical contract는 이 limitation을 받아들인다. Unanswered prompt와 native `Turn`은 interrupt·retry하고, App-owned `StatePatch` persistence·decision reconciliation에 이미 one-settlement된 `UserConfirmation`, apply outcome과 confirmed `SemesterModel`만 process lifetime 밖의 authority로 유지한다.

### MCP elicitation: open-call continuation은 검증됐지만 tool-call correlation이 없다

In-turn MCP elicitation은 core가 `(server_name, MCP request_id)` keyed oneshot을 등록하고 optional `turn_id`를 실은 event를 보낸 뒤 response를 기다린다 ([core request](../../../../references/openai-codex/codex-rs/core/src/session/mcp.rs#L194-L282), [resolve](../../../../references/openai-codex/codex-rs/core/src/session/mcp.rs#L289-L309)). App Server protocol은 `threadId`, optional `turnId`, `serverName`, form/`openai/form`/URL request를 제공하지만, **elicitation과 `McpToolCall` item ID의 연관은 아직 없다는 TODO**를 직접 남긴다 ([identity and TODO](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L294-L312), [request variants](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L631-L664)).

Primary test는 agent-invoked MCP call에서 `turnId=Some(origin turn)`인 elicitation을 accept하면 원래 `TOOL_CALL_ID`의 function output이 다음 sampling에 들어가고, `serverRequest/resolved` 뒤 같은 `Turn`이 completed됨을 증명한다 ([in-turn request](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/mcp_server_elicitation.rs#L102-L168), [settlement](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/mcp_server_elicitation.rs#L545-L607)). 반면 client가 직접 호출한 out-of-band `mcpServer/tool/call`의 elicitation은 `turnId=None`이며 outer RPC만 기다린다 ([out-of-band test](../../../../references/openai-codex/codex-rs/app-server/tests/suite/v2/mcp_tool.rs#L210-L320)). `turnId` 존재만으로 어떤 native tool item 또는 어떤 product patch를 결정하는지 추정하면 안 된다.

Native `McpToolCall` item 자체는 stable item `id`, server, tool, arguments, `InProgress | Completed | Failed`, result/error와 duration을 제공한다 ([item](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L299-L318), [mapping](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L944-L968), [status](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1090-L1117)). 이 lifecycle은 `propose_state_patch` activity projection에 직접 재사용할 수 있다. Elicitation request identity를 product patch identity로 재사용할 수 있다는 뜻은 아니다.

Native `call_id`는 `McpToolCall Item.id`를 만들지만 ([item emission](../../../../references/openai-codex/codex-rs/core/src/tools/handlers/mcp_resource.rs#L202-L220)), 실제 MCP `call_tool`에는 rewritten arguments와 request metadata가 전달되고 `call_id` 자체는 tool input이 아니다 ([dispatch](../../../../references/openai-codex/codex-rs/core/src/mcp_tool_call.rs#L566-L600)). Rollout tracing이 켜졌을 때 request metadata에 넣는 값도 native `toolCallId`와 분리된 bridge-private UUID다 ([trace correlation](../../../../references/openai-codex/codex-rs/rollout-trace/src/thread.rs#L398-L415), [metadata](../../../../references/openai-codex/codex-rs/rollout-trace/src/mcp.rs#L14-L57)). 따라서 native item ID를 server-side idempotency key로 가정하지 않는다. Proposal dedupe가 필요하면 MCP server가 실제 받는 explicit App-generated key와 returned stable patch identity가 product reconciliation을 소유해야 한다.

### Adopted Python SDK: pending response의 supported public seam이 없다

Package-owned official SDK의 curated constructors는 `CodexConfig`만 받고, `Codex`와 `AsyncCodex` 어느 쪽도 server-request handler를 받지 않는다 ([sync constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L75-L102), [async constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L289-L301)). `AsyncCodexClient`도 handler 없이 private sync client를 만든다 ([wrapper](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/async_client.py#L52-L58)). Root export test는 `CodexClient`와 `AsyncCodexClient`가 supported package surface가 아님을 고정한다 ([public API test](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/tests/test_public_api_signatures.py#L247-L269)).

내부 `CodexClient`만 `ApprovalHandler = Callable[[method, params], JsonObject]`를 주입받는다 ([private constructor](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L65-L66), [handler injection](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L212-L221)). Sole reader는 모든 server request를 이 동기 callback으로 즉시 처리하고 result를 write하며, default는 command/file approval만 accept하고 나머지는 `{}`다 ([reader](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L773-L834)). 즉 high-level caller가 request를 event로 받아 durable pending 상태를 만든 뒤 나중에 response하는 supported seam이 아니다.

Current AY-PLE bridge는 `AsyncCodex(config)`를 사용하고 `error`, agent-message delta, `item/completed`, `turn/completed` 네 notification만 남긴다 ([construction](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L89-L121), [projection](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L87-L162)). MCP item과 server-initiated request는 Browser contract에 나오지 않는다. Ordered patch `0001`–`0005`는 routing·bound·notification opt-out·response classification만 바꾸고 handler/public interaction API는 추가하지 않는다 ([patch ledger](../../../../packages/codex-chat-runtime/upstream/PATCHES.md#L17-L47)).

Private sync handler를 high-level `AsyncCodex`에 그대로 노출하고 Browser 답을 기다리게 하는 것은 안전한 port가 아니다. Sole reader가 handler return 뒤에야 JSON-RPC response를 쓰므로 ([reader](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py#L803-L834)), callback을 block하면 pending 동안 다른 Turn의 response·notification·interrupt도 읽지 못한다. Reader는 server request를 bounded pending route로 넘긴 뒤 계속 drain하고, 별도 caller가 exact request를 one-settlement하는 deferred response interface가 필요하다.

Plan mode 자체도 high-level surface에 빠져 있다. Exact App Server의 `TurnStartParams`는 experimental `collaborationMode`를 받지만 ([native field](../../../../references/openai-codex/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L142-L153)), current public `AsyncThread.turn()`은 이를 노출하지 않는다 ([public turn seam](../../../../packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py#L653-L703)). Current bridge는 `item/plan/delta`를 opt-out하고 completed item 중 `AgentMessage`만 projection하므로 ([notification selection](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py#L89-L112), [item projection](../../../../packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py#L87-L125)), native Plan 본문도 Browser에서 잃을 수 있다.

### Bounded ordered patch seam

| Layer | First-vertical interface | 반드시 숨길 implementation complexity |
| --- | --- | --- |
| Exact Python SDK next patch candidate | Plan `collaborationMode`를 high-level turn input에 추가하고 exact `item/tool/requestUserInput`만 typed pending request로 surface한다. Caller는 next request를 받고 나중에 answer 또는 cancel한다. | Raw App Server request ID, bounded queue·pending map, response-before-`turn/start` race, one-settlement, duplicate·late response, transport close와 reader liveness |
| AY-PLE Python bridge·Node runtime | `user_input.requested`·`user_input.resolved` event와 `respond_user_input` operation을 제공한다. Product-facing caller는 opaque interaction correlation만 안다. | SDK JSON-RPC ID, thread-safe response write, active Turn binding, interrupt·runtime failure cleanup과 capacity |
| Plan presentation | `item/plan/delta`와 completed `PlanThreadItem`을 기존 native `Item` identity로 같은 Chat에 projection한다. | `turn/plan/updated` checklist와 Plan-mode proposal item을 섞지 않고 response ordering을 보존하는 routing |
| Browser | 1–3개 질문, option·free-form answer와 App-validated exact `StatePatch` Review를 같은 Chat에서 보여 주고 answer를 제출한다. | Product confirmation이면 silent auto-resolution을 금지하고 exact active patch binding·apply result에 맞춰 Codex answer를 보냄 |

이 seam은 Rust Core의 Plan reasoning이나 `request_user_input` tool을 fork하지 않는다. Native implementation을 그대로 실행하고 current Python distribution·bridge에 누락된 transport와 presentation만 ordered patch로 추가한다. 이 repository가 이미 exact source preimage, patch ledger, official suite·Ruff·actual-child gate를 소유하므로 ([patch discipline](../../../../packages/codex-chat-runtime/upstream/PATCHES.md#L1-L16)), 새 custom workflow보다 locality가 높다.

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

| 관점 | Native Plan `request_user_input` + 같은 `Turn` — selected | Durable async Review + follow-up `Turn` — deferred |
| --- | --- | --- |
| Owner | Core active task와 App Server pending callback이 live interaction을 소유하고 App은 exact patch binding·settled decision·apply만 소유한다. | App이 unanswered proposal·Review queue·decision lifecycle 전체를 소유하고 Codex는 origin·follow-up execution만 소유한다. |
| Identity | Native prompt는 `threadId`·`turnId`·`itemId`로 표시한다. Product confirmation이면 App이 별도 stable patch identity와 정확히 결합해야 한다. | Product patch·decision identity가 native execution과 독립이며 native IDs는 optional provenance다. |
| 같은 Chat | 한 `Turn` 안에서 질문·답·후속 reasoning이 이어진다. Model이 answer를 즉시 받으며 separate follow-up `Turn`이 필요 없다. | Review receipt와 새 `Turn`을 같은 transcript에 projection할 수 있지만 model continuation은 별도 operation이다. |
| Browser disconnect·reload | First vertical은 continuity를 보장하지 않는다. Same-process replay가 실제로 유지되면 사용할 수 있지만 stream을 잃으면 interrupt·no-apply·retry로 정산한다. | App state에서 unanswered Review를 다시 hydrate할 수 있다. |
| TUI thread switch | In-memory buffer가 still-pending request만 replay하는 native behavior를 Browser pending presentation에 참고한다. | 같은 pattern을 durable product store 위에 다시 구현해야 한다. |
| App Server/runtime restart | Pending oneshot·callback은 사라지고 cold resume의 stale `inProgress` turn은 `interrupted`다. 이것을 accepted failure로 삼고 original call resume을 시도하지 않는다. | Product Review는 살아 있고 필요하면 새 native `Turn`을 시작할 수 있다. |
| Stale binding | Native terminal만으로 product base-state freshness를 검증하지 못한다. App이 answer를 받기 전에 exact active patch와 current base를 검증하며 mismatch는 apply하지 않는다. | 같은 검증이 필요하고 오래 열린 Review일수록 stale reconciliation 범위가 커진다. |
| Duplicate·late answer | App Server callback은 first response에서 take되고 late duplicate는 무시한다. Product decision은 exact patch에 대해 one-settlement하며 same decision retry만 idempotent success로 허용한다. | Durable decision endpoint도 같은 one-settlement를 구현해야 한다. |
| Cancel·reject | Answer 전 interrupt·runtime loss는 no-apply다. Explicit reject는 App이 decision을 기록한 뒤 Codex에 답하며 confirmed state를 바꾸지 않는다. | Native interrupt와 product Review 취소를 별도 lifecycle로 정산한다. |
| Apply 뒤 Codex response loss | App이 atomic decision·apply를 먼저 commit했다면 product state가 authoritative하다. Turn continuation만 실패로 표시하고 같은 patch를 재적용하지 않는다. | Product state는 동일하게 authoritative하고 follow-up delivery만 retry할 수 있다. |
| 한 `Turn`의 여러 patch | First vertical은 exact active unanswered patch 하나에만 product confirmation을 결합한다. 일반 clarification은 patch와 결합하지 않는다. Generic multi-patch arbitration은 만들지 않는다. | 여러 independent Review를 durable queue로 표현할 수 있지만 first vertical 밖이다. |
| Authority | `request_user_input` answer는 model context다. App-owned patch·decision reconciliation이 exact binding을 확인하고, settled `UserConfirmation`만 confirmed `SemesterModel` apply를 승인한다. | Product decision이 authority이고 follow-up input은 context다. |
| Current public SDK fit | Missing Plan mode·deferred response·Plan item projection을 bounded ordered patch로 추가해야 한다. | Existing follow-up `Turn`은 쓸 수 있지만 unanswered lifecycle·hydration·reconciliation을 새로 소유해야 한다. |

선택한 column은 native interaction이 durable하다고 주장하지 않는다. First vertical은 그 반대로 unanswered prompt의 process-local lifetime을 명시적으로 받아들인다. Product durability의 최소선은 settled `UserConfirmation`, apply outcome과 confirmed `SemesterModel`이며, unanswered Review의 장기 보존은 실제 사용자 요구가 생길 때 확장한다.

## Disposition

| Disposition | First-vertical 판정 | 근거·경계 |
| --- | --- | --- |
| `direct reuse` | Exact Plan collaboration semantics, built-in `request_user_input` schema, same-`Turn` pause·function output·continued sampling, native `Thread`·`Turn`·`Item` identity, Plan item lifecycle, `serverRequest/resolved`, interrupt와 terminal | Rust Core·App Server가 이미 behavior authority다. AY-PLE가 Plan reasoning·question tool·resume loop를 다시 구현하지 않는다. |
| `behavior adaptation` | Exact Python SDK ordered patch의 non-blocking deferred response seam, bridge request·answer operation, Browser inline question·option·free-form UI, Plan item projection과 `NeedsInput`·`NeedsApproval` 분리 | Native protocol shape와 ordering을 보존하되 raw JSON-RPC ID와 queue mechanics를 product caller에게 노출하지 않는다. |
| `confirmed residual` | Public Plan `collaborationMode`, exact `item/tool/requestUserInput` pending route, reader liveness·bound·one-settlement, current bridge의 MCP·Plan item projection, exact active patch binding과 atomic `UserConfirmation`·apply | Bounded integration gap과 product authority다. Durable unanswered workflow나 generic server-request gateway를 뜻하지 않는다. |
| `deferred` | Unanswered Review의 reload·restart hydration, original same-call cold resume, 며칠 뒤 Review, MCP elicitation을 product confirmation으로 사용, silent auto-resolution, multi-patch·multi-client arbitration과 generic approval center | 실제 product need가 확인될 때 별도 admission한다. First vertical에서는 interruption·no-apply·retry가 정상 contract다. |

`request_user_input` high-level response seam 부재는 selected path의 confirmed residual이다. Current bridge의 `McpToolCall` started·completed·result와 Plan item projection도 같은 Chat에서 proposal·계획 activity를 보여 주기 위해 resulting integration이 소유한다. 반면 unanswered prompt persistence는 residual이 아니라 명시적으로 deferred한 capability다.

## 009가 승인할 precise premise

009에는 다음 premise를 그대로 반영할 수 있다.

> First vertical은 exact Plan mode와 built-in `request_user_input`을 current ordered Python SDK의 bounded patch로 연다. `propose_state_patch`가 App-validated proposal과 stable patch identity를 반환한 뒤 Agent는 MCP elicitation이 아니라 built-in 질문으로 수락·수정 요청·거절을 묻고, Browser answer는 같은 native `Turn`에 돌아간다. Product decision으로 취급하려면 App이 exact active unanswered patch 하나와 Browser interaction을 결합하고 current base를 검증해야 한다. 수락·수정·거절은 settled `UserConfirmation`과 apply outcome을 one-settlement하며, 일반 Plan clarification은 학업 상태를 바꾸지 않는다. Answer 전 Browser·Server/runtime continuity를 잃으면 `Turn`을 `interrupted`로 끝내고 confirmed `SemesterModel`을 바꾸지 않은 채 다시 실행한다. App이 atomic decision·apply를 commit한 뒤 Codex response가 유실되면 product state가 authoritative하고 Turn continuation만 실패다. First vertical은 unanswered Review의 reload·restart hydration, original call resume, 며칠 뒤 Review와 multi-patch arbitration을 보장하지 않는다. Native execution approval·MCP action과 AY-PLE product confirmation은 계속 독립 authority다.

이를 위해 exact SDK patch는 sole reader를 block하는 private handler reach-through가 아니라 Plan `collaborationMode`, bounded pending server-request route와 later response를 high-level interface로 제공한다. Bridge·runtime은 opaque interaction correlation, `user_input.requested`·resolved event와 answer operation을 소유하고, Plan delta·completed Plan item을 같은 Chat에 projection한다. Exact internal JSON-RPC ID, queue와 response-before-`turn/start` race는 이 interface 뒤에 숨긴다.

## Prototype과 verification disposition

별도 research prototype을 권고하지 않는다. Same-Turn continuation, pending-only replay, cancellation과 cold-resume interruption은 primary tests와 source가 같은 방향이고 current `main`도 핵심 구조를 유지한다. Resulting implementation ticket은 다음 conformance를 직접 통과해야 한다.

- Actual Plan `collaborationMode`에서 질문→Browser answer→같은 `Turn`의 second sampling·terminal round trip
- Pending answer 동안 unrelated response·notification과 다른 active Turn을 계속 읽는 sole-reader liveness
- Request-before-`turn/start` response race, bounded pending route·overflow, exact question/answer validation과 one-settlement
- Interrupt·close·runtime loss, duplicate·late answer와 answer 전 no-apply·retry
- `item/plan/delta`·completed Plan item의 Browser projection과 product confirmation의 exact active patch binding

App Server/runtime process restart 뒤 original call identity를 그대로 resume하거나 two Browser client가 같은 unanswered decision을 처리해야 한다는 requirement가 생길 때만 durable Review·multi-client behavior를 별도 Wayfinder/prototype으로 admission한다. 이번 조사는 source와 tests를 읽는 non-mutating research였고 Runtime build, provider trace, Browser E2E와 prototype은 실행하지 않았다. `request_user_input` reconnect 전용 App Server test가 없다는 점은 same-process replay source보다 강한 보장으로 주장하지 않았다.
