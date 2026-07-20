# 023 — StatePatch Review의 Codex-native interaction donor를 확인한다

## Wayfinder ticket

- Type: research
- State: resolved
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md)

## Question

Exact pin과 current official `openai/codex`의 Plan mode, `request_user_input`, pending interaction replay, MCP elicitation과 first-party TUI·App Server presentation은 `StatePatch` proposal을 같은 Chat에서 보여주고 사용자의 승인·거절·수정·feedback을 다시 AY 실행으로 연결하는 데 어떤 검증된 interaction semantics를 제공하는가?

Codex technical approval과 AY-PLE `UserConfirmation`을 합치거나 custom workflow state machine을 먼저 만들지 않는다. 조사 당시에는 unanswered `StatePatch` Review도 reload·Server/runtime restart를 넘어야 한다는 standing input 아래 열린 native interaction과 durable product decision·후속 native Turn을 비교했다. 사용자는 후속 결정에서 이 전제를 철회했다. First vertical의 근본 durability는 settled `UserConfirmation`과 confirmed `SemesterModel`에 한정하고, unanswered prompt·active native Turn·며칠 뒤 Review는 필요가 확인될 때 다시 admission한다. 이 전제에서 exact Plan mode와 `request_user_input`을 current ordered Python SDK patch 체계로 가져올 수 있는지 다시 판정한다.

## Answer

First vertical은 exact Plan mode의 built-in `request_user_input`을 같은 native `Turn`에서 직접 재사용한다. `propose_state_patch`가 App이 검증한 proposal과 stable patch identity를 반환한 뒤 Agent가 `request_user_input`으로 수락·수정 요청·거절을 묻고, Browser 답변은 원래 function call output으로 돌아가 같은 `Turn`을 계속한다. MCP elicitation은 이 경로에 사용하지 않는다.

Unanswered prompt와 active `Turn`은 process-local interaction이다. 답변 전 Browser·Server/runtime continuity를 잃으면 `Turn`을 `interrupted`로 끝내고 confirmed `SemesterModel`을 바꾸지 않은 채 다시 실행한다. Pending `StatePatch`를 receipt로 저장할 수는 있지만 first vertical은 원래 native call resume나 며칠 뒤 Review를 보장하지 않는다. 반대로 App이 exact patch binding을 검증하고 settled `UserConfirmation`과 apply를 기록한 뒤에는 그 product state가 authoritative하며, Codex answer 전달이 유실돼도 같은 patch를 재적용하지 않는다.

Current high-level Python SDK에는 Plan `collaborationMode`, non-blocking deferred server-request response와 Browser projection seam이 없다. 그러나 이 repository가 exact SDK를 ordered patch로 유지하므로 이는 open-call path의 기각 사유가 아니라 bounded next patch candidate다. Sole reader에서 private sync handler를 block하지 않고 exact `item/tool/requestUserInput`을 queue·later response로 운반하며, bridge의 request·answer command와 Plan item projection까지 좁게 연결한다. `request_user_input` 답변은 conversation continuation이고, `UserConfirmation`만 confirmed `SemesterModel` apply authority라는 구분은 유지한다. 근거와 revised lifecycle matrix, patch seam, 009가 승인할 precise premise는 [StatePatch Review interaction donor](../assets/state-patch-review-interaction-donor.md)에 정리했다.

## Resolution evidence

- Exact pin의 Plan mode·`request_user_input` core·App Server protocol과 primary tests, TUI presentation 및 `pending_interactive_replay`의 request·answer·resolve·thread-switch semantics
- Current official Codex manual과 latest first-party source가 exact pin과 다른 경우 version·assumption delta를 분리한 evidence
- MCP elicitation의 Turn·tool-call correlation, open-call lifetime과 App Server·official Python SDK public response seam
- Selected native Plan `request_user_input` same-Turn path와 deferred durable async Review의 owner·identity·recovery·failure matrix
- Technical approval·Plan clarification과 AY-PLE product confirmation에서 재사용할 interaction pattern과 재사용하면 안 되는 authority semantics의 구분
- `direct reuse | behavior adaptation | confirmed residual | deferred` disposition과 009가 승인할 precise first-vertical assumption
- Native semantics는 source·primary tests로 고정하고, resulting implementation에서 deferred response·reader liveness·Plan projection·Browser E2E를 검증하며 023 자체에서는 production code·prototype·제품 schema를 만들지 않는 범위
