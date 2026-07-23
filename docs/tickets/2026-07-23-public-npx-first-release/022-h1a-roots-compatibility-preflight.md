# 022 — H1a — Public host root와 compatibility preflight를 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `H1a` — H1 preflight |
| owner | `H` — Public host |
| branch | `codex/public-preview-h1a-preflight` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/h1a-preflight` |
| handoffSha | Claim 시 coordinator가 012, 014와 021의 fixed reviewed SHA를 integration branch에 DAG 순서로 merge하고 predecessor 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/ay-ple/src/**` 중 `host-contract.ts` 제외; host adapter tests; `docs/tickets/2026-07-23-public-npx-first-release/022-h1a-roots-compatibility-preflight.md`. `apps/ay-ple/package.json`, root manifest/lock와 release-generated values는 제외한다. |
| consumedContracts | S1 host/compatibility/resource contracts; D1 `VerifiedRuntime`; C1 application factory; U1 built-SPA handoff; three-root authority |
| predecessorEvidence | 012·014·021 fixed reviewed SHAs와 integration merge receipts, resolver matrix, U1 build/visual receipt, C1 route/close receipt, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Root containment/ownership/overlap matrix; supported/unsupported compatibility and Browser discovery; mutation-before-preflight 0 trace; host workspace test/typecheck/build; root four gates; docs links; `git diff --check` |
| reviewOwner | H author가 아닌 independent host/security/process reviewer |
| handoffArtifact | Fixed reviewed H1a SHA, validated startup-input/preflight adapter path, compatibility matrix와 pre-mutation fail-closed receipt consumed by H1b |
