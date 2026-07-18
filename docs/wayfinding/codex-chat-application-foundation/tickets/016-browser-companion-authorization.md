# 016 — Browser와 local companion 사이의 authorization을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Local companion의 위협과 보호 자산을 고정한다](008-local-companion-threat-model.md), [LocalChatHost Interface와 runtime layout을 설계한다](009-local-chat-host-interface.md), [Workspace activation과 chat-readiness state machine을 결정한다](010-workspace-readiness-state-machine.md), [Conversation ownership과 client cardinality를 결정한다](011-conversation-ownership-cardinality.md), [Stream disconnect와 cold·live transcript recovery 계약을 검증한다](014-stream-recovery-transcript-contract.md), [첫 Chat foundation의 sandbox와 approval policy를 결정한다](015-sandbox-approval-policy.md)

## Question

Same-origin production local web app과 separate-origin dev mode에서 Browser client를 local companion의 account·workspace·conversation scope에 어떻게 연결하고, Origin 없는 mutation, CSRF, stale bundle, wrong-client와 wrong-workspace 요청을 어떤 session·capability와 contract-version 규칙으로 fail closed할 것인가?

## Resolution evidence

- Production과 development trust flow 및 protected mutation matrix
- Session/capability 발급, 저장, rotation, revocation과 app restart semantics
- Workspace·conversation ownership과 authorization scope의 결합 규칙
- Browser-safe error와 credential·path redaction invariant
- Provider account auth와 별개인 local authorization에 대한 사용자 판정
