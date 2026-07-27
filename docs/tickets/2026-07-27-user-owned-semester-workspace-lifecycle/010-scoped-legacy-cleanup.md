# 010 — Scoped legacy cleanup

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] Source, scripts, package commands와 docs에서 obsolete dogfood/development/package-artifact root가 executable fallback 또는 current authority로 남지 않는다.
- [x] Canonical full smoke가 deletion 전 통과하고 exact target inventory·ownership evidence가 기록된다.
- [x] Reviewed cleanup이 validated legacy targets만 제거하고 canonical appData, global Codex home, workspace tree와 unrelated sibling sentinel을 보존한다.
- [x] User-owned workspace의 root v4, Git history, actual files와 hidden legacy `.ay-ple/` bytes가 cleanup 전후 byte-for-byte 또는 Git identity 기준으로 동일하다.
- [x] Missing target rerun은 no-op이고 unexpected layout·symlink·ownership mismatch는 destructive action 없이 fail closed한다.
- [x] Package-local `.artifacts` 없이 external verified Runtime에서 root tests, registry reopen, explicit prepared-root relaunch와 required Interaction smoke가 다시 통과한다.

## Verification

| 구분 | 결과 |
| --- | --- |
| 시작 gate | `50a17c7253756b0ec59b5c3da158ee5a84c9687f`, `codex/w4d1`, clean tracked tree, 이 ticket의 `ready-for-agent`, W-001·W-009 `completed`를 mutation 전에 확인했다. |
| Cleanup 전 canonical smoke | External production Runtime verify, `npm run test:prepared-workspace-product-actual`, prepared-workspace startup 24 tests, `npm run test:product-entrypoint`, `npm run test:local`, Server tests가 green이다. `npm run test:runtime-local-provider`는 첫 실행에서 `runtime_close_timeout` 1건 뒤 orphan 0을 확인했고 같은 환경의 즉시 재실행에서 4/4 green이었다. |
| Exact inventory와 ownership | Dogfood marker와 exact `app-data` layout, managed-workspace marker·exact two-entry layout, package `.artifacts`의 tracked file 0·exact four-entry layout·known symlink roster·production/SDK manifest evidence, Python `__pycache__`의 exact CPython 3.10 naming과 matching package source를 fail-closed preflight로 고정했다. Unexpected entry·symlink·marker/path/manifest mismatch는 cleanup 전에 실패한다. |
| Reviewed one-shot | Clone-local `.git/ay-ple-ticket-010-cleanup.mjs`는 JavaScript ESM이며 SHA-256은 `1edb0a8a84f78ad578c722ecc02dbfeb048b0f94e6789a6350c1ee2e4237a0e2`다. `node .git/ay-ple-ticket-010-cleanup.mjs --inventory`, `--self-test`, `--cleanup`으로만 실행한다. Self-test는 unexpected symlink에서 zero-delete, exact target cleanup, sibling preservation, managed parent preservation과 rerun no-op을 확인한다. |
| 제거 target | Exact `../.ay-ple-dogfood/app-data`, `../.ay-ple-dev-workspaces/first-assignment-semester-workspace`, `packages/codex-chat-runtime/.artifacts`, `packages/codex-chat-runtime/scripts/__pycache__`만 제거했다. Managed parent `../.ay-ple-dev-workspaces/`는 유지하며 cleanup source도 parent를 target으로 삼지 않는다. |
| Preservation | Canonical `../.ay-ple/` `6f3e9bc3…b86f`, user-owned `../workspace/year-2-semester-2/` `08e8e874…8715`, preserved dogfood `semester-workspace/` `80dd3eb4…7311`, dogfood ownership marker `40e78f1f…dcd`, unrelated sibling sentinel `fd4e2898…cfdf`, global `~/.codex/auth.json` `2e4f21…`과 `config.toml` `a2abb145…`의 pre/post tree 또는 byte digest가 같다. User workspace의 `.git`, root v4, actual files와 hidden `.ay-ple/`도 포함된다. |
| Cleanup 후 canonical smoke | Package `.artifacts`와 Python cache가 없는 상태에서 external Runtime verify, local-provider 4/4, prepared-workspace product actual, startup 24/24와 product entrypoint가 green이다. 첫 post local-provider 시도에서 macOS `kill EPERM` 1건 뒤 orphan 0을 확인했고 즉시 재실행이 green이었다. `python -B`와 external exact-SDK cache로 smoke가 package residue를 재생성하지 않는다. |
| Repository gate | `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e`(Chat Shell 3, camp demo 8), `npm run check:docs-links`와 `git diff --check`가 green이다. |
| Code review | Standards review의 ADR current-state ownership finding을 `b527d34a1`에서 durable decision으로 고쳤다. Spec review의 package ownership evidence와 over-broad empty parent removal finding은 manifest-backed preflight 강화와 parent 복원·비대상화로 해결했다. 중복 temporary-root helper와 반복 `python -B`는 correctness blocker가 아닌 비차단 judgment로 남겼다. |

## Result

Root composition과 smoke는 external `../.ay-ple/` Runtime/cache만 사용하며 obsolete root를 고르는 package command, materializer, dogfood product entrypoint와 package-local Runtime fallback은 제거됐다. Validated current-clone residue 네 곳은 reviewed one-shot으로 정리했고 user-owned SemesterWorkspace, hidden legacy bytes, canonical appData, global Codex state와 unrelated sibling data는 보존했다. Missing-target rerun은 `removed: []`이고 normal install/start/runtime에는 cleanup 동작이 없다.

구현 commit:

- `f692271b4` — `refactor: remove legacy local runtime fallbacks`
- `83e60e10a` — `fix: keep runtime smoke cache external`
- `d348787d0` — `docs: record canonical residue cleanup`
- `b527d34a1` — `docs: align legacy cleanup ownership`

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
