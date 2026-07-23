# 009 — D1a — Runtime descriptor와 cache authority를 고정한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Exact application이 어떤 Runtime byte만 선택할 수 있는지와 그 generation/archive를 app data 어디에 둘 수 있는지를 `packages/runtime-release` 한 Module이 strict하게 판정한다. Descriptor 또는 canonical manifest가 어긋나면 network와 cache mutation 전에 실패하고, 후속 extraction·transport·resolver가 공유할 content-addressed layout, ownership, lease, receipt와 stable error vocabulary를 고정한다.

## Spec Traceability

- User stories: 3, 4, 12, 16
- Implementation contract: Module Responsibilities and Seams — `packages/runtime-release`; Runtime release; Production host와 root; Failure Behaviour; Parallel delivery contract — `D1`
- Testing decisions: descriptor mismatch before network, cache ownership와 no-fallback

## Slice-Specific Constraints

- S1 frozen `RuntimeReleaseDescriptor`를 strict decode하고 schema version, exact application name/version, public repository, application/Runtime tag, `darwin-arm64`, app–Runtime contract, release ID, archive URL/name/bytes/SHA-256와 canonical manifest resource/bytes/SHA-256를 모두 bind한다.
- Embedded descriptor와 package canonical manifest만 selection authority다. Environment, moving catalog, GitHub latest, cache contents와 existing production bundle path를 선택 근거로 사용하지 않는다.
- Descriptor/manifest mismatch와 unsupported target은 transport 호출, directory create, quarantine와 cache write 전에 fail closed한다.
- Cache root와 content-addressed archive/generation/staging/quarantine path grammar, containment, owner-only permission, no-symlink ancestor와 natural identity를 정의한다. Ambiguous ownership을 PID·mtime·age로 추측하지 않는다.
- Lease/join, generation verification receipt와 quarantine plan은 internal Interface로만 정의한다. Extraction, HTTP transport, download journal과 full resolver orchestration은 구현하지 않는다.
- Stable external error taxonomy는 parent Spec의 `runtime_*` allowlist만 사용하고 raw URL/path/HTTP body/nested cause를 caller-safe result로 내보내지 않는다.
- Current production bundle verifier는 hash, relative-path containment와 complete-tree algorithm donor일 뿐 hard-coded package-local authority를 복사하지 않는다.
- S0가 `packages/runtime-release` safe TAR parser exact dependency와 lockfile을 소유해야 한다. 그것이 누락되거나 변경이 필요하면 D는 manifest/lockfile을 수정하지 않고 C의 reviewed serial `contractTipSha` delta를 요청하며, 그 fixed delta가 integration green이 되기 전 010을 claim하지 않는다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Coordinator는 최대 3개 writer lane만 동시에 활성화한다.

## Acceptance Criteria

- [ ] Descriptor와 canonical manifest decoder가 valid fixture를 accept하고 missing/extra/unknown/type/range/identity drift를 strict하게 거절한다.
- [ ] Application, target, archive와 canonical manifest binding mismatch가 transport spy 0회·filesystem write 0회로 실패한다.
- [ ] Content-addressed cache layout이 `appDataRoot` 안에서만 resolve되고 symlink, escape, unsafe owner/mode와 ambiguous residue를 fail closed한다.
- [ ] Archive, staging, immutable generation, quarantine, lease와 verification receipt의 internal identity가 서로 충돌하지 않는다.
- [ ] Parent Spec stable error family가 internal failure를 coarse하게 분류하고 secret-bearing diagnostics는 private structured evidence에만 남는다.
- [ ] Extraction/download/orchestration behavior가 이 slice에 섞이지 않고 package Interface가 unit fixture로 독립 검증된다.
- [ ] Safe TAR dependency exact pin과 lockfile evidence가 S0 또는 C-reviewed `contractTipSha`에 존재하며 010 claim prerequisite로 기록된다.

## Verification

- Targeted test or command: `packages/runtime-release` descriptor/manifest/cache-layout unit tests, mismatch no-network/no-write spies와 current production verifier donor comparison
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: 없음. Network·archive mutation은 이 slice에서 의도적으로 없다.

## Blocked By

- [003-spine-s2-server-composition-stabilization.md](003-spine-s2-server-composition-stabilization.md) — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Starting Points

- `packages/runtime-release/src/contract.ts`
- `packages/codex-chat-runtime/src/production-bundle.ts`
- `packages/codex-chat-runtime/src/production-bundle.unit.test.ts`
- `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json`
- Parent Spec의 `Runtime release`와 stable error roster
- S0의 `packages/runtime-release/package.json` safe TAR dependency와 `package-lock.json`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `D1a` |
| owner | `D` — Runtime delivery |
| branch | `codex/public-preview-d1a-descriptor-cache` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/d1a-descriptor-cache` |
| handoffSha | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` — 003 fixed reviewed `spineTipSha` `c2e95616d8ac2461844525c69a7e0d714da3e710`와 ticket closeout을 반영한 clean integration HEAD. 003의 Server·Browser·root green receipt와 S0의 exact safe TAR dependency/lock evidence를 확인했다. |
| writablePaths | `packages/runtime-release/src/**` 중 descriptor/cache implementation·tests (`src/contract.ts`와 S1 frozen files 제외); package-local fixtures; `docs/tickets/2026-07-23-public-npx-first-release/009-d1a-runtime-descriptor-cache-authority.md` |
| consumedContracts | S1 frozen Runtime release descriptor/error contract, S0 package graph/safe TAR lock evidence와 current complete-tree verifier behavior |
| predecessorEvidence | Fixed reviewed `spineTipSha`, green root gates; S0 safe TAR dependency/lock record 또는 별도 C-reviewed fixed `contractTipSha` |
| requiredChecks | Descriptor strictness; no-network/no-write mismatch; cache ownership/containment tests; runtime-release package test/typecheck/build; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent Runtime-delivery/security reviewer와 C manifest/lock authority reviewer |
| handoffArtifact | Reviewed fixed D1a commit SHA, descriptor/cache contract fixture roster, no-write/no-network receipt와 010 dependency-gate evidence |
