# 010 — Pending interaction의 architecture 전략을 결정한다

## Wayfinder ticket

- Type: grilling
- State: out-of-scope
- Blocked by: None

## Question

Official SDK의 확인된 public Seam과 이번 extension envelope를 함께 볼 때, cutover target은 pending interaction을 어떤 조건으로 지원하거나 명시적으로 지원하지 않아야 하는가?

## Resolution evidence

- 현재 Seam으로 지원, 이번 envelope에서 deferred, upstream public extension을 선행, 또는 upstream-followable `RequestId` lease prototype을 조건부 승인하는 선택지 비교
- Original request identity, exactly-once response, duplicate/late/wrong-owner 거절, disconnect/timeout/runtime failure의 fail-closed invariant
- Reader responsiveness와 approval policy owner를 분리한 sequence
- Prototype이 필요해진 경우에만 새 Wayfinder prototype ticket을 만들 수 있는 구체 질문과 blocker
- 현재 target이 approval-capable이라고 주장할 수 있는 범위를 사용자가 확인한 결정

## Map reconciliation

- 분류: out-of-scope
- Pending interaction 지원 전략은 이번 deletion destination에 포함하지 않는다. Legacy transport의 구현 여부도 재진입 trigger가 아니다.
- 실제 제품 요구가 승인되면 official SDK research 뒤 fail-closed product policy를 별도 effort에서 결정한다.
