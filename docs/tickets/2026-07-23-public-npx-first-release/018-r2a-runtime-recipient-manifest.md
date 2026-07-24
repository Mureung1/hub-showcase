# 018 — R2a — Runtime recipient manifest v2를 고정한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: R2b Runtime recipient/legal/provenance writer via coordinator

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

- [x] Manifest v2 decoder가 recipient payload, bundle subtree, Runtime identity·launch path, app–Runtime contract와 input provenance를 strict하게 분리한다.
- [x] Canonical generator가 같은 recipient tree와 identity에서 byte-identical manifest를 만들고 path ordering·JSON serialization이 host locale/time에 의존하지 않는다.
- [x] Verifier가 exact top-level set, manifest canonical bytes, payload count/regular bytes/symlink/type/mode/digest와 bundle subtree를 모두 검사한다.
- [x] Missing/extra file, byte/mode drift, unsafe or dangling link, selected executable symlink/non-executable, path escape와 recipient-vs-bundle roster mismatch가 fail closed한다.
- [x] Manifest self-hash를 만들지 않고 S1 descriptor가 manifest exact bytes·SHA를 pin할 수 있는 deterministic output을 제공한다.
- [x] Build-only input은 recipient artifact path로 오인되지 않고 source/input/builder identity를 provenance field로 표현한다.
- [x] Current exact Runtime verify/generate flow와 official SDK provenance가 additive v2 work 때문에 조용히 바뀌지 않는다.
- [x] R2b가 actual component roster와 legal tree를 주입할 수 있는 owner-private assembler와 inherited verifier seam·fixture가 handoff된다.

## Acceptance ownership

| Acceptance | Owner와 R2a proof |
| --- | --- |
| Strict schema·path graph·selected launch·provenance decode | Existing S1 `canonical-runtime-manifest.ts`; assembler unit가 same decoder로 self-validation과 negative matrix를 실행한다. |
| Complete recipient·bundle·manifest/legal/mode/symlink verification | Existing S1 release admission·retained directory capability·archive extraction/generation verifier; assembler-produced resolver fixture가 full suite를 통과한다. |
| Root/ancestor/file replacement와 point-in-time spawn authority | Existing S1 final pathname rebind와 exact-object `verifyForSpawn`; R2a는 alternate path capability를 발급하지 않는다. |
| Ordering, evidence math, canonical bytes·digest | New R2a pure assembler; reverse-order input equality와 3,093-byte synthetic fixture SHA-256 `d2d09adeb6adc7d456b4418f30e68d285c87d7092abb864e27338541dd655421`가 oracle이다. |
| Actual component/legal/provenance closure | R2b 후속 책임이며 이 ticket은 synthetic input만 고정한다. |

## Verification

- Targeted test or command: assembler unit와 existing decoder cross-contract, `npm test -w @ay-ple/runtime-release`의 admission·retained-capability extraction·generation·resolver/spawn matrix, Runtime release typecheck/build.
- Non-mutation evidence: `npm run test:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`, `npm run test:provenance -w @ay-ple/codex-chat-runtime`, `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime`. Current v1/SDK flow는 public schema authority가 아니다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 없음. Synthetic descriptor fixture와 existing S1 secure filesystem verifier가 authority다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact handoff | `50e14a218a34f2e20c42251671a290412c035ad3` |
| Integration baseline | Coordinator가 W2와 root gates를 green으로 확인한 current integration HEAD에서 corrected lane을 열었다. |
| Single authority | `packages/runtime-release/src/canonical-runtime-manifest.ts`, release admission, retained-capability extracted-tree verification과 opaque `verifyForSpawn`을 read-only donor로 유지한다. |
| Authorized delta | `packages/runtime-release/src/canonical-runtime-manifest-assembler*`, 최소 adjacent tests/fixture, Runtime package README consequence, codex Runtime synthetic input fixture/README consequence와 Ticket 018만 변경한다. |
| Frozen surfaces | `packages/runtime-release/src/contract.ts`, 두 package의 `package.json`·`src/index.ts`, root manifest/lockfile, Official SDK source·patch stack은 수정하지 않는다. |

## Closeout Receipt

| Evidence | Result |
| --- | --- |
| Corrected candidate | `0150a8d3a34b0225cff35e0ee1958c946b009cd1` |
| Independent review | Exact candidate review **PASS**, P0–P2 finding 0건. Production/test correction 없이 docs-only closeout을 승인했다. |
| Assembler focused | `npm exec -w @ay-ple/runtime-release -- tsx --test src/canonical-runtime-manifest-assembler.test.ts` — 8/8 pass. |
| S1 cross-contract | `npm test -w @ay-ple/runtime-release` — 359/359 pass. Assembler bytes가 admission·retained-capability extraction·generation·resolver와 exact-object spawn reverify를 통과했다. |
| Runtime release compile | `npm run typecheck -w @ay-ple/runtime-release`, `npm run build -w @ay-ple/runtime-release` — green. |
| Current production non-mutation | `npm run test:production-runtime -w @ay-ple/codex-chat-runtime` — 23/23; `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` — exact SDK verify 전·후 모두 green. Tracked/local manifest `896729ef139bb0c994ff10deefe08402a4bdc7938558dce306ac70841a751bb1`, bundle roster `ff65a20ea5d44e9b532babc4875a2dc32675c25ee8173ddd7382f7f841b0eca6`. |
| Official SDK non-mutation | `npm run test:provenance -w @ay-ple/codex-chat-runtime` — 17/17; `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime` — 2 deterministic runs, 9 patches, source `8c68d4c87dc54d38861f5114e920c3de2efa5876`, wheel SHA-256 `34c3be1faf5f2e9feb9bfb936d1e619cd63535d97850d9ab1deadd3836e9945b`. Patched source `9ef9d9111fbe4383104ec34069911dde0e9f7ef7a8a06fa5a16851a584388d5c`, unpatched `ad3deefc4d2ea29dc289e226059d84155d1d8e2e43d4399da610a569737fec17`. |
| Root gates | `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check` — 모두 green. Docs links active 28, historical banners 2. |
| Canonical fixture | 3,093 bytes, SHA-256 `d2d09adeb6adc7d456b4418f30e68d285c87d7092abb864e27338541dd655421`. |
| Local gate setup | Root `node_modules`는 같은 lockfile의 integration dependency tree에 임시 symlink한 뒤 제거했다. Exact production artifact는 matching ignored materialization을 local CoW clone했고 submodule은 exact `8c68d4c87dc54d38861f5114e920c3de2efa5876`로 initialize했다. 모두 untracked/ignored이며 candidate source에는 포함되지 않는다. |
| Scope guard | Frozen contract·package/root manifest·lockfile, Official SDK source·patch stack과 current production manifests diff 0. Candidate 종료 시 tracked/untracked status clean. |

## Blocked By

- [006-r1c-node-account-lifecycle-runtime-roles.md](006-r1c-node-account-lifecycle-runtime-roles.md) — R1c — Node account lifecycle과 Runtime role을 완성한다

## Starting Points

- `packages/runtime-release/src/canonical-runtime-manifest.ts`
- `packages/runtime-release/src/runtime-release-authority.ts`
- `packages/runtime-release/src/runtime-archive-extraction.ts`
- `packages/runtime-release/src/runtime-generation.ts`
- `packages/runtime-release/src/runtime-resolver.ts`
- `packages/runtime-release/src/runtime-resolver-fixture.test.ts`
- `packages/runtime-release/README.md`
- `packages/codex-chat-runtime/README.md`의 current v1 non-mutation 경계
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
| reviewedCandidateSha | `0150a8d3a34b0225cff35e0ee1958c946b009cd1` |
| requiredChecks | Assembler canonical/strict decoder cross-contract; existing S1 complete-tree/spawn matrix; production Runtime before/after verify; exact SDK provenance non-regression; Runtime release test/typecheck/build; root four gates; docs links; `git diff --check` |
| reviewOwner | R author가 아닌 independent Runtime manifest/provenance reviewer |
| handoffArtifact | Fixed reviewed R2a SHA, owner-private assembler path, existing S1 decoder/verifier owner와 canonical synthetic fixture bytes/digest consumed by R2b |
