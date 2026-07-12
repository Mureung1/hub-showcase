## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent

`docs/specs/2026-07-10-runtime-harness-hardening.md`

## What to build

긴 run의 output과 debug evidence를 bounded write rate로 checkpoint하고, server restart 때 stored `running` 또는 `cancelling` run을 partial evidence가 보존된 normalized `failed` run으로 복구한다. Normal lifecycle은 persist-before-publish ordering을 유지하고, adapter process나 Codex thread를 재개하지 않는다. Runtime Inspector와 Playwright는 recovered run을 일반 failed history처럼 검사할 수 있어야 한다.

대상 user stories: 7-14, 26, 38.

## Acceptance criteria

- [x] Output delta와 debug evidence는 subscriber와 in-memory log에 즉시 반영되면서 per-run serialized write queue에서 최대 100ms마다 최신 snapshot 하나로 checkpoint된다.
- [x] 지속 streaming 중에도 checkpoint가 주기적으로 발생하고 trailing debounce 때문에 terminal까지 무기한 지연되지 않는다.
- [x] Cancelling 또는 terminal transition은 pending streaming write를 먼저 flush하며, persisted snapshot은 해당 시점까지의 output, debug evidence와 event sequence를 포함한다.
- [x] `started`, `cancelling`, `completed`, `cancelled`, `failed` transition은 정상 storage 상태에서 save 성공 뒤 caller, subscriber와 terminal waiter에 공개된다.
- [x] Hydration이 stored `running`과 `cancelling` record를 발견하면 adapter를 실행하거나 resume하지 않고 다음 sequence의 normalized `failed` event를 추가한다.
- [x] Recovered run은 기존 prompt, partial output, normalized events와 debug evidence를 보존하고 error를 `Runtime interrupted by server restart`로 기록한다.
- [x] Recovery debug evidence가 previous status와 recovery reason을 기록하고, recovered snapshot이 저장된 뒤에만 kernel과 server가 ready가 된다.
- [x] Runtime Inspector는 recovered run을 failed history item으로 표시하고 선택 시 partial transcript, failure와 debug evidence를 보여준다.
- [x] Server integration test가 `running`과 `cancelling` snapshot의 recovery, sequence continuity와 persisted recovery result를 모두 검증한다.
- [x] Playwright가 streaming Fake run 도중 server를 재시작한 뒤 browser reload를 통해 recovered failed run과 running residue 부재를 검증한다.
- [x] Existing cancellation, failure, completed lifecycle와 live Codex parity semantics가 회귀하지 않는다.

## Implementation outcome

| 항목 | 결과 |
| --- | --- |
| 완료일 | 2026-07-11 |
| 구현 | Run별 100ms fixed-window checkpoint와 transition flush ordering을 추가하고, stored `running`/`cancelling` run을 partial evidence가 보존된 normalized `failed`로 ready 이전에 복구한다. |
| 커밋 | `d8cd251`, `3f22320` |
| 검증 | Continuous streaming/checkpoint ordering test, running/cancelling recovery integration, 실제 PID가 바뀌는 browser restart gate와 live Codex parity 통과 |
| 리뷰 | Standards 및 Spec actionable finding 0건 |

## Blocked by

- `docs/tickets/2026-07-10-runtime-harness-hardening/002-completed-run-survives-server-restart.md`
