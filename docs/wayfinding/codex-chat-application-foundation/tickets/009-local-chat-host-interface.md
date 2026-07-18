# 009 — LocalChatHost Interface와 runtime layout을 설계한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [Account lifecycle과 native config authority의 official surface를 확인한다](003-official-account-config-capabilities.md), [Native workspace와 cwd semantics를 확인한다](004-official-workspace-cwd-semantics.md), [macOS local web app의 workspace 선택 수단을 조사한다](005-local-web-workspace-selection-options.md), [Local companion의 위협과 보호 자산을 고정한다](008-local-companion-threat-model.md)

## Question

채택된 root ownership과 confirmed official capability 아래에서 package artifact, app data, native auth·config state, temporary state와 runtime process lifetime을 숨기는 `LocalChatHost` Interface를 최소 세 가지로 설계하면 어느 대안이 workspace switch, runtime restart와 clean shutdown을 가장 작은 caller knowledge로 지원하는가?

## Resolution evidence

- App-wide runtime, active-workspace runtime과 다른 실질적 대안의 Interface sketch
- Empty app data, login, workspace switch, runtime crash·restart와 shutdown sequence
- Directory calculate·create·validate·override·migration responsibility matrix
- Current `CodexChatRuntime` mechanics를 보존하는 deletion test와 production/deterministic Adapter 검토
- `/prototype` evidence와 사용자의 대안 verdict
