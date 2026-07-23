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

## Candidate Verification Receipt

Independent Runtime-delivery/security review 전 candidate-only receipt다. Ticket state는 `claimed`, Acceptance Criteria는 unchecked로 유지한다.

| Evidence | Candidate result |
| --- | --- |
| Fixed base | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` |
| C delta fixed base | Reviewed D1a tip `3c93750d8c5cfe74a0de563cf78c8f3ab164b9cd` |
| Claim commit | `eafd0ea70d9a0387ca64e639ff0045acdbfcad8e` |
| Implementation commit | `30f591fb434b585988eed1f5c5baf383fca2f439` |
| Security-review correction commit | `64fc17b1ca1f3354fc9408aefaecac12459addae` — initial independent Runtime-delivery/security RED의 D-owned finding을 교정한다. |
| Site-packages correction commit | `8d5fd0dc9b1a46ccdb5c75ddf295f689b3bf4fc6` — re-review P1에서 발견한 exact file/symlink 승인을 닫는다. |
| Folded path-graph correction commit | `73ad4faa3978e018dba141817b6e02f9306d6c4a` — final re-review P1의 folded ancestor/directory identity ambiguity를 닫는다. |
| Fixed-point fold correction commit | `42c4f354566ae8c389bf61fae0e9a47fdd76a4c6` — U+1E9E `ẞ → ß → ss`처럼 one-pass가 닫히지 않는 Unicode fold를 bounded fixed point로 수렴시킨다. |
| Descriptor/manifest admission | `npm test -w @ay-ple/runtime-release` — 65/65 green. Missing/extra/unknown/type/range, application·target·contract·resource identity, roster와 byte binding drift뿐 아니라 repository/archive query·fragment·credentials·nondefault port·dot/percent normalization, userinfo-like segment와 noncanonical release path를 effect 전에 fail closed한다. |
| No-effect ordering | Targeted `application, target, archive, and manifest mismatch invoke no downstream effect` regression 1/1 green. 각 mismatch는 admission 뒤 effect callback 0회·filesystem tree mutation 0으로 종료한다. D1a source에는 HTTP/download/extraction 구현이 없다. |
| Canonical manifest hardening | Exact root regular files, `licenses/` subtree, terminal in-roster symlink resolution과 loop/dangling rejection을 검증한다. `launch.site_packages`는 exact regular file/symlink 또는 missing/empty root를 거절하고 `site_packages/` 아래 nonempty descendant subtree만 허용한다. Segment-wise macOS-folded path graph는 bounded eight-pass full-fold fixed point를 사용한다. `ẞ/ß/ss`, `Σ/ς`, canonical normalization과 case-equivalent leaf collision뿐 아니라 양 insertion order의 folded file/symlink ancestor 및 differently cased implicit-directory merge를 모든 깊이에서 거절하며 accent 차이와 exact raw directory sharing은 보존한다. Current runtime의 모든 Unicode scalar를 scan해 one-pass non-idempotent fold가 fixed identity collision으로 닫히는 regression guard도 green이다. |
| Cache authority | Content-addressed archive/partial/generation/staging/quarantine/lease/receipt path가 `runtime-cache/v1` 아래에서 충돌 없이 고정된다. App-data/cache parent/root/namespace의 `(dev, ino)`, owner UID, exact `0700` including special-bit mask, no-symlink ancestor와 same-device identity를 observation 전후에 bind한다. Mutation 전에는 retained snapshot을 `revalidateRuntimeCacheRootForMutation`으로 다시 확인하며 rename·symlink substitution probe를 `runtime_recovery_required`로 닫는다. |
| Stable failure boundary | S1 `runtime_*` allowlist만 caller-safe `failure`에 사용한다. Raw URL/path/digest/nested cause는 ECMAScript private field에 남고 `diagnosticEvidence()`로만 명시적으로 접근하며 `Object.keys(error)`와 `JSON.stringify(error)`에는 노출되지 않는다. |
| Package checks | `npm test -w @ay-ple/runtime-release`; `npm run typecheck -w @ay-ple/runtime-release`; `npm run build -w @ay-ple/runtime-release` green |
| Root checks | `npm test`; `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `npm run check:docs-links`; `git diff --check` green |
| Writable-scope proof | D1a candidate는 기존 D-owned source/ticket 범위를 유지한다. C delta fixed base 이후 변경은 `packages/runtime-release/src/contract.ts`, `contract.test.ts`, package README와 이 candidate receipt뿐이며 root/workspace manifest와 lockfile은 변경하지 않았다. |
| Safe TAR prerequisite | `tar-stream@3.2.0`, `@types/tar-stream@3.1.4` exact resolution green. `package-lock.json` SHA-256는 S0 evidence와 같은 `6dcc45c4d2aac146b925850f98a61a890e5f54360151598c3ccbf22040ba12ab`이다. Ticket 010을 위한 C-only manifest/lock delta는 필요 없다. |
| C-only contract candidate | `675f2a9f0b850eb154739252f8d5145bdfbaeef4` — exact canonical GitHub repository와 same-authority release URL semantic decode를 frozen contract에 추가했다. Repository/archive hostile fixture와 exact release binding은 기존 `RuntimeReleaseContractError` family로 닫히며 D1a admission의 중복 defense도 유지한다. |
| Documentation follow-up | `packages/runtime-release/README.md`를 D1a current descriptor/manifest/cache authority, package commands와 source-internal boundary로 갱신했다. HTTP/download, extraction, cache mutation과 resolver 구현은 현재 미구현으로 명시했다. |
| Review state | Initial independent Runtime-delivery/security review RED, `site_packages` re-review P1, folded ancestor P1과 fixed-point fold P1을 교정했다. C-only contract candidate `675f2a9f0b850eb154739252f8d5145bdfbaeef4`와 결합한 fixed candidate의 Runtime-delivery/security 및 C authority review 대기 |

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
