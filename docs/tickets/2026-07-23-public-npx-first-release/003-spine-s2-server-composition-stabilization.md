# 003 — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Public host와 후속 feature router가 개발 entrypoint나 TCP listener를 재사용하지 않고도 기존 Express product application을 조립·종료할 수 있는 behavior-preserving seam을 만든다. 동시에 current First Assignment workbench의 fail-closed debt를 Browser 최고 seam에서 닫아, 새 first-run root를 얹기 전 surviving academic kernel의 immutable regression oracle과 `spineTipSha`를 확정한다.

## Spec Traceability

- User stories: 10, 16
- Implementation contract: Module Responsibilities and Seams; Donor, refactor와 replacement; Parallel delivery contract — `Spine S2`
- Testing decisions: Highest practical seam의 current-workbench fail-closed oracle; 모든 integration merge의 root gate

## Slice-Specific Constraints

- Express application construction, TCP listener ownership, environment/development entrypoint와 signal wiring을 분리하되 현재 route, exact Origin guard, workspace-first development activation, response bytes와 bounded close behavior를 바꾸지 않는다.
- `dotenv.config()` 같은 process environment mutation은 executable development entrypoint에만 남긴다. Public host가 소비할 Server export는 listener-independent이고 import side effect가 없어야 한다.
- Current-workbench Browser consolidated trace는 unselected source evidence, quote mismatch, stale base, duplicate/late Review decision family가 safe failure와 confirmed mutation 0으로 끝남을 검증한다. Existing lower-seam exhaustive tests를 삭제·완화하지 않는다.
- OAuth, setup, Runtime delivery, static public host, 새 UI와 route behavior는 구현하지 않는다.
- Wide rewrite나 current controller/service redesign을 하지 않는다. Composition split은 mechanical하고 각 단계에서 repository가 green이어야 한다.
- S2 fixed reviewed SHA가 immutable `spineTipSha`다. 이후 lane은 exact handoff를 받고 sibling branch를 merge·cherry-pick하지 않는다. Shared Server composition, root manifests/lock와 frozen contract delta는 C만 소유한다.
- Coordinator는 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Host-consumable Server application factory가 TCP bind, process environment resolution과 signal registration 없이 Express application·bounded close handle을 반환한다.
- [ ] Development executable은 기존 local origin, workspace activation, listener와 signal behavior를 같은 observable result로 조립한다.
- [ ] Import만으로 `.env` load, listener bind, Runtime spawn 또는 workspace mutation이 일어나지 않는다.
- [ ] Product route, Origin guard, NDJSON framing, current activation과 shutdown regression test가 split 전과 같은 결과를 낸다.
- [ ] 하나의 Browser trace가 invalid evidence/unselected source, quote mismatch, stale base와 duplicate/late Review를 거쳐 confirmed state mutation 0을 증명한다.
- [ ] Existing lower-seam validator·Review tests와 current Browser workbench behavior가 유지된다.
- [ ] Fixed reviewed commit과 full root green receipt가 `spineTipSha` handoff artifact로 남는다.

## Verification

- Targeted test or command: Server workspace tests, `npm run test:e2e -w @ay-ple/chat-shell`, `npm run test:product-entrypoint`, actual shutdown tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Provider-free current workbench를 1440×900 desktop에서 열어 fail-closed trace와 clean shutdown을 확인한다.

## Blocked By

- [002-spine-s1-frozen-contracts-fixtures.md](002-spine-s1-frozen-contracts-fixtures.md) — Spine S1 — frozen contract와 fixture를 고정한다

## Starting Points

- `apps/server/src/server.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`
- `apps/server/src/testing/live-signal.ts`
- `apps/server/src/testing/test-server.ts`
- `scripts/test-product-entrypoint.mts`
- `apps/chat-shell/e2e/chat-shell.spec.ts`
- `apps/chat-shell/e2e/chat-shell-harness.ts`
- `apps/server/src/state-patch-review.test.ts`
- `apps/chat-shell/src/product-chat-model.test.ts`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `Spine S2` |
| owner | `C` — Contract/integrator |
| branch | `codex/public-preview-integration` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/integration` |
| handoffSha | Claim 시 coordinator가 002의 fixed reviewed SHA를 integration branch에 반영하고 predecessor 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/server/src/server.ts`; 새 Server application/listener/environment/signal composition 파일과 해당 tests; `apps/server/src/testing/**`; `scripts/test-product-entrypoint.mts`; `apps/chat-shell/e2e/chat-shell.spec.ts`; `apps/chat-shell/e2e/chat-shell-harness.ts`; 필요한 current-workbench fixture; `docs/tickets/2026-07-23-public-npx-first-release/003-spine-s2-server-composition-stabilization.md` |
| consumedContracts | S1 frozen contracts/fixtures, current Server route·Origin·shutdown contract, parent First Assignment fail-closed behavior oracle |
| predecessorEvidence | 002 fixed reviewed SHA, frozen fixture roster, producer-consumer conformance와 private-field leak-scan receipt |
| requiredChecks | Focused Server composition/shutdown tests; consolidated Browser negative trace; `npm run test:product-entrypoint`; `npm test`; `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `npm run check:docs-links`; `git diff --check` |
| reviewOwner | Independent Server architecture reviewer와 current First Assignment Browser regression reviewer |
| handoffArtifact | Fixed reviewed `spineTipSha`, green composition/shutdown receipt와 immutable Browser fail-closed oracle evidence |
