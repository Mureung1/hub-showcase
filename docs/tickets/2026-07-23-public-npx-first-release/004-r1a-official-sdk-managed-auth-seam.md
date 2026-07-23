# 004 — R1a — Official SDK managed auth seam을 연다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

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

- [ ] Sync/async managed ChatGPT login entrypoint가 hosted-success와 `codex` brand option을 typed request에 전달한다.
- [ ] AY-PLE application identity와 exact version이 initialize `clientInfo`로 전달되고 default SDK identity로 위장하지 않는다.
- [ ] Matching login completion이 opt-out configuration 아래에서도 exact attempt queue에 도달하며 unrelated notification을 소비하지 않는다.
- [ ] Start failure, unexpected response, completion, cancel과 close가 typed·bounded behavior로 SDK test에 고정된다.
- [ ] Ordered patch roster, generated source와 source hash/provenance가 drift 없이 재생성·검증된다.
- [ ] Device-code와 current Turn/Plan routing regression이 유지되고 production bridge/runtime behavior는 아직 바뀌지 않는다.

## Verification

- Targeted test or command: `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run test:router -w @ay-ple/codex-chat-runtime`, `npm run test:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run test:provenance -w @ay-ple/codex-chat-runtime`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: 없음. Fake App Server request/notification trace가 이 slice의 authority다.

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

Ticket state와 acceptance checkbox는 independent review 전까지 `claimed`·unchecked로 유지한다.

| 항목 | Candidate evidence |
| --- | --- |
| Fixed review point | `269a3555d3adf52bf520b3de0b99c7cb3fee3ae7` |
| Claim commit | `10f1cc234936d00d54be23163496a2a8cf1503d6` |
| R-owned implementation commit | `8f146dea94de124f59c20a7ef14551d87792c150` |
| Ordered patch | `0009-managed-chatgpt-login`, 12,206 bytes, SHA-256 `c02ffd7d8d1aa44f85c0cc237dfb6178e04ede45caca66d6cceda33696617a44` |
| Exact temporary reconstruction | Nine-patch deterministic verify green; official suite 166 passed, 38 skipped; Ruff check/format green; response-last·Plan·bounded-router actual-child green; provenance 17 tests green |
| Repository gates | `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs link check와 `git diff --check` green |
| Expected serialized block | Tracked `verify:exact-sdk`는 `tracked patched-source manifest is stale`, post-change `verify:production-runtime`은 `behavioral patch roster shape or length drift`로 fail closed한다. 아래 C-owned provenance delta를 반영하기 전에는 green으로 기록하지 않는다. |

### C-only provenance delta request

R1a writer는 shared manifest, package README, lockfile을 수정하지 않았다. Coordinator가 candidate review 뒤 다음 tracked file만 serial하게 갱신해야 한다.

| Shared file | 필요한 delta |
| --- | --- |
| `packages/codex-chat-runtime/manifests/patched-source.json` | Patch count 8 → 9, source file roster 88개 유지, manifest bytes 31,979 → 34,032, manifest SHA-256 `db9f0644155f9ab8f396b5263e3539a778e5ca7a49e3b8e49b14be7c32a71f98` → `531932ce1cd47f626343b38f4656c499ea707c50e0f06d6c4bc5b670c0237299`, patch stack `ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9` → `87b3f71e5fc9420566b76d489ca9090f06b239fee032de66faf18a4f2620568d`, source tree `c0f19b682d4cf182448ebd1e47eaecb9fac3c478c3c7899fd2e10b913b30aa06` → `31c5d08276d5d1a97995bb1c2197103a92479d404036fc907f7c700b30e51954` |
| `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json` | Manifest bytes 11,239 → 11,528, SHA-256 `a12fa91bc247b377273f242526bb8eb8d843c2ec9a1d613b70434a479b6804b7` → `cead0b4732e9f955cfdb1e66dfd1492b16dedee0789b775a7be7b2e66da453d3`; patched SDK wheel 84,251 bytes / `9259319c79132ffa16e1ba46d3e20a88be3b5851501f8ab7812bfb42ce6427aa` → 84,528 bytes / `01845cb42eb50f69e1861125b92b3fd37a09b2f9650220886bb30877a843e356`; installed site-packages roster `bbd4ef8a261b1f4e34e01b1a312fed0262d4d4f55f3a9cd7338e420aad50b9d8` → `66e1c1416f9a9b6bb6a849a06f46615189eb30cd6fc2510191ea22d0037ff135`; bundle roster `4b72a60735d6b6d1489bab9fa937889f296ba2268c3fc0c433ba84ca10b36b7a` → `41e3a86a18fa24cafdc25e0d5d6f64f253f81777f28246dc6118ed57cd3e32db` |
| `packages/codex-chat-runtime/README.md` | Complete ordered stack을 `0001 → … → 0009`로 설명하고 managed ChatGPT login seam, 새 patch-stack·wheel·bundle digest를 위 canonical manifest와 일치시킨다. |

Coordinator regeneration과 verification 순서는 다음과 같다.

1. `npm run generate:exact-sdk -w @ay-ple/codex-chat-runtime`
2. `npm run verify:exact-sdk -w @ay-ple/codex-chat-runtime`
3. `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime -- --write-manifest`
4. `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime`
5. `npm run test:router -w @ay-ple/codex-chat-runtime`, `npm run test:exact-sdk -w @ay-ple/codex-chat-runtime`, `npm run test:provenance -w @ay-ple/codex-chat-runtime`

이 serial delta가 필요한 이유는 exact SDK와 production verifier가 `BEHAVIORAL_PATCHES`의 complete roster를 canonical manifest·wheel·installed tree와 byte-for-byte 대조하기 때문이다. `manifests/unpatched.json`, immutable unpatched SDK snapshot, lockfile과 88-file source roster는 바뀌지 않는다. Ignored local production artifact도 새 canonical production manifest와 함께 rematerialize해야 한다.
