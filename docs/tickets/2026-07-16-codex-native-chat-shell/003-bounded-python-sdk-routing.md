# 003 — Bound official SDK notification routing

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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
- Enqueue나 active/pending route registration의 overflow는 silent eviction이나 warning-only가 아니라 모든 outstanding response waiter와 채택한 notification route의 현재·미래 waiter를 process-wide로 깨우는 sticky typed terminal이다. 같은 route의 여러 waiter도 영구 대기하지 않고 같은 terminal을 관찰한다.
- Package-private read-only usage snapshot은 accounting test에만 사용하며 product API가 아니다. Terminal transition은 retained notification과 usage를 모두 0으로 만든다.
- Python router bound만 다룬다. Python bridge stdout 및 Node operation queue는 후속 ticket 소유다.
- Ticket 002의 FIFO correction과 public conversation API를 보존한다.

## Acceptance Criteria

- [x] Login, active turn, pending turn, global 및 adopted-route aggregate item/byte accounting이 spec default와 작은 injected limit에서 동작한다.
- [x] Exact boundary 값은 성공하고 다음 enqueue가 deterministic overflow를 만든다.
- [x] Pending replay, dequeue, unregister와 failure cleanup 뒤 retained notification이나 accounting leak이 없다.
- [x] Stalled A scope overflow 전까지 unrelated B scope가 진행하며 sole reader가 queue put에서 block하지 않는다.
- [x] Overflow가 response/turn/login/global waiter와 overflow 뒤의 새 waiter를 깨우고 process cleanup을 호출할 수 있는 `buffer_overflow` typed failure로 전달된다.
- [x] Burst/stalled-consumer actual-child tests와 complete official suite가 green이다.
- [x] Patch ledger와 patched-source verification manifest가 ordered router+bounds source digest를 반영한다.
- [x] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: router accounting/unit tests, burst/stalled-consumer actual-child tests, official suite
- Repository checks: exact source/package verification, workspace typecheck/build, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음.

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 완료일 | 2026-07-16 |
| Router correction | Immutable unpatched snapshot에는 손대지 않고 ordered `0002-bounded-notification-routing.patch`로 non-blocking bounded route와 sticky `buffer_overflow` terminal을 추가했다. Source review에서 찾은 malformed response decode waiter 유실과 complete accounting oracle은 후속 `0003-router-review-corrections.patch`로 고정했다. |
| Default budget | Turn 4,096 items/16 MiB와 active·pending route 64개씩, login 256 items/1 MiB와 active·pending route 8개씩, global 1,024 items/4 MiB, adopted aggregate 8,192 items/64 MiB를 package-private default로 구현했다. |
| Accounting gate | Canonical `{method, params}` UTF-8 byte, pending→active no-copy move, dequeue·unregister·global consume와 retained multi-scope failure를 검증한다. Terminal 뒤 aggregate, turn, login, global item·byte, route와 waiter를 포함한 16개 usage field가 모두 0이다. |
| Actual-child gate | Default A route는 4,096개까지 유지되는 동안 unrelated B가 완료되고 4,097번째 candidate에서 response·turn·login·global current/future waiter가 같은 terminal로 수렴한다. 별도 14-case injected matrix가 active/pending turn, login, global, aggregate item·byte와 active/pending turn·login route-count 경계를 각 process tree에서 검증한다. |
| Cleanup gate | Shared process oracle이 worker와 fake App Server의 process group을 bounded TERM→KILL path로 reap한다. Overflow trace는 candidate attempt 전에 기록하고 typed worker result가 실제 ingress overflow를 증명해 cleanup race를 제거했으며 router gate 3회 연속 green을 확인했다. |
| Provenance | Ordered `0001 → 0002 → 0003` immediate preimage/postimage, declared two-file path, patch digest와 final 88-file roster/tree digest를 `patched-source.json`에서 재현한다. Provenance unit 17개와 deterministic clean build 2회가 green이다. |
| Official gate | Patched official Python suite `145 passed, 38 skipped`; targeted router unit 34개와 Ruff check/format green. Real-provider test와 live smoke는 명시적으로 미실행했다. |
| Repository gate | Response-last actual-child 3개, bounded actual-child 2개(14 matrix subcase 포함), package build/typecheck, root test/typecheck/build, Inspector lint, local Markdown link와 fixed-point `git diff --check`가 green이다. |
| 리뷰 | 최종 implementation checkpoint에서 Source·Standards·Spec focused re-review 각각 actionable finding `0`건. |

## Blocked By

- [002-response-last-router-correction.md](002-response-last-router-correction.md) — Preserve response-last turn events and terminal

## Starting Points

- Patched `openai_codex/_message_router.py`
- Ticket 002 response-last fixture
- Parent spec의 package-private budget table
