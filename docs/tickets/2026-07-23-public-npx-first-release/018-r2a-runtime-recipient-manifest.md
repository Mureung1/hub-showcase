# 018 — R2a — Runtime recipient manifest v2를 고정한다

## Agent triage

- State: in-progress
- Surface: local-ticket
- Next actor: R2a canonical manifest assembler writer

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

S1이 고정한 단일 `CanonicalRuntimeManifest` authority에 Runtime-owned recipient·legal·provenance input을 주입하는 pure deterministic assembler를 만든다. Schema·decoder·admission·complete-tree 및 spawn-adjacent reverify는 `@ay-ple/runtime-release`가 계속 단독 소유하며, R2a는 두 번째 manifest contract나 filesystem verifier를 만들지 않는다.

## Spec Traceability

- User stories: 4, 16, 17
- Implementation contract: Interfaces and Invariants — Runtime release
- Implementation decisions: Donor, refactor와 replacement — current complete-tree verifier와 production materializer
- Testing decisions: Runtime delta의 exact SDK/bridge/actual/production manifest before·after verification

## Slice-Specific Constraints

- Manifest v2는 `manifest.json` 자신을 제외한 recipient payload 전체의 canonical path/type/mode/bytes/digest roster와 실행 `bundle/` subtree evidence를 분리한다.
- Runtime identity, selected Python/bridge/native relative path와 app–Runtime contract는 manifest가 소유한다. Outer archive size/SHA와 application→Runtime selection은 S1 `RuntimeReleaseDescriptor`가 소유하며 중복하지 않는다.
- Download, wheel, source checkout와 builder처럼 recipient에게 전달되지 않는 input은 executable payload가 아니라 `input_provenance`로 구분한다.
- Exact top-level recipient set은 `manifest.json`, `bundle/`, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `licenses/`, `sbom.spdx.json`, `provenance/`를 표현할 수 있어야 한다. 이 ticket은 actual legal evidence가 이미 complete하다고 주장하지 않는다.
- Current manifest v1과 production materialization을 public-ready로 재해석하지 않는다. R2b가 actual legal/provenance closure를 제공하기 전에는 v2 production candidate를 release input으로 승격하지 않는다.
- S1 canonical decoder·admission과 retained directory capability 기반 complete-tree/spawn-adjacent verifier가 유일한 authority다. R2a assembler는 filesystem을 scan하거나 verified capability를 발급하지 않는다.
- Generated manifest는 canonical bytes이고 extra/unknown/missing field와 path/type/mode/roster drift를 strict하게 거절한다.
- R lane은 `packages/codex-chat-runtime/package.json`, S1 `account-contract.ts`, root manifest/lock와 다른 owner surface를 수정하지 않는다. Fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer와 C-owned shared delta 규칙을 따른다.

## Corrected ownership

- Abandoned branch `codex/public-preview-r2a-recipient-manifest`의 commits `6d8c96752`, `925d9c338`는 incompatible `ay_ple_runtime_recipient` schema와 pathname verifier를 만들었던 **non-candidate dual-authority exploration**이다. Merge·cherry-pick·release input으로 사용하지 않는다.
- Corrected lane은 S1 `CanonicalRuntimeManifest` schema를 그대로 조립한다. Detailed builder/source/download input은 `input_provenance`가 가리키는 recipient payload 안의 provenance file이 소유한다.
- Assembler가 만든 object는 기존 decoder로 self-validate한 뒤 하나의 canonical byte representation으로만 반환한다. Exact extracted-tree와 launch path의 안전성은 기존 S1 verifier와 opaque spawn authority가 판정한다.

## Acceptance Criteria

- [ ] Manifest v2 decoder가 recipient payload, bundle subtree, Runtime identity·launch path, app–Runtime contract와 input provenance를 strict하게 분리한다.
- [ ] Canonical generator가 같은 recipient tree와 identity에서 byte-identical manifest를 만들고 path ordering·JSON serialization이 host locale/time에 의존하지 않는다.
- [ ] Verifier가 exact top-level set, manifest canonical bytes, payload count/regular bytes/symlink/type/mode/digest와 bundle subtree를 모두 검사한다.
- [ ] Missing/extra file, byte/mode drift, unsafe or dangling link, selected executable symlink/non-executable, path escape와 recipient-vs-bundle roster mismatch가 fail closed한다.
- [ ] Manifest self-hash를 만들지 않고 S1 descriptor가 manifest exact bytes·SHA를 pin할 수 있는 deterministic output을 제공한다.
- [ ] Build-only input은 recipient artifact path로 오인되지 않고 source/input/builder identity를 provenance field로 표현한다.
- [ ] Current exact Runtime verify/generate flow와 official SDK provenance가 additive v2 work 때문에 조용히 바뀌지 않는다.
- [ ] R2b가 actual component roster와 legal tree를 주입할 수 있는 owner-private generator/verifier seam과 fixture가 handoff된다.

## Verification

- Targeted test or command: Runtime manifest v2 decoder/generator/complete-tree unit tests, `npm run test:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. Synthetic recipient trees와 current production Runtime before/after non-mutation verification이 authority다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact handoff | `50e14a218a34f2e20c42251671a290412c035ad3` |
| Integration baseline | Coordinator가 W2와 root gates를 green으로 확인한 current integration HEAD에서 corrected lane을 열었다. |
| Single authority | `packages/runtime-release/src/canonical-runtime-manifest.ts`, release admission, retained-capability extracted-tree verification과 opaque `verifyForSpawn`을 read-only donor로 유지한다. |
| Authorized delta | `packages/runtime-release/src/canonical-runtime-manifest-assembler*`, 최소 adjacent tests/fixture, Runtime package README consequence, codex Runtime synthetic input fixture/README consequence와 Ticket 018만 변경한다. |
| Frozen surfaces | `packages/runtime-release/src/contract.ts`, 두 package의 `package.json`·`src/index.ts`, root manifest/lockfile, Official SDK source·patch stack은 수정하지 않는다. |

## Blocked By

- [006-r1c-node-account-lifecycle-runtime-roles.md](006-r1c-node-account-lifecycle-runtime-roles.md) — R1c — Node account lifecycle과 Runtime role을 완성한다

## Starting Points

- `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json`
- `packages/codex-chat-runtime/src/production-bundle.ts`
- `packages/codex-chat-runtime/src/production-bundle.unit.test.ts`
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- `packages/codex-chat-runtime/scripts/test_production_bundle.py`
- `packages/codex-chat-runtime/README.md`
- `docs/wayfinding/public-npx-first-release/assets/runtime-release-delivery-research.md`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `R2a` — R2 recipient identity |
| owner | `R` — Runtime |
| branch | `codex/public-preview-r2a-canonical-manifest` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/r2a-canonical-manifest` |
| handoffSha | `50e14a218a34f2e20c42251671a290412c035ad3` |
| writablePaths | `packages/runtime-release/src/canonical-runtime-manifest-assembler*`; 최소 adjacent tests/fixture; `packages/runtime-release/README.md`; 필요 시 `packages/codex-chat-runtime/manifests/fixtures/**`와 `packages/codex-chat-runtime/README.md`; Ticket 018. Existing canonical decoder/authority/extraction/resolver는 cross-contract proof에 필요한 colocated test 외 read-only donor다. |
| consumedContracts | S1 `RuntimeReleaseDescriptor` manifest-v2 binding; current production Runtime manifest/verifier/materializer invariants; R1-complete Runtime identity and process graph |
| predecessorEvidence | 006 fixed reviewed SHA와 integration merge receipt, exact SDK/bridge/production Runtime green evidence, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Manifest v2 canonical/strict decoder and complete-tree matrix; production Runtime before/after verify; exact SDK provenance non-regression; Runtime workspace test/typecheck/build; root four gates; docs links; `git diff --check` |
| reviewOwner | R author가 아닌 independent Runtime manifest/provenance reviewer |
| handoffArtifact | Fixed reviewed R2a SHA, manifest-v2 schema/generator/verifier path와 canonical synthetic fixture digest consumed by R2b |
