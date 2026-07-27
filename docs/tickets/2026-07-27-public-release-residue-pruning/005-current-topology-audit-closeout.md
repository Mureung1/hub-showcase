# 005 — Current topology와 workspace keep 판정을 반영하고 감사를 닫는다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-public-release-residue-pruning.md`

## What It Delivers

Current source, package 문서, 구현 지도와 Development Backlog가 같은 제품 경계를 설명한다. Personal product는 global Codex Account Readiness와 workspace Runtime만 유지하고, v3 `SemesterWorkspace` kernel은 adopted future workspace authority로 보존하며, public release lane 감사는 완료되어 다음 `ImportSource` capability가 canonical frontier가 된다.

## Spec Traceability

- User stories: 1, 2, 3, 4, 5
- Implementation contract: Module Responsibilities and Seams, Implementation Decisions, Testing Decisions, Further Notes

## Slice-Specific Constraints

- 이 ticket은 integration sequence의 final integrate-and-verify 단계다. Repository-wide PR-ready checks와 Browser external seam은 이 ticket에서 최종 약속한다.
- 작업 순서와 완료 상태는 Development Backlog에서만 변경한다. Current topology는 구현 지도, package별 exact behavior는 관련 README, Runtime 격리 경계는 architecture owner에 먼저 반영한다.
- Active ADR 0011의 current patch consequence가 eight-patch Runtime과 일치하도록 정리하되 official SDK direct reuse 결정은 바꾸지 않는다.
- Historical ADR 0017의 당시 결정·구현 근거는 보존하고, current-state banner와 결과만 remaining primitive가 제거된 사실과 일치시킨다.
- ADR 0014와 `@ay-ple/semester-workspace` v3 kernel은 유지한다. Current Server에 연결하거나 현재 제품 capability로 표현하지 않는다.
- Current v2 decoder·parity, original-byte preservation과 no-migration boundary를 유지한다.
- Historical public npx·Landing spec, ticket, Wayfinder와 evidence를 삭제하거나 unchecked criteria를 current backlog로 옮기지 않는다.
- Parent spec은 이 ticket에서 닫거나 수정하지 않는다. `/implement` lifecycle이 모든 child ticket 완료 뒤 parent spec closeout을 별도로 수행한다.

## Acceptance Criteria

- [x] Runtime README가 workspace-only survivor contract, fresh Account Readiness, eight-patch stack과 reduced bridge command roster를 정확히 설명한다.
- [x] Codex Chat 구현 지도와 Runtime 격리 문서에서 managed account primitive·`auth-only` current gap이 사라지고 global `CODEX_HOME` authority가 유지된다.
- [x] Server·Chat Shell README가 current Account Readiness와 no in-app login behavior를 계속 정확히 설명한다.
- [x] `@ay-ple/semester-workspace` README와 ADR 0014가 v3 kernel `Keep`, current consumer 부재와 no capability claim을 일관되게 설명한다.
- [x] Historical ADR 0017은 managed lifecycle이 Runtime package에서도 제거됐음을 current-state note로 기록하되 당시 결정을 보존한다.
- [x] Development Backlog의 public release lane 감사 상위 todo, surface 분류와 Runtime managed account·v3 kernel 판정 하위 todo가 구현 증거에 맞게 완료된다.
- [x] Backlog의 다음 미완료 상위 capability가 `ImportSource` journey이며 이 ticket이 그 구현을 시작하지 않는다.
- [x] Non-historical production·testing graph에 managed login/logout, `auth-only`, removed type·command·patch reference가 0건이다.
- [x] Chat Shell E2E가 `ready | not_ready | unavailable`, workspace read preservation과 readiness별 mutation guard를 통과한다.
- [x] `@ay-ple/semester-workspace` suite와 Server v2 parity가 v3 retain·v2 compatibility 경계를 통과한다.
- [x] Exact Runtime gates와 repository PR-ready gates가 모두 green이다.

## Verification

- Targeted test or command:
  - Account Readiness 관련 `@ay-ple/chat-shell` Playwright tests — 통과. `not_ready | unavailable`의 workspace read 보존·mutation guard와 full E2E의 ready path를 확인했다.
  - `npm test -w @ay-ple/semester-workspace` — 통과. V3 admission·setup kernel과 current-v2 426-case compatibility roster를 유지한다.
  - `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/semester-workspace-store-v2-parity.test.ts` — 통과. Server와 package decoder가 426 vectors에서 일치한다.
  - `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` — 통과. Eight-patch deterministic derivation, official suite 162 passed·38 skipped, Ruff와 provenance가 green이다.
  - `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime` — 통과. Synthetic·actual-child 23 tests, bundle digest 검증과 Ruff가 green이다.
  - `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime` — 통과. Node actual-child 82 tests, native-context 23 tests, exact local-provider와 전후 bundle 검증이 green이다.
  - Production·testing residue `rg` audit와 patch roster 검사 — 통과. Removed type·role·patch reference는 0건이고 removed bridge command literal은 strict unknown-command negative fixture에만 남으며 patch file은 exact `0001`–`0008`이다.
- Repository checks:
  - `npm test` — 통과
  - `npm run test:e2e` — 통과. Chat Shell 32 tests와 camp demo 8 tests가 green이다.
  - `npm run typecheck` — 통과
  - `npm run build` — 통과
  - `npm run lint -w @ay-ple/chat-shell` — 통과
  - `npm run check:docs-links` — 통과
- Manual or live smoke:
  - `npm run test:product-entrypoint` — 통과. Canonical `npm run dev -- --root ... --workspace ... --adopt-existing`가 global `CODEX_HOME`, persistent local profile, caller-owned workspace와 실제 Server·Chat Shell·bridge process graph를 유지한다.
  - External credential을 쓰는 live-provider trace는 실행하지 않았다. Browser E2E와 exact local-provider evidence를 사용했다.

## Result

Current source와 owning docs가 workspace-only Runtime, caller의 global `CODEX_HOME`, fresh Account Readiness, exact eight-patch stack과 reduced bridge roster를 같은 topology로 설명한다. Public release lane의 managed account·`auth-only` surface는 current gap이나 backlog target에서 사라졌고, historical ADR 0017의 당시 결정은 current-state pointer와 분리해 보존했다. `@ay-ple/semester-workspace` v3 kernel은 ADR 0014의 adopted future authority로 유지하되 current Server capability로 주장하지 않으며 current-v2 original-byte-preserving compatibility도 유지한다.

Development Backlog의 public release 감사 항목을 구현 증거에 맞게 완료했고 다음 미완료 상위 capability를 `ImportSource`로 고정했지만 그 구현은 시작하지 않았다. Canonical product entrypoint smoke도 현재 local CLI와 실제 process graph를 검증하도록 갱신했다. Standards·Spec 병렬 최종 리뷰에는 남은 finding이나 scope creep이 없다. 구현 commit은 `8287f3deb`, review 정렬 commit은 `fb865920b`, `5083db44f`다.

## Blocked By

- `docs/tickets/2026-07-27-public-release-residue-pruning/004-eight-patch-runtime-bundle-baseline.md` — Exact SDK patch stack과 production bundle을 8단계로 재고정한다

## Starting Points

- `docs/product/ay-ple-development-backlog.md`
- `docs/architecture/codex-chat-implementation-map.md`
- `docs/architecture/codex-runtime-isolation.md`
- `docs/adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md`
- `docs/adr/0014-create-app-owned-normalized-semester-workspaces.md`
- `docs/adr/0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md`
- `packages/codex-chat-runtime/README.md`
- `packages/semester-workspace/README.md`
- `apps/server/README.md`
- `apps/chat-shell/README.md`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/server/src/semester-workspace-store-v2-parity.test.ts`
