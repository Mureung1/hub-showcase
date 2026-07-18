# 010 — Workspace activation과 chat-readiness state machine을 결정한다

## Wayfinder ticket

- Type: grilling
- State: open
- Blocked by: [Account lifecycle과 native config authority의 official surface를 확인한다](003-official-account-config-capabilities.md), [Native workspace와 cwd semantics를 확인한다](004-official-workspace-cwd-semantics.md), [macOS local web app의 workspace 선택 수단을 조사한다](005-local-web-workspace-selection-options.md), [Local companion의 위협과 보호 자산을 고정한다](008-local-companion-threat-model.md), [LocalChatHost Interface와 runtime layout을 설계한다](009-local-chat-host-interface.md)

## Question

사용자가 local folder를 여는 순간부터 Host config, runtime, account와 active workspace가 Chat-ready가 될 때까지 각 state의 authoritative owner와 전이는 무엇이며, cancel·logout·expiry·missing workspace·workspace switch와 restart를 어떤 explicit recovery로 수렴시켜야 하는가?

## Resolution evidence

- Bootstrap, account와 workspace를 독립 closed state로 표현한 state chart
- Folder consent, canonical path, opaque workspace handle·registry와 active cardinality 결정
- Empty app data에서 첫 conversation까지의 sequence와 failure·retry owner
- Native thread cwd 검증과 workspace reopen invariant
- Toolbar 배치와 학업 workspace state를 제외한 사용자 판정
