# 006 — R1c — Node account lifecycle과 Runtime role을 완성한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Node Runtime이 frozen `CodexAccountLifecycle`을 구현하고 생성 시 `auth-only` 또는 `workspace` role을 명시적으로 고른다. Account caller는 fresh ChatGPT account, managed login attempt와 logout을 typed private API로 사용하며, pre-workspace Runtime은 account operation 외 Codex 작업을 실행할 수 없고 완전한 process-tree close 후에만 후속 transition으로 넘어갈 수 있다.

## Spec Traceability

- User stories: 5, 6, 11, 13, 16
- Implementation contract: Module Responsibilities and Seams — `@ay-ple/codex-chat-runtime`; Codex account와 Runtime transition; Parallel delivery contract — `R1`
- Testing decisions: auth-only command denial, actual child lifecycle와 process-tree cleanup

## Slice-Specific Constraints

- Runtime role은 construction-time immutable input이다. `auth-only` role은 owner-only empty bootstrap cwd와 controlled roots를 사용하고 account read/login/status/cancel/release/logout/close 외 thread, Turn, Skill, MCP, workspace operation을 fail closed한다.
- `workspace` role의 current thread/Turn behavior는 보존한다. Account lifecycle 추가가 기존 Runtime supervisor·bridge framing·backpressure·bounded shutdown을 우회하지 않는다.
- S1 frozen `CodexAccountLifecycle`과 account result를 구현하며 Browser DTO나 Server projection을 export하지 않는다.
- Full private account projection은 ChatGPT 여부와 fresh-read state를 구분하지만 token, email, raw error, credential path, native `loginId`·request ID를 포함하지 않는다.
- Status는 non-consuming·idempotent하고 cancel/release/logout/close는 exact in-flight operation과 bounded하게 정산한다.
- Runtime close는 Python bridge, native App Server와 process group disappearance까지 확인한다. Ambiguous close를 success로 합성하지 않는다.
- Existing `readAccountReadiness()` consumer는 migration이 끝날 때까지 behavior-compatible adapter로 유지하거나 C-reviewed contract delta로 명시적으로 전환한다.
- Server coordinator, setup Ready commit, Browser route와 live OAuth smoke는 이 ticket 범위가 아니다.
- Lane은 fixed reviewed `handoffSha`에서 시작하고 sibling branch를 merge·cherry-pick하지 않는다. Shared manifest·lockfile와 frozen contract 변경은 C-only다.
- Coordinator는 이 lane을 포함해 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Node Runtime이 frozen `CodexAccountLifecycle`의 fresh read, start/status/cancel/release/logout/close를 strict bridge frames에 연결한다.
- [ ] `auth-only` role에서 account family만 성공하고 thread/Turn/Skill/MCP/workspace command는 native request 0건으로 거절된다.
- [ ] `workspace` role의 existing product/Chat lifecycle와 cleanup tests가 회귀 없이 통과한다.
- [ ] Delayed completion, duplicate status, cancel/completion race, expiry, logout null readback와 Runtime loss가 stable private outcome으로 수렴한다.
- [ ] Public export, thrown error, journal과 diagnostics에서 token, email, auth URL beyond allowlisted start result, native login/request identity와 raw provider payload가 0건이다.
- [ ] Normal close, interrupt와 forced bridge/native failure 뒤 complete process tree와 pending operation이 bounded하게 사라진다.
- [ ] R1 completion handoff가 downstream A1/R2가 소비할 exact Runtime contract와 evidence를 고정한다.

## Verification

- Targeted test or command: `npm run test:node-unit -w @ay-ple/codex-chat-runtime`, `npm run test:node-actual -w @ay-ple/codex-chat-runtime`, `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`, Runtime browser-contract typecheck
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `git diff --check`
- Manual or live smoke: 없음. Fake App Server actual-child matrix로 account-only denial과 full cleanup을 확인한다.

## Blocked By

- [005-r1b-bounded-python-account-bridge.md](005-r1b-bounded-python-account-bridge.md) — R1b — bounded Python account bridge를 구현한다

## Starting Points

- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/bridge-protocol.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/contract.ts`
- `packages/codex-chat-runtime/src/account-contract.ts`
- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/type-tests/browser-contract.ts`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `R1c` / `R1` completion |
| owner | `R` — Runtime |
| branch | `codex/public-preview-r1c-node-account` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/r1c-node-account` |
| handoffSha | Claim 시 coordinator가 005의 fixed reviewed SHA를 integration branch에 `--no-ff` merge하고 predecessor 및 integration Runtime/root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/codex-chat-runtime/src/**` 중 implementation·test files (`account-contract.ts`와 다른 S1 frozen contract 제외); Runtime type tests; account actual-child fixtures; `docs/tickets/2026-07-23-public-npx-first-release/006-r1c-node-account-lifecycle-runtime-roles.md` |
| consumedContracts | S1 frozen `CodexAccountLifecycle`·Runtime role contract, R1b strict bridge account family와 current Runtime supervisor invariants |
| predecessorEvidence | 005 fixed reviewed SHA, bridge attempt/race/leak/cleanup receipt와 exact SDK/production Runtime verification |
| requiredChecks | Runtime Node unit/actual; bridge full; exact SDK and production Runtime before/after verification; browser-contract typecheck; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent Node Runtime/lifecycle reviewer와 downstream A consumer reviewer |
| handoffArtifact | Reviewed fixed R1c commit SHA, R1 completion contract/evidence bundle와 auth-only denial·process-tree cleanup receipt |
