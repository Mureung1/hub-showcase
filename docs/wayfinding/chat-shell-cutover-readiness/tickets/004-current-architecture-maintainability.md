# 004 — Codex Chat target fitness와 legacy deletion blocker를 감사한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Codex Chat-only cutover contract와 non-goal을 고정한다](002-extension-envelope.md)

## Question

002에서 승인한 contract를 Codex Chat 경로가 유지할 수 있는지, 살아남을 Module·Interface·Seam과 fixture가 어떤 유지보수 위험을 가지며, legacy dependency 중 무엇이 clean deletion을 실제로 막는가?

## Resolution evidence

- Codex Chat production import direction, package export, Server/browser state ownership과 legacy workspace dependency를 함께 보여 주는 deletion-oriented graph
- `CodexChatRuntime`, Server lease, browser reducer와 process supervisor의 Interface depth·locality, impossible state, 중복 settlement, raw leakage와 shotgun surgery 판정
- Production runtime, `DeterministicCodexChatRuntime`, Server fixture, Chat Shell E2E와 actual-child가 각각 생성·독립 관찰·보장하지 않는 사실을 구분한 observable conformance matrix
- Happy path 편중, fixture hardcoding, opaque identity·late/duplicate event·wrong-owner·active-close 등 falsifying trace와 first-tracer/fixture-shaped identifier·함수명 감사
- 현재 exact bundle·ordered patch stack의 owner, source path와 regression oracle만 기록하고 다음 pin rebase 비용 조사는 제외한 maintenance baseline
- Legacy 제거로 발생하는 002 contract regression 또는 Chat-only build·start·test failure와, 삭제와 무관한 일반 maintainability debt를 분리한 결과
- Broad future abstraction을 미리 만들지 않고, 앞선 deletion-caused failure가 구체적으로 증명될 때만 원인 하나의 remediation ticket을 추가하는 판정

## Answer

상세 근거는 [Codex Chat target fitness와 legacy deletion blocker 감사](../assets/004-chat-target-fitness-audit.md)에 고정했다.

- 삭제 뒤 살아남는 browser-safe contract, `CodexChatRuntime` Seam, process supervisor, `CodexChatService`와 Browser reducer는 002의 current observable contract를 유지할 수 있다. Production과 deterministic Adapter라는 실제 두 구현이 같은 Runtime Interface를 사용하고, raw App Server shape나 private correlation은 제품 Interface로 누출되지 않는다.
- Legacy package를 단독으로 먼저 삭제하면 Server compile/start와 root command·Chat test가 깨진다. 원인은 mixed `apps/server` composition root, Server manifest, root scripts와 legacy option을 공유하는 test fixture가 이어진 하나의 deletion-direct cause cluster다. 이는 014의 exact removal manifest와 atomic deletion order가 소유할 작업이지 survivor architecture를 우회할 새 abstraction의 근거가 아니다.
- Current suite는 happy path에만 편중되지 않았다. Default tests, Playwright, Node actual-child, exact local-provider와 Server actual shutdown이 모두 green이고 failure·bounds·race·disconnect·process cleanup을 폭넓게 다룬다. 다만 deterministic/controlled fixture는 native identity·process·provider의 독립 oracle이 아니므로 016은 default gate와 actual gate를 구분해 보존해야 한다.
- Type-level impossible state, canned fixture identity, cross-layer active-close·disconnect gap과 interrupt attempt/acknowledgement conflation은 실제 general maintainability debt다. Bounded cleanup과 002 contract는 현재 유지되며 legacy 삭제가 만든 회귀가 아니므로 이번 map에 remediation ticket을 추가하지 않는다.
- Exact bundle과 ordered patch stack은 source path, owner asset과 regression oracle이 모두 추적된다. Current pin을 유지하는 이번 cutover에서는 이 maintenance obligation을 보존하되 next-pin rebase 비용이나 broad patch abstraction을 조사하지 않는다.

따라서 신규 remediation ticket trigger는 충족되지 않았다. 다음 frontier는 014에서 mixed composition cluster를 포함한 exact legacy removal manifest를 고정하고, 그 뒤 016에서 default·actual verification과 preflight·rollback gate를 승인하는 것이다.
