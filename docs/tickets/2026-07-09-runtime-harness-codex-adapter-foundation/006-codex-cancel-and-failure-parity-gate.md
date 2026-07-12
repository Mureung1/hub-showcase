## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent

`docs/specs/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

CodexRuntimeAdapter의 cancellation과 주요 failure mapping을 Fake runtime과 같은 normalized lifecycle로 맞춘다. 개발자는 Runtime Inspector에서 Codex run을 취소하고, spawn/init/turn failure를 관찰하며, 모든 경우가 동일한 run log format과 normalized state로 정리되는 것을 확인할 수 있어야 한다.

이 slice가 Week 1 product-layer gate다. 완료 전에는 SourceSelection, StatePatch, Review, TrustedState 구현으로 넘어가지 않는다.

## Acceptance criteria

- [x] Inspector에서 진행 중인 Codex run에 cancel을 요청할 수 있다.
- [x] Codex cancel은 공식 App Server lifecycle의 `turn/interrupt` 기반으로 수행된다.
- [x] cancel 이후 Codex final status 또는 interrupt completion이 normalized `cancelled` state로 기록된다.
- [x] missing binary, spawn failure, initialize failure, turn failure 중 구현 가능한 주요 failure가 normalized `failed` state로 mapping된다.
- [x] Fake와 Codex run log가 같은 normalized log format을 사용한다.
- [x] Inspector가 cancel/failure 이후 running state를 남기지 않는다.
- [x] 이 slice 완료 후 PRD의 CodexRuntimeAdapter parity gate를 만족했다는 demo 기준이 문서화된다.

## Completion / demo 기준

CodexRuntimeAdapter parity gate는 AY-PLE product-specific SourceSelection, StatePatch, Review, TrustedState 구현으로 넘어가기 전 Runtime Inspector에서 확인해야 하는 최소 기준이다.

| 항목 | Demo 기준 |
| --- | --- |
| Prompt lifecycle | 같은 Runtime Inspector에서 Fake와 Codex adapter 모두 prompt run을 시작하고 normalized `started`, `output_delta`, `completed` event와 run log를 확인한다. |
| Adapter-confirmed cancellation | Inspector/server의 기존 cancel 경로가 Codex run에 `turn/interrupt`를 보내고, matching `turn/completed` `interrupted` 흐름 또는 interrupt completion을 관측한 뒤에만 normalized `cancelled` 상태로 닫는다. |
| Cancellation failure evidence | `turn/interrupt` request failure 또는 interrupted completion timeout/missing은 성공한 cancellation처럼 보이지 않고 normalized `failed` 상태와 debug log evidence로 남는다. |
| Failure mapping | missing binary/spawn, initialize, `thread/start`, `turn/start`, failed turn completion, non-retryable Codex `error` notification, terminal 전 notification stream 종료가 normalized `failed` 상태와 debug log로 남는다. |
| Log parity | Fake와 Codex 모두 `RuntimeRunLog`의 `status`, `events`, `output`, `error`, `debugLog` 구조를 사용하며 Codex generated type은 runtime-core, server, inspector로 노출하지 않는다. |
| Inspector state | cancel 또는 failure 뒤 Runtime Inspector history/log가 terminal 상태를 표시하고 해당 run이 `running`으로 남지 않는다. Codex cancel 확인 중에는 non-terminal `cancelling` 상태를 표시할 수 있다. |

## Blocked by

- `docs/tickets/2026-07-09-runtime-harness-codex-adapter-foundation/003-fake-runtime-cancel-and-failure.md`
- `docs/tickets/2026-07-09-runtime-harness-codex-adapter-foundation/005-codex-runtime-adapter-prompt-parity.md`
