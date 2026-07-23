# 005 — R1b — bounded Python account bridge를 구현한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Persistent Python bridge가 한 개의 managed ChatGPT login attempt를 즉시 시작하고, 소비하지 않는 status 관찰·cancel·release·logout·fresh account read를 bounded command로 제공한다. Native login handle과 raw notification은 Python process 안에 남아 Node가 stable private account lifecycle만 소비할 수 있다.

## Spec Traceability

- User stories: 5, 6, 13, 16
- Implementation contract: Codex account와 Runtime transition; AccountProjection lifecycle과 cancel/completion race; Parallel delivery contract — `R1`
- Testing decisions: delayed completion, cancel race, status idempotency, logout와 bounded pending slot

## Slice-Specific Constraints

- Process당 active login attempt slot은 최대 하나다. Duplicate start는 새 native login을 만들지 않고 현재 bounded attempt 상태를 반환하거나 명확히 거절한다.
- Start는 completion을 기다리지 않고 immediate safe projection을 반환한다. Native `loginId`·handle은 bridge 내부 slot에만 있고 NDJSON frame으로 내보내지 않는다.
- Attempt deadline은 monotonic 10분이다. Status는 non-consuming·idempotent하며 repeated poll이 completion이나 error를 잃지 않는다.
- Release와 cancel은 idempotent다. Cancel/completion race는 cancel RPC 뒤 bounded fresh account read로 settle하고 이미 저장된 ChatGPT account가 이긴다.
- Fresh account read는 `ready/not_ready`로 축약하지 않고 Node private seam에 필요한 full typed account kind/status를 보존한다. Token, email, raw provider error, credential path·byte는 frame에 없다.
- Logout은 official account logout 뒤 fresh `account: null` readback을 요구한다.
- Operation/waiter budget과 close cleanup은 bounded하다. Deadline·cancel·release·bridge close 뒤 login notification queue와 background waiter가 남지 않는다.
- Node Runtime role, Server coordination과 Browser DTO는 구현하지 않는다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile·frozen contract는 수정하지 않는다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Bridge protocol이 fresh account read, login start/status/cancel/release, logout을 strict command/result family로 제공한다.
- [ ] Login start response는 bounded 시간 안에 돌아오고 한 active slot을 넘는 native attempt를 만들지 않는다.
- [ ] Repeated status/release/cancel이 deterministic하며 delayed completion과 duplicate command에서 terminal result를 잃지 않는다.
- [ ] Cancel/completion race와 expiry가 fresh account read를 통해 connected 또는 non-connected terminal로 수렴한다.
- [ ] Logout은 fresh null account readback 없이는 success가 아니며 workspace 관련 state를 알거나 지우지 않는다.
- [ ] Native login ID, raw notification/error, token, credential·account private field가 NDJSON journal과 test output에서 0건이다.
- [ ] Bridge EOF/close와 forced error 뒤 waiter, queue와 Python child가 bounded하게 정리된다.

## Verification

- Targeted test or command: `npm run test:bridge -w @ay-ple/codex-chat-runtime`, `npm run check:bridge -w @ay-ple/codex-chat-runtime`, fake App Server delayed completion/cancel/expiry/logout matrix
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: 없음. Scripted fake App Server가 native request/notification authority다.

## Blocked By

- [004-r1a-official-sdk-managed-auth-seam.md](004-r1a-official-sdk-managed-auth-seam.md) — R1a — Official SDK managed auth seam을 연다

## Starting Points

- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py`
- `packages/codex-chat-runtime/scripts/test_python_bridge.py`
- `packages/codex-chat-runtime/scripts/fake_python_bridge_app_server.py`
- `packages/codex-chat-runtime/python/openai-codex/sdk/python/src/openai_codex/_login.py`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `R1b` |
| owner | `R` — Runtime |
| branch | `codex/public-preview-r1b-python-account` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/r1b-python-account` |
| handoffSha | `4d32ccc51f59b43b332b019fb13a5b3ae7a4e697` — 004의 fixed reviewed combined tip과 closeout이 반영된 clean integration HEAD. |
| writablePaths | `packages/codex-chat-runtime/python/bridge/**`; `packages/codex-chat-runtime/scripts/test_python_bridge.py`; account lifecycle용 fake App Server scripts/fixtures; `docs/tickets/2026-07-23-public-npx-first-release/005-r1b-bounded-python-account-bridge.md` |
| consumedContracts | S1 frozen Runtime account contract, R1a typed managed-login handle/completion/cancel seam와 official account read/logout types |
| predecessorEvidence | 004 fixed reviewed combined tip `be3b0bcc2ff4c550ef0dbb035f1ca23b70f49297`, closeout `4d32ccc51f59b43b332b019fb13a5b3ae7a4e697`, exact SDK patch/provenance receipt와 matching-completion tests |
| claimEvidence | Exact worktree·branch·HEAD를 확인했고 working tree가 clean이며 `be3b0bcc2ff4c550ef0dbb035f1ca23b70f49297`가 handoff HEAD의 ancestor임을 확인했다. |
| requiredChecks | Bridge full tests; Ruff check/format; exact SDK verification; production Runtime before/after verification; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | R1a author가 아닌 independent bridge/concurrency reviewer |
| handoffArtifact | Reviewed fixed R1b commit SHA, strict bridge frame roster와 bounded attempt/race/cleanup test receipt |
