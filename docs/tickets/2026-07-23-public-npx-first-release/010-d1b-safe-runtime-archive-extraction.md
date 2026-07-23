# 010 — D1b — Runtime archive를 안전하게 staging에 추출한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Verified archive byte를 final cache generation과 격리된 staging root에만 풀고, 쓰기 전에 전체 TAR path graph와 entry policy를 검사한 뒤 canonical Runtime manifest의 exact recipient/tree/legal roster와 일치하는 tree만 반환한다. Hostile archive는 사용자 파일이나 기존 cache를 건드리지 않고 stable unsafe/integrity failure로 끝난다.

## Spec Traceability

- User stories: 3, 4, 17
- Implementation contract: Runtime release — safe extraction와 complete-tree verification; Failure Behaviour; Parallel delivery contract — `D1`
- Testing decisions: unsafe tar, collision, decompression bound, legal/roster drift와 no-fallback

## Slice-Specific Constraints

- Archive의 normalized path graph 전체를 pre-scan해 policy를 통과하기 전 recipient file을 쓰지 않는다.
- Absolute path, empty/`.`/`..` segment, NUL, platform separator ambiguity, Unicode normalization·case-fold duplicate, file/directory prefix conflict를 거절한다.
- Entry 수, individual file bytes와 total expanded bytes는 descriptor/manifest-bound 상한 아래여야 한다. gzip/TAR bomb와 integer overflow를 fail closed한다.
- Hardlink, sparse, device, FIFO, socket, setuid/setgid/sticky와 허용하지 않은 pax/xattr/type/mode를 거절한다. 허용한 symlink는 regular file/directory materialization 뒤 마지막에 만들고 target containment를 다시 확인한다.
- Directory와 file create는 no-follow/no-clobber이고 D1a가 발급한 owned empty staging root 밖으로 나갈 수 없다.
- Extraction 뒤 exact top-level roster, canonical manifest byte, complete file/symlink tree, reviewed mode와 legal/provenance roster를 current verifier 수준 이상으로 검증한다. Receipt만 신뢰하지 않는다.
- System `tar`, system Python, shell extraction과 hand-written unbounded TAR parser를 사용하지 않는다.
- S0 또는 C-reviewed serial `contractTipSha`가 safe TAR parser exact dependency·lock을 소유해야 한다. 이 evidence가 fixed integration HEAD에 없으면 구현을 시작하지 않고 D lane에서 manifest/lockfile을 수정하지 않는다.
- Transport, retry/resume, cache generation publish와 quarantine orchestration은 이 ticket 범위가 아니다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Valid canonical archive가 owned empty staging에 deterministic tree로 추출되고 complete-tree/manifest/legal roster verification을 통과한다.
- [ ] Path traversal, absolute/NUL path, Unicode/case duplicate, prefix conflict와 symlink escape fixture가 recipient write 0 또는 owned staging cleanup으로 fail closed한다.
- [ ] Hardlink/sparse/special file, unsafe mode/xattr와 unsupported TAR extension fixture가 명확한 `runtime_archive_unsafe`로 끝난다.
- [ ] Entry/file/expanded-byte bound와 truncated/corrupt gzip/TAR가 bounded 시간·space 안에 integrity/unsafe failure로 끝난다.
- [ ] No-follow/no-clobber write와 symlink-last policy가 parent/staging race에서도 containment를 유지한다.
- [ ] Missing/extra/modified tree, mode, manifest와 legal roster drift는 verified staging result가 되지 않는다.
- [ ] Safe TAR exact dependency/lock와 license/SBOM input이 C-owned evidence로 확인되고 D-owned diff에 shared manifest/lock change가 없다.

## Verification

- Targeted test or command: `packages/runtime-release` malicious archive table, valid archive complete-tree verification, staging race/fault tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: 없음. Synthetic archive corpus와 package-local fixtures가 authority다.

## Blocked By

- [009-d1a-runtime-descriptor-cache-authority.md](009-d1a-runtime-descriptor-cache-authority.md) — D1a — Runtime descriptor와 cache authority를 고정한다

## Starting Points

- `packages/runtime-release/src/contract.ts`
- D1a의 descriptor/cache/staging contract와 fixture
- `packages/codex-chat-runtime/src/production-bundle.ts`
- `packages/codex-chat-runtime/src/production-bundle.unit.test.ts`
- `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json`
- S0 또는 C-reviewed `contractTipSha`의 exact safe TAR dependency/lock evidence

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `D1b` |
| owner | `D` — Runtime delivery |
| branch | `codex/public-preview-d1b-safe-extract` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/d1b-safe-extract` |
| handoffSha | Claim 시 coordinator가 009의 fixed reviewed SHA와 필요한 C-owned safe TAR dependency `contractTipSha`를 integration branch에 `--no-ff` 반영하고 predecessor/integration package·root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/runtime-release/src/**` 중 archive preflight/extraction/verifier implementation·tests (`src/contract.ts`, package manifest와 lockfile 제외); malicious archive fixtures; `docs/tickets/2026-07-23-public-npx-first-release/010-d1b-safe-runtime-archive-extraction.md` |
| consumedContracts | D1a descriptor/cache/staging authority, canonical Runtime manifest/complete-tree behavior, C-owned exact safe TAR dependency |
| predecessorEvidence | 009 fixed reviewed SHA와 descriptor no-write/no-network receipt; safe TAR dependency/lock fixed SHA, license record와 green integration gate |
| requiredChecks | Full malicious archive matrix; staging containment/race tests; complete-tree/legal roster tests; runtime-release package test/typecheck/build; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | D1a author가 아닌 independent archive-security reviewer |
| handoffArtifact | Reviewed fixed D1b commit SHA, malicious archive corpus result와 verified-staging complete-tree receipt |
