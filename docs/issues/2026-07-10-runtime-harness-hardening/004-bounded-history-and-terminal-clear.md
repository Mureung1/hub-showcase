## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

`docs/prds/2026-07-10-runtime-harness-hardening.md`

## What to build

Runtime Diagnostic History를 terminal run 최대 100개와 terminal envelope 총 100 MiB로 제한하고, 개발자가 Runtime Inspector에서 terminal history를 명시적으로 비울 수 있게 한다. Retention과 clear는 disk와 AgentRuntimeKernel의 in-memory view를 함께 갱신하며 active run은 보존한다. Server environment가 path와 한도를 소유하고 Inspector에는 configuration UI를 추가하지 않는다.

대상 user stories: 15-20, 24, 33.

## Acceptance criteria

- [ ] Production 기본 retention은 terminal run 100개와 terminal envelope 104,857,600 bytes이며 server environment로 history directory, max runs와 max bytes를 override할 수 있다.
- [ ] Retention은 completed time, started time, run ID 순으로 가장 오래된 terminal record부터 제거하고 `running`과 `cancelling` snapshot은 자동 prune하지 않는다.
- [ ] Retention은 startup hydration/recovery 뒤와 terminal save 뒤 적용되며 작은 injected limit을 사용하는 deterministic test로 count와 byte behavior를 검증한다.
- [ ] Store save 결과가 pruned run ID를 kernel에 전달하고, 같은 durability operation 뒤 `listRuns`와 `getRunLog`에서도 제거된 run이 보이지 않는다.
- [ ] `DELETE /api/runtime/runs`가 terminal record만 disk와 memory에서 제거하고 `{ clearedRunIds }`를 반환한다.
- [ ] Active run이 있는 동안 history clear를 실행해도 해당 run, transcript, SSE와 adapter execution은 유지된다.
- [ ] Inspector History panel이 familiar trash icon과 tooltip을 가진 clear control을 제공하고 terminal history가 없으면 disabled 상태를 보인다.
- [ ] Clear 성공 뒤 history count, list와 selected terminal log가 server state에 맞게 즉시 갱신되며 active selection은 유지된다.
- [ ] Playwright가 여러 terminal run 생성, clear, empty terminal history와 active-run 보존을 real HTTP/UI 경계에서 검증한다.
- [ ] Retention 또는 clear가 RuntimeRunLog format, adapter contract와 student-facing WorkspaceHistory를 변경하지 않는다.

## Blocked by

- `docs/issues/2026-07-10-runtime-harness-hardening/003-streaming-checkpoints-and-interrupted-run-recovery.md`
