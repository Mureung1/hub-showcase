# 004 — 첫 Assignment vertical의 runtime sufficiency envelope를 확정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Account Readiness와 config lifecycle의 adoption surface를 확인한다](003-account-config-adoption-surface.md)

## Question

`explicit SemesterWorkspace + TXT SourceSelection → ModelingInvocation → ModelingRun → EvidenceRef가 연결된 Assignment StatePatch → Review·UserConfirmation → 다시 열 수 있는 SemesterModel` 대표 흐름을 제품 구현 전에 안전하게 실행했다고 판정하려면 어떤 observable runtime outcome과 failure scenario가 반드시 닫혀야 하며, 어떤 일반 Chat capability는 실제 product need가 생길 때까지 deferred해야 하는가?

## Resolution evidence

- Product Brief·ADR 0007과 사용자가 승인한 representative journey
- Account readiness, explicit workspace·`cwd`, Skill·mention·`outputSchema`, native acceptance·terminal, interrupt·unknown outcome, process crash·bounded shutdown과 retry 후보의 `required | product-discovery | deferred` 판정
- Runtime·native execution state와 `ModelingRun`·`StatePatch`·`SemesterModel` product state의 owner 및 persistence 경계
- Browser reload·Server restart가 transcript가 아니라 first vertical outcome에 미치는 representative failure scenario
- General multi-conversation, catalog, two-client, full approval center와 replay infrastructure의 명시적 non-goal
- Module·Interface·DB schema·UI mechanism을 정하지 않은 falsifiable runtime sufficiency 문장과 005–007이 검증할 exact handoff
