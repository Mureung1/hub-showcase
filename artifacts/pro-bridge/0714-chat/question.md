OpenAI Codex의 실제 오픈소스 구조와 Codex App Server 통합 방식을 조사해 주세요. 일반적인 설명이 아니라, 공식 문서와 exact source commit을 근거로 우리 설계가 불필요하게 많은 client 기능을 재구현하고 있는지 판정하는 것이 목적입니다.

## 조사 배경

우리의 장기 목표는 AY-PLE 제품 안에서 일반적인 Codex Chat Interface의 사용 경험을 재현하고, 그 위에 제품 기능을 추가하는 것입니다.

처음에는 다음과 같이 예상했습니다.

1. Codex App Server가 thread, turn, item, conversation history, streaming, command execution, approval 같은 높은 수준의 Codex primitives를 제공한다.
2. 우리는 App Server를 일반적인 Codex use case에 맞게 실행한다.
3. 그 위에 AY-PLE의 UI, 제품 상태, 이벤트 변환만 추가한다.
4. Codex CLI가 이미 App Server 또는 동일한 primitives를 사용하는 정답에 가까운 client implementation을 제공하므로, 그 구조를 상당 부분 참고하거나 재사용할 수 있다.

그런데 실제 설계 과정에서는 다음 client 계층을 직접 구현해야 하는 것처럼 보이고 있습니다.

- child process lifecycle
- stdio JSONL reader/writer
- JSON-RPC request/response exact ID demultiplexing
- generated-schema validation
- response와 notification의 비동기 순서 수렴
- native thread/turn/item correlation
- per-thread state ownership
- concurrent thread isolation
- Server-initiated request의 pending/once-only response lifecycle
- process loss와 in-flight request settlement
- acceptance unknown과 execution outcome unknown 구분
- duplicate, late event, contradictory identity/terminal 처리
- bounded buffering/backpressure
- UI 또는 product에 노출할 safe result projection

이 때문에 “Codex를 사용하는 제품”을 만드는 것보다 “Codex CLI의 client runtime을 TypeScript로 다시 만드는 것”처럼 느껴지고 있습니다.

우리가 현재 검토하는 구조는 다음과 같습니다.

CodexAppServerConnection
- child/process lifecycle
- single JSONL ingress
- generated-schema validation
- direction-aware RequestId demux
- transport/process terminal
- pending RPC settlement

CodexConversationRuntime
- native thread/turn/item identity
- per-thread ownership
- method별 lifecycle
- response/notification convergence
- item correlation
- authoritative turn terminal

AY-PLE product adapter
- 위 runtime이 안정된 뒤 별도로 추가
- 현재 조사 범위에서는 제외

## 반드시 구분해서 조사할 버전

우리가 현재 pin한 버전은 다음과 같습니다.

- npm package: @openai/codex@0.144.0
- exact upstream commit:
  767822446c7a594caa19609ca435281a9ec67e0d
- repository:
  https://github.com/openai/codex
- official App Server documentation:
  https://learn.chatgpt.com/docs/app-server

반드시 다음 두 시점을 분리해 주세요.

1. exact pin 767822446c7a594caa19609ca435281a9ec67e0d에서 실제로 존재하는 구조
2. 현재 openai/codex main 또는 최신 release에서 이후 추가된 구조

현재 main에만 있는 기능을 pin의 기능처럼 설명하지 마세요. 다만 최신 버전으로 upgrade하면 직접 구현 범위를 줄일 수 있는 기능이 생겼다면 별도 upgrade option으로 알려 주세요.

## 가장 중요한 조사 질문

### 1. Codex CLI/TUI는 실제로 App Server client인가?

exact pin에서 일반적인 `codex` CLI/TUI가 다음 중 어떤 구조인지 확인해 주세요.

A. CLI/TUI가 `codex app-server`를 별도 프로세스로 실행하고 JSON-RPC client로 통신한다.
B. CLI/TUI가 `codex-core` 등의 Rust crate를 같은 process 안에서 직접 사용하며 App Server protocol을 우회한다.
C. 일부 mode만 App Server client이며 나머지는 core를 직접 사용한다.
D. 다른 구조다.

반드시 entry point부터 실제 call path를 추적해 주세요.

가능하면 다음 경로를 조사해 주세요.

- codex-rs/tui
- codex-rs/core
- codex-rs/app-server
- codex-rs/app-server-protocol
- codex-rs/protocol
- codex-rs/app-server-test-client
- 관련 Cargo.toml과 binary entry point
- remote TUI 또는 app-server connection 관련 코드

CLI/TUI가 App Server를 우회하고 core를 직접 사용한다면, “CLI 구현을 그대로 외부 TypeScript client의 정답으로 사용할 수 있다”는 기대가 왜 성립하지 않는지 설명해 주세요.

### 2. 재사용 가능한 공식 App Server client가 존재하는가?

exact pin과 최신 버전 각각에서 다음을 조사해 주세요.

- Rust App Server client crate
- TypeScript/JavaScript App Server client
- npm export
- generated client
- request dispatcher
- conversation state store
- thread/turn/item reducer
- VS Code extension이 사용하는 client library
- Codex desktop/app이 사용하는 client library
- remote TUI가 사용하는 transport/client implementation
- app-server-test-client 중 production reuse가 가능한 부분
- 별도 repository나 package로 공개된 client SDK

`codex app-server generate-ts`가 다음 중 무엇을 생성하는지도 확인해 주세요.

- wire type/schema만 생성
- request/response client도 생성
- notification dispatcher도 생성
- stateful conversation client까지 생성

현재 팀은 `@openai/codex@0.144.0` npm package가 `bin/codex.js`만 export하고 reusable TypeScript client를 제공하지 않는다고 관찰했습니다. npm tarball/package.json을 직접 확인해 이 사실을 검증하거나 반박해 주세요.

### 3. App Server가 실제로 소유하는 상태는 어디까지인가?

다음 책임을 Server와 Client로 정확히 나눠 주세요.

- thread identity
- thread persistence/history
- thread list/read/resume/fork/archive
- turn identity와 lifecycle
- item identity와 lifecycle
- command/tool execution
- approval state
- streaming delta
- active turn state
- terminal state
- duplicate/late event 처리
- response/notification ordering
- reconnect/recovery
- UI용 transcript projection
- 여러 thread의 동시 진행
- process/transport loss
- Server-initiated JSON-RPC request response

“App Server가 thread와 turn을 관리한다”는 말이 구체적으로 무엇을 뜻하는지 설명해 주세요.

특히 다음을 구분해 주세요.

- authoritative backend state를 App Server가 관리하는 것
- client가 그 state의 local projection을 유지해야 하는 것
- client가 별도 state machine을 발명하고 있는 것
- 제품 UX가 결정해야 하는 것

### 4. 공식 first-party client는 이 문제를 어떻게 푸는가?

공개된 source 범위에서 다음 client/surface를 비교해 주세요.

- Codex CLI/TUI
- Codex VS Code extension
- Codex App/desktop surface
- app-server-test-client
- `codex exec`
- Codex SDK
- remote TUI/App Server mode

각 surface에 대해 다음을 밝혀 주세요.

- App Server를 실제로 사용하는가
- core를 in-process로 직접 사용하는가
- request/response/event correlation을 누가 담당하는가
- conversation state projection을 누가 담당하는가
- reusable code가 공개돼 있는가
- 우리 같은 custom rich client가 가져다 쓸 수 있는가
- custom product integration에 적합한가

VS Code extension이나 desktop client의 핵심 client implementation이 비공개라면 그 사실도 명확히 적어 주세요. 추측하지 마세요.

### 5. 우리가 실제로 놓친 더 얇은 통합 경로가 있는가?

다음 후보를 각각 평가해 주세요.

1. `codex app-server` + 직접 작성한 thin JSON-RPC client
2. 공식 또는 공개된 App Server client crate/package 재사용
3. Rust helper/sidecar를 만들어 upstream client code를 직접 재사용
4. Codex CLI/TUI를 remote mode로 실행하고 그 위에 기능 추가
5. Codex SDK 사용
6. `codex exec` 사용
7. CLI output 또는 session files를 감싸는 방식
8. App Server WebSocket/Unix socket transport 사용
9. 현재 pin을 최신 버전으로 upgrade
10. openai/codex workspace의 특정 crate를 직접 dependency로 사용

각 후보에 대해 다음 표를 작성해 주세요.

- 제공하는 abstraction 수준
- custom Chat UI 적합성
- multi-turn/streaming/approval 지원
- upstream upgrade 비용
- TypeScript product와의 통합 난이도
- 공식 지원 여부
- 직접 구현해야 하는 나머지 범위
- 추천/비추천 판정

### 6. 현재 설계가 불가피한 부분과 과도한 부분을 구분해 달라

다음 항목마다 하나로 분류해 주세요.

- App Server 외부 client라면 본질적으로 필요
- production reliability를 위해 필요하지만 prototype에는 불필요
- 특정 AY-PLE 정책
- 현재 설계가 과도하게 강화한 것
- upstream에서 이미 제공하므로 중복 구현
- 판단 근거 부족

분류할 항목:

- child process lifecycle
- JSONL framing
- RequestId demux
- generated-schema validation
- response/notification convergence
- native identity correlation
- per-thread actor/state owner
- global state machine
- global event ordering
- notification staging
- duplicate/late notification handling
- process-lifetime RequestId tombstone
- connection loss outcome classification
- automatic retry/reconciliation
- bounded queue/backpressure
- raw protocol sanitization
- product-specific UUID remapping
- transcript/event projection
- Server request once-only lifecycle

특히 “Codex CLI나 first-party client도 실제로 처리하는 복잡성”과 “AY-PLE이 스스로 추가한 강한 correctness policy”를 분리해 주세요.

### 7. source-guided port의 올바른 범위는 어디까지인가?

현재 팀은 Rust를 줄 단위로 복제하지 않고 다음 observable behavior만 TypeScript external client에 재현하려고 합니다.

- exact request ID demux
- native identity authority
- per-thread ownership
- notification-first correlation
- duplicate/late/terminal handling
- Server request pending/once-only lifecycle

이 접근이 적절한지 평가해 주세요.

다음 중 어느 것이 맞는지도 판정해 주세요.

A. 이것은 App Server client라면 당연히 필요한 최소 구현이다.
B. App Server가 제공할 책임을 우리가 중복 구현하고 있다.
C. 일부만 필요하고 현재 범위가 과도하다.
D. 공개된 다른 first-party client를 재사용하면 대부분 제거할 수 있다.

### 8. “Codex Chat Interface 재현”을 위한 최소 foundation을 다시 제안해 달라

제품 기능을 제외하고, 앞으로 다음 기능을 확장할 수 있는 최소 foundation을 제안해 주세요.

- 새 thread와 text turn
- multi-turn
- streaming AgentMessage
- command/tool activity
- approval
- interrupt/steer
- thread read/resume
- 여러 thread의 독립적 진행

다음 세 단계로 나눠 주세요.

1. 반드시 먼저 구현할 foundation
2. 첫 usable Chat Interface에 필요한 기능
3. 나중에 추가해도 되는 기능

각 단계에서 필요한 App Server methods와 notifications를 method inventory 형태로 제시해 주세요. 사용하지 않는 method를 선제 구현하지 마세요.

## 현재 팀이 관찰했지만 반드시 재검증해야 할 가설

다음은 결론이 아니라 검증 대상입니다.

1. pinned npm package는 CLI binary launcher만 제공하고 reusable TS client를 export하지 않는다.
2. generated TypeScript는 schema/types만 제공하고 stateful client를 제공하지 않는다.
3. pinned CLI/TUI는 App Server를 통하지 않고 Rust core를 직접 사용할 가능성이 있다.
4. `thread/start`는 exact pin에서 response-first다.
5. `turn/start` response dispatch와 `turn/started` forwarding은 다른 async path라 notification-first가 가능하다.
6. first-party app-server-test-client는 response를 기다리는 동안 먼저 읽은 notifications를 FIFO로 보관한다.
7. App Server의 wire order는 존재하지만 cross-thread causal/product order를 의미하지 않는다.
8. custom rich client는 server가 관리하는 thread/turn을 다시 구현하는 것이 아니라 local projection과 transport correlation만 구현해야 한다.

각 가설을 verified / contradicted / partially true / insufficient evidence로 판정해 주세요.

## 조사 원칙

- OpenAI 공식 문서와 `openai/codex` 공식 repository를 우선 사용하세요.
- exact commit permalink와 line range를 인용하세요.
- current main의 사실과 exact pin의 사실을 섞지 마세요.
- 공식 문서가 보장하는 계약과 source에서만 관찰되는 구현 사실을 분리하세요.
- source task 구조로부터 도출한 내용은 반드시 “inference”라고 표시하세요.
- 블로그나 2차 자료는 공식 근거가 없을 때만 보조적으로 사용하세요.
- 기존 팀의 결론을 확인하는 방향으로 편향되지 말고, 놓친 reuse surface를 적극적으로 찾으세요.
- “직접 client를 구현해야 한다”는 결론을 내리기 전에 공식 crate, package, remote mode, VS Code client, SDK를 모두 조사하세요.
- 일반적인 아키텍처 조언보다 실제 source path와 재사용 가능성을 우선하세요.

## 원하는 최종 결과 형식

### 1. Executive verdict

다음 질문에 짧고 명확하게 답해 주세요.

- “App Server 위에 바로 제품 기능을 올릴 수 있다”는 원래 가정은 어느 정도 맞았는가?
- 우리가 Codex CLI를 불필요하게 복제하고 있는가?
- 놓친 공식 client/reuse path가 있는가?
- 현재 직접 구현 범위는 본질적인가, pin의 한계인가, 과설계인가?
- 지금 architecture를 유지·축소·교체·upgrade 중 무엇을 해야 하는가?

### 2. Exact-pin architecture diagram

CLI/TUI, core, app-server, protocol, test client의 실제 dependency/call path를 그려 주세요.

### 3. Server vs client responsibility matrix

각 책임의 authoritative owner와 필요한 local projection을 표로 정리해 주세요.

### 4. Reuse candidates

실제로 가져다 쓸 수 있는 package/crate/client와 가져다 쓸 수 없는 이유를 적어 주세요.

### 5. Missing-client-layer verdict

OpenAI가 제공하지 않는 client 계층이 정확히 무엇인지 설명해 주세요.

### 6. Recommended minimal architecture

우리에게 필요한 최소 module과 제거해도 되는 module/policy를 제안해 주세요.

### 7. Incremental implementation roadmap

foundation → usable chat → extended chat 순서로 source-backed tracer를 제안해 주세요.

### 8. Evidence appendix

모든 핵심 주장에 official doc 또는 exact GitHub permalink를 붙여 주세요.

최종 답변은 한국어로 작성하되, crate/package/method/type 이름은 원문을 유지해 주세요.