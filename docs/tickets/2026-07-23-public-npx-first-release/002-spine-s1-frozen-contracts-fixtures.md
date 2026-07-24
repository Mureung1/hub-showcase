# 002 — Spine S1 — frozen contract와 fixture를 고정한다

## Agent triage

- State: completed
- Surface: local-ticket
- Next actor: none

## Parent Spec

[AY-PLE public npx 첫 출시](../../specs/2026-07-23-public-npx-first-release.md)

## What It Delivers

Runtime, account transition, SemesterWorkspace, Server, Browser와 public host lane이 독립적으로 구현될 수 있도록 public preview의 cross-lane Interface와 Browser-safe fixture를 한 immutable contract spine으로 고정한다. Producer와 consumer가 같은 strict decoder·fixture roster를 소비하며 private Runtime, path, receipt와 credential identity가 public wire surface로 새지 않는다.

## Spec Traceability

- User stories: 5, 6, 7, 9, 11, 12, 13, 16
- Implementation contract: Module Responsibilities and Seams; Production host와 root; Runtime release; Codex account와 Runtime transition; SemesterWorkspace admission과 v3 aggregate; Browser-safe setup과 Ready projection; Parallel delivery contract — `Spine S1`
- Testing decisions: Product contract fixture exactness와 private-field leak scan

## Slice-Specific Constraints

- `@ay-ple/product-contract`만 Browser-safe Account·Setup·Ready request/response와 strict exact decoder를 소유한다. Browser DTO에 raw absolute path, token, email, native login/thread/Turn ID, Runtime generation, digest, durable receipt phase를 추가하지 않는다.
- Private contracts는 각 owning seam에 둔다: Runtime account lifecycle은 `@ay-ple/codex-chat-runtime`, Runtime release는 `packages/runtime-release`, v3 admission은 `packages/semester-workspace`, transition lease는 Server, production host boundary는 `apps/ay-ple`이 소유한다.
- `ApplicationCompatibilityDescriptor`, `WorkspaceBundleDescriptor`, `RuntimeReleaseDescriptor`, `CodexAccountLifecycle`, `SemesterWorkspaceAdmission`, `AccountRuntimeTransitionLease`, `WorkspaceActionAdmission`, `SetupJourney`와 listener-independent host/application seam의 identity와 failure vocabulary를 freeze한다.
- Contract와 fixture만 추가한다. Network, filesystem mutation, process spawn, router mount, UI behavior와 implementation mock을 넣지 않는다.
- Missing·extra·unknown field는 fail closed하고 Browser-safe fixture의 producer/consumer equality를 자동 검증한다.
- S1 fixed SHA 뒤 contract 변경은 coordinator가 C-owned shared contract path에서 독립 review를 받은 serial `contractTipSha` delta로만 수행한다. Lane writer는 frozen contract나 shared manifest·lockfile을 직접 수정하지 않는다.
- Coordinator는 최대 3개 writer lane만 동시에 활성화하며 sibling branch merge·cherry-pick을 금지한다.

## Acceptance Criteria

- [x] Account의 8개 coarse state와 Setup/Ready projection, allowed command·error envelope를 dependency-free Browser contract가 exact decode한다.
- [x] Private account lifecycle, Runtime role, resolver, admission, bundle/context, setup journey, transition lease와 host seam이 implementation 없이 typecheck 가능한 frozen Interface로 존재한다.
- [x] Compatibility, workspace bundle과 Runtime release descriptor는 schema/version 및 immutable identity field를 strict decode하고 서로의 authority를 중복하지 않는다.
- [x] Valid fixture roster와 missing·extra·unknown/private-field invalid family가 Server producer와 Browser consumer 모두의 contract test input이다.
- [x] Public contract source·fixture에서 absolute path, credential, native ID, digest, Runtime process identity와 durable receipt phase leak이 0건이다.
- [x] 기존 product contract와 Runtime public surface가 호환되고 root baseline이 green이다.

## Verification

| Gate | Result |
| --- | --- |
| `npm run test -w @ay-ple/product-contract` | green, 20/20 |
| `npm run typecheck -w @ay-ple/product-contract` | green |
| `npm run build -w @ay-ple/product-contract` | green |
| Private contract package test·typecheck·build | root test·typecheck·build gate가 `@ay-ple/codex-chat-runtime`, `@ay-ple/runtime-release`, `@ay-ple/semester-workspace`, Server와 `ay-ple`의 exact workspace scripts를 모두 green으로 실행 |
| Shared producer·consumer conformance | Server 115/115, Browser 40/40 green; 같은 valid/invalid `@ay-ple/product-contract/testing` roster 사용 |
| `npm test` | green |
| `npm run typecheck` | green |
| `npm run build` | green |
| `npm run lint -w @ay-ple/chat-shell` | green |
| `npm run check:docs-links` | green, active 28·historical banner 2 |
| `git diff --check c182c2eeb754cbc4315f26f16a735257957e4b6e..7332c8bc77705160e31e0ce8e53e0dec6eb2dd90` | green |
| Public preview leak scan | Browser contract와 valid fixture의 absolute path, credential, native ID, Runtime process identity, durable receipt phase 0건 |
| Manual or live smoke | 없음. Fixture equality, relation rejection과 leak scan이 이 slice의 최고 seam |

## Result

- Implementation commits: `4661379e2`, `b45cdaa2e`, `d28392efa`, `7332c8bc7`
- Reviewed fixed SHA: `7332c8bc77705160e31e0ce8e53e0dec6eb2dd90`
- Valid fixture SHA-256: `d7dc6e71b1ef3429f009420a5f644565616f5cda2d847fa185fb292c6714d5d1`
- Invalid fixture SHA-256: `3f50b1290330e0f3be00c11438a4491c1c797da9d877faa1384bc54b1498f7f9`
- Server producer와 Browser consumer가 같은 test-only fixture roster를 exact decode하며 Account·Setup의 모순 조합도 공통 invalid family로 fail closed한다.
- Independent review disposition: Standards `GREEN`, Spec `GREEN`
- Parent Spec은 sibling ticket이 남아 있으므로 incomplete 상태를 유지한다.

## Blocked By

- [001-spine-s0-workspace-lock-scaffold.md](001-spine-s0-workspace-lock-scaffold.md) — Spine S0 — workspace·lock scaffold를 고정한다

## Starting Points

- `packages/product-contract/src/workspace.ts`
- `packages/product-contract/src/contract-values.ts`
- `packages/product-contract/src/index.ts`
- `packages/product-contract/src/index.test.ts`
- `packages/codex-chat-runtime/src/contract.ts`
- `packages/codex-chat-runtime/src/runtime-contract.ts`
- `packages/codex-chat-runtime/src/index.ts`
- `packages/codex-chat-runtime/src/account-contract.ts`
- `packages/runtime-release/src/contract.ts`
- `packages/semester-workspace/src/contract.ts`
- `apps/server/src/account-runtime/contract.ts`
- `apps/ay-ple/src/host-contract.ts`

## Delivery Handoff

| Field | Contract |
| --- | --- |
| node | `Spine S1` |
| owner | `C` — Contract/integrator |
| branch | `codex/public-preview-integration` |
| worktree | `/Users/swh/Desktop/code/ai-agent-challenge/hub-public-preview-worktrees/integration` |
| handoffSha | `c182c2eeb754cbc4315f26f16a735257957e4b6e` — Ticket 001 fixed reviewed SHA가 반영된 clean integration HEAD. Coordinator가 `npm test`, `npm run typecheck`, `npm run build`, `npm run lint -w @ay-ple/chat-shell`, `npm run check:docs-links`, `git diff --check`를 green으로 확인했다. |
| writablePaths | `packages/product-contract/**`; `packages/codex-chat-runtime/src/account-contract.ts`; `packages/runtime-release/src/contract.ts`; `packages/semester-workspace/src/contract.ts`; `apps/server/src/account-runtime/contract.ts`; `apps/ay-ple/src/host-contract.ts`; contract fixture/test 전용 파일; owning truth README `packages/product-contract/README.md`, `packages/runtime-release/README.md`, `packages/semester-workspace/README.md`, `packages/codex-chat-runtime/README.md`, `apps/server/README.md`, `apps/ay-ple/README.md`; `docs/tickets/2026-07-23-public-npx-first-release/002-spine-s1-frozen-contracts-fixtures.md`. 독립 리뷰 보정에서 Coordinator가 contract-only 상태를 정확히 기록하기 위해 README ownership을 이 범위로 확장했다. |
| consumedContracts | Parent Spec의 Browser-safe projection, private Module Interface, descriptor identity, error vocabulary와 S0 package graph |
| predecessorEvidence | 001 fixed reviewed SHA, lockfile digest, safe TAR dependency record, green scaffold receipt |
| requiredChecks | Contract fixture equality·private-field leak scan; 각 contract workspace test/typecheck/build; `npm test`; `npm run typecheck`; `npm run build`; `npm run lint -w @ay-ple/chat-shell`; `npm run check:docs-links`; `git diff --check` |
| reviewOwner | Independent contract reviewer와 R/B/D/A/U/H consumer representative |
| handoffArtifact | Reviewed fixed SHA `7332c8bc77705160e31e0ce8e53e0dec6eb2dd90`; valid fixture `d7dc6e71b1ef3429f009420a5f644565616f5cda2d847fa185fb292c6714d5d1`; invalid fixture `3f50b1290330e0f3be00c11438a4491c1c797da9d877faa1384bc54b1498f7f9`; shared producer-consumer conformance와 Standards/Spec `GREEN` receipt |
