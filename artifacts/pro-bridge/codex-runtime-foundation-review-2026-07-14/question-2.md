# Codex-native Runtime Foundation 2차 finding 재심 요청

이 요청은 앞선 blind review를 처음부터 반복하거나 새로운 architecture를 자유롭게 제안해 달라는 요청이 아니다. 당신이 1차 답변에서 제시한 F-01~F-16을 **전체 pushed repository와 exact-pin source evidence에 대조해 재심**해 달라는 요청이다.

1차 리뷰는 anchoring을 피하기 위해 의도적으로 네 개의 문서만 제공했다. 그 결과 유효한 concurrency 반례와 함께, repository에 이미 존재하는 계약·근거·consumer audit을 보지 못해 생긴 것으로 의심되는 finding도 나왔다. 이번에는 각 finding을 방어하려 하지 말고, 추가 근거가 이전 판단을 바꾸는지 독립적으로 판정하라.

## 고정된 AY-PLE repository 범위

| 항목 | 값 |
| --- | --- |
| GitHub repository | <https://github.com/swh3467/hub> |
| Pushed branch | `codex/codex-native-client-redesign` |
| Immutable review commit | `ec484901c747e593ccb01484a16af8acecf4ede4` |
| Commit tree | <https://github.com/swh3467/hub/tree/ec484901c747e593ccb01484a16af8acecf4ede4> |
| Exact upstream Codex commit | `767822446c7a594caa19609ca435281a9ec67e0d` |
| npm package pin | `@openai/codex@0.144.0` |

다음 범위 규칙을 지켜라.

1. 첨부 발췌만 보지 말고 위 immutable commit의 **전체 pushed tree**를 직접 탐색하라.
2. 해당 commit에서 reachable한 history는 조사할 수 있지만, branch의 이후 commit이나 다른 AY-PLE branch를 current state로 사용하지 마라.
3. Current implementation과 target contract를 구분하라. `packages/runtime-codex`의 current code는 legacy Host/transport이고, 새 Connection/ConversationRuntime은 아직 구현 전이다.
4. `docs/specs/2026-07-14-codex-native-runtime-foundation.md`, `docs/adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md`, `docs/wayfinding/codex-native-client-redesign/**`, `packages/runtime-codex/**`, root/package manifests와 실제 import/export graph를 함께 확인하라.
5. Method ordering과 identity authority는 AY-PLE 문서의 주장만 인용하지 말고 exact upstream commit의 source/test까지 확인하라. Latest `openai/codex/main`의 동작은 별도 upgrade observation일 뿐 exact-pin 반증이 아니다.
6. GitHub tree 또는 exact upstream source에 접근하지 못했다면 접근한 척하지 말고, 확인하지 못한 항목을 `NOT VERIFIED`로 표시하라.
7. 현재 대화의 1차 질문과 당신의 F-01~F-16 답변은 review input이다. 로컬에서 아직 push되지 않은 `artifacts/pro-bridge/codex-runtime-foundation-review-2026-07-14/**`는 repository evidence가 아니다.

## 이번 재심의 목적

각 기존 finding을 다음 중 하나로 판정하라.

| Verdict | 의미 |
| --- | --- |
| `UPHOLD` | 추가 근거를 본 뒤에도 원 finding과 severity가 그대로 유효하다. |
| `NARROW` | 핵심 일부만 유효하며 scope, severity 또는 correction을 줄여야 한다. |
| `WITHDRAW` | 기존 계약이나 exact-pin evidence를 놓쳤거나 반례가 현재 contract에서 성립하지 않는다. |
| `NEEDS EVIDENCE` | 결정에 필요한 exact source/code/probe가 여전히 없다. |

`WITHDRAW`는 실패가 아니다. Blind review에서 의도적으로 제거했던 repository context가 복구된 결과다.

## 재심해야 할 기존 finding

### F-01 — writer queue cancellation과 handoff linearization

AY-PLE preliminary verdict: `UPHOLD`, 단 correction의 connection-terminal 범위는 재검토가 필요하다.

Current spec은 writer queue admission deadline, write 전 `known_not_sent`, write attempt 뒤 `acceptance_unknown`, approval의 `delivery_unknown`을 구분하지만 `QUEUED` frame을 deadline에서 원자적으로 제거하는 지점과 stream handoff의 정의가 충분히 명시되지 않은 것으로 보인다.

재심 질문:

1. Queue에서 아직 stream에 handoff되지 않은 mutation이 timeout 뒤 나중에 write될 수 있다는 Trace A는 실제로 spec-conformant인가?
2. 최소 상태가 `queued/cancelable → handed → callback-settled`면 충분한가?
3. Handoff 이후 response deadline을 잃었다는 이유만으로 Connection 전체를 terminal 처리해야 하는가, 아니면 operation-local `acceptance_unknown`과 no-retry로 충분한가? 뒤따르는 frame을 금지해야 하는 정확한 trust-loss 조건을 분리하라.
4. Response가 writer callback보다 먼저 ingress된 경우의 authoritative outcome을 명시하라.

### F-02 — required Server response capacity

AY-PLE preliminary verdict: `UPHOLD`, correction은 최소 reserve와 별도 control lane 사이에서 미확정이다.

Current spec의 capacity table은 Client frame saturation을 local failure로, required Server response reserve 실패를 Connection terminal로 정의하지만 실제 reserve가 admission 전에 어떻게 보장되는지는 닫혀 있지 않다.

재심 질문:

1. Count/byte reserved budget이면 충분한가, 아니면 별도 control-response lane이 필요한가?
2. Inbound Server request가 도착했을 때 response capacity를 reserve하는 최소 once-only 알고리즘은 무엇인가?
3. Control priority가 application starvation을 만들지 않는 가장 작은 scheduling rule은 무엇인가?

### F-03 — concurrent pre-identity `thread/start`

AY-PLE preliminary verdict: `WITHDRAW` 후보.

Repository의 lifecycle fact table과 ledger evidence는 exact pin의 matching `thread/started`가 같은 task에서 response send를 await한 뒤 enqueue되는 **response-first implementation fact**라고 추적한다.

반드시 확인할 upstream source:

- <https://github.com/openai/codex/blob/767822446c7a594caa19609ca435281a9ec67e0d/codex-rs/app-server/src/request_processors/thread_processor.rs#L1328-L1360>

재심 질문:

1. Trace C의 pre-response matching `thread/started`는 exact pinned implementation에서 legal interleaving인가, 아니면 compatibility/protocol violation인가?
2. Legal하지 않다면 이를 이유로 T0의 concurrent `thread/start`를 serialize해야 한다는 finding을 철회하라.
3. Current waiter-cohort failure는 legal convergence algorithm이 아니라 impossible-at-pin observation의 fail-closed compatibility policy다. 그 정책이 지나치게 넓다는 별도 주장이 있다면 source fact와 분리하고 severity를 다시 매겨라.

### F-04 — approval lease race

AY-PLE preliminary verdict: `NARROW`.

Current spec은 다음을 이미 명시한다.

- Pre-response request는 sanitized staged lease로만 보존하고 matching turn response 뒤에만 handler를 호출한다.
- `respond()`는 Connection lease를 atomic claim한다.
- Duplicate response는 wire 0회다.
- `serverRequest/resolved`, turn transition과 Connection terminal이 write attempt 전에 lease를 제거하면 late response는 stale다.
- Attempt 뒤 terminal cut은 `delivery_unknown`이다.

재심 질문:

1. F-01의 queued-vs-handed cancellation을 제외하고도 독립적으로 빠진 lease transition이 있는가?
2. Connection-bound nonce가 public stale handle 안전에 반드시 필요한 contract인가, 아니면 lease object identity와 Runtime close revocation으로 충분한 implementation detail인가?
3. 기존 문구로 이미 결정된 pre-response staging을 누락 finding에서 제거하라.

### F-05 — `FAILED_DRAINING`

AY-PLE preliminary verdict: `WITHDRAW` 후보.

Current spec은 operation outcome 뒤 route와 projection을 release하며, late response는 active map miss, late notification은 operation route miss no-op라고 명시한다. Unknown/late event가 actor를 자동 재생성한다는 contract는 없다. Same-thread second turn은 현재 tracer의 public Interface와 scope 밖이다. Process-lifetime sink, permanent poison과 contradiction lattice는 의도적으로 채택하지 않았다.

재심 질문:

1. Current spec을 준수하면서 late A event가 새 actor/early FIFO를 생성하는 실행 경로를 repository contract에서 정확히 인용하라.
2. 그런 경로가 없다면 Trace E의 전제를 철회하라.
3. Authoritative terminal이 오지 않는다는 이유로 healthy Connection 전체를 닫는 정책이 pinned first-party behavior 또는 T0/T0-C correctness에서 정말 필요한지 증명하라.
4. Future same-thread/multi-turn tracer에 필요한 state를 현재 T0 foundation의 blocker로 선결정하지 마라.

### F-06 — dispatch가 semantic/user completion을 await하는 문제

AY-PLE preliminary verdict: `NARROW` 또는 `UPHOLD`.

T0-C는 A의 approval/terminal 지연이 B ingress와 outcome을 막지 않아야 한다고 이미 요구한다. 다만 Connection dispatch가 Runtime handler 또는 user Promise를 await하지 않는다는 직접 문구는 더 명확해질 수 있다.

재심 질문:

1. 이것이 새로운 architecture finding인지, 기존 T0-C invariant를 구현 가능하게 만드는 clarification/test인지 구분하라.
2. Sole reader, bounded dispatch와 per-thread reducer 사이의 최소 non-await handoff contract를 제안하라.

### F-07 — child exit와 stdout/dispatch drain

AY-PLE preliminary verdict: `UPHOLD`.

Explicit `close()`에는 stdout/stderr complete-frame drain 순서가 있지만 unexpected process `exit`, stdout EOF, partial-frame 판정과 dispatch drain의 terminal barrier는 더 명확히 닫혀야 하는 것으로 보인다.

재심 질문:

1. Node process `exit`와 stdout `close/end`의 실제 ordering을 구분하라.
2. Admission freeze와 pending semantic settlement 사이에 필요한 최소 bounded barrier를 제안하라.
3. Descendant가 pipe를 계속 열어 두는 경우 무한 drain하지 않는 deadline/failure scope를 명시하라.

### F-08 — RequestId non-reuse와 stale lease

AY-PLE preliminary verdict: outbound non-reuse finding은 `WITHDRAW` 후보, stale lease nonce는 `NARROW` 후보.

Current spec은 Client RequestId를 1부터 시작하는 positive safe integer monotonic allocator로 생성하고 Connection lifetime 동안 재사용하지 않으며 `Number.MAX_SAFE_INTEGER` exhaustion을 pre-wire failure로 정의한다. Active inbound collision/coalescing과 Connection terminal lease revocation도 명시한다.

재심 질문:

1. 기존 F-08의 “non-reuse invariant가 명시되지 않았다”는 주장을 철회하라.
2. Reconnect 뒤 old public approval handle이 new Connection을 참조할 수 있는 실제 public API 경로가 있는지 repository Interface에서 보여라.
3. Private epoch/nonce가 필요하다면 normative public contract가 아니라 구현 안전장치인지 구분하라.

### F-09 — deadline과 admitted ingress의 tie-break

AY-PLE preliminary verdict: `NARROW` 또는 `UPHOLD`.

재심 질문:

1. Validated observation admission과 deadline timer가 같은 owner queue에서 순서화되어야 한다는 것이 최소 contract인지 확인하라.
2. Cross-thread timer까지 global queue로 만들지 말고 native scope-local ordering을 유지하라.
3. 이것이 spec blocker인지 reducer implementation ticket의 acceptance criterion인지 severity를 다시 매겨라.

### F-10 — raw bytes, UTF-8와 framing

AY-PLE preliminary verdict: `NARROW`.

Current spec은 frame cap을 actual UTF-8 bytes로 정의하고 malformed UTF-8를 Connection terminal로 분류하며 complete frame hard cap test를 요구한다.

재심 질문:

1. 이미 정의된 byte/failure contract와 아직 빠진 Buffer splitter, fatal decoder, CRLF/BOM/blank/partial EOF handling을 분리하라.
2. 누락된 부분 중 App Server JSONL과 Node external stdio에서 실제 normative contract로 필요한 것만 남겨라.

### F-11 — method/adoption validation matrix

AY-PLE preliminary verdict: `WITHDRAW` 후보.

Current spec의 `Validation tier와 Server request fallback` 표에는 active response, adopted/tolerated notification, unadopted known notification, stable-known valid/invalid Server request, experimental/future unknown Server request와 malformed envelope의 disposition이 있다.

재심 질문:

1. 기존 표를 직접 읽고 F-11에서 실제로 비어 있는 cell만 제시하라.
2. 이미 정의된 known-unadopted bounded sanitized no-op, same-ID fallback과 malformed Connection terminal을 누락으로 다시 보고하지 마라.
3. Inventory 밖의 unknown notification이 유일한 gap이라면 그 하나로 finding을 축소하라.

### F-12 — provenance와 oracle authority

AY-PLE preliminary verdict: `WITHDRAW` 또는 `NARROW` 후보.

Current spec은 provenance manifest에 exact npm version, source commit, root/platform package integrity, generated digest를 연결하고 mismatch를 certification failure로 만든다. Unit/actual-child fake/pinned live/source review가 각각 증명하는 것과 증명하지 않는 것도 별도 표로 둔다. Live는 nominal package compatibility만, adversarial ordering/fault는 fake/unit이 소유한다.

재심 질문:

1. Repository의 provenance, safe generation과 Testing Decisions를 읽은 뒤 기존 F-12 correction 중 이미 존재하는 것을 제거하라.
2. `resolved binary path/hash/version`처럼 여전히 manifest에 빠진 exact field가 있다면 실제 package threat와 함께 그 부분만 남겨라.
3. Live가 arbitrary unsupported request와 모든 interleaving을 증명하도록 요구된다는 기존 해석의 근거가 있는지 다시 확인하라.

### F-13 — Runtime cardinality와 future extension

AY-PLE preliminary verdict: `WITHDRAW` 후보.

Current public target은 `openCodexConversationRuntime({ process })`가 dedicated private child 하나를 열고, 하나의 Runtime에서 concurrent `runNewConversation()`을 허용하며, native ThreadId를 품은 opaque `CodexConversation` capability를 반환한다. Spec의 Design It Twice 기록은 public `Runtime → Thread → Turn` Interface를 tracer evidence 없이 선제 고정하는 대안을 의도적으로 거절했다.

재심 질문:

1. 이 Interface에 future `runTurn/read/resume/activity/control`을 additive하게 추가할 수 없는 구체적인 TypeScript breaking trace를 제시하라.
2. 그런 trace가 없다면 공개 ThreadHandle/TurnHandle을 지금 도입하라는 finding을 철회하라.
3. Source-guided future tracer가 결정할 semantic contract를 현재 T0에 선제 도입하지 마라.

### F-14 — implementation graph

AY-PLE preliminary verdict: `UPHOLD`.

재심 질문:

1. Same-pin runtime preparation과 earliest packaged-child vertical slice가 authenticated pin-upgrade transaction에 막힐 필요가 있는지 repository의 planned dependency를 확인하라.
2. Minimal router와 actual installed child `initialize → initialized → thread/start → close` feedback을 가능한 가장 이른 checkpoint로 당기는 revised graph를 제안하라.
3. Writer/terminal correctness-critical hardening과 later resource/security hardening을 구분하되, unsafe mutation을 먼저 shipping하는 graph를 만들지 마라.
4. 아직 implementation tickets는 생성 전이라는 사실을 반영해 최소한의 graph correction만 제시하라.

### F-15 — legacy Host reachability와 deletion

AY-PLE preliminary verdict: missing-evidence P1은 `WITHDRAW` 후보, pre/post cutover gate는 `NARROW` 후보.

반드시 다음을 직접 확인하라.

- `docs/wayfinding/codex-native-client-redesign/assets/002-host-consumer-audit.md`
- `docs/wayfinding/codex-native-client-redesign/assets/014-host-removal-and-selective-salvage-plan.md`
- `packages/runtime-codex/src/index.ts`
- Repository 전체의 `HeadlessCodexClientHost`, layout과 testing export import graph

재심 질문:

1. Production/runtime consumer가 실제로 존재하는지 immutable commit 전체에서 검색하라. Test/self-export/README 언급과 external consumer를 구분하라.
2. Existing audit가 틀렸다면 정확한 consumer file과 import path를 제시하라.
3. Consumer가 0이어도 export cutover certification과 physical deletion을 별도 checkpoint로 나누는 것이 필요한지 severity와 최소 gate를 다시 매겨라.

### F-16 — Ticket 004 root-cause wording

AY-PLE preliminary verdict: `UPHOLD`하되 documentation-only `P3`.

Global publication order가 causal root이고 monolithic Host는 blast radius/testability amplification factor였다는 더 정확한 문구로 한정하라.

## 새 finding 허용 조건

이번 응답의 중심은 F-01~F-16 재심이다. 전체 repository를 본 결과 새 finding이 생길 수는 있지만 다음 조건을 모두 만족해야 한다.

- `P0` 또는 `P1`만 허용한다.
- 기존 finding의 재서술이 아니어야 한다.
- Immutable AY-PLE commit의 정확한 path/line과 exact-pin upstream evidence 또는 executable trace가 있어야 한다.
- 현재 implementation과 아직 구현되지 않은 target을 혼동하지 않아야 한다.
- Future AY-PLE product adapter나 out-of-scope method를 foundation blocker로 만들지 않아야 한다.

조건을 만족하지 않으면 새 아이디어를 별도 recommendation으로도 추가하지 마라.

## 요청 출력 형식

### 1. Revised overall verdict

다음 중 하나를 선택한다.

- `ready`
- `ready with required corrections`
- `not implementation-ready`

첫 답변에서 무엇이 바뀌었는지 5문장 이내로 설명한다.

### 2. Finding disposition table

F-01부터 F-16까지 빠짐없이 한 행씩 작성한다.

| Field | Required content |
| --- | --- |
| ID | 기존 ID 유지 |
| Verdict | `UPHOLD | NARROW | WITHDRAW | NEEDS EVIDENCE` |
| Revised severity | `P0 | P1 | P2 | P3 | none` |
| Repository evidence | Immutable AY-PLE commit의 exact path/line |
| Upstream evidence | Exact upstream commit source/test 또는 `not applicable` |
| Trace verdict | 기존 trace가 legal·illegal·underspecified 중 무엇인지 |
| Minimal correction | 실제로 남은 최소 변경 또는 `none` |
| Reason for change | 첫 답변에서 놓친 근거 또는 유지 이유 |

### 3. Minimum blocking correction set

Implementation 시작 전에 반드시 고칠 항목만 중복 없이 나열한다. 각 항목에 owning spec section, 필요한 contract 문구와 deterministic test를 포함한다.

### 4. Revised implementation graph

첫 executable exact-package feedback을 앞당기되 provenance, writer/terminal correctness와 final conformance를 약화하지 않는 최소 graph만 제시한다.

### 5. Remaining human decisions

Repository/source 조사로 답할 수 있는 사실을 human decision으로 올리지 마라. 실제 trade-off가 남은 항목만 선택지와 권고 default를 적는다.

### 6. New P0/P1 findings

허용 조건을 만족하는 새 finding이 없으면 명시적으로 `0 findings`라고 적는다.

## 최종 규칙

- 이전 답변의 권위를 보존하려 하지 마라.
- 반대로 AY-PLE preliminary verdict에도 anchoring되지 마라.
- Exact source가 보장하는 legal ordering과 fault-injection compatibility policy를 혼동하지 마라.
- “더 안전해 보인다”는 이유만으로 tombstone, drain actor, permanent poison 또는 Connection-wide terminal을 추가하지 마라. 필요한 최소 retained state와 release condition을 trace로 증명하라.
- Spec에 이미 존재하는 문장을 누락 finding으로 반복하지 마라.
- Finding을 철회하거나 축소할 때는 대체 finding을 억지로 만들지 마라.
- 구현 세부사항과 normative contract를 구분하라.
- 최종 답변은 findings-first이며 좋은 점 요약은 생략하라.
