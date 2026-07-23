# 016 — B2a — Setup approval을 durable prepared transaction으로 만든다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

학생의 final approval 전에는 durable state와 workspace mutation이 없고, 승인 뒤에는 `appDataRoot/setup/v1/state.json` single envelope가 B1의 no-clobber admission을 한 번만 실행해 `pending/approved → pending/prepared`로 수렴한다. Browser response loss, duplicate approve, process interruption과 safe pre-admission discard가 있어도 duplicate workspace나 partial authority를 만들지 않는다.

## Spec Traceability

- User stories: 7–10, 16
- Implementation contract: Parent location selection과 Browser path boundary; SemesterWorkspace admission과 v3 aggregate
- Implementation contract: SetupJourney와 durability — logical empty→pending/approved→pending/prepared, State Adapter와 safe discard
- Data and state flow: First run 8–11; Failure Behaviour의 collision, duplicate approval, conflict와 recovery

## Slice-Specific Constraints

- `prepare`는 Server-held parent authority를 fresh revalidate하고 Browser-safe confirmation을 만들 뿐 appDataRoot와 workspace에 durable write를 하지 않는다.
- `approve`만 complete `pending/approved` envelope를 먼저 durable하게 기록한 뒤 B1 admission과 bundle/static-context verification을 실행한다. 이 ticket은 workspace Runtime start, native config/Skill verification과 `active_ready`를 구현하지 않는다.
- State Adapter는 owner-only root, no-follow, canonical full write, same-directory exclusive temp, file sync, observed prior-byte compare, atomic rename, parent directory sync와 strict readback을 한 deep Module에 숨긴다.
- App data와 workspace가 다른 filesystem일 수 있으므로 cross-root atomic transaction을 주장하지 않는다. Receipt-first ordering과 fresh reconcile로 old-or-new complete state에 수렴한다.
- Same-plan duplicate approve/relaunch는 같은 terminal promise에 join하고 different plan은 `setup_conflict`로 fail closed한다.
- Safe discard는 matching app-owned `owned_incomplete`가 admission되기 전에만 가능하다. `discard_requested`를 unlink 전에 durable하게 쓰고 known app-created entry만 no-follow로 제거한다. Recursive delete, broad parent cleanup, admitted/prepared workspace discard는 Interface에 없다.
- Browser는 opaque `setupPlanId`·`recoveryId`만 제출하며 raw path, delete roster, digest와 receipt phase를 제출하지 않는다.
- B owner surface 밖의 contract, Server composition, UI, manifest/lockfile을 수정하지 않는다. Fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer와 C-owned shared delta 규칙을 따른다.

## Acceptance Criteria

- [ ] Fresh logical empty는 state file absence이고 draft, native parent selection과 `prepare`만으로 durable state나 workspace가 생기지 않는다.
- [ ] `approve`가 complete `pending/approved` envelope를 먼저 commit·readback한 뒤 exact B1 plan 하나만 admission한다.
- [ ] Successful admission이 v3 aggregate, required seam, bundle complete tree와 App-side context scan을 fresh 검증한 뒤에만 `pending/prepared`를 commit·readback한다.
- [ ] Duplicate approve, same-plan tab/relaunch와 response loss가 같은 transaction에 join하고 second scaffold를 만들지 않는다.
- [ ] Different approved plan, expired parent selection, existing target와 current v2/incompatible bytes가 기존 state·bytes를 덮어쓰지 않고 stable conflict/recovery로 수렴한다.
- [ ] Temp write, file sync, rename, directory sync와 readback의 직전·직후 fault에서 old-or-new complete envelope만 관찰된다.
- [ ] Safe discard가 intent-first로 known pre-admission entries만 제거하고 unknown/modified/symlink, admitted, prepared와 Ready candidate bytes를 보존한다.
- [ ] `observe()`와 Browser GET/poll은 read-only이며 mutation-capable automatic reconciliation은 Host `launch` command에만 남는다.
- [ ] Browser projection conformance와 private path/phase/digest leak scan이 green이고 이 slice에서 Ready가 절대 projection되지 않는다.

## Verification

- Targeted test or command: `@ay-ple/semester-workspace` setup store/journey tests, owner-held persistence fault matrix, B-owned Server projection conformance tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Live Runtime/OAuth는 사용하지 않는다. Isolated appData/workspace roots와 deterministic admission/account fixtures로 duplicate, response-loss, crash와 discard를 검증한다.

## Blocked By

- [008-b1b-workspace-bundle-context-guard.md](008-b1b-workspace-bundle-context-guard.md) — B1b — Workspace bundle과 native-context guard를 완성한다
- [013-a1-account-runtime-transition-lease.md](013-a1-account-runtime-transition-lease.md) — A1 — Account/Runtime transition lease를 직렬화한다

## Starting Points

- `packages/semester-workspace/src/contract.ts`
- B1의 admission, bundle verifier와 `WorkspaceActionAdmission`
- Current `apps/server/src/semester-workspace-store.ts`의 atomic-write/CAS behavior는 algorithm donor로만 재검증
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `docs/wayfinding/public-npx-first-release/assets/bootstrap-setup-durability-recovery-research.md`
- S1 pending-vs-Ready fault fixture와 A1 callback contract

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `B2a` — B2 durable transaction 전반부 |
| owner | `B` — Semester setup |
| branch | `codex/public-preview-b2a-setup-transaction` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/b2a-setup-transaction` |
| handoffSha | Claim 시 coordinator가 008과 013의 fixed reviewed SHA를 integration branch에 DAG 순서로 merge하고 predecessor 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/semester-workspace/**` 중 `package.json`과 `src/contract.ts` 제외; `apps/server/src/setup/**`; `apps/server/src/workspace-admission/**`; 관련 colocated tests; `docs/tickets/2026-07-23-public-npx-first-release/016-b2a-durable-setup-transaction.md` |
| consumedContracts | S1 `SetupJourney`/single-envelope store contract and fault fixture; B1 admitted workspace/bundle/action-admission output; A1 Ready callback signature; Browser Setup projection |
| predecessorEvidence | 008·013 fixed reviewed SHAs와 integration merge receipts, B1 mismatch-preservation gate, A1 lease race gate, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | State Adapter boundary fault matrix; duplicate/response-loss/conflict/discard tests; Server projection and leak conformance; semester-workspace/Server focused tests; root four gates; docs links; `git diff --check` |
| reviewOwner | B author가 아닌 independent durable-state/filesystem-safety reviewer |
| handoffArtifact | Fixed reviewed B2a SHA, single-envelope codec/store path, approved→prepared transition fixture와 fault-matrix receipt consumed by B2b |
