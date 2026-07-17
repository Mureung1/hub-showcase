# 010 — Pending interaction의 architecture 전략을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [확장 가능성의 최소 범위를 결정한다](002-extension-envelope.md), [Product conversation seam을 세 가지로 설계한다](006-target-conversation-seam-alternatives.md), [Official SDK pending-interaction seam의 존재를 확인한다](009-sdk-pending-interaction-seam.md)

## Question

Official SDK의 확인된 public Seam과 이번 extension envelope를 함께 볼 때, cutover target은 pending interaction을 어떤 조건으로 지원하거나 명시적으로 지원하지 않아야 하는가?

## Resolution evidence

- 현재 Seam으로 지원, 이번 envelope에서 deferred, upstream public extension을 선행, 또는 upstream-followable `RequestId` lease prototype을 조건부 승인하는 선택지 비교
- Original request identity, exactly-once response, duplicate/late/wrong-owner 거절, disconnect/timeout/runtime failure의 fail-closed invariant
- Reader responsiveness와 approval policy owner를 분리한 sequence
- Prototype이 필요해진 경우에만 새 Wayfinder prototype ticket을 만들 수 있는 구체 질문과 blocker
- 현재 target이 approval-capable이라고 주장할 수 있는 범위를 사용자가 확인한 결정
