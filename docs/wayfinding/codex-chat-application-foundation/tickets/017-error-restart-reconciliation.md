# 017 — Error, restart와 unknown-outcome recovery를 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Conversation catalog와 cold recovery capability를 확인한다](006-official-conversation-cold-recovery.md), [Live turn rejoin과 pending interaction capability를 확인한다](007-official-live-rejoin-pending-capabilities.md), [Workspace activation과 chat-readiness state machine을 결정한다](010-workspace-readiness-state-machine.md), [Conversation ownership과 client cardinality를 결정한다](011-conversation-ownership-cardinality.md), [두 client와 restart 후 resume로 ownership을 검증한다](013-two-client-resume-probe.md), [Stream disconnect와 cold·live transcript recovery 계약을 검증한다](014-stream-recovery-transcript-contract.md), [첫 Chat foundation의 sandbox와 approval policy를 결정한다](015-sandbox-approval-policy.md), [Browser와 local companion 사이의 authorization을 결정한다](016-browser-companion-authorization.md)

## Question

Config, account, workspace, conversation, stream, runtime과 authorization failure를 어떤 closed error·retryability·recovery action으로 나누고, Browser·runtime·Server restart와 acceptance 전후 unknown outcome을 list·read·resume으로 어떻게 reconcile하며 무엇을 자동 retry하지 않아야 하는가?

## Resolution evidence

- Failure family, mutation outcome, retryability, user action과 owner matrix
- Browser reload, runtime crash·relaunch와 Server restart recovery sequence
- Duplicate mutation, missing conversation, stale route와 contract mismatch negative controls
- Raw path·credential·traceback을 숨기면서 diagnostics를 잃지 않는 correlation 원칙
- Safe terminal과 fail-closed state에 대한 사용자 승인
