# 023 — StatePatch Review의 Codex-native interaction donor를 확인한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md)

## Question

Exact pin과 current official `openai/codex`의 Plan mode, `request_user_input`, pending interaction replay, MCP elicitation과 first-party TUI·App Server presentation은 `StatePatch` proposal을 같은 Chat에서 보여주고 사용자의 승인·거절·수정·feedback을 다시 AY 실행으로 연결하는 데 어떤 검증된 interaction semantics를 제공하는가?

Codex technical approval과 AY-PLE `UserConfirmation`을 합치거나 custom workflow state machine을 먼저 만들지 않는다. 이번 grilling에서 사용자가 확정한 standing input은 `StatePatch`가 `ModelingRun`과 독립적인 durable product interaction이고 custom MCP가 pending proposal 생성까지만 소유한다는 경계다. 열린 MCP tool call·같은 native Turn에 사용자 응답을 반환하는 방식과, durable product decision 뒤 후속 native Turn을 시작하는 방식의 identity·lifecycle·reload·restart·stale·duplicate·cancel assumption을 비교해 first vertical이 흡수할 donor pattern과 confirmed residual만 판정한다.

## Answer

First vertical은 `propose_state_patch` MCP call과 origin native `Turn`을 Review 동안 열어 두지 않는다. Tool은 validated pending `StatePatch`를 durable하게 만들고 stable patch identity를 반환한 뒤 끝나며, App-owned `StatePatch` persistence와 decision reconciliation이 reload·Server/runtime restart·stale·duplicate·unknown outcome을 정산한다. `UserConfirmation`만 confirmed `SemesterModel` apply authority를 가지며, Agent continuation이 필요할 때만 decision settlement 뒤 같은 native Thread에 별도 follow-up `Turn`을 시작해 patch identity와 decision receipt를 context로 전달한다.

Exact pin과 current official source의 same-Turn `request_user_input`·MCP elicitation은 live process 안의 pause·answer·pending replay·resolved dismissal을 검증하지만 process restart를 넘는 durable contract가 아니다. Adopted high-level Python SDK도 server request를 노출하고 deferred response하는 public seam이 없으므로 open-call path는 first vertical의 direct reuse 대상이 아니다. Native interaction의 presentation behavior만 adaptation하고 Plan clarification·MCP action·Codex approval의 authority를 AY-PLE product confirmation으로 승격하지 않는다. 근거와 lifecycle matrix, disposition, 009가 승인할 precise premise는 [StatePatch Review interaction donor](../assets/state-patch-review-interaction-donor.md)에 정리했다.

## Resolution evidence

- Exact pin의 Plan mode·`request_user_input` core·App Server protocol과 primary tests, TUI presentation 및 `pending_interactive_replay`의 request·answer·resolve·thread-switch semantics
- Current official Codex manual과 latest first-party source가 exact pin과 다른 경우 version·assumption delta를 분리한 evidence
- MCP elicitation의 Turn·tool-call correlation, open-call lifetime과 App Server·official Python SDK public response seam
- `open MCP call + same Turn`과 `durable UserConfirmation + follow-up Turn`의 owner·identity·recovery·failure matrix
- Technical approval·Plan clarification과 AY-PLE product confirmation에서 재사용할 interaction pattern과 재사용하면 안 되는 authority semantics의 구분
- `direct reuse | behavior adaptation | confirmed residual | deferred` disposition과 009가 승인할 precise first-vertical assumption
- Source evidence가 모순되거나 실제 resume behavior가 불명확할 때만 별도 prototype ticket을 권고하고, 023에서는 production code·prototype·제품 schema를 만들지 않는 범위
