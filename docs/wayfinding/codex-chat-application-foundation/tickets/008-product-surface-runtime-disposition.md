# 008 — Adopted local-web path의 runtime disposition을 확정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Current integration adapter로 first-vertical representative trace를 검증한다](006-current-adapter-representative-trace.md)

## Question

004–006의 evidence를 종합할 때 이미 채택한 official Python SDK·macOS local-web product path 안에서 current patch·Node supervision·Server·Browser tracer를 `keep`, `replace`, `delete` 또는 frozen fallback 중 무엇으로 판정해야 하는가? Representative first-vertical trace가 실제로 남긴 residual만 승인하고 채택된 runtime·제품 surface를 근거 없이 다시 선택하지 않는다.

## Resolution evidence

- 006 representative trace의 product journey coverage, local-first assumption, security·lifecycle와 upstream tracking 비용
- Product state와 native execution state의 owner를 바꾸지 않는 adopted local-web boundary
- Current custom responsibility별 `keep | replace | delete | frozen fallback` 판정과 adopted owner
- Required outcome별 `direct reuse | adapt | narrow port | confirmed residual` disposition
- ADR 0006·0009·0011을 입력 제약으로 유지하고, 006이 direct contradiction을 증명한 경우에만 별도 precise reopen ticket을 요구하는 판정
- Confirmed residual만 022+ ticket으로 admission하고 general Chat backlog를 되살리지 않는 decision
