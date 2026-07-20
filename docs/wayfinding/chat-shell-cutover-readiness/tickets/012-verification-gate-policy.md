# 012 — 변경 위험별 verification gate를 결정한다

## Wayfinder ticket

- Type: grilling
- State: out-of-scope
- Blocked by: None

## Question

Interface·UI, Server ownership, Node/bridge, SDK patch와 pin/package 변경 각각에 대해 어떤 검증을 local default, merge-blocking PR, pin/release checkpoint에서 의무화하고, 어느 runner와 owner가 이를 집행해야 하는가?

## Resolution evidence

- Change class → risk → test command → artifact/network/provider/platform 전제 → 최대 실행 시간의 matrix
- Production과 deterministic Adapter가 공유할 black-box conformance suite의 범위
- Artifact-independent actual-child, Chat Shell E2E, verified bundle Node/bridge와 exact-local provider gate의 계층 배치
- Required check가 없는 현재 auto-merge surface를 포함한 enforcement와 failure ownership 결정
- Evolution probe 결과가 추가하는 target Seam acceptance는 후속 gate를 보강하지만 현재 default/merge enforcement 결정을 지연시키지 않는다는 경계

## Map reconciliation

- 분류: 병합
- 일반적인 change-class CI 정책 대신 이번 removal slice의 risk-based verification, residual negative check와 exact pin/release gate를 [Legacy deletion 실행 gate와 spec readiness를 승인한다](016-cutover-execution-gates.md)에 흡수했다.
- Repository-wide 장기 CI governance는 deletion spec과 분리한다.
