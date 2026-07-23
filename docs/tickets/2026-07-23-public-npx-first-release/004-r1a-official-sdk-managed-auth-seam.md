# 004 — R1a — Official SDK managed auth seam을 연다

## Agent triage

- State: ready-for-agent
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
| handoffSha | Claim 시 coordinator가 003 fixed `spineTipSha`를 integration branch에 반영하고 predecessor 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/codex-chat-runtime/python/openai-codex/**`; `packages/codex-chat-runtime/upstream/patches/**`; `packages/codex-chat-runtime/upstream/PATCHES.md`; `packages/codex-chat-runtime/scripts/exact_sdk.py`; `packages/codex-chat-runtime/scripts/test_exact_sdk.py`; exact SDK focused tests; `docs/tickets/2026-07-23-public-npx-first-release/004-r1a-official-sdk-managed-auth-seam.md` |
| consumedContracts | S1 private `CodexAccountLifecycle` intent, official generated account/login types, pinned SDK/native identity와 exact AY-PLE clientInfo input |
| predecessorEvidence | Fixed reviewed `spineTipSha`, green root gates와 immutable current-workbench Browser oracle |
| requiredChecks | `validate:exact-sdk`; exact router/provenance tests; relevant production Runtime before/after verification; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | R이 아닌 independent Official SDK/provenance reviewer |
| handoffArtifact | Reviewed fixed R1a commit SHA, ordered auth patch, regenerated-source provenance와 matching-completion test receipt |
