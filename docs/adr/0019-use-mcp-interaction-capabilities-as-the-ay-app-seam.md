# MCP InteractionCapability를 AY와 App의 seam으로 사용한다

분류: 활성

성숙도: 채택

부분 대체·보완하는 결정: [ADR 0007 — 제품 작업을 native Codex 조합으로 실행한다](0007-use-native-codex-composition-for-product-actions.md)

관련 workspace 결정: [ADR 0018 — 사용자가 선택한 Git working tree를 SemesterWorkspace로 채택한다](0018-adopt-user-owned-git-semester-workspaces.md)

관련 startup 결정: [ADR 0020 — SemesterWorkspace를 App 실행 전에 native Bootstrap으로 준비한다](0020-bootstrap-semester-workspaces-before-app-startup.md)

## 맥락

AY-PLE의 차별점은 Codex를 단순히 채팅 UI에 넣는 것이 아니다. AY가 작업 중 사용자 판단이 필요한 순간을 MCP로 표현하면, App이 그 의도를 자료 미리보기·선택지·변경 비교 같은 typed UI로 보여주고, 사용자의 선택을 같은 Codex Turn에 구조화된 결과로 돌려주는 상호작용이 핵심 제품 가치다.

First Assignment vertical의 `propose_state_patch`는 이 round trip의 가능성을 증명했다. 그러나 현재 구현은 caller가 `requestKey`, workspace·Course identity와 revision을 알고, App이 `ModelingRun`·`StatePatch`·`UserConfirmation`의 lifecycle과 apply까지 소유하며, 같은 결정을 built-in `request_user_input`으로 한 번 더 운반한다. 이 구조는 학업 workflow와 native execution correlation을 MCP Interface 밖으로 누출해 새 interaction을 추가할수록 App, Skill과 Server가 함께 바뀌게 한다.

## 결정

- AY-PLE App은 **InteractionCapability**를 제공하는 MCP Module을 소유한다. 이 Module의 Interface는 “AY가 표시할 내용과 허용할 응답을 요청하면, 사용자가 App UI에서 결정하고, 구조화된 결과가 같은 Codex Turn으로 반환된다”는 한 번의 round trip이다.
- MCP Module은 `hub/`가 소유하는 Codex-facing STDIO Adapter와 App-side Interaction Broker로 나눈다. Private npm workspace package `@ay-ple/interaction-mcp`는 built STDIO executable, capability별 MCP request/result schema·codec와 authenticated Adapter↔Broker transport contract를 소유한다.
- `apps/server`는 package가 정의한 server-side Interface를 사용해 Broker listener·process-local endpoint와 token, 현재 Runtime binding, pending lifecycle, Browser projection과 사용자 result 반환을 소유한다. `@ay-ple/product-contract`는 Browser-safe projection만, `apps/chat-shell`은 capability별 UI만 소유하며 raw MCP·private Broker transport를 알지 않는다.
- Adapter↔Broker transport는 Browser API와 **같은 pre-bound loopback HTTP listener**의 Server-private route를 사용한다. 별도 listener·port·daemon, WebSocket 또는 Unix domain socket을 추가하지 않으며 exact route·header 이름은 implementation spec이 고정한다.
- 각 Workspace Runtime generation은 fresh high-entropy token과 opaque Runtime binding을 가진다. 모든 Broker request는 loopback peer, constant-time token match와 현재 active binding을 함께 통과해야 한다. 이 값은 Server memory와 해당 Codex child environment에만 존재하고 Browser contract·workspace·global config·log에 노출하지 않으며, Runtime replacement·close 또는 App shutdown 때 폐기한다.
- Startup은 shared listener bind와 private Broker route·binding 준비가 성공한 뒤 prepared SemesterWorkspace의 Runtime을 시작한다. Adapter의 authenticated handshake와 required MCP readiness가 확인된 뒤에만 registry active pointer를 commit한다. Listener bind·Broker preparation이 실패하면 Runtime을 spawn하지 않고, stale token·binding이나 closed Broker의 request는 fail closed한다.
- Adapter는 startup 때 짧은 authenticated handshake 하나를 완료하고, 이후 capability MCP call 하나를 authenticated Broker HTTP POST 하나로 운반한다. Broker는 request를 Browser UI에 투영한 뒤 정상 사용자 result 또는 MCP failure가 정산될 때까지 그 HTTP response를 pending으로 유지하고, transport가 살아 있으면 terminal response를 정확히 한 번만 쓴다.
- Broker는 Workspace Runtime generation마다 pending interaction slot을 하나만 가진다. Slot이 찬 동안 들어온 두 번째 authenticated capability request는 Browser에 투영하거나 queue·preempt하지 않고 즉시 명시적인 `busy` error로 끝낸다. `busy`는 capability의 사용자 result가 아니며, 기존 call이 정산된 뒤 fresh call을 보낼지는 AY가 판단한다.
- Pending Review는 AY Chat transcript의 inline card 하나로 표시한다. Modal이나 별도 approval page를 만들지 않는다. Card가 pending인 동안 free-form composer, 새 Turn과 steer는 닫고 `accept | revise | reject` action과 전체 Turn interrupt만 연다. 별도 card dismiss·`cancel` control은 만들지 않으며, Turn interrupt는 Review result가 아니라 native conversation control로서 pending call을 MCP failure path로 끝낸다.
- 각 capability call은 자신이 만든 card 하나만 pending에서 settled read-only 상태로 정산한다. `revise` 뒤 AY가 다시 제안하면 fresh MCP call과 새 card를 transcript 아래에 추가하며 이전 card를 교체·재개하거나 다시 답할 수 있게 열지 않는다. Settled card는 현재 conversation의 presentation이지 App-owned Review ledger가 아니며 별도 durable history로 저장하지 않는다.
- Browser에는 App-owned opaque interaction identity만 투영한다. Browser answer는 현재 pending call 하나만 settle하며 duplicate·late answer는 두 번째 result를 만들지 않는다. Turn interrupt에 따른 MCP cancellation·STDIO EOF·HTTP abort, Browser disconnect, Runtime terminal·replacement와 App shutdown은 정상 result를 만들지 않고 pending call을 MCP failure path로 terminal 정산한다.
- Broker는 `202` acknowledgement 뒤 polling, callback URL, persistent WebSocket session, durable outbox나 response replay journal을 만들지 않는다. Terminal response가 Adapter에 전달되기 전에 continuity를 잃으면 call은 성공으로 추정하지 않고 MCP failure로 끝낸다. AY가 계속하려면 fresh capability call을 보내며 App은 이전 사용자 선택을 workspace에 대신 적용하지 않는다.
- Current pinned Codex의 MCP tool call 기본 timeout 300초를 초기 제품 동작으로 수용하고 project MCP declaration에서는 `tool_timeout_sec`을 생략한다. Timeout은 pending interaction을 MCP failure로 terminal 정산하며 AY가 계속하려면 fresh capability call을 보낸다. App-level countdown·연장·keepalive·자동 retry 상태 기계는 만들지 않는다. Codex pin을 바꿀 때 native default를 다시 확인하고, 실제 Review가 5분을 넘어야 한다는 근거가 생길 때만 명시적인 override를 검토한다.
- `@ay-ple/codex-chat-runtime`은 capability-neutral하게 Codex child environment를 전달하고 native MCP readiness를 관측한다. `@ay-ple/interaction-mcp`를 import하거나 `propose_state_patch` schema, Broker endpoint와 UI lifecycle을 소유하지 않는다.
- App 실행 전 native Bootstrap Skill은 Git-tracked `<SemesterWorkspace>/.codex/config.toml`에 AY-PLE Interaction MCP의 정적 project declaration을 설치한다. 이 declaration은 exact SemesterWorkspace root에서 `hub/packages/interaction-mcp`의 built STDIO entrypoint까지 계산한 상대 `command`, 전달할 environment variable 이름, capability allowlist와 `required = true`를 표현하고 MCP server `cwd`와 `tool_timeout_sec`은 생략한다. Current pinned launcher는 생략된 server `cwd`를 Workspace Runtime의 exact root `cwd`로 fallback하고 native MCP tool timeout 300초를 적용한다. Exact executable filename과 env 이름은 implementation spec이 고정한다.
- Project config에는 endpoint, token, native identity나 다른 secret·process-local 값을 기록하지 않는다. AY-PLE Runtime은 Codex child environment에 현재 App instance의 endpoint·token·Runtime binding을 넣고, MCP declaration의 `env_vars`가 이를 STDIO Adapter에 전달한다.
- STDIO Adapter는 process 시작만으로 initialize를 성공시키지 않는다. Environment binding을 검증하고 현재 App-side Broker와 인증된 handshake를 완료한 뒤에만 MCP initialize를 성공시킨다. Endpoint·token 누락, Broker offline, authentication 실패나 capability mismatch는 required MCP initialization failure이며 prepared-workspace startup을 실패시킨다.
- App startup은 effective MCP status에서 expected `ay_ple_interaction` server와 handshake 완료를 확인한다. Explicit `untrusted`처럼 project config 자체가 무시되어 native `required` declaration이 보이지 않는 경우도 이 gate에서 실패한다.
- AY-PLE은 Interaction MCP가 없는 degraded Workspace Runtime을 제품 정상 상태로 열지 않는다. 같은 SemesterWorkspace를 AY-PLE Broker environment 없이 일반 Codex에서 열면 required server가 실패할 수 있으며, 이는 current personal product scope에서 의도한 결과다.
- App은 Interaction MCP를 연결하기 위해 thread-start config, `--config`나 equivalent high-precedence overlay로 project MCP configuration을 다시 만들지 않는다. Global·project config layering과 trusted-project loading은 Codex native behavior를 따르며, App-owned dynamic binding만 process environment로 공급한다.
- Bootstrap Skill은 전역 `~/.codex/config.toml`의 project trust를 직접 수정하지 않는다. 정상 Workspace thread를 exact Git root `cwd`와 `workspace-write` permission으로 시작하면 현재 pinned App Server가 trust가 미지정된 exact Git root를 native user config에 기록하고 project config를 같은 start 안에서 reload한다. 명시적인 `untrusted`는 덮어쓰지 않는다.
- Skill과 AY는 workflow의 순서, interaction을 요청할 시점, 응답의 해석과 다음 행동을 소유한다. App은 학업 workflow engine, prompt sequence 또는 결과 적용기를 소유하지 않는다.
- AY는 interaction 결과에 따라 SemesterWorkspace의 실제 파일을 일반 file tool로 변경하고, [ADR 0018](0018-adopt-user-owned-git-semester-workspaces.md)의 Git 지침에 따라 의미 있는 checkpoint를 commit한다. App은 수락 결과를 대신 `workspace-state.json`에 적용하거나 Git commit을 만들지 않는다.
- 각 MCP tool은 하나의 구체적인 사용자 capability를 typed input과 closed result union으로 표현한다. 하나의 범용 event bus, 임의 schema renderer 또는 모든 App event를 운반하는 `ProductInteraction` envelope은 만들지 않는다.
- MCP caller는 `workspaceId`, `courseId`, `baseRevision`, `requestKey`, native `threadId`·`turnId`·`requestId` 같은 host binding을 보내지 않는다. Interaction MCP Module이 현재 Runtime·Turn에 tool server를 결합하고 correlation, 한 번만 응답하기, 취소, disconnect와 UI lifecycle을 내부에서 소유한다.
- Browser UI는 capability별 Adapter다. 동일 Interface의 in-memory Adapter가 정상 `request → UI projection → user result → MCP result`와 비정상 `request → MCP failure`를 검증하는 주 테스트 seam이 된다. 테스트 편의를 위해 내부 correlation이나 persistence shape를 공개 Interface에 추가하지 않는다.
- `propose_state_patch`는 첫 InteractionCapability로 유지한다. 요청은 특정 Assignment·Course schema나 raw Git diff가 아니라 **도메인 중립적인 semantic Review presentation model**이다. 짧은 설명과 순서가 있는 change를 보내며, 각 change는 사람이 이해할 label·설명, 변경 전·후 값과 선택적인 `EvidenceRef`를 가진다. 추가·삭제에서는 전·후 중 한쪽을 생략할 수 있다. 정상 result는 `accept | revise | reject`와 필요한 경우 feedback만 반환한다. Turn interrupt, `busy`, timeout, disconnect와 Runtime terminal은 네 번째 `cancel` result가 아니라 MCP failure다. `StatePatch`는 이 호출 동안의 transient presentation payload이고 `UserConfirmation`은 별도 durable App entity가 아니라 그 호출의 정상 사용자 result다.
- `EvidenceRef`가 있으면 App Broker는 Browser projection 전에 현재 Runtime binding의 exact SemesterWorkspace에서 workspace-relative path를 on-demand로 bounded read한다. Resolved target이 root 안에 있는 regular file인지 확인하고 exact content digest와 locator를 검증한다. 모든 ref가 통과해야 card를 한 번에 만들며 path escape, missing·oversized file, digest·locator drift 하나라도 있으면 partial card 없이 MCP call 전체를 실패시킨다. 검증한 preview는 현재 interaction의 transient projection일 뿐 `RawMaterial` registry, reusable cache·snapshot이나 durable evidence store가 아니다.
- 하나의 Review 결정은 `propose_state_patch` 호출 하나로 완료한다. 같은 결정을 built-in `request_user_input`과 custom MCP에 나누어 운반하지 않는다. Built-in `request_user_input`은 AY-PLE 전용 rich UI가 필요 없는 일반 clarification에 계속 사용할 수 있다.
- `ModelingRun`은 App이 복제해 보존하는 학업 객체가 아니라 native Codex Turn과 그 관측 상태로 대체한다. `RawMaterial`은 App admission을 통과해야 생기는 객체가 아니라 SemesterWorkspace의 일반 사용자 파일이다. `EvidenceRef`는 richer Review UI에 필요한 경우 쓰는 typed presentation data이지 모든 file operation을 App이 추적하게 만드는 전역 계약이 아니다.
- Native command·file·network approval은 Codex execution 권한을 결정한다. InteractionCapability의 사용자 결과는 AY의 workflow 판단을 돕는다. 어느 한쪽도 다른 쪽의 권한을 암묵적으로 승인하지 않는다.

## 역할 경계

| 주체 | 소유하는 것 | 소유하지 않는 것 |
| --- | --- | --- |
| 사용자 | App UI에서의 최종 선택과 학기 자료의 의미 | MCP correlation, native protocol |
| AY·Skill | 작업 계획, interaction 요청 시점, 결과 해석, 실제 파일 변경과 Git checkpoint | App UI lifecycle, Browser transport |
| `@ay-ple/interaction-mcp` | Project config로 발견되는 built STDIO executable, typed MCP Interface와 authenticated Broker transport contract | App listener·UI lifecycle, 학업 workflow 순서 |
| `apps/server`의 Interaction Broker | Endpoint·token value, Runtime binding, correlation, 취소·disconnect, Browser projection과 결과 반환 | Workspace file apply, Skill workflow |
| `@ay-ple/product-contract`·`apps/chat-shell` | Browser-safe capability projection, 화면과 사용자 입력 수집 | Raw MCP·private Broker transport, Agent의 다음 행동 |
| SemesterWorkspace | 실제 학기 파일, 선택적인 구조화 snapshot과 Git history | Runtime correlation, pending UI interaction |
| `@ay-ple/codex-chat-runtime` | Thread·Turn 실행, generic child environment 전달, native MCP 연결·readiness와 permission | Capability schema, Broker·UI 의미, 학기 SSOT |

## 고려한 대안

| 대안 | 판정 | 이유 |
| --- | --- | --- |
| App이 `ModelingRun → StatePatch → UserConfirmation → apply` workflow를 소유 | 거절 | App과 Skill이 같은 학업 순서를 중복해서 알고 native Turn까지 별도 객체로 복제한다. |
| 일반 Codex Chat만 제공하고 custom MCP를 제거 | 거절 | Agent 의도를 domain-rich UI로 바꾸고 사용자 선택을 다시 Agent에게 돌려주는 AY-PLE의 핵심 가치를 잃는다. |
| 모든 상호작용을 하나의 generic event/schema protocol로 통합 | 거절 | 작은 Interface 뒤에 복잡성을 숨기지 못하고 UI·workflow·transport variation을 caller에게 떠넘긴다. |
| 모든 사용자 질문을 built-in `request_user_input`으로 처리 | 거절 | 일반 clarification에는 적합하지만 원본 preview, diff, evidence와 capability-specific action을 표현하는 AY-PLE UI를 제공하지 못한다. |
| App이 매 thread마다 전체 MCP config를 override | 거절 | Project-native declaration과 사용자 config precedence를 우회하고 App이 Skill·MCP discovery까지 소유하게 한다. Dynamic endpoint·secret은 config가 아니라 Runtime environment로 결합할 수 있다. |
| Bootstrap Skill이 `../workspace/` parent를 전역 trust로 기록 | 거절 | Current Codex trust lookup은 하위 Git repository로 parent trust를 상속하지 않는다. Exact workspace thread start의 native trust가 실제 Git root를 기록하고 config를 즉시 reload한다. |
| MCP entrypoint를 absolute user path, `npx`·global install 또는 appData copy로 실행 | 거절 | Personal source checkout인 `hub/`가 구현 authority다. Workspace-relative declaration은 machine-specific absolute path와 별도 설치·복사 lifecycle을 피하고, root가 이동하면 명시적인 Bootstrap Update와 Git diff로 다시 결합한다. |
| STDIO executable과 capability contract를 `apps/server` 내부에 둠 | 거절 | Codex가 독립 process로 실행하는 stable entrypoint와 MCP transport가 Express application build·Browser lifecycle의 내부 경로에 결합된다. |
| Interaction MCP를 `@ay-ple/codex-chat-runtime`에 구현 | 거절 | Native Codex lifecycle adapter가 AY-PLE 제품 capability schema와 App UI transport를 알아야 하므로 Runtime 경계가 얕아진다. |
| Broker용 listener·port 또는 daemon을 별도로 실행 | 거절 | 이미 필요한 loopback App listener와 별개로 startup·port discovery·shutdown·failure authority를 하나 더 만든다. |
| Adapter↔Broker에 WebSocket 또는 Unix domain socket을 사용 | 거절 | Current local request/result에 필요하지 않은 reconnect·socket-path·platform lifecycle을 추가하며 shared HTTP listener가 이미 authenticated process transport를 제공한다. |
| Loopback 또는 Browser Origin만 private route의 신뢰 근거로 사용 | 거절 | 같은 host의 다른 process와 Browser request를 active Runtime Adapter로 오인할 수 있다. Runtime-scoped secret과 binding 검증이 별도로 필요하다. |
| Broker가 `202`와 interaction ID를 반환하고 Adapter가 poll | 거절 | 한 MCP call의 pending lifecycle을 poll cursor·retry cadence·idempotency 문제로 분해한다. HTTP response 자체가 이미 same-call continuation을 표현한다. |
| Callback·durable outbox·response replay로 terminal result를 재전달 | 거절 | App이 transient interaction을 durable workflow로 승격하고, continuity loss 뒤 Agent가 result를 실제로 받았는지와 사용자 선택을 혼동하게 한다. |
| Broker가 여러 interaction을 queue하거나 동시에 여러 UI 결정을 연다 | 거절 | App이 ordering·priority·preemption과 여러 pending 화면의 lifecycle을 소유하게 된다. AY가 한 번에 하나의 사용자 결정을 요청하고 `busy` 뒤 재시도 여부를 판단하는 편이 역할 경계를 지킨다. |
| Review를 modal이나 별도 approval page로 표시 | 거절 | AY의 요청 맥락과 사용자 결정을 transcript에서 분리하고 별도 navigation·focus lifecycle을 만든다. Inline card가 같은 Turn의 기다림을 직접 표현한다. |
| Pending Review 중 composer·steer를 계속 허용 | 거절 | 같은 Turn이 MCP result를 기다리는 동안 별도 입력 흐름과 두 번째 interaction을 만들 수 있다. 정상 Review action과 전체 Turn interrupt만 남긴다. |
| `revise` 뒤 기존 card를 새 proposal로 교체·재개 | 거절 | 서로 다른 MCP call의 요청과 result를 한 UI identity에 합쳐 chronology와 once-only settlement를 흐린다. 이전 결정을 read-only로 남기고 fresh call을 새 card로 append한다. |
| Evidence 일부가 invalid여도 나머지 change로 partial card 표시 | 거절 | 사용자가 proposal 전체와 근거의 일관성을 확인할 수 없고 stale evidence가 조용히 누락된다. 모든 ref를 atomic preflight하고 실패하면 AY가 fresh call로 바로잡게 한다. |
| `cancel`을 `propose_state_patch`의 네 번째 정상 result로 추가 | 거절 | `reject`라는 명시적인 사용자 판단과 Turn interrupt·continuity failure를 같은 success union에 섞는다. 정상 result는 세 가지로 닫고 나머지는 MCP failure path로 분리한다. |
| 처음부터 더 긴 `tool_timeout_sec`과 App-level 연장·keepalive를 추가 | 보류 | 5분을 넘기는 Review 요구가 아직 확인되지 않았다. Current pinned native default를 먼저 사용하고 실제 사용 근거가 생길 때만 복잡성을 추가한다. |

## 결과

현재 First Assignment 구현은 interaction round trip의 유효한 증거지만 채택한 경계의 구현은 아니다. Server의 app-owned `RawMaterial` registry, `ModelingRun` receipt, durable `StatePatch`·`UserConfirmation`, revision-bound apply transaction, MCP+`request_user_input` 이중 흐름과 thread-start private MCP config injection은 contraction 대상이다.

새 interaction을 추가할 때는 “App이 이 workflow를 얼마나 알아야 하는가”가 아니라 “사용자에게 어떤 typed 선택 경험을 제공하고 AY에 어떤 closed result를 돌려줄 것인가”를 설계한다. App 자체 설정을 바꾸는 future capability도 별도 MCP tool로 만들 수 있지만, 그 tool은 자신이 소유한 App mutation만 수행하고 AY의 학업 workflow를 소유하지 않는다. ADR 0020의 initial workspace 선택·Bootstrap은 current InteractionCapability가 아니라 pre-App native flow다.

Long-lived 기술 mapping은 [AY–App Interaction Capability 아키텍처](../architecture/ay-app-interaction-capabilities.md), 현재 강결합 구현과 전환 gap은 [Codex Chat 구현 지도](../architecture/codex-chat-implementation-map.md), 작업 순서는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다.
