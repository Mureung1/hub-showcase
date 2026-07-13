# 008 — 첫 tracer와 module seam을 선택한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: tickets/002-audit-host-consumers-and-compatibility.md, tickets/007-review-source-evidence-alignment.md

## Question

“Codex 사용 용례 위에 AY-PLE 기능을 올린다”는 원칙을 가장 작은 end-to-end 행동으로 증명하는 첫 tracer는 무엇이며, 그 tracer를 위해 `ProductRuntimeLayout`, `CodexAppServerClient`, conversation use-case module과 local web adapter 사이의 Interface·seam을 어디에 두어야 하는가?

권고 출발점은 명시적 workspace에서 conversation 하나를 시작하고 text turn 하나의 agent message와 authoritative terminal을 browser-safe 결과로 관찰하는 vertical tracer다.

선택한 tracer가 Server request를 요구하는지, 요구하지 않는다면 first supported request variant를 어떤 실제 후속 tracer에서 선택할지도 명시한다. 구체 variant가 정해지기 전에는 generic responder admission·bound·expiry·once-only policy를 선결정하지 않고, variant를 선택한 시점에 필요한 decision ticket과 client-level owner를 만든다.

## 진행 메모

사용자는 제품 구현보다 단단한 Codex runtime 구현을 먼저 세우기 위해 `T0` client-conformance tracer를 첫 slice로 확정했다. T0는 명시적인 workspace에서 새 native thread와 text turn 하나를 시작하고, matching AgentMessage와 authoritative terminal을 raw protocol·native identity·path·command·raw error payload가 없는 transport-neutral safe result로 돌려준다. Product/domain mapping, Skill·mention·`outputSchema`, resume·multi-turn·control, streaming·replay·restart와 supported Server request는 포함하지 않는다.

`codebase-design`의 Design It Twice 절차로 세 Interface를 비교했다.

| 후보 | 장점 | 탈락 또는 보정 이유 |
| --- | --- | --- |
| Connection-oriented client와 public per-thread observation | First-party request/event 분리와 process locality에 가장 가깝다. | Caller가 native ID matching, AgentMessage 선택과 terminal 결합을 소유해 conversation Interface가 얕아진다. |
| Public `Client → Thread → Turn` object | 잘못된 cross-thread ID 조합을 막고 per-thread ownership을 드러낸다. | `messages()`·`terminal` 두 async surface와 concurrency·delivery policy를 후속 decision보다 먼저 공개한다. |
| One-shot `runTextTurn()` command | T0 caller에게 가장 깊고 작은 Interface다. | Workspace를 process lifetime에 묶으면 기존 Host coupling을 재현하고, text-only 영구 API로 고정하면 다음 native input 확장이 막힌다. |

채택할 합성은 package-private concrete `CodexAppServerClient`와 native `ThreadId` keyed actor를 process-scoped `CodexConversationRuntime` 뒤에 두는 구조다.

```ts
type CodexConversationRuntime = {
  runNewConversation(input: {
    workspaceRoot: string
    input: readonly [{ type: 'text'; text: string }]
  }): Promise<CodexConversationResult>
  close(): Promise<void>
}

declare function openCodexConversationRuntime(input: {
  packageRoot: string
  appDataRoot: string
}): Promise<CodexConversationRuntime>
```

이 sketch는 exact exported type을 미리 동결하는 code spec이 아니라 Interface shape와 dependency direction을 결정한다. T0에서는 package-owned input union의 `text` variant만 구현하고 product type과 generated `UserInput`은 노출하지 않는다. `close()`는 process lifetime의 명시적 owner이며 idempotent하다. Exact timeout·force-kill·unknown outcome은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

구체적인 Module 배치는 다음과 같다.

```text
packages/runtime-codex
  conversation surface        # explicit ./conversation subpath
  internal App Server client  # child, initialize, RPC, single ingress
  internal thread projection  # native scope correlation과 T0 result
apps/server
  local adapter               # trusted workspace input, safe result mapping
```

- Existing Runtime Harness와 old Host root barrel은 새 surface의 consumer가 아니다. 새 conversation surface는 별도 package subpath로 두고 local adapter는 developer-only `/api/runtime/*` 경로 옆에 둔다.
- `ProductRuntimeLayout`은 process bootstrap 때 `packageRoot`·`appDataRoot`를 canonicalize하고, 각 operation 전에 `workspaceRoot`를 canonicalize해 cached process roots와 overlap을 검사한다. Workspace는 immutable client identity가 아니다.
- Local adapter는 trusted Node-side `workspaceRoot`를 넘기고 safe result만 mapping한다. Browser가 path를 직접 소유한다는 뜻이 아니며 HTTP·SSE, cursor, retention, replay와 reconnect는 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md) 전에는 고정하지 않는다.
- T0 admission은 runtime당 public operation 최대 1개, queue 없음이다. 두 번째 call은 RequestId 할당과 첫 wire mutation 전에 safe busy outcome으로 거부한다. 일반 same-thread queue·steer·reject와 future multi-thread independence는 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)가 다시 결정한다.
- Successful completed result는 matching `thread/start` response와 `turn/start` response를 모두 parse·validate하고 native identity가 수렴한 뒤, matching completed AgentMessage 하나 이상과 matching `turn/completed(status=completed)`를 모두 관찰해야 반환한다. Completed AgentMessage를 모두 ingress order로 모으고 마지막 message를 T0 final projection으로 삼는다.
- Pinned `thread/start`는 response-first다. Pre-response `thread/started`는 정상 staging이 아니라 fail-closed protocol violation이고 matching notification은 생략될 수 있으므로 기다리지 않는다. `turn/start`는 notification-first가 가능하므로 validated·sanitized same-turn observation만 private bounded staging에 두고 response identity와 수렴시킨다.
- Failed·interrupted terminal은 AgentMessage를 요구하지 않지만 matching authoritative terminal 없이 합성하지 않는다. Unsupported Server request에 error를 보낸 사실도 terminal이 아니다.
- Public operation 반환은 observation drain·ThreadActor 제거·child cleanup을 뜻하지 않는다. Process-scoped client는 ingress를 계속 drain하며 exact actor retention과 late observation policy는 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)가 소유한다.
- `runNewConversation()`은 `thread/start`와 `turn/start` 두 mutation을 포함한다. Operation-level slot을 첫 write 전에 확보하고 두 번째 mutation까지 유지해 admission saturation 때문에 hidden half-created thread를 만들지 않는다.
- 실제 child와 deterministic fake child가 유용한 external seam이다. Internal client·actor의 test-only Interface나 두 번째 fake implementation은 만들지 않는다.
- 별도 shared conversation/product package는 만들지 않는다. Test·route·fake가 아닌 두 번째 independent production consumer가 같은 semantic contract를 product-specific branching 없이 요구할 때만 추출한다.

T0에는 supported Server request가 없다. Inbound request는 같은 ID의 deterministic unsupported protocol error로 끝내 ingress를 매달지 않되, generic responder Interface와 admission·expiry·once-only policy를 만들지 않는다. [첫 Server request variant 비교](../assets/008-server-request-variant-comparison.md)에 따라 첫 concrete variant는 좁은 `T0.1` `item/commandExecution/requestApproval` tracer로 정하고, identity·delivery·connection decision 뒤 [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)에서 variant-specific responder를 설계한다.

## Answer

첫 tracer는 `T0` client conformance다. Product/domain mapping 전에 process-scoped Codex runtime을 세우고, 명시적 workspace에서 새 thread와 text turn 하나를 시작해 matching AgentMessage와 authoritative terminal을 transport-neutral safe result로 반환한다.

Module seam은 다음처럼 확정한다.

- `ProductRuntimeLayout`은 process bootstrap의 `packageRoot`·`appDataRoot`와 operation별 `workspaceRoot` validation을 분리한다. Workspace를 client identity로 고정하지 않는다.
- `packages/runtime-codex`의 package-private concrete `CodexAppServerClient`가 child·initialize·RPC admission·single ingress·exact demultiplexing을 소유하고, native `ThreadId` keyed projection이 notification-first turn correlation을 소유한다.
- Explicit `./conversation` subpath의 process-scoped `CodexConversationRuntime`만 T0 operation과 idempotent `close()`를 노출한다. Generated type, native identity, process·path와 raw payload는 노출하지 않는다.
- Server-local adapter는 trusted workspace input과 safe result를 mapping한다. Exact HTTP·SSE, streaming·retention·replay·reconnect는 후속 delivery decision에 남긴다.
- T0 public operation admission은 runtime당 하나, queue 없음이다. 두 mutation의 operation slot을 첫 wire write 전에 확보하고 두 번째 mutation settlement까지 유지한다.
- Successful completion은 validated matching `thread/start`·`turn/start` response, completed AgentMessage 하나 이상과 authoritative matching `turn/completed(status=completed)`를 모두 요구한다. Terminal 반환은 ingress drain이나 actor·child cleanup 완료를 뜻하지 않는다.

T0는 모든 Server request를 same-ID unsupported error로 끝낸다. 첫 supported request는 [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)의 `T0.1` tracer가 선택한다. 이 tracer는 exact routing·bounded pending·`accept | decline | cancel` once-only typed response만 runtime foundation으로 다루고, approval UI·session grant·policy amendment와 다른 variant는 실제 product use case까지 미룬다.

별도 shared conversation/product package는 만들지 않는다. Test·route·fake가 아닌 두 번째 independent production consumer가 같은 semantic contract를 product-specific branching 없이 요구할 때만 추출한다.
