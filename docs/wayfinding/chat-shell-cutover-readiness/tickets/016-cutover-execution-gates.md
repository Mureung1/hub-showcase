# 016 — Legacy deletion 실행 gate와 spec readiness를 승인한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Legacy surface 삭제 범위와 예외를 증명한다](014-runtime-harness-role.md)

## Question

승인한 removal manifest, 데이터·consumer preflight, verification gate, 실행 순서와 Git/release rollback이 구현자가 추가 architecture 판단 없이 implementation-ready spec으로 옮길 만큼 완결되었는가?

## Resolution evidence

- 삭제 대상과 허용된 예외의 폐쇄 목록, external consumer·Inspector 사용·on-disk data preflight의 완료 기준
- Implementation slice 순서와 slice별 negative reference check, build·typecheck·lint·unit·E2E·actual-child·exact-local-provider 검증의 risk-based matrix
- Local default, merge-blocking과 exact pin/release checkpoint별 command, artifact·network·provider·platform 전제와 failure owner
- `/api/runtime/*`, Inspector, legacy workspace package·pin·generated schema와 stale docs reference가 남지 않았음을 확인하는 residual oracle
- On-disk data를 건드리지 않는 rollback 전제, deletion 전 commit/release baseline과 Git revert·release rollback 조건
- ADR·architecture·backlog·README와 implementation ticket에 넘길 cleanup 범위 및 순서 제약
- 추가 architecture 판단 없이 `/to-spec`이 tracer-bullet deletion slice와 acceptance gate를 작성할 수 있는지에 대한 사용자 승인
- 모든 in-scope fog가 사라졌는지와 map을 `ready-for-spec`으로 전환할 수 있는지에 대한 최종 판정
