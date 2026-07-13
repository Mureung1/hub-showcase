# Codex-native Client Redesign

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

Pinned OpenAI Codex의 실제 App Server client·core·TUI/exec 구조와 AY-PLE 제품 용례에 근거한 module seam을 채택하고, ADR 0008을 대체할 결정과 기존 Host 제거·선별 재사용 계획이 포함된 implementation-ready `Codex-native Client Baseline` spec을 작성할 수 있는 상태를 만든다.

## Notes

- 기존 `HeadlessCodexClientHost` Interface와 state machine은 현재까지 확인한 바로는 prototype·evidence이며, durable consumer audit에서 반대 근거가 발견되지 않는 한 compatibility target으로 삼지 않는다. 새 설계가 확정된 뒤 필요한 lower primitive만 선별 재사용한다.
- `openai/codex` source는 [Ticket 003 결정](tickets/003-pin-upstream-source-provenance.md)에 따라 `references/openai-codex`의 attested exact commit에 pin하되 runtime과 일반 `npm test`/`build`의 dependency로 만들지 않는다.
- Protocol semantics의 authority는 pinned binary generated schema·공식 문서이며, 같은 버전의 pinned Rust source·tests는 version-specific implementation fact, live probe는 scheduler·stdio interleaving의 관찰 근거를 소유한다.
- Product intent와 policy의 authority는 AY-PLE Product Brief·`CONTEXT.md`·ADR 0005–0007이다. Product 문서가 protocol fact를 재정의하거나 protocol 구현 편의가 product policy를 결정하지 않으며, 더 강한 AY-PLE 동작은 owning adapter의 명시적 deviation ADR/spec으로 기록한다.
- `CodexAppServerClient`, `ConversationWorkspace`, `ThreadId` 등은 implementation·protocol 용어이며 `CONTEXT.md`의 AY-PLE 제품 도메인 용어로 추가하지 않는다.
- Wayfinder는 결정과 조사만 소유한다. 코드 제거·구현은 resulting spec과 `/to-tickets` 이후에 `/implement`로 수행한다.
- Method fact table과 first-party architecture pattern 조사 완료 후에는 source evidence alignment review를 통과해야 module seam을 결정할 수 있다. Superseding ADR 뒤에는 architecture readiness review를 통과해야 `/to-spec`으로 넘어간다.
- `/to-spec` 결과는 source conformance와 repository Spec/Standards를 병렬 리뷰하고 blocking finding을 owning Wayfinder ticket으로 환류한 뒤에만 `/to-tickets`로 넘긴다. 구현 slice는 각 ticket 완료 전 two-axis Standards/Spec review를 거친다.

## Decisions so far

- [기존 evidence와 재설계 기준점을 보존한다](tickets/001-preserve-evidence-and-establish-fixed-point.md) — Ticket 004와 source research는 fork archive refs로 고정하고, active redesign은 shared `f335333f` tree에서 Wayfinder만 가져와 시작한다.
- [기존 Host consumer와 compatibility constraint를 감사한다](tickets/002-audit-host-consumers-and-compatibility.md) — Durable Host consumer는 0개이므로 기존 Interface/ref/event oracle은 호환성 없이 제거할 수 있고, 실제 Runtime Harness와 상위 architecture invariant만 보호한다.
- [Upstream source provenance를 장기 검증 가능하게 pin한다](tickets/003-pin-upstream-source-provenance.md) — npm root·platform SLSA attestation이 가리키는 exact commit을 dev-only `references/openai-codex` gitlink와 package-owned provenance manifest·generated digest에 연결하고, 일반 Node workflow와 explicit source/upgrade gate를 분리한다.
- [Pinned method lifecycle 근거표를 만든다](tickets/004-build-method-lifecycle-fact-table.md) — 현재 공식 문서, stable generated shape, exact-pin implementation·test와 추론을 분리해 native-scope lifecycle 사실을 고정하고 concurrency·delivery·capability·recovery 정책은 후속 decision ticket에 남긴다.
- [Connection·App Server ingress architecture pattern을 지도화한다](tickets/005-map-first-party-rust-architecture-patterns.md) — Exact pin의 production client에는 stdio child adapter가 없으므로 AY-PLE은 external process lifecycle을 소유하되 single ingress·exact demux·request/event 분리만 source-grounded pattern으로 채택하고 bounds·terminal·consumer seam은 후속 tracer·policy로 남긴다.

## Not yet specified

- 첫 conversation tracer 이후 browser transport의 정확한 형태와 package 배치
- 두 번째 실제 product consumer가 생기기 전 shared semantic module을 추출할 조건
- 첫 Server request 용례와 첫 AY-PLE `ModelingInvocation` tracer 사이의 정확한 티켓 경계

## Out of scope

- ACP 또는 두 번째 Agent engine을 위한 범용 abstraction
- 완성된 Account·approval·toolbar·transcript UI와 모든 Server request variant
- 자동 restart·mutation replay·범용 reconciliation framework
- Wayfinder 단계에서의 기존 Host 코드 제거 또는 replacement implementation
- Runtime Harness의 기존 `AgentRuntimeKernel`, `CodexRuntimeAdapter`, Inspector와 Runtime Diagnostic History 재설계

## Resulting spec

아직 작성하지 않았다.
