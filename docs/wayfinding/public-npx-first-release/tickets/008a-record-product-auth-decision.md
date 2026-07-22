# 008a — Product OAuth lifecycle 결정을 formal owner에 채택한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md)

## Question

[Ticket 008](008-browser-oauth-lifecycle.md)의 official Codex-managed ChatGPT browser login, app-managed `CODEX_HOME`의 explicit file credential store, fresh ChatGPT account authority, transient single-attempt lease, Runtime-owned loopback callback과 product Origin 분리·token boundary, auth-only bootstrap Runtime→admitted workspace Runtime 전환을 어떤 장기 formal owner에 기록할 것인가? 새 auth ADR을 채택할지 ADR 0011·ADR 0006의 기존 책임에 나눌지를 정하고, Product Brief·Runtime 격리·Codex Chat 구현 지도·Development Backlog에는 current implementation과 adopted target을 섞지 않은 consequence와 작업만 owner-first 순서로 반영한다. Pinned callback port, exact Browser DTO, retry interval·deadline, endpoint path와 test fixture는 research·resulting spec·implementation surface에 남기고 ADR에 복제하지 않는다. Historical ADR 0001을 제품 정본으로 재분류하지 않는다.

## Answer

아직 결정하지 않음.
