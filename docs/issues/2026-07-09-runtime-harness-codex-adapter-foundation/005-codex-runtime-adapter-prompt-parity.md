## Agent triage

- State: completed
- Surface: local-issue
- Next actor: none

## Parent

`docs/prds/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

CodexRuntimeAdapter가 Codex App Server의 thread/turn lifecycle을 사용해 Runtime Inspector에서 prompt run을 실행하게 한다. 개발자는 같은 Inspector에서 Fake와 Codex adapter를 바꿔가며 prompt를 실행하고, Codex raw notification이 Fake와 호환되는 normalized lifecycle event와 run log로 번역되는 것을 확인할 수 있어야 한다.

이 slice는 Codex prompt run parity의 happy path다. cancellation과 failure parity는 별도 slice에서 완성한다.

## Acceptance criteria

- [x] CodexRuntimeAdapter가 raw client를 통해 `thread/start`로 thread를 만들고 `turn/start`로 prompt input을 보낸다.
- [x] Codex App Server notification stream을 계속 읽고 raw/debug log에 남긴다.
- [x] `item/agentMessage/delta` 등 agent output notification에서 transcript-like output으로 표시할 text를 추출한다.
- [x] `turn/completed` 또는 이에 준하는 final notification을 normalized `completed` run state로 mapping한다.
- [x] Inspector에서 Fake와 Codex adapter 모두 prompt run happy path를 비교할 수 있다.
- [x] Runtime core consumer는 raw Codex type에 직접 의존하지 않는다.
- [x] 관련 typecheck/build 또는 smoke 검증이 통과한다.

## Blocked by

- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/002-fake-runtime-inspector-happy-path.md`
- `docs/issues/2026-07-09-runtime-harness-codex-adapter-foundation/004-codex-schema-and-raw-client-smoke.md`
