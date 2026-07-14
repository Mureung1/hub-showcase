# 016 — Source·runtime·repository 기준으로 아키텍처 준비 상태를 리뷰한다

## Wayfinder ticket

- Type: task
- State: resolved
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

아키텍처는 `/to-spec`으로 전환할 준비가 됐다. 이 판정은 runtime foundation이 이미 구현됐다는 뜻이 아니라, 구현 계약을 작성할 때 다시 사용자 결정을 요구하거나 서로 충돌하는 기준선으로 돌아갈 blocking fog가 없다는 뜻이다.

### 준비 상태 판정

- [ADR 0010](../../../adr/0010-separate-codex-app-server-connection-from-conversation-runtime.md)과 [first-party client port 감사](../assets/019-first-party-client-port-and-reuse-audit.md)는 generated wire shape, Python external stdio lifecycle, Rust active routing, TUI per-thread projection·pending interaction과 method source/tests의 권위를 분리한다. Production 방향은 `CodexAppServerConnection → CodexConversationRuntime` 하나이고 external preparation은 protocol 의미 밖의 별도 capability다.
- [Source conformance evidence](../assets/013-source-conformance-and-ledger-evidence.md)는 T0·T0-C·T0.1의 method roster, singular semantic owner, unit·typed fake child·pinned live oracle와 non-method contract를 모두 열거한다. Active-only exact routing, method-specific bounded early FIFO, native `ThreadId`별 projection, active Server request remove-on-resolution과 disconnect 시 current-pending settlement가 현재 기준선이다.
- [Host 제거·선별 재사용 계획](../assets/014-host-removal-and-selective-salvage-plan.md)은 safe ledger/generation → external preparation·Connection → Runtime·T0 → sibling T0-C·T0.1 → compatibility 없는 legacy 제거 순서를 고정한다. Code unit과 root/subpath export는 보존, 추출·개조, developer Runtime Harness 전용 보존, compatibility 없이 제거의 네 범주에 빠짐없이 속한다.
- Process-lifetime tombstone, permanent actor poison·sink, global causal/semantic arbiter, process 종료까지의 actor retention과 automatic reconciliation은 current contract와 oracle이 아니다. 이전 Ticket 011·012·017 본문의 강화안은 각 `Ticket 019 교정`과 현재 asset·ADR이 명시적으로 대체한다.
- 현재 `HeadlessCodexClientHost`, `CodexStdioTransport`, `ProductRuntimeLayout`과 sparse decisions JSON은 아직 존재하는 구현 사실이고 새 foundation이나 ledger v2가 구현됐다는 증거가 아니다. Package README와 implementation map은 이 current/target 차이를 명시하며 generated inventory는 이번 Wayfinder에서 수정하지 않았다.
- Multi-turn, streaming, interrupt/steer, `thread/read`·`thread/resume`, activity와 추가 Server request는 후속 source-guided tracer가 같은 Runtime Interface를 확장한다. `AYPLE adapter`, browser UX와 제품 policy는 foundation readiness와 구현 완료 조건이 아니다.

### Resulting spec이 고정할 구현 의무

1. External preparation capability, Connection과 `./conversation` Runtime의 exact public symbol·type·export 경계, native identity와 one-turn convenience operation을 future tracer의 상한으로 만들지 않는 확장 형태를 정한다.
2. Fresh Client `RequestId` allocator, direction과 string/number를 보존하는 exact parser·active collision rule, serialized writer와 response/error remove-once·late map-miss를 구현 계약과 unit selector로 고정한다.
3. Raw frame, validated dispatch, pending Client RPC, active Server request와 method-specific early observation의 count·UTF-8 byte cap을 수치화한다. Timeout·overflow·adopted-notification validation failure는 affected operation의 bounded disposition으로 정하고 unrelated thread·exact RPC drain을 global poison으로 확대하지 않는다.
4. Malformed framing·direction·ID classification만 connection terminal로, schema-valid envelope의 active response payload failure는 waiter-local로, invalid adopted notification은 no-mutation 뒤 명시한 operation-local 결과로 끝내는 failure scope를 고정한다.
5. Coverage ledger v2 validator, safe A/B deterministic generation, read-only verify, two-target promotion rollback과 legacy taxonomy migration을 먼저 구현하고, 통과한 selector만 `implemented`로 기록한 뒤 Result checkpoint에서만 integration membership을 승격한다.
6. T0·T0-C·T0.1의 package-private unit, build/typecheck에 포함된 typed fake child와 required hermetic live selector를 구체화한다. Exact npm pin과 Python reference의 CLI pin 차이, package-owned binary compatibility, child stdout tail·close·kill·reap과 no-raw retention은 fake/live gate에서 검증한다.
7. [Ticket 003](003-pin-upstream-source-provenance.md)의 dev-only `references/openai-codex` gitlink·attestation provenance와 source/upgrade gate를 구현하되 ordinary npm test/build dependency로 만들지 않는다. Guarded package-only clean과 native app-data sentinel로 Runtime Harness와 Codex history를 비파괴적으로 보호한다.

### 최종 review checkpoint

Review fixed point는 Ticket 019 resolution checkpoint `264b52fd50e3b95e0e9aa9ef9edd1e00cb483b08`이고, Ticket 013·014 교정과 이 ticket claim을 포함한 aggregate diff를 검토했다.

- Source: 0 findings. Exact-pin first-party client/UI/method 근거와 TypeScript external-client hardening의 경계가 일치한다.
- Standards: 0 findings. Wayfinder lifecycle, 문서 ownership·한국어 서술, current/target/deferred 분리, generated artifact 비수정과 branch·user artifact 보존이 일치한다.
- Spec: 0 findings. Code-unit 네 분류, T0·T0-C·T0.1 roster·owner·oracle, ledger/generation·legacy 제거 gate와 future extensibility가 `/to-spec` 입력으로 완결됐다.

Local package 선언, lock과 실행 binary는 모두 `@openai/codex@0.144.0` / `codex-cli 0.144.0`으로 일치한다. Exact exported API, cap 수치, operation-local timeout·overflow 결과, generator helper와 fake/live selector는 위 범위 안의 spec·implementation detail이며 새 architecture 또는 제품 결정을 요구하지 않는다.
