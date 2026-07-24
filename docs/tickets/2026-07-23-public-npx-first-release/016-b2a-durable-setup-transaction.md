# 016 — B2a — Setup approval을 durable prepared transaction으로 만든다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: coordinator

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

- [x] Fresh logical empty는 state file absence이고 draft, native parent selection과 `prepare`만으로 durable state나 workspace가 생기지 않는다.
- [x] `approve`가 complete `pending/approved` envelope를 먼저 commit·readback한 뒤 exact B1 plan 하나만 admission한다.
- [x] Successful admission이 v3 aggregate, required seam, bundle complete tree와 App-side context scan을 fresh 검증한 뒤에만 `pending/prepared`를 commit·readback한다.
- [x] Duplicate approve, same-plan tab/relaunch와 response loss가 같은 transaction에 join하고 second scaffold를 만들지 않는다.
- [x] Different approved plan, expired parent selection, existing target와 current v2/incompatible bytes가 기존 state·bytes를 덮어쓰지 않고 stable conflict/recovery로 수렴한다.
- [x] Temp write, file sync, rename, directory sync와 readback의 직전·직후 fault에서 old-or-new complete envelope만 관찰된다.
- [x] Safe discard가 intent-first로 known pre-admission entries만 제거하고 unknown/modified/symlink, admitted, prepared와 Ready candidate bytes를 보존한다.
- [x] `observe()`와 Browser GET/poll은 read-only이며 mutation-capable automatic reconciliation은 Host `launch` command에만 남는다.
- [x] Browser projection conformance와 private path/phase/digest leak scan이 green이고 이 slice에서 Ready가 절대 projection되지 않는다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact integration handoff | `cc9a94fc6e16ec40307c2548a677eb30a0d89ee5` |
| Reviewed B1 predecessor | `3e3e578fbd8d5f427bde6c6c6087f3789756cdba` — v3 admission, canonical bundle, containment correction와 patch-free native-context guard가 integrated·reviewed 상태다. |
| Reviewed A1 predecessor | `c3c2b088f239fbb8d039314f28e9b26e752c0411` — auth-only close ambiguity와 non-ChatGPT account를 fail closed하는 transition lease closeout이다. |
| Integration baseline | Coordinator가 exact handoff에서 root test·typecheck·build, Chat Shell lint, docs links, diff와 clean status를 green으로 확인했다. |
| Observable result | `prepare`는 write-free confirmation만 만들고, `approve`는 complete `pending/approved`를 먼저 commit·readback한 뒤 B1 admission·bundle/static-context를 exactly once 수행해 `pending/prepared`를 commit·readback한다. |
| Highest practical seam | Temp app-data/workspace filesystem에서 production State Adapter와 deterministic admission/bundle fake를 함께 사용해 every write boundary, duplicate/response-loss/relaunch, conflict와 discard를 검증한다. |
| Scope | `packages/semester-workspace/**` 중 `package.json`·`src/contract.ts` 제외, `apps/server/src/setup/**`, `apps/server/src/workspace-admission/**`, colocated tests와 이 ticket만 수정한다. |

## Candidate Receipt

| Evidence | Result |
| --- | --- |
| Exact reviewed code candidate | `61915bcc56de32035e41947b296659e7f1ca5524` — exact handoff `cc9a94fc6e16ec40307c2548a677eb30a0d89ee5`에서 시작한 B2a production code tip이다. |
| Durable state | `createSetupEnvelopeStore()`가 owner-only `appDataRoot/setup/v1/state.json`의 strict codec, cooperative single-writer lease, same-directory exclusive temp, file·directory sync, observed-byte CAS, atomic rename·readback과 abandoned-write recovery를 한 Module로 소유한다. Logical empty는 state file absence다. |
| Approved→prepared transaction | `createSemesterSetupJourney()`의 `prepare`는 write-free다. `approve`는 complete `pending/approved`를 먼저 commit·readback하고 exact B1 admission, bundle materialization·verification과 static context scan을 통과한 뒤에만 `pending/prepared`를 commit·readback한다. Runtime start, native verification과 Ready commit은 포함하지 않는다. |
| Join·recovery | Same-plan duplicate approve와 response loss는 같은 in-process promise 또는 durable receipt에 join한다. Relaunch는 approved, admitted, partial, prepared와 discard intent를 fresh inspect해 old-or-new complete state로 수렴하며 different plan과 stale parent authority는 fail closed한다. |
| Exact authority binding | Durable receipt의 setup plan, semester, target, workspace identity, root marker, owned-scaffold plan과 expected initial aggregate digest를 reconstructed B1 plan 및 실제 marker/aggregate byte에 exact bind한다. 별도로 admitted된 foreign v3, mismatched owned partial과 prepared lookalike를 채택하지 않는다. |
| Safe discard | 최초 discard는 receipt와 inspected `discard_owned` plan의 exact binding을 확인한 뒤 `discard_requested`를 먼저 durable하게 기록한다. Evidence가 남은 relaunch도 같은 binding 뒤에만 삭제를 계속하며, markerless post-unlink recovery는 prior intent, stored root identity, fresh parent/target와 empty topology로 제한한다. Unknown·modified·symlink·admitted·prepared byte는 보존한다. |
| Crash evidence | Store write boundary와 journey approval/admission/bundle/prepared/discard boundary의 injected fault 및 actual child-process interruption matrix가 complete prior-or-next envelope, idempotent relaunch와 no-clobber를 검증한다. |
| Author verification | `@ay-ple/semester-workspace` `143/143`, `@ay-ple/server` `187/187`, receipt-binding/discard focused `15/15`; 두 workspace의 typecheck·build와 `git diff --check`가 green이다. |
| Coordinator root observation | Root-wide `npm test` full-load run은 B2a scope 밖 Runtime-release retained-archive deadline case 1건만 실패했다. 같은 exact test는 isolated `1/1`로 약 15.7초에 통과했고 B2a package·Server gates는 green이었다. Final integration root gate 재실행은 coordinator가 소유한다. |
| Scope·threat boundary | Frozen `src/contract.ts`, shared manifest·lockfile, UI, Runtime, Official SDK와 native config는 변경하지 않았다. App data는 owner-only이고 모든 AY-PLE writer가 cooperative lease를 지킨다는 경계이며, lease를 무시하는 same-UID live filesystem manipulation은 이 ticket의 보장 범위가 아니다. |
| Superseded candidates | `cf5af360b`는 foreign v3/partial authority binding 누락으로, `40193539e`는 discard가 receipt authority를 재검증하지 않는 P1으로 각각 independent review를 통과하지 못했다. 둘은 integration 후보가 아니며 `61915bcc5`가 두 finding을 닫은 유일한 reviewed candidate다. |

## Independent Review Closeout

| Evidence | Result |
| --- | --- |
| Exact reviewed candidate | `61915bcc56de32035e41947b296659e7f1ca5524` |
| Review disposition | Independent durable-state/filesystem-safety 재검토는 P0/P1/P2 finding `0`으로 PASS다. Scope·contract drift도 없다. |
| Independent probes | Receipt/admitted/partial/prepared binding, initial discard, evidence-present relaunch와 interruption focused suite `23/23`; `git diff --check`, writable-path audit와 clean status가 green이다. |
| Markerless discard judgment | Durable prior intent, stored root `(dev, ino, birthtime)`, fresh canonical parent/target와 exact empty topology로 제한된 post-unlink continuation은 accepted boundary다. Existing unlink-boundary 6개 case도 green이다. |
| Completion | B2a implementation과 evidence는 complete다. Canonical integration과 root release gate는 coordinator가, Runtime transition·native verification·Ready commit은 B2b가 소유한다. |

## B2b Delivery Handoff

| Field | Contract |
| --- | --- |
| Consumed API | `createSetupEnvelopeStore()`, `createSemesterSetupJourney()`와 public `SetupJourney`/`PendingSetupReceipt` contract를 exact reviewed candidate에서 소비한다. |
| Prepared authority | B2b는 `pending/prepared` receipt가 가리키는 admitted workspace와 verified bundle/static-context evidence를 fresh readback한 뒤에만 A1 transition callback으로 넘긴다. B2a receipt나 point-in-time evidence를 lease 밖의 Ready 증명으로 재해석하지 않는다. |
| B2b-owned work | A1 `transitionToWorkspace()` lease 안에서 exact workspace Runtime을 시작하고 native context를 fresh verify한 뒤 Ready를 idempotent하게 commit·readback하며, fault/relaunch에서 prepared→Ready convergence를 증명한다. |
| Explicit non-ownership | B2a는 Runtime generation, native config/Skill verification, `active_ready`, Ready Browser projection과 post-Ready action을 구현하지 않는다. |

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
