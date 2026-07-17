# 006 — Product conversation seam을 세 가지로 설계한다

## Wayfinder ticket

- Type: prototype
- State: out-of-scope
- Blocked by: None

## Question

확정한 extension envelope와 state ownership을 만족하는 product conversation seam을 최소 세 가지 서로 다른 Interface로 설계했을 때, 어느 대안이 raw protocol과 process mechanics를 숨기면서 가장 높은 Depth, Leverage, Locality와 testability를 제공하는가?

## Resolution evidence

- 현재 `CodexChatRuntime`을 확장하는 대안, Server-owned conversation module을 두는 대안, 별도 product adapter Seam을 두는 대안을 포함하되 이름이나 계층을 미리 채택하지 않은 Interface sketch
- 각 대안의 caller가 알아야 하는 invariant, error mode, ordering, configuration과 lifecycle
- Production Adapter와 deterministic Adapter가 같은 Seam을 실제로 만족할 수 있는지에 대한 검토
- Extension envelope별 change map, raw SDK/protocol leakage 여부와 deletion test
- `/codebase-design`의 deep Module vocabulary와 design-it-twice 비교를 사용한 사용자 판정

## Map reconciliation

- 분류: 조건부
- Broad three-alternative Seam prototype은 legacy 삭제에 필요하지 않으며, 현재 first tracer를 일반화하기 위한 선행 추상화가 될 위험이 있어 active graph에서 제외한다.
- [Codex Chat target fitness와 legacy deletion blocker를 감사한다](004-current-architecture-maintainability.md)가 legacy 제거로 인한 current-contract regression 또는 Chat-only build·start·test failure를 증명할 때만 원인 하나를 해결하는 새 bounded remediation ticket을 만든다. 일반 maintainability debt와 미래 feature gap은 trigger가 아니다.
