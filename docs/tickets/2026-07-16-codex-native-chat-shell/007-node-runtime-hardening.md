# 007 — Harden Node supervision and process-tree cleanup

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Ticket 006의 nominal `CodexChatRuntime`을 ambient environment isolation, byte/item bounds, deadlines와 full process-group cleanup으로 강화한다. Malformed output, stalled consumer, Python crash나 stubborn descendant가 모든 operation을 한 번만 settle하고 Python과 native App Server를 orphan 없이 drain, terminate, kill, reap하도록 만든다.

## Spec Traceability

- User stories: 2, 5
- Implementation contract: Bridge Protocol and Lifecycle, package-private budgets and deadlines, Failure Behaviour

## Slice-Specific Constraints

- Python spawn environment는 inherited environment를 복사하지 않고 reviewed allowlist로 새로 만들며 controlled homes/temp/fixed `PATH`만 전달한다.
- Node operation queue와 bounded stderr는 spec의 item/UTF-8 byte default를 test-injectable하게 구현한다.
- Malformed/oversized/duplicate correlated frame, EOF와 deadline은 silent drop이나 retry 없이 one runtime fatal로 settle한다.
- macOS process group에서 graceful close→SIGTERM→SIGKILL→pipe drain을 bounded하게 수행한다.
- Node는 native grandchild를 직접 `waitpid`한다고 주장하지 않는다. Python을 `AsyncCodex.close()`까지 유지하고 process group 전체가 사라졌음을 검증한다.
- Browser/Server나 AY-PLE domain policy를 이 package에 넣지 않는다.

## Acceptance Criteria

- [x] Conflicting ambient credential/provider/HOME/PATH/dynamic-loader sentinel이 Python/App Server child에 전달되거나 사용되지 않는다.
- [x] Exact boundary queue 값은 성공하고 다음 frame이 `buffer_overflow` fatal과 accounting cleanup을 만든다.
- [x] Stalled consumer, oversized line, malformed JSON, duplicate response/event와 pending-work EOF가 모든 operation을 once-only settle한다.
- [x] Spawn, response, stream idle/total과 close escalation deadline이 작은 injected value에서 deterministic하다.
- [x] Normal close, Python crash, stubborn child와 pipe-inheriting descendant test가 complete drain 및 process-group disappearance를 증명한다.
- [x] Repeated `close()`와 fatal/close race가 duplicate settlement, write-after-close 또는 orphan을 만들지 않는다.
- [x] Browser-safe error에는 path, secret, stderr 또는 traceback이 노출되지 않는다.
- [x] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: environment/queue/deadline tests and process-tree lifecycle actual-child tests
- Repository checks: runtime workspace test/typecheck/build, exact package verifier, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: exact local fake only; provider/auth는 사용하지 않는다.

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 구현 checkpoint | `af272bf4`에서 controlled child environment, bounded writer/event/stderr, deadline, safe terminal과 process-tree cleanup을 구현했다. |
| 환경 격리 | Caller가 명시한 canonical `HOME`, `CODEX_HOME`, `CODEX_SQLITE_HOME`, temp와 verified bundle 경로로 새 environment를 만들며 ambient credential/provider/Python/dynamic-loader 값을 상속하지 않는다. |
| Bound와 deadline | Operation당 4,096 frame/16 MiB, Node aggregate 8,192 frame/32 MiB, stderr 4,096 chunk/16 MiB를 기본값으로 고정했다. Spawn+initialize/response는 30초, stream idle/total은 15분/60분, graceful/terminate/post-kill은 각 2초이며 actual-child test에서만 축소 주입한다. |
| Protocol settlement | Invalid UTF-8, malformed/oversized frame, duplicate/late correlation, pending EOF와 queue/deadline failure가 silent drop 없이 process-wide terminal로 수렴한다. Coalesced chunk의 valid prefix는 먼저 처리하고 `close_ack` 뒤 application frame은 거부한다. |
| Cleanup | Valid bridge fatal에는 `AsyncCodex.close()` self-shutdown window를 보존한다. 나머지 실패와 close는 detached macOS process group의 physical pipe drain과 disappearance를 확인하고 필요하면 `SIGTERM` 뒤 `SIGKILL`로 올린다. Cleanup 실패도 pending operation과 active stream을 한 번만 settle한다. |
| Artifact | Canonical production bundle roster는 `6e9e88265c6925ac17ccb18acb34b6a82302bd0885433b8fe9a6c00f5ea65f39`이며 exact `0.144.4` verifier가 전후 동일성을 확인했다. |
| Package verification | Node unit 48/48, Node actual-child 45/45, Python bridge 16/16, official SDK 146 passed/38 provider-skipped, exact router/provenance, package test/typecheck/build와 Ruff가 green이다. |
| Repository verification | `npm test`, `npm run typecheck`, `npm run build`, Inspector lint, local Markdown link check와 `git diff --check`가 green이다. Provider/auth live smoke는 범위대로 실행하지 않았다. |
| Review | Fixed point `7389a897340c7db07f130ee595a3132a1526155b` 대비 Source 0, Standards 0, Spec 0 findings다. Standards의 초기 P3 중복 두 건은 canonical event validator와 공통 fake scenario harness로 환류한 뒤 재리뷰했다. |
| Deferred | Server/browser 연결과 live-provider conformance는 각각 Ticket 008 이후가 소유한다. 기존 `packages/runtime-codex`, `HeadlessCodexClientHost`, Server와 Inspector는 변경하지 않았다. |

## Blocked By

- [006-node-runtime-nominal.md](006-node-runtime-nominal.md) — Preserve one native turn through the Node runtime seam

## Starting Points

- Ticket 006 supervisor와 private frame parser
- Prototype `child-lifecycle.ts` evidence at the archive ref
- Node `child_process` process-group semantics on macOS
