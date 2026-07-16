# 010 — Interrupt and continue the same native thread

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none (Ticket 011 remains unclaimed)

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

사용자가 active turn을 중단해 authoritative `interrupted` terminal을 보고, terminal 뒤 같은 native thread에 두 번째 text turn을 보내 이전 conversation context를 이어간다. Disconnect, control failure와 Server shutdown도 UI→HTTP→Node→Python→App Server 전체 경계에서 deterministic하게 정산한다.

## Spec Traceability

- User stories: 3, 4, 5
- Implementation contract: Interfaces and Invariants, HTTP abort phases, Chat Shell Behavior, Failure Behaviour

## Slice-Specific Constraints

- Interrupt response는 요청 acknowledgement일 뿐 terminal이 아니다. UI는 matching `turn/completed.status == interrupted`까지 stopping 상태를 유지한다.
- Follow-up은 first terminal 뒤 같은 native `threadId`를 사용하고 새 native `turnId`/`itemId`를 유지한다.
- Browser disconnect는 phase contract에 따라 pre-response ownership 또는 accepted-turn interrupt/drain을 수행한다.
- Control failure가 stream terminal을 합성하거나 automatic retry하지 않는다.
- New conversation/refresh, multi-thread sidebar와 read/resume는 추가하지 않는다.

## Acceptance Criteria

- [x] Active turn에만 Interrupt control이 활성화되고 request가 exact thread/turn에 전달된다.
- [x] UI는 interrupt acknowledgement와 authoritative interrupted terminal을 구분한다.
- [x] Terminal 뒤 composer가 다시 활성화되고 second turn이 같은 thread에서 별도 identity/AgentMessage/terminal로 완료된다.
- [x] Interrupt failure, stream failure와 runtime failure가 distinct safe UI state로 표시된다.
- [x] Response 전후 browser disconnect fixture가 background work와 orphan process를 남기지 않는다.
- [x] Server process shutdown test가 HTTP intake→runtime close→Python/native process-group disappearance 순서를 증명한다.
- [x] Fake-backed browser E2E가 interrupt와 same-thread follow-up을 통과한다.
- [x] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Server lifecycle tests and Chat Shell Playwright interrupt/follow-up scenarios
- Repository checks: affected workspace and root test/typecheck/build/lints, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: deterministic fake desktop flow; provider live는 아직 요구하지 않는다.

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 구현 checkpoint | `5235eb28`에서 exact native turn interrupt, acknowledgement와 stream terminal 분리, 같은-thread follow-up과 browser E2E를 구현했다. `9ba176cd`에서 turn scope와 phase predicate를 중앙화했고, `f7541ff1`에서 실제 Server→Python/native process-tree shutdown gate를 추가했다. `9b663378`은 fake/actual shutdown oracle을 한 test support seam으로 수렴했다. |
| Browser contract | Active accepted turn만 exact `threadId`·`turnId`로 `{}` interrupt POST를 보낸다. Empty `202`는 control acknowledgement일 뿐이며 별도 stream controller가 matching `turn.completed` 또는 `runtime.failed`까지 계속 읽는다. Mismatched, duplicate와 post-terminal control result는 turn state를 바꾸지 않는다. |
| Same-thread continuation | Authoritative terminal과 HTTP stream EOF가 모두 정산된 뒤에만 composer를 다시 연다. 두 번째 turn은 기존 native `threadId`를 그대로 쓰고 새 native `turnId`·`itemId`의 AgentMessage와 terminal을 별도로 reconcile한다. |
| Failure behavior | Interrupt control failure는 active stream을 합성 종료하지 않고 safe control card로 남는다. Malformed stream, native failed terminal과 process-wide runtime failure는 서로 다른 safe UI state이며 automatic retry나 synthetic interrupted terminal을 만들지 않는다. |
| Disconnect와 shutdown | Server contract tests가 turn response 전 disconnect, acceptance 후 disconnect, drain timeout과 unknown outcome을 phase별로 검증한다. Opt-in actual-child gate는 실제 HTTP mutation으로 verified bundled Python worker와 provider-free fake native child를 시작하고, shutdown이 새 TCP intake를 먼저 거부한 뒤 runtime close와 worker/native PID·process group reap을 끝내야 resolve함을 증명한다. |
| Verification | Chat Shell unit 15 tests, actual Server + deterministic runtime 기반 `1440x900` Playwright 10 scenarios, Server 79 tests와 Server actual-child 1 test가 통과했다. Root `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, Inspector/Chat Shell lint, local Markdown link check와 `git diff --check`가 green이다. |
| Review | Fixed point `316bd0dbda53e0f7399cc4b0db729b6e58da56e9` 대비 Source 0, Standards 0, Spec 0 findings다. README ownership, turn-scope/phase/interrupt guard 중복, Server-level actual-child 증명, unbounded close wait와 shutdown oracle 중복 findings를 owning code·docs에 환류한 뒤 최종 delta를 재검토했다. |
| Residual | Exact local-provider/live conversation, final conformance evidence와 legacy cutover는 Ticket 011 범위다. 이번 actual-child gate는 ambient auth나 provider를 사용하지 않으며 deterministic fake green을 live green으로 표현하지 않는다. |

## Blocked By

- [009-desktop-chat-shell-nominal.md](009-desktop-chat-shell-nominal.md) — Render the nominal native conversation in a desktop Chat Shell

## Starting Points

- `CodexChatRuntime.interrupt`
- Server NDJSON stream and application lifecycle
- Chat Shell active-turn reducer/state
