# 007 — First-party surface가 general Chat client 없이 핵심 product flow를 닫는지 검증한다

## Wayfinder ticket

- Type: prototype
- State: out-of-scope
- Blocked by: None

## Question

Codex Skill·Plugin·MCP와 first-party host를 사용하면 AY-PLE가 독립 general Chat client를 소유하지 않고도 explicit local workspace, 두 TXT 입력, structured Assignment candidate와 사용자 Review로 이어지는 핵심 product flow를 제공할 수 있는가? 첫 product invariant가 충족되지 않으면 더 큰 integration을 만들지 않고 surface assumption의 한계로 기록한다.

## Resolution evidence

- 사용한 first-party surface의 current official availability·permission·local filesystem·structured output·custom UI boundary
- 004 representative journey 중 first-party host가 소유하는 account, conversation, approval와 lifecycle 범위
- AY-PLE가 별도로 소유해야 하는 SourceSelection, `StatePatch`, side-by-side evidence Review와 durable `SemesterModel` boundary
- 가능한 경우 두 TXT와 Assignment schema를 사용한 smallest throwaway trace, 불가능한 경우 primary evidence가 확인한 first missing invariant
- First-party entrypoint, own 3-pane thin companion과 hybrid candidate의 assumption delta
- Production plugin·MCP server·Apps SDK UI를 만들지 않은 `/prototype` verdict

## Out-of-scope rationale

[ADR 0011](../../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)은 official Python SDK를 runtime baseline으로, [ADR 0009](../../../adr/0009-use-a-macos-first-local-web-app-product-path.md)은 macOS local-web app을 제품 경로로 이미 채택했다. 005도 first vertical의 Account·`cwd`·Skill·`outputSchema`·native settlement가 이 경로에서 흡수 가능하다고 확인했다. Direct contradiction 없이 `codex exec`·first-party host·hybrid를 다시 prototype하는 것은 검증을 위한 검증이며 채택 결정을 불필요하게 재개방하므로 active graph에서 제외한다.

First-party 구현은 006이 exact SDK behavior를 확인할 때의 conformance donor로만 사용한다. 006이 채택 경로로는 해결할 수 없는 precise invariant를 실제로 확인한 경우에만 별도 ADR reopen ticket을 새로 admission하며, 007을 fallback frontier로 유지하지 않는다.
