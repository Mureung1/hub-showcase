# 008 — Product surface ownership과 runtime disposition을 확정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Current integration adapter로 first-vertical representative trace를 검증한다](006-current-adapter-representative-trace.md), [First-party surface가 general Chat client 없이 핵심 product flow를 닫는지 검증한다](007-first-party-surface-feasibility.md)

## Question

004–007의 evidence를 종합할 때 첫 Assignment vertical은 first-party entrypoint, own 3-pane Shell의 product-bound companion 또는 hybrid 중 어느 surface가 소유해야 하며, current Python SDK·patch·Node supervision·Server·Browser tracer는 `keep`, `replace`, `delete` 또는 frozen fallback 중 무엇으로 판정해야 하는가? 선택한 surface에서 실제로 남는 residual만 승인한다.

## Resolution evidence

- 두 surface probe의 product journey coverage, local-first assumption, security·lifecycle·upstream tracking 비용 비교
- Product state와 native execution state의 owner를 바꾸지 않는 추천안과 기각한 대안
- Current custom responsibility별 `keep | replace | delete | frozen fallback` 판정과 adopted owner
- Required outcome별 `direct reuse | adapt | narrow port | confirmed residual` disposition
- ADR 0006·0009·0011을 유지할지 precise reopen ticket이 필요한지에 대한 사용자 판정
- Confirmed residual만 022+ ticket으로 admission하고 general Chat backlog를 되살리지 않는 decision
