# 002 — Node Runtime의 managed account·auth-only 계약을 제거한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement (current session)

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

- [ ] Package root와 private runtime contract에서 managed account lifecycle·role·login/logout type export가 사라진다.
- [ ] `createCodexChatRuntime`과 lower-level verified start seam은 workspace-only input과 survivor Runtime result만 허용한다.
- [ ] Node supervisor의 role branch, auth-only empty-root validation과 workspace-family denial logic이 제거된다.
- [ ] Node private bridge protocol과 decoder가 `read_account`만 account-related command로 허용한다.
- [ ] `readAccountReadiness()`는 ChatGPT를 `ready`, signed-out·unsupported를 `not_ready(authentication_required)`로 계속 투영한다.
- [ ] Account read의 malformed response, timeout, Runtime close와 process loss가 safe error·bounded cleanup으로 수렴한다.
- [ ] Managed lifecycle 전용 Node unit·actual-child·type tests는 삭제되고 survivor product tests는 같은 또는 더 강한 coverage로 green이다.
- [ ] Source와 tests에서 removed TypeScript identifier·command의 non-historical reference가 0건이다.

## Verification

- Targeted test or command:
  - `npm run test:node-unit -w @ay-ple/codex-chat-runtime`
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
  - `npm run typecheck -w @ay-ple/codex-chat-runtime`
  - `npm run build -w @ay-ple/codex-chat-runtime`
  - `npm test -w @ay-ple/server`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- Manual or live smoke:
  - 없음. Existing verified Runtime artifact가 필요한 actual-child gate는 provider credential 없이 실행한다.

## Blocked By

- `docs/tickets/2026-07-27-public-release-residue-pruning/001-workspace-runtime-survivor-seam.md` — Workspace Runtime survivor seam을 확장하고 current caller를 이관한다

## Starting Points

- `packages/codex-chat-runtime/src/account-contract.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/bridge-protocol.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/src/testing-process-tree.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/testing.unit.test.ts`
- `packages/codex-chat-runtime/type-tests/browser-contract.ts`
