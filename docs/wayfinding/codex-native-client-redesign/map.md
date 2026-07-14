# Codex-native Client Redesign

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

Pinned OpenAI Codex의 method별 observable lifecycle·identity·ownership을 TypeScript external App Server client로 source-guided port하고, 검증된 runtime capability 위에만 AY-PLE 기능을 올리는 implementation-ready `Codex-native Client Baseline` spec을 작성할 수 있는 상태를 만든다. Spec은 ADR 0008의 replacement decision과 기존 Host 제거·선별 재사용 계획을 포함한다.

## Notes

- 기존 `HeadlessCodexClientHost` Interface와 state machine은 현재까지 확인한 바로는 prototype·evidence이며, durable consumer audit에서 반대 근거가 발견되지 않는 한 compatibility target으로 삼지 않는다. 새 설계가 확정된 뒤 필요한 lower primitive만 선별 재사용한다.
- `openai/codex` source는 [Upstream source provenance를 장기 검증 가능하게 pin한다](tickets/003-pin-upstream-source-provenance.md)의 결정에 따라 `references/openai-codex`의 attested exact commit에 pin하되 runtime과 일반 `npm test`/`build`의 dependency로 만들지 않는다.
- Pinned generated schema는 exact wire shape, 같은 version의 Rust source·tests는 method별 ordering·identity authority·state transition과 first-party handling, live probe는 scheduler·external stdio interleaving의 관찰 근거를 소유한다. Inventory만으로 protocol semantics를 추론하지 않는다.
- Baseline은 Rust의 줄 단위 복제가 아니라 현재 tracer가 채택한 method의 observable semantics를 source-guided port한다. `CodexAppServerConnection`은 child·JSONL·schema·envelope·exact demux·process loss, `CodexConversationRuntime`은 native identity·per-thread owner·method lifecycle, `AYPLE adapter`는 three-root product policy·safe projection·`ModelingInvocation`·browser UX를 소유한다.
- 현재 generated [Codex App Server method inventory](../../architecture/codex-app-server-method-inventory.md)는 method 존재와 global integration/adoption만 보여 주고, [`codex-method-decisions.json`](../../../packages/runtime-codex/codex-method-decisions.json)은 `integration/adoption/note`만 허용한다. 후속 conformance·migration decision은 이 source를 method별 tracer·owner·source evidence·verification 상태까지 검증하는 coverage ledger로 확장하고 `client-host` taxonomy를 교체한 뒤 package workflow로 inventory를 재생성한다. Generated Markdown은 직접 수정하지 않는다.
- Product intent와 policy의 authority는 AY-PLE Product Brief·`CONTEXT.md`·ADR 0005–0007이다. Product 문서가 protocol fact를 재정의하거나 protocol 구현 편의가 product policy를 결정하지 않는다. Pinned source/test baseline으로 실제 제품 use case를 충족할 수 없을 때만 owning adapter가 더 강한 AY-PLE 동작을 추가하고 deviation·근거·pin upgrade cost를 ADR/spec에 명시한다.
- `CodexAppServerConnection`, `CodexConversationRuntime`, `ThreadId` 등은 implementation·protocol 용어이며 `CONTEXT.md`의 AY-PLE 제품 도메인 용어로 추가하지 않는다.
- Product adapter implementation은 소비하는 runtime method roster가 schema·pinned source/test·fake child와 필요한 live binary gate를 통과하고 ledger에 기록된 뒤에만 시작한다.
- Wayfinder는 결정과 조사만 소유한다. 코드 제거·구현은 resulting spec과 `/to-tickets` 이후에 `/implement`로 수행한다.
- 승인된 Connection → ConversationRuntime → AYPLE adapter seam을 후속 ticket이 다시 generic Host 설계로 대체하지 않는다. Superseding ADR 뒤에는 architecture readiness review를 통과해야 `/to-spec`으로 넘어간다.
- 각 resolved Wayfinder decision, `/to-spec` 결과와 각 implementation slice는 Source·Standards·Spec을 독립 리뷰하고 blocking finding을 owning artifact로 환류한다. Coverage schema가 구현되기 전 method design checkpoint는 current inventory row와 target tracer·adoption·owner·evidence를 owning ticket에 기록한다. Schema가 준비된 뒤의 design checkpoint는 이 판단을 decisions JSON에 먼저 반영하고 inventory를 재생성하되 integration을 유지하며, implementation checkpoint만 통과한 gate에 맞춰 integration과 implemented verification을 승격한다. `/to-spec`은 이 review를 통과한 뒤에만 `/to-tickets`로 넘긴다.

## Decisions so far

- [기존 evidence와 재설계 기준점을 보존한다](tickets/001-preserve-evidence-and-establish-fixed-point.md) — Ticket 004와 source research는 fork archive refs로 고정하고, active redesign은 shared `f335333f` tree에서 Wayfinder만 가져와 시작한다.
- [기존 Host consumer와 compatibility constraint를 감사한다](tickets/002-audit-host-consumers-and-compatibility.md) — Durable Host consumer는 0개이므로 기존 Interface/ref/event oracle은 호환성 없이 제거할 수 있고, 실제 Runtime Harness와 상위 architecture invariant만 보호한다.
- [Upstream source provenance를 장기 검증 가능하게 pin한다](tickets/003-pin-upstream-source-provenance.md) — npm root·platform SLSA attestation이 가리키는 exact commit을 dev-only `references/openai-codex` gitlink와 package-owned provenance manifest·generated digest에 연결하고, 일반 Node workflow와 explicit source/upgrade gate를 분리한다.
- [Pinned method lifecycle 근거표를 만든다](tickets/004-build-method-lifecycle-fact-table.md) — 현재 공식 문서, stable generated shape, exact-pin implementation·test와 추론을 분리해 native-scope lifecycle 사실을 고정하고 concurrency·delivery·capability·recovery 정책은 후속 decision ticket에 남긴다.
- [Connection·App Server ingress architecture pattern을 지도화한다](tickets/005-map-first-party-rust-architecture-patterns.md) — Exact pin의 production client에는 stdio child adapter가 없으므로 AY-PLE은 external process lifecycle을 소유하되 single ingress·exact demux·request/event 분리만 source-grounded pattern으로 채택하고 bounds·terminal·consumer seam은 후속 tracer·policy로 남긴다.
- [Core·TUI·exec conversation ownership pattern을 지도화한다](tickets/006-map-first-party-conversation-ownership.md) — First-party shared kernel을 가정하지 않고 native thread/session scope·per-thread ownership·surface projection·조건부 history와 독립 lifetime을 설계 입력으로 채택하며 exact seam·identity·delivery·cleanup policy는 후속 decision ticket에 남긴다.
- [Protocol·Rust source evidence의 정렬 상태를 리뷰한다](tickets/007-review-source-evidence-alignment.md) — 세 evidence asset은 exact pin에 추적 가능하고 public·version-specific·live·product 권위를 분리하며 Source·Standards·Spec review를 통과해 첫 tracer와 module seam을 결정하기에 충분하다.
- [첫 tracer와 module seam을 선택한다](tickets/008-choose-first-tracer-and-module-seams.md) — 최종 구조의 첫 conformance slice로 T0를 선택하고 Connection → ConversationRuntime → AYPLE adapter seam, source-guided method port, inventory-led coverage와 T0.1 command approval tracer를 채택한다.
- [Native identity authority와 lifetime을 결정한다](tickets/009-decide-identity-and-authority.md) — Codex native identity를 authority로, persistent thread의 Codex-owned rollout/history가 제공되는 범위를 durable source로 유지하고 process-scoped `ThreadActor`만 live projection으로 두며, 별도 catalog·remap·generation invalidation 없이 ephemeral·history availability와 method별 identity 계약은 해당 tracer에서 확장한다.
- [Thread·turn concurrency 정책을 결정한다](tickets/010-decide-concurrency-policy.md) — Connection ingress·RPC는 global semantic mutex 없이 진행하고 Runtime은 native `ThreadId`별 independent `ThreadActor`를 두며, same-thread active input은 explicit `turn/steer` tracer로 채택하고 cross-thread public independence는 별도 `T0-C` gate로 검증한다.
- [Event delivery와 transcript recovery model을 결정한다](tickets/011-decide-delivery-and-recovery-model.md) — T0/T0-C/T0.1 adopted observation은 lossless-to-owner-or-explicit-failure로 처리하고 finite pre-admission bounds·process-attachment compact actor·method-specific duplicate policy로 scope-local failure를 격리하며 native history recovery와 browser replay는 owning tracer로 미룬다.
- [Connection loss와 unknown outcome 정책을 결정한다](tickets/012-decide-connection-and-unknown-outcome-policy.md) — Pre-wire·write-attempted·response-confirmed·semantic-settled authority를 분리해 non-idempotent unknown outcome을 replay하지 않고, thread-local sink·tail-aware terminal cut·bounded response tombstone·child reap의 precedence를 확정한다.

## Not yet specified

- 첫 conversation tracer 이후 browser transport의 정확한 형태

## Out of scope

- ACP 또는 두 번째 Agent engine을 위한 범용 abstraction
- 완성된 Account·approval·toolbar·transcript UI와 모든 Server request variant
- 자동 restart·mutation replay·범용 reconciliation framework
- Wayfinder 단계에서의 기존 Host 코드 제거 또는 replacement implementation
- Runtime Harness의 기존 `AgentRuntimeKernel`, `CodexRuntimeAdapter`, Inspector와 Runtime Diagnostic History 재설계

## Resulting spec

아직 작성하지 않았다.
