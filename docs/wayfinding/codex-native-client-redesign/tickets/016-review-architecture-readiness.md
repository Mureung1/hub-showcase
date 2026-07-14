# 016 — Source·runtime·repository 기준으로 아키텍처 준비 상태를 리뷰한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [기존 Host 제거와 선별 재사용 계획을 확정한다](014-plan-host-removal-and-selective-salvage.md)

## Question

해결한 결정과 superseding ADR이 pinned generated schema, Python external stdio client, Rust `codex-app-server-client`, TUI `ThreadEventStore`·pending request, method source/tests, ADR 0005·0006과 문서 소유권에 일치하며 implementation-ready runtime foundation spec으로 넘어갈 때 남은 blocking fog가 없는가? `CodexAppServerConnection → CodexConversationRuntime` Seam, external preparation capability와 기존 Runtime Harness 보호 Seam뿐 아니라 [Ticket 019의 code-unit 처리 방침](../assets/019-first-party-client-port-and-reuse-audit.md)이 보존·추출/개조·Harness 전용·제거의 네 범주로 완결됐는지 확인한다.

각 adopted T0·T0-C·T0.1 row의 wire shape, source/test 의미, intended unit/fake/live oracle와 singular owner가 resulting spec에 있고, decisions JSON에서 generated inventory를 deterministic하게 재생성하며 legacy `client-host` claim을 migration할 implementation gate가 빠지지 않았는지 확인한다. 기준선이 active-only exact request routing, method-specific early FIFO, per-thread projection, remove-on-resolution과 current-pending disconnect settlement인지, lifetime tombstone·permanent poison·global causal/semantic arbiter와 automatic reconciliation을 stale oracle에서 다시 끌어오지 않는지도 검토한다. Actor/mailbox와 retention은 필요한 method lifecycle을 구현하는 package-private 선택이지 공개 invariant로 고정하지 않는다.

현재 구현 사실과 채택한 target을 구분하고, foundation Interface가 multi-turn, streaming, interrupt/steer, `thread/read`·`thread/resume`, activity projection과 추가 Server request의 후속 source-guided tracer를 불필요하게 막지 않으며 `AYPLE adapter`나 product policy를 현재 readiness 조건으로 삼지 않는지도 확인한다.

Review는 Source·Standards·Spec을 독립적으로 수행하고, finding이 있으면 owning decision ticket을 다시 open한다.

## 진행 메모

Fixed point `6ed88e40`에서 첫 준비 상태 검토를 수행했다.

- Source: 0 findings. Evidence authority와 T0·T0-C·T0.1 근거는 spec으로 전환하기에 충분하다. Fresh Client `RequestId` allocator, exact Server ID parser, count+UTF-8 byte cap, scope-local overflow·invalid-notification 처리와 Python CLI pin 차이의 fake/live 검증은 추가 Wayfinder 결정이 아니라 resulting spec의 explicit deployment obligations다.
- Standards: 3 findings. ADR 0010과 소비 문서의 `Seam` 어휘, Tickets 005·006의 readable blocking link, Ticket 014의 한국어 일반 설명어를 교정해야 한다. 이 ticket title은 finding 환류와 함께 한국어로 고쳤다.
- Spec: 1 finding. `capability-slots.ts`·test와 root/package export가 Ticket 019의 네 범주 감사에서 빠져 있다. 실제 Runtime Harness consumer를 보존하는 처리 방침은 추론할 수 있지만 “완결·상호배타적 분류”를 아직 증명하지 못한다.

Question의 finding 환류 규칙에 따라 [First-party client 근거로 port와 재사용 계획을 교정한다](019-correct-first-party-client-port-and-reuse.md)를 다시 열고 이 ticket을 `open`으로 돌렸다. 다음 review는 Ticket 019가 다시 `resolved`된 뒤 수행한다.

Ticket 019 resolution checkpoint `264b52fd50e3b95e0e9aa9ef9edd1e00cb483b08`을 기준으로 두 번째 준비 상태 검토를 수행했다.

- Source: 0 findings. Exact pin의 Python external stdio client, Rust active client facade, TUI per-thread projection·active pending lifecycle과 method source/tests가 Ticket 019의 active-only routing·method-specific early FIFO·per-thread projection·remove-on-resolution 기준선에 일치한다. Fresh Client `RequestId`, exact Server ID parser, count+UTF-8 byte cap, operation-local validation failure, Python CLI pin 차이와 child close/reap은 resulting spec의 explicit implementation·verification 의무다.
- Standards: 2 blocking findings. [Source conformance verification와 coverage ledger 근거](../assets/013-source-conformance-and-ledger-evidence.md)는 `성숙도: 채택`인 machine/oracle 표에서 process-lifetime tombstone과 actor-local sink를 계속 필수 evidence로 요구하고, [기존 Host 제거와 선별 재사용 migration plan](../assets/014-host-removal-and-selective-salvage-plan.md)은 active invariant·replacement·Stage·gate에서 process-lifetime tombstone, actor poison/sink, terminal actor retention과 reuse rejection을 계속 명령한다. 각 owning ticket의 교정 절은 이를 supersede한다고 밝히지만 같은 ticket이 asset을 current evidence·실행 gate로 채택하므로 단순 역사 보존이 아니라 서로 반대인 current contract가 된다. `/to-spec`이 stale oracle을 다시 채택할 수 있다.
- Spec: 0 findings. T0·T0-C·T0.1 roster와 oracle, ledger v2·safe generation, code-unit 네 분류, export/consumer 처리와 legacy 제거 순서는 implementation-ready spec으로 구체화할 만큼 충분하다. 다만 Standards finding이 해소되기 전에는 singular current migration contract라고 판정할 수 없다.

Question의 finding 환류 규칙에 따라 owning [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)와 [기존 Host 제거와 선별 재사용 계획을 확정한다](014-plan-host-removal-and-selective-salvage.md)를 다시 열고 이 ticket을 `open`으로 돌렸다. Ticket 014가 Ticket 013에 blocked되어 있으므로 다음 frontier는 Ticket 013이고, 그 뒤 Ticket 014의 active migration table·Stage·gate를 Ticket 019와 ADR 0010의 현재 기준선으로 forward-amend한 후 이 review를 다시 수행한다.

## Answer

Ticket을 resolve할 때 작성한다.
