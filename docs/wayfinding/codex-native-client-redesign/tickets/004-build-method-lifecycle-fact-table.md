# 004 — Pinned method lifecycle 근거표를 만든다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: tickets/003-pin-upstream-source-provenance.md

## Question

첫 Codex-native conversation baseline에 필요한 `initialize`, thread start·list·read·resume, turn start·interrupt, item streaming과 turn terminal에 대해 response identity, related notification, authoritative state, legal observed order, duplicate·late behavior, timeout·unknown outcome과 근거 source를 어떤 표로 고정해야 새 설계가 추측을 protocol contract로 승격하지 않는가?

조사 범위가 한 fresh context를 넘으면 thread lifecycle과 turn/item lifecycle을 후속 research ticket으로 분리한다.

## Answer

[Pinned Codex App Server method lifecycle 근거표](../assets/004-method-lifecycle-fact-table.md)에 현재 공식 lifecycle, checked-in generated shape, exact-pin implementation·test, 단일 live observation, source inference와 AY-PLE product decision을 서로 다른 증거 등급으로 고정했다. 조사는 한 research ticket 범위에서 끝났으므로 thread와 turn/item ticket으로 분리하지 않았다.

핵심 판정은 다음과 같다.

- 현재 공식 문서는 `initialize → initialized` lifecycle을 설명하지만 response barrier를 규정하지 않고 Node.js 예제도 두 message와 `thread/start`를 연속 전송한다. Exact-pin first-party test client가 response를 기다리는 동작은 보수적인 client precedent이지 public ordering guarantee가 아니다.
- `thread/start`에서 matching `thread/started`만 response-first다. Listener가 먼저 attach되므로 같은 새 thread의 다른 startup observation은 response를 앞설 수 있고, opt-out이면 `thread/started` 자체가 없을 수 있다. Request-correlated native identity authority는 response다.
- Fresh persistent thread는 첫 input 전 rollout·state DB record가 없지만 `thread/loaded/list`에는 나타날 수 있다. 근거를 합성하면 response-lost success와 failed pre-registration start는 storage-backed list만으로 구분할 수 없고 loaded candidate도 original request와 exact-correlate할 수 없다는 추론이 따른다.
- Idle `turn/start` response와 `turn/started`는 either-order이며 source task graph상 subsequent item·error·terminal까지 response보다 먼저 올 수 있다. Observation이 native `threadId`·`turnId`·`itemId`를 싣기 때문에 이 사실은 generation-wide holdback이나 global ordered journal을 요구하지 않는다.
- Active turn에 두 번째 `turn/start`를 호출하면 non-default settings override가 steer·error 판정보다 먼저 future thread settings를 바꿀 수 있다. Regular non-empty는 기존 A로 steer되고, regular empty와 review/compact는 B lifecycle이 불완전하거나 없어진다. Experimental `thread/settings/updated`와 thread-scoped `SystemError`는 optional·thread-scoped observation일 뿐 B authority가 아니다. `turn/steer`와 이 branch의 채택은 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)가 소유한다.
- Stable `thread/resume(threadId)`의 성공 response는 load outcome과 returned identity를 확인하지만 cold listener attach는 best-effort라 subscription을 보장하지 않는다. Exact-pin experimental history·path branch는 input ID를 무시할 수 있다.
- `thread/read(includeTurns=true)`는 materialized inline-history persistent thread에서만 turn history를 반환하고 ephemeral, fresh unmaterialized와 paginated history는 실패한다. 이 availability matrix를 어떤 authoritative backfill로 쓸지는 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md)가 소유한다.
- 현재 공식 문서와 exact-tag README는 normal interrupt 성공 뒤 `interrupted` terminal을 설명하지만 exact-pin listener race에서는 자연 `completed`도 가능하다. Normal `turn/interrupt(turnId=A)` response는 same-thread terminal listener barrier이고, startup `turn/interrupt(turnId="")` response는 native turn과 상관되지 않은 submission acknowledgement다. Empty sentinel을 별도 semantic operation으로 감출지 여부는 [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md)가 소유한다.
- `turn/completed`는 turn status authority지만 child item drain은 아니다. Completion-only item과 terminal 뒤 original turn으로 돌아오는 background command completion이 모두 합법적이다.
- Notification에는 global sequence·dedup contract가 없고 mutation method 전체에 적용되는 general idempotency contract도 없다. Duplicate/tombstone, buffering/publication은 [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), timeout·unknown-outcome reconciliation은 [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md)가 소유한다.

따라서 기존 Host의 generation-wide journal, provisional public mutation, absolute terminal tombstone은 pinned Codex가 요구하는 client primitive로 승격하지 않는다. 반대로 exact request-ID demultiplexing, response 대기와 notification ingress의 독립 진행, native scope correlation, method별 lifecycle 해석은 [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)의 설계 입력이다.

미관찰 active second-start settings matrix, ephemeral·unmaterialized read rejection, normal/startup interrupt race와 completion-only behavior를 어떤 deterministic oracle로 보존할지는 [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md)가 소유한다.

최종 독립 재리뷰에서 source conformance, Standards, skeptical decision boundary의 P1·P2·P3 finding은 모두 0건이었다. Exact-pin source·test와 현재 공식 문서는 다시 대조했지만 upstream Rust test와 live probe는 재실행하지 않았으며, 기존 단일 실행 관찰은 normative contract가 아닌 sanity check로만 남긴다.
