# 019 — R2b — Runtime legal·provenance closure를 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Runtime recipient에 포함되는 모든 third-party byte를 하나의 canonical component roster에서 exact license, NOTICE, SBOM, source/build provenance와 연결한다. `REDIST-01`–`REDIST-12`가 모두 green인 legal/provenance tree만 R2a manifest v2의 recipient payload가 될 수 있어, unknown·`human_review`·stale evidence가 Runtime archive로 흘러가지 않는다.

## Spec Traceability

- User stories: 4, 15, 17, 18
- Implementation contract: Interfaces and Invariants — Runtime release의 legal/provenance recipient payload
- Implementation decisions: Public source, license와 publication — third-party canonical roster와 fail-closed release boundary
- Testing decisions: Runtime candidate checkpoint, archive legal/SBOM/provenance set equality와 tracked non-mutation

## Slice-Specific Constraints

- 이 ticket은 법률 자문이 아니라 Parent Spec과 redistribution research가 채택한 conservative engineering gate를 구현한다. 불명확함을 허용으로 추정하지 않는다.
- Runtime archive surface의 actual recipient byte만 판정한다. Public source와 npm tarball의 separate legal closure를 대신하지 않는다.
- `THIRD_PARTY_NOTICES`, `licenses/`, SBOM와 provenance에 수작업 component 목록을 각각 만들지 않고 하나의 canonical roster에서 생성한다.
- OpenAI patched SDK, `codex`, `codex-code-mode-host`, `rg`, patched zsh, standalone Python/native libraries, pip/setuptools vendored code와 production wheels를 actual artifact path·digest에 연결한다.
- Apache modified-file notice, required NOTICE, exact original license text, source-availability 조건과 build workflow/attestation evidence를 component별로 보존한다.
- `unknown`, `human_review`, `blocked`, missing source/license/NOTICE/integrity 또는 stale provenance가 하나라도 actual payload component에 남으면 이 ticket은 완료할 수 없다. 해당 byte를 verified recipient에서 제외하거나 evidence와 independent review를 닫아야 한다.
- `REDIST-01-CLOSURE`부터 `REDIST-12-REPRODUCE`까지 하나라도 green이 아니면 R2c와 downstream release queue를 block한다.
- Final archive byte 생성·GitHub upload·publication은 이 ticket 범위가 아니다.
- R owner surface 밖의 package manifest/lock와 shared contract를 수정하지 않는다. Exact SDK/materializer generation은 한 process로 직렬 실행하고 fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer 규칙을 따른다.

## Acceptance Criteria

- [ ] Canonical roster가 모든 Runtime recipient byte를 stable component identity, scope, source revision, input/artifact digest와 builder/provenance evidence로 역추적한다.
- [ ] Every bundled/embedded component가 exact chosen license expression, original license files/digests, required NOTICE와 modification evidence를 가진다.
- [ ] OpenAI SDK의 실제 modified source file은 per-file change notice와 patch ledger에 연결되고 upstream `LICENSE`·`NOTICE`가 보존된다.
- [ ] Native `codex`, `codex-code-mode-host`, `rg`, zsh와 standalone Python closure가 target-specific SBOM과 license/notice set에 모두 연결된다.
- [ ] Python stripped artifact와 matching metadata/license tree의 equivalence, pip/setuptools vendored closure와 source-availability 조건이 evidence로 닫힌다.
- [ ] Component roster, Runtime SBOM, `THIRD_PARTY_NOTICES`, license tree, provenance와 R2a recipient paths의 exact set equality가 통과한다.
- [ ] `REDIST-01`–`REDIST-12` 각각이 input identity, command, result와 reviewer를 가진 green receipt로 남는다.
- [ ] `unknown`, `human_review`, `blocked`, missing license/source/integrity와 unaccounted artifact path가 0건이다.
- [ ] Legal material generation 전후 current Runtime source/manifest와 tracked repository byte가 예상 밖으로 변하지 않는다.

## Verification

- Targeted test or command: canonical component-roster generator/reconciler tests, `REDIST-01`–`REDIST-12` gate, Runtime legal/SBOM/provenance set-equality verifier
- Runtime checks: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`와 generate/verify before·after identity
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 필요한 license/source interpretation은 independent provenance reviewer가 exact component evidence로 판정한다. Unresolved human review를 green으로 기록하지 않는다.

## Blocked By

- [018-r2a-runtime-recipient-manifest.md](018-r2a-runtime-recipient-manifest.md) — R2a — Runtime recipient manifest v2를 고정한다

## Starting Points

- `docs/wayfinding/public-npx-first-release/assets/third-party-redistribution-evidence.md`
- `docs/wayfinding/public-npx-first-release/assets/publication-inventory-index.json`
- `packages/codex-chat-runtime/upstream/LICENSE`
- `packages/codex-chat-runtime/upstream/NOTICE`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `packages/codex-chat-runtime/scripts/exact_sdk.py`
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- R2a manifest-v2 recipient fixture와 complete-tree verifier

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `R2b` — R2 legal/provenance closure |
| owner | `R` — Runtime |
| branch | `codex/public-preview-r2b-legal-provenance` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/r2b-legal-provenance` |
| handoffSha | Claim 시 coordinator가 018의 fixed reviewed SHA를 integration branch에 merge하고 R2a 및 integration Runtime/root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/codex-chat-runtime/**` 중 `package.json`과 `src/account-contract.ts` 제외; Runtime source/scripts/manifests/legal material/tests/README; `docs/tickets/2026-07-23-public-npx-first-release/019-r2b-runtime-legal-provenance-closure.md` |
| consumedContracts | R2a manifest-v2 recipient roster; canonical third-party component roster fields; `REDIST-01`–`REDIST-12`; current exact SDK/materializer provenance |
| predecessorEvidence | 018 fixed reviewed SHA와 integration merge receipt, canonical manifest-v2 fixture/digest, Runtime verify before/after evidence, root four-gate receipt |
| requiredChecks | Component-roster generation/reconcile; all REDIST gates; SBOM/notice/license/provenance/path set equality; exact SDK and production Runtime validation; root four gates; docs links; `git diff --check` |
| reviewOwner | R author가 아닌 independent redistribution/provenance reviewer; unresolved `human_review`는 approval이 아니다 |
| handoffArtifact | Fixed reviewed R2b SHA, cleared canonical component roster, legal/SBOM/provenance tree digest와 `REDIST-01..12` green receipt consumed by R2c |
