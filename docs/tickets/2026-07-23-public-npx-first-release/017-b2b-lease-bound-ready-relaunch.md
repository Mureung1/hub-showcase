# 017 — B2b — Ready commit과 relaunch를 transition lease 안에서 닫는다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Prepared setup이 A1의 transition lease를 통해 auth-only Runtime을 완전히 닫고 workspace Runtime의 native context와 fresh ChatGPT account를 확인한 뒤에만 B-owned `active_ready`로 commit된다. 같은 exact application을 다시 실행하면 workspace와 release binding을 fresh 검증해 wizard 없이 Ready로 돌아오고, credential·Runtime·binding 문제에서는 workspace를 보존한 protected recovery로 수렴한다.

## Spec Traceability

- User stories: 9, 11–13, 16
- Implementation contract: Codex account와 Runtime transition; Workspace instruction/Skill bundle과 native context
- Implementation contract: SetupJourney와 durability — prepared→active_ready; Browser-safe setup과 Ready projection
- Data and state flow: First run 12–14; Ready relaunch 전체

## Slice-Specific Constraints

- A1만 app-wide transition lease를 소유하고 Runtime/account transition을 수행한다. B2b만 그 lease callback 안에서 `active_ready`를 commit하고 즉시 strict readback한다.
- B는 Runtime process를 직접 start/close하거나 account lease를 복제하지 않는다. A는 setup envelope나 Ready pointer를 쓰지 않는 기존 경계를 유지한다.
- `prepared`는 App-side v3/bundle/context scan 성공이지 Ready가 아니다. Workspace Runtime의 fixed project boundary, private `config/read`·`skills/list` effective-context verification과 fresh ChatGPT account read가 모두 green이어야 한다.
- `launch`만 mutation-capable automatic reconciliation을 수행하고 Browser `observe()`는 read-only다. Reconnect만으로 Ready를 합성하지 않으며 explicit resume가 전체 transition·validation을 다시 통과한다.
- Ready relaunch는 locator를 authority로 믿지 않고 v3 aggregate, required seam, bundle/context, exact release binding과 account를 fresh 검증한다.
- Admitted, prepared와 active Ready workspace에는 discard가 없다. Missing declared path의 absent-only recovery 외 modified/extra/symlink/native-context conflict는 bytes를 보존한 manual recovery다.
- Ready 전 `thread/start`, `thread/resume`, `turn/start`와 Skill input count는 0이다. Post-Ready action도 B-owned fresh action admission을 우회하지 못한다.
- B owner path 밖의 Server composition/UI/shared contract·manifest/lockfile을 수정하지 않는다. Fixed handoff, sibling merge·cherry-pick 금지, 최대 3 writer와 C-owned delta 규칙을 따른다.

## Acceptance Criteria

- [ ] `pending/prepared`가 A1 transition callback을 요청하고 auth-only close→workspace Runtime→native context guard→fresh ChatGPT read 순서를 우회하지 않는다.
- [ ] B callback만 `active_ready`를 atomic commit·readback하고 A1 lease는 그 readback 뒤에만 해제된다.
- [ ] Commit 직전·직후 crash, lost response와 repeated launch/resume가 false Ready나 duplicate Runtime 없이 one Ready 또는 protected pending state로 수렴한다.
- [ ] Same-version ready relaunch가 locator 외 v3 aggregate, bundle/static context, exact application/Runtime binding, native config/Skills와 fresh account를 모두 재검증한 뒤 wizard 없이 `ready`를 projection한다.
- [ ] Credential 문제는 workspace와 locator를 보존한 `account_required/workspace_reauth`로 가고 reconnect 뒤 explicit resume 전에는 Ready를 복원하지 않는다.
- [ ] Ambiguous Runtime close, account unavailable, release mismatch와 modified/extra/symlink context가 각각 allowlisted protected projection과 action으로 fail closed한다.
- [ ] Ready projection은 semester/leaf/safe display와 coarse validation 결과만 내보내고 durable phase, path, digest, Runtime/native/account private identity를 노출하지 않는다.
- [ ] Admitted/prepared/Ready workspace에서 discard/delete가 0건이고 action-time admission failure가 product thread/Turn 시작 전에 차단된다.
- [ ] B2 전체 owner-held fault/race matrix와 Server projection conformance가 green이다.

## Verification

- Targeted test or command: `@ay-ple/semester-workspace` Ready/relaunch tests, A1 callback integration race matrix, native-context clean/mismatch fixtures와 B-owned Server projection conformance
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Live provider는 요구하지 않는다. Deterministic Runtime/account fake로 first Ready, credential loss·resume, release mismatch와 same-version relaunch를 isolated roots에서 검증한다.

## Blocked By

- [016-b2a-durable-setup-transaction.md](016-b2a-durable-setup-transaction.md) — B2a — Setup approval을 durable prepared transaction으로 만든다

## Starting Points

- B2a single-envelope store와 approved→prepared fixture
- `packages/semester-workspace/src/contract.ts`
- `packages/semester-workspace/src/native-context/**`
- `apps/server/src/setup/**`
- `apps/server/src/workspace-admission/**`
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
| writablePaths | `packages/semester-workspace/**` 중 `package.json`과 `src/contract.ts` 제외; `apps/server/src/setup/**`; `apps/server/src/workspace-admission/**`; 관련 colocated tests; `docs/tickets/2026-07-23-public-npx-first-release/017-b2b-lease-bound-ready-relaunch.md` |
| consumedContracts | B2a single-envelope store/fault fixture; A1 transition lease and Ready callback; B1 native-context/action admission; S1 Browser Setup/Ready fixtures |
| predecessorEvidence | 016 fixed reviewed SHA와 integration merge receipt, B2a old-or-new fault matrix, inherited 008/013 receipts, latest applicable `contractTipSha`, root four-gate receipt |
| requiredChecks | Ready commit/readback race matrix; same-version relaunch/reauth/release mismatch/context-conflict tests; projection leak scan; semester-workspace/Server focused tests; root four gates; docs links; `git diff --check` |
| reviewOwner | B author가 아닌 independent setup/Runtime-transition and filesystem-safety reviewer |
| handoffArtifact | Fixed reviewed B2 completion SHA, production SetupJourney/Server setup router paths, Ready/relaunch conformance digest와 C1 consumption receipt |
