# Codex Chat application foundation

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

검증된 Codex App Server·official SDK·first-party client·OSS·platform 구현을 먼저 재사용·adapt하고 confirmed residual만 새로 결정하여, 현재 transient Chat tracer를 macOS-first local web Codex Chat application으로 발전시키기 위한 implementation-ready spec을 작성할 수 있는 상태에 도달한다.

## Notes

- 현재 topology와 구현 gap은 [Codex Chat 구현 지도](../../architecture/codex-chat-implementation-map.md), package별 현재 동작은 [runtime README](../../../packages/codex-chat-runtime/README.md), [Server README](../../../apps/server/README.md), [Chat Shell README](../../../apps/chat-shell/README.md), 작업 순서는 [개발 백로그](../../product/ay-ple-development-backlog.md)가 소유한다. 판정은 문서만이 아니라 current code와 tests를 함께 확인한다.
- [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)의 official Python SDK direct reuse, native identity 보존과 supervised process lifecycle, [ADR 0012](../../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 Chat-only maintained graph와 generic engine abstraction 금지는 입력 제약이다. 새 map에서 다시 결정하지 않는다.
- [ADR 0006](../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 `packageRoot`·`appDataRoot`·`workspaceRoot` 소유권과 `process.cwd()` fallback 금지, [ADR 0009](../../adr/0009-use-a-macos-first-local-web-app-product-path.md)의 macOS-first local web app 경계를 보존한다. 이 effort의 `workspaceRoot`는 Chat의 explicit native `cwd`로 사용할 사용자 선택 local folder이며, AY-PLE domain의 `SemesterWorkspace`를 새로 정의하지 않는다.
- `Chat Shell`은 현재 transient tracer, `Codex Chat application foundation`은 이 map이 탐색하는 목표를 가리키는 planning label이다. `conversation`, native `thread`, process-local live handle, active `turn`, Browser client와 local companion owner를 같은 개념으로 합치지 않는다. 002–009가 native·donor ownership과 cardinality를 먼저 흡수하고, 그래도 남는 precise residual에만 decision ticket을 만든다. 구현·protocol 용어이므로 [CONTEXT.md](../../../CONTEXT.md)의 학업 domain glossary에는 추가하지 않는다.
- [완료된 cutover map](../chat-shell-cutover-readiness/map.md)의 conversation ownership, resume, activity와 pending interaction ticket은 당시 deletion effort의 `out-of-scope` 역사 근거다. 원본 ticket을 reopen하거나 blocker로 사용하지 않고 새 target 질문의 evidence로만 연결한다.
- Current `CodexChatRuntime`의 process supervision·bounds·terminal settlement, Browser의 strict response decode와 identity reducer, 실제 Express·Vite를 통과하는 deterministic E2E도 확정 survivor가 아니다. Current overlap audit과 capability research가 current custom implementation을 `keep`, `replace` 또는 `delete` 후보로 분류하고 adoption gate가 근거와 함께 판정한다. `delete`는 adopted owner가 같은 required outcome을 증명할 때 obsolete custom code를 제거한다는 뜻이며 ADR 0011의 supervision·native identity 같은 입력 불변 조건을 없애지 않는다.
- 모든 capability research는 `App Server owner → SDK public seam → first-party implementation → OSS·platform donor → donor assumption과 AY-PLE 환경 차이 → current custom code keep·replace·delete 후보 → direct reuse | adapt | narrow port | confirmed residual` 순서를 따른다. Exact version·commit, license·provenance와 behavior·conformance 또는 falsifying test를 `assets/`에 보존한다. 001-required surface 자체는 이 네 판정 중 하나로 닫아야 하며, `deferred | out-of-scope`는 optional donor sub-capability에만 허용한다. Required surface를 줄이려면 001을 명시적으로 reopen한다.
- 포괄 App Server method inventory나 broad OSS survey는 만들지 않는다. 002가 capability별 exact lookup candidate를 bounded하게 고정하고 003–008은 그 후보부터 조사한다. Disposition을 증명할 근거가 확보되면 멈추며, 적용 가능한 donor가 없으면 조사한 후보와 부적합 이유를 기록한다. Open WebUI 같은 OSS는 Codex semantics의 authority가 아니라 UX·persistence·reconnect·local companion donor다.
- Confirmed residual이 admission gate를 통과하기 전에는 `LocalChatHost`, 별도 Conversation Module, readiness·hydration state machine, 깊은 Browser application Module 같은 target architecture를 명명하거나 design-it-twice 대상으로 올리지 않는다. Residual이 확인되면 022부터 precise ticket을 만들고 그때 `/codebase-design`이나 `/prototype`을 적용한다.
- Research ticket은 cited primary evidence를 `assets/`에 보존하고 prototype ticket은 `/prototype`의 throwaway evidence만 만들며 production 구현으로 승격하지 않는다. Grilling ticket은 사용자의 결정을 한 번에 하나씩 확인한다.
- 한 Wayfinder session에는 frontier ticket 하나만 claim하고 resolve한다. 현재 graph는 downstream capability를 미리 채택한 backlog가 아니며, research나 representative probe가 premise를 무너뜨리면 blocked ticket을 다시 쓰거나 제거하고 destination 밖이면 `out-of-scope`로 닫는다.
- Desktop 검증 기준은 1440px~1920px이다. 향후 3-pane 제품 Shell에서 Chat presentation을 재배치할 수 있는 locality는 고려하지만, 자료 pane·Document Workbench·오른쪽 Companion 자체는 이 effort에서 설계하거나 구현하지 않는다.
- Wayfinder는 architecture decision과 prerequisite fact만 소유한다. Production code, endpoint·schema의 최종 구현 순서와 implementation ticket은 resulting spec 이후 `/to-tickets`가 소유한다.

## Decisions so far

- [Codex Chat application foundation의 완료 envelope를 확정한다](tickets/001-foundation-capability-envelope.md) — Codex·first-party·OSS·platform prior art를 먼저 흡수하고 account·single workspace·multi-conversation·lifecycle·interaction·local entrypoint에서 확인된 residual만 foundation spec이 새로 결정한다.
- [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](tickets/002-current-chat-overlap-audit.md) — Exact SDK/native reuse 위의 custom supervision·4-route process-global 1/1·tab-memory projection을 기준선으로 고정하고 003–008의 bounded official·first-party·donor lookup target을 연결했다.
- [Account Readiness와 config lifecycle의 adoption surface를 확인한다](tickets/003-account-config-adoption-surface.md) — Native account lifecycle은 direct reuse하고 readiness behavior는 adapt·narrow port하며, post-login convergence와 effective config assertion만 confirmed residual로 남겼다.

## Not yet specified

- Exact native capability가 SDK public seam에서 빠졌다고 capability research가 증명할 때 direct App Server adapter, upstream extension 또는 foundation scope 조정 중 무엇을 선택할지에 관한 질문. 구체 gap이 확인되기 전에는 pin·patch 결정을 ticket으로 만들지 않는다.
- Adoption disposition gate가 확인할 Host composition, workspace readiness, conversation ownership, Browser authorization·routing과 Module seam의 residual. 현재는 donor 조사 전이므로 독립 design ticket으로 표현하지 않는다.
- Two-client·restart, accepted disconnect와 UI prototype이 드러낼 추가 release risk. Representative trace가 실패해 precise residual이 생길 때만 022 이후 ticket으로 만든다.

## Out of scope

- `RawMaterial`, `EvidenceRef`, `ModelingRun`, `StatePatch`, `SemesterModel`, Review와 제품 DB schema를 포함한 AY-PLE 학업 product layer
- 자료 pane, IDE·Document Workbench와 오른쪽 Companion을 포함한 3-pane 제품 Shell
- 모든 App Server event를 Browser에 1:1로 노출하는 generic event bus, 두 번째 Agent engine과 generic runtime abstraction
- Exact Codex pin upgrade, legacy runtime 복원·migration과 삭제된 local state의 recovery copy
- API key·device-code·Bedrock login, 여러 account 전환, cloud sync와 remote multi-user service
- Packaged Desktop App, signing·notarization, atomic update, Windows·Linux와 mobile·small-screen 지원. 다만 macOS local web app의 실행 entrypoint와 clean-machine verification 경계는 이 effort에 포함한다.
- Production 구현, implementation ticket 작성과 GitHub Issue 게시

## Resulting spec

아직 없다. 모든 in-scope ticket이 해결되고 남은 fog가 사라지면 `/to-spec`이 이 절에 ready-for-ticketing spec을 연결한다.
