# 014 — Legacy surface 삭제 범위와 예외를 증명한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Codex Chat target fitness와 legacy deletion blocker를 감사한다](004-current-architecture-maintainability.md)

## Question

Codex Chat을 유일한 maintained execution path로 만들기 위해 Runtime Harness·Inspector와 legacy `HeadlessCodexClientHost` 경로에서 정확히 무엇을 삭제해야 하며, 삭제 예외를 주장하는 항목이 현재 사용자·대체 불가능한 용도·명시적 owner 세 조건을 모두 증명하는가?

## Resolution evidence

- `apps/inspector`, `/api/runtime/*`, `runtime-core`, `runtime-fake`, legacy Codex adapter·`CodexRawClient`·status·capability, Host·layout·transport, `0.144.0` pin과 generated code를 포함한 exact removal manifest
- Server composition/store/parity script, root dev·demo·test·build·typecheck, workspace dependency·lockfile와 README·ADR·architecture·backlog·generated inventory reference cleanup
- Static camp-demo evidence와 live runtime dependency를 분리하고, 코드 품질·test 수·미래 approval·두 번째 engine·legacy rollback 가능성을 예외 증거로 인정하지 않은 결과
- 예외마다 식별 가능한 현재 사용자 또는 consumer, Codex Chat으로 대체할 수 없는 현재 job, 명시적 owner와 maintenance obligation 세 조건을 모두 확인한 closed list
- Repository 밖 consumer와 실제 Inspector 사용 확인, `.ay-ple/runtime-harness/runs`·legacy homes inventory를 disposition 재토론이 아닌 삭제 preflight로 기록한 결과
- On-disk data를 자동 삭제하거나 product history로 migration하지 않는 비파괴 원칙과 별도 destructive cleanup 경계
- Codex Chat에 반드시 필요한 invariant만 target contract/test 언어로 다시 증명하고 legacy test/code를 1:1 이관하지 않는 replacement evidence
- Dormant legacy runtime이 아닌 deletion 전 commit/release baseline과 Git revert·release rollback을 사용한 rollback 경계
