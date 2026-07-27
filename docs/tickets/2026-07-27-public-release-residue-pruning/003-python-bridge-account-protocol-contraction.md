# 003 — Python bridge의 login·logout protocol을 제거한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-public-release-residue-pruning.md`

## What It Delivers

Persistent Python bridge가 current workspace product Runtime이 실제 호출하는 account read와 product command만 처리한다. Dormant Browser login attempt·cancel·release·logout state machine이 사라지고, global Codex account는 read-only readiness authority로만 관찰된다.

## Spec Traceability

- User stories: 1, 3
- Implementation contract: Module Responsibilities and Seams, Interfaces and Invariants, Data and State Flow, Failure Behaviour

## Slice-Specific Constraints

- 이 ticket과 Ticket 004는 한 integration sequence다. 이 ticket은 tracked bridge source를 축소하되 exact production manifest·ignored bundle 재고정은 Ticket 004가 소유한다.
- `read_account`와 official fresh account projection은 유지한다.
- Python command codec, dispatch, request lease 분류, pending login state와 cleanup에서 start/status/cancel/release/logout family를 제거한다.
- Removed command 입력은 strict unknown-command protocol failure로 닫히며 historical lifecycle을 실행해서는 안 된다.
- Account token, email, raw provider error와 SDK private identity를 새 frame이나 log에 추가하지 않는다.
- Product Turn, Plan user input, model catalog, interrupt, release, close와 stdout bound·fatal settlement behavior를 바꾸지 않는다.
- Upstream SDK snapshot 내부의 official login API는 삭제하지 않는다. AY-PLE-owned bridge adapter와 its tests만 current consumer에 맞게 축소한다.
- Exact patch file, patched-source manifest와 production manifest는 Ticket 004 전까지 수정하지 않는다. Repository-wide exact artifact gates는 Ticket 004와 final integration ticket이 약속한다.

## Acceptance Criteria

- [x] Python private protocol의 command union과 strict decoder에서 Browser login start/status/cancel/release와 logout이 사라진다.
- [x] Bridge Runtime에서 login attempt reservation·watcher·deadline·settlement·logout handler와 cleanup state가 제거된다.
- [x] `read_account`가 fresh official account read를 `signed_out | chatgpt | unsupported`로 계속 projection한다.
- [x] Removed command fixture는 unknown-command fail-closed behavior를 증명한다.
- [x] Python bridge unit·source actual-child suite에서 obsolete lifecycle cases가 제거되고 account read·product operation·close regression이 green이다.
- [x] Fake App Server와 journal expectation에 managed lifecycle method가 남지 않는다.
- [x] Ruff check·format과 tracked bridge source tests가 통과한다.
- [x] Source와 active tests에서 removed Python command·state identifier의 non-historical reference가 0건이다.

## Verification

- Targeted test or command:
  - `npm run test:bridge-unit -w @ay-ple/codex-chat-runtime` — 통과, 8 tests
  - `npm run test:bridge -w @ay-ple/codex-chat-runtime` — 통과, tracked `worker.py`를 직접 사용한 23 actual-child tests
  - `npm run check:bridge -w @ay-ple/codex-chat-runtime` — Ruff check·format 통과
  - `npm test -w @ay-ple/codex-chat-runtime` — 통과
  - Removed Python identifier·Fake App Server method `rg` scan — state·handler reference 0건. Removed command 문자열은 strict negative fixture에만 남는다.
- Repository checks:
  - `npm test` — 통과
  - `npm run typecheck` — 통과
  - `npm run build` — 통과
  - `npm run lint -w @ay-ple/chat-shell` — 통과
  - `npm run check:docs-links` — 통과
- Manual or live smoke:
  - 없음. Patch stack, canonical manifest, ignored materialized production bundle과 exact artifact gates는 Ticket 004에 명시적으로 defer했다.

## Result

Tracked Python bridge의 account command를 fresh `read_account` 하나로 닫고 Browser login start/status/cancel/release와 logout codec·dispatch·lease 분류, attempt reservation·watcher·deadline·settlement·cleanup을 제거했다. Removed command는 `unknown_command` fatal로 닫히며 actual-child journal은 App Server lifecycle method를 호출하지 않음을 증명한다. Fake App Server에서 managed account method와 state mutation을 제거했고, 전체 survivor actual-child suite가 stale bundled worker가 아니라 tracked bridge source를 실행하도록 고정했다. Fresh account는 `signed_out | chatgpt | unsupported`로만 projection하고 product Turn·Plan interaction·model catalog·interrupt·release·close·bounded failure regression을 유지했다. Standards·Spec 병렬 리뷰 후 source actual-child와 journal expectation finding을 수정했고 후속 리뷰 결과 남은 finding은 없다. 구현 commit은 `c6bac8585`, review-fix commit은 `c3358ce66`이다.

## Blocked By

- `docs/tickets/2026-07-27-public-release-residue-pruning/002-node-runtime-managed-account-contraction.md` — Node Runtime의 managed account·auth-only 계약을 제거한다

## Starting Points

- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/scripts/test_python_bridge.py`
- `packages/codex-chat-runtime/scripts/fake_python_bridge_app_server.py`
- `packages/codex-chat-runtime/src/bridge-protocol.unit.test.ts`
- `packages/codex-chat-runtime/src/production-bundle.ts`
