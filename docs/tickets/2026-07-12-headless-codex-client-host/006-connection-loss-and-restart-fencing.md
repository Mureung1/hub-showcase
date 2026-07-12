# 006 — connection loss를 generation fencing과 명시적 restart로 처리한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

Initialize 전, ready-idle, active turn과 pending interaction 중 App Server process나 transport가 사라져도 Host가 성공이나 정상 terminal을 합성하지 않고 현재 generation을 일관된 `failed` state로 닫는다. 모든 pending operation은 settle되고 active work는 outcome unknown/reconciliation-needed로 남으며 pending interaction은 response할 수 없는 expired state가 된다.

Caller가 `ready` 또는 recoverable `failed` state에서 명시적으로 `restart`하면 public `restarting` state를 거쳐 같은 validated layout으로 새 generation을 initialize하고 새 command를 받을 수 있다. 이전 refs, event와 response는 새 generation에 적용되지 않으며 in-flight thread·turn·interaction mutation은 자동 replay되지 않는다.

## Spec Traceability

- User stories: 4
- Implementation contract: `Host lifecycle`의 recoverability·restart, generation-scoped refs, `Data and State Flow` 8, `Failure Behaviour`, `Testing Decisions`의 Failure/restart

## Slice-Specific Constraints

- Invalid layout, missing/non-executable binary, pin mismatch, runtime-home preparation failure와 unsafe protocol/schema/identity failure는 `recoverable: false`다.
- Successful preflight 뒤 transient spawn failure, initialize timeout/error와 unexpected exit, stdout EOF, stdin/transport failure는 `recoverable: true`다.
- Ticket 002의 Client request identity hard cap은 tombstone eviction 대신 generation을 닫는 recoverable transport failure다. Cap을 촉발한 request는 wire에 쓰지 않고 restart 뒤에도 replay하지 않는다.
- Individual App Server command error/timeout, turn failure와 later Skills discovery error는 transport가 살아 있으면 operation-scoped이고 Host는 `ready`를 유지한다.
- `recoverable: false`인 Host의 `restart`는 process를 만들지 않고 `operation_conflict`로 거부한다.
- `ready`와 recoverable `failed`에서 시작한 restart는 `restarting`을 공개하며, current generation을 완전히 fence하고 정리한 뒤에만 새 child generation을 시작한다.
- `starting` 또는 `restarting` 중 `stop`은 진행 중인 handshake/restart를 취소·정리하고 `stopped`로 수렴한다.
- Generation 종료 시 transport notification waiter, pending Client request와 operation Promise는 settle한다. Public Host subscriber는 caller unsubscribe 또는 Host stop까지 유지되어 `failed → restarting → ready` 전이를 계속 관측한다.
- Explicit restart는 validated layout을 재사용하지만 previous native thread를 resume/remap하지 않는다. 모든 old-generation refs는 `stale_reference`다.
- Active turn의 loss는 성공·실패·interrupted terminal로 꾸미지 않는다. 별도 `connection_lost` event 없이 authoritative `host_state_changed(status: failed)`를 발행하고 failed snapshot의 execution slot을 `outcome: unknown` reconciliation marker로 전환한다.
- Pending interactions는 generation 종료 시 `pending_interaction_expired`로 닫고 response를 쓰지 않는다.
- Automatic restart, mutation replay, active execution continuation과 `thread/resume`은 범위 밖이다.

## Acceptance Criteria

- [ ] Initialize 전, ready-idle, 두 active thread와 pending interaction 중 각각 process exit/EOF/write failure를 주입하는 deterministic matrix가 있다.
- [ ] 모든 transport notification waiter, pending Client request와 operation Promise가 timeout residue 없이 settle하며 public Host subscription은 connection loss만으로 닫히지 않는다.
- [ ] Process loss가 `recoverable: true`인 `failed` snapshot과 authoritative `host_state_changed`를 만들고, 별도 connection-loss event나 active turn terminal을 합성하지 않는다.
- [ ] Failed snapshot이 직전 active turn의 `turnRef`를 `outcome: unknown` reconciliation marker로 보존하되 active 또는 terminal로 표현하지 않는다.
- [ ] Unsafe protocol/schema/identity failure는 `recoverable: false`이며 같은 Host에서 restart loop를 만들지 않는다.
- [ ] Pending interaction은 generation 종료 시 expired가 되고 old `interactionRef` answer가 App Server에 쓰이지 않는다.
- [ ] `ready → restarting → ready`와 recoverable `failed → restarting → ready`가 모두 public snapshot/event에서 관측되고 successful spawn마다 generation이 정확히 한 번 증가한다.
- [ ] `starting`과 `restarting` 중 `stop`이 `stopped`로 수렴하며 handshake waiter, subscription과 이전·새 child를 정리해 orphan을 남기지 않는다.
- [ ] 같은 public Host subscriber가 `failed`, `restarting`과 새 `ready` generation의 ordered state event를 caller unsubscribe 전까지 연속 관측한다.
- [ ] Explicit restart가 handshake 뒤 새 generation을 `ready`로 만들며 이전 `threadRef`, `turnRef`, `itemRef`와 `interactionRef`를 `stale_reference`로 거부한다.
- [ ] Previous generation의 late event/response가 새 generation의 sequence, snapshot, pending operation과 interaction state를 변경하지 않는다.
- [ ] Fixture journal이 restart 뒤 이전 thread/turn/interaction mutation이 자동 replay되지 않았음을 증명한다.
- [ ] Operation-scoped request error/timeout은 current generation과 connection을 닫지 않고 `ready`를 유지한다.
- [ ] Stop deadline 뒤 child를 강제 종료해 test/server shutdown에 orphan process를 남기지 않는다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — process loss와 restart semantics는 scripted fake contract test가 소유한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/005-pending-interaction-round-trips.md` — 채택한 pending interaction을 typed response로 왕복한다

## Starting Points

- Ticket 003의 lifecycle state, generation과 process ownership
- Ticket 004의 thread·turn refs 및 active state
- Ticket 005의 pending interaction registry
- Ticket 002의 transport/process observations와 fixture journal
- `packages/runtime-codex/src/raw-client.ts`의 current exit/close behavior
