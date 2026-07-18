# 008 — Local companion lifecycle·entrypoint·control의 adoption surface를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](002-current-chat-overlap-audit.md)

## Question

002가 선정한 bounded lookup candidate를 기준으로, Codex first-party client, 성숙한 local Agent·IDE·web companion과 macOS·Browser platform은 same-user local service의 supported entry action, readiness, process ownership·restart·bounded shutdown과 account·workspace·conversation mutation control을 어떻게 구현하는가? Current process supervision·loopback bind·Origin guard·isolated child environment와 donor assumption의 차이를 비교하고, adoption 뒤에도 남는 lifecycle·trust gap만 local-web residual로 확정한다.

## Resolution evidence

- Codex first-party와 relevant OSS·platform donor의 exact version·license·provenance, entrypoint·process lifecycle과 trust boundary assumption
- Empty app state의 supported start, readiness, crash·restart, bounded shutdown과 cleanup trace
- Malicious origin, 다른 local process, stale bundle과 multiple Browser client에 대한 donor·current control 비교
- Current supervision·loopback bind·Origin guard·isolated environment의 `keep | replace | delete` 후보와 falsifying trace. `delete`는 ADR-required lifecycle outcome을 제거하지 않는다.
- Provider account auth와 Browser→local companion trust의 owner 차이
- Required local entrypoint·lifecycle·control surface의 `direct reuse | adapt | narrow port | confirmed residual` 판정, optional donor feature의 `deferred | out-of-scope`를 구분한 `assets/local-companion-lifecycle-controls.md`
- Exact launcher·Host topology, session·cookie·capability 설계, packaged Desktop, product domain data와 cloud multi-user threat model의 명시적 제외
