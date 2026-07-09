## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

`docs/prds/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

CodexRuntimeAdapter의 cancellation과 주요 failure mapping을 Fake runtime과 같은 normalized lifecycle로 맞춘다. 개발자는 Runtime Inspector에서 Codex run을 취소하고, spawn/init/turn failure를 관찰하며, 모든 경우가 동일한 run log format과 normalized state로 정리되는 것을 확인할 수 있어야 한다.

이 slice가 Week 1 product-layer gate다. 완료 전에는 SourceSelection, StatePatch, Review, TrustedState 구현으로 넘어가지 않는다.

## Acceptance criteria

- [ ] Inspector에서 진행 중인 Codex run에 cancel을 요청할 수 있다.
- [ ] Codex cancel은 공식 App Server lifecycle의 `turn/interrupt` 기반으로 수행된다.
- [ ] cancel 이후 Codex final status 또는 interrupt completion이 normalized `cancelled` state로 기록된다.
- [ ] missing binary, spawn failure, initialize failure, turn failure 중 구현 가능한 주요 failure가 normalized `failed` state로 mapping된다.
- [ ] Fake와 Codex run log가 같은 normalized log format을 사용한다.
- [ ] Inspector가 cancel/failure 이후 running state를 남기지 않는다.
- [ ] 이 slice 완료 후 PRD의 CodexRuntimeAdapter parity gate를 만족했다는 demo 기준이 문서화된다.

## Blocked by

- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/003-fake-runtime-cancel-and-failure.md`
- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/005-codex-runtime-adapter-prompt-parity.md`
