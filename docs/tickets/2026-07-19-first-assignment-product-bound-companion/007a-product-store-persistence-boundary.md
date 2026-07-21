# 007a — Recovery 전에 product store persistence boundary를 분리한다

## Agent triage

- State: claimed
- Surface: local-ticket
- Next actor: /implement

## Parent Spec

[First Assignment Product-bound Codex Companion](../../specs/2026-07-19-first-assignment-product-bound-companion.md)

## What It Delivers

007의 nominal behavior와 single serialized transaction authority를 유지하면서 current canonical store의 codec·physical I/O를 deep internal persistence boundary로 분리한다. 후속 recovery는 4,000-line workspace file의 raw JSON·temporary-file mechanics를 더 키우지 않고 store outcome만 조합할 수 있다.

## Spec Traceability

- User stories: 10, 11, 12
- Implementation contract: Module Responsibilities and Seams — Workspace and product-state owner; Durable state and atomic apply; Protected execution guard

## Slice-Specific Constraints

- Current canonical v2 exact codec·invariant validation, physical read/write·temporary rename·byte comparison과 incompatible classification을 한 deep internal owner로 추출한다.
- `SemesterWorkspaceController`는 explicit activation과 single serialized product transaction authority를 유지한다. Persistence를 독립 mutable repository나 두 번째 lock owner로 만들지 않는다.
- Public `/api/product/*` contract, Server factory seam, store bytes·formatVersion, error code·display outcome와 Browser behavior를 변경하지 않는다.
- Backup snapshot, revision journal, migration, reset command, recovery UX, revision replacement나 new product state를 추가하지 않는다.
- Generic repository, database abstraction과 broad `SemesterWorkspaceController` facade rewrite를 만들지 않는다.

## Acceptance Criteria

- [ ] `SemesterWorkspaceController` implementation이 current store의 raw JSON decode/encode와 temporary-file write mechanics를 직접 소유하지 않고 one internal persistence boundary를 사용한다.
- [ ] Current valid store reopen과 unsupported·invalid·symlink·non-regular/read-failure의 bytes-preserving rejection이 이전과 동일하다.
- [ ] Atomic write failure와 active guard byte mismatch의 current fail-closed outcome이 보존된다.
- [ ] Store schema/version, public contract와 Browser snapshot의 byte/semantic output이 바뀌지 않는다.
- [ ] Persistence owner가 transaction ordering이나 second mutable state cache를 새로 소유하지 않는다.

## Verification

- Targeted test or command: focused SemesterWorkspace store decode/write/activation/guard tests
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run test:e2e -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`
- Manual or live smoke: 필요 없음. Behavior-preserving extraction이며 deterministic Server/Browser regression이 authority다.

## Blocked By

- [007-chat-first-assignment-product-vertical.md](007-chat-first-assignment-product-vertical.md) — current product Browser behavior와 shared contract consumer를 먼저 고정한다

## Starting Points

- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/server/src/semester-workspace-action.test.ts`
- `apps/server/src/product-bootstrap.test.ts`
