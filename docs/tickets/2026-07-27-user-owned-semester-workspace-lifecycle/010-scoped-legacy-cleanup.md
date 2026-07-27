# 010 — Scoped legacy cleanup

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

Canonical Runtime, registry reopen, active Git workspace와 required Interaction flow가 모두 검증된 뒤 obsolete dogfood profile, managed development workspace와 package-local Runtime artifact 경로만 정확히 정리한다. Normal install/start에 destructive cleanup을 넣지 않고 user-owned SemesterWorkspace와 unrelated local data를 보존한 채 current product가 canonical roots 하나만 사용하게 한다.

## Spec Traceability

- User stories: 5, 8
- Implementation contract: Canonical roots와 Runtime phases, Compatibility and Migration, Failure Behaviour

## Slice-Specific Constraints

- Cleanup 전 external Runtime, global Account Readiness, registry reopen, explicit prepared-root relaunch와 Interaction Review의 full canonical smoke가 green이어야 한다.
- Tracked product graph에서 `../.ay-ple-dogfood`, `../.ay-ple-dev-workspaces`, hardcoded `../workspace/year-2-semester-2`, package-local Runtime `.artifacts/`와 obsolete materializer/profile command를 selection/runtime authority로 참조하지 않는다.
- Local deletion target은 exact legacy dogfood appData, managed development workspace와 package-local Runtime artifact/cache로 한정하고 ownership marker·canonical path·expected layout을 read-only로 재검증한다.
- `<SemesterWorkspace>/.git`, root `workspace-state.json`, `AGENTS.md`, `.agents/`, `.codex/`, actual semester files와 Git history는 user-owned data다. Hidden legacy `<SemesterWorkspace>/.ay-ple/`, current-v2/v3/malformed bytes도 삭제, 이동, stage 또는 rewrite하지 않는다.
- `../workspace/` 전체, arbitrary user-selected root, global `~/.codex`, canonical `../.ay-ple/`과 unresolved symlink/glob을 cleanup target으로 사용하지 않는다.
- Unrelated file 또는 unexpected target layout을 만나면 보존하고 cleanup을 fail closed한다. Partial deletion을 success로 기록하지 않는다.
- Install, start, prepared-workspace startup과 App Runtime은 cleanup을 자동 실행하지 않는다. 이 ticket의 reviewed one-shot cleanup만 local residue를 제거한다.
- Cleanup 뒤 old graph나 package-local artifact로 fallback하지 않는다. Rollback은 user-owned v4 files와 Git commits를 삭제하지 않는다.

## Acceptance Criteria

- [ ] Source, scripts, package commands와 docs에서 obsolete dogfood/development/package-artifact root가 executable fallback 또는 current authority로 남지 않는다.
- [ ] Canonical full smoke가 deletion 전 통과하고 exact target inventory·ownership evidence가 기록된다.
- [ ] Reviewed cleanup이 validated legacy targets만 제거하고 canonical appData, global Codex home, workspace tree와 unrelated sibling sentinel을 보존한다.
- [ ] User-owned workspace의 root v4, Git history, actual files와 hidden legacy `.ay-ple/` bytes가 cleanup 전후 byte-for-byte 또는 Git identity 기준으로 동일하다.
- [ ] Missing target rerun은 no-op이고 unexpected layout·symlink·ownership mismatch는 destructive action 없이 fail closed한다.
- [ ] Package-local `.artifacts` 없이 external verified Runtime에서 root tests, registry reopen, explicit prepared-root relaunch와 required Interaction smoke가 다시 통과한다.

## Verification

- Targeted test or command:
  - `npm run test:local`
  - `npm run test:product-entrypoint`
  - `npm test -w @ay-ple/server`
  - Canonical/legacy root inventory와 cleanup preservation focused test
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run test:e2e`
  - `npm run check:docs-links`
- Manual or live smoke:
  - External Runtime의 exact validation과 target local-provider product trace를 실행한 뒤 reviewed legacy targets를 정리하고 같은 smoke 및 preservation inventory를 재실행한다.

## Blocked By

- `001-canonical-roots-and-external-runtime-appdata.md` — Canonical roots와 external Runtime/appData
- `009-v3-workspace-kernel-contraction.md` — V3 workspace kernel contraction

## Starting Points

- `package.json`
- `scripts/product-local.mts`
- `scripts/product-local.test.mts`
- `scripts/product-development-bootstrap.mts`
- `scripts/semester-workspace-materializer.mts`
- `scripts/semester-workspace-materializer.test.mts`
- `scripts/test-product-entrypoint.mts`
- `apps/server/src/product-development.ts`
- `apps/server/src/testing/product-shutdown.actual.ts`
- `apps/server/src/testing/first-assignment-product.live.ts`
- `packages/codex-chat-runtime/.artifacts/`
- `packages/codex-chat-runtime/scripts/production_bundle.py`
- `docs/architecture/codex-runtime-isolation.md`
