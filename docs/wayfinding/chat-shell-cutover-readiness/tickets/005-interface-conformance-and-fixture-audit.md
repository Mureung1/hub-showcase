# 005 — Interface conformance와 fixture 독립성을 감사한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

현재 `CodexChatRuntime` Interface의 observable contract는 정확히 무엇이며, production runtime, `DeterministicCodexChatRuntime`, Server `ControlledRuntime`, Playwright fixture와 actual-child fixture가 각각 그 contract의 어떤 사실을 독립적으로 증명하거나 위반하는가?

## Resolution evidence

- Native identity, FIFO, active-turn conflict, interrupt acknowledgement, release, normal/fatal close, pending settlement, `terminal`, `unknownOutcome`와 `mutationOutcomeKnown`의 normative conformance 표
- Fixture별 “생성하는 사실 / 독립 관찰하는 사실 / 보장하지 않는 사실” 구분
- Active turn 중 close, acceptance 뒤 `runtime.failed`, wrong-owner operation, opaque ID 변화와 late/duplicate event를 포함한 falsifying trace
- 고정 fixture가 문제인 경우와 deterministic oracle로 유효한 경우를 구분한 판정
- Root `npm test`, Chat Shell E2E, actual-child, exact-local provider와 verified bundle gate가 검출하는 risk와 실행 전제 표
