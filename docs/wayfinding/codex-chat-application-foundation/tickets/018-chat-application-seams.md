# 018 — Chat application의 Module과 Interface seam을 승인한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [LocalChatHost Interface와 runtime layout을 설계한다](009-local-chat-host-interface.md), [Workspace activation과 chat-readiness state machine을 결정한다](010-workspace-readiness-state-machine.md), [Conversation ownership과 client cardinality를 결정한다](011-conversation-ownership-cardinality.md), [Conversation Interface를 세 가지로 설계한다](012-conversation-interface-alternatives.md), [두 client와 restart 후 resume로 ownership을 검증한다](013-two-client-resume-probe.md), [Stream disconnect와 cold·live transcript recovery 계약을 검증한다](014-stream-recovery-transcript-contract.md), [첫 Chat foundation의 sandbox와 approval policy를 결정한다](015-sandbox-approval-policy.md), [Browser와 local companion 사이의 authorization을 결정한다](016-browser-companion-authorization.md), [Error, restart와 unknown-outcome recovery를 결정한다](017-error-restart-reconciliation.md)

## Question

해결한 host, workspace, conversation, recovery와 safety invariant를 가장 작은 caller knowledge로 숨기려면 `LocalChatHost`, Conversation lifecycle, `CodexChatRuntime`, Server HTTP Adapter와 Browser-safe Chat Interface의 Module·Interface·Seam을 어디에 두어야 하며 package와 app-local placement는 어떻게 정해야 하는가?

## Resolution evidence

- 최소 세 target Module graph와 import·deployment direction
- Interface별 invariant, ordering, configuration, failure와 lifecycle knowledge
- Current deep runtime mechanics와 application semantics의 ownership matrix
- 두 실제 Adapter가 있는 Seam만 승격하는 package placement와 deletion test
- Change map, conformance surface와 사용자가 승인한 architecture verdict
