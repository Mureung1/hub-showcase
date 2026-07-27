# 001 — Canonical roots와 external Runtime/appData

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

AY-PLE이 `hub/`, sibling `../.ay-ple/`, global `~/.codex`와 선택된 SemesterWorkspace를 서로 다른 authority로 일관되게 해석한다. Verified Runtime과 mutable operating state는 package-local `.artifacts/`가 아닌 external appData에서 시작하며, 사용자의 global Codex account와 workspace bytes를 별도 app-owned credential 또는 hardcoded 학기 경로 없이 그대로 사용한다.

## Spec Traceability

- User stories: 1, 4, 5, 8
- Implementation contract: Canonical roots와 Runtime phases, Module Responsibilities and Seams, Compatibility and Migration

## Slice-Specific Constraints

- `packageRoot`는 current `hub/`, 기본 `appDataRoot`는 canonical sibling `../.ay-ple/`, verified Runtime은 `<appDataRoot>/runtime/production-runtime-darwin-arm64`다.
- `../.ay-ple-dogfood`, `../.ay-ple-dev-workspaces`, repository-local `.ay-ple`, ambient `process.cwd()`와 `CODEX_CHAT_WORKSPACE`는 product root 또는 selection fallback이 아니다.
- Caller의 `CODEX_HOME`, 또는 미설정 시 OS user의 `~/.codex`가 account·config·session authority다. 별도 `CODEX_SQLITE_HOME`이나 app-owned Codex profile을 만들지 않는다.
- Controlled child `HOME`과 temporary state만 `<appDataRoot>/state/runtime/home` 및 `<appDataRoot>/temp/`에 둔다.
- Package, appData, global Codex home와 workspace의 same-path 또는 ancestor overlap을 canonical realpath 기준으로 fail closed한다. Symlinked root와 unsafe non-directory도 거절한다.
- Runtime materialization과 verification은 external root를 explicit하게 받아 complete artifact identity를 검증해야 한다. Install/start는 legacy root나 user workspace를 삭제하지 않는다.
- 이 ticket은 current source 옆에 canonical target을 expand한다. Legacy tracked scripts와 local residue의 최종 제거는 Ticket 010이 소유한다.

## Acceptance Criteria

- [ ] Root resolver가 package, appData, global Codex home, controlled child state와 workspace의 canonical location·ownership을 한 contract로 반환한다.
- [ ] Same-path, ancestor overlap, symlink, unreadable/non-directory와 package-local fallback이 mutation 전에 거절된다.
- [ ] Runtime materializer가 external appData Runtime root와 cache를 만들고 tracked manifest에 대해 strict verify하며 package-local `.artifacts/`를 runtime authority로 사용하지 않는다.
- [ ] Product startup이 external verified Runtime, controlled `HOME`·temp와 caller-global `CODEX_HOME`을 사용하고 separate `CODEX_SQLITE_HOME`을 만들지 않는다.
- [ ] Default startup은 hardcoded SemesterWorkspace나 `CODEX_CHAT_WORKSPACE`를 active selection authority로 요구하지 않는다.
- [ ] Repeated materialize/start/verify가 target Runtime bytes와 existing workspace·legacy root를 임의 변경하지 않는다.

## Verification

- Targeted test or command:
  - `npm run test:production-runtime -w @ay-ple/codex-chat-runtime`
  - `npm run test:node-unit -w @ay-ple/codex-chat-runtime`
  - `npm run test:local`
  - `npm test -w @ay-ple/server`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - External appData temporary root에 Runtime을 materialize·verify한 뒤 canonical product startup을 실행하고 package tree와 unrelated sentinel이 동일한지 확인한다.

## Blocked By

None — can start immediately.

## Starting Points

- `apps/server/src/root-isolation.ts`
- `apps/server/src/codex-chat-config.ts`
- `apps/server/src/product-development.ts`
- `apps/server/src/product-development.test.ts`
- `scripts/product-path-utils.mts`
- `scripts/product-local.mts`
- `scripts/product-local.test.mts`
- `scripts/product-development-bootstrap.mts`
- `scripts/test-product-entrypoint.mts`
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- `packages/codex-chat-runtime/scripts/test_production_bundle.py`
- `packages/codex-chat-runtime/src/production-bundle.ts`
