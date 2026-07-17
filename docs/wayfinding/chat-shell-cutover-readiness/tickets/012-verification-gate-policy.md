# 012 — 변경 위험별 verification gate를 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 architecture의 유지보수 위험을 감사한다](004-current-architecture-maintainability.md), [Interface conformance와 fixture 독립성을 감사한다](005-interface-conformance-and-fixture-audit.md), [Official SDK patch stack의 유지 비용을 측정한다](011-upstream-patch-sustainability.md)

## Question

Interface·UI, Server ownership, Node/bridge, SDK patch와 pin/package 변경 각각에 대해 어떤 검증을 local default, merge-blocking PR, pin/release checkpoint에서 의무화하고, 어느 runner와 owner가 이를 집행해야 하는가?

## Resolution evidence

- Change class → risk → test command → artifact/network/provider/platform 전제 → 최대 실행 시간의 matrix
- Production과 deterministic Adapter가 공유할 black-box conformance suite의 범위
- Artifact-independent actual-child, Chat Shell E2E, verified bundle Node/bridge와 exact-local provider gate의 계층 배치
- Required check가 없는 현재 auto-merge surface를 포함한 enforcement와 failure ownership 결정
- Evolution probe 결과가 추가하는 target Seam acceptance는 후속 gate를 보강하지만 현재 default/merge enforcement 결정을 지연시키지 않는다는 경계
