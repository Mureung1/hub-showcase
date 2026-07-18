# 017 — Adopted error·restart semantics와 남은 recovery residual을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Adopted stack의 two-client와 restart continuity를 검증한다](013-two-client-resume-probe.md), [Adopted stack의 accepted disconnect와 cold·live convergence를 검증한다](014-stream-recovery-transcript-contract.md), [Pending interaction·interactive approval의 adoption과 policy residual을 결정한다](015-sandbox-approval-policy.md)

## Question

Official·first-party·OSS donor가 이미 정의한 account, workspace, conversation, stream과 runtime failure semantics를 보존할 때 013–015의 representative trace는 local Browser projection에 어떤 recovery gap을 남기는가? 새 error taxonomy나 retry policy를 먼저 발명하지 않고 adopted semantics로 표현할 수 없는 confirmed residual과 사용자 action만 결정한다.

## Resolution evidence

- Native·first-party·OSS failure semantics와 current Browser-safe projection의 correspondence matrix
- 013–015에서 확인한 reload, local service restart, disconnect와 pending interaction recovery sequence
- Donor behavior로 해결된 outcome과 duplicate·missing·stale·unknown 상태에서 남은 precise gap
- Current safe error projection의 `keep | replace | delete` disposition과 provenance·diagnostic assumption
- User-visible recovery action이 필요한 confirmed residual만 승인하고 필요한 022+ ticket을 020·021 blocker에 연결
