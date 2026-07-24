# 003 — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Host-consumable Server application factory가 TCP bind, process environment resolution과 signal registration 없이 Express application·bounded close handle을 반환한다.
- [x] Development executable은 기존 local origin, workspace activation, listener와 signal behavior를 같은 observable result로 조립한다.
- [x] Import만으로 `.env` load, listener bind, Runtime spawn 또는 workspace mutation이 일어나지 않는다.
- [x] Product route, Origin guard, NDJSON framing, current activation과 shutdown regression test가 split 전과 같은 결과를 낸다.
- [x] 하나의 Browser trace가 invalid evidence/unselected source, quote mismatch, stale base와 duplicate/late Review를 거쳐 confirmed state mutation 0을 증명한다.
- [x] Existing lower-seam validator·Review tests와 current Browser workbench behavior가 유지된다.
- [x] Fixed reviewed commit과 full root green receipt가 `spineTipSha` handoff artifact로 남는다.

## Verification

| Gate | Result |
| --- | --- |
| Focused Server lifecycle | `NODE_OPTIONS=--conditions=development npx tsx --test apps/server/src/server-application.test.ts apps/server/src/server-listener.test.ts apps/server/src/server-process-lifecycle.test.ts apps/server/src/product-development.test.ts` — `12/12` green |
| Server workspace | `npm test -w @ay-ple/server` — `123/123` green |
| Current-workbench oracle | Targeted Browser trace `1/1` green. Unselected evidence, quote mismatch와 stale base 뒤 confirmed revision·Assignment·StatePatch·UserConfirmation이 모두 0이고, UI Reject 뒤 active duplicate와 terminal late Review가 durable snapshot과 native answer count를 바꾸지 않음 |
| Browser regression | `npm run test:e2e -w @ay-ple/chat-shell` — Chromium desktop 1440×900 `32/32` green |
| Entrypoint and shutdown | `npm run test:product-entrypoint` green; `npm run test:product-shutdown-actual -w @ay-ple/server` — `2/2` green |
| Runtime artifact precondition | Clone-local ignored production Runtime artifact를 complete-tree 검증했고 `verify:production-runtime`이 roster SHA-256 `4b72a60735d6b6d1489bab9fa937889f296ba2268c3fc0c433ba84ca10b36b7a`로 green |
| Root gates | Review corrective implementation `cb77ca843529004d2df9c1b7b5e40960ce91c30c`에서 `npm test` green (Server `123/123`, Chat Shell unit `40/40` 포함); `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `npm run check:docs-links` active `28`·historical `2`; `git diff --check` 모두 green |
| Coordinator manual dogfood | Reviewed tip `c2e95616d8ac2461844525c69a7e0d714da3e710`의 provider-free current workbench를 실제 Browser 1440×900 viewport에서 확인했다. 첫 세 invalid proposal은 `confirmedRevision: 0`, Assignment·StatePatch·UserConfirmation 각각 0을 유지했다. 네 번째 valid proposal을 실제 UI에서 Reject한 뒤 revision 0, Assignment 0, rejected StatePatch 정확히 1개, rejected UserConfirmation 정확히 1개였다. Console error는 없었고 Browser viewport와 Server를 정리했다. |

## Result

| Evidence | Result |
| --- | --- |
| Fixed base | `27d399d56e58331e3f37215b8deabfcbc14971bd` |
| Ticket claim | `1141d0c272c6ce571f12b0516909778d1627a7b3` |
| Initial implementation | `8bf12743b5f866f61049f910160380a17c743ad4` |
| Initial candidate receipt | `6f23235b2e39e278dfe8bdb554d292047ca32ffc` |
| Review corrective implementation | `cb77ca843529004d2df9c1b7b5e40960ce91c30c` |
| Fixed reviewed `spineTipSha` | `c2e95616d8ac2461844525c69a7e0d714da3e710` |
| Independent review range | `27d399d56e58331e3f37215b8deabfcbc14971bd..c2e95616d8ac2461844525c69a7e0d714da3e710` |
| Server architecture re-review | `GREEN` |
| Current First Assignment Browser regression re-review | `GREEN` |

Listener-independent application factory, once-only TCP lifecycle claim, listener-first shutdown과 post-bind failure cleanup을 고정했다. Development entrypoint의 기존 behavior와 lower-seam regression을 유지하면서 Browser 최고 seam의 fail-closed oracle은 private store parse 없이 typed controller authority를 사용한다.

Parent Spec은 이 디렉터리의 후속 implementation ticket이 남아 있으므로 incomplete 상태를 유지한다.

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
| handoffSha | `27d399d56e58331e3f37215b8deabfcbc14971bd` — 002의 fixed reviewed SHA `7332c8bc77705160e31e0ce8e53e0dec6eb2dd90`와 closeout이 반영된 clean integration HEAD. Claim 직전 root test·typecheck·build·Chat Shell lint·docs link·diff gate를 모두 green으로 재실행했다. |
| writablePaths | `apps/server/src/server.ts`; 새 Server application/listener/environment/signal composition 파일과 해당 tests; `apps/server/src/testing/**`; `scripts/test-product-entrypoint.mts`; `apps/chat-shell/e2e/chat-shell.spec.ts`; `apps/chat-shell/e2e/chat-shell-harness.ts`; 필요한 current-workbench fixture; `docs/tickets/2026-07-23-public-npx-first-release/003-spine-s2-server-composition-stabilization.md` |
| consumedContracts | S1 frozen contracts/fixtures, current Server route·Origin·shutdown contract, parent First Assignment fail-closed behavior oracle |
| predecessorEvidence | 002 fixed reviewed SHA `7332c8bc77705160e31e0ce8e53e0dec6eb2dd90`; valid fixture `d7dc6e71b1ef3429f009420a5f644565616f5cda2d847fa185fb292c6714d5d1`; invalid fixture `3f50b1290330e0f3be00c11438a4491c1c797da9d877faa1384bc54b1498f7f9`; Server 115/115·Browser 40/40 producer-consumer conformance와 root green receipt |
| requiredChecks | Focused Server composition/shutdown tests; consolidated Browser negative trace; `npm run test:product-entrypoint`; `npm test`; `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `npm run check:docs-links`; `git diff --check` |
| reviewOwner | Independent Server architecture reviewer와 current First Assignment Browser regression reviewer |
| handoffArtifact | Fixed reviewed `spineTipSha`, green composition/shutdown receipt와 immutable Browser fail-closed oracle evidence |
