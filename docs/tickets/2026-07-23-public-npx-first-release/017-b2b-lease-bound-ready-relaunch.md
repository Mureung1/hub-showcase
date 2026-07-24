# 017 — B2b — Ready commit과 relaunch를 transition lease 안에서 닫는다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: B2b implementation agent

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Prepared setup이 A1의 transition lease를 통해 auth-only Runtime을 완전히 닫고 workspace Runtime을 시작한 뒤 fresh ChatGPT account를 확인한다. 그 다음 B-owned lease callback이 native context를 검증하고 `active_ready`를 commit·strict readback한 뒤에만 Ready가 된다. 같은 exact application을 다시 실행하면 workspace와 release binding을 fresh 검증해 wizard 없이 Ready로 돌아오고, credential·Runtime·binding 문제에서는 workspace를 보존한 protected recovery로 수렴한다.

## Spec Traceability

- User stories: 9, 11–13, 16
- Implementation contract: Codex account와 Runtime transition; Workspace instruction/Skill bundle과 native context
- Implementation contract: SetupJourney와 durability — prepared→active_ready; Browser-safe setup과 Ready projection
- Data and state flow: First run 12–14; Ready relaunch 전체

## Slice-Specific Constraints

- A1만 app-wide transition lease를 소유하고 Runtime/account transition을 수행한다. B2b만 그 lease callback 안에서 `active_ready`를 commit하고 즉시 strict readback한다.
- B는 Runtime process를 직접 start/close하거나 account lease를 복제하지 않는다. A는 setup envelope나 Ready pointer를 쓰지 않는 기존 경계를 유지한다.
- Authoritative transition order는 auth-only close → workspace Runtime start → fresh ChatGPT account read → B-owned native callback → Ready commit/readback이다. Native verification은 fresh account 전에 실행되지 않는다.
- Coordinator가 허용한 A-owned delta는 `account-runtime/contract.ts`·`coordinator.ts`의 workspace transition reauth classification과 `route-adapter.ts`의 B-owned Ready-attestation invalidation callback뿐이다. 전자는 transition 중 fresh `signed_out`를 `workspace_account_reauth_required`로 보존하고, 후자는 성공한 fresh `signed_out | unsupported` 관찰 뒤 stale in-process Ready를 폐기하기 위해 필요하다. 그 밖의 A behavior는 바꾸지 않는다.
- B-owned attestation은 app-wide workspace transition 시작 시 전부 무효화되고, account route의 성공한 fresh non-ChatGPT 관찰도 전부 무효화한다. Account unavailable/error/abort는 증거가 아니므로 무효화하지 않으며, reconnect 뒤 fresh ChatGPT 관찰만으로는 Ready를 재확인하지 않는다.
- `prepared`는 App-side v3/bundle/context scan 성공이지 Ready가 아니다. Workspace Runtime의 fixed project boundary, private `config/read`·`skills/list` effective-context verification과 fresh ChatGPT account read가 모두 green이어야 한다.
- `launch`만 mutation-capable automatic reconciliation을 수행하고 Browser `observe()`는 read-only다. Reconnect만으로 Ready를 합성하지 않으며 explicit resume가 전체 transition·validation을 다시 통과한다.
- Ready relaunch는 locator를 authority로 믿지 않고 v3 aggregate, required seam, bundle/context, exact release binding과 account를 fresh 검증한다.
- Admitted, prepared와 active Ready workspace에는 discard가 없다. Missing declared path의 absent-only recovery 외 modified/extra/symlink/native-context conflict는 bytes를 보존한 manual recovery다.
- Ready 전 `thread/start`, `thread/resume`, `turn/start`와 Skill input count는 0이다. Post-Ready action도 B-owned fresh action admission을 우회하지 못한다.
- B2b의 zero-action evidence는 production `WorkspaceActionAdmission` 뒤에 주입한 test callbacks를 `thread/start`, `thread/resume`, `turn/start`, `SkillInput`으로 명명해 세는 seam probe다. Helper 자체는 native API가 아니며 모든 actual product route가 이 seam을 호출한다는 증거도 아니다. C1이 real route 전부의 no-bypass composition을 소유하고 I0가 조합된 graph를 소비·검증한다.
- B owner path 밖의 Server composition/UI/shared contract·manifest/lockfile을 수정하지 않는다. Fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer와 C-owned delta 규칙을 따른다.

## Acceptance Criteria

- [ ] `pending/prepared`가 A1 transition callback을 요청하고 auth-only close→workspace Runtime→fresh ChatGPT read→native context guard→Ready commit/readback 순서를 우회하지 않는다.
- [ ] B callback만 `active_ready`를 atomic commit·readback하고 A1 lease는 그 readback 뒤에만 해제된다.
- [ ] B-owned attestation은 모든 app-wide workspace transition 시작과 성공한 fresh non-ChatGPT account 관찰에서 전부 무효화된다. Workspace B transition이 실패해도 workspace A의 확인은 남지 않고, reconnect 뒤 explicit full `setup.resume` transition만 exact Ready를 다시 확인한다.
- [ ] Package actual `SIGKILL`은 Ready commit 직전·직후의 setup envelope와 workspace bytes가 complete old-or-new durable state로 수렴하고 partial publish·workspace recreation/deletion이 없음을 증명한다.
- [ ] Lost response와 repeated launch/resume는 deterministic A1/native callback seam에서 false Ready 없이 one Ready 또는 protected pending state로 수렴한다. Combined A1/native/Runtime OS-process topology의 crash·duplicate-process 증명은 H1d와 I0가 소유한다.
- [ ] Same-version ready relaunch가 locator 외 v3 aggregate, bundle/static context, exact application/Runtime binding, native config/Skills와 fresh account를 모두 재검증한 뒤 wizard 없이 `ready`를 projection한다.
- [ ] Credential 문제는 workspace와 locator를 보존한 `account_required/workspace_reauth`로 가고 reconnect 뒤 explicit resume 전에는 Ready를 복원하지 않는다.
- [ ] Ambiguous Runtime close, account unavailable, release mismatch와 modified/extra/symlink context가 각각 allowlisted protected projection과 action으로 fail closed한다.
- [ ] Ready projection은 semester/leaf/safe display와 coarse validation 결과만 내보내고 durable phase, path, digest, Runtime/native/account private identity를 노출하지 않는다.
- [ ] Admitted/prepared/Ready workspace에서 discard/delete가 0건이다. Production `WorkspaceActionAdmission`이 Ready 전과 action-time failure에서 blocked를 반환하면 injected `thread/start`, `thread/resume`, `turn/start`, `SkillInput` callback count가 모두 0이고, positive Ready control에서만 callback이 live임을 증명한다.
- [ ] B2 전체 owner-held fault/race matrix와 Server projection conformance가 green이다.

## Verification

- Targeted test or command: `@ay-ple/semester-workspace` Ready/relaunch 및 package-only actual-`SIGKILL` durable-byte tests, A1 callback order·attestation invalidation·reauth/resume race matrix, native-context clean/mismatch fixtures와 B-owned Server projection conformance
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Live provider는 요구하지 않는다. Deterministic Runtime/account fake로 first Ready, credential loss·resume, release mismatch와 same-version relaunch를 isolated roots에서 검증한다.

## Claim Evidence

| Evidence | Result |
| --- | --- |
| Exact integration handoff | `279f7680a6be3f76e8c1a932d0d22c96cc20d651` — reviewed B2a closeout을 integration branch에 merge한 clean HEAD다. |
| Completed predecessor | Ticket 016은 `State: completed`이고 reviewed B2a code tip `61915bcc56de32035e41947b296659e7f1ca5524`의 single-envelope store, prepared receipt와 exact workspace binding을 제공한다. |
| Corrective code tip | `1ac52a66438b9eb8589c3c021eee41b2dfee1444` — all-attestation invalidation, fresh non-ChatGPT Account route 연결, logout→reconnect→explicit resume seam, username-substring redaction과 production admission 뒤 injected zero-action probe를 구현한 code-only checkpoint다. |
| A1 transition contract | Frozen `AccountRuntimeTransitionLease.transitionToWorkspace()`가 auth-only close, workspace Runtime start, fresh ChatGPT account read, B-owned native verification·`commitReady`와 independent `readReady`를 그 순서대로 한 lease scope에 둔다. B2b는 이 Interface를 소비하며 lease나 Runtime generation을 복제하지 않는다. |
| Observable result | Prepared receipt는 A1 lease callback 안의 native-context verification과 strict Ready commit/readback을 모두 통과한 경우에만 `active_ready`가 된다. Same-version relaunch는 locator를 authority로 쓰지 않고 workspace·bundle·release·native context·fresh account를 재검증한다. |
| Highest practical seam | Isolated app-data/workspace roots의 production `SetupJourney`·setup state adapter, actual A1 coordinator, B native/Ready adapter와 deterministic account/native ports를 함께 사용해 authoritative order, Ready commit/readback fault, response loss, reauth→reconnect→explicit resume와 byte preservation을 검증한다. |
| Crash evidence boundary | Package child-process `SIGKILL` worker는 durable setup envelope와 workspace bytes의 convergence만 증명한다. A1 coordinator, native App Server와 workspace Runtime을 한 OS process topology로 묶은 crash·duplicate-process 증거를 주장하지 않으며, 해당 증거는 [H1d](025-h1d-browser-signal-lifecycle.md)의 process lifecycle과 [I0](026-i0-deterministic-setup-ready-integration.md)의 production setup composition을 결합해 닫는다. |
| Zero-action evidence boundary | Production `WorkspaceActionAdmission`을 실행한 뒤에만 호출되는 injected test callbacks가 blocked case에서 `thread/start=0`, `thread/resume=0`, `turn/start=0`, `SkillInput=0`이고 positive Ready control에서 live임을 검증한다. Callback helper는 native Runtime API가 아니고 actual product route no-bypass를 증명하지 않는다. C1이 모든 real action route에 admission을 직렬 조합하고 I0가 그 composed graph를 회귀 검증한다. |
| Coordinator-authorized A delta | `account-runtime/contract.ts`·`coordinator.ts`의 `workspace_account_reauth_required`는 transition 중 fresh `signed_out`의 복구 의미를 잃지 않게 한다. `route-adapter.ts`의 injected invalidation callback은 성공한 fresh non-ChatGPT 관찰이 B-owned in-process attestation을 폐기하게 한다. 이 두 이유 밖의 A-owned 변경은 허용하지 않는다. |
| Writable scope | 기본 범위는 `packages/semester-workspace/**` 중 `package.json`·`src/contract.ts` 제외, `apps/server/src/setup/**`, 관련 colocated tests와 이 ticket이다. Coordinator-authorized 예외로 `apps/server/src/account-runtime/contract.ts`, `coordinator.ts`, `route-adapter.ts`와 해당 colocated tests의 위 최소 delta만 허용한다. Composition/UI, manifest·lockfile, Runtime·SDK patch는 변경하지 않는다. |

## Blocked By

- [016-b2a-durable-setup-transaction.md](016-b2a-durable-setup-transaction.md) — B2a — Setup approval을 durable prepared transaction으로 만든다

## Starting Points

- B2a single-envelope store와 approved→prepared fixture
- `packages/semester-workspace/src/contract.ts`
- `packages/semester-workspace/src/native-context/**`
- `apps/server/src/setup/**`
- A1 `AccountRuntimeCoordinator` transition callback
- S1 Browser Setup/Ready fixture와 Runtime account fake
- `docs/wayfinding/public-npx-first-release/assets/resumable-setup-authority-design.md`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `B2b` — `B2` completion |
| owner | `B` — Semester setup |
| branch | `codex/public-preview-b2b-ready-relaunch` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/b2b-ready-relaunch` |
| handoffSha | Claim 시 coordinator가 016의 fixed reviewed SHA를 integration branch에 merge하고 B2a 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `packages/semester-workspace/**` 중 `package.json`과 `src/contract.ts` 제외; `apps/server/src/setup/**`; 관련 colocated tests; coordinator-authorized 최소 A delta인 `apps/server/src/account-runtime/contract.ts`, `coordinator.ts`, `route-adapter.ts`와 해당 colocated tests; `docs/tickets/2026-07-23-public-npx-first-release/017-b2b-lease-bound-ready-relaunch.md` |
| consumedContracts | B2a single-envelope store/fault fixture; A1 transition lease and Ready callback; B1 native-context/action admission; S1 Browser Setup/Ready fixtures |
| predecessorEvidence | 016 fixed reviewed SHA와 integration merge receipt, B2a old-or-new fault matrix, inherited 008/013 receipts, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Authoritative transition order; all-attestation invalidation; logout/non-ChatGPT→reconnect→explicit resume와 cross-workspace failed-transition regression; Ready commit/readback race matrix; same-version relaunch/release mismatch/context-conflict; projection leak scan; package durable-byte SIGKILL scope; production admission 뒤 injected zero-action callback와 positive control; semester-workspace/Server focused tests; root four gates; docs links; `git diff --check` |
| reviewOwner | B author가 아닌 independent setup/Runtime-transition and filesystem-safety reviewer |
| handoffArtifact | Fixed reviewed B2 completion SHA, production `SetupJourney`와 Server setup Module paths, Ready/relaunch conformance digest, package-only crash-evidence scope와 C1 consumption receipt. C1은 every-real-route no-bypass composition, I0는 composed zero-action graph, H1d+I0는 combined A1/native/Runtime OS-process proof를 이어서 소유한다. |
