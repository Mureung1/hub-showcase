# 002 — Codex Chat-only cutover contract와 non-goal을 고정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [현재 runtime capability와 ownership을 한 장에 고정한다](001-current-runtime-capability-ownership.md), [Codex Chat-only와 legacy deletion-default를 확정한다](017-codex-chat-only-deletion-default.md)

## Question

Codex Chat을 유일한 maintained product runtime으로 삼고 legacy surface를 삭제할 때, 이번 cutover가 반드시 보존할 current observable contract와 default developer entrypoint는 무엇이며 어떤 known product gap을 이번 deletion과 분리된 non-goal로 명시할 것인가?

## Resolution evidence

- Status, thread start, same-thread follow-up, native identity/FIFO, interrupt, safe terminal/failure, explicit roots, exact bundle과 bounded process cleanup 중 삭제 뒤 반드시 보존할 observable contract
- 현재 Server의 process-global thread 1개·active turn 1개와 browser-memory transcript를 이번 삭제에서 재설계하지 않는 known limitation으로 명시하고, legacy 제거가 existing behavior를 회귀시키지 않는다는 보존 경계
- 현재 `npm run dev`가 Inspector를 시작하는 사실을 반영한 Chat-only default developer entrypoint와 diagnostic surface의 기대 결과
- Multi-client/list/read/resume, activity family, pending interaction, account/config와 두 번째 engine을 이번 deletion spec의 blocker로 삼지 않고 별도 product effort로 넘긴다는 non-goal
- External consumer, Inspector 사용량과 on-disk record 확인은 유지 논거가 아니라 삭제 preflight라는 경계
- Legacy 제거로 current contract가 회귀하거나 Chat-only build·start·test가 깨진다는 구체 evidence가 후속 감사에서 발견될 때만 원인 하나의 bounded remediation ticket을 추가한다는 graph rule
