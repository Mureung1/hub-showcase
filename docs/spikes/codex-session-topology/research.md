# Codex session/context topology 조사

분류: 기술 참고

> **Codex Chat-only cutover (2026-07-17):** 현재 tracked runtime은 official Python SDK 기반 `packages/codex-chat-runtime` 하나뿐이다. Runtime Harness, 삭제된 `packages/runtime-codex`, 이전 `@openai/codex@0.144.0` pin을 전제로 한 아래 본문은 삭제 전 시점의 저수준 조사 기록으로만 읽는다. 현재 topology와 survivor runtime contract는 [Codex Chat 구현 지도](../../architecture/codex-chat-implementation-map.md)와 [codex-chat-runtime README](../../../packages/codex-chat-runtime/README.md)를 따른다.

> **현재 판정 (2026-07-12):** AY-PLE은 Semester-per-thread, Course-per-thread, ModelingRun-per-thread 같은 고정 topology를 채택하지 않는다. ModelingRun은 한 ModelingInvocation의 한 실행 시도를 기록하며 `thread`/`turn`/`item`은 Codex 통합 내부 단위로 남긴다. 현재 결정은 [Codex-native product composition](../../architecture/codex-native-product-composition.md)과 [ADR 0007](../../adr/0007-use-native-codex-composition-for-product-actions.md)을 따른다. 아래 topology matrix는 채택 후보가 아니라 당시 설계 위험을 확인한 기술 근거다.

조사일: 2026-07-11

## 조사 목적과 근거 범위

이 문서는 AY-PLE의 `ModelingRun`을 Codex의 어떤 lifecycle 단위에 대응할지 결정하기 전에, Codex App Server의 `thread`, `turn`, `item`과 context persistence 경계를 고정하기 위한 조사다. 특정 topology를 채택하지 않으며, 마지막 decision matrix도 평가를 시작하기 위한 템플릿으로만 사용한다.

이 저장소의 실행 근거는 `@openai/codex@0.144.0`으로 고정되어 있다. 따라서 protocol·복구·compaction 동작은 `rust-v0.144.0` tag의 source를 기준으로 판단하고, 현재 공식 문서는 사용자 mental model과 이후 API 방향을 확인하는 보조 근거로 분리한다. [AY-PLE pinned dependency](../../../packages/runtime-codex/package.json), [Codex `rust-v0.144.0` source](https://github.com/openai/codex/tree/rust-v0.144.0)

| 근거 층 | 이 문서에서의 역할 | 변경 가능성 |
| --- | --- | --- |
| AY-PLE pinned `0.144.0` source/protocol/test | 현재 앱이 실제로 통합할 수 있는 contract와 edge case | dependency upgrade 전까지 고정 |
| 현재 OpenAI 공식 Codex 문서 | Task/Thread/Turn의 최신 사용자 mental model과 공개 API 설명 | Codex release와 함께 변할 수 있음 |
| AY-PLE `CONTEXT.md`, Product Brief, ADR 0005/0007 | 제품 의미와 이미 채택한 경계 | 프로젝트 결정으로 관리 |

### 현재 official source 교차 확인

조사 시점의 OpenAI Codex `main`은 `5c19155cbd93bfa099016e7487259f61669823ff`였다. pinned commit `767822446c7a594caa19609ca435281a9ec67e0d`와 요청 범위의 `thread`/`turn`/`item` protocol, lifecycle, compaction source를 비교했을 때 public topology contract를 바꾸는 diff는 없었다. 관련 change 중 하나는 아직 지원하지 않는 paginated thread history mode를 `thread/start`에서 명시적으로 거절하는 guard이며, 이 문서의 stable lifecycle 결론에는 영향을 주지 않는다. 이 확인은 “main도 contract로 지원한다”는 뜻이 아니라 pinned source 해석이 현재 official source와 즉시 충돌하지 않는다는 의미다. [Pinned-to-current source compare](https://github.com/openai/codex/compare/767822446c7a594caa19609ca435281a9ec67e0d...5c19155cbd93bfa099016e7487259f61669823ff), [current `main` commit](https://github.com/openai/codex/commit/5c19155cbd93bfa099016e7487259f61669823ff)

## 조사 결론 요약

1. 현재 공식 용어에서 **Task**는 context·messages·results·actions를 담는 durable work 단위이고, **Thread**는 App Server가 노출하는 기술적 conversation object다. AY-PLE의 “이어지는 Codex session”은 아직 이 둘 중 어느 cardinality를 뜻하는지 정해지지 않았다. [OpenAI Codex glossary](https://learn.chatgpt.com/docs/glossary), [AY-PLE Product Brief](../../product/ay-ple-product-brief.md)
2. pinned `0.144.0`에서 **Thread**는 여러 turn을 담고 저장·resume·fork될 수 있다. **Turn**은 한 번의 model/tool continuation loop이며 한 thread에는 독립적으로 실행되는 active turn이 한 개뿐이다. 서로 다른 thread는 각자 `Session`과 active task를 가지므로 병렬 실행할 수 있다. [Thread/Turn protocol types](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L167-L264), [single `active_turn` slot](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/session.rs#L35-L74), [idle-start busy gate](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/inject.rs#L45-L130)
3. **Turn은 model request 한 번이 아니다.** user input으로 시작해 model sampling, tool call, tool output, 후속 sampling, server request 대기, steer input 반영을 거쳐 final assistant message 또는 interrupt/failure로 끝난다. [turn loop](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/turn.rs#L130-L380), [`turn/steer` protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L161-L210)
4. **Item**은 live turn을 구성하는 관측 단위다. `item/started`의 초기 snapshot, delta, `item/completed`의 authoritative final snapshot을 소비해야 하며, resume/read에서 복원되는 item은 command execution 등 일부 상호작용이 빠지는 lossy projection이다. [App Server events](https://learn.chatgpt.com/docs/app-server#events), [rollback/resume lossiness contract](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1042-L1064)
5. **Persistent thread**는 rollout을 통해 process restart 후 cold resume할 수 있지만, active model/tool execution과 connection-scoped server request는 이어서 실행되는 것이 아니라 저장 history로 재구성된다. **Ephemeral thread**는 disk에 materialize되지 않아 process lifetime 밖의 resume, history read, list, rollback, goal을 제공하지 않는다. [thread persistence initialization](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/session.rs#L575-L690), [ephemeral App Server tests](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/tests/suite/v2/thread_start.rs#L1063-L1110)
6. **Compaction은 transcript 보존과 active model context 보존이 같은 문제가 아님을 드러낸다.** 자동/수동 compaction은 active history를 summary와 선별된 content로 교체하며, 현재 context는 즉시 또는 다음 regular turn에 다시 주입된다. 따라서 오래된 thread를 쓴다는 사실만으로 모든 과거 detail이 model-visible하다고 볼 수 없다. [local compaction replacement](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/compact.rs#L322-L375), [compaction context reinjection](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/compact.rs#L55-L84)
7. 조사 당시 AY-PLE 문서는 제품 의미와 raw Codex identifier의 분리를 채택했지만, `ModelingRun ↔ thread/turn` cardinality, 생성·resume·fork, concurrency, compaction, reconnect, retention, cross-course 경계를 미결정 상태로 두고 있었다. 이 미결정 목록은 현재 판정으로 대체되었지만, 고정 topology를 피해야 하는 위험 근거로 보존한다.

## Codex의 현재 Task mental model과 protocol topology

현재 공식 문서는 Task를 사용자에게 보이는 durable work 단위, Thread를 App Server/SDK의 기술적 conversation object, Turn을 보통 user prompt와 agent response/actions로 이루어진 한 exchange로 구분한다. Codex App은 여러 agent thread를 병렬로 실행하고 project sidebar, thread list, review pane에서 long-running task를 관리하는 UI로 설명된다. [OpenAI Codex glossary](https://learn.chatgpt.com/docs/glossary), [Codex app changelog](https://learn.chatgpt.com/docs/changelog#codex-app)

`0.144.0` protocol의 `sessionId`는 또 다른 층이다. 이는 하나의 UI “session” 이름이 아니라 fork/subagent로 연결된 thread tree가 공유하는 identifier이며, 각 `Thread`는 자신의 `id`, 선택적인 `forkedFromId`, subagent일 때의 `parentThreadId`를 가진다. 따라서 AY-PLE 문서의 “session”을 protocol `sessionId`와 곧바로 동일시하면 안 된다. [`Thread` fields](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L167-L225)

| 층 | Codex 의미 | lifecycle/identity | AY-PLE와 현재 관계 |
| --- | --- | --- | --- |
| Task | 사용자가 이해하는 durable work/activity 단위 | product surface가 소유 | 아직 직접 mapping 없음 |
| Thread | App Server의 technical conversation object | `threadId`, 저장·resume·fork·archive | Codex integration 내부 identifier로 보존 |
| Session tree | fork/subagent 관계가 공유하는 protocol family | `sessionId`, `forkedFromId`, `parentThreadId` | 제품 개념으로 채택되지 않음 |
| Turn | 한 thread 안의 한 model/tool exchange | `turnId`, `inProgress/completed/interrupted/failed` | 한 ModelingInvocation 실행 시도에 사용하지만 raw cardinality는 제품 계약으로 노출하지 않음 |
| Item | turn 안에서 관측되는 input/output/effect/activity | `itemId`와 started/delta/completed lifecycle | 선택적인 product activity promotion 대상 |
| Server request | active work가 client 응답을 기다리는 correlated request | JSON-RPC request id와 thread/turn correlation | `PendingInteraction`으로 선택 승격 가능 |

표의 Codex 정의는 공식 glossary와 pinned protocol type을 따른다. AY-PLE 쪽 관계는 조사 당시 문서에서 raw identifier를 제품 개념과 분리했던 상태를 반영한다. [OpenAI Codex glossary](https://learn.chatgpt.com/docs/glossary), [ADR 0005](../../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md)

## Thread lifecycle method

아래 표는 현재 공식 API 설명과 pinned `0.144.0` 구현을 함께 읽은 결과다. “subscribe”는 해당 JSON-RPC connection이 이후 thread/turn/item notification을 받도록 App Server의 in-memory subscription에 연결되는 것을 뜻한다. [App Server API overview](https://learn.chatgpt.com/docs/app-server#api-overview), [connection/thread subscription state](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/thread_state.rs#L278-L579)

| Method | 정확한 의미 | 반환/notification과 subscription | persistence·제약 |
| --- | --- | --- | --- |
| `thread/start` | 새 `Thread`와 runtime session을 만든다. config, cwd, instructions, dynamic tools, `ephemeral` 등을 시작 값으로 받는다. | response 뒤 `thread/started`를 emit하고 요청 connection을 자동 subscribe한다. | `ephemeral=true`면 disk rollout을 만들지 않는다. 그 외에는 persistent thread가 된다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L51-L201), [processor](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L930-L1365) |
| `thread/resume` | 같은 `threadId`의 loaded runtime에 다시 join하거나, 저장 rollout을 읽어 cold runtime을 재구성한다. 이후 `turn/start`는 같은 thread history에 append된다. | 요청 connection을 자동 subscribe한다. loaded thread라면 live active-turn snapshot과 pending server request를 새 connection에 replay한다. | non-running에서는 experimental `history > path > threadId` 우선순위다. running thread에 history resume은 거절되고, live config override mismatch는 적용되지 않는다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L305-L430), [live resume](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L520-L670) |
| `thread/fork` | source thread의 **stored history**를 복사해 새 `threadId`를 만든다. `lastTurnId`가 있으면 그 turn을 포함한 지점까지 복사한다. | 새 thread response와 `thread/started`를 내고 자동 subscribe한다. 새 thread는 `forkedFromId`를 가지며 같은 session tree에 속한다. | referenced turn은 in-progress일 수 없다. source는 stored thread여야 하며 fork 자체는 persistent 또는 ephemeral일 수 있다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L481-L600), [processor](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L3434-L3710) |
| `thread/read` | runtime을 resume하지 않고 thread metadata를 읽는다. `includeTurns=true`면 persisted turn projection을 함께 읽는다. | 새 subscription을 만들지 않는다. loaded thread이면 현재 runtime status도 projection한다. | loaded ephemeral thread는 metadata-only read만 가능하고 `includeTurns`는 거절된다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1272-L1287), [read implementation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L2232-L2405) |
| `thread/list` | stored thread log/metadata를 paginate하고 provider, source, archived, cwd, relation 등으로 filter한다. | subscription이나 load를 만들지 않고 `Thread[]` page를 반환한다. | disk에 materialize되지 않는 ephemeral thread는 나타나지 않는다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1067-L1225), [ephemeral fork test](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/tests/suite/v2/thread_fork.rs#L836-L960) |
| `thread/loaded/list` | 현재 App Server process의 `ThreadManager`에 loaded된 thread id를 paginate한다. | in-memory id만 반환하며 subscribe하지 않는다. | persistent/ephemeral 여부나 archived storage 목록과 다른 관측면이다. process restart 뒤에는 비어 있다가 thread를 start/resume하면 다시 채워진다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1226-L1247), [implementation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L2185-L2227) |
| `thread/unsubscribe` | **현재 connection만** 해당 loaded thread의 notification subscription에서 제거한다. work, history, 다른 connection subscription은 지우지 않는다. | `notLoaded`, `notSubscribed`, `unsubscribed` 중 하나를 반환한다. | 마지막 subscriber가 사라지고 thread가 idle 상태로 30분 유지되면 pinned 구현은 pending server request를 cancel하고 runtime을 unload한 뒤 `thread/closed`를 emit한다. active면 unload를 미룬다. [protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L650-L670), [delay constant](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L1-L4), [unload lifecycle](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L340-L447) |
| `thread/archive` | stored rollout을 archived 영역으로 옮겨 active list에서 제외한다. delete와 다르다. | 성공 뒤 primary와 성공적으로 archive된 spawned descendant에 `thread/archived`를 emit한다. | loaded runtime을 먼저 shutdown하고, subagent spawn subtree descendant는 best-effort로 함께 archive한다. fork descendant 전체를 뜻하는 contract는 아니다. [official overview](https://learn.chatgpt.com/docs/app-server#api-overview), [archive implementation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L1400-L1505) |

### Persistent와 ephemeral

| 관측 항목 | Persistent thread | Ephemeral thread |
| --- | --- | --- |
| Disk rollout/state DB | materialized history를 가진다. | 만들지 않으며 `path=null`이다. |
| 같은 process에서 live resume | 가능 | loaded 상태일 때 가능 |
| process restart 뒤 cold resume | stored rollout로 가능 | 불가능 |
| `thread/list` | materialized 후 포함 | 제외 |
| `thread/read(includeTurns=true)` / `thread/turns/list` | 가능, 단 persisted projection은 lossy | 거절 |
| `thread/rollback` | idle이고 history가 있으면 가능 | persisted history가 없어 거절 |
| thread goal | feature가 켜지고 state DB가 있으면 가능 | 명시적으로 거절 |
| 주 용도에 대한 공식 의미 | 저장 후 이어갈 수 있는 normal task/thread | current official glossary의 non-interactive run에서는 종료 후 session state를 저장하지 않는 실행으로 설명 |

이 차이는 `ephemeral` field 정의, persistence initialization, App Server integration tests와 공식 glossary를 근거로 한다. [`Thread.ephemeral`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs#L181-L195), [persistence branch](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/session.rs#L575-L690), [ephemeral read/list guards](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L2340-L2405), [OpenAI Codex glossary](https://learn.chatgpt.com/docs/glossary)

## Turn이 포함하는 범위

### 시작부터 종료까지

| 단계 | runtime 동작 | 외부 관측 |
| --- | --- | --- |
| 1. start | `turn/start` input과 sticky setting override를 받고 `inProgress` turn id를 즉시 반환한다. | `turn/started`, `userMessage` item |
| 2. initial context | current instructions, cwd, permissions, tools, world state/context update를 model-visible history에 구성한다. | 일부 context는 raw rollout 또는 debug evidence에만 있고 모두 product item이 되지는 않는다. |
| 3. sampling | model이 assistant content 또는 function/tool call을 생성한다. | reasoning/message/tool item started와 delta |
| 4. effect/response | runtime이 tool을 실행하거나 client에 approval/user-input server request를 보내고 response를 기다린다. | command/file/MCP item, `serverRequest/*`, thread active flags |
| 5. continuation | tool output과 queued steer input을 history에 넣어 model을 다시 sample한다. context limit이면 같은 turn 중간에 compaction할 수 있다. | item completed, 추가 item, contextCompaction |
| 6. terminal | 더 필요한 tool/input이 없고 final assistant message가 생기면 completed, interrupt면 interrupted, error면 failed가 된다. | `turn/completed`와 authoritative final items |

이 lifecycle은 `turn/start` processor가 input을 core `Op::UserInput`으로 제출하는 경로, core의 model/tool loop, 공식 event stream을 종합한 것이다. [`turn/start` processor](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/turn_processor.rs#L442-L568), [model/tool loop](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/turn.rs#L130-L380), [App Server events](https://learn.chatgpt.com/docs/app-server#events)

### 한 thread의 active turn 제약

`0.144.0`의 core `Session`에는 `Mutex<Option<ActiveTurn>>` 하나만 있다. extension이 idle turn을 자동 시작하는 gate는 active turn이 있으면 `Busy`로 거절하고, 일반 task 교체 경로는 기존 task를 `Replaced`로 abort한 뒤 새 task를 시작한다. 따라서 “한 thread 안에서 두 turn을 독립적으로 병렬 실행”하는 topology는 없다. [`Session.active_turn`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/session.rs#L35-L74), [idle gate](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/inject.rs#L45-L130), [task replacement](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/tasks/mod.rs#L313-L365)

이 invariant를 “두 번째 `turn/start`는 항상 명시적인 busy error를 반환한다”로 확대하면 안 된다. pinned core의 user-input handler는 active regular turn이 있으면 새 input을 그 active turn queue에 steer하는 경로를 먼저 시도한다. 제품은 같은 thread의 동시 ModelingRun을 독립 turn 두 개로 간주하지 말고, 실제 protocol probe로 queue/steer contract를 확인해야 한다. [user input routing](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/handlers.rs#L194-L285), [steer queue](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L3867-L3970)

반면 서로 다른 thread는 `ThreadManager` 안에서 각자 `CodexThread/Session`과 active turn slot을 가진다. 현재 Codex App도 agent thread 병렬 실행을 명시적인 product capability로 설명한다. 실제 동시 실행 수는 resource limit과 subagent configuration의 영향을 받으므로 “무제한 병렬” contract는 아니다. [`ThreadManager` responsibility](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/thread_manager.rs#L176-L215), [Codex app changelog](https://learn.chatgpt.com/docs/changelog#codex-app)

### steer와 interrupt

| Method | target | effect | terminal 의미 |
| --- | --- | --- | --- |
| `turn/steer` | exact `threadId + expectedTurnId`의 active **regular** turn | user input/additional context를 active turn queue에 append하고 같은 turn의 다음 continuation에서 반영 | 새 turn을 만들지 않음 |
| `turn/interrupt` | exact `threadId + turnId` | active task를 cancel하고 pending work를 정리 | `turn/completed.status=interrupted`를 확인해야 완료 |

`turn/steer`는 active review/compact turn에는 적용되지 않고, expected id가 다르면 거절된다. `turn/interrupt` 역시 request acceptance와 terminal notification을 구분해야 한다. [turn protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L161-L226), [steer implementation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L3867-L3970), [official turn events](https://learn.chatgpt.com/docs/app-server#events)

## Item role과 lifecycle

`ThreadItem` union은 단순 text transcript보다 넓다. 아래 분류는 protocol의 exhaustive variant를 제품 설계 관점에서 묶은 것이며, 이 분류 자체가 AY-PLE product event contract는 아니다. [`ThreadItem` variants](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L222-L396)

| 역할 | 대표 item | 의미 |
| --- | --- | --- |
| 입력·대화 | `userMessage`, `hookPrompt` | user/client/hook가 model-visible work에 넣은 input |
| agent 표현 | `agentMessage`, `plan`, `reasoning` | answer, plan, reasoning summary/stream |
| 실행 effect | `commandExecution`, `fileChange` | local command와 file mutation activity |
| tool·외부 조회 | `mcpToolCall`, `dynamicToolCall`, `webSearch`, `imageView` | external/local capability invocation |
| 협업 | `collabToolCall`, subagent-related item | child agent spawn/send/wait/close 등의 coordination |
| runtime control | `sleep`, review item, `contextCompaction` | waiting, review, context-window transition |

공식 event contract에서 `item/started`는 full initial item, 중간 notification은 delta, `item/completed`는 final authoritative item이다. UI가 delta만 누적하거나 `turn/completed`만 보고 effect detail을 추론하면 authoritative state를 놓칠 수 있다. [App Server events](https://learn.chatgpt.com/docs/app-server#events)

live event stream과 persisted reconstruction은 동일하지 않다. protocol은 `thread/resume`과 `thread/rollback`의 turn item이 command execution 같은 모든 agent interaction을 저장하지 않아 lossy라고 명시한다. 그러므로 process restart 후 activity replay와 live audit를 같은 fidelity로 가정할 수 없다. [lossiness contract](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1042-L1064)

## Context와 compaction

### trigger

| trigger | phase | pinned `0.144.0` 조건 |
| --- | --- | --- |
| manual `thread/compact/start` | standalone compact turn | API는 즉시 empty response를 반환하고 progress는 turn/item lifecycle로 전달한다. core `spawnTask` 경로이므로 active task가 있다면 `Replaced`로 abort한 뒤 compact task를 시작한다. |
| automatic context limit | pre-turn | configured auto-compact budget 또는 usable context window가 소진되면 regular sampling 전에 실행한다. |
| automatic model compatibility change | pre-turn | 이전/현재 model의 compaction compatibility hash가 달라졌을 때 이전 model context를 compact한다. |
| automatic model downshift | pre-turn | 더 작은 context-window model로 바꾸면서 기존 active context가 새 limit을 넘을 때 실행한다. |
| automatic continuation pressure | mid-turn | tool/steer 등으로 follow-up sampling이 필요하고 token limit 또는 new-window request가 생기면 같은 turn 안에서 실행한다. |

Manual API와 task replacement는 App Server processor, compact handler, task scheduler에 구현되어 있다. 자동 조건은 turn sampling loop에 구현되어 있다. [manual compact API](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L1820-L1834), [manual compact task](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/compact.rs#L123-L147), [task replacement](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/tasks/mod.rs#L313-L323), [automatic triggers](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/turn.rs#L798-L945)

### 무엇이 active context에 남는가

| implementation/phase | 남기는 것 | 제거·교체되는 것 | current context 처리 |
| --- | --- | --- | --- |
| local compaction | newest real user messages를 역순으로 최대 약 20,000 token까지 선택하고, model이 만든 summary를 마지막에 둔다. | 오래된 message/tool detail을 replacement history에서 제거한다. | pre-turn/manual은 baseline을 비워 다음 regular turn이 canonical initial context를 전부 재주입한다. mid-turn은 current context를 마지막 real user message 바로 앞에 즉시 재주입한다. |
| remote compaction | real user/hook prompt, assistant/agent message, compaction item을 허용한다. | stale developer message, instruction wrapper, reasoning, function/tool call과 output 등은 filter한다. | local과 같은 pre/manual 대 mid-turn reinjection rule을 사용한다. |

Local selection·summary와 20,000-token cap은 `build_compacted_history`에, reinjection phase 차이는 `InitialContextInjection`에 구현되어 있다. Remote filter는 `should_keep_compacted_history_item`에 명시되어 있다. [local survivor logic](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/compact.rs#L500-L655), [reinjection rule](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/compact.rs#L55-L84), [remote survivor filter](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/compact_remote.rs#L304-L365)

Compaction은 `CompactedItem`에 `replacementHistory`와 context-window ids를 저장하고, resume reconstruction은 가장 최근 surviving replacement history를 baseline으로 사용한다. 이는 “raw rollout에 기록이 남는다”와 “다음 model request에 원문이 모두 들어간다”가 다른 명제임을 뜻한다. [`CompactedItem`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/protocol/src/protocol.rs#L3165-L3185), [rollout reconstruction](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/rollout_reconstruction.rs#L110-L195)

따라서 topology 평가는 thread 개수뿐 아니라 예상 turn 누적량, compact 빈도, compact 뒤 AY-PLE state snapshot을 어떻게 rehydrate하는지를 함께 다뤄야 한다. 이 문장은 위 구현 사실에서 도출한 설계 평가 항목이며 특정 topology 권고가 아니다.

## Thread rollback

`thread/rollback`은 deprecated API다. `numTurns >= 1`만 허용하고, active turn이 있으면 거절하며, persistent history가 없는 ephemeral thread에서는 실행할 수 없다. rollback은 마지막 N개 user turn을 effective history에서 제거하는 marker를 append하지만 agent가 만든 filesystem 변경은 되돌리지 않는다. [rollback protocol](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1042-L1064), [rollback handler](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/handlers.rs#L463-L565)

Pinned reconstruction은 raw rollout을 물리적으로 잘라내는 대신 `ThreadRolledBack` marker를 읽어 이후 effective turn boundary를 계산한다. 반환되는 turn item도 resume와 같은 lossy projection이며, WorkspaceHistory/Git rollback을 대신하지 않는다. [rollout truncation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/thread_rollout_truncation.rs#L31-L125), [AY-PLE `WorkspaceHistory`](../../../CONTEXT.md)

## Instructions, cwd, settings의 지속성

### 설정 변경 경로

| 경로 | scope | 지속성 의미 |
| --- | --- | --- |
| `thread/start` | 새 runtime session | initial model/provider, cwd, permissions, base/developer instructions, dynamic tools 등을 구성한다. |
| `turn/start` override | **현재 turn과 subsequent turns** | cwd, workspace roots, approval/reviewer, sandbox/permissions, model, service tier, effort, summary, personality, collaboration mode가 sticky thread setting으로 갱신된다. |
| `thread/settings/update` | subsequent turns | user input 없이 같은 sticky setting을 갱신하고 `thread/settings/updated` snapshot을 emit한다. |
| `thread/resume` override | cold-resumed runtime | explicit override로 stored baseline을 바꿀 수 있다. 이미 running인 loaded thread에 대한 mismatch override는 적용하지 않고 active config를 유지한다. |

Scope는 protocol field 문서에 직접 명시되어 있고, live resume mismatch 처리도 pinned processor가 구분한다. [`turn/start` settings](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L68-L159), [`thread/settings/update`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L215-L303), [resume mismatch handling](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L25-L137)

### Stored baseline

`SessionMeta`는 initial `cwd`, provider, base instructions, dynamic tools, selected capability roots, memory/history mode 등을 저장한다. base instructions의 cold-start 우선순위는 explicit config override, stored `SessionMeta.baseInstructions`, current model default 순서다. [`SessionMeta`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/protocol/src/protocol.rs#L3010-L3060), [base-instruction resolution](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L599-L620)

각 real user turn에는 effective `cwd`, workspace roots, approval/reviewer, sandbox/permission profile, model, personality, collaboration mode, effort 등을 담은 `TurnContextItem`을 durable baseline으로 저장한다. resume/fork reconstruction은 이 최신 baseline과 compaction checkpoint를 사용한다. [`TurnContextItem`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/protocol/src/protocol.rs#L3209-L3270), [per-turn persistence](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L3660-L3675)

중요한 비대칭이 있다. `SessionMeta`와 `TurnContextItem`의 dedicated durable field에는 top-level `developerInstructions`가 없다. `thread/resume`는 `developerInstructions` override를 받을 수 있지만, one-time start override가 cold resume에서 언제나 동일하게 복원된다고 이 schema만으로 보장할 수 없다. AY-PLE가 여기에 의존하려면 pinned live probe 또는 별도 app-owned source of truth가 필요하다는 **미검증 지점**으로 남는다. [`SessionMeta` fields](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/protocol/src/protocol.rs#L3014-L3060), [`TurnContextItem` fields](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/protocol/src/protocol.rs#L3209-L3270), [`thread/resume` override](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L360-L405)

## Connection 재연결과 process restart

| 상황 | persistent thread | ephemeral thread | 보존되지 않는 것 |
| --- | --- | --- | --- |
| transport connection만 끊기고 App Server process/runtime은 유지 | 새 connection에서 `thread/resume(threadId)`으로 live thread에 subscribe 가능 | loaded 상태면 동일 | 이전 connection subscription 자체 |
| 마지막 subscriber가 사라짐 | active work는 계속될 수 있고, idle 30분 뒤 unload; 이후 cold resume 가능 | active work는 계속될 수 있으나 unload 뒤 복구 불가 | unload 시 pending server request callback |
| App Server process restart/crash | rollout을 cold resume해 history와 settings baseline을 재구성 | thread 소실 | active model stream, running tool process ownership, in-memory item delta, subscription, unresolved connection request |
| cold resume의 stale `inProgress` projection | live active task가 없으면 `interrupted`로 정규화 | 해당 없음 | 중단된 turn의 실행 continuation |

같은-process live resume은 connection을 원자적으로 추가하고 pending server request를 replay한다. Connection close는 그 connection을 subscription set에서만 제거한다. [live resume response/replay](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L520-L670), [connection removal](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/thread_state.rs#L542-L579)

Process restart 행은 source 구조에 대한 명시적 **inference**다. persisted `LiveThread`는 rollout에서 새 `Session`으로 resume되지만, active task와 subscription/server-request registry는 process memory에 있다. cold view에 live active task가 없으면 stored `inProgress` turn을 `interrupted`로 바꾸는 구현이 이 경계를 확인해 준다. [persistent resume construction](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/session.rs#L610-L690), [stale turn normalization](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_lifecycle.rs#L778-L794)

## Goal과 memory가 topology에 미치는 범위

| capability | pinned/current 사실 | topology에 필요한 해석 |
| --- | --- | --- |
| Thread goal | pinned `Goals` feature는 persisted thread goal과 automatic continuation을 활성화한다. active goal의 objective update는 current turn에 steer될 수 있고, idle이면 새 continuation turn을 자동 시작한다. ephemeral thread는 goal을 지원하지 않는다. | enabled 상태에서는 “turn 하나 = user가 시작한 ModelingRun 하나”가 자동으로 성립하지 않는다. |
| Local memories | 현재 공식 문서에서 memory는 과거 task의 useful context를 future task/session에 재사용하는 local store이며 기본값은 off다. task별로 existing memory 사용과 future memory 기여를 제어한다. | enabled 상태에서는 thread를 나눴다고 해서 model-visible context가 완전히 격리되는 것은 아니다. |

Goal source는 feature 정의와 runtime continuation path를, memory는 현재 공식 contract만 사용했다. 이 문서는 goal/memory의 제품 채택 여부를 결정하지 않는다. [Goals feature](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/features/src/lib.rs#L205-L220), [goal continuation runtime](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/ext/goal/src/runtime.rs#L335-L430), [ephemeral goal guard](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_goal_processor.rs#L219-L270), [OpenAI Codex memories](https://learn.chatgpt.com/docs/customization/memories)

## 조사 당시 AY-PLE 문서 audit

### 이미 고정된 의미

| 문서 | 고정된 내용 | topology를 아직 고정하지 않는 이유 |
| --- | --- | --- |
| `CONTEXT.md` | `ModelingRun`은 SourceSelection에 대한 user-initiated AgentModeling operation이며 내부에서 plan/split할 수 있다. `ChatSidecar`는 current SourceSelection, ModelingRun, ReviewState, Projection 문맥의 persistent conversational surface다. | “operation”과 “persistent surface”가 Codex thread/turn 수를 말하지 않는다. [CONTEXT](../../../CONTEXT.md) |
| Product Brief | MVP는 이어지는 Codex session, 진행 중 steer/interrupt, 활동 관측, resume을 요구한다. App은 상태와 active work를 보고 immediate delivery, queue, 새 turn 중 case별로 고른다. | “이어지는 session”의 scope와 `ModelingRun` cardinality가 열린 질문으로 남아 있다. [Product Brief](../../product/ay-ple-product-brief.md) |
| ADR 0005 | Codex `thread/turn/item/request` identifier를 integration 안에 보존하고 product contract로 노출하지 않는다. Runtime Harness의 `RuntimeRun`은 제품 session이 아니다. | protocol isolation은 mapping의 위치를 정하지만 mapping 자체를 정하지 않는다. [ADR 0005](../../adr/0005-use-codex-app-server-as-first-class-mvp-runtime.md) |
| 당시 ADR 0007 초안 | `WorkId` 등 product correlation과 raw Codex id의 대응은 integration journal에 두며, delivery primitive는 case handler가 선택한다고 제안했다. | interaction delivery routing과 session topology는 다른 결정이라는 조사 당시 전제였다. 현재 채택 결정은 문서 상단의 ADR 0007을 따른다. |

### 정확히 미지정된 mapping

| 미지정 항목 | 현재 문서가 말하는 것 | 아직 필요한 topology 결정/증거 |
| --- | --- | --- |
| Semester cardinality | 한 학기 workspace와 SemesterModel이 있다. | Semester 하나가 thread 하나, thread family 하나, 또는 여러 독립 thread를 갖는가? |
| Course cardinality | Course는 SemesterModel의 first-class academic state다. | Course가 thread isolation boundary인가, 단순 context tag인가? |
| ModelingRun cardinality | user-initiated operation이며 `runId` 제품 기록이 있다. | 한 ModelingRun이 thread 하나인가, persistent thread의 turn 하나인가, 여러 turn/thread를 묶는 Work인가? |
| ChatSidecar continuity | current ModelingRun/Review/Projection 문맥의 persistent surface다. | 어느 thread에 대화를 append하며 ModelingRun이 없을 때의 home thread는 무엇인가? |
| start/resume/fork | 이어지는 session과 resume이 MVP 필수다. | 어떤 product event가 `thread/start`, `thread/resume`, `thread/fork`, `turn/start`를 선택하는가? |
| 용어 정확성 | Product Brief는 “`turn` 시작 또는 재개 시” snapshot 주입이라고 쓴다. | App Server에는 `turn/resume`이 없고 `thread/resume` 뒤 `turn/start`가 있으므로 어느 lifecycle을 뜻하는지 불명확하다. |
| concurrency | 진행 중 work에 steer/interrupt하고 내부 split도 허용한다. | 같은 Course/Semester의 동시 ModelingRun을 같은 thread에서 serialize할지 별도 thread로 parallelize할지 미정이다. |
| internal split/subagent | AY가 work를 plan/split할 수 있다. | child thread/`parentThreadId`/session tree를 하나의 ModelingRun에 어떻게 aggregate하는가? |
| fork 의미 | raw identifiers는 integration에 보존한다. | fork가 alternate ModelingRun, retry, user-visible branch, 내부 implementation detail 중 무엇인가? |
| active context budget | state snapshot file 주입과 이어지는 context를 요구한다. | compact trigger 관측, compact 후 rehydration, 새 thread 전환 기준, context contamination policy가 없다. |
| recovery | resume을 요구하고 delivery reconciliation을 앱이 소유한다. | process restart 뒤 interrupted turn/unfinished tool/PendingInteraction을 어떤 product state로 복구하는가? |
| item/activity mapping | 상세 Codex 활동을 product 의미로 선택 승격한다. | 어떤 live item이 durable ModelingRun activity이며 lossy resume 뒤 무엇으로 보충하는가? |
| settings ownership | App이 runtime integration을 소유한다. | cwd, permissions, model, instructions가 Semester/Course/ModelingRun 중 어느 scope의 SSOT인가? |
| cross-course work | SemesterModel은 여러 Course를 연결한다. | 여러 Course source를 함께 처리하는 work가 어느 thread context를 사용하고 오염을 어떻게 표시하는가? |
| retention/archive | product run 기록, WorkspaceHistory, integration journal, Runtime Diagnostic History를 분리한다. | Product archive/delete가 Codex `unsubscribe/archive/delete` 중 무엇을 호출하고 raw rollout 보존 기간을 어떻게 연결하는가? |
| WorkspaceHistory correlation | user-meaningful checkpoint는 App이 소유한다. | ModelingRun, turn terminal, UserConfirmation, thread rollback/fork와 checkpoint 사이의 correlation이 없다. |
| ephemeral policy | 명시 없음 | preview/query/spike 같은 어떤 work가 ephemeral이어도 되는가? |
| goal/memory | 명시 없음 | automatic continuation 또는 cross-thread memory가 ModelingRun causality/isolation에 참여하는가? |

이 표는 조사 당시 관련 문서에 문장이 없거나 열린 질문으로 남은 지점을 기록한 audit이다. 현재 제품 결정을 나타내지 않으며, 문서 상단의 판정을 우선한다.

## 결정 전에 필요한 tracer evidence

아래 evidence는 topology 후보를 점수화할 때 같은 조건으로 비교하기 위한 입력이다. 구현 순서나 채택 권고가 아니다.

| Evidence scenario | 관측해야 할 raw fact | 연결할 product fact |
| --- | --- | --- |
| 두 ModelingRun 동시 시작 | thread별 active turn, busy/queue/parallel 결과 | `WorkId`별 상태와 사용자 기대 |
| active turn 중 ChatSidecar 정정 | exact turn correlation, steer acceptance와 terminal result | 정정이 의도한 ModelingRun에만 적용됐는가 |
| process kill 후 resume | loaded/list, read, resume, stale turn status, pending request 소실 | interrupted/recoverable/needs-reconciliation 상태 |
| context limit 강제 | contextCompaction item, replacement history, 다음 turn context | SourceSelection/State snapshot이 compact 뒤 유지되는가 |
| Course 전환 후 재질문 | model-visible 이전 Course detail과 current source | cross-course continuity와 contamination |
| fork 후 양쪽 진행 | `sessionId`, `forkedFromId`, independent active turns | alternate work를 하나/둘의 ModelingRun으로 볼 것인가 |
| live event와 cold read 비교 | item 종류와 lossiness 차이 | product activity를 어떤 durable evidence로 복원하는가 |
| settings 변경 후 restart | cwd/model/permission/instructions replay | scope별 설정 SSOT와 drift |

## Session topology decision matrix template

평가는 각 cell에 `1–5 점수 / 근거 tracer / 주요 risk / 완화 비용`을 기록한다. 아래 문구는 평가 질문이며 점수나 추천이 아니다.

| 후보 | continuity | isolation | context budget / compaction | concurrency | recovery | cross-course work | Codex-native leverage | complexity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. Semester-per-thread | 학기 전체 reasoning trail이 실제로 도움이 되는가? | Course/ModelingRun 간 stale context를 구분할 수 있는가? | 한 학기 turn 누적과 반복 compaction 뒤 fidelity는? | 한 active turn 제약으로 학기 work가 serialize되는가? | 하나의 thread 장애가 학기 전체 work에 미치는 범위는? | 여러 Course를 한 context에서 연결하는 품질은? | resume/steer/long-running task를 얼마나 직접 활용하는가? | thread 수는 적지만 routing·rehydration policy 비용은? |
| 2. Course-per-thread | Course 안 continuity가 충분하고 Semester continuity 손실은 허용 가능한가? | Course 경계가 실제 context isolation과 일치하는가? | Course별 turn 양과 compaction 빈도는? | 서로 다른 Course는 병렬, 같은 Course는 serialize해도 되는가? | Course thread 단위 resume/rebuild가 product 기대와 맞는가? | cross-course query를 어느 thread/orchestrator가 수행하는가? | thread list/parallelism을 Course 단위로 얼마나 활용하는가? | Course-thread registry와 cross-course coordination 비용은? |
| 3. ModelingRun-per-thread | 각 run에 필요한 prior context를 명시적으로 재주입해도 되는가? | run isolation이 correction/review continuity를 끊지는 않는가? | 작은 context 이점과 반복 hydration token 비용의 균형은? | 독립 run 병렬성이 실제 사용자 가치인가? | 실패한 run 하나만 resume/retry/archive할 수 있는가? | multi-course run의 ownership을 어떻게 표시하는가? | persistent history/resume보다 fresh thread가 더 많은 것은 아닌가? | thread 증가, retention, list/search, mapping 비용은? |
| 4. ModelingRun-per-turn on persistent thread | run 사이 대화와 review가 자연스럽게 이어지는가? | 이전 run input/effect가 현재 run을 오염시키지 않는가? | persistent scope의 compact 후 run boundary를 복원할 수 있는가? | 같은 thread에서 run을 serialize/steer하는 UX가 허용 가능한가? | `threadId + turnId + WorkId`로 정확히 복구 가능한가? | persistent thread scope를 Semester/Course 중 무엇으로 둘 것인가? | turn/steer/interrupt/resume lifecycle을 얼마나 직접 활용하는가? | thread는 적지만 turn correlation과 queue policy 비용은? |
| 5. Hybrid/fork | trunk continuity와 branch isolation을 언제 전환하는가? | fork가 필요한 case를 재현 가능하게 판정할 수 있는가? | fork 시점과 각 branch compaction budget을 어떻게 추적하는가? | independent fork 병렬성과 shared workspace 충돌을 어떻게 다루는가? | thread tree와 product Work graph를 restart 뒤 재구성할 수 있는가? | cross-course trunk/branch의 ownership 규칙은? | `thread/fork`, `sessionId` tree, parallel thread를 실제로 활용하는가? | policy state space, graph correlation, UI explanation 비용은? |
