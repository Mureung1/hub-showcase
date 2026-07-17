# 015 — Legacy Host asset의 disposition을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 runtime capability와 ownership을 한 장에 고정한다](001-current-runtime-capability-ownership.md), [현재 architecture의 유지보수 위험을 감사한다](004-current-architecture-maintainability.md), [Official SDK pending-interaction seam의 존재를 확인한다](009-sdk-pending-interaction-seam.md), [Primary product Seam을 승인한다](013-primary-product-seam-approval.md)

## Question

Repository production caller가 없는 legacy `HeadlessCodexClientHost` 경로의 lifecycle, `ProductRuntimeLayout`, raw bidirectional transport, generated schema와 public export를 각각 유지·이관·제거 중 어디에 둘 것인가?

## Resolution evidence

- Asset별 actual caller, unique capability, target Seam overlap, pin coupling과 deletion test
- Raw bidirectional request handling이나 layout invariant가 future evidence로 필요한지에 대한 질문별 사용자 결정
- Keep, migrate 또는 retire 판정과 owner
- Public export와 외부 consumer 확인 방법
- 제거 또는 이관 전 replacement test, docs·generated inventory cleanup과 rollback 조건
