# 013 — 두 client와 restart 후 resume로 ownership을 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [LocalChatHost Interface와 runtime layout을 설계한다](009-local-chat-host-interface.md), [Conversation Interface를 세 가지로 설계한다](012-conversation-interface-alternatives.md)

## Question

선택한 Host와 Conversation Interface는 두 Browser client가 서로의 idle·active handle을 교체하지 않게 하고, Browser reload와 Server restart 뒤 workspace-filtered list → read → resume → follow-up을 native identity remap이나 raw protocol 노출 없이 표현할 수 있는가?

## Resolution evidence

- Thin client A/B, opaque native ID와 Host restart를 사용한 bounded trace
- Wrong-client·wrong-workspace rejection과 active turn 중 navigation negative control
- Restart 전후 list/read/resume/follow-up sequence와 각 state owner
- Confirmed official surface로 가능한 동작과 추가 bridge·Server capability가 필요한 지점
- Production 구현이 아닌 throwaway `/prototype` evidence와 verdict
