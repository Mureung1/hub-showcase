# 006 — Preserve one native turn through the Node runtime seam

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

`CodexChatRuntime` Node interface가 verified package-private Python bundle을 시작하고 native thread, turn stream, interrupt, release와 graceful close를 private bridge 위에 보존한다. Nominal 및 response-last actual-child T0와 response 전후 process loss를 통해 public correlation과 mutation-outcome 경계를 먼저 고정한다.

## Spec Traceability

- User stories: 1, 2, 3, 4, 5
- Implementation contract: `@ay-ple/codex-chat-runtime`, Bridge Protocol and Lifecycle, Failure Behaviour

## Slice-Specific Constraints

- Production factory는 absolute verified bundle root만 사용하며 system Python, ambient `PATH`, source submodule로 fallback하지 않는다.
- Production manifest가 immutable unpatched provenance와 ordered router+bounds patch digest를 모두 갖지 않으면 spawn 전에 거부한다.
- Node는 sole stdout byte-framer, serialized stdin writer와 exact `bridgeRequestId` correlation을 소유한다.
- `.`, `./contract`, `./testing` export는 Node runtime, browser-safe contract와 deterministic fake를 분리한다.
- Pre-response process loss는 `unknownOutcome`; acceptance 뒤 transport loss는 `runtime.failed`이며 mutation을 auto-retry하지 않는다.
- 이번 ticket은 valid frames와 graceful `close_ack` path를 소유한다. Adversarial environment, queue bounds, malformed/duplicate frame과 kill escalation은 Ticket 007이 소유한다.

## Acceptance Criteria

- [x] Exact production bundle manifest, ordered patch digest와 binary/version drift가 spawn 전에 fail closed한다.
- [x] Public interface가 native thread/turn/item identity와 allowlisted FIFO event를 변형 없이 보존한다.
- [x] Nominal actual-child T0가 thread, streamed AgentMessage와 authoritative terminal을 interface를 통해 완료한다.
- [x] Response-last actual-child T0가 early AgentMessage/terminal을 잃거나 재정렬하지 않는다.
- [x] Response 전 Python/App Server crash는 once-only `unknownOutcome`, acceptance 뒤 crash는 once-only `runtime.failed`로 수렴한다.
- [x] Distinct bridge request와 event correlation이 concurrent interrupt에서도 섞이지 않는다.
- [x] Unknown command/malformed-input fatal과 normal `close_ack`가 actual-child 경계에서 정확히 한 번 관찰된다.
- [x] Graceful `close()`가 idempotent하며 Python `AsyncCodex.close()` 뒤 child exit와 pipe drain을 기다린다.
- [x] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Node runtime unit tests, nominal/response-last actual-child T0, pre/post-acceptance crash tests
- Repository checks: runtime workspace test/typecheck/build, exact package verifier, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: exact local fake only; ambient auth/provider 사용 금지

## Blocked By

- [005-persistent-python-bridge.md](005-persistent-python-bridge.md) — Stream a native turn through the persistent Python bridge

## Starting Points

- Parent spec `CodexChatRuntime` interface와 failure table
- Python bridge private protocol
- Prototype correlation tests at the archive ref

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| Public seam | `createCodexChatRuntime()`과 `CodexChatRuntime`의 native thread/turn stream, interrupt, local release, idempotent close를 구현했다. `./contract`는 browser-safe native ID/event만, `./testing`은 같은 interface의 deterministic fake만 공개한다. |
| Verified startup | Tracked canonical manifest와 materialized manifest의 byte equality, exact source/runtime/Python/ordered patch identity, complete bundle roster·mode·symlink containment을 spawn 전에 검증한다. System Python, ambient `PATH`와 source checkout fallback은 없다. Current bundle roster SHA-256은 `c313f68f714dee5e5b3aaf48e4b2e349a37753a79340801e7a0cc79eb1cabdf9`다. |
| Correlation과 failure | SDK initialize 뒤 private `ready`, serialized stdin과 sole stdout byte-framer를 사용한다. Native identity와 FIFO를 보존하고 caller input을 dispatch 전에 snapshot한다. Python/App Server의 response 전 loss는 `unknownOutcome`, acceptance 뒤 loss는 once-only `runtime.failed`이며 synthetic success·retry가 없다. |
| Close | `close_ack`, clean child exit code, no signal과 stdout/stderr drain을 모두 기다린다. Startup fatal도 public factory rejection 전에 child cleanup을 기다린다. Deadline과 escalation은 Ticket 007에 남긴다. |
| Verification | Node unit 42 assertions, Node actual-child 13, Python bridge actual-child 16, bridge unit 5, production bundle 23와 provenance 17이 통과했다. Official SDK suite는 146 passed/38 skipped였고 exact/router, package test·typecheck·build, root test·typecheck·build와 Inspector lint가 green이다. |
| Review | Fixed point `6d1abd83bf13f5f3b250b01e190029ae2ce5d876` 이후 Source·Standards·Spec 독립 리뷰가 각각 0 actionable findings로 종료됐다. Spec review가 찾은 native App Server loss 공백은 `fc12f65a`에서 pre/post-response actual-child oracle로 닫았다. |
| Deferred | Environment scrub, Node queue bound·deadline, malformed/duplicate output hardening, bounded stderr와 process-group terminate/kill escalation은 Ticket 007 소유다. Server·Inspector·Chat UI와 root orchestration은 아직 이 package에 연결되지 않았고 live provider는 실행하지 않았다. |
