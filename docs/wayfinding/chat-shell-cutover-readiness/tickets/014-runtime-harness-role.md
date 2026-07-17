# 014 — Runtime Harness의 장기 역할을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 runtime capability와 ownership을 한 장에 고정한다](001-current-runtime-capability-ownership.md), [현재 architecture의 유지보수 위험을 감사한다](004-current-architecture-maintainability.md), [Primary product Seam을 승인한다](013-primary-product-seam-approval.md)

## Question

Primary product Seam이 승인된 뒤 Runtime Harness와 Inspector를 의도적인 장기 developer diagnostic surface로 유지할 것인가, 완료된 bootstrap evidence로 보고 contraction할 것인가?

## Resolution evidence

- 실제 유지할 developer job과 caller, diagnostic history·raw/debug observation·Fake/Codex parity의 대체 가능성
- 제품 conversation lifecycle과 중복되는 mechanics를 계속 유지할 비용
- Keep, narrow, migrate 또는 retire 판정과 그 범위
- 유지한다면 product session/state ownership을 절대 맡지 않는 Interface 경계
- contraction한다면 replacement evidence와 rollback 조건
