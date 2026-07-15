# 003 — Bound official SDK notification routing

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Patched official SDK의 login, active/pending turn과 global notification routing을 item 수와 UTF-8 payload byte 양쪽에서 제한한다. Stalled consumer나 burst가 sole App Server reader를 block하거나 silent drop을 일으키지 않고, 한 번의 typed overflow와 waiter settlement를 거쳐 bounded bridge cleanup으로 이어질 수 있는 Python-side contract를 만든다.

## Spec Traceability

- User stories: 2, 5
- Implementation contract: Source-Guided Router Corrections 3, package-private budgets, Failure Behaviour

## Slice-Specific Constraints

- Spec의 per-route, route-count, aggregate item/byte default를 package-private/test-injectable하게 구현한다.
- Pending→active 이동은 double count하지 않고 dequeue/unregister/fail-all은 budget을 반환한다.
- Sole reader는 full queue에서 대기하지 않는다. Unrelated scope의 진행을 한 scope가 막지 않는다.
- Overflow는 silent eviction이나 warning-only가 아니라 모든 relevant waiter를 한번 settle하는 typed terminal이다.
- Python router bound만 다룬다. Python bridge stdout 및 Node operation queue는 후속 ticket 소유다.
- Ticket 002의 FIFO correction과 public conversation API를 보존한다.

## Acceptance Criteria

- [ ] Login, active turn, pending turn, global 및 aggregate item/byte accounting이 spec default와 작은 injected limit에서 동작한다.
- [ ] Exact boundary 값은 성공하고 다음 enqueue가 deterministic overflow를 만든다.
- [ ] Pending replay, dequeue, unregister와 failure cleanup 뒤 accounting leak이 없다.
- [ ] Stalled A scope overflow 전까지 unrelated B scope가 진행하며 sole reader가 queue put에서 block하지 않는다.
- [ ] Overflow가 response/turn/global waiter를 깨우고 process cleanup을 호출할 수 있는 typed failure로 전달된다.
- [ ] Burst/stalled-consumer actual-child tests와 complete official suite가 green이다.
- [ ] Patch ledger와 patched-source verification manifest가 ordered router+bounds source digest를 반영한다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: router accounting/unit tests, burst/stalled-consumer actual-child tests, official suite
- Repository checks: exact source/package verification, workspace typecheck/build, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음.

## Blocked By

- [002-response-last-router-correction.md](002-response-last-router-correction.md) — Preserve response-last turn events and terminal

## Starting Points

- Patched `openai_codex/_message_router.py`
- Ticket 002 response-last fixture
- Parent spec의 package-private budget table

