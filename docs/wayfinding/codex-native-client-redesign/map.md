# Codex-native Client Redesign

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

Pinned OpenAI Codex의 method별 observable lifecycle·identity·ownership을 TypeScript external App Server client로 source-guided port해 `CodexAppServerConnection → CodexConversationRuntime` runtime foundation을 구현할 수 있는 spec을 작성한다. Spec은 T0·T0-C·T0.1 conformance, 미래 multi-turn·streaming·control·resume·activity tracer를 막지 않는 Interface, ADR 0008 replacement와 기존 Host 제거·선별 재사용 계획을 포함한다.

## Notes

- 기존 `HeadlessCodexClientHost` Interface와 state machine은 현재까지 확인한 바로는 prototype·evidence이며, durable consumer audit에서 반대 근거가 발견되지 않는 한 compatibility target으로 삼지 않는다. 새 설계가 확정된 뒤 필요한 lower primitive만 선별 재사용한다.
- `openai/codex` source는 [Upstream source provenance를 장기 검증 가능하게 pin한다](tickets/003-pin-upstream-source-provenance.md)의 결정에 따라 `references/openai-codex`의 attested exact commit에 pin하되 runtime과 일반 `npm test`/`build`의 dependency로 만들지 않는다.
- Pinned generated schema는 exact wire shape, Python `sdk/python/openai_codex`는 external stdio client lifecycle, Rust `codex-app-server-client`는 typed active routing, TUI `ThreadEventStore`·pending request는 per-thread projection과 interaction lifecycle, method source·tests는 ordering·identity authority·state transition, live probe는 scheduler·external stdio interleaving의 관찰 근거를 소유한다. Inventory만으로 protocol semantics를 추론하지 않는다.
- 기준선은 protocol shape에서 새 state machine을 발명하거나 Rust/Python을 줄 단위로 복제하는 것이 아니라 first-party client/UI의 responsibility와 observable behavior를 TypeScript external stdio Seam에 source-guided port하는 것이다. Production dependency direction은 child·JSONL·schema·envelope·active exact demux·process loss를 소유하는 `CodexAppServerConnection`에서 native identity·per-thread projection·method lifecycle을 소유하는 `CodexConversationRuntime`까지다.
- 현재 generated [Codex App Server method inventory](../../architecture/codex-app-server-method-inventory.md)는 method 존재와 global integration/adoption만 보여 주고, [`codex-method-decisions.json`](../../../packages/runtime-codex/codex-method-decisions.json)은 `integration/adoption/note`만 허용한다. Ticket 013은 이를 method·non-method tracer, owner, source evidence와 unit·fake·live verification을 검증하는 versioned coverage ledger로 확장하고 `client-host` taxonomy를 교체하는 schema·gate를 결정했다. 후속 spec·implementation이 package workflow를 구현해 inventory를 재생성하며 generated Markdown은 직접 수정하지 않는다.
- Three-root validation과 launcher `cwd` 같은 기존 AY-PLE layout primitive는 external preparation·harness capability로 선별 재사용할 수 있지만 `CodexConversationRuntime`의 protocol semantics나 native identity authority가 아니다.
- `CodexAppServerConnection`, `CodexConversationRuntime`, `ThreadId` 등은 implementation·protocol 용어이며 `CONTEXT.md`의 AY-PLE 제품 도메인 용어로 추가하지 않는다.
- AY-PLE adapter·browser/product consumer, `ModelingInvocation`/`ModelingRun`, Recipe와 product-specific sandbox·approval policy는 foundation이 구현·검증된 뒤 별도 goal/map에서 결정한다. 현재 map의 semantic owner, readiness prerequisite와 blocking decision이 아니다.
- Wayfinder는 결정과 조사만 소유한다. 코드 제거·구현은 resulting spec과 `/to-tickets` 이후에 `/implement`로 수행한다.
- 승인된 `CodexAppServerConnection → CodexConversationRuntime` seam을 후속 ticket이 다시 generic Host state machine이나 one-shot product abstraction으로 대체하지 않는다. Superseding ADR 뒤에는 architecture readiness review를 통과해야 `/to-spec`으로 넘어간다.
- 각 resolved Wayfinder decision, `/to-spec` 결과와 각 implementation slice는 Source·Standards·Spec을 독립 리뷰하고 blocking finding을 owning artifact로 환류한다. Coverage schema가 구현되기 전 method design checkpoint는 current inventory row와 target tracer·adoption·owner·evidence를 owning ticket에 기록한다. Schema가 준비된 뒤의 design checkpoint는 이 판단을 decisions JSON에 먼저 반영하고 inventory를 재생성하되 integration을 유지하며, implementation checkpoint만 통과한 gate에 맞춰 integration과 implemented verification을 승격한다. `/to-spec`은 이 review를 통과한 뒤에만 `/to-tickets`로 넘긴다.

## Decisions so far

- [기존 evidence와 재설계 기준점을 보존한다](tickets/001-preserve-evidence-and-establish-fixed-point.md) — Ticket 004와 source research는 fork archive refs로 고정하고, active redesign은 shared `f335333f` tree에서 Wayfinder만 가져와 시작한다.
- [기존 Host consumer와 compatibility constraint를 감사한다](tickets/002-audit-host-consumers-and-compatibility.md) — Durable Host consumer는 0개이므로 기존 Interface/ref/event oracle은 호환성 없이 제거할 수 있고, 실제 Runtime Harness와 상위 architecture invariant만 보호한다.
- [Upstream source provenance를 장기 검증 가능하게 pin한다](tickets/003-pin-upstream-source-provenance.md) — npm root·platform SLSA attestation이 가리키는 exact commit을 dev-only `references/openai-codex` gitlink와 package-owned provenance manifest·generated digest에 연결하고, 일반 Node workflow와 explicit source/upgrade gate를 분리한다.
- [Pinned method lifecycle 근거표를 만든다](tickets/004-build-method-lifecycle-fact-table.md) — 현재 공식 문서, stable generated shape, exact-pin implementation·test와 추론을 분리해 native-scope lifecycle 사실을 고정하고 concurrency·delivery·capability·recovery 정책은 후속 decision ticket에 남긴다.
- [Connection·App Server ingress architecture pattern을 지도화한다](tickets/005-map-first-party-rust-architecture-patterns.md) — Rust/npm에는 reusable TypeScript stdio client가 없지만 exact pin의 Python external stdio client가 있다. External process lifecycle을 소유하면서 Python sole reader·serialized writer·active demux·early FIFO·disconnect settlement과 Rust typed facade를 port 기준선으로 채택한다.
- [Core·TUI·exec conversation ownership pattern을 지도화한다](tickets/006-map-first-party-conversation-ownership.md) — First-party shared generic kernel을 가정하지 않고 native scope·per-thread projection·surface별 state를 채택한다. TUI active store/pending map은 locality와 remove-on-resolution 근거이지 actor/mailbox·process-lifetime retention invariant가 아니다.
- [Protocol·Rust source evidence의 정렬 상태를 리뷰한다](tickets/007-review-source-evidence-alignment.md) — 세 evidence asset은 exact pin에 추적 가능하고 public·version-specific·live·product 권위를 분리하며 Source·Standards·Spec review를 통과해 첫 tracer와 module seam을 결정하기에 충분하다.
- [첫 tracer와 module seam을 선택한다](tickets/008-choose-first-tracer-and-module-seams.md) — 최종 runtime 구조의 첫 conformance slice로 T0를 선택하고 Connection → ConversationRuntime seam, source-guided method port, inventory-led coverage와 T0.1 command approval tracer를 채택한다. 당시 함께 적힌 product adapter boundary는 현재 foundation destination 밖이다.
- [Native identity authority와 lifetime을 결정한다](tickets/009-decide-identity-and-authority.md) — Codex native identity를 authority로, persistent thread의 Codex-owned rollout/history가 제공되는 범위를 durable source로 유지하고 process-local live projection만 두며, 별도 catalog·remap·generation invalidation 없이 ephemeral·history availability와 method별 identity 계약은 해당 tracer에서 확장한다. Actor는 package-private 구현 선택이다.
- [Thread·turn concurrency 정책을 결정한다](tickets/010-decide-concurrency-policy.md) — Connection ingress·RPC는 global semantic mutex 없이 진행하고 Runtime은 native `ThreadId`별 independent projection을 두며, same-thread active input은 explicit `turn/steer` tracer로 채택하고 cross-thread public independence는 별도 `T0-C` gate로 검증한다.
- [Event delivery와 transcript recovery model을 결정한다](tickets/011-decide-delivery-and-recovery-model.md) — Method-specific early FIFO, authoritative terminal, per-thread independence와 finite resource는 유지한다. Process-lifetime compact actor/tombstone, permanent poison·contradiction lattice는 Ticket 019가 supersede했으며 active route cleanup과 단순 멱등 처리를 기준선으로 둔다.
- [Connection loss와 unknown outcome 정책을 결정한다](tickets/012-decide-connection-and-unknown-outcome-policy.md) — 현재 pending settlement, request/turn-local outcome evidence, close/reap과 blind mutation retry 금지는 유지한다. Lifetime response tombstone, late/unknown global terminal, actor sink/poison과 tail-aware global semantic lattice는 Ticket 019가 supersede했다.
- [Source conformance verification matrix를 결정한다](tickets/013-decide-source-conformance-verification.md) — Generated shape, exact-pin source/tests, unit, fake child와 live binary의 authority를 분리하고 versioned coverage ledger, fail-safe generation·drift check와 planned/implemented promotion gate를 확정한다.
- [commandExecution approval의 첫 round-trip을 결정한다](tickets/017-decide-command-execution-approval-round-trip.md) — T0.1 regular approval의 original Server `RequestId` active lease, native scope, remove-on-answer/resolved/turn-transition/disconnect와 no automatic decision을 유지한다. Lifetime seen-ID/tombstone과 conflicting reuse poison은 Ticket 019가 supersede했다.
- [기존 Host 제거와 선별 재사용 계획을 확정한다](tickets/014-plan-host-removal-and-selective-salvage.md) — 새 Connection·Runtime을 legacy 옆에서 ledger-safe gate로 구현한 뒤 T0·T0-C·T0.1이 green일 때 Host/transport legacy surface와 self-oracle을 forward-remove한다. Generated/schema/layout/JSONL primitive는 추출·개조하고 RawClient/fake App Server는 developer Harness에 보존한다.
- [ADR 0008을 대체할 architecture decision을 기록한다](tickets/015-record-superseding-architecture-decision.md) — ADR 0010으로 Connection → ConversationRuntime 운영 Seam과 first-party client behavior port 원칙을 채택하고, 기존 Host는 호환성 없이 역사화하며 제품 adapter는 foundation 준비 조건 밖에 둔다.
- [First-party client 근거로 port와 재사용 계획을 교정한다](tickets/019-correct-first-party-client-port-and-reuse.md) — Python external stdio client, Rust facade와 TUI projection/pending lifecycle을 주요 동작 근거로 보완하고 현재 code를 보존·추출/개조·Harness 전용·제거로 분류했다. Lifetime tombstone·permanent poison·global semantic arbiter를 기준선에서 제거했다.

## Not yet specified

- 없음. 남은 범위 내 작업은 Ticket 016의 architecture readiness 검토로 구체화되어 있다.

## Out of scope

- ACP 또는 두 번째 Agent engine을 위한 범용 abstraction
- [첫 AY-PLE adapter tracer와 runtime readiness gate](tickets/018-decide-first-ayple-adapter-tracer.md), Assignment·RawMaterialRef·`ModelingInvocation`/`ModelingRun`·Recipe·StatePatch·Review, product-specific sandbox·approval policy와 browser UX
- Multi-turn, streaming, interrupt/steer, `thread/read`·`thread/resume`, activity projection과 T0.1 밖 Server request의 구현. Foundation Interface는 이 후속 source-guided tracer를 불필요하게 막지 않아야 한다.
- 완성된 Account·approval·toolbar·transcript UI와 모든 Server request variant
- 자동 restart·mutation replay·범용 reconciliation 체계. Source를 따르는 `thread/read`·`thread/resume` tracer가 explicit reconciliation을 후속 채택하는 것은 금지하지 않는다.
- Wayfinder 단계에서의 기존 Host 코드 제거 또는 replacement implementation
- Runtime Harness의 기존 `AgentRuntimeKernel`, `CodexRuntimeAdapter`, Inspector와 Runtime Diagnostic History 재설계

## Resulting spec

아직 작성하지 않았다.
