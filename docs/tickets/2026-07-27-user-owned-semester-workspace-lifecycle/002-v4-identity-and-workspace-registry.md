# 002 — V4 identity와 WorkspaceRegistry

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

`docs/specs/2026-07-27-user-owned-semester-workspace-lifecycle.md`

## What It Delivers

각 SemesterWorkspace는 Git-tracked root `workspace-state.json`의 stable v4 identity를 가지며, AY-PLE은 external appData의 durable `WorkspaceRegistry`로 known root와 active pointer를 충돌 없이 기억한다. Registry를 잃더라도 valid workspace identity와 Git history는 그대로 남고 explicit reselect로 다시 등록할 수 있다.

## Spec Traceability

- User stories: 2, 4, 5, 8
- Implementation contract: Root `workspace-state.json`, `WorkspaceRegistry`, Failure Behaviour

## Slice-Specific Constraints

- V4 file은 exact top-level `kind`, `formatVersion`, `workspaceId`, `semester`, `snapshot`만 허용하고 fatal UTF-8 JSON 및 `1 MiB` bound를 적용한다.
- `workspaceId`, `yearLevel`, `term.key`, `term.displayName`은 Parent Spec의 exact regex·range·byte bound를 따른다.
- `snapshot`은 bounded JSON object지만 App이 내부 field를 해석, rewrite 또는 patch하지 않는다. Initial value는 `{}`다.
- Hidden current-v2, historical v3, malformed/future root bytes를 v4로 자동 변환하거나 overwrite하지 않는다.
- Registry는 `<appDataRoot>/state/workspace-registry.json`의 exact v1 envelope이며 `256 KiB`, 64 entries, unique ID/root와 active-pointer membership을 검증한다.
- Registry root는 write 당시 canonical realpath absolute directory다. Browser projection에는 absolute path를 넣지 않는다.
- Registry mutation은 opened-byte compare, synced temporary file, atomic rename와 directory sync를 사용하며 external conflict를 덮어쓰지 않는다.
- Candidate는 activation 성공 전 registry에 넣지 않는다. Missing registry만 empty v1로 시작할 수 있고 malformed/future bytes는 보존한다.

## Acceptance Criteria

- [x] V4 codec이 exact valid identity와 opaque snapshot을 encode/decode하고 모든 bound·extra key·invalid JSON을 거절한다.
- [x] Current-v2, historical v3, malformed/future bytes의 classification과 original-byte non-mutation이 검증된다.
- [x] Registry codec이 uniqueness, active membership, entry limit와 path constraints를 exact하게 검증한다.
- [x] Registry store가 initial write와 compare-before-replace를 crash-safe하게 수행하고 concurrent/external mutation을 conflict로 반환한다.
- [x] Fresh reopen은 registry root에서 v4 identity를 다시 읽어 matching entry만 사용하며 missing/moved/reused/mismatched root를 available로 만들지 않는다.
- [x] Registry loss 뒤 explicit reselect한 valid v4 root가 같은 `workspaceId`와 Git bytes를 유지한 채 재등록될 수 있다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/semester-workspace` — 170개 test green
  - `npm test -w @ay-ple/server` — 147개 test green
  - `npm run typecheck -w @ay-ple/semester-workspace` — green
  - `npm run typecheck -w @ay-ple/server` — green
- Repository checks:
  - `npm test` — green
  - `npm run typecheck` — green
  - `npm run build` — green
  - `npm run lint -w @ay-ple/chat-shell` — green
  - `npm run check:docs-links` — active 28개와 historical banner 2개 green
  - `git diff --check` — green
- Manual or live smoke:
  - `NODE_OPTIONS=--conditions=development npx tsx --test src/workspace-registry.test.ts`를 `apps/server`에서 실행해 두 temporary root, external registry overwrite race, actual `SIGKILL` 뒤 old/new complete envelope와 owned residue recovery, missing/mismatched root reopen, registry loss 뒤 explicit reselect를 확인했다. `workspace-state.json`과 `.git/HEAD` sentinel은 reselect 전후 byte-identical했다.
  - `/code-review 09d1ed2bebe0994129761adb310c4db8d2c416c6`의 Standards 축은 hard violation 0개였고 P3 smell 제안 3개 중 data clump를 정리했다. Spec 축의 external conflict window와 pre-activation registration finding 2개를 수정한 뒤 재검토에서 residual blocker 0개를 확인했다.

## Result

`@ay-ple/semester-workspace`가 root `workspace-state.json`의 strict v4 identity·opaque JSON snapshot codec과 current-v2, historical v3, malformed/future no-rewrite classifier를 제공한다.

Server의 internal target `workspace-registry` Module은 external appData의 exact v1 registry를 canonical root validation, opened-byte CAS, synced temporary file, no-clobber initial publish, atomic replacement와 directory sync로 보존한다. Actual process death 뒤 owned lease·temporary·guard만 정리하며 fresh reopen은 matching v4 identity만 available로 반환한다. `commitActiveWorkspace`는 valid selected root의 known entry와 active pointer를 한 envelope로만 기록하고 current public product lifecycle에는 아직 연결하지 않았다.

구현 commit은 `62c23767b` (`feat: add strict v4 workspace identity codec`), `cee6f290c` (`feat: add durable workspace registry`), `0334b35cc` (`fix: close workspace registry commit races`)다.

## Blocked By

- `001-canonical-roots-and-external-runtime-appdata.md` — Canonical roots와 external Runtime/appData

## Starting Points

- `packages/semester-workspace/src/v3-codec.ts`
- `packages/semester-workspace/src/v3-codec.test.ts`
- `packages/semester-workspace/src/legacy-v2-codec.ts`
- `packages/semester-workspace/src/legacy-v2-parity.test.ts`
- `packages/semester-workspace/src/index.ts`
- `apps/server/src/semester-workspace-store.ts`
- `apps/server/src/semester-workspace-store-v2-parity.test.ts`
- `packages/semester-workspace/src/setup-envelope-store.ts`
- `packages/semester-workspace/src/setup-envelope-store.test.ts`
- `apps/server/src/root-isolation.ts`
