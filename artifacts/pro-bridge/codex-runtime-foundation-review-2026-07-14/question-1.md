# Codex-native Runtime Foundation 독립 아키텍처 리뷰 요청

당신은 이 설계를 승인하거나 더 그럴듯하게 다듬는 consultant가 아니다. 구현 전에 치명적인 가정 오류, source 오독, 과도한 hardening과 실행 불가능한 검증 계획을 찾아내는 principal systems reviewer다.

목표는 첨부 문서의 결론을 재확인하는 것이 아니라 **falsification**이다. 계약이 틀렸다면 어떤 실제 execution trace에서 깨지는지 보여 달라.

## 리뷰 baseline

| 항목 | 값 |
| --- | --- |
| Repository | `openai/codex` |
| npm package | `@openai/codex@0.144.0` |
| Exact upstream commit | `767822446c7a594caa19609ca435281a9ec67e0d` |
| AY-PLE review baseline | `ec484901c747e593ccb01484a16af8acecf4ede4` |
| 현재 단계 | Wayfinder와 target spec 완료, implementation ticket과 replacement code는 아직 없음 |

최신 `openai/codex/main`이나 다른 release의 동작을 exact pin의 동작처럼 사용하지 마라. 최신 버전에만 존재하는 개선은 별도의 upgrade option으로만 분리하라.

## 첨부 문서

1. `0010-separate-codex-app-server-connection-from-conversation-runtime.md`
   - 채택한 architecture boundary와 evidence authority
2. `2026-07-14-codex-native-runtime-foundation.md`
   - 아직 구현되지 않은 target Interface, lifecycle, failure, capacity와 verification contract
3. `map.md`
   - 결정을 도출한 Wayfinder history와 supersede 관계
4. `README.md`
   - `@ay-ple/runtime-codex`의 현재 구현 상태와 target의 차이

첨부 문서의 현재형 문장을 자동으로 사실로 받아들이지 마라. ADR/spec은 target contract이고 package README는 current implementation claim의 주요 근거다.

## 문제 배경

기존 `HeadlessCodexClientHost`는 다음 책임을 한 state machine에 결합했다.

- child/process와 stdio JSON-RPC
- initialize lifecycle
- thread/turn/item correlation
- generation-scoped ref
- global publication sequence
- product layout
- sanitized product event와 failure policy

Ticket 004에서 response 전 event와 cross-thread interleaving을 다루면서 다음 두 계약의 충돌이 드러났다.

1. Authoritative response 전에는 native turn을 확정하지 않는다.
2. 같은 process에서 읽은 raw wire order를 generation-wide publication order로 보존한다.

예를 들어 다음 ingress가 오면 A response를 기다리기 위해 B까지 holdback하는 generation-wide journal이 필요해졌다.

```text
A turn/started
A delta
B delta
A turn/start response
```

Pinned first-party source를 조사한 결과, current design은 global wire order 대신 exact request routing, method-specific early FIFO와 per-thread projection을 기준선으로 채택했다.

## 목표 구조

```text
runtime preparation
  → package-private CodexAppServerConnection
  → public CodexConversationRuntime
  → future AYPLE adapter (out of scope)
```

### Runtime preparation

- Three-root validation
- Package-owned binary와 runtime-home pair
- Launcher `cwd`와 workspace `cwd` 분리
- Protocol lifecycle이나 native identity는 소유하지 않음

### CodexAppServerConnection

- Dedicated child/process lifecycle
- Sole JSONL reader
- Serialized writer
- Generated wire validation
- Direction-aware exact active `RequestId` routing
- Inbound Server request response lease
- Disconnect와 current-pending RPC settlement
- Conversation/global product state는 소유하지 않음

### CodexConversationRuntime

- Native thread/turn/item identity
- Native `ThreadId`별 projection
- Adopted method의 response/notification convergence
- Parsed·validated·sanitized early-event FIFO
- Idempotent duplicate/late handling
- Semantic terminal과 active command approval
- Raw JSON-RPC와 process signals는 소유하지 않음

### Future AYPLE adapter

- Browser-safe projection
- Product approval/recovery policy
- `ModelingInvocation`/`ModelingRun` mapping
- 현재 foundation의 readiness blocker가 아님

## Evidence authority

| Evidence | 소유하는 사실 | 소유하지 않는 사실 |
| --- | --- | --- |
| Pinned generated TypeScript/JSON Schema | Wire direction과 shape | Ordering, identity authority, terminal |
| Pinned Python `sdk/python/openai_codex` | External child lifecycle, sole reader, serialized writer, active response routing, early notification staging, per-turn queue, process-loss settlement | TypeScript production dependency, AY-PLE product policy |
| Pinned Rust `codex-app-server-client` | Typed facade, pending routing, Server request resolve/reject, bounded channel과 disconnect settlement | External stdio process adapter 전체 |
| Pinned Rust TUI `ThreadEventStore`와 pending request tests | Per-thread projection, duplicate/late idempotence, active interaction lifecycle | Generic reusable kernel, permanent actor contract |
| Pinned method source/tests와 live binary | Identity authority, legal ordering, terminal과 actual compatibility | AY-PLE hardening policy |
| `codex-method-decisions.json`과 generated inventory | Adoption/coverage ledger | Protocol lifecycle 의미 |

## 의도적으로 채택하지 않은 것

- Generation-wide 또는 global raw-wire causal order
- Process-lifetime `RequestId` tombstone
- Contradiction lattice
- Permanent actor poison/sink
- Process 종료까지의 actor retention
- Automatic reconciliation 또는 mutation replay
- Native identity의 generation-scoped UUID remap
- AY-PLE product/browser policy

이 항목이 실제로 필요하다고 판단한다면 단순 선호가 아니라 구체적인 failure trace와 최소 보존 state를 제시하라.

## 최초 conformance tracer

### T0

```text
initialize/initialized
→ native thread/start
→ text turn 하나
→ matching completed AgentMessage
→ authoritative turn/completed
→ safe transport-neutral result
```

추가로 legal response/notification interleaving과 unsupported inbound Server request의 same-ID deterministic response를 증명한다.

### T0-C

```text
Thread A pending
→ unrelated Thread B completed
→ Thread A completed
→ A2 admission
```

A-local staging 또는 failure가 B의 progress를 막지 않아야 한다.

### T0.1

Regular `item/commandExecution/requestApproval` 하나를 제품 UI 없이 지원한다.

- Original Server `RequestId` active lease
- Native thread/turn/item scope
- `approve_once | decline | cancel`
- Once-only response admission
- Response submission, `serverRequest/resolved`, command terminal과 turn terminal을 구분

## TypeScript-specific hardening

다음은 upstream guarantee로 주장하지 않고 external TypeScript stdio deployment에서 명시한 hardening이다. 필요성, failure scope와 구현 비용을 특히 공격적으로 검토하라.

- JSONL frame, dispatch queue, writer queue, active RPC/lease와 Runtime FIFO의 count·UTF-8 byte cap
- Phase별 spawn, initialize, writer, mutation response, semantic terminal, close/reap deadline
- `JSON.parse` 전 top-level duplicate member 탐지
- Unsafe number, negative zero와 direction/type/value exact `RequestId` parser
- Constant allowlisted public error message와 recursive no-raw retention 검사
- Unbound pre-response `thread/started`가 ingress 시점 write-attempted active `thread/start` waiter cohort만 실패시키는 정책
- `acceptance_unknown`과 `accepted_execution_unknown` 구분
- Safe A/B generation과 rollback 가능한 artifact promotion

## 제안된 implementation graph

```text
001 upstream provenance pin
→ 002 coverage ledger v2
→ 003 safe same-pin generation
→ 004 authenticated pin-upgrade transaction
→ 005 opaque runtime preparation
→ 006 exact bidirectional JSON-RPC router
→ 007 actual-child Connection bootstrap
→ 008 Connection finite-resource/terminal hardening
→ 009 T0 nominal
→ 010 T0 completion
   ├─→ 011 T0-C independence ───────────────┐
   └─→ 012 T0.1 nominal → 013 T0.1 completion ─┤
                                                ↓
                         014 Host/layout removal
                         → 015 legacy transport removal
                         → 016 final certification
```

각 implementation slice는 Source, Standards와 Spec을 독립 review하고, required selector가 존재하며 해당 gate가 통과한 뒤에만 coverage ledger의 integration/implemented 상태를 승격한다.

## 반드시 리뷰할 질문

1. Ticket 004의 복잡성을 monolithic Host와 global ordering contract의 설계 오류로 진단한 것이 타당한가?
2. Preparation, Connection과 ConversationRuntime의 책임 경계가 깊고 확장 가능한 module boundary인가?
3. Spec이 upstream observable behavior를 port하는 부분과 TypeScript-specific hardening을 정확히 구분하는가?
4. T0/T0-C/T0.1 lifecycle에서 legal하지만 처리되지 않은 ordering, duplicate, timeout, disconnect, terminal 또는 approval race가 있는가?
5. Failure scope가 너무 넓거나 너무 좁은 곳은 어디인가?
6. Public Interface가 multi-turn, streaming, interrupt/steer, `thread/read`·`thread/resume`와 activity tracer를 막는가?
7. Cap, deadline, no-raw, exact ID parser와 safe generation 중 과도한 설계와 누락된 설계는 각각 무엇인가?
8. 16-ticket graph에 잘못된 blocker, 너무 늦은 executable integration, 검증 불가능한 checkpoint 또는 big-bang 위험이 있는가?
9. 기존 `HeadlessCodexClientHost`를 compatibility 없이 제거하는 gate가 충분한가?
10. 구현 전에 사람이 반드시 다시 결정해야 하는 것은 무엇인가?

## 리뷰 규칙

- 문서가 주장한다는 이유로 사실로 받아들이지 마라.
- Generated schema에서 ordering이나 identity authority를 추론하지 마라.
- Latest `main`이 아니라 exact pinned commit만 baseline으로 사용하라.
- Upstream fact, source-based inference, TypeScript hardening과 AY-PLE policy를 명확히 구분하라.
- 근거가 부족하면 추측해서 채우지 말고 `missing evidence`로 기록하라.
- 제품 adapter와 UI를 foundation blocker로 다시 넣지 마라.
- 전체 재설계보다 현재 contract를 고치는 최소 변경을 우선 제시하라.
- 좋은 점을 요약하는 데 토큰을 쓰지 말고 findings-first로 작성하라.
- Finding이 없으면 검토한 축마다 명시적으로 `0 findings`라고 써라.

## 요청 출력 형식

### 1. Overall verdict

다음 중 하나를 선택하고 이유를 5문장 이내로 설명한다.

- `ready`
- `ready with required corrections`
- `not implementation-ready`

### 2. Findings-first table

각 finding은 다음을 포함한다.

| Field | Required content |
| --- | --- |
| Severity | `P0 | P1 | P2 | P3` |
| Owning artifact | 정확한 첨부 파일과 section |
| Broken or missing contract | 무엇이 잘못되었거나 불충분한가 |
| Reproduction | 실행 가능한 JSONL/event trace 또는 failure scenario |
| Evidence class | upstream fact, inference, TS hardening, product policy 또는 missing evidence |
| Minimal correction | 현재 boundary를 유지하는 최소 수정 |
| Test implication | 필요한 unit, actual-child fake 또는 live oracle |

### 3. Counterexample traces

각 trace를 ingress/writer/terminal 순서로 적고 현재 spec의 결과와 올바른 결과를 비교한다.

### 4. Over-engineered vs under-specified

두 목록을 분리하고 각 항목의 구현·upgrade 비용을 설명한다.

### 5. Implementation graph audit

- 잘못된 blocking edge
- 합치거나 나눌 ticket
- 가장 이른 executable proof
- Legacy contraction을 시작해도 되는 exact join condition

### 6. Human decisions still required

실제 선택이 필요한 사항만 적고, source 확인으로 답할 수 있는 질문은 결정으로 올리지 않는다.

### 7. Residual uncertainty

추가 source, current code 또는 live probe가 없어서 판정할 수 없는 사항을 적는다. Missing input을 상상으로 채우지 않는다.
