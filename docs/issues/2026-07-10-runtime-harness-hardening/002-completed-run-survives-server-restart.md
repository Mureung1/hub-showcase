## Agent triage

- State: ready-for-agent
- Surface: local-issue
- Next actor: agent

## Parent

`docs/prds/2026-07-10-runtime-harness-hardening.md`

## What to build

Completed Fake run 하나가 AgentRuntimeKernel에서 server-owned per-run JSON snapshot으로 저장되고, 같은 history directory를 사용하는 server restart와 browser reload 뒤 Runtime Inspector에 다시 나타나는 첫 durable tracer를 만든다. 이 slice는 UUID, schema version 1 envelope, atomic snapshot, async hydration과 durability barrier를 happy path에 필요한 만큼 end-to-end로 연결한다. Adapter contract와 RuntimeRunLog의 normalized shape는 변경하지 않는다.

대상 user stories: 1-6, 10, 21, 22, 26, 31, 32, 38, 40.

## Acceptance criteria

- [ ] Runtime-core가 full RuntimeRunLog load, single-record save와 지정 run ID remove를 표현하는 persistence seam을 제공하고, deterministic in-memory implementation으로 kernel behavior를 테스트할 수 있다.
- [ ] AgentRuntimeKernel의 production construction은 async hydration을 완료한 뒤 ready instance를 반환하고, durability mutation은 async contract를 사용한다.
- [ ] 신규 run ID는 UUID이며 hydrate된 record나 process restart와 충돌하지 않는다.
- [ ] Started snapshot은 adapter 실행 전에 저장되고 completed snapshot은 terminal event 공개 및 waiter resolve 전에 저장된다.
- [ ] Server store가 `.ay-ple/runtime-harness/runs/<uuid>.json`에 schema version 1, ISO saved time과 self-contained RuntimeRunLog envelope를 저장한다.
- [ ] Snapshot은 same-directory temporary write, file flush와 rename을 통해 canonical record를 atomic하게 교체한다.
- [ ] Loader가 canonical JSON envelope와 filename/run ID 일치를 구조적으로 검증하며 started time 순서로 history를 hydrate한다.
- [ ] Server는 hydration이 성공하기 전에 listen하거나 ready response를 제공하지 않는다.
- [ ] 기존 run start success는 HTTP `201`과 `{ runId }` shape를 유지하고 history/log read API는 hydrate된 completed run을 반환한다.
- [ ] Runtime Inspector는 browser reload 뒤 server history를 다시 읽고 restart 전 completed run의 output, normalized events와 debug evidence를 표시한다.
- [ ] Playwright가 Fake run 완료, server stop/start, browser reload와 restored history selection을 같은 temporary history directory로 검증한다.
- [ ] FakeRuntimeAdapter와 CodexRuntimeAdapter는 persistence API에 의존하지 않으며 Codex-owned history나 SQLite를 읽지 않는다.
- [ ] Issue 001의 browser lifecycle scenario와 기존 live Codex parity command가 계속 통과한다.

## Blocked by

- `docs/issues/2026-07-10-runtime-harness-hardening/001-deterministic-inspector-lifecycle-browser-gate.md`
