# 013 — A1 — Account/Runtime transition lease를 직렬화한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: coordinator

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

- [x] Login start/status/cancel/release, explicit logout과 account retry가 같은 app-wide lease에서 active product operation·Runtime transition과 직렬화된다.
- [x] Duplicate login start는 같은 pending attempt에 join하고 cancel/completion race는 matching completion 뒤의 fresh ChatGPT account read로만 수렴한다.
- [x] Logout은 active auth/product operation과 직렬화하고 fresh `account: null`을 확인하며 workspace와 academic state를 지우지 않는다.
- [x] Auth-only Runtime close, process-tree disappearance, workspace Runtime start, fresh account read, B callback과 Ready readback이 하나의 lease scope에 들어간다.
- [x] Auth-only close가 ambiguous하거나 workspace Runtime/fresh read가 실패하면 second Runtime과 false Ready 없이 stable protected state로 끝난다.
- [x] B callback 전후의 fault와 cancel/logout/close/Ready race matrix에서 lease가 조기 해제되거나 Ready가 A에 의해 쓰이는 경우가 0건이다.
- [x] Account producer가 S1 Browser fixtures와 exact하게 일치하고 private-field leak scan이 0건이다.
- [x] Existing Chat, Assignment, interrupt, Review와 bounded Runtime shutdown behavior가 regression 없이 유지된다.

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

## Corrective Candidate Receipt

이 receipt는 independent 재리뷰 전 writer candidate evidence다. Candidate 제출 당시 Ticket state는 `claimed`였고 Acceptance Criteria checkbox를 의도적으로 닫지 않았다.

| Evidence | Result |
| --- | --- |
| Initial candidate | `3f7d600d144aa7178c7a0816ad0901ab77fd8c4e` — app-wide account lease, mount-independent Account route adapter와 product reserve→release guard를 구현했지만 independent review에서 P1 두 건으로 NOT PASS였다. |
| Review finding 1 | `closeAuthOnlyRuntime()` reject가 caller까지 전파돼 ambiguous close를 stable restart-required state로 고정하지 못했다. |
| Review finding 2 | Workspace Runtime의 fresh account가 `signed_out` 또는 `unsupported`여도 B-owned Ready callback과 readback을 호출할 수 있었다. |
| Corrective code tip | `cad4784284793901bc54fd736f8faf9c34401cfd` — close reject를 `auth_runtime_close_ambiguous`로 변환하고 같은 failure를 latch하며, fresh `chatgpt` account만 B callback에 넘기는 A-owned refinement를 추가했다. |
| Close regression | Rejecting close를 두 번 요청해도 close 1회, workspace Runtime start 0회, B commit 0회다. Private cause는 optional diagnostic callback에만 전달되고 reporter failure가 latch를 약화하지 않는다. |
| Account admission regression | Exact A1 corrective candidate에서 fresh `chatgpt`는 B commit→Ready readback까지 같은 lease에서 성공했다. Fresh `signed_out`, `unsupported`와 thrown read는 B commit/readback 0회로 `account_unavailable` 또는 cancellation에 수렴했고 retry는 이미 시작한 같은 Runtime generation을 재사용했다. Fresh `signed_out`의 current recovery classification은 아래 post-completion refinement가 대체한다. |
| Focused verification | Account coordinator와 route adapter `33/33`; complete Server `185/185`; Server typecheck와 `git diff --check` green. |
| Repository gates | Exact corrective code tip에서 root `npm test`, `npm run typecheck`, `npm run build`, Chat Shell lint, docs links와 diff check가 green이다. Docs link result는 active 28, historical 2다. |
| Scope audit | Frozen `account-runtime/contract.ts`, shared manifest·lockfile, sibling branches와 Official Codex SDK source/patch stack은 변경하지 않았다. |
| Review status | Candidate 제출 당시에는 independently reviewed fixed SHA가 아니었으며, 아래 closeout의 Standards와 parent Spec 재리뷰가 통과한 뒤 completion 대상으로 승격했다. |

## Independent Review Closeout

| Evidence | Result |
| --- | --- |
| Feature implementation | `3f7d600d144aa7178c7a0816ad0901ab77fd8c4e` |
| Corrective implementation | `cad4784284793901bc54fd736f8faf9c34401cfd` |
| Exact reviewed candidate | `45595647e18b44ad5735bdd8e364e0b38bdc436d` |
| Historical disposition | Initial feature candidate는 auth-only close reject와 non-ChatGPT fresh account admission이라는 P1 두 건으로 NOT PASS였다. Corrective implementation이 두 failure를 fail-closed 경계로 옮긴 뒤 exact candidate를 다시 검토했다. |
| Close probes | Rejecting close와 throwing diagnostic reporter를 포함한 first+retry 전체에서 auth-only close `1`, workspace Runtime start `0`, Ready commit `0`, Ready readback `0`이다. Ambiguous result는 restart-required로 latch된다. |
| Fresh account probes | Exact reviewed A1 candidate에서 fresh `signed_out`와 `unsupported`는 각각 Ready commit/readback `0`이었다. Thrown read 뒤 retry 전체의 workspace Runtime start는 `1`이고, fresh `chatgpt`가 확인된 뒤에만 Ready가 성공했다. 당시 두 non-ChatGPT 상태의 public recovery 분류는 `account_unavailable`이었으며, 아래 refinement가 fresh `signed_out`만 더 정확히 분리한다. |
| Independent automatic evidence | Complete Server `185/185`, Server typecheck와 `git diff --check`가 exact reviewed candidate에서 green이다. |
| Review disposition | Independent Standards와 parent Spec focused review는 P1/P2 finding `0`으로 PASS다. |
| Completion | A1 구현과 evidence는 complete다. Canonical integration 및 아래 downstream composition은 coordinator가 소유한다. |

## Post-completion Coordinator-authorized Refinement

Ticket 013의 exact reviewed candidate와 completion receipt는 위 표 그대로 유지한다. B2b integration에서 workspace bytes를 보존한 reauth recovery를 Browser-safe하게 구분할 필요가 확인돼, coordinator가 A-owned `account-runtime/contract.ts`와 `coordinator.ts`의 최소 semantic refinement만 별도로 허용했다.

Current transition behavior는 fresh `signed_out`를 `workspace_account_reauth_required`, fresh `unsupported`와 thrown/unavailable read를 `account_unavailable`로 분류한다. 이 refinement는 Ready callback/readback 0, already-started workspace Runtime generation reuse와 A1 lease ordering을 바꾸지 않고 recovery reason만 보존한다. Semantic classification은 `b34697d57ebefb83a5d0a2b42c0c56dd14d34731`에서 구현됐고, B2b corrective code tip `1ac52a66438b9eb8589c3c021eee41b2dfee1444`이 이를 유지하면서 성공한 fresh non-ChatGPT route 관찰의 Ready-attestation invalidation과 실제 reauth→reconnect→explicit resume seam을 추가했다. B2b fixed-SHA review가 이 downstream delta를 다시 소유한다.

## Downstream Composition Obligations

| Owner | Obligation |
| --- | --- |
| B2 | `transitionToWorkspace()`에 넘기는 B-owned callback 안에서 exact admitted workspace의 native context를 검증하고 Ready를 idempotent하게 commit한 뒤 독립 readback한다. A1은 callback을 lease 안에서 실행할 뿐 setup envelope나 Ready pointer를 직접 읽거나 쓰지 않는다. |
| C1 | Account route adapter와 guarded `ProductOperationCoordinator`에 app-wide `AccountRuntimeCoordinator` 인스턴스 하나만 주입한다. Adapter의 `hasPendingAttempt()`를 coordinator에 연결하고 admitted workspace의 stable identity comparator를 제공하며, account/product intake abort 뒤 coordinator가 active lease를 기다리고 current Runtime process-tree를 bounded close하도록 shutdown 순서를 composition한다. |

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
