# 020 — R2c — deterministic Runtime archive candidate를 만든다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

R2a manifest v2와 R2b legal/provenance closure를 executable Runtime tree와 결합해 deterministic `.tar.gz` candidate 하나로 생성·검증한다. 두 clean build가 같은 archive name·size·SHA-256과 inner manifest bytes를 만들며, retained candidate는 downstream G0/G1이 exact application→Runtime binding에 사용할 수 있는 immutable local input이 된다.

## Spec Traceability

- User stories: 4, 17, 18
- Implementation contract: Interfaces and Invariants — Runtime release descriptor·archive identity
- Implementation decisions: Public source, license와 publication — Runtime candidate and canonical roster binding
- Testing decisions: Runtime candidate checkpoint, two-build identity, archive traversal/legal roster와 post-run non-mutation

## Slice-Specific Constraints

- Recipient archive format은 deterministic gzip tar 하나이며 exact root는 R2a manifest, `bundle/`, R2b `NOTICE`, `THIRD_PARTY_NOTICES.md`, `licenses/`, `sbom.spdx.json`, `provenance/`다.
- Member ordering, timestamp, owner/group, reviewed file mode와 gzip header를 normalize한다. System-generated GitHub source archive나 ambient filesystem metadata를 candidate로 사용하지 않는다.
- Source/build downloads, wheels, vendored checkout와 materializer cache는 provenance input이지 recipient archive member가 아니다.
- Archive generator는 R2b의 cleared canonical roster와 `REDIST-01..12` green receipt 없이는 실행 또는 acceptance되지 않는다.
- Archive complete verification은 outer bytes/SHA-256, safe member policy, package canonical manifest byte equality, recipient/bundle complete tree, legal/SBOM/provenance set equality와 selected executable를 모두 확인한다.
- Generated candidate와 ignored materialization은 tracked authority가 아니다. Coordinator가 fixed reviewed SHA, exact command, retained owner-only path와 digest를 함께 기록해야 downstream이 소비할 수 있다.
- GitHub Release upload, immutable release activation, npm publish와 public ledger write는 하지 않는다. 이 slice의 external write는 0이다.
- Exact SDK generation과 production materialization은 같은 Runtime worktree에서 한 process로 직렬 실행한다. R owner 밖의 manifest/lock/shared contract를 수정하지 않고 sibling merge·cherry-pick, 가짜 SHA와 최대 writer 제한을 지킨다.

## Acceptance Criteria

- [ ] Clean exact inputs에서 archive를 두 번 생성했을 때 filename, byte length, SHA-256, gzip/tar bytes와 inner manifest bytes가 동일하다.
- [ ] Archive root가 positive recipient set과 정확히 일치하고 build-only download/wheel/source/materializer residue가 0건이다.
- [ ] R2a manifest v2가 recipient payload와 bundle subtree를 fresh 검증하고 R2b component roster, SBOM, notices, licenses와 provenance set equality를 만족한다.
- [ ] Unsafe path/link/type/mode, duplicate·case-fold·prefix collision, missing/extra member, decompression bound와 selected executable drift가 archive acceptance를 fail closed한다.
- [ ] Current Runtime identity, native/Python/patch stack, app–Runtime contract와 manifest digest가 candidate receipt에 exact하게 bind된다.
- [ ] Generate·verify 전후 tracked source와 canonical inputs의 identity가 같고 orphan materializer/generator process가 0개다.
- [ ] Retained archive path는 owner-only이고 exact input SHA, command, archive digest, manifest digest와 legal receipt를 함께 기록한다.
- [ ] Archive candidate 생성은 external repository/release/npm surface를 수정하지 않는다.

## Verification

- Targeted test or command: deterministic archive generator tests, malicious archive/member fixture matrix, two-clean-build byte-identity check
- Runtime checks: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`, archive 생성 전후 canonical manifest/Runtime verify
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Fixed reviewed SHA에서 coordinator가 retained candidate의 exact path·size·SHA-256·manifest digest를 read back한다. Upload/publish는 하지 않는다.

## Blocked By

- [019-r2b-runtime-legal-provenance-closure.md](019-r2b-runtime-legal-provenance-closure.md) — R2b — Runtime legal·provenance closure를 닫는다

## Starting Points

- R2a manifest-v2 generator/verifier
- R2b canonical component roster와 legal/SBOM/provenance tree
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- `packages/codex-chat-runtime/scripts/test_production_bundle.py`
- `packages/codex-chat-runtime/src/production-bundle.ts`
- S0가 pin한 safe TAR dependency는 consumer verifier의 hostile fixture oracle로만 참조
- `docs/wayfinding/public-npx-first-release/assets/runtime-release-delivery-research.md`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `R2c` — `R2` completion |
| owner | `R` — Runtime |
| branch | `codex/public-preview-r2c-runtime-archive` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/r2c-runtime-archive` |
| handoffSha | Claim 시 coordinator가 019의 fixed reviewed SHA를 integration branch에 merge하고 R2b, all-REDIST와 integration Runtime/root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/codex-chat-runtime/**` 중 `package.json`과 `src/account-contract.ts` 제외; Runtime source/scripts/manifests/archive generator/tests/README; `docs/tickets/2026-07-23-public-npx-first-release/020-r2c-deterministic-runtime-archive.md` |
| consumedContracts | R2a recipient manifest v2; R2b cleared legal/SBOM/provenance roster; S1 application→Runtime descriptor identity; current exact Runtime materialization |
| predecessorEvidence | 019 fixed reviewed SHA와 integration merge receipt, cleared component roster and `REDIST-01..12` green receipt, exact SDK/production Runtime verify, root four-gate receipt |
| requiredChecks | Two-build archive identity; hostile member/complete-tree/legal roster matrix; exact SDK and production Runtime validation before/after; tracked non-mutation/process cleanup; root four gates; docs links; `git diff --check` |
| reviewOwner | R author가 아닌 independent Runtime archive/provenance reviewer |
| handoffArtifact | Fixed reviewed R2 completion SHA, retained deterministic Runtime archive path/name/bytes/SHA-256, canonical manifest digest와 legal/provenance receipt consumed by G0 |
