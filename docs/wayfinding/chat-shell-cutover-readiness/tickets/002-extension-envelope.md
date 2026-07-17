# 002 — 확장 가능성의 최소 범위를 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: None

## Question

이번 cutover가 승인하려는 “확장이 가능한 Chat Shell”은 어떤 change pressure까지 architecture가 수용해야 하는가?

## Resolution evidence

- Conversation list/read/resume와 두 client 격리, 한 activity family의 live/cold 표현, bidirectional pending interaction을 기본 후보로 둔 extension envelope 판정
- Account/config, archive/name, 모든 event family와 UI 완성도를 이번 architecture fitness 범위에 넣을지 미룰지에 대한 사용자 결정
- 각 evolution probe를 `required`, `deferred`, `out-of-scope` 중 하나로 분류한 이유
- 선택하지 않은 probe ticket을 `out-of-scope`로 닫고 downstream `Blocked by`에서 제거하는 graph reconciliation
- 구현 용이성이 아니라 다음 제품 방향과 실패 비용으로 정한 사용자 확인 범위
