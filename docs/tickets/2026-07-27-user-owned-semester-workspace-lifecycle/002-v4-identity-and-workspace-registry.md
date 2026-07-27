# 002 — V4 identity와 WorkspaceRegistry

## Agent triage

- State: ready-for-agent
- Surface: local-ticket
- Next actor: /implement

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

- [ ] V4 codec이 exact valid identity와 opaque snapshot을 encode/decode하고 모든 bound·extra key·invalid JSON을 거절한다.
- [ ] Current-v2, historical v3, malformed/future bytes의 classification과 original-byte non-mutation이 검증된다.
- [ ] Registry codec이 uniqueness, active membership, entry limit와 path constraints를 exact하게 검증한다.
- [ ] Registry store가 initial write와 compare-before-replace를 crash-safe하게 수행하고 concurrent/external mutation을 conflict로 반환한다.
- [ ] Fresh reopen은 registry root에서 v4 identity를 다시 읽어 matching entry만 사용하며 missing/moved/reused/mismatched root를 available로 만들지 않는다.
- [ ] Registry loss 뒤 explicit reselect한 valid v4 root가 같은 `workspaceId`와 Git bytes를 유지한 채 재등록될 수 있다.

## Verification

- Targeted test or command:
  - `npm test -w @ay-ple/semester-workspace`
  - `npm test -w @ay-ple/server`
  - `npm run typecheck -w @ay-ple/semester-workspace`
  - `npm run typecheck -w @ay-ple/server`
- Repository checks:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
  - `npm run lint -w @ay-ple/chat-shell`
  - `npm run check:docs-links`
- Manual or live smoke:
  - Temporary Git roots 두 개와 external registry를 재시작·외부 충돌·registry loss 시나리오로 열어 identity와 original bytes 보존을 확인한다.

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
