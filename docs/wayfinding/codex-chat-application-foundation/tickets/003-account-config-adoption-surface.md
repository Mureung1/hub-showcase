# 003 — Account Readiness와 config lifecycle의 adoption surface를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Question

002가 선정한 bounded lookup candidate를 기준으로, pinned App Server·official Python SDK, Codex CLI·first-party client와 성숙한 local Agent·Chat OSS는 Account Readiness, login lifecycle, logout, notification과 controlled `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME` config authority를 어떻게 소유하는가? Current bridge가 direct reuse할 수 있는 seam, behavior-preserving adaptation과 donor assumption 차이를 확인하고, 그 뒤에도 남는 gap만 판정한다.

## Resolution evidence

- Exact source signature, SDK public coverage, generated method·notification과 primary tests
- Codex CLI·first-party client의 Account Readiness·config behavior와 representative sequence
- Relevant OSS donor의 exact version·license·provenance, auth/config assumption과 적용 가능한 behavior
- Empty auth store, login pending·completed·cancelled·expired, logout과 restart에서 current app-managed roots와 donor assumption의 차이
- Current bridge의 `keep | replace | delete` 후보, required Account Readiness의 `direct reuse | adapt | narrow port | confirmed residual` 판정과 optional auth 방식의 `deferred | out-of-scope`를 구분한 `assets/account-config-adoption-surface.md`
- Device-code, API key, Bedrock, multi-provider abstraction과 target OAuth UX의 명시적 제외
