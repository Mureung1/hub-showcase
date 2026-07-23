# 008 — B1b — Workspace bundle과 native-context guard를 완성한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Admitted v3 workspace에 package-owned `AGENTS.md`와 declared built-in Skill tree를 exact complete-tree bundle로 설치·검증하고, ambient repository/user context가 AY-PLE 작업 환경에 섞이지 않았음을 static 및 native effective-context guard로 증명한다. Missing declared file만 안전하게 복구할 수 있고 modified·extra·symlink byte는 보존한 채 Ready와 첫 Codex action을 차단한다.

## Spec Traceability

- User stories: 9, 10, 11, 12, 16
- Implementation contract: Workspace instruction/Skill bundle과 native context; SemesterWorkspace admission과 v3 aggregate; Codex account와 Runtime transition의 workspace role; Parallel delivery contract — `B1`
- Testing decisions: exact declared tree, hostile ancestor/user canary, native config/Skill verification와 action-time revalidation

## Slice-Specific Constraints

- Canonical bundle source는 `packages/semester-workspace/resources/workspace/**` 하나다. Ambient root `.agents/**`, camp skill, setup skill, dogfood fixture와 app-data materializer를 복사하지 않는다.
- First-release roster는 root `AGENTS.md`와 `.agents/skills/ay-ple-first-assignment/SKILL.md` 한 declared Skill root다. Skill 설치는 Course·자료·public action availability를 뜻하지 않는다.
- `WorkspaceBundleDescriptor`는 `AGENTS.md`와 각 declared Skill root의 exact complete-tree roster·digest를 독립 선언한다. Package source는 mutation 전에 verify하고 immutable process snapshot으로 capture할 수 있어야 한다.
- Materializer는 absent target만 no-clobber 설치한다. Missing declared path는 explicit absent-only recovery 뒤 reverify할 수 있지만 modified byte, symlink, declared root 내부 extra entry는 보존하고 `manual_recovery_required`로 끝난다.
- Descriptor 밖 `.agents/skills/` sibling, root `AGENTS.override.md`, workspace-local `.codex/`도 보존하되 first-preview action eligibility를 막는다.
- Native context policy는 exact workspace cwd, controlled `HOME`/`CODEX_HOME`, `project_root_markers=[]`를 요구한다. Static scan과 injected private `config/read(cwd, includeLayers=true)`·`skills/list(cwds=[workspace], forceReload=true)` 결과가 모두 green이어야 한다.
- Ready 전 native thread/Turn과 Skill input count는 0이다. Guard verification은 live model Turn을 시작하지 않는다.
- `WorkspaceActionAdmission`은 Runtime/thread/action 직전에 bundle·local conflict·native context를 fresh reverify하는 단일 gate를 제공한다. Current action Module에 직접 섞지 않는다.
- Setup envelope, Runtime transition lease와 Ready commit은 후속 B2/A1 책임이다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile와 frozen contract는 수정하지 않는다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Package resource에는 reviewed product `AGENTS.md`와 `ay-ple-first-assignment` complete Skill root만 있고 exact descriptor와 byte roster가 일치한다.
- [ ] Package source verifier가 missing/extra/modified/symlink/mode drift를 workspace mutation 전에 fail closed한다.
- [ ] Fresh admitted workspace에는 absent-only no-clobber 방식으로 exact bundle이 설치되고 complete-tree readback이 green이다.
- [ ] Missing declared path만 explicit recovery되며 modified·extra·symlink와 descriptor-outside context의 bytes는 before/after 동일하다.
- [ ] Hostile ancestor repository, user/global config, `AGENTS.override.md`, `.codex/`와 undeclared Skill canary가 native effective context에 섞이지 않고 eligibility를 fail closed한다.
- [ ] Private config/Skill verification이 fixed project-root policy와 exact one-Skill roster를 확인하며 thread/start·turn/start·Skill input은 0이다.
- [ ] `WorkspaceActionAdmission`이 Ready 및 모든 product Codex action 직전에 같은 guard를 fresh 적용한다.
- [ ] B1 completion artifact가 downstream B2/A1에 admitted workspace, verified bundle snapshot과 native guard result의 opaque contract만 전달한다.

## Verification

- Targeted test or command: `packages/semester-workspace` bundle/materializer/context tests, Server setup adapter tests와 deterministic fake native config/Skill port matrix
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: Temporary hostile parent/user context에서 one-workspace static/native guard를 provider-free로 실행하고 user bytes preservation을 확인한다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact integration handoff | `7d38c8f3b4ce7944e21d1813bbb979ed1da85c70` |
| Integration ancestry | B1a closeout `4e1088a5fb0406717259227de9ce72976813a9bb`를 integration parent `1bacf08625a7df70b12fa1cee7ecff9f09907b49`에 `--no-ff` merge한 clean integration commit이다. |
| Reviewed predecessor | Ticket 007 fixed combined reviewed tip `13c4b30a67a96c9dff111ecfda51fff0fe579e70`; Standards·Spec review `GREEN`, remaining finding `0` |
| Predecessor conformance | V3 admission `37/37`, Server `124/124`, current-v2 fixed roster 426개와 no-write/no-clobber/original-byte preservation, package·Server compile와 root test/typecheck/build/Chat Shell lint/docs-link/diff gates가 Ticket 007 closeout에서 green으로 고정됐다. |
| Claim scope | Frozen `src/contract.ts`, shared manifest·lockfile, Browser/UI와 sibling lane을 변경하지 않고 이 ticket의 `writablePaths`만 사용한다. |

## Candidate Receipt

이 receipt는 independent review correction을 반영한 candidate evidence다. Ticket State는 `claimed`, Acceptance Criteria는 unchecked로 유지한다.

| Evidence | Candidate result |
| --- | --- |
| Implementation tip | `f01288b8a907af13801278f5c809c682d0651dc6` |
| Exact ancestry | `git merge-base 7d38c8f3b4ce7944e21d1813bbb979ed1da85c70 f01288b8a907af13801278f5c809c682d0651dc6`가 exact handoff `7d38c8f3b4ce7944e21d1813bbb979ed1da85c70`이다. Sibling branch merge·cherry-pick은 없다. |
| Candidate commits | Claim `6a241639614161699a0e5c2c381b6e048499cf4f`; canonical bundle `5629cbe6a017206fe04e7e42d484714e549b9145`; admitted-workspace binding `51a346e21eefa309a784f2c9b2180850eda2b579`; admitted-context fixture correction `09029ae74c0393b8748f9a44ce89686f5afa028e`; native/action guard `58f6d00a42ceb5968d45df9eea9947bee91c40f6`; file-descriptor mode readback `80afd1846c12d8673576217cc49b8e04ece9b4c5`; malformed native-context fail-closed `e54e8c35c6d46f0d3691561ad6441ac0b2f2eba7`; final-readiness revalidation `6e55f35210f180867347a5a03a33ef4250c30eba`; special-mode rejection `f01288b8a907af13801278f5c809c682d0651dc6` |
| Canonical roster | `packages/semester-workspace/resources/workspace/AGENTS.md`와 `.agents/skills/ay-ple-first-assignment/SKILL.md` 두 file만 존재한다. Placeholder, camp/setup Skill, dogfood fixture와 materializer는 없다. |
| Bundle identity | `bundleId=ay-ple.workspace-bundle.v1`; descriptor SHA-256 `57c51240a28aa7bc0c261cdb230ad252f2359e19bf9855c481938cca9231d757`; aggregate complete-tree SHA-256 `39c493509629055d085dcda88642ee6a4ac4286648c511781487d4ce521d8c29` |
| Per-root identity | `AGENTS.md`: 917 bytes, file SHA-256 `f1649609dbcad300001fba1fb4170b30a92a0def63f3d815550aa895b17afdfc`, root tree SHA-256 `ff612defcbdce14bccb1a55de98cc4e91d33be721e65aa55565e042fa0b6886b`; declared Skill: 2307 bytes, file SHA-256 `91f9e683a0ae629b49b16ea2ef88a4895e763d10df911cbd16bc866ce61b3721`, root tree SHA-256 `22f6e2faa0f3256fd363291d573fa506cbd2e3e43475d16874bc75f1641fdc99` |
| Bundle behavior | Source exact-tree/mode/link/byte verification과 immutable snapshot capture, fresh v3 admission revalidation, absent-only no-clobber write·file/directory sync, explicit missing recovery, modified·extra·symlink·mode/link/type byte preservation을 구현했다. Exact `0644` check는 `0o7777`을 mask해 setuid/setgid/sticky bit도 거절한다. Descriptor 밖 Skill sibling은 bundle digest 밖에 두고 static eligibility에서 막는다. |
| Native boundary | Launch는 exact workspace `cwd`, disjoint controlled `HOME`/`CODEX_HOME`, `project_root_markers=[]`다. Private query는 `config/read(cwd, includeLayers=true)`와 `skills/list(cwds=[workspace], forceReload=true)`만 사용하고 malformed/throwing result도 closed conflict로 정규화한다. |
| Action admission | Preliminary Ready→fresh B1a reopen→bundle→static→native pass 뒤 final Ready를 읽고, 다시 fresh v3 reopen→native→bundle→static pass를 수행한다. Final filesystem/context check 뒤 external port await 없이 admitted result를 반환한다. Setup envelope·transition lease·current action Module은 변경하지 않았다. |
| Focused tests | `@ay-ple/semester-workspace` 63/63 green; `@ay-ple/server` 149/149 green; final-readiness mutation과 source/installed `4644` 보존 probe green; 두 workspace typecheck green |
| Repository gates | Exact implementation tip에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check` green. Docs links는 active 28개, historical cutover banner 2개다. |
| Gate retry evidence | 첫 loaded Server/root run에서 unrelated existing `source rebaseline remains blocked until bounded artifact cleanup succeeds` timing test가 `execution_cleanup_required`로 flake했다. Exact file 28/28과 complete Server 149/149가 바로 green이었고, final root `npm test` retry도 green이었다. B writable scope 밖 module은 수정하지 않았다. |
| Provider-free hostile-context smoke | Built candidate로 hostile Git parent `AGENTS.md`/`.codex`/camp Skill과 hostile user Skill을 둔 admitted v3 workspace를 검증했다. Nominal admission은 green, final Ready 중 `AGENTS.md` mutation은 preserved `bundle_not_verified`, installed `4644` Skill은 byte/mode를 보존한 `bundle_not_verified`, workspace-local `.codex`는 `config_conflict`/`context_not_verified`였다. Native query는 exact 10회였고 `thread/start=0`, `thread/resume=0`, `turn/start=0`, Skill input `0`이었다. Hostile/user/workspace canary byte는 동일했고 temporary root는 정리됐다. |
| Scope audit | Frozen `packages/semester-workspace/src/contract.ts`, `packages/codex-chat-runtime/**`, shared manifest·lockfile, package README, Browser/UI, current action Module과 sibling lane은 untouched다. Diff는 ticket의 `writablePaths`에만 있고 C/R1c/README obligation은 아래 handoff에만 기록했다. |
| Downstream opaque handoff | B2/A1은 admitted `AdmittedSemesterWorkspace`, descriptor-bound `VerifiedBundleSource` snapshot, opaque native `{status:'verified'}`와 S1-frozen `WorkspaceActionAdmission` result contract만 소비할 수 있다. Ready commit·lease·Runtime transition은 이 candidate에 포함하지 않는다. |

## Required Integration Handoffs

| Owner | Final-integration obligation |
| --- | --- |
| A1/C1 transition lease | `WorkspaceActionAdmission.admit()` 성공은 point-in-time evidence다. A1/C1은 S1-frozen `AccountRuntimeTransitionLease`로 successful admission을 actual Runtime thread/action start까지 bind하고, lease 밖에서 result를 재사용하지 않아야 한다. B1b는 final Ready 뒤 fresh v3 reopen→native→bundle→static check까지 소유하지만 transition lease나 action start를 구현하지 않는다. |
| R1c + C native-context contract | Existing frozen owner는 `packages/codex-chat-runtime/src/account-contract.ts`의 `CodexNativeContextPort`, `CodexEffectiveConfig`, `CodexEffectiveSkill`이다. R1c는 frozen file을 바꾸지 않고 Runtime implementation이 이 high-level port를 구현하고 raw App Server `config/read`·`skills/list` mapping을 소유하게 해야 한다. C는 세 frozen type을 `@ay-ple/codex-chat-runtime` package root에서 export한 뒤 B boundary가 이를 직접 consume하도록 integration한다. 그때 Server-local `WorkspaceNativeEffectiveConfig`, `WorkspaceNativeEffectiveSkill`, `WorkspaceNativeContextPort`, `WorkspaceNativeContextQueryPort`, `createWorkspaceNativeContextPort`와 raw method literal/argument ownership을 제거하고 exact query conformance를 Runtime test로 옮긴다. 현재 B query adapter는 final owner가 아닌 temporary candidate seam이다. |
| C-only package README | `packages/semester-workspace/README.md`는 B writable path 밖이라 이 lane에서 수정하지 않는다. C는 final integration에서 current truth를 canonical two-file bundle·descriptor/verifier/materializer/context guard 구현됨, `.spine-s0-placeholder.json` 제거됨으로 갱신하고, durable setup envelope·`Semester Ready`·transition lease 조합은 B2/A1 deferred로 분리해야 한다. |

## Blocked By

- [007-b1a-v3-semester-workspace-admission.md](007-b1a-v3-semester-workspace-admission.md) — B1a — v3 SemesterWorkspace admission을 구현한다

## Starting Points

- `packages/semester-workspace/resources/workspace/`
- `packages/semester-workspace/src/contract.ts`
- `apps/server/src/assignment-recipe.ts` — current verified recipe behavior donor only
- `apps/server/src/assignment-recipe.test.ts`
- `apps/server/src/semester-workspace-action.test.ts`
- `apps/server/src/setup/native-project-boundary.ts`
- `apps/server/src/setup/workspace-action-admission.ts`
- `packages/codex-chat-runtime/src/account-contract.ts`와 S1 private config/Skill port contract

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `B1b` / `B1` completion |
| owner | `B` — Semester setup |
| branch | `codex/public-preview-b1b-bundle-context` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/b1b-bundle-context` |
| handoffSha | `7d38c8f3b4ce7944e21d1813bbb979ed1da85c70` — reviewed Ticket 007 closeout을 `--no-ff` merge한 clean integration HEAD이며 위 Claim Evidence의 predecessor·gate receipt를 소비한다. |
| writablePaths | `packages/semester-workspace/resources/workspace/**`; `packages/semester-workspace/src/**` 중 bundle/context implementation·tests (`src/contract.ts`와 S1 frozen files 제외); `apps/server/src/setup/native-project-boundary.ts`; `apps/server/src/setup/workspace-action-admission.ts`; focused adapter tests; `docs/tickets/2026-07-23-public-npx-first-release/008-b1b-workspace-bundle-context-guard.md` |
| consumedContracts | S1 frozen `WorkspaceBundleDescriptor`, private native config/Skill port와 `WorkspaceActionAdmission`; B1a admitted workspace/ownership evidence |
| predecessorEvidence | 007 fixed reviewed SHA, v3 admission conformance와 no-write/no-clobber/v2-byte-preservation receipt |
| requiredChecks | Bundle descriptor/complete-tree/materializer tests; hostile context/native port matrix; thread/Turn zero assertion; admission regression; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent workspace security/context reviewer와 downstream A/B2 consumer reviewer |
| handoffArtifact | Reviewed fixed B1b commit SHA, canonical bundle digest/roster, native-context/action-admission receipt와 B1 completion evidence |
