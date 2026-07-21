# 007a — Recovery 전에 product store persistence boundary를 분리한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

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

- [x] `SemesterWorkspaceController` implementation이 current store의 raw JSON decode/encode와 temporary-file write mechanics를 직접 소유하지 않고 one internal persistence boundary를 사용한다.
- [x] Current valid store reopen과 unsupported·invalid·symlink·non-regular/read-failure의 bytes-preserving rejection이 이전과 동일하다.
- [x] Atomic write failure와 active guard byte mismatch의 current fail-closed outcome이 보존된다.
- [x] Store schema/version, public contract와 Browser snapshot의 byte/semantic output이 바뀌지 않는다.
- [x] Persistence owner가 transaction ordering이나 second mutable state cache를 새로 소유하지 않는다.

## Verification

- Targeted checks: focused SemesterWorkspace store decode/write/activation/guard/action/Chat 회귀 115개, Server typecheck와 build가 최종 corrective 뒤 모두 통과했다.
- Repository checks: `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`가 모두 통과했다.
- Browser regression: `npm run test:e2e -w @ay-ple/chat-shell`의 desktop Chromium 13개 test가 통과했다.
- Code review: fixed point `95b6d2d7b799b5c5b73619140fda1a4b6453bc17` 이후 diff를 Standards·Spec 두 축으로 병렬 검토했다. Spec finding은 0건이었다. Standards review의 duplicated value/path invariant와 `matches` naming finding을 shared `semester-workspace-values`, canonical `actionScratchRelativeRoot`, `matchesCanonicalBytes`로 수정했고 최종 follow-up finding은 0건이었다.
- Manual or live smoke: 실행하지 않음. Behavior-preserving extraction이며 deterministic Server/Browser regression이 authority다.

## Result

`semester-workspace-store`가 current canonical v2 codec, exact aggregate validation, incompatible classification, physical store path read/write, temporary-file rename과 canonical byte comparison을 한 internal persistence interface 뒤에 소유한다. `SemesterWorkspaceController`는 open·write·canonical-byte-match outcome만 기존 serialized product transaction 안에서 조합하며 active in-memory authority, transaction ordering과 store 교체 시점을 계속 단독 소유한다.

Store와 Controller가 함께 적용하는 bounded value, opaque ID, 날짜·경로 검증과 clone·canonical normalization은 `semester-workspace-values`가 한 번만 정의한다. Public `/api/product/*` contract, Browser snapshot, store format/bytes와 error outcome은 바뀌지 않았고 별도 cache, lock, migration, recovery UX나 repository abstraction을 추가하지 않았다. Parent spec은 sibling tickets가 남아 있어 완료 처리하지 않았다.

- Implementation commit: `5197c601` (`refactor: isolate workspace store persistence`)
- Corrective commit: `02d9b0a3` (`refactor: centralize workspace state values`)
- Corrective commit: `b409411d` (`refactor: share workspace scratch invariant`)

## Blocked By

- [007-chat-first-assignment-product-vertical.md](007-chat-first-assignment-product-vertical.md) — current product Browser behavior와 shared contract consumer를 먼저 고정한다

## Starting Points

- `apps/server/src/semester-workspace.ts`
- `apps/server/src/semester-workspace.test.ts`
- `apps/server/src/semester-workspace-action.test.ts`
- `apps/server/src/product-bootstrap.test.ts`
