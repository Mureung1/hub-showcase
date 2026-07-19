# 009 — First-vertical runtime sufficiency의 spec readiness를 승인한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md), [Product Skill의 native catalog admission seam을 확인한다](022-skill-catalog-admission-seam.md)

## Question

022는 native `skills/list`가 존재하지만 current·latest high-level Python SDK에는 public catalog read seam이 없다는 capability gap을 확인했다. First vertical은 이 gap을 port하지 않는다. App-managed exact `SKILL.md` path를 `SkillInput`으로 요청하고 selected source·exact quote와 StatePatch proposal validation을 통과하지 못한 `ModelingRun`을 실패 처리하며, receipt는 Skill injection이 검증됐다고 주장하지 않고 requested Skill만 기록한다. Native catalog preflight는 official public seam이 생기거나 실제 silent-skip·Recipe provenance 문제가 제품에서 확인될 때 다시 admission한다.

Grilling에서 first-vertical product mutation boundary는 `Skill → propose_state_patch custom MCP → pending StatePatch → Review·UserConfirmation → App-owned SemesterModel apply`로 정밀화했다. Skill은 판단·evidence extraction을 수행하고, generic state CRUD가 아닌 좁은 `propose_state_patch` tool의 input schema가 proposal contract를 소유한다. App은 selected source·exact quote·workspace·Recipe·`ModelingRun` correlation과 base state를 검증하고 pending proposal만 durable하게 만든 뒤 stable patch identity를 structured tool result로 반환한다. MCP tool은 proposal을 confirm·apply하거나 confirmed `SemesterModel`을 직접 변경할 수 없다. Native MCP 실행 권한과 AY-PLE `UserConfirmation`도 서로를 대신하지 않는다.

StatePatch를 생성하는 first-vertical path에서는 `propose_state_patch` tool input schema가 payload의 단일 정본이다. 같은 payload를 native Turn의 `outputSchema` final result로 다시 요구하지 않으며 Agent final message는 사용자용 설명을 소유한다. 006에서 통과한 `outputSchema`는 official SDK의 범용 structured-result capability evidence로 보존하고, side effect 없이 structured result만 필요한 후속 Skill에서 별도로 사용할 수 있다. 이는 008의 `outputSchema → product validator → StatePatch` 단계를 supersede하며 두 canonical payload의 divergence를 만들지 않는다.

사용자가 Chat에서 proposal 수정을 요청하면 같은 record를 직접 편집하지 않고 새 native Turn·새 `ModelingRun`·새 pending `StatePatch`를 만들며 이전 proposal을 `superseded` history로 보존한다. MCP call·result와 proposal·Review는 별도 job UI가 아니라 같은 Chat transcript의 native·product activity로 누적한다. Exact pin은 custom MCP config와 tool call의 started·completed·result·error lifecycle을 이미 소유하지만 current bridge는 Agent message 외 MCP item을 투영하지 않으므로, app-managed MCP lifecycle·proposal persistence와 MCP Chat projection은 resulting product integration이 소유할 adaptation이다.

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
- 사용자 correction·explicit retry가 새 native Turn·`ModelingRun`·StatePatch를 만들고 이전 proposal을 superseded history로 보존하는 replacement semantics
- App-managed custom MCP lifecycle, invocation-scoped idempotency·unknown-outcome reconciliation과 MCP started·completed·result를 같은 Chat transcript에 투영하는 product integration gate
- 022가 확인한 public-seam gap을 implementation blocker로 사용하지 않은 뒤 confirmed residual owner와 owner 없는 in-scope fog 0
- Multi-conversation·two-client·generic transcript·generic approval center가 actual product need 전에는 deferred이며, 실제 native technical approval이 발생할 때 Browser copy·state를 제품 확인과 구분함을 확인
- `/to-spec` 진행 여부와 resulting spec이 구현할 product-bound boundary에 대한 사용자 승인
