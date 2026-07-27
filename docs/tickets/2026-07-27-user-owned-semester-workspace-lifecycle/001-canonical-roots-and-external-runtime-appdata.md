# 001 — Canonical roots와 external Runtime/appData

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Root resolver가 package, appData, global Codex home, controlled child state와 workspace의 canonical location·ownership을 한 contract로 반환한다.
- [x] Same-path, ancestor overlap, symlink, unreadable/non-directory와 package-local fallback이 mutation 전에 거절된다.
- [x] Runtime materializer가 external appData Runtime root와 cache를 만들고 tracked manifest에 대해 strict verify하며 package-local `.artifacts/`를 runtime authority로 사용하지 않는다.
- [x] Product startup이 external verified Runtime, controlled `HOME`·temp와 caller-global `CODEX_HOME`을 사용하고 separate `CODEX_SQLITE_HOME`을 만들지 않는다.
- [x] Default startup은 hardcoded SemesterWorkspace나 `CODEX_CHAT_WORKSPACE`를 active selection authority로 요구하지 않는다.
- [x] Repeated materialize/start/verify가 target Runtime bytes와 existing workspace·legacy root를 임의 변경하지 않는다.

## Verification

- Targeted test or command:
  - `npm run test:production-runtime -w @ay-ple/codex-chat-runtime` — 25개 test green
  - `npm run test:node-unit -w @ay-ple/codex-chat-runtime` — 130개 test green
  - `npm run test:node-actual -w @ay-ple/codex-chat-runtime` — 83개 test green
  - `npm run test:local` — canonical·legacy 7개 test green
  - `npm test -w @ay-ple/server` — 140개 test green
  - `npm run check:bridge -w @ay-ple/codex-chat-runtime` — Ruff check·format green
- Repository checks:
  - `npm test` — green
  - `npm run typecheck` — green
  - `npm run build` — green
  - `npm run lint -w @ay-ple/chat-shell` — green
  - `npm run check:docs-links` — active 28개와 historical banner 2개 green
  - `git diff --check` — green
- Manual or live smoke:
  - External temporary appData에 Runtime을 두 번 materialize한 결과가 같은 roster SHA-256 `02772072955c17202736221e035eb2129d8939ab84361c02187cf06f5401c68f`로 strict verify됐다.
  - 그 Runtime과 explicit temporary workspace로 canonical `npm run dev`를 실행해 Chat Shell, `/api/product/bootstrap`, `/api/product/codex-settings`가 모두 HTTP 200이고 global account readiness가 `ready`임을 확인했다.
  - 종료 뒤 Runtime strict verify와 listener close를 다시 확인했다. Package-local `.artifacts/` metadata digest와 unrelated sentinel digest는 전후 동일했고 임시 root는 정리했다.

## Result

`resolveCanonicalProductRoots()`가 package, sibling external appData, global Codex home, controlled Runtime state와 optional workspace를 한 ownership contract로 반환한다. 모든 independent root와 appData 아래 Runtime·cache·state descendant를 mutation 전에 canonical preflight하고 controlled directory는 segment별 no-symlink 검증으로만 만든다.

Production Runtime materializer·verifier는 explicit external appData의 Runtime과 cache만 사용한다. Root `npm run dev`는 canonical appData를 기본으로 사용하고 workspace를 자동 선택하지 않으며, explicit workspace를 준 경우에만 transitional current-v2 composition을 연다. Runtime child는 controlled `HOME`·temp와 caller-global Codex/SQLite authority를 사용한다.

구현 commit은 `84b538c94` (`feat: adopt canonical external runtime roots`), `18a21428a` (`fix: allow global Codex SQLite authority`), `57486615e` (`fix: reject unsafe product root descendants`)다.

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
