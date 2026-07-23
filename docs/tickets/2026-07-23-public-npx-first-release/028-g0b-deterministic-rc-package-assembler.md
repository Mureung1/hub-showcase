# 028 — G0b — Deterministic RC package assembler를 만든다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

G0a의 clean public snapshot과 fixed Runtime/application inputs를 isolated staging으로 옮겨 exact npm application `.tgz`, Runtime/application sidecar, dependency/SBOM/provenance material과 release display artifact를 deterministic하게 조립한다. Source→staging→tarball의 package-owned resource와 workspace bundle이 complete-tree equality를 유지하고 같은 입력의 두 pack이 byte-for-byte 같아야 한다.

## Spec Traceability

- User stories: 2, 4, 15–18
- Implementation contract: production host/package invariant, Runtime/application descriptor와 package resource binding
- Implementation decisions: `Parallel delivery contract`의 G0 release authority
- Implementation decisions: `Public source, license와 publication`의 candidate identity, npm exact version, Runtime/application immutable identity와 release display truth
- Testing decisions: export/pack tests, candidateDigest minimum binding과 `packed_black_box(I1)`의 G1 artifact prerequisite

## Slice-Specific Constraints

- G0a가 만든 exact clean snapshot manifest를 입력으로 받고 current worktree에서 package files를 다시 수집하지 않는다.
- Isolated staging에서 production dependency closure와 generated `npm-shrinkwrap.json`을 만들고 `npm pack`한다. Root/workspace lockfile를 수정하거나 generated shrinkwrap를 canonical root authority로 승격하지 않는다.
- Public package metadata, `files`, single `bin`, engines/npm/os/cpu/license/repository/homepage/bugs와 no lifecycle-hook invariant를 fail closed로 검증한다.
- Package resource는 source→staging→tarball에서 exact complete-tree equality를 유지해야 한다. Workspace bundle과 built-in Skills, application assets, Runtime descriptor를 별도 digest로 기록한다.
- Dependency/install roster, SBOM, provenance와 production bundle origin은 canonical roster와 exact match해야 한다.
- Runtime archive는 R2 output을 재빌드하지 않고 immutable descriptor/manifest/digest로 bind한다.
- Release display artifact는 version, exact `npx`, size, compatibility, links와 candidate identity를 machine-readable하게 제공하되 실제 public URL/ID를 합성하지 않는다.
- 이 단계는 local/private RC material만 만든다. GitHub/npm/Pages external write와 publication success claim은 금지한다.
- 027 fixed reviewed SHA가 integration에 merge된 coordinator-recorded `handoffSha`에서 branch를 만들며 sibling merge/cherry-pick은 금지한다. Shared root manifests/lockfiles/TS graph는 C-owned serial delta로만 변경한다.
- 전체 active lane writer는 최대 3명, 이 worktree writer는 1명이다. Review는 fixed SHA 단위이며 변경 시 재검토한다.

## Acceptance Criteria

- [ ] Clean snapshot manifest, exact application version, Runtime descriptor와 workspace bundle descriptor를 입력으로 isolated staging을 만든다.
- [ ] 같은 fixed inputs로 두 번 assembly/pack한 `.tgz` SHA-256과 npm integrity가 동일하다.
- [ ] Tarball metadata가 parent spec의 public package invariant를 모두 만족하고 lifecycle hook, unexpected bin/file/dependency가 0건이다.
- [ ] Source→staging→tarball의 package-owned resources와 workspace bundle complete-tree digest가 동일하다.
- [ ] Dependency/install roster, SBOM, provenance, third-party notices와 production bundle origin set이 exact match한다.
- [ ] Runtime/application sidecar가 source SHA, version, tarball SHA-256/integrity, Runtime asset/manifest/archive digest와 bundle digest를 한 candidate input으로 기록한다.
- [ ] Release display artifact가 같은 sidecar에서 파생되고 placeholder, `@latest`, bare package command나 unsupported platform claim을 포함하지 않는다.
- [ ] Assembly 전후 tracked source와 root lockfiles가 동일하다.
- [ ] 외부 registry, GitHub Release, repository와 Pages write가 0건이다.

## Verification

- Targeted: isolated staging, metadata/files/bin/hook validation, dependency closure, SBOM/provenance/legal roster와 resource equality tests
- Determinism: 같은 G0a snapshot으로 independent staging 두 개를 pack해 tarball SHA-256/npm integrity를 비교한다.
- Tarball inspection: `npm pack --json` 결과와 unpacked manifest/resource tree를 sidecar와 대조한다.
- Nonmutation: source tree와 root/workspace lockfile before/after identity를 확인한다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`

## Blocked By

- [027-g0a-clean-public-snapshot-generator.md](027-g0a-clean-public-snapshot-generator.md) — G0a — Clean public snapshot generator를 만든다

## Starting Points

- 027이 제공하는 clean snapshot manifest와 legal/provenance roster
- `docs/adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md`
- `packages/codex-chat-runtime/manifests/**`
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- Predecessor-created `apps/ay-ple/**`, `packages/runtime-release/**`, `packages/semester-workspace/**`
- Target owner paths `scripts/public-release/**`, ignored `distribution/staging/**`, `distribution/public-root/**`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `G0b` / owner `G` |
| owner | Release lane writer 1명 |
| branch/worktree | `codex/public-preview-g0b-rc-assembler` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/g0b-rc-assembler` |
| handoffSha | 027 fixed review SHA가 integration에 merge되고 gates가 green인 뒤 coordinator가 기록한 immutable full SHA. Fake/예상 SHA는 금지한다. |
| writablePaths | `scripts/public-release/**`; `distribution/public-root/**`; ignored `distribution/staging/**`; `docs/tickets/2026-07-23-public-npx-first-release/028-g0b-deterministic-rc-package-assembler.md` |
| consumedContracts | G0a snapshot manifest; H1 package metadata/resource roster; R2 immutable Runtime descriptor/archive; B workspace bundle descriptor; L release-display schema |
| predecessorEvidence | 027 merge receipt와 output tree digest, exact Runtime/application input sidecars, latest C-owned `contractTipSha` |
| requiredChecks | Two-pack identity, tarball inspection, source/staging/tarball equality, dependency/SBOM/provenance equality, source nonmutation, root four, docs links, `git diff --check` |
| reviewOwner | G0b author가 아닌 독립 package/release reviewer |
| handoffArtifact | `g0b-rc-assembler-handoff.json`: input manifest digests, review SHA, commands/tool versions, two tarball digests/integrities와 sidecar digests |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only `--no-ff`; active lane writer 최대 3명; shared delta는 C-owned serial branch |
| external writes | 0. Local/private staging과 artifact 생성만 허용한다. |
