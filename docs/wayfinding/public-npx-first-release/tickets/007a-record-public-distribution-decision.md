# 007a — Public npx distribution 결정을 formal owner에 채택한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [Public npx release 경로를 채택한다](001-adopt-public-npx-release-route.md), [Public repository authority와 license를 확정한다](005-public-repository-authority-and-license.md), [npx production composition을 고른다](006-npx-production-composition.md), [Runtime release delivery·integrity·versioning을 정한다](007-runtime-release-delivery-integrity.md)

## Question

[ADR 0015](../../../adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md)의 repository authority·canonical cutover·license·trust 결정을 고정 입력으로 두고, Ticket 001과 006–007에서 확정한 one-package foreground host, exact npm-embedded Runtime descriptor, immutable GitHub asset, single-entry `RuntimeResolver`와 still-supported 이전 exact app pair가 있을 때의 rollback 경계를 어떤 장기 formal owner에 기록할 것인가? ADR 0009를 보완하거나 별도 distribution ADR을 채택하고, Product Brief·Runtime 격리·구현 지도·Development Backlog에는 현재 구현과 채택 목표를 섞지 않은 consequence와 작업만 owner-first 순서로 반영해 resulting spec이 Wayfinder ticket을 장기 정본처럼 인용하지 않게 한다. Exact public `LICENSE`·`NOTICE`·`PRIVACY`·`CONTRIBUTING` file content는 ADR의 결정을 구현하는 release-owned surface로 남긴다.

## Answer

아직 수행하지 않음.
