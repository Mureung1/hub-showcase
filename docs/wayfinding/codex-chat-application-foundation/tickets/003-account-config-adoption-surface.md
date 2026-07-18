# 003 — Account Readiness와 config lifecycle의 adoption surface를 확인한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Supersession note

Native account lifecycle과 config gap에 대한 아래 evidence는 계속 유효하지만 독립 Chat foundation의 전체 Account UX를 구현 대상으로 승인하지 않는다. [004](004-first-assignment-runtime-envelope.md)가 first vertical에 필요한 Account Readiness만 admission하고, cross-capability surface·runtime disposition은 새 [008](008-product-surface-runtime-disposition.md)이 소유한다.

## Question

002가 선정한 bounded lookup candidate를 기준으로, pinned App Server·official Python SDK, Codex CLI·first-party client와 성숙한 local Agent·Chat OSS는 Account Readiness, login lifecycle, logout, notification과 controlled `HOME`·`CODEX_HOME`·`CODEX_SQLITE_HOME` config authority를 어떻게 소유하는가? Current bridge가 direct reuse할 수 있는 seam, behavior-preserving adaptation과 donor assumption 차이를 확인하고, 그 뒤에도 남는 gap만 판정한다.

## Resolution evidence

- Exact source signature, SDK public coverage, generated method·notification과 primary tests
- Codex CLI·first-party client의 Account Readiness·config behavior와 representative sequence
- Relevant OSS donor의 exact version·license·provenance, auth/config assumption과 적용 가능한 behavior
- Empty auth store, login pending·completed·cancelled·expired, logout과 restart에서 current app-managed roots와 donor assumption의 차이
- Current bridge의 `keep | replace | delete` 후보, required Account Readiness의 `direct reuse | adapt | narrow port | confirmed residual` 판정과 optional auth 방식의 `deferred | out-of-scope`를 구분한 `assets/account-config-adoption-surface.md`
- Device-code, API key, Bedrock, multi-provider abstraction과 target OAuth UX의 명시적 제외

## Answer

[Account/config adoption surface](../assets/account-config-adoption-surface.md)에 pinned App Server →
official Python SDK → first-party TUI → OpenCode assumption comparator → current bridge 순서의
primary evidence를 고정했다.

Account read와 browser login start/wait/cancel, logout은 `direct reuse`한다. Controlled child
environment와 Runtime Readiness는 `keep`, Browser의 runtime-only gate는 `replace`, account
command·notification routing, effective-root assertion과 startup·logout re-read는 `adapt`한다.
First-party TUI의 matching login ID와 completion/account update 분리만 `narrow port`한다.

Post-login `account/updated` convergence와 effective config read는 high-level SDK public seam에
없어 `confirmed residual`이다. Explicit expiry와 pending login의 same-attempt restart rejoin은
`unproven`이며 새 required surface로 채택하지 않는다. Evidence-backed `delete` 후보는 없고 최종
cross-capability disposition은 009가 소유한다. In-app OAuth UX, optional auth 방식, multi-provider와
production 구현은 결정하지 않았다.
