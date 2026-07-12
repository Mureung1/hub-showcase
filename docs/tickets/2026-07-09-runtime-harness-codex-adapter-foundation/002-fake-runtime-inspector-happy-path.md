## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent

`docs/specs/2026-07-09-runtime-harness-codex-adapter-foundation.md`

## What to build

FakeRuntimeAdapter를 사용해 Runtime Inspector에서 첫 run happy path를 끝까지 닫는다. 개발자는 Inspector에서 fake adapter를 선택하고 prompt를 실행한 뒤, transcript-like output, normalized run event, run log, run history를 한 화면에서 확인할 수 있어야 한다.

이 slice의 중심 seam은 AgentRuntimeKernel이다. Inspector는 Codex-specific protocol을 알지 않고, run-centric runtime behavior와 browser-safe server stream을 통해 상태를 관찰한다.

## Acceptance criteria

- [x] Runtime Inspector에서 `fake` adapter를 선택하고 prompt run을 시작할 수 있다.
- [x] Fake run이 `started`, output delta 또는 incremental output, `completed`에 해당하는 normalized event를 발생시킨다.
- [x] Inspector가 prompt와 output을 transcript-like 형태로 보여준다.
- [x] Inspector가 normalized event stream과 run log/history를 보여준다.
- [x] 새 topology에서 관련 package/app의 typecheck 또는 build 검증이 통과한다.
- [x] 이 slice는 Codex app-server, SourceSelection, StatePatch, Review, TrustedState를 구현하지 않는다.

## Blocked by

- `docs/tickets/2026-07-09-runtime-harness-codex-adapter-foundation/001-package-first-workspace-topology.md`
