# 023 — StatePatch Review의 Codex-native interaction donor를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md)

## Question

Exact pin과 current official `openai/codex`의 Plan mode, `request_user_input`, pending interaction replay, MCP elicitation과 first-party TUI·App Server presentation은 `StatePatch` proposal을 같은 Chat에서 보여주고 사용자의 승인·거절·수정·feedback을 다시 AY 실행으로 연결하는 데 어떤 검증된 interaction semantics를 제공하는가?

Codex technical approval과 AY-PLE `UserConfirmation`을 합치거나 custom workflow state machine을 먼저 만들지 않는다. 이번 grilling에서 사용자가 확정한 standing input은 `StatePatch`가 `ModelingRun`과 독립적인 durable product interaction이고 custom MCP가 pending proposal 생성까지만 소유한다는 경계다. 열린 MCP tool call·같은 native Turn에 사용자 응답을 반환하는 방식과, durable product decision 뒤 후속 native Turn을 시작하는 방식의 identity·lifecycle·reload·restart·stale·duplicate·cancel assumption을 비교해 first vertical이 흡수할 donor pattern과 confirmed residual만 판정한다.

## Resolution evidence

- Exact pin의 Plan mode·`request_user_input` core·App Server protocol과 primary tests, TUI presentation 및 `pending_interactive_replay`의 request·answer·resolve·thread-switch semantics
- Current official Codex manual과 latest first-party source가 exact pin과 다른 경우 version·assumption delta를 분리한 evidence
- MCP elicitation의 Turn·tool-call correlation, open-call lifetime과 App Server·official Python SDK public response seam
- `open MCP call + same Turn`과 `durable UserConfirmation + follow-up Turn`의 owner·identity·recovery·failure matrix
- Technical approval·Plan clarification과 AY-PLE product confirmation에서 재사용할 interaction pattern과 재사용하면 안 되는 authority semantics의 구분
- `direct reuse | behavior adaptation | confirmed residual | deferred` disposition과 009가 승인할 precise first-vertical assumption
- Source evidence가 모순되거나 실제 resume behavior가 불명확할 때만 별도 prototype ticket을 권고하고, 023에서는 production code·prototype·제품 schema를 만들지 않는 범위
