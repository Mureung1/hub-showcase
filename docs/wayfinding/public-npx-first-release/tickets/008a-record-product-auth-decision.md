# 008a — Product OAuth lifecycle 결정을 formal owner에 채택한다

## Wayfinder ticket

- Type: task
- State: resolved
- Blocked by: [Browser-launched Codex OAuth lifecycle을 설계한다](008-browser-oauth-lifecycle.md)

## Question

[Ticket 008](008-browser-oauth-lifecycle.md)의 official Codex-managed ChatGPT browser login, app-managed `CODEX_HOME`의 explicit file credential store, fresh ChatGPT account authority, transient single-attempt lease, Runtime-owned loopback callback과 product Origin 분리·token boundary, auth-only bootstrap Runtime→admitted workspace Runtime 전환을 어떤 장기 formal owner에 기록할 것인가? 새 auth ADR을 채택할지 ADR 0011·ADR 0006의 기존 책임에 나눌지를 정하고, Product Brief·Runtime 격리·Codex Chat 구현 지도·Development Backlog에는 current implementation과 adopted target을 섞지 않은 consequence와 작업만 owner-first 순서로 반영한다. Pinned callback port, exact Browser DTO, retry interval·deadline, endpoint path와 test fixture는 research·resulting spec·implementation surface에 남기고 ADR에 복제하지 않는다. Historical ADR 0001을 제품 정본으로 재분류하지 않는다.

## Answer

[ADR 0017 — 제품 account lifecycle에 Codex-managed Browser OAuth를 사용한다](../../../adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)를 새 활성·채택 정본으로 둔다. ADR 0006의 root 수명과 ADR 0011의 official SDK 통합에 결정을 나누면 account authority, transient login attempt, Browser token boundary와 pre-workspace→workspace Runtime 전환을 함께 소유하는 lifecycle owner가 사라지기 때문이다. 새 ADR은 official Codex가 OAuth 복잡성을 맡고 AY-PLE은 하나의 깊은 account lifecycle Module만 제품에 제공한다는 장기 경계를 고정하며, 실제 두 번째 provider가 생기기 전 generic auth abstraction을 만들지 않는다.

Owner-first 전파는 다음처럼 완료했다.

| 문서 | 반영한 책임 |
| --- | --- |
| ADR 0001·0006·0011·0014 | 역사적 spike와 기존 root·SDK·workspace 책임을 유지하고 ADR 0017과의 관계만 명시했다. |
| [Product Brief](../../../product/ay-ple-product-brief.md) | 학생이 보는 연결·재연결 결과와 제품·provider 책임 경계를 반영했다. |
| [Codex Runtime 격리](../../../architecture/codex-runtime-isolation.md) | Current generic readiness와 adopted auth bootstrap·workspace Runtime transition을 분리해 mapping했다. |
| [Codex Chat 구현 지도](../../../architecture/codex-chat-implementation-map.md) | In-app Browser OAuth가 아직 구현되지 않은 current gap임을 기록했다. |
| [개발 백로그](../../../product/ay-ple-development-backlog.md) | Lifecycle, Runtime transition, credential boundary를 구현·검증할 미완료 작업으로 추가했다. |
| 문서 index·root README | ADR 0017을 정본 목록에 추가하고 current dogfood device-auth와 adopted target을 구분했다. |

Exact port·DTO·state enum·endpoint·retry/deadline·SDK patch·fixture·UI copy는 ADR에 올리지 않고 Ticket 008의 조사 결과와 후속 spec·implementation surface에 남긴다. Runtime·Server·Chat Shell README는 현재 구현만 소유하므로 코드가 없는 이번 결정 턴에는 변경하지 않았다.
