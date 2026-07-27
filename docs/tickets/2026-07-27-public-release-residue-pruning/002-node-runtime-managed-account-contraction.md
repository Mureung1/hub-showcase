# 002 — Node Runtime의 managed account·auth-only 계약을 제거한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-public-release-residue-pruning.md`

## What It Delivers

`@ay-ple/codex-chat-runtime`의 Node production·testing surface가 workspace-only product Runtime 하나로 닫힌다. Current product는 global `CODEX_HOME`의 fresh Account Readiness를 계속 얻지만, Node caller는 더 이상 managed Browser login·logout이나 `auth-only` Runtime을 시작할 수 없다.

## Spec Traceability

- User stories: 1, 2, 3
- Implementation contract: Module Responsibilities and Seams, Interfaces and Invariants, Failure Behaviour, Compatibility and Migration

## Slice-Specific Constraints

- 이 ticket은 expand–migrate–contract sequence의 TypeScript contract 단계이며 Ticket 001에서 current caller migration이 끝난 뒤에만 시작한다.
- `CodexAccountLifecycle`, `CodexRuntimeRole`, managed Browser login result·failure type, `CodexManagedRuntime`과 `auth-only` factory overload를 compatibility alias 없이 제거한다.
- Production factory와 supervisor는 exact workspace root 하나만 받고 persistent bridge와 native-context sidecar의 canonical `cwd`를 동일하게 유지한다.
- `readAccountReadiness()`는 Node public survivor seam에 남긴다. Underlying `read_account` frame과 fresh account projection은 package-private implementation detail이어야 한다.
- Node private protocol에서 login start/status/cancel/release와 logout command·response를 제거한다. Ticket 003 전까지 Python bridge가 dormant command를 받아도 Node production caller에서는 도달할 수 없어야 한다.
- Deterministic fake, type tests와 process wrappers에서 obsolete role·lifecycle option과 call log를 제거하되 product readiness injection과 process cleanup fixture는 유지한다.
- Official Python SDK patch stack과 Python bridge source는 이 ticket에서 수정하지 않는다.
- Removed surface에 deprecation export, renamed alias와 adapter를 두지 않는다.

## Acceptance Criteria

- [x] Package root와 private runtime contract에서 managed account lifecycle·role·login/logout type export가 사라진다.
- [x] `createCodexChatRuntime`과 lower-level verified start seam은 workspace-only input과 survivor Runtime result만 허용한다.
- [x] Node supervisor의 role branch, auth-only empty-root validation과 workspace-family denial logic이 제거된다.
- [x] Node private bridge protocol과 decoder가 `read_account`만 account-related command로 허용한다.
- [x] `readAccountReadiness()`는 ChatGPT를 `ready`, signed-out·unsupported를 `not_ready(authentication_required)`로 계속 투영한다.
- [x] Account read의 malformed response, timeout, Runtime close와 process loss가 safe error·bounded cleanup으로 수렴한다.
- [x] Managed lifecycle 전용 Node unit·actual-child·type tests는 삭제되고 survivor product tests는 같은 또는 더 강한 coverage로 green이다.
- [x] Source와 tests에서 removed TypeScript identifier·command의 non-historical reference가 0건이다.

## Verification

- Targeted test or command:
  - `npm run test:node-unit -w @ay-ple/codex-chat-runtime` — 통과, 128 assertions
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime` — 통과, 82 tests. Account Readiness의 unsupported projection과 malformed·timeout·close-race·process-loss settlement 및 process-group reap을 포함한다.
  - `npm run typecheck -w @ay-ple/codex-chat-runtime` — 통과
  - `npm run build -w @ay-ple/codex-chat-runtime` — 통과
  - `npm test -w @ay-ple/server` — 통과, 133 tests
  - Removed Node surface `rg` scan — non-historical reference 0건
- Repository checks:
  - `npm test` — 통과
  - `npm run typecheck` — 통과
  - `npm run build` — 통과
  - `npm run lint -w @ay-ple/chat-shell` — 통과
  - `npm run check:docs-links` — 통과
- Manual or live smoke:
  - 없음. Verified Runtime artifact를 사용하는 actual-child gate를 provider credential 없이 실행했다.

## Result

Node production·testing surface를 exact workspace 하나의 `CodexWorkspaceRuntime`으로 닫고 managed account lifecycle, Runtime role, `auth-only` factory branch와 login·logout private protocol을 compatibility alias 없이 제거했다. Fresh `readAccountReadiness()`는 survivor seam으로 유지해 ChatGPT·signed-out·unsupported projection을 고정했고 malformed response, timeout, Runtime close, child process loss의 safe settlement와 bounded cleanup을 직접 검증했다. Deterministic fake와 process fixture도 obsolete role·lifecycle state 없이 workspace-only 계약을 사용한다. Python bridge와 official SDK patch stack은 후속 ticket 범위로 유지했다. Standards·Spec 병렬 리뷰의 후속 확인 결과 남은 finding은 없다. 구현 체크포인트는 `3a006becc`, `6e51bd9c7`, `9bee4e34f`이다.

## Blocked By

- `docs/tickets/2026-07-27-public-release-residue-pruning/001-workspace-runtime-survivor-seam.md` — Workspace Runtime survivor seam을 확장하고 current caller를 이관한다

## Starting Points

- `packages/codex-chat-runtime/src/native-context-contract.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/bridge-protocol.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/testing.unit.test.ts`
- `packages/codex-chat-runtime/type-tests/browser-contract.ts`
