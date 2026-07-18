# 009 — Capability adoption disposition과 confirmed residual을 확정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Account Readiness와 config lifecycle의 adoption surface를 확인한다](003-account-config-adoption-surface.md), [Workspace와 cwd의 adoption semantics를 확인한다](004-workspace-cwd-adoption-semantics.md), [Local web workspace selection의 donor와 platform seam을 조사한다](005-workspace-selection-donor-options.md), [Conversation catalog와 cold recovery의 adoption surface를 확인한다](006-conversation-cold-recovery-adoption.md), [Live rejoin·activity·pending interaction의 adoption surface를 확인한다](007-live-rejoin-pending-adoption.md), [Local companion lifecycle·entrypoint·control의 adoption surface를 확인한다](008-local-companion-lifecycle-controls.md)

## Question

001의 required problem surface와 002–008의 evidence를 종합할 때 각 required surface는 `direct reuse`, `behavior-preserving adaptation`, `narrow port` 또는 `confirmed residual` 중 어디에 속하며, current custom implementation은 `keep`, `replace` 또는 `delete` 중 무엇으로 판정해야 하는가? `deferred | out-of-scope`는 optional donor sub-capability에만 적용하고, required surface를 줄이려면 001을 reopen한다. Evidence가 확인한 residual만 후속 decision·prototype ticket으로 admission하고 조사되지 않은 architecture나 UX를 선택하지 않는다.

## Resolution evidence

- Account, workspace, conversation, cold·live recovery, activity·pending interaction과 local entrypoint·process lifecycle·companion control의 adoption disposition matrix
- Exact source·SDK seam·first-party·OSS·platform donor, assumption delta, license·provenance와 conformance evidence 연결
- Current runtime·Server·Browser custom implementation별 `keep | replace | delete` 판정과 근거. ADR-required outcome은 adopted owner 없이 삭제하지 않는다.
- Direct reuse와 adaptation은 representative probe로, narrow port는 provenance·update ownership·conformance gate로 연결
- Confirmed residual만 022 이후 precise ticket으로 만들고 013·014·015·017·020·021의 blocking path를 실제 route에 맞게 갱신
- 사용자가 판단해야 하는 tradeoff만 한 번에 하나씩 승인받고 target Module·Interface와 production implementation은 결정하지 않음
