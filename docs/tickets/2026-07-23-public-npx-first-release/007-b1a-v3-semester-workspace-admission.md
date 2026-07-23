# 007 — B1a — v3 SemesterWorkspace admission을 구현한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

기존 parent 아래 존재하지 않는 child leaf만 AY-PLE 소유의 새 v3 `SemesterWorkspace`로 exclusive하게 만들고, disk에서 fresh validation한 뒤에만 `AdmittedSemesterWorkspace`를 발급한다. 기존 directory, v2 bytes, future/malformed state와 불명확한 root는 자동 채택·migration·overwrite 없이 명확한 inspection outcome으로 보존된다.

## Spec Traceability

- User stories: 7, 8, 9, 10, 11
- Implementation contract: Parent location selection과 Browser path boundary; SemesterWorkspace admission과 v3 aggregate; Compatibility and Migration; Parallel delivery contract — `B1`
- Testing decisions: admission inspect no-write, exclusive leaf, no-clobber publish와 compatibility preservation

## Slice-Specific Constraints

- S1 frozen `SemesterWorkspaceAdmission.inspect/apply`를 별도 deep Module로 구현한다. Current `SemesterWorkspaceController`의 28-operation Interface를 v3 public admission으로 확장하지 않는다.
- Create intent는 canonical existing parent 아래 nonexistent bounded one-segment leaf만 허용한다. Existing empty directory도 adopt하지 않고 non-recursive exclusive final-leaf `mkdir`로 reservation한다.
- `inspect`는 side effect가 0이어야 하며 parent/target/root relation, ownership과 current bytes를 fresh classify한다. `apply`는 Server-held authority-bound plan과 fresh filesystem authority가 일치할 때만 실행한다.
- Initial v3 aggregate는 parent Spec의 exact top-level/manifest/state shape, empty collections, `confirmedRevision: 0`, exact empty settings를 strict encode/decode한다. `WorkspaceManifest`만 workspace·semester·Course identity의 authority다.
- Minimal seam은 `.ay-ple/workspace-state.json`, `inbox/`, `courses/`까지만 만든다. Package `AGENTS.md`와 built-in Skill bundle은 008이 소유한다.
- Required tree와 state는 no-clobber write, file/directory sync, atomic publish와 disk fresh decode를 거쳐야 admitted가 된다.
- Valid current v2는 `legacy_migration_required/readOnly`, malformed/future bytes는 `incompatible/readOnly`다. Original bytes와 unknown existing entries를 수정·이동·삭제하지 않는다.
- `owned_incomplete`를 분류할 ownership marker/evidence seam은 제공하되 durable setup envelope, safe discard algorithm, Ready locator와 native context는 B2/008의 책임이다.
- Generic import/migration, recursive cleanup, setup UI, live Codex Turn과 Course/자료 생성은 범위 밖이다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile와 S1 contract 변경은 C-only다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] `inspect`가 모든 outcome을 write 0으로 분류하고 `new_target`만 authority-bound create plan으로 승격할 수 있다.
- [ ] `apply`가 nonexistent final leaf를 exclusive reserve하고 exact minimal tree와 strict v3 aggregate를 no-clobber로 만든다.
- [ ] Year level은 positive safe integer, term은 bounded custom-capable key/display, workspace ID는 opaque safe grammar로 검증된다.
- [ ] Publish 뒤 fresh read/strict decode와 root identity 검증을 통과한 경우에만 admitted handle이 반환된다.
- [ ] Existing empty/non-empty target, target race, unsafe root relation, symlink와 permission failure가 overwrite 없이 stable outcome으로 끝난다.
- [ ] Current v2, malformed/future state와 unknown bytes의 before/after byte identity가 같고 automatic v3 sidecar/migration이 없다.
- [ ] Fault injection의 create/write/sync/rename/readback 경계에서 admitted, evidence-backed owned incomplete 또는 evidence publish 전 preserved collision만 남고 half-valid success는 없다.

## Verification

- Targeted test or command: `packages/semester-workspace`의 codec/admission unit·filesystem fault tests와 current v2 preservation fixtures
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: Temporary existing parent 아래 new leaf create/reopen과 v2 read-only inspection을 확인한다. 기존 사용자 directory를 fixture로 사용하지 않는다.

## Candidate Evidence

첫 독립 filesystem/durability 및 current v2 compatibility review의 blocking finding을 반영한 full re-review candidate 증거다. Ticket state와 acceptance checkbox는 Coordinator review가 끝날 때까지 변경하지 않는다.

| Evidence | Result |
| --- | --- |
| Fixed handoff | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` |
| Claim commit | `d73fa8a180083092f2cbcce44f892d8dada844a9` |
| Implementation commit | `8eafbc197bb4568fe65d680f8de8df9eb404827b` |
| Review remediation commit | `a6fe6fec3edb70353a44c920f271d91df97cdcdc` |
| Package codec/admission/fault/parity gate | `npm test -w @ay-ple/semester-workspace` — `26/26` green |
| Package compile gates | `npm run typecheck -w @ay-ple/semester-workspace`; `npm run build -w @ay-ple/semester-workspace` — green |
| V3 conformance | Exact initial aggregate encode/fresh decode, positive safe integer `yearLevel`, bounded custom-capable term, opaque workspace ID, extra/nonempty/default drift rejection이 green |
| Parent/root authority conformance | Exact `before_root_reservation` parent swap은 mutation 0으로 `authority_changed`, reservation 직후 swap은 displaced parent의 markerless root만 보존, marker fsync 뒤 swap은 displaced evidence bytes만 보존한다. Apply는 success 전까지 selected parent `(dev, ino)`와 reserved root identity를 다시 확인한다. |
| Preplanned evidence binding | Apply 전에 `setupId`, canonical root/parent, workspace ID, exact aggregate bytes/SHA-256, canonical owned-scaffold plan/SHA-256와 exact root-marker bytes/SHA-256를 고정한다. Marker는 post-`mkdir` root identity를 포함하지 않고 `authorityDigest`를 canonical authority 전체에서 재계산한다. Workspace ID·aggregate·scaffold를 old digest와 함께 바꾼 marker는 cross-instance resume에서 `collision`이다. |
| Owned-incomplete topology | Root는 `.ay-ple/`, empty `inbox/`, empty `courses/`만, product root는 exact marker·known empty/exact temp·exact final state만 허용한다. Nested file, subtree, symlink, unknown product entry와 late pre-unlink byte는 inspection/apply 모두 fail closed하고 원본 bytes를 보존한다. |
| Durability conformance | Before/after root reservation, marker create/write/file sync/directory sync, required directory create/sync, state temp create/write/file sync, no-clobber hard-link publish, directory sync, temp unlink/sync, readback, evidence unlink/sync를 분리했다. 17개 evidence-backed window는 cross-instance `owned_incomplete → resumed → admitted`, markerless/empty-marker window는 preserved collision, evidence unlink 뒤 window는 complete admitted로 수렴한다. |
| V2 exact donor parity | Package root가 `decodeCurrentSemesterWorkspaceV2`를 canonical shared decoder로 제공한다. Donor-valid `>1 MiB` fixture와 reordered retry `sourceBaseline` object fixture가 Server donor와 package에서 모두 current v2로 일치하고, fieldwise source equality를 사용한다. |
| V2/incompatible preservation | Fixture SHA-256 `b753a066ff3ea3e56a560f8dd89d16fec14dab71d5aa795f927a57197118ffa9`; decoder-valid current v2는 크기 1 MiB 초과도 `legacy_migration_required/readOnly`, malformed·future는 `incompatible/readOnly`; state와 unknown entry before/after byte identity green |
| Root gates | `npm test`; `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `git diff --check 269a3555d3adf52bf520b3de0b99c7cb3fee3ae7...HEAD` — green |
| Docs gate | `npm run check:docs-links` — active 28, historical 2 green |
| Bounded manual smoke | Fresh temporary parent에서 `create: created`, `reopen: admitted`, fault recovery `recover: resumed`, current v2 `legacy_migration_required/readOnly`, `v2ByteIdentity: true`, exact root tree `[".ay-ple","courses","inbox"]`, product tree `["workspace-state.json"]`; temporary root·script cleanup 완료 |
| Independent re-review | Pending — filesystem/durability reviewer와 current v2 compatibility reviewer가 새 fixed candidate range 전체를 다시 검토해야 함 |

C-only follow-up은 다음 exact delta다.

1. Reviewed serial `contractTipSha`에서 Browser에 노출하지 않는 `describe(plan)` seam을 추가해 아래 값을 admission apply 전에 그대로 제공한다. `canonicalBytesSha256`는 canonical pre-apply authority payload의 SHA-256이며 B2a는 digest나 marker를 역추론하지 않고 이 description으로 `PendingSetupReceipt`를 채운다.

   ```ts
   type WorkspaceAdmissionPlanDescription = {
     readonly setupId: string
     readonly setupPlanId: string
     readonly plan: {
       readonly canonicalBytesSha256: string
       readonly semester: SemesterIdentity
       readonly target: {
         readonly canonicalParent: string
         readonly parentDevice: string
         readonly parentInode: string
         readonly leafName: string
         readonly canonicalTarget: string
       }
     }
     readonly workspace: {
       readonly workspaceId: string
       readonly formatVersion: 3
       readonly rootMarkerSha256: string
       readonly ownedScaffoldPlanSha256: string
       readonly expectedInitialAggregateSha256: string
     }
   }
   ```

2. Integration/C가 `apps/server/src/semester-workspace-store.ts`의 duplicate current-v2 structural/invariant decoder를 package root의 `decodeCurrentSemesterWorkspaceV2`로 교체한다. Server에는 decoded value를 existing `PersistedWorkspaceState` clone으로 옮기는 narrow adapter만 남기고, package parity fixture를 Server regression input으로 소비해 두 decoder가 다시 갈라질 수 없게 한다.
3. 현재 동작을 소유하는 `packages/semester-workspace/README.md`는 이 lane의 `writablePaths` 밖이므로 integration/C가 B1a admission, recovery, v2 shared decoder와 package 명령을 반영한다.

## Blocked By

- [003-spine-s2-server-composition-stabilization.md](003-spine-s2-server-composition-stabilization.md) — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Starting Points

- `packages/semester-workspace/src/contract.ts`
- `apps/server/src/semester-workspace-store.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace-values.ts`
- `apps/server/src/semester-workspace-error.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/server/src/semester-workspace-action.test.ts`
- Parent Spec의 `SemesterWorkspace admission과 v3 aggregate`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `B1a` |
| owner | `B` — Semester setup |
| branch | `codex/public-preview-b1a-workspace-admission` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/b1a-workspace-admission` |
| handoffSha | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` — coordinator가 003 fixed `spineTipSha`를 integration branch에 반영하고 predecessor 및 integration root gates를 green으로 확인한 뒤 기록한 clean integration HEAD |
| writablePaths | `packages/semester-workspace/src/**` 중 v3 codec/admission implementation·tests (`src/contract.ts`와 S1 frozen files 제외); package-local admission fixtures; `docs/tickets/2026-07-23-public-npx-first-release/007-b1a-v3-semester-workspace-admission.md` |
| consumedContracts | S1 frozen SemesterWorkspace contract, parent Spec exact v3 aggregate/admission outcome와 current v2 compatibility fixtures |
| predecessorEvidence | Fixed reviewed `spineTipSha`, green root gates와 current v2/current-workbench regression evidence |
| requiredChecks | Semester workspace codec/admission/fault tests; v2 before/after byte identity; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent filesystem/durability reviewer와 current v2 compatibility reviewer |
| handoffArtifact | Reviewed fixed B1a commit SHA, v3 codec/admission conformance roster와 no-write/no-clobber/byte-preservation receipt |
