# 001 — Spine S0 — workspace·lock scaffold를 고정한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

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

- [ ] 네 새 workspace가 최소 source/test/typecheck/build seam을 가지며 root install·test·typecheck·build graph에 결정론적으로 참여한다.
- [ ] 각 package identity와 dependency direction이 유일하고 기존 app/package source를 복제하지 않는다.
- [ ] Safe TAR parser production dependency가 `packages/runtime-release`의 exact dependency와 root lockfile에 한 번만 기록되고 설치 결과가 재현된다.
- [ ] Root script가 새 workspace failure를 숨기지 않으며 기존 네 workspace gate의 의미와 순서를 깨뜨리지 않는다.
- [ ] Compile-only scaffold에는 network, filesystem mutation, listener, Browser open 또는 release side effect가 없다.
- [ ] Clean install 뒤 root baseline과 `git diff --check`가 green이다.

## Verification

- Targeted test or command: 새 네 workspace의 test·typecheck·build script와 safe TAR dependency resolution을 각각 실행한다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. 이 slice의 제품 behavior는 의도적으로 0이다.

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
