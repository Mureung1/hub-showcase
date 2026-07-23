# 013 — A1 — Account/Runtime transition lease를 직렬화한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: A1 writer

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Official Codex가 소유하는 account lifecycle과 AY-PLE의 auth-only→workspace Runtime 전환을 Server의 app-wide lease 하나로 직렬화한다. Login·cancel·logout과 active product operation이 서로 경합해도 Runtime generation은 하나만 살아 있고, workspace Runtime의 fresh ChatGPT account read와 B-owned Ready callback·readback이 끝난 뒤에만 lease가 풀린다.

## Spec Traceability

- User stories: 5, 6, 9, 11, 12, 13, 16
- Implementation contract: Module Responsibilities and Seams — `AccountRuntimeCoordinator`; Interfaces and Invariants — Codex account와 Runtime transition
- Data and state flow: First run 6–7, 12–13; Ready relaunch 5–6
- Failure behavior: login cancel/timeout, fresh read failure, unsupported account, ambiguous auth-only close와 workspace Runtime/account unavailable

## Slice-Specific Constraints

- `AccountRuntimeCoordinator`는 existing `CodexChatService`의 Runtime/thread/Turn 책임과 `ProductOperationCoordinator`의 process-global product-operation lease를 대체하지 않는다. Account·Runtime generation 전환만 상위 lease로 직렬화한다.
- Official Codex App Server가 OAuth, credential persistence와 refresh를 계속 소유한다. Direct OAuth endpoint, device code, API key, token parser, global `~/.codex` import와 별도 token store를 추가하지 않는다.
- Auth-only Runtime은 account operation과 close 외 thread, Turn, Skill, private MCP와 workspace operation을 계속 거절한다.
- Auth-only Runtime의 complete close와 process-tree disappearance가 증명된 뒤에만 exact admitted workspace의 Runtime을 시작한다. Close가 ambiguous하면 같은 process에서 두 번째 Runtime을 만들지 않고 restart-required로 수렴한다.
- A는 caller가 넘긴 B-owned callback을 lease 안에서 실행하고 Ready readback 완료 뒤 lease를 해제하지만, setup envelope나 Ready pointer를 직접 읽거나 쓰지 않는다.
- Browser projection은 S1 frozen contract만 사용하며 native `loginId`, raw account/email, Runtime identity, credential과 private error를 노출하지 않는다.
- Writer는 coordinator가 기록한 fixed `handoffSha`에서만 시작한다. Sibling branch merge·cherry-pick과 shared contract, root/workspace manifest·lockfile 수정은 금지하며 필요한 shared delta는 C에 요청한다. Coordinator는 동시에 최대 3개 writer lane만 활성화한다.

## Acceptance Criteria

- [ ] Login start/status/cancel/release, explicit logout과 account retry가 같은 app-wide lease에서 active product operation·Runtime transition과 직렬화된다.
- [ ] Duplicate login start는 같은 pending attempt에 join하고 cancel/completion race는 matching completion 뒤의 fresh ChatGPT account read로만 수렴한다.
- [ ] Logout은 active auth/product operation과 직렬화하고 fresh `account: null`을 확인하며 workspace와 academic state를 지우지 않는다.
- [ ] Auth-only Runtime close, process-tree disappearance, workspace Runtime start, fresh account read, B callback과 Ready readback이 하나의 lease scope에 들어간다.
- [ ] Auth-only close가 ambiguous하거나 workspace Runtime/fresh read가 실패하면 second Runtime과 false Ready 없이 stable protected state로 끝난다.
- [ ] B callback 전후의 fault와 cancel/logout/close/Ready race matrix에서 lease가 조기 해제되거나 Ready가 A에 의해 쓰이는 경우가 0건이다.
- [ ] Account producer가 S1 Browser fixtures와 exact하게 일치하고 private-field leak scan이 0건이다.
- [ ] Existing Chat, Assignment, interrupt, Review와 bounded Runtime shutdown behavior가 regression 없이 유지된다.

## Verification

- Targeted test or command: `npm test -w @ay-ple/server`, AccountRuntimeCoordinator login/cancel/logout/close/Ready race matrix와 Server projection conformance test
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Live OAuth는 요구하지 않는다. R1 deterministic account fake로 auth-only→workspace transition과 process-tree disappearance를 검증한다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact handoff | `27b8b77d8d4b4bd16a0c1589e7accb8550954eb3` — coordinator가 R1 completion과 후속 reviewed integration을 반영하고 root gates를 green으로 확인한 clean integration HEAD |
| R1 predecessor | Ticket 006 canonical integration tip `3e3e578fbd8d5f427bde6c6c6087f3789756cdba`가 exact handoff의 ancestor이며 managed account lifecycle, immutable Runtime role, process-tree close와 patch-free native-context port를 제공한다. |
| Frozen contract tip | `apps/server/src/account-runtime/contract.ts`와 S1 Browser Account contract의 latest change는 `7332c8bc77705160e31e0ce8e53e0dec6eb2dd90`이고 exact handoff에 포함돼 있다. |
| Observable result | Account action과 auth-only→workspace Runtime 교체가 app-wide lease 하나에서 직렬화되고, B-owned callback과 Ready readback이 성공한 뒤에만 Ready result가 반환된다. |
| Highest practical seam | Deterministic R1 `CodexAccountLifecycle` fake와 injected Runtime factory/close/readback을 사용하는 Server account/transition race matrix. Live OAuth와 credential byte는 사용하지 않는다. |
| Scope | Ticket의 `writablePaths`만 사용하며 frozen contract, shared manifest·lockfile, sibling branch와 Codex SDK source/patch stack을 변경하지 않는다. |

## Blocked By

- [006-r1c-node-account-lifecycle-runtime-roles.md](006-r1c-node-account-lifecycle-runtime-roles.md) — R1c — Node account lifecycle과 Runtime role을 완성한다

## Starting Points

- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/assignment-action-faults.test.ts`
- `apps/server/src/product-bootstrap.test.ts`
- `apps/server/src/account-runtime/contract.ts`
- `packages/codex-chat-runtime/src/account-contract.ts`
- R1의 deterministic Runtime account fake와 process-tree close tests

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `A1` |
| owner | `A` — Account transition |
| branch | `codex/public-preview-a1-transition-lease` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/a1-transition-lease` |
| handoffSha | Claim 시 coordinator가 006의 fixed reviewed SHA를 integration branch에 DAG 순서로 merge하고 predecessor 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/server/src/account-runtime/**` 중 `contract.ts` 제외; `apps/server/src/codex-chat-service.ts`; `apps/server/src/codex-chat.ts`; `apps/server/src/codex-chat-config.ts`; `apps/server/src/product-operation-coordinator.ts`; 관련 colocated Server tests와 A-owned route adapter; `docs/tickets/2026-07-23-public-npx-first-release/013-a1-account-runtime-transition-lease.md` |
| consumedContracts | S1 `apps/server/src/account-runtime/contract.ts`; R1 `CodexAccountLifecycle`와 Runtime role; S1 Browser Account fixtures; existing product-operation and Runtime shutdown contracts |
| predecessorEvidence | 006 fixed reviewed SHA와 integration merge receipt, R1 exact account lifecycle/role gate, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Account race matrix; auth-only close/process disappearance test; Server projection conformance와 private-field leak scan; Server workspace tests; root test→typecheck→build→Chat Shell lint; docs links; `git diff --check` |
| reviewOwner | A author가 아닌 independent Server concurrency/Runtime lifecycle reviewer |
| handoffArtifact | Fixed reviewed A1 SHA, AccountRuntimeCoordinator export path, race-matrix receipt와 B callback lease contract digest |
