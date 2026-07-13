# Pinned Codex production conversation ownership map

- 분류: 기술 참고
- 성숙도: 초안
- 대상 pin: `@openai/codex@0.144.0`, upstream commit `767822446c7a594caa19609ca435281a9ec67e0d`
- 범위: `codex-core`, App Server의 per-thread listener, production TUI·exec의 thread/task/turn/item identity, conversation ownership, input routing, terminal·history·cleanup

이 문서는 Wayfinder Ticket 006의 source evidence asset이다. Ticket 004의 method lifecycle과 Ticket 005의 connection architecture 결론을 복사하지 않고 pinned production source와 tests에서 conversation ownership을 다시 추적했다. 최종 AY-PLE module seam, public identity API, concurrency·delivery·recovery policy는 Tickets 008–012가 결정한다.

## 결론

1. First-party production 구조에는 TUI와 exec가 공유하는 별도 범용 conversation kernel이 없다. `codex-core`의 `ThreadManager`·`CodexThread`·`Session`이 engine conversation의 deep module이고, App Server가 이를 protocol로 노출하며, TUI와 exec는 각 use case에 맞는 state projection을 직접 소유한다.
2. 이 사실은 AY-PLE이 monolithic `HeadlessCodexClientHost`를 유지해야 한다는 뜻도, 반드시 별도 generic kernel을 만들어야 한다는 뜻도 아니다. Source가 반복해서 보여 주는 ownership locality는 **single connection ingress, native identity 기반 scope routing, surface별 conversation state**다. 이를 하나 또는 여러 Module로 표현할지는 Ticket 008이 첫 product tracer에 맞춰 결정해야 한다.
3. Core의 `ThreadId`는 resume 뒤에도 유지되는 persistent native identity다. Idle thread에서 시작한 user turn은 core submission ID를 running turn ID로 사용하지만, 이미 turn이 active인 상태의 두 번째 `turn/start`는 새 response ID를 반환하면서 input을 기존 active turn으로 steer할 수 있다. Item ID도 source-owned이지만 string 형식과 생성 주체는 균일하지 않다. Process generation마다 이를 새 UUID로 remap하거나 모두 UUIDv7로 가정할 근거는 없다.
4. Command·active task·pending input·event drain은 thread-local이다. Bootstrap 예외를 제외한 TUI steady state도 한 ingress에서 native `ThreadId`로 per-thread store에 route하고, 현재 화면에 보이지 않는 thread의 진행을 막지 않는다. Generation-wide journal이나 current-view global lock은 first-party conversation invariant가 아니다.
5. Start/resume response snapshot, live notification, `thread/read` replay snapshot, exact turn terminal, late/background observation drain은 서로 다른 authority다. Core의 background process watcher는 terminal 뒤에도 원래 `Session`·`TurnContext` ownership을 유지할 수 있다. Exec의 terminal-time one-shot backfill과 TUI의 replay buffer는 각 surface의 recovery 편의이며 generic delivery contract가 아니다.
6. 채택 대상은 ownership과 scope pattern이다. Core/TUI의 unbounded queues, magic capacities, detached overflow task, string error parsing, weak persistence outcome, widget reconstruction과 exec의 single-turn 즉시 종료 정책은 복사하지 않는다.

## 판독 규칙

| 표기 | 의미 |
| --- | --- |
| Source fact | Exact pin의 production source 또는 test가 직접 보이는 동작 |
| Source inference | Task graph·호출 관계에서 도출했지만 독립된 public contract/test가 없는 해석 |
| Production surface policy | TUI·exec의 UX 또는 단일-process 운용에 맞춘 선택 |
| Transferable constraint | Transport와 UI가 달라도 conversation client가 보존해야 하는 Codex-native 의미 |
| AY-PLE candidate | 후속 ticket에서 첫 tracer로 검증할 ownership 가설 |
| Deferred decision | Tickets 008–013이 소유하며 이 문서가 확정하지 않는 선택 |

## Production topology

| Layer / Module | Production owner | Source-grounded responsibility | 판정 |
| --- | --- | --- | --- |
| Core live registry | `ThreadManager` | `HashMap<ThreadId, Arc<CodexThread>>`와 shared runtime service를 소유하고 start/resume/fork/remove/bounded shutdown을 조정한다. ([manager role](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L180-L185), [state](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L236-L260)) | Engine collection owner. Product conversation state가 아니다. |
| Core per-thread handle | `CodexThread` → `Codex` / `Session` | 한 thread의 submit, steer, event drain, status, rollout/history, shutdown을 감싼다. ([handle](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/codex_thread.rs#L161-L203), [input control](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/codex_thread.rs#L253-L300), [event/status](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/codex_thread.rs#L414-L450)) | Deep thread Module. External TS client가 이 Rust Interface를 복제할 필요는 없다. |
| Core multi-agent control | `AgentControl` | Root-tree agent spawn/residency와 native `ThreadId` 기반 input/interrupt routing을 담당한다. ([scope](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/agent/control.rs#L88-L108), [routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/agent/control.rs#L140-L175)) | Multi-agent runtime control plane이지 generic external client가 아니다. |
| Protocol fanout | App Server per-thread listener | `conversation.next_event()`를 thread당 한 task가 독점 drain하고 thread-local state를 갱신한 뒤 subscribed connection IDs로 fanout한다. ([listener loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L277-L343)) | One drain owner + projection/fanout pattern은 채택한다. |
| TUI typed RPC adapter | `AppServerSession` | 한 `AppServerClient`, request ID sequencer와 typed method/config mapping을 소유한다. Per-thread state map은 소유하지 않는다. ([fields](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L175-L230)) | Thin protocol adapter. Config breadth는 TUI surface policy다. |
| TUI multi-thread projection | `App` + `ThreadEventStore` | Native `ThreadId` keyed channel/store, primary·active thread, pending requests, replay snapshot과 UI input state를 소유한다. ([App fields](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app.rs#L556-L587), [store](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L1-L50)) | Conversation view/application state. Core state의 대체물이 아니다. |
| TUI current view | `ChatWidget` | 현재 보이는 transcript, composer와 surface-level input/steer queue를 소유한다. ([protocol state](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/chatwidget/protocol.rs#L60-L75), [input queues](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/chatwidget/input_queue.rs#L21-L45)) | Terminal UI convenience. Browser/product kernel contract로 승격하지 않는다. |
| Exec one-shot run | `run_exec_session` + event processor | 한 primary thread와 target turn의 output projection을 소유하되, ingress에서는 전체 server request 처리와 terminal backfill을 output filter보다 먼저 수행한다. ([bootstrap](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L795-L864), [run loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L956-L1053)) | One-shot CLI adapter. Generic multi-thread kernel이 아니다. |

First-party의 중요한 경계는 “connection 아래에 반드시 범용 chat kernel이 있다”가 아니다. Core engine state, App Server connection/fanout, consumer별 projection이라는 세 locality가 있으며, TUI와 exec는 같은 protocol을 서로 다른 깊이로 소비한다. 이는 Ticket 008에서 첫 product tracer가 요구하는 Interface를 검토할 때의 locality evidence다. 하나의 deep Module 안에 internal seam을 둘 수도, 반복되는 consumer 경계가 확인되면 shared Module을 추출할 수도 있으며, 이 문서는 어느 package/seam도 미리 확정하지 않는다.

## Native identity authority

| Identity | Exact-pin fact | Architectural consequence |
| --- | --- | --- |
| Thread | Codex generator는 UUIDv7 `ThreadId`를 만들지만 parser는 일반 UUID도 허용한다. New/Cleared/Forked history는 새 ID를 만들고 Resumed history는 persisted `conversation_id`를 재사용한다. ([type](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/thread_id.rs#L11-L31), [session selection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/session.rs#L525-L551)) | Native ID는 process generation보다 오래 산다. Ticket 009는 internal key 보존, alias/remapping, product identity의 경계를 이 사실에 맞춰 결정해야 한다. |
| User turn | `Submission.id`가 event correlation ID다. Idle start에서는 turn-creating submission ID가 `TurnContext.sub_id`가 되어 App Server public turn ID와 running lifecycle을 연결한다. 그러나 active turn `T1` 중 두 번째 `turn/start`는 새 submission/response ID `T2`를 만들고도 input을 `T1`에 steer하며 returned active ID를 버린다. ([submission/event](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/protocol.rs#L168-L179), [generator contract](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L903-L910), [context](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/turn_context.rs#L101-L146), [active routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L285)) | Response ID만으로 active running turn을 확정할 수 없다. Ticket 009–010은 native identity 표현과 active-start policy를 함께 검증해야 한다. |
| Internal turn/task | Core에는 branded `TurnId`가 없고 일부 internal sub ID는 `auto-compact-N` 형식이다. ([internal generator](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L1220-L1225)) | 모든 turn ID가 UUIDv7이라고 가정하지 않는다. ID는 opaque native string으로 다룬다. |
| Item | `TurnItem::id()`는 variant별 native string을 반환한다. Core는 existing response ID를 보존하고, item IDs feature 또는 paginated history에서 missing ID만 prefixed UUIDv7로 채운다. ([item identity](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/protocol/src/items.rs#L624-L647), [assignment](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L2766-L2819), [condition](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/turn_context.rs#L153-L157)) | Native item string과 `(thread, turn, item)` scope를 보존한다. 단일 생성 규칙이나 global uniqueness를 새 contract로 만들지 않는다. |
| Request | Connection-level JSON-RPC request ID와 engine thread/turn/item identity는 다른 namespace다. TUI `AppServerSession`도 request sequencer를 thread state와 분리한다. ([session fields](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L175-L230)) | Pending RPC ownership과 conversation state를 하나의 ref hierarchy로 합치지 않는다. |

`ThreadId`를 내부에서 그대로 보존하는 것은 raw JSON shape를 product contract로 노출하는 것과 다르다. AY-PLE product에는 `ModelingRun` 같은 제품 receipt를 노출하면서 integration 내부 native correlation을 유지하는 설계가 가능하다. Exact typed/branded representation, 별도 product ref 필요 여부와 persistence 범위는 Ticket 009가 정한다.

## Creation, resume, fork와 history ownership

### Start와 readiness

- `ThreadManager`의 start/resume wrapper는 `spawn_thread_with_source`로 수렴한다. ([start](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L647-L720), [resume](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L760-L817))
- Core는 first event가 `INITIAL_SUBMIT_ID`의 `SessionConfigured`인지 확인한 뒤에만 `CodexThread`를 manager map에 publish한다. Duplicate insertion의 losing runtime은 shutdown한다. ([readiness barrier](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L1636-L1676))
- 이는 “fully initialized before in-process publication” pattern의 근거다. Stdio의 response/notification ordering 보장은 아니며 Ticket 004 fact table을 덮어쓰지 않는다.

### Resume와 fork

- Resume가 동일 ID·동일 rollout path의 live thread를 만나면 같은 `Arc<CodexThread>`를 반환한다. 다른 path면 거부하고, stopped entry면 map에서 제거한 뒤 같은 native ID로 새 runtime을 만든다. ([live resume](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L1541-L1562), [same-Arc test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager_tests.rs#L945-L1003))
- Fork는 source의 committed history snapshot을 읽고 새 `ThreadId`와 `forked_from` lineage를 만든다. Live subagent fork는 read 전에 rollout을 materialize하고 flush한다. ([fork snapshot](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L949-L1070), [live flush barrier](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L723-L757))
- Resume identity equality와 fork identity inequality는 ThreadStore 기반 test로 고정된다. ([identity test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager_tests.rs#L1200-L1306))

### Live state와 snapshot

- Non-ephemeral `Session`은 native `ThreadId`로 `LiveThread`를 create/resume하고 ephemeral thread는 persistence를 생략한다. ([persistence construction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/session.rs#L579-L647))
- App Server `thread/read`의 authority는 mixed다. `includeTurns: false`는 loaded 여부와 무관하게 persisted `ThreadStore` metadata를 우선하고, 아직 materialize되지 않은 loaded thread만 live snapshot으로 fallback한다. `includeTurns: true`인 loaded thread는 persisted metadata와 `CodexThread.load_history()`의 live history를 결합하며, unloaded thread는 store metadata/history를 함께 읽는다. Metadata mutation의 live/cold routing은 또 별도다. ([read selection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2255-L2297), [live history](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L2397-L2412), [metadata mutation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L572-L608))
- TUI는 start/resume response의 thread/session/initial turns를 bootstrap authority로 사용한다. `thread/read(includeTurns)` fallback은 live listener attach가 아니라 `ReplayOnly` snapshot으로 표시한다. ([response mapping](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L1522-L1565), [live-vs-replay](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/session_lifecycle.rs#L256-L319))

Transferable constraint는 “resume/fork/history를 TS client가 재구현한다”가 아니다. Core/App Server가 소유한 native history authority를 사용하고, live attachment와 point-in-time snapshot을 Interface에서 혼동하지 않는 것이다.

## Per-thread command와 turn ownership

### Core command path

- `Codex`는 high-level queue pair다. 각 thread는 bounded submission channel(capacity 512), unbounded event channel, 한 submission loop와 shared termination future를 가진다. ([queue pair](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L386-L399), [channels](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L468-L469), [session-loop spawn](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L726-L739))
- 한 FIFO submission loop가 `Op`를 순서대로 dispatch하고, `Session`은 동시에 최대 한 running task와 thread-local input queue를 소유한다. ([loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L714-L872), [session invariant](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/session.rs#L25-L48))
- Task start는 turn lifecycle을 기록하고 background task를 spawn한 뒤 single active turn에 설치한다. Completion은 matching task를 제거하고 terminal을 emit한 뒤 active turn을 clear한다. ([start](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/mod.rs#L313-L451), [finish](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/mod.rs#L563-L804))

`512`와 unbounded event queue는 pinned implementation fact이지 AY-PLE delivery contract가 아니다. Mailbox `VecDeque`와 active-turn pending `Vec`도 scope-local이지만 unbounded다. Ticket 011이 external client bound와 overflow semantics를 정한다.

### Start, steer와 interrupt

- Core의 user input handler는 regular turn이 active면 같은 turn의 pending steer input으로 넣고 idle이면 새 `RegularTask`를 시작한다. ([routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L285))
- `steer_input`은 active task, optional expected native turn ID, steerability와 nonempty input을 atomically 검증하고 turn-local queue에 append한다. ([steer](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3867-L3947), [mismatch test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/tests.rs#L9993-L10036))
- App Server의 `turn/start`는 `Op::UserInput`을 submit하고 새 submission ID를 response turn ID로 사용한다. Idle thread에서는 이 ID로 regular turn이 시작된다. 이미 `T1`이 active이면 core는 새 `T2` context를 만든 뒤 input을 `T1`에 steer하고 `steer_input`이 반환한 `T1`을 버리므로 response `T2`는 running turn identity가 아니다. ([mapping](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/turn_processor.rs#L521-L568), [user-input handler](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L194-L285), [active ID return](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3882-L3947))
- TUI는 notification-derived cached active turn이 있으면 `turn/steer(expectedTurnId)`, 없으면 `turn/start`를 사용한다. Missing active turn이면 cache를 clear하고 start로 전환하며, mismatch면 server-reported actual ID로 한 번 재시도한다. Non-steerable turn의 queueing은 `ChatWidget` policy다. ([TUI routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L517-L678), [typed methods](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app_server_session.rs#L771-L868))
- TUI는 user turn submit 직후 `user_turn_pending_start`를 세워 후속 input을 queue하고 `TurnStarted`를 처리할 때 해제한다. `turn/start` response 자체는 `ThreadEventStore.active_turn_id`를 설정하지 않는다. 이는 response와 notification 사이의 local input race를 막는 TUI surface barrier다. ([set pending](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/chatwidget/input_submission.rs#L354-L359), [queue while pending](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/chatwidget/input_flow.rs#L96-L165), [clear on start](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/chatwidget/turn_runtime.rs#L59-L62), [response path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L652-L675))
- Interrupt도 exact cached turn ID를 보내고 mismatch actual ID로 한 번 재시도한다. Steer와 interrupt mismatch 추출은 structured field가 아니라 서로 다른 message parser이므로 transferable contract가 아니다. ([steer parser](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app.rs#L650-L678), [interrupt parser](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app.rs#L706-L721))

Source는 per-thread single-active-task라는 engine constraint와 TUI의 queue/retry UX를 구분한다. AY-PLE이 active input을 steer, queue, reject 또는 새 `ModelingRun`으로 처리할지는 Ticket 010의 product policy다.

## Event routing과 multi-thread progression

### One drain owner

- Core의 `CodexThread.next_event()`는 한 receiver를 소비하는 API이며 별도 status `watch`만 제공한다. Event는 rollout persistence를 시도하고 status projection을 갱신한 뒤 queue로 전달된다. ([delivery](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L1946-L1983))
- App Server가 thread당 한 listener로 이 stream을 drain하고 subscribed connection에 fanout한다. Core queue 자체는 broadcast가 아니다. ([listener](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L277-L343))
- TUI main loop는 한 branch에서 `app_server.next_event()`를 계속 drain하고, 별 branch가 현재 active thread receiver를 렌더링한다. ([main loop](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app.rs#L1180-L1231))

따라서 external client도 connection event stream의 drain authority를 하나로 두고 그 위에 per-thread projection과 product subscribers를 둬야 한다. 여러 consumer가 transport `next_event`를 경쟁적으로 호출하게 하면 안 된다.

### TUI multi-thread projection

- TUI는 typed notification/request의 native `thread_id`를 추출해 thread, invalid, app-scoped, global로 분류한 뒤 route한다. ([target classification](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_event_targets.rs#L37-L192), [dispatch](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_events.rs#L61-L177))
- Primary가 아닌 inactive thread의 notification과 server request도 해당 store에 반영된다. Active 화면은 rendering focus일 뿐 runtime progression의 global lock이 아니다. ([notification enqueue](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L877-L935), [request enqueue](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L1016-L1063))
- `ThreadEventStore.active_turn_id`는 `turn/started`에서 설정하고, 다른 turn의 completion에는 지우지 않는다. Exact matching `turn/completed`와 `thread/closed`에서 clear하고 snapshot의 latest `InProgress` turn으로 recompute하며, missing-active steer response도 cache를 명시적으로 clear한다. ([active turn projection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L89-L123), [missing-active reset](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L595-L604))
- Thread switch는 이전 receiver/composer state를 store로 돌리고 대상 snapshot을 replay한 뒤 `ChatWidget`을 다시 만든다. ([activation](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L44-L106), [selection](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/session_lifecycle.rs#L348-L443))
- Bootstrap 중 `primary_thread_id`가 아직 없으면 TUI는 모든 thread-scoped notification/request를 `pending_primary_events`에 원래 observed thread key 없이 보관하고, start response로 primary를 안 뒤 그 primary 아래 replay한다. 이는 single-primary startup convenience이며 general native-scope routing invariant로 복사할 수 없다. ([notification routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_events.rs#L143-L152), [request routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/app_server_events.rs#L179-L222), [pending replay](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L1166-L1189))

Bootstrap 예외를 제외한 native scope routing과 inactive-thread progression은 후속 design의 검증 기준이다. `primary_thread_id`, side/subagent navigation, composer save, widget reconstruction과 terminal badges는 TUI product policy다.

## Terminal, backfill과 cleanup

### Terminal is not drain

- Core task finish는 exact turn ID의 `TurnComplete` 또는 `TurnAborted`를 emit하고 matching active turn을 clear한 뒤 terminal rollout flush를 시도한다. ([terminal path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/tasks/mod.rs#L563-L804))
- Exec는 start/resume response를 bootstrap authority로 사용하고 target turn response ID를 primary output filter key로 보존한다. ([bootstrap](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L802-L954))
- Ingress loop는 origin thread와 무관하게 모든 server request를 먼저 처리하고, notification output filtering 전에 terminal backfill을 시도한다. Config/deprecation warning과 일부 unscoped warning도 primary target 밖에서 output projection에 들어온다. Server request policy는 MCP elicitation auto-cancel과 나머지 unsupported request reject의 조합이다. ([ingress order](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L993-L1045), [filter](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1287-L1345), [request policy](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1655-L1735))
- Primary Exec session/config가 non-ephemeral이면, origin thread와 target 여부에 관계없이 빈 `turn.items`를 가진 `turn/completed`마다 output filter 전에 `thread/read(includeTurns)`를 한 번 호출한다. Completion payload의 origin thread가 ephemeral인지는 검사하지 않으므로 unrelated empty completion도 read를 유발한 뒤 output filter에서 버려질 수 있다. Primary target의 matching completion은 dropped item output을 backfill하고 unfinished started item을 reconcile한 뒤 output processor shutdown을 요청한다. ([primary config flag](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1017-L1023), [backfill](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1347-L1412), [JSON terminal](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/event_processor_with_jsonl_output.rs#L500-L552))

이 backfill은 CLI final output 복구 정책이지 `turn/completed` 뒤 late child notification까지 모두 drain됐다는 증거가 아니다. Ticket 004가 고정한 terminal과 late/background observation 구분을 유지하고, Ticket 011에서 delivery retention과 authoritative recovery source를 정한다.

### Background process ownership

- `UnifiedExecProcessManager`는 initial yield 전에 live process를 manager store에 넣어 turn interruption이 마지막 process `Arc`를 떨어뜨리지 못하게 한다. Stored process의 exit watcher에는 원래 `Arc<Session>`과 `Arc<TurnContext>`를 전달한다. ([retain before yield](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/process_manager.rs#L450-L470), [store and watcher](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/process_manager.rs#L858-L907))
- Output task와 exit watcher는 그 original context를 보존해 delta와 end event를 emit한다. Late observation은 새 generation/global journal이 아니라 process가 시작된 original turn context에 귀속된다. ([output watcher](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/async_watcher.rs#L37-L101), [exit watcher](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/async_watcher.rs#L104-L157), [end emission](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/unified_exec/async_watcher.rs#L191-L237))
- Production tests는 `TurnComplete` 뒤에도 process가 alive일 수 있고 background end event가 별도로 도착함을 고정한다. 따라서 turn terminal, process lifetime과 observation drain은 독립 경계다. ([survives turn complete](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/unified_exec.rs#L2390-L2474), [background end event](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/unified_exec.rs#L722-L815))

### Subscription, thread lifetime와 process lifetime

- `thread/unsubscribe`는 한 connection을 thread subscriber set에서 제거할 뿐 즉시 thread를 shutdown하지 않는다. ([unsubscribe](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L835-L860))
- App Server listener는 no-subscriber 상태가 일정 시간 유지되고 thread가 idle일 때 별도 unload path에서 shutdown한다. Running thread라면 unload를 미룬다. ([idle unload](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L344-L375), [teardown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L397-L430))
- Core shutdown은 explicit `Op::Shutdown`과 session-loop join이다. Manager-wide bounded shutdown은 thread들을 concurrent하게 종료하고 complete만 map에서 제거하며 submit-failed/timed-out thread는 추적 상태로 남긴다. ([per-thread shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L807-L825), [manager report](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L891-L947))
- `ThreadManager.remove_thread`는 registry ownership만 제거하며 다른 `Arc<CodexThread>`가 남을 수 있다. ([remove semantics](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager.rs#L891-L896))
- Exec는 matching terminal 뒤 `thread/unsubscribe` response를 기다리고 client를 shutdown한다. 이는 one-shot process cleanup이지 thread terminal 자체의 정의가 아니다. ([exec cleanup](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib.rs#L1025-L1063))

Browser disconnect, connection unsubscribe, engine thread idle/unload, active turn terminal과 child-process termination은 다른 state machine이다. 이를 하나의 generation state로 collapse하지 않는다. Exact unknown-outcome와 reconnect UX는 Ticket 012가 결정한다.

## Transferable constraints와 따라 하지 않을 편의

| 분류 | Pattern / source fact | AY-PLE 의미 | Decision owner |
| --- | --- | --- | --- |
| Identity pressure | Native `ThreadId`를 registry와 route key로 사용하고 resume는 같은 identity, fork는 새 identity+lineage를 사용한다. | Candidate design은 native correlation을 잃지 않아야 한다. Alias/remapping과 product receipt 경계는 Ticket 009가 정한다. | 009 |
| Routing pressure | 한 connection ingress owner가 typed scope를 분류하고 per-thread state로 route한다. | Current browser view나 pending Thread A가 unrelated Thread B drain을 막지 않는지 검증한다. | 008, 011 |
| Locality evidence | Request correlation, thread lifecycle, active-turn projection과 product rendering state는 다른 locality다. | 한 deep Module의 internal seams로 둘지 별도 Module로 나눌지는 Ticket 008의 tracer로 판단한다. | 008 |
| Authority pressure | Start/resume response는 bootstrap snapshot, notification은 live lifecycle, `thread/read`는 replay/reconciliation snapshot이다. | Response-known identity와 notification-observed state, live와 snapshot을 Interface가 구분할 수 있어야 한다. | 009, 011 |
| Command pressure | Start/steer/interrupt는 native thread/turn precondition을 사용한다. | Stale active turn이 explicit method result와 observation으로 수렴 가능한지 검증한다. | 010, 013 |
| Request ownership | Server request는 화면 visibility와 무관하게 exact origin thread/request ID로 resolve/reject한다. | Interactive request ownership이 current view와 분리 가능한지 검증한다. | 008, 012 |
| Lifetime pressure | Turn terminal, observation drain, subscription과 engine lifetime은 별도 경계다. | Terminal을 global cleanup 또는 lossless drain의 증거로 사용하지 않는 state model을 검증한다. | 011, 012 |
| Cleanup pressure | Shutdown은 explicit join/report를 가진다. | Child, ingress, pending RPC와 projection task cleanup owner가 식별 가능한지 검증한다. | 012 |
| Do not copy | `ThreadManager`의 huge Rust constructor와 `AgentControl` tree/residency control plane | App Server embedding concern을 external client Interface로 옮기지 않는다. | 008 |
| Do not copy | Core event queue·mailbox·pending input의 unbounded storage, hardcoded capacity | Locality만 채택하고 external bound/overflow는 별도 설계한다. | 011 |
| Do not copy | TUI hardcoded 32,768 replay store와 full-channel마다 detached send task | Memory/task bound와 ordering을 보장하지 않는다. ([store/eviction](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_events.rs#L107-L146), [overflow task](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/thread_routing.rs#L913-L926)) | 011, 013 |
| Do not copy | TUI string error parser, one-retry, queue, primary/side failover와 widget replay | Surface recovery UX를 protocol/kernel contract로 승격하지 않는다. | 010, 013 |
| Do not copy | Exec의 primary target output projection, immediate terminal exit, pre-filter one-shot backfill와 server-request auto-cancel/reject | Non-interactive CLI policy를 AY-PLE product policy로 상속하지 않는다. | 008, 011, 012 |
| Do not copy | Core가 persistence append error를 log한 뒤 계속하고 persistence shutdown error를 event로 보낸 뒤에도 `ShutdownComplete`로 loop를 끝내는 약한 outcome | External client가 이를 durable success 또는 safe replay 근거로 사용하지 않는다. ([append error](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/mod.rs#L3502-L3509), [shutdown error path](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/handlers.rs#L648-L675)) | 012, 013 |

## AY-PLE boundary comparison

ADR 0005–0007의 product intent는 Codex-native capability 위에 앱 기능을 올리고, `ModelingInvocation → ModelingRun`을 제품 receipt로 유지하며 raw protocol shape를 제품 계약으로 승격하지 않는 것이다. 이 source audit은 그 방향을 다음처럼 구체화한다.

| Concern | First-party evidence | AY-PLE candidate, not final decision |
| --- | --- | --- |
| Internal conversation identity | TUI와 exec 모두 native thread/turn ID를 그대로 상관한다. | Candidate는 native correlation을 보존해야 한다. Exact TS branding, alias와 browser exposure는 Ticket 009가 정한다. |
| Conversation collection | Core manager와 TUI projection은 native ThreadId keyed collection을 사용한다. | Connection과 per-thread projection ownership을 Interface에서 식별 가능하게 한다. 하나 또는 여러 Module인지는 Ticket 008이 정한다. |
| Product execution | Exec는 한 target turn을 exact match하고 TUI는 여러 thread를 독립 route한다. | `ModelingRun`은 한 native attempt의 receipt지만 thread cardinality나 UI conversation과 동일하지 않다. |
| Current view | TUI active thread는 rendering focus이고 inactive thread도 진행한다. | Browser focus·SSE subscriber가 engine execution의 global lock이 되지 않게 한다. |
| History/recovery | Core/App Server가 native history를 소유하고 consumers는 response/read로 projection한다. | TS layer가 raw rollout reconstruction을 소유하지 않는다. 필요한 snapshot/reconciliation method만 사용한다. |
| Surface policy | TUI와 exec의 queue, retry, backfill, failover가 서로 다르다. | 첫 AY-PLE tracer가 필요한 정책만 product adapter에 둔다. Hypothetical generic feature를 먼저 추출하지 않는다. |

현재 source evidence만으로 “범용 `CodexChatKernel`을 독립 package로 반드시 만든다”거나 “기존 `HeadlessCodexClientHost`를 얇게 고친다”는 결론은 둘 다 성립하지 않는다. 확정 가능한 것은 Ticket 008–009가 다음 Interface pressure를 만족하는지 검증해야 한다는 점이다. 모두 하나의 deep Module 내부 seam으로 표현할 가능성을 열어 둔다.

- Connection ingress와 request completion ownership을 conversation projection과 구분할 수 있어야 한다.
- Native scope correlation과 per-thread lifecycle projection은 product DTO로 변환되기 전에 보존되어야 하지만 독립 public package일 필요는 없다.
- Workspace, `ModelingRun`, browser-safe DTO, SSE와 user-facing retry/queue 같은 product concern이 native lifecycle authority를 덮어쓰지 않는 경계를 보여야 한다.
- Shared conversation abstraction의 깊이와 추출 시점은 첫 tracer와 실제 consumer 수로 검증한다.

## 후속 ticket으로 넘기는 결정

| Ticket | 이 문서가 제공하는 source-grounded input | 아직 결정하지 않는 것 |
| --- | --- | --- |
| 007 | Core·App Server·TUI·exec의 exact ownership과 production gap | Ticket 004–006 evidence 간 contradiction과 잘못된 inference 여부 |
| 008 | Collection, per-thread handle, connection ingress, surface projection locality | 첫 tracer, exact module/package/public API/task split |
| 009 | Native identity authority, resume/fork persistence, response-known vs notification-observed state | TS branding, browser exposure, product receipt와 native ID mapping |
| 010 | One-active-task, steer/start/interrupt semantics와 TUI race UX | AY-PLE queue/steer/reject policy와 multi-thread concurrency limit |
| 011 | One event drain, per-thread routing, live-vs-snapshot, terminal-vs-drain | Queue bound, retention, overflow, late child와 recovery authority |
| 012 | Unsubscribe/thread unload/process shutdown의 독립 state machine | Timeout, disconnect, restart, pending mutation/server-request outcome UX |
| 013 | Source gaps: string mismatch oracle, overflow order/bound, weak persistence result | Live conformance scenario와 expected outcome |

## Reviewed source ledger

| Path | 확인한 ownership | 대표 test evidence |
| --- | --- | --- |
| `codex-rs/protocol/src/{thread_id,protocol,items}.rs` | Native thread/submission/event/item identity와 history variants | Type/source unit tests, session ID/item assignment tests |
| `codex-rs/core/src/{thread_manager,codex_thread}.rs` | Live registry, thread handle, start/resume/fork/read/remove/shutdown | [multi-thread shutdown](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager_tests.rs#L361-L396), [live resume](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/thread_manager_tests.rs#L945-L1003) |
| `codex-rs/core/src/session/**`, `tasks/**` | Per-thread queue, active task/turn, input, terminal, history persistence | [expected-turn steer](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/tests.rs#L9993-L10036), [returned active ID](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/src/session/tests.rs#L10085-L10121) |
| `codex-rs/core/src/unified_exec/**` | Turn task 밖 process retention, original `Session`·`TurnContext`를 가진 output/exit watcher | [process survives terminal](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/unified_exec.rs#L2390-L2474), [background end](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/core/tests/suite/unified_exec.rs#L722-L815) |
| `codex-rs/app-server/src/request_processors/{thread_lifecycle,turn_processor,thread_processor}.rs` | Per-thread event drain/fanout, public turn mapping, subscription/lifetime | Listener and processor tests reviewed through exact source behavior |
| `codex-rs/tui/src/{app_server_session,session_state,app/**,chatwidget/**}.rs` | Typed RPC, native multi-thread projection, active view, replay/input policy | [nonblocking full-channel test](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/tests.rs#L460-L497), [inactive approval routing](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui/src/app/tests.rs#L2184-L2265) |
| `codex-rs/exec/src/**` | Single-run identity filter, terminal output, backfill, unsubscribe/shutdown | [filter tests](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib_tests.rs#L270-L297), [backfill tests](https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/exec/src/lib_tests.rs#L333-L423) |

이번 pass는 source와 checked-in tests를 읽어 ownership을 대조했다. Upstream Rust tests를 실행하지 않았으며, exact runtime interleaving은 Ticket 004 live probe와 Ticket 013 conformance가 소유한다.
