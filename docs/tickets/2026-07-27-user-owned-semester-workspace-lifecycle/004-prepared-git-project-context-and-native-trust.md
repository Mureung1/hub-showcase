# 004 — Prepared Git project context와 native trust

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

Codex Runtime이 App 시작 전에 준비된 user-owned exact SemesterWorkspace Git root를 native project와 thread의 고정 `cwd`로 사용한다. Workspace의 `.codex/config.toml`, `AGENTS.md`와 `.agents/skills/`를 native discovery하고 hostile ancestor context를 배제하며, exact-root native trust와 standard workspace-write semantics만 사용한다.

## Spec Traceability

- User stories: 1, 3, 4, 7
- Implementation contract: Interfaces and Invariants, Data and State Flow, Compatibility and Migration

## Slice-Specific Constraints

- Persistent Runtime, native-context probe와 thread는 생성부터 종료까지 exact canonical `cwd` 하나를 공유한다. Descendant·parent cwd나 cross-workspace thread resume을 허용하지 않는다.
- Fixed `project_root_markers=[]`, process-wide managed Skill root와 `skills/extraRoots/set` injection을 제거하고 native `.git` project boundary를 사용한다.
- Runtime은 thread start 전에 Server-provided root가 canonical existing non-symlink directory이고 exact Git root인지 검증한다. App Runtime은 sibling candidate에 대한 additional `writableRoots`를 요구하거나 전달하지 않는다.
- Workspace Turn은 native exact-root `workspace-write`와 pinned approval mode를 사용한다. `dangerFullAccess`, persistent grant, App-managed protected-metadata fallback과 custom writable-root expansion을 추가하지 않는다.
- Exact Git-root thread start는 root-local project config와 trust를 사용한다. Explicit `untrusted`를 덮어쓰지 않고 parent-only trust를 exact-root trust로 간주하지 않으며 hostile ancestor의 instruction, Skill과 project config를 상속하지 않는다.
- Current claimed worktree의 mixed diff는 hunk 단위로 분리한다. Exact Git boundary, root-local config·instruction·Skill discovery, hostile ancestor 배제와 trust regression은 보존하고 candidate permission, structured `writableRoots`와 SDK replacement patch는 제거한다.
- Existing `0008-standalone-skill-extra-roots.patch`를 제거한 뒤 다른 `0008`로 대체하지 않는다. Official SDK patch stack, tracked manifest와 external verified Runtime은 exact `0001..0007` stack으로 한 번만 재생성·검증한다.
- User 또는 다른 ticket의 unrelated dirty changes를 revert, overwrite, stage 또는 format하지 않는다. Ticket-owned hunk만 정리하고 exact pathspec으로 완료 경계를 만든다.

## Acceptance Criteria

- [ ] Native-context와 Runtime actual-child tests가 exact Git root의 project config, instruction과 repo Skill을 관측하고 hostile ancestor context를 배제한다.
- [ ] Managed Skill injection과 `skills/extraRoots/set` call이 production Turn trace에서 사라진다.
- [ ] App-owned permission contract, Python bridge와 generated SDK에 candidate additional `writableRoots` surface나 replacement `0008` patch가 남지 않는다.
- [ ] Exact-root workspace-write Turn이 workspace 밖 sibling sentinel을 변경하지 못하고 broad permission fallback을 사용하지 않는다.
- [ ] Unset exact-root trust는 root-local config discovery를 허용하고 explicit untrusted, parent-only trust와 hostile ancestor config는 보존되거나 배제된다.
- [ ] Existing mixed dirty diff에서 valid native-context hunk만 보존되고 unrelated 및 obsolete candidate-permission hunk가 ticket result에 섞이지 않는다.
- [ ] Exact SDK, patch manifest와 production Runtime가 `0001..0007` stack으로 재생성되고 Node·bridge·actual-child validation을 통과한다.

## Verification

- Targeted test or command:
  - `npm run test:native-context-actual -w @ay-ple/codex-chat-runtime`
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime`
  - `npm run test:bridge -w @ay-ple/codex-chat-runtime`
  - `npm test -w @ay-ple/server`
  - Exact SDK patch inventory가 `0001..0007`만 포함하는지 검증
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
  - Hostile ancestor repository 아래 temporary SemesterWorkspace에서 exact-root `AGENTS.md`, `.codex/config.toml`과 repo Skill만 발견되는지 확인

## Blocked By

- `001-canonical-roots-and-external-runtime-appdata.md` — Canonical roots와 external Runtime/appData

## Starting Points

- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/runtime.ts`
- `packages/codex-chat-runtime/src/runtime.actual.test.ts`
- `packages/codex-chat-runtime/src/native-context-probe.ts`
- `packages/codex-chat-runtime/src/native-context-probe.actual.test.ts`
- `packages/codex-chat-runtime/src/native-context-probe.unit.test.ts`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/cli.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/protocol.py`
- `packages/codex-chat-runtime/python/bridge/ay_ple_codex_bridge/runtime.py`
- `packages/codex-chat-runtime/scripts/exact_sdk.py`
- `packages/codex-chat-runtime/manifests/patched-source.json`
- `packages/codex-chat-runtime/upstream/PATCHES.md`
- `packages/codex-chat-runtime/upstream/patches/0008-standalone-skill-extra-roots.patch`
- `apps/server/src/codex-chat-service.ts`
- `apps/server/src/codex-chat-config.ts`
