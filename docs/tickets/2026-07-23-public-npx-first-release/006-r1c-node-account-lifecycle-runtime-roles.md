# 006 — R1c — Node account lifecycle과 Runtime role을 완성한다

## Agent triage

- State: claimed
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

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact corrective handoff | `9b4507f52113549f61dc156c028a460f11b9210c` |
| Atomic Runtime boundary | Reviewed R1b Python bridge와 canonical production Runtime serialization을 포함하지만 Node account decoder가 아직 old readiness frame을 기대해 `validate:node-runtime`가 red인 staging tip이다. R1b와 R1c는 이 branch에서 green pair로 만든 뒤 함께 integration에 반영한다. |
| Predecessor evidence | R1b fixed reviewed tip `4332b086f994764e5ab7a494733ebc5d46071824`; Python bridge 39/39, Ruff, production Runtime materialization/verification green |
| Claim scope | Frozen `account-contract.ts`, shared manifest·lockfile, Server/Browser와 sibling lane을 변경하지 않고 ticket의 `writablePaths`만 사용한다. |

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
| handoffSha | `9b4507f52113549f61dc156c028a460f11b9210c` — reviewed R1b와 canonical Runtime serialization을 보존한 corrective staging tip이다. Node incompatibility 때문에 integration은 의도적으로 아직 진전시키지 않았으며 R1b+R1c를 atomic하게 검증한다. |
| writablePaths | `packages/codex-chat-runtime/src/**` 중 implementation·test files (`account-contract.ts`와 다른 S1 frozen contract 제외); Runtime type tests; account actual-child fixtures; `docs/tickets/2026-07-23-public-npx-first-release/006-r1c-node-account-lifecycle-runtime-roles.md` |
| consumedContracts | S1 frozen `CodexAccountLifecycle`·Runtime role contract, R1b strict bridge account family와 current Runtime supervisor invariants |
| predecessorEvidence | 005 fixed reviewed SHA, bridge attempt/race/leak/cleanup receipt와 exact SDK/production Runtime verification |
| requiredChecks | Runtime Node unit/actual; bridge full; exact SDK and production Runtime before/after verification; browser-contract typecheck; root test/typecheck/build/Chat Shell lint; `git diff --check` |
| reviewOwner | Independent Node Runtime/lifecycle reviewer와 downstream A consumer reviewer |
| handoffArtifact | Reviewed fixed R1c commit SHA, R1 completion contract/evidence bundle와 auth-only denial·process-tree cleanup receipt |

## Candidate Receipt

이 receipt는 coordinator의 combined review 전 writer candidate evidence다. Ticket state는 `claimed`로 유지하고 Acceptance Criteria checkbox는 의도적으로 닫지 않는다.

| Evidence | Result |
| --- | --- |
| Reviewed implementation tip | `095b58bd1b894e29623e52ddb3f26c3262f40d63` |
| Downstream Runtime contract | Explicit factory input은 immutable `CodexRuntimeRole`, exact AY-PLE application identity와 controlled environment를 받고 root-only `CodexManagedRuntime = CodexProductCapableRuntime & CodexAccountLifecycle`을 반환한다. Existing workspace factory overload와 `readAccountReadiness()` behavior는 유지한다. |
| Auth-only boundary | Owner-only empty bootstrap cwd와 owner-only disjoint roots를 spawn 전에 검증한다. Account family와 close만 허용하고 thread, Turn, Skill, private MCP와 workspace family는 native write 0건으로 `runtime_role_denied`에 수렴한다. |
| Account settlement | `expiresAt`은 canonical future ISO이며 frozen 10분 bound를 넘을 수 없다. Delayed operation의 `AbortSignal`은 stable `runtime_closing` result와 auth-only Runtime 전체 shutdown을 소유하고, close는 internal rejection을 consume한 뒤 process-tree disappearance로 `closed | ambiguous`를 판정한다. |
| Privacy and decoder | Account result는 exact-key strict decoder와 exact allowlisted HTTPS authority를 통과한다. Email, token, native login/request identity, raw provider payload와 noncanonical/ported auth URL은 private projection을 통과하지 않는다. |
| Runtime verification | Node unit `77/77`; actual child `84/84`; official local provider `1/1`; `validate:node-runtime`의 before/after production Runtime verification green. |
| Production Runtime verification | Production bundle `23/23`; full Python bridge `39/39`; Ruff와 format check; materialized complete-tree verification green. |
| Repository gates | Sequential `npm test`, root `npm run typecheck`, root `npm run build`, Chat Shell lint와 `git diff --check` green. |
| Independent review | Exact reviewed tip에서 P0–P3 finding 0건. Review 중 발견한 account-close unhandled rejection, auth URL canonicalization, root-negative coverage와 delayed fake mid-flight abort parity를 수정하고 재검증했다. |
| Scope guard | Frozen `account-contract.ts`, browser `contract.ts`, shared manifest·lockfile, Server/Browser implementation과 sibling lane은 변경하지 않았다. |

## Combined Review Correction Handoff

| Evidence | Result |
| --- | --- |
| Exact handoff | `d6c4b26af` — R1b·R1c, B1b containment, D1b와 C serialization을 합친 combined candidate이며 integration에는 아직 반영하지 않았다. |
| Standards finding | Workspace Runtime이 `role.workspaceRoot`와 다른 absolute `StartThreadInput.workspace`를 native cwd로 전달할 수 있다. Exact admitted root equality와 deterministic fake parity를 native write 전에 강제해야 한다. |
| Spec finding | Runtime이 frozen `CodexNativeContextPort`를 구현하지 않아 actual workspace Runtime의 `config/read`·`skills/list`가 Server-local temporary adapter 밖으로 연결되지 않았다. Runtime이 high-level projection과 raw mapping을 소유하고 auth-only에서는 native request 0건으로 거절해야 한다. |
| Documentation finding | Runtime README, implementation map과 ADR 0017의 current implementation 문구를 실제 R1 상태와 남은 product integration 경계에 맞춰 갱신해야 한다. |
| Corrective branch | `codex/public-preview-c-native-context-bind` |
| Corrective worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/c-native-context-bind` |
