# 005 — Stream a native turn through the persistent Python bridge

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Public `AsyncCodex`를 소유하는 persistent Python worker가 private NDJSON command를 받아 native thread를 시작하고 text turn의 allowlisted AgentMessage와 authoritative terminal을 stream한다. Same process에서 release, interrupt와 close command를 처리하며 native thread/turn/item identity를 remap하지 않는다.

## Spec Traceability

- User stories: 1, 2, 3, 4
- Implementation contract: Python bridge, Interfaces and Invariants, Bridge Protocol and Lifecycle

## Slice-Specific Constraints

- Worker는 official public `AsyncCodex`, `AsyncThread`, `AsyncTurnHandle`만 conversation baseline으로 사용한다.
- Exactly one command reader와 bounded stdout writer를 유지하며 stream 중 별도 interrupt command를 받을 수 있다.
- Private frame은 1 MiB를 넘지 않고 transport-only `bridgeRequestId`를 Codex `RequestId`나 browser ID로 노출하지 않는다.
- Event projection은 spec의 exact method/generated model table만 허용한다. Raw JSON-RPC, Pydantic model, unadopted item과 diagnostics는 밖으로 보내지 않는다.
- `deny_all + read_only`는 thread와 turn마다 explicit하다.
- Live thread cap은 idle terminal handle을 LRU release하고 active handle은 evict하지 않은 채 새 acquisition을 reject한다. Active turn cap도 새 acquisition을 reject하며 runtime fatal로 바꾸지 않는다.
- Stdout/router budget overflow만 typed process-wide fatal로 settle한다. Node supervision과 ambient environment scrub은 후속 ticket 소유다.

## Acceptance Criteria

- [ ] Worker가 initialize/initialized 뒤 native thread를 만들고 exact response identity를 반환한다.
- [ ] Text turn이 acceptance frame 뒤 AgentMessage delta/completed와 matching `turn.completed`를 FIFO로 stream한다.
- [ ] `turn.error` notification은 nonterminal `turn.error`, first matching `turn/completed`만 semantic terminal로 project한다.
- [ ] `interrupt` command가 stream reader를 막지 않고 native response를 반환한다.
- [ ] `release_thread`가 idle live handle만 버리고 native thread를 archive/delete하지 않는다.
- [ ] Injected live-thread cap 2에서 idle A/B의 recency를 갱신한 뒤 C가 exact least-recently-used handle만 release하며 native thread를 archive/delete하지 않는다.
- [ ] Existing B thread가 있는 active-turn cap 1에서 active A 중 B turn acquisition은 A를 evict하거나 runtime을 fatal로 만들지 않고 reject한다.
- [ ] Unknown command와 malformed/oversized input은 once-only fatal로 settle하고, normal close는 모든 work를 정산한 뒤 `close_ack`를 한 번 보낸다.
- [ ] Allowlisted event serialization 또는 stdout queue overflow가 typed fatal로 정산되며 duplicate result/event emission이 없다.
- [ ] Private protocol/unit 및 Python subprocess fake tests가 green이다.
- [ ] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: Python worker protocol tests and fake App Server subprocess test
- Repository checks: Python suite/Ruff, runtime workspace typecheck/build, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음.

## Blocked By

- [004-standalone-python-runtime-bundle.md](004-standalone-python-runtime-bundle.md) — Package the verified patched Python runtime bundle

## Starting Points

- Official `openai_codex/api.py`, `async_client.py`
- Exact generated notification models in the parent spec table
- Prototype bridge semantics at `prototype/codex-python-sdk-reuse@3b3fa9e0`
