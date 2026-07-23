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

## Candidate Receipt

이 receipt는 review 전 candidate를 기록한다. Ticket state와 acceptance checkbox는 coordinator의 independent review 및 C-owned serialization 전까지 닫지 않는다.

| 항목 | Candidate evidence |
| --- | --- |
| fixed handoff | `4d32ccc51f59b43b332b019fb13a5b3ae7a4e697` |
| claim | `143cc416d` |
| strict protocol checkpoint | `94ca0b946` |
| Python lifecycle implementation | `909810ebb` |
| bridge frame roster | `read_account`; `start_browser_login`; `read_browser_login_attempt`; `cancel_browser_login`; `release_browser_login_attempt`; `logout` |
| account result | `account.state = signed_out \| chatgpt \| unsupported` |
| attempt result | start는 allowlisted HTTPS `authUrl`과 product `attemptId`의 `pending`; status는 non-consuming `pending \| completed \| cancelled \| expired \| failed`; failed만 safe `{ code: login_failed, retryable: true }`를 포함 |
| settlement result | cancel은 `cancelled \| already_settled`, release는 `released \| already_released`, logout은 official logout 뒤 fresh null readback을 확인한 `signed_out` |
| bound | account RPC 30초, process-local attempt deadline monotonic 10분, active attempt와 native completion waiter 각 1개 |

Native `loginId`와 SDK handle은 `BrowserLoginAttempt` 안에만 남는다. Fake App Server는 의도적으로 `native-login-secret-*`, private email과 raw provider error sentinel을 생성하지만 strict frame, captured journal과 terminal output의 forbidden-value scan은 0건이다. Account read는 coarse typed state만 반환하고, completion·cancel·expiry는 matching waiter 뒤 fresh `account/read(refreshToken: true)`로 수렴한다. Issuer가 `auth.openai.com | chatgpt.com`이 아니거나 userinfo·port·fragment·control character·16 KiB 초과가 있는 start URL은 projection하지 않고 Runtime-fatal로 닫는다.

Cancel RPC의 well-formed rejection은 correlated `login_cancel_failed`를 한 번 반환해 request lease를 해제하고 현재 attempt를 `pending`으로 보존한다. Cancel/completion race에서는 fresh ChatGPT account가 이기며, expiry와 explicit cancel 사이에는 transient failure를 노출하지 않는다. Release response retry, repeated status, duplicate same-attempt start와 다른 attempt rejection도 deterministic하다. EOF와 native forced exit는 Python waiter를 버리고 App Server process까지 bounded하게 reap한다.

### Candidate verification

| Command | Result |
| --- | --- |
| `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime` | green, 8 tests |
| `npm run test:bridge -w @ay-ple/codex-chat-runtime` | green, 27 tests; delayed completion, duplicate start/status/release, cancel race/rejection, expiry, logout readback, unsafe URL, EOF와 forced native exit 포함 |
| `npm run check:bridge -w @ay-ple/codex-chat-runtime` | green, Ruff check와 format 13 files |
| `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime` | green; 9 ordered patches deterministic verify, router actual-child matrix, official suite 166 passed/38 skipped, provenance 17 tests |
| `npm run test:production-runtime -w @ay-ple/codex-chat-runtime` | green, 23 tests |
| `npm run verify:production-runtime -w @ay-ple/codex-chat-runtime` | expected fail-closed: `production manifest bridge source evidence drift` |
| `npm test` | green |
| `npm run typecheck` | green |
| `npm run build` | green |
| `npm run lint -w @ay-ple/chat-shell` | green |
| `git diff --check` | green |

R1b는 shared canonical manifest를 수정할 권한이 없다. 따라서 direct bridge candidate gate는 tracked worker와 기존 ignored exact Python/native bundle을 사용했고, R1a의 official patch `0009` postimage만 ignored site-packages에 반영해 managed-login handle을 실행했다. 이는 canonical production artifact evidence가 아니다. Canonical verifier가 bridge source drift에서 멈춘 현재 상태가 의도한 serial boundary다.

## C-only serialization handoff

Coordinator가 independent review로 fixed R1b SHA를 정한 뒤 C lane이 다음 delta를 단독으로 소유한다.

1. Fixed R1b를 integration branch에 병합한 상태에서 `npm run materialize:production-runtime -w @ay-ple/codex-chat-runtime -- --write-manifest`를 직렬 실행한다.
2. 생성된 ignored bundle과 `packages/codex-chat-runtime/manifests/production-runtime-darwin-arm64.json`이 current bridge source, exact 9-patch SDK와 byte-for-byte 일치하는지 검토한다.
3. 현재 `ready | not_ready`만 설명하는 `packages/codex-chat-runtime/README.md`의 bridge table을 위 strict account frame roster와 private-value/timeout/cleanup semantics로 갱신한다. R1c가 exact application identity를 worker client args에 연결한 뒤 Node Runtime 설명도 함께 갱신한다.
4. `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`을 새 materialization에서 실행하고 시작·종료 후 `verify:production-runtime`이 모두 green인지 확인한다.
5. 이 C-owned manifest/README delta와 fixed R1b를 다음 R1c `handoffSha`에 포함한다. R1c는 frame decoder, `auth-only | workspace` role, exact release client identity와 frozen `CodexAccountLifecycle`만 소비하고 Python native identity를 재노출하지 않는다.
