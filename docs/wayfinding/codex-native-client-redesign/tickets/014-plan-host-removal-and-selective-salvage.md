# 014 — 기존 Host 제거와 선별 재사용 계획을 확정한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [기존 evidence와 재설계 기준점을 보존한다](001-preserve-evidence-and-establish-fixed-point.md), [기존 Host consumer와 compatibility constraint를 감사한다](002-audit-host-consumers-and-compatibility.md), [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md), [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md), [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)

## Question

Current integration history와 native Codex app-data를 훼손하지 않으면서 기존 `HeadlessCodexClientHost` Interface·implementation·root export·전용 fake/test oracle과 ignored stale `dist/` output을 어떤 순서로 forward-remove할 것인가? ADR 0008의 replacement decision 자체는 [ADR 0008을 대체할 architecture decision을 기록한다](015-record-superseding-architecture-decision.md)에 남기고, old spec/tickets·package README·implementation map·backlog/index를 code removal/replacement와 함께 정합화할 staged migration plan은 무엇인가?

기존 layout·transport·schema·cleanup asset은 external preparation·harness capability, `CodexAppServerConnection`의 child·JSONL·schema·exact demux·cleanup, `CodexConversationRuntime`의 채택된 native lifecycle·correlation으로 목적지를 명시해 선별 이식한다. Three-root layout이나 launcher `cwd`를 Runtime protocol semantics로 만들지 않는다. Host generation/ref/global event와 전용 oracle policy는 compatibility target으로 보존하지 않으며 product mapping과 `AYPLE adapter`는 이번 migration plan 밖이다. Method taxonomy는 decisions JSON을 먼저 migration하고 generated inventory를 재생성하며 `client-host` claim과 global adoption을 row별로 재검토한다. Generated inventory는 직접 수정하지 않고, destructive generation gap을 해결한 안전한 command만 사용한다.

## Ticket 016에서 다시 연 범위

두 번째 architecture readiness review에서 이 ticket이 채택한 [migration plan](../assets/014-host-removal-and-selective-salvage-plan.md)의 교정 배너와 active 본문이 충돌한다는 Standards P2가 발견됐다. 배너는 process-lifetime tombstone·permanent poison·장기 actor retention을 supersede하지만, invariant·surface disposition·legacy replacement·Stage 2·Stage 3·verification gate는 같은 정책을 현재 명령으로 계속 요구한다.

다음 session은 git history를 reset하거나 기존 evidence를 삭제하지 않고 migration plan을 forward-amend한다.

- Active table·Stage·gate의 기준선을 direction-aware active exact routing, method-specific bounded early FIFO, native thread별 projection, active Server request remove-on-resolution과 disconnect 시 current-pending settlement로 통일한다.
- Process-lifetime response/Server ID tombstone, late sink, permanent actor poison, process 종료까지의 actor retention과 conflicting reuse global failure를 current requirement와 oracle에서 제거한다.
- Actor/mailbox는 package-private implementation 선택으로만 남기고 public migration invariant나 retention gate로 고정하지 않는다.
- Ticket 019의 code-unit 네 분류와 ADR 0010을 유일한 current correction으로 반영해 상단 배너에만 의존하지 않게 한다. 구 계획을 설명할 필요가 있으면 명시적인 역사 문맥으로 격리한다.
- 변경 범위를 Source·Standards·Spec으로 다시 독립 검토하고, 같은 종류의 stale oracle이 current migration contract에 남지 않았는지 확인한다.

## Answer

[기존 Host 제거와 선별 재사용 migration plan](../assets/014-host-removal-and-selective-salvage-plan.md)을 이 ticket의 실행 순서와 gate로 채택한다.

> **Ticket 019 교정:** Replace-don't-layer, durable Host consumer 0, Runtime Harness·native app-data 보호와 generated/schema/layout/JSONL primitive의 선별 이식은 유지한다. Process-lifetime late sink/tombstone, permanent actor poison과 long-lived actor retention은 migration gate에서 제거한다. `CodexStdioTransport`는 class로 재사용하지 않고 child·sole reader·exact typed ID·validator·cleanup primitive와 test intent만 새 Connection으로 추출한다. `CodexRawClient`·기존 fake App Server는 developer Runtime Harness에만 보존하고, Host·fake Host·root export는 새 conformance가 green일 때 compatibility 없이 제거한다. 현재 code-unit 처리 방침은 [first-party client port 감사](../assets/019-first-party-client-port-and-reuse-audit.md)가 소유한다.

### Replace-not-layer로 진행한다

기존 `HeadlessCodexClientHost`, `ProductRuntimeLayout`, `CodexStdioTransport` Interface를 새 foundation의 계층으로 유지하거나 compatibility facade로 감싸지 않는다. 새 `CodexAppServerConnection`과 `CodexConversationRuntime`을 legacy 경로와 병행 구현하고 source conformance를 통과시킨 뒤 legacy surface를 한 방향으로 제거한다.

| 처리 방침 | 대상 |
| --- | --- |
| 반드시 보존 | External appData와 repository `.ay-ple/runtime-codex`의 native state·rollout/history·native identity, `CodexRawClient`·`CodexRuntimeAdapter`·Runtime Harness Interface/history/Inspector, `withFakeCodexAppServer`, generated schema와 pinned provenance |
| Primitive 단위로 재검증해 이식 | Root canonicalization·containment·overlap, package binary/pin·runtime-home preparation, exact typed ID parser, generated validator wiring, child/JSONL/kill·reap mechanics와 actual-child journal/temp cleanup pattern |
| 새 contract로 교체 | External prepared process/workspace 분리, single ingress와 direction-aware exact active demux, single serialized outbound JSONL writer/arbiter, current-pending disconnect settlement, 유한 용량 제한, method-specific early FIFO와 per-thread projection, active Server `RequestId` remove-on-resolution lease |
| Compatibility 없이 제거 | Host generation/ref/global sequence/subscription/failure policy, Host root export·전용 fake/test, old observation queue/timeout/`dismiss()`/Server ID reuse semantics, ignored stale package `dist` output |

### 이전 순서를 고정한다

1. Coverage ledger v2와 tracked output을 건드리기 전에 실패하는 safe `verify`/A-B staged generation/two-target promotion을 먼저 구현한다.
2. Current 8개 `raw-wrapper`를 `runtime-harness`, 2개 `client-host`를 transitional `legacy-client-host`로 옮기고 T0·T0-C·T0.1 coverage를 `planned`로 기록한다. 모든 sparse row의 adoption·note는 row별 evidence로 유지/변경 사유를 남기며 product-driven/non-tracer row를 foundation readiness로 승격하지 않는다.
3. External AY-PLE `runtime-preparation`/harness capability와 새 `CodexAppServerConnection`을 legacy 옆에 구현한다. Production direction은 Connection → Runtime이며 기존 transport class는 implementation base가 아니라 extraction evidence다.
4. Native identity·per-thread actor를 가진 `CodexConversationRuntime`과 T0를 구현한다. Stage별로 통과한 verification selector만 먼저 `implemented`로 기록한다.
5. T0-C와 T0.1을 공통 T0 뒤의 sibling tracer로 구현한다. T0-C는 `./conversation` public surface에서 cross-thread independence를 증명한 뒤 transitional public max-one slot을 native thread별 reservation으로 교체한다. 둘 다와 full repository regression이 green이 된 뒤 Host/layout/transport legacy surface와 self-oracle을 제거하고 `legacy-client-host` membership을 0으로 만든다.
6. Caller target을 받지 않고 exact package `dist`만 허용하는 guarded clean-build를 사용한다. Development condition 없이 root·`./testing`·`./capabilities`·Ticket 008이 확정한 `./conversation`을 import해 removed symbol이 0인지 확인한다. Root `git clean -x/-X`, repository `.ay-ple`와 external native app-data는 clean 대상으로 삼지 않는다.

각 implementation checkpoint의 decisions JSON 변경이 generated inventory보다 먼저다. Planned design record나 단일 tracer의 부분 통과는 integration을 승격하지 않으며, row/surface별 모든 required selector가 implemented이고 현재 applicable gate가 통과한 Result checkpoint만 `app-server-connection`·`conversation-runtime` membership을 추가한다.

### 문서 reconciliation의 owner와 시점을 분리한다

- Ticket 015가 superseding runtime ADR과 ADR 0008의 historical disposition, ADR index 정렬을 소유한다.
- Old spec은 새 결정의 source로 개조하거나 이동하지 않는다. 미구현 Tickets 004–010은 `wontfix`, `Next actor: none`으로 닫고 Tickets 001–003의 `completed` evidence는 보존한다. `/to-spec`·`/to-tickets` 뒤 exact replacement link를 보강한다.
- Package README와 implementation map은 각 implementation slice의 실제 공존/구현 상태를, development backlog는 runtime foundation과 future product work의 순서를 소유한다. Current가 아닌 target을 구현 완료처럼 쓰지 않는다.
- AY-PLE adapter, browser transport, product policy와 첫 product tracer는 이 migration DAG와 readiness condition 밖이다.

### HITL audit

추가 사용자 결정은 필요 없다. Durable Host consumer 0, source-guided Connection → Runtime seam, runtime-first T0·T0-C·T0.1, product scope defer와 ledger promotion rule은 이미 승인된 결정을 구체화한다. Exact file/type 이름, cap default와 implementation ticket split은 resulting spec이 이 plan 안에서 정할 package-private 세부사항이다.

### Review checkpoint

- Source: 0 findings. Connection → Runtime ownership, public T0 → T0-C admission 전환, method별 ordering/convergence, single outbound arbiter와 original `RequestId` lease, validation tier, unknown outcome·terminal cut, finite Connection bound, pre-wire actor-registry/operation admission과 per-observation actor-local charge의 분리가 Tickets 008–013/017 및 pinned-source evidence와 정렬된다.
- Standards: 0 findings. Replace-not-layer plan은 durable consumer 0이라는 code reality와 singular owner를 보존하고, Runtime Harness·fake App Server 보호, old stdio re-export만의 제거, typed conformance fake의 build/typecheck 편입, exact package `dist` clean·native-state sentinel·default-condition export gate를 빠짐없이 기록한다.
- Spec: 0 findings. Production direction을 Connection → Runtime으로 한정하고 external AY-PLE preparation/harness와 product work를 readiness 밖에 두며, adoption row-by-row audit, safe ledger/generator 선행, T0·T0-C·T0.1 뒤 legacy removal과 documentation owner 순서가 Ticket 014와 runtime-foundation scope를 충족한다.

Review fixed point는 `c0280d94f405804a900a12075c3fb49135538633`이며 claim commit과 current Ticket 014 diff를 독립 검토했다. Review 중 발견한 writer 범위, validator tier, capacity, promotion timing, `./conversation`, fake/export/clean과 adoption ownership 누락은 owning asset과 Answer에 환류한 뒤 각 축을 재검토했다.

남은 risk는 exact exported symbol, cap default, safe generator/clean helper와 tracer split이 아직 executable spec/code로 검증되지 않았다는 점이다. 이는 새 architecture 결정이 아니라 Ticket 016 이후 resulting spec·implementation ticket이 이 plan의 gate로 구체화할 범위다.
