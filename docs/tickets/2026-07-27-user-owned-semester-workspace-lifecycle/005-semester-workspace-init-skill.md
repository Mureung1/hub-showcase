# 005 — Pre-App SemesterWorkspace Bootstrap Skill

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

사용자가 AY-PLE을 시작하기 전에 Codex CLI 같은 native client에서 `hub/.agents/skills/semester-workspace-init`을 직접 실행해 SemesterWorkspace를 준비한다. Existing bytes와 dirty Git state를 존중하면서 independent Git root, v4 identity, 짧은 `AGENTS.md`, built-in Skill copy와 required Interaction MCP declaration을 만들고 reviewable checkpoint와 App launch command를 남긴다.

## Spec Traceability

- User stories: 2, 3, 6, 7
- Implementation contract: Pre-App native Bootstrap Skill, Root `workspace-state.json`, Data and State Flow

## Slice-Specific Constraints

- Bootstrap Skill source는 `hub/.agents/skills/semester-workspace-init/SKILL.md`, built-in source authority는 `hub/skills/<skill>/`다. App bundle, App Product Turn, Browser command, app-owned scaffold script, symlink와 Runtime extra root를 사용하지 않는다.
- Target은 existing canonical non-symlink directory이거나 existing canonical non-symlink writable parent 바로 아래의 missing leaf 하나다. Missing ancestor를 recursive 생성하지 않는다.
- Fresh directory는 exact root에서 independent Git repository로 init하고 existing repository의 history, remote와 dirty state를 존중한다. Foreign repository descendant와 target 밖 gitdir indirection은 거절한다.
- Missing v4 state만 만들고 matching state는 no-op한다. 다른 identity·semester, current-v2/v3와 malformed root file은 bytes를 보존한 manual conflict다.
- Missing `AGENTS.md`에는 one-semester repository, actual-file work, frequent meaningful commit와 dirty-tree non-blocking 원칙만 둔다. Existing instruction을 보존하고 semantic duplicate를 만들지 않는다.
- Built-in Skill tree와 Interaction MCP managed table은 missing/exact-match create/no-op, differing bytes·unsafe TOML은 diff와 explicit resolution 전 overwrite 금지다. Other config와 safe comments를 보존한다.
- Fresh Git init은 exact `/.ay-ple/` ignore를 추가하되 existing `.gitignore`를 보존한다. Existing repository의 tracked/ignored legacy state를 바꾸지 않는다.
- 설치 순서는 v4, `AGENTS.md`, built-in Skill과 MCP table을 모두 준비한 뒤 Skill-owned scaffold만 explicit pathspec checkpoint로 만든다. Partial install commit을 남기지 않는다.
- Fresh repository의 existing non-scaffold inventory는 user-approved explicit pathspec 없이는 baseline commit하지 않는다. Existing repository에서는 unrelated dirty/untracked file을 stage하지 않는다.
- Re-run은 exact no-op/no empty commit이며 stale managed declaration만 고친다. User-modified file과 분리할 수 없는 change는 자동 commit하지 않는다.
- Native client의 permission·approval이 metadata와 Git command 권한을 소유한다. App permission profile, candidate writable root, persistent grant와 `working tree clean` gate를 추가하지 않는다.
- Success output은 prepared canonical Git root와 `--workspace <absolute-prepared-root>` App launch command를 명확히 알려준다. Skill final text는 registry를 직접 변경하지 않는다.

## Acceptance Criteria

- [x] App을 시작하지 않은 native Codex client에서 `semester-workspace-init`을 실행해 fresh target이 valid Git root, v4 state, minimal instruction, built-in Skill과 MCP declaration을 갖는다.
- [x] Fresh scaffold와 user-approved material baseline이 서로 구분된 explicit-pathspec commits이고 credential, ignored legacy와 unrelated sentinel은 stage되지 않는다.
- [x] Existing dirty repository의 history·remote·unrelated files를 보존하면서 missing managed resource만 추가하고 rerun exact match는 byte·commit no-op이다.
- [x] Identity, Skill tree, `AGENTS.md`와 TOML conflict가 original bytes와 actionable diff를 보존한 채 honest failure로 끝난다.
- [x] Existing canonical writable parent 바로 아래의 missing leaf만 생성하고 recursive missing ancestor는 만들지 않는다. Foreign repository, gitdir indirection과 protected metadata approval denial은 broad permission fallback이나 partial checkpoint 없이 실패한다.
- [x] Success가 canonical prepared root와 exact `--workspace` launch guidance를 반환하고 registry/App state를 변경하지 않는다.
- [x] App production code에는 Bootstrap invocation, Git init/status/stage/commit/hook/remote/sync state machine이 추가되지 않는다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/semester-workspace` — 통과
  - `npm run test:semester-workspace-init-skill` — fresh/existing Git, no-op, managed conflict, topology, separate baseline, credential guard와 stale command를 포함한 10개 contract fixture 통과
  - Skill `quick_validate.py` — 통과
- Repository checks:
  - `npm test` — 통과
  - `npm run typecheck` — 통과
  - `npm run build` — 통과
  - `npm run lint -w @ay-ple/chat-shell` — 통과
  - `npm run check:docs-links` — 통과
  - `git diff --check` — 통과
- Manual or live smoke:
  - App process 없이 fresh directory, unrelated dirty existing repository, exact rerun, managed-resource conflict와 permission-denial target에서 실행했다. Prepared canonical root와 exact `--workspace` launch guidance, scaffold/material commit 분리, clean/no-op 또는 preserved dirty status를 확인했다.
- `/code-review`:
  - Fixed point `af08bb1641b5d8eac3bb81f5aef2147ab53206a6` 기준 Standards와 Spec 병렬 리뷰를 수행하고 발견 사항을 수정했다.
  - 최종 re-review에서 Standards와 Spec 모두 actionable residual finding 0건을 확인했다.

## Result

- Native client가 실행하는 `semester-workspace-init` Skill, metadata와 TypeScript bootstrap script를 추가했다.
- Bootstrap은 canonical target과 Git topology를 fail-closed로 확인하고 v4 state, minimal `AGENTS.md`, built-in Skill, exact managed MCP declaration과 `/.ay-ple/` ignore를 no-clobber 방식으로 준비한다.
- Scaffold와 explicit user-approved material baseline은 별도 pathspec commit으로 남으며 unrelated dirty files, ignored paths와 credential-like paths를 stage하지 않는다.
- Contract fixture는 exact rerun, original-byte conflict evidence, protected deletion, unsafe topology와 stale managed command update까지 고정한다.
- 구현 checkpoint:
  - `64bbad5c6` — Bootstrap Skill과 contract fixture 추가
  - `bd0319611` — managed-resource와 Git checkpoint conflict 강화
  - `40981a5c5` — conflict evidence와 credential baseline 보호
  - `9f90475b0` — common credential path guard 확장
  - `90872f5ce` — TOML conflict evidence 경로 통합

## Blocked By

- `002-v4-identity-and-workspace-registry.md` — V4 identity와 WorkspaceRegistry
- `../2026-07-27-interaction-capability-semantic-review/001-interaction-contract-and-built-adapter-foundation.md` — Interaction contract와 Built Adapter foundation
- `../2026-07-27-interaction-capability-semantic-review/004-first-assignment-built-in-skill.md` — First Assignment built-in Skill

## Starting Points

- `.agents/skills/semester-workspace-init/SKILL.md`
- `skills/ay-ple-first-assignment/`
- `packages/semester-workspace/src/index.ts`
- `packages/semester-workspace/src/v4-codec.ts`
- `packages/semester-workspace/src/v4-codec.test.ts`
- `docs/architecture/codex-runtime-isolation.md`
- `docs/architecture/ay-app-interaction-capabilities.md`
