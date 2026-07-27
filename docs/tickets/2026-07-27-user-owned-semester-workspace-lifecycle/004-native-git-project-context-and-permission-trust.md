# 004 — Native Git project context와 permission·trust

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

Codex Runtime이 exact SemesterWorkspace Git root를 native project와 thread의 고정 `cwd`로 사용하고, workspace의 `.codex/config.toml`, `AGENTS.md`와 `.agents/skills/`를 native discovery한다. Bootstrap init만 chosen candidate root 하나에 추가 write 권한을 얻으며 protected metadata 작업은 native review를 우회하지 않는다.

## Spec Traceability

- User stories: 2, 3, 4, 7
- Implementation contract: Native project context와 Interaction readiness consumption, BootstrapCandidate와 init/update Skill, Canonical roots와 Runtime phases

## Slice-Specific Constraints

- Persistent Runtime, native-context probe와 thread는 생성부터 종료까지 exact canonical `cwd` 하나를 공유한다. Descendant·parent cwd나 cross-workspace thread resume을 허용하지 않는다.
- Fixed `project_root_markers=[]`, process-wide managed Skill root와 `skills/extraRoots/set` injection을 제거하고 native `.git` project boundary를 사용한다.
- `CodexProductPermissionProfile`은 `read_only` 또는 `workspace_write`와 additional `writableRoots`로 표현한다. Additional root 최대치는 하나다.
- Runtime은 native `turn/start` 전 Server-provided root가 canonical existing non-symlink directory인지 검증한다. Normal Workspace Turn은 `[]`, Bootstrap init은 candidate 하나, 그 밖의 Bootstrap Turn은 read-only다.
- `workspace_write`는 pinned `ApprovalMode.auto_review`를 사용한다. `.git`, `.agents`, `.codex` 변경은 explicit per-call escalation만 허용하며 `dangerFullAccess`, persistent grant와 App fallback을 금지한다.
- Exact Git-root workspace-write thread start는 unset trust의 native write와 same-start project config reload를 사용한다. Explicit `untrusted`와 parent-only trust를 덮어쓰거나 상속하지 않는다.
- Official SDK high-level seam, Python bridge와 Node contract가 additional writable roots를 typed하게 전달해야 한다. Raw generated App Server shape를 Runtime package 밖으로 노출하지 않는다.
- Exact SDK patch stack, tracked manifests와 external verified Runtime은 이 ticket의 최종 source와 함께 한 번에 재고정한다. Intermediate stale artifact를 완료 상태로 두지 않는다.

## Acceptance Criteria

- [ ] Native-context와 Runtime actual-child tests가 exact Git root의 project config, instruction과 repo Skill을 관측하고 hostile ancestor context를 배제한다.
- [ ] Managed Skill injection과 `skills/extraRoots/set` call이 production Turn trace에서 사라진다.
- [ ] Additional `writableRoots`가 SDK→bridge→native sandbox로 exact 전달되고 relative, symlink, missing, escaped 또는 복수 root가 spawn/turn 전에 거절된다.
- [ ] Bootstrap init은 candidate root만 쓸 수 있고 normal Workspace Turn은 workspace 밖 sibling sentinel을 변경하지 못한다.
- [ ] Protected metadata approval accept/deny와 reviewer unavailable가 각각 실제 변경 또는 honest failure로 수렴하며 broad fallback이 없다.
- [ ] Unset trust는 exact root에서 project config를 same-start load하고 explicit untrusted 또는 ignored config는 보존된 failure가 된다.
- [ ] Exact SDK, production Runtime와 Node validation이 regenerated external artifact에 대해 모두 통과한다.

## Verification

- Targeted test or command:
  - `npm run test:native-context-actual -w @ay-ple/codex-chat-runtime`
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
  - `npm run test:bridge -w @ay-ple/codex-chat-runtime`
  - `npm test -w @ay-ple/server`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - `npm run validate:exact-sdk -w @ay-ple/codex-chat-runtime`
  - `npm run validate:production-runtime -w @ay-ple/codex-chat-runtime`
  - `npm run validate:node-runtime -w @ay-ple/codex-chat-runtime`

## Blocked By

- `001-canonical-roots-and-external-runtime-appdata.md` — Canonical roots와 external Runtime/appData

## Starting Points

- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/native-context-probe.ts`
- `packages/codex-chat-runtime/src/native-context-probe.actual.test.ts`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `packages/codex-chat-runtime/upstream/patches/0008-standalone-skill-extra-roots.patch`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-config.ts`
