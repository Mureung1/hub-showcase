# 013 — Source conformance verification matrix를 결정한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md), [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)

## Question

Generated schema, pinned Rust source/tests, deterministic unit test, fake child interleaving과 package-owned binary live probe 중 어떤 oracle이 T0/T0.1의 각 runtime contract를 증명하며, end-to-end product tracer를 runtime proof와 어떻게 분리할 것인가? 일반 PR과 Codex pin upgrade에서 어떤 Source·Standards·Spec 조합을 필수 gate로 삼아 submodule을 runtime·일상 build dependency로 만들지 않으면서 external stdio port의 의미를 검증할 것인가?

Package-owned [`codex-method-decisions.json`](../../../../packages/runtime-codex/codex-method-decisions.json)을 tracer coverage ledger로 확장해 method별 tracer, semantic owner, required·tolerated·unsupported·deferred 상태, integration/adoption, source/test evidence, fake/live oracle와 verification 상태를 어떤 machine-readable schema로 기록할 것인가? 현재 `client-host` taxonomy와 destructive-before-version-check generation gap을 어떻게 교체하고, decisions source에서 generated [method inventory](../../../architecture/codex-app-server-method-inventory.md)를 안전하고 deterministic하게 재생성·drift-check할 것인가? Inventory는 ordering·identity authority의 근거로 사용하지 않는다.

## Ticket 019 correction

Evidence authority 분리, ledger v2·safe generation, unit/fake/live selector와 planned/implemented promotion rule은 유지한다. [First-party client port 감사](../assets/019-first-party-client-port-and-reuse-audit.md)에 따라 source selector에 Python external stdio client, Rust client facade와 TUI projection/pending request를 추가하고, 아래 matrix의 process-lifetime tombstone·poison oracle은 active waiter removal, per-turn early FIFO와 terminal/unregister cleanup, disconnect `fail_all`, per-thread projection, active approval remove-on-resolution과 duplicate terminal idempotence oracle로 대체한다. 이 correction만으로 decisions JSON이나 generated inventory를 변경하거나 integration을 승격하지 않는다.

## Answer

### Conformance authority를 분리한다

[Source conformance verification와 coverage ledger 근거](../assets/013-source-conformance-and-ledger-evidence.md)를 이 결정의 evidence asset으로 채택한다. T0·T0-C·T0.1의 conformance는 단일 oracle이나 product end-to-end test로 증명하지 않는다.

| Authority | 소유하는 사실 | 소유하지 않는 사실 |
| --- | --- | --- |
| Pinned generated TypeScript·JSON Schema | Exact wire direction, discriminant, required/optional field, `RequestId`, payload와 response union | Ordering, identity authority, duplicate·terminal semantics |
| Exact-pin Rust source·first-party tests | `767822446c7a594caa19609ca435281a9ec67e0d` 구현의 method별 task ownership, legal order, native identity·lifecycle과 first-party handling | AY-PLE의 external stdio port correctness와 child fault behavior |
| Deterministic unit test | Envelope classification, exact typed ID key, pure actor transition, tombstone·bound·no-raw invariant | Real JSONL pipe와 child/process interleaving |
| Spawned fake child | Single ingress, pipe framing, forced response/notification/Server request order, stdout tail·EOF·exit·stdin fault, A/B independence | Package binary가 실제 pin semantics와 맞는지 |
| Package-owned live binary | 설치된 launcher/native artifact, generated schema와 selected happy-path external stdio compatibility | Race completeness, duplicate·fault·cap completeness |

Source가 규정하는 lifecycle을 unit·fake child가 external port에서 재현하고, live probe가 실제 pinned artifact와의 좁은 호환성을 확인한다. Live에서 우연히 관찰한 notification order는 새로운 normative contract가 아니며, first-party test helper의 method-targeted read 순서도 raw wire order로 해석하지 않는다.

### T0·T0-C·T0.1 oracle을 배정한다

Coverage vocabulary는 `required | tolerated | unsupported | deferred`로 고정한다. `tolerated`는 occurrence나 completion authority를 요구하지 않지만, 관찰되면 generated validation·native scope correlation·deterministic disposition을 통과해야 하며 silent ignore를 허용하지 않는다.

| Slice | Required semantic proof | Deterministic completeness owner | Live gate |
| --- | --- | --- | --- |
| T0 | initialize/initialized, response-first `thread/start`, either-order `turn/start` convergence, matching completed AgentMessage, authoritative `turn/completed`, all inbound Server request의 same-ID unsupported fallback, safe result | Unit transition table + fake child의 response-first·notification-first·pre-response fault·partial observation·terminal cut·no-raw cases | Isolated three-root·`CODEX_HOME`·local mock Responses provider를 사용하는 auth-free happy path |
| T0-C | Native `ThreadId`별 actor independence와 A pending → B complete → A complete | Fake child가 exact A/B schedule과 unrelated progress를 강제한다 | Local mock provider barrier의 representative A/B/A2 path만 확인하며 race completeness를 주장하지 않는다 |
| T0.1 | Regular `item/commandExecution/requestApproval`, original server `RequestId` once-only response lease, resolved·turn transition·connection loss race, command item과 authoritative turn terminal | Unit + fake child가 duplicate/conflict, zero/one frame, cap, writer callback loss와 recursive no-raw를 강제한다 | Deterministic regular command decline path로 original-ID response·resolved·declined item·terminal을 확인한다 |

Stable-known Server request 10개는 full generated params validation 뒤 same-ID unsupported error로 끝낸다. Experimental-only `currentTime/read`와 future unknown Server method는 exact ID·method를 가진 envelope까지만 검증하고 same-ID unsupported error로 끝내며 typed semantic owner나 method integration을 만들지 않는다. T0.1의 regular command variant만 이 direction-wide fallback을 좁게 override한다.

Writer callback이 사라지는 경로는 pipe timing에 맡기지 않고 package-private writer/reducer dependency로 unit-test한다. Fake child scenario와 journal 자체도 TypeScript build/typecheck 경계에 넣고 generated type/schema에 맞는 frame만 “valid scenario”로 인정한다. Recursive no-raw assertion은 reducer retained state와 byte-charge input에 sentinel command·cwd·path·error payload가 남지 않는지 검사한다.

### Coverage ledger v2를 채택한다

[`codex-method-decisions.json`](../../../../packages/runtime-codex/codex-method-decisions.json)은 다음 top-level registry를 가진 versioned coverage ledger로 확장한다.

```json
{
  "schemaVersion": 2,
  "provenance": { "manifest": "codex-upstream-provenance.json" },
  "tracers": {},
  "evidence": {},
  "contracts": {},
  "methods": {}
}
```

- `methods`는 named tracer/case별 `owner`, `coverage`, source evidence와 `unit | fakeChild | liveBinary` verification을 기록한다.
- `contracts`는 single JSONL ingress, direction-aware `RequestId`, pending settlement, Server response lease, process terminal/reap, bounds·safe retention, Connection wire-stage outcome, Runtime semantic outcome과 explicit three-root처럼 method row가 아닌 acceptance를 기록한다. Wire outcome과 semantic outcome은 단일 composite owner로 합치지 않는다.
- `integrations[]`는 `runtime-harness | legacy-client-host | app-server-connection | conversation-runtime | ayple-adapter`의 unique set이다. Empty/omitted만 generated inventory에서 `schema-only`로 보인다. Integration은 linear maturity scalar가 아니다.
- `owner`는 `app-server-connection | conversation-runtime | thread-actor | runtime-preparation | ayple-adapter`, verification requirement는 `required | not-required`, implementation은 `planned | implemented`, gate는 `general-pr | runtime-tracer-pr | pin-upgrade`를 사용한다. 실행 시점은 gate가 구분하므로 별도 conditional 상태를 만들지 않는다. `required` verification은 implementation field가 필수이고 `not-required`는 이를 생략하며 empty gates/evidence만 허용한다.
- `implemented`는 stable local test/probe selector가 존재한다는 뜻일 뿐 최근 pass·timestamp·branch SHA가 아니다. Transient pass/fail은 CI와 implementation ticket Result가 소유한다.
- Generated schema가 direction과 maturity를 소유하고 ledger는 이를 복사하지 않는다. Source evidence path·line은 provenance manifest가 가리키는 exact pin에 묶는다. Ordering·identity authority·terminal state는 계속 lifecycle fact table과 pinned source/tests에서만 도출한다.

Migration 시 현재 8개 `raw-wrapper` membership은 `runtime-harness`, 2개 `client-host` membership은 transitional `legacy-client-host`로 옮긴다. `web-adapter`·`product-ui` taxonomy는 제거하고 실제 product integration만 `ayple-adapter`로 표현한다. Ticket 014가 old Host를 제거할 때 `legacy-client-host` membership을 삭제한다. 새 Connection·Runtime·adapter membership은 해당 owner의 모든 required unit·fake-child·live oracle가 `implemented`와 non-empty selector를 갖고 현재 gate가 통과한 Result-producing implementation checkpoint에서만 추가한다.

Validator는 unknown/removed method·tracer·case·evidence, direction collision, invalid enum/reference, duplicate integration, deferred coverage의 integration 승격, 빈 implemented evidence와 required prerequisite가 없는 product integration을 fail-closed한다. 새 upstream method는 자동으로 `schema-only`·`unreviewed`가 되며, direction-wide unsupported fallback 외의 semantic adoption을 상속하지 않는다. Explicit supported variant는 generic fallback을 해당 case에서만 좁힌다.

### 현재 상태를 target coverage와 분리한다

현재 ledger는 69개 sparse row에 `client-host` 2개, `raw-wrapper` 8개, integration 미기록 59개만 기록한다. 현재 fake child는 legacy transport semantics, 별도 fake App Server는 response-first delta flow, live smoke는 initialize/initialized만 증명한다. Completed AgentMessage, notification-first turn, T0-C interleaving, T0.1 once-only approval과 no-raw oracle은 아직 없다. 특히 legacy Server request test의 settled ID 순차 재사용은 Ticket 017의 process-lifetime lease와 충돌하므로 새 conformance evidence로 승격하지 않는다.

[Evidence asset의 method·non-method matrix](../assets/013-source-conformance-and-ledger-evidence.md#t0t0-ct01-oracle-assignment)를 T0/T0-C/T0.1 target coverage record로 채택하되 이번 design resolution에서는 decisions JSON, generated [method inventory](../../../architecture/codex-app-server-method-inventory.md), integration 또는 verification implementation을 변경하지 않는다. Coverage schema가 구현된 뒤 design checkpoint는 ledger에 `planned` coverage를 먼저 기록해 inventory를 재생성하고, implementation gate만 `implemented`와 integration membership을 승격한다.

### Generation과 drift check를 fail-safe하게 만든다

현재 generation은 tracked generated tree를 지운 뒤에야 version·ledger failure를 발견할 수 있고 inventory도 tracked path에 직접 쓴다. 후속 구현은 evidence asset의 safe pipeline을 acceptance로 가져간다.

1. Exact package pin, lock/platform package·integrity, package-owned launcher/native path와 `codex --version`, committed provenance·ledger reference를 tracked mutation 전에 preflight한다.
2. 새 staging A/B에서 stable TypeScript·JSON Schema와 experimental TypeScript, method roster와 inventory를 각각 두 번 만든다.
3. JSON object key와 safe-key schema set만 pinned upstream fixture와 같은 규칙으로 canonicalize하고, 의미가 있을 수 있는 array order는 보존한다. A/B normalized output이 다르면 실패한다.
4. `verify` mode는 staged output과 tracked output을 비교할 뿐 write/delete/rename을 하지 않는다.
5. `generate` mode는 모든 validation 뒤 stable generated tree와 inventory를 prevalidated two-target promotion으로 교체한다. 서로 다른 parent를 한 atomic rename이라고 부르지 않고 backup·rollback과 first/second replace failure injection을 증명한다.

일반 build/test는 submodule checkout이나 외부 network를 요구하지 않는다. Hermetic live job은 local mock Responses HTTP provider를 위한 loopback socket capability를 preflight하며 unavailable이면 silent skip하지 않고 실패한다. 이 redesign의 모든 resolved Wayfinder decision·후속 spec·implementation slice는 Source·Standards·Spec 독립 review를 받는다. Source semantic이 바뀌지 않은 checkpoint도 영향 없음과 evidence drift를 독립 판정하고, Runtime tracer implementation·semantic-change PR은 affected exact source/test 재판독과 unit·fake-child·hermetic live를 요구한다. Pin upgrade는 exact gitlink/provenance, stable·experimental two-run generation, method add/remove review, affected source/test 재판독, full unit·fake suite와 hermetic T0·T0-C representative path·T0.1 live, Source·Standards·Spec을 모두 요구한다.

### Product readiness를 runtime proof와 분리한다

실행 가능한 `AYPLE adapter`는 소비하는 method·non-method contract를 named runtime tracer case로 선언하고, required runtime integration과 모든 required oracle의 implemented selector, 현재 gate pass를 충족한 뒤에만 `ModelingInvocation`·`ModelingRun` mapping을 실행한다. Product test는 `CodexConversationRuntime` public surface를 통해 safe result mapping만 증명하며 actor를 직접 호출하거나 fake runtime success로 protocol proof를 대체하지 않는다.

Ticket 018이 첫 adapter tracer와 실제 prerequisite를 선택한다. Adapter가 concurrency를 요구할 때만 T0-C, command approval을 소비할 때만 T0.1을 prerequisite로 둔다. 이 ticket은 readiness predicate를 정의할 뿐 product use case나 dependency를 선결정하지 않는다.

### HITL audit

새로운 product 결정은 없다. Source-guided baseline, Connection → ConversationRuntime → AYPLE adapter seam, runtime-first gate와 inventory의 비권위성은 이미 승인되었다. 이 ticket은 그 승인을 executable evidence와 machine-readable coverage 규칙으로 구체화한다. Parser 구현 방식, promotion backup naming·cleanup deadline, local evidence selector 형식, exact cap default는 후속 spec/ticket의 package-private implementation detail이며 product 선택으로 올리지 않는다.

따라서 같은 seam이나 product dependency를 다시 묻지 않고 standing approval을 적용한다.

### Runtime-foundation scope recovery

후속 사용자 verdict에 따라 위 product-readiness 문단과 `ayple-adapter` integration·owner vocabulary는 future product ledger 확장을 위한 비활성 예약이며 현재 map의 completion, foundation promotion이나 implementation prerequisite가 아니다. Foundation checkpoint는 `app-server-connection`, `conversation-runtime`, `thread-actor`와 external `runtime-preparation` contract만 사용한다. 실제 product integration row가 없는 상태를 validator failure로 보지 않으며 Ticket 018은 [out-of-scope disposition](018-decide-first-ayple-adapter-tracer.md)으로 future product goal을 가리킨다.

같은 scope correction으로 세 root의 canonicalization·overlap·launcher capability를 소유하는 non-method owner 이름을 `product-runtime-layout`에서 `runtime-preparation`으로 바로잡는다. 이는 T0 prerequisite와 기존 oracle을 바꾸지 않고, 해당 contract가 Codex-native protocol semantics나 `CodexConversationRuntime` identity authority가 아니라는 기존 결정을 더 정확히 표현한다. Source-guided lifecycle, T0·T0-C·T0.1 coverage, planned/implemented promotion과 fail-safe generation 결정은 다시 열지 않는다.

### Scope correction 이전 review checkpoint

아래 review는 product-inclusive goal을 전제로 이 ticket을 처음 resolve했을 때의 역사적 결과다. 현재 runtime-foundation scope correction의 review 결과는 out-of-scope [첫 AY-PLE adapter tracer와 runtime readiness gate](018-decide-first-ayple-adapter-tracer.md)에 별도로 기록하며, 아래 `product readiness`·Ticket 018 ownership 판정을 current scope evidence로 사용하지 않는다.

- Source: 0 findings. Exact pin의 `thread/start` response-first, `turn/start` either-order, first-party FIFO buffering, command approval lifecycle와 schema canonicalization 근거가 authority matrix와 일치한다. Local mock live probe는 외부 network·hosted model이 아니라 loopback HTTP capability를 요구하며, required gate에서 unavailable이면 silent skip하지 않도록 정정했다.
- Standards: 0 findings. Connection wire outcome과 Runtime semantic outcome을 singular owner contract로 분리했고, 모든 required unit·fake-child·live oracle의 implemented selector와 현재 pass 전에는 integration을 승격하지 않는다. `not-required` verification discriminant, 한국어 일반 설명어, design-only/generated ownership과 local link·JSON 예시도 검증했다.
- Spec: 0 findings. T0.1 delta의 validate-and-discard와 `error` non-authority coverage, 모든 goal checkpoint의 Source·Standards·Spec review, product readiness와 Ticket 018 ownership이 Ticket 008–012·017 및 상위 goal에 정렬된다. Decisions JSON·generated inventory·integration status는 변경하지 않았다.

남은 risk는 T0-C package-binary A/B barrier와 T0.1 cross-platform command trigger, ledger parser 형식, promotion crash recovery, local evidence selector, exact count/UTF-8 byte cap을 아직 executable implementation으로 검증하지 않았다는 점이다. 이는 미결정 product policy가 아니라 후속 spec·implementation ticket이 소유할 명시적 acceptance다.
