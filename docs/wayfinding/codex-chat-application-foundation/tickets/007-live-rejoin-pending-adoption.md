# 007 — Live rejoin·activity·pending interaction의 adoption surface를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Question

002가 선정한 bounded lookup candidate를 기준으로, pinned App Server·official SDK와 Codex first-party rich client는 accepted turn, activity, live rejoin, pending user input과 approval을 어떻게 소유하며, 성숙한 Chat OSS는 Browser disconnect·late attach·local service restart를 어떤 verified pattern으로 수렴시키는가? Current NDJSON stream과 bridge가 direct reuse·adaptation할 수 있는 범위와 confirmed residual만 판정한다.

## Resolution evidence

- Exact connection, SDK public seam, in-flight resume, notification routing과 pending request primary tests
- Codex first-party client와 relevant Chat OSS donor의 reconnect·activity·pending interaction behavior, exact version·license·provenance
- Browser disconnect, Server transport disconnect와 process failure에서 native turn authority와 donor assumption의 차이
- Current NDJSON stream·bridge projection의 `keep | replace | delete` 후보
- Required live continuity·activity·pending interaction surface의 `direct reuse | adapt | narrow port | confirmed residual` 판정, optional presentation detail의 `deferred | out-of-scope`와 representative trace를 구분한 `assets/live-rejoin-pending-adoption.md`
- Target transport, replay mechanism, approval policy와 UI 설계의 명시적 제외
