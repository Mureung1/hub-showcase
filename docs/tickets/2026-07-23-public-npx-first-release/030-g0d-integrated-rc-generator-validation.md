# 030 — G0d — Integrated RC generator를 검증한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

G0a–G0c를 fixed clean source SHA에서 한 번의 documented local command로 실행·검증할 수 있는 integrated G0 generator/validator로 묶는다. Fixture matrix, two-export/two-pack identity, tracked-source nonmutation과 release-intent/ledger compatibility를 닫아 coordinator가 G1에서 실제 retained RC를 만들 수 있는 reviewed command contract를 제공한다.

## Spec Traceability

- User stories: 15–18
- Implementation contract: Release generator/publication runner
- Implementation decisions: `Parallel delivery contract`의 `G0 → G1`, fixed-SHA review와 coordinator-only RC acceptance
- Implementation decisions: `Public source, license와 publication`의 clean source, candidate binding과 resumable publication inputs
- Testing decisions: five evidence classes의 common candidateDigest, export/pack/publication scripted tests와 clean-worktree integration gates

## Slice-Specific Constraints

- Fixed clean commit tree와 explicit output root 외 ambient worktree/user state를 입력으로 읽지 않는 single documented G0 entrypoint를 제공한다.
- G0a snapshot, G0b assembly와 G0c intent/ledger initialization을 순서대로 호출하되 각 submodule의 authority와 receipt를 합쳐서 덮어쓰지 않는다.
- Two-export와 two-pack identity, legal/provenance set equality, source/staging/tarball equality, tracked-source nonmutation과 publication scripted suite를 integrated validation의 blocking gate로 둔다.
- Output은 G1이 실행할 reviewed command/contract와 local fixture results다. 이 티켓에서 “official RC accepted” receipt나 public candidate success를 만들지 않는다.
- External GitHub/npm/Pages writes와 OAuth/provider calls는 0이다.
- 029 fixed reviewed SHA가 integration에 merge된 coordinator-recorded `handoffSha`에서 시작한다. Sibling merge/cherry-pick은 금지하고 only coordinator가 reviewed fixed SHA를 merge한다.
- Root/workspace manifest·lockfile·shared contract 변경은 C-owned serial delta로 분리한다. 전체 active lane writer 최대 3명, 이 worktree writer 1명이다.
- Final G0 review는 exact candidate SHA에 고정하며 correction commit이 생기면 전체 integrated validation과 review를 다시 수행한다.

## Acceptance Criteria

- [ ] One documented command가 exact source full SHA와 clean output root를 받아 G0a→G0b→G0c를 실행하고 machine-readable result를 반환한다.
- [ ] Missing/mismatched predecessor descriptor, dirty/nonexistent source SHA, output collision과 unresolved legal entry를 filesystem/external write 전에 fail closed한다.
- [ ] Integrated fixture suite에서 two-export tree digest와 two-pack tarball digest/integrity가 각각 동일하다.
- [ ] Source→staging→tarball resource, legal/SBOM/provenance roster와 Runtime/application/workspace bundle binding이 exact match한다.
- [ ] 실행 전후 tracked source, root/workspace manifests와 lockfiles가 동일하다.
- [ ] Result가 source SHA, app exact version, npm integrity/tarball SHA-256, Runtime identity/digests, workspace bundle digest와 release-intent digest를 기록한다.
- [ ] G0c scripted ambiguity/authorization/GAT retirement suite와 zero-external-write oracle가 integrated gate에 포함된다.
- [ ] G1이 같은 reviewed command를 detached clean worktree에서 별도 source 수정 없이 실행할 수 있다.
- [ ] G0 완료는 local generator validation으로만 표현되고 RC accepted/publication success를 주장하지 않는다.

## Verification

- Targeted: G0a/G0b/G0c full fixture suites
- Integrated: fixed fixture SHA에서 documented command를 독립 output root 두 곳에 실행해 export/tree/tarball/result digest를 비교한다.
- Nonmutation: clean detached input tree의 before/after status와 commit-tree identity를 확인한다.
- External-write guard: network/provider adapters가 모두 deny/fake이고 write count 0인지 확인한다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`

## Blocked By

- [029-g0c-publication-ledger-reconciliation.md](029-g0c-publication-ledger-reconciliation.md) — G0c — Publication ledger reconciliation을 구현한다

## Starting Points

- 027 clean exporter와 snapshot manifest
- 028 deterministic assembler, sidecars와 release display artifact
- 029 publication codecs, transition engine와 scripted adapters
- `docs/wayfinding/public-npx-first-release/assets/publication-inventory-index.json`
- Target owner paths `scripts/public-release/**`, `distribution/public-root/**`, ignored `distribution/staging/**`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `G0d` / owner `G`; 이 ticket의 merge가 G0 completion이다. |
| owner | Release integration lane writer 1명 |
| branch/worktree | `codex/public-preview-g0d-rc-validation` / `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/g0d-rc-validation` |
| handoffSha | 029 fixed review SHA가 integration에 merge되고 gates가 green인 뒤 coordinator가 기록한 immutable full SHA. Ticket author는 값을 선기입하지 않는다. |
| writablePaths | `scripts/public-release/**`; `distribution/public-root/**`; ignored `distribution/staging/**`; `docs/tickets/2026-07-23-public-npx-first-release/030-g0d-integrated-rc-generator-validation.md` |
| consumedContracts | G0a snapshot/legal manifest; G0b assembler/candidate sidecars; G0c publication artifacts/state machine; C-owned latest contract tip |
| predecessorEvidence | 027–029 merge receipts와 fixed reviews, deterministic export/pack digests, zero-write scripted ledger evidence |
| requiredChecks | All G0 fixture/integrated tests, two-export/two-pack identity, tracked-source nonmutation, zero-external-write oracle, root four, docs links, `git diff --check` |
| reviewOwner | G0d author가 아닌 독립 provenance + release integration reviewer |
| handoffArtifact | `g0d-integrated-generator-handoff.json`: input/review SHA, exact command/tool versions, fixture digests, two-run equality와 G1 invocation contract |
| delivery topology | Sibling merge/cherry-pick 금지; coordinator-only `--no-ff`; active lane writer 최대 3명; shared delta는 C가 직렬 소유 |
| external writes | 0. Reviewed generator/validator만 만든다. |
