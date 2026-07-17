# 017 — Codex Chat-only와 legacy deletion-default를 확정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [현재 runtime capability와 ownership을 한 장에 고정한다](001-current-runtime-capability-ownership.md)

## Question

현재 세 runtime 경로의 capability와 ownership을 확인한 뒤, 어떤 경로를 유일하게 발전시키고 Runtime Harness·legacy `HeadlessCodexClientHost`의 disposition과 예외 증명 책임을 어떤 기본값으로 둘 것인가?

## Resolution evidence

- Codex Chat을 유일한 maintained product runtime으로 삼을지에 대한 사용자 결정
- Runtime Harness와 legacy Host의 기본 disposition
- 삭제 예외를 인정할 최소 증명 기준
- External consumer, Inspector 사용량과 on-disk record 확인의 역할
- 과거 구현 교훈과 rollback을 보존하는 수단

## Answer

- Codex Chat을 유일하게 발전시키고 유지할 product runtime path로 확정한다.
- Runtime Harness·Inspector와 legacy `HeadlessCodexClientHost` 경로는 삭제를 기본값으로 둔다. “참고할 만한 코드·test가 있다”는 사실은 유지 근거가 아니다.
- 삭제 예외는 식별 가능한 현재 사용자 또는 consumer, Codex Chat으로 대체할 수 없는 현재 job, 명시적 owner와 maintenance obligation 세 조건을 모두 증명해야 한다. 하나라도 없으면 삭제 대상이다.
- External consumer, 실제 Inspector 사용량과 on-disk record 확인은 disposition 재토론이 아니라 안전한 삭제를 위한 preflight다.
- 미래의 두 번째 engine이나 approval 가능성은 unused abstraction의 유지 근거로 인정하지 않는다. 필요해질 때 Codex Chat의 current Seam을 기준으로 새로 설계한다.
- 과거 구현의 교훈과 참고 가치는 Git history와 완료·역사 문서로 보존한다. Rollback은 dormant legacy runtime 존치가 아니라 deletion 전 commit/release baseline의 Git revert 또는 release rollback으로 설계한다.
- 이 결정은 즉시 삭제 구현을 승인하지 않았다. Exact removal manifest는 014, 세 exact ignored root의 local-only recoverable cleanup은 후속 [018](018-legacy-local-state-cleanup.md), 최종 verification·restore gate는 016에서 확정한 뒤 implementation-ready spec으로 넘긴다.
