# 006 — Preserve one native turn through the Node runtime seam

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

- [ ] Exact production bundle manifest, ordered patch digest와 binary/version drift가 spawn 전에 fail closed한다.
- [ ] Public interface가 native thread/turn/item identity와 allowlisted FIFO event를 변형 없이 보존한다.
- [ ] Nominal actual-child T0가 thread, streamed AgentMessage와 authoritative terminal을 interface를 통해 완료한다.
- [ ] Response-last actual-child T0가 early AgentMessage/terminal을 잃거나 재정렬하지 않는다.
- [ ] Response 전 Python/App Server crash는 once-only `unknownOutcome`, acceptance 뒤 crash는 once-only `runtime.failed`로 수렴한다.
- [ ] Distinct bridge request와 event correlation이 concurrent interrupt에서도 섞이지 않는다.
- [ ] Unknown command/malformed-input fatal과 normal `close_ack`가 actual-child 경계에서 정확히 한 번 관찰된다.
- [ ] Graceful `close()`가 idempotent하며 Python `AsyncCodex.close()` 뒤 child exit와 pipe drain을 기다린다.
- [ ] Source·Standards·Spec review findings가 0건이다.

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
