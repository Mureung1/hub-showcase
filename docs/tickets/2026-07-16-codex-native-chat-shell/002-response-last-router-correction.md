# 002 — Preserve response-last turn events and terminal

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[Codex-native Chat Shell 첫 수직 흐름](../../specs/2026-07-16-codex-native-chat-shell.md)

## What It Delivers

Exact official SDK가 합법적인 response-last `turn/start` interleaving에서도 early AgentMessage observation과 authoritative `turn/completed`를 잃지 않고 ingress FIFO로 replay하도록 만든다. 먼저 Ticket 001 unpatched artifact의 terminal loss를 bounded actual-child RED gate로 고정하고, public API를 바꾸지 않는 최소 `MessageRouter` correction으로 같은 gate와 official suite를 green으로 만든다.

## Spec Traceability

- User stories: 2, 6
- Implementation contract: Source-Guided Router Corrections 1–2, Interfaces and Invariants

## Slice-Specific Constraints

- Fake App Server는 OS child로 실행하고 `turn/started`, AgentMessage delta/completed, `turn/completed`, matching `turn/start` response 순서를 결정적으로 보낸다.
- Unpatched failure는 outer subprocess deadline과 process-group cleanup으로 hang 없이 증명한다.
- Correction은 early terminal을 pending FIFO에 보존하고, registration lock 안에서 pending replay가 끝난 queue만 active route로 공개해야 한다.
- 이번 ticket은 unbounded queue를 `put_nowait`으로 유지한다. Item/byte bound와 overflow는 Ticket 003이 소유한다.
- Tombstone, contradiction lattice, post-terminal policing이나 unrelated SDK API 변경을 추가하지 않는다.
- Patch ledger는 exact base, changed handwritten source, regression oracle와 upstream-followable diff를 기록한다.

## Acceptance Criteria

- [x] Unpatched exact SDK가 response-last actual-child fixture에서 bounded expected failure를 재현하고 모든 process를 reap한다.
- [x] Router unit test가 early delta/item/terminal FIFO와 pending cleanup을 검증한다.
- [x] Registration boundary에서 live event가 staged event를 추월하지 못함을 concurrency regression으로 검증한다.
- [x] Patched SDK가 같은 actual-child fixture에서 native IDs와 exact event order를 보존하고 첫 matching terminal에서 끝난다.
- [x] Complete aligned official suite, Ruff, exact package verifier가 green이다.
- [x] Public `AsyncCodex`/`AsyncTurnHandle` signature와 bridge/product surface는 바뀌지 않는다.
- [x] Source·Standards·Spec review findings가 0건이다.

## Verification

- Targeted test or command: router unit tests, response-last actual-child test, official Python suite
- Repository checks: Ticket 001 package verification, workspace typecheck/build, non-mutating local Markdown link check, `git diff --check`
- Manual or live smoke: 없음. Purpose-built fake child만 사용한다.

## Implementation Outcome

| 항목 | 결과 |
| --- | --- |
| 완료일 | 2026-07-16 |
| Correction | Immutable unpatched snapshot에는 손대지 않고 ordered `0001-response-last-router.patch` overlay를 추가했다. Pending terminal을 FIFO에 보존하고 registration lock 안에서 replay를 끝낸 뒤 active route를 공개한다. |
| Router gate | Unpatched response-last는 full flush/response handshake 뒤 bounded hang으로 재현됐고 worker·fake process group을 reap했다. Patched public `AsyncCodex` 경로는 native thread·turn·item ID, ingress order와 matching terminal 1회를 보존했다. Broken pre-handshake negative gate도 unconditional reap을 증명했다. |
| Unit gate | Patch-owned aligned official tests 2개가 early delta/item/terminal replay·pending cleanup과 registration 중 live non-overtake를 직접 검증한다. Package-owned duplicate unit은 만들지 않았다. |
| Provenance | Zero-context patch를 immutable 88-file preimage manifest, declared changed paths, patch digest와 full patched roster/tree digest 사이에서 결정적으로 재생성·검증한다. `patched-source.json`은 source-only evidence이며 production wheel manifest가 아니다. |
| Official gate | Patched official Python suite `125 passed, 38 skipped`; real-provider test는 명시적으로 미실행; Ruff check/format green. |
| Repository gate | Actual-child 3개와 targeted router unit 2개, provenance unit 17개, package build/typecheck, root test/typecheck/build, Inspector lint, local Markdown link와 fixed-point `git diff --check`가 green이다. |
| 리뷰 | Source·Standards·Spec focused re-review 각각 actionable finding `0`건. |

## Blocked By

- [001-exact-official-sdk-source.md](001-exact-official-sdk-source.md) — Materialize the exact official Python SDK baseline

## Starting Points

- `references/openai-codex/sdk/python/src/openai_codex/client.py`
- `references/openai-codex/sdk/python/src/openai_codex/_message_router.py`
- `references/openai-codex/sdk/python/tests/test_client_rpc_methods.py`
- Parent spec의 Source-Guided Router Corrections
