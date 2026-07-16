# 003 — Bound official SDK notification routing

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Patched official SDK의 login, active/pending turn과 global notification routing을 item 수와 canonical UTF-8 payload byte 양쪽에서 제한한다. Stalled consumer나 burst가 sole App Server reader를 block하거나 silent drop을 일으키지 않고, 한 번의 typed overflow와 waiter settlement를 거쳐 bounded bridge cleanup으로 이어질 수 있는 Python-side contract를 만든다.

## Spec Traceability

- User stories: 2, 5
- Implementation contract: Source-Guided Router Corrections 3, package-private budgets, Failure Behaviour

## Slice-Specific Constraints

- Spec의 per-route, route-count, aggregate item/byte default를 package-private/test-injectable하게 구현한다.
- Login route count는 active와 pending을 각각 8개로 제한한다. Aggregate는 현재 bridge가 채택한 login, turn과 global route만 소유하며 private goal-operation queue는 이 slice에서 채택하거나 무경계 상태로 노출하지 않는다.
- Payload byte는 parent spec이 정한 canonical compact `method`/`params` JSON envelope의 UTF-8 길이로 계산한다. Raw JSONL frame 크기나 Python object의 추정 크기를 대신 사용하지 않는다.
- Pending→active 이동은 double count하지 않고 dequeue/unregister/fail-all은 budget을 반환한다.
- Sole reader는 full queue에서 대기하지 않는다. Unrelated scope의 진행을 한 scope가 막지 않는다.
- Overflow는 silent eviction이나 warning-only가 아니라 outstanding response와 채택한 notification route waiter를 깨우는 sticky typed terminal이다. Overflow 뒤 등록하거나 읽는 waiter도 영구 대기하지 않고 같은 terminal을 관찰한다.
- Python router bound만 다룬다. Python bridge stdout 및 Node operation queue는 후속 ticket 소유다.
- Ticket 002의 FIFO correction과 public conversation API를 보존한다.

## Acceptance Criteria

- [ ] Login, active turn, pending turn, global 및 adopted-route aggregate item/byte accounting이 spec default와 작은 injected limit에서 동작한다.
- [ ] Exact boundary 값은 성공하고 다음 enqueue가 deterministic overflow를 만든다.
- [ ] Pending replay, dequeue, unregister와 failure cleanup 뒤 accounting leak이 없다.
- [ ] Stalled A scope overflow 전까지 unrelated B scope가 진행하며 sole reader가 queue put에서 block하지 않는다.
- [ ] Overflow가 response/turn/login/global waiter와 overflow 뒤의 새 waiter를 깨우고 process cleanup을 호출할 수 있는 `buffer_overflow` typed failure로 전달된다.
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
