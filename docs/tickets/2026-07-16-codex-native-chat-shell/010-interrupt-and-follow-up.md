# 010 — Interrupt and continue the same native thread

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

- [ ] Active turn에만 Interrupt control이 활성화되고 request가 exact thread/turn에 전달된다.
- [ ] UI는 interrupt acknowledgement와 authoritative interrupted terminal을 구분한다.
- [ ] Terminal 뒤 composer가 다시 활성화되고 second turn이 같은 thread에서 별도 identity/AgentMessage/terminal로 완료된다.
- [ ] Interrupt failure, stream failure와 runtime failure가 distinct safe UI state로 표시된다.
- [ ] Response 전후 browser disconnect fixture가 background work와 orphan process를 남기지 않는다.
- [ ] Server process shutdown test가 HTTP intake→runtime close→Python/native process-group disappearance 순서를 증명한다.
- [ ] Fake-backed browser E2E가 interrupt와 same-thread follow-up을 통과한다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Server lifecycle tests and Chat Shell Playwright interrupt/follow-up scenarios
- Repository checks: affected workspace and root test/typecheck/build/lints, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: deterministic fake desktop flow; provider live는 아직 요구하지 않는다.

## Blocked By

- [009-desktop-chat-shell-nominal.md](009-desktop-chat-shell-nominal.md) — Render the nominal native conversation in a desktop Chat Shell

## Starting Points

- `CodexChatRuntime.interrupt`
- Server NDJSON stream and application lifecycle
- Chat Shell active-turn reducer/state

