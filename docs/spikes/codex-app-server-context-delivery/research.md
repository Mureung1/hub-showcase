# Codex App Server context delivery capability 조사

> **현재 판정 (2026-07-11): 기술 참고 문서.** AY-PLE의 기본 제품 작업은 [Codex-native product composition](../../architecture/codex-native-product-composition.md)과 [ADR 0007](../../adr/0007-use-native-codex-composition-for-product-actions.md)에 따라 새 thread를 만들거나 기존 thread를 선택한 뒤 `Skill + PromptTemplate + arguments + source mentions + outputSchema`를 조합해 `turn/start(threadId)`로 실행한다. 이 문서가 조사한 `turn/steer`, correlated server request, Hook, `additionalContext`, `thread/inject_items`, realtime 경로는 범용 event router의 구성 요소가 아니라 구체적인 사용자 case가 필요로 할 때 고르는 capability다. Experimental API도 폐기하지 않고 roadmap 후보로 유지한다. 아래 본문은 pinned Codex 버전의 저수준 근거를 보존한 조사 기록이며 현재 제품 우선순위를 뜻하지 않는다.

## 조사 범위

| 항목 | 값 |
| --- | --- |
| 조사 질문 | App이 가진 정보·사용자 응답·도구 결과를 Codex에게 전달할 때 `@openai/codex@0.144.0`이 제공하는 저수준 경로는 무엇이며, 각 경로의 timing·correlation·persistence·성숙도는 어떻게 다른가? |
| 조사일 | 2026-07-11 |
| Codex 기준 버전 | [`@openai/codex@0.144.0`](../../../packages/runtime-codex/package.json), upstream tag [`rust-v0.144.0`](https://github.com/openai/codex/tree/rust-v0.144.0), dereferenced commit [`767822446c7a594caa19609ca435281a9ec67e0d`](https://github.com/openai/codex/commit/767822446c7a594caa19609ca435281a9ec67e0d) |
| AY-PLE 기준 시점 | `codex/w1d5`의 `e9bcea4745f282c82f6f4383339c217a71f0263f` |
| 자료 원칙 | 정확한 contract는 위 tag의 protocol·runtime·test source를 기준으로 하고, 공개 lifecycle 설명은 OpenAI의 [App Server 문서](https://learn.chatgpt.com/docs/app-server#api-overview)와 [Hooks 문서](https://learn.chatgpt.com/docs/hooks)를 보조 근거로 사용한다. |
| 비범위 | App Interaction Surface 또는 AY Interaction Surface의 제품 route 선택, Interaction Module interface 설계, 사용자 경험 우선순위 결정 |

현재 공개 문서는 pinned package 이후 바뀔 수 있다. 따라서 method·field·동작에 관한 이 문서의 정확한 주장은 `rust-v0.144.0` source를 기준으로 한다.

## 조사 결론

- **workspace에서 이용 가능함, App이 관측함, model에게 보임은 서로 다른 상태다.** `fs/writeFile`이나 drag-and-drop으로 파일을 놓는 행위는 workspace state를 바꾸지만 그 사실 또는 내용이 자동으로 model context가 되지는 않는다. 반대로 `turn/start`, `turn/steer`, `additionalContext`, `thread/inject_items`, tool result는 서로 다른 timing과 trust/correlation 계약으로 model-visible input을 만든다.
- **Codex App Server에는 하나의 범용 “App event injection” method가 없다.** session instruction, 새 turn input, active-turn steering, raw history injection, server-initiated request response, tool result, hook context, goal/realtime 전용 경로가 각각 다른 의미를 가진다.
- **즉시 응답은 pending operation과 정확히 correlate해야 한다.** approval, `requestUserInput`, MCP elicitation, dynamic tool call은 JSON-RPC request `id`에 답해야 하며, 일반 `turn/steer`나 임의 history injection으로 대체하면 원래 대기 중인 operation을 resolve하지 못한다.
- **`additionalContext`는 유망하지만 일반 event bus가 아니다.** opaque source key별 changed value만 emit하고 `untrusted`/`application` trust role을 나누며 값마다 1,000 token으로 middle truncation한다. 삭제 event는 emit하지 않고, `turn/steer`에서는 context-only 요청이 거부된다.
- **hooks는 임의 시점 push API가 아니라 lifecycle interception이다.** `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse` 같은 정해진 경계에서 context·block·rewrite를 제공한다.
- **`thread/goal/set`과 `thread/realtime/appendText`는 특수 목적 경로다.** 전자는 persisted goal과 자동 continuation을, 후자는 실행 중 realtime conversation을 다룬다. 둘을 generic App context transport로 간주하면 안 된다.
- **protocol maturity와 AY-PLE priority는 독립적이다.** experimental API도 제외하지 않고 roadmap 검증 후보로 남긴다. 다만 이 조사에서는 제품 route나 구현 순서를 결정하지 않는다.

## 판정 축

### Protocol maturity

| 표기 | 의미 |
| --- | --- |
| Stable | method/field에 explicit experimental marker가 없고 v2 contract로 노출된다. |
| Mixed | stable method 안에 experimental/unstable field가 있거나, stable request shape가 experimental setup에 의존한다. |
| Feature-gated | protocol method는 stable shape지만 runtime feature/config가 꺼져 있으면 사용할 수 없다. |
| Experimental | pinned source에서 `#[experimental(...)]` 또는 `EXPERIMENTAL`로 명시된다. |
| 확인 필요 | source가 persistence나 ordering을 충분히 보장하지 않아 live probe가 필요하다. |

### AY-PLE adoption

| 표기 | 의미 |
| --- | --- |
| Implemented | 현재 Runtime Harness의 정상 실행 흐름이 호출·관측한다. |
| Raw-callable | engine inspection용 raw wrapper는 있지만 제품 의미·정책이 없다. |
| Schema-only / reserved | generated schema나 capability slot에서만 관측되며 실행 integration은 없다. |
| Absent | stable generated surface와 raw client 모두 현재 경로를 제공하지 않는다. |

이 표기는 **현재 채택 상태**일 뿐 **제품 우선순위**가 아니다. 아래의 experimental 경로는 모두 roadmap candidate로 유지하며, 채택·보류·제외 결정은 후속 설계에서 별도로 한다.

## Capability 요약

| Capability | 주도자와 semantic role | Timing / correlation | Persistence | Protocol maturity | 현재 AY-PLE adoption | Roadmap 취급 |
| --- | --- | --- | --- | --- | --- | --- |
| `thread/start` instructions | App client가 thread-wide base/developer instruction을 설정 | thread 생성 시 JSON-RPC request `id`; 이후 turn 전체에 적용 | `baseInstructions`는 session metadata에 보존된다. `developerInstructions`의 process-resume 보존은 본 근거만으로 확정하지 않는다. | Stable fields in a mixed params shape | wrapper 미노출 | 설계 입력, 우선순위 미정 |
| `turn/start` | App/user가 새 regular turn을 시작 | `threadId`, 선택적 `clientUserMessageId`; 새 `turnId`와 lifecycle events | user item과 turn items가 rollout/history에 들어간다. | Stable base method | Implemented, text 중심 | 설계 입력, 우선순위 미정 |
| `turn/steer` | App/user가 현재 regular turn에 추가 input을 전달 | exact `expectedTurnId`; active turn에서만, 별도 `turn/started` 없음 | 수락된 user input은 현재 turn queue/history에 기록 | Stable base method; experimental subfields | Raw-callable, text 중심 | 설계 입력, 우선순위 미정 |
| `turn/interrupt` | App/user가 특정 active turn을 중단 | exact `threadId` + `turnId` | control outcome이며 새 semantic context는 아님 | Stable | Implemented/raw adapter cancellation | 설계 입력, 우선순위 미정 |
| `additionalContext` | App client가 source-keyed context fragment 제공 | `turn/start` 또는 non-empty `turn/steer`와 함께; key/value 변경 비교 | emit된 fragment는 history에 남지만 keyed dedupe의 resume 지속성은 확인 필요 | Experimental | generated params에서 제외, wrapper 미노출 | **roadmap candidate** |
| `thread/inject_items` | App client가 raw Responses API item을 model-visible history에 append | `threadId`만 사용; turn precondition 없음 | rollout에 persist되고 다음 model request에 포함 | Stable | Schema-only / reserved | 설계 입력, 우선순위 미정 |
| Server-initiated requests | Codex가 approval/input/tool/elicitation을 요구하고 App이 답함 | JSON-RPC request `id`가 필수; 대체로 `threadId`/`turnId`/`itemId` 또는 `callId` 추가 | pending operation의 결정·tool output으로 소비; generic future context가 아님 | Stable, Mixed, Experimental이 request별로 다름 | schema는 있으나 response loop 없음 | 수직 흐름별 검증 후보 |
| MCP / dynamic tool result | model 또는 App host가 tool을 호출하고 결과를 받음 | model path는 `callId`; direct host call은 JSON-RPC request `id` | model-invoked result는 correlated tool output으로 다음 inference에 사용. direct host call은 자동 history injection이 아님 | MCP stable; dynamic tools experimental setup | Schema-only, handler 없음 | dynamic tools는 **roadmap candidate** |
| hooks | Codex runtime이 configured lifecycle boundary에서 외부 hook을 실행 | `sessionId`, `turnId`, `toolUseId`; 임의 App event 시점 아님 | returned additional context는 developer-role conversation item으로 기록 | documented lifecycle; tool coverage 제한 | `hooks/list` schema만 있고 integration 없음 | 설계 입력, 우선순위 미정 |
| `thread/goal/set` | App client가 persisted objective/status/budget을 관리 | `threadId`; active goal은 idle continuation 또는 active-turn goal steering 유발 | SQLite/rollout에 persist | Feature-gated | Schema-only, wrapper 없음 | 특수 목적 roadmap candidate |
| `thread/realtime/appendText` | App client가 실행 중 realtime conversation에 role-bearing text 전송 | `threadId`, active realtime session 필수 | ordinary thread history와의 동일한 보존 의미는 확인되지 않음 | Experimental + persistence 확인 필요 | Absent | **roadmap candidate** |
| workspace / file availability | App/client 또는 외부 process가 파일 state를 변경 | path, watch별 `watchId`; model turn correlation 없음 | filesystem에 남고 `fs/changed`는 UI/client notification | Stable fs API | Schema-only / reserved | ingestion과 model visibility를 분리해 후속 설계 |

## Capability별 근거

### 1. `thread/start`: base instruction과 developer instruction

| 관점 | 관찰 |
| --- | --- |
| Initiator | App Server client가 `thread/start`를 호출한다. |
| Semantic role | `baseInstructions`는 model base instruction override이고, `developerInstructions`는 initial context의 developer message에 포함되는 thread/session 설정이다. 일반 사용자 message나 임시 App event가 아니다. |
| Timing / correlation | thread 생성 request의 JSON-RPC `id`로 correlate한다. 생성 이후 해당 session의 turn context에 적용된다. |
| Persistence | base instruction 선택 우선순위는 config override → persisted `session_meta.base_instructions` → model default다. 따라서 `baseInstructions`는 persisted session contract가 된다. `developerInstructions`가 process restart/resume 뒤에도 동일하게 복원된다는 보장은 이번 source 범위에서 확인되지 않았으므로 active session 설정으로만 확정한다. |
| Maturity | 두 field 자체는 experimental marker가 없는 stable field다. `ThreadStartParams` 전체에는 다른 experimental field가 함께 있으므로 params shape는 mixed다. |
| AY-PLE | [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 340–360은 `cwd`, `ephemeral`만 전달하여 두 instruction field를 노출하지 않는다. |
| 제약 / 위험 | 제품별 transient state를 instruction으로 계속 바꾸면 instruction hierarchy와 session identity가 섞인다. thread 생성 뒤 arbitrary event를 전달하는 경로로는 사용할 수 없다. |
| Primary sources | [`ThreadStartParams`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L51-L148), [App Server → config override mapping](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L930-L1025), [`ConfigOverrides`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_processor.rs#L1369-L1403), [base instruction priority](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L599-L651), [developer context assembly](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L3197-L3275), [Responses request mapping](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/client.rs#L847-L868) |

### 2. `turn/start`: 새 작업 단위의 사용자 input

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 user text/image/local image 등 `UserInput`을 제출한다. |
| Semantic role | 새 regular turn을 시작하는 primary user input이다. App 상태만 갱신하거나 기존 turn을 조용히 보강하는 경로가 아니다. |
| Timing / correlation | `threadId`와 request `id`로 요청하고 response에서 새 `turn.id`를 얻는다. `turn/started`, item, `turn/completed` event가 이어진다. 선택적 `clientUserMessageId`는 client-side user message correlation을 보조한다. |
| Persistence | user input은 turn item으로 기록되고 이후 thread history에 포함된다. |
| Maturity | base method와 기본 input은 stable이다. `additionalContext` 등 일부 field는 experimental이다. |
| AY-PLE | [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 411–426에서 text 중심 `UserInput`과 optional `cwd`를 보낸다. Runtime Harness의 실행 흐름이 사용한다. |
| 제약 / 위험 | 새 turn을 만든다는 semantic cost가 있다. 진행 중 turn에 대한 즉시 응답이나 조용한 durable context 갱신과 동일시하면 안 된다. |
| Primary sources | [`TurnStartParams`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L63-L164), [App Server core primitives](https://learn.chatgpt.com/docs/app-server#api-overview) |

### 3. `turn/steer`: active turn mailbox에 추가 input

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 현재 실행 중인 turn에 추가 user input을 보낸다. |
| Semantic role | active regular turn의 방향을 정정·보강하는 user input이다. 새 turn을 시작하지 않는다. |
| Timing / correlation | non-empty `expectedTurnId`가 현재 active turn과 정확히 일치해야 한다. no-active-turn, turn mismatch, review/compact turn, empty input은 거부된다. 수락 response는 동일한 active `turnId`를 반환하고 새 `turn/started`를 만들지 않는다. |
| Persistence | 수락된 input과 changed `additionalContext` fragment는 active turn queue로 들어가고 conversation history에 기록된다. |
| Maturity | core steering은 stable이다. `turn/steer.additionalContext`와 metadata field는 experimental이다. |
| AY-PLE | [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 428–448에 text 중심 wrapper가 있고 [`capability-slots.ts`](../../../packages/runtime-codex/src/capability-slots.ts) 27–42는 `raw-callable`, `productized: false`로 판정한다. |
| 제약 / 위험 | race가 있는 active work에 반드시 exact precondition이 필요하다. context-only steer는 거부되며, review/compact turn에는 사용할 수 없다. |
| Primary sources | [`TurnSteerParams`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L167-L201), [request validation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/turn_processor.rs#L849-L955), [active-turn queue](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/session/mod.rs#L3867-L3947), [context-only rejection test](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/tests/suite/v2/turn_steer.rs#L390-L514), [공개 steering 설명](https://learn.chatgpt.com/docs/app-server#steer-an-active-turn) |

### 4. `turn/interrupt`: 특정 active turn 중단

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 중단 의사를 보낸다. |
| Semantic role | 실행 제어이며 context contribution이 아니다. |
| Timing / correlation | exact `threadId`와 `turnId`가 필요하고, 결과는 해당 turn의 interrupted terminal state/event로 관측한다. |
| Persistence | turn lifecycle 결과에는 반영되지만 새 user/developer semantic content를 만들지 않는다. |
| Maturity | Stable. |
| AY-PLE | [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 450–462에 wrapper가 있고 현재 adapter cancellation 검증에 사용된다. |
| 제약 / 위험 | “중단 요청을 보냈음”과 “중단이 terminal event로 확인됨”을 구분해야 한다. |
| Primary sources | [`TurnInterruptParams`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L203-L214), [App Server control 설명](https://learn.chatgpt.com/docs/app-server#api-overview) |

### 5. experimental `additionalContext`

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 `turn/start` 또는 `turn/steer` params에 opaque source key → `{ value, kind }` map을 첨부한다. |
| Semantic role | user message item으로 노출하지 않으면서 model input에 source-keyed contextual fragment를 추가한다. `untrusted`는 user-role external fragment, `application`은 developer-role fragment다. |
| Timing / correlation | 해당 turn request와 함께 전달된다. `turn/steer`에서는 실제 `input`이 non-empty여야 하므로 context-only delivery는 불가능하다. |
| Changed-key behavior | runtime store는 이전 map과 key/value가 다른 entry만 emit한 뒤 현재 map 전체를 새 값으로 교체한다. key 삭제는 deletion fragment를 emit하지 않는다. 이미 history에 들어간 예전 fragment도 지우지 않는다. 삭제 후 같은 key를 다시 넣으면 현재 store에는 없으므로 다시 emit된다. |
| Size | 각 value는 model input으로 만들 때 최대 1,000 token budget으로 middle truncation된다. |
| Persistence | emit된 fragment는 conversation history에 남아 다음 model request에서도 보인다. 다만 keyed dedupe store가 process resume 뒤에도 보존된다는 evidence는 없으므로 cross-resume changed-key semantics는 확인 필요다. |
| Maturity | `turn/start.additionalContext`, `turn/steer.additionalContext` 모두 explicit Experimental. |
| AY-PLE | stable `generate-ts` 결과에는 `AdditionalContextEntry` type은 존재하지만 `TurnStartParams`/`TurnSteerParams` field가 제외된다. generator는 experimental opt-in 없이 실행되고, initialize는 `capabilities: null`이며 raw wrapper도 field를 노출하지 않는다. |
| 제약 / 위험 | 삭제/retention 의미가 snapshot처럼 보이지만 과거 history를 철회하지 않는다. trust kind 선택은 prompt-injection 경계다. opaque key lifecycle과 token truncation을 제품이 모르면 stale 또는 중복 context가 생길 수 있다. |
| Primary sources | [protocol kinds와 fields](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L46-L86), [`turn/steer.additionalContext`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs#L167-L194), [changed-entry store](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/state/additional_context.rs#L10-L36), [role과 1,000-token truncation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/context-fragments/src/additional_context.rs#L1-L92), [role test](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/tests/suite/additional_context.rs#L167-L231), [dedupe/removal/re-add tests](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/tests/suite/additional_context.rs#L234-L474), [truncation test](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/tests/suite/additional_context.rs#L476-L572), [`generate-ts` invocation](../../../packages/runtime-codex/scripts/generate-codex-app-server-types.ts) |

### 6. `thread/inject_items`: raw model-visible history append

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 loaded thread에 raw Responses API item JSON을 보낸다. |
| Semantic role | 새 user turn 없이 thread의 **model-visible raw history**를 직접 append한다. 역할·tool shape를 포함한 low-level history mutation이다. |
| Timing / correlation | request는 `threadId`만 받고 `turnId` 또는 `expectedTurnId`를 받지 않는다. 따라서 active-turn exact correlation 계약은 없다. |
| Persistence | source test는 injected item이 rollout history에 저장되고 다음 model request에서 standard initial context 뒤, 새 user prompt 앞에 포함됨을 증명한다. |
| Maturity | Stable. |
| AY-PLE | generated `ClientRequest`와 [`capability-slots.ts`](../../../packages/runtime-codex/src/capability-slots.ts) 124–141에 `reserved`로 보이지만 raw wrapper는 없다. |
| 제약 / 위험 | raw Responses item에 직접 결합하고 trust/role 검증 책임이 client 쪽으로 이동한다. active turn 중 주입 ordering은 본 tests가 보장하지 않으므로 별도 probe가 필요하다. 제품 contract로 그대로 노출하면 engine shape leakage가 된다. |
| Primary sources | [`ThreadInjectItemsParams`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L1289-L1301), [validation과 injection](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/turn_processor.rs#L802-L827), [rollout persistence와 next request test](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/tests/suite/v2/thread_inject_items.rs#L26-L139), [existing-history test](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/tests/suite/v2/thread_inject_items.rs#L141-L258), [공개 injection 설명](https://learn.chatgpt.com/docs/app-server#inject-items-into-a-thread) |

### 7. Server-initiated request/response

Codex App Server가 client에게 보내는 JSON-RPC request는 notification과 다르다. client는 **동일한 request `id`**를 echo한 response를 보내야 pending operation이 계속되거나 거절된다. `serverRequest/resolved`는 다른 client 또는 내부 resolution으로 request가 끝난 경우를 알린다. 일반 user message나 `turn/steer`는 이 request response를 대신하지 않는다. [공개 approval lifecycle](https://learn.chatgpt.com/docs/app-server#approvals)과 [server request definitions](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/common.rs#L1458-L1496)이 이를 정의한다.

| Request | Semantic role | 추가 correlation | Persistence / continuation | Maturity |
| --- | --- | --- | --- | --- |
| `item/commandExecution/requestApproval` | 특정 command 실행 허용 여부 | `threadId`, `turnId`, `itemId`; zsh bridge callback은 선택적 `approvalId` | decision이 pending command를 resume/decline한다. generic conversation context가 아니다. | Stable base request, `additionalPermissions`·`availableDecisions`는 Experimental |
| `item/fileChange/requestApproval` | 특정 file change 허용 여부 | `threadId`, `turnId`, `itemId` | decision이 pending change를 resume/decline한다. | Stable base request, `grantRoot`는 source에서 Unstable |
| `item/permissions/requestApproval` | 추가 permission profile 승인 | `threadId`, `turnId`, `itemId`, environment/cwd | granted profile과 scope가 해당 turn/session permission state에 반영된다. | Stable shape, runtime feature/config 영향 |
| `item/tool/requestUserInput` | agent/tool이 묻는 structured question에 답 | `threadId`, `turnId`, `itemId`; response map key는 question `id` | 답이 정확한 pending tool call로 돌아가 agent work를 계속한다. | Experimental |
| `mcpServer/elicitation/request` | MCP server의 form/url elicitation에 답 | JSON-RPC request `id`가 protocol identity. `threadId`, nullable best-effort `turnId`, `serverName` 제공 | accept/decline/cancel과 structured content가 MCP request를 resolve한다. | Stable base request; `openai/form`은 client capability와 결합된 extension |
| `item/tool/call` | client-defined dynamic tool 실행 결과 반환 | `threadId`, `turnId`, `callId` | `contentItems`와 `success`가 correlated tool output이 되어 model execution을 계속한다. | request shape는 stable지만 tool 등록 `thread/start.dynamicTools`가 Experimental |

현재 AY-PLE의 generated `ServerRequest` union에는 위 request들이 보인다. 그러나 [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 718–730은 `id`가 있는 inbound message를 자신의 outbound `pendingResponses`와 대조하고, 일치하지 않으면 반환한다. 즉, **server-initiated request를 dispatch하고 response를 쓰는 loop가 아직 없다.** [`packages/runtime-codex/README.md`](../../../packages/runtime-codex/README.md) 38–42와 [Runtime Harness 구현 지도](../../architecture/runtime-harness-implementation-map.md) 114–120, 154도 이를 제품 gap으로 기록한다.

Primary sources: [command/file approval params](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1431-L1533), [dynamic tool과 user-input params](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/item.rs#L1535-L1645), [permission request](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/permissions.rs#L740-L776), [MCP elicitation correlation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L294-L312), [MCP elicitation variants와 response](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L631-L717).

### 8. MCP tool result와 dynamic tool result

MCP에는 서로 혼동하기 쉬운 두 호출 경로가 있다.

| 경로 | Initiator | Model visibility | Correlation / persistence | Maturity와 AY-PLE |
| --- | --- | --- | --- | --- |
| Model-invoked MCP tool | model이 현재 turn에서 tool call을 생성하고 Codex runtime이 MCP server를 호출 | MCP `CallToolResult`가 해당 `callId`의 tool output으로 변환되어 model execution에 다시 들어간다. item lifecycle event도 발생한다. | `threadId`/`turnId` 문맥과 `callId`; tool call/result는 turn history의 correlated item이다. | MCP runtime path는 stable. AY-PLE는 events를 raw 관측할 수 있으나 제품 tool-result interface는 없다. |
| Direct `mcpServer/tool/call` | App host가 App Server에 직접 MCP tool 호출을 요청 | response는 host client로 반환된다. **그 결과를 model history에 자동 append하는 코드는 이 request processor에 없다**는 것이 pinned source로부터의 inference다. | JSON-RPC request `id`, `threadId`, server/tool; model call `callId`가 없다. | Stable method; AY-PLE wrapper 없음. |
| Dynamic tool `item/tool/call` | `thread/start.dynamicTools`로 client tool을 등록한 뒤 model이 호출 | client response의 `contentItems`/`success`가 correlated tool result가 된다. | `threadId`, `turnId`, `callId`, JSON-RPC request `id` | setup field가 Experimental. AY-PLE는 schema-only이고 server request response loop가 없다. Roadmap candidate로 유지. |

Primary sources: [MCP handler entry](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/tools/handlers/mcp.rs#L115-L162), [MCP lifecycle](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/mcp_tool_call.rs#L112-L180), [approved call과 result](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/mcp_tool_call.rs#L362-L457), [MCP manager invocation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/mcp_tool_call.rs#L566-L616), [direct host request/response](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/mcp_processor.rs#L455-L474), [`McpServerToolCallParams`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/mcp.rs#L97-L125), [`thread/start.dynamicTools`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L118-L137).

### 9. Hooks: lifecycle-bound context와 control

| 관점 | 관찰 |
| --- | --- |
| Initiator | Codex runtime이 config와 matcher에 따라 외부 hook process를 lifecycle 경계에서 호출한다. App이 arbitrary JSON-RPC event를 밀어 넣는 구조가 아니다. |
| Semantic role | `SessionStart`·`UserPromptSubmit`은 추가 developer context와 stop/block을, `PreToolUse`는 tool 실행 전 block/input rewrite/additional context를, `PostToolUse`는 성공한 tool output 뒤 feedback/additional context를 제공한다. |
| Timing / correlation | `SessionStart`는 startup/resume/clear/compact 계열 시작, `UserPromptSubmit`은 user input 처리 전, `PreToolUse`는 지원 tool 실행 전, `PostToolUse`는 성공 output 뒤다. request에는 `sessionId`, turn 경계에는 `turnId`, tool 경계에는 `toolUseId`가 있다. |
| Persistence | hook이 돌려준 `additionalContext`는 developer-role `ResponseItem`으로 conversation에 기록된다. hook 자체의 외부 side effect와 context persistence는 별개다. `PostToolUse`는 이미 일어난 tool side effect를 되돌릴 수 없다. |
| Coverage | 공식 문서는 `PreToolUse`/`PostToolUse`가 Bash, `apply_patch`, MCP 등 지원 범위에 적용되며 모든 internal tool을 가로채는 것은 아니라고 설명한다. pinned App Server surface에는 `hooks/list`는 있지만 generic `hooks/run` method는 없다. 따라서 document drop 직후 임의 hook을 호출하는 경로가 없다는 것은 protocol 목록과 runtime dispatch 지점에서의 inference다. |
| Maturity | Hooks는 documented lifecycle이다. 다만 event별 output contract와 tool coverage를 각각 확인해야 한다. |
| AY-PLE | generated `hooks/list` shape 외에 hook config/dispatch/product integration이 없다. |
| 제약 / 위험 | hook을 event bus로 모델링하면 실행 시점이 어긋난다. `PreToolUse` rewrite/block과 `PostToolUse` feedback은 서로 대체 불가능하다. hook stdout context는 developer trust로 들어가므로 hook 구성 자체가 trust boundary다. |
| Primary sources | [SessionStart docs](https://learn.chatgpt.com/docs/hooks#sessionstart), [UserPromptSubmit docs](https://learn.chatgpt.com/docs/hooks#userpromptsubmit), [PreToolUse docs](https://learn.chatgpt.com/docs/hooks#pretooluse), [PostToolUse docs](https://learn.chatgpt.com/docs/hooks#posttooluse), [session/pre-tool runtime](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/hook_runtime.rs#L102-L215), [post-tool runtime](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/hook_runtime.rs#L258-L295), [user-prompt와 recording](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/hook_runtime.rs#L500-L615), [developer role](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/context/hook_additional_context.rs#L3-L29), [`hooks/list`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/common.rs#L673-L677) |

### 10. `thread/goal/set`: persisted autonomous-work control

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 materialized thread의 objective, status, optional token budget을 생성·변경한다. |
| Semantic role | 장기 objective와 accounting/continuation 상태를 관리한다. 일반 context contribution이 아니다. status는 `active`, `paused`, `blocked`, `usageLimited`, `budgetLimited`, `complete`다. |
| Timing / correlation | `threadId` 기준이다. active goal을 설정하면 idle thread에서 continuation turn을 시작할 수 있고, active turn 중 objective가 바뀌면 internal goal steering item을 넣을 수 있다. |
| Persistence | goal은 state DB에 기록되고 goal update는 rollout item/notification으로 반영된다. resume 시 active goal을 복원한다. |
| Maturity | method shape에는 experimental marker가 없지만 `Feature::Goals`가 꺼져 있으면 거부된다. ephemeral thread는 지원하지 않고 materialized rollout과 SQLite state DB가 필요하다. Feature-gated로 분류한다. |
| AY-PLE | stable generated `ClientRequest`에는 method가 있으나 raw wrapper와 제품 integration은 없다. |
| 제약 / 위험 | goal runtime은 자동 continuation, token accounting, terminal status라는 강한 정책을 동반한다. 단순 “향후 model이 알 context” 저장소로 재사용하면 unintended autonomous work가 발생한다. |
| Primary sources | [goal types](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs#L733-L829), [feature/materialization checks](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_goal_processor.rs#L97-L161), [ephemeral/DB constraints](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_goal_processor.rs#L219-L248), [runtime goal effects](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/ext/goal/src/runtime.rs#L189-L220), [resume와 continuation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/ext/goal/src/runtime.rs#L335-L429), [internal goal context](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/ext/goal/src/steering.rs#L37-L78), [App Server example](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/README.md#L576-L638) |

### 11. experimental `thread/realtime/appendText`

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client가 active realtime conversation에 text를 append한다. |
| Semantic role | realtime conversation item이며 ordinary `turn/start` user input이나 regular active-turn mailbox와 다른 channel이다. `role`은 `user`, `developer`, `assistant`이고 누락 시 `user`가 default다. |
| Timing / correlation | `threadId`를 사용하며 실행 중 realtime session이 없으면 거부된다. exact regular `turnId` precondition은 없다. |
| Persistence | source는 realtime websocket에 conversation item을 보내는 것을 증명하지만, 이것이 ordinary rollout history와 미래 text turn에 어떤 형태로 보존되는지는 명시하지 않는다. **확인 필요**다. |
| Maturity | method에 explicit `#[experimental("thread/realtime/appendText")]` marker가 있다. |
| AY-PLE | stable-only `generate-ts`의 `ClientRequest`에 method가 없고 initialize도 `capabilities: null`이다. raw wrapper도 없다. |
| 제약 / 위험 | active realtime session 전용이며, regular turn steering과 persistence 의미가 같다고 가정할 수 없다. role-bearing text는 trust 경계도 포함한다. |
| Primary sources | [experimental method registration](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/common.rs#L834-L839), [params](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/realtime.rs#L150-L165), [role enum](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/protocol/src/protocol.rs#L428-L442), [active-session request handling](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/turn_processor.rs#L1060-L1085), [realtime input queue](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/realtime_conversation.rs#L488-L510), [websocket conversation item](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/realtime_conversation.rs#L1433-L1451) |

### 12. Workspace/file availability와 model visibility

| 관점 | 관찰 |
| --- | --- |
| Initiator | App client는 `fs/writeFile` 등으로 local environment filesystem을 바꾸거나, 외부 process가 같은 workspace를 바꿀 수 있다. |
| Semantic role | file availability/state mutation이다. 그 자체는 conversation input이 아니다. |
| Timing / correlation | file request는 path와 JSON-RPC request `id`를 사용한다. `fs/watch`는 connection-scoped `watchId`를 만들고 `fs/changed`가 changed paths를 client에 알린다. `threadId`/`turnId`와 자동 correlate하지 않는다. |
| Persistence | 파일은 filesystem에 남는다. watcher notification은 UI/cache invalidation용 관측이지 model history가 아니다. |
| Model visibility | `fs/writeFile`과 `fs/changed` processor에는 conversation item을 생성하는 동작이 없다. 따라서 “파일이 workspace에 존재한다”와 “model이 그 내용을 알고 있다”는 별개라는 것이 source로부터의 inference다. model이 보려면 이후 prompt/context, hook, tool/file read, `thread/inject_items` 등 별도의 model-visible 경로가 필요하다. 이 문서는 그중 무엇을 선택할지 결정하지 않는다. |
| Maturity | fs read/write/watch와 `fs/changed`는 Stable. |
| AY-PLE | generated schema와 `attachment-input` reserved slot에는 `fs/readFile`이 있으나 MaterialIntake/SourceSelection/product wiring과 raw fs wrapper는 없다. |
| 제약 / 위험 | “drop 완료”를 “agent context 반영 완료”로 표시하면 사용자와 runtime의 mental model이 어긋난다. file contents, metadata, git state, model-visible summary는 별도 사실로 추적해야 한다. |
| Primary sources | [fs read/write implementation](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/fs_processor.rs#L53-L94), [watch notification](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/fs_watch.rs#L110-L143), [`fs/changed` registration](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/common.rs#L1667-L1667), [공개 filesystem 설명](https://learn.chatgpt.com/docs/app-server#filesystem) |

## Cross-cutting triage dimensions

이 capability inventory가 제공하는 것은 route 결정이 아니라, 각 interaction case를 검토할 때 빠뜨리면 안 되는 저수준 질문이다.

| Dimension | 확인 질문 |
| --- | --- |
| Semantic role | 새 user intent인가, active work correction인가, exact pending response인가, durable history인가, workspace state인가, tool result인가, lifecycle policy인가? |
| Timing | 새 turn 전인가, active regular turn 중인가, tool 전/후인가, realtime session 중인가, 다음 turn에서만 필요하면 되는가? |
| Correlation | JSON-RPC request `id`, `threadId`, `turnId`, `expectedTurnId`, `itemId`, `approvalId`, `callId`, `toolUseId`, `watchId` 중 무엇을 보존해야 하는가? |
| Trust / role | user, untrusted external, application/developer, assistant/tool output 중 어느 role로 model에 들어가는가? |
| Persistence | process memory, rollout history, SQLite goal state, filesystem, realtime session 중 어디에 남는가? 삭제 또는 supersede가 과거 model history도 철회하는가? |
| Interruption | 현재 model generation을 즉시 바꿔야 하는가, pending operation을 resolve해야 하는가, 다음 inference까지만 기다려도 되는가? |
| Protocol maturity | stable, mixed, feature-gated, experimental, evidence gap 중 무엇인가? |
| AY-PLE adoption | implemented, raw-callable, schema-only/reserved, absent 중 무엇인가? 이 상태와 제품 우선순위를 혼동하지 않았는가? |

## AY-PLE 현재 gap 요약

| Gap | 근거 |
| --- | --- |
| experimental capability negotiation 없음 | [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 317–321이 `capabilities: null`로 initialize한다. |
| stable schema만 생성 | [`generate-codex-app-server-types.ts`](../../../packages/runtime-codex/scripts/generate-codex-app-server-types.ts) 27–30은 experimental option 없이 `app-server generate-ts`를 실행한다. |
| thread instruction wrapper 없음 | [`raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) 340–360은 `cwd`, `ephemeral`만 전달한다. |
| `turn/start`와 `turn/steer`는 text 중심 | 같은 파일 411–448. `additionalContext`를 노출하지 않는다. |
| server request response loop 없음 | 같은 파일 718–730은 outbound pending response가 아닌 inbound id-bearing request를 무시한다. |
| `thread/inject_items`, fs, goals, hooks, MCP/dynamic tool의 제품 연결 없음 | [`capability-slots.ts`](../../../packages/runtime-codex/src/capability-slots.ts)와 [Runtime Harness 구현 지도](../../architecture/runtime-harness-implementation-map.md)는 대부분을 reserved 또는 gap으로 분류한다. |
| engine protocol을 product contract로 승격하지 않음 | 현재 architecture convention과 구현 지도는 generated/raw shape를 inspection boundary 안에 둔다. 이 조사는 그 경계를 변경하지 않는다. |

## Roadmap에 남길 검증 후보

아래 항목은 **우선순위가 정해졌다는 뜻이 아니라**, experimental 또는 evidence gap이라는 이유만으로 삭제하지 않을 검증 후보다.

| 후보 | 확인할 최소 evidence |
| --- | --- |
| `additionalContext` | experimental schema/capability opt-in 방법, live `turn/start`와 non-empty `turn/steer` delivery, trust role, changed-key behavior, process resume 뒤 dedupe |
| `thread/realtime/appendText` | realtime session setup부터 append까지의 capability negotiation, role별 model visibility, rollout/future-turn persistence |
| dynamic tools | `thread/start.dynamicTools` 등록, `item/tool/call` server request dispatch, exact request response, model continuation |
| `thread/goal/set` | Goals feature enablement, materialized thread/SQLite 조건, idle continuation과 active-turn objective update, clear/terminal semantics |
| active-turn `thread/inject_items` | regular turn 실행 중 injection ordering, 현재 inference 반영 시점, turn race와 failure semantics |
| MCP elicitation extension | client capability negotiation, nullable `turnId`, `openai/form`과 standard form/url response 호환성 |

## 명시적 비결정

- 특정 App interaction을 `turn/start`, `turn/steer`, `additionalContext`, hooks, `thread/inject_items` 중 어디로 route할지 정하지 않는다.
- App Interaction Surface와 AY Interaction Surface를 하나의 handle/union/interface로 고정하지 않는다.
- experimental API를 MVP에서 제외하지도, MVP에 포함한다고 확정하지도 않는다.
- Runtime 공개 API·product domain type을 Codex raw protocol shape에 맞춰 변경하지 않는다.
- file drop, YES/NO 응답, review, user confirmation 등 구체 사례의 O/X matrix는 후속 설계에서 이 문서의 timing·correlation·persistence evidence를 사용해 별도로 작성한다.

## Primary source index

| 범주 | Source |
| --- | --- |
| App Server public lifecycle | [OpenAI App Server docs](https://learn.chatgpt.com/docs/app-server#api-overview) |
| Hooks public lifecycle | [OpenAI Hooks docs](https://learn.chatgpt.com/docs/hooks) |
| Thread protocol | [`protocol/v2/thread.rs@rust-v0.144.0`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/thread.rs) |
| Turn protocol | [`protocol/v2/turn.rs@rust-v0.144.0`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/turn.rs) |
| Server request registry | [`protocol/common.rs@rust-v0.144.0`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/common.rs#L1458-L1496) |
| Additional context runtime/tests | [`additional_context.rs` store](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/state/additional_context.rs), [fragment formatting](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/context-fragments/src/additional_context.rs), [tests](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/tests/suite/additional_context.rs) |
| History injection tests | [`thread_inject_items.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/tests/suite/v2/thread_inject_items.rs) |
| Hook runtime | [`hook_runtime.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/hook_runtime.rs), [`HookAdditionalContext`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/context/hook_additional_context.rs) |
| MCP runtime | [`mcp_tool_call.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/mcp_tool_call.rs), [`mcp_processor.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/mcp_processor.rs) |
| Goals | [`thread_goal_processor.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/thread_goal_processor.rs), [`ext/goal/runtime.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/ext/goal/src/runtime.rs) |
| Realtime | [`protocol/v2/realtime.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server-protocol/src/protocol/v2/realtime.rs), [`realtime_conversation.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/core/src/realtime_conversation.rs) |
| Filesystem | [`fs_processor.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/request_processors/fs_processor.rs), [`fs_watch.rs`](https://github.com/openai/codex/blob/rust-v0.144.0/codex-rs/app-server/src/fs_watch.rs) |
| AY-PLE raw client | [`packages/runtime-codex/src/raw-client.ts`](../../../packages/runtime-codex/src/raw-client.ts) |
| AY-PLE capability inventory | [`packages/runtime-codex/src/capability-slots.ts`](../../../packages/runtime-codex/src/capability-slots.ts), [Runtime Harness 구현 지도](../../architecture/runtime-harness-implementation-map.md) |
