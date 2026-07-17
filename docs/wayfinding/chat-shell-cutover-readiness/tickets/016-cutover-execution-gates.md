# 016 — Cutover 실행 gate를 승인한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [변경 위험별 verification gate를 결정한다](012-verification-gate-policy.md), [Primary product Seam을 승인한다](013-primary-product-seam-approval.md), [Runtime Harness의 장기 역할을 결정한다](014-runtime-harness-role.md), [Legacy Host asset의 disposition을 결정한다](015-legacy-host-assets.md)

## Question

승인한 capability disposition을 실제 migration과 deletion으로 실행하기 전에 충족해야 할 replacement evidence, rollback 조건과 checkpoint 완료 기준은 무엇인가?

## Resolution evidence

- Capability별 primary/keep/migrate/retire 판정과 owning Module
- 각 migration/deletion의 선행 evidence, 검증 command, external consumer 확인과 rollback/fallback
- 문서·test·pin·public export cleanup 범위와 실행 순서의 제약
- 후속 `/to-spec`이 ADR 갱신과 implementation slice를 모호함 없이 작성할 수 있는 승인된 gate
- 모든 in-scope fog가 사라졌는지와 map을 `ready-for-spec`으로 전환할 수 있는지에 대한 최종 판정
