# 005 — SemesterWorkspace init Skill

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

사용자가 고른 directory에서 hub-rooted `semester-workspace-init` Skill이 existing bytes와 dirty Git state를 존중하며 SemesterWorkspace를 준비한다. V4 identity, 짧은 `AGENTS.md`, built-in Skill copy와 required Interaction MCP declaration이 설치된 뒤 의미 있는 Git checkpoint를 남기므로 App이 Git UI나 file mutation state machine을 소유하지 않아도 된다.

## Spec Traceability

- User stories: 2, 3, 6, 7
- Implementation contract: BootstrapCandidate와 init/update Skill, Root `workspace-state.json`, Native project context와 Interaction readiness consumption

## Slice-Specific Constraints

- Bootstrap Skill source는 `hub/.agents/skills/semester-workspace-init/SKILL.md`, built-in source authority는 `hub/skills/<skill>/`다. 별도 app-owned scaffold script, symlink와 Runtime extra root를 사용하지 않는다.
- Fresh directory는 exact root에서 Git init하고 existing repository의 history, remote와 dirty state를 존중한다. Foreign repository descendant와 candidate 밖 gitdir indirection은 거절한다.
- Missing v4 state만 만들고 matching state는 no-op한다. 다른 identity·semester, current-v2/v3와 malformed root file은 bytes를 보존한 manual conflict다.
- Missing `AGENTS.md`에는 one-semester repository, actual-file work, frequent meaningful commit와 dirty-tree non-blocking 원칙만 둔다. Existing instruction을 보존하고 semantic duplicate를 만들지 않는다.
- Built-in Skill tree와 Interaction MCP managed table은 missing/exact-match create/no-op, differing bytes·unsafe TOML은 diff와 explicit resolution 전 overwrite 금지다. Other config와 safe comments를 보존한다.
- Fresh Git init은 exact `/.ay-ple/` ignore를 추가하되 existing `.gitignore`를 보존한다. Existing repository의 tracked/ignored legacy state를 바꾸지 않는다.
- 설치 순서는 v4, `AGENTS.md`, built-in Skill과 MCP table을 모두 준비한 뒤 scaffold checkpoint를 만든다. 이 ticket이 install 이후 checkpoint ownership을 가지며 partial install commit을 남기지 않는다.
- Fresh repository의 existing material은 user-approved explicit path만 별도 baseline commit한다. Existing repository에서는 unrelated dirty/untracked file을 stage하지 않는다.
- First Assignment가 Interaction result `accept`를 받은 뒤 actual file을 수정하면 AY는 explicit pathspec으로 meaningful checkpoint를 남긴다. `revise | reject` 또는 file/Git failure를 App success로 합성하지 않는다.
- Re-run은 exact no-op/no empty commit이며 stale managed declaration만 고친다. User-modified file과 분리할 수 없는 change는 자동 commit하지 않는다.

## Acceptance Criteria

- [ ] Bootstrap Runtime의 native Skill discovery로 `semester-workspace-init`을 실행해 fresh candidate가 valid Git root, v4 state, minimal instruction, built-in Skill과 MCP declaration을 갖는다.
- [ ] Fresh scaffold와 user-approved material baseline이 서로 구분된 explicit-pathspec commits이고 credential, ignored legacy와 unrelated sentinel은 stage되지 않는다.
- [ ] Existing dirty repository의 history·remote·unrelated files를 보존하면서 missing managed resource만 추가하고 rerun exact match는 byte·commit no-op이다.
- [ ] Identity, Skill tree, `AGENTS.md`와 TOML conflict가 original bytes와 actionable diff를 보존한 채 honest failure로 끝난다.
- [ ] Protected metadata approval denial과 reviewer unavailable가 broad permission fallback이나 partial checkpoint 없이 실패한다.
- [ ] Accepted First Assignment는 actual file 변경 뒤 meaningful commit을 만들고 reject/revise, ambiguous result와 Git failure는 false checkpoint를 만들지 않는다.
- [ ] App production code에는 Git init/status/stage/commit/hook/remote/sync state machine이 추가되지 않는다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/semester-workspace`
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
  - `npm test -w @ay-ple/server`
  - Init Skill contract와 fresh/existing Git filesystem fixture의 focused test
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Fresh directory, unrelated dirty existing repository, managed-resource conflict와 approval-denial candidate에서 init/update와 `git status --short`·`git log` 결과를 확인한다.

## Blocked By

- `002-v4-identity-and-workspace-registry.md` — V4 identity와 WorkspaceRegistry
- `004-native-git-project-context-and-permission-trust.md` — Native Git project context와 permission·trust
- `../2026-07-27-interaction-capability-semantic-review/001-interaction-contract-and-built-adapter-foundation.md` — Interaction contract와 Built Adapter foundation
- `../2026-07-27-interaction-capability-semantic-review/004-first-assignment-built-in-skill.md` — First Assignment built-in Skill

## Starting Points

- `.agents/skills/`
- `packages/semester-workspace/resources/workspace/AGENTS.md`
- `packages/semester-workspace/resources/workspace/.agents/skills/ay-ple-first-assignment/SKILL.md`
- `packages/semester-workspace/src/v3-codec.test.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `apps/server/src/testing/first-assignment-product.actual.ts`
- `docs/architecture/codex-runtime-isolation.md`
- `docs/architecture/ay-app-interaction-capabilities.md`
