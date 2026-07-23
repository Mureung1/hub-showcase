# 027 — G0a — Clean public snapshot generator를 만든다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

고정된 reviewed commit tree만 입력으로 받아 positive allowlist와 hard deny를 적용하고, 공개 저장소용 clean root snapshot과 legal/trust/provenance roster를 deterministic하게 생성하는 G0 첫 단계다. 현재 worktree, ignored/untracked 파일과 camp-internal surface는 입력 authority가 될 수 없고, 같은 SHA의 두 export는 byte-for-byte 동일해야 한다.

## Spec Traceability

- User stories: 15–18
- Implementation contract: `Module Responsibilities and Seams`의 Release generator/publication runner
- Implementation decisions: `Parallel delivery contract`의 `R2 + H1 + L1 → G0`
- Implementation decisions: `Public source, license와 publication`의 clean export, hard deny, Apache-2.0, trust surface와 `REDIST-01..12`
- Testing decisions: export/pack tests의 two-export identity, tracked-source nonmutation, allowlist/hard-deny와 legal/SBOM/provenance set equality

## Slice-Specific Constraints

- Input은 exact `git commit` tree다. 현재 checkout, working tree, ignored/untracked state나 clone-local `.git` artifact를 복사하지 않는다.
- Positive allowlist를 canonical source로 삼고 root `AGENTS.md`, `skills-lock.json`, `.agents/**`, camp `.github/**`, `artifacts/**`, gitlink, planning/archive/internal agent docs를 hard deny한다.
- Dedicated package resource 아래의 reviewed product `AGENTS.md`와 declared built-in Skills만 application/public source에 포함할 수 있다.
- 공개 root의 README/Docs, `LICENSE`, `NOTICE`, `THIRD_PARTY_NOTICES`, original license tree, SBOM/provenance input, `SECURITY.md`, `CONTRIBUTING.md`, `PRIVACY.md`와 brand provenance template을 생성한다. 표준 license/DCO 원문은 임의 번역·수정하지 않는다.
- Canonical component roster, redistribution evidence와 generated legal/provenance set은 exact set equality를 만족해야 한다. `unknown`, `human_review`, missing license/source는 fail closed한다.
- 이 티켓은 snapshot generator만 소유한다. Package assembly, publication state write, public repository push, npm/GitHub/Pages mutation은 하지 않는다.
- Branch는 coordinator가 015, 020, 025를 integration에 merge한 뒤 기록한 immutable `handoffSha`에서 시작한다. Sibling branch merge/cherry-pick은 금지하고 coordinator만 reviewed fixed SHA를 `--no-ff` merge한다.
- 전체 lane writer 최대 3명, worktree writer 1명을 지킨다. Root/workspace manifests·lockfiles와 shared TypeScript graph 변경은 C-owned serial delta로 요청한다.
- Review는 fixed candidate SHA에만 유효하다. 변경이 생기면 새 SHA review를 받는다.

## Acceptance Criteria

- [ ] Exact source SHA와 allowlist를 입력받아 repository 밖 clean output root를 생성한다.
- [ ] 같은 source SHA에서 두 번 생성한 snapshot의 canonical tree digest가 동일하다.
- [ ] Export 전후 tracked source tree가 동일하며 generator가 source checkout을 수정하지 않는다.
- [ ] Hard-deny roster의 파일과 clone-local ignored/untracked state가 export에 0건이다.
- [ ] Public README/Docs와 legal/trust files가 required roster에 존재하며 placeholder URL, fake version 또는 internal path를 포함하지 않는다.
- [ ] First-party source/docs와 세 brand image의 Apache-2.0/NOTICE/provenance가 일관된다.
- [ ] Third-party canonical roster, original licenses, notices, source evidence와 provenance/SBOM input set이 exact match하고 unresolved entry는 명시적 blocker가 된다.
- [ ] Snapshot manifest가 source full SHA, tree digest, exporter/tool version과 each-file digest를 기록한다.
- [ ] Generator와 fixtures는 real GitHub/npm/Pages write를 호출하지 않는다.

## Verification

- Targeted: clean-tree export fixture, positive allowlist/hard-deny matrix, symlink/gitlink/ignored-state rejection, legal roster set-equality tests
- Determinism: fixed SHA에서 독립 output root 두 개를 생성하고 canonical tree/manifest digest를 비교한다.
- Nonmutation: export 전후 `git status --porcelain`과 tracked tree identity를 비교한다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Review evidence는 exact input/review SHA, tool versions, allow/deny roster digest와 두 export digest를 기록한다.

## Blocked By

- [015-l1-public-product-landing.md](015-l1-public-product-landing.md) — L1 — Public product Landing이 release truth를 렌더링한다
- [020-r2c-deterministic-runtime-archive.md](020-r2c-deterministic-runtime-archive.md) — R2c — deterministic Runtime archive candidate를 만든다
- [025-h1d-browser-signal-lifecycle.md](025-h1d-browser-signal-lifecycle.md) — H1d — Browser·signal lifecycle을 bounded하게 닫는다

## Starting Points

- `docs/adr/0015-bootstrap-public-repository-from-reviewed-clean-snapshot.md`
- `docs/adr/0016-distribute-public-preview-with-an-exact-npx-launcher-and-verified-runtime-release.md`
- `docs/wayfinding/public-npx-first-release/assets/publication-inventory-index.json`
- `docs/wayfinding/public-npx-first-release/assets/publication-inventory-audit.md`
- `docs/wayfinding/public-npx-first-release/assets/third-party-redistribution-evidence.md`
- `docs/wayfinding/public-npx-first-release/assets/publication-release-gates-research.md`
- Predecessor-created `apps/landing/**`, `apps/ay-ple/**`, `packages/runtime-release/**`
- Target owner paths `scripts/public-release/**`, `distribution/public-root/**`, `distribution/public-source-allowlist.json` — claim 시 실제 scaffold를 재확인한다.

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `G0a` / owner `G` |
| owner | Release lane writer 1명 |
| branch/worktree | `codex/public-preview-g0a-public-snapshot` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/g0a-public-snapshot` |
| handoffSha | 015, 020, 025의 reviewed SHA가 integration에 merge되고 root gates가 green인 시점의 coordinator-recorded immutable full SHA. 문서 작성 시 SHA를 만들지 않는다. |
| writablePaths | `scripts/public-release/**`; `distribution/public-root/**`; `distribution/public-source-allowlist.json`; `docs/tickets/2026-07-23-public-npx-first-release/027-g0a-clean-public-snapshot-generator.md` |
| consumedContracts | ADR 0015/0016; publication inventory index; REDIST evidence; L1 release-display consumer contract; R2 Runtime archive/legal roster; H1 package resource roster |
| predecessorEvidence | 015/020/025 fixed review SHA와 merge receipts, latest `contractTipSha`, Runtime manifest/archive evidence와 Landing/package resource inventories |
| requiredChecks | Export fixtures, hard-deny/legal set equality, two-export identity, source nonmutation, root four, docs links, `git diff --check` |
| reviewOwner | G0a author가 아닌 독립 provenance/legal release reviewer |
| handoffArtifact | `g0a-public-snapshot-handoff.json`: source SHA, review SHA, exporter version, allow/deny roster digest, output tree digest와 unresolved roster 0 증거 |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only `--no-ff`; active lane writer 최대 3명; shared manifest/lock/contract delta는 C 소유 |
| external writes | 0. Output은 local/private generated snapshot뿐이다. |
