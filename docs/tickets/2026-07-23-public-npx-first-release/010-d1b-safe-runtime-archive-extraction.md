# 010 — D1b — Runtime archive를 안전하게 staging에 추출한다

## Agent triage

- State: claimed
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
| handoffSha | `1bacf08625a7df70b12fa1cee7ecff9f09907b49` — coordinator가 reviewed D1a closeout과 C-owned safe TAR dependency/lock을 integration branch에 `--no-ff` 반영하고 predecessor/integration gate를 green으로 확인한 exact handoff |
| writablePaths | `packages/runtime-release/src/**` 중 archive preflight/extraction/verifier implementation·tests (`src/contract.ts`, package manifest와 lockfile 제외); malicious archive fixtures; `docs/tickets/2026-07-23-public-npx-first-release/010-d1b-safe-runtime-archive-extraction.md` |
| consumedContracts | D1a descriptor/cache/staging authority, canonical Runtime manifest/complete-tree behavior, C-owned exact safe TAR dependency |
| predecessorEvidence | 009 reviewed combined tip `5be60ccf4dc04b42898244cf5033e339c1f58e6f`와 closeout `b5ad973b44427ba35db4da62fbb6c7ec02c74fe9`가 integration에 반영됨; `tar-stream@3.2.0`, `@types/tar-stream@3.1.4`, pre-D1b lock SHA-256 `6dcc45c4d2aac146b925850f98a61a890e5f54360151598c3ccbf22040ba12ab`; coordinator-confirmed green integration gate |
| requiredChecks | Full malicious archive matrix; staging containment/race tests; complete-tree/legal roster tests; runtime-release package test/typecheck/build; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | D1a author가 아닌 independent archive-security reviewer |
| handoffArtifact | Reviewed fixed D1b commit SHA, malicious archive corpus result와 verified-staging complete-tree receipt |

## Candidate Receipt — author handoff

이 receipt는 independent review 전 author candidate를 coordinator에게 전달한다. Ticket state는 `claimed`, acceptance checkbox는 모두 미완료 상태로 유지하며 review·closeout은 coordinator가 소유한다.

| Evidence | Result |
| --- | --- |
| fixed handoff | `1bacf08625a7df70b12fa1cee7ecff9f09907b49` |
| claim commit | `aea0750ce441102b57fd121b6a27a34228af1b25` — `docs: claim safe runtime archive extraction` |
| candidate code commits | `1d5a9136d21d54c5f271aeef7c07373702312dee` — canonical pre-scan/extraction/verifier; `ec385e753b2cc0708ac699e5089b41993a3ea1e7` — hostile corpus·bound·fault/race hardening; `b2480fbeb41a3a3026ea37d7c660bbb7f8b2fd5c` — no-follow filesystem verification·entry-task join·precondition hardening; `94dac5a0408cf5fabce511f10504e26824930aa8` — retained directory capability와 final authority·hardlink·storage-fault correction; `0531c1b5a4a0a04c9b94b64d1f0706f07006a4e7` — missing recorded cleanup entry를 ambiguity로 승격; `9a2144cdb5a1d4962cfcec5a9aa88d8ed919f4cc` — recipient mutation 뒤 pathname cleanup을 제거하고 staging residue를 recovery로 보존; `2c207d6d1802edf649b455cc296a206f5e484659` — final file pathname re-open/readback과 point-in-time snapshot 의미 고정 |
| candidate code tip | `2c207d6d1802edf649b455cc296a206f5e484659` |
| valid receipt | descriptor-bound archive를 owned empty staging의 `<staging>/runtime`에 추출하고 canonical `manifest.json`, exact 7-entry top-level roster, complete 8-file/1-symlink payload, `149` regular bytes, reviewed mode·single-link regular file·symlink target과 final staging `0700` authority를 capability walk와 final pathname re-open/readback으로 재검증한 `RuntimeStagingVerificationSnapshot`. 이는 관찰 시점의 evidence이며 durable path authority가 아니다. |
| security correction | Node/macOS가 inode-conditional pathname delete를 제공하지 않으므로 recipient mutation 뒤 D1b는 pathname cleanup을 수행하지 않는다. 모든 retained capability를 닫고 staging residue를 그대로 보존한 `runtime_recovery_required`로 끝내며, 후속 D1d가 lease 아래 quarantine/reconcile을 소유한다. 성공 시에도 열린 file descriptor hash 뒤 같은 pathname을 다시 열어 identity·bytes를 재검증하지만, publish 뒤 fresh complete-tree readback과 spawn 재검증을 대신하지 않는다. |
| synthetic corpus | Package 전체 `152/152`; unsafe/corrupt archive pre-scan case `40/40`은 recipient write `0`을 유지한다. 추가 exact seam은 capability check/use create race `4/4`, no-delete recovery와 same-name final rebind `2/2`, final hardlink/staging-authority drift `2/2`, materialization storage operation recovery `7/7`이다. 실패 뒤 recorded byte와 unrecorded residue를 함께 보존하며 snapshot을 반환하지 않는다. |
| package gates | `npm test -w @ay-ple/runtime-release` → `152/152`; `npm run typecheck -w @ay-ple/runtime-release` → green; `npm run build -w @ay-ple/runtime-release` → green; compiled `dist/runtime-archive-directory-capability.js` self-fork smoke → prior reviewed tip에서 green |
| repository gates | Prior reviewed tip에서 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`이 green이었다. Exact cleanup correction tip은 package gate, `npm run check:docs-links`, `git diff --check`를 재실행하고 full integration gate는 C에 handoff한다. |
| dependency/lock | `tar-stream@3.2.0`, `@types/tar-stream@3.1.4`; `package-lock.json` SHA-256 `6dcc45c4d2aac146b925850f98a61a890e5f54360151598c3ccbf22040ba12ab` 유지 |
| frozen/diff boundary | `src/contract.ts`, package manifest, lockfile, package README, shared frozen contract, transport/resume/resolver orchestration 변경 없음; correction fixed point `3194a2f3e8fcaa3a36b89a2e1c1ef278f804fd25` 대비 code diff는 `runtime-archive-directory-capability.ts`, `runtime-archive-extraction.ts`와 `.test.ts`만 포함 |
| review status | Independent archive-security re-review는 prior capability correction tip에서 green이었다. 이후 Spec P1 두 건을 `9a2144cdb`와 `2c207d6d1`에서 교정했다. Exact correction tip의 independent re-review와 acceptance/closeout은 미실행이다. |

### C handoff

- C는 D1a의 exact `RuntimeReleaseAdmission`, `RuntimeCacheLayout`, `RuntimeCacheMutationAuthority`, `RuntimeStagingIdentity`와 canonical manifest bytes를 `extractVerifiedRuntimeArchive()`에 함께 전달해야 한다.
- 호출 전에 descriptor-bound archive를 cache archive path에 owner-only `0600` regular file로, staging root를 같은 filesystem의 owner-only `0700` empty directory로 준비한다.
- 성공 snapshot이 관찰한 `runtimeRoot`는 `<staging>/runtime`이지만 durable path authority가 아니다. D1d는 publish lease 아래 fsync/atomic generation publish와 fresh complete-tree readback을 수행해야 하며, 실패 residue의 quarantine·repair와 resolver orchestration도 계속 C 소유다.
- Publisher archive는 manifest에서 유도한 directory entry를 모두 명시하고 regular file·directory·symlink만 사용한다. Directory `0755`, manifest/payload reviewed mode, symlink `0777`, canonical octal size와 TAR trailer 2 block을 사용하며 PAX/GNU extension·xattr·ACL·sparse·hardlink·special entry를 만들지 않는다.
- Reviewed D1b를 integration한 뒤 C-owned `packages/runtime-release/README.md`의 “extraction 미구현” 현재 사실을 갱신한다. `extractVerifiedRuntimeArchive()`와 source-internal retained-cwd capability boundary가 구현됐지만 transport, publish, quarantine·repair와 resolver orchestration은 계속 미구현이라는 경계를 기록한다.
