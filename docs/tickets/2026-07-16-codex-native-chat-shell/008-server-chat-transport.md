# 008 — Expose one native chat stream through the AY-PLE Server

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: /implement Ticket 009

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

- [x] Status matrix가 모든 variant에 fixed `approvalMode: deny_all`과 `sandbox: read_only`를 포함하고, verified variant의 `sourceCommit`/`runtimeVersion`, `unavailable.reason`, `failed.failureCode`를 exact closed shape로 paths/secrets 없이 반환한다.
- [x] Thread endpoint가 native response `threadId`를 반환하고 browser policy/cwd override를 거부한다.
- [x] A terminal 뒤 new conversation은 `releaseThread(A)`를 한 번 호출한 뒤 distinct B identity를 만들며 A를 archive/delete하지 않는다. Active A가 있으면 기존 stream을 유지한 채 `409 active_turn`이다.
- [x] Turn endpoint가 acceptance-first NDJSON과 allowlisted FIFO event를 backpressure-aware하게 stream한다.
- [x] Interrupt endpoint는 native response 뒤 `202`를 반환하고 stream terminal을 authoritative하게 유지한다.
- [x] Validation, origin, unavailable, unknown identity, active-turn conflict와 pre/post-acceptance error mapping이 spec과 일치한다.
- [x] Response 전후 browser disconnect가 unseen background turn을 남기지 않는다.
- [x] Server shutdown이 새 chat request를 막고 HTTP close 뒤 runtime `close()`를 정확히 한 번 await한다.
- [x] Existing `/api/runtime/*`, persistence, Server tests와 Inspector contract가 unchanged green이다.
- [x] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Server contract/process tests with `./testing` runtime fake
- Repository checks: runtime/server test/typecheck/build, existing Server suite, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음.

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 구현 checkpoint | `4297b0e1`에서 optional `/api/codex-chat/*` status/thread/turn/interrupt transport와 application lifecycle을 연결했고, `60c72e08`에서 disconnect·cleanup·signal 회귀와 module/test 구조를 보강했다. |
| Browser contract | Isolated exact JSON parser, 131,072 UTF-8 byte text limit, loopback/Origin guard, native ID passthrough, acceptance-first NDJSON FIFO와 backpressure-aware writer를 구현했다. |
| Conversation lifecycle | Server process당 transient thread와 active turn 하나를 유지한다. Pre-dispatch disconnect는 native mutation 없이 reservation을 해제하고, dispatch 이후 disconnect는 interrupt·bounded drain 또는 shared runtime cleanup으로 수렴한다. Cleanup 자체가 실패하면 safe `runtime_cleanup_failed` status를 남긴다. |
| Application ownership | `createServerApplication()`이 listener와 persistent Chat runtime을 close-once로 소유한다. Express-only `createServerApp()`은 Chat-disabled이며, signal shutdown은 application cleanup 뒤 원래 signal termination 의미를 복원한다. |
| 구조 | Runtime source/path preparation, transport-neutral conversation service, Express/NDJSON adapter와 composition facade를 분리했다. Contract/status/lifecycle/disconnect/writer suite와 공용 runtime/socket fixture도 별도 파일로 분리했다. |
| Verification | Server 79 tests, runtime/server test·typecheck·build, root `npm test`, `npm run typecheck`, `npm run build`, Inspector lint와 restart recovery E2E가 green이다. Local Markdown link check와 `git diff --check`도 통과했다. |
| Review | Fixed point `4b68948cf56dd9c0326e70a381890131a6728f8e` 대비 Source 0, Standards 0, Spec 0 findings다. 초기 pre-dispatch dispatch, lifecycle owner, cleanup failure 은폐와 oversized module/test findings를 환류한 뒤 최종 delta까지 재검토했다. |
| Residual | Ticket 범위대로 live provider smoke는 실행하지 않았다. Exact Python SDK/native-child 의미는 앞선 runtime actual-child gate에 의존하며 desktop Chat Shell consumer는 Ticket 009가 소유한다. |

## Blocked By

- [007-node-runtime-hardening.md](007-node-runtime-hardening.md) — Harden Node supervision and process-tree cleanup

## Starting Points

- `apps/server/src/server.ts`
- `apps/server/src/testing/test-server.ts`
- `@ay-ple/codex-chat-runtime/testing`
