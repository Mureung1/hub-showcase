# 007 — First-party surface가 general Chat client 없이 핵심 product flow를 닫는지 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [First-vertical runtime contract와 existing Codex surface의 overlap을 확인한다](005-first-vertical-runtime-overlap.md)

## Question

Codex Skill·Plugin·MCP와 first-party host를 사용하면 AY-PLE가 독립 general Chat client를 소유하지 않고도 explicit local workspace, 두 TXT 입력, structured Assignment candidate와 사용자 Review로 이어지는 핵심 product flow를 제공할 수 있는가? 첫 product invariant가 충족되지 않으면 더 큰 integration을 만들지 않고 surface assumption의 한계로 기록한다.

## Resolution evidence

- 사용한 first-party surface의 current official availability·permission·local filesystem·structured output·custom UI boundary
- 004 representative journey 중 first-party host가 소유하는 account, conversation, approval와 lifecycle 범위
- AY-PLE가 별도로 소유해야 하는 SourceSelection, `StatePatch`, side-by-side evidence Review와 durable `SemesterModel` boundary
- 가능한 경우 두 TXT와 Assignment schema를 사용한 smallest throwaway trace, 불가능한 경우 primary evidence가 확인한 first missing invariant
- First-party entrypoint, own 3-pane thin companion과 hybrid candidate의 assumption delta
- Production plugin·MCP server·Apps SDK UI를 만들지 않은 `/prototype` verdict
