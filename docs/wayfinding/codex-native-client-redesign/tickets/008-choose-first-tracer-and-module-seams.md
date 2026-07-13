# 008 — 첫 tracer와 module seam을 선택한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [기존 Host consumer와 compatibility constraint를 감사한다](002-audit-host-consumers-and-compatibility.md), [Protocol·Rust source evidence의 정렬 상태를 리뷰한다](007-review-source-evidence-alignment.md)

## Question

“Codex 사용 용례 위에 AY-PLE 기능을 올린다”는 원칙을 가장 작은 end-to-end 행동으로 증명하는 첫 tracer는 무엇이며, 그 tracer를 위해 `ProductRuntimeLayout`, `CodexAppServerConnection`, `CodexConversationRuntime`과 `AYPLE adapter` 사이의 Interface·seam을 어디에 두어야 하는가?

권고 출발점은 명시적 workspace에서 conversation 하나를 시작하고 text turn 하나의 agent message와 authoritative terminal을 transport-neutral safe result로 관찰하는 vertical tracer다.

선택한 tracer가 Server request를 요구하는지, 요구하지 않는다면 first supported request variant를 어떤 실제 후속 tracer에서 선택할지도 명시한다. 구체 variant가 정해지기 전에는 generic responder admission·bound·expiry·once-only policy를 선결정하지 않고, variant를 선택한 시점에 필요한 decision ticket과 client-level owner를 만든다.

## 진행 메모

사용자는 제품 구현보다 단단한 Codex runtime 구현을 먼저 세우기 위해 `T0` client-conformance tracer를 첫 slice로 확정했다. T0는 명시적인 workspace에서 새 native thread와 text turn 하나를 시작하고, matching AgentMessage와 authoritative terminal을 raw protocol·native identity·path·command·raw error payload가 없는 transport-neutral safe result로 돌려준다. Product/domain mapping, Skill·mention·`outputSchema`, resume·multi-turn·control, streaming·replay·restart와 supported Server request는 포함하지 않는다.

`codebase-design`의 Design It Twice 절차로 세 Interface를 비교했다.

| 후보 | 장점 | 탈락 또는 보정 이유 |
| --- | --- | --- |
| Connection-oriented client와 public per-thread observation | First-party request/event 분리와 process locality에 가장 가깝다. | Caller가 native ID matching, AgentMessage 선택과 terminal 결합을 소유해 conversation Interface가 얕아진다. |
| Public `Client → Thread → Turn` object | 잘못된 cross-thread ID 조합을 막고 per-thread ownership을 드러낸다. | `messages()`·`terminal` 두 async surface와 concurrency·delivery policy를 후속 decision보다 먼저 공개한다. |
| One-shot `runTextTurn()` command | T0 caller에게 가장 깊고 작은 Interface다. | Workspace를 process lifetime에 묶으면 기존 Host coupling을 재현하고, text-only 영구 API로 고정하면 다음 native input 확장이 막힌다. |

채택한 합성은 package-private concrete `CodexAppServerConnection`과 native `ThreadId` keyed actor를 process-scoped `CodexConversationRuntime` 뒤에 두는 구조다.

```ts
type CodexConversationRuntime = {
  runNewConversation(input: {
    workspace: PreparedProductWorkspace
    input: readonly [{ type: 'text'; text: string }]
  }): Promise<CodexConversationResult>
  close(): Promise<void>
}

declare function openCodexConversationRuntime(input: {
  process: PreparedCodexProcess
}): Promise<CodexConversationRuntime>

declare function prepareProductRuntimeLayout(input: {
  packageRoot: string
  appDataRoot: string
  workspaceRoot: string
}): Promise<{
  process: PreparedCodexProcess
  workspace: PreparedProductWorkspace
}>
```

이 sketch는 exact exported type을 미리 동결하는 code spec이 아니라 Interface shape와 dependency direction을 결정한다. T0에서는 package-owned input union의 `text` variant만 구현하고 product type과 generated `UserInput`은 노출하지 않는다. `close()`는 process lifetime의 명시적 owner이며 idempotent하다. Exact timeout·force-kill·unknown outcome은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

구체적인 Module 배치는 다음과 같다.

```text
packages/runtime-codex
  conversation surface        # explicit ./conversation subpath
  internal connection         # child, JSONL, schema, RPC, single ingress
  internal thread projection  # native scope correlation과 T0 result
apps/server
  AYPLE adapter               # trusted workspace input, safe product mapping
```

- Existing Runtime Harness와 old Host root barrel은 새 surface의 consumer가 아니다. 새 conversation surface는 별도 package subpath로 두고 local adapter는 developer-only `/api/runtime/*` 경로 옆에 둔다.
- `ProductRuntimeLayout`은 ADR 0006이 요구하는 한 seam에서 `packageRoot`·`appDataRoot`·`workspaceRoot`를 함께 canonicalize하고 overlap을 검사한 뒤 process와 workspace capability를 분리해 반환한다. Process launch `cwd`는 implicit `process.cwd()`가 아니라 prepared `appDataRoot`이고, Codex 작업 `cwd`는 prepared `workspaceRoot`를 `thread/start`에 명시한다. Workspace는 immutable client identity가 아니다.
- Local adapter는 trusted Node-side `workspaceRoot`를 넘기고 safe result만 mapping한다. Browser가 path를 직접 소유한다는 뜻이 아니며 HTTP·SSE, cursor, retention, replay와 reconnect는 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md) 전에는 고정하지 않는다.
- T0 admission은 runtime당 public operation 최대 1개, queue 없음이다. 두 번째 call은 RequestId 할당과 첫 wire mutation 전에 safe busy outcome으로 거부한다. 일반 same-thread queue·steer·reject와 future multi-thread independence는 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)가 다시 결정한다.
- Successful completed result는 matching `thread/start` response와 `turn/start` response를 모두 parse·validate하고 native identity가 수렴한 뒤, matching completed AgentMessage 하나 이상과 matching `turn/completed(status=completed)`를 모두 관찰해야 반환한다. Completed AgentMessage를 모두 ingress order로 모으고 마지막 message를 T0 final projection으로 삼는다.
- Pinned `thread/start`는 response-first다. Pre-response `thread/started`는 정상 staging이 아니라 fail-closed protocol violation이고 matching notification은 생략될 수 있으므로 기다리지 않는다. `turn/start`는 notification-first가 가능하므로 validated·sanitized same-turn observation만 private bounded staging에 두고 response identity와 수렴시킨다.
- Failed·interrupted terminal은 AgentMessage를 요구하지 않지만 matching authoritative terminal 없이 합성하지 않는다. Unsupported Server request에 error를 보낸 사실도 terminal이 아니다.
- Public operation 반환은 observation drain·ThreadActor 제거·child cleanup을 뜻하지 않는다. Process-scoped client는 ingress를 계속 drain하며 exact actor retention과 late observation policy는 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)가 소유한다.
- `runNewConversation()`은 `thread/start`와 `turn/start` 두 mutation을 포함한다. Operation-level slot을 첫 write 전에 확보하고 두 번째 mutation까지 유지해 admission saturation 때문에 hidden half-created thread를 만들지 않는다.
- 실제 child와 deterministic fake child가 유용한 external seam이다. Internal client·actor의 test-only Interface나 두 번째 fake implementation은 만들지 않는다.
- 별도 shared conversation/product package는 만들지 않는다. Test·route·fake가 아닌 두 번째 independent production consumer가 같은 semantic contract를 product-specific branching 없이 요구할 때만 추출한다.

T0에는 supported Server request가 없다. Inbound request는 같은 ID의 deterministic unsupported protocol error로 끝내 ingress를 매달지 않되, generic public responder Interface와 제품 approval policy를 만들지 않는다. [첫 Server request variant 비교](../assets/008-server-request-variant-comparison.md)에 따라 첫 concrete responder tracer는 좁은 `T0.1` `item/commandExecution/requestApproval`로 채택했고, identity·delivery·connection decision 뒤 [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)에서 source-guided pending·once-only lifecycle을 설계한다.

## Answer

첫 tracer는 최종 Codex-native client 구조의 임시 축소판이 아니라 첫 executable conformance slice인 `T0`다. Three-root preparation 뒤 package-owned binary를 initialize하고, 명시적인 workspace에서 새 native thread와 text turn 하나를 시작해 matching completed AgentMessage와 authoritative `turn/completed`를 transport-neutral safe result로 반환한다. T0의 max-one/no-queue admission은 이 composite operation의 pre-admission 제약이며 이후 concurrency contract를 선결정하지 않는다.

새 범용 Host state machine을 발명하거나 Rust를 줄 단위로 복제하지 않는다. 현재 tracer가 채택한 method에 한해 pinned Rust source/tests에서 관찰되는 request ID exact demux, native identity, per-thread ownership, response/notification convergence와 terminal transition을 TypeScript external App Server client로 source-guided port한다. Production Rust에는 AY-PLE이 import할 stdio child client가 없으므로 external boundary는 다음 세 owner로 나눈다.

| Owner | 책임 |
| --- | --- |
| `CodexAppServerConnection` | Child lifecycle, single JSONL ingress, generated-schema validation, envelope direction과 exact `RequestId` demux, process terminal과 pending RPC settlement |
| `CodexConversationRuntime` | 채택된 native thread/turn/item lifecycle, `ThreadId`별 correlation과 projection, method별 response/notification convergence와 semantic terminal |
| `AYPLE adapter` | Three-root 제품 policy, safe product projection, 이후 `ModelingInvocation` mapping, browser transport와 제품 UX |

Three-root validation, process launch `cwd=appDataRoot`와 `thread/start.cwd=workspaceRoot`는 upstream Rust의 의미가 아니라 ADR 0006이 정한 AY-PLE policy다. Connection과 ConversationRuntime은 prepared capability만 소비하며 product ref, `ModelingRun`과 browser DTO를 runtime contract로 만들지 않는다.

T0의 semantic projection roster는 `initialize`/`initialized`, `thread/start`, `turn/start`, response-first `thread/started`의 검증·무대기 처리, notification-first가 가능한 `turn/started`, completed AgentMessage를 담는 `item/completed`, authoritative `turn/completed`다. External ingress는 정상 AgentMessage path에서 올 수 있는 `item/started`와 optional `item/agentMessage/delta`도 parse·validate하고 안전하게 tolerate해야 하며 fake/live oracle이 이를 생략된 wire invariant로 만들지 않는다. 이 tolerated coverage는 streaming product projection이나 semantic integration 승격이 아니다. Resume, interrupt, recovery와 사용하지 않는 stable·experimental method를 선제 구현하지 않는다. 모든 inbound Server request는 같은 ID의 deterministic unsupported error로 종결하며, 이 transport handling만으로 개별 Server request method를 semantic integration으로 승격하지 않는다.

첫 supported Server request는 제품 우선순위가 아니라 responder engineering tracer인 `T0.1 item/commandExecution/requestApproval`이다. [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)가 original `RequestId` once-only response와 native thread/turn/item correlation을 결정하고, 실제 approval UI·session grant·policy amendment는 product use case까지 미룬다.

Method 존재와 현재 integration/adoption은 generated [Codex App Server method inventory](../../../architecture/codex-app-server-method-inventory.md)에서 확인하되 직접 수정하지 않는다. Tracer별 adoption·owner·source evidence와 verification 상태는 package-owned [`codex-method-decisions.json`](../../../../packages/runtime-codex/codex-method-decisions.json)을 확장해 기록하고 inventory를 재생성한다. Inventory는 coverage ledger이며 ordering·identity authority·state transition의 근거가 아니다. 그것은 [method lifecycle fact table](../assets/004-method-lifecycle-fact-table.md)과 pinned source/tests가 소유한다. 현재 overlay가 `integration/adoption/note`만 허용하는 gap과 안전한 generation gate는 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 schema로 정하고 [기존 Host 제거와 선별 재사용 계획을 확정한다](014-plan-host-removal-and-selective-salvage.md)가 migration plan에 반영한다. 이 설계 승인만으로 현재 integration row를 승격하지 않는다.

별도 shared conversation/product package는 만들지 않는다. Test·route·fake가 아닌 두 번째 independent production consumer가 같은 semantic contract를 product-specific branching 없이 요구할 때만 추출한다.
