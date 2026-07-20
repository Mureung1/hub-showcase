# 005a — Pre-release product store baseline을 정리한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

아직 user-released compatibility contract가 아닌 workspace-local product store를 current canonical v2 하나로 축소한다. Ticket 009의 첫 product cutover 전에는 구현 과정에서 생긴 v1과 pre-corrective v2를 자동 migration하지 않고, 지원하지 않는 store는 원본 bytes를 보존한 actionable incompatible 상태로 연다.

## Spec Traceability

- User stories: 1, 8, 11, 12
- Implementation contract: Workspace activation and material admission; Development and E2E workspace materialization; Durable state and atomic apply; Compatibility and Migration

## Slice-Specific Constraints

- Pre-release product store reader와 writer는 current canonical `formatVersion: 2`만 지원한다. `formatVersion`은 fail-closed marker로 유지하며 이 cleanup만을 위해 version을 올리지 않는다.
- v1 decoder·v1→v2 migration과 corrective 이전 v2 `canonicalPayload` compatibility normalization을 제거한다. Ticket 005의 current canonical StatePatch·UserConfirmation·Assignment semantics와 atomic persistence authority는 유지한다.
- v1, recognized pre-corrective/noncanonical v2와 future version은 자동 rewrite·downgrade하지 않고 Browser-safe actionable `incompatible/readOnly` outcome으로 연다. Malformed current-v2 record와 aggregate invariant 손상도 fail closed하고 원본 store bytes를 바꾸지 않는다.
- Workspace activation·refresh 실패는 기존 active workspace와 Browser snapshot을 유지한다. Unsupported store를 empty state로 대체하거나 startup에서 자동 reset하지 않는다.
- Original TXT와 caller-owned `SemesterWorkspace` material은 migration·reset·cleanup 대상이 아니다. App-owned development/E2E product store reset은 ownership을 검증하는 repository-owned materializer command/helper의 explicit action으로만 허용하고, Server startup이나 Browser product operation으로 노출하지 않으며 원본 materials를 수정·삭제하지 않는다.
- Store `formatVersion`, physical filename과 compatibility diagnostics는 Server 내부 계약에 남기고 Browser product snapshot/API에는 추가하지 않는다.
- 정책 경계는 `before Ticket 009 cutover: pre-release schema, current canonical format only`와 `after Ticket 009 cutover: durable user state, explicit version bump/migration policy begins`로 둔다. Post-cutover migration policy 자체는 Ticket 009가 소유한다.
- Ticket 006의 `ModelingRun`, guard journal, scratch/lease와 action stream을 선행 구현하거나 별도 store를 만들지 않는다.

## Acceptance Criteria

- [ ] Current canonical v2 store를 reopen하면 Course, RawMaterial, Assignment, StatePatch, UserConfirmation과 confirmed revision이 손실 없이 복원된다.
- [ ] v1, pre-corrective/noncanonical v2와 future-version fixture는 migration·rewrite 없이 actionable incompatible로 열리고, activation 전후 store bytes가 exact하게 같다.
- [ ] Malformed current-v2와 aggregate relation 손상은 fail closed하며 original bytes와 이전 active workspace/snapshot을 보존한다.
- [ ] Startup과 ordinary activation은 product store를 자동 reset하지 않는다. App-owned development/E2E store의 explicit reset만 성공하고 caller-owned workspace에는 적용되지 않는다.
- [ ] Explicit reset 전후 original TXT와 user-owned materials의 digest가 같다.
- [ ] Browser bootstrap·activation·refresh·preview contract에 store version, physical path와 internal compatibility payload가 노출되지 않는다.
- [ ] Removed migration tests는 current-only baseline과 bytes-preserving rejection tests로 대체되고 Ticket 005의 canonical replay·Review transaction regressions은 계속 통과한다.
- [ ] Store current behavior owner인 `apps/server/README.md`에서 v1·pre-corrective v2 migration 설명을 제거하고, pre-009 current-only와 post-009 explicit migration-policy 경계를 한 번만 기록한다.

## Verification

- Targeted test or command: focused `semester-workspace`, `state-patch-review`와 `semester-workspace-materializer` tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: owned development/E2E fixture에서 explicit store reset을 실행해 product store만 초기화되고 original TXT digest가 유지되는지 확인한다. Provider live smoke는 필요하지 않다.

## Blocked By

- [005-state-patch-review-authority.md](005-state-patch-review-authority.md) — current canonical StatePatch Review authority와 v2 persistence baseline을 완성한다

## Starting Points

- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/server/src/state-patch-review.test.ts`
- `apps/server/src/product-http.ts`
- `apps/chat-shell/src/product-api.ts`
- `scripts/semester-workspace-materializer.mts`
- `scripts/semester-workspace-materializer.test.mts`
- `apps/server/README.md`
