# 008 — Expose one native chat stream through the AY-PLE Server

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

기존 AY-PLE Server가 developer Runtime Harness를 건드리지 않고 `/api/codex-chat/*`를 additive하게 제공한다. Browser는 한 transient native thread를 만들고 하나의 POST NDJSON response에서 turn acceptance, AgentMessage와 terminal을 순서대로 받으며 interrupt와 shutdown lifecycle을 같은 injected runtime interface로 사용할 수 있다.

## Spec Traceability

- User stories: 1, 2, 3, 4, 5
- Implementation contract: AY-PLE Server, HTTP Contract and Data Flow, Failure Behaviour, Compatibility and Migration

## Slice-Specific Constraints

- Chat composition은 optional이다. Absent/partial/invalid config가 기존 Server/Inspector startup을 막지 않고 closed status union과 `503`으로만 보인다.
- Chat body parser는 existing global parser 전에 isolated하게 mount하고 original text를 보존하며 exact 131,072 UTF-8 byte limit을 적용한다.
- Mutation은 loopback 및 configured/absent local Origin만 허용한다.
- Turn header는 `startTurn()` response 뒤에만 commit한다. Pre-acceptance failure는 JSON, 이후 failure는 final NDJSON frame이다.
- Server process 전체에서 current transient thread와 active turn을 하나로 제한한다. 이는 App Server global concurrency contract가 아니다.
- Browser abort phase별 ownership, interrupt/drain 또는 unknown-outcome process cleanup을 구현한다.
- HTTP listener와 runtime close-once를 소유하는 additive application lifecycle factory를 둔다.

## Acceptance Criteria

- [ ] Status matrix가 모든 variant에 fixed `approvalMode: deny_all`과 `sandbox: read_only`를 포함하고, verified variant의 `sourceCommit`/`runtimeVersion`, `unavailable.reason`, `failed.failureCode`를 exact closed shape로 paths/secrets 없이 반환한다.
- [ ] Thread endpoint가 native response `threadId`를 반환하고 browser policy/cwd override를 거부한다.
- [ ] A terminal 뒤 new conversation은 `releaseThread(A)`를 한 번 호출한 뒤 distinct B identity를 만들며 A를 archive/delete하지 않는다. Active A가 있으면 기존 stream을 유지한 채 `409 active_turn`이다.
- [ ] Turn endpoint가 acceptance-first NDJSON과 allowlisted FIFO event를 backpressure-aware하게 stream한다.
- [ ] Interrupt endpoint는 native response 뒤 `202`를 반환하고 stream terminal을 authoritative하게 유지한다.
- [ ] Validation, origin, unavailable, unknown identity, active-turn conflict와 pre/post-acceptance error mapping이 spec과 일치한다.
- [ ] Response 전후 browser disconnect가 unseen background turn을 남기지 않는다.
- [ ] Server shutdown이 새 chat request를 막고 HTTP close 뒤 runtime `close()`를 정확히 한 번 await한다.
- [ ] Existing `/api/runtime/*`, persistence, Server tests와 Inspector contract가 unchanged green이다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Server contract/process tests with `./testing` runtime fake
- Repository checks: runtime/server test/typecheck/build, existing Server suite, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음.

## Blocked By

- [007-node-runtime-hardening.md](007-node-runtime-hardening.md) — Harden Node supervision and process-tree cleanup

## Starting Points

- `apps/server/src/server.ts`
- `apps/server/src/testing/test-server.ts`
- `@ay-ple/codex-chat-runtime/testing`
