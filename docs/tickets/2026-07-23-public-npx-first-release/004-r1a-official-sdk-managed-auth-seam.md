# 004 — R1a — Official SDK managed auth seam을 연다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Pinned Official Codex Python SDK graph에서 AY-PLE이 official managed ChatGPT Browser login을 typed API로 시작하고 matching completion을 기다릴 수 있는 최소 upstream-followable seam을 연다. Hosted success page option과 AY-PLE client identity가 exact SDK generation·provenance 아래 고정되어 이후 bridge가 raw JSON-RPC shape를 재구현하지 않아도 된다.

## Spec Traceability

- User stories: 5, 6, 16
- Implementation contract: Codex account와 Runtime transition; Compatibility and Migration; Parallel delivery contract — `R1`
- Testing decisions: Runtime account patch의 generated/official SDK provenance와 bounded notification routing

## Slice-Specific Constraints

- Official managed browser login만 추가한다. Device code, direct OAuth HTTP, API key, host-supplied token과 `auth.json` parsing을 제품 fallback으로 만들지 않는다.
- Login start는 typed option `useHostedLoginSuccessPage: true`, `appBrand: "codex"`를 exact하게 전달한다.
- App Server `initialize.clientInfo`는 caller가 준 AY-PLE application name/title과 exact release version을 사용하며 generic SDK client identity를 hard-code하지 않는다.
- `account/login/completed`는 current notification opt-out patch와 충돌하지 않게 login-scoped queue에 보존된다. Raw global notification queue를 무한히 소비하거나 unbounded backlog를 만들지 않는다.
- 변경은 pinned SDK source에 직접 떠다니는 patch가 아니라 ordered upstream patch, regeneration/provenance record와 focused official tests로 소유한다.
- 이 ticket은 Python bridge command, Node Runtime public API, Server route나 Browser projection을 구현하지 않는다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile·S1 contract 변경은 금지하며 필요하면 C의 reviewed serial `contractTipSha`를 요청한다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [x] Sync/async managed ChatGPT login entrypoint가 hosted-success와 `codex` brand option을 typed request에 전달한다.
- [x] AY-PLE application identity와 exact version이 initialize `clientInfo`로 전달되고 default SDK identity로 위장하지 않는다.
- [x] Matching login completion이 opt-out configuration 아래에서도 exact attempt queue에 도달하며 unrelated notification을 소비하지 않는다.
- [x] Start failure, unexpected response, completion, cancel과 close가 typed·bounded behavior로 SDK test에 고정된다.
- [x] Ordered patch roster, generated source와 source hash/provenance가 drift 없이 재생성·검증된다.
- [x] Device-code와 current Turn/Plan routing regression이 유지되고 production bridge/runtime behavior는 아직 바뀌지 않는다.

## Verification

| Gate | Result |
| --- | --- |
| Regeneration | `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime`; `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime -- --write-manifest` green |
| Exact SDK | `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` — deterministic two-run nine-patch verify, response-last·Plan·bounded-router actual-child, official suite 166 passed/38 skipped, Ruff와 provenance 17/17 green |
| Production Runtime | `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime` — synthetic verifier 23/23, authoritative bridge 20/20, pre/post non-mutation verify와 Ruff green |
| Node Runtime | `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime` — actual-child 68 tests, exact local-provider 1/1, pre/post non-mutation verify green |
| Repository | `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell` green |
| Docs와 diff | `npm run check:docs-links` active 28·historical 2, fixed-range `git diff --check` green |
| Independent review | Fixed reviewed combined tip `be3b0bcc2ff4c550ef0dbb035f1ca23b70f49297`에서 Standards `GREEN` 0 findings, Spec `GREEN` 0 findings |
| Manual or live smoke | 없음. Fake App Server request/notification trace가 이 slice의 authority다. |

## Result

| Evidence | Result |
| --- | --- |
| Reviewed R tip | `18287ebb5e8ff7325887018a99bd9e963364c2d2` |
| C serialization implementation | `cc5c10d60e86c4d8f53b1182ebe0a7cecd21477f` |
| Reviewed combined tip | `be3b0bcc2ff4c550ef0dbb035f1ca23b70f49297` |
| Ordered patch | `0009-managed-chatgpt-login`, 13,298 bytes, SHA-256 `0b7e567644ec25d0ab57f9639319fcecce591af8e4f4e57596c11be8174402fa`; complete stack SHA-256 `2cb3dcc9bdf7f81136b21ac16cb1afe161e5676e3800e85265653c2795fbbcbd` |
| Canonical manifests | `patched-source.json` SHA-256 `9ef9d9111fbe4383104ec34069911dde0e9f7ef7a8a06fa5a16851a584388d5c`; `production-runtime-darwin-arm64.json` SHA-256 `8ccb628dac6df49cb8efc237e3f424b2baa64b76b9f6c516a59a55684d5a555c` |
| Production artifact | Patched wheel SHA-256 `a4590fe5dff6a58e9042b37aad682bf8f50f413a111cc6b42ed64a30019a7a94`; installed roster `f13407bacae6cd41dc36a2101139fdbbfcbeab094570730a9669f6c334e5f4e3`; bundle roster `6d59fdf23ab5da1402407549268ae93f0607d6b559237f9c6f859187b960a176` |
| Review | Independent Standards와 Spec review 모두 `GREEN`, 각각 0 findings |

Official typed managed ChatGPT login seam과 matching completion reservation을 ordered patch로 고정하고, C-owned five-file serialization delta가 exact source·production bundle authority를 같은 nine-patch identity로 닫았다. SDK patch/source/tooling, bridge·Node behavior와 lockfile의 unchanged complement를 유지했다. Parent Spec은 후속 implementation ticket이 남아 있으므로 incomplete 상태를 그대로 유지한다.

## Blocked By

- [003-spine-s2-server-composition-stabilization.md](003-spine-s2-server-composition-stabilization.md) — Spine S2 — Server composition을 분리하고 Browser fail-closed oracle을 닫는다

## Starting Points

- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_login.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/api.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/client.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/async_client.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_message_router.py`
- `packages/codex-chat-runtime/upstream/patches/0004-notification-opt-out-config.patch`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `packages/codex-chat-runtime/scripts/exact_sdk.py`
- `packages/codex-chat-runtime/scripts/test_exact_sdk.py`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `R1a` |
| owner | `R` — Runtime |
| branch | `codex/public-preview-r1a-sdk-auth` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/r1a-sdk-auth` |
| handoffSha | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` — 003 fixed reviewed `spineTipSha`와 closeout이 반영된 clean integration HEAD. Coordinator가 predecessor 및 integration root gates를 green으로 확인한 뒤 이 lane을 준비했다. |
| writablePaths | `packages/codex-chat-runtime/python/openai-codex/**`; `packages/codex-chat-runtime/upstream/patches/**`; `packages/codex-chat-runtime/upstream/PATCHES.md`; `packages/codex-chat-runtime/scripts/exact_sdk.py`; `packages/codex-chat-runtime/scripts/test_exact_sdk.py`; exact SDK focused tests; `docs/tickets/2026-07-23-public-npx-first-release/004-r1a-official-sdk-managed-auth-seam.md` |
| consumedContracts | S1 private `CodexAccountLifecycle` intent, official generated account/login types, pinned SDK/native identity와 exact AY-PLE clientInfo input |
| predecessorEvidence | Fixed reviewed `spineTipSha` `c2e95616d8ac2461844525c69a7e0d714da3e710`, completed 003 closeout `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7`, green root gates와 immutable current-workbench Browser oracle |
| requiredChecks | `validate:exact-sdk`; exact router/provenance tests; relevant production Runtime before/after verification; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | R이 아닌 independent Official SDK/provenance reviewer |
| handoffArtifact | Reviewed fixed R1a commit SHA, ordered auth patch, regenerated-source provenance와 matching-completion test receipt |

## Candidate Receipt

아래 candidate evidence는 fixed combined tip에서 independent Standards·Spec review가 모두 0 findings `GREEN`으로 끝났고 위 Result로 close됐다.

| 항목 | Candidate evidence |
| --- | --- |
| Fixed review point | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` |
| Claim commit | `10f1cc234936d00d54be23163496a2a8cf1503d6` |
| R-owned implementation commits | Initial `8f146dea94de124f59c20a7ef14551d87792c150`; explicit managed-login reservation review correction `0867e768f0dcc2aecdc64a3d8bd47ef634ffd5d4` |
| Ordered patch | `0009-managed-chatgpt-login`, 13,298 bytes, SHA-256 `0b7e567644ec25d0ab57f9639319fcecce591af8e4f4e57596c11be8174402fa` |
| Exact temporary reconstruction | Nine-patch deterministic verify green; official suite 166 passed, 38 skipped; Ruff check/format green; response-last·Plan·bounded-router actual-child green; provenance 17 tests green |
| Review correction oracle | Ordinary client는 configured completion opt-out을 그대로 보내고 managed client만 `reserve_chatgpt_login_completion=True`로 completion을 보존한다. Managed actual-child는 unrelated attempt 뒤 matching completion을 받고 별도 pending attempt를 overflow에서 정산했다. Regenerated production bundle의 authoritative bridge 20 tests가 green이며 unchanged complement 61개를 확인했다. |
| Repository gates | `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs link check와 `git diff --check` green |
| Pre-C serialized block | C-owned provenance delta 전의 tracked `verify:exact-sdk`는 `tracked patched-source manifest is stale`, `verify:production-runtime`은 `behavioral patch roster shape or length drift`로 fail closed했다. 아래 reviewed delta가 이 block을 닫았다. |

### C-only provenance delta

R1a writer는 shared manifest, package README, verifier와 lockfile을 수정하지 않았다. C serialization lane은 reviewed R1a tip `18287ebb5e8ff7325887018a99bd9e963364c2d2`에서 다음 다섯 tracked file만 serial하게 갱신했다.

| Shared file | Reviewed delta |
| --- | --- |
| `packages/codex-chat-runtime/manifests/patched-source.json` | Patch count 8 → 9, source file roster 88개 유지, manifest bytes 31,979 → 34,032, manifest SHA-256 `db9f0644155f9ab8f396b5263e3539a778e5ca7a49e3b8e49b14be7c32a71f98` → `9ef9d9111fbe4383104ec34069911dde0e9f7ef7a8a06fa5a16851a584388d5c`, patch stack `ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9` → `2cb3dcc9bdf7f81136b21ac16cb1afe161e5676e3800e85265653c2795fbbcbd`, source tree `c0f19b682d4cf182448ebd1e47eaecb9fac3c478c3c7899fd2e10b913b30aa06` → `b3eb6e17d3a67066d1be01997ec9ce522bebba4fbd0119f8762fd32da854f999` |
| `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json` | Manifest bytes 11,239 → 11,528, SHA-256 `a12fa91bc247b377273f242526bb8eb8d843c2ec9a1d613b70434a479b6804b7` → `8ccb628dac6df49cb8efc237e3f424b2baa64b76b9f6c516a59a55684d5a555c`; patched SDK wheel 84,251 bytes / `9259319c79132ffa16e1ba46d3e20a88be3b5851501f8ab7812bfb42ce6427aa` → 84,598 bytes / `a4590fe5dff6a58e9042b37aad682bf8f50f413a111cc6b42ed64a30019a7a94`; installed site-packages roster `bbd4ef8a261b1f4e34e01b1a312fed0262d4d4f55f3a9cd7338e420aad50b9d8` → `f13407bacae6cd41dc36a2101139fdbbfcbeab094570730a9669f6c334e5f4e3`; bundle roster `4b72a60735d6b6d1489bab9fa937889f296ba2268c3fc0c433ba84ca10b36b7a` → `6d59fdf23ab5da1402407549268ae93f0607d6b559237f9c6f859187b960a176` |
| `packages/codex-chat-runtime/README.md` | Complete ordered stack을 `0001 → … → 0009`로 설명하고 managed ChatGPT login seam, 새 patch-stack·wheel·bundle digest를 위 canonical manifest와 일치시킨다. |
| `packages/codex-chat-runtime/src/production-bundle.ts` | Hard-coded production authority를 새 patch-stack digest와 ordered stage `0001`–`0009`에 맞춘다. |
| `packages/codex-chat-runtime/src/production-bundle.unit.test.ts` | Synthetic canonical manifest fixture와 fail-closed order/digest regression을 같은 nine-stage authority에 맞춘다. |

Reviewed regeneration과 verification 순서는 다음과 같다.

1. `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime`
2. `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
3. `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime -- --write-manifest`
4. `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`
5. `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`

| 항목 | C reviewed evidence |
| --- | --- |
| Fixed serialized base | `18287ebb5e8ff7325887018a99bd9e963364c2d2` |
| Five-file implementation | `cc5c10d60e86c4d8f53b1182ebe0a7cecd21477f` |
| Patched-source identity | 34,032 bytes, SHA-256 `9ef9d9111fbe4383104ec34069911dde0e9f7ef7a8a06fa5a16851a584388d5c`; patch stack `2cb3dcc9bdf7f81136b21ac16cb1afe161e5676e3800e85265653c2795fbbcbd`; source tree `b3eb6e17d3a67066d1be01997ec9ce522bebba4fbd0119f8762fd32da854f999`; 88-file roster |
| Production identity | 11,528-byte manifest SHA-256 `8ccb628dac6df49cb8efc237e3f424b2baa64b76b9f6c516a59a55684d5a555c`; patched wheel 84,598 bytes / `a4590fe5dff6a58e9042b37aad682bf8f50f413a111cc6b42ed64a30019a7a94`; installed roster `f13407bacae6cd41dc36a2101139fdbbfcbeab094570730a9669f6c334e5f4e3`; bundle roster `6d59fdf23ab5da1402407549268ae93f0607d6b559237f9c6f859187b960a176` |
| Exact SDK gate | Nine-patch deterministic verify green; response-last·Plan·bounded-router actual-child green; official suite 166 passed, 38 skipped; Ruff green; provenance 17/17 |
| Production Runtime gate | Synthetic production verifier 23/23, authoritative bridge 20/20, pre/post non-mutation verify와 Ruff green |
| Node Runtime gate | Actual-child 68 tests, exact local-provider 1/1, pre/post non-mutation verify green |
| Repository gate | `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs link check와 fixed-range `git diff --check` green |
| Unchanged complement | `manifests/unpatched.json`, immutable unpatched SDK snapshot, SDK patch/source/tooling, bridge·Node behavior와 lockfile은 바뀌지 않았다. Ignored local production artifact만 새 canonical manifest와 함께 rematerialize했다. |
| Review state | Fixed combined tip `be3b0bcc2ff4c550ef0dbb035f1ca23b70f49297`에서 Standards·Spec review 모두 0 findings `GREEN`이다. |

이 serial delta는 exact SDK와 production verifier가 `BEHAVIORAL_PATCHES`의 complete roster를 canonical manifest·wheel·installed tree와 byte-for-byte 대조하도록 유지한다.
