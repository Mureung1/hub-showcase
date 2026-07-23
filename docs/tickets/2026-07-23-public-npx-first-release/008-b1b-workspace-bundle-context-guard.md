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
