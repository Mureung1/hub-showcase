# 009 — First-vertical runtime sufficiency의 spec readiness를 승인한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md), [Product Skill의 native catalog admission seam을 확인한다](022-skill-catalog-admission-seam.md), [StatePatch Review의 Codex-native interaction donor를 확인한다](023-state-patch-review-interaction-donor.md)

## Question

022는 native `skills/list`가 존재하지만 current·latest high-level Python SDK에는 public catalog read seam이 없다는 capability gap을 확인했다. First vertical은 이 gap을 port하지 않는다. App-managed exact `SKILL.md` path를 `SkillInput`으로 요청하고 selected source·exact quote와 StatePatch proposal validation을 통과하지 못한 product action을 실패 처리한다. `ModelingRun`이 있는 Skill 실행이면 receipt에 validation outcome과 requested Skill을 기록하되 Skill injection이 검증됐다고 주장하지 않는다. Native catalog preflight는 official public seam이 생기거나 실제 silent-skip·Recipe provenance 문제가 제품에서 확인될 때 다시 admission한다.

Grilling에서 first-vertical product mutation boundary는 `Skill invocation 또는 일반 Chat → propose_state_patch custom MCP → pending StatePatch → Review·UserConfirmation → App-owned SemesterModel apply`로 정밀화했다. Skill은 필요한 경우 판단·evidence extraction을 수행하고, generic state CRUD가 아닌 좁은 `propose_state_patch` tool의 input schema가 proposal contract를 소유한다. App은 selected source·exact quote·workspace·base state와 available origin provenance를 검증하고 stable patch identity를 structured tool result로 반환한다. Pending proposal을 receipt로 저장할 수 있지만 first vertical은 unanswered Review의 reload·Server/runtime restart hydration이나 며칠 뒤 native continuation을 보장하지 않는다. MCP tool은 proposal을 confirm·apply하거나 confirmed `SemesterModel`을 직접 변경할 수 없다. Native MCP 실행 권한과 AY-PLE `UserConfirmation`도 서로를 대신하지 않는다.

StatePatch를 생성하는 first-vertical path에서는 `propose_state_patch` tool input schema가 payload의 단일 정본이다. 같은 payload를 native Turn의 `outputSchema` final result로 다시 요구하지 않으며 Agent final message는 사용자용 설명을 소유한다. 006에서 통과한 `outputSchema`는 official SDK의 범용 structured-result capability evidence로 보존하고, side effect 없이 structured result만 필요한 후속 Skill에서 별도로 사용할 수 있다. 이는 008의 `outputSchema → product validator → StatePatch` 단계를 supersede하며 두 canonical payload의 divergence를 만들지 않는다.

`ModelingRecipe`는 versioned Skill 지침, `ModelingInvocation`은 Skill 실행 요청, `ModelingRun`은 실제 Skill 실행 receipt다. `StatePatch`는 AY가 product state 변경을 제안하고 사용자 결정을 요청하는 독립 interaction이므로 한 `ModelingRun`에서 0개·여러 개가 생길 수 있고 Skill 없는 일반 Chat Turn에서도 생길 수 있다. 필수 FK나 1:1 lifecycle을 두지 않고 필요할 때만 native Thread·Turn과 optional `ModelingRun` origin provenance를 기록한다. MCP 재전송 중복은 MCP server가 실제 받는 App-generated request·idempotency key와 returned stable patch identity 범위에서 정산한다. Native `toolCallId`는 execution provenance일 뿐 server-side dedupe key로 가정하지 않으며 domain cardinality로 중복을 막지 않는다.

MCP call·result와 proposal·Review는 별도 job UI가 아니라 같은 Chat transcript의 native·product activity로 누적한다. Exact pin은 custom MCP config와 tool call의 started·completed·result·error lifecycle을 이미 소유하지만 current bridge는 Agent message 외 MCP item을 투영하지 않으므로, app-managed MCP lifecycle과 MCP Chat projection은 resulting product integration이 소유할 adaptation이다. [023](023-state-patch-review-interaction-donor.md)의 revised donor 판정에 따라 first vertical은 exact Plan mode의 built-in `request_user_input`을 current ordered Python SDK의 bounded patch로 열고 같은 native Turn에서 답을 돌려준다. Browser는 App이 검증한 exact patch와 근거를 표시하며, App은 답변을 Codex에 반환하기 전에 exact active patch binding을 확인한다. 수락·수정·거절이 product decision이면 App-owned `StatePatch` persistence와 decision reconciliation이 settled `UserConfirmation`·apply outcome을 one-settlement하고, 일반 Plan clarification이면 학업 상태를 바꾸지 않는다. 답변 전 process continuity를 잃으면 Turn을 `interrupted`로 끝내고 아무것도 apply하지 않은 채 다시 실행한다. Process restart 뒤 native prompt resume, 며칠 뒤 Review와 generic workflow state machine은 deferred다.

이 완화된 경계에서 첫 Assignment vertical의 runtime contract, adopted official Python SDK·local-web boundary와 representative trace가 product-bound companion의 implementation-ready spec으로 넘어갈 만큼 falsifiable한가? General Chat completeness나 이미 기각한 surface 비교를 다시 선행조건으로 넣지 않고 remaining in-scope fog와 verification claim을 승인한다.

## Resolution evidence

- 이미 통과한 exact pin·Account read·explicit `cwd`·valid `SkillInput`·범용 `outputSchema` capability·native settlement·bounded lifecycle과 3회 live representative trace matrix
- Current adapter survivor·deletion 범위와 exact source·provenance·upgrade assumption
- [022](022-skill-catalog-admission-seam.md)의 capability gap evidence를 보존하되 first vertical에서 `skills/list`·exact-pin narrow port를 구현하지 않고, requested Skill receipt·strict result validation·재-admission trigger로 범위를 낮춘 disposition
- Resulting implementation이 통과해야 할 `auto_review + workspace_write`, protected RawMaterial·confirmed state, Account not-ready native-start-0와 full Browser product E2E acceptance matrix
- Product state reload, native terminal·failure·unknown과 retry를 포함한 first-vertical success·negative trace를 이미 통과한 runtime evidence와 구현 후 검증 gate로 분리한 판정
- AY-PLE Review·`UserConfirmation`과 Codex execution approval·sandbox를 독립 boundary로 유지하는 owner와 Browser 표현
- `propose_state_patch` MCP가 pending proposal만 생성하고 stable patch identity를 반환하며, confirmation 전 confirmed `SemesterModel`은 불변인 product authority boundary
- StatePatch payload는 MCP tool input schema만 canonical contract로 사용하고 Agent final message나 `outputSchema`에 같은 payload를 복제하지 않는 single-source 판정
- StatePatch와 `ModelingRun` 사이에 필수 FK·1:1 cardinality를 두지 않고 native Thread·Turn과 optional run provenance만 연결하는 독립 lifecycle
- App-managed custom MCP lifecycle, explicit App-generated request-scoped idempotency·unknown-outcome reconciliation과 MCP started·completed·result를 같은 Chat transcript에 투영하는 product integration gate
- [023](023-state-patch-review-interaction-donor.md)에서 선택한 native Plan `request_user_input` same-Turn lifecycle, ordered Python SDK의 deferred response patch와 answer 전 continuity loss를 `interrupted`·no-apply·retry로 정산하는 failure contract
- 009 resolution 전에 Product Brief의 mandatory `run reference`와 Codex-native composition의 `outputSchema → ModelingRun → StatePatch` 경로를 optional origin provenance·MCP canonical proposal contract로 정렬하고, Review·`UserConfirmation` lifecycle도 run receipt와 독립임을 owning docs에 반영한 evidence
- 022가 확인한 public-seam gap을 implementation blocker로 사용하지 않은 뒤 confirmed residual owner와 owner 없는 in-scope fog 0
- Multi-conversation·two-client·generic transcript·generic approval center가 actual product need 전에는 deferred이며, 실제 native technical approval이 발생할 때 Browser copy·state를 제품 확인과 구분함을 확인
- `/to-spec` 진행 여부와 resulting spec이 구현할 product-bound boundary에 대한 사용자 승인
