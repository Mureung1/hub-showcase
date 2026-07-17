# 005 — Interface conformance와 fixture 독립성을 감사한다

## Wayfinder ticket

- Type: research
- State: out-of-scope
- Blocked by: None

## Question

현재 `CodexChatRuntime` Interface의 observable contract는 정확히 무엇이며, production runtime, `DeterministicCodexChatRuntime`, Server `ControlledRuntime`, Playwright fixture와 actual-child fixture가 각각 그 contract의 어떤 사실을 독립적으로 증명하거나 위반하는가?

## Resolution evidence

- Native identity, FIFO, active-turn conflict, interrupt acknowledgement, release, normal/fatal close, pending settlement, `terminal`, `unknownOutcome`와 `mutationOutcomeKnown`의 normative conformance 표
- Fixture별 “생성하는 사실 / 독립 관찰하는 사실 / 보장하지 않는 사실” 구분
- Active turn 중 close, acceptance 뒤 `runtime.failed`, wrong-owner operation, opaque ID 변화와 late/duplicate event를 포함한 falsifying trace
- 고정 fixture가 문제인 경우와 deterministic oracle로 유효한 경우를 구분한 판정
- Root `npm test`, Chat Shell E2E, actual-child, exact-local provider와 verified bundle gate가 검출하는 risk와 실행 전제 표

## Map reconciliation

- 분류: 병합
- Observable contract, fixture 독립성, falsifying trace와 happy-path·hardcoding 감사는 [Codex Chat target fitness와 legacy deletion blocker를 감사한다](004-current-architecture-maintainability.md)의 단일 research asset에 흡수했다.
- 별도 ticket을 유지하면 같은 Module·state machine과 test seam을 두 번 감사하므로 current destination에서는 독립 질문을 닫는다.
