## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

`docs/prds/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

Fake runtime에서 cancellation과 failure lifecycle을 deterministic하게 재현한다. 개발자는 Runtime Inspector에서 진행 중인 fake run을 취소하거나 실패 시나리오를 실행하고, UI 상태와 normalized event/log가 `cancelled` 또는 `failed`로 일관되게 정리되는 것을 확인할 수 있어야 한다.

이 slice는 이후 Codex `turn/interrupt`와 failure mapping을 검증하기 위한 기준 동작을 만든다.

## Acceptance criteria

- [ ] 실행 중인 fake run을 Inspector에서 취소하면 normalized `cancelled` state가 기록된다.
- [ ] 취소 후 Inspector가 더 이상 해당 run을 running 상태로 표시하지 않는다.
- [ ] fake failure 시나리오가 normalized `failed` state와 사람이 읽을 수 있는 error message를 남긴다.
- [ ] cancel/failure 모두 run log와 run history에서 확인 가능하다.
- [ ] AgentRuntimeKernel 테스트 또는 이에 준하는 검증이 external run lifecycle behavior를 기준으로 통과한다.
- [ ] 이 slice는 Codex adapter cancellation 구현을 포함하지 않는다.

## Blocked by

- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/002-fake-runtime-inspector-happy-path.md`
