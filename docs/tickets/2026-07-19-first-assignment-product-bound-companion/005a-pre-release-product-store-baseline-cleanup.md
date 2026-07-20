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

- Production product store reader와 writer는 current canonical `formatVersion: 2` exact contract만 지원한다. `formatVersion`은 fail-closed marker로 유지하며 이 cleanup만을 위해 version을 올리지 않는다.
- v1 decoder·v1→v2 migration과 corrective 이전 v2 `canonicalPayload` compatibility normalization을 제거한다. Production reader는 historical key·shape를 식별하는 recognizer를 남기지 않으며 historical fixtures는 generic unsupported/invalid rejection을 검증하는 test input으로만 사용한다. Ticket 005의 current canonical StatePatch·UserConfirmation·Assignment semantics와 atomic persistence authority는 유지한다.
- Exact current decoder를 통과하지 못한 store는 historical variant를 구분하지 않는 Browser-safe actionable `incompatible/readOnly` outcome으로 연다. Automatic rewrite·downgrade를 하지 않고 malformed current-v2, aggregate invariant 손상과 future version을 포함한 original store bytes를 보존한다.
- Workspace activation·refresh 실패는 기존 active workspace와 Browser snapshot을 유지한다. Unsupported store를 empty state로 대체하거나 startup에서 자동 reset하지 않는다.
- 별도 product-store reset command/helper를 만들지 않는다. Managed development workspace는 기존 ownership-checked explicit rematerialization으로 복구하고 E2E는 매 실행 fresh workspace를 사용한다. Caller-owned `SemesterWorkspace`는 incompatible 상태와 original bytes를 유지하며 Server startup·Browser operation·materializer가 자동 reset하지 않는다.
- Tracked seed와 caller-owned original TXT는 migration·rematerialization·cleanup 대상이 아니다. Managed development rematerialization과 E2E cleanup은 기존 ownership boundary 안의 app-owned copy/run root에만 적용한다.
- Store `formatVersion`, physical filename과 compatibility diagnostics는 Server 내부 계약에 남기고 Browser product snapshot/API에는 추가하지 않는다.
- Ticket 009 cutover 전에는 pre-release schema로서 current canonical format 하나만 지원한다. Ticket 009는 당시 current format을 첫 durable compatibility baseline으로 확정하되 generic migration framework를 선행 구현하지 않는다.
- Ticket 006의 `ModelingRun`, guard journal, scratch/lease와 action stream을 선행 구현하거나 별도 store를 만들지 않는다.

## Acceptance Criteria

- [ ] Current canonical v2 store를 reopen하면 Course, RawMaterial, Assignment, StatePatch, UserConfirmation과 confirmed revision이 손실 없이 복원된다.
- [ ] v1, pre-corrective/noncanonical v2, malformed current-v2와 future-version fixtures는 historical shape별 production branch 없이 같은 generic rejection boundary로 열리고, activation 전후 store bytes가 exact하게 같다.
- [ ] Invalid aggregate relation도 fail closed하며 original bytes와 이전 active workspace/snapshot을 보존한다.
- [ ] Managed development workspace는 기존 explicit rematerialization으로만 복구되고 tracked seed digest를 보존한다. E2E는 서로 겹치지 않는 fresh workspace를 사용한다.
- [ ] Caller-owned workspace의 unsupported/invalid store는 incompatible 상태와 original store·TXT bytes를 유지하며 startup·ordinary activation에서 자동 reset되지 않는다.
- [ ] 새 product-store reset command/helper 또는 Browser reset operation을 추가하지 않는다.
- [ ] Browser bootstrap·activation·refresh·preview contract에 store version, physical path와 internal compatibility payload가 노출되지 않는다.
- [ ] Removed migration tests는 current-only baseline과 bytes-preserving rejection tests로 대체되고 Ticket 005의 canonical replay·Review transaction regressions은 계속 통과한다.
- [ ] Store current behavior owner인 `apps/server/README.md`에서 v1·pre-corrective v2 migration 설명을 제거하고 pre-009 current-only behavior를 기록한다.

## Verification

- Targeted test or command: focused `semester-workspace`, `state-patch-review`와 `semester-workspace-materializer` tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: managed development workspace의 existing explicit rematerialization과 두 fresh E2E root를 실행해 tracked seed·caller-owned workspace가 변하지 않고 run state가 겹치지 않는지 확인한다. Provider live smoke는 필요하지 않다.

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
