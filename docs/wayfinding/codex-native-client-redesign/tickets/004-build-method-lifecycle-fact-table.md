# 004 — Pinned method lifecycle fact table을 만든다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

첫 Codex-native conversation baseline에 필요한 `initialize`, thread start·list·read·resume, turn start·interrupt, item streaming과 turn terminal에 대해 response identity, related notification, authoritative state, legal observed order, duplicate·late behavior, timeout·unknown outcome과 근거 source를 어떤 표로 고정해야 새 설계가 추측을 protocol contract로 승격하지 않는가?

조사 범위가 한 fresh context를 넘으면 thread lifecycle과 turn/item lifecycle을 후속 research ticket으로 분리한다.

## Answer

재검토 finding을 반영한 뒤 다시 작성한다.

### 재검토 메모

[Protocol·Rust source evidence의 정렬 상태를 리뷰한다](007-review-source-evidence-alignment.md)에서 다음 보정이 필요하다고 판정했다.

- `initialized` response-first를 공개 ordering contract가 아니라 exact pin의 first-party client precedent로 재분류한다.
- Active second `turn/start`가 steer·error 판정보다 먼저 thread settings를 바꾸고 `thread/settings/updated`를 publish할 수 있는 branch를 추가한다.
- Ephemeral thread의 `thread/read(includeTurns: true)`가 `InvalidRequest`가 되는 negative branch를 추가한다.
- Empty `turnId`를 사용하는 startup interrupt와 일반 interrupt의 response authority 차이를 추가한다.
- `thread/start` 실패 뒤 state DB 미등록을 직접 증명하는 exact-pin citation을 보강한다.
- 후속 결정의 소유자를 readable title relative link로 바꾸고 일반 설명 heading·table label을 한국어화한다.

### 재검토 전 결론

[Pinned method lifecycle fact table](../assets/004-method-lifecycle-fact-table.md)에 generated public shape, exact-pin implementation·test, 단일 live observation, source inference와 AY-PLE product decision을 서로 다른 증거 등급으로 고정했다. 조사는 한 research ticket 범위에서 끝났으므로 thread와 turn/item ticket으로 분리하지 않았다.

핵심 판정은 다음과 같다.

- `thread/start`에서 matching `thread/started`만 response-first다. Listener가 먼저 attach되므로 같은 새 thread의 다른 startup observation은 response를 앞설 수 있고, opt-out이면 `thread/started` 자체가 없을 수 있다. Request-correlated native identity authority는 response다.
- Idle `turn/start` response와 `turn/started`는 either-order이며 source task graph상 subsequent item·error·terminal까지 response보다 먼저 올 수 있다. Observation이 native `threadId`·`turnId`·`itemId`를 싣기 때문에 이 사실은 generation-wide holdback이나 global ordered journal을 요구하지 않는다.
- Active turn에 두 번째 `turn/start`를 호출하면 regular non-empty는 기존 A로 steer되고, regular empty와 review/compact는 B lifecycle이 불완전하거나 없어진다. 두 error branch에서는 typed B error filtering과 별개로 thread-scoped `SystemError`가 먼저 publish될 수 있다. Stable protocol의 `turn/steer(expectedTurnId)`는 이 ambiguous create-vs-steer 경로와 구분되는 source-shaped operation이며 채택 여부는 Ticket 010이 정한다.
- `turn/completed`는 turn status authority지만 child item drain은 아니다. Completion-only item과 terminal 뒤 original turn으로 돌아오는 background command completion이 모두 합법적이며, retention·history recovery 방식은 Ticket 011이 정한다.
- Notification에는 global sequence·dedup contract가 없고 mutation method 전체에 적용되는 general idempotency contract도 없다. Duplicate/tombstone, buffering/publication, timeout·unknown-outcome reconciliation은 각각 Tickets 011·012의 product/client policy다.

따라서 기존 Host의 generation-wide journal, provisional public mutation, absolute terminal tombstone은 pinned Codex가 요구하는 client primitive로 승격하지 않는다. 반대로 exact request-ID demultiplexing, response wait와 notification ingress의 독립 진행, native scope correlation, method별 lifecycle 해석은 후속 connection/kernel seam이 반드시 설명해야 한다.

최종 검토는 source-conformance, 문서 ownership·evidence traceability, skeptical decision-boundary 세 축으로 수행했고 actionable finding은 0건이다. 미관찰 active edge와 completion-only behavior를 어떤 deterministic oracle로 보존할지는 Ticket 013에 남겼다.
