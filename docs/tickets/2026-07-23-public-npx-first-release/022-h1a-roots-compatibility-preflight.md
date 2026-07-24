# 022 — H1a — Public host root와 compatibility preflight를 닫는다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: independent implementation review

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Public host가 current working directory나 ambient environment를 신뢰하지 않고 immutable package resources, owner-only app data와 optional admitted workspace를 서로 겹치지 않는 root로 해석한다. Unsupported Mac·Node/npm·Browser 또는 corrupt package descriptor/resource는 Runtime download, credential operation과 workspace mutation 전에 fail closed하고, 지원 조건을 통과한 invocation만 D1의 verified Runtime과 built UI·composed Server를 startup input으로 받는다.

## Spec Traceability

- User stories: 2–4, 16
- Implementation contract: Interfaces and Invariants — Production host와 root; package-owned `ApplicationCompatibilityDescriptor`
- Data and state flow: First run 2–4
- Failure behavior: unsupported OS/arch/Node/npm/Browser, package resource/descriptor mismatch, unsafe root와 storage failure

## Slice-Specific Constraints

- `packageRoot`는 executable ESM module의 `import.meta.url`에서 canonicalize하고 immutable resources만 읽는다. `process.cwd()`, repository checkout, `.env`, Vite, system Python과 ambient `.agents/**`는 fallback이 아니다.
- `appDataRoot` default는 `os.userInfo().homedir` 아래 `~/Library/Application Support/AY-PLE`이고 owner-only non-symlink `0700` root다. Caller-controlled `HOME` 문자열만으로 clean product root를 합성하지 않는다.
- `workspaceRoot`는 fresh setup 전에는 없을 수 있으며 이후에도 B admission이 발급한 exact workspace만 받는다. 세 root와 controlled `HOME`·`CODEX_HOME`·temp/cache child는 unsafe ancestor/descendant overlap을 거절한다.
- Platform·descriptor·package resource compatibility를 모두 검사하기 전 persistent root creation, Runtime resolver, account operation과 workspace mutation을 시작하지 않는다.
- Supported lane은 package-owned frozen descriptor가 소유한다. Host source에 macOS/Node/npm/Browser/version truth를 별도 복사하지 않는다.
- Browser discovery는 exact system/user Applications candidates를 canonicalize하고 `/usr/bin/plutil`이 읽은 bundle ID·minimum major를 검증한다. 다른 위치나 default Browser/Safari를 지원으로 추측하지 않는다.
- H1a는 listener bind, static serving, single-instance protocol, Browser open와 signal handler를 구현하지 않는다.
- Actual package manifest와 lockfile, S1 `host-contract.ts`와 shared contract는 H lane이 수정하지 않는다. 필요하면 C-owned serial delta를 요청한다. Fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer 규칙을 따른다.

## Acceptance Criteria

- [ ] Package root가 packed-module-relative canonical path로 계산되고 declared descriptors, built UI와 dedicated workspace resource가 containment·regular-file·no-symlink·digest 검증을 통과한다.
- [ ] Unsupported OS/arch/macOS/Node/npm/Browser와 descriptor/resource mismatch가 persistent app-data mutation, D1 network, Runtime/account start와 workspace write 0건으로 끝난다.
- [ ] Supported Apple Silicon/macOS/Node/npm invocation이 exact discovered values와 descriptor identity를 가진 preflight result로 수렴한다.
- [ ] Browser candidate가 fixed candidate order, canonical path, expected bundle ID와 pinned minimum major를 모두 만족하며 unsupported/default Browser fallback이 없다.
- [ ] Preflight 뒤 appDataRoot가 owner-only·non-symlink로 create/reopen되고 unsafe owner/permission/symlink와 package/workspace/root overlap을 fail closed한다.
- [ ] Fresh invocation은 workspace 없이도 valid startup context를 만들고 admitted workspace가 있으면 B-owned authority를 그대로 보존한다.
- [ ] D1은 preflight green 뒤에만 호출되며 returned `VerifiedRuntime`을 재조립하거나 system/repository fallback으로 바꾸지 않는다.
- [ ] Error가 발견값·지원값·safe next action을 제공하되 raw path, descriptor URL/digest와 nested private cause를 Browser contract에 노출하지 않는다.

## Verification

- Targeted test or command: S0가 정의한 `ay-ple` workspace test/typecheck/build, root overlap/ownership/symlink matrix, compatibility/browser discovery fixture와 preflight-before-mutation trace
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Supported local Mac에서 read-only platform/Browser discovery를 확인하고 synthetic/preverified package resources와 Runtime descriptor로 preflight한다. OAuth, workspace scaffold와 external download는 실행하지 않는다.

## Blocked By

- [012-d1d-runtime-resolver-transaction-repair.md](012-d1d-runtime-resolver-transaction-repair.md) — D1d — RuntimeResolver transaction과 repair를 완성한다
- [014-u1-guided-setup-compact-ready-ui.md](014-u1-guided-setup-compact-ready-ui.md) — U1 — Guided Setup에서 Compact Ready UI로 전환한다
- [021-c1-serial-server-feature-composition.md](021-c1-serial-server-feature-composition.md) — C1 — Account·Setup 기능을 Server에 직렬 조립한다

## Starting Points

- `apps/ay-ple/src/host-contract.ts`
- S0 `apps/ay-ple` scaffold와 package-relative resource seam
- D1 `RuntimeResolver` and synthetic descriptor fixture
- C1 host-consumable Server application factory
- U1 fixed reviewed UI source/build receipt
- `docs/wayfinding/public-npx-first-release/assets/npx-production-composition-research.md`
- `docs/adr/0006-separate-package-app-data-and-semester-workspace-roots.md`

## Predecessor Contract Note

- `@ay-ple/runtime-release` package root는 production Host가 필요한 descriptor decoder, caller-safe authority error, resolver bundle factory와 contract type만 공개한다. Testing factory·fault hook과 cache/transport/extraction/generation 내부 구현은 deep import하지 않는다.
- `@ay-ple/semester-workspace` package root의 `captureWorkspaceBundleSourceAt`를 package-relative immutable workspace resource 검증에 사용한다. Testing mutation helper를 public Host contract로 올리지 않는다.
- C-owned `PublicPreviewSetupBootstrap`은 required `PublicPreviewWorkspaceTargetGuard`를 받는다. H1a는 authoritative parent가 resolve된 뒤 전달되는 `{ canonicalParent, leafName }`만으로 package/app-data/workspace root overlap을 판단하고 `allowed | blocked`를 반환한다.
- Guard가 `blocked`를 반환하면 Server가 B-owned `SetupJourney` 호출 전에 `setup_invalid_input`으로 닫는다. H1a는 이 seam을 우회하거나 B schema/admission logic을 복제하지 않는다.
- 이 predecessor note 자체는 H1a 완료 증거가 아니다. Fixed reviewed H1a SHA는 별도 implementation review와 required checks가 끝난 뒤에만 기록한다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact handoff | `8147d678a8d7f5f4078b6e1f50062f558feb8e36` — D1d, U1과 C1을 DAG 순서로 포함하고 H1a predecessor seam까지 독립 검토한 clean integration HEAD다. |
| Completed predecessors | Ticket 012의 integrated tip `8164a0489dd929c293df11067e3189fe4f99dd16`, Ticket 014의 integrated tip `c1345c50c5c0272c84e6862e76bcc5ab0532cfc2`, Ticket 021 close `c6b7f4146`은 모두 exact handoff의 ancestor다. Fixed reviewed candidates `27c3dd72c`, `b1f20e07a`, `ad1d4321f`도 같은 history에 포함된다. |
| Latest contract tips | B command-order tip `f24ee0850`, C cleanup tip `f2e993e1c`, Runtime/semester production-root seam `63c847fd3` + `7289dd20d`, Host target-guard seam `8147d678a`를 소비한다. |
| Pre-H1a review | Runtime/semester package-root 공개면과 target guard의 fresh parent·caller-mutation·mutation-zero ordering을 각각 독립 검토했고 unresolved finding 0개로 PASS했다. |
| Integration gates | Exact handoff에서 root `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs links와 `git diff --check`가 green이다. |
| Scope | 이 branch는 `apps/ay-ple/src/**` 중 `host-contract.ts`를 제외한 H-owned source/tests와 이 ticket만 수정한다. Actual manifest/lock·release-generated package resources는 G lane까지 합성하지 않는다. |

## Candidate Evidence

이 절은 implementation candidate의 검증 범위를 기록하며 ticket 완료나 public artifact readiness를 선언하지 않는다.

| Evidence | Result |
| --- | --- |
| Candidate | `4c3f374ae7ceccd155b7f8b821de7d2fac719920` — package resource verification, descriptor-driven compatibility, owner-only roots와 staged `D1 → C` startup을 한 production package-root surface로 조립했다. |
| Targeted gates | `ay-ple` workspace test 92/92, typecheck와 build가 green이다. Root replacement, cancellation, bounded static traversal, package mutation과 pre-effect ordering regressions를 포함한다. |
| Repository gates | Candidate source 기준 root `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs links와 `git diff --check`가 모두 exit 0이다. |
| Built package roots | `@ay-ple/runtime-release`는 `RuntimeReleaseAuthorityError`, `createRuntimeResolverBundle`, `decodeRuntimeReleaseDescriptor`만, `@ay-ple/server`는 `ServerStartupCleanupError`, `createServerApplication`, `listenToServerApplication`만 노출한다. Built `ay-ple` root는 `ApplicationStartupError`, `admitApplicationStartup`만 노출한다. |
| Local read-only smoke | macOS `26.5.2`, arm64 Node `22.22.3`, npm invocation hint `10.9.8`, `/Applications/Google Chrome.app`의 `com.google.Chrome` `150.0.7871.182`를 descriptor policy로 확인해 `ready`로 수렴했다. OAuth, external Runtime download, app-data 생성과 workspace mutation은 실행하지 않았다. |
| Independent corrective review | Module-owned `import.meta.url`, effect-free pre-root Runtime semantic admission, five root revalidation boundaries, exact cleanup error와 bounded static traversal을 재검토해 H1a code blocker 0건으로 PASS했다. Fixed reviewed SHA는 별도 최종 review 뒤에만 정한다. |
| Evidence class | Actual manifest/lock, release-generated resource roster와 public package가 아직 없으므로 현재 결과는 `synthetic_package_preflight`와 local compatibility evidence다. Public package authenticity나 clean-machine readiness를 주장하지 않는다. |

## Known Cross-Package Residual

H1a는 workspace resource tree를 descriptor-derived allowlist와 entry/depth budget으로 앞뒤 검사한다. 다만 `@ay-ple/semester-workspace`의 public `captureWorkspaceBundleSourceAt()`는 내부 recursive scan에 `AbortSignal`과 caller-supplied traversal budget을 받지 않는다. Bounded pre-scan 뒤 concurrent tree injection이 발생하면 post-scan에서 fail closed하지만 그 사이 scan work와 cancellation latency는 public donor가 제한하지 못한다.

이는 H-owned private reimplementation으로 우회하지 않는다. 후속 `@ay-ple/semester-workspace` public capture seam이 bounded roster 또는 cancellation authority를 제공하면 H wrapper가 그 seam을 소비하고 이 residual을 제거한다. Static-site tree와 H-owned package descriptor traversal 자체는 현재 bounded fail-closed다.

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `H1a` — H1 preflight |
| owner | `H` — Public host |
| branch | `codex/public-preview-h1a-preflight` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/h1a-preflight` |
| handoffSha | `8147d678a8d7f5f4078b6e1f50062f558feb8e36` |
| writablePaths | `apps/ay-ple/src/**` 중 `host-contract.ts` 제외; host adapter tests; `docs/tickets/2026-07-23-public-npx-first-release/022-h1a-roots-compatibility-preflight.md`. `apps/ay-ple/package.json`, root manifest/lock와 release-generated values는 제외한다. |
| consumedContracts | S1 host/compatibility/resource contracts; D1 `VerifiedRuntime`; C1 application factory; U1 built-SPA handoff; three-root authority |
| predecessorEvidence | 012·014·021 fixed reviewed SHAs와 integration merge receipts, resolver matrix, U1 build/visual receipt, C1 route/close receipt, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Root containment/ownership/overlap matrix; supported/unsupported compatibility and Browser discovery; mutation-before-preflight 0 trace; host workspace test/typecheck/build; root four gates; docs links; `git diff --check` |
| reviewOwner | H author가 아닌 independent host/security/process reviewer |
| handoffArtifact | Fixed reviewed H1a SHA, validated startup-input/preflight adapter path, compatibility matrix와 pre-mutation fail-closed receipt consumed by H1b |
