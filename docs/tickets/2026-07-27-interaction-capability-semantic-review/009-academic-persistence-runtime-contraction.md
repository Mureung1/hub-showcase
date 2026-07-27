# 009 — Academic persistence·Runtime contraction

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-interaction-capability-semantic-review.md`

## What It Delivers

Public consumer가 사라진 old academic workflow와 persistence를 Server에서 제거하고, Runtime의 current-only private MCP·managed Skill override를 contract한다. App은 더 이상 `RawMaterial`, `ModelingRun`, durable `StatePatch`·`UserConfirmation`과 revision-bound apply를 소유하지 않으며, Runtime은 generic project context·child environment·MCP readiness만 제공한다.

## Spec Traceability

- User stories: 6, 7, 8, 9, 10
- Implementation contract: `Compatibility and Migration`, `Current State and Constraints`, `AY-owned mutation boundary`, `Out of Scope`

## Slice-Specific Constraints

- 이 contract는 ticket 008에서 public consumers가 0인 뒤 시작한다. Old workflow를 target store adapter, compatibility alias나 hidden fallback으로 옮기지 않는다.
- Package-bounded migration은 Server academic orchestration → Server academic persistence → Runtime old override → final integrated verification 순으로 진행하고 current `codex/...` working branch에서 green checkpoint를 남긴다.
- Old `AssignmentMcpHost`, managed Assignment Recipe, built-in `request_user_input` double confirmation, replacement coordinator와 First Assignment action orchestration을 제거한다. Ticket 004의 tracked built-in Skill source는 제거 대상이 아니다.
- App-owned Course, `RawMaterial`, `ModelingRecipe`·`ModelingInvocation`·durable `ModelingRun`, `StatePatch`·`UserConfirmation`, revision-bound SemesterModel apply와 관련 recovery/replay store를 active Server graph에서 제거한다.
- Runtime public/testing contract와 bridge에서 `StartThreadInput.mcp`, `CodexPrivateMcpServerInput`, literal capability allowlist, thread-start MCP config override와 process-wide managed Skill injection을 제거한다.
- General built-in `request_user_input`, native command·file·network approval, generic Turn lifecycle와 target Interaction MCP readiness는 보존한다.
- Existing v2/v3 on-disk bytes를 자동 rewrite·delete하지 않고 `@ay-ple/semester-workspace`의 legacy kernel contraction은 sibling Workspace ticket이 소유하도록 남긴다.
- Exact SDK·bridge 변경은 ordered patch, generation, provenance와 production-runtime validation discipline을 지킨다. Raw native status와 generated shapes를 새 public escape hatch로 만들지 않는다.
- Owning package README와 implementation map은 current target topology와 remaining sibling cleanup만 기록하고 superseded field lists·backlog state를 복제하지 않는다.

## Acceptance Criteria

- [ ] Active Server composition과 production source에 old Assignment MCP host, managed Recipe, double-confirmation coordinator와 App academic apply caller가 없다.
- [ ] Active Server store와 Browser projection이 Course, RawMaterial registry, durable Run·patch·confirmation·revision apply를 생성·읽기·복구하지 않는다.
- [ ] Runtime public 및 testing contract에 private MCP input과 managed Skill injection이 없고 Python bridge가 thread-start MCP override 또는 `skills/extraRoots/set`을 수행하지 않는다.
- [ ] General clarification, native approval, generic Turn lifecycle, project-discovered Skill·MCP와 exact readiness tests는 contraction 뒤에도 green이다.
- [ ] Existing legacy workspace bytes는 untouched이고 sibling v3 kernel contraction이 수행할 범위가 코드와 docs에서 명확히 남는다.
- [ ] Production apps/packages의 active code와 tests에 removed academic workflow identity가 없으며 target temporary Git trace와 public E2E가 계속 통과한다.
- [ ] Exact SDK, bridge, Node Runtime, Server, Chat Shell과 repository-wide PR-ready gates가 최종 integrated state에서 모두 통과한다.

## Verification

- Targeted test or command: `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime && npm run validate:production-runtime -w @ay-ple/codex-chat-runtime && npm run validate:node-runtime -w @ay-ple/codex-chat-runtime && npm test -w @ay-ple/server`
- Repository checks: `npm run lint -w @ay-ple/chat-shell && npm run typecheck && npm run build && npm test && npm run test:e2e && npm run check:docs-links`
- Manual or live smoke: Target App에서 workspace reopen → normal Chat → Semantic Review → actual file checkpoint를 실행하고 logs·network·workspace state에 removed academic receipt와 private override가 없는지 확인한다.

## Blocked By

- `./008-academic-public-surface-contraction.md` — Academic public surface contraction

## Starting Points

- `apps/server/src/assignment-mcp-host.ts`
- `apps/server/src/assignment-recipe.ts`
- `apps/server/src/state-patch-review.ts`
- `apps/server/src/modeling-run-semantics.ts`
- `apps/server/src/product-operation-coordinator.ts`
- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace-store.ts`
- `apps/server/src/semester-workspace-values.ts`
- `apps/server/src/server-application.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/testing.ts`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/scripts/test_python_bridge.py`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/README.md`
- `apps/server/README.md`
- `docs/architecture/codex-chat-implementation-map.md`
