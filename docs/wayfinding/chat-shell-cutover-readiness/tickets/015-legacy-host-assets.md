# 015 — Legacy Host asset의 disposition을 결정한다

## Wayfinder ticket

- Type: grilling
- State: out-of-scope
- Blocked by: None

## Question

Repository production caller가 없는 legacy `HeadlessCodexClientHost` 경로의 lifecycle, `ProductRuntimeLayout`, raw bidirectional transport, generated schema와 public export를 각각 유지·이관·제거 중 어디에 둘 것인가?

## Resolution evidence

- Asset별 actual caller, unique capability, target Seam overlap, pin coupling과 deletion test
- Raw bidirectional request handling이나 layout invariant가 future evidence로 필요한지에 대한 질문별 사용자 결정
- Keep, migrate 또는 retire 판정과 owner
- Public export와 외부 consumer 확인 방법
- 제거 또는 이관 전 replacement test, docs·generated inventory cleanup과 rollback 조건

## Map reconciliation

- 분류: 병합
- Host·`ProductRuntimeLayout`·`CodexStdioTransport`·generated schema·public export는 Harness와 분리해 inventory하되, disposition 질문은 [Legacy surface 삭제 범위와 예외를 증명한다](014-runtime-harness-role.md)의 단일 deletion manifest에 흡수했다.
- Raw bidirectional transport의 미래 approval 가능성은 예외 증명이 아니며, whole `runtime-codex` 삭제와 Host-only edge의 차이는 삭제 안전성 관점에서만 기록한다.
