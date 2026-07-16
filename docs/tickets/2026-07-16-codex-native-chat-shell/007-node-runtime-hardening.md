# 007 — Harden Node supervision and process-tree cleanup

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

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

- [ ] Conflicting ambient credential/provider/HOME/PATH/dynamic-loader sentinel이 Python/App Server child에 전달되거나 사용되지 않는다.
- [ ] Exact boundary queue 값은 성공하고 다음 frame이 `buffer_overflow` fatal과 accounting cleanup을 만든다.
- [ ] Stalled consumer, oversized line, malformed JSON, duplicate response/event와 pending-work EOF가 모든 operation을 once-only settle한다.
- [ ] Spawn, response, stream idle/total과 close escalation deadline이 작은 injected value에서 deterministic하다.
- [ ] Normal close, Python crash, stubborn child와 pipe-inheriting descendant test가 complete drain 및 process-group disappearance를 증명한다.
- [ ] Repeated `close()`와 fatal/close race가 duplicate settlement, write-after-close 또는 orphan을 만들지 않는다.
- [ ] Browser-safe error에는 path, secret, stderr 또는 traceback이 노출되지 않는다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: environment/queue/deadline tests and process-tree lifecycle actual-child tests
- Repository checks: runtime workspace test/typecheck/build, exact package verifier, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: exact local fake only; provider/auth는 사용하지 않는다.

## Blocked By

- [006-node-runtime-nominal.md](006-node-runtime-nominal.md) — Preserve one native turn through the Node runtime seam

## Starting Points

- Ticket 006 supervisor와 private frame parser
- Prototype `child-lifecycle.ts` evidence at the archive ref
- Node `child_process` process-group semantics on macOS
