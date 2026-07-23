# 024 — H1c — single instance와 secondary reopen을 보장한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Canonical `appDataRoot`마다 primary AY-PLE host 하나만 listener, Runtime과 setup writer를 소유한다. 같은 exact application의 secondary invocation은 authenticated nonce handshake로 live primary Origin을 확인하고 Browser reopen port를 호출할 뿐 두 번째 mutable process graph를 만들지 않으며, version conflict·malformed/stale/ambiguous lease는 임의 PID kill이나 state overwrite 없이 fail closed한다.

## Spec Traceability

- User stories: 2, 9, 12, 16
- Implementation contract: Production host와 root — per-appDataRoot primary instance와 secondary invocation
- Data and state flow: Ready relaunch — primary 또는 new primary host
- Failure behavior and testing: duplicate launch, ambiguous ownership, representative abrupt primary death

## Slice-Specific Constraints

- Persistent state mutation 전 owner-only lease directory를 atomic하게 획득한다. PID file이나 fixed port 하나만으로 ownership을 주장하지 않는다.
- Receipt는 format, random nonce, PID/process-start identity, exact launcher version과 lifecycle phase를 bind하고 listen 뒤 H1b exact Origin을 추가한다.
- Same-version secondary가 `starting` owner를 만나면 bounded wait하고 `running` owner에서는 private loopback nonce handshake가 성공할 때만 Browser reopen port를 호출한다.
- Secondary는 listener, Runtime, setup transaction과 writer lease를 만들지 않는다. Reopen failure는 primary listener/Runtime/lease를 건드리지 않고 secondary만 non-zero로 끝낸다.
- 다른 launcher version은 silent update·migration·second instance 대신 running-version conflict와 exit guidance로 닫는다.
- Stale recovery는 owner absence, descriptor/nonce/process-start identity와 compare-and-rename이 모두 증명될 때만 허용한다. Age·PID 단독 판단, arbitrary signal, broad appData cleanup은 금지한다.
- Automatic stale reclaim의 process evidence가 아직 부족하면 `recovery_required`를 유지한다. Test가 green이라는 이유로 ambiguous receipt를 삭제하지 않는다.
- Actual `/usr/bin/open` adapter, initial Browser open와 signal-triggered full shutdown은 H1d가 소유한다. H1c는 injected reopen port로 protocol을 검증한다.
- H owner path 밖의 shared source/manifest/lock를 수정하지 않으며 fixed handoff, sibling merge·cherry-pick 금지와 최대 3 writer 규칙을 따른다.

## Acceptance Criteria

- [ ] Concurrent fresh invocation에서 one atomic owner만 primary가 되고 listener, Runtime resolver/start와 setup writer graph가 정확히 하나다.
- [ ] Primary receipt가 owner-only이고 nonce, PID/start identity, launcher version, phase와 H1b exact Origin을 strict하게 bind한다.
- [ ] Same-version secondary가 authenticated nonce handshake 뒤 primary Origin만 reopen하고 별도 listener·Runtime·state mutation을 만들지 않는다.
- [ ] `starting` primary의 bounded wait, successful `running` join과 secondary reopen failure가 각각 deterministic terminal result로 수렴한다.
- [ ] Different version, malformed receipt, live-but-unresponsive primary와 unknown ownership이 primary state를 변경하지 않고 conflict/recovery로 fail closed한다.
- [ ] Proven stale lease만 compare-and-rename quarantine 후 reclaim하고 age/PID-only deletion·kill과 broad cleanup이 0건이다.
- [ ] Primary는 자신이 획득한 matching nonce인 경우에만 full host cleanup 뒤 lease removal을 시도할 수 있다.
- [ ] Concurrency/secondary actual-child test가 one process tree, one listener, one writer와 primary preservation을 증명한다.

## Verification

- Targeted test or command: `ay-ple` single-instance unit/actual-child matrix, concurrent invocation, nonce handshake, version conflict, malformed/ambiguous/stale receipt와 secondary reopen fake
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: Isolated appDataRoot에서 두 same-version host invocation을 겹쳐 primary 한 개와 secondary reopen request 한 개만 관찰한다. OAuth/workspace mutation과 external publication은 하지 않는다.

## Blocked By

- [023-h1b-dynamic-same-origin-host.md](023-h1b-dynamic-same-origin-host.md) — H1b — dynamic same-origin host를 기동한다

## Starting Points

- H1b dynamic-origin host and close interface
- `apps/ay-ple/src/host-contract.ts`
- H1a owner-only appDataRoot validation
- `packages/runtime-release` transaction ownership tests
- Current Runtime supervisor process-tree testing support
- `docs/wayfinding/public-npx-first-release/assets/npx-production-composition-research.md`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `H1c` — H1 singleton |
| owner | `H` — Public host |
| branch | `codex/public-preview-h1c-single-instance` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/h1c-single-instance` |
| handoffSha | Claim 시 coordinator가 023의 fixed reviewed SHA를 integration branch에 merge하고 H1b 및 integration root gates를 green으로 확인한 뒤 exact integration HEAD를 기록한다. Placeholder·branch name·가짜 SHA를 쓰지 않는다. |
| writablePaths | `apps/ay-ple/src/**` 중 `host-contract.ts` 제외; host adapter/actual-child tests; `docs/tickets/2026-07-23-public-npx-first-release/024-h1c-single-instance-secondary-reopen.md`. Package/root manifest·lock와 other owner source는 제외한다. |
| consumedContracts | H1b exact Origin/listener lifecycle; S1 single-instance host result; H1a appData root identity; Runtime/setup one-owner invariants |
| predecessorEvidence | 023 fixed reviewed SHA와 integration merge receipt, dynamic-origin/readiness and bounded listener-close receipt, root four-gate result |
| requiredChecks | Concurrent invocation and nonce-handshake matrix; secondary reopen/version conflict; malformed/ambiguous/stale recovery; one-process/listener/writer assertions; host workspace and root four gates; docs links; `git diff --check` |
| reviewOwner | H author가 아닌 independent concurrency/process-ownership reviewer |
| handoffArtifact | Fixed reviewed H1c SHA, singleton/reopen coordinator path, lease/receipt schema digest와 one-primary actual-child receipt consumed by H1d |
