# Codex Chat application foundation

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

현재 transient Chat tracer를 macOS-first local web app에서 account와 명시적 workspace를 준비하고, 여러 conversation을 안전하게 시작·전환·복원하며, Browser·Server lifecycle 뒤에도 실패와 복구를 설명할 수 있는 일반 Codex Chat application으로 발전시키기 위한 implementation-ready spec을 작성할 수 있는 상태에 도달한다.

## Notes

- 현재 topology와 구현 gap은 [Codex Chat 구현 지도](../../architecture/codex-chat-implementation-map.md), package별 현재 동작은 [runtime README](../../../packages/codex-chat-runtime/README.md), [Server README](../../../apps/server/README.md), [Chat Shell README](../../../apps/chat-shell/README.md), 작업 순서는 [개발 백로그](../../product/ay-ple-development-backlog.md)가 소유한다. 판정은 문서만이 아니라 current code와 tests를 함께 확인한다.
- [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)의 official Python SDK direct reuse, native identity 보존과 supervised process lifecycle, [ADR 0012](../../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 Chat-only maintained graph와 generic engine abstraction 금지는 입력 제약이다. 새 map에서 다시 결정하지 않는다.
- [ADR 0006](../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md)의 `packageRoot`·`appDataRoot`·`workspaceRoot` 소유권과 `process.cwd()` fallback 금지, [ADR 0009](../../adr/0009-use-a-macos-first-local-web-app-product-path.md)의 macOS-first local web app 경계를 보존한다. 이 effort의 `workspaceRoot`는 Chat의 explicit native `cwd`로 사용할 사용자 선택 local folder이며, AY-PLE domain의 `SemesterWorkspace`를 새로 정의하지 않는다.
- `Chat Shell`은 현재 transient tracer, `Codex Chat application foundation`은 이 map이 탐색하는 목표를 가리키는 planning label이다. `conversation`, native `thread`, process-local live handle, active `turn`, Browser client와 local companion owner를 같은 개념으로 합치지 않으며 정확한 vocabulary와 cardinality는 decision ticket에서 확정한다. 구현·protocol 용어이므로 [CONTEXT.md](../../../CONTEXT.md)의 학업 domain glossary에는 추가하지 않는다.
- [완료된 cutover map](../chat-shell-cutover-readiness/map.md)의 conversation ownership, resume, activity와 pending interaction ticket은 당시 deletion effort의 `out-of-scope` 역사 근거다. 원본 ticket을 reopen하거나 blocker로 사용하지 않고 새 target 질문의 evidence로만 연결한다.
- Current `CodexChatRuntime`의 process supervision·bounds·terminal settlement, Browser의 strict response decode와 identity reducer, 실제 Express·Vite를 통과하는 deterministic E2E는 보존할 survivor evidence이지 target Module 배치를 미리 결정하는 근거가 아니다.
- Interface 대안 ticket은 `/codebase-design`의 Module·Interface·Seam·Adapter vocabulary와 design-it-twice 비교를 사용한다. Research ticket은 current code와 exact official source 같은 primary evidence를 `assets/`에 보존하고, prototype ticket은 `/prototype`의 throwaway evidence만 만들며 production 구현으로 승격하지 않는다.
- Grilling ticket은 사용자의 결정을 한 번에 하나씩 확인한다. 한 Wayfinder session에는 frontier ticket 하나만 claim하고 resolve하며, charting session인 이번 작업에서는 어떤 ticket도 해결하지 않는다.
- 현재 graph는 downstream capability를 미리 채택한 backlog가 아니다. 001의 envelope 판정이나 official research 결과가 capability를 destination 밖으로 밀어내면 관련 blocked ticket을 `out-of-scope`로 닫고, 질문의 전제가 무너지면 해당 ticket을 다시 쓰거나 제거한다.
- Desktop 검증 기준은 1440px~1920px이다. 향후 3-pane 제품 Shell에서 Chat presentation을 재배치할 수 있는 locality는 고려하지만, 자료 pane·Document Workbench·오른쪽 Companion 자체는 이 effort에서 설계하거나 구현하지 않는다.
- Wayfinder는 architecture decision과 prerequisite fact만 소유한다. Production code, endpoint·schema의 최종 구현 순서와 implementation ticket은 resulting spec 이후 `/to-tickets`가 소유한다.

## Decisions so far

아직 해결된 ticket이 없다.

## Not yet specified

- Official capability research가 public SDK/App Server의 실제 blocker를 증명할 때 capability를 foundation에서 제외할지 별도 upstream extension effort를 열지에 관한 질문. 구체 blocker가 확인되기 전에는 pin·patch 결정을 ticket으로 만들지 않는다.
- Initial envelope와 recovery probe가 드러낼 추가 release risk. 현재는 독립 질문으로 표현할 evidence가 없다.

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
