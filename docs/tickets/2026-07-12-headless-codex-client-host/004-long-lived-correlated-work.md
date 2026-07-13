# 004 — 한 process에서 thread·turn·activity를 정확히 연결한다

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-12-headless-codex-client-host.md`

## What It Delivers

한 Host generation과 App Server process 안에서 persistent Thread A와 B를 만들고, A1과 B1 turn의 interleaved stream을 정확한 opaque refs로 분리하며, A1 terminal 뒤 같은 thread에서 A2를 시작할 수 있다. Caller는 normalized thread·turn·text·activity·terminal event와 ephemeral snapshot을 사용하고 raw thread·turn·item identity를 보지 않는다.

같은 thread의 active turn 중 새 turn은 queue나 steer로 바뀌지 않고 typed conflict로 거부된다. Late, orphan, duplicate 또는 conflicting event는 최근 thread나 UI 선택에 추측 연결되지 않으며, 안전하게 state를 유지할 수 없는 identity anomaly는 sanitized protocol failure가 된다.

## Spec Traceability

- User stories: 2, 3, 7
- Implementation contract: `In-scope Host operations`, `Identity and event contract`, `Data and State Flow` 4–5, `Testing Decisions`의 Host + child fake·Identity routing

## Slice-Specific Constraints

- Host의 public `startThread`와 `startTurn` input에는 caller-supplied `cwd`가 없다. Integration은 `thread/start.cwd`와 필요한 `turn/start.cwd`를 exact bound `workspaceRoot`로 결정하거나 optional field를 omit하며, subdirectory를 포함한 per-call workspace override를 허용하지 않는다.
- `threadRef`, `turnRef`와 `itemRef`는 Host-generated opaque value이며 raw native identifier를 내부에서만 mapping한다.
- `thread/start` response와 `thread/started`, `turn/start` response와 `turn/started`는 같은 native identity에서 하나의 의미로 수렴한다.
- 최소 normalized union은 `thread_started`, `thread_status_changed`, `turn_started`, `agent_message_delta`, `activity_started`, `activity_completed`, `turn_completed`와 scoped `host_warning`을 구현한다.
- `item/completed`는 item terminal이고 `turn/completed`만 turn terminal이다. `error` notification이나 transport 상태로 turn terminal을 합성하지 않는다.
- Snapshot은 known thread의 ephemeral status와 active turn만 유지한다. Text delta, completed transcript와 activity log를 누적·영속화하지 않는다.
- `thread/start`와 `turn/start`는 non-idempotent이며 timeout 또는 connection loss 뒤 자동 retry하지 않는다.
- `thread/start` 또는 `turn/start`가 timeout되면 native mutation의 outcome을 unknown으로 간주하고 현재 generation을 recoverable `failed`로 fence한 뒤 transport를 닫는다. 같은 generation에서 후속 mutation을 허용하지 않고 timeout된 mutation이나 reservation을 replay하지 않는다.
- 같은 thread의 `startTurn`은 raw dispatch 전에 execution-slot reservation을 획득한다. Concurrent caller를 같은 turn Promise로 coalesce하지 않는다.
- Timed-out `turn/start`의 execution-slot reservation은 `ready`로 돌아가서 다음 mutation을 허용하는 신호로 해제하지 않는다. Generation failure cleanup이 해당 thread에 `{ status: 'unknown', reason: 'start_outcome_unknown' }` reconciliation marker를 남기고 slot을 종료한다. Response 전에는 validated native turn identity가 없으므로 이 marker에 `turnRef`를 발급하지 않으며, late response와 `turn/started`를 포함한 old-generation observation도 ref나 state를 만들지 않는다.
- `thread/start`와 `turn/start` success result는 Ticket 002의 package-internal Client response roster를 확장해 generated schema로 resolve 전 validation한다. Malformed result는 thread/turn ref를 발급하지 않고 non-recoverable `protocol_error`로 connection을 닫는다.
- Restart, pending interaction, transcript restoration, interrupt와 thread list/read/resume은 이번 slice에 포함하지 않는다.

## Acceptance Criteria

- [ ] 같은 PID와 initialize handshake 하나에서 Thread A/B, A1/B1과 A1 terminal 뒤 A2가 실행된다.
- [ ] Public thread/turn command가 `cwd`를 받지 않고 fixture journal의 native request는 exact `workspaceRoot`를 사용하거나 contract상 optional turn cwd를 omit한다.
- [ ] 같은 thread에 active turn이 있으면 새 turn을 raw request 전에 거부하고, idle 상태의 동시 `startTurn` 두 호출도 정확히 하나만 raw `turn/start`를 보내며 나머지는 `operation_conflict`가 된다.
- [ ] A1/B1의 text, activity와 terminal event를 의도적으로 interleave해도 모든 event와 snapshot state가 정확한 refs에만 연결된다.
- [ ] Start response와 matching started notification의 중복이 thread나 turn을 두 번 만들지 않는다.
- [ ] Malformed `thread/start` 또는 `turn/start` success result를 generated schema로 거부하고 opaque ref를 발급하지 않으며 non-recoverable `protocol_error`로 connection을 닫는다.
- [ ] Fake App Server가 `turn/start`를 적용하고 response만 timeout 뒤 보내는 경우 Host가 현재 generation을 recoverable `failed`로 fence하고, 직후 같은 thread의 두 번째 mutation이 wire에 기록되지 않으며 자동 replay가 없다.
- [ ] Mutation timeout이 해당 thread에 `turnRef` 없는 `{ status: 'unknown', reason: 'start_outcome_unknown' }` marker를 남기고, 이후 late response와 late `turn/started` notification을 전송해도 opaque ref·snapshot·event가 추가로 바뀌지 않으며 explicit restart 전에 새 mutation을 받지 않는다.
- [ ] `thread/start` timeout으로 public `threadRef`가 없는 경우에도 phantom thread를 만들거나 mutation을 재실행하지 않고 generation을 종료한다.
- [ ] Agent delta는 matching active turn에만 publish되고 terminal 뒤 late delta/item event가 A2나 다른 thread로 이동하지 않는다.
- [ ] Activity event는 allowlisted category와 state만 공개하며 raw item shape와 payload를 노출하지 않는다.
- [ ] Duplicate terminal, missing identity와 orphan event가 다른 scope를 변경하지 않으며 unsafe anomaly는 non-recoverable `protocol_error`로 connection을 닫는다.
- [ ] 실제 normalized mapping이 생긴 method만 `client-host`로 승격하고 sparse decision과 generated inventory를 재생성한다.
- [ ] 기존 단일-run Codex Adapter와 Inspector lifecycle가 그대로 통과한다.

## Verification

- Targeted test or command: `npm run test -w @ay-ple/runtime-codex`
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/inspector`
- Manual or live smoke: 없음 — scripted fake child가 PID, initialize count와 A/B/A2 protocol journal을 소유한다.

## Blocked By

- `docs/tickets/2026-07-12-headless-codex-client-host/003-initialized-host-lifecycle.md` — 초기화된 장기 실행 Host lifecycle을 연다

## Starting Points

- Ticket 003의 public Host Interface, generation과 lifecycle state
- `packages/runtime-codex/src/adapter.ts`의 기존 single-run notification correlation 선례
- `packages/runtime-codex/src/adapter.test.ts`의 other-thread/turn filtering cases
- `packages/runtime-codex/src/testing/fake-codex-app-server.ts`
- Generated thread·turn·item notification types
