# 001 — Spine S0 — workspace·lock scaffold를 고정한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

후속 lane이 서로 다른 package graph와 dependency closure를 만들지 않도록 public preview의 새 workspace 네 개와 root build graph를 compile-only 상태로 고정한다. `packages/runtime-release`, `packages/semester-workspace`, `apps/ay-ple`, `apps/landing`이 아직 제품 behavior를 제공하지 않더라도 install·test·typecheck·build에 참여하며, safe TAR parser의 exact production dependency와 lockfile도 C가 이 단계에서 선점한다.

## Spec Traceability

- User stories: 2, 4, 16, 17
- Implementation contract: Module Responsibilities and Seams; Production host와 root; Runtime release; Parallel delivery contract — `Spine S0`
- Testing decisions: 모든 integration merge의 root gate

## Slice-Specific Constraints

- 이 ticket은 compile-only scaffold다. Runtime download, workspace mutation, host listener, Landing rendering과 public package metadata를 구현하지 않는다.
- Root `package.json`, workspace `package.json`, TypeScript project graph와 `package-lock.json`은 C만 수정한다. 후속 lane은 shared manifest·lockfile을 직접 고치지 않고 필요한 변경을 reviewed serial `contractTipSha` delta로 요청한다.
- 새 workspace는 기존 ESM, strict TypeScript, test/build output convention을 따르고 root의 deterministic test→typecheck→build 순서에 들어간다.
- `packages/runtime-release`가 사용할 in-process safe TAR parser는 검토된 production dependency 하나를 exact하게 pin하고 lockfile에 기록한다. D lane은 parser를 새로 선택하거나 system `tar`·Python fallback을 추가하지 않는다.
- Public `ay-ple` package의 실제 version, `private: false`, `bin`, `files`, `engines`, repository metadata와 publish closure는 후속 Host/release ticket의 책임이다. 이 단계의 placeholder package가 publishable하다고 주장하지 않는다.
- Coordinator는 최대 3개 writer lane만 동시에 활성화한다. Writer lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다.

## Acceptance Criteria

- [x] 네 새 workspace가 최소 source/test/typecheck/build seam을 가지며 root install·test·typecheck·build graph에 결정론적으로 참여한다.
- [x] 각 package identity와 dependency direction이 유일하고 기존 app/package source를 복제하지 않는다.
- [x] Safe TAR parser production dependency가 `packages/runtime-release`의 exact dependency와 root lockfile에 한 번만 기록되고 설치 결과가 재현된다.
- [x] Root script가 새 workspace failure를 숨기지 않으며 기존 네 workspace gate의 의미와 순서를 깨뜨리지 않는다.
- [x] Compile-only scaffold에는 network, filesystem mutation, listener, Browser open 또는 release side effect가 없다.
- [x] Clean install 뒤 root baseline과 `git diff --check`가 green이다.

## Verification

| 범위 | Command | Outcome |
| --- | --- | --- |
| Clean install | `npm ci` | Green. Root lockfile에서 160 packages를 재현 설치했다. |
| Workspace tests | `npm test -w @ay-ple/runtime-release -w @ay-ple/semester-workspace -w ay-ple -w @ay-ple/landing` | Green. 네 compile-only surface와 product behavior 0, exact app dependency roster, S0 non-release resource marker를 검증했다. |
| Workspace typecheck | `npm run typecheck -w @ay-ple/runtime-release -w @ay-ple/semester-workspace -w ay-ple -w @ay-ple/landing` | Green. Strict ESM type graph와 `ay-ple → runtime-release + semester-workspace` compile edge를 검증했다. |
| Workspace build | `npm run build -w @ay-ple/runtime-release -w @ay-ple/semester-workspace -w ay-ple -w @ay-ple/landing` | Green. 네 workspace의 declaration·JavaScript output을 생성했다. |
| Dependency resolution | `npm ls tar-stream @types/tar-stream --all` | Green. `@ay-ple/runtime-release` 아래 `tar-stream@3.2.0`, `@types/tar-stream@3.1.4` exact resolution을 확인했다. |
| Root tests | `npm test` | Green. 새 workspace를 포함한 root test roster 전체가 통과했다. |
| Root typecheck | `npm run typecheck` | Green. 새 workspace를 포함한 root typecheck 순서 전체가 통과했다. |
| Root build | `npm run build` | Green. Explicit clean/build roster와 기존 workspace 상대 순서를 유지한 전체 build가 통과했다. |
| Chat Shell lint | `npm run lint -w @ay-ple/chat-shell` | Green. |
| Documentation links | `npm run check:docs-links` | Green. Active documentation links 28개와 historical cutover banner 2개를 확인했다. |
| Diff hygiene | `git diff --check`; `git show --check 9582a968349d87da031be92df6df9d26d549924b` | Green. |
| Manual/live smoke | 실행하지 않음 | 이 slice의 network, filesystem mutation, listener, Browser와 release behavior는 의도적으로 0이다. |

## Blocked By

None — can start immediately.

## Starting Points

- `package.json`
- `package-lock.json`
- `apps/server/package.json`
- `apps/chat-shell/package.json`
- `packages/product-contract/package.json`
- `packages/codex-chat-runtime/package.json`
- 각 기존 workspace의 `tsconfig.json`, `src/index.ts`, test/build script pattern

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `Spine S0` |
| owner | `C` — Contract/integrator |
| branch | `codex/public-preview-integration` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/integration` |
| handoffSha | `4f758b3aa2da4492048a2093bcb9291bb42cde77` — coordinator가 clean integration worktree에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`를 모두 green으로 확인한 baseline |
| writablePaths | `package.json`; `package-lock.json`; 필요한 root TypeScript/build 설정; `packages/runtime-release/**`; `packages/semester-workspace/**`; `apps/ay-ple/**`; `apps/landing/**`; `docs/tickets/2026-07-23-public-npx-first-release/001-spine-s0-workspace-lock-scaffold.md` |
| consumedContracts | Parent Spec의 workspace roster, package responsibility, root gate와 C-only shared-manifest authority |
| predecessorEvidence | Clean current repository baseline의 test·typecheck·build·Chat Shell lint 결과 |
| requiredChecks | 새 workspace별 test/typecheck/build; `npm test`; `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `npm run check:docs-links`; `git diff --check` |
| reviewOwner | C가 아닌 independent build/package-graph reviewer |
| handoffArtifact | Reviewed fixed S0 commit SHA, exact lockfile digest, safe TAR dependency 선택·license 기록과 green scaffold receipt |

## Result

| 항목 | 결과 |
| --- | --- |
| Observable outcome | `packages/runtime-release`, `packages/semester-workspace`, `apps/ay-ple`, `apps/landing`이 compile-only ESM workspace로 root install·test·typecheck·build에 참여한다. Runtime download, workspace mutation, host/listener, Landing rendering과 publication behavior는 추가하지 않았다. |
| Dependency graph | `ay-ple`의 exact workspace dependency는 `@ay-ple/runtime-release@0.0.0`, `@ay-ple/semester-workspace@0.0.0`, `@ay-ple/server@0.0.0`이다. Manifest·lockfile과 focused test가 이 edge를 소유한다. |
| Resource root | `packages/semester-workspace/resources/workspace/**`는 `releaseResource: false`인 single S0 marker로만 track된다. Actual bundle entry를 추가하기 전에 marker를 제거해야 하며 둘은 공존할 수 없다. |
| Implementation commits | `60174bec99661c83485287cbfbd3ce07dfd2ec4a`; `c73e66c99077f1790196adfedcc29b30116bf284`; `9582a968349d87da031be92df6df9d26d549924b` |
| Final reviewed SHA | `9582a968349d87da031be92df6df9d26d549924b` |
| Lockfile identity | SHA-256 `6dcc45c4d2aac146b925850f98a61a890e5f54360151598c3ccbf22040ba12ab` |
| Safe TAR selection | `tar-stream@3.2.0` exact production dependency, MIT License. Type surface는 `@types/tar-stream@3.1.4` exact dev dependency다. Safe extraction policy 자체와 filesystem write는 이 slice에 구현하지 않았다. |
| Independent review | Standards hard findings 0, Spec findings 0으로 green이다. Root gate roster 반복은 이 ticket이 deterministic root order를 명시적으로 소유하고 기존 repository pattern을 보존한다는 판단 아래 non-blocking으로 인정됐으며 deferred defect가 아니다. |
| Parent state | Tickets 002–035가 아직 completed가 아니므로 parent spec은 변경하지 않았다. |
