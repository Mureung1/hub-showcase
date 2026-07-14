# 018 — 첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다

## Wayfinder ticket

- Type: grilling
- State: out-of-scope
- Blocked by: None

## Question

ADR 0007과 [Codex-native 제품 작업 조합](../../../architecture/codex-native-product-composition.md)이 정의한 `ModelingInvocation → ModelingRun` mapping 중 어떤 가장 작은 end-to-end behavior를 첫 `AYPLE adapter` tracer로 선택할 것인가? Adapter가 product input과 safe result를 번역하되 raw method·native identity·path·prompt·protocol error를 제품 계약으로 노출하지 않는 Interface는 무엇인가?

## Disposition

이 질문은 현재 Wayfinder destination 밖으로 보낸다. 사용자는 이번 effort의 destination을 AY-PLE product tracer가 아니라 pinned Codex의 실제 chat 사용 방식을 계속 source-guided tracer로 확장할 수 있는 `CodexAppServerConnection → CodexConversationRuntime` foundation의 implementation-ready spec으로 교정했다. Foundation code와 T0·T0-C·T0.1 conformance가 green이 된 뒤 별도 product goal/map에서 첫 `AYPLE adapter` tracer를 결정한다.

따라서 이 ticket은 `A0: selected-txt-assignment-extraction`, Assignment Recipe, `ModelingInvocation`/`ModelingRun` Interface, `T0-R`, `sandbox=read-only`, `approvalPolicy=never`, product outcome·retry mapping이나 adapter readiness edge를 채택하지 않는다. 기존 진행 메모는 human verdict를 받지 않은 provisional design exploration이었으며 현재 map, resulting runtime spec, coverage ledger와 Ticket 014–016의 prerequisite가 아니다. 이후 product effort도 이 후보를 standing approval로 상속하지 않고, 구현·검증된 Runtime surface와 그때의 pinned source/tests를 기준으로 다시 결정한다.

조사 중 확인한 protocol 사실 가운데 향후 product composition에 유용한 내용만 [deferred product source evidence](../assets/018-deferred-product-source-evidence.md)에 non-adopted evidence로 보존했다. 이 evidence는 filesystem path 전달, Skill provisioning, `outputSchema`, sandbox·approval 조합의 product policy를 결정하지 않는다.

## 범위 복구 리뷰

- Source: 0 findings. Exact pin의 T0 response/notification ordering, T0-C per-thread independence와 T0.1 original Server `RequestId` once-only lifecycle을 보존했고, `runtime-preparation`을 Codex protocol semantics와 분리했다. Deferred Skill path evidence도 normalized absolute exact match가 realpath canonicalization을 보장하지 않는 수준으로 바로잡았다.
- Standards: 0 findings. Wayfinder `out-of-scope` lifecycle, linked map disposition, local evidence placement·한국어 prose, 문서 ownership과 generated inventory 무변경을 확인했다.
- Spec: 0 findings. Current production direction은 `CodexAppServerConnection → CodexConversationRuntime`에서 끝나고 Ticket 018과 product/browser policy는 foundation readiness에서 제거됐다. T0·T0-C·T0.1, future tracer extensibility, Ticket 014 frontier와 one-ticket-per-session 경계를 유지했다.

남은 risk는 implementation-only다. Unit·fake-child·hermetic live conformance, bounds, cross-platform command trigger와 future method extensibility는 resulting spec과 implementation gate가 실제로 증명해야 하며 이 scope recovery를 implemented evidence로 승격하지 않는다.
