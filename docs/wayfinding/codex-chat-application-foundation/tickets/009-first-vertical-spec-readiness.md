# 009 — First-vertical runtime sufficiency의 spec readiness를 승인한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [Adopted local-web path의 runtime disposition을 확정한다](008-product-surface-runtime-disposition.md), [Product Skill의 native catalog admission seam을 확인한다](022-skill-catalog-admission-seam.md)

## Question

022는 native `skills/list`가 존재하지만 current·latest high-level Python SDK에는 public catalog read seam이 없다는 capability gap을 확인했다. First vertical은 이 gap을 port하지 않는다. App-managed exact `SKILL.md` path를 `SkillInput`으로 요청하고 `outputSchema`·selected source·exact quote validation을 통과하지 못한 `ModelingRun`을 실패 처리하며, receipt는 Skill injection이 검증됐다고 주장하지 않고 requested Skill만 기록한다. Native catalog preflight는 official public seam이 생기거나 실제 silent-skip·Recipe provenance 문제가 제품에서 확인될 때 다시 admission한다.

이 완화된 경계에서 첫 Assignment vertical의 runtime contract, adopted official Python SDK·local-web boundary와 representative trace가 product-bound companion의 implementation-ready spec으로 넘어갈 만큼 falsifiable한가? General Chat completeness나 이미 기각한 surface 비교를 다시 선행조건으로 넣지 않고 remaining in-scope fog와 verification claim을 승인한다.

## Resolution evidence

- 이미 통과한 exact pin·Account read·explicit `cwd`·valid `SkillInput`·`outputSchema`·native settlement·bounded lifecycle과 3회 live representative trace matrix
- Current adapter survivor·deletion 범위와 exact source·provenance·upgrade assumption
- [022](022-skill-catalog-admission-seam.md)의 capability gap evidence를 보존하되 first vertical에서 `skills/list`·exact-pin narrow port를 구현하지 않고, requested Skill receipt·strict result validation·재-admission trigger로 범위를 낮춘 disposition
- Resulting implementation이 통과해야 할 `auto_review + workspace_write`, protected RawMaterial·confirmed state, Account not-ready native-start-0와 full Browser product E2E acceptance matrix
- Product state reload, native terminal·failure·unknown과 retry를 포함한 first-vertical success·negative trace를 이미 통과한 runtime evidence와 구현 후 검증 gate로 분리한 판정
- AY-PLE Review·`UserConfirmation`과 Codex execution approval·sandbox를 독립 boundary로 유지하는 owner와 Browser 표현
- 022가 확인한 public-seam gap을 implementation blocker로 사용하지 않은 뒤 confirmed residual owner와 owner 없는 in-scope fog 0
- Multi-conversation·two-client·generic transcript·generic approval center가 actual product need 전에는 deferred이며, 실제 native technical approval이 발생할 때 Browser copy·state를 제품 확인과 구분함을 확인
- `/to-spec` 진행 여부와 resulting spec이 구현할 product-bound boundary에 대한 사용자 승인
