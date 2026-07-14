@GitHub

# Codex App Server TypeScript client 재사용 가능성 심층 조사

이번 조사의 목적은 새로운 TypeScript Codex App Server client를 구현하는 것이 아니다.

AY-PLE이 현재 설계한 `CodexAppServerConnection → CodexConversationRuntime`을 직접 구현하기 전에, 이미 공개된 공식·비공식 구현을 재사용·추출·fork할 수 있는지 source-level로 검증하라. 기존 AY-PLE 설계나 특정 후보를 방어하지 말고, sunk cost 없이 `adopt | extract/fork | implement` 중 가장 합리적인 선택을 내려라.

README나 소개 문구만 비교하지 말고, 실제 source code, tests, package exports, dependency graph와 version history를 확인하라.

## 1. 고정된 AY-PLE 기준점

| 항목 | 값 |
| --- | --- |
| AY-PLE repository | https://github.com/swh3467/hub |
| Branch | `codex/codex-native-client-redesign` |
| Review target commit | `f462ae747a0dfa4b8da51cc1708b9e54083feca4` |
| Codex npm pin | `@openai/codex@0.144.0` |
| Exact upstream Codex commit | `767822446c7a594caa19609ca435281a9ec67e0d` |

AY-PLE의 current implementation과 target architecture를 혼동하지 마라.

- Current code에는 legacy `CodexStdioTransport`, `CodexRawClient`, `HeadlessCodexClientHost`가 있다.
- Target인 `CodexAppServerConnection`과 `CodexConversationRuntime`은 아직 구현되지 않았다.
- 이번 조사는 target implementation ticket을 작성하거나 구현을 시작하기 전에 수행하는 reuse audit다.

### 반드시 읽을 AY-PLE 문서

1. `docs/adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md`
2. `docs/specs/2026-07-14-codex-native-runtime-foundation.md`
3. `docs/wayfinding/codex-native-client-redesign/assets/019-first-party-client-port-and-reuse-audit.md`
4. `docs/wayfinding/codex-native-client-redesign/assets/013-source-conformance-and-ledger-evidence.md`
5. `packages/runtime-codex/README.md`
6. `packages/runtime-codex/src/stdio-transport.ts`
7. `packages/runtime-codex/src/raw-client.ts`
8. `packages/runtime-codex/src/headless-codex-client-host.ts`
9. 관련 tests 및 package exports

`artifacts/pro-bridge/**`는 review provenance일 뿐 decision authority가 아니다. Canonical contract는 ADR과 active spec이 소유한다.

## 2. 핵심 조사 질문

다음 질문에 source evidence로 답하라.

> AY-PLE이 `CodexAppServerConnection → CodexConversationRuntime`을 처음부터 구현해야 하는가, 아니면 기존 오픈소스 TypeScript 구현을 dependency로 채택하거나 내부 core를 추출/fork하는 편이 더 타당한가?

특히 다음 세 선택지를 비교한다.

1. 기존 package를 public API 그대로 dependency로 사용
2. 기존 구현의 App Server core를 fork/vendor/extract하여 AY-PLE boundary에 맞게 사용
3. 검증된 아이디어와 tests만 가져오고 AY-PLE이 자체 구현

“직접 구현이 더 안전하다”거나 “오픈소스가 있으니 무조건 채택한다”는 선입견 없이 판단하라.

## 3. 조사할 후보

### Tier 0 — 공식 baseline

#### OpenAI Codex App Server와 first-party clients

- App Server:
  https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server
- Rust App Server client:
  https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-client
- App Server test client:
  https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server-test-client
- Python external stdio client:
  https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/sdk/python
- TUI thread projection와 pending App Server request handling:
  https://github.com/openai/codex/tree/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/tui

Exact pinned commit의 동작과 현재 `main`의 동작을 섞지 마라. Current `main`에서 개선된 부분이 있다면 `upgrade observation`으로 별도 표기한다.

#### 공식 TypeScript SDK

- https://github.com/openai/codex/tree/main/sdk/typescript

이 SDK가 `codex exec` wrapper인지, stateful bidirectional App Server client인지 실제 source에서 확인하라. 이름이 SDK라는 이유만으로 AY-PLE target과 같다고 간주하지 마라.

#### 공식 Python SDK current main

- https://github.com/openai/codex/tree/main/sdk/python

현재 published Python SDK가 App Server client로서 어느 수준까지 구현됐는지 확인하고 다음 선택지를 평가하라.

- Python sidecar를 production dependency로 사용하는 방안
- Python source semantics만 TypeScript로 포팅하는 방안
- 현재 pin과 SDK가 pin한 runtime의 version compatibility

### Tier 1 — 가장 유력한 TypeScript 후보

#### `ai-sdk-provider-codex-cli`

- Repository:
  https://github.com/ben-vargas/ai-sdk-provider-codex-cli
- App Server source:
  https://github.com/ben-vargas/ai-sdk-provider-codex-cli/tree/main/src/app-server
- Tests:
  https://github.com/ben-vargas/ai-sdk-provider-codex-cli/tree/main/src/__tests__

이 후보를 가장 깊게 조사하라.

README는 다음을 주장하지만 그대로 믿지 말고 source와 tests로 검증한다.

- persistent `codex app-server` child
- `@openai/codex ^0.144.0` compatibility
- stateful threads
- streaming
- Server request/approval handlers
- JSON-RPC client, notification router, session, stream controller
- protocol compatibility 및 integration tests

반드시 현재 `main`이 아니라 조사 시점의 immutable commit 또는 release tag를 식별하고, 모든 source citation을 그 commit에 고정하라.

다음 사항을 확인하라.

- npm package가 어떤 modules를 실제 export하는가?
- App Server core가 public API인가, package-private implementation인가?
- Vercel AI SDK 없이 App Server core만 사용할 수 있는가?
- AI SDK v7 `LanguageModel` abstraction이 lifecycle 의미를 왜곡하거나 제한하는가?
- Node.js 22, ESM-only, peer dependencies가 AY-PLE과 호환되는가?
- thread/turn/item native identity를 보존하는가?
- 한 thread에 active turn 하나를 강제하는가? 근거는 무엇인가?
- multiple thread concurrency를 지원하는가?
- `turn/start` notification-first를 어떻게 처리하는가?
- early notification/event staging이 있는가?
- process loss와 pending RPC를 어떻게 settle하는가?
- inbound Server request에 original RequestId로 exactly once 응답하는가?
- approval request가 response 전 도착하는 경우를 처리하는가?
- duplicate/late `serverRequest/resolved`, terminal과 response race를 어떻게 처리하는가?
- timeout 후 queued frame이 나중에 write될 가능성이 있는가?
- stdin writer가 실제로 serialized되어 있는가?
- stdout reader는 하나인가?
- line framing은 raw bytes 기준인가, `readline`/string 기준인가?
- queue와 retained state는 bounded인가?
- close가 stdout tail, child exit, descendant-held pipe와 reap을 어떻게 처리하는가?
- raw params, command, cwd, path, error payload를 장기 보존하는가?
- fake/integration tests가 실제 child interleaving을 강제하는가?

### Tier 2 — 실제 제품 사례

다음 후보는 전체를 동일 깊이로 조사하지 말고 먼저 screening한다. 그중 AY-PLE target과 구조적으로 가까운 최대 3개만 source-level deep dive한다.

- `slopus/happy`
  https://github.com/slopus/happy
- `K9i-0/ccpocket`
  https://github.com/K9i-0/ccpocket
- `jakemor/kanna`
  https://github.com/jakemor/kanna
- `Gan-Xing/CodexBridge`
  https://github.com/Gan-Xing/CodexBridge
- `0xcaff/codex-web`
  https://github.com/0xcaff/codex-web
- `nshkrdotcom/codex_sdk`
  https://github.com/nshkrdotcom/codex_sdk
- GitHub `codex-app-server` topic:
  https://github.com/topics/codex-app-server

각 후보가 다음 중 무엇인지 구분하라.

- reusable client library
- provider adapter
- application-local bridge
- patched/repackaged Codex Desktop
- CLI/PTY wrapper
- `codex exec --json` wrapper
- real bidirectional App Server client
- remote-control/sync layer

단순히 Codex라는 이름이 있거나 JSONL을 사용한다는 이유로 같은 문제를 해결한다고 판단하지 마라.

## 4. AY-PLE contract comparison matrix

다음 contract마다 각 후보를 `implemented | partial | absent | conflicting | not verified`로 판정하라.

모든 `implemented` 판정에는 exact source file/line과 test file/line이 필요하다.

### Connection responsibility

1. Child process spawn과 initialize/initialized handshake
2. Sole stdout reader
3. Serialized stdin writer
4. Direction-aware exact `RequestId` routing
5. `string | number` ID type/value 보존
6. Client request active map과 first response remove-once
7. Unknown/late response disposition
8. Inbound Server request classification
9. Same-ID Server response
10. Once-only response authority
11. Disconnect 시 current pending settlement
12. Unexpected child exit/stdout EOF/stdin failure handling
13. Close, signal, direct-child reap
14. Generated schema/runtime validation
15. Multiple concurrent native thread support

### Conversation Runtime responsibility

1. Native `ThreadId`, `TurnId`, `ItemId`
2. `thread/start` response authority
3. `turn/start` response/notification either-order convergence
4. Notification-first early staging
5. Thread/turn/item scope-local routing
6. AgentMessage accumulation/completion
7. Authoritative `turn/completed`
8. Per-thread independence
9. Duplicate/late notification idempotence
10. Thread persistence/read/resume
11. Approval request native scope projection
12. `serverRequest/resolved` cleanup
13. Multi-turn extensibility
14. Streaming activity projection

### AY-PLE hardening

다음은 upstream baseline이 아니라 AY-PLE spec이 추가한 hardening일 가능성이 있다. 실제 오픈소스 구현의 선택과 비교해 필요성을 재평가하라.

1. LF 전 16 MiB raw-byte framing cap
2. Strict/fatal UTF-8 decode
3. Duplicate top-level JSON member rejection
4. Exact numeric RequestId parser
5. `application`/`control` logical writer queues
6. `control 1 → application 1` fairness
7. `queued_cancelable → handed → callback_settled`
8. Server response exact-byte capacity reservation
9. Owner-local timeout control marker
10. Unexpected-exit bounded stdout/dispatch drain
11. Separate count/byte caps
12. Recursive no-raw retained-state checks
13. Generator A/B deterministic generation과 rollback
14. Full fake-child race matrix

각 항목에 대해 다음 중 하나로 분류하라.

- existing implementations에서도 공통적인 필수 안전성
- AY-PLE deployment boundary에서는 필요하지만 일반 client에는 드문 hardening
- 구현 전에 실제 failure trace가 더 필요한 speculative policy
- 기존 후보를 wrapper로 보강하면 되는 항목
- 직접 client를 새로 만들어야만 충족 가능한 항목

“더 안전해 보인다”는 이유만으로 유지하지 말고, 실제 execution trace와 cost를 비교하라.

## 5. T0·T0-C·T0.1 대조

### T0

- initialize/initialized
- native `thread/start`
- text turn 하나
- legal response/notification interleaving
- matching AgentMessage
- authoritative `turn/completed`
- safe transport-neutral result
- unsupported inbound Server request의 deterministic same-ID response

### T0-C

- Thread A pending
- unrelated Thread B complete
- Thread A complete
- A2 admission
- A의 unresolved approval/user handler가 B ingress와 fallback을 block하지 않음

### T0.1

- regular `item/commandExecution/requestApproval`
- original Server RequestId
- response exactly once
- answer/resolved/turn transition/disconnect race
- pre-handoff stale, post-handoff delivery unknown 구분
- command item terminal과 turn terminal 분리

후보별로 다음을 판정하라.

- 현재 public API만으로 구현 가능
- internal module을 사용하면 가능
- 좁은 patch/fork가 필요
- 구조적으로 충돌
- evidence 없음

## 6. 의존성·유지보수·보안 평가

후보마다 다음을 확인하라.

- License와 vendoring/fork 가능성
- npm package 또는 source-only 여부
- package exports와 private internals
- Node/TypeScript/ESM requirements
- AI SDK, Zod 등 필수 peer dependency
- release cadence
- 최근 유지보수 상태
- exact Codex version policy
- generated schema 업데이트 전략
- pin upgrade 비용
- test quality와 CI
- supply-chain surface
- child environment/auth token 취급
- stderr/raw protocol logging
- browser에 raw data가 노출될 가능성
- process 및 temporary resource cleanup

Star 수만으로 품질을 판단하지 마라. Source와 tests가 우선이다.

## 7. Architecture 선택지

최소 다음 선택지를 비교하라.

### A. Community package 직접 채택

예:

```text
AY-PLE
  → ai-sdk-provider-codex-cli public API
  → codex app-server
```

### B. Community App Server core 추출/fork

예:

```text
AY-PLE CodexConversationRuntime
  → extracted/forked TypeScript App Server core
  → thin AY-PLE hardening wrapper
  → codex app-server
```

### C. Official Python SDK sidecar

```text
AY-PLE TypeScript
  → Python sidecar
  → official openai-codex
  → codex app-server
```

### D. 자체 TypeScript 구현

```text
CodexAppServerConnection
  → CodexConversationRuntime
  → codex app-server
```

각 선택지에 대해 비교한다.

- source fidelity
- exact-pin compatibility
- implementation effort
- maintenance/upstream upgrade cost
- dependency cost
- testability
- T0/T0-C/T0.1 coverage
- future multi-turn/streaming/resume/approval 확장성
- AY-PLE product adapter와의 결합 위험
- exit strategy

## 8. 현재 AY-PLE spec에 대한 영향

조사 결과를 바탕으로 다음을 명시하라.

1. ADR 0010의 `Connection → Runtime` seam은 여전히 유효한가?
2. Connection을 AY-PLE이 직접 소유해야 하는가, 아니면 dependency/fork 뒤로 숨겨야 하는가?
3. 현재 spec 중 기존 오픈소스에서 이미 해결한 계약은 무엇인가?
4. 현재 spec 중 후보보다 강한 hardening은 무엇인가?
5. 제거하거나 완화할 수 있는 계약은 무엇인가?
6. 반드시 유지해야 할 AY-PLE-specific hardening은 무엇인가?
7. 기존 implementation ticket graph에서 삭제·병합·추가해야 할 ticket은 무엇인가?
8. 구현 전에 별도 compatibility spike가 필요한가?

기존 spec이 Pro review를 통과했다는 사실 때문에 보존하지 마라. 새로운 reuse evidence가 상위 가정을 바꾼다면 ADR/spec을 forward-amend해야 한다.

반대로 community project가 존재한다는 이유만으로 canonical architecture를 폐기하지도 마라. 실제 reusable boundary와 conformance evidence를 기준으로 판단하라.

## 9. 요구 출력

### 1. Executive verdict

다음 중 하나를 고른다.

- `adopt existing package`
- `extract/fork existing core`
- `official Python sidecar`
- `continue custom TypeScript implementation`
- `insufficient evidence — spike required`

5문장 이내로 핵심 이유를 설명한다.

### 2. Candidate screening table

| Candidate | Actual integration type | Language | Codex version | Reusable surface | License | Maintenance | Deep-dive? |
| --- | --- | --- | --- | --- | --- | --- | --- |

### 3. Deep source audit

선택한 후보마다 다음을 제공한다.

- immutable commit/tag
- exact source links
- module topology
- lifecycle flow
- tests
- strengths
- missing guarantees
- conflicts with AY-PLE
- dependency/fork feasibility

### 4. Contract comparison matrix

Connection, Runtime, hardening, T0/T0-C/T0.1을 후보별로 비교한다.

### 5. Adopt vs fork vs build decision matrix

각 선택지에 다음 점수를 1–5로 주고 근거를 적는다.

- correctness evidence
- reuse value
- upgrade alignment
- implementation cost
- maintenance cost
- extensibility
- security/operational fit

점수만 내지 말고 source evidence를 붙인다.

### 6. Recommended target architecture

추천하는 dependency direction과 module boundary를 ASCII diagram으로 제시한다.

### 7. Spec and ticket impact

- 유지할 ADR/spec 계약
- forward-amend할 계약
- 제거할 과잉 계약
- 새로 필요한 compatibility/reuse audit ticket
- stale해진 implementation tickets
- revised minimal ticket graph

아직 실제 ticket 파일은 작성하지 않는다.

### 8. Required compatibility spike

결정을 위해 코드 실행이 필요하다면 최대 1–2일 크기의 spike를 설계한다.

Spike는 최소 다음을 검증해야 한다.

- installed `@openai/codex@0.144.0`
- initialize/initialized
- thread/start
- turn/start response/notification ordering
- AgentMessage + turn/completed
- concurrent A/B progression
- command approval same-ID response
- process exit/EOF settlement

Expected observation과 pass/fail 기준을 명시한다.

### 9. Residual risks and unknowns

Evidence가 없는 부분만 기록한다. Repository/source로 확인 가능한 사실을 human decision으로 올리지 않는다.

## 10. Evidence 규칙

- README claim만으로 `implemented` 판정을 내리지 마라.
- Source와 test를 모두 확인하라.
- 링크는 branch `main`이 아니라 가능한 한 immutable commit SHA에 고정하라.
- Exact pinned Codex behavior와 current main behavior를 구분하라.
- 추론은 `inference`라고 표시하라.
- 실행하지 않은 테스트를 통과했다고 말하지 마라.
- 접근하지 못한 private/removed source는 `NOT VERIFIED`로 표기하라.
- 외부 프로젝트의 raw source를 장문 복사하지 말고 파일/라인을 인용한다.
- 조사 결과 구현이나 AY-PLE 파일 수정은 하지 않는다.
